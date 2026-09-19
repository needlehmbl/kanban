# Real-Time Kanban Board (Node.js/TypeScript)

Multi-user, self-hostable kanban board with GitHub OAuth login, drag-and-drop boards, and live updates across clients via WebSockets.

## Stack
- Backend: Node.js + Express + TypeScript, Socket.io, Prisma + Postgres, Passport.js (GitHub), express-session + connect-pg-simple
- Frontend: React + Vite + TypeScript + Tailwind, @dnd-kit, socket.io-client, React Router
- Packaging: Docker Compose (api, web, postgres)

## Quickstart — one-command self-host

```bash
cp .env.example .env
# fill in GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET from https://github.com/settings/developers
# callback URL: http://localhost:4000/auth/github/callback
docker compose up
```

- Web: http://localhost:5176
- API: http://localhost:4000/health
- Login: "Sign in with GitHub" → redirects to /boards on success

## Local dev (without Docker)

```bash
# Postgres (adjust DATABASE_URL in backend/.env as needed)
# backend
cd backend
cp ../.env.example .env
npm install
npx prisma migrate dev
npm run dev  # :4000

# frontend (new terminal)
cd frontend
npm install
npm run dev  # :5176
```

## Auth
- `GET /auth/github`, `GET /auth/github/callback` — Passport GitHub strategy
- Session stored in Postgres via connect-pg-simple
- First login upserts `User`; `GET /auth/me` returns current session user

## API (all `/api/boards/*` require session, scoped via BoardMember)
- `GET /api/boards` — list my boards
- `POST /api/boards` — create board (become owner)
- `GET /api/boards/:boardId` — board + columns + cards + members
- `POST /api/boards/:boardId/columns` — add column → emits `column:created`
- `POST /api/boards/columns/:columnId/cards` — add card → emits `card:created`
- `PATCH /api/boards/cards/:cardId/move` — move/reorder → emits `card:moved`
- `PATCH /api/boards/cards/:cardId` — edit → emits `card:updated`
- `POST /api/boards/:boardId/invite` — invite by email (user must have logged in once)

## Realtime
- Client joins `board:<id>` room on Board mount (`board:join` / `board:leave`)
- Server broadcasts `card:moved`, `card:created`, `column:created`, `card:updated`, `member:added`
- Presence: server tracks room member list, emits `presence:update`; UI shows avatars
- Activity toasts: "Alex moved 'Fix bug' to Done" from realtime events

## Screenshots
- [ ] Board list
- [ ] Board with drag-and-drop
- [ ] Presence avatars + toasts

## CI
GitHub Actions: backend typecheck + frontend build on push (`ci` required check).
