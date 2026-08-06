/**
 * Fail CI on high/critical npm audit findings, with a narrow allowlist.
 *
 * GHSA-qwww-vcr4-c8h2: patched in react-router >=7.18.2 (and >=8.3.0), but the
 * public advisory range still lists <8.3.0 until GitHub merges the correction.
 * We do not use unstable RSC APIs; keeping 7.18.2 is the correct v7 fix.
 * Remove the allowlist once `npm audit` no longer reports it on 7.18.2+.
 */
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';

const MIN_REACT_ROUTER = '7.18.2';
const require = createRequire(import.meta.url);

function gte(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i += 1) {
    const da = pa[i] || 0;
    const db = pb[i] || 0;
    if (da > db) return true;
    if (da < db) return false;
  }
  return true;
}

function advisoryIds(vuln) {
  return (vuln.via || [])
    .filter((entry) => entry && typeof entry === 'object')
    .flatMap((entry) => {
      const fromUrl = (entry.url || '').match(/GHSA-[a-z0-9-]+/i)?.[0];
      return [entry.source, fromUrl].filter(Boolean).map(String);
    });
}

function isAllowlisted(vuln, installedReactRouter) {
  if (!['react-router', 'react-router-dom'].includes(vuln.name)) return false;
  const urls = (vuln.via || [])
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry) => entry.url || '');
  const hasStaleRrCsrf = urls.some((url) => url.includes('GHSA-qwww-vcr4-c8h2'));
  if (!hasStaleRrCsrf) return false;
  return Boolean(installedReactRouter && gte(installedReactRouter, MIN_REACT_ROUTER));
}

let report;
try {
  // shell:true so Windows resolves npm.cmd; CI (Linux) still works.
  const raw = execSync('npm audit --json --audit-level=high', {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
  });
  report = JSON.parse(raw);
} catch (error) {
  const stdout = error.stdout?.toString?.() || '';
  if (!stdout.trim()) throw error;
  report = JSON.parse(stdout);
}

let installedReactRouter = null;
try {
  installedReactRouter = require('react-router/package.json').version;
} catch {
  installedReactRouter = null;
}

const blocking = Object.values(report.vulnerabilities || {}).filter((vuln) => {
  if (!['high', 'critical'].includes(vuln.severity)) return false;
  if (isAllowlisted(vuln, installedReactRouter)) return false;
  if (
    Array.isArray(vuln.via) &&
    vuln.via.length > 0 &&
    vuln.via.every((entry) => typeof entry === 'string')
  ) {
    const parentsOk = vuln.via.every((name) => {
      const parent = report.vulnerabilities?.[name];
      return parent && isAllowlisted(parent, installedReactRouter);
    });
    if (parentsOk) return false;
  }
  return true;
});

if (blocking.length > 0) {
  console.error('High/critical vulnerabilities remain:');
  for (const vuln of blocking) {
    const ids = advisoryIds(vuln).join(', ') || 'n/a';
    console.error(`- ${vuln.name} (${vuln.severity}) ${ids}`);
  }
  process.exit(1);
}

console.log(
  `Audit passed at high+${
    installedReactRouter
      ? ` (allowlisted GHSA-qwww-vcr4-c8h2 for react-router@${installedReactRouter})`
      : ''
  }`,
);
