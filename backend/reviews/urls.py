from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ReviewCycleViewSet

router = DefaultRouter()
router.register("review-cycles", ReviewCycleViewSet, basename="reviewcycle")

urlpatterns = [
    path("", include(router.urls)),
]
