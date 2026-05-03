/**
 * Load test: POST /api/bookings/create-checkout-session (authenticated).
 *
 * Requires JWT_TOKEN from POST /api/auth/login and Stripe + FRONTEND_ORIGIN on server.
 *
 * Examples:
 *   JWT_TOKEN=eyJ... FRONTEND_ORIGIN=http://localhost:3000 k6 run k6/booking-checkout-session.js
 *   K6_SCENARIO=race JWT_TOKEN=... FRONTEND_ORIGIN=http://localhost:3000 BOOKING_TABLE_ID=5 k6 run k6/booking-checkout-session.js
 *
 * Env:
 *   JWT_TOKEN, FRONTEND_ORIGIN, BASE_URL, K6_SCENARIO, BOOKING_DATE, BOOKING_TABLE_ID (race)
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

function scenarioOptions() {
  const scenario = __ENV.K6_SCENARIO || 'normal';
  if (scenario === 'burst') {
    const target = Number(__ENV.K6_BURST_TARGET || 80);
    return {
      scenarios: {
        burst: {
          executor: 'ramping-vus',
          startVUs: 0,
          stages: [
            { duration: '30s', target },
            { duration: '2m', target },
            { duration: '30s', target: 0 },
          ],
          gracefulRampDown: '30s',
        },
      },
    };
  }
  if (scenario === 'race') {
    return {
      scenarios: {
        race: {
          executor: 'shared-iterations',
          vus: Number(__ENV.K6_RACE_VUS || 50),
          iterations: Number(__ENV.K6_RACE_ITERATIONS || 400),
          maxDuration: __ENV.K6_RACE_MAX_DURATION || '5m',
        },
      },
    };
  }
  return {
    scenarios: {
      normal: {
        executor: 'constant-vus',
        vus: Number(__ENV.K6_VUS || 10),
        duration: __ENV.K6_DURATION || '2m',
      },
    },
  };
}

function compactMetrics(data, scriptName) {
  const m = data.metrics || {};
  const vals = (key) => {
    const metric = m[key];
    if (!metric || !metric.values) return null;
    return metric.values;
  };
  return {
    scenario: __ENV.K6_SCENARIO || 'normal',
    script: scriptName,
    duration_ms: data.state && data.state.testRunDurationMs,
    http_req_failed_rate: vals('http_req_failed'),
    http_reqs_count: vals('http_reqs'),
    http_req_duration_ms: vals('http_req_duration'),
    iterations_count: vals('iterations'),
  };
}

export const options = scenarioOptions();

const BASE = (__ENV.BASE_URL || 'http://localhost:5000').replace(/\/$/, '');
const ORIGIN = __ENV.FRONTEND_ORIGIN || 'http://localhost:3000';
const TOKEN = __ENV.JWT_TOKEN || '';

export function setup() {
  if (!TOKEN) {
    throw new Error('JWT_TOKEN is required — login via POST /api/auth/login and copy token');
  }
  return { token: TOKEN };
}

function tableId() {
  if (__ENV.BOOKING_TABLE_ID != null && __ENV.BOOKING_TABLE_ID !== '') {
    return Number(__ENV.BOOKING_TABLE_ID);
  }
  if ((__ENV.K6_SCENARIO || 'normal') === 'race') {
    return Number(__ENV.BOOKING_TABLE_ID || 5);
  }
  return 2 + (((__VU || 1) - 1) % 8);
}

export default function (data) {
  const scenario = __ENV.K6_SCENARIO || 'normal';
  let date = __ENV.BOOKING_DATE;
  if (!date) {
    date =
      scenario === 'race'
        ? '2099-12-20'
        : `2099-${String(((__VU - 1) % 11) + 1).padStart(2, '0')}-20`;
  }
  const slot = __ENV.BOOKING_SLOT || '17:00-19:00';
  const guestCount = Number(__ENV.BOOKING_GUEST_COUNT || 4);

  const payload = JSON.stringify({
    date,
    timeSlot: slot,
    guestCount,
    tableId: tableId(),
    preOrderItems: [],
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.token}`,
      Origin: ORIGIN,
    },
    tags: { name: 'booking_create_checkout' },
  };

  const res = http.post(`${BASE}/api/bookings/create-checkout-session`, payload, params);

  check(res, {
    'status ok': (r) => r.status === 200 || r.status === 409 || r.status === 400,
  });

  sleep(0.5);
}

export function handleSummary(data) {
  const summary = compactMetrics(data, 'booking-checkout-session');
  const fname = `k6/results/booking-checkout-session-${summary.scenario}-${Date.now()}.json`;
  return {
    stdout: JSON.stringify(summary, null, 2),
    [fname]: JSON.stringify(summary, null, 2),
  };
}
