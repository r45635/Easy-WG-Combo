# File Drop — Preview

File Drop provides temporary encrypted file sharing: upload a file, get an unguessable token link, share it with VPN users (or publicly with explicit confirmation).

**Current status: Preview only.** The CLI is disabled. The UI tab shows an experimental banner. The backend code exists but has not been validated on a live deployment.

---

## What File Drop will do (when enabled)

- Upload a file via drag-and-drop or CLI
- Get an unguessable 48-character hex token link
- Set expiry (1–30 days) and a max download count
- Optionally password-protect the link
- VPN-only by default; public links require explicit confirmation
- Auto-cleanup expired and exhausted shares

---

## Why it is currently disabled

File Drop is security-sensitive. The following audit items must be completed before it is safe to enable:

| Requirement | Status |
|---|---|
| Dedicated storage path (`./filedrop/storage/`) | Mounted in docker-compose — untested |
| Volume mounted in docker-compose | Done (`./filedrop:/filedrop:rw`) |
| Max file size limit | Code present (`FILEDROP_MAX_MB`) — untested |
| Total storage limit | Code present (`FILEDROP_TOTAL_GB`) — untested |
| Random unguessable 48-char hex file tokens | Code present — untested |
| Sanitized filenames (no path traversal on storage) | Code present — not audited |
| No path traversal on download endpoint | Code uses token-only lookup — not audited |
| Password hashing (PBKDF2, not plaintext) | Code present — not tested on live |
| No plaintext password storage | Code present — not audited |
| Expiration enforcement | Code present — untested |
| Max download count enforcement | Code present — untested |
| Cleanup job | API endpoint present — untested |
| No public links by default | VPN-only default — not validated |
| Public mode requires explicit confirmation | Code present — not validated |
| `X-Robots-Tag: noindex, nofollow` on public links | Code present — not validated |

---

## Storage layout (planned)

```
./filedrop/storage/<48-hex-token>   ← raw file bytes, opaque name (no extension)
/data/filedrop-shares.json          ← share metadata (auto-included in backups)
```

---

## CLI (once enabled)

```bash
./easywg filedrop list              # List active shares
./easywg filedrop upload <file>     # Upload a file, get share link
./easywg filedrop delete <id>       # Delete a share and its file
./easywg filedrop status            # Show storage usage
./easywg filedrop cleanup           # Remove expired and exhausted shares
```

---

## How to track progress

To enable File Drop, all items in the requirements table above must be validated on a live VPS deployment.
