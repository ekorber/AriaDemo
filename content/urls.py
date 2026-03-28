from django.urls import path

from . import views

urlpatterns = [
    path("generate/", views.content_generate, name="content_generate"),
]
