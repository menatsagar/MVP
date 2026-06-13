from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.models import BackgroundTask
from audit.utils import log_audit
from .models import ReviewCycle, SalaryProposal, DepartmentBudget
from .serializers import (
    DepartmentBudgetSerializer,
    ReviewCycleSerializer,
    ReviewCycleCreateSerializer,
    ReviewCycleListSerializer,
    ReviewCycleDetailSerializer,
    SalaryProposalSerializer,
)


class ReviewCycleViewSet(viewsets.ModelViewSet):
    """
    CRUD for review cycles.
    Includes custom transitions and nested updates for proposals/budgets.
    """

    queryset = ReviewCycle.objects.all()

    def get_serializer_class(self):
        if self.action == "retrieve":
            return ReviewCycleDetailSerializer
        elif self.action == "list":
            return ReviewCycleListSerializer
        elif self.action == "create":
            return ReviewCycleCreateSerializer
        return ReviewCycleSerializer

    @action(detail=True, methods=["post"])
    def transition(self, request, pk=None):
        """
        Transition review cycle status.
        Accepts: {"status": "in_progress"|"completed"}
        On "completed", triggers Celery background commit task.
        """
        cycle = self.get_object()
        new_status = request.data.get("status")

        if new_status not in ["in_progress", "completed"]:
            return Response(
                {"error": "Invalid status. Must be 'in_progress' or 'completed'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if cycle.status == "completed":
            return Response(
                {"error": "Cannot transition a completed review cycle."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if new_status == "in_progress":
            if cycle.status != "draft":
                return Response(
                    {"error": "Can only transition to 'in_progress' from 'draft'."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            old_status = cycle.status
            cycle.status = "in_progress"
            cycle.save(update_fields=["status", "updated_at"])
            
            log_audit(
                action="update",
                entity_type="review_cycle",
                entity_id=cycle.pk,
                entity_label=str(cycle),
                field_changed="status",
                old_value=old_status,
                new_value=cycle.status,
            )
            return Response({"status": "updated", "cycle_status": cycle.status})

        elif new_status == "completed":
            if cycle.status != "in_progress":
                return Response(
                    {"error": "Can only transition to 'completed' from 'in_progress'."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Create background task for async processing
            task = BackgroundTask.objects.create(
                task_type="review_commit",
                status="pending",
            )

            from .tasks import commit_review_cycle
            commit_review_cycle.delay(cycle.id, str(task.id))

            return Response(
                {
                    "status": "processing",
                    "task_id": str(task.id),
                    "message": "Review cycle completion task has been queued.",
                },
                status=status.HTTP_202_ACCEPTED,
            )

    @action(detail=True, methods=["get"], url_path="proposals")
    def list_proposals(self, request, pk=None):
        """List proposals for the review cycle."""
        cycle = self.get_object()
        proposals = cycle.proposals.select_related("employee", "employee__department")
        serializer = SalaryProposalSerializer(proposals, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["patch"], url_path="proposals/(?P<proposal_id>[0-9]+)")
    def update_proposal(self, request, pk=None, proposal_id=None):
        """Update proposed increase percentage for a proposal."""
        cycle = self.get_object()
        proposal = get_object_or_404(cycle.proposals, pk=proposal_id)

        if cycle.status == "completed":
            return Response(
                {"error": "Cannot update proposal in a completed review cycle."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = SalaryProposalSerializer(proposal, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="budgets")
    def list_budgets(self, request, pk=None):
        """List department budgets for the review cycle."""
        cycle = self.get_object()
        budgets = cycle.department_budgets.select_related("department")
        serializer = DepartmentBudgetSerializer(budgets, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["patch"], url_path="budgets/(?P<budget_id>[0-9]+)")
    def update_budget(self, request, pk=None, budget_id=None):
        """Update budget percentage for a department budget."""
        cycle = self.get_object()
        budget = get_object_or_404(cycle.department_budgets, pk=budget_id)

        if cycle.status == "completed":
            return Response(
                {"error": "Cannot update budget in a completed review cycle."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = DepartmentBudgetSerializer(budget, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
