# Far & Near — ALYA

Far & Near is a private two-person space for long-distance couples and close friends. The React 19 + Vite 7 frontend includes conversation games, Tic-Tac-Toe, Ludo, a shared bucket list, and a FastAPI backend for real accounts and shared-space membership.

## Stack

- Frontend: React 19, Vite 7, React Router 7, JavaScript JSX, plain CSS
- Backend: FastAPI, SQLAlchemy 2.x, Alembic, PostgreSQL
- Authentication: Argon2id password hashing, short-lived access JWTs, rotating HttpOnly refresh cookies, CSRF protection
- Shared data: two-person spaces, six-character invite codes, server-backed bucket-list CRUD

## Run the frontend

From the repository root:

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

The default API URL is `http://localhost:8000/api/v1`. Change `VITE_API_BASE_URL` in the root `.env` only if your API runs elsewhere.

## Run the backend

Follow [backend/README.md](backend/README.md). In short:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r backend/requirements.txt
Copy-Item backend/.env.example backend/.env
```

Configure `DATABASE_URL`, `ACCESS_TOKEN_SECRET`, and `FRONTEND_ORIGINS` in `backend/.env`, then apply migrations and start FastAPI:

```powershell
python -m alembic -c backend/alembic.ini upgrade head
python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

Health: `http://127.0.0.1:8000/api/v1/health` (returns healthy only after a real database `SELECT 1`). API docs: `http://127.0.0.1:8000/api/v1/docs`.

## Important account and data migration notes

- New signups use the backend and require passwords of at least 12 characters.
- Older demo accounts in `localStorage` are not imported: their password representation is reversible and is not a secure password hash. Create a new account using the backend.
- Existing browser-local bucket-list items are preserved. When the new shared list is empty, the Bucket List page offers an explicit import. Importing does not delete the original browser copy.
- The app's old local demo auth keys are left untouched; they are not used as real authentication.
- Games are currently local/pass-the-device experiences. Online game-state synchronization is not implemented in this build.

## Tests

```powershell
npm run test:qa
python -m pytest backend/tests -q
python -m compileall -q backend/app backend/tests
```

The backend tests use disposable SQLite databases. PostgreSQL migrations and transaction/locking behavior still need to be verified on your own configured development database before deployment.

## Synchronized two-person Ludo

Ludo uses the authenticated shared-space membership after both partners join the six-game lounge with its shared room code. The board remains paused until both members are online. It is a two-player game: the first room member controls Red only, the second controls Green only, and each player has four tokens. Each turn permits one dice roll; rolling a six allows a token to leave the yard but does not grant an extra roll. The die is rendered as an animated square with the correct pip pattern.

Game state and dice rolls are stored/validated by FastAPI in PostgreSQL. The frontend polls the room every ~2.2 seconds for presence and synchronized state; actions are checked against the authenticated player and current turn on the server. If either player disconnects, the room pauses and resumes when both return. A new Alembic migration (`0003_ludo_rooms`) creates the room table.

After updating to this milestone, run from the project root:

```powershell
python -m alembic -c backend/alembic.ini upgrade head
```

Then restart the FastAPI server and refresh the frontend. Both people must be signed into the same two-person ALYA space and open Ludo at the same time.

## Current multiplayer behavior

The six games share one private game lounge. Both partners can copy the six-character room code, paste a code, and set their own display name for the lounge. Every game page has a persistent route back to the lounge, and the lounge links directly to the shared bucket list. The bucket list refreshes from the shared-space API so changes made by one partner appear for the other without a manual page reload.

Ludo is two-player: the room creator plays Red only and the partner plays Green only. Each person controls four tokens and gets one roll per turn. The dice is server-generated, animates while rolling, and displays the actual pip pattern in a square control beside each player's card.

## Production deployment

See [`DEPLOYMENT_GUIDE.md`](./DEPLOYMENT_GUIDE.md). The included `render.yaml` deploys the Vite build and FastAPI API on one HTTPS origin with managed PostgreSQL; this keeps the authentication refresh/CSRF cookies first-party.
