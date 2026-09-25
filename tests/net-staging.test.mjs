/**
 * Damage stages by the NET of both sides' successes — SR3EActor.netStagedDamage, SR3 p.113 (TODO 165).
 *
 *   "If the attacker's successes equal the target's, the weapon does its base Damage Level. … The
 *    base damage increases by one Damage Level for every two successes the attacker rolls over the
 *    target's total. … the target can stage down the weapon's base Damage Level by one for every two
 *    successes the target rolls over the attacker's total."                              — p.113
 *   Liam 5 vs Snot 3: "His 2 net successes (2 more than Snot) are enough to increase the Damage
 *    Level by one"                                                                         — p.114
 *
 * Until 0.6.1 the attack staged UP by the attacker's raw successes and the soak staged DOWN by the
 * target's, each on its own: floor(A/2) − floor(D/2). The maintainer chose the net reading on
 * 2026-09-24. The cases below are the ones where the two readings DIFFER — the book's examples
 * alone land where they agree.
 */
import { readFileSync } from 'node:fs';
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { SR3EActor } = await import('../scripts/documents/SR3EActor.js');

export const name = 'net-staging';

const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const hit = (power, level, a, d) => {
  const r = SR3EActor.netStagedDamage({ power, level, isStun: false }, a, d);
  return r.soaked ? 'soaked' : `${r.power}${r.level}`;
};

export async function run(t) {
  t.is('Liam 5 vs Snot 3 on 9M: 2 net → one level up, 9S (p.114)', hit(9, 'M', 5, 3), '9S');
  t.is('a tie is base damage', hit(9, 'M', 3, 3), '9M');
  t.is('2 vs 1 is base damage — net 1 is not a stage (separate staging gave 9S)', hit(9, 'M', 2, 1), '9M');
  t.is('4 vs 1 is ONE stage up — net 3 (separate staging gave two)', hit(9, 'M', 4, 1), '9S');
  t.is('a tie at the Deadly cap stays base: 6 vs 6 on 9M (separate staging fell to Light)', hit(9, 'M', 6, 6), '9M');
  t.is('the defender ahead stages DOWN per 2 over: 1 vs 3 on 9M → 9L', hit(9, 'M', 1, 3), '9L');
  t.is('…and 1 vs 4 is still 9L — net −3 is one stage', hit(9, 'M', 1, 4), '9L');
  t.is('…and below Light the damage is soaked: 1 vs 5 on 9M', hit(9, 'M', 1, 5), 'soaked');
  t.is('past Deadly the surplus is discarded, never Power (p.113)', hit(9, 'S', 8, 0), '9D');
  t.is('junk → base damage, no throw', hit(9, 'M', undefined, null), '9M');

  const actor = read('scripts/documents/SR3EActor.js');
  t.ok('the soak result uses the rule when the payload carries `net`',
    /if \(sp\.net\) \{[\s\S]{0,300}SR3EActor\.netStagedDamage\(/.test(actor));
  t.is('ranged (dodge and no-dodge), grenade, a grenade past a fallen wall (TODO 149) and elemental payloads all carry it',
    (actor.match(/net:\s+\{ attackHits: /g) ?? []).length, 5);
  t.ok('_soakButtonHtml carries it through the dodge', /net:\s+payload\.net \?\? undefined/.test(actor));
  t.ok('the soak card carries it into the roll', /net:\s+payload\.net \? \{ \.\.\.payload\.net, baseLevel: netBaseLevel \} : undefined/.test(actor));
}
