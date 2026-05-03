k6 writes one JSON summary per run here (see handleSummary in each script).

Install k6: https://grafana.com/docs/k6/latest/set-up/install-k6/

Examples from repo root (adjust BASE_URL if needed):

  k6 run k6/booking-availability.js
  k6 run -e K6_SCENARIO=burst k6/booking-availability.js
  k6 run -e K6_SCENARIO=race k6/booking-availability.js

Checkout session (requires login token + Stripe):

  k6 run -e JWT_TOKEN=your_token -e FRONTEND_ORIGIN=http://localhost:3000 k6/booking-checkout-session.js
  k6 run -e K6_SCENARIO=race -e JWT_TOKEN=your_token -e FRONTEND_ORIGIN=http://localhost:3000 -e BOOKING_TABLE_ID=5 k6/booking-checkout-session.js

Shorter smoke tests:

  k6 run -e K6_DURATION=30s -e K6_VUS=5 k6/booking-availability.js
