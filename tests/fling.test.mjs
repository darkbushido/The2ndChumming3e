/**
 * Fling is a ranged attack with different rolls · SR3 p.197 (the maintainer, rules check 0.7.0).
 *
 * > "Treat the Sorcery Test as a normal Ranged Combat Test for the purposes of the item hitting the target.
 * > Throwing weapons propelled by this spell use their normal range based on the spell's effective Strength."
 * > — and "the thrower's Strength Attribute determines range and damage" (p.117), here Strength = Force.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Fling } from '../scripts/data/fling.mjs';

export const name = 'fling';
const read = rel => readFileSync(fileURLToPath(new URL(`../${rel}`, import.meta.url)), 'utf8');

// parseDamageCode's contract for the cases used here: "(STR+2)M" / "(STR)L" / "9M [Stun]".
const parse = (code, actor) => {
  const isStun = /stun/i.test(code);
  const s = code.replace(/stun/i, '').trim();
  const m = s.match(/^\(?(STR)?([+-]\d+)?\)?\s*(\d+)?\s*([LMSD])$/i);
  if (!m) return null;
  const str = actor.system.attributes.strength.value;
  const power = m[1] ? str + Number(m[2] ?? 0) : Number(m[3]);
  return { power, level: m[4].toUpperCase(), isStun };
};

export async function run(t) {
  /* ==== damage ==== */
  const knife = Fling.damage({ weaponCode: '(STR)L', force: 5, parse });
  t.eq('a thrown weapon does its own code at Strength = Force', knife.base, { power: 5, level: 'L', isStun: false });
  t.is('…and it is not the GM\'s call', knife.gmCall, false);
  const sh = Fling.damage({ weaponCode: '(STR+2)M', typedCode: '3S', force: 6, parse });
  t.is('a thrown weapon wins over a typed code', sh.raw, '8M');
  const brick = Fling.damage({ weaponCode: null, typedCode: '4M', force: 6, parse });
  t.is('another object uses the code the caster entered', brick.raw, '4M');
  t.is('…stated as the GM\'s call', brick.gmCall, true);
  const blank = Fling.damage({ weaponCode: null, typedCode: '', force: 6, parse });
  t.is('blank falls to Force Light, flagged', `${blank.raw}|${blank.gmCall}`, '6L|true');
  t.is('a stun code stays stun', Fling.damage({ typedCode: '5M Stun', force: 4, parse }).base.isStun, true);

  /* ==== range: normal thrown ranges at Strength = Force (p.111) ==== */
  t.eq('thrown-knife bands at Force 6 (x1,x2,x3,x5)', Fling.bands([1, 2, 3, 5], 6), [6, 12, 18, 30]);
  t.eq('shuriken bands at Force 4 (x1,x2,x5,x7)', Fling.bands([1, 2, 5, 7], 4), [4, 8, 20, 28]);
  t.is('no multipliers, no bands', Fling.bands([], 4), null);
  const b = [6, 12, 18, 30];
  t.is('6 m is Short', Fling.bandForDistance(b, 6), 'short');
  t.is('7 m is Medium', Fling.bandForDistance(b, 7), 'medium');
  t.is('30 m is Extreme', Fling.bandForDistance(b, 30), 'extreme');
  t.is('beyond Extreme stays Extreme (warn, never refuse)', Fling.bandForDistance(b, 99), 'extreme');
  t.is('only a thrown item is a throwing weapon', Fling.isThrowingWeapon({ type: 'projectile' }), false);

  /* ==== the flow: dodge then Damage Resistance, no Spell Resistance ==== */
  const actor = read('scripts/documents/SR3EActor.js');
  const btn = actor.slice(actor.indexOf('static _spellResistButton('), actor.indexOf('async _postSpellSoakCard('));
  t.ok('a Fling target is sent down the ranged dodge path, as an elemental spell is',
    /if \(sc\.isElemental \|\| sc\.isFling\) \{[\s\S]{0,1500}sr-dodge-declare-btn/.test(btn));
  t.ok('…and that path comes BEFORE the Resist Spell button', btn.indexOf('sc.isFling') < btn.indexOf('sr-spell-soak-btn'));
  t.ok('Fling is not elemental: Impact armour is not halved', /elemental:\s+sc\.isElemental \? true : undefined/.test(btn));
  t.ok('a vehicle is not shielded by the non-living line (it goes to its resistance)',
    /!sc\.isElemental && !sc\.isFling && WillingTarget\.isNonLiving/.test(btn));

  const item = read('scripts/documents/SR3EItem.js');
  const cast = item.slice(item.indexOf('async rollSpell('), item.indexOf('static spellAreaRadius('));
  t.ok('the cast carries isFling on the spell context', /isFling,/.test(cast));
  t.ok('Fling\'s damage is the object\'s, not Force + a level', /Fling\.damage\(\{[\s\S]{0,200}force, parse: SR3EItem\.parseDamageCode/.test(cast));
  t.ok('Fling takes the GM\'s cover/visibility window (a ranged attack)', /spellTakesGMWindow\(this\.system\.range\) \|\| isFling/.test(cast));
  t.ok('a willing-subject prompt is skipped: Fling is an attack', /canBeWilling\(this\.system\.category\) && !isFling/.test(cast));
  t.ok('Drain is not touched: drainLevel stays combat-only', /drainLevel:\s+isCombat \? damageLevel : null/.test(cast));
  t.ok('the TN dialog is wired through wait()\'s render option',
    /render: \(_event, dialog\) => wireFling\(dialog, dialog\.element\)/.test(item));
}
