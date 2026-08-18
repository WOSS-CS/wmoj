#!/usr/bin/env python3
"""figure.py — pull a figure out of a problem PDF and get it ready to upload.

**Run `pdfimages -list <pdf>` first.** Most CCC figures are vector art and this
script is the right tool for them. But a real minority are embedded bitmaps,
and rendering one of those at high dpi yields a bigger file with zero extra
detail — an upscale wearing the costume of a fix. When `pdfimages` lists an
image, that is the resolution ceiling; extract it with `pdfimages -png` and
upload it as-is, unless the PDF draws something on top of it (labels,
annotation lines, a frame), in which case rendering the page is right after
all. See reference/figures.md.

For the vector case, the working route is: render the whole page to a PNG, look
at it, crop the figure out by eye, and let this script tighten the crop.

    figure.py render <pdf> <outdir> [--page N] [--dpi 600]
    figure.py crop <page.png> <out.png> <l> <t> <r> <b> [--pad 3] [--no-trim]

`crop` takes the box either as fractions of the page (all four values <= 1) or
as pixels of <page.png>. It then trims the surrounding whitespace on its own,
so the box you give only has to *contain* the figure and exclude neighbouring
text — the exact edges do not matter. Finally it downscales to --max-width,
pads, and quantises, keeping figures well under the bucket's 5 MB cap.

Prefer fractions: they are resolution-independent, so the same box re-crops
correctly if you re-render the page at a different dpi. --pad is a percentage
of the finished width for the same reason — an absolute pixel pad silently
changes the framing when the dpi changes.

The 600 dpi default is deliberate. A figure needs about twice as many pixels as
the CSS width it renders at, or it looks soft on a HiDPI display, and rendering
at 200 dpi leaves no margin at all for a figure that is small on the page. Over-
rendering is free: --max-width clamps the result either way.

Always look at the output before uploading. Auto-trim cannot tell a stray line
of text from part of the diagram; it will happily keep it.
"""

import argparse
import subprocess
import sys
from pathlib import Path

from PIL import Image

WHITE = (255, 255, 255)


def render(args):
    out = Path(args.outdir)
    out.mkdir(parents=True, exist_ok=True)
    cmd = ["pdftoppm", "-r", str(args.dpi), "-png"]
    if args.page:
        cmd += ["-f", str(args.page), "-l", str(args.page)]
    cmd += [args.pdf, str(out / Path(args.pdf).stem)]
    subprocess.run(cmd, check=True)
    for p in sorted(out.glob(f"{Path(args.pdf).stem}*.png")):
        w, h = Image.open(p).size
        print(f"{p}  {w}x{h}")


def trim(im, threshold=250):
    """Shrink to the bounding box of everything that is not near-white."""
    grey = im.convert("L").point(lambda v: 0 if v >= threshold else 255)
    box = grey.getbbox()
    return im.crop(box) if box else im


def crop(args):
    im = Image.open(args.page).convert("RGB")
    w, h = im.size
    l, t, r, b = args.box
    if max(args.box) <= 1.0:
        l, t, r, b = l * w, t * h, r * w, b * h
    box = tuple(int(round(v)) for v in (l, t, r, b))
    if box[0] >= box[2] or box[1] >= box[3]:
        sys.exit(f"figure.py: empty box {box}")
    im = im.crop(box)

    if not args.no_trim:
        im = trim(im)

    if im.width > args.max_width:
        scale = args.max_width / im.width
        im = im.resize((args.max_width, max(1, round(im.height * scale))), Image.LANCZOS)

    # Pad last, as a share of the finished width. An absolute pixel pad applied
    # before the downscale makes the margin depend on the render dpi, so the
    # same crop box reframes itself when you re-render the page.
    pad = round(im.width * args.pad / 100)
    if pad:
        padded = Image.new("RGB", (im.width + 2 * pad, im.height + 2 * pad), WHITE)
        padded.paste(im, (pad, pad))
        im = padded

    # Figures are flat-colour line art, so a 256-colour palette is visually
    # lossless here and cuts the file by roughly two thirds.
    im.convert("P", palette=Image.ADAPTIVE, colors=256).save(args.out, optimize=True)
    print(f"{args.out}  {im.width}x{im.height}  {Path(args.out).stat().st_size}B")


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    sub = ap.add_subparsers(dest="cmd", required=True)

    r = sub.add_parser("render", help="render PDF pages to PNGs")
    r.add_argument("pdf")
    r.add_argument("outdir")
    r.add_argument("--page", type=int, default=None, help="one page; default all")
    r.add_argument("--dpi", type=int, default=600)
    r.set_defaults(func=render)

    c = sub.add_parser("crop", help="crop a figure out of a rendered page")
    c.add_argument("page")
    c.add_argument("out")
    # A tuple metavar on an nargs=4 positional makes argparse crash formatting
    # --help, so name it once and spell the four values out in the help text.
    c.add_argument("box", nargs=4, type=float, metavar="F",
                   help="crop box as four numbers: left top right bottom, "
                        "either fractions of the page (all four <= 1) or pixels")
    c.add_argument("--pad", type=float, default=3,
                   help="white margin, as a %% of the finished width (default 3)")
    c.add_argument("--no-trim", action="store_true")
    c.add_argument("--max-width", type=int, default=1600)
    c.set_defaults(func=crop)

    args = ap.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
