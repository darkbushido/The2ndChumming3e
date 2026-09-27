/**
 * Which 📒 Ledger entries belong to ANOTHER character · TODO 197. Pure, and imports nothing: `tools/ledger-cleanup.mjs`
 * embeds its source text in a GM console script, which has to run on a world whose installed system
 * predates the fix.
 *
 * Until TODO 197 every character with no ledger shared ONE array in memory, so an entry written for
 * one character was saved on others too. An entry is judged by the chain of numbers, not by being
 * shared: two characters can genuinely have the same entry (both at 6 karma, both awarded 3).
 *
 *   - Walk each character's entries newest-first from its CURRENT total. An entry whose `to` is the
 *     running total FITS (it explains the number) and moves the total back to its `from`.
 *   - An entry on this character only is its own, gap or not (an unlogged edit leaves a gap).
 *   - A shared entry that does not fit is FOREIGN when another holder claims it — it fits that
 *     character's chain, or its `by` is that character's player — and this character's player did
 *     not make it. Otherwise it is UNSURE and kept.
 *
 * ⚠ Removes only what another character provably explains. The GM reads the list before applying.
 *
 * @param {Array<{id:string, name:string, current:{karma:number, nuyen:number, pool:number},
 *                ledger:object[], owners:string[]}>} actors   `owners` = the non-GM owners' names
 * @returns {Array<{id, name, remove:number[], rows:Array<{idx, entry, verdict, why}>}>}
 */
export function classifyLedgers(actors) {
  const key = e => JSON.stringify(e);
  const holders = new Map();
  for (const a of actors) for (const e of a.ledger ?? []) {
    if (!holders.has(key(e))) holders.set(key(e), new Set());
    holders.get(key(e)).add(a.id);
  }
  const shared = e => (holders.get(key(e))?.size ?? 0) > 1;

  // Does entry `idx` fit this character's chain of totals?
  const fits = new Map();
  for (const a of actors) {
    const list = (a.ledger ?? []).map((entry, idx) => ({ entry, idx }));
    for (const kind of ['karma', 'nuyen', 'pool']) {
      let cur = Number(a.current?.[kind]) || 0;
      const chain = list.filter(x => x.entry?.kind === kind)
        .sort((x, y) => (Number(y.entry.when) - Number(x.entry.when)) || (y.idx - x.idx));
      for (const { entry, idx } of chain) {
        const ok = Number(entry.to) === cur || !shared(entry);
        fits.set(`${a.id}|${idx}`, Number(entry.to) === cur);
        if (ok) cur = Number(entry.from) || 0;
      }
    }
  }
  const fitsFor = (a, e) => (a.ledger ?? []).some((x, i) => key(x) === key(e) && fits.get(`${a.id}|${i}`));

  return actors.map(a => {
    const rows = (a.ledger ?? []).map((entry, idx) => {
      if (!shared(entry)) return { idx, entry, verdict: 'keep', why: 'only on this character' };
      if (fits.get(`${a.id}|${idx}`)) return { idx, entry, verdict: 'keep', why: "fits this character's totals" };
      const others = actors.filter(b => b.id !== a.id && holders.get(key(entry)).has(b.id));
      const claim = others.find(b => fitsFor(b, entry) || (b.owners ?? []).includes(entry.by));
      if ((a.owners ?? []).includes(entry.by)) return { idx, entry, verdict: 'keep', why: "made by this character's player" };
      if (claim) return { idx, entry, verdict: 'remove', why: `belongs to ${claim.name}` };
      return { idx, entry, verdict: 'unsure', why: 'shared, and no character explains it — kept' };
    });
    return { id: a.id, name: a.name, remove: rows.filter(r => r.verdict === 'remove').map(r => r.idx), rows };
  });
}
