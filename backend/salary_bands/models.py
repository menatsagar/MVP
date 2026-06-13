from django.db import models

from core.models import Country, Currency, JobTitle


class SalaryBand(models.Model):
    """
    Market salary band for a specific job title in a specific country.
    Unique constraint on (job_title, country).
    """

    job_title = models.ForeignKey(
        JobTitle,
        on_delete=models.CASCADE,
        related_name="salary_bands",
    )
    country = models.ForeignKey(
        Country,
        on_delete=models.CASCADE,
        related_name="salary_bands",
    )
    min_salary = models.DecimalField(max_digits=18, decimal_places=2)
    mid_salary = models.DecimalField(max_digits=18, decimal_places=2)
    max_salary = models.DecimalField(max_digits=18, decimal_places=2)
    currency = models.ForeignKey(
        Currency,
        on_delete=models.PROTECT,
        related_name="salary_bands",
    )

    class Meta:
        unique_together = [("job_title", "country")]
        ordering = ["job_title__title", "country__name"]

    def __str__(self):
        return f"{self.job_title.title} — {self.country.name} ({self.currency.code})"
