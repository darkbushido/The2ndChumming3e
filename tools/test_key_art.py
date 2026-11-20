"""Synthetic check for tools/key-art.py: dark disc on white, anti-aliased edge, a white glint inside.
Run: python tools/test_key_art.py   (Pillow + numpy)"""
import importlib.util
import os

import numpy as np
from PIL import Image, ImageDraw

spec = importlib.util.spec_from_file_location('key_art', os.path.join(os.path.dirname(__file__), 'key-art.py'))
ka = importlib.util.module_from_spec(spec); spec.loader.exec_module(ka)

S, R = 400, 100
big = Image.new('RGB', (S * 4, S * 4), 'white')
d = ImageDraw.Draw(big)
d.ellipse((S * 2 - R * 4, S * 2 - R * 4, S * 2 + R * 4, S * 2 + R * 4), fill=(40, 50, 60))
d.ellipse((S * 2 - 60, S * 2 - 60, S * 2 - 20, S * 2 - 20), fill=(255, 255, 255))  # glint, enclosed + small
img = big.resize((S, S), Image.LANCZOS)  # anti-aliased edge

out = np.asarray(ka.key(img, 28))
rgb, a = out[..., :3], out[..., 3]
vis = a > 0
assert vis.any()
fringe = vis & (rgb.min(axis=2) > 200)
glint = fringe[S // 2 - 20:S // 2 - 5, S // 2 - 20:S // 2 - 5]
fringe[S // 2 - 20:S // 2, S // 2 - 20:S // 2] = False  # the glint area is legitimately white
assert not fringe.any(), f'{fringe.sum()} white-fringe pixels'
assert a[S // 2 + 30, S // 2 + 30] == 255 and a[S // 2, S // 2 + R - 10] == 255, 'interior not opaque'
assert a[0, 0] == 0 and a[S // 2, 2] == 0, 'background not keyed'
assert (a[S // 2 - 15, S // 2 - 15] == 255), 'glint was keyed'
# Without the fix a halo survived: confirm edge pixels were really processed (semi-transparent ones exist)
assert ((a > 0) & (a < 255)).any()
print('ok')
