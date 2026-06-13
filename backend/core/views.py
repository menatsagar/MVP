from rest_framework import viewsets

from audit.utils import log_audit
from .models import Country, Currency, Department, JobTitle
from .serializers import (
    CountrySerializer,
    CurrencySerializer,
    DepartmentSerializer,
    JobTitleSerializer,
)


class CurrencyViewSet(viewsets.ModelViewSet):
    """CRUD for currencies with audit logging on rate changes."""

    queryset = Currency.objects.all()
    serializer_class = CurrencySerializer

    def perform_create(self, serializer):
        currency = serializer.save()
        log_audit(
            action="create",
            entity_type="currency",
            entity_id=currency.code,
            entity_label=str(currency),
            new_value=str(currency.rate_to_usd),
        )

    def perform_update(self, serializer):
        instance = serializer.instance
        old_rate = str(instance.rate_to_usd)
        old_name = instance.name
        
        currency = serializer.save()
        
        new_rate = str(currency.rate_to_usd)
        new_name = currency.name
        
        if old_rate != new_rate:
            log_audit(
                action="update",
                entity_type="currency",
                entity_id=currency.code,
                entity_label=str(currency),
                field_changed="rate_to_usd",
                old_value=old_rate,
                new_value=new_rate,
            )
        if old_name != new_name:
            log_audit(
                action="update",
                entity_type="currency",
                entity_id=currency.code,
                entity_label=str(currency),
                field_changed="name",
                old_value=old_name,
                new_value=new_name,
            )


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
