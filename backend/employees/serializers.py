from rest_framework import serializers

from audit.utils import log_audit

from core.models import Currency
from .models import Employee, SalaryRecord
from .services import convert_to_usd, get_band_status


class SalaryRecordSerializer(serializers.ModelSerializer):
    """Read-only serializer for salary history records."""

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
        read_only_fields = fields


class SalaryRecordCreateSerializer(serializers.Serializer):
    """
    Create-only serializer for adding a new salary record to an employee.
    Validates business rules: base_salary > 0, hr_note required.
    """

    base_salary = serializers.DecimalField(max_digits=18, decimal_places=2)
    variable_bonus_pct = serializers.DecimalField(
        max_digits=5, decimal_places=2, default=0
    )
    effective_date = serializers.DateField()
    hr_note = serializers.CharField(min_length=1)

    def validate_base_salary(self, value):
        if value <= 0:
            raise serializers.ValidationError("Base salary must be greater than 0.")
        return value

    def validate_variable_bonus_pct(self, value):
        if value < 0:
            raise serializers.ValidationError("Variable bonus percentage must be >= 0.")
        return value


class EmployeeListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views with USD conversion and band status."""

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
    salary_usd = serializers.SerializerMethodField()
    band_status = serializers.SerializerMethodField()

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
            "salary_usd",
            "band_status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "employee_code", "created_at", "updated_at"]

    def get_salary_usd(self, obj):
        if not obj.current_salary_record:
            return {"usd_value": None, "usd_unavailable": True}
        return convert_to_usd(obj.current_salary_record.base_salary, obj.local_currency)

    def get_band_status(self, obj):
        return get_band_status(obj)["status"]


class EmployeeDetailSerializer(serializers.ModelSerializer):
    """Full serializer with nested salary history, USD conversion, and band details."""

    department_name = serializers.CharField(source="department.name", read_only=True)
    job_title_name = serializers.CharField(source="job_title.title", read_only=True)
    country_name = serializers.CharField(source="country.name", read_only=True)
    currency_code = serializers.CharField(source="local_currency.code", read_only=True)
    salary_history = SalaryRecordSerializer(many=True, read_only=True)
    current_salary = SalaryRecordSerializer(
        source="current_salary_record", read_only=True
    )
    salary_usd = serializers.SerializerMethodField()
    band_status = serializers.SerializerMethodField()

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
            "salary_usd",
            "band_status",
            "salary_history",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "employee_code", "created_at", "updated_at"]

    def get_salary_usd(self, obj):
        if not obj.current_salary_record:
            return {"usd_value": None, "usd_unavailable": True}
        return convert_to_usd(obj.current_salary_record.base_salary, obj.local_currency)

    def get_band_status(self, obj):
        return get_band_status(obj)


class EmployeeCreateSerializer(serializers.ModelSerializer):
    """
    Create serializer — accepts employee profile + initial salary data inline.
    Creates both Employee and the first SalaryRecord in one request.
    """

    # Inline salary fields (not on Employee model)
    base_salary = serializers.DecimalField(max_digits=18, decimal_places=2, write_only=True)
    effective_date = serializers.DateField(write_only=True)
    local_currency = serializers.PrimaryKeyRelatedField(
        queryset=Currency.objects.all(), required=False
    )
    variable_bonus_pct = serializers.DecimalField(
        max_digits=5, decimal_places=2, default=0, write_only=True
    )

    class Meta:
        model = Employee
        fields = [
            "id",
            "employee_code",
            "full_name",
            "department",
            "job_title",
            "country",
            "local_currency",
            "employment_type",
            # Inline salary
            "base_salary",
            "effective_date",
            "variable_bonus_pct",
        ]
        read_only_fields = ["id", "employee_code"]

    def validate(self, attrs):
        if "local_currency" not in attrs and "country" in attrs:
            attrs["local_currency"] = attrs["country"].default_currency
        return attrs

    def validate_base_salary(self, value):
        if value <= 0:
            raise serializers.ValidationError("Base salary must be greater than 0.")
        return value

    def validate_variable_bonus_pct(self, value):
        if value < 0:
            raise serializers.ValidationError("Variable bonus percentage must be >= 0.")
        return value

    def create(self, validated_data):
        # Pop salary fields before creating employee
        base_salary = validated_data.pop("base_salary")
        effective_date = validated_data.pop("effective_date")
        variable_bonus_pct = validated_data.pop("variable_bonus_pct", 0)

        employee = Employee.objects.create(**validated_data)

        # Create initial salary record
        record = SalaryRecord(
            employee=employee,
            base_salary=base_salary,
            effective_date=effective_date,
            variable_bonus_pct=variable_bonus_pct,
            source="manual",
            hr_note="Initial salary on employee creation.",
        )
        record.save()

        # Point employee to the initial record
        employee.current_salary_record = record
        Employee.objects.filter(pk=employee.pk).update(current_salary_record=record)

        # Audit log
        log_audit(
            action="create",
            entity_type="employee",
            entity_id=employee.employee_code,
            entity_label=f"{employee.employee_code} — {employee.full_name}",
        )

        return employee
