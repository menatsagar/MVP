from django.db import transaction
from django.db.models.signals import pre_save
from django.dispatch import receiver

from .models import Employee


@receiver(pre_save, sender=Employee)
def generate_employee_code(sender, instance, **kwargs):
    """Auto-assign employee_code on first save (e.g. EMP00001).

    Uses select_for_update to prevent race conditions when
    multiple employees are created concurrently.
    """
    if not instance.employee_code:
        with transaction.atomic():
            last = (
                Employee.objects.select_for_update()
                .filter(employee_code__startswith="EMP")
                .order_by("-employee_code")
                .values_list("employee_code", flat=True)
                .first()
            )
            if last:
                try:
                    seq = int(last.replace("EMP", "")) + 1
                except ValueError:
                    seq = 1
            else:
                seq = 1
            instance.employee_code = f"EMP{seq:05d}"
