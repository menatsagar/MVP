from django.db import models


class AuditLog(models.Model):
    """
    Immutable audit trail.
    Records every create / update / deactivate action across key entities.
    """

    ACTION_CHOICES = [
        ("create", "Create"),
        ("update", "Update"),
        ("deactivate", "Deactivate"),
    ]

    ENTITY_TYPE_CHOICES = [
        ("employee", "Employee"),
        ("salary_band", "Salary Band"),
        ("review_cycle", "Review Cycle"),
        ("currency", "Currency"),
    ]

    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    entity_type = models.CharField(max_length=30, choices=ENTITY_TYPE_CHOICES)
    entity_id = models.CharField(max_length=100)
    entity_label = models.CharField(
        max_length=300,
        help_text="Human-readable name or code of the entity",
    )
    field_changed = models.CharField(max_length=200, null=True, blank=True)
    old_value = models.TextField(null=True, blank=True)
    new_value = models.TextField(null=True, blank=True)
    acting_user = models.CharField(max_length=200, default="HR Manager")

    class Meta:
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["entity_type", "entity_id"]),
        ]

    def __str__(self):
        return (
            f"[{self.timestamp:%Y-%m-%d %H:%M}] {self.action} "
            f"{self.entity_type} {self.entity_label}"
        )
