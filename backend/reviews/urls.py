from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import DepartmentBudgetViewSet, ReviewCycleViewSet, SalaryProposalViewSet

router = DefaultRouter()
router.register("review-cycles", ReviewCycleViewSet, basename="reviewcycle")
router.register("department-budgets", DepartmentBudgetViewSet, basename="departmentbudget")
router.register("salary-proposals", SalaryProposalViewSet, basename="salaryproposal")

urlpatterns = [
    path("", include(router.urls)),
]
