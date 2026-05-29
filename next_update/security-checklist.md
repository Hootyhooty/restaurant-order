# Security Checklist (Day 10)

Use this before production deploy. All items below are implemented in code unless marked manual.

## Authentication & authorization

- [x] JWT required on protected routes (`authMiddleware`)
- [x] Admin routes require `ADMIN` role (`rolesRequired`)
- [x] Production requires `JWT_SECRET` length ≥ 32 characters
- [x] Auth endpoints rate-limited (`RATE_LIMIT_AUTH_*`, default 20 / 15 min)
- [ ] Manual: rotate `JWT_SECRET` if it was ever committed or shared

## Rate limiting

- [x] Auth: `/api/auth/*`
- [x] Booking writes: `/api/bookings/create-checkout-session`, cancel (`RATE_LIMIT_BOOKING_*`)
- [x] General writes: messages, reviews, Stripe checkout (`RATE_LIMIT_WRITE_*`)
- [x] Public reads: meals, souvenirs, booking availability (`RATE_LIMIT_PUBLIC_*`)
- [x] Stripe webhook: dedicated limiter (`RATE_LIMIT_WEBHOOK_*`)

## Input validation

- [x] Auth register/login bodies
- [x] Booking availability, checkout, cancel
- [x] Reviews, messages, pagination queries
- [x] Stripe cart checkout items
- [x] Admin booking ID params and list/audit queries

## Transport & headers

- [x] Production rejects non-HTTPS requests
- [x] Helmet enabled (stricter CSP/HSTS/referrer policy in production)
- [x] `x-powered-by` disabled

## CORS

- [x] Production: only `FRONTEND_ORIGIN` values (no localhost fallback)
- [x] Non-production: explicit origins or dev fallback when unset
- [x] `FRONTEND_ORIGIN` required in production at startup
- [ ] Manual: set `FRONTEND_ORIGIN` to exact deployed frontend URL(s) only

## Secrets & Stripe

- [ ] Manual: all secrets in host env (Render/etc.), never in repo
- [ ] Manual: `STRIPE_WEBHOOK_SECRET` configured for production webhook endpoint
- [x] Webhook signature verification before processing

## Monitoring (Day 9)

- [x] Structured JSON logs with `requestId`
- [x] Security events logged for 401/403/429 and validation failures
- [x] Admin Analysis alerts for booking/webhook/refund backlog

## Admin audit (Day 11)

- [x] Admin booking actions persisted (`AdminAuditLog`)
- [x] Refund reconciliation events logged as system actor
- [x] Query via `GET /api/admin/audit-logs`

## Remaining high-risk gaps (manual / future)

- [ ] Account lockout after repeated failed logins
- [ ] Email verification / password reset hardening
- [ ] WAF or edge rate limiting in front of API (Cloudflare, etc.)
- [ ] Automated dependency vulnerability scanning in CI (optional: add `npm audit --audit-level=high` to workflow later)
