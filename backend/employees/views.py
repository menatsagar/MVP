from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from audit.utils import log_audit
from core.models import BackgroundTask

from .filters import EmployeeFilter
from .models import Employee, SalaryRecord
from .serializers import (
    EmployeeCreateSerializer,
    EmployeeDetailSerializer,
    EmployeeListSerializer,
    SalaryRecordCreateSerializer,
    SalaryRecordSerializer,
)
from .services import get_band_status


class EmployeeViewSet(viewsets.ModelViewSet):
    """
    Employees API.

    list:    Lightweight view with filters, search, band_status.
    create:  Creates employee + initial SalaryRecord in one request.
    retrieve: Full detail with salary history, USD conversion, band status.
    update:  Partial update of profile fields; logs audit per changed field.
    destroy: Soft-delete (sets is_active=False).
    """

    filterset_class = EmployeeFilter
    search_fields = ["full_name", "employee_code"]
    ordering_fields = ["employee_code", "full_name", "created_at"]
    lookup_field = "employee_code"

    def get_queryset(self):
        return Employee.objects.select_related(
            "department",
            "job_title",
            "country",
            "local_currency",
            "current_salary_record",
        )

    def get_serializer_class(self):
        if self.action == "create":
            return EmployeeCreateSerializer
        if self.action == "retrieve":
            return EmployeeDetailSerializer
        return EmployeeListSerializer

    def perform_update(self, serializer):
        """Track changed fields and log audit entries."""
        instance = serializer.instance
        old_values = {}
        for field in serializer.validated_data:
            old_val = getattr(instance, field, None)
            # Resolve FK to ID for comparison
            if hasattr(old_val, "pk"):
                old_val = old_val.pk
            old_values[field] = old_val

        employee = serializer.save()

        for field, old_val in old_values.items():
            new_val = getattr(employee, field, None)
            if hasattr(new_val, "pk"):
                new_val = new_val.pk
            if str(old_val) != str(new_val):
                log_audit(
                    action="update",
                    entity_type="employee",
                    entity_id=employee.employee_code,
                    entity_label=f"{employee.employee_code} — {employee.full_name}",
                    field_changed=field,
                    old_value=str(old_val),
                    new_value=str(new_val),
                )

    def destroy(self, request, *args, **kwargs):
        """Soft-delete: deactivate instead of hard delete."""
        employee = self.get_object()
        employee.is_active = False
        Employee.objects.filter(pk=employee.pk).update(is_active=False)
        log_audit(
            action="deactivate",
            entity_type="employee",
            entity_id=employee.employee_code,
            entity_label=f"{employee.employee_code} — {employee.full_name}",
        )
        return Response(status=status.HTTP_204_NO_CONTENT)

    # -----------------------------------------------------------------------
    # Custom actions
    # -----------------------------------------------------------------------

    @action(detail=True, methods=["post"])
    def deactivate(self, request, employee_code=None):
        """Explicitly deactivate an employee."""
        employee = self.get_object()
        Employee.objects.filter(pk=employee.pk).update(is_active=False)
        log_audit(
            action="deactivate",
            entity_type="employee",
            entity_id=employee.employee_code,
            entity_label=f"{employee.employee_code} — {employee.full_name}",
        )
        return Response({"status": "deactivated"})

    @action(detail=True, methods=["get", "post"], url_path="salary-records")
    def salary_records(self, request, employee_code=None):
        """
        GET:  List salary history for this employee.
        POST: Add a new salary record (hr_note required, base_salary > 0).
        """
        employee = self.get_object()

        if request.method == "GET":
            records = SalaryRecord.objects.filter(employee=employee)
            serializer = SalaryRecordSerializer(records, many=True)
            return Response(serializer.data)

        # POST — create new salary record
        create_ser = SalaryRecordCreateSerializer(data=request.data)
        create_ser.is_valid(raise_exception=True)
        data = create_ser.validated_data

        old_salary = (
            str(employee.current_salary_record.base_salary)
            if employee.current_salary_record
            else "N/A"
        )

        record = SalaryRecord(
            employee=employee,
            base_salary=data["base_salary"],
            variable_bonus_pct=data.get("variable_bonus_pct", 0),
            effective_date=data["effective_date"],
            hr_note=data["hr_note"],
            source="manual",
        )
        record.save()

        # Update employee pointer
        Employee.objects.filter(pk=employee.pk).update(current_salary_record=record)

        # Audit
        log_audit(
            action="update",
            entity_type="employee",
            entity_id=employee.employee_code,
            entity_label=f"{employee.employee_code} — {employee.full_name}",
            field_changed="base_salary",
            old_value=old_salary,
            new_value=str(data["base_salary"]),
        )

        return Response(
            SalaryRecordSerializer(record).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["get"], url_path="band-status")
    def band_status(self, request, employee_code=None):
        """Returns band comparison (below/within/above + variance)."""
        employee = self.get_object()
        return Response(get_band_status(employee))

    @action(
        detail=False,
        methods=["post"],
        url_path="import",
        parser_classes=[MultiPartParser, FormParser],
    )
    def import_csv(self, request):
        """
        Upload a CSV file for bulk employee import.
        Returns a task_id to poll for status.
        """
        csv_file = request.FILES.get("file")
        if not csv_file:
            return Response(
                {"error": "No file provided. Send a CSV as 'file'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        task = BackgroundTask.objects.create(task_type="csv_import")
        # Save file to task
        task.file.save(f"import_{task.id}.csv", csv_file)

        from .tasks import process_csv_import

        process_csv_import.delay(str(task.id))

        return Response(
            {"task_id": str(task.id), "status": "pending"},
            status=status.HTTP_202_ACCEPTED,
        )

    @action(detail=False, methods=["get"], url_path=r"import/(?P<task_id>[^/.]+)/status")
    def import_status(self, request, task_id=None):
        """Poll import task status."""
        task = get_object_or_404(BackgroundTask, id=task_id, task_type="csv_import")
        return Response({
            "task_id": str(task.id),
            "status": task.status,
            "result_data": task.result_data,
        })

    @action(detail=False, methods=["post"], url_path="export")
    def export(self, request):
        """
        Create an export task. Accepts filter params in the body.
        Returns a task_id to poll/download.
        """
        filters = {
            k: v
            for k, v in request.data.items()
            if k in ("department", "country", "employment_type", "is_active", "format")
        }
        export_format = filters.pop("format", "csv")

        task = BackgroundTask.objects.create(task_type="employee_export")

        from .tasks import generate_export_file

        generate_export_file.delay(str(task.id), filters, export_format)

        return Response(
            {"task_id": str(task.id), "status": "pending"},
            status=status.HTTP_202_ACCEPTED,
        )

    @action(detail=False, methods=["get"], url_path=r"export/(?P<task_id>[^/.]+)/download")
    def export_download(self, request, task_id=None):
        """Download generated export file."""
        task = get_object_or_404(BackgroundTask, id=task_id, task_type="employee_export")
        if task.status != "completed" or not task.file:
            return Response(
                {"error": "Export not ready.", "status": task.status},
                status=status.HTTP_404_NOT_FOUND,
            )
        from django.http import FileResponse

        return FileResponse(task.file.open("rb"), as_attachment=True, filename=task.file.name.split("/")[-1])
