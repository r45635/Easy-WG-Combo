'use strict';

// Reading an sshd_config the way sshd reads it.
//
// Extracted from server.js so the precedence rules below can be tested without
// a host: they are subtle, they were wrong for a long time, and getting them
// wrong makes the Security Center report a hardened host as unhardened.

const fs   = require('fs');
const path = require('path');

// Resolve one `Include` pattern the way sshd does: relative patterns hang off
// /etc/ssh, each pattern's matches are read in lexical order. Only the last
// path element may contain wildcards here — that covers the one form every
// distribution ships (`Include /etc/ssh/sshd_config.d/*.conf`), and a pattern
// we cannot expand is reported rather than silently dropped.
function expandSshInclude(pattern, baseDir) {
  const abs = path.isAbsolute(pattern) ? pattern : path.join(baseDir, pattern);
  const dir = path.dirname(abs);
  const base = path.basename(abs);
  if (!/[*?[]/.test(base)) return fs.existsSync(abs) ? [abs] : [];
  if (/[*?[]/.test(dir)) return [];   // wildcard in a directory component: not supported
  const rx = new RegExp('^' + base.replace(/[.+^${}()|\\]/g, '\\$&')
                                  .replace(/\*/g, '[^/]*')
                                  .replace(/\?/g, '[^/]') + '$');
  try {
    return fs.readdirSync(dir).filter(f => rx.test(f)).sort()
      .map(f => path.join(dir, f))
      .filter(f => { try { return fs.statSync(f).isFile(); } catch { return false; } });
  } catch { return []; }
}

// Read an sshd_config the way sshd reads it, which is the whole point of this
// function: `Include` files are expanded AT THE POINT the directive appears,
// and **the first value obtained for a keyword wins** — later ones are ignored.
// Appending the drop-ins after the main file and letting the last line win (as
// this did until 0.6.5) inverts that, and the container never saw the drop-ins
// at all because /etc/ssh/sshd_config.d was not mounted. Together they made the
// portal report PermitRootLogin: yes on two hosts where sshd has had
// prohibit-password since May.
//
// Directives inside a `Match` block are conditional, so they are skipped: this
// returns the global configuration, which is what the security score judges.
//
// Returns { key: { value, source } } — `source` is the file the winning value
// came from, so a surprising reading can be traced without guessing.
// TWIN: scripts/security-check.sh implements the same precedence for the CLI
// (and prefers `sshd -T`, which the container cannot run). Change both.
function parseSshConfig(configPath) {
  const result = {};
  const seen = new Set();
  const baseDir = path.dirname(configPath);
  const includesSeen = [];

  const readFileInto = (file, depth) => {
    if (depth > 8 || seen.has(file)) return;   // sshd's own include depth limit is 16
    seen.add(file);
    let content;
    try { content = fs.readFileSync(file, 'utf8'); } catch { return; }
    let inMatch = false;
    for (const rawLine of content.split('\n')) {
      const line = rawLine.replace(/#.*$/, '').trim();
      if (!line) continue;
      const m = line.match(/^([A-Za-z][A-Za-z0-9]*)[\s=]+(.*)$/);
      if (!m) continue;
      const key = m[1].toLowerCase();
      const value = m[2].trim();
      if (key === 'match') { inMatch = !/^all$/i.test(value); continue; }
      if (inMatch) continue;
      if (key === 'include') {
        for (const pattern of value.split(/\s+/).filter(Boolean)) {
          const files = expandSshInclude(pattern, baseDir);
          includesSeen.push({ pattern, matched: files.length });
          for (const f of files) readFileInto(f, depth + 1);
        }
        continue;
      }
      if (!(key in result)) result[key] = { value, source: file };   // first wins
    }
  };

  readFileInto(configPath, 0);
  Object.defineProperty(result, '_includes', { value: includesSeen, enumerable: false });
  return result;
}

module.exports = { parseSshConfig, expandSshInclude };
