# CheckMyCert

Full-stack certificate verification platform for validating academic and professional credentials using OCR, tamper analysis, and database-backed verification workflows.

## Table of Contents

- Overview
- Architecture
- Features
- Tech Stack
- Repository Structure
- Setup
- Environment Variables
- API Endpoints
- Screenshots
- Deployment Notes
- Roadmap
- Contributing
- License

## Overview

CheckMyCert helps organizations and recruiters verify certificates at scale. The platform supports single-file and bulk verification, QR/token lookup, and role-based workflows for users, HR teams, and admins.

## Architecture

The project uses a two-layer architecture:

- Frontend and BFF: Next.js 14 App Router
- Backend API and async processing: Django REST Framework + Celery

High-level flow:

1. Browser calls Next.js routes under app/api.
2. Next.js route handlers coordinate request/response behavior.
3. Django endpoints handle core business logic, persistence, and verification pipelines.
4. Redis + Celery process long-running verification tasks.
5. PostgreSQL stores users, certificates, and verification records.

## Features

- User auth and profile retrieval
- Certificate upload and verification flow
- QR/token-based verification lookup
- Bulk verification submission with status and result tracking
- Dashboard stats and recent verification views
- OCR extraction support through OCR.space and backend OCR stack
- Role-oriented workflows (user, hr, admin)

## Tech Stack

Frontend:

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS

Backend:

- Django 4.2
- Django REST Framework
- SimpleJWT
- Celery
- Redis
- PostgreSQL

Verification and OCR:

- OpenCV
- EasyOCR
- Tesseract
- OCR.space API

Infra and Tooling:

- Docker
- Docker Compose
- pnpm
- Python virtual environments

## Repository Structure

- app: Next.js App Router pages and API routes
- components: Reusable React UI components
- contexts: Client-side context providers (auth, etc.)
- lib: Frontend utilities (OCR client, Firebase setup, helpers)
- backend: Django project and apps
- docs: Supporting project documentation

## Setup

### Prerequisites

- Node.js 18+
- pnpm 8+
- Python 3.11+
- PostgreSQL 14+
- Redis 7+
- Docker + Docker Compose (optional but recommended)

### Option A: Run with Docker Compose

1. Clone the repository.
2. Configure environment variables as described in Environment Variables.
3. Start services:

```bash
# from project root
docker compose up --build
```

4. Open the apps:

- Frontend: http://localhost:3000
- Backend: http://localhost:8000

### Option B: Run locally without Docker

1. Install frontend dependencies:

```bash
pnpm install
```

2. Create and activate backend virtual environment, then install backend dependencies:

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
# source .venv/bin/activate
pip install -r requirements.txt
```

3. Run backend migrations:

```bash
python manage.py migrate
```

4. Start backend server:

```bash
python manage.py runserver
```

5. In a second terminal, start Celery worker:

```bash
cd backend
# Windows
.venv\Scripts\activate
# macOS/Linux
# source .venv/bin/activate
celery -A checkmycert worker --loglevel=info
```

6. In a third terminal, start frontend:

```bash
pnpm dev
```

## Environment Variables

Create environment files for both frontend and backend.

### Frontend environment (.env.local)

```env
# BFF/backend connectivity
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Firebase client config
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# OCR.space
OCR_SPACE_API_KEY=your_ocr_space_key
```

### Backend environment (backend/.env)

```env
# Django core
SECRET_KEY=change-me
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000

# Database strategy: use individual vars consistently
DB_ENGINE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=checkmycert
DB_USER=checkmycert
DB_PASSWORD=checkmycert_password
DB_SSLMODE=prefer
DB_CONN_MAX_AGE=60
DB_CONNECT_TIMEOUT=10

# Redis and Celery
REDIS_URL=redis://localhost:6379/0

# Optional toggles
DEMO_MODE=False
```

### Important consistency note

This codebase reads database settings from DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, and DB_ENGINE.
Use that format in local, Docker, and deployment environments to avoid conflicts with single-string DATABASE_URL-only setups.

## API Endpoints

### Next.js API routes (browser-facing)

- GET /api/auth/me
- POST /api/certificates/upload
- POST /api/certificates/verify
- POST /api/certificates/generate
- GET /api/verification/results/:id
- POST /api/database/verify
- GET /api/qr-verify/:token
- POST /api/bulk-verification
- GET /api/bulk-verification/:batchId/status
- GET /api/bulk-verification/:batchId/results
- GET /api/dashboard/stats
- GET /api/dashboard/recent-verifications

### Django API routes (backend-facing)

Auth:

- POST /api/auth/register/
- POST /api/auth/login/
- POST /api/auth/refresh/
- GET /api/auth/me/
- GET /api/auth/profile/

Certificates:

- POST /api/certificates/upload/
- GET /api/certificates/status/:job_id/
- GET /api/certificates/result/:result_id/
- POST /api/certificates/bulk/
- GET /api/certificates/bulk/status/:batch_id/
- GET /api/certificates/list/
- GET /api/certificates/results/
- GET /api/certificates/dashboard/stats/

## Screenshots

Add screenshots in a screenshots folder and update links below:

- Home page

![Home page](./screenshots/home.png)

- Certificate upload flow

![Certificate upload](./screenshots/upload.png)

- Verification results

![Verification results](./screenshots/results.png)

- Bulk verification dashboard

![Bulk dashboard](./screenshots/bulk-dashboard.png)

- Admin stats

![Admin stats](./screenshots/admin-stats.png)

## Deployment Notes

- Prefer environment-specific secrets management for production.
- Keep SECRET_KEY and database credentials out of source control.
- Run Django behind a production WSGI/ASGI setup and reverse proxy.
- Use managed PostgreSQL and Redis for production reliability.
- Add observability for Celery queue latency and API error rates.

## Roadmap

- Complete Next.js BFF-only proxy migration (remove remaining mock/business logic in app/api)
- Move all temporary/in-memory storage to backend persistence
- Add integration tests across Next.js BFF and Django API contracts
- Add CI pipeline for linting, tests, and container builds

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Open a pull request

## License

Add your preferred license here (for example, MIT).
