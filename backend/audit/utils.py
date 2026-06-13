"""
Utility function for writing audit log entries.
Import and call from other apps whenever an auditable action occurs.
"""
from .models import AuditLog


def log_audit(
    action: str,
    entity_type: str,
    entity_id,
    entity_label: str,
    field_changed: str | None = None,
    old_value: str | None = None,
    new_value: str | None = None,
    acting_user: str = "HR Manager",
):
    """
    Create an audit log entry.

    Args:
        action: One of 'create', 'update', 'deactivate'.
        entity_type: One of 'employee', 'salary_band', 'review_cycle', 'currency'.
        entity_id: The PK or code of the entity.
        entity_label: Human-readable name/code.
        field_changed: Which field was modified (for updates).
        old_value: Previous value (for updates).
        new_value: New value (for creates/updates).
        acting_user: Who performed the action.
    """
    AuditLog.objects.create(
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id),
        entity_label=entity_label,
        field_changed=field_changed,
        old_value=old_value,
        new_value=new_value,
        acting_user=acting_user,
    )
