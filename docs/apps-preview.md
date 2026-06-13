# App Launcher — Preview

The App Launcher lets you install and manage curated self-hosted applications via the Docker Engine API.

**Current status: Preview only.** Catalog browsing works. Install/start/stop/remove are disabled until lifecycle safety is validated on a live deployment.

---

## App Catalog

The following 5 apps are included in the static catalog:

| ID | Name | Port | Min RAM | Description |
|---|---|---|---|---|
| `uptime-kuma` | Uptime Kuma | 3001 | 256 MB | Self-hosted uptime monitor with a clean UI |
| `ntfy` | ntfy | 8080 | 64 MB | Push notification server (HTTP + mobile) |
| `filebrowser` | File Browser | 8080 | 64 MB | Web-based file manager |
| `stirling-pdf` | Stirling PDF | 8080 | 512 MB | Local PDF toolbox (split, merge, convert) |
| `vaultwarden` | Vaultwarden | 80 | 128 MB | Bitwarden-compatible password manager |

Browse the catalog:

```bash
./easywg app catalog
```

Or in the portal under the **Apps** tab.

---

## What is not yet enabled

The following commands are disabled and return a clean exit 2:

```bash
./easywg app list
./easywg app install <id>
./easywg app start <id>
./easywg app stop <id>
./easywg app restart <id>
./easywg app logs <id>
./easywg app update <id>
./easywg app remove <id>
```

---

## What is needed before enabling

1. **Live VPS validation** — full install → start → stop → remove cycle tested on a real deployment
2. **Docker volume isolation** — each app stores data in `./apps/<id>/data/` on the host; volume mapping and permissions need testing
3. **Writable Docker socket risk review** — the portal container has access to the host Docker socket (`/var/run/docker.sock`); any action it can perform is as powerful as a root shell; the current portal requires login but this risk must be documented and accepted
4. **Public exposure safety** — apps must not be exposed publicly by default; VPN-only is the default; public mode requires explicit `confirmed: true` in the API request
5. **App data deletion confirmation** — removing an app with `deleteData: true` is irreversible; the API requires `{ confirmed: true, deleteData: true }` explicitly

---

## Security notes

- The portal's writable Docker socket is equivalent to root access on the host.
- Apps are VPN-only by default.
- Public exposure requires explicit confirmation.
- App data is never deleted without `{ deleteData: true, confirmed: true }`.
- Container images are pulled from Docker Hub on install — ensure network access and image trust.
