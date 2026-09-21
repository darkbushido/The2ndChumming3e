/**
 * Cybersystem damage — Essence slots and the Wound Effect Table · M&M pp.126-129 (TODO 129).
 *
 * ⚠ **Leggy's worked example (p.127-128) is the whole point of this file.** It is the only place the
 * book shows the fill rule producing a specific six-slot layout, and it exercises every branch at
 * once: an implant spanning three slots, two sharing a slot with a remainder, three sharing another,
 * and a final slot left half full. Any change to `assignSlots` that still passes these six rows is
 * almost certainly right; one that does not is wrong however reasonable it looks.
 */
import { readFileSync } from 'node:fs';
import { CyberSlots, SLOT_COUNT } from '../scripts/data/cyber-slots.mjs';

export const name = 'cyber-slots';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

export async function run(t) {
  const C = CyberSlots;

  /* ── The Wound Effect Table · p.127 ───────────────────────────────────────── */
  t.eq('1-2 cybersystem, 3-4 bioware, 5-6 organic',
    [1, 2, 3, 4, 5, 6].map(d => C.woundEffectType(d).type),
    ['cyberware', 'cyberware', 'bioware', 'bioware', 'organic', 'organic']);
  t.is('a die outside the table is nothing', C.woundEffectType(7), null);

  // "If a character with no cyberware rolls a cybersystem damage result … ignore that wound effect."
  t.ok('no cyberware ignores a cybersystem result', !C.applies('cyberware', { hasBioware: true }));
  t.ok('no bioware ignores a bioware result', !C.applies('bioware', { hasCyberware: true }));
  t.ok('an organic injury always lands', C.applies('organic', {}));

  /* ── How many wound effects · p.127 ───────────────────────────────────────── */
  // "Leggy rolls a 1, 1, 2, 2 and 3 … the highest number rolled (3) … (6 - 3) 3 wound effects."
  t.is('the book\'s Serious powerbolt: 6 boxes, highest die 3 → 3 wound effects',
    C.woundEffects([1, 1, 2, 2, 3], 6), 3);
  // ⚠ The highest die, NOT the successes — counting successes gives 0 and the rule never fires.
  t.is('…a die reaching the boxes means none at all', C.woundEffects([1, 6, 2], 6), 0);
  t.is('…and beating them is still none', C.woundEffects([7], 6), 0);
  t.is('no dice at all is the full margin', C.woundEffects([], 4), 4);

  /* ── Leggy's Essence slots · p.127 ────────────────────────────────────────── */
  // "VCR 2 (alphaware, Essence Cost 2.4), two reaction enhancers (Essence Cost .6), wired reflexes 1
  //  (alphaware, 1.6), cybereyes with mods (.2), datajack (.2) and a smartlink (.5)"
  // ⚠ The ".6" is the pair's COMBINED cost, not each. That is not stated outright, but it is the
  //  only reading that reproduces the printed slots: .3 each makes slot 3 exactly full (VCR's .4
  //  remainder + .6) and leaves slot 6 half full, as the book says. At .6 each, slot 3 overflows.
  const leggy = [
    { name: 'VCR 2',             essence: 2.4 },
    { name: 'Reaction Enhancer', essence: 0.3 },
    { name: 'Reaction Enhancer', essence: 0.3 },
    { name: 'Wired Reflexes 1',  essence: 1.6 },
    { name: 'Cybereyes w/ mods', essence: 0.2 },
    { name: 'Datajack',          essence: 0.2 },
    { name: 'Smartlink',         essence: 0.5 },
  ];
  const a = C.assignSlots(leggy);
  const names = a.slots.map(s => s.entries.map(e => e.name).join(', '));

  t.is('six slots, one per point of Essence', a.slots.length, SLOT_COUNT);
  t.eq('the printed layout, slot by slot (M&M p.127)', names, [
    'VCR 2',
    'VCR 2',
    'VCR 2, Reaction Enhancer, Reaction Enhancer',
    'Wired Reflexes 1',
    'Wired Reflexes 1, Cybereyes w/ mods, Datajack',
    'Smartlink',
  ]);
  t.eq('…the first five full, the last half full', a.slots.map(s => s.filled), [1, 1, 1, 1, 1, 0.5]);
  t.is('nothing spilled off the end', a.overflow, 0);
  t.ok('and no doubling was needed', !a.doubled);

  /* ── Determine System Affected · p.127-128 ────────────────────────────────── */
  // "Leggy rolls 1D6 … getting a 3. The gamemaster has a choice between the VCR or a reaction
  //  enhancer being damaged."
  const three = C.systemHit(a, 3);
  t.eq('a 3 offers the VCR or an enhancer', three.candidates.map(c => c.name),
    ['VCR 2', 'Reaction Enhancer', 'Reaction Enhancer']);
  t.ok('…a full slot is a certain hit', three.hitChance === 1 && !three.partial && !three.empty);
  t.ok('…and the GM picks, this module does not', /GM chooses/.test(three.note));
  t.is('…the shares sum to 1, for the book\'s optional 1D10',
    three.candidates.reduce((s, c) => s + c.share, 0), 1);

  // "If Leggy had rolled a 6, he might not have taken any damage at all because that slot is only
  //  half full … a 50-50 chance between the smartlink getting hit and no damage being done."
  const six = C.systemHit(a, 6);
  t.ok('a 6 is the half-full slot: a 50-50, not a hit', six.partial && six.hitChance === 0.5);
  t.eq('…with the smartlink as the only candidate', six.candidates.map(c => c.name), ['Smartlink']);
  t.ok('…and the card says 50-50', /50-50/.test(six.note));

  // An empty slot is IGNORED, never re-rolled.
  const sparse = C.assignSlots([{ name: 'Datajack', essence: 0.2 }]);
  const miss = C.systemHit(sparse, 4);
  t.ok('an empty slot ignores the wound effect', miss.empty && miss.hitChance === 0);
  t.ok('…and says so rather than offering a re-roll', /ignore this wound effect/.test(miss.note));

  /* ── Bioware uses the same procedure with Bio Index slots · p.128 ─────────── */
  // "Leggy only has two bioware items, a nephritic screen (Bio Index .4) and tailored pheromones
  //  (level 2, Bio Index .6) … Slot 1 nephritic screen, tailored pheromones"
  const bio = C.assignSlots([
    { name: 'Nephritic Screen',    essence: 0.4 },
    { name: 'Tailored Pheromones', essence: 0.6 },
  ]);
  t.eq('both bioware items land in slot 1, which is then full',
    [bio.slots[0].entries.map(e => e.name).join(', '), bio.slots[0].filled],
    ['Nephritic Screen, Tailored Pheromones', 1]);
  t.eq('…and slots 2-6 are empty, so it is a 1 in 6', bio.slots.slice(1).map(s => s.entries.length),
    [0, 0, 0, 0, 0]);

  /* ── Cyberzombies double up · p.127 ───────────────────────────────────────── */
  const heavy = Array.from({ length: 9 }, (_, i) => ({ name: `Implant ${i + 1}`, essence: 1 }));
  const spilled = C.assignSlots(heavy);
  t.is('without doubling, Essence past slot 6 is lost', spilled.overflow, 3);
  const zombie = C.assignSlots(heavy, { doubleUp: true });
  t.ok('a cyberzombie wraps instead — nothing is lost', zombie.doubled && zombie.overflow === 0);
  t.is('…and every implant still has a slot',
    zombie.slots.reduce((n, s) => n + s.entries.length, 0), 9);
  t.ok('…so two systems can be hit at once', zombie.slots.some(s => s.entries.length > 1));

  /* ── Electrical damage · p.129 ────────────────────────────────────────────── */
  t.eq('1-2 on the extra die damages another piece', [1, 2, 3, 4, 5, 6].map(d => C.electricalSpreads(d)),
    [true, true, false, false, false, false]);

  /* ── The wiring, source-level ─────────────────────────────────────── */
  const stress = read('scripts/SR3EStress.js');
  const sheet  = read('scripts/sheets/SR3EActorSheet.js');
  const main   = read('scripts/sr3e.js');

  // ⚠ Offered, never automatic — the soak card must not reach in and decide a wound damaged chrome.
  t.ok('the soak card does not roll wound effects for anyone',
    !/openWoundEffects/.test(read('scripts/documents/SR3EActor.js')));
  t.ok('it is GM-only, like ⚙ Apply Stress', /Only the GM rolls wound effects/.test(stress));
  t.ok('…and the sheet button is behind game.user.isGM',
    /data-action="woundEffects"/.test(sheet) && /isGM \? `<button type="button" class="btn-add" data-action="applyStress"/.test(sheet));
  t.ok('the apply button is GM-only too', /Only the GM applies Stress/.test(main));

  // ⚠ A slot holds the GRADED Essence — an alphaware VCR takes 2.4, not its base 3.0.
  t.ok('slots are filled with graded Essence',
    /gradedEssenceCost\([\s\S]{0,40}?baseEssenceCost/.test(stress));
  t.ok('…bioware uses its Bio Index instead', /Number\(i\.system\?\.bioIndex\)/.test(stress));
  t.ok('stored items take no slot', /stored'\)\)/.test(stress));

  // ⚠ A cyberzombie doubles up rather than losing implants off the end (p.127).
  t.ok('the cybermancy flag drives doubling',
    /doubleUp = !!actor\?\.system\?\.cybermancy\?\.is/.test(stress));

  // ⚠ Electrical damage SKIPS the Wound Effect Table (p.129).
  t.ok('an electrical attack goes straight to the cybersystem',
    /result\.electrical[\s\S]{0,20}?\? \{ type: 'cyberware'/.test(stress));

  // The 1D6s here must NOT explode — they are table lookups, not Success Tests.
  t.is('every die rolled for a wound effect is a plain 1d6',
    (stress.match(/new Roll\('1d6'\)/g) ?? []).length, 4);
}
