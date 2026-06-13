from rest_framework import serializers

from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = [
            "id",
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
        read_only_fields = fields  # Entire model is read-only via API
