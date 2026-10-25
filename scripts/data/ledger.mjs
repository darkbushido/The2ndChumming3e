/**
 * The karma and nuyen ledger — what a character earned and spent, and why (TODO 79). Pure — no Foundry.
 *
 * Raised 2026-08-31: the sheet holds only current totals, so a GM cannot answer *"where did that 40
 * karma go?"* and a player who mistypes has nothing to restore from.
 *
 * ⚠ **THE TOTALS STAY EDITABLE.** The ethos here is that a GM is never fighting the system, so this
 * is a *record*, not a gate: an unexplained in-place edit is logged with an empty reason rather than
 * refused. A ledger that became the only way to change a number would be a guardrail, which is
 * exactly what this project does not build.
 *
 * ⚠ **Every entry is derived from the WRITE, not from a call site.** `SR3EActor._preUpdate` diffs
 * the tracked fields on any update and appends what changed, so the Session Rewards tool, Award Karma,
 * the Spend calculator, a healing bill and a player typing in the box are all recorded by the same
 * code. Instrumenting the ten call sites instead would silently miss the eleventh — and the eleventh
 * is the one a future feature adds.
 *
 * ⚠ **Append-only for players.** `reconcile` refuses an update that shortens or rewrites existing
 * entries unless a GM made it; a player may add to their history but not rewrite it. They can still
 * set their karma to 9,999 — that is the ethos — but the ledger will say they did.
 *
 * ⚠ **Bounded.** An actor document carries its whole ledger, so it is capped at `MAX_ENTRIES` and
 * trimmed oldest-first. The cap is generous (a campaign's worth) but it exists: an unbounded array
 * on a document that is broadcast on every update is a performance bug waiting to happen.
 */
export const PAGE = 'TODO 79';

/** The fields worth a line in the ledger, and how each is labelled. */
export const TRACKED = {
  karma:      { label: 'Good Karma', kind: 'karma',  path: 'system.karma' },
  // The career total (SR3 p.242). Untracked until the Karma audit of 2026-10-25: an award left a Good
  // Karma line and a Pool line but no record of the total behind them, and a GM's edit of it none at all.
  totalKarma: { label: 'Total Karma', kind: 'total', path: 'system.totalKarma' },
  nuyen:     { label: 'Nuyen',      kind: 'nuyen',  path: 'system.nuyen' },
  karmaPool:  { label: 'Karma Pool', kind: 'pool',   path: 'system.karmaPool' },
  // Karma Pool spent since the GM's refresh (SR3 p.246). Its own line, because a spend comes back
  // and a burn (a drop in `karmaPool`) does not — the ledger has to tell them apart.
  karmaPoolSpent: { label: 'Pool spent', kind: 'poolSpent', path: 'system.karmaPoolSpent' },
};

/** The TRACKED spec for an entry's `kind` ('pool' → karmaPool), or undefined. */
export const specForKind = kind => Object.values(TRACKED).find(s => s.kind === kind);

/** Room for a long campaign, but not unbounded — see the note above. */
export const MAX_ENTRIES = 500;

const num = n => (Number.isFinite(Number(n)) ? Number(n) : 0);
const str = s => String(s ?? '');

