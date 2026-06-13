from decimal import Decimal
from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase, APIClient

from core.models import Country, Currency, Department, JobTitle, BackgroundTask
from employees.models import Employee, SalaryRecord
from reviews.models import ReviewCycle, SalaryProposal, DepartmentBudget

User = get_user_model()


@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
class ReviewCycleAPITests(APITestCase):
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

        # Core Data
        self.currency = Currency.objects.create(code="USD", name="US Dollar", rate_to_usd=Decimal("1.00"))
        self.country = Country.objects.create(name="United States", default_currency=self.currency)
        self.dept = Department.objects.create(name="Engineering")
        self.job_title = JobTitle.objects.create(title="Software Engineer", department=self.dept)

        # Active Employees
        self.emp1 = Employee.objects.create(
            full_name="Emp One",
            department=self.dept,
            job_title=self.job_title,
            country=self.country,
            local_currency=self.currency
        )
        self.rec1 = SalaryRecord.objects.create(
            employee=self.emp1,
            base_salary=Decimal("100000.00"),
            effective_date="2026-01-01",
            source="manual"
        )
        self.emp1.current_salary_record = self.rec1
        self.emp1.save()

        self.emp2 = Employee.objects.create(
            full_name="Emp Two",
            department=self.dept,
            job_title=self.job_title,
            country=self.country,
            local_currency=self.currency
        )
        self.rec2 = SalaryRecord.objects.create(
            employee=self.emp2,
            base_salary=Decimal("120000.00"),
            effective_date="2026-01-01",
            source="manual"
        )
        self.emp2.current_salary_record = self.rec2
        self.emp2.save()

    def test_review_cycle_creation_and_auto_proposals(self):
        url = reverse("reviewcycle-list")
        data = {
            "name": "Annual 2026",
            "year": 2026,
            "department_budgets": [
                {"department": self.dept.id, "budget_pct": "10.00"}
            ]
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        cycle_id = response.data["id"]
        cycle = ReviewCycle.objects.get(id=cycle_id)
        self.assertEqual(cycle.status, "draft")

        # Verify department budget was created
        self.assertTrue(DepartmentBudget.objects.filter(review_cycle=cycle, department=self.dept).exists())

        # Verify proposals were auto-generated for all active employees
        proposals = SalaryProposal.objects.filter(review_cycle=cycle)
        self.assertEqual(proposals.count(), 2)
        
        prop1 = proposals.get(employee=self.emp1)
        self.assertEqual(prop1.current_salary, Decimal("100000.00"))
        self.assertEqual(prop1.proposed_increase_pct, Decimal("0.00"))
        self.assertEqual(prop1.proposed_salary, Decimal("100000.00"))

    def test_proposal_patch_recalculates_proposed_salary(self):
        cycle = ReviewCycle.objects.create(name="Annual 2026", year=2026, status="in_progress")
        DepartmentBudget.objects.create(review_cycle=cycle, department=self.dept, budget_pct=Decimal("10.00"))
        proposal = SalaryProposal.objects.create(
            review_cycle=cycle,
            employee=self.emp1,
            current_salary=Decimal("100000.00"),
            proposed_increase_pct=Decimal("0.00"),
            proposed_salary=Decimal("100000.00")
        )

        # PATCH proposed_increase_pct
        url = reverse(
            "reviewcycle-update-proposal",
            kwargs={"pk": cycle.id, "proposal_id": proposal.id}
        )
        response = self.client.patch(url, {"proposed_increase_pct": "5.00"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        proposal.refresh_from_db()
        self.assertEqual(proposal.proposed_increase_pct, Decimal("5.00"))
        self.assertEqual(proposal.proposed_salary, Decimal("105000.00"))

    def test_transition_to_completed_dispatches_task(self):
        cycle = ReviewCycle.objects.create(name="Annual 2026", year=2026, status="in_progress")
        DepartmentBudget.objects.create(review_cycle=cycle, department=self.dept, budget_pct=Decimal("10.00"))
        
        proposal1 = SalaryProposal.objects.create(
            review_cycle=cycle,
            employee=self.emp1,
            current_salary=Decimal("100000.00"),
            proposed_increase_pct=Decimal("5.00"),
            proposed_salary=Decimal("105000.00")
        )
        proposal2 = SalaryProposal.objects.create(
            review_cycle=cycle,
            employee=self.emp2,
            current_salary=Decimal("120000.00"),
            proposed_increase_pct=Decimal("4.00"),
            proposed_salary=Decimal("124800.00")
        )

        # POST transition to completed
        url = reverse("reviewcycle-transition", kwargs={"pk": cycle.id})
        response = self.client.post(url, {"status": "completed"})
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)

        # Since CELERY_TASK_ALWAYS_EAGER=True, the task is run synchronously during API request.
        # Verify cycle is completed
        cycle.refresh_from_db()
        self.assertEqual(cycle.status, "completed")

        # Verify proposals are marked committed
        proposal1.refresh_from_db()
        self.assertTrue(proposal1.is_committed)

        # Verify new SalaryRecords are created
        self.emp1.refresh_from_db()
        self.assertEqual(self.emp1.current_salary_record.base_salary, Decimal("105000.00"))
        self.assertEqual(self.emp1.current_salary_record.source, "salary_review")
        self.assertEqual(self.emp1.current_salary_record.review_cycle, cycle)

        self.emp2.refresh_from_db()
        self.assertEqual(self.emp2.current_salary_record.base_salary, Decimal("124800.00"))
