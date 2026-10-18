/**
 * Pack data corrected against the books in the 0.7.0 rules check — and the migration for owned copies.
 *
 * Two halves, both asserted here:
 *   1. the SHIPPED pack values (`packs-src/`, the source of truth) are the book's;
 *   2. `PackFixes070` (the 0.7.0 migration's logic) brings a copy still holding the OLD shipped value to the
 *      book's, and leaves a GM-edited value, a different item of the same name, and an already-correct one alone.
 *
 * Book rows (SR3 core): melee p.275 · bows and crossbows p.276 · Firing Mode Table p.117 · spells pp.193, 197 ·
 * vehicles pp.309-311 · drones p.312 · DocWagon Paramedic, Mr. Johnson's Little Black Book p.65 ("medkit 5").
 *
 * ⚠ Calls go through `PackFixes070.x(…)`, never a destructured copy, so the mutants can bite.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PackFixes070 } from '../scripts/data/pack-corrections-0-7-0.mjs';
import { splitImagingScopes } from '../tools/build-default-gear.mjs';

export const name = 'pack-corrections-070';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC = join(ROOT, 'packs-src');

/** The document in `pack` whose file name contains `.id.json`. */
function load(pack, id) {
  const dir = join(SRC, pack);
  const f = readdirSync(dir).find(n => n.endsWith(`.${id}.json`));
  if (!f) throw new Error(`${pack}: no file for ${id}`);
  return JSON.parse(readFileSync(join(dir, f), 'utf8'));
}
const sys = (pack, id) => load(pack, id).doc.system;

