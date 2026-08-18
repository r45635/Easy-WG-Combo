# Advanced install & reference

> New to VPS/Linux? Start with the **[beginner guide](setup.md)** instead — it walks you from an empty VPS to a working VPN. This page is the install/configuration reference for people who want to control every option.

## Recommended VPS

1 vCPU / 1 GB RAM / 25 GB SSD is sufficient. Debian 12/13 or Ubuntu 24.04+ LTS. Any provider works; see the [beginner guide](setup.md#1-get-a-vps) for provider examples.

## Install methods

### One-command install

Run this on your VPS as root:

```bash
export WG_HOST=YOUR_VPS_IP ADMIN_PASSWORD='your-strong-password'
curl -fsSL https://raw.githubusercontent.com/r45635/Easy-WG-Combo/refs/heads/main/install.sh | bash
```

The installer will:
- Install Docker, Docker Compose, UFW, Caddy, Fail2Ban
- Create `.env` and `.env.secrets`
- Generate the WireGuard password hash
- Apply firewall rules
- Start all four containers (wg-easy, adguard, portal, caddy)

By default the admin portal is **local-only** (reachable via SSH tunnel — see below). Public HTTPS is opt-in.

> Passwords must be at least **12 characters** (16+ recommended) and must not contain a `$` (Docker Compose interprets it in `.env`).

### Interactive install

Download and run locally for guided prompts:

```bash
curl -fsSLO https://raw.githubusercontent.com/r45635/Easy-WG-Combo/refs/heads/main/install.sh
chmod +x install.sh
./install.sh
```

Prompts (all have sensible defaults, just press Enter):

1. `Run Docker prune cleanup before deployment? [Y/n]` — recommended on a fresh VPS
2. If an existing install is detected: `Action (k/n)` — `k` = keep config, `n` = fresh start (auto-backup first)
3. `Server name` — shown in the portal UI and in generated `.conf` filenames
4. `WireGuard public UDP port [51820]`
5. `Expose the admin portal on public HTTPS? [y/N]` — default **No** (local-only)

### Non-interactive / CI install

Set all variables before running:

```bash
export WG_HOST=YOUR_VPS_IP
export ADMIN_PASSWORD='your-strong-password'
export SERVER_NAME=vpn_toronto
export SSH_PORT=22
export PUBLIC_HTTPS_ENABLED=no      # default; set to yes to expose the portal publicly
export EXISTING_CONFIG_ACTION=keep  # or 'new' on first run
export PRUNE_BEFORE_DEPLOY=yes
curl -fsSL https://raw.githubusercontent.com/r45635/Easy-WG-Combo/refs/heads/main/install.sh | bash
```

Other optional install variables: `ADMIN_DOMAIN`, `TLS_EMAIL`, `MIN_FREE_MB`, `BACKUP_DIR`, `FAIL2BAN_JAIL`, `FAIL2BAN_MAXRETRY`, `FAIL2BAN_FINDTIME`, `FAIL2BAN_BANTIME`.

> `WG_EASY_PASSWORD` and `ADGUARD_PASSWORD` are **not** read by the installer — they are runtime overrides. To pin a backend credential independently of `ADMIN_PASSWORD`, add it to `.env` by hand (e.g. `ADGUARD_PASSWORD=...`) and re-run `./compose.sh up -d`.

### Manual install (already have the repo)

```bash
# 1. Configure
cp .env.example .env
# Edit .env: set WG_HOST, ADMIN_PASSWORD, ports

# 2. Generate bcrypt hash for wg-easy
docker run --rm ghcr.io/wg-easy/wg-easy:14 wgpw 'your-strong-password'
# Copy output into .env.secrets:
echo "export PASSWORD_HASH='<hash>'" > .env.secrets

# 3. Start
./compose.sh up -d
```

**Always use `./compose.sh`**, never `docker compose` directly. `compose.sh` injects `PASSWORD_HASH` from `.env.secrets` — docker-compose would mangle the bcrypt `$` signs.

## HTTPS / admin exposure

The admin portal is **local-only by default**: it is bound to localhost and reachable only through an SSH tunnel. Public HTTPS is **opt-in**.

| Mode | How | Security |
|---|---|---|
| **SSH tunnel** *(default, safest)* | `ssh -L 19080:localhost:8080 -N root@YOUR_VPS_IP` then open `http://localhost:19080` | No admin port reachable from the internet |
| **Public HTTPS** *(opt-in)* | Set `PUBLIC_HTTPS_ENABLED=yes` in `.env`, or answer `y` to the install prompt | Caddy ACME cert (or self-signed for a bare IP / no `TLS_EMAIL` / a domain that doesn't point here); use a strong password + Fail2Ban, ideally restrict by IP |

> If you changed the SSH port (`SSH_PORT`), add `-p <port>` to the tunnel command, e.g. `ssh -p 2222 -L 19080:localhost:8080 -N root@YOUR_VPS_IP`.

**A domain is optional.** If you only have an IP, leave `ADMIN_DOMAIN` unset — the installer falls back to `WG_HOST` and serves a self-signed certificate on that IP. The install completes normally; you just accept the browser warning once.

For a **warning-free certificate**, set `ADMIN_DOMAIN` to an FQDN that points to this VPS **and** set `TLS_EMAIL`. The installer verifies the domain actually resolves here before requesting a Let's Encrypt certificate — if it points elsewhere (typo, DNS not propagated), it automatically falls back to a self-signed cert and tells you what to fix, so a wrong domain never blocks the install.

## Fail2Ban defaults

Installed and configured automatically. Monitors login failures on `/api/login` from Caddy access logs.

| Variable | Default |
|---|---|
| `FAIL2BAN_JAIL` | `easy-wg-portal` |
| `FAIL2BAN_MAXRETRY` | `5` |
| `FAIL2BAN_FINDTIME` | `10m` |
| `FAIL2BAN_BANTIME` | `1h` |

## Backups

Written to `./backups/<timestamp>` by default. Override with `BACKUP_DIR=/your/path`. Guided restore is available from the portal UI (Super User / Advanced mode); full restore in Advanced mode.

## Password rotation

Run `./easywg passwd` on the server — it updates the portal login, the wg-easy password hash (unless `WG_EASY_PASSWORD` is configured independently, in which case wg-easy's credential is left untouched), and pins `ADGUARD_PASSWORD` so the AdGuard proxy keeps working. Passwords must be at least **12 characters** (16+ recommended) and must not contain `$`. Changing the password inside the portal UI only affects the portal login.

## Firewall (UFW)

Ports opened automatically by the installer:

| Port | Purpose |
|---|---|
| `22/tcp` (or `SSH_PORT`) | SSH |
| `51820/udp` | WireGuard VPN |
| `80/tcp`, `443/tcp` | Public HTTPS — **only** when `PUBLIC_HTTPS_ENABLED=yes` |
| `53/udp+tcp` from `172.16.0.0/12` | AdGuard DNS reachable from the Docker bridge |

When Xray is enabled (`XRAY_ENABLED=yes`), the installer also opens (subject to the same public/local-only choice for the portal port):

| Port | Purpose |
|---|---|
| `443/tcp` | VLESS+Reality tunnel (Xray takes over from Caddy) |
| `8443/tcp` | HTTPS admin portal — opened only when public HTTPS is enabled; otherwise the portal binds to `127.0.0.1:8443` (tunnel) |
| `80/tcp` | Opened only with a real domain + `TLS_EMAIL` — Let's Encrypt HTTP-01 challenge (TLS-ALPN-01 is impossible since Xray owns 443) |

All admin ports (8080, 51821, 3000) are bound to localhost — not reachable from the internet.

Port 53 is exposed only on the VPN interface (wg0, inside the wg-easy container). VPN clients send DNS to `10.8.0.1`, which is forwarded via iptables DNAT inside the container to AdGuard Home running on the host.

## Architecture

| Container | Network | Role | Admin access |
|---|---|---|---|
| `wg-easy` v14 | Docker bridge | WireGuard peer management | `127.0.0.1:51821` |
| `adguard` | host | DNS filtering + AdGuard UI | `127.0.0.1:3000`, `0.0.0.0:53` |
| `portal` | host | Admin UI + API | `127.0.0.1:8080` |
| `caddy` | host | HTTPS reverse proxy | `80/443` public, or `127.0.0.1:8443` local-only under Xray |
| `xray` *(optional)* | host | VLESS+Reality DPI-resistant tunnel | `0.0.0.0:443` (when `XRAY_ENABLED=yes`) |

`adguard`, `portal`, and `caddy` use `network_mode: host` — AdGuard needs port 53 on the host; Caddy needs ports 80/443 for ACME (or `8443` + port 80 for the HTTP-01 challenge when Xray takes 443).

`wg-easy` runs in a Docker bridge network. Its `wg0` interface (`10.8.0.1`) is inside the container. DNS queries from VPN clients arrive on `wg0` and are DNAT'd to the Docker bridge gateway (`172.18.x.1`) where AdGuard listens.

`wg-easy` is pinned to `v14` — the v1.0.x line has an incompatible API rewrite.

`PASSWORD_HASH` lives in `.env.secrets` (gitignored) and is injected via the shell environment — docker-compose variable interpolation mangles bcrypt `$` signs when read from `env_file:` or `.env`.

The `xray` container is added automatically by `compose.sh` when `XRAY_ENABLED=yes` in `.env`. Enable it by re-running `./bootstrap.sh` after setting the flag. See [Xray documentation](xray.md).

## Updating an existing installation

```bash
cd ~/Easy-WG-Combo
./easywg update
```

The command is safe by construction:

1. Refuses to run if the checkout has local changes (commit, discard, or `git stash` them first — your `.env`, `.env.secrets` and data directories are gitignored and never affected).
2. `git pull --ff-only` — never rewrites local history.
3. `./compose.sh pull` — refreshes the version-pinned container images (images are otherwise **never** updated after install).
4. `./compose.sh up -d --build` — rebuilds the portal and restarts only what changed.
5. Runs a service health check.

Re-running the install one-liner does the same update when it detects an existing installation. WireGuard stays pinned to wg-easy v14. See [CHANGELOG.md](../CHANGELOG.md) for version history.

## See also

- [Security model](security-model.md) · [Monitoring](monitoring.md) · [Gateway](gateway.md) · [Xray](xray.md) · [Interface modes](interface-modes.md) · [Troubleshooting](troubleshooting.md)
