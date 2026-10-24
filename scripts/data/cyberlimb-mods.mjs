/**
 * Cyberware built into a cyberlimb — TODO 255 (and TODO 256 for marking it).
 *
 * Reported 2026-10-23: a Smartlink-2 came out at .25 Essence instead of the book's .5 (M&M p.32). The
 * packs carry a second copy of many implants, category `Cyberlimb Mods`, for installing INSIDE a
 * cyberlimb at a reduced Essence cost — legitimate (SR3 p.303 *Built-in Device*, *Smartlink*; M&M p.35-36
 * Equipment Capacity Cost Table), but the audit (`audit/cyberlimb-mods-audit.md`) also found entries whose
 * numbers disagree with the book. Those are corrected here.
 *
 * `PACK_CORRECTIONS` is the one list: `tools/fix-cyberlimb-mods.mjs` applies it to `packs-src/`,
 * `tests/cyberlimb-mods.test.mjs` pins it, and the owned-copy migration (0.8.0) reads `was` so it changes
 * a field only while it still holds the old, wrong value — a GM's edit survives.
 *
 * Pure: no Foundry globals.
 */

export const PACK_CORRECTIONS = [
  { pack: 'sr3e-mm-cyberware', id: 'sr3e-cyberware-0833',
    why: 'the 175,000¥ copy is rank 10 of the series (10 × 17,500¥), not a second [1]; its Rigger twin is [10]',
    source: 'M&M p.23',
    // The plain name: the level lives in the rating (TODO 261).
    set: { name: 'Rigger Decryption Module', 'system.rating': 10, 'system.srcgName': 'Rigger Decrypt. Mod [10]' },
    was: { name: 'Rigger Decryption Module [1]', 'system.rating': 1, 'system.srcgName': 'Rigger Decrypt. Mod [1]' } },
  { pack: 'sr3e-sr3-cyberware', id: 'sr3e-cyberware-0743',
    why: 'Direct Neural Interface: 4,500¥, 5P-Q', source: 'SR3 p.303; M&M p.39',
    set: { 'system.cost': 4500, 'system.legalCode': '5P-Q' },
    was: { 'system.cost': 2500, 'system.legalCode': '3-N' } },
  { pack: 'sr3e-sr3-cyberware', id: 'sr3e-cyberware-0846',
    why: 'Built-In Smartgun Link: 6/4 days, Street Index 1.5', source: 'SR3 p.303',
    set: { 'system.availability': '6/4 days', 'system.streetIndex': 1.5 },
    was: { 'system.availability': '3/36 hours', 'system.streetIndex': 1 } },
  { pack: 'sr3e-sr3-cyberware', id: 'sr3e-cyberware-0611',
    why: 'Built-In Smartgun Link: 6/4 days, Street Index 1.5', source: 'SR3 p.303',
    set: { 'system.availability': '6/4 days', 'system.streetIndex': 1.5 },
    was: { 'system.availability': '3/36 hours', 'system.streetIndex': 1 } },
  { pack: 'sr3e-mm-cyberware', id: 'sr3e-cyberware-0612',
    why: 'the only Smartlink-2 price printed is 3,500¥', source: 'M&M p.32',
    set: { 'system.cost': 3500 },
    was: { 'system.cost': 3200 } },
  { pack: 'sr3e-mm-cyberware', id: 'sr3e-cyberware-0768',
    why: 'Tracking Mount: 25,000¥', source: 'M&M p.41',
    set: { 'system.cost': 25000 },
    was: { 'system.cost': 24000 } },
  { pack: 'sr3e-mm-cyberware', id: 'sr3e-cyberware-0728',
    why: 'Cyberarm Gyromount: 4P-R', source: 'M&M p.37',
    set: { 'system.legalCode': '4P-R' },
    was: { 'system.legalCode': '3-N' } },
  { pack: 'sr3e-mm-cyberware', id: 'sr3e-cyberware-0727',
    why: 'Cyber Holster: 5P-N', source: 'M&M p.39',
    set: { 'system.legalCode': '5P-N' },
    was: { 'system.legalCode': '3-N' } },
  { pack: 'sr3e-mm-cyberware', id: 'sr3e-cyberware-0741',
    why: 'Cyberskates: Legal', source: 'M&M p.39',
    set: { 'system.legalCode': 'Legal' },
    was: { 'system.legalCode': '3-N' } },
  { pack: 'sr3e-mm-cyberware', id: 'sr3e-cyberware-0742',
    why: 'Retractable Cyberskates: Legal', source: 'M&M p.39',
    set: { 'system.legalCode': 'Legal' },
    was: { 'system.legalCode': '3-N' } },
  { pack: 'sr3e-mm-cyberware', id: 'sr3e-cyberware-0855',
    why: 'Telescoping Cyberlimb: Legal', source: 'M&M p.40',
    set: { 'system.legalCode': 'Legal' },
    was: { 'system.legalCode': '3-N' } },
  { pack: 'sr3e-sr3-cyberware', id: 'sr3e-cyberware-0622',
    why: 'a fingertip compartment in a cyberlimb costs no Essence', source: 'SR3 p.303',
    set: { 'system.essenceCost': 0 },
    was: { 'system.essenceCost': 0.1 } },
];

/** Read a dotted path off a document. */
export function getPath(doc, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), doc);
}

/** Write a dotted path on a document, in place. */
export function setPath(doc, path, value) {
  const keys = path.split('.');
  let o = doc;
  for (const k of keys.slice(0, -1)) o = (o[k] ??= {});
  o[keys.at(-1)] = value;
}
