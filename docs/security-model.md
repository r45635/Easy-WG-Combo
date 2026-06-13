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

> The installer currently enables public HTTPS by default. Set `PUBLIC_HTTPS_ENABLED=no` in `.env` to use local-only mode.

---

## Sensitive operations and their risks

### Docker socket

The Apps module requires a writable Docker socket (`/var/run/docker.sock`). This grants the ability to create, start and remove containers — effectively root-equivalent on the host.

Apps are a preview feature. Do not enable the writable socket unless you are comfortable with this risk.

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

### SSH hardening

The `./easywg security harden-ssh` command modifies `/etc/ssh/sshd_config`. It runs safety checks and prompts for confirmation, but an incorrect configuration could lock you out. Always test SSH access in a new window before closing your existing session.

---

## Firewall model

Ports exposed to the internet by default after install:

| Port | Purpose |
|---|---|
| `22/tcp` (or `SSH_PORT`) | SSH |
| `51820/udp` | WireGuard VPN |

Additional ports when public HTTPS is enabled:

| Port | Purpose |
|---|---|
| `80/tcp` | HTTP (redirects to HTTPS) |
| `443/tcp` | HTTPS (Caddy) |

Admin ports (8080, 51821, 3000) are always bound to localhost.

Port 53 is open on the `wg0` interface only — only VPN clients can use the DNS resolver.

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
