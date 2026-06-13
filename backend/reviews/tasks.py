from datetime import date
from decimal import Decimal
from celery import shared_task
from django.db import transaction

from core.models import BackgroundTask
from employees.models import SalaryRecord
from audit.utils import log_audit
from .models import ReviewCycle, SalaryProposal


@shared_task
def commit_review_cycle(review_cycle_id, task_id):
    """
    Celery task to commit all proposals in a review cycle.
    Creates new SalaryRecord instances and updates Employee pointers.
    """
    try:
        task = BackgroundTask.objects.get(id=task_id)
    except BackgroundTask.DoesNotExist:
        task = None

    if task:
        task.status = "processing"
        task.save(update_fields=["status"])

    try:
        cycle = ReviewCycle.objects.get(id=review_cycle_id)
        if cycle.status == "completed":
            raise ValueError("Review cycle is already completed.")

        uncommitted = cycle.proposals.filter(is_committed=False).select_related("employee")
        
        proposals_applied = 0
        with transaction.atomic():
            for proposal in uncommitted:
                employee = proposal.employee
                current_salary = proposal.current_salary
                proposed_salary = proposal.proposed_salary
                
                # Carry over variable bonus percentage if previous record exists, otherwise 0
                prev_bonus = (
                    employee.current_salary_record.variable_bonus_pct 
                    if employee.current_salary_record 
                    else Decimal("0.00")
                )

                # Create a new SalaryRecord
                record = SalaryRecord.objects.create(
                    employee=employee,
                    base_salary=proposed_salary,
                    variable_bonus_pct=prev_bonus,
                    effective_date=date.today(),
                    hr_note=f"Applied from review cycle: {cycle.name}",
                    source="salary_review",
                    review_cycle=cycle,
                    created_by="HR Manager",
                )

                # Update the employee's current salary pointer
                employee.current_salary_record = record
                employee.save(update_fields=["current_salary_record", "updated_at"])

                # Mark proposal as committed
                proposal.is_committed = True
                proposal.save(update_fields=["is_committed"])

                # Log audit trail for employee base salary change
                log_audit(
                    action="update",
                    entity_type="employee",
                    entity_id=employee.pk,
                    entity_label=str(employee),
                    field_changed="base_salary",
                    old_value=str(current_salary),
                    new_value=str(proposed_salary),
                    acting_user="System / Review Cycle",
                )
                proposals_applied += 1

            # Mark cycle as completed
            cycle.status = "completed"
            cycle.save(update_fields=["status", "updated_at"])

            # Log audit for the review cycle status transition
            log_audit(
                action="update",
                entity_type="review_cycle",
                entity_id=cycle.pk,
                entity_label=str(cycle),
                field_changed="status",
                old_value="in_progress",
                new_value="completed",
                acting_user="System",
            )

        if task:
            task.status = "completed"
            task.result_data = {"proposals_applied": proposals_applied}
            task.save(update_fields=["status", "result_data"])

    except Exception as e:
        if task:
            task.status = "failed"
            task.result_data = {"error": str(e)}
            task.save(update_fields=["status", "result_data"])
        raise e
