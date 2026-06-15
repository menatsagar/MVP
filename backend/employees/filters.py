import django_filters

from salary_bands.models import SalaryBand

from .models import Employee


class EmployeeFilter(django_filters.FilterSet):
    """
    Filters for the employee list endpoint.

    Supports: department, country, employment_type, is_active, search, band_status.
    Also supports name-based filters: department_name, country_name.
    """

    search = django_filters.CharFilter(method="filter_search", label="Search name or code")
    department_name = django_filters.CharFilter(
        field_name="department__name", lookup_expr="exact", label="Department name"
    )
    country_name = django_filters.CharFilter(
        field_name="country__name", lookup_expr="exact", label="Country name"
    )
    band_status = django_filters.ChoiceFilter(
        choices=[
            ("below", "Below Band"),
            ("within", "Within Band"),
            ("above", "Above Band"),
        ],
        method="filter_band_status",
        label="Band status",
    )

    class Meta:
        model = Employee
        fields = {
            "department": ["exact"],
            "country": ["exact"],
            "employment_type": ["exact"],
            "is_active": ["exact"],
        }

    def filter_search(self, queryset, name, value):
        """Search by full_name or employee_code (case-insensitive)."""
        return queryset.filter(
            models.Q(full_name__icontains=value) | models.Q(employee_code__icontains=value)
        )

    def filter_band_status(self, queryset, name, value):
        """
        Filter employees by salary band comparison.
        Requires joining with SalaryBand and comparing salary.
        """
        # Get all bands indexed by (job_title_id, country_id)
        bands = {
            (b.job_title_id, b.country_id): b
            for b in SalaryBand.objects.all()
        }

        matching_ids = []
        for emp in queryset.select_related("current_salary_record"):
            if not emp.current_salary_record:
                continue
            band = bands.get((emp.job_title_id, emp.country_id))
            if not band:
                continue

            salary = emp.current_salary_record.base_salary
            if value == "below" and salary < band.min_salary:
                matching_ids.append(emp.pk)
            elif value == "within" and band.min_salary <= salary <= band.max_salary:
                matching_ids.append(emp.pk)
            elif value == "above" and salary > band.max_salary:
                matching_ids.append(emp.pk)

        return queryset.filter(pk__in=matching_ids)


# Need this import for the Q object in filter_search
from django.db import models  # noqa: E402
