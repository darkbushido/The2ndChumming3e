/**
 * Clout — a telekinetic spell that is a RANGED ATTACK · SR3 p.197 (TODO 123). **Pure — no Foundry.**
 *
 * > "Clout creates a bolt of invisible psychokinetic force that does stun damage. It is targeted as a
 * > normal Ranged Attack, using the Sorcery Test in place of the Combat Skill Test. Impact armor
 * > protects against the damage." — SR3 p.197 (Type P · Target 4 · Duration I · Drain (Damage Level))
 *
 * So Clout resolves like Fling, not like a combat spell: the caster picks the Damage Level (its Drain
 * is "(Damage Level)", so the level is chosen as for a combat spell, p.191), the Power is the Force,
 * each target may dodge, then resists the STUN damage with Body + Combat Pool against full Impact
 * armour. There is no Spell Resistance Test and no elemental secondary effect.
 *
 * ⚠ Until 0.9.0 the pack filed Clout as a non-damaging spell, so a cast offered no Damage Level and
 *   posted no attack at all — the audit found it (`audit/spells-audit.md`).
 */
export const Clout = {
  /** Is this spell Clout? Keyed on the name: the book prints one spell of that name. */
  is(name) {
    return /^\s*clout\s*$/i.test(String(name ?? ''));
  },

  /** Clout does stun damage (p.197) — whatever the item's damage-track field says is blank. */
  dealsStun: true,

  /** Resisted on IMPACT armour, in full (p.197) — not halved as an elemental spell's is (p.196). */
  armour: 'impact',
};
