# Setup Guide

## Recommended VPS

1 vCPU / 1 GB RAM / 25 GB SSD is sufficient. Debian 12 or Ubuntu 24.04 LTS.

If you want a quick option, Vultr's $5/month plan in any region works well:
https://www.vultr.com/?ref=8489819

## One-command install

Run this on your VPS as root:

```bash
export WG_HOST=YOUR_VPS_IP ADMIN_PASSWORD='yourpassword'
curl -fsSL https://raw.githubusercontent.com/r45635/Easy-WG-Combo/refs/heads/main/install.sh | bash
```

The installer will:
- Install Docker, Docker Compose, UFW, Caddy, Fail2Ban
- Create `.env` and `.env.secrets`
- Generate the WireGuard password hash
- Apply firewall rules
- Start all four containers (wg-easy, adguard, portal, caddy)

## Interactive install

Download and run locally for guided prompts:

```bash
curl -fsSLO https://raw.githubusercontent.com/r45635/Easy-WG-Combo/refs/heads/main/install.sh
chmod +x install.sh
./install.sh
```

Prompts (all have sensible defaults, just press Enter):

1. `Run Docker prune cleanup before deployment? [Y/n]` — recommended on fresh VPS
2. If existing install detected: `Action (k/n)` — `k` = keep config, `n` = fresh start (auto-backup first)
3. `Server name` — shown in the portal UI and in generated `.conf` filenames
4. `WireGuard public UDP port [51820]`

## Non-interactive / CI install

Set all variables before running:

```bash
export WG_HOST=YOUR_VPS_IP
export ADMIN_PASSWORD='yourpassword'
export SERVER_NAME=vpn_toronto
export SSH_PORT=22
export EXISTING_CONFIG_ACTION=keep   # or 'new' on first run
export PRUNE_BEFORE_DEPLOY=yes
curl -fsSL https://raw.githubusercontent.com/r45635/Easy-WG-Combo/refs/heads/main/install.sh | bash
```

Other optional variables: `ADMIN_DOMAIN`, `TLS_EMAIL`, `MIN_FREE_MB`, `BACKUP_DIR`, `FAIL2BAN_JAIL`, `FAIL2BAN_MAXRETRY`, `FAIL2BAN_FINDTIME`, `FAIL2BAN_BANTIME`.

## Manual install (already have the repo)

```bash
# 1. Configure
cp .env.example .env
# Edit .env: set WG_HOST, ADMIN_PASSWORD, ports

# 2. Generate bcrypt hash for wg-easy
docker run --rm ghcr.io/wg-easy/wg-easy:14 wgpw 'yourpassword'
# Copy output into .env.secrets:
echo "export PASSWORD_HASH='<hash>'" > .env.secrets

# 3. Start
./compose.sh up -d
```

**Always use `./compose.sh`**, never `docker compose` directly. `compose.sh` injects `PASSWORD_HASH` from `.env.secrets` — docker-compose would mangle the bcrypt `$` signs.

## HTTPS / admin exposure

| Mode | How | Security |
|---|---|---|
| **SSH tunnel** *(default, safest)* | `ssh -L 19080:localhost:8080 ...` | No admin port reachable from internet |
| **Public HTTPS** | Set `PUBLIC_HTTPS_ENABLED=yes` in `.env` | Caddy ACME cert (or self-signed if using IP / no `TLS_EMAIL`); use strong password + Fail2Ban |

Public HTTPS is enabled by default in the installer. Check your `.env` to confirm.

When enabled, set `ADMIN_DOMAIN` (recommended) or the installer falls back to `WG_HOST`. `TLS_EMAIL` is optional for ACME registration.

## Fail2Ban defaults

Installed and configured automatically. Monitors login failures on `/api/login` from Caddy access logs.

| Variable | Default |
|---|---|
| `FAIL2BAN_JAIL` | `easy-wg-portal` |
| `FAIL2BAN_MAXRETRY` | `5` |
| `FAIL2BAN_FINDTIME` | `10m` |
| `FAIL2BAN_BANTIME` | `1h` |

## Backups

Written to `./backups/<timestamp>` by default. Override with `BACKUP_DIR=/your/path`.

Guided restore available from the portal UI (Super User / Advanced mode). Full restore available in Advanced mode.

## Firewall (UFW)

Ports opened automatically by the installer:

| Port | Purpose |
|---|---|
| `22/tcp` (or `SSH_PORT`) | SSH |
| `51820/udp` | WireGuard VPN |
| `80/tcp`, `443/tcp` | HTTPS (only when `PUBLIC_HTTPS_ENABLED=yes`) |
| `53/udp+tcp` from `172.16.0.0/12` | AdGuard DNS reachable from Docker bridge |

When Xray is enabled (`XRAY_ENABLED=yes`), the installer also opens:

| Port | Purpose |
|---|---|
| `443/tcp` | VLESS+Reality tunnel (Xray takes over from Caddy) |
| `8443/tcp` | HTTPS admin portal (Caddy moves to this port) |

All admin ports (8080, 51821, 3000) are bound to localhost — not reachable from the internet.

Port 53 is exposed to the internet only on the VPN interface (wg0, inside the wg-easy container). VPN clients send DNS to `10.8.0.1`, which is forwarded via iptables DNAT inside the container to AdGuard Home running on the host.

## Architecture

| Container | Network | Role | Admin access |
|---|---|---|---|
| `wg-easy` v14 | Docker bridge | WireGuard peer management | `127.0.0.1:51821` |
| `adguard` | host | DNS filtering + AdGuard UI | `127.0.0.1:3000`, `0.0.0.0:53` |
| `portal` | host | Admin UI + API | `127.0.0.1:8080` |
| `caddy` | host | HTTPS reverse proxy | `0.0.0.0:80/443` (or `8443` when Xray active) |
| `xray` *(optional)* | host | VLESS+Reality DPI-resistant tunnel | `0.0.0.0:443` (when `XRAY_ENABLED=yes`) |

`adguard`, `portal`, and `caddy` use `network_mode: host` — AdGuard needs port 53 on the host; Caddy needs ports 80/443 for ACME (or 8443 when Xray takes 443).

`wg-easy` runs in a Docker bridge network. Its `wg0` interface (`10.8.0.1`) is inside the container. DNS queries from VPN clients arrive on `wg0` and are DNAT'd to the Docker bridge gateway (`172.18.x.1`) where AdGuard listens.

`wg-easy` is pinned to `v14` — the v1.0.x line has an incompatible API rewrite.

`PASSWORD_HASH` lives in `.env.secrets` (gitignored) and is injected via shell environment — docker-compose variable interpolation mangles bcrypt `$` signs when read from `env_file:` or `.env`.

The `xray` container is added automatically by `compose.sh` when `XRAY_ENABLED=yes` in `.env`. Enable it by re-running `./bootstrap.sh` after setting the flag. See [Xray documentation](xray.md) for full setup instructions.
