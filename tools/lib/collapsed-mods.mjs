/**
 * `tools/data/collapsed-mods.json` — every rated family collapsed to ONE pack document · TODO 261.
 *
 * Their levels can no longer be read off the packs, so they live here and are merged into the generated level
 * table (`scripts/data/mod-rating-table.mjs`). Two tools write it, each its own records:
 *
 *   - `tools/build-default-gear.mjs` (`by: 'build-default-gear'`) — the generated gear packs. It recomputes its
 *     families on EVERY run, so it replaces all of its records (`replaceFamilies`);
 *   - `tools/build-mod-ratings.mjs` (`by: 'build-mod-ratings'`) — the hand-kept packs. Its documents are gone
 *     once collapsed and cannot be recomputed, so it only ADDS (`addFamilies`).
 *
 * A record: `{ pack, by, keep, levels: { level: fields }, deleted: [ids], folded?: [ids], unplaced?: [rows] }`.
 * It is keyed by the table key (`kind|name`), with `@<pack>` added when two packs collapse the same key.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export const COLLAPSED_FILE = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'collapsed-mods.json');

const ABOUT = 'Rated families collapsed to ONE pack document (tools/build-mod-ratings.mjs, tools/build-default-gear.mjs). Their levels live here and are merged into scripts/data/mod-rating-table.mjs; `deleted` lists the level documents that went, so a copy linked to one is repointed. TODO 261.';

/** The file's `{ about, families }`, or an empty one. */
export const readDoc = (file = COLLAPSED_FILE) => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : { about: ABOUT, families: {} });

/** The families only: `{ id: record }`. */
export const readCollapsed = (file = COLLAPSED_FILE) => readDoc(file).families;

/** The table key a record id stands for (`kind|name@pack` → `kind|name`). */
export const tableKeyOf = id => String(id).replace(/@[^@|]+$/, '');

const id = (key, pack, taken) => (taken.has(key) ? `${key}@${pack}` : key);

const sortKeys = families => Object.fromEntries(Object.keys(families).sort().map(k => [k, families[k]]));

const write = (doc, file) => {
  doc.about = ABOUT;
  doc.families = sortKeys(doc.families);
  writeFileSync(file, JSON.stringify(doc, null, 2) + '\n');
};

const record = f => {
  const { key, ...rest } = f;
  void key;
  const out = { pack: rest.pack, by: rest.by, keep: rest.keep, levels: rest.levels, deleted: [...(rest.deleted ?? [])].sort() };
  if (rest.folded?.length) out.folded = rest.folded;
  if (rest.duplicates?.length) out.duplicates = rest.duplicates;
  if (rest.unplaced?.length) out.unplaced = rest.unplaced;
  return out;
};

/** Replace every record written by `by` with these families (each `{ key, pack, … }`). */
export function replaceFamilies(by, families, file = COLLAPSED_FILE) {
  const doc = readDoc(file);
  for (const k of Object.keys(doc.families)) if (doc.families[k].by === by) delete doc.families[k];
  for (const f of families) doc.families[id(f.key, f.pack, new Set(Object.keys(doc.families)))] = record(f);
  write(doc, file);
}

/** Add these families, keeping every record already there (a re-run finds nothing left to collapse). */
export function addFamilies(by, families, file = COLLAPSED_FILE) {
  const doc = readDoc(file);
  for (const f of families) {
    const taken = new Set(Object.keys(doc.families));
    // Already recorded for this pack (same key, same kept document)? A second pass adds nothing.
    const have = [...taken].find(k => tableKeyOf(k) === f.key && doc.families[k].pack === f.pack);
    if (have) continue;
    doc.families[id(f.key, f.pack, taken)] = record({ ...f, by });
  }
  write(doc, file);
}
