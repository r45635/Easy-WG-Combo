# Beginner guide — your own VPN in about 15 minutes

This guide assumes **no Linux or server experience**. You'll rent a small server, run one command, and end up with a private VPN + ad/tracker blocking on your phone and laptop.

> Already comfortable with VPS/SSH and want every option? Use the **[advanced install & reference](advanced-install.md)** instead.

**What you'll do:** get a VPS → connect to it → run the installer → open the admin portal → create your first device → install the WireGuard app → scan a QR code → verify it works.

---

## What is a VPS?

A **VPS** (Virtual Private Server) is a small always-on computer you rent in a data center, for a few dollars a month. It runs Linux and has its own public IP address on the internet. Easy-WG-Combo turns that VPS into your personal VPN + DNS filter.

You do **not** need to know Linux. You'll copy-paste a couple of commands.

---

## 1. Get a VPS

**Minimum specs:** 1 vCPU, 1 GB RAM, ~25 GB disk. Choose **Debian 12/13** or **Ubuntu 24.04+** as the operating system, and a region close to you.

Any provider that offers Debian/Ubuntu works — for example **Hetzner**, **DigitalOcean**, or **Vultr**.

> I personally use **Vultr's entry-level plan** — it works well with the minimum specs above. That link is a **referral link**: if you sign up through it, I may receive a small credit that helps support development of Easy-WG-Combo, at no additional cost to you. You are completely free to use any other provider.
>
> Vultr: https://www.vultr.com/?ref=8489819

When you create the server:
- **OS / image:** Debian 12 (or 13) or Ubuntu 24.04+.
- **Plan:** the smallest 1 vCPU / 1 GB option.
- **Authentication:** a password or SSH key (either is fine to start).

After a minute the provider shows your server's **public IP address** (four numbers like `203.0.113.45`) and, if you chose a password, a **root password**. Keep both handy.

---

## 2. Connect to your VPS (SSH)

"SSH" is how you open a terminal *on* your server from your own computer.

**Windows:** open **PowerShell** or **Windows Terminal** (built in). Type:
```
ssh root@YOUR_VPS_IP
```
**macOS / Linux:** open **Terminal** and type the same:
```
ssh root@YOUR_VPS_IP
```
Replace `YOUR_VPS_IP` with the IP from step 1. Answer `yes` to the fingerprint question, then enter the root password (typing is invisible — that's normal).

> If your provider gave you a non-standard SSH port, add `-p <port>`: `ssh -p 2222 root@YOUR_VPS_IP`.

You're connected when the prompt changes to something like `root@vps:~#`.

---

## 3. Run the installer

Copy-paste this **one block** (replace the IP and choose a strong password — at least 12 characters, no `$` sign):

```bash
export WG_HOST=YOUR_VPS_IP ADMIN_PASSWORD='choose-a-strong-password'
curl -fsSL https://raw.githubusercontent.com/r45635/Easy-WG-Combo/refs/heads/main/install.sh | bash
```

It takes a few minutes. It installs everything and starts the VPN. When it finishes it prints a **Deployment Summary** — note the "Admin portal" line.

By default the admin portal is **local-only** (not exposed to the internet). That's the safe default; you reach it through an SSH tunnel in the next step.

---

## 4. Open the admin portal (SSH tunnel)

The portal is only reachable from the server itself, so you forward it to your own computer with a **tunnel**. On **your computer** (a new terminal window), run:

```bash
ssh -L 19080:localhost:8080 -N root@YOUR_VPS_IP
```
> Non-standard SSH port? Add `-p <port>`: `ssh -p 2222 -L 19080:localhost:8080 -N root@YOUR_VPS_IP`.

Leave that window open, then open your browser to:

```
http://localhost:19080
```

Log in with the password you chose in step 3. You're in the admin portal.

---

## 5. Create your first VPN device

In the portal:
1. Go to **Devices** → **+ New device**.
2. Give it a name (e.g. `my-phone`) and pick a DNS filtering preset (the default blocks ads + trackers + malware).
3. Click create — a **QR code** appears.

---

## 6. Install the WireGuard app and connect

1. Install the free **WireGuard** app on your phone (App Store / Google Play) or computer. (Details and links: [Client apps](clients.md).)
2. In the app: **Add tunnel → Scan from QR code**, and scan the QR from step 5.
   - On a laptop, use **+ New device** → download the `.conf` file and **import** it into WireGuard instead of scanning.
3. Toggle the tunnel **on**.

---

## 7. Verify it's working

- **VPN:** with the tunnel on, open a "what is my IP" site (e.g. search "what is my ip"). It should show your **VPS's** IP, not your home IP.
- **DNS filtering:** ads on typical sites should be reduced. You can also open the portal's **Devices** page and confirm your device shows a recent handshake.

That's it — you have a personal VPN with ad/tracker filtering. 🎉

---

## Everyday commands

Run these on the server (SSH in first):

```bash
cd ~/Easy-WG-Combo
./easywg update    # update to the latest version (safe: pull + rebuild + health check)
./easywg backup    # create a configuration backup (in ./backups)
./easywg passwd    # change the admin password (min 12 chars, no "$")
```

---

## First-install troubleshooting

- **"command not found" / curl fails:** make sure you're connected to the VPS (prompt shows `root@...`), not your own computer.
- **Can't open `http://localhost:19080`:** the tunnel window (step 4) must stay open. If it closed, re-run the `ssh -L ...` command.
- **Login fails:** you're using the password from step 3. If you forgot it, run `./easywg passwd` on the server to set a new one.
- **Phone connects but no internet:** toggle the tunnel off/on once; check the device shows a handshake in **Devices**.
- More symptoms and fixes: **[Troubleshooting](troubleshooting.md)**.

---

## Next steps (optional)

- Want the portal reachable without a tunnel? See public HTTPS in the **[advanced guide](advanced-install.md#https--admin-exposure)** (understand the trade-offs first).
- Understand the architecture, ports, threat model and every setting: **[advanced install & reference](advanced-install.md)** and **[security model](security-model.md)**.
