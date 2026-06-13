from rest_framework import viewsets

from .models import Country, Currency, Department, JobTitle
from .serializers import (
    CountrySerializer,
    CurrencySerializer,
    DepartmentSerializer,
    JobTitleSerializer,
)


class CurrencyViewSet(viewsets.ModelViewSet):
    """CRUD for currencies."""

    queryset = Currency.objects.all()
    serializer_class = CurrencySerializer


class CountryViewSet(viewsets.ModelViewSet):
    """CRUD for countries."""

    queryset = Country.objects.select_related("default_currency").all()
    serializer_class = CountrySerializer


class DepartmentViewSet(viewsets.ModelViewSet):
    """CRUD for departments."""

    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer


class JobTitleViewSet(viewsets.ModelViewSet):
    """CRUD for job titles."""

    queryset = JobTitle.objects.select_related("department").all()
    serializer_class = JobTitleSerializer
