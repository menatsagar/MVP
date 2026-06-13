"""
Pure business logic functions — no Django request dependency.
Easily testable in isolation.
"""
from decimal import Decimal

from salary_bands.models import SalaryBand


def convert_to_usd(amount, currency):
    """
    Convert a local currency amount to USD.

    Args:
        amount: Decimal amount in local currency.
        currency: Currency model instance.

    Returns:
        dict with 'usd_value' (Decimal|None) and 'usd_unavailable' (bool).
    """
    if amount is None or currency is None:
        return {"usd_value": None, "usd_unavailable": True}

    rate = currency.rate_to_usd
    if rate is None or rate <= 0:
        return {"usd_value": None, "usd_unavailable": True}

    usd_value = amount * rate
    return {"usd_value": usd_value.quantize(Decimal("0.01")), "usd_unavailable": False}


def get_band_status(employee):
    """
    Compare an employee's current salary against their salary band.

    Returns:
        dict with 'status' ('below'|'within'|'above'|'no_band_defined'),
        plus band details and variance when applicable.
    """
    if not employee.current_salary_record:
        return {"status": "no_band_defined", "detail": "No current salary record."}

    salary = employee.current_salary_record.base_salary

    try:
        band = SalaryBand.objects.select_related("currency").get(
            job_title=employee.job_title,
            country=employee.country,
        )
    except SalaryBand.DoesNotExist:
        return {"status": "no_band_defined", "detail": "No salary band defined for this role/country."}

    result = {
        "band_min": band.min_salary,
        "band_mid": band.mid_salary,
        "band_max": band.max_salary,
        "band_currency": band.currency.code,
        "current_salary": salary,
    }

    if salary < band.min_salary:
        variance = ((salary - band.min_salary) / band.min_salary * 100).quantize(Decimal("0.01"))
        result.update({"status": "below", "variance_pct": variance})
    elif salary > band.max_salary:
        variance = ((salary - band.max_salary) / band.max_salary * 100).quantize(Decimal("0.01"))
        result.update({"status": "above", "variance_pct": variance})
    else:
        result.update({"status": "within", "variance_pct": Decimal("0")})

    return result
