# Staging Deploy (Day 13)

Deploy **backend** and **frontend** as separate services (e.g. Render). Use a dedicated MongoDB database or cluster for staging — not production data.

## Prerequisites

- [ ] CI green on `main` (GitHub Actions)
- [ ] Stripe **test** keys (`sk_test_…`, `whsec_…` for staging webhook URL)
- [ ] MongoDB URI for staging database
- [ ] `JWT_SECRET` ≥ 32 characters (unique per environment)

## Backend (Render Web Service)

| Setting | Value |
|---------|--------|
| Root directory | `backend` |
| Build command | `npm install` |
| Start command | `npm start` |
| Health check path | `/api/health` |

### Environment variables

Copy from `backend/.env.example` and set at minimum:

| Variable | Staging example |
|----------|-----------------|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | staging cluster URI |
| `JWT_SECRET` | long random string |
| `FRONTEND_ORIGIN` | `https://your-staging-frontend.onrender.com` |
| `STRIPE_SECRET_KEY` | `sk_test_…` |
| `STRIPE_WEBHOOK_SECRET` | from Stripe Dashboard → webhook for **staging** URL |
| `PORT` | `5000` (or platform default) |

**Stripe webhook URL (staging):**

`https://<staging-backend-host>/api/stripe/webhook`

Events: `checkout.session.completed`

## Frontend (Render Static Site or Web Service)

| Setting | Value |
|---------|--------|
| Root directory | `.` (repo root) |
| Build command | `npm install && npm run build` |
| Publish directory | `dist` |

### Environment variables

| Variable | Value |
|----------|--------|
| `VITE_API_BASE_URL` | `https://<staging-backend-host>` |

Redeploy frontend after changing `VITE_API_BASE_URL`.

## Post-deploy smoke (automated)

From your machine (repo root):

```bash
cd backend
STAGING_API_URL=https://<staging-backend-host> \
STAGING_FRONTEND_ORIGIN=https://<staging-frontend-host> \
npm run staging:smoke
```

Expected: all checks pass.

## Manual E2E

Follow: [staging-verification-checklist.md](./staging-verification-checklist.md)

Record results in: [staging-signoff.md](./staging-signoff.md)
