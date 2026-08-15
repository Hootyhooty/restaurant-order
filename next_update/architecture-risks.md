# Architecture & Known Risks (Day 14)

Overview of how the restaurant-order system is built, plus risks and mitigations for production.

---

## System overview

```
[Browser]
    |
    v
[Frontend - Vite/React Static Site]
    |  HTTPS (VITE_API_BASE_URL)
    v
[Backend - Express on Render Web Service]
    |                    |
    |                    +--> [Stripe API] (checkout, refunds)
    v
[MongoDB Atlas - restaurant_db]
```

**Deploy model:** frontend and backend are **separate domains/services** on Render (or similar). This is a **frontend/backend split**, not a separate "main vs product" site split — all user flows live in one SPA with route-based sections.

---

## Frontend

| Item | Detail |
|------|--------|
| Stack | React 18, Vite, react-router-dom |
| Entry | `frontend/src/App.jsx` |
| State | `AuthContext`, `CartContext` |
| API base | `frontend/src/apiConfig.js` → `VITE_API_BASE_URL` |
| Auth | JWT in a host-only HttpOnly cookie; credentialed API requests |

**Key routes:** `/`, `/menu`, `/store`, `/booking`, `/profile`, `/admin`, `/payment/*`, `/review/:menuSlug`

---

## Backend

| Item | Detail |
|------|--------|
| Stack | Express 4, Mongoose 8 |
| Entry | `backend/index.js` |
| DB name | `restaurant_db` (forced) |
| Health | `GET /api/health`, `GET /api/ready` |

**API mounts:**

| Prefix | Purpose |
|--------|---------|
| `/api/auth` | Register, login |
| `/api/users` | Profile, current user |
| `/api/meals`, `/api/souvenirs` | Catalog |
| `/api/bookings` | Availability, checkout, cancel |
| `/api/stripe` | Cart checkout + webhook |
| `/api/reviews`, `/api/messages` | Social features |
| `/api/admin` | Admin CRUD, analysis, audit logs |

---

## Data model (MongoDB)

| Collection | Role |
|------------|------|
| `customers` | Users, roles (USER/ADMIN) |
| `booking` | Confirmed reservations |
| `booking_intent` | Pre-confirmation payment pipeline |
| `processed_stripe_events` | Webhook idempotency |
| `transactions` | Store/cart orders |
| `reviews`, `messages` | User content |
| `admin_audit_logs` | Admin action trail |
| `meals`, `souvenirs` | Catalog (DB + file sync) |

**Critical index:** `booking` unique on `{ tableId, date, timeSlot }` — prevents double booking after concurrent Stripe payments.

---

## Booking & payment flow

```
User selects table/date/slot
    -> POST /api/bookings/create-checkout-session
    -> Stripe Checkout (redirect)
    -> Stripe webhook checkout.session.completed
    -> Create Booking OR conflict -> refund intent
    -> User message (Admin sender)
```

**Concurrency:** two users can pay for the same slot; unique index + webhook logic ensures only one `Booking`; loser gets refund path → may enter `refund_pending` → reconcile job.

---

## Observability (Day 8–9)

| Feature | Location |
|---------|----------|
| Structured JSON logs | `backend/utils/logger.js` — includes `requestId`, `userId`, `bookingId` |
| Metrics | In-memory ops store; exposed in Admin Analysis |
| Alerts | `backend/utils/alertRules.js` — thresholds in env |
| Audit | `AdminAuditLog` — query via `/api/admin/audit-logs` |

**Alert thresholds** (`backend/.env.example`):

| Env var | Default | Triggers when |
|---------|---------|---------------|
| `ALERT_BOOKING_FAIL_RATE_PCT` | 20 | Checkout failure rate high |
| `ALERT_BOOKING_CONFLICT_RATE_PCT` | 10 | Conflict rate high |
| `ALERT_WEBHOOK_P95_MS` | 3000 | Slow webhook processing |
| `ALERT_WEBHOOK_FAIL_COUNT` | 3 | Webhook failures |
| `ALERT_REFUND_BACKLOG_MAX` | 5 | `refund_pending` count |
| `ALERT_API_P95_MS` | 500 | General API latency |

---

## Security (Day 10)

