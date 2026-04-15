# FPT Nexus

Internal lead operations system for FPT School Hải Phòng. Turns Excel lead lists into a live workflow so admins and sales can assign, track, and report on prospective students in one place.

**Live demo:** http://18.118.211.15:8000/

## Purpose

Built for internal management to:

- Import and normalize lead data from Excel files
- Assign and reassign leads across sales staff
- Track contact progress and SLA (default 16h) on every lead
- Monitor team performance via dashboard and reports
- Export results back to Excel/CSV for reporting

## Tech Stack

**Backend:** Python, FastAPI, WebSocket, SQLAlchemy, Pydantic, APScheduler, Pandas, OpenPyXL
**Frontend:** React 18, Vite
**Data:** PostgreSQL, Redis (queue + workers)
**Auth:** JWT with role-based access (`admin`, `sale`)
**Deploy:** Docker Compose

## Project Layout

- [backend/](backend/) — FastAPI app (`api`, `services`, `repositories`, `ingestion`, `queue`, `workers`)
- [frontend/](frontend/) — React + Vite SPA
- [docker/](docker/) — production compose files

## Run Locally

Prerequisites: Python 3.11+, Node 18+, PostgreSQL, Redis.

**1. Configure backend env** — create [backend/.env](backend/.env):

```
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/fpt_nexus
SYNC_DATABASE_URL=postgresql://user:pass@localhost:5432/fpt_nexus
REDIS_URL=redis://localhost:6379/0
JWT_SECRET=change-me
SEED_ADMIN_USERNAME=admin
SEED_ADMIN_PASSWORD=admin
```

**2. Start Redis** (Windows example):

```cmd
C:\Redis\redis-server.exe
```

**3. Start backend:**

```cmd
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**4. Start frontend:**

```cmd
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 and log in with the seeded admin account.

## Run with Docker

```bash
docker compose -f docker/docker-compose.prod.yml up -d --build
```

App is served on port `8000`.
