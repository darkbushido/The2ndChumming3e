/**
 * Mystic Armor protects in ASTRAL combat — rules-check 0.6.0, Finding 5.
 *
 *   > "Mystic Armor also protects against damage done in astral combat (p. 174)."   — SR3 p.170
 *   > "natural armor--like that of a troll, or an adept with the Mystic Armor power--helps
 *   > protect you."                                                                   — SR3 p.172
 *   > "Dual beings with natural physical armor gain the benefits of their armor in astral combat;
 *   > the Power of the attack is reduced by the target's natural armor. Physical armor worn by a
 *   > character has no effect in astral combat."                                      — SR3 p.175
 *
 * The ordinary soak card added Mystic Armor from the start, under a comment quoting p.170. The
 * astral soak card — the one place p.170 names — built its TN from the Power alone.
 */
import { readFileSync } from 'node:fs';
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { SR3EActor } = await import('../scripts/documents/SR3EActor.js');

export const name = 'astral-soak';

export async function run(t) {
  const tn = o => SR3EActor.astralSoakTN(o);

  t.is('an astral (5)M punch against no Mystic Armor is TN 5', tn({ power: 5 }), 5);
  t.is('…and against Mystic Armor 2 is TN 3 — the Power is reduced (p.175)', tn({ power: 5, mysticArmor: 2 }), 3);
  t.is('no TN falls below 2 (p.112)', tn({ power: 4, mysticArmor: 4 }), 2);
  t.is('a negative figure cannot raise the TN', tn({ power: 5, mysticArmor: -3 }), 5);

  // TODO 132 — p.175: "Willpower or Force for astral beings, or Body for dual beings"; p.174: dual
  // beings use "their normal physical Attributes, skills and Combat Pool in astral combat".
  const attributes = { body: { value: 6, base: 5 }, willpower: { value: 3, base: 3 } };
  const res = o => SR3EActor.astralResistPool({ attributes, ...o });
  t.is('a Dual Natured actor resists with Body', res({ astralMode: 'dual' }).key, 'body');
  t.is('…at its current value', res({ astralMode: 'dual' }).value, 6);
  t.ok('…and may add Combat Pool (p.174)', res({ astralMode: 'dual' }).combatPool);
  t.is('no mode set (perceiving, materialized) is a dual being too', res({ astralMode: '' }).key, 'body');
  t.is('Physical Plane is a dual being in astral combat', res({ astralMode: 'physical' }).key, 'body');
  t.is('a projecting actor resists with Willpower', res({ astralMode: 'astral' }).key, 'willpower');
  t.is('…at its value', res({ astralMode: 'astral' }).value, 3);
  t.ok('…and gets no physical Combat Pool', !res({ astralMode: 'astral' }).combatPool);
  t.is('a spirit in astral form resists with its Force', res({ astralMode: 'astral', spiritForce: 5 }).value, 5);
  t.is('…named as Force', res({ astralMode: 'astral', spiritForce: 5 }).key, 'force');
  t.is('a materialized spirit is a dual being: Body, not Force', res({ astralMode: '', spiritForce: 5 }).key, 'body');
  t.is('no attribute resists with fewer than 1 die', SR3EActor.astralResistPool({ astralMode: 'dual' }).value, 1);

  const src  = readFileSync(new URL('../scripts/documents/SR3EActor.js', import.meta.url), 'utf8');
  const card = src.slice(src.indexOf('async _postAstralSoakCard('), src.indexOf('async _postAstralSoakCard(') + 3000);
  t.ok('the astral soak card reads the defender\'s Mystic Armor',
    /this\.system\.derived\?\.mysticArmor/.test(card));
  t.ok('…and builds its TN through astralSoakTN',
    /SR3EActor\.astralSoakTN\(\{ power: stagedPower \?\? winnerCha, mysticArmor \}\)/.test(card));
  t.ok('the card takes its pool from astralResistPool, not a hard-coded Willpower',
    /SR3EActor\.astralResistPool\(/.test(card) && !/attributes\?\.willpower/.test(card));
  const roll = src.slice(src.indexOf('static async handleAstralSoakRoll('), src.indexOf('static async handleAstralSoakRoll(') + 3000);
  t.ok('the resist roll charges the Combat Pool it adds', /\.sr-astral-soak-cp/.test(roll) && /spendCombatPool\(useCP\)/.test(roll));
  // p.175: "Physical armor worn by a character has no effect in astral combat."
  t.ok('…and never worn armour', !/armorRatings\(/.test(card));
}
