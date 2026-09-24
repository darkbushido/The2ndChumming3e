/**
 * Compendium search must survive a broken index entry — TODO 145.
 *
 * A pack document stored with `_id: null` has no uuid. Core's `_onMatchSearchDocuments` runs
 * `parseUuid(entry.uuid).collection` on every match and throws on it, so ONE such entry among the
 * 25 results blanks the whole list (the good medkits beside it too). Seen on a production server
 * (75 packs, one null-id document each). Reproduced in the dev world: `lookup('med')` returns
 * "Ford E-255M Media Van" with `_id: null, uuid: null`.
 */
import { readFileSync } from 'node:fs';
import { SearchEntries } from '../scripts/data/search-entries.mjs';

export const name = 'search-entries';

export async function run(t) {
  const pack = { 'Compendium.X.sr3e-a.Item.1': true };
  const resolve = uuid => (pack[uuid] ? { collection: 'X.sr3e-a' } : null);
  const good = { name: 'Medkit Rating 3', uuid: 'Compendium.X.sr3e-a.Item.1' };
  const nullId = { name: 'Ford E-255M Media Van', uuid: null, _id: null };
  const gone = { name: 'Orphan', uuid: 'Compendium.X.gone.Item.9' };

  t.ok('a resolvable entry is usable', SearchEntries.usable(good, resolve));
  t.ok('an entry with a null uuid is not', !SearchEntries.usable(nullId, resolve));
  t.ok('an entry whose pack no longer exists is not', !SearchEntries.usable(gone, resolve));
  t.ok('a missing entry is not', !SearchEntries.usable(undefined, resolve));
  t.ok('a resolver that throws is treated as unusable, not fatal',
    !SearchEntries.usable(good, () => { throw new Error('boom'); }));

  const set = new Set([good, nullId, gone]);
  const dropped = SearchEntries.prune(set, resolve);
  t.is('prune drops the two bad entries', dropped, 2);
  t.eq('…and keeps the good one', [...set].map(e => e.name), ['Medkit Rating 3']);
  t.is('an all-good set is untouched', SearchEntries.prune(new Set([good]), resolve), 0);

  const dir = readFileSync(new URL('../scripts/SR3ECompendiumDirectory.js', import.meta.url), 'utf8');
  t.ok('the sidebar prunes the matches after core has found them',
    /_matchSearchDocuments\(query, documents\)\s*\{\s*super\._matchSearchDocuments\(query, documents\);\s*SearchEntries\.prune\(documents,/.test(dir));
}
