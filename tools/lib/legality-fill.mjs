/**
 * Write the books' Legality Codes into pack documents · SR3 p.273 (2026-10-25).
 *
 * The codes live in `scripts/data/legality-table.mjs` (`LEGALITY`: pack → id → [code, page]) — read from the printed
 * gear tables. Two writers use this one rule: `tools/build-default-gear.mjs` for the documents it generates (so a
 * regeneration keeps them) and `tools/fill-legality.mjs` for the hand-kept packs.
 *
 * ⚠ **Fill blanks, never overwrite**: a document that already carries a code keeps it. Cyberware (its own upstream
 * `legalCode`) and Matrix Defragged decks (`legalityCode`) are never touched — `Legality.of` reads those fields.
 */
import { LEGALITY } from '../../scripts/data/legality-table.mjs';
// The item types whose model declares `system.legality` — one list, the rule module's.
import { LEGALITY_TYPES } from '../../scripts/data/legality.mjs';

export { LEGALITY_TYPES };

/** The code the books give a pack document, or ''. */
export const codeFor = (pack, id) => LEGALITY[pack]?.[id]?.[0] ?? '';

/** Fill `doc.system.legality` from the table while blank. Mutates; returns true when it changed anything. */
export function fillLegality(pack, doc) {
  if (!LEGALITY_TYPES.includes(doc?.type)) return false;
  const code = codeFor(pack, doc._id);
  if (!code || String(doc.system?.legality ?? '').trim()) return false;
  (doc.system ??= {}).legality = code;
  return true;
}

/**
 * The name fallback's table (`scripts/data/legality-names.mjs`): `"<type>|<name>"` → code, for owned copies that carry
 * no usable `compendiumSource` (the hand-kept packs' ids, like `sr3e-firearm-0072`, are not valid document ids, so
 * Foundry drops them from a dropped item's source). ⚠ A key two documents share with DIFFERENT codes is left out —
 * name matching must never guess. `docsByPack`: pack → Map of key → document (what `readSourceDir` returns).
 */
export function nameTable(docsByPack, table = LEGALITY) {
  const seen = new Map();
  for (const pack of Object.keys(table).sort()) {
    for (const id of Object.keys(table[pack]).sort()) {
      const doc = docsByPack[pack]?.get(`!items!${id}`);
      const code = table[pack][id][0];
      if (!doc?.name || !LEGALITY_TYPES.includes(doc.type) || !code) continue;
      const key = `${doc.type}|${doc.name}`;
      const codes = seen.get(key) ?? new Set();
      codes.add(code);
      seen.set(key, codes);
    }
  }
  const out = {};
  for (const key of [...seen.keys()].sort()) if (seen.get(key).size === 1) out[key] = [...seen.get(key)][0];
  return out;
}
