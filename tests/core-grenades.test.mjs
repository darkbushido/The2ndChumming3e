/**
 * The SR3 core book's grenades ship in `sr3e-sr3-projectiles` — TODO 144.
 *
 * Source: the core rulebook, p.283, the Explosives Table ("Grenades"). The table below is an
 * INDEPENDENT transcription of the printed rows (extracted from the PDF's own content stream, one
 * text run per row), so the generator and the book are compared rather than the generator and
 * itself. Blast column, p.283, agrees with the Grenade Damage Table on p.119.
 *
 *   Grenade Type          Conceal Damage      Blast   Weight Avail.      Cost St.Index Legal
 *   Offensive (HE or AP)  6       10S         –1/m    .25    4/4 days    30¥  2        3–J
 *   Defensive (HE or AP)  6       10S         –1/.5m  .25    4/4 days    30¥  2        3–J
 *   Concussion            6       12M (Stun)  –1/m    .25    5/4 days    30¥  2        3–J
 *   Gas (Neuro-Stun VII)  5       Special     —       .25    8/4 days    60¥  2        3–J
 *   Smoke                 6       —           —       .25    3/24 hrs    30¥  2        5–J
 *   Smoke (IR)            6       —           —       .25    4/48 hrs    40¥  2        5–J
 *   Flash-Pak             12      Special     —       .2     3/36 hrs    250¥ 1        Legal
 *   Mini-grenade          8       by grenade  by grenade .1  +2/by grenade x2  +1     by grenade  (not shipped)
 */
import { readFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { SR3EItem } = await import('../scripts/documents/SR3EItem.js');
const { Blast } = await import('../scripts/data/blast.mjs');
const { CoreGrenades } = await import('../tools/build-core-grenades.mjs');

export const name = 'core-grenades';

const DIR = new URL('../packs-src/sr3e-sr3-projectiles/', import.meta.url);

// [name, conceal, damage, blast, weight, avail, cost, index, legal, ships]
const BOOK = [
  ['Offensive HE Grenade', '6', '10S', '-1/m',   '.25', '4/4 days', 30, '2', false, 'Offensive (HE or AP)'],
  ['Offensive AP Grenade', '6', '10S', '-1/m',   '.25', '4/4 days', 30, '2', false, 'Offensive (HE or AP)'],
  ['Defensive HE Grenade', '6', '10S', '-1/.5m', '.25', '4/4 days', 30, '2', false, 'Defensive (HE or AP)'],
  ['Defensive AP Grenade', '6', '10S', '-1/.5m', '.25', '4/4 days', 30, '2', false, 'Defensive (HE or AP)'],
  ['Concussion Grenade',   '6', '12M Stun', '-1/m', '.25', '5/4 days', 30, '2', false, 'Concussion'],
  ['Gas Grenade (Neuro-Stun VII)', '5', 'Special', '', '.25', '8/4 days', 60, '2', false, 'Gas (Neuro-Stun VII)'],
  ['Smoke Grenade',        '6', '--', '', '.25', '3/24 hrs', 30, '2', false, 'Smoke'],
  ['Smoke (IR) Grenade',   '6', '--', '', '.25', '4/48 hrs', 40, '2', false, 'Smoke (IR)'],
  ['Flash-Pak',           '12', 'Special', '', '.2', '3/36 hrs', 250, '1', true, 'Flash-Pak'],
];

export async function run(t) {
  const shipped = new Map();
  for (const f of readdirSync(DIR).filter(f => f.endsWith('.json'))) {
    const d = JSON.parse(readFileSync(new URL(f, DIR), 'utf8'));
    if (d.doc?.system?.bookPage === 'sr3.283') shipped.set(d.doc.name, { file: f, ...d });
  }
  t.is('nine rows ship (the Mini-grenade row is a modifier, not an item)', shipped.size, 9);

  for (const [n, conceal, damage, blast, weight, avail, cost, index, legal] of BOOK) {
    const d = shipped.get(n)?.doc;
    t.ok(`${n} ships`, !!d);
    if (!d) continue;
    const s = d.system;
    t.eq(`${n}: the printed row`, [d.type, s.category, s.concealability, s.damage, s.blast, s.weight, s.availability, s.cost, s.streetIndex, s.legal, s.bookPage],
      ['projectile', 'GR', conceal, damage, blast, weight, avail, cost, index, legal, 'sr3.283']);
    t.is(`${n}: rolled with Throwing Weapons (SR3 p.86)`, s.skill, 'Throwing Weapons');
    t.ok(`${n}: is an area weapon`, s.isAoE === true);
  }

  // The rows the flow depends on.
  const dmg = n => SR3EItem.parseDamageCode(shipped.get(n).doc.system.damage);
  t.eq('Offensive parses as 10S', dmg('Offensive HE Grenade'), { power: 10, level: 'S', isStun: false });
  t.eq('Concussion parses as 12M Stun', dmg('Concussion Grenade'), { power: 12, level: 'M', isStun: true });
  const rate = n => Blast.rate(shipped.get(n).doc.system.blast);
  t.is('Offensive loses 1 Power per metre', rate('Offensive AP Grenade'), 1);
  t.is('Defensive loses 1 per HALF metre — 2 per metre', rate('Defensive HE Grenade'), 2);
  t.is('…so 3 m from a Defensive is 10 − 6 = 4 (SR3 p.119)', Blast.power(10, 3, rate('Defensive HE Grenade')), 4);
  t.is('Concussion loses 1 per metre', rate('Concussion Grenade'), 1);

  // The generator agrees with the files, and their ids are stable and unique.
  for (const row of CoreGrenades.ROWS) {
    const built = CoreGrenades.buildDoc(row);
    const on = shipped.get(row.name);
    t.ok(`${row.name}: file matches the generator`, JSON.stringify(built) === JSON.stringify({ _key: on?._key, doc: on?.doc, embedded: on?.embedded }));
  }
  const ids = [...shipped.values()].map(d => d.doc._id);
  t.is('ids are unique', new Set(ids).size, ids.length);
  t.ok('ids are derived (16 hex), never random-looking placeholders', ids.every(i => /^[0-9a-f]{16}$/.test(i)));
  t.ok('keys agree with ids', [...shipped.values()].every(d => d._key === `!items!${d.doc._id}`));

  // A re-run changes nothing.
  const tool = fileURLToPath(new URL('../tools/build-core-grenades.mjs', import.meta.url));
  const res = spawnSync(process.execPath, [tool, '--check'], { encoding: 'utf8' });
  t.is('build-core-grenades --check is clean', res.status, 0);
}
