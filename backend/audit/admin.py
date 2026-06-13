from django.contrib import admin

from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = [
        "timestamp",
        "action",
        "entity_type",
        "entity_id",
        "entity_label",
        "field_changed",
        "acting_user",
    ]
    list_filter = ["action", "entity_type", "acting_user"]
    search_fields = ["entity_label", "entity_id"]
    readonly_fields = [
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

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
