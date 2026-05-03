/**
 * Load test: GET /api/bookings/availability
 *
 * Prerequisites: backend running (default http://localhost:5000).
 *
 * Examples:
 *   k6 run k6/booking-availability.js
 *   K6_SCENARIO=burst k6 run k6/booking-availability.js
 *   K6_SCENARIO=race k6 run k6/booking-availability.js
 *
 * Env:
 *   BASE_URL, K6_SCENARIO (normal|burst|race), BOOKING_DATE, BOOKING_SLOT, BOOKING_GUEST_COUNT
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
const SLOT = __ENV.BOOKING_SLOT || '17:00-19:00';
const GUEST = Number(__ENV.BOOKING_GUEST_COUNT || 4);

export default function () {
  const scenario = __ENV.K6_SCENARIO || 'normal';
  let date = __ENV.BOOKING_DATE;
  if (!date) {
    date =
      scenario === 'race'
        ? '2099-12-15'
        : `2099-${String(((__VU - 1) % 12) + 1).padStart(2, '0')}-10`;
  }
  const qs = `date=${date}&timeSlot=${encodeURIComponent(SLOT)}&guestCount=${GUEST}`;
  const res = http.get(`${BASE}/api/bookings/availability?${qs}`, {
    tags: { name: 'booking_availability' },
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'success json': (r) => {
      try {
        const j = r.json();
        return j && j.success === true && typeof j.availability === 'object';
      } catch (e) {
        return false;
      }
    },
  });

  sleep(0.3);
}

export function handleSummary(data) {
  const summary = compactMetrics(data, 'booking-availability');
  const fname = `k6/results/booking-availability-${summary.scenario}-${Date.now()}.json`;
  return {
    stdout: JSON.stringify(summary, null, 2),
    [fname]: JSON.stringify(summary, null, 2),
  };
}
