# Staging Sign-Off Record

Copy this file per release (e.g. `staging-signoff-2026-05-29.md`) or fill in place.

| Field | Value |
|-------|--------|
| Release / branch | |
| Staging backend URL | |
| Staging frontend URL | |
| MongoDB | staging / dedicated |
| Stripe mode | test |
| CI run (link) | |
| Smoke script | pass / fail |
| Manual checklist | [staging-verification-checklist.md](./staging-verification-checklist.md) |

## Scenario results

| Scenario | Result | Tester initials | Notes |
|----------|--------|-----------------|-------|
| Happy path booking | ☐ Pass ☐ Fail | | |
| Conflict + refund | ☐ Pass ☐ Fail | | |
| Customer cancellation cutoff | ☐ Pass ☐ Fail | | |
| Admin check-in / no-show / cancel | ☐ Pass ☐ Fail | | |
| Audit log entries | ☐ Pass ☐ Fail | | |
| Security spot checks | ☐ Pass ☐ Fail | | |
| Email verification | ☐ Pass ☐ Fail | | |
| Password reset | ☐ Pass ☐ Fail | | |

## Open defects (blocking production)

| ID | Description | Severity |
|----|-------------|----------|
| | | |

## Decision

- [ ] **Signed off** — staging verified; proceed to production (Day 14 runbooks ready)  
- [ ] **Not signed off** — fix items above before release  

**Signed:** __________________ **Date:** __________________
