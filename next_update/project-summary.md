# Picha Restaurant — Project Summary

**Live site:** [picha-restaurant.com](https://picha-restaurant.com/)  
**Role:** Full-stack developer (solo)  
**Duration:** ~3 months (ongoing)  
**Stack:** React 18, Vite, Express 4, MongoDB Atlas, Stripe, Cloudinary, Render

---

## What is it?

A full-stack restaurant web application for **Picha Restaurant** — a real, deployed system handling online ordering, table reservations with Stripe payments, a souvenir store, and role-based dashboards for admin, staff, and kitchen operations.

---

## Key features

### Customer-facing
- **Menu browsing** with category filtering and meal reviews
- **Souvenir store** with cart and Stripe checkout
- **Table reservations** with date/time slot selection, optional pre-orders, and Stripe-powered booking payments
- **Promotions page** — cover image grid with click-to-view detail popup
- **User accounts** — email verification, password reset, profile management, messaging
- **Responsive design** across desktop and mobile

### Admin dashboard
- User management (create, role assignment, activate/deactivate)
- Menu and souvenir CRUD with Cloudinary image uploads
- Booking management (check-in, no-show, cancel with refund)
- Promotions management with cover image uploads
- Transaction history, operational analysis, and audit trail
- **MFA (Google Authenticator)** for admin login security

### Staff dashboard
- Booking lookup by date/time
- Guest check-in workflow
- Table order creation and status tracking

### Kitchen dashboard
- **Real-time order queue** via Server-Sent Events (SSE)
- Reservation pre-order view
- Per-item status updates (preparing → ready → served)
- Meal stock management with low-stock alerts

---

## Architecture

```
Browser (React SPA)
    ↓ HTTPS
Express API (Render)
    ├── MongoDB Atlas (data)
    ├── Stripe API (payments, refunds)
    └── Cloudinary (image uploads)
```

- **Frontend:** React 18 + Vite SPA, react-router-dom for client routing, AuthContext/CartContext for state
- **Backend:** Express REST API, Mongoose ODM, 18 controllers, 15 models
- **Auth:** JWT stored in HttpOnly secure cookies (not localStorage), CSRF origin validation
- **Payments:** Stripe Checkout Sessions for store and bookings, webhook-driven confirmation, automated refund reconciliation
- **Real-time:** SSE for kitchen order queue updates
- **Deployment:** Frontend and backend as separate Render services, MongoDB Atlas, Cloudinary for images

---

## Security measures

| Measure | Implementation |
|---------|----------------|
| Authentication | HttpOnly cookie JWTs, no token in responses or localStorage |
| Admin MFA | TOTP (Google Authenticator), encrypted secrets at rest (AES-256-GCM) |
| CSRF protection | Origin header validation on all mutating cookie-authenticated requests |
| Session management | Role-aware expiry (1 day ops / 7 days customer), invalidation on password change |
| Account lockout | Progressive failed-login lockout with configurable thresholds |
| Rate limiting | 6 scoped rate limiters (auth, write, public, booking, operational, webhook) |
| Input validation | Request body/query validation middleware on all endpoints |
| Stripe security | Webhook signature verification, idempotent event processing |
| Headers | Helmet middleware, HTTPS enforcement in production |
| Audit logging | Admin action audit trail with structured JSON logs |

---

## Testing & CI/CD

- **Backend:** 121 tests (unit + integration) using Node test runner, Supertest, and mongodb-memory-server
- **Frontend:** 11 tests using Vitest, React Testing Library, and jsdom
- **Load testing:** k6 scenarios for booking availability and checkout (burst, race condition)
- **CI pipeline (GitHub Actions):**
  - `npm audit --audit-level=high` — dependency vulnerability gate
  - ESLint — code quality
  - Full test suites — backend + frontend
  - Production build verification
- **Deployment:** push to main → CI → Render auto-deploy

---

## Technical highlights (talking points for interviews)

### Concurrency-safe booking system
Multiple users can attempt to book the same table slot simultaneously. A MongoDB unique compound index on `{ tableId, date, timeSlot }` ensures only one booking succeeds at the database level. The losing payment enters a refund path, handled by an automated reconciliation job.

### HttpOnly cookie authentication with MFA
Migrated from localStorage JWT to HttpOnly cookies to eliminate XSS token theft. Added TOTP-based MFA for admin accounts using `otplib`, with AES-256-GCM encrypted secrets and bcrypt-hashed backup codes. Login is a two-step flow: password → mfa_pending cookie → authenticator code → session cookie.

### Real-time kitchen operations
Kitchen dashboard uses Server-Sent Events for live order updates without polling. Staff create orders → kitchen sees them instantly → per-item status progression (preparing → ready → served) flows back through SSE.

### Role-based multi-dashboard architecture
Four distinct user experiences (customer, admin, staff, kitchen) served from one SPA with shared authentication. Each role has scoped API access, dedicated rate limits, and appropriate session lifetimes.

### Stripe payment integration
Full Stripe Checkout flow for both store purchases and table reservations. Webhook-driven payment confirmation with signature verification, idempotent event processing via `ProcessedStripeEvent` collection, and automated refund reconciliation for edge cases (double-booking race, API failures).

### Production-grade operational tooling
Structured JSON logging, health/readiness endpoints, configurable alert thresholds, admin audit trail, refund reconciliation scheduler, staging smoke tests, and comprehensive environment-driven configuration.

---

## Data model (15 collections)

| Collection | Purpose |
|------------|---------|
| `customers` | User accounts and profiles |
| `staffs` | Staff/admin/kitchen accounts with MFA fields |
| `pending_registrations` | Email verification before account creation |
| `meals`, `souvenirs` | Menu and store catalog |
| `meal_stocks` | Kitchen stock levels and low-stock tracking |
| `booking`, `booking_intent` | Reservations and pre-payment pipeline |
| `transactions` | Store/cart orders |
| `kitchen_orders` | Order queue for kitchen operations |
| `reviews`, `messages` | User content and messaging |
| `promotions` | Promotional offers with cover images |
| `processed_stripe_events` | Webhook idempotency |
| `admin_audit_logs` | Admin action audit trail |

---

## Scale & constraints

The system runs on a **single backend instance**. In-memory state (rate limits, login lockout, SSE connections, metrics) works well for current traffic but would need Redis or similar for horizontal scaling. This is a documented, intentional constraint — not a gap.

---

## Numbers

- **~50 React components** across 4 role-based interfaces
- **18 controllers**, 15 models, 12 route files
- **121 backend + 11 frontend tests**
- **6 rate limiters**, 4 validation middleware sets
- **Live for 2+ months** at [picha-restaurant.com](https://picha-restaurant.com/)
