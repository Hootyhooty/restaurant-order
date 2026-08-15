# MongoDB Atlas restore playbook

Use this for disaster recovery or a **restore drill**. Restore into a **new cluster**, never onto the live production `restaurant_db`.

## Goals

| Term | Target |
|------|--------|
| **RPO** (how much data you can lose) | Atlas continuous backup / PITR window (typically ≤ 1 hour if PITR is on; otherwise last snapshot) |
| **RTO** (how long until a usable DB) | Time to restore a new cluster + point a throwaway backend or Compass at it (drill this; fill in after first run) |

Fill after each drill:

| Field | Value |
|-------|--------|
| Last drill date | |
| Operator | |
| Source cluster | |
| Restore target cluster | |
| Snapshot / PITR time | |
| RPO observed | |
| RTO observed | |
| Pass / fail | |

## Before you start

1. Atlas → cluster → **Backup** — confirm **continuous backup** (or a snapshot schedule) is enabled on production.
2. You have Atlas Project Owner (or backup restore) permission.
3. You will **not** change the production Render `MONGODB_URI` unless this is a real DR cutover.

## Restore into a new cluster

1. Atlas → production cluster → **Backup** (or **PITR**).
2. Choose a snapshot or point-in-time.
3. **Restore** → **Restore to a new cluster** (not the live cluster).
4. Wait until the new cluster is idle.
5. **Network Access** — allow your IP (Compass/mongosh) and, if you will attach a throwaway API, Render outbound / `0.0.0.0/0` as you do for staging.
6. **Database Access** — user/password that can read `restaurant_db` (reuse staging-style credentials, not a password pasted into chat or git).

## Sanity checks (`mongosh`)

Connect to the **restore** URI only. Confirm `restaurant_db`:

```javascript
use restaurant_db
db.booking.countDocuments()
db.customers.countDocuments()
db.booking.getIndexes()
```

Confirm the booking unique index on `{ tableId, date, timeSlot }` is still present. Spot-check a recent booking `_id` you know from production (counts and shapes, not a live write).

## Application check (optional)

Point **Compass** or a **throwaway** backend (local or a disposable Render service) at the restore URI.

- Do **not** swap production `MONGODB_URI` for a drill.
- `GET /api/ready` on a throwaway API should return `ready`.
- Do not run Stripe live refunds or cron against the restore cluster.

## Real disaster cutover (only if production DB is gone)

1. Restore to a new cluster (steps above) and pass sanity checks.
2. Put the site in maintenance if needed.
3. Update production Render `MONGODB_URI` to the restore cluster.
4. Restart/redeploy backend; confirm `/api/health` and `/api/ready`.
5. Run `npm run staging:smoke` against production URLs.
6. Confirm Stripe webhook still hits the production API (URI change does not change webhook URL).
7. Record incident notes in [incident-rollback-runbook.md](./incident-rollback-runbook.md).

## What not to do

- Restore **over** the live cluster (destroys writes since the snapshot).
- Drop the booking unique index.
- Use the restore cluster as a playground with live Stripe keys.

## Related

- [incident-rollback-runbook.md](./incident-rollback-runbook.md)
- [architecture-risks.md](./architecture-risks.md)
