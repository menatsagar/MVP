from django.contrib import admin

from .models import Employee, SalaryRecord


class SalaryRecordInline(admin.TabularInline):
    model = SalaryRecord
    extra = 0
    readonly_fields = ["created_at", "created_by"]
    ordering = ["-effective_date", "-created_at"]


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = [
        "employee_code",
        "full_name",
        "department",
        "job_title",
        "country",
        "employment_type",
        "is_active",
    ]
    list_filter = ["department", "country", "employment_type", "is_active"]
    search_fields = ["employee_code", "full_name"]
    readonly_fields = ["employee_code", "created_at", "updated_at"]
    inlines = [SalaryRecordInline]


@admin.register(SalaryRecord)
class SalaryRecordAdmin(admin.ModelAdmin):
    list_display = [
        "employee",
        "base_salary",
        "variable_bonus_pct",
        "effective_date",
        "source",
        "created_at",
    ]
    list_filter = ["source", "effective_date"]
    search_fields = ["employee__employee_code", "employee__full_name"]
    readonly_fields = ["created_at"]
