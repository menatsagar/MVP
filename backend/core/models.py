from django.db import models


class Currency(models.Model):
    """Supported currencies with exchange rates to USD."""

    code = models.CharField(max_length=3, unique=True, help_text="ISO 4217 code, e.g. INR, USD")
    name = models.CharField(max_length=100, help_text="Full currency name, e.g. Indian Rupee")
    rate_to_usd = models.DecimalField(
        max_digits=18,
        decimal_places=6,
        help_text="Exchange rate: 1 unit of this currency = X USD",
    )
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "currencies"
        ordering = ["code"]

    def __str__(self):
        return f"{self.code} — {self.name}"


class Country(models.Model):
    """Countries where employees are based."""

    name = models.CharField(max_length=200, unique=True)
    default_currency = models.ForeignKey(
        Currency,
        on_delete=models.PROTECT,
        related_name="countries",
    )

    class Meta:
        verbose_name_plural = "countries"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Department(models.Model):
    """Organisational departments."""

    name = models.CharField(max_length=200, unique=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class JobTitle(models.Model):
    """Job titles scoped to a department."""

    title = models.CharField(max_length=200)
    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name="job_titles",
    )

    class Meta:
        ordering = ["department__name", "title"]

    def __str__(self):
        return f"{self.title} ({self.department.name})"
