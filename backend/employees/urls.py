from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import EmployeeViewSet, SalaryRecordViewSet

router = DefaultRouter()
router.register("employees", EmployeeViewSet, basename="employee")
router.register("salary-records", SalaryRecordViewSet, basename="salaryrecord")

urlpatterns = [
    path("", include(router.urls)),
    # Nested route: /api/employees/<pk>/salary-history/
    path(
        "employees/<int:employee_pk>/salary-history/",
        SalaryRecordViewSet.as_view({"get": "list"}),
        name="employee-salary-history",
    ),
]
