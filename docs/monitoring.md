# Uptime Monitor

The Uptime Monitor checks your services on a configurable schedule and sends alerts when something goes down or recovers.

## Overview

- Monitors run as a background job inside the `portal` container (60-second tick).
- State is stored in `/data/monitors.json` (auto-included in backups).
- History (last 100 results per monitor) is stored in `/data/monitor-history.json`.
- Alerts are sent via the existing notification system (email + webhook — configure in the Notifications tab).

## Supported check types

| Type | Target format | What is checked |
|---|---|---|
| `http` | `http://host:port/path` | HTTP GET — expects 2xx (or `expectedStatus`) |
| `https` | `https://host/path` | HTTPS GET — expects 2xx (or `expectedStatus`) |
| `tcp` | `host:port` | TCP connection can be established |
| `dns` | `domain.name` | DNS resolves via the VPN DNS server |
| `docker` | `container-name` | Docker container is in `running` state |
| `tls` | `host:port` | TLS certificate has ≥ N days remaining |
| `wireguard` | `wg-easy` | wg-easy container is running |

## Auto-seeded defaults

On the first `GET /api/monitors` call (opening the Monitoring tab), if no monitors exist, the following are created automatically:

| Monitor | Type | Target | Notes |
|---|---|---|---|
| Portal | http | `http://127.0.0.1:<PORTAL_PORT>` | |
| wg-easy | docker | `wg-easy` | |
| AdGuard Home | docker | `adguard` | |
| Caddy | docker | `caddy` | |
| AdGuard DNS | dns | `example.com` via `127.0.0.1` | Direct DNS check to AdGuard Home |
| TLS Certificate | tls | `<WG_HOST>:443` | Only created if `WG_HOST` is set |
| Xray | docker | `xray` | Only created if `XRAY_ENABLED=yes` |

> **Note when Xray is enabled:** Port 443 is owned by Xray, not Caddy. The auto-seeded TLS Certificate monitor targets `<WG_HOST>:443` and will check the Xray Reality handshake, not a TLS certificate. To monitor the Caddy admin portal, add a custom TLS monitor targeting `<WG_HOST>:8443` (or your `CADDY_HTTPS_PORT` value).

## Using the portal UI

1. Open the **Monitoring** tab in the portal.
2. Default monitors are created on first load.
3. Use **+ Add Monitor** to add a custom check.
4. Click **▶** next to any monitor to trigger an immediate check.
5. Click **‖** to disable a monitor without deleting it.

## Using the CLI

```bash
# List all monitors with current status
./easywg monitor list

# Trigger an immediate check
./easywg monitor check <monitor-id>

# View the last 10 history results
./easywg monitor history <monitor-id>

# Add a new monitor (interactive)
./easywg monitor add

# Enable or disable
./easywg monitor enable <monitor-id>
./easywg monitor disable <monitor-id>

# Delete
./easywg monitor delete <monitor-id>
```

## API reference

All endpoints require authentication (session cookie or HTTP Basic auth).

| Method | Path | Description |
|---|---|---|
| GET | `/api/monitors` | List all monitors (seeds defaults if empty) |
| GET | `/api/monitors/:id` | Get a single monitor by ID |
| POST | `/api/monitors` | Create a monitor |
| PATCH | `/api/monitors/:id` | Update monitor fields |
| DELETE | `/api/monitors/:id` | Delete a monitor |
| POST | `/api/monitors/:id/enable` | Enable a monitor |
| POST | `/api/monitors/:id/disable` | Disable a monitor |
| POST | `/api/monitors/:id/check` | Run a check immediately |
| GET | `/api/monitors/:id/history` | Get last 100 results |

### Create / update payload

```json
{
  "name": "My service",
  "type": "http",
  "target": "https://my.service.example.com",
  "intervalSeconds": 300,
  "timeoutSeconds": 5,
  "expectedStatus": 200,
  "notify": true,
  "notifyAfterFailures": 2
}
```

### Monitor object

```json
{
  "id": "mon_abc123",
  "name": "My service",
  "type": "http",
  "target": "https://my.service.example.com",
  "intervalSeconds": 300,
  "timeoutSeconds": 5,
  "expectedStatus": 200,
  "enabled": true,
  "notify": true,
  "notifyAfterFailures": 2,
  "lastStatus": "up",
  "lastCheck": "2026-06-13T12:00:00.000Z",
  "lastSuccess": "2026-06-13T12:00:00.000Z",
  "lastFailure": null,
  "lastResponseMs": 42,
  "consecutiveFailures": 0,
  "failureCount": 0,
  "nextCheckAt": "2026-06-13T12:05:00.000Z"
}
```

## Notifications

Alerts use the existing notification system. To enable:

1. Open the **Notifications** tab in the portal sidebar.
2. Configure an email address or webhook URL.
3. Enable the notification channel.

Monitor alert events sent:

| Event | Condition |
|---|---|
| `monitor_down` | Monitor fails `notifyAfterFailures` consecutive times AND previous status was not `down` |
| `monitor_recovered` | Monitor returns `up` after being `down` |

## Backup

Monitor configuration and history are stored in `/data/monitors.json` and `/data/monitor-history.json`. Both are included automatically in the portal backup (`./easywg backup`), under `portal/data/` in the archive.

## Data file format

`/data/monitors.json` — map of monitor ID → monitor object (see above).

`/data/monitor-history.json` — map of monitor ID → array of up to 100 result objects:

```json
{
  "mon_abc123": [
    { "t": "2026-06-13T12:00:00.000Z", "ok": true, "ms": 42, "err": null },
    { "t": "2026-06-13T12:05:00.000Z", "ok": false, "ms": null, "err": "ECONNREFUSED" }
  ]
}
```

## Known Limitations

- **TLS checks on Caddy internal certificates**: Caddy uses a self-signed "Caddy Local Authority" cert by default. The TLS monitor reports this as "down" because the cert is issued to a local CA not trusted externally. This is expected — Caddy auto-renews and the monitor will recover once a real ACME cert is in place.
- **Scheduler first-tick delay**: The scheduler fires every 60 seconds from process start, not from when a monitor is created. A newly added monitor may take up to 90 seconds for its first auto-check.
- **DNS resolver container reachability**: DNS checks use `10.8.0.1` (the VPN DNS address) as the default resolver unless overridden per monitor. The auto-seeded AdGuard DNS monitor uses `127.0.0.1` (direct AdGuard Home access from the portal container). Any custom resolver must be reachable from within the portal container network.
- **History cap**: Monitor history is capped at 100 entries per monitor. Older entries are dropped automatically.
- **Notifications require configuration**: Alerts are not sent unless a notification channel (email or webhook) is configured in the **Notifications** tab. Monitoring works without it.
- **No alerting cooldown**: Once a monitor is "down", the system sends one alert and suppresses repeats until recovery. Recovery triggers a single "recovered" alert. There is currently no additional cooldown period beyond this.
