from rest_framework import viewsets

from .models import SalaryBand
from .serializers import SalaryBandSerializer


class SalaryBandViewSet(viewsets.ModelViewSet):
    """CRUD for salary bands."""

    queryset = SalaryBand.objects.select_related(
        "job_title", "job_title__department", "country", "currency"
    ).all()
    serializer_class = SalaryBandSerializer
    filterset_fields = ["job_title", "country"]
