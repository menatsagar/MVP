from decimal import Decimal
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase, APIClient

from core.models import Country, Currency, Department, JobTitle
from salary_bands.models import SalaryBand
from audit.models import AuditLog

User = get_user_model()


class SalaryBandAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_superuser(
            username="test_hr", 
            email="test@example.com", 
            password="password123"
        )
        from rest_framework.authtoken.models import Token
        self.token = Token.objects.create(user=self.user)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")

        # Reference data
        self.currency = Currency.objects.create(code="USD", name="US Dollar", rate_to_usd=Decimal("1.00"))
        self.country = Country.objects.create(name="United States", default_currency=self.currency)
        self.dept = Department.objects.create(name="Engineering")
        self.job_title = JobTitle.objects.create(title="Software Engineer", department=self.dept)

    def test_salary_band_crud_and_audit(self):
        # 1. Create Band
        url = reverse("salaryband-list")
        data = {
            "job_title": self.job_title.id,
            "country": self.country.id,
            "min_salary": "80000.00",
            "mid_salary": "120000.00",
            "max_salary": "160000.00",
            "currency": self.currency.id,
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        band_id = response.data["id"]

        # Check create audit log
        self.assertTrue(
            AuditLog.objects.filter(
                action="create",
                entity_type="salary_band",
                entity_id=str(band_id)
            ).exists()
        )

        # 2. Update Band (min_salary and max_salary)
        detail_url = reverse("salaryband-detail", kwargs={"pk": band_id})
        update_data = {
            "job_title": self.job_title.id,
            "country": self.country.id,
            "min_salary": "85000.00",
            "mid_salary": "120000.00",
            "max_salary": "165000.00",
            "currency": self.currency.id,
        }
        response = self.client.put(detail_url, update_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Check update audit logs for both fields changed
        self.assertTrue(
            AuditLog.objects.filter(
                action="update",
                entity_type="salary_band",
                entity_id=str(band_id),
                field_changed="min_salary",
                old_value="80000.00",
                new_value="85000.00"
            ).exists()
        )
        self.assertTrue(
            AuditLog.objects.filter(
                action="update",
                entity_type="salary_band",
                entity_id=str(band_id),
                field_changed="max_salary",
                old_value="160000.00",
                new_value="165000.00"
            ).exists()
        )

        # 3. Delete Band
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        # Check deactivate audit log before deletion
        self.assertTrue(
            AuditLog.objects.filter(
                action="deactivate",
                entity_type="salary_band",
                entity_id=str(band_id)
            ).exists()
        )
