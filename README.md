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
- **Multilingual portal UI** — language switcher with full interface coverage in **English, French, and Chinese**

## Screenshots

### Aggregated dashboard

![Easy-WG-Combo dashboard](docs/screenshots/dashboard.png)

### Integrated WireGuard view

![Easy-WG-Combo WireGuard view](docs/screenshots/wireguard-view.png)

### Integrated AdGuard Home view

![Easy-WG-Combo AdGuard Home view](docs/screenshots/adguard-view.png)

## Quick start

### Recommended VPS

If you want to spin up a VPN server quickly, a Vultr VPS is a good fit for this project. The link below is part of a referral program, so it may also help you earn credits depending on Vultr's terms:

https://www.vultr.com/?ref=8489819

Example configuration to use in the docs or for a new deployment: the basic Vultr plan at $5/month, located in Toronto, with 1 vCPU, 1 GB of RAM, 25 GB SSD, and about 4.22 GB of bandwidth used over the reference period. For the OS, use Debian 12 or Ubuntu 24.04 LTS.

Example baseline server sizing:

- vCPU/s: 1 vCPU
- RAM: 1024 MB
- Storage: 25 GB SSD
- Bandwidth: 4.22 GB

### First-time VPS bootstrap

From a fresh Debian/Ubuntu VPS, you can run everything with a single download-and-execute command:

```bash
export WG_HOST=YOUR_VPS_IP ADMIN_PASSWORD='yourpassword' SSH_PORT=22
curl -fsSL https://raw.githubusercontent.com/r45635/Easy-WG-Combo/main/install.sh | bash
```

If you prefer interactive prompts, download then run the script locally on the VPS:

```bash
curl -fsSLO https://raw.githubusercontent.com/r45635/Easy-WG-Combo/main/install.sh
chmod +x install.sh
./install.sh
```

If you already cloned the repository on the VPS, you can run the bootstrap directly:

```bash
sudo ./bootstrap.sh
```

When existing containers/data are detected, the bootstrap now asks what to do:
- `keep` — keep existing configuration and just start/restart the stack
- `new` — start a new configuration (a backup is created first)

For non-interactive runs, set the action explicitly:

```bash
export EXISTING_CONFIG_ACTION=new
curl -fsSL https://raw.githubusercontent.com/r45635/Easy-WG-Combo/main/install.sh | bash
```

Backups are written to `./backups/<timestamp>` inside the project directory by default.
You can override the destination with `BACKUP_DIR=/your/path`.

The script will install Docker, Docker Compose, UFW, and the small host dependencies this stack needs, then it will create `.env` and `.env.secrets`, generate the `wg-easy` password hash, apply the host forwarding/firewall settings, and start the stack.

If you want to override the defaults non-interactively, you can pass the values inline:

```bash
sudo WG_HOST=YOUR_VPS_IP ADMIN_PASSWORD='yourpassword' SSH_PORT=22 ./bootstrap.sh
```

### Manual setup

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
