#!/usr/bin/env python3
"""Key generated pictures to a transparent background with no fringe -- TODO 300 (weapon pictures).

    python tools/key-art.py <in dir of .png> <out dir>  [--tolerance 28] [--size 512]
                [--band 3] [--ramp-lo 10] [--ramp-hi 100] [--defringe 1] [--min-alpha 12]

The ComfyUI batch (tools/weapon-art-prompts.mjs) draws on a flat white background. For each picture:
  1. the background is the colour connected to the border within --tolerance (a flood fill), plus enclosed
     background-coloured blobs of at least --min-hole of the picture (inside a trigger guard); a small white
     highlight -- a lens glint -- stays opaque;
  2. pixels within --band px of the background get a soft alpha from their gap to the background colour, alpha is
     eroded --defringe px and faint pixels (< --min-alpha of 255) dropped, and the background colour is un-mixed
     from what is left (colour decontamination), so no white halo shows on a dark sheet;
  3. trimmed to the object, centred on a square --size canvas, saved as <name>.webp (lossless, alpha).
Needs Pillow and numpy. Writes only to <out dir>.
"""
import argparse
import os
import sys
from collections import deque

import numpy as np
from PIL import Image


def key(img, tol, min_hole=0.0015, band=3, lo=10.0, hi=100.0, defringe=1, min_alpha=12):
    rgb = np.asarray(img.convert('RGB'), dtype=np.float32)
    h, w, _ = rgb.shape
    border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
    bg = np.median(border, axis=0)
    dist = np.sqrt(((rgb - bg) ** 2).sum(axis=2))
    near = dist <= tol
    # Flood fill from the border through background-coloured pixels.
    seen = np.zeros((h, w), bool)
    q = deque((y, x) for y in range(h) for x in (0, w - 1) if near[y, x])
    q.extend((y, x) for x in range(w) for y in (0, h - 1) if near[y, x])
    for y, x in q:
        seen[y, x] = True
    while q:
        y, x = q.popleft()
        for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
            if 0 <= ny < h and 0 <= nx < w and not seen[ny, nx] and near[ny, nx]:
                seen[ny, nx] = True
                q.append((ny, nx))
    # Enclosed background (inside a trigger guard, a stock's cut-out): a near-background blob of at least --min-hole of
    # the picture. Smaller ones (a lens glint, a white LED) stay opaque.
    min_px = max(1, int(h * w * min_hole))
    left = near & ~seen
    for sy, sx in zip(*np.nonzero(left)):
        if not left[sy, sx]:
            continue
        blob, q2 = [(sy, sx)], deque([(sy, sx)])
        left[sy, sx] = False
        while q2:
            y, x = q2.popleft()
            for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= ny < h and 0 <= nx < w and left[ny, nx]:
                    left[ny, nx] = False
                    blob.append((ny, nx)); q2.append((ny, nx))
        if len(blob) >= min_px:
            ys, xs = zip(*blob)
            seen[list(ys), list(xs)] = True
    # Soft edge. Only pixels within --band px of the keyed background get a soft alpha (so a light object's interior
    # is never made see-through): alpha = clamp((maxdiff - lo) / (hi - lo)), maxdiff = the largest channel gap to the
    # background colour. A one-pixel ring is not enough: anti-aliasing and the generator's softness leave 2-3 px of
    # near-white, part-blended pixels, and those were the white halo.
    alpha = np.where(seen, 0.0, 1.0)
    grown = seen.copy()
    for _ in range(max(1, band)):
        g = grown.copy()
        g[1:] |= grown[:-1]; g[:-1] |= grown[1:]; g[:, 1:] |= grown[:, :-1]; g[:, :-1] |= grown[:, 1:]
        grown = g
    edge = grown & ~seen
    maxdiff = np.abs(rgb - bg).max(axis=2)
    alpha[edge] = np.clip((maxdiff[edge] - lo) / max(hi - lo, 1e-3), 0.0, 1.0)
    # Defringe: erode alpha (3x3 cross minimum) --defringe times, then drop faint leftovers.
    for _ in range(defringe):
        e = alpha.copy()
        e[1:] = np.minimum(e[1:], alpha[:-1]); e[:-1] = np.minimum(e[:-1], alpha[1:])
        e[:, 1:] = np.minimum(e[:, 1:], alpha[:, :-1]); e[:, :-1] = np.minimum(e[:, :-1], alpha[:, 1:])
        alpha = e
    alpha[alpha * 255 < min_alpha] = 0.0
    # Decontaminate (un-premultiply against the background): observed = a*fg + (1-a)*bg  =>  fg = (observed - (1-a)*bg) / a
    a = alpha[..., None]
    fg = np.where(a > 0, (rgb - (1 - a) * bg) / np.maximum(a, 1e-3), 0)
    out = np.dstack([np.clip(fg, 0, 255), alpha * 255]).round().astype(np.uint8)
    return Image.fromarray(out, 'RGBA')


