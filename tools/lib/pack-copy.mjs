/**
 * Read the checkout's packs WITHOUT touching them.
 *
 * ⚠ **Opening a LevelDB writes to it**, even to read: it replays its log into a new log and a new
 * MANIFEST and rewrites `CURRENT`. In the checkout that shows up as every pack "modified" in git
 * — 82 packs, three files each, byte-for-byte the same documents. Found 2026-09-13 as ~410
 * uncommitted pack changes that had been dragging along for days; `node tests/run.mjs` alone
 * re-created them on every run. So anything that only READS the repo's packs opens a throwaway
 * copy instead. Tools that WRITE a pack (the `patch-*` / `import-*` tools) still open the real
 * one — that change is the point, and is committed.
 *
 *   const copy = copyPacks(join(REPO, 'packs'));
 *   try { … open join(copy.dir, packName) … } finally { copy.cleanup(); }
 */
import { cpSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** LevelDB's runtime files — never worth copying, and `LOCK` is held open by a running Foundry. */
const RUNTIME = /[\\/](LOCK|LOG|LOG\.old)$/;

export function copyPacks(packsDir) {
  const dir = mkdtempSync(join(tmpdir(), 'sr3e-packs-'));
  cpSync(packsDir, dir, { recursive: true, filter: src => !RUNTIME.test(src) });
  return { dir, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}
