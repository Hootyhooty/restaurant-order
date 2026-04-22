/* eslint-disable no-console */
const fs = require('fs');

const percentile = (arr, p) => {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
};

const readInput = async () => {
  const argFile = process.argv[2];
  if (argFile) {
    return fs.readFileSync(argFile, 'utf8');
  }
  return await new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => (data += chunk));
    process.stdin.on('end', () => resolve(data));
  });
};

const main = async () => {
  const raw = await readInput();
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const durationsByEndpoint = {};
  const all = [];

  for (const line of lines) {
    try {
      const row = JSON.parse(line);
      if (row.type !== 'api_request') continue;
      const endpoint = `${row.method} ${String(row.path || '').split('?')[0]}`;
      const d = Number(row.duration_ms);
      if (!Number.isFinite(d)) continue;
      if (!durationsByEndpoint[endpoint]) durationsByEndpoint[endpoint] = [];
      durationsByEndpoint[endpoint].push(d);
      all.push(d);
    } catch (_) {
      // ignore non-json lines
    }
  }

  const summary = {
    samples: all.length,
    p50: Number(percentile(all, 50).toFixed(2)),
    p75: Number(percentile(all, 75).toFixed(2)),
    p90: Number(percentile(all, 90).toFixed(2)),
    p95: Number(percentile(all, 95).toFixed(2)),
  };

  const endpoints = Object.entries(durationsByEndpoint)
    .map(([endpoint, vals]) => ({
      endpoint,
      count: vals.length,
      p50: Number(percentile(vals, 50).toFixed(2)),
      p75: Number(percentile(vals, 75).toFixed(2)),
      p90: Number(percentile(vals, 90).toFixed(2)),
      p95: Number(percentile(vals, 95).toFixed(2)),
    }))
    .sort((a, b) => b.count - a.count);

  console.log(JSON.stringify({ summary, endpoints }, null, 2));
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

