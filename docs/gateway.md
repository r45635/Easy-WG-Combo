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

- A domain name pointed at your VPS IP (for public HTTPS with a real certificate)
- Or a subdomain of your existing admin domain
- `PUBLIC_HTTPS_ENABLED=yes` in `.env` for Caddy to be managing certificates

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
- Confirm ports 80 and 443 are open in UFW
- Caddy logs will show ACME challenge failures

**Route accessible but backend returns errors:**
- Check the target is running and listening on the specified port
- Verify the target accepts connections from localhost (`127.0.0.1`) or the WireGuard interface
