/**
 * Poll a deployed API until /api/health and /api/ready succeed (Render spin-up).
 * Optionally wait until health.release matches EXPECTED_RELEASE, or poll a frontend URL.
 *
 * API wait:
 *   API_URL=https://api.example.com node scripts/wait-for-ready.mjs
 *
 * Frontend wait:
 *   WAIT_FRONTEND=1 FRONTEND_ORIGIN=https://app.example.com node scripts/wait-for-ready.mjs
 */
const timeoutMs = Number(process.env.READY_TIMEOUT_MS || 300000);
const intervalMs = Number(process.env.READY_INTERVAL_MS || 5000);
const waitFrontend = process.env.WAIT_FRONTEND === '1';
const expectedRelease = String(process.env.EXPECTED_RELEASE || '').trim();

const apiUrl = String(process.env.API_URL || process.env.STAGING_API_URL || '').replace(/\/$/, '');
const frontendOrigin = String(
  process.env.FRONTEND_ORIGIN || process.env.STAGING_FRONTEND_ORIGIN || '',
).replace(/\/$/, '');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function releaseMatches(actual, expected) {
  if (!expected) return true;
  if (!actual) return false;
  const a = String(actual);
  const e = String(expected);
  return a === e || a.startsWith(e) || e.startsWith(a);
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, body };
}

async function waitForApi() {
  if (!apiUrl) {
    console.error('API_URL or STAGING_API_URL is required');
    process.exit(1);
  }

  const started = Date.now();
  let lastDetail = 'not started';

  while (Date.now() - started < timeoutMs) {
    try {
      const health = await fetchJson(`${apiUrl}/api/health`);
      const ready = await fetchJson(`${apiUrl}/api/ready`);
      const healthOk = health.status === 200 && health.body?.status === 'ok';
      const readyOk = ready.status === 200 && ready.body?.status === 'ready';
      const releaseOk = releaseMatches(health.body?.release, expectedRelease);

      if (healthOk && readyOk && releaseOk) {
        console.log(
          `Ready: ${apiUrl} health=ok ready=ok` +
            (expectedRelease ? ` release=${health.body.release}` : ''),
        );
        return;
      }

      lastDetail = `health=${health.status}/${health.body?.status || '?'} ready=${ready.status}/${ready.body?.status || '?'} release=${health.body?.release || '(none)'}`;
    } catch (err) {
      lastDetail = err.message;
    }

    const elapsed = Math.round((Date.now() - started) / 1000);
    console.log(`Waiting for API (${elapsed}s): ${lastDetail}`);
    await sleep(intervalMs);
  }

  console.error(`Timed out after ${timeoutMs}ms waiting for ${apiUrl}. Last: ${lastDetail}`);
  process.exit(1);
}

async function waitForFrontend() {
  if (!frontendOrigin) {
    console.error('FRONTEND_ORIGIN or STAGING_FRONTEND_ORIGIN is required when WAIT_FRONTEND=1');
    process.exit(1);
  }

  const started = Date.now();
  let lastDetail = 'not started';

  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(frontendOrigin, { redirect: 'follow' });
      if (res.ok) {
        console.log(`Frontend reachable: ${frontendOrigin} (${res.status})`);
        return;
      }
      lastDetail = `status ${res.status}`;
    } catch (err) {
      lastDetail = err.message;
    }

    const elapsed = Math.round((Date.now() - started) / 1000);
    console.log(`Waiting for frontend (${elapsed}s): ${lastDetail}`);
    await sleep(intervalMs);
  }

  console.error(`Timed out after ${timeoutMs}ms waiting for ${frontendOrigin}. Last: ${lastDetail}`);
  process.exit(1);
}

if (waitFrontend) {
  await waitForFrontend();
} else {
  await waitForApi();
}
