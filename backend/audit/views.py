from django.http import FileResponse
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.models import BackgroundTask
from .filters import AuditLogFilter
from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditLogViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """
    Read-only audit log.
    Supports filtering by entity_type, action, date_from, and date_to via query params.
    """

    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = AuditLogFilter

    @action(detail=False, methods=["post"], url_path="export")
    def export(self, request):
        """
        Create an export task. Accepts filter params in the body.
        Returns a task_id to poll/download.
        """
        filters = {
            k: v
            for k, v in request.data.items()
            if k in ("action", "entity_type", "date_from", "date_to")
        }

        task = BackgroundTask.objects.create(task_type="audit_export")

        from .tasks import generate_audit_log_export
        generate_audit_log_export.delay(str(task.id), filters)

        return Response(
            {"task_id": str(task.id), "status": "pending"},
            status=status.HTTP_202_ACCEPTED,
        )

    @action(detail=False, methods=["get"], url_path=r"export/(?P<task_id>[^/.]+)/status")
    def export_status(self, request, task_id=None):
        """Poll export task status."""
        task = get_object_or_404(BackgroundTask, id=task_id, task_type="audit_export")
        return Response({
            "task_id": str(task.id),
            "status": task.status,
            "result_data": task.result_data,
        })

    @action(detail=False, methods=["get"], url_path=r"export/(?P<task_id>[^/.]+)/download")
    def export_download(self, request, task_id=None):
        """Download generated audit export file."""
        task = get_object_or_404(BackgroundTask, id=task_id, task_type="audit_export")
        if task.status != "completed" or not task.file:
            return Response(
                {"error": "Export not ready.", "status": task.status},
                status=status.HTTP_404_NOT_FOUND,
            )

        return FileResponse(
            task.file.open("rb"),
            as_attachment=True,
            filename=task.file.name.split("/")[-1]
        )
