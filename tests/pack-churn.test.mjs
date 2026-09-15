/**
 * Reading the checkout's packs must not change them.
 *
 * Opening a LevelDB rewrites its log, MANIFEST and CURRENT even for a read, so a test or check
 * that opened `packs/` directly left every pack "modified" in git with identical documents — ~410
 * uncommitted pack files, found 2026-09-13, re-created by every `node tests/run.mjs`. Readers go
 * through `tools/lib/pack-copy.mjs`; this suite keeps it that way.
 */
import { readFileSync, readdirSync, existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { copyPacks } from '../tools/lib/pack-copy.mjs';

export const name = 'pack-churn';

export async function run(t) {
  const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

  /* ── copyPacks copies, skips LevelDB's runtime files, and cleans up ─────────────────── */
  const src = mkdtempSync(join(tmpdir(), 'sr3e-churn-src-'));
  mkdirSync(join(src, 'p1'));
  for (const f of ['CURRENT', 'MANIFEST-000001', '000002.log', 'LOCK', 'LOG', 'LOG.old']) writeFileSync(join(src, 'p1', f), f);
  const copy = copyPacks(src);
  t.ok('the data files are copied', ['CURRENT', 'MANIFEST-000001', '000002.log'].every(f => existsSync(join(copy.dir, 'p1', f))));
  t.ok('LOCK / LOG / LOG.old are not (a running Foundry holds LOCK)', !['LOCK', 'LOG', 'LOG.old'].some(f => existsSync(join(copy.dir, 'p1', f))));
  t.ok('the copy is somewhere else', copy.dir !== src);
  copy.cleanup();
  t.ok('cleanup removes the copy', !existsSync(copy.dir));
  rmSync(src, { recursive: true, force: true });

  /* ── Every test that opens a LevelDB reads a copy ───────────────────────────────────── */
  const dir = new URL('./', import.meta.url);
  for (const f of readdirSync(dir).filter(n => n.endsWith('.mjs') && n !== 'pack-churn.test.mjs')) {
    const s = readFileSync(new URL(f, dir), 'utf8');
    if (!/new ClassicLevel\(/.test(s)) continue;
    t.ok(`tests/${f} opens packs through copyPacks, not the checkout's own`, /copyPacks\(/.test(s));
  }

  /* ── A tool with a read-only --check reads a copy ───────────────────────────────────── */
  /* Any tools/*.mjs that opens a LevelDB AND offers `--check` must go through copyPacks, or its
   * report rewrites every pack it reads (import-johnson-cyberware.mjs did: ~400 files, 2026-09-14).
   * ⚠ KNOWN_OFFENDERS is a RATCHET, not an exemption list: each opens the real pack even under
   * --check and is owed the same fix. It may only shrink — a listed tool that gains copyPacks fails
   * here until it is removed from the list. */
  const KNOWN_OFFENDERS = new Set([
    'fix-johnson-reflex.mjs', 'folder-johnson-contacts.mjs', 'patch-enhanced-articulation.mjs',
    'patch-johnson-contacts.mjs', 'patch-johnson-stats.mjs', 'patch-pack-bonuses.mjs',
    'rename-cyberware.mjs',
  ]);
  const toolsDir = new URL('../tools/', import.meta.url);
  for (const f of readdirSync(toolsDir).filter(n => n.endsWith('.mjs'))) {
    const s = readFileSync(new URL(f, toolsDir), 'utf8');
    if (!/new ClassicLevel\(/.test(s) || !/['"]--check['"]/.test(s)) continue;
    const copies = /copyPacks\(/.test(s);
    if (KNOWN_OFFENDERS.has(f)) t.ok(`tools/${f} is still a known offender (remove it from the list once fixed)`, !copies);
    else t.ok(`tools/${f} --check opens packs through copyPacks, not the checkout's own`, copies);
  }

  /* import-johnson-gear: the index ALWAYS from a copy, the contacts from a copy under --check. */
  const gear = read('tools/import-johnson-gear.mjs');
  t.ok('import-johnson-gear indexes a copy of the repo packs', /copyPacks\(PACKDIR\)/.test(gear) && !/new ClassicLevel\(join\(PACKDIR/.test(gear));
  t.ok('import-johnson-gear --check reads the contacts from a copy', /contactsCopy\s*=\s*CHECK\s*\?\s*copyPacks\(/.test(gear)
    && /new ClassicLevel\(CHECK \? /.test(gear) && /contactsCopy\?\.cleanup\(\)/.test(gear));

  /* import-johnson-cyberware works on packs-src (TODO 12) and never opens a LevelDB itself: it
   * reads the JSON source, and only an apply writes it back and rebuilds the one pack. */
  const cyber = read('tools/import-johnson-cyberware.mjs');
  t.ok('import-johnson-cyberware opens no LevelDB', !/ClassicLevel/.test(cyber));
  t.ok('…it reads packs-src', /readSourceDir\(/.test(cyber) && /join\(REPO, 'packs-src'\)/.test(cyber));
  t.ok('…and writes packs-src then rebuilds, only when not --check',
    /if \(!CHECK && writes\.length\) \{[^}]*\}[^}]*writeSourceDir\(CONTACTS, entries\);\s*rebuilt = await rebuildPack\(REPO, PACK\);/.test(cyber));

  /* ── The pack check reads a copy of the repo unless it is fixing ────────────────────── */
  const check = read('tools/check-packs.mjs');
  t.ok('check-packs --repo (read-only) opens a copy', /READ_COPY\s*=\s*process\.argv\.includes\('--repo'\)\s*&&\s*!FIX/.test(check)
    && /copyPacks\(SOURCE_PACKS\)/.test(check));
  t.ok('…and --fix still writes the real packs', /const PACKS = copy \? copy\.dir : SOURCE_PACKS/.test(check));
}
