#!/usr/bin/env node
/**
 * Tick `system.flechette` on the shipped weapons whose Damage Code says `(f)` — TODO 156.
 *
 *   node tools/fill-flechette-flag.mjs           edit packs-src, then `npm run packs:build`
 *   node tools/fill-flechette-flag.mjs --check   exit 1 if any file would change — changes nothing
 *
 * SR3 p.116: "Guns with flechette ammo already figured into their Damage Code have an (f) notation
 * following the Damage Code." The rules read the flag OR the notation, so this changes no behaviour;
 * it makes the checkbox on the item sheet say what the item does.
 *
 * ⚠ Only `firearm`, `projectile` and `thrown` items — the three types that carry the checkbox.
 *   `ammunition` and `vehicleweapon` documents with an (f) are left alone.
 * ⚠ Only when the FIRST alternative carries it: `10S/10D(f)` is a shotgun whose regular round is 10S and
 *   whose flechette round is the second code — that is ammunition, not the gun.
 * ⚠ Reads and writes the JSON as text-in-place (one line), so nothing else in a file is reformatted.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT  = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC   = join(ROOT, 'packs-src');
const CHECK = process.argv.includes('--check');
const TYPES = new Set(['firearm', 'projectile', 'thrown']);

/** True when the FIRST alternative of a Damage Code is flagged (f). Mirrors SR3EItem.parseDamageCode. */
export function firstAlternativeIsFlechette(code) {
  const first = String(code ?? '').split('/')[0];
  return /\(f\)\s*$/i.test(first.trim());
}

let changed = 0;
for (const pack of readdirSync(SRC)) {
  for (const file of readdirSync(join(SRC, pack)).filter(f => f.endsWith('.json'))) {
    const path = join(SRC, pack, file);
    const raw  = readFileSync(path, 'utf8');
    const doc  = JSON.parse(raw).doc;
    if (!doc || !TYPES.has(doc.type)) continue;
    if (!firstAlternativeIsFlechette(doc.system?.damage) || doc.system.flechette === true) continue;
    changed++;
    console.log(`${CHECK ? 'would set' : 'set'}  ${pack}/${file}  (${doc.system.damage})`);
    if (CHECK) continue;
    const crlf = raw.includes('\r\n');
    const text = raw.replace(/\r\n/g, '\n');
    // Insert after the damage line, keeping the file's own indentation and key order otherwise.
    const out = text.replace(/^(\s*)("damage": *"[^"]*",?)$/m, (m, indent, line) =>
      `${m}\n${indent}"flechette": true,`);
    writeFileSync(path, crlf ? out.replace(/\n/g, '\r\n') : out);
  }
}
console.log(changed ? (CHECK ? `${changed} file(s) to update.` : `${changed} file(s) updated — now run: npm run packs:build`) : 'Up to date.');
process.exit(CHECK && changed ? 1 : 0);
