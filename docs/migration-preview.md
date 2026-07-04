# Migration Assistant — Preview

The Migration Assistant guides you through moving your Easy-WG-Combo installation to a new VPS. It is visible in the portal under **Advanced** mode.

**Current status: preview.** The checklist and service readiness views are functional. Full assisted migration (SSH to destination, automated transfer) is not yet implemented.

---

## What is currently available

### Migration tab in the portal

The **Migration** tab shows four things:

**1. Service readiness**

Checks that all services are running before you start a migration. All four should show ✓:
- wg-easy — WireGuard peer manager
- adguard — DNS filtering
- caddy — HTTPS reverse proxy
- portal — admin portal

If any show ✗, resolve the issue before migrating. Run `./compose.sh ps` and `./easywg doctor` to diagnose.

**2. DNS records to update**

Lists any public Gateway domains currently pointing to this VPS — you will need to re-point them to the new VPS IP after migration.

If no Gateway public services are configured, this section shows "No public domains configured."

**3. WireGuard endpoint type**

- **IP address** (⚠ warning): after migration, clients will still point to the old VPS IP. You must regenerate all WireGuard configs and redistribute them.
- **Hostname**: clients will reconnect automatically once the DNS record is updated to the new VPS IP.

**4. Step-by-step migration checklist**

A 10-step guide with your actual VPS IP and domain values filled in:

1. Create a backup on the current VPS — `./easywg backup`
2. Download the backup (via the Backups tab or `scp`)
3. Install Easy-WG-Combo on the new VPS — run `install.sh`
4. Upload the backup to the new VPS
5. Run a restore dry-run — `./easywg restore --dry-run <file>`
6. Restore — `./easywg restore <file>`
7. Validate services — `./easywg health`
8. Update DNS records to the new VPS IP
9. Test WireGuard clients (regenerate configs if endpoint was an IP)
10. Decommission the old VPS once everything is verified

Use **⎘ Copy** to copy the full checklist as plain text.

### In-place upgrade helper

```bash
./easywg migrate
```

Checks your current configuration against the requirements of the current version and guides you through the in-place upgrade process. Safe to run on a live installation.

---

## What is not yet implemented

Assisted migration (future release):

- SSH connection to destination VPS from the portal
- Automated backup transfer
- DNS TTL management guidance
- Health validation on the destination before decommissioning the source

---

## Tips

- **Before migrating:** create a backup and verify it restores correctly with `--dry-run`.
- **DNS TTL:** if you use a hostname endpoint, lower the TTL 24 hours before migration so clients reconnect quickly after the DNS update.
- **WireGuard clients:** if `WG_HOST` is an IP address, plan to regenerate and redistribute all client configs after migration.
- **Xray keys:** the X25519 key pair in `.env.secrets` is included in the backup and will be restored automatically. Existing VLESS URIs will continue to work on the new VPS.
