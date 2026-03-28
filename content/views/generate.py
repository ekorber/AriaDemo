import json
import os

import anthropic
from bson import ObjectId
from django.http import StreamingHttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from chat.db import get_db
from content.system_prompt import CONTENT_SYSTEM_PROMPT


@csrf_exempt
@require_POST
def content_generate(request):
    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    campaign_id = body.get("campaignId", "")
    client_name = body.get("clientName", "")
    project_type = body.get("projectType", "")
    tone = body.get("tone", "hype")
    brief = body.get("brief", "")
    skip_platforms = body.get("skipPlatforms", [])

    if not brief:
        return JsonResponse({"error": "Brief is required"}, status=400)

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return JsonResponse({"error": "API key not configured"}, status=500)

    db = get_db()

    # Mark campaign as generating
    if campaign_id:
        try:
            oid = ObjectId(campaign_id)
            db.campaigns.update_one({"_id": oid}, {"$set": {"status": "generating"}})
        except Exception:
            pass

    all_platforms = ["instagram", "tiktok", "x", "facebook", "youtube_shorts", "threads"]
    platforms_to_generate = [p for p in all_platforms if p not in skip_platforms]

    if not platforms_to_generate:
        return JsonResponse({"error": "All platforms skipped"}, status=400)

    platform_list = ", ".join(platforms_to_generate)
    user_message = f"""Generate a social media campaign for the following client:

Client: {client_name}
Project: {project_type}
Tone: {tone}
Brief: {brief}

Generate content ONLY for these platforms: {platform_list}
Do NOT generate posts for any other platforms. Follow the platform rules in your instructions."""

    collected = []

    def event_stream():
        client = anthropic.Anthropic(api_key=api_key)

        with client.messages.stream(
            model="claude-sonnet-4-20250514",
            max_tokens=4000,
            system=CONTENT_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        ) as stream:
            for text in stream.text_stream:
                collected.append(text)
                yield text

        # After streaming completes, save posts to the campaign
        if campaign_id:
            _save_generated_posts(campaign_id, "".join(collected), skip_platforms)

    response = StreamingHttpResponse(
        event_stream(),
        content_type="text/plain",
    )
    response["Cache-Control"] = "no-cache"
    return response


def _save_generated_posts(campaign_id, raw_text, skip_platforms):
    """Parse generated content and save to the campaign document."""
    db = get_db()
    try:
        oid = ObjectId(campaign_id)
    except Exception:
        return

    json_match = __import__("re").search(r"\{[\s\S]*\}", raw_text)
    if not json_match:
        db.campaigns.update_one({"_id": oid}, {"$set": {"status": "draft"}})
        return

    try:
        parsed = json.loads(json_match.group(0))
    except json.JSONDecodeError:
        db.campaigns.update_one({"_id": oid}, {"$set": {"status": "draft"}})
        return

    if not parsed.get("socialPosts") or not isinstance(parsed["socialPosts"], list):
        db.campaigns.update_one({"_id": oid}, {"$set": {"status": "draft"}})
        return

    campaign = db.campaigns.find_one({"_id": oid})
    if not campaign:
        return

    # Keep approved posts that were skipped
    approved_posts = [
        p for p in campaign.get("social_posts", []) if p.get("approved")
    ]

    new_posts = []
    for i, p in enumerate(parsed["socialPosts"]):
        new_posts.append({
            "id": f"post_{campaign_id}_{i}_{int(__import__('time').time() * 1000)}",
            "platform": p.get("platform", ""),
            "hook": p.get("hook", ""),
            "caption": p.get("caption", ""),
            "edited": False,
            "approved": False,
            "scheduled_date": None,
        })

    db.campaigns.update_one(
        {"_id": oid},
        {"$set": {"social_posts": approved_posts + new_posts, "status": "ready"}},
    )
