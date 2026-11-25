# Changelog

All notable changes to Easy-WG-Combo are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [SemVer](https://semver.org/) (pre-1.0: minor bumps may contain breaking changes).

## [Unreleased]

## [0.6.8] — 2026-11-25

### Security
- **The login page, the title and the 404 page stop being identical on every install, and the icon mechanism stops freezing a changed logo.** 0.6.7 individualised the three icons, and said what it left alone: the login page was byte-identical across both reference hosts (58253 B, mmh3 `1672648119`), so a hash of the response body grouped them exactly as `http.favicon.hash` had. That is now covered, along with two cheaper hints.
  - **One seed instead of generated files.** 0.6.7 wrote the derived icons into `portal/data/brand/` and kept whichever file was already there. That made the hash stable, but it also meant a genuine change to an icon — a new logo in a later release — would never have reached an existing install: its file existed, so it was kept. The portal now keeps a single random seed (`portal/data/brand/install-id`, mode `600`) and derives every static response from it **in memory** at startup. Derivation is deterministic, so the hash is still stable across `./easywg update`; a changed source file now propagates immediately; and nothing is cached on disk to go stale. The seed is not a credential — what the responses expose is a prefix of `sha256(seed:name)`, which cannot be inverted — but it is install-identifying, so it is never logged. It lives under `portal/data`, hence inside every backup, which is what carries the fingerprint across a restore.
  - **The login page is individualised**, by an HTML comment before `</html>`. `/` and `/index.html` are served from the derived copy, and `express.static` is mounted with `index: false` so it cannot hand out the bundled page behind those routes.
  - **`PORTAL_TITLE`** (new, in `.env`) sets the browser/page title. Empty keeps `Easy-WG-Combo`, which is full-text searchable and identical on every install of this public repo; your own value is one more string that no longer groups this host with the others. It is escaped before it reaches the page.
  - **`X-Powered-By` is no longer sent** (`app.disable('x-powered-by')`), and unknown paths get the portal's own 404 instead of Express's default page — a constant 167-byte body that names the framework and echoes the requested path back. `/api/*` still answers JSON, so clients are unaffected.
  - **The asymmetry is deliberate and declared per asset.** An icon that cannot be individualised answers `404`; the UI is served as shipped, loudly, because an unreachable portal is worse than a recognisable one. Both paths log what happened and why.
  - `./easywg doctor` now compares the **login page** as well as the three icons against the files in this repository, and separately checks that `X-Powered-By` is absent and that the 404 page is not Express's. Each one reports positively when it passes and warns when it could not run, so silence never stands for "verified".
  - **On upgrade the icon hashes change once.** The files 0.6.7 wrote are removed at first start (they are no longer read) and every response is re-derived from the new seed. The values are not published anywhere, so nothing depends on them; `./easywg doctor` confirms the new ones are still unshared.

### Fixed
- `./easywg admin` read the admin port from `.env` while `doctor` and `security-check` read it from `caddy/Caddyfile`. The UI rewrites the Caddyfile, and one of the two reference installs serves 8443 with no `CADDY_HTTPS_PORT` in its `.env` at all — so this command managed the right port there only because 8443 is also its fallback. It now reads the Caddyfile like the others, falls back to `.env` when the portal is on `:443` or loopback, and says so when the two disagree. 0.6.5 fixed this divergence in the other two call sites and missed this one.

### Known fingerprints this does not address
- The exact set of security headers is still identical on every install, and the TLS certificate still names the host (one SAN, searchable on crt.sh). Both are visible to any scanner; neither is changed here.

## [0.6.7] — 2026-11-22

### Security
- **Each installation now serves its own icons, so a favicon hash no longer lists them all.** Shodan, FOFA and Censys index a favicon by hashing it (mmh3 of the base64 of the bytes), and the icons ship in this **public** repository — which makes the file in git the fingerprint. Measured on 2026-11-22: both reference installs answered `/favicon.ico` with mmh3 `-2025595950`, the same value as the repo, so `http.favicon.hash:-2025595950` enumerated them together with every other install. `favicon.svg` and `apple-touch-icon.png` were equally shared, and both were being served. At first start the portal now derives all three into `portal/data/brand/` — an XML comment in the SVG, a `tEXt` chunk in the PNG, bytes appended after the ICO's last image, with a payload of random length so neither the bytes nor the file size is constant. The rendered pixels are identical (verified against the defaults through the system thumbnailer); the hashes are not.
  - The copies live in the **persistent data directory**, never in git and never in an image layer, which is what keeps the hash stable across `./easywg update` — one that moved on every update would be harmless but pointless. Being under `portal/data`, they are already part of every backup and restore.
  - An existing install heals itself: the first portal start after the update generates what is missing, once. No bootstrap or firewall change.
  - **No fallback.** If generation fails, the routes answer `404` and the portal says why on stderr — serving the bundled default would put back the fingerprint the feature exists to remove.
  - `./easywg doctor` fetches the three icons and **fails** if any is byte-identical to the one in this repository. It checks what the server serves, not what it intended to generate.

### Known fingerprints this does not address
- The page title (`<title>Easy-WG-Combo</title>`) and the exact security-header set are full-text searchable and identical on every install; the whole login page is byte-identical across hosts, so a body hash groups them just as a favicon hash did. `X-Powered-By: Express` is still sent, and the 404 page is Express's default. Left as they are on purpose — changing them is a separate decision, not a side effect of this one.

## [0.6.6] — 2026-11-19

### Fixed
- **`PermitRootLogin without-password` was graded as if root could log in with a password.** It is the historical spelling of `prohibit-password` — the same setting — and it is what `sshd -T` prints on OpenSSH as shipped by Ubuntu 22.04. 0.6.5 made `security check` read the daemon instead of the files, which is correct, and that immediately cost a correctly hardened host 10 points: Paris scored **100/110** while its own portal scored 110/110 on the same host. Both spellings are now accepted, and so is `forced-commands-only`, which allows no interactive root session at all. `portal/lib/sshd-config.js` exports the predicate so the portal, `security check`, `harden-ssh` and `doctor` cannot drift apart again.
- **`harden-ssh` no longer offers to "fix" a host that is already hardened** with the deprecated spelling — it would have appended a directive the drop-ins override anyway.
- **`doctor`'s two new SSH checks said nothing when they passed.** A check that only speaks on failure is indistinguishable from a check that never ran — which is the exact failure this project keeps meeting. Both now report their result either way, and the UI-vs-daemon comparison says so explicitly when it could not reach `/api/security` instead of skipping in silence.
- **`doctor` compares the portal's SSH verdict with the daemon's in both directions.** It only looked for a portal that under-reports a hardened host; a portal that passes a host the daemon says is open — the more dangerous error — was invisible to it.
- `doctor.sh` called `info` without defining it, under `set -euo pipefail`: the same class of bug as the `warn` fixed in `bootstrap.sh` in 0.6.5, introduced by that release's own new checks. Every script is now swept for helpers that are called but never defined.

## [0.6.5] — 2026-11-19

### Security
- **The admin portal is no longer opened to the whole internet.** With Xray and `PUBLIC_HTTPS_ENABLED=yes`, `bootstrap.sh` ran `ufw allow 8443/tcp` — Anywhere — putting the one component that holds the Docker socket, the host network and `NET_ADMIN` behind a single password. It now allows the Docker bridge (`172.16.0.0/12`, where wg-easy puts VPN clients, so being on the VPN is enough) and each entry of the new `ADMIN_ALLOW_FROM`, and it **removes** an "Anywhere" rule for that port if it finds one. Re-running bootstrap can no longer widen access, which is how an operator's manual restriction used to disappear without a word.
- **`./easywg admin`** opens the port deliberately and temporarily: `admin open --from-ssh --for 30m` (or `--from <ip|cidr>`) adds a rule tagged `easywg-admin-temp` and a `systemd-run` timer that removes it; `admin close` removes it now; `admin status` shows who can reach the portal; `admin lock` converts an older install to the new default. If the expiry timer cannot be created, the command says the rule will stay open instead of leaving it to be discovered later.
- **`doctor` and the Security Center fail on an "Anywhere" rule** for the admin port, and on a temporary rule left without an expiry timer. Both read the live UFW rules — `doctor` from `ufw status`, the portal from `/etc/ufw/user.rules` — not from `.env` or from what bootstrap intended. They also take the admin port **from the Caddyfile**, because one of the two reference installs serves 8443 with no `CADDY_HTTPS_PORT` in its `.env` at all: trusting `.env` would have skipped exactly the host that needed checking.

### Fixed
- **The Security Center under-reported SSH by 20 points on every stock Debian/Ubuntu host.** The portal container was given `/etc/ssh/sshd_config` but never `/etc/ssh/sshd_config.d/`, where the distribution's `Include` sends all hardening — so it read the stub's `PermitRootLogin yes` and scored 80% on hosts where `sshd -T` says `prohibit-password` and the host CLI scores 100/100. The directory is now mounted read-only, and the parser applies sshd's real precedence: `Include` expanded where the directive appears, **first value wins** (it previously appended drop-ins at the end and let the last line win — the opposite), `Match` blocks skipped as conditional. Each check now names the file its value came from, and says when an `Include` matched nothing. `portal/lib/sshd-config.js` carries the rules, with tests for every case that bit us.
- **`./easywg security check` now reads `sshd -T`** — the effective configuration — instead of guessing from files, and falls back to the same precedence-correct parse only when sshd cannot be asked. It says which of the two it used.
- **`security harden-ssh` no longer reports success for a change sshd ignores.** It appends to the main config file, which on a stock layout is read *after* the drop-ins that override it; it now asks the daemon whether the setting actually took effect and fails, pointing at `sshd_config.d/`, when it did not. A failed `sshd -t` now really does restore the backup it takes (the message claimed a revert that never happened), and a failed reload is reported instead of being swallowed.
- **`./easywg doctor` compares the portal's SSH verdict with the daemon's** and fails when they disagree — the class of bug above is invisible otherwise, since both sides look healthy on their own.
- **Backups were missing two files nothing can regenerate**: `xray/config.json` (the Reality key pair and the per-device client list) and `docker-compose.override.yml` (untracked local customisation — on one reference install it is what makes TLS work). Every archive made before this is incomplete for an Xray install. `restore` applies the Xray config, and treats the override like `docker-compose.yml` — not restored unless `--use-archive-compose`, and **said out loud**, with a non-zero exit, when it is skipped and differs from what the host has.
- **A portal-initiated restore always failed at the last step.** It copied `docker-compose.yml` onto a read-only mount, so every restore threw `EROFS` *after* WireGuard, AdGuard and Caddy had been written: a half-applied restore reported as an error. The portal no longer restores compose files at all (they are executed by `compose.sh up`, and the CLI gates that behind an explicit flag) and lists what it skipped.
- **A backup the portal cannot take in full no longer looks complete.** `docker-compose.override.yml` is not visible from the container, so the manifest and the API response carry an `omitted` list and the Backups tab turns amber and names the file, instead of a green "Created".
- `bootstrap.sh` called `warn` on three paths without ever defining it — under `set -euo pipefail` that exits 127, so a DNS warning would have killed the installer rather than printing. All three sit on the "domain does not resolve" path, which is why it was never hit.

### Changed
- The backup manifest gains `created_by` (`cli` or `portal`) and `files`, the list of what the archive actually holds. A restore that leaves something out should not be indistinguishable from a complete one.
- The security score gains a 10-point check for the admin port's real exposure (so the maximum becomes 110 where a dedicated admin port exists, and stays 100 where the portal is on :443 or loopback, where the check reports `warn` and scores nothing). The existing "bound to localhost" check now says in its own note that Caddy publishes the portal regardless — it was passing on every install and answering a question nobody asked.
- `portal/test/auth.test.js` gives each test its own source IP (failed logins are counted per IP and the counter is shared for the whole file) and reports the HTTP status when a login returns no session cookie. The test failed about one run in five under load with `cookieA && cookieB` — equally true of a 429, a 500 and a cookie-less 200. The coupling is gone and the next failure will name its cause.

## [0.6.4] — 2026-11-19

### Added
- **The project has an icon.** `index.html` carried no `<link rel="icon">` at all, so every browser asked for the bare `/favicon.ico` and got a **404** — on both reference hosts. The mark is the hexagon the portal already shows as its logo, in the UI's own colours. `docs/brand/icon.svg` is the single source; `docs/brand/make-icons.sh` regenerates `favicon.svg`, a 16/32/48 `favicon.ico` and `apple-touch-icon.png` from it, and `png2ico.py` builds the `.ico` with the Python standard library so no image package is needed.

### Fixed
- **The device "Config" button did nothing when the browser blocked the pop-up** — the twin of the QR bug fixed in 0.6.3, one line away from it. It now downloads through a link, which cannot be pop-up blocked, so the failure mode is removed rather than reported. The server sends the config as an attachment named after the device, using the RFC 5987 + ASCII fallback already used by File Drop, so a hostile device name cannot inject a response header, and a private key is saved as a file instead of rendered as a web page.

### Documentation
- **Correction to the 0.6.3 notes.** They said the removed Security screenshots "advertised an 80% score on a host with SSH root login and password authentication enabled". The score was right, the conclusion was wrong: SSH on both hosts is hardened (`PermitRootLogin prohibit-password`, `PasswordAuthentication no`, confirmed with `sshd -T`), and the host-side `easywg security check` scores **100/100**. The portal shows 80% because it is given only `/etc/ssh/sshd_config` and never `/etc/ssh/sshd_config.d/`, where the hardening lives — so the **UI and the CLI disagree by 20 points on the same check**. The screenshots were still right to go; the reason stated for removing them was not.

## [0.6.3] — 2026-11-18

### Fixed
- **The WireGuard QR button did nothing when the browser blocked the pop-up.** It called `window.open()` and wrote into whatever came back; a blocked pop-up returns `null`, so the next line threw and the click produced no window, no message and no clue — only a console error. It now says what happened, in all three UI languages, and points at **Download config** as the way through.

### Changed
- Xray image **26.10.31 → 26.11.9**.
- express-rate-limit 8.7.2 → 8.7.4, nodemailer 10.3.1 → 10.5.0.

### Documentation
- The published screenshots are regenerated from a **throwaway demo stack with fictitious data** instead of a live installation, which is how real device names ended up in a public repository. `docs/screenshots/demo-stack.sh` builds the stack, `capture.js` takes the images and `promo.js` records the demo clip; both blur QR codes and URIs in the page before the pixels are read, and abort if the blur matched nothing.
- Three Security screenshots removed from the README: two were the same file under different captions, and all three advertised an 80% score on a host with SSH root login and password authentication enabled.

## [0.6.2] — 2026-11-09

### Security
- **Xray image 26.10.21 → 26.10.31** and **AdGuard Home v0.107.79 → v0.107.80.** Both now ship with Multipath TCP turned off. A Linux kernel flaw in IPv4 MPTCP handling (CVE-2026-98432) can give a remote attacker root, and Go 1.24+ enables MPTCP on listening sockets by default, so both services were exposing that code path. AdGuard Home is also rebuilt with Go 1.27.3. Updating the images narrows the attack surface; **updating the host kernel is what actually fixes it.** Installations should update.

### Changed
- express-rate-limit 8.7.1 → 8.7.2 and nodemailer 10.2.1 → 10.3.1 (patch/minor, no behaviour change for the portal).
- CI: `docker/build-push-action` 6 → 7, `docker/login-action` 3 → 4, `docker/metadata-action` 5 → 6.

## [0.6.1] — 2026-10-28

### Security
- **Xray image 26.10.17 → 26.10.21.** Upstream withdrew 26.10.10 and 26.10.17: their built-in root certificate store still trusted three roots whose intermediate certificates had trivially weak, now-broken private keys. 26.10.21 removes them and is built with Go 1.27.3, so the bad certificates are rejected even when the host's CA store has not caught up. Installations with Xray enabled should update.

### Changed
- nodemailer 10.1.7 → 10.2.1 (header-comment parsing fix; no behaviour change for the portal's single SMTP transport).

## [0.6.0] — 2026-10-25

### Added
- **`easywg xray rotate-keys`** — rotates the Reality key pair and short ID when a private key may have leaked, or on a schedule you choose. It refuses to act without `--confirm`, offers `--dry-run`, states plainly that **every client configuration is invalidated at once**, prints how many devices are registered so the size of the re-provisioning job is visible before you decide, and backs up `.env`, `.env.secrets` and `xray/config.json` first. Per-device UUIDs are deliberately left alone: a device keeps its identity and only needs the new URI. WireGuard is untouched.

### Fixed
- Three places still described `easywg update` as rebuilding the portal — the README, the step list in the advanced guide, and `easywg help` — three releases after it stopped doing that. The command changed in 0.5.3/0.5.4; the prose did not follow.

## [0.5.6] — 2026-10-25

### Security
- **Five preview-feature endpoints were reachable from any interface mode.** File Drop delete and cleanup, the notification test send, and the two migration endpoints carried authentication but no capability check, so a session in User or Super User mode could call them even though the features are not offered there. They now use the capability their sibling endpoints already use — `fileDropPublic`, `configureNotifications`, and a new `migrationTools` (Advanced only). Interface modes are a guardrail against session hijacking and mistakes rather than multi-user access control, but a guardrail with five holes in it is worth closing. Covered by three new tests.
- The capability matrix now lists `migrationTools: false` explicitly for User and Super User. The check denies unknown actions anyway, but a reader should not have to know that to see what a mode may do.

## [0.5.5] — 2026-10-25

### Added
- **`docker-compose.override.yml`** — local customisations (an extra volume, a mounted certificate, a changed port) now have a home that git ignores and `compose.sh` loads automatically. Editing `docker-compose.yml` instead makes `easywg update` refuse to run, because it will not update a dirty checkout; an installation that needs one tracked change therefore ends up updated by hand forever. One of the two servers this project runs on had been in exactly that state for months. Compose only auto-loads an override when no `-f` is passed, and `compose.sh` always passes `-f`, so it names the file explicitly.

## [0.5.4] — 2026-10-25

### Fixed
- **`easywg update` never actually pulled in 0.5.3.** The line that extracts the portal image repository from `docker-compose.yml` carried broken quoting, so it returned the **entire compose file** instead of a repository name; `docker pull` was then handed a 6 kB argument, failed, and the command fell back to compiling — silently, since falling back is a legitimate path. The feature announced in 0.5.3 did the opposite of what the notes said. Extraction now uses a single `sed`, and CI runs **that exact line out of the script** and asserts it yields one repository name, so the same mistake fails the build instead of degrading quietly.

  🪤 Worth knowing if you update from 0.5.2 or earlier: the **first** `easywg update` still runs the *old* copy of the script — the one already loaded by the shell — so it compiles once. From the next update on, it pulls.

## [0.5.3] — 2026-10-24

### Changed
- **`easywg update` no longer compiles on the server.** It now pulls the image CI built for the exact commit it just checked out (`sha-<commit>`) and recreates the container from it. The commit tag rather than the release tag is deliberate: the update refuses to run on a dirty checkout, so the tree *is* that commit and the tag cannot drift from the code — the version tag can, whenever a commit does not bump `VERSION`. With no image for that commit (local commits, a fork, CI still running) it says so and falls back to building, which is now the exception rather than the default. On a 1 vCPU / 1 GB VPS that difference is the whole point.
- **`docker-compose.yml` no longer carries a version.** The portal image tag comes from `PORTAL_IMAGE_TAG`, which `compose.sh` derives from the `VERSION` file — one less place to keep in sync on a release, and the one most easily forgotten now that the image is published.
- **A failed Caddy reload no longer claims it reverted when the revert also failed.** The Server Endpoint action restores the previous Caddyfile and reloads, but it ignored that second reload's result and reported "Reverted to the previous configuration" regardless — leaving Caddy serving the broken config while the UI said otherwise. It now reports what actually happened, with the `caddy validate` command to run.
- Removed three constants that nothing reads: `MONITOR_VALID_TYPES`, `MONITOR_SAFE_CONTAINER_RE` and `MONITOR_SAFE_DOMAIN_RE`, orphaned when monitor validation moved into `portal/lib/net-guards.js`. Editing them had no effect, which is the same trap as a config that looks applied and is not.
- **Using `docker compose` directly now fails with an error naming `compose.sh`**, instead of quietly rendering the portal image with an empty tag. The CI compose job validates through `compose.sh` — the path installations actually use — and asserts that the direct call is still refused.

## [0.5.2] — 2026-10-24

### Changed
- **The prototype-pollution class is removed at the root, not guarded against.** The seven record stores are now built with `Object.create(null)`, so `store["__proto__"]` is an ordinary absent key rather than `Object.prototype` — there is no prototype chain for a user-supplied id to reach, and nothing for a later assignment to corrupt. `safeLookup()` from 0.5.1 stays as a second line. A hostile store file carrying an own `__proto__` key is inert for the same reason.
- **Backup paths are resolved and contained rather than pattern-matched.** `resolveBackupPath()` resolves the filename against `BACKUP_DIR` and requires the result to sit directly inside it. The filename pattern check remains the first line; the containment check is the one that holds regardless, and it is legible to a reader and to static analysis alike.
- **CI fails on any unreviewed code-scanning alert.** CodeQL writes to the Security tab while its workflow still reports success, so a green run said nothing about what it found — which is how a real SSRF stayed open from 17 August to 24 October. The queue is now a build signal. The three alerts that cannot be designed away (the proxy must fetch a URL; reading this host's own self-signed certificate requires `rejectUnauthorized: false`) are accepted, with their reasons, in `.github/codeql-accepted.txt` — reviewed in the repository alongside the code. Note that GitHub code scanning ignores inline `// codeql[rule-id]` comments, which is why acceptance lives in a file.

## [0.5.1] — 2026-10-24

### Security
- **Server-side request forgery in the wg-easy / AdGuard proxy (CodeQL `js/request-forgery`).** `proxyTo()` built its target with `new URL(path, base)`, and `new URL` **discards the base** when the path is absolute (`http://x/`) or protocol-relative (`//x/`). The path came from `req.originalUrl`, so `GET /adguard//attacker/` was proxied to the attacker — **carrying the Basic credentials the proxy injects**, which leaked the AdGuard password. Reproduced against a local listener before the fix and confirmed blocked after.

  Exploitation needs an authenticated admin session and the admin following a crafted link: the cross-origin gate covers only state-changing methods, and the session cookie is `sameSite=lax`, so a top-level navigation carries it. Not reachable by an unauthenticated visitor.

  The path is now collapsed to a single leading slash and the resolved origin is checked against the backend's, in `netGuards.resolveUpstreamUrl()` — a request that would leave the backend is refused with 400. Four regression tests cover protocol-relative, multi-slash, backslash and absolute-URL forms.

  **If you ran 0.5.0 or earlier with the admin portal exposed, rotate the AdGuard password.**
- **Prototype pollution through record lookups (CodeQL `js/prototype-polluting-assignment`, 20 alerts).** Every store is a plain object keyed by id, and the routes read `store[req.params.id]`. For `id=__proto__` that returns `Object.prototype` — truthy, so the `if (!rec) return 404` guard let it through and the next field assignment wrote onto `Object.prototype` for the lifetime of the process; `constructor` and `prototype` behave the same. All 28 lookup sites now go through `safeLookup()`, which rejects those keys and resolves own properties only. Authenticated routes, so admin-only — fixed anyway: the guard costs one function call.

## [0.5.0] — 2026-10-24 — security hardening

Three months of hardening, a critical dependency fix, and the portal
learning to tell you when it is behind. **Update any instance running
0.4.0.**

### Security
- **`body-parser` denial of service (GHSA-27r3-jxmh-p828, high).** express 5.3.0 pulled `body-parser` 2.3.0, which can be stalled by trailing bytes after a compressed request body. Raised to 2.4.0. The portal parses JSON bodies on its API, including the unauthenticated login and File Drop paths, so this one is reachable — the per-IP rate limiter bounds it but does not remove it.
- **`ip-address` quadratic parsing (GHSA-rxp7-6hxx-x8q5, moderate).** Raised to 10.7.4. Pulled by express-rate-limit; the portal's own CIDR checks in `portal/lib/net-guards.js` do not use it.
- **Critical: `proxy-addr` IP spoofing (GHSA-jqcg-44mw-7w3h, CVSS 9.1).** express 5.2.1 pulled `proxy-addr` 2.0.7, where an IPv4-mapped IPv6 peer address can match an IPv4 trust subnet. express **5.3.0** requires `proxy-addr` ^2.0.8. The portal sets `trust proxy` to `loopback`, so the spoofable value is the one keying the per-IP rate limiter and shown in the sessions view; the Fail2Ban jail reads Caddy's access log and was not affected. **Update any instance running an earlier build.**
- **SSRF IP classification is now semantic**, not textual: IPv4-mapped IPv6 in **both** dotted (`::ffff:127.0.0.1`) and hexadecimal (`::ffff:7f00:1`) notation is correctly blocked, along with a fuller reserved-range set; only globally routable unicast is allowed for user monitors. Malformed IPv6 fails closed.
- **`easywg passwd` preserves an independent wg-easy credential:** it only regenerates wg-easy's `PASSWORD_HASH` when `WG_EASY_PASSWORD` follows the admin password. An intentionally independent `WG_EASY_PASSWORD` is no longer desynced by a rotation.
- **The admin password is no longer printed** in the installer's final summary (prevents it leaking into terminal / cloud-init / provisioning logs).
- **Passwords may not contain `$`** (Docker Compose interprets it in `.env`, which would desync the portal from the wg-easy hash). Rejected with a clear error at the installer, `easywg passwd` and the portal — never silently altered.
- **SSH-tunnel instructions include `-p <SSH_PORT>`** when a non-default SSH port is configured (installer summary + docs).
- **Monitoring SSRF — connect-time DNS guard.** Monitor targets are now resolved through a guarded DNS lookup: a hostname that resolves (or rebinds) to a private/reserved/link-local address — including cloud metadata `169.254.169.254`, loopback, RFC1918, CGNAT and IPv6 ULA/link-local — is refused at connect time, not merely when given as a literal IP. The socket connects to the exact address that was validated. Built-in local probes are unaffected.
- **`POST /api/fail2ban/unban-all`** now requires Advanced mode (it lifts every ban), matching its ban/unban/ignoreip/set-config siblings.
- **Unified password policy:** minimum **12 characters** (16+ recommended), enforced consistently by the installer, the portal UI/API and `easywg passwd`.
- **`easywg passwd` no longer breaks the AdGuard proxy:** it pins `ADGUARD_PASSWORD` before rotating `ADMIN_PASSWORD`, so the portal keeps talking to AdGuard (whose own credential is independent).
- **Local-only deployment summary** now prints the correct SSH-tunnel command and `localhost` URL instead of an unreachable public `WG_HOST` URL (all Xray/public/local-only combinations).
- **File Drop `vpn_only` shares are now enforced server-side.** Previously the share mode was cosmetic and any client with the token could download over the public Internet; downloads now require a VPN-subnet (or loopback/SSH-tunnel) source. See the advisory in [SECURITY.md](SECURITY.md).
- **File Drop passwords are POST-only** — the `?pw=` query form (which leaked into access logs and the Security → Logs panel) is removed.
- **File Drop password hashing** raised to PBKDF2-SHA256 600k iterations, computed asynchronously (the unauthenticated download path no longer blocks the event loop); legacy hashes still verify. Downloads are served as `application/octet-stream` with `X-Content-Type-Options: nosniff` and an RFC 5987 `Content-Disposition`.
- **No more `changeme` fallback.** The portal refuses to start without an admin password instead of booting with a known default; `bootstrap.sh` verifies it on re-run and regenerates the wg-easy hash if missing.
- **Admin portal is local-only by default** (`PUBLIC_HTTPS_ENABLED=no`). Fresh interactive installs are prompted; the Xray branch now honors the flag (it previously opened `:8443` unconditionally).
- **Interface modes are enforced server-side** on every privileged endpoint, and raising the mode requires the admin password (closes user→advanced self-escalation).
- **Auth hardening:** app-level login rate limiting (also covers the Basic-auth path), session-id regeneration on login, revocation of other sessions on password change, and a cross-origin (CSRF) gate on state-changing API requests.
- **Coarse per-IP request rate limiting** (`express-rate-limit`) across all handlers, including the unauthenticated `/files/` download path.
- **Trustworthy client IP:** `trust proxy` is now `loopback`, so `X-Forwarded-For` is honored only from Caddy / SSH-tunnel peers and can no longer be spoofed.
- **Monitoring SSRF guard:** monitor targets are validated on create **and** update; literal private/reserved/link-local addresses (incl. cloud metadata) are rejected, and intervals/timeouts are bounded. Built-in monitors may still probe local services.
- **Reverse-proxy / Caddyfile injection guards:** target URLs, domains and IP allowlists are validated on every path (create, update, app install); the generator refuses control/brace characters, and the Server Endpoint action snapshots and rolls back the Caddyfile if a reload fails.
- **Restore hardening:** backup archives are validated before extraction (no absolute paths, `..` traversal, or symlink/hardlink/device entries); extraction uses `--no-same-owner --no-overwrite-dir`. `restore.sh` keeps the repo `docker-compose.yml` unless `--use-archive-compose` is given.
- **Secrets at rest:** `portal-config.json`, `notifications.json`, `.env` and `.env.secrets` are created/kept `0600`.
- **Security headers:** Caddy now adds `X-Frame-Options: SAMEORIGIN`, a `Permissions-Policy` and a `Content-Security-Policy` alongside the existing HSTS / `X-Content-Type-Options` / `Referrer-Policy`. The CSP is **enforced** — it shipped as `Content-Security-Policy-Report-Only`, which protected nothing and, with no `report-uri` configured, collected nothing either. *(Applied by `bootstrap.sh` / the Server Endpoint action; a plain `easywg update` does not regenerate the Caddyfile — see [docs/security-model.md](docs/security-model.md#security-headers).)*
- **Fail2Ban reads Caddy's timestamps:** the `easy-wg-portal` filter now sets `datepattern = "ts":{EPOCH}`. Caddy logs a floating-point epoch that Fail2Ban could not parse, so it fell back to "Simulate NOW" and measured `findtime`/`bantime` from the time it read the line instead of the time of the attempt. Existing installs: re-run `./bootstrap.sh`.

### Added
- **Release and configuration-drift check on the dashboard.** The portal now reports its own version, compares it against the latest GitHub release (cached 6 h, `UPDATE_CHECK_ENABLED=no` to disable), and — more importantly — warns when the live `caddy/Caddyfile` has stopped serving any of the six security headers or still carries a report-only CSP. Both halves fail soft: no network, a rate-limited API or an unreadable Caddyfile leaves the banners hidden rather than raising a false alarm. New endpoint `GET /api/system/updates`; translated EN/FR/ZH.
- The portal image carries its version in `APP_VERSION`, baked at build time, so an image-based deployment no longer needs the git checkout to know what it runs.
- **CI publishes the portal image to `ghcr.io/r45635/easy-wg-combo-portal`** (version, commit SHA and `latest` tags), after every other job passes, and only on a push to this repository — a fork or a pull request cannot publish. This is the groundwork for updating a server by *pulling* the portal instead of compiling it there: on a 1 vCPU / 1 GB VPS, `compose up -d --build` is exactly what this project tells you not to do. The package is public, and `docker-compose.yml` now carries both `image:` and `build:`: `compose pull` fetches the prebuilt image so a small VPS can update with `./compose.sh up -d --no-build` instead of compiling, while `up -d --build` still builds from source for development. See [Updating without compiling on the server](docs/advanced-install.md#easywg-update-pulls-it-does-not-compile).
- `easywg passwd` — rotate the admin password across `.env`, the wg-easy hash and the portal in one step.
- `SESSION_SECRET` is now actually delivered to the portal container; `WG_EASY_PASSWORD` / `ADGUARD_PASSWORD` can be pinned independently of `ADMIN_PASSWORD`.
- Test suite (`node:test`, 69 tests) covering File Drop enforcement, capability gating, auth, monitor/Caddy/tar guards and boot behavior; `npm test` runs in CI.
- CI security gates: Gitleaks (secret scan over full history), CodeQL (JavaScript + Actions), Trivy image scan, and a blocking `npm audit --audit-level=high`.
- `doctor` now checks that AdGuard is reachable through the portal proxy (flags a diverged AdGuard wizard password).
- `doctor` now flags a `caddy/Caddyfile` that serves no security headers, or one still carrying a report-only CSP — the case an `easywg update` cannot fix on its own.
- `doctor` now detects a stale `/var/run/fail2ban` bind mount in the portal container (left behind by `systemctl restart fail2ban`, which recreates the directory with a new inode). The portal then reports Fail2Ban inactive while it is running; the fix is `docker restart portal`.
- `doctor` now verifies the Fail2Ban filter carries a `datepattern`.

### Changed
- Portal base image `node:22-bookworm-slim` is now digest-pinned (matches the other images).
- Dependency updates: Express 4 → **5.3.0**, nodemailer → **10.1.7**, express-rate-limit → **8.7.1**, AdGuard Home → `v0.107.79`, Xray → `26.10.17`, Caddy digest refreshed. `ip-address` was pinned to 10.7.2 to clear a transitive advisory pulled in by express-rate-limit 8 (the portal's own CIDR checks in `portal/lib/net-guards.js` were never affected).

### Fixed
- `POST /api/migration/validate` no longer 500s (undefined `caddyUp` reference).

## [0.4.0] — 2026-07-26

### Added
- Xray VLESS+Reality opt-in overlay for DPI-resistant tunneling, with per-device UUIDs, QR modal from the Devices list, and `easywg xray` CLI commands
- Server Endpoint setting in the admin portal — cascades Caddyfile, TLS and Caddy reload in one step
- Real Let's Encrypt certificate for the portal in Xray mode (HTTP-01 on port 80), with automatic fallback to a self-signed certificate when the FQDN does not point at the server
- Mobile responsive layout (hamburger sidebar)
- Client apps guide (WireGuard + VLESS+Reality) with download links
- `easywg update` command — safe one-step update: dirty-tree check, `git pull --ff-only`, image pull, rebuild, health check
- CI: 3-job workflow (shellcheck on all shell entry points including `bootstrap.sh`/`install.sh`/`compose.sh`, compose validation including the Xray overlay, portal syntax check + image build + boot smoke test), weekly scheduled run
- Dependabot automation for npm, Docker images, compose images and GitHub Actions
- `VERSION` file as the single source of truth for the project version
- `CHANGELOG.md`, `SECURITY.md`

### Changed
- All container images pinned: wg-easy `14` digest-pinned (v15 is a breaking rewrite — major bumps blocked in Dependabot), AdGuard `v0.107.77`, Caddy `2-alpine` digest-pinned, Xray `26.7.11`, portal base image `node:22-bookworm-slim` (Node 20 is EOL)
- App catalog images pinned (Vaultwarden `1.37.0`, Stirling PDF `2.14.2`, ntfy `v2`, FileBrowser `v2`)
- `bootstrap.sh` reads the Xray image reference from `docker-compose.xray.yml` instead of duplicating it
- `npm audit` in CI is now a non-blocking report (Dependabot owns dependency fixes)
- Backups are stamped with the `VERSION` file + git commit instead of the portal `package.json` version

### Fixed
- Xray lifecycle hardening: certificate generator drift, re-run data loss, idempotent key generation, container cleanup when `XRAY_ENABLED` switches off
- Caddy binds to `domain:port` so the TLS certificate matches the hostname
- DNS routing from VPN clients to AdGuard via DNAT in the wg-easy PostUp hook
- Service status checks use Docker container state instead of probing port 443
- nodemailer upgraded to v9 (GHSA-p6gq-j5cr-w38f)

### Security
- VLESS QR codes, URIs and the Reality public key redacted from documentation screenshots

## [0.3.0-alpha] — 2026-06-13

Initial public alpha: WireGuard device management (wg-easy v14), AdGuard Home DNS filtering with per-device presets, admin portal with three interface modes (User / Super User / Advanced), Security Center, backups, monitoring, notifications, gateway/apps/filedrop previews.

[0.6.8]: https://github.com/r45635/Easy-WG-Combo/compare/v0.6.7...v0.6.8
[0.6.7]: https://github.com/r45635/Easy-WG-Combo/compare/v0.6.6...v0.6.7
[0.6.6]: https://github.com/r45635/Easy-WG-Combo/compare/v0.6.5...v0.6.6
[0.6.5]: https://github.com/r45635/Easy-WG-Combo/compare/v0.6.4...v0.6.5
[0.6.4]: https://github.com/r45635/Easy-WG-Combo/compare/v0.6.3...v0.6.4
[0.6.3]: https://github.com/r45635/Easy-WG-Combo/compare/v0.6.2...v0.6.3
[0.6.2]: https://github.com/r45635/Easy-WG-Combo/compare/v0.6.1...v0.6.2
[0.6.1]: https://github.com/r45635/Easy-WG-Combo/compare/v0.6.0...v0.6.1
[0.6.0]: https://github.com/r45635/Easy-WG-Combo/compare/v0.5.6...v0.6.0
[0.5.6]: https://github.com/r45635/Easy-WG-Combo/compare/v0.5.5...v0.5.6
[0.5.5]: https://github.com/r45635/Easy-WG-Combo/compare/v0.5.4...v0.5.5
[0.5.4]: https://github.com/r45635/Easy-WG-Combo/compare/v0.5.3...v0.5.4
[0.5.3]: https://github.com/r45635/Easy-WG-Combo/compare/v0.5.2...v0.5.3
[0.5.2]: https://github.com/r45635/Easy-WG-Combo/compare/v0.5.1...v0.5.2
[0.5.1]: https://github.com/r45635/Easy-WG-Combo/compare/v0.5.0...v0.5.1
[0.5.0]: https://github.com/r45635/Easy-WG-Combo/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/r45635/Easy-WG-Combo/compare/v0.3.0-alpha...v0.4.0
[0.3.0-alpha]: https://github.com/r45635/Easy-WG-Combo/releases/tag/v0.3.0-alpha
