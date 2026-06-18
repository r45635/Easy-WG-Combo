# Migration Assistant — Preview

The Migration Assistant helps with two related but distinct tasks:

1. **In-place upgrade migration** (currently available) — migrate an existing Easy-WG-Combo installation to include device inventory, DNS profiles and gateway services.
2. **Full VPS-to-VPS migration** (planned, not yet implemented) — move an entire Easy-WG-Combo deployment from one VPS to another.

**Current status: in-place upgrade helper only.** The portal UI shows a Migration tab with a checklist view, but assisted VPS migration is not yet implemented.

---

## What is currently available

### In-place upgrade helper (`./easywg migrate`)

Routes to `scripts/migrate.sh`, which:
- Checks your current configuration against current feature requirements
- Guides you through the upgrade process
- Is safe to run on an existing installation

### Migration tab in the portal

The portal UI shows:
- Service readiness status
- DNS plan (domains in use and their current IP)
- WireGuard client impact analysis (IP vs hostname endpoint — affects whether clients need to update their configs)
- A numbered migration checklist with live values filled in from your current configuration

These views are read-only and safe to use.

---

## What is not yet implemented

Full VPS-to-VPS migration with assisted steps:

```text
- SSH connection to destination VPS
- WireGuard config transfer and re-activation
- AdGuard config transfer
- DNS TTL lowering and cutover
- Backup restore on destination
- Health validation post-migrate
```

---

## Planned behavior (future release)

When full VPS migration is implemented, the flow will be:

1. Create a full backup on the source VPS
2. Transfer the backup to the destination
3. Run `./install.sh` on the destination (fresh install)
4. Restore the backup
5. Lower DNS TTL 24 hours before cutover
6. Update DNS records to new VPS IP
7. Verify WireGuard clients reconnect
8. Decommission the old VPS

The Migration tab will guide through each step with live status checks.

---

## When to use `./easywg migrate` today

Run it when upgrading from early versions of Easy-WG-Combo. It is safe to run on a live deployment and will not modify WireGuard client configurations.
