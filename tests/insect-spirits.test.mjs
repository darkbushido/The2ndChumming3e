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
  t.is('Fly male quickness F+1 (MitS p.136 — the old scan read it as F-1)', InsectSpirits.stats('fly', 'male', 4).quickness, 5);
  t.is('Firefly quickness F+1', InsectSpirits.stats('firefly', 'male', 4).quickness, 5);
  t.is('an unknown caste is null', InsectSpirits.stats('ant', 'queen', 4), null);
  t.ok('every row has powers and an attack', Object.values(INSECT_TABLE).every(d => Object.values(d.castes).every(r => r.powers.length && r.attack)));
  t.ok('worker and termite worker have the Skill power', ['ant', 'termite'].every(k => INSECT_TABLE[k].castes.worker.powers.includes('Skill')));
  t.is('banishing counts Force doubled (MitS p.128)', InsectSpirits.banishForce(4), 8);

  // ── Flesh-form, MitS p.128-129 ─────────────────────────────────────────────────────────
  const host = { body: 5, quickness: 4, strength: 3 };
  t.eq('flesh soldier F4 on a B5 Q4 S3 host — physical = host + F, mental = F, Reaction (Q+Int)/2',
    InsectSpirits.fleshStats('ant', 'soldier', 4, host),
    { body: 9, quickness: 8, strength: 7, charisma: 4, intelligence: 4, willpower: 4, essence: 4, magic: 4, reaction: 6, initiative: 16, moveMult: 1, attack: '(STR)M' });
  const fw = InsectSpirits.fleshStats('ant', 'worker', 4, host);
  t.is('flesh worker physical = host − 1 (body)', fw.body, 4);
  t.is('flesh worker physical = host − 1 (strength)', fw.strength, 2);
  t.is('flesh worker mental = Force', fw.intelligence, 4);
  t.is('solitary male is treated as a soldier', InsectSpirits.fleshStats('beetle', 'male', 3, host).body, 8);
  t.is('solitary female is treated as a soldier', InsectSpirits.fleshStats('wasp', 'female', 3, host).strength, 6);
  t.is('a physical Attribute never drops below 1', InsectSpirits.fleshStats('ant', 'worker', 3, { body: 1, quickness: 1, strength: 1 }).body, 1);
  t.ok('queens are not offered a flesh-form', !InsectSpirits.fleshAvailable('ant', 'queen'));
  t.ok('a soldier is', InsectSpirits.fleshAvailable('ant', 'soldier'));
  t.ok('a flesh-form is not banishable', !InsectSpirits.banishable('flesh') && InsectSpirits.banishable('true'));
  t.ok('flesh powers drop Materialization', !InsectSpirits.fleshPowers('ant', 'soldier').includes('Materialization') && InsectSpirits.fleshPowers('ant', 'soldier').includes('Venom'));
  t.eq('flesh weaknesses: sight only, no insecticide vulnerability', InsectSpirits.fleshWeaknesses(), ['Reduced Senses (Sight)']);
  t.is('Karma Pool: flesh 1', InsectSpirits.karmaPool('flesh'), 1);
  t.is('Karma Pool: true-form 2', InsectSpirits.karmaPool('true'), 2);
  t.is('Karma Pool: good merge = half the host\'s, up', InsectSpirits.karmaPool('flesh', { hostKarmaPool: 5, merge: true }), 3);
  t.is('incubation is Force weeks', InsectSpirits.incubationWeeks(6), 6);
  t.eq('transformation test: host WP vs Force, both ways', InsectSpirits.transformationTest({ hostWillpower: 3, force: 5 }),
    { hostDice: 3, hostTN: 5, spiritDice: 5, spiritTN: 3 });
  t.is('a Queen/Mother adds +2 to the HOST\'s target number', InsectSpirits.transformationTest({ hostWillpower: 3, force: 5, queenHelped: true }).hostTN, 7);
  const tt = n => InsectSpirits.transformation(n);
  t.eq('Transformation Table: 0 or fewer → true-form emerges', [tt(0).key, tt(-2).key, tt(0).flesh], ['destroyed', 'destroyed', false]);
  t.eq('1–2 full flesh-form', [tt(1).key, tt(2).key], ['full', 'full']);
  t.eq('3 partial, 4 one aspect', [tt(3).key, tt(4).key], ['partial', 'aspect']);
  t.eq('5+ good merge', [tt(5).key, tt(9).key, tt(5).merge, tt(5).flesh], ['good-merge', 'good-merge', true, true]);
  const seq = vals => { let i = 0; return () => vals[i++ % vals.length]; };
  t.is('Rule of Six: a 6 is rolled again and added (6+1=7 meets TN 7)', InsectSpirits.rollSuccesses(1, 7, seq([0.99, 0.01])), 1);
  t.is('a plain 4 misses TN 5', InsectSpirits.rollSuccesses(1, 5, seq([0.6])), 0);
  t.is('three dice vs TN 4: a 4 hits, a 1 misses, a 6 (+1) hits', InsectSpirits.rollSuccesses(3, 4, seq([0.6, 0.1, 0.9, 0.01])), 2);

  t.is('the table\'s flesh Body half is kept (Ant soldier F)', InsectSpirits.fleshBodyTable('ant', 'soldier'), 'F');
  t.is('…Beetle male F x 2', InsectSpirits.fleshBodyTable('beetle', 'male'), 'F x 2');
  t.ok('…one per table row', Object.entries(INSECT_TABLE).every(([ty, d]) => Object.keys(d.castes).every(c => InsectSpirits.fleshBodyTable(ty, c))));
  t.is('…and it is NOT applied: a flesh soldier follows the host (p.128)', InsectSpirits.fleshStats('ant', 'soldier', 4, { body: 5, quickness: 4, strength: 3 }).body, 9);

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
