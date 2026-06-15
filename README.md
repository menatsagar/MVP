#  HR Salary Management Platform

A full-stack HR salary management platform for tracking employees, salary bands, review cycles, and audit trails. Built with **Django REST Framework** on the backend and **React** on the frontend.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
- [Django Apps](#django-apps)
- [Background Tasks](#background-tasks)
- [Running Tests](#running-tests)
- [API Documentation](#api-documentation)

---

## Architecture Overview

```
┌─────────────────────┐        ┌──────────────────────┐
│   React Frontend    │  HTTP  │   Django REST API     │
│                      │◄──────►│   (DRF + Celery)     │
│   Port 3000/5173    │        │   Port 8000           │
└─────────────────────┘        └──────────┬───────────┘
                                          │
                               ┌──────────┴───────────┐
                               │                      │
                        ┌──────┴──────┐     ┌─────────┴────────┐
                        │ PostgreSQL  │     │  Redis (Broker)   │
                        │   Database  │     │  + Celery Worker  │
                        └─────────────┘     └──────────────────┘
```

---

## Tech Stack

### Backend

| Technology                | Purpose                          |
| ------------------------- | -------------------------------- |
| Python 3.12+              | Runtime                          |
| Django 6.x                | Web framework                    |
| Django REST Framework     | REST API                         |
| PostgreSQL                | Primary database                 |
| Celery + Redis            | Async task queue                 |
| drf-spectacular            | OpenAPI schema & Swagger docs    |
| django-filter             | Queryset filtering               |
| openpyxl                  | Excel/CSV import & export        |
| uv                        | Package manager                  |

### Frontend

| Technology                | Purpose                          |
| ------------------------- | -------------------------------- |
| React 19                  | UI library                       |
| TanStack Start            | Full-stack React framework       |
| TanStack Router           | File-based routing               |
| TanStack React Query      | Server state management          |
| Tailwind CSS 4            | Styling                          |
| Radix UI                  | Accessible component primitives  |
| Recharts                  | Dashboard charts                 |
| Zod                       | Schema validation                |
| React Hook Form           | Form management                  |
| Vite 7                    | Build tool & dev server          |

---

## Project Structure

```
MVP/
├── backend/                    # Django backend
│   ├── backend/                # Django project config
│   │   ├── settings.py         # Django settings
│   │   ├── urls.py             # Root URL configuration
│   │   ├── celery.py           # Celery app configuration
│   │   ├── wsgi.py             # WSGI entry point
│   │   └── asgi.py             # ASGI entry point
│   ├── core/                   # Shared models & utilities
│   │   ├── models.py           # Currency, Country, Department, JobTitle, BackgroundTask
│   │   ├── views.py            # CRUD viewsets for lookup tables
│   │   └── urls.py             # Core API routes
│   ├── employees/              # Employee management
│   │   ├── models.py           # Employee, SalaryRecord (append-only)
│   │   ├── views.py            # Employee CRUD + CSV import/export
│   │   ├── views_dashboard.py  # Dashboard summary & distribution stats
│   │   ├── filters.py          # Employee queryset filters
│   │   ├── tasks.py            # Celery tasks (CSV import/export)
│   │   ├── services.py         # Business logic layer
│   │   └── signals.py          # Post-save signals
│   ├── salary_bands/           # Market salary bands
│   │   ├── models.py           # SalaryBand (per job title & country)
│   │   └── views.py            # Salary band CRUD
│   ├── reviews/                # Salary review cycles
│   │   ├── models.py           # ReviewCycle, DepartmentBudget, SalaryProposal
│   │   ├── views.py            # Review cycle management + commit
│   │   └── tasks.py            # Async review commit task
│   ├── audit/                  # Audit trail
│   │   ├── models.py           # AuditLog (immutable)
│   │   ├── views.py            # Audit log list + export
│   │   └── tasks.py            # Async audit export task
│   ├── manage.py
│   ├── pyproject.toml          # Python dependencies (uv)
│   └── .env.example            # Environment variable template
│
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── routes/             # TanStack Router file-based routes
│   │   │   ├── __root.tsx      # Root layout (AppShell)
│   │   │   ├── index.tsx       # Landing / redirect
│   │   │   ├── dashboard.tsx   # Dashboard with charts & stats
│   │   │   ├── employees.tsx   # Employee list (paginated, sortable)
│   │   │   ├── employees.$id.tsx  # Employee detail / edit
│   │   │   ├── bands.tsx       # Salary bands management
│   │   │   ├── reviews.tsx     # Review cycles list
│   │   │   ├── reviews.$id.tsx # Review cycle detail & proposals
│   │   │   ├── audit.tsx       # Audit log viewer
│   │   │   └── settings.tsx    # Settings (currencies, etc.)
│   │   ├── components/         # Reusable React components
│   │   │   ├── AppShell.tsx    # Main layout with sidebar navigation
│   │   │   ├── EmployeeFormPanel.tsx
│   │   │   ├── ImportCsvDialog.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── PageHeader.tsx
│   │   │   └── ui/            # Radix-based UI primitives (shadcn/ui)
│   │   ├── lib/               # Utility functions
│   │   ├── styles.css         # Global styles
│   │   ├── router.tsx         # Router configuration
│   │   ├── entry-client.tsx   # Client entry point
│   │   └── entry-server.tsx   # Server entry point
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
└── README.md                  # ← You are here
```

---

## Prerequisites

- **Python** 3.12+
- **Node.js** 18+ and **npm**
- **PostgreSQL** 14+
- **Redis** 6+ (for Celery)
- **uv** — Python package manager ([install guide](https://docs.astral.sh/uv/getting-started/installation/))

---

## Getting Started

### Backend Setup

```bash
# 1. Navigate to backend directory
cd backend

# 2. Create and configure environment variables
cp .env.example .env
# Edit .env with your database credentials

# 3. Create the PostgreSQL database
createdb mvp_db

# 4. Install Python dependencies
uv sync

# 5. Run database migrations
uv run python manage.py migrate

# 6. Create a superuser (for admin & API auth)
uv run python manage.py createsuperuser

# 7. Start the Django development server
uv run python manage.py runserver

# 8. (In a separate terminal) Start the Celery worker
uv run celery -A backend worker --loglevel=info
```

The API will be available at `http://localhost:8000/api/`.

### Frontend Setup

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install Node dependencies
npm install

# 3. Start the development server
npm run dev
```

The frontend will be available at `http://localhost:3000` (or `http://localhost:5173`).

---

## Environment Variables

Create a `.env` file in the `backend/` directory based on `.env.example`:

| Variable       | Description                        | Default                         |
| -------------- | ---------------------------------- | ------------------------------- |
| `SECRET_KEY`   | Django secret key                  | `change-me-to-a-random-secret`  |
| `DEBUG`        | Enable debug mode                  | `True`                          |
| `DB_NAME`      | PostgreSQL database name           | `mvp_db`                        |
| `DB_USER`      | PostgreSQL user                    | `postgres`                      |
| `DB_PASSWORD`  | PostgreSQL password                | `postgres`                      |
| `DB_HOST`      | Database host                      | `localhost`                     |
| `DB_PORT`      | Database port                      | `5432`                          |
| `REDIS_URL`    | Redis connection URL (Celery)      | `redis://localhost:6379/0`      |

---

## API Endpoints

All endpoints are prefixed with `/api/` and require token authentication.

### Authentication

| Method | Endpoint             | Description           |
| ------ | -------------------- | --------------------- |
| POST   | `/api/auth/token/`   | Obtain auth token     |

### Employees

| Method | Endpoint                             | Description                       |
| ------ | ------------------------------------ | --------------------------------- |
| GET    | `/api/employees/`                    | List employees (paginated)        |
| POST   | `/api/employees/`                    | Create employee                   |
| GET    | `/api/employees/{id}/`               | Retrieve employee detail          |
| PUT    | `/api/employees/{id}/`               | Update employee                   |
| DELETE | `/api/employees/{id}/`               | Deactivate employee               |
| POST   | `/api/employees/import-csv/`         | Import employees from CSV         |
| GET    | `/api/employees/export/`             | Export employees to Excel         |

### Dashboard

| Method | Endpoint                             | Description                       |
| ------ | ------------------------------------ | --------------------------------- |
| GET    | `/api/dashboard/summary/`            | Aggregate stats (headcount, avg salary, etc.) |
| GET    | `/api/dashboard/distribution/`       | Salary distribution by department |

### Salary Bands

| Method | Endpoint                             | Description                       |
| ------ | ------------------------------------ | --------------------------------- |
| GET    | `/api/salary-bands/`                 | List salary bands                 |
| POST   | `/api/salary-bands/`                 | Create salary band                |
| GET    | `/api/salary-bands/{id}/`            | Retrieve salary band              |
| PUT    | `/api/salary-bands/{id}/`            | Update salary band                |
| DELETE | `/api/salary-bands/{id}/`            | Delete salary band                |

### Review Cycles

| Method | Endpoint                             | Description                       |
| ------ | ------------------------------------ | --------------------------------- |
| GET    | `/api/review-cycles/`                | List review cycles                |
| POST   | `/api/review-cycles/`                | Create review cycle               |
| GET    | `/api/review-cycles/{id}/`           | Retrieve cycle with proposals     |
| PUT    | `/api/review-cycles/{id}/`           | Update review cycle               |
| POST   | `/api/review-cycles/{id}/commit/`    | Commit all proposals              |

### Audit Log

| Method | Endpoint                             | Description                       |
| ------ | ------------------------------------ | --------------------------------- |
| GET    | `/api/audit-log/`                    | List audit entries (filterable)   |
| GET    | `/api/audit-log/export/`             | Export audit log to Excel         |

### Lookup Tables

| Method | Endpoint                             | Description                       |
| ------ | ------------------------------------ | --------------------------------- |
| GET    | `/api/settings/currencies/`          | List / manage currencies          |
| GET    | `/api/countries/`                    | List / manage countries           |
| GET    | `/api/departments/`                  | List / manage departments         |
| GET    | `/api/job-titles/`                   | List / manage job titles          |

---

## Django Apps

| App             | Responsibility                                                             |
| --------------- | -------------------------------------------------------------------------- |
| **core**        | Shared models (Currency, Country, Department, JobTitle, BackgroundTask)     |
| **employees**   | Employee CRUD, salary records (append-only), CSV import/export, dashboard  |
| **salary_bands**| Market salary band definitions per job title & country                     |
| **reviews**     | Salary review cycles, department budgets, salary proposals & commit logic  |
| **audit**       | Immutable audit trail for all create/update/deactivate actions             |

---

## Background Tasks

Async tasks are processed via **Celery** with **Redis** as the message broker:

| Task                  | Trigger                            | Description                                    |
| --------------------- | ---------------------------------- | ---------------------------------------------- |
| CSV Import            | POST `/api/employees/import-csv/`  | Parse and import employees from uploaded CSV    |
| Employee Export        | GET `/api/employees/export/`       | Generate Excel file with employee data         |
| Review Cycle Commit   | POST `/api/review-cycles/{id}/commit/` | Apply all proposals and create salary records |
| Audit Log Export       | GET `/api/audit-log/export/`      | Generate Excel file with audit entries         |

Task status can be tracked via the `BackgroundTask` model (UUID-based).

---

## Running Tests

```bash
# Backend tests (uses in-memory SQLite automatically)
cd backend
uv run python manage.py test

# Run tests for a specific app
uv run python manage.py test employees
uv run python manage.py test reviews
uv run python manage.py test salary_bands
uv run python manage.py test audit
```

---

## API Documentation

Interactive API documentation is auto-generated via **drf-spectacular**:

- **Swagger UI**: [http://localhost:8000/api/docs/](http://localhost:8000/api/docs/)
- **OpenAPI Schema (JSON)**: [http://localhost:8000/api/schema/](http://localhost:8000/api/schema/)

---

## License

Private — All rights reserved.
