/**
 * Damage-code parsing and staging — SR3EItem.parseDamageCode / stageDamage.
 *
 * These sit under every combat resolution in the system: a wrong parse silently changes
 * how much damage a hit does, and nothing downstream would flag it.
 */
import { installGlobals, installGame, makeActor } from './helpers/foundry.mjs';
installGlobals();
// The real config, not a fake one: the ammo/range helpers look their tables up through
// game.sr3e.SR3E, so testing against a stubbed table would only prove the stub.
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { SR3EItem } = await import('../scripts/documents/SR3EItem.js');

export const name = 'damage-codes';

export async function run(t) {
  const p = (code, actor) => SR3EItem.parseDamageCode(code, actor);

  /* ---- parseDamageCode ---- */
  t.eq('plain code', p('9M'), { power: 9, level: 'M', isStun: false });
  t.eq('deadly',     p('12D'), { power: 12, level: 'D', isStun: false });
  t.eq('light',      p('4L'), { power: 4, level: 'L', isStun: false });
  t.ok('stun flag is detected', p('6M Stun')?.isStun === true);
  t.is('stun code keeps its power', p('6M Stun')?.power, 6);
  t.is('stun code keeps its level', p('6M Stun')?.level, 'M');

  // Strength expressions — the melee path leans on these.
  const brute = makeActor({ attributes: { strength: 6 } });
  t.is('(STR)M resolves strength',   p('(STR)M', brute)?.power, 6);
  t.is('(STR+3)M adds',              p('(STR+3)M', brute)?.power, 9);
  t.is('STR-1S subtracts',           p('STR-1S', brute)?.power, 5);
  t.is('STR expression keeps level', p('(STR+3)S', brute)?.level, 'S');
  t.is('STR without an actor is unresolvable', p('(STR)M'), null);

  t.is('empty code is null', p(''), null);
  t.is('null code is null',  p(null), null);

  /* ---- stageDamage ---- */
  const base = { power: 6, level: 'M', isStun: false };
  const stage = (b, n) => SR3EItem.stageDamage(b, n);

  t.is('0 successes does not stage', stage(base, 0).level, 'M');
  t.is('1 success does not stage',   stage(base, 1).level, 'M');
  t.is('2 successes stage once',     stage(base, 2).level, 'S');
  t.is('4 successes stage twice',    stage(base, 4).level, 'D');
  t.is('3 successes stage once (odd successes round down)', stage(base, 3).level, 'S');

  // Past Deadly, further successes raise Power instead of Level.
  const past = stage({ power: 6, level: 'D', isStun: false }, 4);
  t.is('beyond Deadly the level stays D', past.level, 'D');
  t.ok('beyond Deadly the power rises', past.power > 6, `power was ${past.power}`);

  t.is('staging preserves the stun flag',
    stage({ power: 6, level: 'M', isStun: true }, 2).isStun, true);
  t.is('staging preserves power below Deadly', stage(base, 2).power, 6);

  /* ---- magazine parsing ---- */
  t.is('capacity mechanism', SR3EItem._parseLoadMechanism('15(c)'), 'c');
  t.is('capacity size',      SR3EItem._parseMagazineSize('15(c)'), 15);
  // Returns the mechanism KEY, not its label — keys are c/m/cy/b/d/sb/internal.
  t.is('belt mechanism is the key b', SR3EItem._parseLoadMechanism('50(b)'), 'b');
  t.is('drum mechanism',              SR3EItem._parseLoadMechanism('100(d)'), 'd');
  // No bracketed code at all -> empty string, not a guessed default.
  t.is('capacity with no brackets yields no mechanism',
    SR3EItem._parseLoadMechanism('nonsense'), '');
  t.is('null capacity yields no mechanism', SR3EItem._parseLoadMechanism(null), '');
  // Longest-prefix matching: "clip" starts with the key "c".
  t.is('a descriptive code prefix-matches its key',
    SR3EItem._parseLoadMechanism('15(clip)'), 'c');

  /* ---- range bands ---- */
  const bands = [5, 15, 30, 50];
  const band = m => SR3EItem._rangeBandForDistance(bands, m);
  t.is('point blank is Short',        band(1).idx, 0);
  t.is('at the Short boundary',       band(5).idx, 0);
  t.is('just past Short is Medium',   band(6).idx, 1);
  t.is('Long band',                   band(30).idx, 2);
  t.is('Extreme band',                band(50).idx, 3);
  t.ok('beyond Extreme is flagged',   band(500).beyond === true);
}
