# Security Model

## What the portal is

The Easy-WG-Combo portal is a privileged local admin component. It can:
- Manage WireGuard peers
- Control AdGuard DNS settings
- Manage Caddy reverse proxy configuration
- Read and write system-level configuration files
- Interact with Docker via its socket (for Apps and container health checks)
- Execute Fail2Ban commands
- Read SSH and firewall configuration

Treat the portal like root access to your VPS. Protect it accordingly.

---

## Admin exposure modes

### Local-only (recommended)

The portal, wg-easy and AdGuard Home bind to localhost only. Access requires an SSH tunnel.

```bash
ssh -i ~/.ssh/your_key -L 19080:localhost:8080 -N root@YOUR_VPS_IP
```

No admin port is reachable from the internet. An attacker would need SSH access first.

### Public HTTPS

The portal is exposed over HTTPS via Caddy (`PUBLIC_HTTPS_ENABLED=yes` in `.env`).

This is convenient for remote access without an SSH client, but it increases the attack surface:
- The login endpoint is reachable from the internet
- Fail2Ban protects it but is not a substitute for a strong password
- Brute-force is limited but possible

**If you use public HTTPS:**
- Use a strong, unique password (20+ characters)
- Keep Fail2Ban active (enabled by default)
- Consider restricting by IP in Caddy if your IP is stable
- Use a real domain with ACME certificates rather than `WG_HOST` fallback

> The installer defaults to local-only (`PUBLIC_HTTPS_ENABLED=no`); the admin portal is reachable only via SSH tunnel / VPN. Set `PUBLIC_HTTPS_ENABLED=yes` (or answer the install prompt) to expose it on public HTTPS.

### Public HTTPS with Xray enabled

When `XRAY_ENABLED=yes`, Xray takes over port 443. Caddy moves to `CADDY_HTTPS_PORT` (default `8443`). In this configuration:

- With a real domain (`ADMIN_DOMAIN` FQDN) + `TLS_EMAIL`, the portal is at `https://<your-domain>:8443` with a **valid Let's Encrypt certificate** (issued via HTTP-01 on port 80, since Xray owns 443). Access is by hostname only — a public cert cannot cover a bare IP.
- With a bare IP or no `TLS_EMAIL`, the portal is at `https://<VPS_IP>:8443` using Caddy's internal **self-signed** certificate (browser warning on first access).
- The login page is still protected by Fail2Ban via Caddy access logs
- Port 443 is fully owned by the Xray VLESS+Reality service — traffic on that port is not admin traffic

This reduces exposure (the admin interface is not on a well-known port, and traffic analysis cannot easily distinguish it from standard HTTPS) but is **not** a security boundary on its own — it is obscurity, not hardening. When exposed publicly, still use a strong password, keep Fail2Ban active, and prefer restricting access by IP. Note the portal opens `:8443` only when `PUBLIC_HTTPS_ENABLED=yes`; with it off, the portal binds to loopback and Xray still serves VLESS on `:443`.

---

## Sensitive operations and their risks

### Docker socket

The Apps module requires a writable Docker socket (`/var/run/docker.sock`). This grants the ability to create, start and remove containers — effectively root-equivalent on the host.

Apps are a preview feature. Do not enable the writable socket unless you are comfortable with this risk.

### Firewall management (UFW)

The portal container is granted `NET_ADMIN` and a writable `/etc/ufw` mount so that the **Server Endpoint** feature can open port 80 (`ufw allow 80/tcp`) for the Let's Encrypt HTTP-01 challenge when you switch to a public certificate while Xray owns port 443. This lets the portal modify the host firewall. Given the portal already holds the Docker socket (root-equivalent), this does not raise the privilege ceiling, but it is called out here for transparency. If the `ufw` call fails, the portal falls back to a clear warning and the certificate stays self-signed until you open port 80 manually.

### Gateway / Reverse Proxy

Caddy services can expose VPN-internal services or the VPS itself to the public internet over HTTPS. Before exposing a service:
- Confirm the target service has its own authentication
- Prefer VPN-only exposure over public exposure where possible
- Review the service's security posture

### File Drop

Public file drop links are accessible without a VPN connection. Anyone with the link can download the file.

- Always set an expiry date and password for public links
- Do not use File Drop for sensitive files unless you understand the exposure model
- File Drop is a preview feature and has not been fully security-audited

### Backups

Backup archives contain:
- WireGuard private and public keys
- AdGuard Home configuration (including upstream DNS)
- Portal configuration (SMTP passwords, webhook URLs, DNS profile data)

Store backups securely. Do not leave them in a world-readable location.

### Xray VLESS+Reality

When Xray is enabled, `.env.secrets` contains the X25519 private key used for the Reality handshake. Exposing this key allows an attacker to impersonate the server. Treat it like any other private key — do not commit it to version control, and rotate it by re-running `./bootstrap.sh`.

Each device has its own VLESS UUID. Revoking a device removes its UUID from `xray/config.json` and restarts the Xray container, invalidating that device's tunnel access immediately.

### SSH hardening

The `./easywg security harden-ssh` command modifies `/etc/ssh/sshd_config`. It runs safety checks and prompts for confirmation, but an incorrect configuration could lock you out. Always test SSH access in a new window before closing your existing session.

---

## Firewall model

Ports exposed to the internet by default after install:

| Port | Purpose |
|---|---|
| `22/tcp` (or `SSH_PORT`) | SSH |
| `51820/udp` | WireGuard VPN |

Additional ports when public HTTPS is enabled (`PUBLIC_HTTPS_ENABLED=yes`):

| Port | Purpose |
|---|---|
| `80/tcp` | HTTP (redirects to HTTPS) |
| `443/tcp` | HTTPS (Caddy) |

When Xray is enabled (`XRAY_ENABLED=yes`), the port assignment changes:

| Port | Purpose |
|---|---|
| `443/tcp` | VLESS+Reality tunnel (Xray) — takes over from Caddy |
| `8443/tcp` | HTTPS admin portal (Caddy moves here when Xray is active) |

> When Xray is enabled, Caddy vacates port 443 and listens on `CADDY_HTTPS_PORT` (default `8443`). Port 443 is fully owned by Xray.

Admin ports (8080, 51821, 3000) are always bound to localhost.

Port 53 is exposed on the VPN interface (`wg0` inside the wg-easy container) and on the Docker bridge network (for internal forwarding). VPN client DNS queries are DNAT'd from `wg0` to AdGuard Home on the host; the bridge subnet is allowed through UFW. Port 53 is not exposed publicly on the host's external interface.

---

## Authentication

- Single admin user with a password set in `.env`
- Cookie-based sessions; all API routes require authentication
- Fail2Ban monitors `/api/login` for failed attempts (configured via Caddy access logs)
- Sessions can be reviewed and revoked from the Security tab (Advanced mode)

Default Fail2Ban thresholds: 5 failed attempts within 10 minutes → 1 hour ban.

---

## What is not in scope

Easy-WG-Combo is a personal appliance tool, not a security product. It does not provide:
- Certificate pinning
- Multi-factor authentication
- Role-based access control (single admin user only)
- Audit logging for all portal actions
- Intrusion detection beyond Fail2Ban
- WAF or DDoS protection
