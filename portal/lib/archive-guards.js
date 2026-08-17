'use strict';

// Guards against malicious tar archives. Even though backups are normally
// created by this app, a restore archive is untrusted input: it can carry
// path traversal, absolute paths, or symlink/hardlink/device entries that
// escape the staging directory or clobber host files.

// Parse a `tar -tvzf` verbose listing and reject anything unsafe. Returns an
// error string, or null when every entry is a plain file or directory confined
// to the archive root.
function validateTarListing(listing) {
  const lines = String(listing || '').split('\n').map(l => l.trimEnd()).filter(Boolean);
  if (!lines.length) return 'archive is empty or unreadable';
  for (const line of lines) {
    const type = line[0];
    // l=symlink h=hardlink b/c=device p=fifo s=socket — none belong in a config backup.
    if (type && 'lhbcps'.includes(type)) {
      return `archive contains a disallowed entry type (${type}): ${line}`;
    }
    // Path is whatever follows the HH:MM[:SS] timestamp column.
    const m = line.match(/\d{2}:\d{2}(?::\d{2})?\s+(.+)$/);
    let p = (m ? m[1] : line).replace(/ -> .*$/, '').replace(/ link to .*$/, '').trim();
    if (!p) continue;
    if (p.startsWith('/')) return `archive contains an absolute path: ${p}`;
    if (p.split('/').some(seg => seg === '..')) return `archive contains a parent-directory traversal: ${p}`;
  }
  return null;
}

module.exports = { validateTarListing };
