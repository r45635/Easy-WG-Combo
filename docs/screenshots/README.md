# Documentation screenshots

Every image in this directory is produced from a **throwaway demo stack with
fictitious data** — never from a running installation.

## Why

In June 2026 these screenshots shipped a working VLESS+Reality credential (QR,
URI, key and IP) to a public repository. It was pixelated two days later, which
cost a history rewrite over 28 commits and a key rotation.

A later pass titled *"full anonymization"* blurred paths, timestamps and TLS
details — and left the maintainer's real device names and the server name in
plain, bold text across four images, where they stayed until 2026‑11‑12.
**Redaction aimed at secrets does not catch ordinary PII**: a reader scanning
for keys reads a device name as page furniture.

Hence the rule: do not redact a real screenshot, **capture a fake one**.

## Regenerating them

```bash
cd docs/screenshots
./demo-stack.sh up                       # wg-easy + AdGuard + Xray + portal, all fictitious

"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --remote-debugging-port=9222 \
  --user-data-dir=/tmp/ewg-shots-profile --hide-scrollbars about:blank &

node capture.js                          # overwrites the PNGs in this directory
./demo-stack.sh down                     # removes containers and state
```

The demo stack uses `vpn-demo` as the server name, `Laptop` / `Phone` / `Tablet`
as devices, `203.0.113.10` (TEST-NET-3, reserved for documentation) as the
endpoint, and Reality keys generated for the occasion and thrown away. The
AdGuard dashboard is seeded with DNS traffic so it is not an empty page.

`capture.js` blurs the VLESS QR code, the client URI and the Reality public key
**in the page, before the pixels are read**, so the PNG never contains them.

## Before committing an image

Look at each one and name what you see — the checklist that was missed before:

- device, client and people names; the server name in the sidebar
- hostnames, public IPs, the "Your IP" field
- QR codes **and** the text beside them: they encode the same secret
- keys, UUIDs, short IDs, tokens, session identifiers
- file paths and log lines that reveal a real host

Once pushed to a public repository it is in the git history: fixing it means a
history rewrite **and** rotating whatever leaked.
