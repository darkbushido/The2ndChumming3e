/**
 * Every asset path the system names must exist with EXACTLY that case.
 *
 * Windows and macOS file systems ignore case; a Linux Foundry server does not. The pause-screen logo
 * was `url('textures/shadowrun-logo.svg')` against a file called `Shadowrun-logo.svg`: it loaded on
 * the maintainer's machine and 404'd on the production server (seen in its browser console).
 *
 * Checked: every `systems/The2ndChumming3e/…` path in scripts, styles, the manifest and the shipped
 * pack sources, and every relative `url(…)` in the stylesheet.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

export const name = 'asset-paths';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Does `rel` (forward slashes, from the repo root) exist with exactly this case? */
export function existsExact(rel) {
  let cur = ROOT;
  for (const part of rel.split('/').filter(p => p && p !== '.')) {
    if (!existsSync(cur) || !readdirSync(cur).includes(part)) return false;
    cur = join(cur, part);
  }
  return true;
}

const walk = (dir, out = []) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
};

const EXT = '(?:webp|png|jpg|jpeg|svg|css|js|mjs|json|woff2?|ttf|mp3|ogg|wav)';

export async function run(t) {
  const files = [
    ...walk(join(ROOT, 'scripts')),
    ...walk(join(ROOT, 'styles')).filter(f => f.endsWith('.css')),
    ...walk(join(ROOT, 'packs-src')),
    join(ROOT, 'system.json'),
  ].filter(f => /\.(js|mjs|css|json)$/.test(f));

  const sysPath = new RegExp(`systems/The2ndChumming3e/([A-Za-z0-9_\\-./]+\\.${EXT})`, 'g');
  const missing = new Set();
  for (const f of files) {
    const text = readFileSync(f, 'utf8');
    for (const m of text.matchAll(sysPath)) {
      if (!existsExact(m[1])) missing.add(`${f.slice(ROOT.length + 1).replace(/\\/g, '/')} → ${m[1]}`);
    }
  }
  t.is('every systems/The2ndChumming3e/… path exists with the same case', [...missing].slice(0, 10).join('\n'), '');

  const css = join(ROOT, 'styles', 'sr3e.css');
  const cssBad = [];
  for (const m of readFileSync(css, 'utf8').matchAll(/url\(\s*['"]?([^'")]+?)['"]?\s*\)/g)) {
    if (/^(data:|https?:|\/)/.test(m[1])) continue;
    const rel = posix.join('styles', m[1]);
    if (!existsExact(rel)) cssBad.push(rel);
  }
  t.is('every relative url() in sr3e.css exists with the same case', cssBad.join('\n'), '');

  t.ok('the checker can tell case apart (a wrong-case path is missing)',
    existsExact('styles/textures/Shadowrun-logo.svg') && !existsExact('styles/textures/shadowrun-logo.svg'));
}
