# JwtAuth

A JWT authentication demo app available in two fully supported implementations:

| Implementation | Backend | Frontend | Database | Folder |
|---|---|---|---|---|
| .NET + Angular | ASP.NET 5 Web API | Angular 12 | SQL Server | `JwtAuth/` + `Front-end/` |
| Node.js | Express.js | Next.js | MongoDB | `Node/` |

## Features

- Account registration, sign-in, refresh-token based auth, and sign-out
- Profile update including avatar upload
- Password change and admin password reset
- Claim/role based admin actions (manage users)
- Session lock after inactivity and unlock with password

---

## Node.js Stack

### Tech

- Node.js (LTS recommended), Express.js, Next.js, MongoDB + Mongoose
- JWT access tokens + HTTP-only refresh-token cookies

### Project structure

```text
Node/
  backend/   # Express API
  frontend/  # Next.js app
```

### Setup

#### Backend (Express + MongoDB)

```bash
cd Node/backend
cp .env.example .env     # fill in MONGODB_URI, JWT_SECRET, etc.
npm install
npm run dev
```

API runs at `http://localhost:4000` by default.

Key env vars in `Node/backend/.env`:

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Signing secret for JWTs |
| `JWT_ISSUER` | JWT issuer claim |
| `JWT_AUDIENCE` | JWT audience claim |
| `FRONTEND_ORIGIN` | CORS allowed origin |
| `ADMIN_EMAIL` | Seeded admin email |
| `ADMIN_PASSWORD` | Seeded admin password |

#### Frontend (Next.js)

```bash
cd Node/frontend
cp .env.local.example .env.local    # set NEXT_PUBLIC_API_ROOT
npm install
npm run dev
```

App runs at `http://localhost:3000` by default.

### Build for production

```bash
# Backend
cd Node/backend && npm start

# Frontend
cd Node/frontend && npm run build && npm start
```

---

## .NET + Angular Stack

### Tech

- C#, ASP.NET 5 Web API, Entity Framework Core, SQL Server
- Angular 12, Angular Material, Bootstrap 5

### Project structure

```text
JwtAuth/      # ASP.NET Web API backend
Front-end/    # Angular frontend
```

### Setup

#### Backend

- Copy `JwtAuth/appsettings.Demo.json` to `JwtAuth/appsettings.json` and fill in the database connection string, JWT secret, admin seed data, and CORS origins.
- Run EF Core migrations from the Package Manager Console:
  ```
  Add-Migration initial
  Update-Database
  ```
- Build and run via Visual Studio or the .NET CLI.

#### Frontend

```bash
cd Front-end
npm install
```

Set `API_ROOT` in `src/environments/environment.ts` (and `environment.prod.ts`) to your backend URL, then run:

```bash
ng serve
```

For HTTPS with a self-signed certificate:

```bash
ng serve --ssl true --ssl-key path/to/privateKey.key --ssl-cert path/to/certificate.crt
```

### Deploy in IIS

1. Publish the Web API project (Folder publish) and copy the output to your site root.
2. Build the Angular app:
   ```bash
   ng build -c production --output-path dist/wwwroot --base-href /
   ```
3. Copy `dist/wwwroot` to your site root alongside the API.
4. Add URL rewrite rules to `web.config` so Angular routes fall through to `index.html` while `/api/*` and static files are served directly. See `JwtAuth/example_for_shared_iis_hosting_web.config` for a full example.

---

## Notes

- The Node.js and .NET stacks are independent — you can run either without the other.
- For Node.js, if the backend exits with a MongoDB connection error, ensure MongoDB is running locally or update `MONGODB_URI` to a remote instance.

