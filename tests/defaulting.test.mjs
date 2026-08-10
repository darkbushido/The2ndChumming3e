/**
 * The SR3 Default Table — SR3EItem.defaultTiers.
 *
 * The Default Table (p.85) has three columns, and the third is the trap:
 *
 *   Default To      TN Modifier   Dice Pool
 *   Specialization      +3        = to 1/2 specialization's base skill
 *   Skill               +2        = to 1/2 base skill being used
 *   Attribute           +4        No pool dice allowed
 *
 * "Dice Pool" is the CAP ON POOL DICE, not the dice you roll. The system read it as the
 * dice to roll, which halved every defaulted test and dropped the cap entirely — wrong
 * in both directions at once, and in a way that partly cancels out, so neither error is
 * obvious from a single roll.
 *
 * Both of the book's worked examples are asserted below, because between them they pin
 * every part of the rule: the dice come from the rating, the cap comes from half of it,
 * and for a specialization the cap comes off the RELATED BASE skill rather than the
 * specialization's own (higher) rating.
 */
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { SR3EItem } = await import('../scripts/documents/SR3EItem.js');

/** Minimal stand-in for an actor carrying skills — defaultTiers only reads these. */
function actorWith(skills, attributes = {}) {
  return {
    items: skills.map((s, i) => ({
      id:     s.id ?? `skill${i}`,
      name:   s.name,
      type:   'skill',
      system: {
        rating:          s.rating,
        skillType:       s.skillType ?? 'active',
        specialisations: s.specialisations ?? [],
      },
    })),
    system: { attributes },
  };
}

export const name = 'defaulting';

export async function run(t) {
  /* ---- The book's first example, p.84 ------------------------------------ */
  // "Ratchet has the base skill Shotgun at Rating 5... Ratchet is rolling 5 dice (his
  //  rating in the default skill), plus up to 2 dice from his Combat Pool (default
  //  Skill Rating 5 divided by 2 is 2.5, which is rounded down to 2)."
  const ratchet = SR3EItem.defaultTiers(actorWith([{ name: 'Shotgun', rating: 5 }]));
  const shotgun = ratchet.skills[0];
  t.is('Ratchet rolls his full Shotgun rating', shotgun.dice, 5);
  t.is('Ratchet may add up to 2 pool dice',     shotgun.cap, 2);

  /* ---- The book's second example, p.85 ----------------------------------- */
  // Edged Weapons 4 with a sword specialization: rolls the specialization's rating and
  // "can use up to 2 dice from his Combat Pool (half of Edged Weapons 4)". The cap is
  // half the BASE skill (4 → 2), not half the specialization (6 → 3).
  const swordsman = SR3EItem.defaultTiers(actorWith([
    { name: 'Edged Weapons', rating: 4, specialisations: [{ name: 'Sword', level: 2 }] },
  ]));
  const sword = swordsman.specializations[0];
  t.is('specialization rolls base + its level',      sword.dice, 6);
  t.is('cap is half the BASE skill, not the spec',   sword.cap, 2);

  /* ---- Rounding is down, on both tiers ----------------------------------- */
  const odd = SR3EItem.defaultTiers(actorWith([
    { name: 'Pistols', rating: 3, specialisations: [{ name: 'Ares Predator', level: 1 }] },
  ]));
  t.is('odd rating rolls in full',        odd.skills[0].dice, 3);
  t.is('odd rating caps rounded down',    odd.skills[0].cap, 1);
  t.is('odd base caps the spec too',      odd.specializations[0].cap, 1);
  t.is('spec dice are base + level 1',    odd.specializations[0].dice, 4);

  /* ---- Attribute tier allows no pool at all ------------------------------ */
  const attr = SR3EItem.defaultTiers(actorWith([], { intelligence: { value: 5 } }));
  const int  = attr.attributes.find(a => a.value === 'intelligence');
  t.is('attribute rolls its full value',   int.dice, 5);
  t.is('attribute allows no pool dice',    int.cap, 0);
  // cap 0 is what call sites clamp against, so it alone has to express "no pool".
  t.is('a zero cap clamps any offer to 0', Math.min(12, int.cap), 0);

  /* ---- A skill may carry more than one specialisation -------------------- */
  // Each is its own option; listing one per skill would hide the others entirely.
  const many = SR3EItem.defaultTiers(actorWith([
    { name: 'Firearms', rating: 6, specialisations: [
      { name: 'Pistols', level: 1 }, { name: 'Rifles', level: 2 },
    ] },
  ]));
  t.is('both specialisations are offered', many.specializations.length, 2);
  t.is('first spec rolls 7',               many.specializations[0].dice, 7);
  t.is('second spec rolls 8',              many.specializations[1].dice, 8);
  t.is('both share the base skill cap',
    `${many.specializations[0].cap}/${many.specializations[1].cap}`, '3/3');

  /* ---- Knowledge skills are not defaulting targets ----------------------- */
  const mixed = SR3EItem.defaultTiers(actorWith([
    { name: 'Car',      rating: 4 },
    { name: 'Trivia',   rating: 6, skillType: 'knowledge' },
  ]));
  t.is('only active skills are offered', mixed.skills.length, 1);
  t.is('and it is the active one',       mixed.skills[0].label.startsWith('Car'), true);

  /* ---- The old behaviour must not creep back ----------------------------- */
  // Guard the exact shape of the regression: dice equal to half the rating.
  const guard = SR3EItem.defaultTiers(actorWith([{ name: 'Shotgun', rating: 5 }]));
  t.is('dice are NOT half the rating', guard.skills[0].dice === 2, false);
}
