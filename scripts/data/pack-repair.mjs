/**
 * Which broken compendium entries are safe to remove. Pure — no Foundry.
 *
 * Some installs carry a pack document stored under the key `!items!null` / `!actors!null` with
 * `_id: null` — one in each of ~75 packs on the servers checked (TODO 145). The SHIPPED packs are
 * clean (the v0.6.0 tag has none); older builds shipped them, full of Foundry scaffolding
 * (`_stats`, `ownership`, `folder`, `sort`), the signature of `pack.importDocument`, and a Foundry
 * update does not replace an existing pack database, so they stay for good. They crash core's
 * compendium search (see `search-entries.mjs`) and duplicate a properly keyed document.
 *
 * ⚠ **Only a PROVABLE duplicate is removable** — the same rule `tools/check-packs.mjs --fix` uses: a
 * broken entry goes only when a properly keyed entry of the same name and type sits in the same pack.
 * Anything else is reported and left alone; the GM's data is never guessed at.
 */
export const PackRepair = {
  /** An index entry with no usable id. */
  isBroken(entry) {
    return entry?._id === null || entry?._id === undefined || entry?._id === '';
  },

  /**
   * @param {Iterable<{_id:any,name:string,type:string}>} entries a pack's index entries
   * @returns {{broken:object[], removable:object[], kept:object[]}}
   */
  plan(entries) {
    const all = [...entries ?? []];
    const good = all.filter(e => !PackRepair.isBroken(e));
    const broken = all.filter(e => PackRepair.isBroken(e));
    const twin = b => good.some(g => g.name === b.name && g.type === b.type);
    return {
      broken,
      removable: broken.filter(twin),
      kept: broken.filter(b => !twin(b)),
    };
  },
};
