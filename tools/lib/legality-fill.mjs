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
