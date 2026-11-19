/**
 * 🖨 Printable character sheet · TODO 302.
 *
 * The snapshot and the HTML are pure (`scripts/data/print-sheet.mjs`) and tested behaviourally. The header
 * control and the print window are sheet code, not importable without Foundry, so those are SOURCE-LEVEL
 * checks, backed by the TESTING.md step in a live world.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PrintSheet, esc, attrText, track } from '../scripts/data/print-sheet.mjs';

export const name = 'print-sheet';
const read = rel => readFileSync(fileURLToPath(new URL(`../${rel}`, import.meta.url)), 'utf8');

const item = (type, name, system = {}) => ({ type, name, system });

const actor = {
  name: 'Kat <Razor>', type: 'character',
  system: {
    metatype: 'elf', gender: 'F', age: '24',
    attributes: {
      body: { value: 4, base: 3 }, quickness: { value: 6, base: 6 }, strength: { value: 3, base: 3 },
      charisma: { value: 5, base: 5 }, intelligence: { value: 5, base: 5 }, willpower: { value: 4, base: 4 },
      essence: { value: 4.35 }, magic: { value: 3, base: 6 }, reaction: { value: 7, base: 5 },
    },
    derived: { initiative: 7, initiativeDice: 2, combatPool: 7, spellPool: 4 },
    wounds: { stun: { value: 2, max: 10 }, physical: { value: 0, max: 10 }, overflow: { value: 0 } },
    karma: 3, totalKarma: 40, karmaPool: 2, nuyen: 1500, streetCred: 2,
    magicTradition: 'Hermetic', ledger: [{ delta: 5, reason: 'SECRET-LEDGER' }], notes: 'SECRET-NOTES', biography: 'SECRET-BIO',
  },
  items: [
    item('skill', 'Pistols', { rating: 5, linkedAttribute: 'quickness', skillType: 'active', specialisations: [{ name: 'Ares Predator', level: 2 }] }),
    item('skill', 'Elven', { rating: 4, skillType: 'language', linkedAttribute: 'intelligence' }),
    item('skill', 'Corp Politics', { rating: 3, skillType: 'knowledge', linkedAttribute: 'intelligence' }),
    item('firearm', 'Ares Predator', { damage: '9M', mode: 'SA', ammunition: '15(c)', category: 'HPist' }),
    item('melee', 'Katana', { damage: '(STR+3)M', reach: 1 }),
    item('armor', 'Armor Jacket', { ballistic: 5, impact: 3, worn: true }),
    item('cyberware', 'Wired Reflexes', { rating: 1, essenceCost: 2, grade: 'Standard' }),
    item('bioware', 'Muscle Toner', { rating: 1, bioIndex: 0.4 }),
    item('gear', 'Medkit', { rating: 3, quantity: 1 }),
    item('spell', 'Manabolt', { force: 5, category: 'Combat', type: 'Mana', range: 'LOS', duration: 'Instant', drain: '(F/2)S' }),
    item('adeptpower', 'Improved Reflexes', { hasLevels: true, level: 2, powerCost: 1.5 }),
    item('contact', 'Fixer Joe', { archetype: 'Fixer', loyalty: 2, connection: 3 }),
  ],
};
const vehicle = {
  name: 'Roto-drone', type: 'vehicle',
  system: { vehicleType: 'drone', damage: { value: 1 }, attributes: { handling: { value: 4 }, handlingOffRoad: { value: 4 },
    speed: { value: 120 }, body: { value: 2 }, armor: { value: 0 }, pilot: { value: 2 }, sensor: { value: 2 } } },
  items: [item('vehicleweapon', 'Ingram Smartgun', { damage: '7M', mode: 'BF/FA' }), item('vehiclemod', 'Smart link')],
};

export async function run(t) {
  /* ── helpers ── */
  t.is('escapes markup', esc('<b>"x" & \'y\'</b>'), '&lt;b&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/b&gt;');
  t.is('null escapes to empty', esc(null), '');
  t.is('attribute at base', attrText({ value: 5, base: 5 }), '5');
  t.is('augmented attribute shows the base', attrText({ value: 7, base: 5 }), '7 (5)');
  t.is('three boxes, one filled', track(1, 3), '<span class="box on"></span><span class="box"></span><span class="box"></span>');

  /* ── snapshot ── */
  const s = PrintSheet.snapshot(actor, [vehicle]);
  t.is('metatype capitalised', s.metatype, 'Elf');
  t.ok('Body augmented', s.attributes.some(a => a.label === 'Body' && a.value === '4 (3)'));
  t.ok('Magic shown for the Awakened', s.attributes.some(a => a.label === 'Magic'));
  t.ok('initiative as score + dice', s.derived.some(d => d.label === 'Initiative' && d.value === '7 + 2D6'));
  t.ok('spell pool present', s.derived.some(d => d.label === 'Spell Pool' && d.value === 4));
  t.eq('karma totals', s.karma, { karma: 3, total: 40, pool: 2 });
  t.is('specialisation at rating + level', s.skills.find(k => k.name === 'Pistols').specs, 'Ares Predator 7');
  t.is('skills sorted by name', s.skills.map(k => k.name).join(','), 'Corp Politics,Elven,Pistols');
  t.is('firearm notes', s.weapons.find(w => w.name === 'Ares Predator').notes, 'SA · Ammo 15(c)');
  t.is('bioware shows its Bio Index', s.ware.find(w => w.name === 'Muscle Toner').cost, 0.4);
  t.is('adept power cost × level', s.powers[0].cost, 3);
  t.eq('contact', s.contacts[0], { name: 'Fixer Joe', archetype: 'Fixer', loyalty: 2, connection: 3 });
  t.is('one vehicle block', s.vehicles.length, 1);
  t.is('vehicle weapon', s.vehicles[0].weapons[0].name, 'Ingram Smartgun');
  t.ok('vehicle Speed', s.vehicles[0].stats.some(x => x.label === 'Speed' && x.value === '120'));

  const mundane = PrintSheet.snapshot({ name: 'Joe', type: 'npc', system: {}, items: [] });
  t.ok('no Magic row for the mundane', !mundane.attributes.some(a => a.label === 'Magic'));
  t.is('empty actor has no vehicles', mundane.vehicles.length, 0);
  t.ok('an empty actor renders', PrintSheet.render(mundane).includes('<h1>Joe</h1>'));

  /* ── render ── */
  const html = PrintSheet.render(s, { generated: 'Printed today' });
  t.ok('a full document', html.startsWith('<!doctype html>'));
  t.ok('the name is escaped', html.includes('Kat &lt;Razor&gt;') && !html.includes('Kat <Razor>'));
  t.ok('prints on load by default', html.includes('window.print()'));
  t.ok('no print script when asked', !PrintSheet.render(s, { autoPrint: false }).includes('<script'));
  for (const label of ['Active skills', 'Knowledge skills', 'Language skills', 'Weapons', 'Armour', 'Cyberware &amp; bioware',
    'Gear', 'Spells', 'Adept powers', 'Contacts', 'Vehicles &amp; drones', 'Roto-drone — Drone']) {
    t.ok(`section: ${label}`, html.includes(label));
  }
  t.ok('Karma ledger is left off (settled 2026-11-17)', !html.includes('SECRET-LEDGER'));
  t.ok('notes and biography are left off', !html.includes('SECRET-NOTES') && !html.includes('SECRET-BIO'));
  t.ok('empty sections are omitted', !PrintSheet.render(mundane).includes('<h2>Spells</h2>'));
  t.ok('print CSS', html.includes('@media print'));

  /* ── source level: the sheet ── */
  const src = read('scripts/sheets/SR3EActorSheet.js');
  t.ok('header control registered', /_getHeaderControls\(\)[^]*?action: 'printSheet'/.test(src));
  t.ok('action wired', src.includes('printSheet:              SR3EActorSheet._onPrintSheet'));
  t.ok('owners only', /_getHeaderControls\(\)[^]*?this\.actor\.isOwner/.test(src) && /_onPrintSheet\(\)[^]*?if \(!actor\.isOwner\) return/.test(src));
  t.ok('vehicles filtered by what this user can see', /_onPrintSheet\(\)[^]*?testUserPermission\(game\.user, 'OBSERVER'\)/.test(src));
  t.ok('popup-blocked fallback downloads', /_onPrintSheet\(\)[^]*?saveDataToFile/.test(src));
}
