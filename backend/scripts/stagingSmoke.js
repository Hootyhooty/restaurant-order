#!/usr/bin/env node
/**
 * Post-deploy smoke checks for staging (or any remote API).
 *
 * Usage:
 *   STAGING_API_URL=https://your-backend.onrender.com npm run staging:smoke
 *   STAGING_FRONTEND_ORIGIN=https://your-frontend.onrender.com npm run staging:smoke
 */

const baseUrl = String(process.env.STAGING_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const frontendOrigin = process.env.STAGING_FRONTEND_ORIGIN || process.env.FRONTEND_ORIGIN || '';
const smokeUsername = process.env.STAGING_SMOKE_USERNAME || '';
const smokePassword = process.env.STAGING_SMOKE_PASSWORD || '';

const FIXTURE_DATE = process.env.STAGING_BOOKING_DATE || '2099-12-01';
const FIXTURE_SLOT = '17:00-19:00';

async function fetchJson(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.headers || {}),
    },
  });
  let body;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { url, status: res.status, body, headers: res.headers };
}

function pass(label) {
  console.log(`  ✓ ${label}`);
}

function fail(label, detail) {
  console.error(`  ✗ ${label}`);
  if (detail) console.error(`    ${detail}`);
  process.exitCode = 1;
}

async function run() {
  console.log(`Staging smoke — ${baseUrl}\n`);

  const health = await fetchJson('/api/health');
  if (health.status === 200 && health.body?.status === 'ok') {
    pass('GET /api/health');
  } else {
    fail('GET /api/health', `status ${health.status}`);
  }

  const ready = await fetchJson('/api/ready');
  if (ready.status === 200 && ready.body?.status === 'ready') {
    pass('GET /api/ready (MongoDB connected)');
  } else {
    fail('GET /api/ready', `status ${ready.status} body=${JSON.stringify(ready.body)}`);
  }

  const availability = await fetchJson(
    `/api/bookings/availability?date=${encodeURIComponent(FIXTURE_DATE)}&timeSlot=${encodeURIComponent(FIXTURE_SLOT)}&guestCount=4`,
  );
  if (availability.status === 200 && availability.body?.success) {
    pass('GET /api/bookings/availability');
  } else {
    fail('GET /api/bookings/availability', `status ${availability.status}`);
  }

  if (frontendOrigin) {
    const originHeader = { Origin: frontendOrigin };
    const corsProbe = await fetchJson('/api/health', { headers: originHeader });
    if (corsProbe.status === 200) {
      pass(`CORS probe with Origin ${frontendOrigin}`);
    } else {
      fail('CORS probe', `status ${corsProbe.status} — check FRONTEND_ORIGIN on backend`);
    }
  } else {
    console.log('  ○ CORS probe skipped (set STAGING_FRONTEND_ORIGIN or FRONTEND_ORIGIN)');
  }

  if (frontendOrigin && smokeUsername && smokePassword) {
    const login = await fetchJson('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: frontendOrigin },
      body: JSON.stringify({ username: smokeUsername, password: smokePassword }),
    });
    const setCookie = login.headers.get('set-cookie') || '';
    if (
      login.status === 200
      && !login.body?.token
      && /^access_token=/i.test(setCookie)
      && /HttpOnly/i.test(setCookie)
      && /Secure/i.test(setCookie)
      && /SameSite=Lax/i.test(setCookie)
    ) {
      pass('Login issues a secure HttpOnly session cookie');
      const cookie = setCookie.split(';')[0];
      const me = await fetchJson('/api/users/me', {
        headers: { Origin: frontendOrigin, Cookie: cookie },
      });
      if (me.status === 200 && me.body?.user) {
        pass('Credentialed GET /api/users/me');
      } else {
        fail('Credentialed GET /api/users/me', `status ${me.status}`);
      }
    } else {
      fail('Cookie login probe', `status ${login.status}; verify cookie flags and smoke credentials`);
    }
  } else {
    console.log('  ○ Cookie login probe skipped (set frontend origin and STAGING_SMOKE_USERNAME/PASSWORD)');
  }

  const checkout = await fetchJson('/api/bookings/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      date: FIXTURE_DATE,
      timeSlot: FIXTURE_SLOT,
      guestCount: 4,
      tableId: 5,
    }),
  });
  if (checkout.status === 401) {
    pass('POST /api/bookings/create-checkout-session requires auth (401)');
  } else {
    fail('POST /api/bookings/create-checkout-session', `expected 401, got ${checkout.status}`);
  }

  console.log('');
  if (process.exitCode) {
    console.error('Smoke checks failed.');
    process.exit(1);
  }
  console.log('Smoke checks passed. Run the manual E2E checklist: next_update/staging-verification-checklist.md');
}

run().catch((err) => {
  console.error('Smoke script error:', err.message || err);
  process.exit(1);
});
