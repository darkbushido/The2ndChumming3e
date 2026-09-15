/**
 * The packs are rebuilt from committed JSON source — TODO 12.
 *
 * "The repo cannot currently rebuild its own pack structure." It can now: `packs-src/` holds every
 * shipped document as JSON, and `tools/packs.mjs build` compiles it into the LevelDB directories
 * under `packs/`. This proves the two halves agree:
 *   · the committed LevelDB packs (read through a copy) match their source, document for document;
 *   · a pack COMPILED from source reads back identical — so `build` really can regenerate them;
 *   · every declared pack has source, and nothing undeclared does.
 * If a tool wrote LevelDB and nobody ran `node tools/packs.mjs extract`, this is what fails.
 */
import { readFileSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { copyPacks } from '../tools/lib/pack-copy.mjs';
import { topKey, parentKey, slug, fileName, toFiles, fromFiles, readSourceDir, readLevel, diffEntries, buildLevel }
  from '../tools/lib/pack-source.mjs';

export const name = 'pack-sources';

const root = new URL('../', import.meta.url);
const fsPath = u => u.pathname.replace(/^\/([A-Za-z]:)/, '$1');
const throws = fn => { try { fn(); return false; } catch { return true; } };

export async function run(t) {
  /* ── The format ─────────────────────────────────────────────────────────────── */
  t.eq('top-level keys', [topKey('!items!abc'), topKey('!actors.items!a.b')], [{ coll: 'items', id: 'abc' }, null]);
  t.is('an embedded key names its parent', parentKey('!actors.items!A1.B2'), '!actors!A1');
  t.is('slugs are file-safe and short', slug('Ares Predator II "Custom" [2]'), 'ares-predator-ii-custom-2');
  t.is('folders sort first', fileName('!folders!f1', { name: 'Pistols' }), '_folder.pistols.f1.json');

  const entries = new Map([
    ['!actors!A', { _id: 'A', name: 'Troll', items: ['X'] }],
    ['!actors.items!A.X', { _id: 'X', name: 'Knife' }],
    ['!items!I', { _id: 'I', name: 'Medkit', system: { rating: 3 } }],
  ]);
  const files = toFiles(entries);
  t.is('one file per top-level document; embedded items ride with their parent', files.size, 2);
  t.is('…and they come back exactly', diffEntries(fromFiles(files), entries), null);
  t.ok('the output is deterministic', [...toFiles(entries).values()].join() === [...files.values()].join());
  t.ok('an orphaned embedded document is refused, not dropped',
    throws(() => toFiles(new Map([['!actors.items!Z.X', { name: 'lost' }]]))));

  /* ── Every declared pack, both ways ─────────────────────────────────────────── */
  const declared = JSON.parse(readFileSync(new URL('system.json', root), 'utf8')).packs.map(p => p.name).sort();
  const srcRoot  = fsPath(new URL('packs-src', root));
  const sources  = readdirSync(srcRoot).sort();
  t.eq('every declared pack has source', declared.filter(p => !sources.includes(p)), []);
  t.eq('…and no source exists for a pack nobody declares', sources.filter(p => !declared.includes(p)), []);

  const copy = copyPacks(fsPath(new URL('packs', root)));
  const drift = [], rebuilt = [];
  let docs = 0;
  try {
    for (const pack of declared) {
      const src = readSourceDir(join(srcRoot, pack));
      docs += src.size;
      const lvlDir = join(copy.dir, pack);
      if (!existsSync(lvlDir) || diffEntries(src, await readLevel(lvlDir))) drift.push(pack);
      const built = await buildLevel(src);
      try { if (diffEntries(src, await readLevel(built))) rebuilt.push(pack); }
      finally { rmSync(built, { recursive: true, force: true }); }
    }
  } finally { copy.cleanup(); }
  t.eq('the committed LevelDB packs match packs-src (else: node tools/packs.mjs extract, or build)', drift, []);
  t.eq('a pack compiled from packs-src reads back identical — the repo can rebuild its packs', rebuilt, []);
  t.ok('…all of them', docs > 7000, `${docs} documents across ${declared.length} packs`);

  /* ── The tools that write a repo pack keep packs-src current themselves ─────── */
  const tool = f => readFileSync(new URL(`tools/${f}`, root), 'utf8');
  for (const f of ['build-odm-packs.mjs', 'fill-book-pages.mjs', 'import-johnson-gear.mjs', 'relink-johnson-helmets.mjs']) {
    t.ok(`${f} refreshes packs-src after writing the repo (never for --install)`, /extractPack\(/.test(tool(f)));
  }
  const gear = tool('build-default-gear.mjs');
  t.ok('build-default-gear writes packs-src and rebuilds only changed packs (no churn)',
    /writeSourceDir\(srcDir, entries\)/.test(gear) && /await rebuildPack\(REPO, name\)/.test(gear));
  const packs = tool('packs.mjs');
  t.ok('packs.mjs reads LevelDB through a copy', /copyPacks\(levelRoot\)/.test(packs));
  t.ok('--install is build-only — a one-way copy, never extracted FROM the install', /--install only applies to build/.test(packs));
}
