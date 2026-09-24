/**
 * Which compendium search matches are safe to show. Pure — no Foundry.
 *
 * Core's `CompendiumDirectory._onMatchSearchDocuments` does
 * `foundry.utils.parseUuid(entry.uuid).collection` for every match and throws
 * `Cannot read properties of null (reading 'collection')` when an entry has no uuid — which is
 * what a pack document stored with `_id: null` looks like in the index. One such entry in the 25
 * results aborts the render, so the sidebar search shows NOTHING for that query, including the
 * good matches beside it (TODO 145, seen on a production server: 75 packs carried one each).
 * We drop the unusable entries instead of letting them take the rest down.
 */
export const SearchEntries = {
  /** True when core can render this entry: it names a uuid whose pack collection resolves. */
  usable(entry, resolveCollection) {
    if (!entry?.uuid) return false;
    try { return !!resolveCollection(entry.uuid); } catch { return false; }
  },

  /** Remove every unusable entry from `set` in place and return how many were dropped. */
  prune(set, resolveCollection) {
    let dropped = 0;
    for (const entry of [...set]) {
      if (!SearchEntries.usable(entry, resolveCollection)) { set.delete(entry); dropped++; }
    }
    return dropped;
  },
};
