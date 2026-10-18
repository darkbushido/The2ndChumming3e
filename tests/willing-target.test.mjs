/**
 * A willing subject takes no Spell Resistance Test — TODO 191.
 *
 * > "Living targets may always make a Spell Resistance Test against spells, unless the target of the
 * > spell is willing." — SR3 p.183
 * > "If the target makes no Spell Resistance Test, all the successes from the Sorcery Test are used,
 * > according to the spell's description, to determine the spell's effect." — SR3 p.183
 * > "To touch an unwilling target, the caster must make a normal unarmed [Combat Test]" — SR3 p.178
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { WillingTarget } from '../scripts/data/willing-target.mjs';

export const name = 'willing-target';

const read = rel => readFileSync(fileURLToPath(new URL(`../${rel}`, import.meta.url)), 'utf8');

export async function run(t) {
  /* ==== which spells may be cast on a willing subject ==== */
  for (const c of ['Health', 'Illusion', 'Manipulation', 'Detection', '', undefined])
    t.is(`${c || 'blank'} may be cast on a willing subject`, WillingTarget.canBeWilling(c), true);
  t.is('Combat may too (the maintainer, 0.7.0: a willing target of a Manabolt takes no Resistance Test)', WillingTarget.canBeWilling('Combat'), true);
  t.is('Elemental never (a Damage Resistance Test, p.183)', WillingTarget.canBeWilling(' elemental '), false);

  /* ==== the default tick ==== */
  t.is('the caster themself is willing', WillingTarget.defaultWilling({ isSelf: true }), true);
  t.is('an actor the same player owns', WillingTarget.defaultWilling({ sameOwner: true }), true);
  t.is('a party member', WillingTarget.defaultWilling({ bothPlayerOwned: true }), true);
  t.is('a friendly token', WillingTarget.defaultWilling({ friendlyToken: true }), true);
  t.is('a stranger is not assumed willing', WillingTarget.defaultWilling({}), false);
  t.is('…nor with no facts at all', WillingTarget.defaultWilling(), false);

  /* ==== Combat spells default to NOT willing — only ticked deliberately ==== */
  t.is('Combat: not even the caster is pre-ticked', WillingTarget.defaultWilling({ isSelf: true }, 'Combat'), false);
  t.is('Combat: an owned ally is not pre-ticked', WillingTarget.defaultWilling({ sameOwner: true, bothPlayerOwned: true, friendlyToken: true }, ' combat '), false);
  for (const c of ['Health', 'Illusion', 'Manipulation', 'Detection', 'Transformation', '', undefined]) {
    t.is(`${c || 'blank'} (a buff): self is ticked`, WillingTarget.defaultWilling({ isSelf: true }, c), true);
    t.is(`${c || 'blank'} (a buff): an ally of the same owner is ticked`, WillingTarget.defaultWilling({ sameOwner: true }, c), true);
    t.is(`${c || 'blank'} (a buff): a party member is ticked`, WillingTarget.defaultWilling({ bothPlayerOwned: true }, c), true);
    t.is(`${c || 'blank'} (a buff): a friendly token is ticked`, WillingTarget.defaultWilling({ friendlyToken: true }, c), true);
  }
  t.is('defaultsToUnwilling is Combat only', ['Combat', 'Elemental', 'Health', ''].map(c => WillingTarget.defaultsToUnwilling(c)).join(), 'true,false,false,false');

  /* ==== a vehicle is not living: no Spell Resistance Test (p.183) ==== */
  t.is('a vehicle makes no resistance test', WillingTarget.isNonLiving('vehicle'), true);
  t.is('a character does', WillingTarget.isNonLiving('character'), false);
  t.ok('the non-living line cites p.183', /not living[\s\S]*p\.183/.test(WillingTarget.effectLine({ targetName: 'Van', spellName: 'Powerbolt', successes: 2, nonLiving: true })));

  /* ==== what the carried ids may hold ==== */
  t.eq('only real targets are carried', WillingTarget.carriedIds('Health', ['a', 'b'], ['a', 'zzz', 'a']), ['a']);
  t.eq('a Combat spell carries a deliberate tick', WillingTarget.carriedIds('Combat', ['a', 'b'], ['a']), ['a']);
  t.eq('an Elemental spell carries none even if ticked', WillingTarget.carriedIds('Elemental', ['a'], ['a']), []);
  t.eq('nothing ticked', WillingTarget.carriedIds('Health', ['a'], []), []);

  /* ==== who skips the Resistance Test ==== */
  const sc = { willingTargetIds: ['a'] };
  t.is('a ticked target is unresisted', WillingTarget.resolvesUnresisted(sc, 'a'), true);
  t.is('an unticked target still resists', WillingTarget.resolvesUnresisted(sc, 'b'), false);
  t.is('an elemental cast never skips (belt and braces)', WillingTarget.resolvesUnresisted({ ...sc, isElemental: true }, 'a'), false);
  t.is('a cast with no record resists', WillingTarget.resolvesUnresisted({}, 'a'), false);
  t.is('…and a missing context', WillingTarget.resolvesUnresisted(null, 'a'), false);

  /* ==== the card line ==== */
  const line = WillingTarget.effectLine({ targetName: 'Bones', spellName: 'Invisibility', successes: 3 });
  t.ok('names the target and the success count', /Bones/.test(line) && /All 3 successes/.test(line));
  t.ok('cites the rule', /p\.183/.test(line));
  t.ok('one success is singular', /All 1 success set/.test(WillingTarget.effectLine({ targetName: 'x', spellName: 's', successes: 1 })));
  t.ok('no successes: the spell fails', /fails \(p\.182\)/.test(WillingTarget.effectLine({ targetName: 'x', spellName: 's', successes: 0 })));
  t.ok('a touch spell says no Unarmed Combat Test (p.178)',
    /p\.178/.test(WillingTarget.effectLine({ targetName: 'x', spellName: 's', successes: 2, touch: true })));
  t.ok('a ranged spell does not mention touch',
    !/p\.178/.test(WillingTarget.effectLine({ targetName: 'x', spellName: 's', successes: 2 })));

  /* ==== wired into the cast (source level — the sheet/cast code cannot be imported without Foundry) ==== */
  const item  = read('scripts/documents/SR3EItem.js');
  const actor = read('scripts/documents/SR3EActor.js');
  t.ok('the cast asks which targets are willing, only for a spell that may', /WillingTarget\.canBeWilling\(this\.system\.category\)[\s\S]{0,200}_promptWillingTargets/.test(item));
  t.ok('the answer rides the spell context', /willingTargetIds,/.test(item));
  t.ok('a cancelled willing dialog cancels the cast', /picked === null\) return null/.test(item));
  t.ok('the dialog is a DialogV2.wait with checkboxes, defaults from defaultWilling',
    /_promptWillingTargets[\s\S]{0,3000}type="checkbox" name="willing"[\s\S]{0,2500}DialogV2\.wait/.test(item)
    && /WillingTarget\.defaultWilling\(facts, category\)/.test(item));
  t.ok('the dialog is given the spell category, so Combat defaults to unticked',
    /_promptWillingTargets\(actor, targetActors, this\.name, this\.system\.category\)/.test(item));
  t.ok('same-owner is read for the default (a buff on the player own ally never rolls)',
    /sameOwner:\s+!!game\.users\?\.some\(u => !u\.isGM/.test(item));
  t.ok('a non-living target skips the resist button', /isNonLiving\(tActor\.type\)[\s\S]{0,300}nonLiving: true/.test(actor));
  t.ok('the resist button yields to the willing line', /WillingTarget\.resolvesUnresisted\(sc, targetId\)/.test(actor));
  t.ok('the willing branch sits before the elemental dodge branch in _spellResistButton',
    actor.indexOf('WillingTarget.resolvesUnresisted(sc, targetId)') < actor.indexOf('if (sc.isElemental) {\n      const staged'));
}
