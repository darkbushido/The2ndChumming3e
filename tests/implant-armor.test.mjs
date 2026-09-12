/**
 * Implant armour · SR3 p.300, p.303; M&M p.27-28, p.68 · TODO 75
 *
 * Bone Lacing, Dermal Sheath and Orthoskin give Impact/Ballistic armour that is CUMULATIVE with
 * worn armour. The soak card never saw it: the upstream `IMP`/`BAL` codes had no field, so a
 * character protected only by an implant read as unarmoured — wrong for every soak, and for
 * flechette doubly wrong (the level increase instead of the doubled-Impact rule).
 *
 * Every shipped value below was read from the repo packs on 2026-09-12 and checked against the
 * books: Bone Lacing table (SR3 p.303), Ceramic/Kevlar (M&M p.27), Dermal Sheath "one-half the
 * rating, rounded up" (M&M p.28), Orthoskin Table (M&M p.68).
 */
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { SR3EActor } = await import('../scripts/documents/SR3EActor.js');

export const name = 'implant-armor';

export async function run(t) {
  const item = (type, name, mods, extra = {}) => ({ type, name, system: { mods, ...extra } });
  const IA   = (...items) => SR3EActor.implantArmor(items);
  const bi   = r => `${r.ballistic}B/${r.impact}I`;

  /* ── Every shipped armour-bearing implant, as the packs spell its `mods` ──────────────── */
  for (const [type, name, mods, want] of [
    ['cyberware', 'Bone Lace, Plastic',          '+1BOD,',            '0B/0I'],   // p.303 table: +1 Body only
    ['cyberware', 'Bone Lace, Aluminium',        '+1BOD,+1IMP,',      '0B/1I'],
    ['cyberware', 'Bone Lace, Titanium',         '+2BOD,+1IMP,+1BAL,', '1B/1I'],
    ['cyberware', 'Bone Lace, Ceramic',          '+1BOD,+2IMP,',      '0B/2I'],   // M&M p.27
    ['cyberware', 'Bone Lace, Kevlar',           '+1BOD,+1BAL,',      '1B/0I'],
    ['cyberware', 'Dermal Sheath [1]',           '+2BOD,+1IMP,',      '0B/1I'],   // ½ rating, round up
    ['cyberware', 'Dermal Sheath [2]',           '+3BOD,+1IMP,',      '0B/1I'],
    ['cyberware', 'Dermal Sheath [3]',           '+4BOD,+2IMP,',      '0B/2I'],
    ['cyberware', 'Dermal Sheath Ruthenium [3]', '+4BOD,+2IMP,',      '0B/2I'],
    ['bioware',   'Orthoskin[1]',                '+1IMP,',            '0B/1I'],   // M&M p.68 table
    ['bioware',   'Orthoskin[2]',                '+1IMP,+1BAL,',      '1B/1I'],
    ['bioware',   'Orthoskin[3]',                '+2IMP,+1BAL,',      '1B/2I'],
    ['cyberware', 'Dermal Plating [3]',          '+3BOD,',            '0B/0I'],   // Body, not armour (p.300)
  ]) {
    t.is(`${name}: ${want}`, bi(IA(item(type, name, mods))), want);
  }

  /* ── Sums, and only from implants ─────────────────────────────────────────────────────── */
  t.is('titanium lacing + Orthoskin[3] stack',
    bi(IA(item('cyberware', 'Bone Lace, Titanium', '+2BOD,+1IMP,+1BAL,'), item('bioware', 'Orthoskin[3]', '+2IMP,+1BAL,'))),
    '2B/3I');
  t.is('gear and armour items are not implants',
    bi(IA(item('gear', 'x', '+5IMP,'), item('armor', 'y', '+5BAL,'))), '0B/0I');
  t.is('sources name each contributing item',
    IA(item('cyberware', 'Bone Lace, Aluminium', '+1BOD,+1IMP,'), item('cyberware', 'Datajack', '')).sources.map(s => s.name).join(),
    'Bone Lace, Aluminium');
  t.is('no items at all', bi(SR3EActor.implantArmor(undefined)), '0B/0I');

  /* ── ⚠ The GM's number wins — null means "from mods", 0 is a real answer ─────────────── */
  const sheath = { mods: '+3BOD,+1IMP,' };
  t.is('null override reads mods',        bi(IA(item('cyberware', 'S', sheath.mods, { bonusImpact: null }))), '0B/1I');
  t.is('0 overrides mods (not "unset")',  bi(IA(item('cyberware', 'S', sheath.mods, { bonusImpact: 0 }))),    '0B/0I');
  t.is('a typed number overrides mods',   bi(IA(item('cyberware', 'S', sheath.mods, { bonusImpact: 3 }))),    '0B/3I');
  t.is('overrides are per axis',          bi(IA(item('cyberware', 'S', sheath.mods, { bonusBallistic: 2 }))), '2B/1I');
  t.is('an override works with no mods at all', bi(IA(item('cyberware', 'Custom', '', { bonusBallistic: 1 }))), '1B/0I');

  /* ── armorRatings: worn + implants, one answer for every consumer ─────────────────────── */
  const actor = (items, equippedArmor = '') => ({ type: 'character', system: { equippedArmor }, items });
  const vest  = { id: 'v1', type: 'armor', name: 'Armor Vest', system: { ballistic: 2, impact: 1 } };
  const lace  = item('cyberware', 'Bone Lace, Titanium', '+2BOD,+1IMP,+1BAL,');
  t.is('worn vest alone',                 bi(SR3EActor.armorRatings(actor([vest], 'v1'))), '2B/1I');
  t.is('vest + titanium lacing',          bi(SR3EActor.armorRatings(actor([vest, lace], 'v1'))), '3B/2I');
  t.is('an unequipped vest does not count', bi(SR3EActor.armorRatings(actor([vest, lace]))), '1B/1I');
  t.is('the worn part is reported separately', SR3EActor.armorRatings(actor([vest, lace], 'v1')).worn.ballistic, 2);
  t.is('a vehicle uses its Armor attribute',
    bi(SR3EActor.armorRatings({ type: 'vehicle', system: { attributes: { armor: { base: 6 } } }, items: [lace] })), '6B/6I');

  /* ── The flechette consequence that started this ──────────────────────────────────────── */
  // Orthoskin is NOT dermal armor, but it IS armour: no level increase, the doubled-Impact rule.
  const skin = SR3EActor.armorRatings(actor([item('bioware', 'Orthoskin[3]', '+2IMP,+1BAL,')]));
  t.is('Orthoskin[3], nothing worn: armoured, so no flechette level increase',
    SR3EActor.flechetteRaisesLevel({ ballistic: skin.ballistic, impact: skin.impact, dermalArmor: 0 }), false);
  t.is('…and flechette meets max(2×2 Impact, 1 Ballistic) = 4',
    SR3EActor.flechetteArmor({ ballistic: skin.ballistic, impact: skin.impact }), 4);
}
