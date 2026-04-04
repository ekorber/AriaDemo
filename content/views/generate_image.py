import base64
import json
import os
import uuid

import anthropic
from bson import ObjectId
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from chat.db import get_db

PLATFORM_IMAGE_GUIDANCE = {
    "instagram": "Square format (1:1), visually striking, high production value, lifestyle-oriented, aspirational, rich colors and lighting.",
    "x": "Landscape format (16:9), eye-catching but clean, bold imagery that works at small sizes, high contrast.",
    "facebook": "Landscape format (1.91:1), warm and relatable, community-oriented, shareable, authentic feeling.",
    "threads": "Square format (1:1), raw and authentic aesthetic, casual unfiltered look, candid moments.",
    "linkedin": "Landscape format (1.91:1), professional and polished, industry-appropriate, thought leadership visuals, clean design.",
}


@csrf_exempt
@require_POST
def image_generate(request):
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

    if not brief:
        return JsonResponse({"error": "Brief is required"}, status=400)

    if not targets:
        return JsonResponse({"error": "No target posts to generate"}, status=400)

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return JsonResponse({"error": "API key not configured"}, status=500)

    client = anthropic.Anthropic(api_key=api_key)
    generated = {}

    for t in targets:
        post_id = t.get("postId", "unknown")
        platform = t.get("platform", "unknown")
        guidance = PLATFORM_IMAGE_GUIDANCE.get(platform, "")

        prompt = (
            f"Generate a social media image for {platform}. "
            f"Client: {client_name}. Project: {project_type}. "
            f"Campaign brief: {brief}. Tone: {tone}. "
            f"Platform guidance: {guidance} "
            f"Create a polished, professional image suitable for posting. "
            f"No text overlays unless essential to the concept."
        )

        try:
            response = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1024,
                messages=[{"role": "user", "content": prompt}],
            )

            for block in response.content:
                if block.type == "image":
                    # Save image to static files
                    image_url = _save_image(block.source.data, block.source.media_type)
                    if image_url:
                        generated[post_id] = {"imageUrl": image_url}
                    break
        except Exception as e:
            print(f"Image generation failed for {post_id}: {e}")
            continue

    if campaign_id and generated:
        _save_generated_images(campaign_id, generated)

    return JsonResponse({"posts": generated})


def _save_image(b64_data, media_type):
    """Save base64 image data to the static directory and return a URL."""
    ext = "png"
    if "jpeg" in media_type or "jpg" in media_type:
        ext = "jpg"
    elif "webp" in media_type:
        ext = "webp"

    filename = f"{uuid.uuid4().hex}.{ext}"
    upload_dir = os.path.join(settings.BASE_DIR, "static", "generated_images")
    os.makedirs(upload_dir, exist_ok=True)

    filepath = os.path.join(upload_dir, filename)
    with open(filepath, "wb") as f:
        f.write(base64.b64decode(b64_data))

    return f"/static/generated_images/{filename}"


def _save_generated_images(campaign_id, generated):
    """Save generated image URLs into campaign posts."""
    db = get_db()
    try:
        oid = ObjectId(campaign_id)
    except Exception:
        return

    campaign = db.campaigns.find_one({"_id": oid})
    if not campaign:
        return

    existing = campaign.get("social_posts", [])
    updated = []
    for post in existing:
        pid = post.get("id", "")
        if pid in generated:
            post["image_url"] = generated[pid].get("imageUrl")
        updated.append(post)

    db.campaigns.update_one(
        {"_id": oid},
        {"$set": {"social_posts": updated}},
    )
