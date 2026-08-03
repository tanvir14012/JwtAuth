# Python + Next.js version

This folder contains a full Python-stack implementation of JwtAuth:

- `backend/` - FastAPI + SQLAlchemy + PostgreSQL
- `frontend/` - Next.js frontend

## Quick start

### Backend

```bash
cd Python/backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd Python/frontend
copy .env.local.example .env.local
npm install
npm run dev
```