export const Ledger = {
  PAGE, TRACKED, MAX_ENTRIES, specForKind,

  /** The entries on an actor's system data. Always an array. */
  of(sys) {
    const l = sys?.ledger;
    return Array.isArray(l) ? l : [];
  },

  /**
   * One entry. `when` is an epoch millisecond so it sorts and formats anywhere; `by` is a user NAME
   * rather than an id, because the id is meaningless once that user is deleted and the whole point
   * is to still be readable a year later.
   */
  entry({ kind, delta, from, to, reason = '', by = '', when = Date.now(), revert = null } = {}) {
    return {
      when: num(when), kind: str(kind), delta: num(delta),
      from: num(from), to: num(to), reason: str(reason).slice(0, 200), by: str(by).slice(0, 64),
      // How to take a Good Karma purchase back (TODO 212) — see `revertPlan`. Plain JSON, or absent.
      ...(revert && typeof revert === 'object' ? { revert: JSON.parse(JSON.stringify(revert)) } : {}),
    };
  },

  /**
   * What an update changes, as entries. `before` is the actor's current system data, `after` a map
   * of the tracked keys the update sets.
   *
   * ⚠ **A delta of 0 is NOT an entry.** Foundry re-sends unchanged fields on a form submit, so
   * logging every write would bury the real ones in noise within one session.
   */
  diff(before, after, { reason = '', by = '', when = Date.now(), revert = null } = {}) {
    const out = [];
    for (const [key, spec] of Object.entries(TRACKED)) {
      if (!(key in (after ?? {}))) continue;
      const from = num(before?.[key]);
      const to   = num(after[key]);
      if (from === to) continue;
      // A purchase's reversal rides on the Good Karma line (the line that was SPENT); an award's on the Total
      // Karma line, the one an award always moves — all of it can go to the Pool, leaving no Good Karma line.
      const carries = revert?.award
        ? spec.kind === 'total' && to > from
        : spec.kind === 'karma' && to < from;
      out.push(Ledger.entry({ kind: spec.kind, delta: to - from, from, to, reason, by, when,
        revert: carries ? revert : null }));
    }
    return out;
  },

  /* ── The GM's undo for a Good Karma purchase · TODO 212 ─────────────────────────────────────
   *
   * Reported in play (2026-10-11): a GM had no way to take back a karma spend. The Spend Karma
   * calculator now writes, beside each purchase's karma line, `revert`:
   *   { actor: { path: oldValue, … }, items: [{ id, name, update: { path: oldValue } }],
   *     deleteItems: [{ id, name }] }
   * — what to set back, and anything the purchase created. The ↺ on that ledger line refunds the
   * karma and applies what the GM leaves ticked, then marks the line `reverted` so it is undone once.
   *
   * ⚠ **Reversal, not deletion.** The refund is a NEW line ("↺ Undid: …"); the original stays,
   * marked. The ledger is a history, and an undo is part of it.
   */

  /**
   * Can this entry be undone? A Good Karma spend that carries its reversal, or (TODO 267) a karma AWARD's Total
   * Karma line that carries its amounts — and was not undone yet.
   */
  undoable(e) {
    if (!e || !e.revert || e.reverted) return false;
    if (e.kind === 'karma') return num(e.delta) < 0 && !e.revert.award;
    if (e.kind === 'total') return num(e.delta) > 0 && !!e.revert.award;
    return false;
  },

  /**
   * The entry an undo button names, by its time, kind and reason (positions shift when old ones are trimmed).
   * ⚠ The kind matters: an award writes its Good Karma and Total Karma lines with the same time and reason.
   */
  find(entries, when, reason = null, kind = 'karma') {
    const list = Array.isArray(entries) ? entries : [];
    return list.findIndex(e => num(e?.when) === num(when) && e?.kind === kind
      && (reason === null || str(e.reason) === str(reason)));
  },

  /**
   * Undoing a karma award (TODO 267, the maintainer 2026-10-25): what to take back off the CURRENT values, as rows
   * the GM can untick. `revert.award` holds the amounts the award added — `{ karma, totalKarma, karmaPool, nuyen }`
   * (plain keys: Foundry expands dotted keys in update options). Subtracting the amounts, not restoring the old
   * values, keeps whatever happened since. ⚠ Good Karma already spent can go below 0 — reported, never refused;
   * the Pool and nuyen stop at 0 (their fields' minimum). Pure.
   * @returns {null | Array<{key: string, path: string, label: string, delta: number, from: number, to: number, short: boolean}>}
   */
  awardPlan(e, sys) {
    if (!Ledger.undoable(e) || e.kind !== 'total') return null;
    const a = e.revert.award ?? {};
    const FIELDS = [
      ['karma', 'Good Karma', false], ['totalKarma', 'Total Karma', false],
      ['karmaPool', 'Karma Pool', true], ['nuyen', 'Nuyen', true],
    ];
    return FIELDS.filter(([k]) => num(a[k]) > 0).map(([key, label, floored]) => {
      const from = num(sys?.[key]);
      const raw  = from - num(a[key]);
      const to   = floored ? Math.max(0, raw) : raw;
      return { key, path: `system.${key}`, label, delta: -num(a[key]), from, to, short: raw < 0 };
    });
  },

  /** A NEW ledger with entry `index` marked reverted. Never mutates what it was given. */
  markReverted(entries, index) {
    const list = Array.isArray(entries) ? entries : [];
    return list.map((e, i) => (i === index ? { ...e, reverted: true } : e));
  },

  /**
   * What undoing `e` would do, as rows the GM can untick: the refund first, then each field and item.
   * `refund` is the karma given back (the spend's size). Pure — the sheet applies it.
   */
  revertPlan(e) {
    if (!Ledger.undoable(e) || e.kind !== 'karma') return null;   // an award's line has `awardPlan`
    const r = e.revert ?? {};
    // ⚠ Foundry EXPANDS dotted keys in update options, so `{ 'system.x': 1 }` comes back as
    // `{ system: { x: 1 } }` (found live, 2026-10-11). Flatten to paths again so each row names its field.
    return {
      refund:      Math.abs(num(e.delta)),
      actor:       Object.entries(Ledger.flatten(r.actor ?? {})).map(([path, value]) => ({ path, value })),
      items:       (Array.isArray(r.items) ? r.items : []).filter(x => x?.id && x.update && typeof x.update === 'object')
        .map(x => ({ ...x, update: Ledger.flatten(x.update) })),
      deleteItems: (Array.isArray(r.deleteItems) ? r.deleteItems : []).filter(x => x?.id),
    };
  },

  /** `{ system: { a: { b: 1 } } }` → `{ 'system.a.b': 1 }`. Arrays and null are values, not branches. */
  flatten(obj, prefix = '') {
    const out = {};
    for (const [k, v] of Object.entries(obj ?? {})) {
      const path = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(out, Ledger.flatten(v, path));
      else out[path] = v;
    }
    return out;
  },

  /** Append, oldest trimmed first. Returns a NEW array — never mutates what it was given. */
  append(entries, added) {
    const all = [...(Array.isArray(entries) ? entries : []), ...(Array.isArray(added) ? added : [added])]
      .filter(e => e && typeof e === 'object');
    return all.length > MAX_ENTRIES ? all.slice(all.length - MAX_ENTRIES) : all;
  },

  /**
   * May `next` replace `current`? Append-only unless a GM says otherwise.
   *
   * ⚠ **Compared by CONTENT, not by length.** A same-length array with an edited reason is a
   * rewrite; checking only that it did not get shorter would wave that through.
   * @returns {{ok:boolean, why:string}}
   */
  reconcile(current, next, { isGM = false } = {}) {
    if (isGM) return { ok: true, why: '' };
    const cur = Array.isArray(current) ? current : [];
    const nxt = Array.isArray(next) ? next : [];
    if (nxt.length < cur.length) return { ok: false, why: 'the ledger is append-only — entries cannot be removed' };
    for (let i = 0; i < cur.length; i++) {
      if (JSON.stringify(cur[i]) !== JSON.stringify(nxt[i])) {
        return { ok: false, why: 'the ledger is append-only — past entries cannot be changed' };
      }
    }
    return { ok: true, why: '' };
  },

  /**
   * Is a new actor arriving with ANOTHER actor's history? · TODO 193.
   *
   * ⚠ **A copy is a new character, not the old one.** Foundry's Duplicate copies the whole document,
   * `system.ledger` included, so the copy showed the source's awards and purchases as its own —
   * reported in play as "the ledger is adding things to the wrong characters". A duplicate carries
   * `_stats.duplicateSource`; the GM copy verb (`sr3e.actor.create` with `fromActorId`) clears the
   * ledger itself, because it deletes `_stats`.
   * A compendium import is NOT a copy here: it is how a character is moved between worlds, and its
   * history should travel with it.
   */
  inherited(data) {
    return !!data?._stats?.duplicateSource && Ledger.of(data?.system).length > 0;
  },

  /**
   * Has anything written this kind since the ledger began? A migration that recognises a value by its
   * old default asks this first: once the ledger shows a write, the value is somebody's — a burned Karma
   * Pool point (SR3 p.246, "gone forever") can land back on the old default, and `force()` re-runs
   * everything (Karma audit, 2026-10-25). ⚠ A GM's ✕ on every such line hides the history from this too.
   */
  touched(sys, kind) {
    return Ledger.of(sys).some(e => e?.kind === kind);
  },

  /** A running total per kind, for reconciling the ledger against the sheet's numbers. */
  totals(entries) {
    const t = {};
    for (const e of Ledger.of({ ledger: entries })) t[e.kind] = num(t[e.kind]) + num(e.delta);
    return t;
  },

  /** Newest first, optionally one kind only — the order a table is read in. */
  recent(entries, { kind = null, limit = 20 } = {}) {
    return Ledger.of({ ledger: entries })
      .filter(e => !kind || e.kind === kind)
      .slice()
      .sort((a, b) => num(b.when) - num(a.when))
      .slice(0, Math.max(0, limit));
  },

  /**
   * Newest first, each with its index in the STORED array — what a row needs to be deleted by
   * (TODO 153). `limit` null = all.
   */
  rows(entries, { limit = null } = {}) {
    const all = Ledger.of({ ledger: entries }).map((entry, idx) => ({ entry, idx }))
      .sort((a, b) => (num(b.entry.when) - num(a.entry.when)) || (b.idx - a.idx));
    return limit == null ? all : all.slice(0, Math.max(0, limit));
  },

  /**
   * The ledger without entry `idx` — the GM's ✕ (TODO 153). Returns a NEW array, or null when the
   * entry at `idx` is not `expected` (the sheet was drawn before another write moved the entries),
   * so a stale click never deletes the wrong line.
   * ⚠ History only: the karma / nuyen totals are not touched.
   */
  without(entries, idx, expected) {
    const list = Ledger.of({ ledger: entries });
    if (!Number.isInteger(idx) || idx < 0 || idx >= list.length) return null;
    if (JSON.stringify(list[idx]) !== JSON.stringify(expected)) return null;
    return list.filter((_e, i) => i !== idx);
  },

  /**
   * The "Why" an entry shows (the maintainer, 2026-09-27: never a dash). A write that named no reason
   * came from someone typing in the box — every tool that changes karma or nuyen passes
   * `ledgerReason` — so it reads "By hand".
   */
  why(entry) {
    const r = str(entry?.reason).trim();
    return r || 'By hand';
  },

  /** `+40` / `−1,500` — the sign is the point, so it is never dropped. */
  formatDelta(kind, delta) {
    const d = num(delta);
    const n = Math.abs(d).toLocaleString('en-US');
    return `${d < 0 ? '−' : '+'}${kind === 'nuyen' ? '¥' : ''}${n}`;
  },
};
