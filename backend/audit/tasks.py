import csv
import io
from celery import shared_task
from django.core.files.base import ContentFile

from core.models import BackgroundTask
from .models import AuditLog


@shared_task(bind=True)
def generate_audit_log_export(self, task_id, filters=None):
    """
    Build a CSV of filtered audit logs and save to BackgroundTask.
    """
    task = BackgroundTask.objects.get(id=task_id)
    task.status = "processing"
    task.save(update_fields=["status"])

    try:
        qs = AuditLog.objects.all()
        if filters:
            if "action" in filters and filters["action"]:
                qs = qs.filter(action=filters["action"])
            if "entity_type" in filters and filters["entity_type"]:
                qs = qs.filter(entity_type=filters["entity_type"])
            if "date_from" in filters and filters["date_from"]:
                qs = qs.filter(timestamp__gte=filters["date_from"])
            if "date_to" in filters and filters["date_to"]:
                qs = qs.filter(timestamp__lte=filters["date_to"])

        headers = [
            "timestamp",
            "action",
            "entity_type",
            "entity_id",
            "entity_label",
            "field_changed",
            "old_value",
            "new_value",
            "acting_user",
        ]

        rows = []
        for log in qs:
            rows.append([
                log.timestamp.isoformat(),
                log.action,
                log.entity_type,
                log.entity_id,
                log.entity_label,
                log.field_changed or "",
                log.old_value or "",
                log.new_value or "",
                log.acting_user,
            ])

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(headers)
        writer.writerows(rows)

        task.file.save(
            f"audit_export_{task.id}.csv",
            ContentFile(output.getvalue().encode("utf-8")),
        )
        task.status = "completed"
        task.save(update_fields=["status"])

    except Exception as exc:
        task.status = "failed"
        task.result_data = {"error": str(exc)}
        task.save(update_fields=["status", "result_data"])
        raise
