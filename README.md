# JwtAuth

A JWT authentication demo app with a full Node.js stack in `Node/`:
- **Backend:** Express.js + MongoDB
- **Frontend:** Next.js (App Router)

The original ASP.NET + Angular implementation is still in the repo for legacy reference.

## Features

- Account registration, sign-in, refresh-token based auth, and sign-out
- Profile update including avatar upload
- Password change and admin password reset
- Claim/role based admin actions (manage users)
- Session lock after inactivity and unlock with password

## Current Stack (Node.js)

- Node.js (LTS recommended)
- Express.js
- Next.js
- MongoDB + Mongoose
- JWT + HTTP-only refresh-token cookies

## Project Structure

```text
Node/
  backend/   # Express API
  frontend/  # Next.js app
```

## Local Setup

### 1. Backend (Express + MongoDB)

```bash
cd Node/backend
cp .env.example .env
npm install
npm run dev
```

Default API URL: `http://localhost:4000`

Important env values in `Node/backend/.env`:
- `MONGODB_URI`
- `JWT_SECRET`
- `JWT_ISSUER`
- `JWT_AUDIENCE`
- `FRONTEND_ORIGIN`

### 2. Frontend (Next.js)

```bash
cd Node/frontend
cp .env.local.example .env.local
npm install
npm run dev
```

Default app URL: `http://localhost:3000`

Frontend API root is configured by:
- `NEXT_PUBLIC_API_ROOT` in `Node/frontend/.env.local`

## Build

### Backend

```bash
cd Node/backend
npm start
```

### Frontend

```bash
cd Node/frontend
npm run build
npm start
```

## Notes

- If backend startup fails with MongoDB connection error, start MongoDB locally or point `MONGODB_URI` to a reachable instance.
- `.gitignore` is updated to exclude Node build output, dependencies, uploads, and local env files.

## Legacy (.NET + Angular) Notes

The previous .NET 5 Web API + Angular implementation remains under:
- `JwtAuth/` (ASP.NET backend)
- `Front-end/` (Angular frontend)

You can still use that stack if needed, but new Node instructions above are the primary path.

