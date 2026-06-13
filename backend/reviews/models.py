from decimal import Decimal

from django.db import models

from core.models import Department
from employees.models import Employee


class ReviewCycle(models.Model):
    """A salary review cycle (e.g., Annual 2026)."""

    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("in_progress", "In Progress"),
        ("completed", "Completed"),
    ]

    name = models.CharField(max_length=200, help_text='e.g. "Annual 2026"')
    year = models.IntegerField()
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="draft",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-year", "-created_at"]

    def __str__(self):
        return f"{self.name} ({self.get_status_display()})"


class DepartmentBudget(models.Model):
    """Per-department budget percentage for a review cycle."""

    review_cycle = models.ForeignKey(
        ReviewCycle,
        on_delete=models.CASCADE,
        related_name="department_budgets",
    )
    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name="review_budgets",
    )
    budget_pct = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        help_text="Budget increase percentage for this department",
    )

    class Meta:
        unique_together = [("review_cycle", "department")]

    def __str__(self):
        return f"{self.review_cycle.name} — {self.department.name}: {self.budget_pct}%"


class SalaryProposal(models.Model):
    """
    A proposed salary change for an employee within a review cycle.
    proposed_salary is auto-calculated on save.
    """

    review_cycle = models.ForeignKey(
        ReviewCycle,
        on_delete=models.CASCADE,
        related_name="proposals",
    )
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="salary_proposals",
    )
    current_salary = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        help_text="Snapshot of employee salary at cycle creation",
    )
    proposed_increase_pct = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        help_text="Proposed increase percentage, editable by HR Manager",
    )
    proposed_salary = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        help_text="Auto-calculated: current_salary * (1 + proposed_increase_pct / 100)",
    )
    is_committed = models.BooleanField(
        default=False,
        help_text="True once this proposal has been applied to the employee record",
    )

    class Meta:
        unique_together = [("review_cycle", "employee")]
        ordering = ["employee__employee_code"]

    def save(self, *args, **kwargs):
        """Auto-calculate proposed_salary before saving."""
        self.proposed_salary = self.current_salary * (
            1 + self.proposed_increase_pct / Decimal("100")
        )
        super().save(*args, **kwargs)

    def __str__(self):
        return (
            f"{self.employee.employee_code} — "
            f"{self.proposed_increase_pct}% → {self.proposed_salary}"
        )
