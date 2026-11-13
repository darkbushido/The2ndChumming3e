#!/usr/bin/env python3
"""Key generated pictures to a transparent background with no fringe -- TODO 300 (weapon pictures).

    python tools/key-art.py <in dir of .png> <out dir>  [--tolerance 28] [--size 512]

The ComfyUI batch (tools/weapon-art-prompts.mjs) draws on a flat white background. For each picture:
  1. the background is the colour connected to the border within --tolerance (a flood fill), plus enclosed
     background-coloured blobs of at least --min-hole of the picture (inside a trigger guard); a small white
     highlight -- a lens glint -- stays opaque;
  2. the edge gets a soft alpha from the colour distance, and the background colour is un-mixed from those edge
     pixels (colour decontamination), so no white halo shows on a dark sheet;
  3. trimmed to the object, centred on a square --size canvas, saved as <name>.webp (lossless, alpha).
Needs Pillow and numpy. Writes only to <out dir>.
"""
import argparse
import os
import sys
from collections import deque

import numpy as np
from PIL import Image


def key(img, tol, min_hole=0.0015):
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
    # Soft edge: pixels touching the background ramp from 0 at tol to 1 at 3*tol.
    alpha = np.where(seen, 0.0, 1.0)
    grown = seen.copy()
    grown[1:] |= seen[:-1]; grown[:-1] |= seen[1:]; grown[:, 1:] |= seen[:, :-1]; grown[:, :-1] |= seen[:, 1:]
    edge = grown & ~seen
    alpha[edge] = np.clip((dist[edge] - tol) / (2 * tol), 0.0, 1.0)
    # Decontaminate: observed = a*fg + (1-a)*bg  =>  fg = (observed - (1-a)*bg) / a
    a = alpha[..., None]
    fg = np.where(a > 0, (rgb - (1 - a) * bg) / np.maximum(a, 1e-3), 0)
    out = np.dstack([np.clip(fg, 0, 255), alpha * 255]).astype(np.uint8)
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
    p.add_argument('--min-hole', type=float, default=0.0015, help='enclosed background blobs at least this share of the picture are keyed')
    p.add_argument('--keep-orange', action='store_true', help='skip the de-orange step')
    args = p.parse_args()
    os.makedirs(args.dst, exist_ok=True)
    n = 0
    for f in sorted(os.listdir(args.src)):
        if not f.lower().endswith('.png'):
            continue
        img = key(Image.open(os.path.join(args.src, f)), args.tolerance, args.min_hole)
        img = fit(img if args.keep_orange else de_orange(img), args.size)
        img.save(os.path.join(args.dst, os.path.splitext(f)[0] + '.webp'), 'WEBP', lossless=True)
        n += 1
    print(f'{n} pictures keyed -> {args.dst}', file=sys.stderr)


if __name__ == '__main__':
    main()
