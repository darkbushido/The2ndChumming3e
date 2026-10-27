/**
 * Armour with mods installed — scripts/data/armor-mods.mjs · TODO 276 (armour slice), CC pp.51-54, SR3 p.284-285.
 *
 * The maintainer's rulings of 2026-10-27 are pinned here: warn (never refuse) off CC p.52's list; Gel Packs ×5 the
 * armour's own price in all, Availability ×2 / ×4; Gel Packs outside the caps; a rated mod's Availability once per mod;
 * nothing layers with hardened (a warning).
 */
import { ArmorMods, THERMAL_MAX } from '../scripts/data/armor-mods.mjs';
import { ItemMods } from '../scripts/data/item-mods.mjs';
import { ModEffects, MOD_EFFECTS } from '../scripts/data/mod-effects.mjs';
import { readSourceDir } from '../tools/lib/pack-source.mjs';
import { CarriedLoad } from '../scripts/data/carried-load.mjs';
import { Concealment } from '../scripts/data/concealment.mjs';
import { readFileSync } from 'node:fs';
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { SR3EActor } = await import('../scripts/documents/SR3EActor.js');
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

export const name = 'armor-mods';

const jacket = (installed = [], extra = {}) => ({ name: 'Armor Jacket', type: 'armor', system: {
  ballistic: 5, impact: 3, cost: 900, availability: '3/36hrs', streetIndex: '.75', concealability: '6', weight: 2,
  installed, ...extra } });
let n = 0;
const rated = (nm, target, rating, extra = {}) => ({ _id: `m${++n}`, name: nm, type: 'gear', system: {
  rating, modifiers: [{ target, value: 1, perRating: true }], availability: '+1/+12hrs', streetIndex: '+.25',
  concealability: '-', weight: 0, cost: 0, modFor: 'armor', ...extra } });
const fireRes = r => rated('Fire Resistance (Armor)', 'resistFire', r, { cost: 100 * r });
const insul   = (r, conceal) => rated('Insulation (Armor)', 'resistCold', r, { cost: 150 * r, weight: r / 2, concealability: conceal });
const gel = () => ({ _id: `g${++n}`, name: 'Gel Packs (See Rules) (Armor)', type: 'gear', system: {
  modifiers: [{ target: 'gelPacks', value: 1 }], cost: 5, weight: 25, availability: 'x2/x4', streetIndex: '+2',
  concealability: '(See Rules)', modFor: 'armor' } });

