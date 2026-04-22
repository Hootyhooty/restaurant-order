# Project Review (Restaurant Order)

## High-level summary
This repository is a "restaurant ordering" web application with a React/Vite frontend and an Express/Mongoose backend. Core features include authentication, a menu/store browsing experience with carts, payments (Stripe), reviews, messaging, souvenirs, and dine-in/table booking.

The `next_update/` folder already contains several forward-looking UI/behavior changes and backend logic requirements (especially around bookings, reviews, profiles, images, and messaging).

## Current architecture

### Frontend (Vite + React)
* Entry: `frontend/src/App.jsx`
* State providers:
  * `AuthProvider` (`frontend/src/context/AuthContext.jsx`)
  * `CartProvider` (`frontend/src/context/CartContext.jsx`)
* Routing (via `react-router-dom`):
  * Public/browse: `/`, `/menu`, `/store`
  * Auth: `/login`, `/register`
  * Profile/admin: `/profile`, `/profile/:userId`, `/profile/edit`, `/admin`
  * Reviews: `/review/:menuSlug`
  * Payments:
    * `/payment/success`, `/payment/cancel`
    * `/booking/payment/success`, `/booking/payment/cancel`
  * Booking: `/booking`
* API base configuration: `frontend/src/apiConfig.js`
  * Uses `import.meta.env.VITE_API_BASE_URL` and falls back to `http://localhost:5000`

### Backend (Express + MongoDB)
* Entrypoint: `backend/index.js`
* Middleware and integrations:
  * `cors` with a configurable allow-list (`FRONTEND_ORIGIN`) and several localhost origins
  * JSON parsing with size limit `10mb`
  * Stripe webhook endpoint: `POST /api/stripe/webhook`
    * Uses `express.raw({ type: 'application/json' })` (required for Stripe signature verification patterns)
* Database:
  * MongoDB connection is established on startup
  * Database name is forced to `restaurant_db`
  * If missing, the app warns about unset `MONGODB_URI` / `JWT_SECRET`
* Data sync:
  * On successful connection it calls `syncSouvenirsDbToFile()` to keep souvenir images/data in sync
* Static assets:
  * Serves images under:
    * `/food_img` -> `backend/public/food_img`
    * `/display` -> `backend/public/display`
* API route mounting (as of `backend/index.js`):
  * `/api/auth` (`routes/auth.js`)
  * `/api/users` (`routes/userRoutes.js`)
  * `/api/admin` (`routes/adminRoutes.js`)
  * `/api/meals` (`routes/meals.js`)
  * `/api/souvenirs` (`routes/souvenirs.js`)
  * `/api/stripe` (`routes/stripe.js`)
  * `/api/reviews` (`routes/reviews.js`)
  * `/api/messages` (`routes/messages.js`)
  * `/api/bookings` (`routes/bookings.js`)

## Feature review vs. next_update goals

### Reviews and ratings
`next_update/Changelog` requests improvements around:
* showing average rating (star icons + average) directly on the menu review block
* enabling "Submit" vs "Edit" for a user who already reviewed
* ensuring reviewer usernames are clickable to redirect to their profile
* tracking/adding backend support for rating aggregates (example fields suggested: `totalRating`, `reviewCount`, `averageRating`)
* fixing UI alignment issues (center-align review elements) and a suspected "Add to Cart" button bug on the review page

Recommendation: confirm whether rating aggregation is computed server-side (and persisted) or only derived client-side; if only derived, add/verify persistence to avoid expensive recomputation.

### Profiles (owner vs guest) and admin UX
`next_update/Changelog` includes several "guest view" privacy and UI behavior requirements:
* hide user address and userId for guests
* hide phone/email by default unless owner explicitly allows it
* show only specific tabs/sections for guests (History + Social Media)
* admin page refinements:
  * admin "Reputation status" should be green for admin-role users
  * admin PFP not working yet
  * clickable usernames/menu names in admin tables

### Global UI behavior
* Add "scroll to top" on every page load/refresh across all pages

### Image storage / serving
Multiple notes emphasize that images users upload/change should be served from:
* `public/display` (backend) via `/display/...`

There are also notes about meal/store images not showing correctly, and planned rewiring for Cloudinary migration.

Recommendation: validate current image URL generation end-to-end:
* wherever images are uploaded/changed
* where the stored URL is saved in MongoDB
* where the frontend renders the image using that stored URL
* whether routes like `/display` align with the saved paths

### Messaging system
`next_update/Changelog` requests:
* add reply/delete actions inside the message UI
* standardize the message format in the message tab
* backend improvements later:
  * pagination
  * compound indexes
  * soft delete (instead of hard delete)
  * rate limiting to prevent spam

### Booking (dine-in) logic
`next_update/what next` and related notes define the desired booking flow:
* select date/time/guest count, then display available tables based on capacity rules
* pre-order flow with a modal stepper (pre-order yes/no -> menu selection -> summary)
* stripe checkout, then server-side conflict checking before finalizing availability
* store bookings in `restaurant_db.booking`
* enforce final protection with a unique index like: `tableId + date + timeSlot`
* booking cancellation/refund rules and corresponding statuses
* admin actions: check-in / no-show / cancel (with different refund behaviors)
* messaging: admin -> user (including refund confirmation)

Given the booking flow involves concurrent payments, the review focus is to ensure:
* the unique index is truly enforced at the database layer
* the "final availability update" occurs only after successful payment confirmation
* webhook/checkout completion handlers correctly reconcile conflicts and trigger refunds/messages

## Operational/deployment considerations
* There are two `package.json` files:
  * root (frontend) uses Vite
  * `backend/package.json` runs Node/Express with `nodemon` for dev
* Backend should be configured via:
  * `backend/.env` (refer to `backend/.env.example`)
  * `JWT_SECRET` and `MONGODB_URI` are required for correct auth and DB behavior
* CORS:
  * if `FRONTEND_ORIGIN` is not set, the server allows all origins (convenient for dev, riskier for production)

## Suggested next checks (before the next update)
1. Verify image URL flow and ensure all user-uploaded images render via `/display`.
2. Confirm review/rating aggregation logic supports "average rating" and "user already reviewed -> Edit".
3. Validate booking concurrency handling with the unique index and Stripe confirmation path (including messaging and refund behavior).
4. Fix any UI regressions called out in the changelog:
   * review-page "Add to Cart" behavior
   * center-alignment and star/rating UI
   * guest profile field hiding rules
   * admin page table row click-through and admin PFP

