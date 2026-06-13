from django.db import models

from core.models import Country, Currency, Department, JobTitle


class Employee(models.Model):
    """An employee record. Never hard-deleted — use is_active=False."""

    EMPLOYMENT_TYPE_CHOICES = [
        ("full_time", "Full Time"),
        ("part_time", "Part Time"),
        ("contractor", "Contractor"),
    ]

    employee_code = models.CharField(
        max_length=20,
        unique=True,
        blank=True,
        help_text="Auto-generated, e.g. EMP00001",
    )
    full_name = models.CharField(max_length=300)
    department = models.ForeignKey(
        Department,
        on_delete=models.PROTECT,
        related_name="employees",
    )
    job_title = models.ForeignKey(
        JobTitle,
        on_delete=models.PROTECT,
        related_name="employees",
    )
    country = models.ForeignKey(
        Country,
        on_delete=models.PROTECT,
        related_name="employees",
    )
    local_currency = models.ForeignKey(
        Currency,
        on_delete=models.PROTECT,
        related_name="employees",
    )
    employment_type = models.CharField(
        max_length=20,
        choices=EMPLOYMENT_TYPE_CHOICES,
        default="full_time",
    )
    is_active = models.BooleanField(default=True)
    current_salary_record = models.ForeignKey(
        "SalaryRecord",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
        help_text="Points to the latest salary record for fast reads.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["employee_code"]

    def __str__(self):
        return f"{self.employee_code} — {self.full_name}"


class SalaryRecord(models.Model):
    """
    Append-only salary history.
    No record is ever updated or deleted — edits create new rows.
    Model-level guards enforce immutability after initial creation.
    """

    SOURCE_CHOICES = [
        ("manual", "Manual"),
        ("csv_import", "CSV Import"),
        ("salary_review", "Salary Review"),
    ]

    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="salary_history",
    )
    base_salary = models.DecimalField(max_digits=18, decimal_places=2)
    variable_bonus_pct = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
    )
    effective_date = models.DateField()
    hr_note = models.TextField(blank=True, default="")
    source = models.CharField(
        max_length=20,
        choices=SOURCE_CHOICES,
        default="manual",
    )
    review_cycle = models.ForeignKey(
        "reviews.ReviewCycle",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="salary_records",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.CharField(max_length=200, default="HR Manager")

    class Meta:
        ordering = ["-effective_date", "-created_at"]

    def __str__(self):
        return (
            f"{self.employee.employee_code} | "
            f"{self.base_salary} | {self.effective_date}"
        )

    def save(self, *args, **kwargs):
        """Block updates on existing records — append-only."""
        if self.pk and not self._state.adding:
            raise ValueError(
                "SalaryRecord is immutable. Create a new record instead of updating."
            )
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        """Block deletion — salary history must be preserved."""
        raise ValueError(
            "SalaryRecord cannot be deleted. Salary history is immutable."
        )
