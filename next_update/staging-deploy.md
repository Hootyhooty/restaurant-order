# Staging Deploy

Deploy **backend** and **frontend** as separate Render services. Use a dedicated MongoDB database or cluster for staging — not production data.

Release path (GitHub Actions [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)):

1. PR → CI (lint, test, build, audit)
2. Merge to `main` → **Deploy staging** (Render deploy hooks)
3. Wait for `/api/health` + `/api/ready` (and `release` = git SHA) → `npm run staging:smoke`
4. GitHub Environment **production** approval → **Deploy production** hooks + smoke

See [BRANCH_PROTECTION.md](../.github/BRANCH_PROTECTION.md) for secrets and required reviewers.

## Prerequisites

- [ ] CI green on `main`
- [ ] Stripe **test** keys (`sk_test_…`, `whsec_…` for staging webhook URL)
- [ ] MongoDB URI for staging database
- [ ] `JWT_SECRET` ≥ 32 characters (unique per environment)
- [ ] GitHub Environments `staging` and `production` with deploy-hook secrets
- [ ] **Auto-deploy disabled** on production Render services (staging too if CD owns deploys)

## Backend (Render Web Service)

| Setting | Value |
|---------|--------|
| Root directory | `backend` |
| Build command | `npm install` |
| Start command | `npm start` |
| Health check path | `/api/health` |
| Auto-deploy | **No** (GitHub deploy hook) |

### Environment variables

Copy from `backend/.env.example` and set at minimum:

| Variable | Staging example |
|----------|-----------------|
| `NODE_ENV` | `production` |
| `APP_ENV` | `staging` (use `production` on the live API) |
| `MONGODB_URI` | staging cluster URI |
| `JWT_SECRET` | long random string |
| `FRONTEND_ORIGIN` | `https://your-staging-frontend.onrender.com` |
| `STRIPE_SECRET_KEY` | `sk_test_…` |
| `STRIPE_WEBHOOK_SECRET` | from Stripe Dashboard → webhook for **staging** URL |
| `PORT` | `5000` (or platform default) |
| `SENTRY_DSN` | Sentry project `picha-api` DSN (optional; omit to disable) |
| `REFUND_RECONCILE_INTERVAL_MS` | **unset** — use a Render Cron Job |

Render sets `RENDER_GIT_COMMIT`; `/api/health` exposes it as `release` so CD can wait for the new SHA.

**Stripe webhook URL (staging):**

`https://<staging-backend-host>/api/stripe/webhook`

Events: `checkout.session.completed`

## Frontend (Render Static Site or Web Service)

| Setting | Value |
|---------|--------|
| Root directory | `.` (repo root) |
| Build command | `npm install && npm run build` |
| Publish directory | `dist` |
| Auto-deploy | **No** (GitHub deploy hook) |

### Environment variables

| Variable | Value |
|----------|--------|
| `VITE_API_BASE_URL` | `https://<staging-backend-host>` |
| `VITE_APP_ENV` | `staging` (use `production` on the live site) |
| `VITE_SENTRY_DSN` | Sentry project `picha-web` DSN (optional; public client DSN — restrict domains in Sentry) |

Redeploy frontend after changing `VITE_*` vars (they are baked in at build time).

## Sentry (manual)

1. Create a Sentry org with two projects: `picha-api` and `picha-web`.
2. Restrict `picha-web` allowed domains to your staging and production origins.
3. Set `SENTRY_DSN` on backend services and `VITE_SENTRY_DSN` on frontend services (staging and prod).

## Refund Cron (Render)

Create a Cron Job (backend root, `npm run refund:reconcile`, every 15–30 min) with the same Mongo/Stripe env as the web service. Details: [refund-reconciliation-runbook.md](./refund-reconciliation-runbook.md).

## Post-deploy smoke

CI runs this after staging deploy. Locally:

```bash
cd backend
STAGING_API_URL=https://<staging-backend-host> \
STAGING_FRONTEND_ORIGIN=https://<staging-frontend-host> \
npm run staging:smoke
```

Wait for a new deploy:

```bash
API_URL=https://<backend-host> EXPECTED_RELEASE=<git-sha> npm run wait:ready
WAIT_FRONTEND=1 FRONTEND_ORIGIN=https://<frontend-host> npm run wait:ready
```

Expected: all checks pass.

## Manual E2E

Follow: [staging-verification-checklist.md](./staging-verification-checklist.md)

Record results in: [staging-signoff.md](./staging-signoff.md)
