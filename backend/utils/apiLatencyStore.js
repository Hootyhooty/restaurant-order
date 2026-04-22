const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_EVENTS = 20000;

const events = [];

const prune = (now = Date.now()) => {
  while (events.length > 0 && now - events[0].timestamp > MAX_AGE_MS) {
    events.shift();
  }
  if (events.length > MAX_EVENTS) {
    events.splice(0, events.length - MAX_EVENTS);
  }
};

const recordApiLatency = ({ method, path, durationMs, status, timestamp = Date.now() }) => {
  events.push({
    method: String(method || ''),
    path: String(path || ''),
    durationMs: Number(durationMs || 0),
    status: Number(status || 0),
    timestamp,
  });
  prune(timestamp);
};

const percentile = (arr, p) => {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
};

const getLatencySnapshot = (range = 'day') => {
  prune();
  const now = Date.now();
  let windowMs = 24 * 60 * 60 * 1000;
  if (range === 'week') windowMs = 7 * 24 * 60 * 60 * 1000;
  if (range === 'month') windowMs = 30 * 24 * 60 * 60 * 1000;

  const windowEvents = events.filter((e) => now - e.timestamp <= windowMs);
  const durations = windowEvents.map((e) => e.durationMs).filter((n) => Number.isFinite(n));
  const endpoints = {};

  for (const e of windowEvents) {
    const key = `${e.method} ${e.path.split('?')[0]}`;
    if (!endpoints[key]) endpoints[key] = [];
    endpoints[key].push(e.durationMs);
  }

  const endpointStats = Object.entries(endpoints)
    .map(([endpoint, vals]) => ({
      endpoint,
      count: vals.length,
      p50: Number(percentile(vals, 50).toFixed(2)),
      p75: Number(percentile(vals, 75).toFixed(2)),
      p90: Number(percentile(vals, 90).toFixed(2)),
      p95: Number(percentile(vals, 95).toFixed(2)),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  return {
    windowHours: Math.round(windowMs / (60 * 60 * 1000)),
    count: durations.length,
    p50: Number(percentile(durations, 50).toFixed(2)),
    p75: Number(percentile(durations, 75).toFixed(2)),
    p90: Number(percentile(durations, 90).toFixed(2)),
    p95: Number(percentile(durations, 95).toFixed(2)),
    endpoints: endpointStats,
  };
};

module.exports = {
  recordApiLatency,
  getLatencySnapshot,
};

