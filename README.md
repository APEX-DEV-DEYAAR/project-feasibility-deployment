# Project Feasibility App

React feasibility screen for real estate development projects, backed by Express + PostgreSQL.

## Stack
- Frontend: React 18 + Vite 7
- Backend: Node.js + Express 4
- Database: PostgreSQL 16 (local — no Docker)

## Architecture
Enterprise layered design with database portability:
```
Routes → Controllers → Services → Repositories → DB Adapter → Database
```
Switch databases by adding a new adapter and setting `DB_TYPE` in `.env`.

## Quick start
1. Ensure PostgreSQL is running locally
2. Create the database and user (see `server/.env.example` for credentials)
3. Install dependencies: `npm install`
4. Start backend: `npm run dev:server`
5. Start frontend: `npm run dev:client`
6. Open `http://localhost:5173`

## Environment
Copy `server/.env.example` to `server/.env` and adjust credentials.

Key variables:
- `PORT` — API server port (default 4000)
- `DB_TYPE` — database engine (`postgres`, future: `oracle`)
- `DATABASE_URL` — connection string

## API
- `GET /api/health`
- `GET /api/projects`
- `GET /api/projects/:projectName/feasibility/latest`
- `GET /api/feasibility/latest`
- `POST /api/feasibility`
