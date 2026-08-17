# Security Policy

## Supported versions

Only the latest `main` branch is supported. Update with `./easywg update` (or re-run the installer).

## Reporting a vulnerability

Please report vulnerabilities privately via [GitHub private vulnerability reporting](https://github.com/r45635/Easy-WG-Combo/security/advisories/new) — do not open a public issue.

You can expect an acknowledgement within a few days. Fixes are released on `main` and noted in [CHANGELOG.md](CHANGELOG.md).

## Scope notes

- The admin portal is a privileged component; see [docs/security-model.md](docs/security-model.md) for the threat model and exposure modes.
- Preview features (Apps, File Drop, Migration) are explicitly not production-hardened.

## Accepted risks (by design)

These are deliberate architectural trade-offs, not bugs. Understand them before exposing the portal:

- **The portal is a root-equivalent control plane.** It mounts a writable Docker socket and holds `NET_ADMIN` + write access to `/etc/ufw` so it can manage containers, the firewall and certificates. **Compromise of the portal process equals compromise of the host.** App containers are created only from the curated catalog (no user-supplied image, bind mounts, capabilities or command), which limits — but does not eliminate — this exposure.
- **Single admin credential / no RBAC.** Interface modes (User / Super User / Advanced) are guardrails against session hijacking and mistakes, not multi-user access control. Anyone with the admin password can unlock any mode.
- **Runs as root in-container** (required by the Fail2Ban socket, UFW/`NET_ADMIN` and the Docker socket). The base image is digest-pinned instead.
- **Public admin mode**, when explicitly enabled, exposes this root-equivalent portal to the Internet. It is **off by default** — the default install is reachable only via SSH tunnel / VPN.
- **Apps and File Drop are preview features.** Do not use them for sensitive workloads.

## Advisory: File Drop share passwords in logs (fixed)

Earlier versions accepted a File Drop share password in the URL query string
(`/files/<token>?pw=…`). Such URLs were written to the Caddy access log and shown
in the portal's Security → Logs panel. This is fixed (passwords are POST-only). If
you ran an affected version: **rotate any password-protected share passwords and
truncate `caddy/logs/access.log` once.**
