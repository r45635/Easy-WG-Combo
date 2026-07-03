# Client Apps

Easy-WG-Combo provides two tunneling protocols. Each requires a compatible client app on your device.

- **WireGuard** — the default VPN protocol. Use for everyday privacy and remote access.
- **VLESS+Reality (Xray)** — the optional DPI-resistant tunnel. Use where WireGuard is blocked by censorship.

Both are configured from the **Devices** tab — scan the QR code or download the `.conf` file.

---

## WireGuard

The official WireGuard apps are available on all platforms.

| Platform | App | Link |
|---|---|---|
| Android | WireGuard | [Play Store](https://play.google.com/store/apps/details?id=com.wireguard.android) |
| iOS | WireGuard | [App Store](https://apps.apple.com/us/app/wireguard/id1441195209) |
| macOS | WireGuard | [App Store](https://apps.apple.com/us/app/wireguard/id1451685025) or [Homebrew](https://formulae.brew.sh/cask/wireguard-tools) |
| Windows | WireGuard | [wireguard.com/install](https://www.wireguard.com/install/) |
| Linux | WireGuard | [wireguard.com/install](https://www.wireguard.com/install/) — available in most distro package managers |

### Connecting a device

1. Open the **Devices** tab in the portal
2. Click the QR icon (⊡) on any device row
3. Scan the QR code with the WireGuard app — or download the `.conf` file and import it manually

The device is immediately connected once the config is imported and the tunnel is enabled.

---

## VLESS+Reality (Xray)

Xray must be enabled on the server first (`XRAY_ENABLED=yes` in `.env`). See [Xray setup](xray.md#activation).

Each device gets its own unique VLESS URI. Tap **⊛** in the Devices tab to get the QR code for that device.

### Recommended apps

| Platform | App | Price | Notes |
|---|---|---|---|
| Android | v2rayNG | Free | [GitHub](https://github.com/2dust/v2rayNG) · [Play Store](https://play.google.com/store/apps/details?id=com.v2ray.ang) |
| iOS | Sing-box | Free | [App Store](https://apps.apple.com/us/app/sing-box/id6451272673) · [sing-box.sagernet.org](https://sing-box.sagernet.org/) |
| iOS | Shadowrocket | ~$3 | [App Store](https://apps.apple.com/us/app/shadowrocket/id932747118) — most reliable, worth paying |
| macOS | Sing-box | Free | [sing-box.sagernet.org](https://sing-box.sagernet.org/) |
| macOS | Nekoray | Free | [GitHub](https://github.com/MatsuriDayo/nekoray) |
| Windows | v2rayN | Free | [GitHub](https://github.com/2dust/v2rayN) |
| Linux | v2rayN / Sing-box | Free | [v2rayN](https://github.com/2dust/v2rayN) · [Sing-box](https://sing-box.sagernet.org/) |

### Connecting a device

1. Open the **Devices** tab in the portal (Super User or Advanced mode)
2. Click **⊛** on a device row — a modal opens with a QR code and VLESS URI
3. In your client app, scan the QR code or paste the VLESS URI
4. Enable the tunnel

The URI is specific to that device. Revoking the device from the portal immediately invalidates that URI.

### Importing the URI

**v2rayNG (Android):** tap `+` → *Scan QR code* or *Import config from clipboard*

**Shadowrocket (iOS):** tap `+` → *Type: VLESS* → paste URI; or tap the QR icon in the app

**Sing-box:** tap `+` → *Import from URL/clipboard*

**v2rayN (Windows):** *Servers* → *Add VLESS server from clipboard* or scan QR

---

## Which protocol to use?

| Situation | Use |
|---|---|
| Everyday VPN for privacy or remote access | WireGuard |
| Country or ISP actively blocks WireGuard | VLESS+Reality |
| Deep Packet Inspection (DPI) in place | VLESS+Reality |
| Traveling to China, Iran, or similar | VLESS+Reality |
| Both are working — prefer simplicity | WireGuard |

Both can run simultaneously on the server. You can switch between them on your device without changing the server setup.
