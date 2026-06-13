from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Employee, SalaryRecord
from .serializers import (
    EmployeeDetailSerializer,
    EmployeeListSerializer,
    SalaryRecordSerializer,
)


class EmployeeViewSet(viewsets.ModelViewSet):
    """
    CRUD for employees.
    - List uses a lightweight serializer.
    - Retrieve uses a detail serializer with salary history.
    - No hard delete — use the `deactivate` action instead.
    """

    def get_queryset(self):
        qs = Employee.objects.select_related(
            "department",
            "job_title",
            "country",
            "local_currency",
            "current_salary_record",
        )
        # Optional filter: ?active=true / ?active=false
        active_param = self.request.query_params.get("active")
        if active_param is not None:
            qs = qs.filter(is_active=active_param.lower() in ("true", "1", "yes"))
        return qs

    def get_serializer_class(self):
        if self.action == "retrieve":
            return EmployeeDetailSerializer
        return EmployeeListSerializer

    def destroy(self, request, *args, **kwargs):
        """Soft-delete: deactivate instead of hard delete."""
        employee = self.get_object()
        employee.is_active = False
        employee.save(update_fields=["is_active", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"])
    def deactivate(self, request, pk=None):
        """Explicitly deactivate an employee."""
        employee = self.get_object()
        employee.is_active = False
        employee.save(update_fields=["is_active", "updated_at"])
        return Response({"status": "deactivated"})

    @action(detail=True, methods=["post"])
    def reactivate(self, request, pk=None):
        """Re-activate a deactivated employee."""
        employee = self.get_object()
        employee.is_active = True
        employee.save(update_fields=["is_active", "updated_at"])
        return Response({"status": "reactivated"})


class SalaryRecordViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """
    Salary records — list, create, retrieve only (append-only, no update/delete).
    Creating a record auto-updates the employee's current_salary_record pointer.
    """

    serializer_class = SalaryRecordSerializer

    def get_queryset(self):
        qs = SalaryRecord.objects.select_related("employee")
        # Filter by employee if nested URL param is present
        employee_pk = self.kwargs.get("employee_pk")
        if employee_pk:
            qs = qs.filter(employee_id=employee_pk)
        return qs

    def perform_create(self, serializer):
        record = serializer.save()
        # Update the employee's current_salary_record pointer
        employee = record.employee
        employee.current_salary_record = record
        employee.save(update_fields=["current_salary_record", "updated_at"])
