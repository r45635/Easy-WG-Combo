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
- Start all three containers

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
| **Public HTTPS** | Set `PUBLIC_HTTPS_ENABLED=yes` in `.env` | Caddy auto-cert; use strong password + Fail2Ban |

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

All admin ports (8080, 51821, 3000) are bound to localhost — not reachable from the internet.

Port 53 is open on the `wg0` interface only (VPN clients get DNS).

## Architecture

| Container | Role | Binding |
|---|---|---|
| `wg-easy` v14 | WireGuard peer management | `127.0.0.1:51821` |
| `adguard` | DNS filtering | `0.0.0.0:3000`, `0.0.0.0:53` |
| `portal` | Admin UI + API | `0.0.0.0:8080` |

`adguard` and `portal` use `network_mode: host` — required for DNS on port 53 and WireGuard interface access.

`wg-easy` is pinned to `v14` — the v1.0.x line has an incompatible API rewrite.

`PASSWORD_HASH` lives in `.env.secrets` (gitignored) and is injected via shell environment — docker-compose variable interpolation mangles bcrypt `$` signs when read from `env_file:` or `.env`.
