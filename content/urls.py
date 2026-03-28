from django.urls import path

from . import views

urlpatterns = [
    path("generate/", views.content_generate, name="content_generate"),
    path("campaigns/", views.campaign_list, name="campaign_list"),
    path("campaigns/<str:campaign_id>/", views.campaign_detail, name="campaign_detail"),
    path("campaigns/<str:campaign_id>/duplicate/", views.campaign_duplicate, name="campaign_duplicate"),
]
