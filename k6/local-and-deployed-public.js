/**
 * k6 test for:
 * 1) Local baseline (without DB if your app is running that way)
 * 3) Deployed backend quick validation
 *
 * Examples:
 *   k6 run k6/local-and-deployed-public.js
 *   TEST_TARGET=local BASE_URL=http://localhost:5000 k6 run k6/local-and-deployed-public.js
 *   TEST_TARGET=deployed BASE_URL=https://picha-restaunrant-backend.onrender.com k6 run k6/local-and-deployed-public.js
 *   TARGET_ENDPOINT=meals TEST_TARGET=deployed BASE_URL=https://picha-restaunrant-backend.onrender.com k6 run k6/local-and-deployed-public.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const target = (__ENV.TEST_TARGET || 'deployed').toLowerCase();
const baseUrl = (__ENV.BASE_URL || 'https://picha-restaunrant-backend.onrender.com').replace(/\/$/, '');
const targetEndpoint = (__ENV.TARGET_ENDPOINT || 'all').toLowerCase();
const litePayload = String(__ENV.K6_LITE_PAYLOAD || '1').toLowerCase() !== '0';

function optionsByTarget() {
  if (target === 'local') {
    return {
      vus: Number(__ENV.K6_VUS || 8),
      duration: __ENV.K6_DURATION || '30s',
      thresholds: {
        http_req_failed: ['rate<0.03'],
        http_req_duration: ['p(95)<800'],
      },
    };
  }

  // Deployed: ramp gently so we do not spike a shared environment.
  return {
    stages: [
      { duration: '20s', target: Number(__ENV.K6_STAGE1_VUS || 5) },
      { duration: '40s', target: Number(__ENV.K6_STAGE2_VUS || 12) },
      { duration: '20s', target: 0 },
    ],
    thresholds: {
      http_req_failed: ['rate<0.05'],
      http_req_duration: ['p(95)<1500'],
    },
  };
}

export const options = optionsByTarget();

const endpointMap = {
  meals: litePayload ? '/api/meals?lite=1&limit=120' : '/api/meals',
  souvenirs: litePayload ? '/api/souvenirs?lite=1&limit=120' : '/api/souvenirs',
  reviews: '/api/reviews?mealId=1&limit=20',
  availability: '/api/bookings/availability?date=2099-12-20&timeSlot=17:00-19:00&guestCount=2',
};

function endpointCandidates() {
  if (targetEndpoint === 'all') {
    return Object.values(endpointMap);
  }

  const selected = endpointMap[targetEndpoint];
  if (!selected) {
    throw new Error(
      "Invalid TARGET_ENDPOINT. Use one of: all, meals, souvenirs, reviews, availability"
    );
  }
  return [selected];
}

function randomPath(candidates) {
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export default function () {
  const candidates = endpointCandidates();
  const path = randomPath(candidates);
  const res = http.get(`${baseUrl}${path}`, {
    tags: { target, endpoint: path.split('?')[0] },
    headers: {
      Accept: 'application/json',
    },
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'not rate limited': (r) => r.status !== 429,
    'response is json-ish': (r) => {
      const ct = String(r.headers['Content-Type'] || '');
      return ct.includes('application/json') || ct.includes('text/json');
    },
  });

  sleep(0.5);
}
