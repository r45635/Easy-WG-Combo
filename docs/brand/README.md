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

## Two things that look like mistakes and are not

- **The hexagon uses mitred joins, not round ones.** Round joins blur the six corners into a plain
  ring at 16 px — the shape stops being a hexagon exactly where the icon is smallest.
- **`apple-touch-icon.png` has square corners.** iOS applies its own rounded mask; shipping our
  radius as well leaves black wedges in the corners.

## Not generated here

The GitHub repository's social preview (1280×640) is set in the repository settings, not from a
file in the tree.
