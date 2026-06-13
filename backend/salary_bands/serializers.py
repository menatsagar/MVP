from rest_framework import serializers

from .models import SalaryBand


class SalaryBandSerializer(serializers.ModelSerializer):
    job_title_name = serializers.CharField(source="job_title.title", read_only=True)
    country_name = serializers.CharField(source="country.name", read_only=True)
    currency_code = serializers.CharField(source="currency.code", read_only=True)

    class Meta:
        model = SalaryBand
        fields = [
            "id",
            "job_title",
            "job_title_name",
            "country",
            "country_name",
            "min_salary",
            "mid_salary",
            "max_salary",
            "currency",
            "currency_code",
        ]
