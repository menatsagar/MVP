from rest_framework import serializers

from .models import DepartmentBudget, ReviewCycle, SalaryProposal


class ReviewCycleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReviewCycle
        fields = ["id", "name", "year", "status", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class DepartmentBudgetSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(
        source="department.name", read_only=True
    )

    class Meta:
        model = DepartmentBudget
        fields = [
            "id",
            "review_cycle",
            "department",
            "department_name",
            "budget_pct",
        ]


class SalaryProposalSerializer(serializers.ModelSerializer):
    employee_code = serializers.CharField(
        source="employee.employee_code", read_only=True
    )
    employee_name = serializers.CharField(
        source="employee.full_name", read_only=True
    )

    class Meta:
        model = SalaryProposal
        fields = [
            "id",
            "review_cycle",
            "employee",
            "employee_code",
            "employee_name",
            "current_salary",
            "proposed_increase_pct",
            "proposed_salary",
            "is_committed",
        ]
        read_only_fields = ["id", "proposed_salary", "is_committed"]


class ReviewCycleDetailSerializer(serializers.ModelSerializer):
    """Full detail serializer with nested budgets and proposals."""

    department_budgets = DepartmentBudgetSerializer(many=True, read_only=True)
    proposals = SalaryProposalSerializer(many=True, read_only=True)

    class Meta:
        model = ReviewCycle
        fields = [
            "id",
            "name",
            "year",
            "status",
            "department_budgets",
            "proposals",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
