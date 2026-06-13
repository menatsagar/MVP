from rest_framework import serializers

from .models import Employee, SalaryRecord


class SalaryRecordSerializer(serializers.ModelSerializer):
    """Read/create serializer for salary history records."""

    class Meta:
        model = SalaryRecord
        fields = [
            "id",
            "employee",
            "base_salary",
            "variable_bonus_pct",
            "effective_date",
            "hr_note",
            "source",
            "review_cycle",
            "created_at",
            "created_by",
        ]
        read_only_fields = ["id", "created_at"]


class EmployeeListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views."""

    department_name = serializers.CharField(source="department.name", read_only=True)
    job_title_name = serializers.CharField(source="job_title.title", read_only=True)
    country_name = serializers.CharField(source="country.name", read_only=True)
    currency_code = serializers.CharField(source="local_currency.code", read_only=True)
    current_base_salary = serializers.DecimalField(
        source="current_salary_record.base_salary",
        max_digits=18,
        decimal_places=2,
        read_only=True,
        default=None,
    )

    class Meta:
        model = Employee
        fields = [
            "id",
            "employee_code",
            "full_name",
            "department",
            "department_name",
            "job_title",
            "job_title_name",
            "country",
            "country_name",
            "local_currency",
            "currency_code",
            "employment_type",
            "is_active",
            "current_base_salary",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "employee_code", "created_at", "updated_at"]


class EmployeeDetailSerializer(serializers.ModelSerializer):
    """Full serializer with nested salary history."""

    department_name = serializers.CharField(source="department.name", read_only=True)
    job_title_name = serializers.CharField(source="job_title.title", read_only=True)
    country_name = serializers.CharField(source="country.name", read_only=True)
    currency_code = serializers.CharField(source="local_currency.code", read_only=True)
    salary_history = SalaryRecordSerializer(many=True, read_only=True)
    current_salary = SalaryRecordSerializer(
        source="current_salary_record", read_only=True
    )

    class Meta:
        model = Employee
        fields = [
            "id",
            "employee_code",
            "full_name",
            "department",
            "department_name",
            "job_title",
            "job_title_name",
            "country",
            "country_name",
            "local_currency",
            "currency_code",
            "employment_type",
            "is_active",
            "current_salary",
            "salary_history",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "employee_code", "created_at", "updated_at"]
