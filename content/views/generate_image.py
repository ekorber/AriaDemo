import json
import os
import uuid

import anthropic
import openai
import requests as http_requests
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

PLATFORM_SIZES = {
    "instagram": "1024x1024",
    "x": "1792x1024",
    "facebook": "1792x1024",
    "threads": "1024x1024",
    "linkedin": "1792x1024",
}

PROMPT_SYSTEM = """You are an image prompt engineer. Given campaign details and a platform, write a single detailed image generation prompt for DALL-E.

The prompt should:
- Be a vivid, specific visual description (1-3 sentences)
- Specify composition, lighting, color palette, and mood
- Match the campaign tone and brand context
- Follow the platform guidance provided
- NEVER include text or words in the image description — DALL-E renders text poorly
- Focus on visual scenes, objects, textures, and atmosphere

Return ONLY the prompt text, nothing else."""


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

    anthropic_key = os.environ.get("ANTHROPIC_API_KEY")
    openai_key = os.environ.get("OPENAI_API_KEY")
    if not anthropic_key:
        return JsonResponse({"error": "Anthropic API key not configured"}, status=500)
    if not openai_key:
        return JsonResponse({"error": "OpenAI API key not configured. Set OPENAI_API_KEY to enable image generation."}, status=500)

    claude = anthropic.Anthropic(api_key=anthropic_key)
    dalle = openai.OpenAI(api_key=openai_key)
    generated = {}
    errors = []

    for t in targets:
        post_id = t.get("postId", "unknown")
        platform = t.get("platform", "unknown")
        guidance = PLATFORM_IMAGE_GUIDANCE.get(platform, "")
        size = PLATFORM_SIZES.get(platform, "1024x1024")

        # Step 1: Use Claude to craft a DALL-E prompt
        user_msg = (
            f"Client: {client_name}\n"
            f"Project: {project_type}\n"
            f"Campaign brief: {brief}\n"
            f"Tone: {tone}\n"
            f"Platform: {platform}\n"
            f"Platform guidance: {guidance}\n\n"
            f"Write a DALL-E image prompt for this social media post."
        )

        try:
            prompt_response = claude.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=300,
                system=PROMPT_SYSTEM,
                messages=[{"role": "user", "content": user_msg}],
            )
            dalle_prompt = prompt_response.content[0].text.strip()
        except Exception as e:
            errors.append(f"Claude prompt failed for {post_id}: {type(e).__name__}: {e}")
            continue

        # Step 2: Generate the image with DALL-E
        try:
            image_response = dalle.images.generate(
                model="dall-e-3",
                prompt=dalle_prompt,
                size=size,
                quality="standard",
                n=1,
            )
            image_url_remote = image_response.data[0].url
        except Exception as e:
            errors.append(f"DALL-E failed for {post_id}: {type(e).__name__}: {e}")
            continue

        # Step 3: Download and save locally
        try:
            local_url = _download_and_save(image_url_remote)
            if local_url:
                generated[post_id] = {"imageUrl": local_url}
            else:
                errors.append(f"Download returned None for {post_id}")
        except Exception as e:
            errors.append(f"Download failed for {post_id}: {type(e).__name__}: {e}")
            continue

    if campaign_id and generated:
        _save_generated_images(campaign_id, generated)

    result = {"posts": generated}
    if errors:
        result["errors"] = errors
    return JsonResponse(result)


def _download_and_save(remote_url):
    """Download image from URL and save to static directory."""
    try:
        resp = http_requests.get(remote_url, timeout=30)
        resp.raise_for_status()

        content_type = resp.headers.get("content-type", "image/png")
        ext = "png"
        if "jpeg" in content_type or "jpg" in content_type:
            ext = "jpg"
        elif "webp" in content_type:
            ext = "webp"

        filename = f"{uuid.uuid4().hex}.{ext}"
        upload_dir = os.path.join(settings.BASE_DIR, "static", "generated_images")
        os.makedirs(upload_dir, exist_ok=True)

        filepath = os.path.join(upload_dir, filename)
        with open(filepath, "wb") as f:
            f.write(resp.content)

        return f"/static/generated_images/{filename}"
    except Exception as e:
        print(f"Failed to download image: {e}")
        return None


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
