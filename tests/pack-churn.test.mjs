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

  /* ── The pack check reads a copy of the repo unless it is fixing ────────────────────── */
  const check = read('tools/check-packs.mjs');
  t.ok('check-packs --repo (read-only) opens a copy', /READ_COPY\s*=\s*process\.argv\.includes\('--repo'\)\s*&&\s*!FIX/.test(check)
    && /copyPacks\(SOURCE_PACKS\)/.test(check));
  t.ok('…and --fix still writes the real packs', /const PACKS = copy \? copy\.dir : SOURCE_PACKS/.test(check));
}
