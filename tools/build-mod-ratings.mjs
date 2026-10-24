#!/usr/bin/env node
/**
 * Rated items: ONE document per item, its levels in a table — TODO 260.
 *
 *   node tools/build-mod-ratings.mjs           in packs-src: take every level out of its name, collapse every rated
 *                                              family to one document, write scripts/data/mod-rating-table.mjs;
 *                                              then run: npm run packs:build
 *   node tools/build-mod-ratings.mjs --check   exit 1 if a name, a family or the table would change — changes nothing
 *   node tools/build-mod-ratings.mjs --collapse "vehicle|Vehicle Armor"
 *                                              collapse just that family (the rest of a default run does them all)
 *
 * "Anti-Theft System [10]" becomes "Anti-Theft System" with `system.rating` 10 (`ModRatings.renameDelta`), in every
 * pack, embedded copies on actors included. The maintainer widened it from mods to ALL gear (2026-10-24: *"We
 * shouldn't have any [N] gear — the point is to move the level into the gear's doc"*), so a family — the documents of
 * one pack that are one item at different levels (`RatedFamilies`, `scripts/data/rated-families.mjs`) — is **one
 * document**: the lowest level's, its `_id` unchanged. Every field that differs between the levels goes into the
 * level table (`MOD_RATING_TABLE`) the item sheet's Level dropdown and 🛒 Buy gear read, and the other documents go.
 *
 * ⚠ **Generated packs are not collapsed here.** `tools/build-default-gear.mjs` produces the gear, medical and
 *   ammunition packs and collapses its own families (so a regeneration never brings a level back), recording them in
 *   `tools/data/collapsed-mods.json` (`by: 'build-default-gear'`). This tool never renames or deletes a generated
 *   document — it only reads them for the table, and `--check` fails if one still carries a level.
 * ⚠ **Ids never change** for the document that stays: it keeps its key, so owned copies keep their compendium link.
 *   The deleted documents' ids are recorded (`deleted`) and written to the table file as `COLLAPSED_SOURCES`, so the
 *   0.7.1 migration repoints a copy that linked to one (`ModRatings.repointSource`).
 * ⚠ A level printed twice with different numbers is NOT guessed at: it is kept as `unplaced` in the record.
 * ⚠ `sr3e-mr-johnsons-contacts` is left alone (a contact's gear is not a gear listing — the maintainer decides).
 * ⚠ Copies already in worlds are renamed by the 0.7.1 migration (`scripts/SR3EMigrations.js`).
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readSourceDir, writeSourceDir } from './lib/pack-source.mjs';
import { ModRatings } from '../scripts/data/mod-ratings.mjs';
import { RatedFamilies } from '../scripts/data/rated-families.mjs';
import { addFamilies, readCollapsed as readCollapsedFile, tableKeyOf, COLLAPSED_FILE } from './lib/collapsed-mods.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'packs-src');
export const TABLE_FILE = join(ROOT, 'scripts', 'data', 'mod-rating-table.mjs');
export const EXTRA_LEVELS_FILE = join(ROOT, 'tools', 'data', 'extra-levels.json');
export { COLLAPSED_FILE };

/** Packs this tool leaves alone: a contact's gear is not a gear listing. */
export const EXCLUDED_PACKS = ['sr3e-mr-johnsons-contacts'];

/** The collapsed families: `{ id: { pack, keep, levels: { level: fields }, deleted, unplaced? } }`. */
export const readCollapsed = (file = COLLAPSED_FILE) => readCollapsedFile(file);

/** Levels the books print that no document carries (M&M p.24: RC Encryption Module 1-10): `{ "kind|name": { level: fields } }`. */
export const readExtraLevels = (file = EXTRA_LEVELS_FILE) => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')).levels : {});

const isGenerated = doc => doc?.flags?.The2ndChumming3e?.generatedBy === 'build-default-gear';

/** Every item document in every pack: `{ pack, key, doc, top }` (`top` = not embedded on an actor). */
function* items(entries, pack) {
  for (const [key, doc] of entries) {
    if (key.startsWith('!items!')) yield { pack, key, doc, top: true };
    else if (/^![a-z]+\.items!/.test(key)) yield { pack, key, doc, top: false };
  }
}

const levelOf = doc => (Number(doc.system?.rating) > 0 ? Number(doc.system.rating) : (ModRatings.splitName(doc.name)?.rating ?? 0));

/**
 * The per-level table from a list of item documents: `{ "kind|name": { level: { field: value } } }`, keeping only
 * the fields that differ between an item's levels. Pure. `conflicts` lists a level printed twice with different
 * numbers (the first is kept).
 */
