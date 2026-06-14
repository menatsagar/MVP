from datetime import date
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase, APIClient

from core.models import Country, Currency, Department, JobTitle
from salary_bands.models import SalaryBand
from audit.models import AuditLog
from employees.models import Employee, SalaryRecord
from employees.services import convert_to_usd, get_band_status

User = get_user_model()


class BaseAPITestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_superuser(
            username="test_hr", 
            email="test@example.com", 
            password="password123"
        )
        # Auth
        from rest_framework.authtoken.models import Token
        self.token = Token.objects.create(user=self.user)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")

        # Core Data
        self.currency_usd = Currency.objects.create(code="USD", name="US Dollar", rate_to_usd=Decimal("1.00"))
        self.currency_inr = Currency.objects.create(code="INR", name="Rupee", rate_to_usd=Decimal("0.012"))
        
        self.country_us = Country.objects.create(name="United States", default_currency=self.currency_usd)
        self.country_in = Country.objects.create(name="India", default_currency=self.currency_inr)

        self.dept_eng = Department.objects.create(name="Engineering")
        self.job_se = JobTitle.objects.create(title="Software Engineer", department=self.dept_eng)

        # Salary Band
        self.band_se_in = SalaryBand.objects.create(
            job_title=self.job_se,
            country=self.country_in,
            min_salary=Decimal("500000.00"),
            mid_salary=Decimal("1000000.00"),
            max_salary=Decimal("1500000.00"),
            currency=self.currency_inr
        )


class EmployeeModelAndServiceTests(BaseAPITestCase):
    def test_employee_code_auto_generation(self):
        emp1 = Employee.objects.create(
            full_name="Emp One",
            department=self.dept_eng,
            job_title=self.job_se,
            country=self.country_in,
            local_currency=self.currency_inr
        )
        self.assertEqual(emp1.employee_code, "EMP00001")

        emp2 = Employee.objects.create(
            full_name="Emp Two",
            department=self.dept_eng,
            job_title=self.job_se,
            country=self.country_in,
            local_currency=self.currency_inr
        )
        self.assertEqual(emp2.employee_code, "EMP00002")

    def test_salary_record_immutability(self):
        emp = Employee.objects.create(
            full_name="Test Emp",
            department=self.dept_eng,
            job_title=self.job_se,
            country=self.country_in,
            local_currency=self.currency_inr
        )
        record = SalaryRecord.objects.create(
            employee=emp,
            base_salary=Decimal("600000.00"),
            effective_date=date.today(),
            source="manual"
        )
        
        # Test update guard
        record.base_salary = Decimal("700000.00")
        with self.assertRaises(ValueError):
            record.save()

        # Test delete guard
        with self.assertRaises(ValueError):
            record.delete()

    def test_convert_to_usd_edge_cases(self):
        # Null amount or currency
        self.assertEqual(convert_to_usd(None, self.currency_usd)["usd_unavailable"], True)
        self.assertEqual(convert_to_usd(Decimal("100"), None)["usd_unavailable"], True)

        # Zero or null rate
        bad_currency = Currency.objects.create(code="BAD", name="Bad", rate_to_usd=Decimal("0.00"))
        self.assertEqual(convert_to_usd(Decimal("100"), bad_currency)["usd_unavailable"], True)

        # Normal conversion
        res = convert_to_usd(Decimal("100000"), self.currency_inr)
        self.assertEqual(res["usd_value"], Decimal("1200.00"))
        self.assertEqual(res["usd_unavailable"], False)

    def test_get_band_status(self):
        emp = Employee.objects.create(
            full_name="Aarav Sharma",
            department=self.dept_eng,
            job_title=self.job_se,
            country=self.country_in,
            local_currency=self.currency_inr
        )
        
        # No salary record
        self.assertEqual(get_band_status(emp)["status"], "no_band_defined")

        # Below band
        rec_below = SalaryRecord.objects.create(
            employee=emp, base_salary=Decimal("400000.00"), effective_date=date.today()
        )
        emp.current_salary_record = rec_below
        status_below = get_band_status(emp)
        self.assertEqual(status_below["status"], "below")
        self.assertEqual(status_below["variance_pct"], Decimal("-20.00"))

        # Within band
        # First bypass ValueError guard since we can't update. Instead create a new record.
        rec_within = SalaryRecord.objects.create(
            employee=emp, base_salary=Decimal("1000000.00"), effective_date=date.today()
        )
        emp.current_salary_record = rec_within
        status_within = get_band_status(emp)
        self.assertEqual(status_within["status"], "within")

        # Above band
        rec_above = SalaryRecord.objects.create(
            employee=emp, base_salary=Decimal("1800000.00"), effective_date=date.today()
        )
        emp.current_salary_record = rec_above
        status_above = get_band_status(emp)
        self.assertEqual(status_above["status"], "above")
        self.assertEqual(status_above["variance_pct"], Decimal("20.00"))


