# Django Backend Project Setup

Build a Django REST Framework backend at `c:\Users\sagar\My Projects\MVP\backend\` alongside the existing frontend. The backend includes 7 apps, PostgreSQL, Celery+Redis, Token Auth, and an HR Manager seed command.

---

## User Review Required

> [!IMPORTANT]
> **PostgreSQL credentials**: The `.env` file will use placeholder values. You'll need to update them with your actual PostgreSQL host, port, username, password, and database name before running migrations.

> [!IMPORTANT]
> **Redis URL**: Defaults to `redis://localhost:6379/0`. Update in `.env` if your Redis instance is elsewhere.

> [!IMPORTANT]
> **HR Manager seed**: A management command `seed_hr_manager` will create a superuser with username `hr_manager` and a default password `changeme123!`. Change the password immediately after first login.

## Open Questions

> [!NOTE]
> **`settings_app`**: Your spec lists a `settings_app` app but doesn't define any models for it. I'll create the app scaffold with an empty `models.py` — you can populate it later. Sound good?

> [!NOTE]
> **`dashboard` app**: Similarly, no models defined. I'll scaffold it with an empty `models.py` and a placeholder viewset. OK?

> [!NOTE]
> **`employee_code` auto-generation**: I'll implement this via a `pre_save` signal that assigns the next sequential code (`EMP00001`, `EMP00002`, …) based on the current max in the DB. Is a signal-based approach acceptable, or do you prefer a DB sequence?

---

## Proposed Changes

### Phase 1: Project Scaffolding & Configuration

#### [NEW] `backend/` — Django project root

```
backend/
├── manage.py
├── requirements.txt
├── .env.example
├── .env                    # gitignored
├── backend/                # Django project package
│   ├── __init__.py
│   ├── settings.py
│   ├── urls.py
│   ├── wsgi.py
│   ├── asgi.py
│   └── celery.py
├── core/
├── employees/
├── salary_bands/
├── reviews/
├── audit/
├── dashboard/
└── settings_app/
```

#### [NEW] [requirements.txt](file:///c:/Users/sagar/My%20Projects/MVP/backend/requirements.txt)
- `Django>=5.1,<5.2`
- `djangorestframework>=3.15`
- `django-cors-headers`
- `psycopg2-binary`
- `python-dotenv`
- `celery[redis]>=5.4`
- `django-celery-results`

#### [NEW] [.env.example](file:///c:/Users/sagar/My%20Projects/MVP/backend/.env.example)
Template with all required env vars:
```
SECRET_KEY=change-me
DEBUG=True
DB_NAME=mvp_db
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432
REDIS_URL=redis://localhost:6379/0
```

#### [NEW] [backend/settings.py](file:///c:/Users/sagar/My%20Projects/MVP/backend/backend/settings.py)
- Load `.env` via `python-dotenv`
- PostgreSQL database config from env vars
- `INSTALLED_APPS`: all 7 apps + `rest_framework`, `corsheaders`, `django_celery_results`
- DRF default auth: `TokenAuthentication` + `SessionAuthentication`
- DRF default permission: `IsAuthenticated`
- CORS settings for frontend dev server (`localhost:3000`)
- Celery config: broker/backend from `REDIS_URL`

#### [NEW] [backend/celery.py](file:///c:/Users/sagar/My%20Projects/MVP/backend/backend/celery.py)
- Standard Celery app setup with `os.environ.setdefault` and `app.autodiscover_tasks()`

#### [NEW] [backend/urls.py](file:///c:/Users/sagar/My%20Projects/MVP/backend/backend/urls.py)
- Admin at `/admin/`
- API root at `/api/`
- Include each app's URL patterns under `/api/`
- Token obtain endpoint at `/api/auth/token/`

---

### Phase 2: `core` App — Reference Data Models

#### [NEW] [core/models.py](file:///c:/Users/sagar/My%20Projects/MVP/backend/core/models.py)

| Model | Fields | Notes |
|-------|--------|-------|
| **Currency** | `code` (CharField, max=3, unique), `name` (CharField), `rate_to_usd` (Decimal 18,6), `last_updated` (auto_now) | |
| **Country** | `name` (CharField, unique), `default_currency` (FK→Currency) | |
| **Department** | `name` (CharField, unique) | |
| **JobTitle** | `title` (CharField), `department` (FK→Department) | |

