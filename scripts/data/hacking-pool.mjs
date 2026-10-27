/**
 * The Hacking Pool follows the world's Matrix ruleset (TODO 275).
 *
 * **Orthodox SR3 · SR3 p.207 (The Hacking Pool):** *"add the decker's Intelligence Rating and her deck's
 * MPCP Rating, divide the total by 3 and round down"* — ⌊(INT + MPCP) ÷ 3⌋.
 *
 * **Matrix Defragged · MDF p.11:** Intelligence + ⌊MPCP ÷ 3⌋ (`MdfRules.hackingPool`).
 *
 * Until TODO 275 the derived pool always used the Defragged formula for an equipped deck item and the core
 * one only for the `orthodoxDeck` fields, so the Combat Decker sample showed 7 dice where the core book
 * gives 4. One value now, chosen by the setting.
 *
 * Pure: no Foundry globals.
 */
import { MdfRules } from './mdf-rules.mjs';

const whole = n => Math.max(0, Math.floor(Number(n) || 0));

export const HackingPool = {
  /** SR3 core: ⌊(Intelligence + MPCP) ÷ 3⌋ (SR3 p.207). */
  core(intelligence, mpcp) {
    return Math.floor((whole(intelligence) + whole(mpcp)) / 3);
  },

  /** The pool for a ruleset: `'orthodox'` → core; anything else → Matrix Defragged (the default). */
  forRuleset(ruleset, intelligence, mpcp) {
    return ruleset === 'orthodox'
      ? HackingPool.core(intelligence, mpcp)
      : MdfRules.hackingPool(intelligence, mpcp);
  },

  /**
   * Which MPCP feeds the pool. The equipped deck item always wins when it has one. Only an Orthodox
   * decker may fall back to the deck stats kept on the actor (`system.orthodoxDeck.mccp`, 0 = none).
   * Returns null when there is no deck at all (no pool).
   */
  mpcpFor(ruleset, deckMpcp, orthodoxMccp) {
    if (deckMpcp !== null && deckMpcp !== undefined) return deckMpcp;
    if (ruleset === 'orthodox' && whole(orthodoxMccp) > 0) return whole(orthodoxMccp);
    return null;
  },

  /** The full derivation: null without a deck, else the pool for the ruleset. */
  figure(ruleset, intelligence, deckMpcp, orthodoxMccp) {
    const mpcp = HackingPool.mpcpFor(ruleset, deckMpcp, orthodoxMccp);
    return mpcp === null ? null : HackingPool.forRuleset(ruleset, intelligence, mpcp);
  },

  /** The sheet's explanation of the figure. */
  explain(ruleset, intelligence, mpcp) {
    return ruleset === 'orthodox'
      ? `floor((INT ${intelligence} + MPCP ${mpcp}) / 3) (SR3 p.207)`
      : `INT ${intelligence} + floor(MPCP ${mpcp} / 3) (MDF p.11)`;
  },
};
