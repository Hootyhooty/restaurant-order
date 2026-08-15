# Incident & Rollback Runbook (Day 14)

Use this when production or staging is broken, degraded, or a bad deploy must be reverted.

## Quick triage (first 5 minutes)

| Symptom | Check first | Likely cause |
|---------|-------------|--------------|
| Site blank / 404 | Frontend deploy logs, `dist` publish path | Bad frontend build or wrong publish dir |
| API unreachable | `GET /api/health` | Backend down or wrong URL in `VITE_API_BASE_URL` |
| Login/booking fails, DB errors | `GET /api/ready` returns 503 | MongoDB URI, Atlas network access, connection limit |
| Payments succeed but no booking | Stripe webhook logs, backend logs | Wrong `STRIPE_WEBHOOK_SECRET` or webhook URL |
| CORS errors in browser | Backend env `FRONTEND_ORIGIN` | Origin mismatch with deployed frontend URL |
| Refunds stuck | Admin Analysis tab, `refund_pending` count | Stripe API error; Render Cron / refund runbook |
| New 5xx / blank UI | Sentry (`picha-api` / `picha-web`), `requestId` | Uncaught exception after deploy |

### Health checks

```bash
curl -s https://<backend-host>/api/health
curl -s https://<backend-host>/api/ready
```

- `/api/health` — process is up (liveness)
- `/api/ready` — MongoDB connected (readiness); 503 means DB not ready

Automated smoke (from repo):

```bash
cd backend
STAGING_API_URL=https://<backend-host> \
STAGING_FRONTEND_ORIGIN=https://<frontend-host> \
npm run staging:smoke
```

---

## Severity guide

| Level | Examples | Response |
|-------|----------|----------|
| **SEV-1** | No bookings/payments, data loss risk, all users blocked | Roll back immediately; page stakeholders |
| **SEV-2** | Partial feature broken (booking OK, admin broken) | Roll back or hotfix within hours |
| **SEV-3** | Cosmetic, non-critical admin UI | Fix in next deploy |

---

## Rollback procedure (Render)

### Backend rollback

1. Render Dashboard → **backend Web Service** → **Events** or **Deploys**
2. Find last **known-good deploy** (before incident)
3. **Rollback** to that deploy (or redeploy previous commit from GitHub)
4. Verify:
   - `GET /api/health` → `status: ok`
   - `GET /api/ready` → `status: ready`
   - `npm run staging:smoke` against production URLs (read-only checks OK)

### Frontend rollback

1. Render Dashboard → **frontend Static Site** → **Events**
2. Roll back to previous deploy
3. Confirm `VITE_API_BASE_URL` still points at correct backend (rebuild required if env changed)
4. Hard-refresh browser; test login + `/booking` availability load

### Database rollback

**There is no automatic DB rollback with a code deploy.** MongoDB changes are forward-only.

- Do **not** restore a snapshot onto live production unless you accept data loss since snapshot time
- Restore **into a new cluster** and verify first — [atlas-restore-playbook.md](./atlas-restore-playbook.md)
- For bad migration/data fix: use admin tools + manual MongoDB Compass edits with audit trail
- Booking unique index `{ tableId, date, timeSlot }` must remain — do not drop without incident review

### Stripe rollback

- Cannot "roll back" a charge in code deploy — use Stripe Dashboard for manual refunds if needed
- After backend rollback, confirm webhook endpoint URL still matches deployed backend URL
- Re-send failed webhook events from Stripe Dashboard → **Developers → Webhooks → event → Resend**

---

## Common incidents & fixes

### 1. Render cannot access GitHub repo

**Symptoms:** Deploy fails at clone step; log says cannot access repository.

**Fix:**
1. Render → Account Settings → reconnect GitHub
2. GitHub → Settings → Applications → Render → grant access to `restaurant-order` repo
3. Re-link service to correct repo/branch; Manual Deploy → Clear build cache & deploy

### 2. MongoDB connection failed

**Symptoms:** `/api/ready` returns 503; logs show `MongoDB connection error`.

**Fix:**
1. Verify `MONGODB_URI` in Render backend Environment
2. Atlas → Network Access → allow `0.0.0.0/0` (or Render outbound IP ranges)
3. Atlas → Database Access → user still exists with correct password
4. Redeploy backend

### 3. Stripe webhook failures

**Symptoms:** Payment completes in Stripe but booking stays pending; Analysis shows webhook failures.

**Fix:**
1. Stripe Dashboard → Webhooks → confirm URL: `https://<backend>/api/stripe/webhook`
2. Match `STRIPE_WEBHOOK_SECRET` to that endpoint's signing secret
3. Ensure event `checkout.session.completed` is enabled
4. Resend failed events after fix

### 4. CORS / frontend cannot call API

**Symptoms:** Browser console: blocked by CORS policy.

**Fix:**
1. Set `FRONTEND_ORIGIN=https://<exact-frontend-url>` on backend (no trailing slash mismatch)
2. Redeploy backend
3. Confirm frontend `VITE_API_BASE_URL` matches backend URL

### 5. JWT / auth suddenly invalid for all users

**Symptoms:** Everyone logged out; 401 on protected routes.

**Fix:**
1. Check if `JWT_SECRET` was changed on redeploy — changing it invalidates all tokens (expected)
2. Users must log in again; do not rotate `JWT_SECRET` without comms

---

## Trace a single booking flow (logs)

Structured JSON logs include `requestId`. Trace path:

1. User → `POST /api/bookings/create-checkout-session`
2. Stripe → `POST /api/stripe/webhook` (`checkout.session.completed`)
3. Booking created or conflict refund path
4. Admin actions → audit log entry

**Admin UI:**
- **Analysis** tab — metrics and active alerts
- **Audit logs** — `GET /api/admin/audit-logs` (admin booking/refund actions)

Search Render logs or Sentry for:
- `requestId`
- `bookingId`
- `stripeEventId`
- `refund_reconciliation_complete`

---

## Post-incident checklist

- [ ] Root cause documented (what broke, when, why)
- [ ] Rollback or hotfix verified with smoke + one manual booking test
- [ ] Stripe webhook delivery green
- [ ] `refund_pending` backlog = 0 (or reconcile run — see refund runbook)
- [ ] Update `staging-signoff.md` or create incident note if production-affecting
- [ ] Add regression test or monitoring gap if applicable

---

## Contacts & links (fill in)

| Item | Value |
|------|--------|
| Production backend URL | |
| Production frontend URL | |
| Stripe Dashboard | https://dashboard.stripe.com |
| MongoDB Atlas | |
| Render Dashboard | https://dashboard.render.com |
| Sentry | API `picha-api`, web `picha-web` |
| On-call / owner | |

---

## Related docs

- [refund-reconciliation-runbook.md](./refund-reconciliation-runbook.md)
- [atlas-restore-playbook.md](./atlas-restore-playbook.md)
- [architecture-risks.md](./architecture-risks.md)
- [staging-deploy.md](./staging-deploy.md)
- [security-checklist.md](./security-checklist.md)
