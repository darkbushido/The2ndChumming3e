/**
 * Charging Attack — SR3EActor.chargingFailure / chargingPowerBonus.  · *Cannon Companion p.86*
 *
 *   "A running start can increase the effectiveness of an attack. If a character moved 2 or more
 *    meters to attack his target, he gains a +1 BONUS TO THE POWER of the attack. While the
 *    character need not have moved 2+ meters in the Initiative Pass in which he is attacking, the
 *    character must have been continuously moving (without interruption) in any previous passes
 *    as well as in the pass in which the charging attack is made.
 *
 *    If a character FAILS a charging attack (the defender wins or dodges), the character must
 *    make a QUICKNESS (5) TEST OR FALL PRONE. If the character must already make a Knockdown Test
 *    because the defender inflicted damage, MODIFY THAT TARGET NUMBER BY +2 INSTEAD.
 *
 *    Only attacking characters may use this option."
 *
 * ⚠ THE FIRST RULE GATED ON A SOURCE BOOK. Cannon Companion is optional content, so the
 * declaration is offered only when `cc` is enabled. That decision — optional rules ride the
 * existing per-book toggle rather than getting a settings list of their own — is documented on
 * `SR3ESourceBooks.optionalRuleAllowed`, and this is the precedent every later sourcebook rule
 * follows.
 *
 * ⚠ "INSTEAD" IS EXCLUSIVE, and it is the whole reason this is a function rather than two
 * inline conditions. A charger who ate a counter-attack does NOT roll Quickness as well; their
 * existing Knockdown Test simply gets harder. Running both punishes one failure twice.
 */
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { SR3EActor } = await import('../scripts/documents/SR3EActor.js');

export const name = 'charging';

export async function run(t) {
  const f = o => SR3EActor.chargingFailure(o);
  const p = c => SR3EActor.chargingPowerBonus(c);

  /* ==== The bonus: POWER, not a target number ==== */
  //
  // ⚠ Almost every other melee option moves a TN. This moves damage, and the distinction
  // matters because Power is also the Damage Resistance TN — a +1 here makes the wound both
  // likelier and worse.
  t.is('a charge that lands gives +1 Power', p(true), 1);
  t.is('no charge, no bonus',                p(false), 0);
  t.is('undefined is no charge',             p(undefined), 0);

  /* ==== A successful charge costs nothing ==== */
  const won = f({ attackFailed: false });
  t.is('a landed charge needs no Quickness test', won.quicknessTN, null);
  t.is('…and adds nothing to any Knockdown TN',   won.knockdownTNMod, 0);
  t.is('…even if a Knockdown Test is happening anyway',
    f({ attackFailed: false, knockdownRequired: true }).knockdownTNMod, 0);

  /* ==== Failure, no damage taken: Quickness (5) or prone ==== */
  const missed = f({ attackFailed: true, knockdownRequired: false });
  t.is('a failed charge with no damage means a Quickness test', missed.quicknessTN, 5);
  t.is('…at TN 5 exactly, as printed',                          missed.quicknessTN, 5);
  t.is('…and no knockdown modifier, because there is no Knockdown Test to modify',
    missed.knockdownTNMod, 0);

  /* ==== Failure WITH damage: +2 to the Knockdown TN, INSTEAD ==== */
  const hurt = f({ attackFailed: true, knockdownRequired: true });
  t.is('a failed charge that also took damage adds +2 to the Knockdown TN',
    hurt.knockdownTNMod, 2);
  // ⚠ THE EXCLUSIVITY. This is the assertion that stops someone "helpfully" returning both.
  t.is('…and there is NO Quickness test as well — "instead" means instead',
    hurt.quicknessTN, null);

  /* ==== The two branches are mutually exclusive, always ==== */
  for (const kd of [true, false]) {
    const r = f({ attackFailed: true, knockdownRequired: kd });
    const both = r.quicknessTN !== null && r.knockdownTNMod > 0;
    t.ok(`knockdownRequired=${kd}: never both consequences at once`, !both);
    const neither = r.quicknessTN === null && r.knockdownTNMod === 0;
    t.ok(`knockdownRequired=${kd}: a failed charge always costs something`, !neither);
  }

  /* ==== Shape ==== */
  t.is('no arguments does not throw',        f().quicknessTN, null);
  t.is('…and costs nothing',                 f().knockdownTNMod, 0);
  t.is('an undefined failure flag is "did not fail"', f({ attackFailed: undefined }).quicknessTN, null);

  /* ==== The +2 rides the Knockdown TN, so check the arithmetic it lands on ====
   *
   * knockdownTN is melee = the opponent's Strength. A charger who failed against a Strength 5
   * defender rolls against 7, not 5.
   */
  const base = SR3EActor.knockdownTN({ isMelee: true, strength: 5 });
  t.is('melee knockdown TN is the opponent Strength', base, 5);
  t.is('…and a failed charge makes it 7',
    base + f({ attackFailed: true, knockdownRequired: true }).knockdownTNMod, 7);
}
