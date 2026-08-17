# Changelog

All notable changes to Easy-WG-Combo are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [SemVer](https://semver.org/) (pre-1.0: minor bumps may contain breaking changes).

## [Unreleased] — security hardening

### Security
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
- **Security headers:** portal responses add `X-Frame-Options: SAMEORIGIN`, a `Permissions-Policy`, and a `Content-Security-Policy` in **Report-Only** mode (to be enforced in a later release). *(Applied by `bootstrap.sh` / the Server Endpoint action; a plain `easywg update` does not regenerate the Caddyfile.)*

### Added
- `easywg passwd` — rotate the admin password across `.env`, the wg-easy hash and the portal in one step.
- `SESSION_SECRET` is now actually delivered to the portal container; `WG_EASY_PASSWORD` / `ADGUARD_PASSWORD` can be pinned independently of `ADMIN_PASSWORD`.
- Test suite (`node:test`, 39 tests) covering File Drop enforcement, capability gating, auth, monitor/Caddy/tar guards and boot behavior; `npm test` runs in CI.
- CI security gates: Gitleaks (secret scan over full history), CodeQL (JavaScript + Actions), Trivy image scan, and a blocking `npm audit --audit-level=high`.
- `doctor` now checks that AdGuard is reachable through the portal proxy (flags a diverged AdGuard wizard password).

### Changed
- Portal base image `node:22-bookworm-slim` is now digest-pinned (matches the other images).

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

[0.4.0]: https://github.com/r45635/Easy-WG-Combo/compare/v0.3.0-alpha...v0.4.0
[0.3.0-alpha]: https://github.com/r45635/Easy-WG-Combo/releases/tag/v0.3.0-alpha
