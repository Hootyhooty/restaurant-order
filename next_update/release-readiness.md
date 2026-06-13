# Release Readiness Package (Day 14)

Release candidate checklist tying together the 2-week production-grade plan.

**Release / tag:** __________________  
**Target date:** __________________  
**Owner:** __________________

## Production URLs

| Service | URL |
|---------|-----|
| Frontend | https://picha-restaurant.com (+ https://www.picha-restaurant.com) |
| Backend API | https://api.picha-restaurant.com |
| Stripe webhook | https://api.picha-restaurant.com/api/stripe/webhook |
| Email sender (Resend) | noreply@picha-restaurant.com |

---

## 1. Quality gates (Week 1)

| Item | Status | Evidence |
|------|--------|----------|
| Booking unit tests | ☐ | `backend/test/bookingRules.test.js` — `npm test` |
| API integration tests | ☐ | `backend/test/integration/` |
| Webhook idempotency tests | ☐ | `backend/test/stripeWebhookDedupe.test.js` |
| Refund reconciliation job | ☐ | `backend/jobs/refundReconciliationJob.js` |
| k6 load baseline | ☐ | `backend/k6/` + `k6/results/` |
| Performance tuning pass | ☐ | Day 7 notes / second k6 run |

---

## 2. Ops & security (Week 2)

| Item | Status | Evidence |
|------|--------|----------|
| Structured logging | ☐ | JSON logs with `requestId` |
| Monitoring + alerts | ☐ | Admin Analysis tab; `alertRules.js` |
| Security hardening | ☐ | [security-checklist.md](./security-checklist.md) |
| Admin audit trail | ☐ | `/api/admin/audit-logs` |
| CI quality gates | ☐ | `.github/workflows/ci.yml` green |

---

## 3. Staging verification (Day 13)

| Item | Status | Evidence |
|------|--------|----------|
| Staging deployed | ☐ | [staging-deploy.md](./staging-deploy.md) |
| Smoke script pass | ☐ | `npm run staging:smoke` |
| Manual E2E checklist | ☐ | [staging-verification-checklist.md](./staging-verification-checklist.md) |
| Sign-off recorded | ☐ | [staging-signoff.md](./staging-signoff.md) |

---

## 4. Runbooks (Day 14)

| Document | Purpose |
|----------|---------|
| [incident-rollback-runbook.md](./incident-rollback-runbook.md) | Deploy failures, rollback, triage |
| [refund-reconciliation-runbook.md](./refund-reconciliation-runbook.md) | Stuck `refund_pending` recovery |
| [architecture-risks.md](./architecture-risks.md) | System map + known risks |

---

## 5. Production environment (fill before go-live)

### Backend (Render Web Service)

| Variable | Set? | Notes |
|----------|------|-------|
| `NODE_ENV=production` | ☐ | |
| `MONGODB_URI` | ☐ | Production cluster, not staging |
| `JWT_SECRET` (≥32 chars) | ☐ | Unique; never in repo |
| `FRONTEND_ORIGIN` | ☐ | `https://picha-restaurant.com,https://www.picha-restaurant.com` |
| `FRONTEND_URL` | ☐ | `https://picha-restaurant.com` (used in verification/reset email links) |
| `STRIPE_SECRET_KEY` | ☐ | `sk_live_…` |
| `STRIPE_WEBHOOK_SECRET` | ☐ | Live webhook endpoint (`api.picha-restaurant.com`) |
| `EMAIL_MODE=production` | ☐ | Switches to Resend SMTP |
| `EMAIL_FROM` | ☐ | `Picha <noreply@picha-restaurant.com>` (verified domain) |
| `SMTP_HOST/PORT/USER/PASS` | ☐ | Resend: `smtp.resend.com` / `587` / `resend` / `<API key>` |
| Alert thresholds | ☐ | Optional; defaults in `.env.example` |

**Health check path:** `/api/health`  
**Root directory:** `backend`  
**Start:** `npm start`

### Frontend (Render Static Site)

| Variable | Set? | Notes |
|----------|------|-------|
| `VITE_API_BASE_URL` | ☐ | `https://api.picha-restaurant.com` (rebuild frontend after changing) |

**Build:** `npm install && npm run build`  
**Publish:** `dist`

### Stripe

| Item | Set? |
|------|------|
| Live webhook URL configured | ☐ |
| Event `checkout.session.completed` enabled | ☐ |
| Test transaction verified end-to-end | ☐ |

### MongoDB Atlas

| Item | Set? |
|------|------|
| Production database / cluster | ☐ |
| Network access allows Render | ☐ |
| Backup enabled | ☐ |

---

## 6. Go / no-go decision

**Go-live criteria (all must be true):**

- [ ] CI green on release commit
- [ ] Staging sign-off complete with no blocking defects
- [ ] Production env vars verified (live Stripe, correct URLs)
- [ ] Smoke + one manual booking path verified on production
- [ ] Runbooks accessible to operator
- [ ] Rollback procedure understood (previous Render deploy)

**Decision:**

- [ ] **GO** — release to production  
- [ ] **NO-GO** — blockers listed below  

**Blockers:**

| ID | Description |
|----|-------------|
| | |

**Signed:** __________________ **Date:** __________________

---

## 7. Post-release (first 24 hours)

- [ ] Monitor Admin Analysis alerts
- [ ] Check Stripe webhook delivery success rate
- [ ] Run `refund_pending` count check; reconcile if needed
- [ ] Review Render logs for 5xx spikes
- [ ] Confirm no open SEV-1/SEV-2 issues

---

## Doc index (full `next_update/`)

| File | Day |
|------|-----|
| [plan](./plan) | Master 2-week plan |
| [staging-deploy.md](./staging-deploy.md) | 13 |
| [staging-verification-checklist.md](./staging-verification-checklist.md) | 13 |
| [staging-signoff.md](./staging-signoff.md) | 13 |
| [security-checklist.md](./security-checklist.md) | 10 |
| [incident-rollback-runbook.md](./incident-rollback-runbook.md) | 14 |
| [refund-reconciliation-runbook.md](./refund-reconciliation-runbook.md) | 14 |
| [architecture-risks.md](./architecture-risks.md) | 14 |
| [release-readiness.md](./release-readiness.md) | 14 |