- JWT auth + role checks on admin routes
- Host-only HttpOnly cookies (shorter ops sessions); password-reset session revocation
- Failed-login lockout (in-memory) + rate limits on auth, booking, writes, public reads, webhooks
- Helmet + production HTTPS enforcement
- CORS locked to `FRONTEND_ORIGIN` in production
- Input validation on booking, auth, admin queries

See [security-checklist.md](./security-checklist.md) for full list and manual items.

---

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`):

- Frontend: lint + test + build + audit
- Backend: lint + `npm test` + audit
- Push to `main`: deploy **staging** via Render hooks → wait `/api/ready` → `staging:smoke` → **production** job (GitHub Environment approval)

Branch protection should block merge without green CI (see `.github/BRANCH_PROTECTION.md`). **Disable Render auto-deploy** on production so smoke + approval gate go-live.

Observability: structured JSON logs; optional Sentry (`SENTRY_DSN` / `VITE_SENTRY_DSN`) with `requestId` and `release` (`RENDER_GIT_COMMIT`).

---

## Runtime topology (single instance)

Rate limits, login lockout, Admin Analysis metrics, and kitchen SSE (`kitchenEventHub`) are **in-memory**. They reset on restart and do **not** sync across multiple Render instances.

**Operate with one backend web service** until Redis (or equivalent) backs those concerns. Refunds: Render Cron Job (`npm run refund:reconcile`); leave `REFUND_RECONCILE_INTERVAL_MS` unset on the web service.

---

## Known risks & mitigations

| Risk | Impact | Mitigation | Status |
|------|--------|------------|--------|
| Simultaneous booking payments for same table | Double charge / double book | Unique index + webhook conflict handler + refund path | Implemented |
| Stripe webhook duplicate delivery | Duplicate bookings/refunds | `ProcessedStripeEvent` claim-before-process | Implemented |
| Stripe refund API transient failure | User charged, status `refund_pending` | Render Cron `npm run refund:reconcile` | Implemented; Cron is default |
| Browser session theft through XSS | Compromised account actions | Host-only HttpOnly cookie, CSP, input validation | Mitigated; continue XSS review |
| CORS misconfiguration | Frontend blocked | Require `FRONTEND_ORIGIN` in production | Implemented |
| MongoDB Atlas IP allowlist | Backend cannot connect | Use `0.0.0.0/0` or Render outbound ranges | Manual ops |
| Render shared outbound IPs | Atlas allowlist drift | Monitor; use Dedicated IPs if required | Manual ops |
| DB loss / bad migration | Data loss | Atlas backup; restore to **new** cluster | [atlas-restore-playbook.md](./atlas-restore-playbook.md) — run a drill |
| Metrics in memory only | Lost on restart | Accept for MVP; export logs/alerts externally later | Known gap — single instance |
| Login lockout in memory | Resets on restart | Rate limits + lockout; Redis later for multi-instance | Implemented (process-local) |
| No account lockout | Repeated credential guessing | Auth rate limits; future account lockout | Mitigated — lockout enabled |
| Horizontal scale without Redis | Split rate limits / SSE / metrics | Stay on one dyno or add shared store | Documented constraint |
| Cloudinary / image URL drift | Broken images | Migration scripts in `backend/scripts/` | Ops as needed |
| `JWT_SECRET` rotation | All users logged out | Plan rotation; communicate downtime | Manual |

---

## Production deploy checklist (summary)

1. CI green on release commit
2. Staging deploy + smoke on `main`, then GitHub production approval
3. Backend env: `MONGODB_URI`, `JWT_SECRET` (≥32), `FRONTEND_ORIGIN`, Stripe **live** keys + webhook secret
4. Frontend env: `VITE_API_BASE_URL` → production backend
5. Stripe webhook URL → production backend `/api/stripe/webhook`
6. Post-deploy: `npm run staging:smoke` with production URLs (CD does this)
7. One manual happy-path booking in live mode (small amount) before announcing

Full deploy steps: [staging-deploy.md](./staging-deploy.md) (same layout for prod with live keys).

---

## Related docs

- [release-readiness.md](./release-readiness.md)
- [incident-rollback-runbook.md](./incident-rollback-runbook.md)
- [refund-reconciliation-runbook.md](./refund-reconciliation-runbook.md)
- [atlas-restore-playbook.md](./atlas-restore-playbook.md)
- [review.md](./review.md)