export function buildTable(docs) {
  const fams = new Map();
  docs.forEach((doc, i) => {
    const key = ModRatings.keyOf(doc);
    const level = levelOf(doc);
    if (!key || !(level > 0)) return;
    (fams.get(key) ?? fams.set(key, []).get(key)).push({ key: i, doc, level });
  });
  const table = {}, conflicts = [];
  for (const [key, members] of [...fams].sort(([a], [b]) => a.localeCompare(b))) {
    const { levels, unplaced } = RatedFamilies.levels(members);
    for (const u of unplaced) conflicts.push(`${key} [${u.rating}]`);
    if (Object.keys(levels).length < 2) continue;         // one level is no choice
    table[key] = levels;
  }
  return { table, conflicts };
}

/**
 * The table the dropdown reads: the levels the packs print, plus every collapsed family's, plus the books' levels no
 * document carries (`extras`). Pure.
 */
export function tableFor(docs, collapsed = readCollapsed(), extras = {}) {
  const { table, conflicts } = buildTable(docs);
  const more = [];
  for (const [id, fam] of Object.entries(collapsed)) {
    const key = tableKeyOf(id);
    more.push(...RatedFamilies.merge(table, key, fam.levels));
  }
  for (const [key, levels] of Object.entries(extras)) RatedFamilies.merge(table, key, levels);
  for (const k of Object.keys(table)) if (Object.keys(table[k]).length < 2) delete table[k];
  const sorted = Object.fromEntries(Object.keys(table).sort().map(k => [k, Object.fromEntries(Object.entries(table[k]).sort(([a], [b]) => a - b))]));
  return { table: sorted, conflicts: [...conflicts.filter(c => !Object.keys(collapsed).some(id => c.startsWith(`${tableKeyOf(id)} [`))), ...more] };
}

/** Pack → `{ deleted id → kept id }` for every collapsed family — what `ModRatings.repointSource` reads. */
export function sourcesOf(collapsed = readCollapsed()) {
  const out = {};
  for (const fam of Object.values(collapsed)) {
    for (const id of fam.deleted ?? []) (out[fam.pack] ??= {})[id] = fam.keep;
  }
  return Object.fromEntries(Object.keys(out).sort().map(p => [p, Object.fromEntries(Object.keys(out[p]).sort().map(id => [id, out[p][id]]))]));
}

/**
 * Collapse one family to ONE document (`RatedFamilies`): its levels are returned to be kept in
 * `collapsed-mods.json`, every document but the lowest level's is removed from `entries`, and a level printed twice
 * with different numbers is kept as `unplaced` — for a person to check against the book.
 */
export function collapse(entries, pack, key) {
  const members = [...entries].filter(([k, d]) => k.startsWith('!items!') && ModRatings.keyOf(d) === key)
    .map(([k, d]) => ({ key: k, doc: d, level: levelOf(d) }));
  const plan = RatedFamilies.plan(members);
  if (!plan) return null;
  for (const k of plan.deleted) entries.delete(k);
  RatedFamilies.applyKeep(plan.keep.doc, plan.keep.level);
  const bare = k => String(k).replace(/^!items!/, '');
  return { pack, keep: bare(plan.keep.key), levels: plan.levels, unplaced: plan.unplaced, deleted: plan.deleted.map(bare) };
}

/** The text of `scripts/data/mod-rating-table.mjs`. */
export function renderTable(table, sources = {}) {
  const rows = Object.entries(table).map(([key, levels]) =>
    `  ${JSON.stringify(key)}: {\n${Object.entries(levels).map(([r, f]) => `    ${r}: ${JSON.stringify(f)},`).join('\n')}\n  },`);
  const src = Object.entries(sources).map(([pack, ids]) =>
    `  ${JSON.stringify(pack)}: {\n${Object.entries(ids).map(([from, to]) => `    ${JSON.stringify(from)}: ${JSON.stringify(to)},`).join('\n')}\n  },`);
  return `/**
 * Generated by tools/build-mod-ratings.mjs from packs-src and tools/data/collapsed-mods.json — do not edit (TODO 260).
 * "kind|item name" → level → the fields that differ between that item's printed levels.
 * Read by ModRatings (scripts/data/mod-ratings.mjs) for the item sheet's level dropdown and 🛒 Buy gear.
 */
export const MOD_RATING_TABLE = {
${rows.join('\n')}
};

/**
 * pack name → { deleted level document id → the document that kept its family }. A copy whose
 * \`_stats.compendiumSource\` names a deleted document is repointed by the 0.7.1 migration.
 */
export const COLLAPSED_SOURCES = {
${src.join('\n')}
};
`;
}