#### [NEW] [core/serializers.py](file:///c:/Users/sagar/My%20Projects/MVP/backend/core/serializers.py)
- `CurrencySerializer`, `CountrySerializer`, `DepartmentSerializer`, `JobTitleSerializer`

#### [NEW] [core/views.py](file:///c:/Users/sagar/My%20Projects/MVP/backend/core/views.py)
- ModelViewSets for all four models

#### [NEW] [core/urls.py](file:///c:/Users/sagar/My%20Projects/MVP/backend/core/urls.py)
- DRF Router registration

#### [NEW] [core/admin.py](file:///c:/Users/sagar/My%20Projects/MVP/backend/core/admin.py)
- Register all four models

---

### Phase 3: `employees` App

#### [NEW] [employees/models.py](file:///c:/Users/sagar/My%20Projects/MVP/backend/employees/models.py)

| Model | Key Fields | Notes |
|-------|-----------|-------|
| **Employee** | `employee_code` (auto-gen), `full_name`, `department` (FK), `job_title` (FK), `country` (FK), `local_currency` (FK), `employment_type` (choices), `is_active`, `current_salary_record` (FK, nullable), timestamps | Signal generates `employee_code` on create |
| **SalaryRecord** | `employee` (FK), `base_salary`, `variable_bonus_pct`, `effective_date`, `hr_note`, `source` (choices), `review_cycle` (FK, nullable), `created_at`, `created_by` | Append-only — no update/delete exposed |

#### [NEW] [employees/signals.py](file:///c:/Users/sagar/My%20Projects/MVP/backend/employees/signals.py)
- `pre_save` signal for `Employee`: auto-assigns `employee_code` if blank

#### [NEW] [employees/serializers.py](file:///c:/Users/sagar/My%20Projects/MVP/backend/employees/serializers.py)
- `EmployeeListSerializer` (summary), `EmployeeDetailSerializer` (with salary history)
- `SalaryRecordSerializer` (read-only for history)
- Write serializer for creating salary records (auto-updates `current_salary_record` on Employee)

#### [NEW] [employees/views.py](file:///c:/Users/sagar/My%20Projects/MVP/backend/employees/views.py)
- `EmployeeViewSet` — CRUD + deactivate action (no hard delete)
- `SalaryRecordViewSet` — list/create only (no update/delete)

#### [NEW] [employees/urls.py](file:///c:/Users/sagar/My%20Projects/MVP/backend/employees/urls.py)
- Nested routes: `/api/employees/`, `/api/employees/{id}/salary-history/`

#### [NEW] [employees/admin.py](file:///c:/Users/sagar/My%20Projects/MVP/backend/employees/admin.py)
- Register Employee (with inline SalaryRecord history)

---

### Phase 4: `salary_bands` App

#### [NEW] [salary_bands/models.py](file:///c:/Users/sagar/My%20Projects/MVP/backend/salary_bands/models.py)

| Model | Fields | Constraints |
|-------|--------|-------------|
| **SalaryBand** | `job_title` (FK), `country` (FK), `min_salary`, `mid_salary`, `max_salary`, `currency` (FK) | `unique_together = ('job_title', 'country')` |

#### [NEW] [salary_bands/serializers.py](file:///c:/Users/sagar/My%20Projects/MVP/backend/salary_bands/serializers.py)
#### [NEW] [salary_bands/views.py](file:///c:/Users/sagar/My%20Projects/MVP/backend/salary_bands/views.py)
#### [NEW] [salary_bands/urls.py](file:///c:/Users/sagar/My%20Projects/MVP/backend/salary_bands/urls.py)
#### [NEW] [salary_bands/admin.py](file:///c:/Users/sagar/My%20Projects/MVP/backend/salary_bands/admin.py)

---

### Phase 5: `reviews` App

#### [NEW] [reviews/models.py](file:///c:/Users/sagar/My%20Projects/MVP/backend/reviews/models.py)

