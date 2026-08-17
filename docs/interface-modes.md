# Interface Modes

Easy-WG-Combo has three interface modes. Switch from the **Settings** tab at any time — no reinstall, no data loss.

The goal is simple: show only what each type of user actually needs.

---

## User — use the VPN

For anyone who just needs a working VPN and DNS protection. No clutter.

**Visible:**
- Dashboard — device count and DNS status
- Devices — add, remove, share QR codes and configs
- DNS Protection — choose between Standard, Malware Only and No Filtering
- Settings — switch interface mode

**Hidden:** everything else.

Use this mode for family members, non-technical users, or when you want a distraction-free interface.

---

## Super User — operate the appliance *(default)*

For the person managing the VPS. Full operational control without needing to touch raw config files.

**Everything in User, plus:**
- DNS Profiles — create named profiles, assign per device, set timed bypass
- Backups — create and restore backups
- Monitoring — uptime checks with alert notifications
- Notifications — configure email and webhook channels
- Security — security score, service health, TLS certificate info, change password
- VLESS+Reality (Xray) — per-device QR codes from the Devices tab; VLESS+Reality sidebar tab (if Xray is enabled)

**Hidden:** WireGuard config, AdGuard admin UI, Gateway, Apps, File Drop, Migration, raw Fail2Ban controls, access log

This is the recommended default for most users. It exposes everything needed to operate the VPS safely without exposing low-level controls that could misconfigure the system.

---

## Advanced — administer the full stack

For power users and developers who need full access.

**Everything in Super User, plus:**
- WireGuard and AdGuard embedded admin UIs
- Gateway / Reverse Proxy — manage Caddy services
- Apps — app launcher (preview)
- File Drop — secure file sharing (preview)
- Migration Assistant (preview)
- Full Fail2Ban management — ban/unban, whitelist, live config edit, log viewer
- Session management and access log viewer

Switching to Advanced shows a confirmation step — it requires acknowledging the added complexity.

---

## Switching modes

1. Open **Settings** from the sidebar
2. Click the mode card you want
3. For Advanced: check the confirmation box, then click **Enable Advanced Mode**
4. Click **Apply Mode**

The selected mode is saved to `/data/portal-config.json` and persists across restarts.

---

## Mode comparison

| | User | Super User | Advanced |
|---|---|---|---|
| Dashboard | Simplified | Full stats | Full stats + Fail2Ban details |
| Devices | ✓ | ✓ | ✓ |
| DNS Protection | Simple (3 options) | Full profiles | Full profiles |
| VLESS+Reality (Xray) | — | ✓ (if enabled) | ✓ (if enabled) |
| Backups | — | ✓ | ✓ + encrypted + dry-run |
| Monitoring | — | ✓ | ✓ |
| Notifications | — | ✓ | ✓ + raw config |
| Security | — | Overview only | Full controls |
| WireGuard UI | — | — | ✓ |
| AdGuard UI | — | — | ✓ |
| Gateway | — | — | ✓ |
| Apps | — | — | ✓ (preview) |
| File Drop | — | — | ✓ (preview) |
| Migration | — | — | ✓ (preview) |

---

## What the modes are — and are not

Interface modes are **guardrails, not access control**. Easy-WG-Combo has a single
admin credential; anyone who holds it can raise the mode and unlock every action.
What the modes give you is:

- a **blast-radius limiter** for a hijacked or shoulder-surfed session, and
- an **accident guard** against invoking dangerous operations by mistake.

They are **not** multi-user permissions. Do not treat "User mode" as a way to hand
someone limited access — they still have the full admin password.

## Backend enforcement

Restricted actions are enforced **server-side**: calling a restricted API endpoint
returns `403 Forbidden` when the current mode does not allow it (not merely hidden
in the UI). **Raising** the interface mode (e.g. User → Advanced) requires
re-entering the admin password, so a hijacked lower-mode session cannot escalate
itself; downgrades are free.

Enforced actions:

| Action | User | Super User | Advanced |
|---|---|---|---|
| Create / delete devices | ✓ | ✓ | ✓ |
| Create / restore / delete backup | — | ✓ | ✓ |
| Configure notifications | — | ✓ | ✓ |
| Manage monitors (create/edit/run) | — | ✓ | ✓ |
| Raw security logs | — | — | ✓ |
| Advanced security / firewall | — | — | ✓ |
| Public gateway services | — | — | ✓ |
| App lifecycle | — | — | ✓ |
| File Drop public link | — | — | ✓ |
