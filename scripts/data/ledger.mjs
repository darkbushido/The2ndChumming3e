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
 * the three fields on any update and appends what changed, so the Session Rewards tool, Award Karma,
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
  nuyen:      { label: 'Nuyen',      kind: 'nuyen',  path: 'system.nuyen' },
  karmaPool:  { label: 'Karma Pool', kind: 'pool',   path: 'system.karmaPool' },
};

/** Room for a long campaign, but not unbounded — see the note above. */
export const MAX_ENTRIES = 500;

const num = n => (Number.isFinite(Number(n)) ? Number(n) : 0);
const str = s => String(s ?? '');

export const Ledger = {
  PAGE, TRACKED, MAX_ENTRIES,

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
  entry({ kind, delta, from, to, reason = '', by = '', when = Date.now() } = {}) {
    return {
      when: num(when), kind: str(kind), delta: num(delta),
      from: num(from), to: num(to), reason: str(reason).slice(0, 200), by: str(by).slice(0, 64),
    };
  },

  /**
   * What an update changes, as entries. `before` is the actor's current system data, `after` a map
   * of the tracked keys the update sets.
   *
   * ⚠ **A delta of 0 is NOT an entry.** Foundry re-sends unchanged fields on a form submit, so
   * logging every write would bury the real ones in noise within one session.
   */
  diff(before, after, { reason = '', by = '', when = Date.now() } = {}) {
    const out = [];
    for (const [key, spec] of Object.entries(TRACKED)) {
      if (!(key in (after ?? {}))) continue;
      const from = num(before?.[key]);
      const to   = num(after[key]);
      if (from === to) continue;
      out.push(Ledger.entry({ kind: spec.kind, delta: to - from, from, to, reason, by, when }));
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

  /** `+40` / `−1,500` — the sign is the point, so it is never dropped. */
  formatDelta(kind, delta) {
    const d = num(delta);
    const n = Math.abs(d).toLocaleString('en-US');
    return `${d < 0 ? '−' : '+'}${kind === 'nuyen' ? '¥' : ''}${n}`;
  },
};
