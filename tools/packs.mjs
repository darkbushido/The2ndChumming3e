/**
 * The compendium packs, rebuilt from committed JSON source — TODO 12.
 *
 *   node tools/packs.mjs build             # packs-src → packs/ (only packs whose content changed)
 *   node tools/packs.mjs build --install   # packs-src → the Foundry install (one-way; Foundry CLOSED)
 *   node tools/packs.mjs extract           # packs/ → packs-src (after a tool that writes LevelDB)
 *   node tools/packs.mjs check             # exit 1 if packs/ and packs-src disagree
 *   …any command + pack names             # just those packs
 *
 * ⚠ **`packs-src/` is the source of truth.** The LevelDB directories in `packs/` are build output
 * — still committed, because Foundry installs from the branch zip and needs them — so:
 *   · a binary conflict in `packs/` after a merge is resolved by merging the JSON, then `build`;
 *   · a tool that writes LevelDB (the older `patch-*` / `import-*` tools) must be followed by
 *     `extract`, or `tests/pack-sources.test.mjs` fails.
 * ⚠ **`build` leaves a pack alone when its content already matches**, so an unchanged pack never
 *   churns in git (LevelDB rewrites its files even to read — see tools/lib/pack-copy.mjs).
 * ⚠ **`--install` is a one-way copy** from the repo's source into the install, never the reverse
 *   (the maintainer, 2026-09-14). It needs Foundry closed.
 *
 * Only the packs `system.json` declares are touched.
 */
import { readFileSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { copyPacks } from './lib/pack-copy.mjs';
import { readLevel, readSourceDir, writeSourceDir, diffEntries, buildLevel, replaceLevelFiles } from './lib/pack-source.mjs';

const ROOT    = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC     = join(ROOT, 'packs-src');
const INSTALL = process.env.SR3E_INSTALL
  ?? join(process.env.LOCALAPPDATA ?? '', 'FoundryVTT', 'Data', 'systems', 'The2ndChumming3e');

const args    = process.argv.slice(2);
const cmd     = args[0];
const install = args.includes('--install');
const named   = args.slice(1).filter(a => !a.startsWith('--'));
const declared = JSON.parse(readFileSync(join(ROOT, 'system.json'), 'utf8')).packs.map(p => p.name);
const targets  = named.length ? named : declared;
for (const n of named) if (!declared.includes(n)) { console.error(`not a declared pack: ${n}`); process.exit(2); }

if (!['build', 'extract', 'check'].includes(cmd)) {
  console.error('usage: node tools/packs.mjs build|extract|check [--install] [pack …]');
  process.exit(2);
}
if (install && cmd !== 'build') { console.error('--install only applies to build (a one-way copy into the install)'); process.exit(2); }

const levelRoot = install ? join(INSTALL, 'packs') : join(ROOT, 'packs');
// Read the LevelDB side through a copy — opening a database rewrites its files.
const copy = copyPacks(levelRoot);
let problems = 0, changed = 0;
try {
  for (const pack of targets) {
    const levelDir = join(copy.dir, pack);
    const srcDir   = join(SRC, pack);
    const level = existsSync(levelDir) ? await readLevel(levelDir) : null;
    const src   = existsSync(srcDir) ? readSourceDir(srcDir) : null;

    if (cmd === 'extract') {
      if (!level) { console.log(`  ! ${pack}: no LevelDB to extract`); problems++; continue; }
      const r = writeSourceDir(srcDir, level);
      if (r.written || r.removed) { changed++; console.log(`  ${pack}: ${r.written} written, ${r.removed} removed`); }
      continue;
    }
    if (!src) { console.log(`  ! ${pack}: no source in packs-src/`); problems++; continue; }

    const diff = level ? diffEntries(src, level) : { onlyA: [...src.keys()], onlyB: [], changed: [] };
    if (!diff) continue;
    const what = `${diff.onlyA.length} only in source, ${diff.onlyB.length} only in LevelDB, ${diff.changed.length} differ`;
    if (cmd === 'check') { console.log(`  ✗ ${pack}: ${what}${diff.changed.length ? ` (e.g. ${diff.changed[0]})` : ''}`); problems++; continue; }

    // build
    const built = await buildLevel(src);
    try { replaceLevelFiles(join(levelRoot, pack), built); }
    catch (err) { throw new Error(`${pack}: cannot write ${levelRoot} — close Foundry first (${err.code ?? err.message})`); }
    finally { rmSync(built, { recursive: true, force: true }); }
    changed++;
    console.log(`  ${install ? 'install' : 'repo'} ${pack}: rebuilt (${what})`);
  }
} finally { copy.cleanup(); }

const where = install ? 'the install' : 'packs/';
if (cmd === 'check') console.log(problems ? `\n${problems} pack(s) out of step with packs-src.` : `All ${targets.length} packs match packs-src.`);
if (cmd === 'build') console.log(`\n${changed} pack(s) rebuilt into ${where}; ${targets.length - changed - problems} already matched.`);
if (cmd === 'extract') console.log(`\n${changed} pack(s) extracted into packs-src/.`);
process.exit(problems ? 1 : 0);
