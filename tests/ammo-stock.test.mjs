/**
 * Ammunition counted in ROUNDS or in RELOADS — `scripts/data/ammo-stock.mjs` · TODO 114.
 *
 * Reported in play, 2026-09-13: a *"7-round cy reload ×6"* should read 6 and drop by one per
 * reload. The system wanted 42 rounds and docked 7 — and an imported *"10-Rnd Clip (Explosive)"*
 * arrived with 0 rounds and type Regular, unloadable.
 *
 * ⚠ Calls go through `AmmoStock.x(…)`, never a destructured copy, so the mutants can bite.
 */
import { readFileSync } from 'node:fs';
import { AmmoStock } from '../scripts/data/ammo-stock.mjs';

export const name = 'ammo-stock';

export async function run(t) {
  const reloads = (n, per = 0, extra = {}) => ({ countedIn: 'reloads', reloads: n, roundsPerReload: per, rounds: 0, ...extra });
  const rounds  = n => ({ countedIn: 'rounds', rounds: n });

  /* ── The reported case ─────────────────────────────────────────────────────────── */
  const cy = AmmoStock.reloadPlan(reloads(6, 7), 7);
  t.is('six 7-round cylinder reloads into a 7(cy) revolver: loads 7', cy.loaded, 7);
  t.is('…and 5 reloads are left, not 35 rounds', cy.remaining, 5);
  t.is('…written to the reloads field', cy.field, 'reloads');
  t.ok('…a full magazine, no mismatch', !cy.short && !cy.mismatch);

  /* ── Loose rounds keep today's arithmetic ─────────────────────────────────────── */
  const box = AmmoStock.reloadPlan(rounds(42), 7);
  t.is('42 loose rounds into a 7-round gun: loads 7', box.loaded, 7);
  t.is('…35 left', box.remaining, 35);
  t.is('…written to rounds', box.field, 'rounds');
  const low = AmmoStock.reloadPlan(rounds(3), 15);
  t.is('3 loose rounds into a 15-round clip: loads 3', low.loaded, 3);
  t.ok('…and says the magazine is short', low.short);
  t.is('…and the stock is spent', low.remaining, 0);
  t.is('an item saved before 0.5.2 (no countedIn) is loose rounds', AmmoStock.stock({ rounds: 12 }).unit, 'rounds');

  /* ── A reload is used up whole ─────────────────────────────────────────────────── */
  const big = AmmoStock.reloadPlan(reloads(2, 10), 8);
  t.is('a 10-round clip in an 8-round gun loads 8', big.loaded, 8);
  t.is('…and uses the whole clip', big.remaining, 1);
  t.ok('…and flags the size mismatch', big.mismatch);
  const small = AmmoStock.reloadPlan(reloads(3, 4), 10);
  t.is('a 4-round clip in a 10-round gun loads 4', small.loaded, 4);
  t.ok('…short, and a mismatch', small.short && small.mismatch);
  const fill = AmmoStock.reloadPlan(reloads(4), 30);
  t.is('no size given: a reload fills the gun', fill.loaded, 30);
  t.ok('…and is not a mismatch', !fill.mismatch && !fill.short);
  const none = AmmoStock.reloadPlan(reloads(0, 7), 7);
  t.is('no reloads left: loads nothing', none.loaded, 0);
  t.is('…and cannot go negative', none.remaining, 0);

  /* ── Reading it back ──────────────────────────────────────────────────────────── */
  t.is('describe: reloads with a size', AmmoStock.describe(reloads(6, 7)), '6 reloads of 7');
  t.is('describe: one reload', AmmoStock.describe(reloads(1)), '1 reload');
  t.is('describe: rounds', AmmoStock.describe(rounds(42)), '42 rounds');

  /* ── Names ─────────────────────────────────────────────────────────────────────── */
  const n = s => AmmoStock.fromName(s);
  t.is('"7-round cy reload ×6" → 7 per reload', n('7-round cy reload ×6')?.roundsPerReload, 7);
  t.is('…6 of them', n('7-round cy reload ×6')?.reloads, 6);
  t.is('"10-Rnd Clip (Explosive)" → Explosive', n('10-Rnd Clip (Explosive)')?.ammoType, 'explosive');
  t.is('"10-Rnd Clip (Explosive) ×2" → 2 reloads', n('10-Rnd Clip (Explosive) ×2')?.reloads, 2);
  t.is('"15-Rnd Clip (EX Explosive)" → EX', n('15-Rnd Clip (EX Explosive)')?.ammoType, 'exExplosive');
  t.is('"20-Rnd Clip (AV)" → Anti-Vehicle', n('20-Rnd Clip (AV)')?.ammoType, 'antiVehicle');
  t.is('a type we do not model (Glazer) is left for the GM', n('10-Rnd Clip (Glazer)')?.ammoType, null);
  t.is('"12 rnd mag for P7M13" is a reload of 12', n('12 rnd mag for P7M13')?.roundsPerReload, 12);
  t.is('a box of rounds is not a reload', n('Box of 50 rounds'), null);
  t.is('"Magnum rounds" is not a magazine', n('Magnum rounds'), null);
  t.is('no name: null', n(undefined), null);

  /* ── Which gun a reload fits ──────────────────────────────────────────────────── */
  t.is('one gun takes 10(c): clip', AmmoStock.mechanismFor(10, ['10(c)/10(c)', '6(cy)']), 'c');
  t.is('a 6-round reload with a 6(cy) revolver: cylinder', AmmoStock.mechanismFor(6, ['10(c)', '6(cy)']), 'cy');
  t.is('two guns disagree: the GM decides', AmmoStock.mechanismFor(10, ['10(c)', '10(m)']), null);
  t.is('no gun that size: null', AmmoStock.mechanismFor(30, ['10(c)']), null);

  /* ── Wired in (source level: these sit in Foundry-bound files) ───────────────────── */
  const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
  const item = read('scripts/documents/SR3EItem.js');
  const reload = item.slice(item.indexOf('async reload()'), item.indexOf('static async _promptReloadChoice'));
  t.ok('reload() plans through AmmoStock.reloadPlan', /AmmoStock\.reloadPlan\(ammo\.system, magSize\)/.test(reload));
  t.ok('…writes the plan\'s own field, not system.rounds', /\[`system\.\$\{plan\.field\}`\]: plan\.remaining/.test(reload));
  t.ok('…and lists only stock that has something left in either unit', /AmmoStock\.stock\(i\.system\)\.count > 0/.test(reload));
  t.ok('a stack of reloads moves by its reload count', /stackField\(item\) \{\s*if \(item\?\.type === 'ammunition'\) return AmmoStock\.stock\(item\.system\)\.field/
    .test(read('scripts/documents/SR3EActor.js')));
  const models = read('scripts/data/ItemDataModels.js');
  const ammo = models.slice(models.indexOf('class AmmunitionData'), models.indexOf('class ArmorData'));
  for (const f of ['countedIn', 'reloads', 'roundsPerReload']) t.ok(`AmmunitionData declares ${f}`, new RegExp(`\\b${f}:\\s+new `).test(ammo));
  t.ok('the ammunition sheet can switch the unit', /name="system\.countedIn"/.test(read('scripts/sheets/SR3EItemSheet.js')));
  t.ok('the stock cell reads AmmoStock', /_ammoStockCell\(a\) \{[\s\S]{0,200}AmmoStock\.stock\(a\.system\)/.test(read('scripts/sheets/SR3EActorSheet.js')));
  t.ok('the importer can reach AmmoStock', /AmmoStock \};/.test(read('scripts/sr3e.js')));
}
