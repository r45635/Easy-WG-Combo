#!/usr/bin/env python3
"""Pack PNG files into a Windows .ico, using only the standard library.

Every PNG given on the command line becomes one image in the icon; the last
argument is the .ico to write. Modern browsers and Windows Vista and later read
PNG payloads inside an .ico directly, so no BMP re-encoding is needed.

    png2ico.py 16.png 32.png 48.png favicon.ico
"""

import struct
import sys


def png_size(data: bytes) -> tuple[int, int]:
    """Width and height from the IHDR chunk, which a PNG must start with."""
    if data[:8] != b"\x89PNG\r\n\x1a\n" or data[12:16] != b"IHDR":
        raise ValueError("not a PNG file (missing signature or IHDR)")
    return struct.unpack(">II", data[16:24])


def build(png_paths: list[str], ico_path: str) -> None:
    images = []
    for p in png_paths:
        with open(p, "rb") as fh:
            data = fh.read()
        w, h = png_size(data)
        if not 1 <= w <= 256 or not 1 <= h <= 256:
            raise ValueError(f"{p}: {w}x{h} is outside the 1..256 an .ico can describe")
        images.append((w, h, data))

    header = struct.pack("<HHH", 0, 1, len(images))
    # Each directory entry is 16 bytes; payloads follow the whole directory.
    offset = len(header) + 16 * len(images)
    directory, payloads = b"", b""
    for w, h, data in images:
        directory += struct.pack(
            "<BBBBHHII",
            w % 256,  # 0 means 256
            h % 256,
            0,  # palette size: 0 for a true-colour image
            0,  # reserved
            1,  # colour planes
            32,  # bits per pixel
            len(data),
            offset,
        )
        payloads += data
        offset += len(data)

    with open(ico_path, "wb") as fh:
        fh.write(header + directory + payloads)


if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit("usage: png2ico.py <in.png> [in.png ...] <out.ico>")
    build(sys.argv[1:-1], sys.argv[-1])
