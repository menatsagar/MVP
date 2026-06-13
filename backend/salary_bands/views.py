from rest_framework import viewsets

from audit.utils import log_audit

from .models import SalaryBand
from .serializers import SalaryBandSerializer


class SalaryBandViewSet(viewsets.ModelViewSet):
    """CRUD for salary bands with audit logging."""

    queryset = SalaryBand.objects.select_related(
        "job_title", "job_title__department", "country", "currency"
    ).all()
    serializer_class = SalaryBandSerializer
    filterset_fields = ["job_title", "country"]

    def perform_create(self, serializer):
        band = serializer.save()
        log_audit(
            action="create",
            entity_type="salary_band",
            entity_id=band.pk,
            entity_label=str(band),
        )

    def perform_update(self, serializer):
        instance = serializer.instance
        old_values = {
            "min_salary": str(instance.min_salary),
            "mid_salary": str(instance.mid_salary),
            "max_salary": str(instance.max_salary),
        }
        band = serializer.save()
        for field, old_val in old_values.items():
            new_val = str(getattr(band, field))
            if old_val != new_val:
                log_audit(
                    action="update",
                    entity_type="salary_band",
                    entity_id=band.pk,
                    entity_label=str(band),
                    field_changed=field,
                    old_value=old_val,
                    new_value=new_val,
                )

    def perform_destroy(self, instance):
        log_audit(
            action="deactivate",
            entity_type="salary_band",
            entity_id=instance.pk,
            entity_label=str(instance),
        )
        instance.delete()
