/**
 * Area spells and several targets — TODO 171 (rules check 0.6.1).
 *
 *   "The base radius for all area spells is the caster's Magic Attribute in meters. Area spells
 *    affect all valid targets within the radius of effect, friend and foe alike (including the
 *    caster). … The caster can reduce the base radius by 1 meter for every 2 dice withheld from the
 *    Sorcery Test. … every die withheld from the Sorcery Test increases the radius by 1 meter."
 *                                                                                    — SR3 p.181
 *   "When resolving the Sorcery Test for an area spell, roll the dice once. Compare the results
 *    against the target number for each valid target within the spell's radius. Successes are
 *    counted separately for each target"                                              — SR3 p.182
 *
 * The code skipped the caster, took the radius as a free number, and used the FIRST target's TN
 * for everyone.
 */
import { readFileSync } from 'node:fs';
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { SR3EItem } = await import('../scripts/documents/SR3EItem.js');
const { SR3EActor } = await import('../scripts/documents/SR3EActor.js');

export const name = 'area-spells';

const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const die  = total => ({ total });

export async function run(t) {
  /* ── Radius ─────────────────────────────────────────────────────────────────── */
  const r = (m, w, mode) => SR3EItem.spellAreaRadius(m, w, mode);
  t.is('Magic 5, nothing withheld → 5 m', r(5, 0), 5);
  t.is('widen: each withheld die is +1 m — 3 dice → 8 m', r(5, 3, 'widen'), 8);
  t.is('narrow: every 2 dice is −1 m — 3 dice → 4 m (the odd die buys nothing)', r(5, 3, 'narrow'), 4);
  t.is('narrow never goes below 1 m', r(2, 10, 'narrow'), 1);

  /* ── One roll, each target's own TN ─────────────────────────────────────────── */
  // Rolled at TN 6 (the hardest target): totals 2, 4, 5, 6, 9.
  const dice = [2, 4, 5, 6, 9].map(die);
  t.is('against the TN rolled at (6) → 2 hits', SR3EActor.hitsAgainst(dice, 6), 2);
  t.is('against a Willpower-3 target → 4 hits from the same dice', SR3EActor.hitsAgainst(dice, 3), 4);
  t.is('against TN 5 → 3', SR3EActor.hitsAgainst(dice, 5), 3);
  t.is('no dice → 0, no throw', SR3EActor.hitsAgainst(undefined, 4), 0);

  const item = read('scripts/documents/SR3EItem.js');
  t.ok('the caster is caught in their own area (no caster skip)',
    !/a\.id === caster\.id/.test(item) && /static _actorsInRadius\(center, radiusM, _caster\)/.test(item));
  t.ok('…and can be ticked in the no-canvas list', !/a\.id !== attacker\.id && a\.type !== 'vehicle'/.test(item));
  t.ok('the dice roll at the HARDEST target\'s TN', /\(!best \|\| targetTNs\[t\.id\] > targetTNs\[best\.id\]\)/.test(item));
  t.ok('each target\'s TN rides on the cast', /targetTNs,\s*\n\s*castTN:\s+tn,/.test(item));
  t.ok('withheld Sorcery dice are not rolled', /sorceryRating \+ specBonus - aoeWithheld/.test(item));

  const actor = read('scripts/documents/SR3EActor.js');
  t.ok('the result counts each target against its own TN', /SR3EActor\.hitsAgainst\(dice, sc\.targetTNs\[id\] \+ tnDelta\)/.test(actor));
  t.ok('…a target the dice did not reach gets no Resist button', /if \(hitsByTarget\[targetId\] > 0\) postRollHtml \+= SR3EActor\._spellResistButton/.test(actor));
  t.ok('Spell Defense takes the same reduction off each target\'s own count',
    /Math\.max\(0, sc\.hitsByTarget\[targetId\] - reduction\)/.test(actor));
}
