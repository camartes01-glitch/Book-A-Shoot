# Book-A-Shoot

A small full-stack photography session booking app. Browse open slots from
several photographers, book a shoot, and manage upcoming bookings.

## Stack

- **Server** (`server/`) — Node.js + Express REST API backed by SQLite
  (`better-sqlite3`). Auto-creates its schema and seeds demo slots on first run.
- **Client** (`client/`) — React + Vite single-page app. The dev server proxies
  `/api` to the API, so no CORS or extra config is needed locally.
- npm **workspaces** tie the two packages together.

## Getting started

```bash
npm install          # install all workspace dependencies
npm run dev          # run API (:4000) and web client (:5173) together
```

Then open http://localhost:5173.

Run the pieces individually if you prefer:

```bash
npm run dev:server   # API only, on http://localhost:4000
npm run dev:client   # client only, on http://localhost:5173
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Run API and client together (watch mode). |
| `npm test` | Run the API integration tests (`node --test`). |
| `npm run build` | Production build of the client. |

## API

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Service health check. |
| `GET` | `/api/slots` | Available (unbooked) slots. `?photographer=` to filter. |
| `GET` | `/api/bookings` | All bookings with slot details. |
| `POST` | `/api/bookings` | Book a slot (`slot_id`, `customer_name`, `email`, `shoot_type`, `notes?`). |
| `DELETE` | `/api/bookings/:id` | Cancel a booking and free its slot. |

## Configuration

| Env var | Default | Purpose |
| --- | --- | --- |
| `PORT` | `4000` | API port. |
| `BAS_DATA_DIR` | `server/data` | Directory for the SQLite file. |
| `BAS_DB_PATH` | `<data>/book-a-shoot.db` | Full SQLite path (tests use a temp DB). |
| `VITE_API_TARGET` | `http://localhost:4000` | API target the Vite dev proxy forwards `/api` to. |

## Cloud Agent environment

`.cursor/environment.json` installs dependencies and launches the API and web
dev servers as named terminals, exposing ports 4000 and 5173.
