/**
 * Every script parses.
 *
 * ⚠ `node --check` is useless here (CLAUDE.md, *Known issues*): on an ES module in a `.js` file it
 * exits 0 on a genuine syntax error. And most of `scripts/` — the sheets, `sr3e.js`, the dialogs —
 * cannot be imported without Foundry, so no other suite ever loads them. A stray apostrophe in a
 * sheet's string literal therefore passed every test on 2026-09-13 and would have shipped a sheet
 * that does not open; ESLint caught it. This suite parses every file with ESLint's own parser
 * (espree), so `node tests/run.mjs` catches it too.
 *
 * Macros are the bodies of world Macros — top-level `await` and `return` — so they are parsed
 * wrapped in an async function, which is how Foundry runs them.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as espree from 'espree';

export const name = 'syntax';

const ROOT = fileURLToPath(new URL('../scripts/', import.meta.url));

function* files(dir) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) yield* files(p);
    else if (/\.(m?js)$/.test(n)) yield p;
  }
}

export async function run(t) {
  let count = 0;
  for (const p of files(ROOT)) {
    const rel = p.slice(ROOT.length).replace(/\\/g, '/');
    const src = readFileSync(p, 'utf8');
    const macro = rel.startsWith('macros/');
    let err = null;
    try {
      espree.parse(macro ? `(async function () {\n${src}\n})` : src,
        { ecmaVersion: 'latest', sourceType: macro ? 'script' : 'module' });
    } catch (e) { err = `${e.message} (line ${macro ? e.lineNumber - 1 : e.lineNumber})`; }
    t.is(`scripts/${rel} parses`, err, null);
    count++;
  }
  t.ok(`found the scripts (${count})`, count > 40);
}
