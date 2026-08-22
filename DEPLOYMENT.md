# Mukut Memorial School ERP — Deployment Guide

## Hosting Provider (Recommended Free Demo)

**Single-service (simplest, recommended):**
- **Platform:** Render.com — Web Service (Node 20, free tier)
- **Mode:** Backend serves the built Vite frontend from `client/dist` (see `server/index.js: static + SPA fallback`)
- **URL shape:** `https://mukut-memorial-demo.onrender.com` (free `*.onrender.com` subdomain, HTTPS)
- **Database:** TiDB Cloud Serverless (MySQL wire-compatible, 5 GiB free, no Postgres rewrite) **OR** Clever Cloud MySQL (256 MB free) **OR** Railway MySQL (requires card, $5 free credit). Pick one — all speak MySQL protocol so `prisma` needs no schema change.
- **Alternative split:** Vercel (frontend static) + Render (backend) — set `VITE_API_URL` + `FRONTEND_URL` accordingly. Single-service avoids CORS complexity.

**Why not PlanetScale/Neon/Supabase?** They are Postgres or paid; converting `provider = "mysql"` to `postgresql` would be a risky rewrite forbidden for a sales demo.

## Architecture

```
Chrome → https://mukut-memorial-demo.onrender.com
          ├─ GET /           → client/dist/index.html (Vite build)
          ├─ GET /api/*      → Express (helmet, cors, rateLimit 20/200)
          │    ├─ /api/auth  → JWT access 15m + refresh 7d (bcrypt 12)
          │    ├─ /api/students, /fees, /marks, /transport, ...
          │    └─ /api/demo/reset (DEMO_MODE only, token-gated)
          ├─ /uploads/*      → static disk (ephemeral on free tier)
          └─ MySQL            → TiDB / Clever Cloud (env DATABASE_URL)
```

- Frontend `client/src/services/api.ts` uses `VITE_API_URL` if set, otherwise same-origin `/api` (Vite proxy in dev: `vite.config.ts`).
- CORS: `FRONTEND_URL` supports comma-separated list; in `DEMO_MODE=true` also allows `*.vercel.app` / `*.onrender.com` previews.
- Env validation: `server/utils/env.js` requires `DATABASE_URL,JWT_SECRET,JWT_REFRESH_SECRET` in production.

## Environment Variables Required

**Backend (`server` / Render Environment):**
```
DATABASE_URL=mysql://user:password@host:4000/demo_db?sslaccept=strict
JWT_SECRET=<64 hex>           # node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_REFRESH_SECRET=<64 hex>
NODE_ENV=production
DEMO_MODE=true
DEMO_RESET_TOKEN=<32 hex>     # node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
FRONTEND_URL=https://mukut-memorial-demo.onrender.com
# Optional
PORT=5000
UPLOAD_DIR=uploads
BACKUP_DIR=/tmp/backups
```

**Frontend (`client` build env — Render sets at build, Vercel sets in dashboard):**
```
VITE_API_URL=                 # leave empty for single-service; or https://your-backend.onrender.com for split
VITE_DEMO_MODE=true
```

Never commit `.env` containing secrets. Use `server/.env.example` + `client/.env.example` as templates.

## How Deployment Works

1. **Build:** `npm run install:all` → `cd server && npx prisma generate` → `npm run build` (client `tsc -b && vite build` → `client/dist`)
2. **Migrate:** `cd server && npx prisma migrate deploy` (uses existing `prisma/migrations/*` — never `migrate reset`)
3. **Seed demo:** `DATABASE_URL=...demo_db DEMO_MODE=true node server/prisma/seed-demo.js` — creates 450 students, 35 teachers, 14 classes, fees, attendance, exams/marks, notifications, transport, and upserts `demo@mukutmemorial.demo / Demo@12345` (bcrypt 12)
4. **Start:** `node server/index.js` listens on `PORT`, serves API + static frontend if `client/dist` exists

`render.yaml` in repo root encodes this for Render blueprint deploy.

## How to Redeploy

- **Render single-service:** Push to `main` → Render auto-builds via `render.yaml` buildCommand/startCommand.
- **Manual:** `git push` then Render Dashboard → Manual Deploy → Latest commit.
- **Split Vercel + Render:** Push frontend → Vercel auto-builds; push backend → Render rebuilds; ensure `VITE_API_URL` matches backend URL and `FRONTEND_URL` lists the Vercel URL.

## How to Update the Demo

