# FPT Nexus

## Project Story
This project was built as an **all-in final-year student product** for an internal lead operations workflow.

The real business pain was very practical:

- lead data came from Excel files
- teams needed a place to **work on leads in real time**
- managers needed to track whether leads were contacted within a strict **16-hour SLA**
- admins needed one place to upload, assign, monitor, and report

So the product vision became:

**Excel is the input. The system is the real workspace. The dashboard and reports are the operational output.**

In short, this project is a **Real-Time Lead Operations System** built to turn static spreadsheet data into a live, role-based workflow for internal teams.

## Main Goals
- Upload lead data from Excel and transform it into a structured operational dataset
- Let admins control assignments, monitoring, reporting, and exports
- Let sales users focus only on their own leads and tasks
- Enforce a clear SLA rule for overdue follow-up
- Provide dashboards and reports that are useful for daily execution, not just storage
- Keep the system practical for Vietnamese business users working with real Excel files

## Core Features
- JWT authentication with role-based access control
- Excel ingestion and normalization
- Redis-backed ingestion pipeline
- PostgreSQL as the source of truth
- Lead assignment and reassignment
- Contact tracking and notes
- SLA monitoring
- Monthly reporting
- CSV / Excel export
- Realtime-oriented dashboard behavior

## Tech Stack

### Languages
- Python
- JavaScript
- SQL

### Backend
- FastAPI
- SQLAlchemy
- Pydantic
- APScheduler
- Redis
- PostgreSQL
- OpenPyXL / Pandas

### Frontend
- React
- Vite

### Infrastructure / Runtime
- Redis
- PostgreSQL
- Docker Compose (optional)

## Skills Demonstrated
This repository reflects the kind of work I wanted to be able to show before graduation:

- full-stack application development
- backend API architecture
- layered service / repository design
- data ingestion pipeline design
- Excel parsing and schema normalization
- async processing with Redis queue
- PostgreSQL data modeling
- realtime-friendly dashboard design
- role-based access control
- business logic implementation for SLA monitoring
- debugging production-like data issues
- adapting a product based on changing client requirements

## How To Run
Below is the exact Windows-oriented flow.

### 1. Start Redis
Open CMD:

```cmd
C:\Redis>redis-server.exe
```

Open another CMD to test Redis:

```cmd
C:\Redis>redis-cli.exe
127.0.0.1:6379> ping
PONG
```

### 2. Start Backend
Open another terminal:

```cmd
cd backend
uvicorn app.main:app --reload --port 8000
```

### 3. Start Frontend
Open another terminal:

```cmd
cd frontend
npm install
npm run dev
```

Then open:

```text
http://localhost:5173
```

## Environment Notes
Before running the backend, make sure `backend/.env` is configured.

Important values include:

- `DATABASE_URL`
- `SYNC_DATABASE_URL`
- `REDIS_URL`
- `SEED_ADMIN_USERNAME`
- `SEED_ADMIN_PASSWORD`
- `JWT_SECRET`

## Default Workflow
1. Start Redis
2. Start backend
3. Start frontend
4. Log in as admin
5. Upload Excel
6. Review dashboard
7. Assign leads
8. Track SLA and reporting

## Architecture Summary

### Data Flow
Excel Upload  
→ Parse + Normalize  
→ Redis Queue  
→ Worker  
→ PostgreSQL  
→ Dashboard / Leads / Reports / Export

### Backend Layers
- `api/`: request / response layer
- `services/`: business logic
- `repositories/`: data access
- `ingestion/`: Excel parsing and normalization
- `queue/`: Redis queue helpers
- `workers/`: background processing
- `db/`: database/session setup
- `core/`: config, security, logging

## Why This Project Matters To Me
As a final-year student, I did not want to build something that only looked good in screenshots.

I wanted to build something that felt like a **real internal product**:

- messy Excel input
- changing client requirements
- data mapping issues
- SLA logic
- reporting mismatches
- UI consistency problems
- debugging real operational edge cases

This project became a place where I could practice not only coding, but also **thinking like a product-minded engineer**:

- understanding business rules
- translating user pain into system design
- debugging data problems from input to UI
- improving UX for real users, not just for demos

## Repository Structure
- `backend/` — FastAPI backend and business logic
- `frontend/` — React frontend
- `docker/` — optional Docker setup

## Final Note
This project represents a lot of iteration, debugging, rethinking, and rebuilding.

It was not a “perfect first try” project.  
It became valuable because it forced me to solve problems step by step until the product made sense both technically and operationally.
