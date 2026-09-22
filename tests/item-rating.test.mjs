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
  t.is('null is NO rating - the name is not consulted (the maintainer, 2026-09-14)', itemRating(it('Medkit [6]', null)), 0);
  t.is('medical\'s string rating reads as a number', itemRating(it('Trauma Patch', '5')), 5);
  t.is('neither: 0', itemRating(it('Wrist Phone', 0)), 0);
  t.is('a plain Medkit (legacy 0) is rating 3 - SR3 p.304, via the generator table', itemRating(it('Medkit', 0)), 3);
  t.is('no item: 0', itemRating(null), 0);

  /* ── Gear rated only in the generator's Rating COLUMN (reported 2026-09-14: "medkits for one") ── */
  const { ItemRating } = await import('../scripts/data/item-rating.mjs');
  t.is('Basic Medkit: 3 (the column, SR3 p.304)', ItemRating.knownRating('Basic Medkit'), 3);
  t.is('Stabilization Unit: 2', ItemRating.knownRating('Stabilization Unit'), 2);
  t.is('Stabilization Unit Deluxe: 6', ItemRating.knownRating('Stabilization Unit Deluxe'), 6);
  t.is('a plain Medkit: 3 (SR3 p.304, from the book)', ItemRating.knownRating('Medkit'), 3);
  t.is('a name upstream rates differently (Gyro Mount 5/6/7) is not guessed', ItemRating.knownRating('Gyro Mount'), null);
  t.is('the name\'s own rating wins over the table', ItemRating.knownRating('Medkit [6]'), 6);

  /* ── A new gear item's rating is filled in the FIELD (the preCreateItem hook) ──────── */
  t.is('new gear with no rating given: from the name', ItemRating.ratingOnCreate('gear', undefined, 'Medkit [6]'), 6);
  t.is('…or the table', ItemRating.ratingOnCreate('gear', undefined, 'Basic Medkit'), 3);
  t.is('…a legacy 0 is filled too', ItemRating.ratingOnCreate('gear', 0, 'Stabilization Unit'), 2);
  t.is('…nothing known: explicitly none', ItemRating.ratingOnCreate('gear', undefined, 'Wrist Phone'), null);
  t.is('an explicit null (a shipped unrated item) is left', ItemRating.ratingOnCreate('gear', null, 'Medkit [6]'), undefined);
  t.is('a given rating is left', ItemRating.ratingOnCreate('gear', 4, 'Medkit [6]'), undefined);
  t.is('new cyberware is filled from its name too (TODO 122)', ItemRating.ratingOnCreate('cyberware', undefined, 'Wired Reflexes [2]'), 2);
  t.is('…and bioware', ItemRating.ratingOnCreate('bioware', undefined, 'Muscle Aug. [3]'), 3);
  t.is('…an unrated implant is explicitly none', ItemRating.ratingOnCreate('cyberware', undefined, 'Datajack'), null);
  // ⚠ A weapon has NO rating field — writing one would create a key the data model drops at load.
  t.is('a firearm is not given one', ItemRating.ratingOnCreate('firearm', undefined, 'Ares Predator'), undefined);
  t.is('…nor melee', ItemRating.ratingOnCreate('melee', undefined, 'Katana'), undefined);

  /* ── Shown with its rating: "Medkit [3]", never doubled ─────────────────────────────── */
  const g = (name, rating) => ({ type: 'gear', name, system: { rating } });
  t.is('a plain name with a rating shows it', ItemRating.displayName(g('Medkit', 3)), 'Medkit [3]');
  t.is('a name already carrying one is not doubled', ItemRating.displayName(g('Medkit [6]', 6)), 'Medkit [6]');
  t.is('no rating: the name alone', ItemRating.displayName(g('Wrist Phone', null)), 'Wrist Phone');
  t.is('a plainly-named implant shows its rating (TODO 122)', ItemRating.displayName({ type: 'cyberware', name: 'Wired Reflexes', system: { rating: 2 } }), 'Wired Reflexes [2]');
  t.is('…and is never doubled', ItemRating.displayName({ type: 'cyberware', name: 'Wired Reflexes [2]', system: { rating: 2 } }), 'Wired Reflexes [2]');
  t.is('…bioware the same', ItemRating.displayName({ type: 'bioware', name: 'Muscle Aug.', system: { rating: 3 } }), 'Muscle Aug. [3]');
  t.is('an unrated implant is just its name', ItemRating.displayName({ type: 'cyberware', name: 'Datajack', system: { rating: null } }), 'Datajack');
  // ⚠ Weapons are never decorated — they have no rating to show (see the survey in item-rating.mjs).
  t.is('a weapon name is untouched', ItemRating.displayName({ type: 'firearm', name: 'Predator 2', system: {} }), 'Predator 2');

  /* ── TODO 122: null is now sayable on an implant, and NO WORLD MOVES ──────────────
   * ⚠ This is why the change needs no migration, and the reasoning is only checkable here.
   * For every implant in an existing world the legacy 0 and an explicit null read IDENTICALLY:
   * 0 falls through to the name, and an unrated implant has nothing there either way. What null
   * adds is the ability to SAY "no rating" and have the name ignored — which 0 cannot express.
   * If that ever stops being true, this suite fails and a migration is owed. */
  const imp = (name, rating, type = 'cyberware') => itemRating({ type, name, system: { rating } });
  t.is('an unrated implant: a legacy 0 reads as none', imp('Datajack', 0), 0);
  t.is('…and so does an explicit null — the same number, so nothing to migrate', imp('Datajack', null), 0);
  t.is('a name-rated implant still reads its name through the legacy 0', imp('Wired Reflexes [2]', 0), 2);
  t.is('…the stored field wins when set', imp('Wired Reflexes [2]', 3), 3);
  t.is('…and null now means none, name or no name', imp('Wired Reflexes [2]', null), 0);
  t.is('bioware behaves the same', imp('Muscle Aug. [3]', 0, 'bioware'), 3);

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
  t.ok('…and Book / Page', /_bookPageField\(s\)/.test(gearCase));
  t.ok('cyberware and bioware use the same Rating box', /case 'bioware'[\s\S]{0,2500}this\._ratingField\(s\)/.test(sheet));
  const gearModel = models.slice(models.indexOf('class GearData'), models.indexOf('class SkillData'));
  t.ok('gear\'s rating is nullable — null is no rating', /rating:\s+new NumberField\(\{ integer: true, nullable: true, initial: null/.test(gearModel));
  const cyberModel = models.slice(models.indexOf('class CyberwareData'), models.indexOf('class BiowareData'));
  t.ok('cyberware\'s is nullable too now (TODO 122)', /rating:\s+new NumberField\(\{ integer: true, nullable: true, initial: null/.test(cyberModel));
  const bioModel = models.slice(models.indexOf('class BiowareData'), models.indexOf('class BiowareData') + 1600);
  t.ok('…and bioware\'s', /rating:\s+new NumberField\(\{ integer: true, nullable: true, initial: null/.test(bioModel));
  // ⚠ WEAPONS HAVE NO RATING FIELD, and that is the answer rather than an omission (TODO 122):
  //   a survey of the packs found not one of 343 firearms, 107 melee weapons or 67 projectiles
  //   carries a rating in its name. SR3 rates gear and implants, not guns.
  for (const cls of ['FirearmData', 'MeleeData', 'ProjectileData', 'ThrownData']) {
    const m = models.slice(models.indexOf(`class ${cls}`), models.indexOf(`class ${cls}`) + 1800);
    t.ok(`${cls} declares no rating field — there is nothing to put in it`, !/^\s+rating:/m.test(m));
  }
  const entry = read('scripts/sr3e.js');
  t.ok('a preCreateItem hook fills a new gear item\'s rating', /Hooks\.on\('preCreateItem'[\s\S]{0,200}ratingOnCreate\(document\.type, data\?\.system\?\.rating, document\.name\)/.test(entry));
  const asheet = read('scripts/sheets/SR3EActorSheet.js');
  t.ok('the gear tab shows gear with its rating', /<span class="item-name">\$\{displayName\(g\)\}<\/span>/.test(asheet));

  /* ── The packs carry the rating too (tools/patch-name-ratings.mjs) ──────────────── */
  const { ratingPatch } = await import('../tools/patch-name-ratings.mjs');
  t.is('the pack patch fills a bracketed cyberware\'s 0', ratingPatch({ type: 'cyberware', name: 'Wired Reflexes [2]', system: { rating: 0 } }), 2);
  t.is('…keeps a rating someone set', ratingPatch({ type: 'cyberware', name: 'Wired Reflexes [2]', system: { rating: 3 } }), undefined);
  t.is('…writes medical as a string', ratingPatch({ type: 'medical', name: 'Trauma Patch [5]', system: { rating: '' } }), '5');
  t.is('…a range is no rating: a gear item\'s legacy 0 becomes null', ratingPatch({ type: 'gear', name: 'Utilities at Rating 4-8', system: { rating: 0 } }), null);
  t.is('…fills a plain Basic Medkit from the table', ratingPatch({ type: 'gear', name: 'Basic Medkit', system: { rating: 0 } }), 3);
  t.is('…leaves a gear null alone', ratingPatch({ type: 'gear', name: 'Wrist Phone', system: { rating: null } }), undefined);
  t.is('…an unrated cyberware\'s legacy 0 becomes null (TODO 122)', ratingPatch({ type: 'cyberware', name: 'Datajack', system: { rating: 0 } }), null);
  t.is('…and bioware\'s', ratingPatch({ type: 'bioware', name: 'Orthoskin', system: { rating: 0 } }), null);
  // ⚠ medical's rating is a STRING ("+2" is a real Biotech rating), so it has no null to mean "none".
  t.is('…medical is left alone: its rating is a string', ratingPatch({ type: 'medical', name: 'Bandage', system: { rating: '' } }), undefined);
  t.is('…and skips types without a rating', ratingPatch({ type: 'armor', name: 'Helmet [2]', system: {} }), undefined);

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
        if (/^!(items|actors\.items)!/.test(k) && ratingPatch(d) !== undefined) left.push(`${p}: ${d.name}`);
      }
      await db.close();
    }
  } finally { copy.cleanup(); }
  if (readable) t.is(`no shipped item keeps its rating only in its name, or a gear legacy 0${left.length ? ` — ${left.slice(0, 5).join('; ')}` : ''}`, left.length, 0);
  else t.ok('pack sweep SKIPPED — could not open the packs', true);
}
