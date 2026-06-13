from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase, APIClient

from audit.models import AuditLog

User = get_user_model()


class AuditLogAPITests(APITestCase):
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

        # Seed some audit logs
        self.log1 = AuditLog.objects.create(
            action="create",
            entity_type="employee",
            entity_id="EMP00001",
            entity_label="EMP00001 — John Doe",
            acting_user="hr_manager"
        )
        self.log2 = AuditLog.objects.create(
            action="update",
            entity_type="currency",
            entity_id="INR",
            entity_label="INR — Rupee",
            field_changed="rate_to_usd",
            old_value="0.012",
            new_value="0.013",
            acting_user="System"
        )

    def test_list_and_retrieve_audit_logs(self):
        url = reverse("auditlog-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 2)

        # Retrieve detail
        detail_url = reverse("auditlog-detail", kwargs={"pk": self.log1.pk})
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["entity_id"], "EMP00001")

    def test_filter_audit_logs(self):
        url = reverse("auditlog-list")
        
        # Filter by action
        response = self.client.get(url, {"action": "update"})
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["entity_type"], "currency")

        # Filter by entity_type
        response = self.client.get(url, {"entity_type": "employee"})
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["action"], "create")

    def test_read_only_enforcement(self):
        # Test POST
        url = reverse("auditlog-list")
        response = self.client.post(url, {"action": "create", "entity_type": "employee", "entity_id": "1"})
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

        # Test DELETE
        detail_url = reverse("auditlog-detail", kwargs={"pk": self.log1.pk})
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
