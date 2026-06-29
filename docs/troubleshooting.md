# Troubleshooting

Run `./easywg doctor` first — it checks containers, API reachability, firewall and feature availability and reports specific failures.

---

## Portal is not reachable

**Symptom:** Browser shows "connection refused" or the page does not load.

Check containers:
```bash
./compose.sh ps
./compose.sh logs portal --tail=50
```

Check the portal is listening:
```bash
curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8080/
```

If the container is running but the API returns errors, check the portal logs for startup errors.

**SSH tunnel:** If you are using local-only mode, make sure your SSH tunnel is open:
```bash
ssh -i ~/.ssh/your_key -L 19080:localhost:8080 -N root@YOUR_VPS_IP
```

---

## Login fails

**Wrong password:** The portal password is set in `.env` as `ADMIN_PASSWORD`. If you changed it via the portal UI, it was written to `/data/portal-config.json` on the container — the `.env` value is only the initial default.

To reset the password, edit `/data/portal-config.json` on the VPS:
```bash
docker exec portal cat /data/portal-config.json
# Edit adminPassword field, then restart:
./compose.sh restart portal
```

**Fail2Ban ban:** If you made too many failed attempts, your IP may be banned.

```bash
fail2ban-client status easy-wg-portal
fail2ban-client set easy-wg-portal unbanip YOUR_IP
```

---

## WireGuard clients cannot connect

1. Confirm the VPS firewall allows `51820/udp`: `ufw status`
2. Confirm the wg-easy container is running: `./compose.sh ps`
3. Confirm `WG_HOST` in `.env` matches the public IP or domain of the VPS
4. Check wg-easy logs: `./compose.sh logs wg-easy --tail=50`

---

## VPN connected but websites don't load (DNS not working)

WireGuard shows as connected (handshake OK) but DNS lookups fail or browsers can't reach sites.

The client config sends DNS to `10.8.0.1` (the `wg0` address inside the wg-easy container). This must be forwarded via iptables DNAT to AdGuard Home on the Docker bridge gateway.

**Check the DNAT rules are in place inside wg-easy:**
```bash
docker exec wg-easy iptables -t nat -L PREROUTING -n -v | grep DNAT
```
Expected output: two DNAT lines redirecting UDP and TCP port 53 from wg0 to the Docker gateway.

**Check AdGuard responds from the Docker network:**
```bash
docker exec wg-easy nslookup google.com 172.18.0.1
```
If this times out, the UFW rule is missing. Add it:
```bash
ufw allow from 172.16.0.0/12 to any port 53 proto udp comment "AdGuard DNS from Docker"
ufw allow from 172.16.0.0/12 to any port 53 proto tcp comment "AdGuard DNS from Docker"
```

**If DNAT rules are missing** (after a container restart), restart wg-easy — the PostUp in `docker-compose.yml` adds them automatically:
```bash
./compose.sh restart wg-easy
```

---

## DNS filtering not working for a client

1. Confirm AdGuard Home is running: `./compose.sh ps`
2. Check the client's DNS is set to `10.8.0.1` in the WireGuard config
3. In the portal, open the device settings and verify the DNS preset
4. Check AdGuard Home is listening on port 53: `ss -ulnp | grep :53`
5. Verify DNAT forwarding (see section above)

---

## Fail2Ban not active

```bash
systemctl status fail2ban
systemctl start fail2ban
systemctl enable fail2ban
```

Verify the jail exists:
```bash
fail2ban-client status
fail2ban-client status easy-wg-portal
```

If the jail is missing, re-run the bootstrap or check `/etc/fail2ban/jail.d/easy-wg-portal.conf`.

---

## Backup fails

Check that the backup directory is writable:
```bash
ls -la ./backups/
```

Check disk space:
```bash
df -h
```

Encrypted backups require `age`:
```bash
which age || apt-get install -y age
```

---

## `compose.sh` vs `docker compose`

Always use `./compose.sh`, never `docker compose` directly. `compose.sh` injects `PASSWORD_HASH` from `.env.secrets` — running `docker compose` directly leaves it empty and wg-easy will reject all WireGuard logins.

---

## Monitoring checks show "unknown" or "error"

1. Open the Monitoring tab and click **Run now** on a failing monitor
2. Check that the target is reachable from the portal container:
   ```bash
   docker exec portal curl -s http://127.0.0.1:8080/api/health
   ```
3. For `docker` type checks, confirm the container name matches exactly
4. For `tls` checks, confirm the host and port are reachable and the certificate is valid

---

## Apps / File Drop / Migration not working

These are preview features. Apps and File Drop write operations are intentionally disabled until fully validated. See [feature-status.md](feature-status.md) for current status.

---

## Container starts then immediately exits

```bash
./compose.sh logs <container-name> --tail=100
```

Common causes:
- Port already in use (another process on port 53, 8080, etc.)
- Invalid `.env` values
- Corrupted data volume

---

## How to get logs

```bash
./compose.sh logs portal --tail=100      # Portal
./compose.sh logs wg-easy --tail=100     # WireGuard
./compose.sh logs adguard --tail=100     # AdGuard Home
./compose.sh logs caddy --tail=100       # Caddy / HTTPS
```

Or check the access log in the Security tab (Advanced mode) for HTTP-level errors.
