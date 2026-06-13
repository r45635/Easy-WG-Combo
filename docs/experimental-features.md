# Experimental Features

Some Easy-WG-Combo features are available but not yet recommended for critical use. They are visible in the portal under **Advanced** interface mode.

---

## Gateway / Reverse Proxy — Experimental

Caddy-based service exposure. Supports VPN-only and public HTTPS routes.

Available in the portal UI and via `./easywg proxy *`. Works on live deployments but the security implications of public exposure should be reviewed carefully before use.

→ [Gateway documentation](gateway.md)

---

## Apps — Preview

A curated catalog of optional self-hosted apps manageable through the portal. The catalog is readable in the UI and via `./easywg app catalog`.

Write operations (install, start, stop, remove) are intentionally disabled until Docker socket lifecycle management has been validated on a live VPS.

Do not use Apps for critical workloads.

→ [Apps documentation](apps-preview.md)

---

## File Drop — Preview

Drag-and-drop file sharing with expiry, password protection and token-gated public links.

The UI is visible in the portal but write operations via CLI are disabled pending a security audit of the public link exposure model and upload path handling.

Do not use File Drop for sensitive files until the audit is complete.

→ [File Drop documentation](filedrop-preview.md)

---

## Migration Assistant — Preview

A checklist and helper for in-place upgrades. Full VPS-to-VPS migration is not yet implemented.

`./easywg migrate` runs the in-place upgrade helper, which checks configuration compatibility after a version upgrade. It does not move data between servers.

→ [Migration documentation](migration-preview.md)

---

## Feature status summary

| Feature | Status |
|---|---|
| Gateway / Reverse Proxy | Experimental |
| Apps | Preview |
| File Drop | Preview |
| Migration Assistant | Preview |

→ [Full feature status](feature-status.md)
