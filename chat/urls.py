from django.urls import path

from . import views

urlpatterns = [
    path("chat/", views.chat_stream, name="chat_stream"),
    path("leads/", views.lead_list, name="lead_list"),
    path("leads/<str:lead_id>/", views.lead_detail, name="lead_detail"),
    path("leads/<str:lead_id>/messages/", views.message_list, name="message_list"),
]
