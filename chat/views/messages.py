from bson import ObjectId
from django.http import JsonResponse
from django.views.decorators.http import require_GET

from chat.db import get_db


def _serialize_message(doc):
    doc["id"] = str(doc.pop("_id"))
    doc["lead_id"] = str(doc["lead_id"])
    doc["created_at"] = doc["created_at"].isoformat()
    return doc


@require_GET
def message_list(request, lead_id):
    db = get_db()

    try:
        oid = ObjectId(lead_id)
    except Exception:
        return JsonResponse({"error": "Invalid lead ID"}, status=400)

    messages = list(
        db.messages.find({"lead_id": oid}).sort("created_at", 1)
    )
    return JsonResponse([_serialize_message(m) for m in messages], safe=False)