- Update code → `npm run lint && npx tsc -b --noEmit` (client) → `npm run build` locally to verify → commit → push.
- New Prisma model → `cd server && npx prisma migrate dev --name <change>` locally against demo DB → commit `prisma/migrations/*` → deploy runs `migrate deploy`.
- Re-seed: `POST https://your-demo.onrender.com/api/demo/reset` with header `x-demo-reset-token: $DEMO_RESET_TOKEN` (only when `DEMO_MODE=true`).

## How to Reset Demo Data (Owner Only)

- **Never accessible to normal demo users.** Endpoint is `POST /api/demo/reset`, gated by `DEMO_MODE=true` AND `x-demo-reset-token` matching `DEMO_RESET_TOKEN` (not a permission, not a JWT — a separate secret).
- It only touches the DB pointed at by `DATABASE_URL` — must be the demo DB (`school_erp_demo` or TiDB demo cluster), never production.
- Status check: `GET /api/demo/status` (no auth) shows `demoMode` + `hasResetToken`.
- Local: `DATABASE_URL="mysql://...demo" DEMO_MODE=true node server/prisma/seed-demo.js`

## Known Limitations (Free Tier)

- **Uploads are ephemeral:** Render free filesystem resets on deploy/restart; `server/uploads` is disk (`multer` 5 MB). Demo uploads work but are lost on redeploy. Production should use Cloudinary (code exists in `server/utils/cloudinary.js` but env is empty) or S3.
- **Uploads are public via `/uploads/*` static:** No auth on `express.static('/uploads')` — by design; don't upload sensitive real data.
- **Backups require `mysqldump`:** `server/controllers/backup.controller.js` shells `mysqldump`/`mysql` (512 MB buffer, `--single-transaction`). Render free image may not have it — backup create/restore will 500 with "Check mysqldump availability." Backup routes are already permission-gated (`BACKUP_VIEW/CREATE/RESTORE`, SUPER_ADMIN only) but on demo they are effectively disabled. Don't expose backup .sql via public URL.
- **Free DB limits:** TiDB free 5 GiB / 25k QPS; Clever Cloud 256 MB; Render MySQL not free anymore. Monitor usage; demo seed is ~2k rows, fine for sales.
- **Free service sleeps:** Render free sleeps after 15 min idle → first request after sleep has ~30s cold start.
- **Rate limits:** `20/15m` on `/api/auth`, `200/15m` on `/api` per IP — generous for demo but could trip during load testing.
- **No git in this env:** This machine has no `git` binary — connect repo via hosting dashboard import, not CLI.
- **CORS is allowlist-based:** Set `FRONTEND_URL` correctly; comma-separated if needed.

## Files Added for Deployment

- `server/prisma/seed-demo.js` — fictional 450/35 demo seed + demo user
- `server/routes/demo.routes.js` — `POST /api/demo/reset` (token-gated) + `GET /api/demo/status`
- `client/src/components/DemoBadge.tsx` + wiring in `MainLayout.tsx`, `AuthLayout.tsx`, `Login.tsx` (`VITE_DEMO_MODE`)
- `client/.env` / `client/.env.example`, `server/.env.example` updates
- `client/src/services/api.ts` — `VITE_API_URL` support
- `server/index.js` — multi-origin CORS, demo health field, static `client/dist` serving
- `server/utils/env.js` — DEMO_* vars
- `Dockerfile`, `render.yaml`

## Security Checklist — Verified

- HTTPS via Render (auto).
- CORS allowlist, credentials true, helmet crossOriginResourcePolicy.
- Secrets via hosting env, never in frontend, never committed (`.gitignore` excludes `.env`).
- `prisma` credentials server-side only; client has no DB URL.
- JWT `accessToken 15m` + `refreshToken 7d` stored HttpOnly? — currently localStorage (existing); secure cookies not added to avoid breaking existing auth (documented as future P0).
- File types restricted in `utils/multer.js` (image/pdf/doc/csv), 5 MB limit.
- Validation via `express-validator` on all routes; error messages safe (no stack in production).
- Backup/restore gated by `BACKUP_*` perms; demo reset gated by separate token.

## What Is NOT Deployed Yet

This preparation is complete locally (`lint 1 warning pre-existing`, `typecheck 0 errors`, `build success`). **No public URL exists yet** — per your FAILURE RULE I will not invent one. To make the URL live, connect the repo to Render (or Railway/Vercel) and set the env vars above, then `migrate deploy` + `seed-demo` will run on start. See "How Deployment Works."
