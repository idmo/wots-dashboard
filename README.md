# Word on the Street — Special Order & Preorder App

A stub implementation of the Special Order Web Application PRD for Word on
the Street Books: a fast iPad register flow for capturing special
orders/preorders, and a desktop back-office dashboard for processing and
fulfilling them.

This is a working scaffold, not a finished product: the data model, core
workflows, and every screen from the PRD are wired up end-to-end against a
real Postgres database, but styling is intentionally plain and a couple of
integrations are mocked (see below). Treat it as a strong starting point to
build on, not a pixel-perfect final design.

## Stack

- **Next.js 16** (App Router, Turbopack) + React 19 + TypeScript
- **Tailwind CSS 4** for styling
- **PostgreSQL** via **Drizzle ORM** (`drizzle-orm` + `pg`) — chosen over
  Prisma because Prisma's engine binaries couldn't be downloaded in the
  sandbox this was built in; Drizzle is pure JS/TS with no native binary
  dependency, and is a first-class choice for a Next.js + Postgres app.
- **Zod** for API input validation
- **Papaparse** for the Basil CSV import/export

The app is deliberately **host-agnostic** — nothing in the code assumes a
specific hosting provider. See [Hosting](#hosting) below.

## What's real vs. mocked

| Integration | Status | Where |
| --- | --- | --- |
| OpenLibrary metadata lookup (cover, ISBN-13, genre) | **Live** — free, keyless API | `src/lib/services/openlibrary.ts` |
| Ingram stock/availability check | **Mocked** — deterministic fake data | `src/lib/services/ingram.ts` |
| Basil POS CSV import/reconciliation | **Mocked** — includes a sample-data generator | `src/lib/services/basil.ts` |

Both mocks are gated behind `INGRAM_MOCK` / `BASIL_MOCK` env vars (default
`true`) and are written as swappable modules with a single function to
replace once you have real API/export access — see the `TODO` comments in
each file. **Note:** during development, `openlibrary.org` was unreachable
from the sandbox this was built in (an organization network policy issue,
not a code issue) — the integration is written correctly against
OpenLibrary's documented search API but could not be live-tested end to
end here. Test it against your own network before relying on it.

## Getting started

```bash
npm install
cp .env.example .env

# Local Postgres (or point DATABASE_URL at any Postgres instance)
docker compose up -d

npm run db:push    # create tables from the Drizzle schema
npm run db:seed    # realistic demo data: 8 customers, 16 books, 15 orders
                    # across every order/line-item state

npm run dev         # http://localhost:3000
```

- `/` — landing page
- `/register` — the iPad register flow (customer capture, multi-book order
  entry with background metadata lookup, preorder/prepaid, submit)
- `/dashboard` — back-office: metrics & calendar, order search, PO
  Kanban/table/rekeying views, hold shelf, Basil import

`npm run db:studio` opens Drizzle Studio if you want to browse the seeded
data directly.

## Project structure

```
src/
  app/
    register/            Register (iPad) UI
    dashboard/            Back-office UI (overview, orders, pipeline, hold-shelf, import)
    api/                  Route handlers — one per PRD workflow (see below)
  components/
    register/              Customer search/create, line-item entry row
    dashboard/              Metrics cards, calendar, order detail, bar charts
    ui/                     Small shared primitives (Button, Card, badges)
  lib/
    db/                     Drizzle schema + client
    domain/                 Status pipelines, deadline math, zod schemas, metrics
    services/               OpenLibrary (live), Ingram (mock), Basil (mock)
scripts/
  seed.ts                 Demo data generator
drizzle.config.ts
docker-compose.yml         Local/self-hosted Postgres
```

### API routes → PRD sections

- `POST /api/orders`, `GET /api/orders` — order capture & staff lookup (3.1–3.4)
- `GET /api/books/lookup` — async background metadata lookup (3.2)
- `GET/POST /api/ingram/stock` — Ingram stock check (3.2, mocked)
- `PATCH /api/order-items/[id]`, `PATCH /api/order-items/bulk` — line-item
  status updates, single and batch (3.4, 4.2, 7.3)
- `POST /api/orders/[id]/notify`, `POST /api/order-items/[id]/extend` —
  notification tracking & deadline math (7.5)
- `GET/POST /api/basil/*` — Basil reconciliation import + sample export (7.4)
- `GET /api/metrics` — dashboard rollups (7.2)

### Data model

Matches PRD §5.2 exactly: `customers`, `authors`, `books`, `book_authors`
(junction), `orders`, `order_items`. See `src/lib/db/schema.ts`.

One deliberate addition worth knowing about: the "Interactive Calendar
View" (7.2) currently plots order volume and pickup deadlines, but not
"anticipated incoming deliveries" — the schema has no field for a
distributor-promised delivery date. If you want that, add
`order_items.expected_delivery_date` and populate it once Ingram is wired
up for real (Ingram's stock API can return lead-time estimates).

## Hosting

The PRD suggests a Hostinger VPS running Docker containers (app + Postgres
+ Nginx/Caddy reverse proxy). That works fine with this codebase as-is —
`docker-compose.yml` gives you the Postgres half; add a container for
`next build && next start` and a reverse proxy in front of it with your own
`Dockerfile` when you're ready to deploy that way.

A lower-maintenance alternative for a small independent bookstore: deploy
the Next.js app to **Vercel** and point `DATABASE_URL` at a managed
Postgres such as **Neon** or **Supabase** (both have generous free tiers).
Nothing in the app needs to change either way — it's just an environment
variable.

## Environment variables

See `.env.example`. Nothing is required beyond `DATABASE_URL` to run the
app with mocked Ingram/Basil data. Fill in the `INGRAM_*` vars and flip
`INGRAM_MOCK=false` (same for `BASIL_MOCK`) once real credentials/exports
are available.

## Known gaps / next steps

- **Design pass.** Layouts and interactions are functional but plain —
  worth a real design pass before staff use this daily, especially the
  register's touch-target sizing on an actual iPad in a Square stand.
- **Auth.** There's no login/staff-identity layer yet — anyone who can
  reach `/dashboard` can act as staff. Add this before deploying anywhere
  reachable from the open internet.
- **Real Ingram & Basil integrations** — see the table above.
- **Kanban drag-and-drop.** The pipeline Kanban view uses "move to next
  status" buttons rather than true drag-and-drop; swap in a library like
  `@dnd-kit` if that matters to your staff's workflow.
- **Notifications.** "Notify customer" currently just stamps
  `notification_date`/computes the deadline — it doesn't actually send an
  email/SMS. Wire up Brevo (already part of your stack) for that.