def de_orange(img):
    """Grey out safety-orange tips and caps (the maintainer, 2026-11-13: "i don't like the orange caps on them").
    Only bright, saturated orange is touched; wood (darker, duller brown) is kept."""
    a = np.asarray(img.convert('RGBA')).astype(np.float32)
    hsv = np.asarray(img.convert('RGB').convert('HSV')).astype(np.float32)
    h, sat, val = hsv[..., 0] * 360 / 255, hsv[..., 1] / 255, hsv[..., 2] / 255
    mask = (h >= 8) & (h <= 45) & (sat > 0.35) & (val > 0.55)
    grey = (a[..., 0] * 0.3 + a[..., 1] * 0.59 + a[..., 2] * 0.11) * 0.55   # darkened to gunmetal
    for c in range(3):
        a[..., c] = np.where(mask, grey, a[..., c])
    return Image.fromarray(a.astype(np.uint8), 'RGBA')


def fit(img, size):
    box = img.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    if box:
        img = img.crop(box)
    img.thumbnail((int(size * 0.94), int(size * 0.94)), Image.LANCZOS)
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    canvas.paste(img, ((size - img.width) // 2, (size - img.height) // 2), img)
    return canvas


def main():
    p = argparse.ArgumentParser()
    p.add_argument('src'); p.add_argument('dst')
    p.add_argument('--tolerance', type=float, default=28)
    p.add_argument('--size', type=int, default=512)
    p.add_argument('--band', type=int, default=3, help='px from the background that get a soft alpha')
    p.add_argument('--ramp-lo', type=float, default=10, help='gap to the background at or below which alpha is 0')
    p.add_argument('--ramp-hi', type=float, default=100, help='gap at or above which alpha is 1')
    p.add_argument('--defringe', type=int, default=1, help='px to erode the alpha edge (0 = off)')
    p.add_argument('--min-alpha', type=float, default=12, help='alpha (0-255) below which a pixel is dropped')
    p.add_argument('--min-hole', type=float, default=0.0015, help='enclosed background blobs at least this share of the picture are keyed')
    p.add_argument('--keep-orange', action='store_true', help='skip the de-orange step')
    args = p.parse_args()
    os.makedirs(args.dst, exist_ok=True)
    n = 0
    for f in sorted(os.listdir(args.src)):
        if not f.lower().endswith('.png'):
            continue
        img = key(Image.open(os.path.join(args.src, f)), args.tolerance, args.min_hole,
                  args.band, args.ramp_lo, args.ramp_hi, args.defringe, args.min_alpha)
        img = fit(img if args.keep_orange else de_orange(img), args.size)
        img.save(os.path.join(args.dst, os.path.splitext(f)[0] + '.webp'), 'WEBP', lossless=True)
        n += 1
    print(f'{n} pictures keyed -> {args.dst}', file=sys.stderr)


if __name__ == '__main__':
    main()
