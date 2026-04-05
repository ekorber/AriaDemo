import json
import os
from datetime import datetime, timezone

from bson import ObjectId
import anthropic
from django.http import StreamingHttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from chat.db import get_db
from chat.system_prompt import build_system_prompt


@csrf_exempt
@require_POST
def chat_stream(request):
    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    messages = body.get("messages", [])
    lead_id = body.get("lead_id")
    archetype = body.get("archetype")

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return JsonResponse({"error": "API key not configured"}, status=500)

    db = get_db()
    lead_oid = None

    if lead_id:
        try:
            lead_oid = ObjectId(lead_id)
        except Exception:
            pass

    # Persist the latest user message
    if lead_oid and messages:
        last_msg = messages[-1]
        if last_msg.get("role") == "user":
            db.messages.insert_one({
                "lead_id": lead_oid,
                "role": "user",
                "content": last_msg["content"],
                "created_at": datetime.now(timezone.utc),
            })

    def event_stream():
        client = anthropic.Anthropic(api_key=api_key)

        api_messages = [
            {"role": m["role"], "content": m["content"]}
            for m in messages
        ]
        if not api_messages:
            api_messages = [{"role": "user", "content": "[New visitor has connected to chat]"}]

        full_response = []

        with client.messages.stream(
            model="claude-sonnet-4-20250514",
            max_tokens=1000,
            system=build_system_prompt(archetype),
            messages=api_messages,
        ) as stream:
            for text in stream.text_stream:
                full_response.append(text)
                yield text

        # Persist the full assistant response after streaming completes
        if lead_oid:
            db.messages.insert_one({
                "lead_id": lead_oid,
                "role": "assistant",
                "content": "".join(full_response),
                "created_at": datetime.now(timezone.utc),
            })

    response = StreamingHttpResponse(
        event_stream(),
        content_type="text/plain",
    )
    response["Cache-Control"] = "no-cache"
    return response