class EmployeeAPITests(BaseAPITestCase):
    def test_create_employee_api(self):
        url = reverse("employee-list")
        data = {
            "full_name": "New Hire",
            "department": self.dept_eng.pk,
            "job_title": self.job_se.pk,
            "country": self.country_in.pk,
            "employment_type": "full_time",
            "base_salary": "600000.00",
            "effective_date": str(date.today()),
            "variable_bonus_pct": "10.00"
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        emp = Employee.objects.get(full_name="New Hire")
        self.assertEqual(emp.employee_code, "EMP00001")
        self.assertEqual(emp.current_salary_record.base_salary, Decimal("600000.00"))

        # Check audit log
        audit = AuditLog.objects.filter(action="create", entity_type="employee", entity_id=emp.employee_code)
        self.assertTrue(audit.exists())

    def test_patch_and_deactivate_employee_api(self):
        emp = Employee.objects.create(
            full_name="Existing Emp",
            department=self.dept_eng,
            job_title=self.job_se,
            country=self.country_in,
            local_currency=self.currency_inr
        )
        
        # PATCH update
        url = reverse("employee-detail", kwargs={"employee_code": emp.employee_code})
        response = self.client.patch(url, {"full_name": "Updated Name"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Assert audit trail
        self.assertTrue(
            AuditLog.objects.filter(
                action="update",
                entity_type="employee",
                entity_id=emp.employee_code,
                field_changed="full_name",
                old_value="Existing Emp",
                new_value="Updated Name"
            ).exists()
        )

        # Deactivate
        deactivate_url = reverse("employee-deactivate", kwargs={"employee_code": emp.employee_code})
        response = self.client.post(deactivate_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        emp.refresh_from_db()
        self.assertFalse(emp.is_active)

        # Assert audit
        self.assertTrue(
            AuditLog.objects.filter(
                action="deactivate",
                entity_type="employee",
                entity_id=emp.employee_code
            ).exists()
        )

    def test_nested_salary_record_create(self):
        emp = Employee.objects.create(
            full_name="Sal Emp",
            department=self.dept_eng,
            job_title=self.job_se,
            country=self.country_in,
            local_currency=self.currency_inr
        )
        
        # Add initial salary record (needed so we can record an old salary update)
        init_rec = SalaryRecord.objects.create(
            employee=emp, base_salary=Decimal("500000.00"), effective_date=date.today()
        )
        emp.current_salary_record = init_rec
        emp.save()

        # POST nested salary-records
        url = reverse("employee-salary-records", kwargs={"employee_code": emp.employee_code})
        
        # Missing hr_note
        data = {
            "base_salary": "550000.00",
            "effective_date": str(date.today()),
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Valid create
        data = {
            "base_salary": "550000.00",
            "effective_date": str(date.today()),
            "hr_note": "Annual adjustment"
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        emp.refresh_from_db()
        self.assertEqual(emp.current_salary_record.base_salary, Decimal("550000.00"))

    def test_options_api(self):
        url = reverse("employee-get-options")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("departments", response.data)
        self.assertIn("job_titles", response.data)
        self.assertIn("countries", response.data)
        self.assertIn("currencies", response.data)
        
        # Check serialization fields
        self.assertEqual(len(response.data["departments"]), 1)
        self.assertEqual(response.data["departments"][0]["name"], self.dept_eng.name)
        
        self.assertEqual(len(response.data["countries"]), 2)
        self.assertEqual(response.data["countries"][0]["name"], "India")


class EmployeeFilterTests(BaseAPITestCase):
    def test_employee_filtering(self):
        emp = Employee.objects.create(
            full_name="Filter Emp",
            department=self.dept_eng,
            job_title=self.job_se,
            country=self.country_in,
            local_currency=self.currency_inr
        )
        rec = SalaryRecord.objects.create(
            employee=emp, base_salary=Decimal("400000.00"), effective_date=date.today()
        )
        emp.current_salary_record = rec
        emp.save()

        url = reverse("employee-list")
        
        # Filter by department
        response = self.client.get(url, {"department": self.dept_eng.pk})
        self.assertEqual(len(response.data["results"]), 1)

        # Filter by band_status
        response = self.client.get(url, {"band_status": "below"})
        self.assertEqual(len(response.data["results"]), 1)

        response = self.client.get(url, {"band_status": "within"})
        self.assertEqual(len(response.data["results"]), 0)
