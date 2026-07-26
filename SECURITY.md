# Security Policy

## Supported versions

Only the latest `main` branch is supported. Update with `./easywg update` (or re-run the installer).

## Reporting a vulnerability

Please report vulnerabilities privately via [GitHub private vulnerability reporting](https://github.com/r45635/Easy-WG-Combo/security/advisories/new) — do not open a public issue.

You can expect an acknowledgement within a few days. Fixes are released on `main` and noted in [CHANGELOG.md](CHANGELOG.md).

## Scope notes

- The admin portal is a privileged component; see [docs/security-model.md](docs/security-model.md) for the threat model and exposure modes.
- Preview features (Apps, File Drop, Migration) are explicitly not production-hardened.
