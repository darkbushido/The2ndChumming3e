/**
 * Compendium pack integrity check — for the BROWSER CONSOLE of a running Foundry.
 *
 * Sibling to `tools/check-packs.mjs`, for the case that tool cannot reach: a **production
 * server** you will not copy packs off and cannot shut down to run a node script against.
 * Paste this into the F12 console as **GM** and read the output.
 *
 *   ⚠ READ-ONLY. It opens no writes, changes no documents, and touches no settings. Safe on
 *   a live server with players connected. The only cost is loading every pack's documents,
 *   which is a few seconds and some memory.
 *
 * ## What it can and cannot see, and why that matters
 *
 * `check-packs.mjs` reads LevelDB directly, so it sees exactly what is on disk. This one sees
 * what **Foundry surfaces**, which is not the same thing. Checked against the installed
 * client source (14.365) rather than assumed:
 *
 * - **The INDEX is the reliable signal.** `getIndex` ends with `this.index.set(i._id, indexed)`,
 *   so an entry whose `_id` is null lands under a **null key** rather than being dropped.
 *   Confirmed live against a deliberately corrupted pack: the entry appears, with its name.
 * - **`pack.invalidDocumentIds` is NOT.** It looked like the strongest signal from reading
 *   `compendium-collection.mjs:415`, and it is empty for this fault — a null `_id` does not
 *   fail validation. Still checked, because it costs nothing and catches other problems.
 * - **`doc.id` is worse than useless here.** On 14.365 every document from `getDocuments()`
 *   reports `_id: null` — all 43 of them in a 43-document pack, the good ones included —
 *   while the index carries correct ids. An earlier draft checked it and would have reported
 *   every document in every pack as broken.
 *
 * ⚠ **A clean result here is weaker than a clean result from `check-packs.mjs`.** That one
 * reads the bytes on disk; this one sees what Foundry chooses to surface. Treat a pass as
 * "nothing is reaching the game wrong", not as "the files on disk are perfect".
 *
 * ⚠ **It does not fix anything, deliberately.** Packs are usually locked, writes from the
 * console on a live server are their own hazard, and the safe-deletion test needs to compare
 * against every record in the pack — which is what the node tool is for, with the server down.
 */
(async () => {
  const SYSTEM = 'The2ndChumming3e';

  // Only this system's packs. A module's broken pack is not ours to report on, and on a busy
  // server the module packs are most of the list.
  const packs = game.packs.filter(p => p.metadata.packageType === 'system'
    || p.metadata.packageName === SYSTEM);

  console.log(`%cSR3E pack check — ${packs.length} packs, Foundry ${game.version}, system ${game.system.version}`,
    'font-weight:bold;font-size:13px');
  if (!game.user.isGM) console.warn('Not a GM — some packs may be hidden from you, so counts can be low.');

  const canon = o => Array.isArray(o) ? o.map(canon)
    : (o && typeof o === 'object')
      ? Object.fromEntries(Object.keys(o).sort().map(k => [k, canon(o[k])]))
      : o;
  // Same content definition as tools/check-packs.mjs: identity, scaffolding and the
  // auto-generated prototypeToken are excluded, because they differ by construction between
  // a document written by the pack builder and one Foundry hydrated itself.
  const sig = d => JSON.stringify(canon({
    name: d?.name, type: d?.type, img: d?.img,
    system: d?.system?.toObject?.() ?? d?.system,
  }));

  const rows = [];
  const faults = [];

  for (const pack of packs) {
    let index, docs;
    try {
      index = await pack.getIndex();
      docs  = await pack.getDocuments();
    } catch (err) {
      faults.push({ pack: pack.collection, kind: 'UNREADABLE', detail: String(err?.message ?? err) });
      continue;
    }

    // 1. Foundry's own verdict. ⚠ Verified EMPTY for this fault on 14.365 — a null-id
    //    record does not fail validation, so this is a bonus signal for other problems,
    //    not the one that catches null ids. Kept because it costs nothing.
    for (const id of pack.invalidDocumentIds ?? []) {
      faults.push({ pack: pack.collection, kind: 'INVALID', detail: `_id ${id} failed validation` });
    }

    // 2. Index entries with no usable id — the shape the on-disk `!items!null` records take.
    for (const [key, entry] of index.entries()) {
      if (key === null || key === undefined || key === 'null' || key === 'undefined'
        || !entry?._id) {
        faults.push({ pack: pack.collection, kind: 'NULL_ID',
          detail: `${entry?.name ?? '(unnamed)'} — index key ${JSON.stringify(key)}` });
      }
    }

    // ⚠ **NOT `doc.id`.** Verified live on 14.365: every document returned by
    // `getDocuments()` reports `_id: null` — all 43 in a 43-document pack, including
    // perfectly good ones — while the INDEX carries the correct ids. Checking documents
    // would report every document in every pack as broken. The index is the reliable
    // source, and it demonstrably surfaces the real fault (an entry under a null key).

    // 4. The visible symptom: one name, two identical documents. Reported separately because
    //    a repeated NAME can be legitimate — sr3e-sr3-melee ships three distinct "Spur"s —
    //    so only identical CONTENT counts as a duplicate.
    const byName = new Map();
    for (const d of docs) (byName.get(d.name) ?? byName.set(d.name, []).get(d.name)).push(d);
    for (const [name, group] of byName) {
      if (group.length < 2) continue;
      const sigs = new Map();
      for (const d of group) sigs.set(sig(d), (sigs.get(sig(d)) ?? 0) + 1);
      for (const [, n] of sigs) {
        if (n > 1) faults.push({ pack: pack.collection, kind: 'DUPLICATE',
          detail: `${name} — ${n} identical copies` });
      }
    }

    rows.push({ pack: pack.collection, type: pack.documentName,
      index: index.size, documents: docs.length, invalid: (pack.invalidDocumentIds?.size ?? 0) });
  }

  console.table(rows);

  if (!faults.length) {
    console.log('%cNo problems found.', 'color:#3c3;font-weight:bold');
    console.log(`Checked ${rows.length} packs, ${rows.reduce((a, r) => a + r.documents, 0)} documents.`);
  } else {
    console.log(`%c${faults.length} problem(s) found:`, 'color:#e33;font-weight:bold');
    console.table(faults);
  }

  // A single string to copy back out of the console — console.table does not survive a
  // copy/paste, and a screenshot of 82 rows helps nobody.
  const summary = [
    `SR3E pack check — Foundry ${game.version}, system ${game.system.version}`,
    `packs=${rows.length} documents=${rows.reduce((a, r) => a + r.documents, 0)} faults=${faults.length}`,
    ...faults.map(f => `  ${f.kind}  ${f.pack}  ${f.detail}`),
  ].join('\n');
  console.log('%cCopy the block below:', 'font-weight:bold');
  console.log(summary);
  try { await navigator.clipboard.writeText(summary); console.log('(also copied to clipboard)'); }
  catch { /* clipboard needs focus/permission; the text above is the fallback */ }
  return summary;
})();
