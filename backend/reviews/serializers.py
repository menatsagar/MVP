from decimal import Decimal
from django.db import models, transaction
from rest_framework import serializers

from core.models import Department
from employees.models import Employee
from .models import DepartmentBudget, ReviewCycle, SalaryProposal


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
    exceeds_budget = serializers.SerializerMethodField()

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
            "exceeds_budget",
        ]
        read_only_fields = [
            "id",
            "review_cycle",
            "employee",
            "employee_code",
            "employee_name",
            "current_salary",
            "proposed_salary",
            "is_committed",
        ]

    def validate_proposed_increase_pct(self, value):
        if value < 0:
            raise serializers.ValidationError("Proposed increase percentage cannot be negative.")
        return value

    def get_exceeds_budget(self, obj):
        """
        Flag indicating if the department's budget percentage is exceeded 
        by the sum of proposed increase percentages in that department.
        """
        dept = obj.employee.department
        try:
            budget = DepartmentBudget.objects.get(
                review_cycle=obj.review_cycle,
                department=dept
            )
            budget_limit = budget.budget_pct
        except DepartmentBudget.DoesNotExist:
            return False

        # Sum proposed_increase_pct for all employees in this department for this cycle
        proposals = SalaryProposal.objects.filter(
            review_cycle=obj.review_cycle,
            employee__department=dept
        )
        total_proposed = sum(p.proposed_increase_pct for p in proposals)
        return total_proposed > budget_limit


class ReviewCycleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReviewCycle
        fields = ["id", "name", "year", "status", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class ReviewCycleListSerializer(serializers.ModelSerializer):
    headcount = serializers.SerializerMethodField()
    total_budget_pct = serializers.SerializerMethodField()

    class Meta:
        model = ReviewCycle
        fields = [
            "id",
            "name",
            "year",
            "status",
            "headcount",
            "total_budget_pct",
            "created_at",
            "updated_at",
        ]

    def get_headcount(self, obj):
        return obj.proposals.count()

    def get_total_budget_pct(self, obj):
        res = obj.department_budgets.aggregate(total=models.Sum("budget_pct"))
        return res["total"] or Decimal("0.00")


class DepartmentBudgetCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = DepartmentBudget
        fields = ["department", "budget_pct"]


class ReviewCycleCreateSerializer(serializers.ModelSerializer):
    department_budgets = DepartmentBudgetCreateSerializer(
        many=True, write_only=True, required=False
    )

    class Meta:
        model = ReviewCycle
        fields = ["id", "name", "year", "status", "department_budgets"]
        read_only_fields = ["id", "status"]

    def create(self, validated_data):
        budgets_data = validated_data.pop("department_budgets", [])

        with transaction.atomic():
            review_cycle = ReviewCycle.objects.create(**validated_data)

            # Create DepartmentBudgets
            for budget_data in budgets_data:
                DepartmentBudget.objects.create(
                    review_cycle=review_cycle,
                    department=budget_data["department"],
                    budget_pct=budget_data["budget_pct"],
                )

            # Auto-generate SalaryProposal rows for all active employees
            active_employees = Employee.objects.filter(is_active=True).select_related(
                "current_salary_record"
            )

            proposals = []
            for emp in active_employees:
                current_sal = (
                    emp.current_salary_record.base_salary 
                    if emp.current_salary_record 
                    else Decimal("0.00")
                )
                proposals.append(
                    SalaryProposal(
                        review_cycle=review_cycle,
                        employee=emp,
                        current_salary=current_sal,
                        proposed_increase_pct=Decimal("0.00"),
                        proposed_salary=current_sal,
                    )
                )
            SalaryProposal.objects.bulk_create(proposals)

        return review_cycle


class ReviewCycleDetailSerializer(serializers.ModelSerializer):
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
