# Brand assets

`icon.svg` is the project's icon: the hexagon the portal already shows as its logo, in the
UI's own colours — `#7c6af7` (`--primary`) on `#0d1117` (`--bg`). Change the mark here, nowhere
else; everything served to browsers is generated from this one file.

## Regenerating

```bash
bash docs/brand/make-icons.sh
```

Needs `rsvg-convert` (`brew install librsvg`). It writes, and you commit:

| File | Who asks for it |
|---|---|
| `portal/public/favicon.svg` | modern browsers, preferred over the `.ico` |
| `portal/public/favicon.ico` | 16/32/48 px — the bare `/favicon.ico` a browser requests when no `<link>` matches, and Windows |
| `portal/public/apple-touch-icon.png` | iOS and iPadOS, when the portal is added to the home screen |

`png2ico.py` packs the three PNGs into the `.ico` using only the standard library, so the build
needs no image package. The `<link>` tags live in `portal/public/index.html`.

## What browsers actually receive is NOT these files

Since 0.6.7 the three files above are **templates**. The portal derives its own copy of each, with a
harmless difference — an XML comment in the SVG, a `tEXt` chunk in the PNG, bytes appended after the
last image in the ICO — and serves *those*. The rendered pixels are identical; the bytes, the file
sizes and therefore the Shodan/FOFA favicon hash are not.

The reason: a favicon hash is a search key. Before 0.6.7 both reference installs answered
`/favicon.ico` with mmh3 `-2025595950`, the same value as this repository and as every other install
of it, so one query listed them all. Because the repo is public, a per-install file can never come
from git — hence derivation at runtime.

Since 0.6.8 the difference comes from **one seed** in `portal/data/brand/install-id`, and the files
are derived **in memory** at every start rather than written to the data directory. That matters when
changing the mark here:

- **A new mark committed here does reach existing installs** — on their next update, with their own
  hash. Under 0.6.7 it did not: the generated file already existed in their data directory, so it was
  kept, and the install would have served the old icon forever. Nothing to delete by hand any more.
- Deleting `portal/data/brand/install-id` is only for *changing a host's fingerprint*; it is not part
  of adopting a new mark. The install derives a fresh seed, and all of its hashes move.
- Derivation is deterministic in (seed, file), so an update that does not touch a file leaves that
  file's hash exactly where it was.
- `portal/lib/brand.js` holds the derivation (and `portal/test/brand.test.js` the proof that two
  fresh installs differ, that the same install reproduces its bytes, and that a changed source does
  propagate). `./easywg doctor` fails if a host serves a file identical to the one here.

## Two things that look like mistakes and are not

- **The hexagon uses mitred joins, not round ones.** Round joins blur the six corners into a plain
  ring at 16 px — the shape stops being a hexagon exactly where the icon is smallest.
- **`apple-touch-icon.png` has square corners.** iOS applies its own rounded mask; shipping our
  radius as well leaves black wedges in the corners.

## Not generated here

The GitHub repository's social preview (1280×640) is set in the repository settings, not from a
file in the tree.
