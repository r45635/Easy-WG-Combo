# Easy-WG-Combo

Personal VPN on your own server, ready in one command.
WireGuard + AdGuard DNS filtering + a clean admin portal — all self-hosted, no subscription.

## What you get

![Easy-WG-Combo dashboard](docs/screenshots/dashboard.png)

- **VPN in minutes** — create clients with QR codes instantly, share with anyone
- **DNS protection** — block ads and malware per device, switch presets without reconnecting
- **Three UI levels** — from simple (just connect devices) to full control (raw config, apps, gateway)
- **Secure by default** — Fail2Ban, SSH-tunnel-only admin, HTTPS with auto certificate
- **Backups, monitoring, notifications** — built-in, no third-party tools needed
- **Multilingual** — English, French, Chinese

## Interface modes

Switch from the **Settings** tab at any time. No reinstall needed.

| Mode | Who it's for | What you see |
|---|---|---|
| **User** | Anyone who just needs VPN | Connect devices, change DNS protection |
| **Super User** *(default)* | Home lab admin | Everything above + backups, monitoring, notifications, security overview |
| **Advanced** | Power user / developer | Full access: WireGuard config, reverse proxy, app launcher, file drop, migration |

→ [Interface profiles reference](docs/interface-profiles.md)

## Quick start

Requires a fresh Debian 12 or Ubuntu 24.04 VPS (1 vCPU / 1 GB RAM is enough).

```bash
export WG_HOST=YOUR_VPS_IP ADMIN_PASSWORD='yourpassword'
curl -fsSL https://raw.githubusercontent.com/r45635/Easy-WG-Combo/refs/heads/main/install.sh | bash
```

The installer handles Docker, UFW, certificates, and starts everything automatically.

→ [Full setup guide](docs/setup.md) — sizing, options, manual install, non-interactive mode

## Access the admin portal

The admin interface is localhost-only. Open a tunnel, then open your browser.

```bash
ssh -i ~/.ssh/your_key -L 19080:localhost:8080 -N root@YOUR_VPS_IP
```

Then open: `http://localhost:19080`

## More screenshots

<details>
<summary>VPN Clients</summary>

![Easy-WG-Combo clients view](docs/screenshots/clients.png)
</details>

<details>
<summary>Security</summary>

![Easy-WG-Combo security tab](docs/screenshots/security.png)
![Easy-WG-Combo security — sessions & TLS](docs/screenshots/security-sessions.png)
![Easy-WG-Combo security — logs](docs/screenshots/security-logs.png)
</details>

<details>
<summary>WireGuard & AdGuard embedded views</summary>

![WireGuard view](docs/screenshots/wireguard-view.png)
![AdGuard Home view](docs/screenshots/adguard-view.png)
</details>

## CLI

All features are also available from the terminal:

```bash
./easywg status           # System health
./easywg backup           # Create a backup
./easywg device list      # List WireGuard devices
./easywg monitor list     # List uptime monitors
```

Run `./easywg help` for the full list.

## Documentation

- [Setup guide](docs/setup.md) — bootstrap options, manual install, env variables, Fail2Ban, firewall
- [Interface profiles](docs/interface-profiles.md) — User / Super User / Advanced breakdown
- [Monitoring](docs/monitoring.md) — uptime checks reference
- [Phase 3 status](docs/phase-3-status.md) — experimental features (App Launcher, File Drop, Migration)