/** The unplaced rows in a set of records, for a report: `[{ family, pack, id, name, rating, row }]`. */
export const unplacedOf = (collapsed = readCollapsed()) =>
  Object.entries(collapsed).flatMap(([id, f]) => (f.unplaced ?? []).map(u => ({ family: id, pack: f.pack, ...u })));

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const check = process.argv.includes('--check');
  const at = process.argv.indexOf('--collapse');
  if (at >= 0) {
    const key = process.argv[at + 1];
    let found = false;
    for (const pack of readdirSync(SRC).sort()) {
      if (EXCLUDED_PACKS.includes(pack)) continue;
      const entries = readSourceDir(join(SRC, pack));
      const fam = collapse(entries, pack, key);
      if (!fam) continue;
      found = true;
      addFamilies('build-mod-ratings', [{ key, ...fam }]);
      writeSourceDir(join(SRC, pack), entries);
      console.log(`collapsed ${key} in ${pack}: kept ${fam.keep}, ${Object.keys(fam.levels).length} levels${fam.unplaced.length ? `, ${fam.unplaced.length} unplaced` : ''}`);
    }
    if (!found) { console.error(`no item "${key}" with two or more rated documents`); process.exit(1); }
    console.log('now run: node tools/build-mod-ratings.mjs && npm run packs:build');
    process.exit(0);
  }
  let renamed = 0, stale = 0, collapsedDocs = 0, collapsedFams = 0;
  const forTable = [];
  const newFamilies = [];
  for (const pack of readdirSync(SRC).sort()) {
    if (EXCLUDED_PACKS.includes(pack)) continue;
    const entries = readSourceDir(join(SRC, pack));
    let n = 0;
    for (const { doc } of items(entries, pack)) {
      if (!ModRatings.kindOf(doc)) continue;
      const delta = ModRatings.renameDelta(doc);
      if (delta && isGenerated(doc)) { stale++; console.log(`generated, still levelled: ${pack} ${doc.name} — re-run tools/build-default-gear.mjs`); }
      else if (delta) {
        if (check) console.log(`would rename  ${pack}: ${doc.name} → ${delta.name}`);
        else { doc.name = delta.name; if ('system.rating' in delta) (doc.system ??= {}).rating = delta['system.rating']; }
        n++;
      }
      // A vehicle mod with no level says so (null) — the field is new, and a missing one would fall back
      // to reading the name and the gear table (`itemRating`'s legacy path).
      if (!delta && ModRatings.kindOf(doc) === 'vehicle' && doc.system?.rating === undefined) {
        if (check) console.log(`would mark unlevelled  ${pack}: ${doc.name}`);
        else (doc.system ??= {}).rating = null;
        n++;
      }
    }
    // One document per family (hand-kept documents only; the generator collapses its own).
    for (const f of RatedFamilies.collapseEntries(entries, { skip: isGenerated })) {
      collapsedFams++; collapsedDocs += f.deleted.length; n += f.deleted.length;
      newFamilies.push({ ...f, pack });
      console.log(`${check ? 'would collapse' : 'collapsed'} ${pack}: ${f.key} — ${Object.keys(f.levels).length} levels, ${f.deleted.length} document(s) removed${f.unplaced.length ? `, ${f.unplaced.length} UNPLACED` : ''}`);
    }
    for (const { doc, top } of items(entries, pack)) if (top) forTable.push(doc);
    if (!n) continue;
    renamed += n;
    if (!check) writeSourceDir(join(SRC, pack), entries);
    console.log(`${check ? 'would change' : 'changed'} ${n} in ${pack}`);
  }
  if (!check && newFamilies.length) addFamilies('build-mod-ratings', newFamilies);
  const collapsed = readCollapsed();
  const { table, conflicts } = tableFor(forTable, collapsed, readExtraLevels());
  for (const c of conflicts) console.log(`⚠ printed twice with different numbers (first kept): ${c}`);
  const text = renderTable(table, sourcesOf(collapsed));
  const tableStale = !existsSync(TABLE_FILE) || readFileSync(TABLE_FILE, 'utf8') !== text;
  if (tableStale && !check) writeFileSync(TABLE_FILE, text);
  console.log(`${Object.keys(table).length} rated items in the table${tableStale ? (check ? ' — would rewrite it' : ' — written') : ''}`);
  console.log(`${collapsedFams} famil${collapsedFams === 1 ? 'y' : 'ies'} collapsed, ${collapsedDocs} document(s) removed`);
  if (renamed && !check) console.log(`${renamed} change(s) — now run: npm run packs:build`);
  process.exit(check && (renamed || stale || tableStale) ? 1 : 0);
}
