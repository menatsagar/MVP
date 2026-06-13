from django.contrib import admin

from .models import SalaryBand


@admin.register(SalaryBand)
class SalaryBandAdmin(admin.ModelAdmin):
    list_display = [
        "job_title",
        "country",
        "min_salary",
        "mid_salary",
        "max_salary",
        "currency",
    ]
    list_filter = ["country", "currency"]
    search_fields = ["job_title__title", "country__name"]
