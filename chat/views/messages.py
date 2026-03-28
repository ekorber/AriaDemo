import json
from datetime import datetime, timezone

from bson import ObjectId
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from chat.db import get_db


def _serialize_message(doc):
    doc["id"] = str(doc.pop("_id"))
    doc["lead_id"] = str(doc["lead_id"])
    doc["created_at"] = doc["created_at"].isoformat()
    return doc


@csrf_exempt
def message_list(request, lead_id):
    db = get_db()

    try:
        oid = ObjectId(lead_id)
    except Exception:
        return JsonResponse({"error": "Invalid lead ID"}, status=400)

    if request.method == "GET":
        messages = list(
            db.messages.find({"lead_id": oid}).sort("created_at", 1)
        )
        return JsonResponse([_serialize_message(m) for m in messages], safe=False)

    if request.method == "POST":
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON"}, status=400)

        role = body.get("role")
        content = body.get("content", "")
        if role not in ("user", "assistant"):
            return JsonResponse({"error": "Invalid role"}, status=400)

        doc = {
            "lead_id": oid,
            "role": role,
            "content": content,
            "created_at": datetime.now(timezone.utc),
        }
        result = db.messages.insert_one(doc)
        doc["_id"] = result.inserted_id
        return JsonResponse(_serialize_message(doc), status=201)

    return JsonResponse({"error": "Method not allowed"}, status=405)
