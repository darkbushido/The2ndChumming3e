/**
 * Insect spirits — true-form, MitS p.127-137 (TODO 312). Numbers are the Insect Spirit Table, MitS p.136-137.
 */
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { InsectSpirits, INSECT_TABLE, INSECT_TOTEMS } = await import('../scripts/data/insect-spirits.mjs');
const { SPIRIT_TYPES } = await import('../scripts/documents/SR3ESpiritSummoning.js');
const { spiritIcon, ICON_DIR } = await import('../scripts/data/item-icons.mjs');

export const name = 'insect-spirits';

export async function run(t) {
  // ── The table, MitS p.136-137 ──────────────────────────────────────────────────────────
  t.eq('Ant soldier F4 — B5 Q8 S8, C/I/W/E F, Reaction 2F, Init R+10', InsectSpirits.stats('ant', 'soldier', 4),
    { body: 5, quickness: 8, strength: 8, charisma: 4, intelligence: 4, willpower: 4, essence: 4, magic: 4, reaction: 8, initiative: 18, moveMult: 4, attack: '(STR)M' });
  t.eq('Ant worker F4 — B2 Q4 S6, Reaction F', { ...InsectSpirits.stats('ant', 'worker', 4) },
    { body: 2, quickness: 4, strength: 6, charisma: 4, intelligence: 4, willpower: 4, essence: 4, magic: 4, reaction: 4, initiative: 14, moveMult: 3, attack: '(STR)M' });
  const w = InsectSpirits.stats('wasp', 'female', 4);
  t.is('Wasp female F4 body F+1', w.body, 5);
  t.is('Wasp female F4 strength F+4', w.strength, 8);
  t.is('Wasp male F4 body F', InsectSpirits.stats('wasp', 'male', 4).body, 4);
  t.is('Beetle male F5 strength F+6', InsectSpirits.stats('beetle', 'male', 5).strength, 11);
  t.is('Beetle male is a Serious attack', InsectSpirits.stats('beetle', 'male', 5).attack, '(STR)S');
  t.is('Mantid male F3 quickness F+5', InsectSpirits.stats('mantid', 'male', 3).quickness, 8);
  t.is('Mantid male Reaction Fx3', InsectSpirits.stats('mantid', 'male', 3).reaction, 9);
  t.is('Fly male quickness F-1', InsectSpirits.stats('fly', 'male', 4).quickness, 3);
  t.is('an unknown caste is null', InsectSpirits.stats('ant', 'queen', 4), null);
  t.ok('every row has powers and an attack', Object.values(INSECT_TABLE).every(d => Object.values(d.castes).every(r => r.powers.length && r.attack)));
  t.ok('worker and termite worker have the Skill power', ['ant', 'termite'].every(k => INSECT_TABLE[k].castes.worker.powers.includes('Skill')));
  t.is('banishing counts Force doubled (MitS p.128)', InsectSpirits.banishForce(4), 8);

  // ── Who may summon ─────────────────────────────────────────────────────────────────────
  t.ok('Wasp is an insect totem', InsectSpirits.isInsectTotem('Wasp'));
  t.ok('case does not matter', InsectSpirits.isInsectTotem(' wasp '));
  t.ok('Bear is not', !InsectSpirits.isInsectTotem('Bear'));
  t.ok('blank is not', !InsectSpirits.isInsectTotem(''));
  t.eq('an insect shaman is offered the spirits, no warning', InsectSpirits.summonVerdict({ totem: 'Ant' }), { offered: true, warn: false });
  t.eq('the GM is always offered them', InsectSpirits.summonVerdict({ isGM: true, totem: 'Bear' }), { offered: true, warn: false });
  t.eq('a non-insect shaman is warned', InsectSpirits.summonVerdict({ totem: 'Bear' }), { offered: false, warn: true });
  t.is('hive totems: Ant', INSECT_TOTEMS.Ant, 'hive');
  t.is('solitary totems: Roach', InsectSpirits.colony('Roach'), 'solitary');
  t.eq('every insect totem is a config totem with a notes entry',
    InsectSpirits.totems().filter(x => !SR3E.magicTotems.includes(x) || !SR3E.magicTotemData[x]), []);

  // ── Wired into summoning ───────────────────────────────────────────────────────────────
  const keys = Object.keys(SPIRIT_TYPES).filter(k => SPIRIT_TYPES[k].category === 'insect');
  t.is('one summonable entry per type + caste', keys.length, InsectSpirits.list().length);
  const def = SPIRIT_TYPES.insect_wasp_female;
  t.is('summoning entry stats come from the table', def.stats(4).body, 5);
  t.ok('summoning entry lists weaknesses', def.powers.includes('Weakness: Vulnerability (Insecticides)'));
  t.is('insect spirits get their own icon', spiritIcon('insect'), `${ICON_DIR}/spirit-insect.svg`);
}
