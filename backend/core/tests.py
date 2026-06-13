from decimal import Decimal
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase, APIClient

from core.models import Currency, Country, Department, JobTitle, BackgroundTask
from audit.models import AuditLog

User = get_user_model()


class BaseAPITestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_superuser(
            username="test_hr", 
            email="test@example.com", 
            password="password123"
        )
        self.token = Token.objects.create(user=self.user)
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")


class CurrencyAPITests(BaseAPITestCase):
    def test_currency_crud_and_audit(self):
        # Create
        url = reverse("currency-list")
        data = {
            "code": "JPY",
            "name": "Japanese Yen",
            "rate_to_usd": "0.006400"
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Currency.objects.filter(code="JPY").exists())

        # Assert Audit log for create
        create_audit = AuditLog.objects.filter(
            action="create",
            entity_type="currency",
            entity_id="JPY"
        )
        self.assertTrue(create_audit.exists())
        self.assertEqual(create_audit.first().new_value, "0.006400")

        # Update rate
        detail_url = reverse("currency-detail", kwargs={"pk": response.data["id"]})
        update_data = {
            "code": "JPY",
            "name": "Japanese Yen",
            "rate_to_usd": "0.007000"
        }
        response = self.client.put(detail_url, update_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Assert Audit log for update
        update_audit = AuditLog.objects.filter(
            action="update",
            entity_type="currency",
            entity_id="JPY",
            field_changed="rate_to_usd"
        )
        self.assertTrue(update_audit.exists())
        self.assertEqual(update_audit.first().old_value, "0.006400")
        self.assertEqual(update_audit.first().new_value, "0.007000")


class BackgroundTaskTests(BaseAPITestCase):
    def test_background_task_lifecycle(self):
        task = BackgroundTask.objects.create(
            task_type="csv_import",
            status="pending"
        )
        self.assertIsNotNone(task.id)
        self.assertEqual(task.status, "pending")
        
        task.status = "processing"
        task.save()
        self.assertEqual(BackgroundTask.objects.get(id=task.id).status, "processing")
