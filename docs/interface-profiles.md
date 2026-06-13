# Interface Profiles

Easy-WG-Combo has three interface modes that show or hide features based on how much control you want. Switch from the **Settings** tab at any time — no reinstall, no data loss.

Default: **Super User**.

---

## User

For anyone who just needs a working VPN. No clutter, no confusion.

**What's visible:**
- Dashboard — connected devices and DNS status at a glance
- Devices — add, remove, share QR codes
- DNS Protection — pick between Standard, Malware Only, or No Filtering
- Settings — switch profile

**What's hidden:** WireGuard config, AdGuard UI, backups, monitoring, security bans, gateway, apps, file drop

---

## Super User *(default)*

For home lab admins who want full operational control without raw config files.

**Everything in User, plus:**
- DNS Profiles — create named profiles, assign per device, set timed bypass
- Backups — create and restore backups (guided restore)
- Monitoring — uptime checks, alerts
- Notifications — configure alert channels
- Security — security score, service health, TLS certificate, change password

**What's hidden:** WireGuard raw config, AdGuard admin, reverse proxy/gateway, app launcher, file drop, migration, Fail2Ban raw management, access log

---

## Advanced

For power users and developers. Everything is unlocked.

**Everything in Super User, plus:**
- WireGuard and AdGuard embedded admin UIs
- Reverse proxy / Gateway — manage Caddy services (domain → target, VPN-only or public)
- App Launcher — install curated self-hosted apps via Docker Engine API *(experimental)*
- Secure File Drop — drag-and-drop upload with expiry and password *(experimental)*
- Migration Assistant — readiness check, DNS plan, WireGuard impact analysis *(experimental)*
- Full Fail2Ban management — ban/unban IPs, whitelist, live config edit, log viewer, session revoke, access log

Switching to Advanced mode shows a confirmation dialog — it requires acknowledging the added complexity.

---

## Switching modes

1. Open the **Settings** tab from the sidebar
2. Click the mode card for the profile you want
3. For Advanced: check the confirmation box, then click Confirm
4. Click **Apply** — the interface updates immediately, no page reload needed

The selected mode is saved to `/data/portal-config.json` and persists across restarts.

---

## Backend enforcement

The profile is enforced server-side, not just in the UI. Attempts to call restricted API endpoints from outside the portal (e.g. with `curl`) return `403 Forbidden` if the current mode doesn't allow that action.

Enforced actions:

| Action | User | Super User | Advanced |
|---|---|---|---|
| Create / delete devices | ✓ | ✓ | ✓ |
| Assign DNS profile | — | ✓ | ✓ |
| Create / restore backup | — | ✓ | ✓ |
| Notifications config | — | ✓ | ✓ |
| Public gateway services | — | — | ✓ |
| App lifecycle | — | — | ✓ |
| File Drop public link | — | — | ✓ |
