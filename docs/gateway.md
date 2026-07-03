# Gateway / Reverse Proxy

The Gateway module lets you manage Caddy reverse proxy services from the portal UI or CLI. It allows you to expose local or VPN-internal services via a domain name — either over VPN only or publicly over HTTPS.

> Gateway is an experimental feature. Review each service carefully before enabling public exposure.

---

## How it works

Caddy is already running as part of the Easy-WG-Combo stack (it provides HTTPS for the admin portal). The Gateway module adds dynamic service routes to Caddy's configuration via its admin API.

Each service maps:
- A **domain or path** (the public entry point)
- To a **target** (the backend address, e.g. `http://127.0.0.1:3000`)
- With an **exposure mode** (VPN-only or public)

---

## Exposure modes

| Mode | Who can reach it | Use case |
|---|---|---|
| VPN-only | Only WireGuard clients | Internal tools, dashboards, dev services |
| Public HTTPS | Anyone on the internet | Services you intentionally want public |

For VPN-only mode, Caddy restricts access to the WireGuard subnet (`10.8.0.0/24` by default).

---

## Managing services

### From the portal (Advanced mode)

Open **Gateway** in the sidebar. From there you can:
- View all configured services and their status
- Add a new service (domain, target, exposure mode)
- Enable or disable a service
- Delete a service

### From the CLI

```bash
./easywg proxy list                  # List all services
./easywg proxy create                # Add a service (interactive)
./easywg proxy enable <id>           # Enable a service
./easywg proxy disable <id>          # Disable a service
./easywg proxy delete <id>           # Remove a service
./easywg proxy validate              # Validate Caddy config without applying
```

---

## Requirements

- A domain name pointed at your VPS IP (for public HTTPS with a real ACME certificate)
- `PUBLIC_HTTPS_ENABLED=yes` in `.env` so Caddy provisions real certificates (ACME via Let's Encrypt)
  - Without this, Caddy uses an internal self-signed CA — fine for VPN-only exposure, unusable for public HTTPS
- VPN-only services work without a public domain or ACME certificate

> **Xray compatibility:** When `XRAY_ENABLED=yes`, Caddy runs on port `8443` and port `443` is owned by Xray. ACME certificate provisioning still works (it uses HTTP-01 challenge on port 80, unaffected by Xray). Clients accessing public Gateway services will need to reach Caddy on `8443` — you may need a domain-level proxy or firewall rule to forward port 443 to 8443 for seamless access.

---

## Security considerations

- **Public exposure is permanent until you disable it.** Caddy will serve the route to the internet as soon as you enable it.
- The target backend is assumed to have its own authentication. Caddy does not add authentication on top.
- Prefer VPN-only exposure when possible.
- Backend enforcement: the `POST /api/proxy/services` endpoint requires Advanced interface mode — it returns `403` if called from User or Super User mode.

---

## Troubleshooting

**Service not responding after creation:**
```bash
./easywg proxy validate
./compose.sh logs caddy --tail=50
```

**Certificate not provisioned:**
- Confirm the domain resolves to your VPS IP
- Confirm port 80 is open in UFW (ACME HTTP-01 challenge)
- If Xray is not active: confirm port 443 is open; if Xray is active, Caddy is on 8443 — confirm 8443 is open
- Caddy logs will show ACME challenge failures

**Route accessible but backend returns errors:**
- Check the target is running and listening on the specified port
- Verify the target accepts connections from localhost (`127.0.0.1`) or the WireGuard interface
