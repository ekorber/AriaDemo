import json
import os
import re


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
    targets = body.get("targets", [])
    existing_posts = body.get("existingPosts", [])

    if not brief:
        return JsonResponse({"error": "Brief is required"}, status=400)

    if not targets:
        return JsonResponse({"error": "No target posts to generate"}, status=400)

    for t in targets:
        if not t.get("platform"):
            return JsonResponse({"error": "Each target must have a platform"}, status=400)

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

    user_message = _build_user_message(
        client_name, project_type, tone, brief, targets, existing_posts
    )

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
            _save_generated_posts(campaign_id, "".join(collected))

    response = StreamingHttpResponse(
        event_stream(),
        content_type="text/plain",
    )
    response["Cache-Control"] = "no-cache"
    return response


def _build_user_message(client_name, project_type, tone, brief, targets, existing_posts):
    lines = [
        f"Client: {client_name}",
        f"Project: {project_type}",
        f"Tone: {tone}",
        f"Brief: {brief}",
    ]

    if existing_posts:
        lines.append("")
        lines.append("=== EXISTING POSTS (read-only context, do not regenerate) ===")
        for ep in existing_posts:
            parts = [ep.get("platform", "unknown")]
            date = ep.get("scheduledDate")
            time_val = ep.get("scheduledTime")
            if date:
                parts.append(f"{date} {time_val}" if time_val else date)
            else:
                parts.append("unscheduled")
            if ep.get("approved"):
                parts.append("approved")
            label = " | ".join(parts)
            lines.append(f"[{label}]")
            hook = ep.get("hook", "")
            caption = ep.get("caption", "")
            if hook:
                lines.append(f"Hook: {hook}")
            if caption:
                lines.append(f"Caption: {caption}")
            lines.append("")

    lines.append("=== GENERATE THESE POSTS ===")
    for t in targets:
        post_id = t.get("postId", "unknown")
        platform = t.get("platform", "unknown")
        date = t.get("scheduledDate")
        time_val = t.get("scheduledTime")
        if date:
            schedule = f"{date} {time_val}" if time_val else date
        else:
            schedule = "unscheduled"
        lines.append(f"- {post_id}: {platform} | {schedule}")

    return "\n".join(lines)


def _save_generated_posts(campaign_id, raw_text):
    """Parse generated content and merge into existing campaign posts by postId."""
    db = get_db()
    try:
        oid = ObjectId(campaign_id)
    except Exception:
        return

    json_match = re.search(r"\{[\s\S]*\}", raw_text)
    if not json_match:
        db.campaigns.update_one({"_id": oid}, {"$set": {"status": "ready"}})
        return

    try:
        parsed = json.loads(json_match.group(0))
    except json.JSONDecodeError:
        db.campaigns.update_one({"_id": oid}, {"$set": {"status": "ready"}})
        return

    posts_dict = parsed.get("posts")
    if not posts_dict or not isinstance(posts_dict, dict):
        db.campaigns.update_one({"_id": oid}, {"$set": {"status": "ready"}})
        return

    campaign = db.campaigns.find_one({"_id": oid})
    if not campaign:
        return

    # Merge: update hook/caption for matching postIds, leave everything else untouched
    existing = campaign.get("social_posts", [])
    updated = []
    for post in existing:
        pid = post.get("id", "")
        if pid in posts_dict:
            generated = posts_dict[pid]
            post["hook"] = generated.get("hook", post.get("hook", ""))
            post["caption"] = generated.get("caption", post.get("caption", ""))
        updated.append(post)

    db.campaigns.update_one(
        {"_id": oid},
        {"$set": {"social_posts": updated, "status": "ready"}},
    )
