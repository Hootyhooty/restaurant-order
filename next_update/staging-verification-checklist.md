# Staging E2E Verification Checklist (Day 13)

**Who fills this in?** You (or whoever runs staging QA). Check each box manually as you test — this is not automated. When done, copy results into [staging-signoff.md](./staging-signoff.md).

Run on **staging** URLs after deploy. Use Stripe **test mode** card `4242 4242 4242 4242`, any future expiry, any CVC.

**Staging backend:** `________________________`  
**Staging frontend:** `________________________`  
**Tester:** `________________________`  
**Date:** `________________________`

---

## 0. Automated smoke (run first)

```bash
cd backend
STAGING_API_URL=<backend-url> STAGING_FRONTEND_ORIGIN=<frontend-url> npm run staging:smoke
```

| Check | Pass? | Notes |
|-------|-------|-------|
| `/api/health` | ☐ | |
| `/api/ready` | ☐ | |
| Availability API | ☐ | |
| CORS with frontend origin | ☐ | |
| Checkout requires auth | ☐ | |

---

## 1. Happy path booking

| Step | Action | Expected | Pass? |
|------|--------|----------|-------|
| 1.1 | Register or log in as normal user | Login succeeds | ☐ |
| 1.2 | Open `/booking`, pick date **≥ tomorrow**, slot, 4 guests | Tables shown | ☐ |
| 1.3 | Select available table, complete Stripe test payment | Redirect to success URL | ☐ |
| 1.4 | Profile → Booking (or My bookings) | Booking `confirmed` | ☐ |
| 1.5 | Admin → Booking | Same reservation visible | ☐ |
| 1.6 | User receives confirmation message | Inbox message | ☐ |
| 1.7 | Admin → Analysis | Booking metrics increment (optional) | ☐ |

---

## 2. Conflict + refund path

Simulates two users paying for the same table/slot (or use two browsers).

| Step | Action | Expected | Pass? |
|------|--------|----------|-------|
| 2.1 | User A: book table **7** for same date/slot, pay | Confirmed | ☐ |
| 2.2 | User B: book table **7** same date/slot, pay | Payment succeeds at Stripe | ☐ |
| 2.3 | After webhook | User B gets refund message; no duplicate booking | ☐ |
| 2.4 | Admin → Booking | Only one `confirmed` for table 7 / slot | ☐ |
| 2.5 | Admin → Analysis → refund backlog | 0 or resolves after reconcile | ☐ |

Optional: `cd backend && npm run refund:reconcile` on staging if `refund_pending` stuck.

---

## 3. Cancellation cutoff (customer)

Use a reservation **more than 3 hours** before start for cancel; use one **within 3 hours** to verify block.

| Step | Action | Expected | Pass? |
|------|--------|----------|-------|
| 3.1 | Create confirmed booking far in future | `confirmed` | ☐ |
| 3.2 | Profile → cancel with confirm | Status `cancelled`, no refund message about money back | ☐ |
| 3.3 | Create another booking with start **&lt; 3h** away | `confirmed` | ☐ |
| 3.4 | Try cancel | Error: only until 3 hours before | ☐ |

---

## 4. Admin action flows

Use a confirmed booking with Stripe test payment (has `payment_intent`).

| Step | Action | Expected | Pass? |
|------|--------|----------|-------|
| 4.1 | **Check-in** | Status `checked_in`; user message about reservation cost refund | ☐ |
| 4.2 | New booking → **No-show** | Status `no_show`; user notified, no refund | ☐ |
| 4.3 | New booking with pre-order → **Cancel** | Pre-order refunded or `refund_pending` + message | ☐ |
| 4.4 | Admin → **Audit** | Rows for check-in, no-show, cancel with admin username | ☐ |
| 4.5 | Admin → Analysis → Active alerts | No critical alerts under normal use | ☐ |

---

## 5. Security spot checks

| Step | Action | Expected | Pass? |
|------|--------|----------|-------|
| 5.1 | Open staging API from wrong Origin (browser console fetch) | CORS blocked in production config | ☐ |
| 5.2 | Non-admin calls `/api/admin/bookings` | 403 | ☐ |
| 5.3 | Invalid booking ID in URL | 400 validation | ☐ |

---

## 6. Email verification

Use a **new test email** (or delete the user in MongoDB first). Check Mailtrap inbox (sandbox) or real inbox if `EMAIL_MODE=production`.

| Step | Action | Expected | Pass? |
|------|--------|----------|-------|
| 6.1 | Register at `/register` with new email | Success message; verification email received | ☐ |
| 6.2 | Try login before verifying | Blocked with “verify your email” message | ☐ |
| 6.3 | Click link in email → `/verify-email?token=…` | “Email verified successfully” | ☐ |
| 6.4 | Log in with verified account | Login succeeds | ☐ |
| 6.5 | Resend verification (login page) for unverified user | Generic success message; new email received | ☐ |

---

## 7. Password reset

| Step | Action | Expected | Pass? |
|------|--------|----------|-------|
| 7.1 | Log out; open `/forgot-password`, enter verified account email | Generic success message; reset email received | ☐ |
| 7.2 | Click link → `/reset-password?token=…` | Reset form loads | ☐ |
| 7.3 | Set new password (≥ 8 chars), submit | Success message | ☐ |
| 7.4 | Log in with **new** password | Login succeeds | ☐ |
| 7.5 | Log in with **old** password | 401 invalid credentials | ☐ |
| 7.6 | Reuse same reset link | Error: invalid or expired link | ☐ |

---

## Sign-off

- [ ] All critical paths (sections 1–4) passed  
- [ ] Auth flows (sections 6–7) passed  
- [ ] Smoke script passed  
- [ ] Known issues logged below  

**Issues / follow-ups:**

```
(optional)
```

**Approved for production candidate:** ☐ Yes  ☐ No — Name: _______________
