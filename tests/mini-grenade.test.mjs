/**
 * Launcher grenades carry their blast — TODO 163 · SR3 p.283 (Mini-grenade row), p.119, p.118.
 *
 * Reported: grenades fired from a launcher had no `blast`, so every one fell off at −1/m and a
 * Defensive mini-grenade was wrong. The Mini-grenade row on p.283 is a modifier:
 *
 *   Mini-grenade   Conceal 8   Damage by grenade   Blast by grenade   Weight .1
 *                  Avail. +2/by grenade   Cost x2   St.Index +1   Legal by grenade
 *
 * ⚠ Calls go through `MiniGrenade.x(…)` / `AmmoStock.x(…)`, never destructured, so the mutants bite.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { MiniGrenade } from '../scripts/data/mini-grenade.mjs';
import { AmmoStock } from '../scripts/data/ammo-stock.mjs';
import { Blast } from '../scripts/data/blast.mjs';

export const name = 'mini-grenade';

const read = rel => readFileSync(new URL(rel, import.meta.url), 'utf8');

export async function run(t) {
  /* ── Which system a launched grenade reads ─────────────────────────────────────── */
  const antioch   = { category: 'GrLn', damage: '(Grenade)', blast: undefined, isAoE: true };
  const defensive = { gunClass: 'GrLn', damage: '10S', blast: '-1/.5m' };
  const thrown    = { category: 'GR', damage: '10S', blast: '-1/.5m', isAoE: true };
  t.is('a launcher loaded with a Defensive mini-grenade reads the grenade',
    MiniGrenade.round(antioch, defensive), defensive);
  t.is('…so its blast loses 1 Power per HALF metre (SR3 p.119)',
    Blast.rate(MiniGrenade.round(antioch, defensive).blast), 2);
  t.is('…3 m out: 10 − 6 = 4 (the p.119 example)',
    Blast.power(10, 3, Blast.rate(MiniGrenade.round(antioch, defensive).blast)), 4);
  t.is('a launcher with no load on record reads itself, as before', MiniGrenade.round(antioch, null), antioch);
  t.is('a thrown grenade is its own round, whatever else is loaded', MiniGrenade.round(thrown, defensive), thrown);

  t.ok('GrLn is a launcher', MiniGrenade.isLauncher({ category: 'GrLn' }));
  t.ok('an assault rifle is not', !MiniGrenade.isLauncher({ category: 'AsRf' }));
  t.ok('a round stated for launchers is a mini-grenade', MiniGrenade.isMiniGrenade({ gunClass: 'GrLn' }));
  t.ok('a box with no class stated is NOT — a launcher fires only mini-grenades (p.279)', !MiniGrenade.isMiniGrenade({ gunClass: '' }));

  /* ── Arming distance · SR3 p.118 ───────────────────────────────────────────────── */
  t.ok('4 m: does not arm', !MiniGrenade.arms(4));
  t.ok('5 m: arms', MiniGrenade.arms(5));
  t.ok('no distance measured: assume it arms (never refuse)', MiniGrenade.arms(null));

  /* ── The p.283 arithmetic ──────────────────────────────────────────────────────── */
  const offensive = { conceal: '6', damage: '10S', blast: '-1/m', weight: 0.25, avail: '4/4 days', cost: 30, index: '2', legality: '3-J' };
  t.eq('Offensive → its mini-grenade', MiniGrenade.fromGrenade(offensive),
    { conceal: '8', damage: '10S', blast: '-1/m', weight: 0.1, avail: '6/4 days', cost: 60, index: '3', legality: '3-J' });
  t.is('Availability +2 keeps the time: 8/4 days → 10/4 days', MiniGrenade.availability('8/4 days'), '10/4 days');
  t.is('…and 3/24 hrs → 5/24 hrs', MiniGrenade.availability('3/24 hrs'), '5/24 hrs');

  /* ── The shipped mini-grenades (tools/build-core-grenades.mjs) ─────────────────── */
  const DIR = new URL('../packs-src/sr3e-sr3-ammunition/', import.meta.url);
  const minis = new Map();
  for (const f of readdirSync(DIR).filter(f => f.endsWith('.json'))) {
    const d = JSON.parse(readFileSync(new URL(f, DIR), 'utf8')).doc;
    if (d?.flags?.The2ndChumming3e?.generatedBy === 'build-core-grenades') minis.set(d.name, d.system);
  }
  // [name, damage, blast, avail, cost, index, flechette]
  const BOOK = [
    ['Offensive HE Mini-grenade', '10S', '-1/m',   '6/4 days', 60, '3', false],
    ['Offensive AP Mini-grenade', '10S', '-1/m',   '6/4 days', 60, '3', true],
    ['Defensive HE Mini-grenade', '10S', '-1/.5m', '6/4 days', 60, '3', false],
    ['Defensive AP Mini-grenade', '10S', '-1/.5m', '6/4 days', 60, '3', true],
    ['Concussion Mini-grenade',   '12M Stun', '-1/m', '7/4 days', 60, '3', false],
    ['Gas Mini-grenade (Neuro-Stun VII)', 'Special', '', '10/4 days', 120, '3', false],
    ['Smoke Mini-grenade',        '--', '', '5/24 hrs', 60, '3', false],
    ['Smoke (IR) Mini-grenade',   '--', '', '6/48 hrs', 80, '3', false],
  ];
  t.is('eight mini-grenades ship (every grenade row but the Flash-Pak)', minis.size, BOOK.length);
  for (const [n, damage, blast, avail, cost, index, flechette] of BOOK) {
    const s = minis.get(n);
    t.ok(`${n} ships`, !!s);
    if (!s) continue;
    t.eq(`${n}: the grenade's row with the Mini-grenade modifier`,
      [s.concealability, s.damage, s.blast, s.weight, s.availability, s.cost, s.streetIndex, s.flechette === true, s.bookPage],
      ['8', damage, blast, 0.1, avail, cost, index, flechette, 'sr3.283']);
    t.ok(`${n}: stated for grenade launchers, loose rounds of one`,
      s.gunClass === 'GrLn' && s.countedIn === 'rounds' && s.rounds === 1);
  }
  t.is('the Smoke mini-grenade marks the smoke grenade\'s 10 m', minis.get('Smoke Mini-grenade')?.areaRadius, 10);

  /* ── A launcher's load is one grenade item · AmmoStock.reloadPlan ──────────────── */
  const box = { loadMechanism: 'm', countedIn: 'rounds', rounds: 6, ammoType: 'regular', gunClass: 'GrLn' };
  const other = AmmoStock.reloadPlan(box, 6, { rounds: 2, type: 'regular', ammoId: 'offensive' }, { ammoId: 'defensive' });
  t.is('loading defensive rounds over 2 offensive: the offensive come out', other.returned, 2);
  t.is('…and the magazine fills with defensive', other.loaded, 6);
  const same = AmmoStock.reloadPlan(box, 6, { rounds: 2, type: 'regular', ammoId: 'offensive' }, { ammoId: 'offensive' });
  t.is('topping up with the same grenade keeps the 2', same.returned, 0);
  t.ok('…as a top-up', same.topUp);
  const gun = AmmoStock.reloadPlan(box, 6, { rounds: 2, type: 'regular' }, { ammoId: 'x' });
  t.is('an ordinary gun (no load id) still tops up by type', gun.returned, 0);

  /* ── The flow — source-level, the sheet and roll code need Foundry ─────────────── */
  const item = read('../scripts/documents/SR3EItem.js');
  const aoe  = item.slice(item.indexOf('if (isAoE) {'), item.indexOf('// ── Single-target path'));
  t.ok('the AoE path reads the loaded grenade', /MiniGrenade\.round\(this\.system, grenade\?\.system/.test(aoe));
  t.ok('…its blast sizes the template', /Blast\.rate\(round\.blast\)/.test(aoe));
  t.ok('…and rides to resolution', /aoeBlast\s*=\s*round\.blast/.test(aoe));
  t.ok('…as do the AP rules', /flechetteAmmo\(round\)/.test(aoe));
  t.ok('…and a launched grenade spends a round', /_spendLaunchedRound\(\)/.test(aoe));
  t.ok('the no-blast-field read is gone', !/this\.system\.blast/.test(aoe));
  t.ok('reload records the stock it loaded from', (item.match(/'system\.equippedAmmoId': ammo\.id/g) ?? []).length >= 2);
  t.ok('a launcher is offered only mini-grenades', /!launcher \|\| MiniGrenade\.isMiniGrenade\(i\.system\)/.test(item));
  t.ok('the roll dialog starts a launcher on the launcher scatter row', /opts\.launcher && gTypes\.launcher \? 'launcher'/.test(item));
  t.ok('…and warns under the arming distance (p.118)', /MiniGrenade\.arms\(throwDist\)/.test(item));

  const models = read('../scripts/data/ItemDataModels.js');
  const ammo   = models.slice(models.indexOf('class AmmunitionData'), models.indexOf('class ArmorData'));
  for (const f of ['blast', 'flechette', 'areaRadius', 'areaEffect']) t.ok(`ammunition declares ${f}`, new RegExp(`\\b${f}:`).test(ammo));
}
