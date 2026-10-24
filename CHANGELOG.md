# Changelog

All notable changes to Easy-WG-Combo are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [SemVer](https://semver.org/) (pre-1.0: minor bumps may contain breaking changes).

## [Unreleased]

## [0.5.2] — 2026-10-24

### Changed
- **The prototype-pollution class is removed at the root, not guarded against.** The seven record stores are now built with `Object.create(null)`, so `store["__proto__"]` is an ordinary absent key rather than `Object.prototype` — there is no prototype chain for a user-supplied id to reach, and nothing for a later assignment to corrupt. `safeLookup()` from 0.5.1 stays as a second line. A hostile store file carrying an own `__proto__` key is inert for the same reason.
- **Backup paths are resolved and contained rather than pattern-matched.** `resolveBackupPath()` resolves the filename against `BACKUP_DIR` and requires the result to sit directly inside it. The filename pattern check remains the first line; the containment check is the one that holds regardless, and it is legible to a reader and to static analysis alike.
- **CI fails when any code-scanning alert is open.** CodeQL writes to the Security tab while its workflow still reports success, so a green run said nothing about what it found — which is how a real SSRF stayed open from 17 August to 24 October. The queue is now a build signal. Three alerts that are intentional or unmodellable carry `// codeql[rule-id]` suppression comments stating why, next to the code rather than in a web UI.

## [0.5.1] — 2026-10-24

### Security
- **Server-side request forgery in the wg-easy / AdGuard proxy (CodeQL `js/request-forgery`).** `proxyTo()` built its target with `new URL(path, base)`, and `new URL` **discards the base** when the path is absolute (`http://x/`) or protocol-relative (`//x/`). The path came from `req.originalUrl`, so `GET /adguard//attacker/` was proxied to the attacker — **carrying the Basic credentials the proxy injects**, which leaked the AdGuard password. Reproduced against a local listener before the fix and confirmed blocked after.

  Exploitation needs an authenticated admin session and the admin following a crafted link: the cross-origin gate covers only state-changing methods, and the session cookie is `sameSite=lax`, so a top-level navigation carries it. Not reachable by an unauthenticated visitor.

  The path is now collapsed to a single leading slash and the resolved origin is checked against the backend's, in `netGuards.resolveUpstreamUrl()` — a request that would leave the backend is refused with 400. Four regression tests cover protocol-relative, multi-slash, backslash and absolute-URL forms.

  **If you ran 0.5.0 or earlier with the admin portal exposed, rotate the AdGuard password.**
- **Prototype pollution through record lookups (CodeQL `js/prototype-polluting-assignment`, 20 alerts).** Every store is a plain object keyed by id, and the routes read `store[req.params.id]`. For `id=__proto__` that returns `Object.prototype` — truthy, so the `if (!rec) return 404` guard let it through and the next field assignment wrote onto `Object.prototype` for the lifetime of the process; `constructor` and `prototype` behave the same. All 28 lookup sites now go through `safeLookup()`, which rejects those keys and resolves own properties only. Authenticated routes, so admin-only — fixed anyway: the guard costs one function call.

## [0.5.0] — 2026-10-24 — security hardening

Three months of hardening, a critical dependency fix, and the portal
learning to tell you when it is behind. **Update any instance running
0.4.0.**

### Security
- **`body-parser` denial of service (GHSA-27r3-jxmh-p828, high).** express 5.3.0 pulled `body-parser` 2.3.0, which can be stalled by trailing bytes after a compressed request body. Raised to 2.4.0. The portal parses JSON bodies on its API, including the unauthenticated login and File Drop paths, so this one is reachable — the per-IP rate limiter bounds it but does not remove it.
- **`ip-address` quadratic parsing (GHSA-rxp7-6hxx-x8q5, moderate).** Raised to 10.7.4. Pulled by express-rate-limit; the portal's own CIDR checks in `portal/lib/net-guards.js` do not use it.
- **Critical: `proxy-addr` IP spoofing (GHSA-jqcg-44mw-7w3h, CVSS 9.1).** express 5.2.1 pulled `proxy-addr` 2.0.7, where an IPv4-mapped IPv6 peer address can match an IPv4 trust subnet. express **5.3.0** requires `proxy-addr` ^2.0.8. The portal sets `trust proxy` to `loopback`, so the spoofable value is the one keying the per-IP rate limiter and shown in the sessions view; the Fail2Ban jail reads Caddy's access log and was not affected. **Update any instance running an earlier build.**
- **SSRF IP classification is now semantic**, not textual: IPv4-mapped IPv6 in **both** dotted (`::ffff:127.0.0.1`) and hexadecimal (`::ffff:7f00:1`) notation is correctly blocked, along with a fuller reserved-range set; only globally routable unicast is allowed for user monitors. Malformed IPv6 fails closed.
- **`easywg passwd` preserves an independent wg-easy credential:** it only regenerates wg-easy's `PASSWORD_HASH` when `WG_EASY_PASSWORD` follows the admin password. An intentionally independent `WG_EASY_PASSWORD` is no longer desynced by a rotation.
- **The admin password is no longer printed** in the installer's final summary (prevents it leaking into terminal / cloud-init / provisioning logs).
- **Passwords may not contain `$`** (Docker Compose interprets it in `.env`, which would desync the portal from the wg-easy hash). Rejected with a clear error at the installer, `easywg passwd` and the portal — never silently altered.
- **SSH-tunnel instructions include `-p <SSH_PORT>`** when a non-default SSH port is configured (installer summary + docs).
- **Monitoring SSRF — connect-time DNS guard.** Monitor targets are now resolved through a guarded DNS lookup: a hostname that resolves (or rebinds) to a private/reserved/link-local address — including cloud metadata `169.254.169.254`, loopback, RFC1918, CGNAT and IPv6 ULA/link-local — is refused at connect time, not merely when given as a literal IP. The socket connects to the exact address that was validated. Built-in local probes are unaffected.
- **`POST /api/fail2ban/unban-all`** now requires Advanced mode (it lifts every ban), matching its ban/unban/ignoreip/set-config siblings.
- **Unified password policy:** minimum **12 characters** (16+ recommended), enforced consistently by the installer, the portal UI/API and `easywg passwd`.
- **`easywg passwd` no longer breaks the AdGuard proxy:** it pins `ADGUARD_PASSWORD` before rotating `ADMIN_PASSWORD`, so the portal keeps talking to AdGuard (whose own credential is independent).
- **Local-only deployment summary** now prints the correct SSH-tunnel command and `localhost` URL instead of an unreachable public `WG_HOST` URL (all Xray/public/local-only combinations).
- **File Drop `vpn_only` shares are now enforced server-side.** Previously the share mode was cosmetic and any client with the token could download over the public Internet; downloads now require a VPN-subnet (or loopback/SSH-tunnel) source. See the advisory in [SECURITY.md](SECURITY.md).
- **File Drop passwords are POST-only** — the `?pw=` query form (which leaked into access logs and the Security → Logs panel) is removed.
- **File Drop password hashing** raised to PBKDF2-SHA256 600k iterations, computed asynchronously (the unauthenticated download path no longer blocks the event loop); legacy hashes still verify. Downloads are served as `application/octet-stream` with `X-Content-Type-Options: nosniff` and an RFC 5987 `Content-Disposition`.
- **No more `changeme` fallback.** The portal refuses to start without an admin password instead of booting with a known default; `bootstrap.sh` verifies it on re-run and regenerates the wg-easy hash if missing.
- **Admin portal is local-only by default** (`PUBLIC_HTTPS_ENABLED=no`). Fresh interactive installs are prompted; the Xray branch now honors the flag (it previously opened `:8443` unconditionally).
- **Interface modes are enforced server-side** on every privileged endpoint, and raising the mode requires the admin password (closes user→advanced self-escalation).
- **Auth hardening:** app-level login rate limiting (also covers the Basic-auth path), session-id regeneration on login, revocation of other sessions on password change, and a cross-origin (CSRF) gate on state-changing API requests.
- **Coarse per-IP request rate limiting** (`express-rate-limit`) across all handlers, including the unauthenticated `/files/` download path.
- **Trustworthy client IP:** `trust proxy` is now `loopback`, so `X-Forwarded-For` is honored only from Caddy / SSH-tunnel peers and can no longer be spoofed.
- **Monitoring SSRF guard:** monitor targets are validated on create **and** update; literal private/reserved/link-local addresses (incl. cloud metadata) are rejected, and intervals/timeouts are bounded. Built-in monitors may still probe local services.
- **Reverse-proxy / Caddyfile injection guards:** target URLs, domains and IP allowlists are validated on every path (create, update, app install); the generator refuses control/brace characters, and the Server Endpoint action snapshots and rolls back the Caddyfile if a reload fails.
- **Restore hardening:** backup archives are validated before extraction (no absolute paths, `..` traversal, or symlink/hardlink/device entries); extraction uses `--no-same-owner --no-overwrite-dir`. `restore.sh` keeps the repo `docker-compose.yml` unless `--use-archive-compose` is given.
- **Secrets at rest:** `portal-config.json`, `notifications.json`, `.env` and `.env.secrets` are created/kept `0600`.
- **Security headers:** Caddy now adds `X-Frame-Options: SAMEORIGIN`, a `Permissions-Policy` and a `Content-Security-Policy` alongside the existing HSTS / `X-Content-Type-Options` / `Referrer-Policy`. The CSP is **enforced** — it shipped as `Content-Security-Policy-Report-Only`, which protected nothing and, with no `report-uri` configured, collected nothing either. *(Applied by `bootstrap.sh` / the Server Endpoint action; a plain `easywg update` does not regenerate the Caddyfile — see [docs/security-model.md](docs/security-model.md#security-headers).)*
- **Fail2Ban reads Caddy's timestamps:** the `easy-wg-portal` filter now sets `datepattern = "ts":{EPOCH}`. Caddy logs a floating-point epoch that Fail2Ban could not parse, so it fell back to "Simulate NOW" and measured `findtime`/`bantime` from the time it read the line instead of the time of the attempt. Existing installs: re-run `./bootstrap.sh`.

### Added
- **Release and configuration-drift check on the dashboard.** The portal now reports its own version, compares it against the latest GitHub release (cached 6 h, `UPDATE_CHECK_ENABLED=no` to disable), and — more importantly — warns when the live `caddy/Caddyfile` has stopped serving any of the six security headers or still carries a report-only CSP. Both halves fail soft: no network, a rate-limited API or an unreadable Caddyfile leaves the banners hidden rather than raising a false alarm. New endpoint `GET /api/system/updates`; translated EN/FR/ZH.
- The portal image carries its version in `APP_VERSION`, baked at build time, so an image-based deployment no longer needs the git checkout to know what it runs.
- **CI publishes the portal image to `ghcr.io/r45635/easy-wg-combo-portal`** (version, commit SHA and `latest` tags), after every other job passes, and only on a push to this repository — a fork or a pull request cannot publish. This is the groundwork for updating a server by *pulling* the portal instead of compiling it there: on a 1 vCPU / 1 GB VPS, `compose up -d --build` is exactly what this project tells you not to do. The package is public, and `docker-compose.yml` now carries both `image:` and `build:`: `compose pull` fetches the prebuilt image so a small VPS can update with `./compose.sh up -d --no-build` instead of compiling, while `up -d --build` still builds from source for development. See [Updating without compiling on the server](docs/advanced-install.md#updating-without-compiling-on-the-server).
- `easywg passwd` — rotate the admin password across `.env`, the wg-easy hash and the portal in one step.
- `SESSION_SECRET` is now actually delivered to the portal container; `WG_EASY_PASSWORD` / `ADGUARD_PASSWORD` can be pinned independently of `ADMIN_PASSWORD`.
- Test suite (`node:test`, 53 tests) covering File Drop enforcement, capability gating, auth, monitor/Caddy/tar guards and boot behavior; `npm test` runs in CI.
- CI security gates: Gitleaks (secret scan over full history), CodeQL (JavaScript + Actions), Trivy image scan, and a blocking `npm audit --audit-level=high`.
- `doctor` now checks that AdGuard is reachable through the portal proxy (flags a diverged AdGuard wizard password).
- `doctor` now flags a `caddy/Caddyfile` that serves no security headers, or one still carrying a report-only CSP — the case an `easywg update` cannot fix on its own.
- `doctor` now detects a stale `/var/run/fail2ban` bind mount in the portal container (left behind by `systemctl restart fail2ban`, which recreates the directory with a new inode). The portal then reports Fail2Ban inactive while it is running; the fix is `docker restart portal`.
- `doctor` now verifies the Fail2Ban filter carries a `datepattern`.

### Changed
- Portal base image `node:22-bookworm-slim` is now digest-pinned (matches the other images).
- Dependency updates: Express 4 → **5.3.0**, nodemailer → **10.1.7**, express-rate-limit → **8.7.1**, AdGuard Home → `v0.107.79`, Xray → `26.10.17`, Caddy digest refreshed. `ip-address` was pinned to 10.7.2 to clear a transitive advisory pulled in by express-rate-limit 8 (the portal's own CIDR checks in `portal/lib/net-guards.js` were never affected).

### Fixed
- `POST /api/migration/validate` no longer 500s (undefined `caddyUp` reference).

## [0.4.0] — 2026-07-26

### Added
- Xray VLESS+Reality opt-in overlay for DPI-resistant tunneling, with per-device UUIDs, QR modal from the Devices list, and `easywg xray` CLI commands
- Server Endpoint setting in the admin portal — cascades Caddyfile, TLS and Caddy reload in one step
- Real Let's Encrypt certificate for the portal in Xray mode (HTTP-01 on port 80), with automatic fallback to a self-signed certificate when the FQDN does not point at the server
- Mobile responsive layout (hamburger sidebar)
- Client apps guide (WireGuard + VLESS+Reality) with download links
- `easywg update` command — safe one-step update: dirty-tree check, `git pull --ff-only`, image pull, rebuild, health check
- CI: 3-job workflow (shellcheck on all shell entry points including `bootstrap.sh`/`install.sh`/`compose.sh`, compose validation including the Xray overlay, portal syntax check + image build + boot smoke test), weekly scheduled run
- Dependabot automation for npm, Docker images, compose images and GitHub Actions
- `VERSION` file as the single source of truth for the project version
- `CHANGELOG.md`, `SECURITY.md`

### Changed
- All container images pinned: wg-easy `14` digest-pinned (v15 is a breaking rewrite — major bumps blocked in Dependabot), AdGuard `v0.107.77`, Caddy `2-alpine` digest-pinned, Xray `26.7.11`, portal base image `node:22-bookworm-slim` (Node 20 is EOL)
- App catalog images pinned (Vaultwarden `1.37.0`, Stirling PDF `2.14.2`, ntfy `v2`, FileBrowser `v2`)
- `bootstrap.sh` reads the Xray image reference from `docker-compose.xray.yml` instead of duplicating it
- `npm audit` in CI is now a non-blocking report (Dependabot owns dependency fixes)
- Backups are stamped with the `VERSION` file + git commit instead of the portal `package.json` version

### Fixed
- Xray lifecycle hardening: certificate generator drift, re-run data loss, idempotent key generation, container cleanup when `XRAY_ENABLED` switches off
- Caddy binds to `domain:port` so the TLS certificate matches the hostname
- DNS routing from VPN clients to AdGuard via DNAT in the wg-easy PostUp hook
- Service status checks use Docker container state instead of probing port 443
- nodemailer upgraded to v9 (GHSA-p6gq-j5cr-w38f)

### Security
- VLESS QR codes, URIs and the Reality public key redacted from documentation screenshots

## [0.3.0-alpha] — 2026-06-13

Initial public alpha: WireGuard device management (wg-easy v14), AdGuard Home DNS filtering with per-device presets, admin portal with three interface modes (User / Super User / Advanced), Security Center, backups, monitoring, notifications, gateway/apps/filedrop previews.

[0.5.2]: https://github.com/r45635/Easy-WG-Combo/compare/v0.5.1...v0.5.2
[0.5.1]: https://github.com/r45635/Easy-WG-Combo/compare/v0.5.0...v0.5.1
[0.5.0]: https://github.com/r45635/Easy-WG-Combo/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/r45635/Easy-WG-Combo/compare/v0.3.0-alpha...v0.4.0
[0.3.0-alpha]: https://github.com/r45635/Easy-WG-Combo/releases/tag/v0.3.0-alpha
