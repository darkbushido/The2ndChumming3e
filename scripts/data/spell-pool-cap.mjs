/**
 * The Spell Pool's cap on a Sorcery Test · SR3 p.181, p.182 (TODO 123). **Pure — no Foundry.**
 *
 * > "Spell Pool dice may be added, up to the number of Sorcery dice" — SR3 p.181
 * > "To cast a spell, make a test using allocated Sorcery dice, plus dice from the Spell Pool, if
 * > desired. No more Spell Pool dice can be added to the test than the Sorcery dice allocated." — p.182
 *
 * ⚠ The Sorcery dice ALLOCATED: the dice actually rolled — the Sorcery rating, +2 with the
 *   Spellcasting specialisation, less any dice withheld to change an area spell's radius (p.181:
 *   "Withheld Sorcery dice cannot be used for any other Sorcery Tests").
 * ⚠ Until 0.9.0 the cast offered the whole available pool, so Sorcery 3 + Spell Pool 6 rolled 9 dice.
 *   Found by the spell audit (`audit/spells-audit.md`); mutant `spell-pool-uncapped-on-sorcery`.
 */
export const SpellPoolCap = {
  /** The most Spell Pool dice this Sorcery Test may take. */
  sorceryTest(available, sorceryDice) {
    return Math.max(0, Math.min(Number(available) || 0, Number(sorceryDice) || 0));
  },

  /** A line for the dialog when the cap bites, else ''. */
  note(available, sorceryDice) {
    const a = Number(available) || 0, s = Number(sorceryDice) || 0;
    return a > s
      ? `Capped at ${Math.max(0, s)}: no more Spell Pool dice than the Sorcery dice rolled (SR3 p.182); ${a} in the pool.`
      : '';
  },
};
