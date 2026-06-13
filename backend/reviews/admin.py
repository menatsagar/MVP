from django.contrib import admin

from .models import DepartmentBudget, ReviewCycle, SalaryProposal


class DepartmentBudgetInline(admin.TabularInline):
    model = DepartmentBudget
    extra = 1


class SalaryProposalInline(admin.TabularInline):
    model = SalaryProposal
    extra = 0
    readonly_fields = ["proposed_salary"]


@admin.register(ReviewCycle)
class ReviewCycleAdmin(admin.ModelAdmin):
    list_display = ["name", "year", "status", "created_at"]
    list_filter = ["status", "year"]
    search_fields = ["name"]
    inlines = [DepartmentBudgetInline, SalaryProposalInline]


@admin.register(DepartmentBudget)
class DepartmentBudgetAdmin(admin.ModelAdmin):
    list_display = ["review_cycle", "department", "budget_pct"]
    list_filter = ["review_cycle", "department"]


@admin.register(SalaryProposal)
class SalaryProposalAdmin(admin.ModelAdmin):
    list_display = [
        "employee",
        "review_cycle",
        "current_salary",
        "proposed_increase_pct",
        "proposed_salary",
        "is_committed",
    ]
    list_filter = ["review_cycle", "is_committed"]
    search_fields = ["employee__employee_code", "employee__full_name"]
    readonly_fields = ["proposed_salary"]