export async function run(t) {
  /* ── Per-rating values ─────────────────────────────────────────────────────── */
  t.eq('a perRating change is per point of the mod\'s rating — Fire Resistance [3] is −3 Power vs fire (CC p.52)',
    ItemMods.modifiersOf(fireRes(3)), [{ target: 'resistFire', value: 3 }]);

  /* ── The numbers on the item ──────────────────────────────────────────────── */
  t.is('no mods: the jacket\'s own Concealability', ArmorMods.concealability(jacket()).value, 6);
  t.is('Insulation [3] at −1 (its level\'s own figure, −1 per 2 points rounded down): 5', ArmorMods.concealability(jacket([insul(3, '-1')])).value, 5);
  t.is('gel packs halve it, rounded down: (6) → 3', ArmorMods.concealability(jacket([gel()])).value, 3);
  t.is('…after the other mods: (6 − 1) / 2 → 2', ArmorMods.concealability(jacket([insul(3, '-1'), gel()])).value, 2);
  t.is('armour with no Concealability ("-") stays without one', ArmorMods.concealability({ system: { concealability: '-' } }).value, null);
  t.is('weight: 2 + Insulation 1.5 = 3.5', ArmorMods.weight(jacket([insul(3, '-1')])), 3.5);
  t.is('gel packs +25% of the armour\'s own (2 → 2.5) — the mod\'s "25" is the percentage, not kg', ArmorMods.weight(jacket([gel()])), 2.5);
  t.is('cost: 900 + Fire Resistance [2] 200 = 1,100', ArmorMods.cost(jacket([fireRes(2)])), 1100);
  t.is('gel packs: ×5 the armour\'s OWN price in all — 900 → 4,500 (the ruling)', ArmorMods.cost(jacket([gel()])), 4500);
  t.is('…other mods still add on top: 4,500 + 200', ArmorMods.cost(jacket([gel(), fireRes(2)])), 4700);
  t.is('availability: +1/+12hrs ONCE per mod, not per point — [5] still 4/48hrs (the ruling)', ArmorMods.availability(jacket([fireRes(5)])), '4/48hrs');
  t.is('…two rated mods add twice', ArmorMods.availability(jacket([fireRes(2), insul(2, '-1')])), '5/60hrs');
  t.is('gel packs: TN ×2, time ×4 — 3/36hrs → 6/144hrs (the ruling)', ArmorMods.availability(jacket([gel()])), '6/144hrs');
  t.is('…multipliers first, then the additions: 6/144 + 1/12', ArmorMods.availability(jacket([fireRes(1), gel()])), '7/156hrs');
  t.is('a time in days keeps its unit; the hours are added beside it', ArmorMods.availability(jacket([fireRes(1)], { availability: '4/4days' })), '5/4days +12hrs');
  t.is('"Always" does not parse: null, never a guess', ArmorMods.availability(jacket([fireRes(1)], { availability: 'Always' })), null);
  t.is('Street Index: .75 + .25 + 2', ArmorMods.streetIndex(jacket([fireRes(1), gel()])), 3);

  /* ── Hardened and the ratings ─────────────────────────────────────────────── */
  t.ok('a plain jacket is not hardened', !ArmorMods.hardened(jacket()));
  t.ok('gel packs make it hardened (CC p.53)', ArmorMods.hardened(jacket([gel()])));
  t.ok('military armour is hardened by its own field (CC p.51)', ArmorMods.hardened({ system: { hardened: true } }));
  t.eq('gel-packed: its own ratings (5/3)', ArmorMods.ratings(jacket([gel()])), { ballistic: 5, impact: 3 });
  const clothes = { name: 'Ordinary Clothing', type: 'armor', system: { ballistic: 0, impact: 0, concealability: '-', installed: [gel()] } };
  t.eq('gel packs on unarmoured clothing: hardened 1/1 (CC p.53)', ArmorMods.ratings(clothes), { ballistic: 1, impact: 1 });
  t.eq('Combat Pool reads gel armour 50% higher, rounded down: 5/3 → 7/4 (CC p.54)', ArmorMods.poolRatings(jacket([gel()])), { ballistic: 7, impact: 4 });
  t.eq('…only gel: a plain jacket stays 5/3', ArmorMods.poolRatings(jacket()), { ballistic: 5, impact: 3 });
  t.is('hardened rating vs a ranged attack: Ballistic', ArmorMods.hardenedRating([jacket([gel()])]), 5);
  t.is('…vs melee: Impact', ArmorMods.hardenedRating([jacket([gel()])], { useImpact: true }), 3);
  t.is('…vs APDS: half, rounded down (CC p.51)', ArmorMods.hardenedRating([jacket([gel()])], { armorPiercing: true }), 2);
  t.is('…nothing hardened worn: null', ArmorMods.hardenedRating([jacket()]), null);
  t.is('…the caller\'s layering is used when given (military 9 + helmet 2)', ArmorMods.hardenedRating(
    [{ name: 'Heavy Military Armor', system: { hardened: true, ballistic: 9, impact: 8 } }, { name: 'Military Helmet', system: { hardened: true, ballistic: 2, impact: 3 } }],
    { layer: ps => ({ ballistic: ps.reduce((s, p) => s + p.system.ballistic, 0), impact: 0 }) }), 11);

  /* ── Caps (CC p.52) — gel packs outside them (the ruling) ─────────────────── */
  t.eq('jacket 5/3: one mod at most 5, all at most 8', ArmorMods.caps(jacket()), { single: 5, total: 8 });
  t.eq('unarmoured clothing: 2 and 2', ArmorMods.caps({ system: { ballistic: 0, impact: 0 } }), { single: 2, total: 2 });
  t.eq('within the caps: nothing to say', ArmorMods.problems(jacket([fireRes(5), insul(3, '-1')])), []);
  t.ok('one mod over the higher rating is warned', ArmorMods.problems(jacket([fireRes(6)])).some(w => /at most 5/.test(w)));
  t.ok('the total over B + I is warned', ArmorMods.problems(jacket([fireRes(5), insul(4, '-2')])).some(w => /9 mod points; at most 8/.test(w)));
  t.is('gel packs do not count toward the caps', ArmorMods.points(jacket([fireRes(5), insul(3, '-1'), gel()])).total, 8);
  t.ok('Thermal Dampening above +8 is warned (CC p.53)', ArmorMods.problems({ name: 'Camo Full Suit', type: 'armor', system: { ballistic: 9, impact: 9,
    installed: [rated('Thermal Dampening (Armor)', 'thermalMasking', 9)] } }).some(w => w.includes(`+${THERMAL_MAX}`)));

  /* ── Hosts and gel restrictions — warnings ────────────────────────────────── */
  const on = (nm, mods, extra = {}) => ArmorMods.problems({ name: nm, type: 'armor', system: { ballistic: 5, impact: 3, installed: mods, ...extra } });
  t.ok('SecureTech takes no mods — warned (CC p.52)', on('Secure Jacket', [fireRes(1)]).some(w => /SecureTech/.test(w)));
  t.ok('a helmet is warned', on('Security Helmet', [fireRes(1)]).some(w => /helmets/.test(w)));
  t.ok('a shield is warned', on('Riot Shield, Small', [fireRes(1)]).some(w => /shields/.test(w)));
  t.ok('forearm guards are warned', on('Forearm Guards', [fireRes(1)]).some(w => /forearm/.test(w)));
  const locator = { _id: 'sl', name: 'Signal Locator (Armor)', type: 'armor', system: { modFor: 'armor', rating: 3 } };
  t.ok('an SR3 p.284 helmet option on a jacket is warned', on('Armor Jacket', [locator]).some(w => /p\.284/.test(w)));
  t.eq('…on a helmet it is right', on('Security Helmet', [locator]), []);
  t.eq('…and on security armour', on('Medium Security Armor', [locator]), []);
  t.ok('two sets of gel packs warned', on('Armor Jacket', [gel(), gel()]).some(w => /2 sets of gel packs/.test(w)));
  t.ok('gel on form-fitting warned', on('Form-fitting Shirt', [gel()]).some(w => /form-fitting/.test(w)));
  t.ok('gel on diving armour warned', on('Diving Armor', [gel()]).some(w => /diving/.test(w)));
  t.ok('gel on hardened armour warned', on('Light Military Armor', [gel()], { hardened: true }).some(w => /hardened/.test(w)));
  t.eq('installWarnings: only what the new mod adds', ArmorMods.installWarnings(jacket([fireRes(6)]), gel()), []);
  t.is('…a second gel set is new', ArmorMods.installWarnings(jacket([gel()]), gel()).length, 1);
  t.eq('…nothing for a weapon host (its own rules)', ArmorMods.installWarnings({ type: 'firearm', system: {} }, gel()), []);

  /* ── What the wearer gets ─────────────────────────────────────────────────── */
  const coat = { name: 'Lined Coat', type: 'armor', system: { ballistic: 4, impact: 2 } };
  const helmet = { name: 'Military Helmet', type: 'armor', system: { hardened: true, ballistic: 2, impact: 3 } };
  t.is('a gel-packed jacket under a coat: warned — nothing layers with it', ArmorMods.wornWarnings([jacket([gel()]), coat]).length, 1);
  t.eq('…a hardened helmet on hardened armour is not layering (SR3 p.285): no warning',
    ArmorMods.wornWarnings([{ name: 'Light Military Armor', system: { hardened: true } }, helmet]), []);
  t.eq('…two plain body pieces: the ordinary layering rules, no warning here', ArmorMods.wornWarnings([jacket(), coat]), []);
  t.is('gel packs: +2 Knockdown TN (CC p.54)', ArmorMods.knockdownTN([coat, jacket([gel()])]), 2);
  t.is('…none: 0', ArmorMods.knockdownTN([coat]), 0);
  const prot = ArmorMods.protections([jacket([fireRes(2)]), { name: 'Coat', system: { installed: [fireRes(1), insul(2, '-1')] } }]);
  t.eq('protections add across what is worn: fire 3 (jacket and coat), cold 2',
    prot.map(p => [p.target, p.value, p.sources.join('+')]), [['resistFire', 3, 'Armor Jacket+Coat'], ['resistCold', 2, 'Coat']]);
  t.is('Thermal Dampening worn is never above +8', ArmorMods.protections([{ name: 'Suit', system: { installed: [rated('TD', 'thermalMasking', 10)] } }])[0].value, THERMAL_MAX);

  /* ── The readers ──────────────────────────────────────────────────────────── */
  t.is('encumbrance weighs armour with its mods: gel jacket 2.5 kg (SR3 p.274 load, CC p.53)', CarriedLoad.itemWeight(jacket([gel()])), 2.5);
  const worn = { id: 'j', ...jacket([gel()]) };
  t.is('the Concealment view reads armour with its mods: gel jacket 3', Concealment.rows([worn], { wornIds: ['j'] })[0]?.conceal, 3);
  const pool = SR3EActor.layeredArmor([{ name: 'gel jacket', ballistic: 5, impact: 3, poolBallistic: 7, poolImpact: 4 }], 3);
  t.eq('Combat Pool reads the gel figures (7 over Quickness 3 = 4 → 2 dice); protection stays 5/3',
    [pool.combatPoolPenalty, pool.ballistic, pool.impact], [2, 5, 3]);
  t.is('…a piece without pool figures reads its own ratings, as before (jacket 5/3, Q3: 1 die)',
    SR3EActor.layeredArmor([{ name: 'jacket', ballistic: 5, impact: 3 }], 3).combatPoolPenalty, 1);

  const actor = read('scripts/documents/SR3EActor.js');
  t.ok('the soak card announces a hardened deflection with the unaugmented Power (CC p.51), for people as well as vehicles',
    /this\.type !== 'vehicle' && !payload\.noArmor\)[\s\S]{0,600}ArmorMods\.hardenedRating\(worn[\s\S]{0,600}VehicleArmor\.deflects\(hardPower, hard\)[\s\S]{0,200}Deflected \(hardened\)/.test(actor));
  t.ok('…at half against APDS / anti-vehicle (CC p.51)', /armorPiercing: ammoRules\.armorEffect === 'apds' \|\| ammoRules\.armorEffect === 'antiVehicle'/.test(actor));
  t.ok('…and it never applies anything: it only adds to the note', !/hardenedRating[\s\S]{0,800}(ballistic|impact|defaultArmor)\s*=\s*0/.test(actor));
  t.ok('the dodge path carries the unaugmented Power to the soak', /hardenedPower:\s+state\.damageBase\?\.hardenedPower,\s*\/\/ The soak compares/.test(actor));
  t.ok('a personal target gets the unaugmented Power too', /\} else if \(damageBase\) \{\s*\/\/ Worn hardened armour[\s\S]{0,200}VehicleArmor\.unaugmentedPower/.test(read('scripts/documents/SR3EItem.js')));
  t.ok('Combat Pool penalty: worn pieces carry the gel pool figures', /poolBallistic: ArmorMods\.poolRatings\(i\)\.ballistic, poolImpact: ArmorMods\.poolRatings\(i\)\.impact/.test(actor));
  t.ok('Knockdown: +2 for gel-packed armour', /const kdGel\s+= ArmorMods\.knockdownTN\(SR3EActor\.wornArmorItems\(target\)\)/.test(actor));
  t.ok('armorRatings reads each piece through ArmorMods.ratings (gel clothing 1/1)', /static armorRatings\(actor\)[\s\S]{0,800}name: i\.name, \.\.\.ArmorMods\.ratings\(i\)/.test(actor));
  t.ok('ArmorData declares hardened', /hardened:\s+new BooleanField\(\{ initial: false \}\)/.test(read('scripts/data/ItemDataModels.js')));

  /* ── What the shipped mods change — the table, the packs, the migration ──────── */
  t.eq('an owned "Fire Resistance (Armor) [3]" is filled per point', ModEffects.fillDelta({ type: 'gear', name: 'Fire Resistance (Armor) [3]', system: { modifiers: [] } }),
    { 'system.modifiers': [{ target: 'resistFire', value: 1, perRating: true }] });
  t.is('…never over a GM\'s own changes', ModEffects.fillDelta({ type: 'gear', name: 'Fire Resistance (Armor)', system: { modifiers: [{ target: 'resistFire', value: 2 }] } }), null);
  t.eq('military armour is hardened (CC p.51)', ModEffects.fillDelta({ type: 'armor', name: 'Heavy Military Armor', system: { hardened: false } }), { 'system.hardened': true });
  t.is('…an armour jacket is not', ModEffects.fillDelta({ type: 'armor', name: 'Armor Jacket', system: {} }), null);
  t.eq('Gas Vent from the pack: RC = its level, 1-4 (SR3 p.282, CC p.35)', [1, 2, 3, 4].map(r => ItemMods.value({ system: { rating: r, modifiers: MOD_EFFECTS['gear|Gas Vent'] } }, 'rc')), [1, 2, 3, 4]);
  const shipped = [];
  for (const pack of ['sr3e-sr3-gear', 'sr3e-cc-gear', 'sr3e-mm-gear', 'sr3e-cc-armor', 'sr3e-sr3-armor']) {
    for (const [k, d] of readSourceDir(new URL(`../packs-src/${pack}/`, import.meta.url).pathname)) if (/^!items!/.test(k)) shipped.push(d);
  }
  const unfilled = shipped.filter(d => ModEffects.fillDelta(d)).map(d => d.name);
  t.eq('every pack entry the table names ships filled (tools/fill-mod-effects.mjs)', unfilled, []);
  t.ok('…and every table key names something that ships', Object.keys(MOD_EFFECTS).every(k => shipped.some(d => ModEffects.key(d) === k)));
  t.ok('the 0.9.0 migration fills owned copies from the same table', /fixItem: item => ModEffects\.fillDelta\(item\)/.test(read('scripts/SR3EMigrations.js')));
}
