# Refund Reconciliation Runbook (Day 14)

Use when bookings or payment intents are stuck in `refund_pending` after Stripe payment, admin action, or booking conflict.

## When to run

| Signal | Action |
|--------|--------|
| Admin **Analysis** tab alert: `refund_backlog` | Investigate, then reconcile |
| User paid but got conflict message; no refund yet | Reconcile after confirming Stripe charge exists |
| Admin check-in / cancel refund failed at Stripe | Reconcile retries failed refund |
| `refund_pending` count ≥ `ALERT_REFUND_BACKLOG_MAX` (default 5) | Run reconcile promptly |

**Alert threshold env:** `ALERT_REFUND_BACKLOG_MAX` (see `backend/.env.example`)

---

## What the job does

Script: `backend/scripts/runRefundReconciliation.js`  
Job: `backend/jobs/refundReconciliationJob.js`

Scans MongoDB (`restaurant_db`) for:

### Bookings (`booking` collection, `status: refund_pending`)

| `refundReason` prefix | Action |
|----------------------|--------|
| `Check-in refund failed` | Refund `reservationCost` via Stripe; status → `checked_in` |
| `Admin cancel refund failed` | Refund `preOrderTotal` via Stripe; status → `refunded` |
| Other / unknown | **Skipped** — manual review required |

### Booking intents (`booking_intent` collection, `status: refund_pending`)

Typical case: duplicate payment for same table/slot (conflict after webhook).

- Refunds full `amountTotal` via Stripe
- Status → `refunded`
- Sends user message + writes audit log (`actor: system`)

---

## Manual run (local or one-off)

### Prerequisites

- `MONGODB_URI` — **production or staging** URI (be careful which DB you target)
- `STRIPE_SECRET_KEY` — must match the environment (`sk_live_…` for prod, `sk_test_…` for staging)
- At least one `ADMIN` user in DB (for system messages to customers)

### Command

From `backend/`:

```bash
npm run refund:reconcile
```

Or:

```bash
node scripts/runRefundReconciliation.js
```

### Output

JSON summary:

```json
{
  "bookings": {
    "succeeded": [{ "id": "...", "kind": "check_in_refund" }],
    "failed": [{ "id": "...", "message": "..." }],
    "skipped": [{ "id": "...", "reason": "..." }]
  },
  "intents": {
    "succeeded": [{ "id": "..." }],
    "failed": [{ "id": "...", "message": "..." }]
  }
}
```

- Exit code **0** — all processed items succeeded (or nothing to do)
- Exit code **1** — one or more failures; investigate `failed` entries

---

## Run against production safely

1. **Confirm environment** — print/check `MONGODB_URI` host and Stripe key prefix (`sk_live` vs `sk_test`)
2. **Check backlog first** — Admin Analysis tab or MongoDB:

   ```javascript
   db.booking.countDocuments({ status: 'refund_pending' })
   db.booking_intent.countDocuments({ status: 'refund_pending' })
   ```

3. **Run reconcile once** — do not loop rapidly (Stripe rate limits)
4. **Verify in Stripe Dashboard** — Refunds appear for matching Payment Intents
5. **Verify in app** — users receive "Reservation Refund Completed" message
6. **Check audit logs** — action `refund.reconciled`, actor `system`

---

## Scheduled / automated runs (optional)

The job is **manual by default** (`npm run refund:reconcile`). For production automation:

| Option | Notes |
|--------|-------|
| Render Cron Job | Run `npm run refund:reconcile` every 15–60 min |
| GitHub Actions scheduled workflow | Run against prod with secrets (use with care) |
| External scheduler | Same command, same env vars |

Recommended: cron every **30 minutes** if you see occasional Stripe transient failures.

---

## Troubleshooting

### Reconcile fails: "No such payment_intent"

- Booking record has wrong or missing `stripePaymentIntentId`
- Find session in Stripe Dashboard → copy Payment Intent ID → fix document manually (admin + DB review)

### Reconcile fails: "Charge already refunded"

- Stripe already refunded; update DB status manually:
  - Booking: set `status` to `refunded` or `checked_in` as appropriate
  - Intent: set `status` to `refunded`
- Record audit note

### Items in `skipped`

- `refundReason` does not match known prefixes
- Investigate booking in admin panel + Stripe payment history
- May need manual refund in Stripe Dashboard

### Backlog keeps growing

1. Check Stripe API key valid and live/test mode matches environment
2. Check webhook processing — failures may leave intents in bad state
3. Review backend logs: `refund_reconciliation_partial_failure`
4. Escalate per [incident-rollback-runbook.md](./incident-rollback-runbook.md)

---

## Booking status reference

| Status | Meaning |
|--------|---------|
| `confirmed` | Paid reservation active |
| `checked_in` | Guest arrived; reservation cost refunded |
| `no_show` | Guest did not arrive; no refund |
| `cancelled` | Customer or admin cancelled |
| `refund_pending` | Refund attempted but failed — **reconcile target** |
| `refunded` | Refund completed |

Intent statuses: `pending` → `paid` / `conflict` → `refund_pending` → `refunded`

---

## After reconcile

- [ ] Admin Analysis → refund backlog alert cleared
- [ ] Affected users have inbox messages
- [ ] Audit log entries present for each success
- [ ] Stripe Dashboard refunds match expected amounts

---

## Related docs

- [incident-rollback-runbook.md](./incident-rollback-runbook.md)
- [staging-verification-checklist.md](./staging-verification-checklist.md) (scenario 2: conflict + refund)
- [architecture-risks.md](./architecture-risks.md)