| Model | Key Fields | Notes |
|-------|-----------|-------|
| **ReviewCycle** | `name`, `year`, `status` (draft/in_progress/completed), timestamps | |
| **DepartmentBudget** | `review_cycle` (FK), `department` (FK), `budget_pct` | |
| **SalaryProposal** | `review_cycle` (FK), `employee` (FK), `current_salary` (snapshot), `proposed_increase_pct`, `proposed_salary` (auto-calc on save), `is_committed` | `proposed_salary` computed in `save()` |

#### [NEW] [reviews/serializers.py](file:///c:/Users/sagar/My%20Projects/MVP/backend/reviews/serializers.py)
#### [NEW] [reviews/views.py](file:///c:/Users/sagar/My%20Projects/MVP/backend/reviews/views.py)
- `ReviewCycleViewSet`, `DepartmentBudgetViewSet`, `SalaryProposalViewSet`
- Custom action on `ReviewCycleViewSet` to commit all proposals (creates SalaryRecords, updates Employee.current_salary_record)

#### [NEW] [reviews/urls.py](file:///c:/Users/sagar/My%20Projects/MVP/backend/reviews/urls.py)
#### [NEW] [reviews/admin.py](file:///c:/Users/sagar/My%20Projects/MVP/backend/reviews/admin.py)

---

### Phase 6: `audit` App

#### [NEW] [audit/models.py](file:///c:/Users/sagar/My%20Projects/MVP/backend/audit/models.py)

| Model | Fields |
|-------|--------|
| **AuditLog** | `timestamp` (auto), `action` (choices), `entity_type` (choices), `entity_id`, `entity_label`, `field_changed` (nullable), `old_value` (nullable), `new_value` (nullable), `acting_user` |

#### [NEW] [audit/utils.py](file:///c:/Users/sagar/My%20Projects/MVP/backend/audit/utils.py)
- `log_audit(action, entity_type, entity_id, entity_label, ...)` helper function used by other apps to write audit entries

#### [NEW] [audit/serializers.py](file:///c:/Users/sagar/My%20Projects/MVP/backend/audit/serializers.py)
#### [NEW] [audit/views.py](file:///c:/Users/sagar/My%20Projects/MVP/backend/audit/views.py)
- Read-only `AuditLogViewSet` (list + retrieve, no create/update/delete via API)

#### [NEW] [audit/urls.py](file:///c:/Users/sagar/My%20Projects/MVP/backend/audit/urls.py)
#### [NEW] [audit/admin.py](file:///c:/Users/sagar/My%20Projects/MVP/backend/audit/admin.py)

---

### Phase 7: `dashboard` & `settings_app` App Scaffolds

#### [NEW] [dashboard/](file:///c:/Users/sagar/My%20Projects/MVP/backend/dashboard/)
- Empty app scaffold with `models.py`, `views.py`, `urls.py`, `admin.py`

#### [NEW] [settings_app/](file:///c:/Users/sagar/My%20Projects/MVP/backend/settings_app/)
- Empty app scaffold with `models.py`, `views.py`, `urls.py`, `admin.py`

---

### Phase 8: Management Command & Seed Data

#### [NEW] [core/management/commands/seed_hr_manager.py](file:///c:/Users/sagar/My%20Projects/MVP/backend/core/management/commands/seed_hr_manager.py)
- Creates superuser `hr_manager` with Token auth token
- Prints the auth token to stdout on first run
- Idempotent — skips if user already exists

---

### Phase 9: `.gitignore` Updates

#### [NEW] [backend/.gitignore](file:///c:/Users/sagar/My%20Projects/MVP/backend/.gitignore)
- Standard Python/Django ignores: `__pycache__/`, `*.pyc`, `.env`, `db.sqlite3`, `venv/`, `*.egg-info/`

---

## Verification Plan

### Automated Tests
```bash
cd c:\Users\sagar\My Projects\MVP\backend
pip install -r requirements.txt
python manage.py check            # System check for model/config issues
python manage.py makemigrations   # Verify all migrations generate cleanly
python manage.py migrate          # Apply to PostgreSQL (requires running DB)
python manage.py seed_hr_manager  # Seed superuser + token
```

### Manual Verification
- Confirm Django admin is accessible at `http://localhost:8000/admin/` with `hr_manager` credentials
- Confirm API root at `http://localhost:8000/api/` returns router endpoint listing
- Confirm Token auth works: `curl -H "Authorization: Token <token>" http://localhost:8000/api/employees/`
