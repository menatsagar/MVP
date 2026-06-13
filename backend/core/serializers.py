from rest_framework import serializers

from .models import Country, Currency, Department, JobTitle


class CurrencySerializer(serializers.ModelSerializer):
    class Meta:
        model = Currency
        fields = ["id", "code", "name", "rate_to_usd", "last_updated"]
        read_only_fields = ["last_updated"]


class CountrySerializer(serializers.ModelSerializer):
    default_currency_code = serializers.CharField(
        source="default_currency.code", read_only=True
    )

    class Meta:
        model = Country
        fields = ["id", "name", "default_currency", "default_currency_code"]


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ["id", "name"]


class JobTitleSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(
        source="department.name", read_only=True
    )

    class Meta:
        model = JobTitle
        fields = ["id", "title", "department", "department_name"]
