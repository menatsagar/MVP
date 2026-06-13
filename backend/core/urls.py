from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import CountryViewSet, CurrencyViewSet, DepartmentViewSet, JobTitleViewSet

router = DefaultRouter()
router.register("currencies", CurrencyViewSet, basename="currency")
router.register("countries", CountryViewSet, basename="country")
router.register("departments", DepartmentViewSet, basename="department")
router.register("job-titles", JobTitleViewSet, basename="jobtitle")

urlpatterns = [
    path("", include(router.urls)),
]
