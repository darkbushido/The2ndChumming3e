/**
 * Ammunition stock and reloading by loading mechanism — `scripts/data/ammo-stock.mjs` · TODO 114,
 * SR3 p.280 (the Ammo Reloading Table).
 *
 * Reported in play, 2026-09-13: a *"7-round cy reload ×6"* should read 6 and drop by one per
 * reload. The system wanted 42 rounds and docked 7 — and an imported *"10-Rnd Clip (Explosive)"*
 * arrived with 0 rounds and type Regular, unloadable. The maintainer settled the model on the
 * book's table: a pre-filled clip / speed loader / belt is SWAPPED and the old one's rounds are
 * lost; loose rounds TOP UP, a Complex Action per (Quickness) rounds.
 *
 * ⚠ Calls go through `AmmoStock.x(…)`, never a destructured copy, so the mutants can bite.
 */
import { readFileSync } from 'node:fs';
import { AmmoStock } from '../scripts/data/ammo-stock.mjs';

export const name = 'ammo-stock';

export async function run(t) {
  const reloads = (n, per = 0, extra = {}) => ({ loadMechanism: 'cy', countedIn: 'reloads', reloads: n, roundsPerReload: per, rounds: 0, ammoType: 'regular', ...extra });
  const rounds  = (n, mech = 'c', extra = {}) => ({ loadMechanism: mech, countedIn: 'rounds', rounds: n, ammoType: 'regular', ...extra });

  /* ── Which mechanisms have pre-filled reloads (SR3 p.280) ────────────────────────── */
  for (const m of ['c', 'd', 'cy', 'belt']) t.is(`${m} can be either — the table gives it two methods`, AmmoStock.kind(m), 'either');
  for (const m of ['m', 'b', 'sb', 'internal', 'arrow', 'bolt']) t.is(`${m} is loaded by hand`, AmmoStock.kind(m), 'loose');
  t.is('(b) is BREAK ACTION, loaded by hand — not belt', AmmoStock.kind('b'), 'loose');
  t.is('an internal magazine (m) cannot be "reloads", whatever the item says', AmmoStock.unit({ loadMechanism: 'm', countedIn: 'reloads' }), 'rounds');
  t.is('a clip item set to reloads counts reloads', AmmoStock.unit({ loadMechanism: 'c', countedIn: 'reloads' }), 'reloads');
  t.is('an item saved before 0.5.2 (no countedIn) is loose rounds', AmmoStock.unit({ loadMechanism: 'c', rounds: 12 }), 'rounds');

  /* ── The reported case — speed loaders ─────────────────────────────────────────── */
  const cy = AmmoStock.reloadPlan(reloads(6, 7), 7);
  t.is('six 7-round speed loaders into a 7(cy) revolver: loads 7', cy.loaded, 7);
  t.is('…and 5 are left, not 35 rounds', cy.remaining, 5);
  t.is('…written to the reloads field', cy.field, 'reloads');

  /* ── Swapping loses what was in the old one (the maintainer's rule) ─────────────── */
  const clip = { loadMechanism: 'c', countedIn: 'reloads', reloads: 3, roundsPerReload: 0, ammoType: 'regular' };
  const swap = AmmoStock.reloadPlan(clip, 15, { rounds: 4, type: 'regular' });
  t.is('a fresh clip in a 15-round gun with 4 left: 15 in the gun', swap.loaded, 15);
  t.is('…the 4 unfired rounds are lost', swap.discarded, 4);
  t.is('…one clip used', swap.remaining, 2);
  const big = AmmoStock.reloadPlan({ ...clip, roundsPerReload: 10 }, 8);
  t.is('a 10-round clip in an 8-round gun loads 8', big.loaded, 8);
  t.ok('…flags the size mismatch', big.mismatch);
  t.is('…and uses the whole clip', big.remaining, 2);
  const none = AmmoStock.reloadPlan({ ...clip, reloads: 0 }, 15);
  t.is('no clips left: nothing taken', none.taken, 0);

  /* ── Loose rounds top up ───────────────────────────────────────────────────────── */
  const tube = AmmoStock.reloadPlan(rounds(20, 'm'), 6, { rounds: 2, type: 'regular' });
  t.is('a 6(m) shotgun with 2 left tops up to 6', tube.loaded, 6);
  t.is('…taking 4 from the box', tube.taken, 4);
  t.is('…nothing lost', tube.discarded, 0);
  t.ok('…a top-up', tube.topUp);
  t.is('…16 left', tube.remaining, 16);
  const part = AmmoStock.reloadPlan(rounds(20, 'm'), 6, { rounds: 2, type: 'regular' }, { want: 3 });
  t.is('only 3 rounds this time: 5 in the gun', part.loaded, 5);
  const other = AmmoStock.reloadPlan(rounds(20, 'm', { ammoType: 'gel' }), 6, { rounds: 2, type: 'regular' });
  t.is('a different ammunition type replaces what was there', other.loaded, 6);
  t.is('…but round by round never LOSES a round — nothing discarded', other.discarded, 0);
  t.is('…the 2 regular rounds are unloaded back into stock', other.returned, 2);
  t.is('same type: nothing comes out', tube.returned, 0);
  t.is('a clip swap unloads nothing — the old rounds go with the clip', swap.returned, 0);
  const short = AmmoStock.reloadPlan(rounds(3), 15);
  t.is('3 loose rounds into an empty 15-round clip: 3', short.loaded, 3);
  t.ok('…short', short.short);
  const fullGun = AmmoStock.reloadPlan(rounds(20, 'm'), 6, { rounds: 6, type: 'regular' });
  t.is('a full gun takes nothing', fullGun.taken, 0);

  /* ── What it takes (SR3 p.107, p.280) ─────────────────────────────────────────── */
  t.is('a clip swap is two Simple Actions', AmmoStock.reloadActions(clip).simple, 2);
  t.is('…no Complex Action', AmmoStock.reloadActions(clip).complex, 0);
  t.is('a speed loader is one Complex Action', AmmoStock.reloadActions(reloads(6, 7)).complex, 1);
  t.is('a belt is one Complex Action', AmmoStock.reloadActions({ loadMechanism: 'belt', countedIn: 'reloads' }).complex, 1);
  t.is('loose rounds: a Complex Action per Quickness rounds — 7 at Quickness 4 is 2', AmmoStock.reloadActions(rounds(20, 'm'), { taken: 7, quickness: 4 }).complex, 2);
  t.is('break action: 2 rounds a Complex Action — 1 round is 1', AmmoStock.reloadActions(rounds(10, 'b'), { taken: 1, quickness: 6 }).complex, 1);
  t.is('…2 rounds is still 1', AmmoStock.reloadActions(rounds(10, 'b'), { taken: 2, quickness: 6 }).complex, 1);
  t.is('…3 rounds is 2', AmmoStock.reloadActions(rounds(10, 'b'), { taken: 3, quickness: 6 }).complex, 2);
  t.ok('loose rounds into a clip say so', /into the clip/.test(AmmoStock.reloadActions(rounds(20, 'c'), { taken: 5, quickness: 5 }).text));
  t.ok('the text cites the table', /SR3 p\.280/.test(AmmoStock.reloadActions(rounds(20, 'm'), { taken: 5, quickness: 5 }).text));

  /* ── Which stock fits which gun ───────────────────────────────────────────────── */
  t.ok('a box of rounds marked for clips loads a revolver', AmmoStock.fits(rounds(50, 'c'), 'cy'));
  t.ok('…a tube-fed shotgun', AmmoStock.fits(rounds(50, 'c'), 'm'));
  t.ok('…and a break action', AmmoStock.fits(rounds(50, 'c'), 'b'));
  t.ok('a pre-filled clip fits only a clip gun — not a revolver', !AmmoStock.fits(clip, 'cy'));
  t.ok('…but does fit a clip gun', AmmoStock.fits(clip, 'c'));
  t.ok('speed loaders fit revolvers only', AmmoStock.fits(reloads(6, 7), 'cy') && !AmmoStock.fits(reloads(6, 7), 'c'));
  t.ok('arrows are not bullets', !AmmoStock.fits(rounds(12, 'arrow'), 'c'));
  t.ok('…nor bullets arrows', !AmmoStock.fits(rounds(50, 'c'), 'arrow'));
  t.ok('bolts fit a crossbow, arrows do not', AmmoStock.fits(rounds(5, 'bolt'), 'bolt') && !AmmoStock.fits(rounds(5, 'arrow'), 'bolt'));
  t.ok('a gun that names no mechanism takes anything', AmmoStock.fits(clip, ''));
  t.is('clip-marked rounds into a break action go 2 at a time — 3 rounds is 2 actions',
    AmmoStock.reloadActions(rounds(50, 'c'), { taken: 3, quickness: 6, gunMech: 'b' }).complex, 2);
  t.ok('…and do not say "into the clip"', !/into the clip/.test(AmmoStock.reloadActions(rounds(50, 'c'), { taken: 3, quickness: 6, gunMech: 'b' }).text));
  t.is('a reload keeps its own mechanism\'s rate', AmmoStock.reloadActions(clip, { gunMech: 'cy' }).simple, 2);
  const itemSrc = readFileSync(new URL('../scripts/documents/SR3EItem.js', import.meta.url), 'utf8');
  t.ok('reload() offers stock through AmmoStock.fits, with the gun\'s class', /AmmoStock\.fits\(i\.system, gunMech, gunClass\)/.test(itemSrc));
  t.ok('…and unloaded rounds go home through it too', /AmmoStock\.fits\(i\.system, mech, gunClass\) && \(i\.system\.ammoType/.test(itemSrc));

  /* ── Gun class · SR3 p.279 (TODO 173, the maintainer's choice to enforce it) ─────────────── */
  // "each kind of gun can trade ammo with another of its class … Shotguns, whether pistols or rifles"
  t.is('a light pistol takes the light-pistol class', AmmoStock.gunClass('LPist'), 'LPist');
  t.is('a machine pistol reads as light pistol, as its range does', AmmoStock.gunClass('MaPist'), 'LPist');
  t.is('a carbine reads as assault rifle', AmmoStock.gunClass('Carb'), 'AsRf');
  t.is('no category → no class', AmmoStock.gunClass(''), null);
  const box = cls => ({ loadMechanism: 'c', countedIn: 'rounds', rounds: 20, gunClass: cls });
  t.ok('a box with no class stated fits any gun (it is stated on first load)', AmmoStock.fits(box(''), 'c', 'AsRf'));
  t.ok('a light-pistol box fits a light pistol', AmmoStock.fits(box('LPist'), 'c', 'LPist'));
  t.ok('…and not an assault rifle', !AmmoStock.fits(box('LPist'), 'c', 'AsRf'));
  t.ok('…not even by hand into a revolver of another class', !AmmoStock.fits(box('LPist'), 'cy', 'HPist'));
  t.ok('a gun with no category constrains nothing', AmmoStock.fits(box('LPist'), 'c', null));
  t.ok('reload() states the class of a box that had none',
    /if \(gunClass && !String\(ammo\.system\.gunClass \?\? ''\)\.trim\(\)\) await ammo\.update\(\{ 'system\.gunClass': gunClass \}\)/.test(itemSrc));

  /* ── Belts load (Quickness × 2) rounds a Complex Action · SR3 p.280 (TODO 173) ───────────── */
  const beltBox = { loadMechanism: 'belt', countedIn: 'rounds', rounds: 100 };
  t.is('a belt takes Quickness 4 × 2 = 8 rounds a Complex Action — 16 rounds is 2',
    AmmoStock.reloadActions(beltBox, { taken: 16, quickness: 4, gunMech: 'belt' }).complex, 2);
  t.is('…an internal magazine still takes Quickness — 16 rounds is 4',
    AmmoStock.reloadActions({ loadMechanism: 'm', rounds: 100 }, { taken: 16, quickness: 4, gunMech: 'm' }).complex, 4);
  t.ok('…no reload site matches on the mechanism alone any more', !/loadMechanism \?\? 'c'\) === (gunMech|mech)/.test(itemSrc));

  /* ── Reading it back ──────────────────────────────────────────────────────────── */
  t.is('describe: reloads with a size', AmmoStock.describe(reloads(6, 7)), '6 reloads of 7');
  t.is('describe: one reload', AmmoStock.describe(reloads(1)), '1 reload');
  t.is('describe: rounds', AmmoStock.describe(rounds(42)), '42 rounds');

  /* ── Names ─────────────────────────────────────────────────────────────────────── */
  const n = s => AmmoStock.fromName(s);
  t.is('"7-round cy reload ×6" → 7 per reload', n('7-round cy reload ×6')?.roundsPerReload, 7);
  t.is('…6 of them', n('7-round cy reload ×6')?.reloads, 6);
  t.is('"10-Rnd Clip (Explosive)" → Explosive', n('10-Rnd Clip (Explosive)')?.ammoType, 'explosive');
  t.is('"15-Rnd Clip (EX Explosive)" → EX', n('15-Rnd Clip (EX Explosive)')?.ammoType, 'exExplosive');
  t.is('"20-Rnd Clip (AV)" → Anti-Vehicle', n('20-Rnd Clip (AV)')?.ammoType, 'antiVehicle');
  t.is('a type we do not model (Glazer) is left for the GM', n('10-Rnd Clip (Glazer)')?.ammoType, null);
  t.is('"12 rnd mag for P7M13" is a reload of 12', n('12 rnd mag for P7M13')?.roundsPerReload, 12);
  t.is('a box of rounds is not a reload', n('Box of 50 rounds'), null);
  t.is('"Magnum rounds" is not a magazine', n('Magnum rounds'), null);

  /* ── Which gun a reload fits ──────────────────────────────────────────────────── */
  t.is('one gun takes 10(c): clip', AmmoStock.mechanismFor(10, ['10(c)/10(c)', '6(cy)']), 'c');
  t.is('a 6-round reload with a 6(cy) revolver: cylinder', AmmoStock.mechanismFor(6, ['10(c)', '6(cy)']), 'cy');
  t.is('two guns disagree: the GM decides', AmmoStock.mechanismFor(10, ['10(c)', '10(m)']), null);
  t.is('a belt code is read whole, not as b', AmmoStock.mechanismFor(50, ['50(belt)']), 'belt');

  /* ── Wired in (source level: these sit in Foundry-bound files) ───────────────────── */
  const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
  const item = read('scripts/documents/SR3EItem.js');
  const reload = item.slice(item.indexOf('async reload()'), item.indexOf('static async _promptReloadChoice'));
  t.ok('reload() plans with what is already in the gun', /AmmoStock\.reloadPlan\(ammo\.system, magSize, current, \{ want: choice\.want \}\)/.test(reload));
  t.ok('…writes the plan\'s own field', /\[`system\.\$\{plan\.field\}`\]: plan\.remaining/.test(reload));
  t.ok('…says what the reload takes', /AmmoStock\.reloadActions\(/.test(reload));
  t.ok('…and what was lost', /plan\.discarded/.test(reload));
  t.ok('…never from storage (the stash is not on the character)', /!i\.getFlag\('The2ndChumming3e', 'stored'\)/.test(reload));
  t.ok('…and puts unloaded rounds back into stock', /plan\.returned > 0 \? await SR3EItem\._returnRounds\(actor, gunMech, current\.type, plan\.returned, gunClass\)/.test(reload));
  const back = item.slice(item.indexOf('static async _returnRounds'), item.indexOf('static async _returnRounds') + 1200);
  t.ok('_returnRounds adds to the loose stock of that type, or makes one', /'system\.rounds': \(home\.system\.rounds \?\? 0\) \+ n/.test(back) && /createEmbeddedDocuments\('Item'/.test(back));
  const dlg = item.slice(item.indexOf('static async _promptReloadChoice'), item.indexOf('static async _promptReloadChoice') + 5000);
  t.ok('the dialog asks how many loose rounds', /id="reload-rounds"/.test(dlg));
  t.ok('…wired per dialog', /render: \(_event, dialog\) => wireReload\(dialog, dialog\.element\)/.test(dlg));
  const cfg = read('scripts/config.js');
  t.ok('config: b is Break Action (SR3 p.280)', /b:\s+'Break Action'/.test(cfg));
  t.ok('config: m is an Internal Magazine', /m:\s+'Internal Magazine'/.test(cfg));
  t.ok('config: belt has its own code', /belt:\s+'Belt Feed'/.test(cfg));
  t.ok('a stack of reloads moves by its reload count', /stackField\(item\) \{\s*if \(item\?\.type === 'ammunition'\) return AmmoStock\.stock\(item\.system\)\.field/
    .test(read('scripts/documents/SR3EActor.js')));
  const models = read('scripts/data/ItemDataModels.js');
  const ammo = models.slice(models.indexOf('class AmmunitionData'), models.indexOf('class ArmorData'));
  for (const f of ['countedIn', 'reloads', 'roundsPerReload']) t.ok(`AmmunitionData declares ${f}`, new RegExp(`\\b${f}:\\s+new `).test(ammo));
  const sheet = read('scripts/sheets/SR3EItemSheet.js');
  t.ok('the choice is offered only where the table gives two methods', /AmmoStock\.kind\(s\.loadMechanism\) === 'either' \?/.test(sheet));
  t.ok('the stock cell reads AmmoStock', /_ammoStockCell\(a\) \{[\s\S]{0,200}AmmoStock\.stock\(a\.system\)/.test(read('scripts/sheets/SR3EActorSheet.js')));
  t.ok('the importer can reach AmmoStock', /game\.sr3e = \{[^}]*\bAmmoStock\b[^}]*\};/.test(read('scripts/sr3e.js')));

  /* ── Loose rounds are not clips on the sheet · TODO 133/142 (reported in the trial session) ── */
  const LABELS = { c: 'Removable Clip', cy: 'Cylinder' };
  t.is('rounds unloaded from a clip gun (loadMechanism c) read as loose, not "c"', AmmoStock.loadLabel(rounds(15, 'c'), LABELS).code, 'loose');
  t.is('an item saved before 0.5.2 (no countedIn) reads as loose', AmmoStock.loadLabel({ loadMechanism: 'c', rounds: 100 }, LABELS).code, 'loose');
  t.is('a stock of clips still shows its mechanism', AmmoStock.loadLabel(clip, LABELS).code, 'c');
  t.ok('…named in the tooltip', /Removable Clip/.test(AmmoStock.loadLabel(clip, LABELS).title));
  t.is('speed loaders show cy', AmmoStock.loadLabel(reloads(6, 7), LABELS).code, 'cy');
  const sheetSrc = read('scripts/sheets/SR3EActorSheet.js');
  t.is('both ammunition lists label the Load cell through AmmoStock.loadLabel', (sheetSrc.match(/AmmoStock\.loadLabel\(a\.system/g) ?? []).length, 2);
  t.ok('…and neither prints the raw loadMechanism', !/title="\$\{SR3E\.ammoLoadMechanisms\[mech\]/.test(sheetSrc));

  /* ── Unloading a gun · TODO 134 ──────────────────────────────────────────────── */
  t.is('unloading a clip gun is Remove Clip, one Simple Action (SR3 p.107)', AmmoStock.unloadActions('c').simple, 1);
  t.is('…a drum too', AmmoStock.unloadActions('d').simple, 1);
  for (const m of ['cy', 'm', 'b', 'belt', '']) t.is(`emptying ${m || 'an unmarked gun'} by hand has no book action — nothing charged`, AmmoStock.unloadActions(m).simple, 0);
  const unloadBody = /async unload\(\) \{([\s\S]*?)\n  \}/.exec(itemSrc)?.[1] ?? '';
  t.ok('SR3EItem.unload exists', unloadBody.length > 0);
  t.ok('…empties the gun', /'system\.loadedRounds': 0/.test(unloadBody));
  t.ok('…returns the rounds to loose stock', /_returnRounds\(actor, gunMech, type, n, gunClass\)/.test(unloadBody));
  t.ok('…snapshots for the GM\'s undo before writing', unloadBody.indexOf('.begin(actor)') > -1 && unloadBody.indexOf('.begin(actor)') < unloadBody.indexOf('update('));
  t.ok('the sheet offers ⏏ Unload and wires it', /data-action="unloadWeapon"/.test(sheetSrc) && /unloadWeapon:\s+SR3EActorSheet\._onUnloadWeapon/.test(sheetSrc));
  const returnBody = /static async _returnRounds\([^)]*\) \{([\s\S]*?)\n  \}/.exec(itemSrc)?.[1] ?? '';
  t.ok('returned rounds never go into a clip still counted in rounds (TODO 133)', /!AmmoStock\.fromName\(i\.name\)/.test(returnBody));

  /* ── Clips stored as rounds · TODO 143 ───────────────────────────────────────── */
  t.eq('a "10-Rnd Clip (Regular)" holding 30 rounds is 3 clips of 10', AmmoStock.reloadsFromRounds('10-Rnd Clip (Regular)', rounds(30)), { reloads: 3, roundsPerReload: 10 });
  t.eq('the reported "7-round cy reload ×6" with 42 rounds is 6 speed loaders', AmmoStock.reloadsFromRounds('7-round cy reload ×6', rounds(42, 'cy')), { reloads: 6, roundsPerReload: 7 });
  t.is('an uneven count is left alone — which rounds are loose is the GM\'s call', AmmoStock.reloadsFromRounds('10-Rnd Clip (Regular)', rounds(35)), null);
  t.is('an empty stock is the 0.5.2 migration\'s, not this one', AmmoStock.reloadsFromRounds('10-Rnd Clip (Regular)', rounds(0)), null);
  t.is('a hand-loaded mechanism has no reloads (SR3 p.280)', AmmoStock.reloadsFromRounds('5-Rnd Clip (Regular)', rounds(15, 'm')), null);
  t.is('a box of rounds is not a reload', AmmoStock.reloadsFromRounds('Pistol Clip Ammo', rounds(100)), null);
  t.is('idempotent: already counted in reloads', AmmoStock.reloadsFromRounds('10-Rnd Clip (Regular)', { ...rounds(30), countedIn: 'reloads' }), null);
}