export async function run(t) {
  /* ═══ 1. The shipped pack values ═══════════════════════════════════════════════════ */
  const melee = id => sys('sr3e-sr3-melee', id);
  t.is('Sap is (STR+2)M Stun (SR3 p.275)', melee('sr3e-melee-0074').damage, '(STR+2)M Stun');
  t.is('Monofilament Whip has Reach 2 (SR3 p.275)', melee('sr3e-melee-0092').reach, '2');
  t.is('Shock Glove\'s damage code is the parseable (STR-1)M Stun (SR3 p.275)', melee('sr3e-melee-0109').damage, '(STR-1)M Stun');
  t.ok('…and its notes carry the book\'s extra +7S Stun, which the one-code roller cannot', /\+7S Stun/.test(melee('sr3e-melee-0109').notes));
  t.is('Combat Axe is a Pole Arms/Staffs weapon: category POL', melee('sr3e-melee-0010').category, 'POL');
  t.is('…with the pole-arm skill the pack\'s Pole Arm uses', melee('sr3e-melee-0010').skill, melee('sr3e-melee-0069').skill);
  t.is('Thrusting Point: Concealability 12', melee('sr3e-melee-0011').concealability, '12');
  t.is('…Reach 0', melee('sr3e-melee-0011').reach, '0');
  t.is('…category POL (a Combat Axe attachment)', melee('sr3e-melee-0011').category, 'POL');
  t.is('…skill Pole Arms/Staff, not the non-SR3 "Armed Combat"', melee('sr3e-melee-0011').skill, 'Pole Arms/Staff');
  t.is('…damage unchanged (STR+2)L', melee('sr3e-melee-0011').damage, '(STR+2)L');

  // Standard Bow: Concealability 2, damage (Str Min + 2)M, cost 100 x Str Min — all twelve.
  for (let n = 1; n <= 12; n++) {
    const id = `sr3e-projectile-${String(n).padStart(4, '0')}`;
    const s = sys('sr3e-sr3-projectiles', id);
    t.is(`bow ${n}: Str Min ${n}`, s.strMin, n);
    t.is(`bow ${n}: damage (Str Min + 2)M`, s.damage, `${n + 2}M`);
    t.is(`bow ${n}: Concealability 2`, s.concealability, '2');
    t.is(`bow ${n}: cost 100 x Str Min`, s.cost, 100 * n);
  }
  const xb = id => sys('sr3e-sr3-projectiles', id);
  t.is('Light Crossbow 6L', xb('sr3e-projectile-0024').damage, '6L');
  t.is('Medium Crossbow 6M', xb('sr3e-projectile-0025').damage, '6M');
  t.is('Heavy Crossbow 6S (SR3 p.276)', xb('sr3e-projectile-0027').damage, '6S');

  t.is('Detect Magic: Target is the Detection table token DT, as the other Detection spells', sys('sr3e-sr3-spells', 'sr3e-spell-0033').target, 'DT');
  t.is('Fling: Target "See text" (SR3 p.197)', sys('sr3e-sr3-spells', 'sr3e-spell-0182').target, 'See text');

  // The Firing Mode Table (SR3 p.117) wins over the Firearms tables.
  const fm = {
    'sr3e-firearm-0642': ['Taser', 'SS'],
    'sr3e-firearm-0077': ['Ares Viper Slivergun (heavy pistol: SS or SA)', 'SA'],
    'sr3e-firearm-0656': ['AK-97 SMG/Carbine (SMG: SA and BF)', 'SA/BF'],
    'sr3e-firearm-0683': ['HK227', 'SA/BF'],
    'sr3e-firearm-0684': ['HK227-S', 'SA/BF'],
    'sr3e-firearm-0688': ['Ingram Smartgun', 'SA/BF'],
    'sr3e-firearm-0704': ['Uzi III', 'SA/BF'],
    'sr3e-firearm-1134': ['Ingram Valiant (LMG: full-auto)', 'FA'],
    'sr3e-firearm-1147': ['Ultimax MMG', 'FA'],
    'sr3e-firearm-1156': ['RPK HMG', 'FA'],
  };
  for (const [id, [label, mode]] of Object.entries(fm)) t.is(`${label}: ${mode}`, sys('sr3e-sr3-firearms', id).mode, mode);

  // Firearm Recoil Compensation: the Firearms tables RC column, SR3 pp.278-279. recoilMod is the figure outside
  // the parentheses; the parenthesised "integral accessory" figure stays in the accessories text.
  const rc = { 'sr3e-firearm-0683': 2, 'sr3e-firearm-0688': 2, 'sr3e-firearm-0966': 2, 'sr3e-firearm-0772': 2, 'sr3e-firearm-1134': 3 };
  for (const [id, n] of Object.entries(rc)) t.is(`${load('sr3e-sr3-firearms', id).doc.name}: RC ${n}`, sys('sr3e-sr3-firearms', id).recoilMod, n);
  t.ok('FN HAR: the stock gives no RC (SR3 p.277 "Neither affect recoil") - its text lists only the gas vent',
    !/stock/i.test(sys('sr3e-sr3-firearms', 'sr3e-firearm-0772').accessories) && /Gas Vent II\(2RC\)/.test(sys('sr3e-sr3-firearms', 'sr3e-firearm-0772').accessories));
  t.is('Ultimax MMG: RC (6) with its tripod, recorded in the accessories', sys('sr3e-sr3-firearms', 'sr3e-firearm-1147').accessories, 'Tripod(6RC)');
  t.ok('RPK HMG: the (6) tripod is in the accessories', /6RC/.test(sys('sr3e-sr3-firearms', 'sr3e-firearm-1156').accessories));
  t.ok('...and a (6) / (1) weapon has no recoilMod: the figure counts only with the accessory',
    ['sr3e-firearm-1147', 'sr3e-firearm-1156', 'sr3e-firearm-0656', 'sr3e-firearm-0684'].every(id => !sys('sr3e-sr3-firearms', id).recoilMod));

  // Imaging scopes: SR3 p.282 lists Low-Light and Thermographic as two items (Top, Concealability -2, 3/36 hrs,
  // 1,500 nuyen, Street Index .8). No book prints a fixed-price combined scope (SR3 p.280: "add together the
  // costs of their components"; Cannon Companion p.34 likewise), so the untyped item is replaced, not kept.
  const gearDir = join(SRC, 'sr3e-sr3-gear');
  const scopes = readdirSync(gearDir).filter(f => /^imaging-scope/.test(f)).map(f => JSON.parse(readFileSync(join(gearDir, f), 'utf8')).doc);
  const lowLight = scopes.find(d => d.name === 'Imaging Scope, Low-Light');
  const thermo = scopes.find(d => d.name === 'Imaging Scope, Thermographic');
  for (const [label, d] of [['Low-Light', lowLight], ['Thermographic', thermo]]) {
    t.ok(`imaging scope, ${label}: shipped`, !!d);
    t.is(`...cost 1,500 (SR3 p.282)`, d?.system.cost, 1500);
    t.is('...Concealability (-2)', d?.system.concealability, '(-2)');
    t.is('...Availability 3/36hrs, Street Index .8, weight .25', `${d?.system.availability} ${d?.system.streetIndex} ${d?.system.weight}`, '3/36hrs .8 0.25');
    t.is('...book page sr3.282', d?.system.bookPage, 'sr3.282');
    t.ok('...Top mount in the description', /Top/.test(d?.system.description));
    t.is('...unrated (a rating belongs to the magnification scopes)', d?.system.rating, null);
  }
  t.ok('...two different documents', lowLight?._id !== thermo?._id);
  t.eq('the untyped "Imaging Scope" at Rating -, 1,500 is gone; the three magnification scopes stay',
    scopes.filter(d => d.name === 'Imaging Scope').map(d => d.system.rating).sort(), [1, 2, 3]);
  const gen = splitImagingScopes([
    { row: { Name: 'Imaging Scope', Rating: '-', BookPage: 'sr3.282', Cost: '1500' }, category: 'x' },
    { row: { Name: 'Imaging Scope', Rating: '2', BookPage: 'sr3.282', Cost: '800' }, category: 'x' },
    { row: { Name: 'Imaging Scope', Rating: '-', BookPage: 'cc.28', Cost: '1500' }, category: 'x' },
  ]);
  t.eq('the generator splits only the untyped SR3 row, so a re-run reproduces the pack',
    gen.map(g => g.row.Name), ['Imaging Scope, Low-Light', 'Imaging Scope, Thermographic', 'Imaging Scope', 'Imaging Scope']);
  t.is('an old untyped Imaging Scope in a world is not touched (its kind cannot be known)',
    PackFixes070.fixItem({ type: 'gear', name: 'Imaging Scope', system: { rating: null, cost: 1500, concealability: '(-2)', bookPage: 'sr3.282' } }), null);

  const att = (pack, id) => load(pack, id).doc.system.attributes;
  t.is('Hughes WK-2 Stallion: Cargo 72 (SR3 p.310)', att('sr3e-sr3-vehicles', 'sr3e-vehicle-0178').cargo.value, 72);
  t.is('…base too', att('sr3e-sr3-vehicles', 'sr3e-vehicle-0178').cargo.base, 72);
  t.is('Northrup Wasp: Load 68 (SR3 p.311)', att('sr3e-sr3-vehicles', 'sr3e-vehicle-0156').load.value, 68);
  t.is('…base too', att('sr3e-sr3-vehicles', 'sr3e-vehicle-0156').load.base, 68);

  const pass = load('sr3e-sr3-vehicles', 'sr3e-vehicle-0300');
  const cargo = load('sr3e-sr3-vehicles', 'sr3e-vehicle-0143');
  t.is('the G12A passenger variant exists, keyed by its id', pass._key, '!actors!sr3e-vehicle-0300');
  t.is('…named as the Cessna\'s variants are', pass.doc.name, 'Chrysler-Nissan G12A(passenger)');
  t.is('…57,000¥ (SR3 p.309)', pass.doc.system.cost, 57000);
  t.is('…Cargo 12', pass.doc.system.attributes.cargo.value, 12);
  t.is('…Load 250', pass.doc.system.attributes.load.value, 250);
  t.is('…10 bucket seats (passenger)', pass.doc.system.seating, 10);
  for (const k of ['handling', 'speed', 'accel', 'body', 'armor', 'sig', 'autonav', 'pilot', 'sensor']) {
    t.eq(`…${k} is the cargo variant's (the book rows agree)`, pass.doc.system.attributes[k], cargo.doc.system.attributes[k]);
  }
  t.is('…and the cargo variant is untouched: 62,000¥', cargo.doc.system.cost, 62000);

  const drone = sys('sr3e-sr3-drones', 'sr3e-drone-0045');
  t.is('Generic Surveillance Drone: 8,125¥ (SR3 p.312)', drone.cost, 8125);
  t.is('…Street Index 1', drone.streetIndex, 1);
  const dalm = load('sr3e-sr3-drones', 'sr3e-drone-0043');
  t.is('the book\'s Dalmatian stays', dalm.doc.name, 'Cyberspace Designs Dalmatian');
  const droneFiles = readdirSync(join(SRC, 'sr3e-sr3-drones'));
  t.ok('the misspelt "Dalmation" duplicate is gone from the pack', !droneFiles.some(f => /dalmation|drone-0037/.test(f)));
  t.is('…leaving one Dalmatian', droneFiles.filter(f => /dalmat/.test(f)).length, 1);

  // Nothing left in the source tree names the deleted document.
  const stale = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (['node_modules', '.git', 'packs', 'audit', 'guides', '.claude', 'dist'].includes(e.name)) continue;
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(js|mjs|json)$/.test(e.name) && !/pack-corrections-070\.test\.mjs$|pack-corrections-0-7-0\.mjs$/.test(e.name)) {
        if (/sr3e-drone-0037/.test(readFileSync(p, 'utf8'))) stale.push(p);
      }
    }
  };
  for (const d of ['packs-src', 'scripts', 'tests', 'tools']) if (existsSync(join(ROOT, d))) walk(join(ROOT, d));
  t.eq('nothing in packs-src, scripts, tests or tools still points at sr3e-drone-0037', stale, []);

  // DocWagon Paramedic: a Rating 5 medkit, copied from the M&M Rating 5 medkit.
  const dw = load('sr3e-mr-johnsons-contacts', 'evde7uJkZD9DBlpe');
  const medkits = Object.values(dw.embedded).filter(i => /medkit/i.test(i.name));
  t.is('the DocWagon Paramedic carries one medkit', medkits.length, 1);
  const mk = medkits[0];
  const mm5 = load('sr3e-mm-medical', 'be6b0782420f102a').doc.system;
  t.is('…Rating 5 (MJLBB p.65 "medkit 5")', String(mk.system.rating), '5');
  t.is('…at the M&M Rating 5 price', mk.system.cost, mm5.cost);
  t.is('…and availability', mk.system.availability, mm5.availability);
  t.is('…and book page', mk.system.bookPage, mm5.bookPage);
  t.ok('…its own key and id kept (the embedded item was edited, not replaced)',
    Object.keys(dw.embedded).some(k => k.endsWith(`.${mk._id}`)) && dw.doc.items.includes(mk._id));
  const macro = readFileSync(join(ROOT, 'scripts/macros/populate-mr-johnsons-contacts.js'), 'utf8');
  const dwBlock = macro.slice(macro.indexOf("baseActor('DocWagon Paramedic'"), macro.indexOf("baseActor('Elite Black Clinic Cybersurgeon'"));
  t.ok('the contact generator asks for a Rating 5 medkit, not five medkits', /gear\('Medkit \[Rating 5\]'\)/.test(dwBlock) && !/gear\('Medkit', 5\)/.test(dwBlock));

  /* ═══ 2. The migration: old shipped value → the book's ═════════════════════════════ */
  const it = (type, name, system, extra = {}) => ({ type, name, system, ...extra });
  const fx = (item) => PackFixes070.fixItem(item);

  t.eq('Sap (STR+1)M → (STR+2)M', fx(it('melee', 'Sap', { damage: '(STR+1)M Stun' })), { 'system.damage': '(STR+2)M Stun' });
  t.is('a GM-edited Sap is left alone', fx(it('melee', 'Sap', { damage: '(STR+3)M Stun' })), null);
  t.is('an already-correct Sap is left alone (idempotent)', fx(it('melee', 'Sap', { damage: '(STR+2)M Stun' })), null);
  t.eq('Monofilament Whip Reach 1 → 2', fx(it('melee', 'Monofilament Whip', { reach: '1' })), { 'system.reach': '2' });
  t.is('…a house-ruled Reach 3 stays', fx(it('melee', 'Monofilament Whip', { reach: '3' })), null);
  const glove = fx(it('melee', 'Shock Glove', { damage: '7S Stun', notes: '' }));
  t.is('Shock Glove 7S Stun → (STR-1)M Stun', glove['system.damage'], '(STR-1)M Stun');
  t.ok('…with the +7S noted', /\+7S Stun/.test(glove['system.notes']));
  t.is('…a GM\'s own notes are not overwritten', fx(it('melee', 'Shock Glove', { damage: '7S Stun', notes: 'mine' }))['system.notes'], undefined);
  t.eq('Combat Axe EDG → POL, skill to Pole Arms/Staff',
    fx(it('melee', 'Combat Axe', { damage: '(STR)S', category: 'EDG', skill: 'Edged Weapons' })),
    { 'system.category': 'POL', 'system.skill': 'Pole Arms/Staff' });
  t.is('…a GM who recategorised it keeps their choice', fx(it('melee', 'Combat Axe', { damage: '(STR)S', category: 'CLB', skill: 'Clubs' })), null);
  t.is('…a different "Combat Axe" (other damage) is not matched', fx(it('melee', 'Combat Axe', { damage: '(STR+2)S', category: 'EDG', skill: 'Edged Weapons' })), null);
  t.eq('Thrusting Point → Concealability 12, Reach 0, POL',
    fx(it('melee', 'Combat Axe Thrusting Point', { category: 'other', skill: 'Armed Combat', concealability: '-', reach: '-' })),
    { 'system.category': 'POL', 'system.skill': 'Pole Arms/Staff', 'system.concealability': '12', 'system.reach': '0' });

  // Bows: the name is shared by twelve — the gate picks the right two.
  t.eq('the Str Min 3 bow 4M → 5M', fx(it('projectile', 'Standard Bow', { strMin: 3, cost: 300, damage: '4M' })), { 'system.damage': '5M' });
  t.is('…the Str Min 2 bow (also 4M) is NOT changed', fx(it('projectile', 'Standard Bow', { strMin: 2, cost: 200, damage: '4M' })), null);
  t.is('…nor a Str Min 4 bow', fx(it('projectile', 'Standard Bow', { strMin: 4, cost: 400, damage: '6M' })), null);
  t.eq('the Str Min 10 bow: Concealability 2, Str Min 10',
    fx(it('projectile', 'Standard Bow', { concealability: '10', strMin: 1, damage: '12M', cost: 1000 })),
    { 'system.concealability': '2', 'system.strMin': 10 });
  t.is('…the corrected Str Min 10 bow is left alone', fx(it('projectile', 'Standard Bow', { concealability: '2', strMin: 10, damage: '12M', cost: 1000 })), null);
  t.eq('Heavy Crossbow 8S → 6S', fx(it('projectile', 'Heavy Crossbow', { damage: '8S' })), { 'system.damage': '6S' });
  t.is('…a house-ruled 7S stays', fx(it('projectile', 'Heavy Crossbow', { damage: '7S' })), null);

  t.eq('Detect Magic 6(4) → DT', fx(it('spell', 'Detect Magic', { target: '6(4)' })), { 'system.target': 'DT' });
  t.eq('Fling 4(RC) → See text', fx(it('spell', 'Fling', { target: '4(RC)' })), { 'system.target': 'See text' });
  t.is('…an edited Fling target stays', fx(it('spell', 'Fling', { target: '6' })), null);

  const modes = [
    ['Defiance Super Shock', 'SA', 'SS'], ['Ares Viper Slivergun', 'SA/BF', 'SA'], ['AK-97 SMG/Carbine', 'SA/BF/FA', 'SA/BF'],
    ['Heckler & Koch HK227', 'SA/BF/FA', 'SA/BF'], ['Ingram Smartgun Mod. 20t', 'BF/FA', 'SA/BF'], ['Uzi III', 'BF', 'SA/BF'],
    ['Ingram Valiant', 'BF/FA', 'FA'],
  ];
  for (const [n, from, to] of modes) {
    t.eq(`${n}: ${from} → ${to}`, fx(it('firearm', n, { mode: from })), { 'system.mode': to });
    t.is(`${n}: a mode the GM changed (SS/BF) stays`, fx(it('firearm', n, { mode: 'XX' })), null);
    t.is(`${n}: already ${to} → nothing`, fx(it('firearm', n, { mode: to })), null);
  }
  t.is('an item that is not a firearm with a firearm\'s name is skipped', fx(it('gear', 'Uzi III', { mode: 'BF' })), null);

  // Recoil Compensation: only a copy still at the shipped 0/blank, and only the SR3 core item.
  const rcFix = (name, rm, page = 'sr3.278', extra = {}) => fx(it('firearm', name, { recoilMod: rm, mode: 'zz', bookPage: page, ...extra }));
  for (const [n, v, page] of [['Heckler & Koch HK227', 2, 'sr3.278'], ['Ingram Smartgun Mod. 20t', 2, 'sr3.278'], ['Ranger Arms SM-3', 2, 'sr3.278'], ['Ingram Valiant', 3, 'sr3.279']]) {
    t.eq(`${n}: shipped 0 -> RC ${v}`, rcFix(n, 0, page), { 'system.recoilMod': v });
    t.eq(`${n}: shipped blank -> RC ${v}`, rcFix(n, undefined, page), { 'system.recoilMod': v });
    t.is(`${n}: a GM-set RC stays`, rcFix(n, 5, page), null);
    t.is(`${n}: already correct -> nothing`, rcFix(n, v, page), null);
    t.is(`${n}: a same-named item from another book is left alone`, rcFix(n, 0, 'cc.99'), null);
  }
  t.eq('a weapon owing both fixes gets both (Valiant mode + RC)', fx(it('firearm', 'Ingram Valiant', { mode: 'BF/FA', recoilMod: 0, bookPage: 'sr3.279' })),
    { 'system.mode': 'FA', 'system.recoilMod': 3 });
  t.eq('FN HAR: RC 2 and the stock RC removed from the text',
    rcFix('FN HAR', 0, 'sr3.278', { accessories: 'Laser Sight, Gas Vent II(2RC), Fold Stock(1RC)' }),
    { 'system.recoilMod': 2, 'system.accessories': 'Laser Sight, Gas Vent II(2RC)' });
  t.is('...a GM-edited accessories text stays', rcFix('FN HAR', 2, 'sr3.278', { accessories: 'Laser Sight, my stock' }), null);
  t.eq('Ultimax MMG: "None" -> Tripod(6RC)', rcFix('Ultimax MMG', 0, 'sr3.279', { accessories: 'None' }), { 'system.accessories': 'Tripod(6RC)' });

  // The DocWagon medkit: only the paramedic's own Rating 3 core medkit.
  const medkit = (parent) => it('medical', 'Medkit', { rating: '3', cost: 200, bookPage: 'sr3.304', weight: '3', availability: '2/24hrs' }, { parent });
  const m5 = fx(medkit({ name: 'DocWagon Paramedic' }));
  t.is('the Paramedic\'s Rating 3 medkit becomes Rating 5', m5['system.rating'], '5');
  t.is('…at 280¥', m5['system.cost'], 280);
  t.is('…named as the M&M item', m5.name, 'Medkit [Rating 5]');
  t.ok('…also found by its compendium source when the actor was renamed',
    !!fx(medkit({ name: 'Doc', _stats: { compendiumSource: 'Compendium.The2ndChumming3e.sr3e-mr-johnsons-contacts.Actor.evde7uJkZD9DBlpe' } })));
  t.is('a runner\'s own core medkit (any other actor) is NOT touched', fx(medkit({ name: 'Mox' })), null);
  t.is('a world medkit with no owner is NOT touched', fx(medkit(null)), null);
  t.is('a medkit the GM already changed on the Paramedic is left alone',
    fx(it('medical', 'Medkit', { rating: '4', cost: 200, bookPage: 'sr3.304' }, { parent: { name: 'DocWagon Paramedic' } })), null);

  /* ── vehicles and drones: actors ── */
  const veh = (name, attrs, sys2 = {}) => ({ type: 'vehicle', name, system: { ...sys2, attributes: attrs } });
  const fa = (a) => PackFixes070.fixActor(a);
  t.eq('Hughes WK-2 Cargo 70 → 72 (value and base)', fa(veh('Hughes WK-2', { cargo: { value: 70, base: 70 } })),
    { 'system.attributes.cargo.value': 72, 'system.attributes.cargo.base': 72 });
  t.eq('…only the part still at 70 (a GM-raised value stays)', fa(veh('Hughes WK-2', { cargo: { value: 90, base: 70 } })),
    { 'system.attributes.cargo.base': 72 });
  t.is('…an already-72 Stallion is left alone', fa(veh('Hughes WK-2', { cargo: { value: 72, base: 72 } })), null);
  t.eq('Northrup Wasp Load 72 → 68', fa(veh('Northrup Wasp PRC-42B', { load: { value: 72, base: 72 } })),
    { 'system.attributes.load.value': 68, 'system.attributes.load.base': 68 });
  t.eq('Generic Surveillance Drone: 8,125¥, Street Index 1', fa(veh('Generic Surv. Drone VTOL', {}, { cost: 6250, streetIndex: 0.75 })),
    { 'system.cost': 8125, 'system.streetIndex': 1 });
  const dalmation = fa(veh('Cyberspace Designs Dalmation',
    { speed: { value: 108, base: 108 }, sig: { value: 5, base: 5 } }, { cost: 15800, streetIndex: 0.75 }));
  t.is('a world "Dalmation" is renamed to the book\'s Dalmatian — never deleted', dalmation?.name, 'Cyberspace Designs Dalmatian');
  t.is('…cost 16,000', dalmation?.['system.cost'], 16000);
  t.is('…Speed 105', dalmation?.['system.attributes.speed.value'], 105);
  t.is('…Signature 6', dalmation?.['system.attributes.sig.value'], 6);
  t.is('…Street Index 1', dalmation?.['system.streetIndex'], 1);
  t.eq('…a GM-edited Dalmation keeps its own numbers but still takes the right name',
    fa(veh('Cyberspace Designs Dalmation', { speed: { value: 120, base: 120 }, sig: { value: 7, base: 7 } }, { cost: 20000, streetIndex: 2 })),
    { name: 'Cyberspace Designs Dalmatian' });
  t.is('a character is never touched by the vehicle pass', fa({ type: 'character', name: 'Hughes WK-2', system: { attributes: { cargo: { value: 70 } } } }), null);

  /* ── the migration is registered and wired ── */
  const migSrc = readFileSync(join(ROOT, 'scripts/SR3EMigrations.js'), 'utf8');
  const block = migSrc.slice(migSrc.indexOf("version: '0.7.0'"));
  t.ok('a 0.7.0 migration exists', block.length > 0);
  t.ok('…running the pack corrections on items', /fixItem:\s*PackFixes070\.fixItem/.test(block));
  t.ok('…and on vehicle/drone actors', /fixActor:\s*PackFixes070\.fixActor/.test(block));
}
