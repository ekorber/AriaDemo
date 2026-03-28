import json
import os

import anthropic
from django.http import StreamingHttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from content.system_prompt import CONTENT_SYSTEM_PROMPT


@csrf_exempt
@require_POST
def content_generate(request):
    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

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

    def event_stream():
        client = anthropic.Anthropic(api_key=api_key)

        with client.messages.stream(
            model="claude-sonnet-4-20250514",
            max_tokens=4000,
            system=CONTENT_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        ) as stream:
            for text in stream.text_stream:
                yield text

    response = StreamingHttpResponse(
        event_stream(),
        content_type="text/plain",
    )
    response["Cache-Control"] = "no-cache"
    return response
