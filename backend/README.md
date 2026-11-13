# Far & Near Backend

FastAPI + SQLAlchemy 2.x + Alembic backend for account authentication, two-person shared spaces, and a shared bucket list.

## Local setup (Windows PowerShell)

Run from the repository root:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r backend/requirements.txt
Copy-Item backend/.env.example backend/.env
```

Edit `backend/.env` locally. Set `DATABASE_URL` to your PostgreSQL development database, generate `ACCESS_TOKEN_SECRET` with `python -c "import secrets; print(secrets.token_urlsafe(48))"`, and set `FRONTEND_ORIGINS=http://localhost:5173`. Never commit or share `.env`.

Set the frontend API base URL in the repository-root `.env` (copy `.env.example`):

```dotenv
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

## Migrations and server

Inspect the revisions and back up any valuable database before applying migrations. These revisions add application tables; they do not import old browser data.

```powershell
python -m alembic -c backend/alembic.ini upgrade head
python -m alembic -c backend/alembic.ini current
python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

Health: `GET /api/v1/health` (returns `ok` only after `SELECT 1` succeeds). API docs: `http://127.0.0.1:8000/api/v1/docs`.

## API overview

All routes use `/api/v1`.

### Authentication (`/auth`)

- `POST /auth/signup` — create account; password 12–128 characters.
- `POST /auth/login` — returns short-lived bearer access token; sets HttpOnly refresh cookie and readable CSRF cookie.
- `GET /auth/me` — current profile; requires bearer token.
- `POST /auth/refresh` — rotates refresh session; requires cookies, exact allowed Origin, and matching `X-CSRF-Token`.
- `POST /auth/logout` — revokes refresh session and clears cookies; requires CSRF checks while a refresh cookie exists.

### Shared spaces (`/spaces`)

- `GET /spaces/me` — current user's space, or `null` when not in a space.
- `POST /spaces` — create a named space and six-character invite code; creator becomes owner.
- `POST /spaces/join` — join with an invite code.

A user can belong to only one space. Each space allows at most two members. Membership and capacity are enforced server-side; all space routes require authentication.

### Shared bucket list (`/bucket-list`)

- `GET /bucket-list` — list items for the authenticated user's space.
- `POST /bucket-list` — add an item.
- `PATCH /bucket-list/{item_id}` — update text, category, note, target date, or completion state.
- `DELETE /bucket-list/{item_id}` — delete an item.
- `POST /bucket-list/import` — one-time import of up to 200 legacy browser items; only allowed while the server-side list is empty.

All bucket-list queries are scoped to the user's current space. A member of another space cannot read or mutate the item by guessing its ID. The import endpoint does not delete or change browser-local data.

## Authentication and security notes

- Passwords use Argon2id; no plaintext or reversible password representation is stored by this backend.
- Access tokens are short-lived HS256 JWTs. Refresh tokens are opaque, HttpOnly cookies; only SHA-256 digests are stored.
- Refresh tokens rotate. Reuse of a revoked token revokes the active token family.
- CSRF protection checks exact Origin and double-submit cookie/header on refresh/logout. The CSRF cookie is readable at `/` so the Vite frontend can send it as a header; the refresh cookie remains HttpOnly and scoped to `/api/v1/auth`.
- CORS allows only configured origins, with credentials and explicit methods/headers.
- Production requires HTTPS, secure cookies, exact frontend origins, a strong secret, and a review of `SameSite`/domain settings.
- Rate limiting, email verification, password recovery, security event monitoring, and key rotation are still deployment/security follow-ups.
- PostgreSQL concurrency and migration behavior must be verified on the configured local database. SQLite tests do not prove PostgreSQL locking semantics.

## Tests

```powershell
python -m pytest backend/tests -q
python -m compileall -q backend/app backend/tests
```

Tests use disposable SQLite databases. They cover authentication, migrations, space membership/capacity, bucket-list CRUD, cross-space isolation, and legacy-list import. Do not point tests at a valuable database.

## Legacy browser data

The former local demo accounts use reversible Base64 obfuscation. They are not migrated and must not be treated as real credentials. Users should create a new backend account. The old local bucket-list copy is left intact and can be explicitly imported into an empty shared list from the frontend.

### Shared game lounge (`/games/room`)

Migration `0004_shared_game_room` creates one private game lounge per two-person ALYA space. The first partner who opens Games creates a six-character room code. The other partner opens the lounge on their own account and enters that exact code. Codes are only accepted from a member of the same ALYA space; a room cannot admit a third account. Both joined members can open all six games from the same lounge.

- `GET /games/room` — create or inspect the shared lounge and return its code/membership status.
- `POST /games/room/join` — join the lounge using the six-character code.
- `GET /games/room/heartbeat` — update presence and retrieve current room status.
- `GET /games/room/state/{game_key}` — read shared state for one of the six supported games.
- `PUT /games/room/state/{game_key}` — save a shared state using `expected_revision`; stale writes return `409 state_conflict` rather than silently overwriting the partner's latest update.

Supported keys: `truth-or-dare`, `would-you-rather`, `never-have-i-ever`, `finish-my-sentence`, `tic-tac-toe`, and `ludo`. The five prompt/board games store collaborative state in the shared lounge. Ludo keeps its dedicated server-authoritative room for dice rolls and legal token movement, and the common lounge gate ensures both partners have joined first. The frontend polls room presence and shared game state; this is near-real-time polling, not WebSockets. Ludo dice values are generated by the backend.

The follow-up migration `0005_shared_game_room_names` adds per-room display names for both partners. The join endpoint accepts `display_name`; either member can paste the shared code again to update their own room name. The browser shows both copy-code and paste-code controls for both partners.

Ludo is now two-player / one-color-per-person: the room creator controls Red, the joining partner controls Green, each player has four tokens, and exactly one roll is allowed per turn. Ludo endpoints also verify that the user has joined the shared game lounge first.

For production deployment, see the root `DEPLOYMENT_GUIDE.md` and `render.yaml`. The production FastAPI process serves the built Vite frontend from the same HTTPS origin so the refresh and CSRF cookies remain first-party.
