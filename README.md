# Easy-WG-Combo

Self-hosted VPN stack: WireGuard + AdGuard Home + custom admin portal.

## Stack

| Container | Role | Port (internal) |
|---|---|---|
| `wg-easy` v14 | WireGuard peer management | `127.0.0.1:51821` |
| `adguard` | DNS filtering (ads + malware) | `0.0.0.0:3000`, `0.0.0.0:53` |
| `portal` | Unified admin UI + API | `0.0.0.0:8080` |

All admin UIs are localhost-only. Access via SSH tunnel.

## Features

- **Dashboard** — connected clients, AdGuard stats (queries, blocked rate)
- **Create client** — DNS preset choice + QR code displayed immediately
- **Change DNS filter** — instant per-client filter change via AdGuard API (no reconnection needed)
- **DNS presets** — Filtered / Malware-only / No filter, with help modal
- **Auto DNS discovery** — existing clients' DNS presets detected on first load
- **WireGuard & AdGuard UIs** — embedded as iframes for advanced config

## Quick start

```bash
# 1. Clone
git clone https://github.com/r45635/Easy-WG-Combo.git
cd Easy-WG-Combo

# 2. Configure
cp .env.example .env
# Edit .env: set WG_HOST, ADMIN_PASSWORD, ports

# 3. Set wg-easy password hash (bcrypt — $ signs break docker-compose interpolation)
docker run --rm ghcr.io/wg-easy/wg-easy:14 wgpw 'yourpassword'
# Copy the output into .env.secrets:
echo "export PASSWORD_HASH='<paste hash here>'" > .env.secrets

# 4. Start
./compose.sh up -d
```

> **Always use `./compose.sh`**, not `docker compose` directly.
> `compose.sh` sources `.env.secrets` which sets `PASSWORD_HASH` in the shell environment,
> bypassing docker-compose's variable interpolation that would mangle the bcrypt hash.

## Admin access (SSH tunnel)

Recommend using non-standard local ports to avoid conflicts with local dev tools:

```bash
ssh -i ~/.ssh/your_key \
  -L 19080:localhost:8080 \
  -L 19821:localhost:51821 \
  -L 19300:localhost:3000 \
  -N root@YOUR_VPS_IP
```

Then open: `http://localhost:19080`

## DNS filter presets

| Preset | Behavior | DNS used |
|---|---|---|
| Filtered | Blocks ads + malware via AdGuard lists | `10.8.0.1` → AdGuard global |
| Malware only | Malware blocked, ads allowed | `10.8.0.1` → upstream `1.1.1.2` |
| No filter | Nothing blocked, direct DNS | `10.8.0.1` → upstream `1.1.1.1` |

**Changing filter for a connected client:** click ⚙ in the client table — takes effect immediately via AdGuard per-client settings API. Persistent across reconnections.

## Architecture notes

- `PASSWORD_HASH` in `.env.secrets` (gitignored) — bcrypt `$` signs are mangled by docker-compose variable interpolation whether in `environment:`, `env_file:`, or `.env`. Shell env pass-through (`- PASSWORD_HASH` without value) is the only reliable method.
- `adguard` and `portal` use `network_mode: host` to share the host network stack (required for DNS on port 53 and WireGuard interface access).
- `wg-easy` pinned to `v14` — v1.0.x has an incompatible API rewrite.
- DNS auto-discovery: on first `/api/clients` call, portal fetches WireGuard configs for unknown clients and extracts their DNS line.

## Firewall (UFW)

Public ports:
- `22/tcp` — SSH
- `51820/udp` — WireGuard VPN

Port 53 open on `wg0` interface only (WireGuard clients).
All admin ports (8080, 51821, 3000) bound to localhost.
