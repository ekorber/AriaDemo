import json
import os
import re

import anthropic
from bson import ObjectId
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from chat.db import get_db

IMAGE_SYSTEM_PROMPT = """You are an AI image prompt engineer for a social media marketing platform. Given a client brief and a list of target posts, you generate detailed image generation prompts tailored for each platform.

You will receive:
1. A client brief with campaign details
2. Target posts to generate image prompts for

Return ONLY valid JSON with this exact structure, keyed by postId:

{
  "posts": {
    "<postId>": { "imagePrompt": "..." },
    "<postId>": { "imagePrompt": "..." }
  }
}

Generate an image prompt for EVERY postId listed in the target posts. Each prompt should be a detailed, vivid description suitable for an AI image generator (like DALL-E or Stable Diffusion). Follow these platform-specific guidelines:

**Instagram:**
- Square format (1:1 ratio), visually striking, high production value
- Lifestyle-oriented, aspirational imagery, rich colors and lighting
- Think: product flat lays, behind-the-scenes moments, polished brand aesthetics

**X (formerly Twitter):**
- Landscape format (16:9 ratio), eye-catching but clean
- Bold imagery that works at small sizes in a feed, high contrast
- Think: data visualizations, quote cards, striking single-subject photos

**Facebook:**
- Landscape format (1.91:1 ratio), warm and relatable
- Community-oriented, shareable imagery, authentic feeling
- Think: team photos, event shots, infographics, lifestyle moments

**Threads:**
- Square format (1:1 ratio), raw and authentic aesthetic
- Casual, unfiltered look — avoid overly polished corporate imagery
- Think: candid moments, simple graphics, memes, real textures

**LinkedIn:**
- Landscape format (1.91:1 ratio), professional and polished
- Industry-appropriate, thought leadership visuals, clean design
- Think: professional headshots, conference photos, clean infographics, office culture

**General guidelines:**
- Always incorporate the brand/client context into the visual direction
- Specify composition, lighting, color palette, and mood
- Include specific details about objects, people, settings, and style
- Mention the aspect ratio in each prompt
- Match the campaign tone to the visual mood
- When generating multiple images for the same platform, vary the visual approach

**Tone guidance:**
The tone field indicates the emotional register. Translate this into visual direction — "hype" means bold colors and dynamic composition, "behind-the-scenes" means candid and raw, "educational" means clean and informative, etc."""


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

    user_message = _build_user_message(client_name, project_type, tone, brief, targets)

    client = anthropic.Anthropic(api_key=api_key)
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4000,
        system=IMAGE_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    )

    raw_text = response.content[0].text
    prompts = _parse_prompts(raw_text)

    if not prompts:
        return JsonResponse({"error": "Could not parse image prompts"}, status=500)

    # Generate images using the prompts
    generated = _generate_images(prompts, api_key)

    # Save image URLs to campaign
    if campaign_id:
        _save_generated_images(campaign_id, generated)

    return JsonResponse({"posts": generated})


def _build_user_message(client_name, project_type, tone, brief, targets):
    lines = [
        f"Client: {client_name}",
        f"Project: {project_type}",
        f"Tone: {tone}",
        f"Brief: {brief}",
        "",
        "=== GENERATE IMAGE PROMPTS FOR THESE POSTS ===",
    ]
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


def _parse_prompts(raw_text):
    json_match = re.search(r"\{[\s\S]*\}", raw_text)
    if not json_match:
        return None
    try:
        parsed = json.loads(json_match.group(0))
        return parsed.get("posts")
    except json.JSONDecodeError:
        return None


def _generate_images(prompts, api_key):
    """Generate images from prompts. Returns {postId: {imageUrl: "..."}}."""
    generated = {}
    client = anthropic.Anthropic(api_key=api_key)

    for post_id, data in prompts.items():
        prompt = data.get("imagePrompt", "")
        if not prompt:
            continue

        try:
            response = client.images.generate(
                model="claude-image-generation-fast-20250515",
                prompt=prompt,
                n=1,
                size="auto",
                output_format="webp",
                output_compression=80,
            )
            if response.data and len(response.data) > 0:
                image = response.data[0]
                if hasattr(image, "url") and image.url:
                    generated[post_id] = {"imageUrl": image.url}
                elif hasattr(image, "b64_json") and image.b64_json:
                    generated[post_id] = {"imageUrl": f"data:image/webp;base64,{image.b64_json}"}
        except Exception as e:
            print(f"Image generation failed for {post_id}: {e}")
            continue

    return generated


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
