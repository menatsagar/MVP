from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import EmployeeViewSet
from .views_dashboard import DashboardDistributionView, DashboardSummaryView

router = DefaultRouter()
router.register("employees", EmployeeViewSet, basename="employee")

urlpatterns = [
    path("", include(router.urls)),
    # Dashboard endpoints
    path("dashboard/summary/", DashboardSummaryView.as_view(), name="dashboard-summary"),
    path("dashboard/distribution/", DashboardDistributionView.as_view(), name="dashboard-distribution"),
]
