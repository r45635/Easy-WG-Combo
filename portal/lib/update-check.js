'use strict';

// Release / configuration drift helpers, kept pure and dependency-free so they
// can be unit tested without booting the HTTP server or reaching the network.
//
// Why this module exists: a critical advisory (GHSA-jqcg-44mw-7w3h) sat in a
// deployed portal for five days because nothing on the box ever said "you are
// behind". The portal is the one component an operator looks at, so it is the
// right place to say it.

const RELEASES_URL =
  'https://api.github.com/repos/r45635/Easy-WG-Combo/releases/latest';

// The six headers bootstrap.sh / the Server Endpoint action write into the
// Caddyfile. Keep this list in sync with configure_caddy() (bootstrap.sh) and
// generateMainCaddyfile() (server.js) — they are TWIN implementations.
const EXPECTED_HEADERS = [
  'Strict-Transport-Security',
  'X-Content-Type-Options',
  'Referrer-Policy',
  'X-Frame-Options',
  'Permissions-Policy',
  'Content-Security-Policy',
];

// "v0.4.0", "0.4.0", "0.5.0-rc.1" -> [0,4,0] plus a prerelease marker.
// Returns null for anything we cannot read, so callers fail closed.
function parseVersion(raw) {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim().replace(/^v/i, '');
  const m = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?/.exec(s);
  if (!m) return null;
  return {
    parts: [Number(m[1]), Number(m[2]), Number(m[3])],
    prerelease: m[4] || null,
  };
}

// -1 / 0 / 1, or null when either side is unreadable. A prerelease sorts
// before its own release (0.5.0-rc.1 < 0.5.0), matching SemVer.
function compareVersions(a, b) {
  const va = parseVersion(a);
  const vb = parseVersion(b);
  if (!va || !vb) return null;
  for (let i = 0; i < 3; i++) {
    if (va.parts[i] !== vb.parts[i]) return va.parts[i] < vb.parts[i] ? -1 : 1;
  }
  if (va.prerelease && !vb.prerelease) return -1;
  if (!va.prerelease && vb.prerelease) return 1;
  if (va.prerelease && vb.prerelease) {
    if (va.prerelease === vb.prerelease) return 0;
    return va.prerelease < vb.prerelease ? -1 : 1;
  }
  return 0;
}

// Pull the tag out of a GitHub "latest release" payload without trusting its
// shape. Drafts are never "latest" from that endpoint, but prereleases can be
// if the repo has only prereleases — the caller decides what to do with it.
function parseLatestRelease(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const tag = payload.tag_name || payload.name;
  if (!tag || !parseVersion(tag)) return null;
  return {
    version: String(tag).trim().replace(/^v/i, ''),
    url: typeof payload.html_url === 'string' ? payload.html_url : null,
    publishedAt: typeof payload.published_at === 'string' ? payload.published_at : null,
    prerelease: payload.prerelease === true,
  };
}

// Never throws, never guesses: an unreadable version on either side yields
// updateAvailable:false plus a reason, so the UI can stay quiet rather than
// cry wolf.
function evaluateUpdate(current, latest) {
  if (!parseVersion(current)) {
    return { updateAvailable: false, current: current || null, latest: null, reason: 'unknown-current' };
  }
  if (!latest || !parseVersion(latest.version)) {
    return { updateAvailable: false, current, latest: null, reason: 'unknown-latest' };
  }
  const cmp = compareVersions(current, latest.version);
  return {
    updateAvailable: cmp === -1,
    current,
    latest: latest.version,
    url: latest.url || null,
    publishedAt: latest.publishedAt || null,
    prerelease: !!latest.prerelease,
    reason: null,
  };
}

// Which of the six headers a Caddyfile actually carries, and whether the CSP
// is enforced or still the report-only form that protects nothing.
//
// This reads the file the operator's Caddy is configured from — the repo copy
// proves nothing, because `easywg update` never regenerates the Caddyfile and
// an install predating the hardening keeps serving without it.
function inspectCaddyHeaders(caddyfileText) {
  if (typeof caddyfileText !== 'string' || caddyfileText === '') {
    return { readable: false, present: [], missing: EXPECTED_HEADERS.slice(), csp: 'unknown' };
  }
  const present = [];
  const missing = [];
  for (const h of EXPECTED_HEADERS) {
    // Match the directive at the start of a line, as Caddy's header block
    // writes it; a header named inside a comment must not count.
    //
    // (?![-\w]) rather than \b: \b would match at the hyphen, so
    // "Content-Security-Policy-Report-Only" would count as a present (and
    // therefore enforced) "Content-Security-Policy" — the precise false
    // negative this check exists to catch.
    const re = new RegExp(`^\\s*(?:-\\s*)?${h}(?![-\\w])`, 'im');
    const line = caddyfileText.split('\n').find((l) => re.test(l) && !/^\s*#/.test(l));
    (line ? present : missing).push(h);
  }
  let csp = 'missing';
  if (/^\s*Content-Security-Policy-Report-Only\b/im.test(caddyfileText)) csp = 'report-only';
  if (present.includes('Content-Security-Policy')) csp = 'enforced';
  return { readable: true, present, missing, csp };
}

// One boolean the UI can act on, plus why.
function evaluateDrift(headerReport) {
  const r = headerReport || {};
  if (!r.readable) return { drift: false, reason: 'caddyfile-unreadable', ...r };
  if (r.missing && r.missing.length) return { drift: true, reason: 'headers-missing', ...r };
  if (r.csp === 'report-only') return { drift: true, reason: 'csp-report-only', ...r };
  return { drift: false, reason: null, ...r };
}

module.exports = {
  RELEASES_URL,
  EXPECTED_HEADERS,
  parseVersion,
  compareVersions,
  parseLatestRelease,
  evaluateUpdate,
  inspectCaddyHeaders,
  evaluateDrift,
};
