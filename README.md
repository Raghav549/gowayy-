# gowayy

The super-app for the Darjeeling & Kalimpong hills: tours, stays, cabs, groceries, food and local shops in one place.

Built with Next.js 16 (App Router), React 19, Tailwind CSS 4, Drizzle ORM and PostgreSQL.

## Deploy to Vercel

1. **Import the repo** in Vercel (Add New → Project). The framework (Next.js), install and build commands are detected automatically; no `vercel.json` is needed.
2. **Add a Postgres database.** In the project, open *Storage → Create / Connect Database* and pick **Neon** (or Supabase / Prisma Postgres). The integration sets `DATABASE_URL` / `POSTGRES_URL` for you. Any other Postgres works too: set `DATABASE_URL` yourself.
3. **Set `AUTH_SECRET`** (Settings → Environment Variables), for example the output of `openssl rand -base64 32`. Without it, a key is derived from the database URL, which works but is less flexible to rotate.
4. **Deploy.**

You don't need to run any migration or seed step. On the first request the app creates every table, applies column upgrades and loads the demo catalogue. This runs in one transaction under a lock, so concurrent cold starts are safe and a failure leaves nothing half-created. Later starts cost a single query.

Setup is batched into about a dozen round trips, so it takes a few seconds even when the database is in a different region from the functions. For the fastest pages, set *Settings → Functions → Function Region* to the region of your Neon project (for example Singapore `sin1` for `aws-ap-southeast-1`).

To check a deployment, open `/api/health`: it returns `{"ok":true,"database":"ready"}` once everything is set up. If something is wrong it gives the error code, a plain-language fix, and which variable and host it used. It never shows the password.

The build does **not** need database access, so preview deployments without a database still build. Until a database works, pages show a "Database not connected yet" / "We can't reach the database" screen with the same diagnosis.

### Demo accounts

| Role  | Email             | Password   |
| ----- | ----------------- | ---------- |
| User  | `demo@gowayy.in`  | `demo1234` |
| Admin | `admin@gowayy.in` | `admin123` |

Change or remove these before going live.

## Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes* | Postgres connection string. *`POSTGRES_URL`, `POSTGRES_PRISMA_URL`, `DATABASE_URL_UNPOOLED` and `POSTGRES_URL_NON_POOLING` (set by Vercel integrations) are picked up automatically. |
| `AUTH_SECRET` | recommended | Signs login sessions. |
| `DATABASE_SSL` | no | `disable` / `require` / `verify`. By default TLS is on for remote hosts and off for localhost; `sslmode` in the URL is honoured. |
| `DATABASE_POOL_MAX` | no | Connections per server instance (default 5 on Vercel, 10 locally). |

See `.env.example`.

## Local development

```bash
cp .env.example .env.local   # point DATABASE_URL at a local Postgres
npm install
npm run dev                  # http://localhost:3000
```

Tables and demo data are created automatically on first load.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js dev server / production build / production server |
| `npm run lint` · `npm run typecheck` | ESLint · TypeScript |
| `npm run db:schema` | Regenerate `src/db/schema-sql.ts` after editing `src/db/schema.ts` (the start-up schema) |
| `npm run check` | Verify the generated schema is current, then type-check and build |
| `npm run db:push` · `db:studio` | Optional drizzle-kit tooling against `DATABASE_URL` |

### Changing the database schema

Edit `src/db/schema.ts`, then run `npm run db:schema` and commit both files. New tables and indexes are created on the next start. New columns are added automatically if they are nullable or have a default. Anything more involved (renames, type changes) needs a hand-written migration.
