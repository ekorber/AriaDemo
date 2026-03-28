import json
from datetime import datetime, timezone

from bson import ObjectId
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from chat.db import get_db

VALID_STATUSES = {"active", "qualified", "unqualified", "handed_off", "closed"}
VALID_BUDGET_SIGNALS = {"low", "medium", "high"}


def _serialize_lead(doc):
    doc["id"] = str(doc.pop("_id"))
    doc["created_at"] = doc["created_at"].isoformat()
    return doc


@csrf_exempt
@require_http_methods(["GET", "POST"])
def lead_list(request):
    db = get_db()

    if request.method == "GET":
        leads = list(db.leads.find().sort("created_at", -1))
        return JsonResponse([_serialize_lead(l) for l in leads], safe=False)

    # POST — create a new lead
    try:
        body = json.loads(request.body) if request.body else {}
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    lead = {
        "name": body.get("name"),
        "project_type": body.get("project_type", ""),
        "timeline": body.get("timeline", ""),
        "budget_signal": body.get("budget_signal", "low"),
        "decision_authority": body.get("decision_authority", ""),
        "intent_score": body.get("intent_score", 0),
        "conversation_summary": body.get("conversation_summary", "Chat in progress…"),
        "hot_signals": body.get("hot_signals", []),
        "status": body.get("status", "active"),
        "created_at": datetime.now(timezone.utc),
    }

    if lead["status"] not in VALID_STATUSES:
        return JsonResponse({"error": f"Invalid status: {lead['status']}"}, status=400)
    if lead["budget_signal"] not in VALID_BUDGET_SIGNALS:
        return JsonResponse({"error": f"Invalid budget_signal: {lead['budget_signal']}"}, status=400)

    result = db.leads.insert_one(lead)
    lead["_id"] = result.inserted_id
    return JsonResponse(_serialize_lead(lead), status=201)


@csrf_exempt
@require_http_methods(["GET", "PATCH", "DELETE"])
def lead_detail(request, lead_id):
    db = get_db()

    try:
        oid = ObjectId(lead_id)
    except Exception:
        return JsonResponse({"error": "Invalid lead ID"}, status=400)

    if request.method == "GET":
        lead = db.leads.find_one({"_id": oid})
        if not lead:
            return JsonResponse({"error": "Lead not found"}, status=404)
        return JsonResponse(_serialize_lead(lead))

    if request.method == "DELETE":
        result = db.leads.delete_one({"_id": oid})
        if result.deleted_count == 0:
            return JsonResponse({"error": "Lead not found"}, status=404)
        return JsonResponse({"deleted": True})

    # PATCH
    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    if "status" in body and body["status"] not in VALID_STATUSES:
        return JsonResponse({"error": f"Invalid status: {body['status']}"}, status=400)
    if "budget_signal" in body and body["budget_signal"] not in VALID_BUDGET_SIGNALS:
        return JsonResponse({"error": f"Invalid budget_signal: {body['budget_signal']}"}, status=400)

    # Only allow updating known fields
    allowed = {
        "name", "project_type", "timeline", "budget_signal",
        "decision_authority", "intent_score", "conversation_summary",
        "hot_signals", "status",
    }
    updates = {k: v for k, v in body.items() if k in allowed}

    if not updates:
        return JsonResponse({"error": "No valid fields to update"}, status=400)

    db.leads.update_one({"_id": oid}, {"$set": updates})
    lead = db.leads.find_one({"_id": oid})
    if not lead:
        return JsonResponse({"error": "Lead not found"}, status=404)
    return JsonResponse(_serialize_lead(lead))
