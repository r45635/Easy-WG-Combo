# Phase 3 Status — Easy-WG-Combo

Phase 3 extends Easy-WG-Combo from a VPN/DNS/gateway appliance into a personal VPS operations platform.

Phase 3 modules are being introduced progressively. Not all modules are production-ready.

---

## Monitoring — Phase 3A MVP (validated)

**Status: Ready for use.**

The Uptime Monitor is the first Phase 3 module completed and validated on a live VPS.

What works:
- All API endpoints: list, create, update, delete, enable, disable, check, history
- 6 check types: http, https, tcp, dns, docker, tls
- Background scheduler (60-second tick) running inside the portal container
- Auto-seeded default monitors on first use (portal, wg-easy, adguard, caddy, dns, tls)
- Alert notifications via the existing notification system
- Portal UI: status badges, run-now, enable/disable, add monitor
- CLI: `./easywg monitor list|check|history|add|enable|disable|delete`
- Monitor state and history included in backups

See [monitoring.md](monitoring.md) for full documentation.

---

## Apps — Phase 3 Preview

**Status: Preview only — install/remove/start/stop are disabled.**

The App Launcher catalog is readable via UI and CLI (`./easywg app catalog`).

All write operations (install, start, stop, restart, remove) are disabled in the CLI until the Docker socket lifecycle management has been validated on a live VPS.

The portal UI shows the app catalog and installed apps sections, with experimental banners.

What is needed before enabling:
- Full lifecycle validation on a live VPS (install → start → stop → remove)
- Docker volume isolation design (per-app data in `./apps/<id>/data/`)
- Confirmation that writable Docker socket does not create unacceptable risk in the current deployment

See [apps-preview.md](apps-preview.md) for details.

---

## File Drop — Phase 3 Preview

**Status: Preview only — upload/download CLI is disabled.**

The File Drop UI tab is visible in the portal with an experimental banner.

The CLI (`./easywg filedrop`) exits immediately with a clear message. No upload or download is possible via CLI until the security audit is complete.

The backend endpoints exist in the code but have not been validated on a live deployment.

What is needed before enabling:
- Path traversal audit on upload storage paths
- Public link exposure model (default VPN-only, explicit confirmation for public)
- Password hashing validation (PBKDF2 — code exists but untested on live)
- Max file size and total storage enforcement testing
- Cleanup job validation
- Sanitized filename handling audit

See [filedrop-preview.md](filedrop-preview.md) for details.

---

## Migration Assistant — Phase 3 Preview

**Status: Preview only — Phase 2 migration helper only.**

`./easywg migrate` routes to the Phase 2 migration helper (`scripts/migrate-phase2.sh`), which assists with in-place upgrades and configuration migration between Easy-WG-Combo versions.

It does **not** implement a full VPS-to-VPS migration (moving WireGuard config, DNS state, and data to a new server).

The portal UI shows a Migration tab with a checklist and DNS plan, but full assisted migration is not yet implemented.

See [migration-preview.md](migration-preview.md) for details.

---

## What is safe to use

| Area | Safe to use? |
|---|---|
| WireGuard client management | Yes |
| AdGuard DNS filtering | Yes |
| Security Center (Fail2Ban, sessions, TLS) | Yes |
| Backup / Restore | Yes |
| Notifications (email + webhook) | Yes |
| Device Inventory | Yes |
| DNS Profiles | Yes |
| Gateway / Reverse Proxy | Yes |
| **Monitoring** | **Yes — Phase 3A MVP** |
| App Launcher (catalog only) | Catalog view only |
| App Launcher (install/manage) | No — disabled |
| File Drop | No — disabled |
| Migration Assistant | Phase 2 helper only |

---

## Release status

This repository targets `v0.3.0-alpha`. It is not ready for `v1.0.0`.

Prerequisites for a stable release:
- install.sh tested on Debian 12 and Ubuntu 24.04 (fresh VPS)
- backup/restore tested on a fresh VPS
- Gateway public exposure tested end-to-end
- Security model documented and reviewed
- CI pipeline in place and passing
