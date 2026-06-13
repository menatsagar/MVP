from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import SalaryBandViewSet

router = DefaultRouter()
router.register("salary-bands", SalaryBandViewSet, basename="salaryband")

urlpatterns = [
    path("", include(router.urls)),
]
