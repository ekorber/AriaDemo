import json
from datetime import datetime, timezone

from bson import ObjectId
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from chat.db import get_db

VALID_STATUSES = {"draft", "generating", "ready", "exported"}


def _serialize_campaign(doc):
    doc["id"] = str(doc.pop("_id"))
    doc["created_at"] = doc["created_at"].isoformat()
    return doc


@csrf_exempt
@require_http_methods(["GET", "POST"])
def campaign_list(request):
    db = get_db()

    if request.method == "GET":
        campaigns = list(db.campaigns.find().sort("created_at", -1))
        return JsonResponse([_serialize_campaign(c) for c in campaigns], safe=False)

    # POST — create a new campaign
    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    lead_id = body.get("lead_id", "")
    brief = body.get("brief", "").strip()
    tone = body.get("tone", "").strip()
    client_name = body.get("client_name", "")
    project_type = body.get("project_type", "")

    if not brief:
        return JsonResponse({"error": "Brief is required"}, status=400)
    if not tone:
        return JsonResponse({"error": "Tone is required"}, status=400)

    campaign = {
        "lead_id": lead_id,
        "client_name": client_name,
        "project_type": project_type,
        "brief": brief,
        "tone": tone,
        "social_posts": [],
        "status": "draft",
        "created_at": datetime.now(timezone.utc),
    }

    result = db.campaigns.insert_one(campaign)
    campaign["_id"] = result.inserted_id
    return JsonResponse(_serialize_campaign(campaign), status=201)


@csrf_exempt
@require_http_methods(["GET", "PATCH", "DELETE"])
def campaign_detail(request, campaign_id):
    db = get_db()

    try:
        oid = ObjectId(campaign_id)
    except Exception:
        return JsonResponse({"error": "Invalid campaign ID"}, status=400)

    if request.method == "GET":
        campaign = db.campaigns.find_one({"_id": oid})
        if not campaign:
            return JsonResponse({"error": "Campaign not found"}, status=404)
        return JsonResponse(_serialize_campaign(campaign))

    if request.method == "DELETE":
        result = db.campaigns.delete_one({"_id": oid})
        if result.deleted_count == 0:
            return JsonResponse({"error": "Campaign not found"}, status=404)
        return JsonResponse({"deleted": True})

    # PATCH
    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    if "status" in body and body["status"] not in VALID_STATUSES:
        return JsonResponse({"error": f"Invalid status: {body['status']}"}, status=400)

    allowed = {"brief", "tone", "social_posts", "status"}
    updates = {k: v for k, v in body.items() if k in allowed}

    if not updates:
        return JsonResponse({"error": "No valid fields to update"}, status=400)

    db.campaigns.update_one({"_id": oid}, {"$set": updates})
    campaign = db.campaigns.find_one({"_id": oid})
    if not campaign:
        return JsonResponse({"error": "Campaign not found"}, status=404)
    return JsonResponse(_serialize_campaign(campaign))


@csrf_exempt
@require_http_methods(["POST"])
def campaign_duplicate(request, campaign_id):
    db = get_db()

    try:
        oid = ObjectId(campaign_id)
    except Exception:
        return JsonResponse({"error": "Invalid campaign ID"}, status=400)

    original = db.campaigns.find_one({"_id": oid})
    if not original:
        return JsonResponse({"error": "Campaign not found"}, status=404)

    copy = {
        "lead_id": original["lead_id"],
        "client_name": original["client_name"],
        "project_type": original["project_type"],
        "brief": original["brief"],
        "tone": original["tone"],
        "social_posts": [
            {**p, "id": f"{p['id']}_copy_{int(datetime.now(timezone.utc).timestamp() * 1000)}", "approved": False}
            for p in original.get("social_posts", [])
        ],
        "status": "draft",
        "created_at": datetime.now(timezone.utc),
    }

    result = db.campaigns.insert_one(copy)
    copy["_id"] = result.inserted_id
    return JsonResponse(_serialize_campaign(copy), status=201)
