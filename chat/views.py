import json
import os

import anthropic
from django.http import StreamingHttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from .system_prompt import SYSTEM_PROMPT


@csrf_exempt
@require_POST
def chat_stream(request):
    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    messages = body.get("messages", [])

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return JsonResponse({"error": "API key not configured"}, status=500)

    def event_stream():
        client = anthropic.Anthropic(api_key=api_key)

        api_messages = [
            {"role": m["role"], "content": m["content"]}
            for m in messages
        ]
        if not api_messages:
            api_messages = [{"role": "user", "content": "[New visitor has connected to chat]"}]

        with client.messages.stream(
            model="claude-sonnet-4-20250514",
            max_tokens=1000,
            system=SYSTEM_PROMPT,
            messages=api_messages,
        ) as stream:
            for text in stream.text_stream:
                yield text

    response = StreamingHttpResponse(
        event_stream(),
        content_type="text/plain",
    )
    response["Cache-Control"] = "no-cache"
    return response
