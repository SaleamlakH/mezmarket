# Deployment

MezMarket deploys as two services: the API on Render and the web app on Vercel. Both build from
the repository root so the pnpm workspace and the shared `@mez/types` / `@mez/validation` packages
are available.

## Render (API)

The service settings are mirrored in [`apps/api/render.yaml`](../apps/api/render.yaml). That file
is a reference for configuring the service manually in the Render dashboard; it is **not**
auto-discovered as a Render Blueprint, because Blueprints only look for `render.yaml` at the
repository root. Do not move `apps/api/render.yaml`. If you want Blueprint management, add a
root-level `render.yaml` instead.

- **Root directory:** repository root (leave blank).
- **Build command:** `pnpm install --frozen-lockfile && pnpm build --filter api...`
- **Start command:** `pnpm --filter api start`
- **Health check:** `/health`
- **Auto deploy:** disabled in `render.yaml`. Deploy manually from the Render dashboard.

The API build runs Prisma Client generation through Turbo before TypeScript compiles. Set the
runtime environment variables in the Render dashboard (all are marked `sync: false`, so no values
are committed):

| Variable                    | Purpose                                                      |
| --------------------------- | ------------------------------------------------------------ |
| `NODE_ENV`                  | Set in `render.yaml` to `production`.                        |
| `DATABASE_URL`              | PostgreSQL connection string used by Prisma.                 |
| `SUPABASE_JWKS_URL`         | Supabase JWKS endpoint used to verify access tokens.         |
| `CORS_ORIGINS`              | Comma-separated list of allowed web origins.                 |
| `SUPABASE_URL`              | Supabase project URL used by the server-side storage client. |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key used for signed upload/download URLs.       |
| `STORAGE_BUCKET`            | Supabase Storage bucket for product images.                  |

The API refuses to start in production when `DATABASE_URL`, `SUPABASE_JWKS_URL`, or
`CORS_ORIGINS` is missing or empty. The storage variables stay optional so environments that do
not use uploads can still boot.

## Vercel (Web)

The project configuration lives in [`apps/web/vercel.json`](../apps/web/vercel.json). Create one
Vercel project from this repository.

- **Root directory:** `apps/web`
- **Framework preset:** Vite
- **Install command:** `pnpm install --frozen-lockfile`
- **Build command:** `cd ../.. && pnpm turbo run build --filter=web`
- **Output directory:** `dist`
- **Git deployments:** disabled in `vercel.json`; deploy manually from the Vercel dashboard.

Because the Vercel project root is `apps/web`, the build command changes to the monorepo root
(`cd ../..`) before running Turbo; that keeps the pnpm workspace and the shared `@mez/types` /
`@mez/validation` packages available to the build.

The web app reads its configuration at build time, so set these variables in the Vercel project
before the first production build:

| Variable                 | Purpose                                                              |
| ------------------------ | -------------------------------------------------------------------- |
| `VITE_SUPABASE_URL`      | Supabase project URL used by the browser client.                     |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key used by the browser client.                        |
| `VITE_API_URL`           | Public API origin, for example `https://mezmarket-api.onrender.com`. |
| `VITE_API_PROXY`         | Optional; only used by the local dev server proxy.                   |

Vercel production builds fail with a clear error when any of the three required `VITE_*` variables
is missing or empty; that build-time guard runs only on Vercel (`VERCEL=1`). Local
`pnpm --filter web build` runs are intentionally exempt, but the runtime guard in
`apps/web/src/lib/env.ts` still fails fast in every production bundle. Never commit real values; use
the platform dashboards.

## Database migrations

`pnpm --filter api db:deploy` runs `prisma migrate deploy`. It applies pending SQL migrations from
[`apps/api/prisma/migrations`](../apps/api/prisma/migrations) in order. It does not create new migrations, reset the database, or regenerate the Prisma client.

Run it as a separate step immediately before deploying the API release that depends on the schema
change.

Run the command from a Render one-off job/shell or locally with the production `DATABASE_URL`
pointed at the production database. Never run it from the API build or start command: a failed
migration there would loop the service.
