from django.contrib import admin

from .models import Country, Currency, Department, JobTitle


@admin.register(Currency)
class CurrencyAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "rate_to_usd", "last_updated"]
    search_fields = ["code", "name"]


@admin.register(Country)
class CountryAdmin(admin.ModelAdmin):
    list_display = ["name", "default_currency"]
    search_fields = ["name"]
    list_filter = ["default_currency"]


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ["name"]
    search_fields = ["name"]


@admin.register(JobTitle)
class JobTitleAdmin(admin.ModelAdmin):
    list_display = ["title", "department"]
    search_fields = ["title"]
    list_filter = ["department"]
