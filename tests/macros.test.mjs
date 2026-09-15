/**
 * The world macros that remain — TODO 1.
 *
 * The book split renamed every pack from `sr3e-<type>` to `sr3e-<book>-<type>` and the populate
 * macros were never updated, so 24 of 27 failed at `game.packs.get()`. Worse, the `ready` hook
 * AUTO-CREATED two of them (agents, hosts) in every GM's macro library, where they could only
 * fail. They were retired, not repaired: since TODO 12 the packs are built from `packs-src/`, and
 * every row the macros carried already ships (the two exceptions are drugs no book prints).
 *
 * This keeps it that way:
 *   · every macro the `ready` hook creates exists on disk;
 *   · nothing in scripts/, tools/ or tests/ names a macro file that does not exist;
 *   · every pack a remaining macro writes to is declared in system.json.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export const name = 'macros';

const root   = new URL('../', import.meta.url);
const fsPath = u => u.pathname.replace(/^\/([A-Za-z]:)/, '$1');
const read   = rel => readFileSync(new URL(rel, root), 'utf8');

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules') continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(m?js)$/.test(e.name)) out.push(p);
  }
  return out;
}

export async function run(t) {
  const macroDir = fsPath(new URL('scripts/macros', root));
  const macros   = readdirSync(macroDir).filter(f => f.endsWith('.js')).sort();
  t.eq('only the three working macros remain', macros,
    ['generate-chrome-threat.js', 'import-sr3-character.js', 'populate-mr-johnsons-contacts.js']);

  /* ── The ready hook creates only macros that exist ─────────────────────────── */
  const sr3e = read('scripts/sr3e.js');
  const hookPaths = [...sr3e.matchAll(/path:\s*'(scripts\/macros\/[^']+)'/g)].map(m => m[1]);
  t.ok('the ready hook creates some macros', hookPaths.length >= 2, hookPaths.join(', '));
  t.eq('…and every one of them exists', hookPaths.filter(p => !existsSync(fsPath(new URL(p, root)))), []);
  t.eq('…and it no longer creates the populate macros', hookPaths.filter(p => /populate-/.test(p)), []);

  /* ── Nothing names a macro that is gone ────────────────────────────────────── */
  const dangling = [];
  for (const dir of ['scripts', 'tools', 'tests']) {
    for (const file of walk(fsPath(new URL(dir, root)))) {
      if (file.endsWith('macros.test.mjs')) continue;
      for (const m of readFileSync(file, 'utf8').matchAll(/\b((?:populate|update|import|generate)-[a-z0-9-]+\.js)\b/g)) {
        if (!macros.includes(m[1])) dangling.push(`${file.split(/[\\/]/).slice(-2).join('/')}: ${m[1]}`);
      }
    }
  }
  t.eq('no file names a retired macro', dangling, []);

  /* ── What remains writes to packs that exist ───────────────────────────────── */
  const declared = JSON.parse(read('system.json')).packs.map(p => p.name);
  const targets = macros.flatMap(f => [...read(`scripts/macros/${f}`).matchAll(/The2ndChumming3e\.(sr3e-[a-z0-9-]+)/g)].map(m => m[1]));
  t.ok('a remaining macro still names its pack', targets.length > 0);
  t.eq('…and every pack a macro names is declared', [...new Set(targets)].filter(p => !declared.includes(p)), []);

  /* ── The old root build scripts are gone ───────────────────────────────────── */
  t.eq('the root build-*-pack scripts were retired with them',
    ['build-armor-pack.mjs', 'build-cyberdeck-pack.mjs', 'scripts/update-compendium-images.mjs']
      .filter(f => existsSync(fsPath(new URL(f, root)))), []);
}
