from datetime import date

from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from employees.models import SalaryRecord

from .models import DepartmentBudget, ReviewCycle, SalaryProposal
from .serializers import (
    DepartmentBudgetSerializer,
    ReviewCycleDetailSerializer,
    ReviewCycleSerializer,
    SalaryProposalSerializer,
)


class ReviewCycleViewSet(viewsets.ModelViewSet):
    """
    CRUD for review cycles.
    - List uses the lightweight serializer.
    - Retrieve uses the detail serializer with nested budgets/proposals.
    - Custom `commit` action applies all proposals.
    """

    queryset = ReviewCycle.objects.all()

    def get_serializer_class(self):
        if self.action == "retrieve":
            return ReviewCycleDetailSerializer
        return ReviewCycleSerializer

    @action(detail=True, methods=["post"])
    def commit(self, request, pk=None):
        """
        Commit all proposals in this review cycle:
        1. Create a SalaryRecord for each uncommitted proposal.
        2. Update each employee's current_salary_record pointer.
        3. Mark proposals as committed.
        4. Set cycle status to 'completed'.
        """
        cycle = self.get_object()

        if cycle.status == "completed":
            return Response(
                {"error": "This review cycle is already completed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        uncommitted = cycle.proposals.filter(is_committed=False).select_related(
            "employee"
        )
        if not uncommitted.exists():
            return Response(
                {"error": "No uncommitted proposals found."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            for proposal in uncommitted:
                # Create a new salary record
                record = SalaryRecord.objects.create(
                    employee=proposal.employee,
                    base_salary=proposal.proposed_salary,
                    variable_bonus_pct=0,
                    effective_date=date.today(),
                    hr_note=f"Applied from review cycle: {cycle.name}",
                    source="salary_review",
                    review_cycle=cycle,
                    created_by="HR Manager",
                )
                # Update the employee's current salary pointer
                proposal.employee.current_salary_record = record
                proposal.employee.save(
                    update_fields=["current_salary_record", "updated_at"]
                )
                # Mark proposal as committed
                proposal.is_committed = True
                proposal.save(update_fields=["is_committed"])

            # Mark cycle as completed
            cycle.status = "completed"
            cycle.save(update_fields=["status", "updated_at"])

        return Response(
            {
                "status": "committed",
                "proposals_applied": uncommitted.count(),
            }
        )


class DepartmentBudgetViewSet(viewsets.ModelViewSet):
    """CRUD for department budgets within a review cycle."""

    queryset = DepartmentBudget.objects.select_related(
        "review_cycle", "department"
    ).all()
    serializer_class = DepartmentBudgetSerializer


class SalaryProposalViewSet(viewsets.ModelViewSet):
    """CRUD for salary proposals within a review cycle."""

    queryset = SalaryProposal.objects.select_related(
        "review_cycle", "employee"
    ).all()
    serializer_class = SalaryProposalSerializer
