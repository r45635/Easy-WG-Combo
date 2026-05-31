# Easy-WG-Combo

Self-hosted VPN stack: WireGuard + AdGuard Home + custom admin portal.

## Stack

| Service | Role | Access |
|---|---|---|
| wg-easy | WireGuard management | via portal iframe |
| AdGuard Home | DNS filtering (ads + malware) | via portal iframe |
| Portal | Unified admin UI | `localhost:8080` via SSH tunnel |

## Features

- Create WireGuard clients with DNS level choice (filtered / malware-only / no filter)
- QR code generation for mobile onboarding
- Unified dashboard: clients status + AdGuard stats
- Full wg-easy and AdGuard UIs embedded in tabs

## Quick start

```bash
cp .env.example .env
# Edit .env with your VPS IP and password

# Generate wg-easy password hash
docker run --rm ghcr.io/wg-easy/wg-easy wgpw 'yourpassword'
# Paste the hash into WG_EASY_PASSWORD_HASH in .env

docker compose up -d
```

## Admin access (SSH tunnel)

```bash
ssh -i ~/.ssh/your_key \
  -L 8080:localhost:8080 \
  -L 51821:localhost:51821 \
  -L 3000:localhost:3000 \
  -N root@YOUR_VPS_IP
```

Then open: `http://localhost:8080`

## DNS presets

| Preset | DNS | Description |
|---|---|---|
| Filtered | `10.8.0.1` | AdGuard on VPS — blocks ads + malware |
| Malware only | `1.1.1.2` | Cloudflare for Families |
| No filter | `1.1.1.1` | Direct Cloudflare |

## Firewall (UFW)

Only two public ports needed:
- `22/tcp` — SSH
- `51820/udp` — WireGuard VPN

All admin UIs are localhost-only, accessible via SSH tunnel.
