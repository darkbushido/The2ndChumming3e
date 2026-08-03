/**
 * Skill bonus dice — derivation, the SR3EItem._skillBonusDice helper, and the melee
 * pool builder that consumes it.
 *
 * The bug this guards: improvedAbility was derived and then read in only two places,
 * both in the sheet, so an adept's Improved Ability showed as +2 on the character sheet
 * while every weapon roll quietly ignored it. The sheet agreeing with the dice is the
 * property under test.
 *
 * Also guards the design decision that makes it work: there is NO magicType check at the
 * point of use. The map is only populated for actors who earned the dice, so a second
 * gate on read could only ever discard a bonus derivation already granted.
 */
import { installGlobals, installGame, makeSkill } from './helpers/foundry.mjs';
installGlobals();
const { SR3EItem }  = await import('../scripts/documents/SR3EItem.js');
const { SR3EActor } = await import('../scripts/documents/SR3EActor.js');

export const name = 'skill-bonus';

const adeptPower = (skill, level, hasLevels = true) =>
  ({ type: 'adeptpower', system: { improvedSkillName: skill, level, hasLevels } });
const cyber = (skill, dice) =>
  ({ type: 'cyberware', system: { improvedSkillName: skill, improvedSkillDice: dice } });
const bio = (skill, dice) =>
  ({ type: 'bioware', system: { improvedSkillName: skill, improvedSkillDice: dice } });

/** Run the real _prepareCharacter against a minimal actor and return the derived map. */
function derive(magicType, items) {
  const sys  = { magicType, attributes: {}, wounds: {} };
  const attr = {};
  for (const k of ['body','quickness','strength','charisma','intelligence','willpower','reaction','essence','magic']) {
    attr[k] = { base: 4, value: 4 };
  }
  SR3EActor.prototype._prepareCharacter.call({ items, system: sys }, sys, attr);
  return sys.derived?.skillBonusDice ?? {};
}

export async function run(t) {
  /* ---- derivation ---- */
  t.eq('adept Improved Ability grants dice equal to its level',
    derive('Adept', [adeptPower('Pistols', 2)]), { Pistols: 2 });
  t.eq('an unlevelled power grants exactly one',
    derive('Adept', [adeptPower('Stealth', 4, false)]), { Stealth: 1 });
  t.eq('a non-adept gets no adept dice',
    derive('', [adeptPower('Pistols', 2)]), {});
  t.eq('cyberware dice apply regardless of magicType',
    derive('', [cyber('Negotiation', 1)]), { Negotiation: 1 });
  t.eq('bioware dice apply regardless of magicType',
    derive('', [bio('Negotiation', 2)]), { Negotiation: 2 });
  t.eq('adept and bioware stack on the same skill',
    derive('Adept', [adeptPower('Pistols', 2), bio('Pistols', 1)]), { Pistols: 3 });
  t.eq('a blank skill name is ignored', derive('Adept', [adeptPower('   ', 2)]), {});
  t.eq('zero dice is ignored', derive('', [cyber('Negotiation', 0)]), {});
  t.eq('no items yields an empty map', derive('Adept', []), {});

  /* ---- the helper ---- */
  const actorWith = (map, magicType = 'Adept') =>
    ({ system: { magicType, derived: { skillBonusDice: map } } });

  t.is('reads the map by skill name',
    SR3EItem._skillBonusDice(actorWith({ Pistols: 2 }), { name: 'Pistols' }), 2);
  t.is('accepts a bare skill name',
    SR3EItem._skillBonusDice(actorWith({ Pistols: 2 }), 'Pistols'), 2);
  t.is('an unlisted skill gets nothing',
    SR3EItem._skillBonusDice(actorWith({ Pistols: 2 }), { name: 'Rifles' }), 0);
  t.is('an actor with no derived data gets nothing',
    SR3EItem._skillBonusDice({}, { name: 'Pistols' }), 0);
  t.is('a null actor gets nothing', SR3EItem._skillBonusDice(null, { name: 'Pistols' }), 0);
  t.is('a null skill gets nothing', SR3EItem._skillBonusDice(actorWith({ Pistols: 2 }), null), 0);
  t.is('NO magicType gate: a non-adept still receives mapped dice',
    SR3EItem._skillBonusDice(actorWith({ Pistols: 2 }, ''), { name: 'Pistols' }), 2);

  /* ---- melee pool builder ---- */
  installGame({ sr3e: { SR3EItem } });
  const actor = (skills, map) => ({
    items: skills,
    system: {
      attributes: { strength: { value: 3 } },
      derived: { skillBonusDice: map, availableCombatPool: 6 },
    },
  });
  const club = { name: 'Club', system: { category: 'CLB' } };
  const dice = (skills, map, weapon = club) =>
    SR3EItem._buildMeleePoolInfo(actor(skills, map), weapon).skillDice;

  t.is('Clubs 4 with +2 bonus rolls 6', dice([makeSkill('Clubs', 4)], { Clubs: 2 }), 6);
  t.is('no bonus rolls the rating', dice([makeSkill('Clubs', 4)], {}), 4);
  t.is('bonus and specialisation stack (4 + 2 spec + 2 bonus)',
    dice([makeSkill('Clubs', 4, { specialisation: 'Club' })], { Clubs: 2 }), 8);
  t.is('defaulting gets no bonus — there is no skill to have improved',
    dice([], { Clubs: 2 }), 3);
  t.is('the bonus keys to the martial art actually used, not "Unarmed Combat"',
    dice([makeSkill('MA:Aikido', 5)], { 'MA:Aikido': 2, 'Unarmed Combat': 99 },
      { name: 'Fist', system: { category: 'UNA' } }), 7);
  t.is('bonusDice is reported on the pool info',
    SR3EItem._buildMeleePoolInfo(actor([makeSkill('Clubs', 4)], { Clubs: 2 }), club).bonusDice, 2);
}
