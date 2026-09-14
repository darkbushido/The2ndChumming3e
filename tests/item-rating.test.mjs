/**
 * Item ratings — ONE reader for gear, cyberware, bioware and medical items
 * (`scripts/data/item-rating.mjs`). Reported in play, 2026-09-13: "a lot of gear seems to have
 * ratings but that doesn't seem to be stored in an editable way — it's just [3]".
 *
 * The shipped packs store `rating: 0` on 537 of 540 bracketed cyberware and all 72 bracketed
 * bioware; gear had no rating field at all. So every `system.rating` read gave 0 — a Vehicle
 * Control Rig [2] from the compendium added nothing to a rigger's initiative or Driving Test.
 */
import { readFileSync } from 'node:fs';
import { ratingFromName, itemRating, vcrLevel } from '../scripts/data/item-rating.mjs';

export const name = 'item-rating';

export async function run(t) {
  /* ── Reading a name ─────────────────────────────────────────────────────────────── */
  const cases = [
    ['Medkit [6]', 6], ['Medkit Rating 6', 6], ['Hermetic Library (Rating 8)', 8], ['Tracker AOD Rating [3]', 3],
    ['Wired Reflexes [2]', 2], ['Adrenal Pump [2](trig)', 2], ['Cert. Credstick[1]>>', 1], ['Antidote Patch [ 5 ]', 5],
  ];
  for (const [n, r] of cases) t.is(`"${n}" reads ${r}`, ratingFromName(n), r);
  t.is('a bare trailing number is a model, not a rating ("Predator 2")', ratingFromName('Predator 2'), null);
  t.is('a bracket must hold only digits ("[Initiate Grade 2]")', ratingFromName('Metamagic [Initiate Grade 2]: Centering'), null);
  t.is('no rating at all', ratingFromName('Medkit'), null);
  t.is('a range is not a rating ("Rating 4-8" is the GM\'s pick)', ratingFromName('Appropriate Utilities at Rating 4-8'), null);
  t.is('…nor a two-digit one ("Rating 12-16")', ratingFromName('Utilities at Rating 12-16'), null);
  t.is('a rating followed by other words still reads', ratingFromName('Radio (Rating 6) w/ scrambler'), 6);
  t.is('an undefined name does not throw', ratingFromName(undefined), null);

  /* ── The item's rating ──────────────────────────────────────────────────────────── */
  const it = (name, rating) => ({ name, system: rating === undefined ? {} : { rating } });
  t.is('a stored rating wins over the name — a GM who edits Medkit [6] to 4 means 4', itemRating(it('Medkit [6]', 4)), 4);
  t.is('a stored 0 falls back to the name (the shipped packs)', itemRating(it('Vehicle Control Rig [2]', 0)), 2);
  t.is('no field at all (gear before 0.5.2) falls back to the name', itemRating(it('Medkit [6]')), 6);
  t.is('a blanked field (null) falls back to the name', itemRating(it('Medkit [6]', null)), 6);
  t.is('medical\'s string rating reads as a number', itemRating(it('Trauma Patch', '5')), 5);
  t.is('neither: 0', itemRating(it('Medkit', 0)), 0);
  t.is('no item: 0', itemRating(null), 0);

  /* ── A Vehicle Control Rig ──────────────────────────────────────────────────────── */
  t.is('the shipped VCR [2] (rating 0) is level 2', vcrLevel(it('Vehicle Control Rig [2]', 0)), 2);
  t.is('a rig with no number anywhere is still level 1', vcrLevel(it('Vehicle Control Rig', 0)), 1);
  t.is('no rig: level 0', vcrLevel(null), 0);

  /* ── Every VCR read goes through vcrLevel (source level: they sit in sheets and roll flows) ─ */
  const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
  const files = ['scripts/documents/SR3EActor.js', 'scripts/documents/SR3EItem.js', 'scripts/SR3EVehicleChase.js',
                 'scripts/sheets/SR3EVehicleSheet.js', 'scripts/sheets/SR3EActorSheet.js'];
  for (const f of files) {
    t.ok(`${f}: no VCR level read straight off system.rating`, !/(vcrItem|vcr|activeVCRItem)\??\.system\??\.rating/.test(read(f)));
  }
  t.ok('the cyberware skill dice and triggered levels read itemRating, not the name first',
    !/\/\\\[\(\\d\+\)\\\]\/\.exec\(item\.name/.test(read('scripts/documents/SR3EActor.js')));

  /* ── Gear can hold a rating, and its sheet can edit it ──────────────────────────── */
  const models = read('scripts/data/ItemDataModels.js');
  const gear = models.slice(models.indexOf('class GearData'), models.indexOf('class SkillData'));
  for (const f of ['rating', 'availability', 'streetIndex', 'bookPage']) {
    t.ok(`GearData declares ${f} (a TypeDataModel drops undeclared keys)`, new RegExp(`\\b${f}:\\s+new `).test(gear));
  }
  const sheet = read('scripts/sheets/SR3EItemSheet.js');
  const gearCase = sheet.slice(sheet.indexOf("case 'gear':"), sheet.indexOf("case 'gear':") + 900);
  t.ok('the gear sheet has a Rating box', /this\._ratingField\(s\)/.test(gearCase));
  t.ok('…and Book / Page', /'bookPage'/.test(gearCase));
  t.ok('cyberware and bioware use the same Rating box', /case 'bioware'[\s\S]{0,2500}this\._ratingField\(s\)/.test(sheet));

  /* ── The packs carry the rating too (tools/patch-name-ratings.mjs) ──────────────── */
  const { ratingPatch } = await import('../tools/patch-name-ratings.mjs');
  t.is('the pack patch fills a bracketed cyberware\'s 0', ratingPatch({ type: 'cyberware', name: 'Wired Reflexes [2]', system: { rating: 0 } }), 2);
  t.is('…keeps a rating someone set', ratingPatch({ type: 'cyberware', name: 'Wired Reflexes [2]', system: { rating: 3 } }), null);
  t.is('…writes medical as a string', ratingPatch({ type: 'medical', name: 'Trauma Patch [5]', system: { rating: '' } }), '5');
  t.is('…leaves a range alone', ratingPatch({ type: 'gear', name: 'Utilities at Rating 4-8', system: { rating: 0 } }), null);
  t.is('…and skips types without a rating', ratingPatch({ type: 'armor', name: 'Helmet [2]', system: {} }), null);

  /* ⚠ Every shipped item with a rating in its name stores it — new content cannot ship the old
   * way unnoticed. Read from a COPY (tools/lib/pack-copy.mjs); skipped if the packs are locked. */
  const { ClassicLevel } = await import('classic-level');
  const { readdirSync } = await import('node:fs');
  const { join } = await import('node:path');
  const { copyPacks } = await import('../tools/lib/pack-copy.mjs');
  const { fileURLToPath } = await import('node:url');
  const copy = copyPacks(fileURLToPath(new URL('../packs', import.meta.url)));
  const left = [];
  let readable = true;
  try {
    for (const p of readdirSync(copy.dir)) {
      const db = new ClassicLevel(join(copy.dir, p), { valueEncoding: 'json' });
      try { await db.open(); } catch { readable = false; continue; }
      for await (const [k, d] of db.iterator()) {
        if (/^!(items|actors\.items)!/.test(k) && ratingPatch(d) !== null) left.push(`${p}: ${d.name}`);
      }
      await db.close();
    }
  } finally { copy.cleanup(); }
  if (readable) t.is(`no shipped item keeps its rating only in its name${left.length ? ` — ${left.slice(0, 5).join('; ')}` : ''}`, left.length, 0);
  else t.ok('pack sweep SKIPPED — could not open the packs', true);
}
