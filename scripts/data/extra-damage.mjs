/**
 * A weapon's extra Damage Code · the Shock Glove, SR3 p.275-276. Pure — no Foundry.
 *
 * > "Shock Glove … When striking with shock gloves, fist damage is reduced to (STR -1)M, but the gloves
 * > deliver an extra 7S Stun (see Shock Weapons, p. 124 of the Combat section). Can be discharged 8 times
 * > before requiring a 1-hour recharge."                                                     — SR3 p.275-276
 * > "Impact armor protects against shock weapons, but its rating is halved (rounding down)."   — SR3 p.124
 *
 * The Weapons table prints the glove's damage as "(STR - 1)M Stun +7S Stun": two codes, two different Powers
 * and Levels, so they cannot be one Damage Resistance Test (the TN is Power − armour). `SR3EItem.parseDamageCode`
 * reads one code, so the first stays in `system.damage` and the second lives in `system.extraDamage` — a field,
 * not a parse of the damage string, so every other reader of `damage` (the corner box, the recoil and staging
 * code, the importer) keeps meeting a code it can read, and a GM can edit the extra on its own.
 *
 * The melee result then offers TWO Resist Damage buttons for the one blow: the fist's code, and the extra,
 * which is staged by the same net successes and resisted with Impact armour at half. Nothing is applied: the
 * GM clicks the wound boxes, as for every attack here. The 8 charges and the 1-hour recharge are not tracked.
 */
export const ExtraDamage = {
  /** "+7S Stun" as written in the table → "7S Stun" (what `parseDamageCode` reads). Blank stays blank. */
  normalise(code) {
    return String(code ?? '').trim().replace(/^\+\s*/, '').trim();
  },

  /** Impact armour against a shock weapon: halved, rounded down (SR3 p.124). */
  shockImpact(impact) {
    return Math.floor(Math.max(0, Number(impact) || 0) / 2);
  },

  /** The extra code of whichever fighter won the exchange (the loser's weapon deals nothing). */
  winnerExtra(ctx, winnerIsAtk) {
    return ExtraDamage.normalise(winnerIsAtk ? ctx?.atkExtraDamage : ctx?.defExtraDamage);
  },
};
