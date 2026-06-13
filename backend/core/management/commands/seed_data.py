import random
from datetime import date, timedelta
from decimal import Decimal
from django.db import transaction
from django.core.management.base import BaseCommand
from django.utils import timezone

from core.models import Country, Currency, Department, JobTitle, BackgroundTask
from employees.models import Employee, SalaryRecord
from salary_bands.models import SalaryBand
from reviews.models import ReviewCycle, DepartmentBudget, SalaryProposal
from audit.models import AuditLog


class Command(BaseCommand):
    help = "Seed the database with comprehensive reference and employee data for MVP."

    def handle(self, *args, **options):
        self.stdout.write("Seeding data...")

        with transaction.atomic():
            # Clear old records
            self.stdout.write("Clearing existing data...")
            AuditLog.objects.all().delete()
            SalaryProposal.objects.all().delete()
            DepartmentBudget.objects.all().delete()
            ReviewCycle.objects.all().delete()
            
            # Since SalaryRecord has a delete guard, queryset delete bypasses the model's custom delete() method.
            # But we must clear Employee current_salary_record pointers first to avoid PROTECT/SET_NULL constraints
            Employee.objects.update(current_salary_record=None)
            SalaryRecord.objects.all().delete()
            Employee.objects.all().delete()
            
            SalaryBand.objects.all().delete()
            JobTitle.objects.all().delete()
            Department.objects.all().delete()
            Country.objects.all().delete()
            Currency.objects.all().delete()
            BackgroundTask.objects.all().delete()

            # 1. Seed Currencies
            self.stdout.write("Seeding currencies...")
            currencies_data = [
                {"code": "USD", "name": "United States Dollar", "rate_to_usd": Decimal("1.000000")},
                {"code": "EUR", "name": "Euro", "rate_to_usd": Decimal("1.090000")},
                {"code": "GBP", "name": "British Pound", "rate_to_usd": Decimal("1.270000")},
                {"code": "INR", "name": "Indian Rupee", "rate_to_usd": Decimal("0.012000")},
                {"code": "AED", "name": "United Arab Emirates Dirham", "rate_to_usd": Decimal("0.272242")},
            ]
            currencies = {}
            for cd in currencies_data:
                currency = Currency.objects.create(**cd)
                currencies[cd["code"]] = currency

            # 2. Seed Countries
            self.stdout.write("Seeding countries...")
            countries_data = [
                {"name": "United States", "default_currency": currencies["USD"]},
                {"name": "Germany", "default_currency": currencies["EUR"]},
                {"name": "United Kingdom", "default_currency": currencies["GBP"]},
                {"name": "India", "default_currency": currencies["INR"]},
                {"name": "United Arab Emirates", "default_currency": currencies["AED"]},
            ]
            countries = {}
            for ct in countries_data:
                country = Country.objects.create(**ct)
                countries[ct["name"]] = country

            # 3. Seed Departments
            self.stdout.write("Seeding departments...")
            departments_data = ["Engineering", "Sales", "Marketing", "Product", "Human Resources"]
            departments = {}
            for dept_name in departments_data:
                dept = Department.objects.create(name=dept_name)
                departments[dept_name] = dept

            # 4. Seed Job Titles
            self.stdout.write("Seeding job titles...")
            job_titles_data = [
                {"title": "Software Engineer", "department": departments["Engineering"]},
                {"title": "QA Engineer", "department": departments["Engineering"]},
                {"title": "Sales Executive", "department": departments["Sales"]},
                {"title": "Marketing Manager", "department": departments["Marketing"]},
                {"title": "Product Manager", "department": departments["Product"]},
                {"title": "HR Specialist", "department": departments["Human Resources"]},
            ]
            job_titles = {}
            for jt in job_titles_data:
                job_title = JobTitle.objects.create(**jt)
                job_titles[f"{jt['title']} ({jt['department'].name})"] = job_title

            # 5. Seed Salary Bands (6 country/job_title combos)
            self.stdout.write("Seeding salary bands...")
            bands_data = [
                {
                    "job_title": job_titles["Software Engineer (Engineering)"],
                    "country": countries["India"],
                    "min_salary": Decimal("400000.00"),
                    "mid_salary": Decimal("900000.00"),
                    "max_salary": Decimal("1500000.00"),
                    "currency": currencies["INR"],
                },
                {
                    "job_title": job_titles["Software Engineer (Engineering)"],
                    "country": countries["United States"],
                    "min_salary": Decimal("8000000.00") / Decimal("100"), # 80,000
                    "mid_salary": Decimal("13000000.00") / Decimal("100"), # 130,000
                    "max_salary": Decimal("18000000.00") / Decimal("100"), # 180,000
                    "currency": currencies["USD"],
                },
                {
                    "job_title": job_titles["QA Engineer (Engineering)"],
                    "country": countries["India"],
                    "min_salary": Decimal("300000.00"),
                    "mid_salary": Decimal("600000.00"),
                    "max_salary": Decimal("1000000.00"),
                    "currency": currencies["INR"],
                },
                {
                    "job_title": job_titles["Product Manager (Product)"],
                    "country": countries["United States"],
                    "min_salary": Decimal("90000.00"),
                    "mid_salary": Decimal("140000.00"),
                    "max_salary": Decimal("190000.00"),
                    "currency": currencies["USD"],
                },
                {
                    "job_title": job_titles["Sales Executive (Sales)"],
                    "country": countries["United Kingdom"],
                    "min_salary": Decimal("35000.00"),
                    "mid_salary": Decimal("50000.00"),
                    "max_salary": Decimal("70000.00"),
                    "currency": currencies["GBP"],
                },
                {
                    "job_title": job_titles["Marketing Manager (Marketing)"],
                    "country": countries["Germany"],
                    "min_salary": Decimal("45000.00"),
                    "mid_salary": Decimal("60000.00"),
                    "max_salary": Decimal("80000.00"),
                    "currency": currencies["EUR"],
                },
            ]
            for bd in bands_data:
                SalaryBand.objects.create(**bd)

            # 6. Seed 25 Employees + Initial Salary Records
            self.stdout.write("Seeding employees...")
            names = [
                ("Aarav Sharma", "India", "Software Engineer (Engineering)"),
                ("Aditi Patel", "India", "Software Engineer (Engineering)"),
                ("Amit Verma", "India", "QA Engineer (Engineering)"),
                ("Priya Singh", "India", "QA Engineer (Engineering)"),
                ("John Doe", "United States", "Software Engineer (Engineering)"),
                ("Jane Smith", "United States", "Software Engineer (Engineering)"),
                ("Robert Johnson", "United States", "Product Manager (Product)"),
                ("Emily Davis", "United States", "Product Manager (Product)"),
                ("Michael Brown", "United States", "Software Engineer (Engineering)"),
                ("William Jones", "United States", "Software Engineer (Engineering)"),
                ("Hans Mueller", "Germany", "Marketing Manager (Marketing)"),
                ("Sabine Schmidt", "Germany", "Marketing Manager (Marketing)"),
                ("Dieter Weber", "Germany", "Software Engineer (Engineering)"),
                ("Anya Fischer", "Germany", "HR Specialist (Human Resources)"),
                ("Charles Wright", "United Kingdom", "Sales Executive (Sales)"),
                ("Olivia Green", "United Kingdom", "Sales Executive (Sales)"),
                ("James Taylor", "United Kingdom", "QA Engineer (Engineering)"),
                ("Fatima Al-Mansoori", "United Arab Emirates", "Software Engineer (Engineering)"),
                ("Zayed Al-Nahyan", "United Arab Emirates", "Sales Executive (Sales)"),
                ("Mariam Al-Hashimi", "United Arab Emirates", "HR Specialist (Human Resources)"),
                # Additional 5 to make 25
                ("Neha Gupta", "India", "Software Engineer (Engineering)"),
                ("David Wilson", "United States", "Software Engineer (Engineering)"),
                ("Sarah Evans", "United Kingdom", "Sales Executive (Sales)"),
                ("Lucas Wagner", "Germany", "Marketing Manager (Marketing)"),
                ("Amira Hassan", "United Arab Emirates", "Software Engineer (Engineering)"),
            ]

            employees = []
            # We want 3-4 employees to be intentionally outside their bands.
            # Aarav Sharma: Software Engineer in India (INR). Band: 400k - 1.5M. Let's make him below band (e.g. 350k).
            # John Doe: Software Engineer in US (USD). Band: 80k - 180k. Let's make him above band (e.g. 195k).
            # Charles Wright: Sales Executive in UK (GBP). Band: 35k - 70k. Let's make him below band (e.g. 32k).
            # Hans Mueller: Marketing Manager in Germany (EUR). Band: 45k - 80k. Let's make him above band (e.g. 85k).

            for i, (name, country_name, jt_key) in enumerate(names):
                country = countries[country_name]
                job_title = job_titles[jt_key]
                emp = Employee.objects.create(
                    full_name=name,
                    department=job_title.department,
                    job_title=job_title,
                    country=country,
                    local_currency=country.default_currency,
                    employment_type="full_time" if i % 5 != 0 else "contractor",
                )
                
                # Determine base salary
                curr_code = country.default_currency.code
                if name == "Aarav Sharma":
                    # Below band (Min 400k)
                    base_salary = Decimal("350000.00")
                elif name == "John Doe":
                    # Above band (Max 180k)
                    base_salary = Decimal("195000.00")
                elif name == "Charles Wright":
                    # Below band (Min 35k)
                    base_salary = Decimal("32000.00")
                elif name == "Hans Mueller":
                    # Above band (Max 80k)
                    base_salary = Decimal("85000.00")
                else:
                    # Within band or default
                    if curr_code == "INR":
                        base_salary = Decimal(random.randint(500, 1300) * 1000)
                    elif curr_code == "USD":
                        base_salary = Decimal(random.randint(90, 170) * 1000)
                    elif curr_code == "GBP":
                        base_salary = Decimal(random.randint(38, 65) * 1000)
                    elif curr_code == "EUR":
                        base_salary = Decimal(random.randint(48, 75) * 1000)
                    else: # AED
                        base_salary = Decimal(random.randint(150, 300) * 1000)

                # Create initial SalaryRecord
                record = SalaryRecord.objects.create(
                    employee=emp,
                    base_salary=base_salary,
                    variable_bonus_pct=Decimal(random.randint(0, 15)),
                    effective_date=date.today() - timedelta(days=365),
                    hr_note="Initial hiring salary.",
                    source="manual",
                )
                emp.current_salary_record = record
                emp.save(update_fields=["current_salary_record"])
                employees.append(emp)

            # 7. Seed Review Cycles
            self.stdout.write("Seeding review cycles...")
            
            # A. Completed Cycle (Annual 2025)
            cycle_2025 = ReviewCycle.objects.create(
                name="Annual 2025",
                year=2025,
                status="completed"
            )
            # Budgets for 2025
            for dept_name, dept in departments.items():
                DepartmentBudget.objects.create(
                    review_cycle=cycle_2025,
                    department=dept,
                    budget_pct=Decimal("5.00") if dept_name == "Engineering" else Decimal("4.00")
                )
            # Proposals (Committed) for 2025
            for emp in employees:
                # Store the snapshot salary at that time
                prev_salary = emp.current_salary_record.base_salary
                increase_pct = Decimal("5.00") if emp.department.name == "Engineering" else Decimal("3.00")
                proposed_val = prev_salary * (1 + increase_pct / 100)
                
                proposal = SalaryProposal.objects.create(
                    review_cycle=cycle_2025,
                    employee=emp,
                    current_salary=prev_salary,
                    proposed_increase_pct=increase_pct,
                    proposed_salary=proposed_val,
                    is_committed=True
                )
                
                # Apply the review salary record (dated e.g. 6 months ago)
                record_2025 = SalaryRecord.objects.create(
                    employee=emp,
                    base_salary=proposed_val,
                    variable_bonus_pct=emp.current_salary_record.variable_bonus_pct,
                    effective_date=date.today() - timedelta(days=180),
                    hr_note="Applied from review cycle: Annual 2025",
                    source="salary_review",
                    review_cycle=cycle_2025,
                )
                emp.current_salary_record = record_2025
                emp.save(update_fields=["current_salary_record"])

            # B. In-Progress Cycle (Mid-Year 2026)
            cycle_2026 = ReviewCycle.objects.create(
                name="Mid-Year 2026",
                year=2026,
                status="in_progress"
            )
            # Budgets for 2026
            for dept_name, dept in departments.items():
                DepartmentBudget.objects.create(
                    review_cycle=cycle_2026,
                    department=dept,
                    budget_pct=Decimal("8.00") if dept_name == "Engineering" else Decimal("5.00")
                )
            # Proposals (Uncommitted) for 2026
            for emp in employees:
                curr_salary = emp.current_salary_record.base_salary
                # Some proposed increase
                increase_pct = Decimal(random.randint(2, 7))
                SalaryProposal.objects.create(
                    review_cycle=cycle_2026,
                    employee=emp,
                    current_salary=curr_salary,
                    proposed_increase_pct=increase_pct,
                    # proposed_salary is auto-calculated on save
                    is_committed=False
                )

            # 8. Seed Audit Log Entries
            self.stdout.write("Seeding audit logs...")
            # We can log some entries using log_audit utility
            from audit.utils import log_audit
            
            # Log some creates
            for emp in employees[:5]:
                log_audit(
                    action="create",
                    entity_type="employee",
                    entity_id=emp.employee_code,
                    entity_label=f"{emp.employee_code} — {emp.full_name}",
                    acting_user="hr_manager",
                )
            # Log currency rates updates
            for code in ["EUR", "GBP", "INR"]:
                log_audit(
                    action="update",
                    entity_type="currency",
                    entity_id=code,
                    entity_label=str(currencies[code]),
                    field_changed="rate_to_usd",
                    old_value="1.000000",
                    new_value=str(currencies[code].rate_to_usd),
                    acting_user="System",
                )
            # Log band creation
            for sb in SalaryBand.objects.all()[:3]:
                log_audit(
                    action="create",
                    entity_type="salary_band",
                    entity_id=sb.pk,
                    entity_label=str(sb),
                    acting_user="hr_manager",
                )

        self.stdout.write(self.style.SUCCESS("Database seeded successfully with 25 employees, bands, and review cycles."))
