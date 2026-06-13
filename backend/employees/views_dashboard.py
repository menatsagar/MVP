"""
Dashboard API views — summary stats and distribution analytics.
Lives in the employees app (no separate dashboard app).
"""
from decimal import Decimal

from django.db.models import Avg, Count, Sum
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from salary_bands.models import SalaryBand

from .models import Employee
from .services import convert_to_usd


class DashboardSummaryView(APIView):
    """
    GET /api/dashboard/summary/

    Returns total headcount, total annual payroll (USD),
    average base salary (USD), median base salary (USD).
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        employees = Employee.objects.filter(is_active=True).select_related(
            "current_salary_record", "local_currency"
        )

        total_headcount = employees.count()
        usd_salaries = []

        for emp in employees:
            if not emp.current_salary_record:
                continue
            result = convert_to_usd(
                emp.current_salary_record.base_salary,
                emp.local_currency,
            )
            if result["usd_value"] is not None:
                usd_salaries.append(result["usd_value"])

        total_payroll_usd = sum(usd_salaries) if usd_salaries else Decimal("0")
        avg_salary_usd = (
            (total_payroll_usd / len(usd_salaries)).quantize(Decimal("0.01"))
            if usd_salaries
            else None
        )

        # Median
        median_salary_usd = None
        if usd_salaries:
            sorted_salaries = sorted(usd_salaries)
            n = len(sorted_salaries)
            mid = n // 2
            if n % 2 == 0:
                median_salary_usd = (
                    (sorted_salaries[mid - 1] + sorted_salaries[mid]) / 2
                ).quantize(Decimal("0.01"))
            else:
                median_salary_usd = sorted_salaries[mid]

        return Response({
            "total_headcount": total_headcount,
            "total_annual_payroll_usd": total_payroll_usd,
            "average_base_salary_usd": avg_salary_usd,
            "median_base_salary_usd": median_salary_usd,
        })


class DashboardDistributionView(APIView):
    """
    GET /api/dashboard/distribution/?group_by=band|department|country

    Returns histogram buckets with employee counts, all converted to USD.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        group_by = request.query_params.get("group_by", "department")
        employees = Employee.objects.filter(is_active=True).select_related(
            "department", "country", "job_title", "current_salary_record", "local_currency"
        )

        if group_by == "department":
            return Response(self._group_by_department(employees))
        elif group_by == "country":
            return Response(self._group_by_country(employees))
        elif group_by == "band":
            return Response(self._group_by_band(employees))
        else:
            return Response(
                {"error": f"Invalid group_by value: '{group_by}'. Use 'department', 'country', or 'band'."},
                status=400,
            )

    def _group_by_department(self, employees):
        buckets = {}
        for emp in employees:
            dept_name = emp.department.name
            if dept_name not in buckets:
                buckets[dept_name] = {"count": 0, "total_usd": Decimal("0")}
            buckets[dept_name]["count"] += 1
            if emp.current_salary_record:
                result = convert_to_usd(emp.current_salary_record.base_salary, emp.local_currency)
                if result["usd_value"]:
                    buckets[dept_name]["total_usd"] += result["usd_value"]

        return [
            {"group": name, "employee_count": data["count"], "total_salary_usd": data["total_usd"]}
            for name, data in sorted(buckets.items())
        ]

    def _group_by_country(self, employees):
        buckets = {}
        for emp in employees:
            country_name = emp.country.name
            if country_name not in buckets:
                buckets[country_name] = {"count": 0, "total_usd": Decimal("0")}
            buckets[country_name]["count"] += 1
            if emp.current_salary_record:
                result = convert_to_usd(emp.current_salary_record.base_salary, emp.local_currency)
                if result["usd_value"]:
                    buckets[country_name]["total_usd"] += result["usd_value"]

        return [
            {"group": name, "employee_count": data["count"], "total_salary_usd": data["total_usd"]}
            for name, data in sorted(buckets.items())
        ]

    def _group_by_band(self, employees):
        bands = {
            (b.job_title_id, b.country_id): b
            for b in SalaryBand.objects.all()
        }

        buckets = {"below": 0, "within": 0, "above": 0, "no_band_defined": 0}
        for emp in employees:
            if not emp.current_salary_record:
                buckets["no_band_defined"] += 1
                continue

            band = bands.get((emp.job_title_id, emp.country_id))
            if not band:
                buckets["no_band_defined"] += 1
                continue

            salary = emp.current_salary_record.base_salary
            if salary < band.min_salary:
                buckets["below"] += 1
            elif salary > band.max_salary:
                buckets["above"] += 1
            else:
                buckets["within"] += 1

        return [
            {"group": status, "employee_count": count}
            for status, count in buckets.items()
        ]
