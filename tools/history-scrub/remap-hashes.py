"""Rewrite commit hashes cited in the checked-out tree, using filter-repo's commit-map.

Usage: python3 remap-hashes.py <path/to/filter-repo/commit-map>   (run inside a work tree)

A cited hash is replaced only when it is a prefix of exactly ONE old commit; it keeps its length.
Data folders are skipped: their hex ids are not commit citations.
"""
import re, subprocess, sys

SKIP = ('packs/', 'packs-src/', 'archive/', 'rawdata/', 'package-lock.json')
HEX = re.compile(r'\b[0-9a-f]{7,40}\b')

pairs = [l.split() for l in open(sys.argv[1]).read().splitlines()[1:]]
old_to_new = {o: n for o, n in pairs if o != n and not set(n) <= {'0'}}
olds = sorted(old_to_new)

def remap(m):
    h = m.group(0)
    hits = [o for o in olds if o.startswith(h)]
    return old_to_new[hits[0]][:len(h)] if len(hits) == 1 else h

files = subprocess.check_output(['git', 'ls-files', '-z']).decode().split('\0')
changed = 0
for f in filter(None, files):
    if f.startswith(SKIP): continue
    try: s = open(f, encoding='utf8', newline='').read()
    except (UnicodeDecodeError, FileNotFoundError, IsADirectoryError): continue
    n = HEX.sub(remap, s)
    if n != s:
        open(f, 'w', encoding='utf8', newline='').write(n); changed += 1; print('remapped', f)
print(f'{changed} file(s) changed')
