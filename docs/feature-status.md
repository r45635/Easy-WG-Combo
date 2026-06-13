# Feature Status

## Status definitions

| Status | Meaning |
|---|---|
| **Stable** | Core functionality, works for normal usage |
| **Beta** | Implemented and usable, needs broader testing |
| **Experimental** | Available but may change; not production-ready |
| **Preview** | Visible or partially implemented; not recommended for real use |

---

## Core features

| Feature | Status | Notes |
|---|---|---|
| WireGuard device management | Stable | Create devices, QR codes and client configs |
| AdGuard DNS filtering | Stable | Global and per-device DNS filtering via AdGuard Home |
| Multilingual UI | Stable | English, French, Chinese |
| Auto HTTPS via Caddy | Stable | Domain cert via ACME or internal TLS fallback |
| SSH tunnel access | Stable | Recommended for safest admin access |

---

## Operational features

| Feature | Status | Notes |
|---|---|---|
| Security Center | Beta | Fail2Ban management, UFW/TLS status, sessions, security score |
| Backup / Restore | Beta | Local archive backup and guided restore workflow |
| Notifications | Beta | SMTP and webhook alerts; configure in Notifications tab |
| Device Inventory | Beta | Per-device metadata, expiry, routing mode, enable/disable/revoke |
| DNS Profiles | Beta | Per-device named profiles with timed bypass |
| Monitoring | Beta | HTTP, HTTPS, TCP, DNS, Docker, TLS and service checks; 60s scheduler |
| Server name | Stable | Shown in UI, embedded in downloaded `.conf` filenames |
| Fail2Ban integration | Stable | Auto-configured by installer; manages login bruteforce |

---

## Advanced / experimental features

| Feature | Status | Notes |
|---|---|---|
| Gateway / Reverse Proxy | Experimental | Caddy-based service exposure; VPN-only or public HTTPS |
| Apps | Preview | Catalog readable; install/manage not validated for production |
| File Drop | Preview | UI available; public link security not fully audited |
| Migration Assistant | Preview | Checklist and Phase-2 in-place upgrade helper only; VPS-to-VPS not implemented |

---

## CLI feature status

| Command | Status |
|---|---|
| `./easywg status` | Stable |
| `./easywg doctor` | Stable |
| `./easywg backup` | Stable |
| `./easywg restore` | Stable |
| `./easywg device *` | Beta |
| `./easywg dns *` | Beta |
| `./easywg monitor *` | Beta |
| `./easywg security *` | Beta |
| `./easywg notify *` | Beta |
| `./easywg proxy *` | Experimental |
| `./easywg app catalog` | Preview (catalog only) |
| `./easywg app install/remove/start/stop` | Preview (disabled) |
| `./easywg filedrop *` | Preview (disabled) |

---

## What is safe to use today

Safe for regular personal VPS use:
- WireGuard device management
- AdGuard DNS filtering
- Security Center
- Backup and restore
- Notifications
- Device Inventory
- DNS Profiles
- Monitoring

Use with care:
- Gateway / Reverse Proxy (can expose services publicly if misconfigured)

Preview only — do not rely on for critical use:
- Apps
- File Drop
- Migration Assistant
