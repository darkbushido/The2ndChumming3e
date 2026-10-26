/**
 * The Hand of God — burning ALL of a character's Karma at once to escape certain death · *SR3 p.248* · TODO 267.
 * Pure — no Foundry.
 *
 * > "The Hand of God is a second optional use for Karma. This rule allows player characters to spend their entire
 * > stock of Karma—both Good Karma and Karma Pool—in a single instant." … "To use Hand of God, a character must
 * > possess at least 1 Karma Pool Point. When the character burns all his or her Karma at once to avoid certain
 * > death, these points are gone. The character has no Karma until he or she earns new Karma Points." … "A
 * > character may use the Hand of God only once, ever."   — SR3 p.248
 *
 * ⚠ **Optional, and the GM's to allow.** The book's three conditions — a player character, at least 1 Karma Pool
 * point, once ever — are WARNED, never refused (the ethos): a GM may bend any of them.
 * ⚠ **Nothing about the death is automated.** Damage is never applied or removed by the system; the card says the
 * character is pulled from the jaws of Death, and how is the GM's to narrate (*"any rationale they like"*).
 * ⚠ **Total Karma is untouched** — it is everything ever earned (p.242), and new awards go on accruing from it.
 * The Pool is emptied, not merely spent: "these points are gone", so a refresh brings nothing back.
 */
const int = n => (Number.isFinite(Number(n)) ? Math.trunc(Number(n)) : 0);

export const HandOfGod = {
  PAGE: 'SR3 p.248',

  /** What the character burns: all Good Karma and the whole Karma Pool (its size, spent or not). */
  burned(sys) {
    return { goodKarma: int(sys?.karma), karmaPool: Math.max(0, int(sys?.karmaPool)) };
  },

  /** The book's conditions this use breaks, as warnings for the GM — never a refusal. */
  warnings(sys, { isPlayerCharacter = true } = {}) {
    const w = [];
    if (!isPlayerCharacter) w.push('The book offers the Hand of God to player characters.');
    if (Math.max(0, int(sys?.karmaPool)) < 1) w.push('The character must have at least 1 Karma Pool point.');
    if (sys?.handOfGodUsed) w.push('This character has already used the Hand of God — the book allows it only once, ever.');
    return w;
  },

  /** The actor update: Good Karma and the Pool to 0, nothing left spent, and the use recorded. */
  update() {
    return { 'system.karma': 0, 'system.karmaPool': 0, 'system.karmaPoolSpent': 0, 'system.handOfGodUsed': true };
  },

  /**
   * How the GM's ↺ puts it back (the 📒 Ledger's purchase undo, TODO 212): the Good Karma line refunds what was
   * burned, and these restore the Pool and clear the record. ⚠ It rides on the Good Karma line, so a character who
   * had no Good Karma has no line to undo from — the GM types the Pool back.
   */
  revert(sys) {
    return { actor: {
      'system.karmaPool':      Math.max(0, int(sys?.karmaPool)),
      'system.karmaPoolSpent': Math.max(0, int(sys?.karmaPoolSpent)),
      'system.handOfGodUsed':  !!sys?.handOfGodUsed,
    } };
  },
};
