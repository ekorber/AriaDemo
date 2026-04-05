from django.http import JsonResponse

from chat.archetypes import ARCHETYPES, DEFAULT_ARCHETYPE


def archetype_list(request):
    data = [
        {
            "key": key,
            "label": arch["label"],
            "greeting": arch["greeting"],
            "handoff_person": arch["handoff_person"],
            "handoff_title": arch["handoff_title"],
            "prospect_noun": arch["prospect_noun"],
        }
        for key, arch in ARCHETYPES.items()
    ]
    return JsonResponse({"archetypes": data, "default": DEFAULT_ARCHETYPE})
