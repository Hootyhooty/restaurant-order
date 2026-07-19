# Picha Restaurant

Full-stack restaurant ordering and reservation application. The frontend is React 18 with Vite; the API is Express with MongoDB/Mongoose. Stripe supports store and booking checkout, while role-based workspaces cover restaurant operations.

## Capabilities

- **Customers:** browse meals and souvenirs, manage a cart, pay through Stripe, reserve tables with optional pre-orders, manage bookings and profiles, verify/reset accounts, submit reviews, and use account messages.
- **Admins:** manage users and roles, menu and souvenir items, reviews, transactions, bookings, kitchen views, promotions, operational analysis, and audit logs.
- **Staff:** find bookings, inspect booking details, check guests in, create table orders, and track orders.
- **Kitchen:** work the live order queue, view upcoming reservation pre-orders, update order lines/statuses, and manage meal stock.

## Routes

Frontend routes include:

- Public/customer: `/`, `/menu`, `/store`, `/about`, `/contact`, `/login`, `/register`, `/verify-email`, `/verify-pending`, `/forgot-password`, `/reset-password`, `/profile`, `/profile/edit`, `/review/:menuSlug`, `/booking`, and payment result pages.
- Admin: `/admin`.
- Staff: `/staff/bookings`, `/staff/order`, and `/staff/status`.
- Kitchen: `/kitchen/queue`, `/kitchen/reservations`, and `/kitchen/stock`.

The backend exposes `/api/health` and `/api/ready`, plus API groups under `/api/auth`, `/api/users`, `/api/admin`, `/api/meals`, `/api/souvenirs`, `/api/stripe`, `/api/reviews`, `/api/messages`, `/api/bookings`, `/api/staff`, `/api/kitchen`, `/api/promotions`, and `/api/contact`. The Stripe webhook is `POST /api/stripe/webhook`.

## Local setup

Prerequisites: **Node.js 20**, npm, and MongoDB.

1. Install frontend dependencies:

   ```bash
   npm ci
   ```

2. Configure and install the backend:

   ```bash
   cd backend
   npm ci
   cp .env.example .env
   ```

   On PowerShell, use `Copy-Item .env.example .env` instead of `cp`.

3. Set at least `MONGODB_URI` and a long random `JWT_SECRET` in `backend/.env`. Keep `PORT=5000`, `FRONTEND_ORIGIN=http://localhost:3000`, and `FRONTEND_URL=http://localhost:3000` for the default local ports. `AUTH_SESSION_DAYS` controls the authentication cookie lifetime.

4. In separate terminals, start the API and frontend:

   ```bash
   cd backend
   npm run dev
   ```

   ```bash
   npm run dev
   ```

The frontend opens at `http://localhost:3000`; the API defaults to `http://localhost:5000`.

## Environment configuration

Use [`backend/.env.example`](backend/.env.example) as the backend template. It documents database/JWT settings, allowed frontend origins, email delivery, rate limits, alert thresholds, and staging smoke-test settings.

Additional integrations used by the code:

- Stripe payments: `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`.
- Cloudinary uploads: `CLOUDINARY_URL`, or `CLOUD_NAME`, `CLOUD_KEY`, and `CLOUD_SECRET`.
- Frontend deployments: `VITE_API_BASE_URL` (defaults locally to `http://localhost:5000`).

Do not commit `.env` files or real credentials. Production requires `NODE_ENV=production`, an explicit `FRONTEND_ORIGIN`, HTTPS, and a `JWT_SECRET` of at least 32 characters.

## Scripts

Root frontend scripts:

- `npm run dev` — Vite development server on port 3000.
- `npm run build` — production build in `dist/`.
- `npm run preview` — preview the production build.
- `npm run lint` — ESLint.
- `npm test` — Vitest frontend unit/component tests.
- `npm run k6:availability` / `k6:availability:burst` / `k6:availability:race` — booking availability load scenarios.
- `npm run k6:checkout` / `k6:checkout:burst` / `k6:checkout:race` — booking checkout load scenarios.

Checkout load tests authenticate with `K6_USERNAME` and `K6_PASSWORD`, or an `AUTH_COOKIE`; see [`k6/results/README.txt`](k6/results/README.txt).

Backend scripts (run from `backend/`):

- `npm run dev` / `npm start` — start with nodemon / Node.
- `npm test` — serial Node test runner suite.
- `npm run lint` — ESLint.
- `npm run migrate:staffs` — migrate the staff collection.
- `npm run migrate:kitchen-reserved` — backfill reserved kitchen order data.
- `npm run refund:reconcile` — retry supported pending refunds.
- `npm run staging:smoke` — deployed API/CORS smoke checks.
- `npm run email:test` — test configured email delivery.

## Project structure

```text
.
├── frontend/src/       React application, pages, contexts, hooks, and styles
├── public/             Frontend static files and SPA redirect configuration
├── backend/
│   ├── controllers/    HTTP handlers
│   ├── routes/         Express routers
│   ├── models/         Mongoose models
│   ├── services/       Booking, order, stock, and identity workflows
│   ├── jobs/           Operational jobs
│   ├── scripts/        Migrations, smoke checks, and maintenance commands
│   ├── test/           Unit and integration tests
│   └── index.js        API entry point
├── k6/                 Booking load tests
├── next_update/        Deployment, security, verification, and incident docs
├── index.html          Vite entry document
└── .github/workflows/  CI configuration
```

## Testing and CI

Run `npm run lint && npm test && npm run build` at the repository root, then `npm run lint && npm test` in `backend/`. Frontend tests use Vitest, React Testing Library, and jsdom. Backend tests use Node's test runner, Supertest, and `mongodb-memory-server`. k6 scenarios are optional and require k6.

GitHub Actions runs on pushes and pull requests to `main` or `master` with Node 20. It installs both workspaces independently, lints, tests, and builds the frontend, then lints and tests the backend.

## Security and operations

The API uses JWTs in HTTP-only authentication cookies, role checks, origin-based CSRF protection, request validation, Helmet, scoped rate limits, production CORS restrictions, Stripe webhook signature verification, request IDs, structured API/security logging, health/readiness endpoints, admin audit records, and operational alerts. Review the checklist before deployment and keep database migrations and refund reconciliation as deliberate operator actions.

Operational documentation:

- [Staging deployment](next_update/staging-deploy.md)
- [Staging verification checklist](next_update/staging-verification-checklist.md)
- [Security checklist](next_update/security-checklist.md)
- [Incident and rollback runbook](next_update/incident-rollback-runbook.md)
- [Refund reconciliation runbook](next_update/refund-reconciliation-runbook.md)