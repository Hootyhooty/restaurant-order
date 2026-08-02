# Picha Restaurant — Development Journey

**Live site:** [picha-restaurant.com](https://picha-restaurant.com/)  
**Timeline:** Feb 2026 → Jul 2026 (ongoing)  
**Role:** Solo full-stack developer  

Use this with [`project-summary.md`](project-summary.md) — that file is *what* the app does; this file is *how* you built it and where you got stuck.

---

## Phase 1 — Core product (Feb 2026)

**Goal:** Turn a restaurant site into a real product — accounts, admin, store, social features.

### What I built
- Admin dashboard (users, menu, reviews, transactions)
- User profiles (history, guest view, privacy rules)
- Menu review system (ratings, edit vs submit, clickable reviewers)
- Internal messaging (send, reply, delete, pagination, soft delete, rate limits)
- Souvenir store (same card pattern as meals)
- Login with **username or email**

### Where it got messy
- **Images:** Started with local `public/display`, then moved everything to **Cloudinary** with folder structure (`food`, `display`, `souvenir`). Migration scripts, broken URLs, store page still not showing images — had to re-run migrate + rewrite scripts.
- **Profile / guest rules:** Lots of small UX rules (hide address, hide email/phone unless opted in, center tables, scroll to top on every page load).

### Takeaway for interviews
> “I learned early that image storage and URL consistency across deploy environments is not a one-time task — it’s ongoing migration and verification work.”

---

## Phase 2 — Booking + payments (March 2026)

**Goal:** Table reservations with Stripe, pre-orders, admin check-in, and refunds.

### What I designed (see `booking plan.drawio`)
- Date → time slot → guest count → table map (capacity rules)
- Optional pre-order modal → summary → Stripe checkout
- Reservation fee + refundable deposit logic
- Profile “Booking” tab + cancel rules (no refund within 3 hours)
- Admin: Check In / No Show / Cancel with different refund rules

### The hard problem: two users pay for the same table
During Stripe checkout, **two customers can pay at the same time** for the same slot. Without protection, you double-book.

**Solution:**
1. **MongoDB unique index** on `{ tableId, date, timeSlot }` — only one booking wins at the DB layer
2. Loser’s payment → **refund path** (`refund_pending` → reconciliation job)
3. Admin/system message to user explaining refund

### Takeaway for interviews
> “I had to design for concurrency, not just happy path. The unique index is the source of truth; Stripe and webhooks are the payment layer on top.”

---

## Phase 3 — Reliability sprint (May 2026, Days 1–14)

**Goal:** Stop adding features for two weeks; make booking and payments trustworthy.

### Week 1 — Tests + refunds + load
| Day | Focus |
|-----|--------|
| 1 | KPIs and scope lock |
| 2 | Unit tests — table capacity, costs, cancel cutoff, status transitions |
| 3 | Integration tests — availability, checkout, cancel, admin actions, 409 conflicts |
| 4 | Stripe webhook **idempotency** (`ProcessedStripeEvent`) |
| 5 | **Refund reconciliation job** + `npm run refund:reconcile` |
| 6 | **k6** load tests — availability, checkout, burst, race scenarios |

### Week 2 — Ops, security, release
| Day | Focus |
|-----|--------|
| 8 | Structured JSON logging (`requestId`, booking IDs) |
| 9 | Ops metrics + alerts + Admin Analysis tab |
| 10 | Security hardening (rate limits, Helmet, CORS, validation) |
| 11 | Admin audit trail |
| 12 | **GitHub Actions CI** (lint, test, build) |
| 13–14 | Staging smoke tests, runbooks, release-readiness docs |

### k6 baseline (4 May)
Ran public endpoints (meals, souvenirs, reviews, availability) — p95 under ~200ms, 0% failures at moderate load. Documented in Changelog.

### Takeaway for interviews
> “After shipping booking, I deliberately paused features and invested in tests, webhook safety, and load baselines so production failures would be recoverable, not mysterious.”

---

## Phase 4 — Production launch pain (June 2026)

**Goal:** Real domain, real email, real users.

### Custom domains
- Frontend: `picha-restaurant.com`
- API: `api.picha-restaurant.com`
- Updated CORS, `VITE_API_BASE_URL`, staging docs

### Email verification & password reset
- Deferred registration (`PendingRegistration` → verify → create `Customer`)
- Forgot/reset password flows + SPA deep links (`public/_redirects`)

### **Where I got stuck: email on Render**
**Symptom:** Registration “works” but users never get verification emails in production.

**Root cause:** Render **blocks outbound SMTP** (ports 25/465/587) → `ETIMEDOUT`.

**Fix:**
- Production: **Resend HTTP API** (port 443)
- Sandbox/local: Mailtrap SMTP when `EMAIL_MODE=sandbox`
- Register returns `201` with `emailSent: true|false` — don’t fail registration if send fails; user can resend

### **Second stuck point: DNS + deliverability**
- Resend “delivered” but inbox empty → spam on new domain
- **Cloudflare:** DKIM/SPF CNAME must be **DNS-only** (grey cloud), not proxied

### UI polish
- Cream/gold rebrand (Home, Header, Footer, global theme)
- Cloudinary hero assets, fixed broken logo URL

### Takeaway for interviews
> “Production email wasn’t a code bug — it was platform networking. I switched transport, made registration resilient to send failures, and documented DNS pitfalls for the next deploy.”

---

## Phase 5 — Kitchen/staff ops (by June–July 2026)

**Goal:** Restaurant staff and kitchen use the app during service.

### Built (from diagrams + changelog)
- Staff: bookings lookup, check-in, table orders, order status
- Kitchen: live queue (**SSE**), reservations/pre-orders, stock, line-item status
- Admin kitchen views

### **Where I got stuck: rate limits (6 Jul 2026)**
**Symptom:** After login, DevTools spammed `429` — “Too many authentication attempts.”

**Root cause:** `/api/kitchen/stream` (SSE) and staff polling were behind **`authLimiter`** meant for login brute-force protection.

**Fix:**
- New **`operationalLimiter`** for staff/kitchen routes
- `authLimiter` skip for `/logout`
- Stabilized SSE hooks with `useCallback` to avoid reconnect loops

### Takeaway for interviews
> “I misapplied a security control globally. Operational traffic needed its own limiter — same lesson as not using auth middleware for health checks.”

---

## Phase 6 — Security hardening (20 Jul 2026)

**Goal:** Production-grade sessions after months live.

### Cookie-based auth (XSS)
- Removed JWT from `localStorage` and response bodies
- **HttpOnly** session cookies + credentialed API client
- **CSRF:** origin validation on cookie-authenticated writes

### Sessions & lockout
- Role-aware session length (7d customer, 1d ops)
- Invalidate sessions after password change
- Failed-login lockout (in-memory)

### Admin maintainability
- Split monolithic `AdminDashboard` into section components + shared admin API helpers
- Frontend tests (Vitest + RTL) in CI

### Later in July (same period)
- **Admin MFA** — Google Authenticator (TOTP), backup codes, two-step login
- **Promotions page** — cover grid + detail modal; admin cover upload via Cloudinary
- **CI fixes** — backend test glob on Linux; `npm audit --audit-level=high`
- Package rename: `Picha-restaurant`

### Takeaway for interviews
> “The site was already live for two months. Hardening wasn’t pre-launch checklist work — it was responding to real risk: token exposure, admin account protection, and CI that actually runs tests on Linux.”

---

## Stuck moments — quick reference (interview cheat sheet)

| When | Problem | What I did |
|------|---------|------------|
| Feb | Cloudinary migration, broken image URLs | Migration scripts + folder structure + rewrite pass |
| Mar | Double booking on concurrent Stripe pay | Unique index + refund reconciliation |
| May | Webhook retries duplicating side effects | Idempotent event store |
| Jun | Email timeout on Render | Resend HTTP API instead of SMTP |
| Jun | Emails not in inbox | DNS-only DKIM, spam awareness |
| Jul | 429 on kitchen SSE after login | Separate operational rate limiter |
| Jul | CI tests “pass locally, fail on GitHub” | Shell glob vs quoted path on Linux |
| Jul | JWT visible in DevTools | HttpOnly cookies + no token in JSON |

---

## How to tell the story in an interview (60 seconds)

**Short version:**

> “I built and deployed a full-stack restaurant platform — ordering, Stripe bookings with concurrency handling, staff and kitchen dashboards with real-time SSE, and admin ops. The hardest parts weren’t CRUD: they were double-booking races, Render blocking SMTP, and rate limits breaking kitchen polling. I followed that with a two-week quality sprint — tests, k6, webhooks, refund jobs — and later hardened auth with HttpOnly cookies and admin MFA. It’s been live at picha-restaurant.com for months.”

**If they ask “hardest bug”:**

Pick **booking race** or **Render email** — both show system thinking, not just React forms.

**If they ask “what would you do differently”:**

- Plan image storage on Cloudinary from day one  
- Separate rate limiters by traffic type earlier  
- Run CI on Linux-shaped scripts from the start  

---

## What’s intentionally not done (yet)

- Horizontal scaling / Redis (single instance is documented and sufficient for now)
- WAF / Cloudflare edge rate limiting (optional)
- MFA for staff/kitchen (admin only today)

---

## Related docs in this repo

| File | Purpose |
|------|---------|
| [`project-summary.md`](project-summary.md) | Features, stack, architecture — interview overview |
| [`Changelog`](Changelog) | Raw day-by-day log (source of truth for this journey) |
| [`architecture-risks.md`](architecture-risks.md) | Risks and single-instance constraints |
| [`security-checklist.md`](security-checklist.md) | Security posture |
| [`release-readiness.md`](release-readiness.md) | Deploy and env guide |
