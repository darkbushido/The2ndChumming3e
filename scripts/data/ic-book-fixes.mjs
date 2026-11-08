/**
 * The 0.9.0 migration for the `sr3e-mdf-ic` correction (TODO 128; `audit/matrix-defragged-audit.md`, "IC pack matched
 * against the stat blocks"). Pure — no Foundry — so it is tested without one.
 *
 * ⚠ **Foundry embeds, it does not link.** The pack now says what MDF pp.40-44 say (Mp = Rating² × Final Multiplier,
 * five gradings, Dataworm's page); an IC already in a world is its own copy and kept the old numbers, and a host that
 * stocked it kept a snapshot of the old Mp on its `stockedIC` row and in `memoryUsed`.
 *
 * ⚠ **This OVERWRITES, and argues for it:** a field is rewritten ONLY while it still equals the exact wrong value the
 * pack shipped (`OLD`), for an IC of that type. A GM who edited the Mp or the grading holds some other value and keeps
 * it — the guard is the houserule protection. Idempotent: once corrected nothing equals `OLD`, so a second run yields
 * null. IC actors: world actors and unlinked tokens (the migration walks both). Hosts: their stocked rows, and
 * `memoryUsed` only while it still equals the sum of the old rows.
 */
import { AGENT_IC, icMemory } from './ic-memory.mjs';

/** What `sr3e-mdf-ic` shipped before the correction: grading, Mp (at Rating 6), and the one wrong page. */
export const OLD = {
  'ARis':          { grading: 'White', mem: 12 },
  'Authenticator': { grading: 'White', mem: 12 },
  'Blaster':       { grading: 'Gray',  mem: 18 },
  'Crippler':      { grading: 'Gray',  mem: 18 },
  'Dataworm':      { grading: 'Gray',  mem: 20, page: 'matrix-defragged.34' },
  'Gemini':        { grading: 'Gray',  mem: 20 },
  'Hydra':         { grading: 'Gray',  mem: 20 },
  'Killer':        { grading: 'Black', mem: 25 },
  'Looper':        { grading: 'White', mem: 12 },
  'Mr. Medkit':    { grading: 'White', mem: 10 },
  'Ripper':        { grading: 'Black', mem: 30 },
  'Scrambler':     { grading: 'White', mem: 15 },
  'Sparky':        { grading: 'Gray',  mem: 18 },
  'Tar Baby':      { grading: 'Gray',  mem: 15 },
  'Tracker':       { grading: 'Gray',  mem: 15 },
};

const sameNumber = (a, b) => Number(a) === Number(b);

/** An IC actor: its Mp, its grading, and Dataworm's page — each only while still the old shipped value. */
function fixIC(actor) {
  const s = actor.system ?? {};
  const key = OLD[s.icType] ? s.icType : (OLD[actor.name] ? actor.name : null);
  if (!key) return null;
  const old = OLD[key], book = AGENT_IC[key];
  const delta = {};
  if (s.grading === old.grading && book.grading !== old.grading) delta['system.grading'] = book.grading;
  if (sameNumber(s.memoryRequired, old.mem)) delta['system.memoryRequired'] = icMemory(key, s.rating);
  if (old.page && s.bookPage === old.page) delta['system.bookPage'] = `matrix-defragged.${book.page}`;
  return Object.keys(delta).length ? delta : null;
}

/**
 * A host: each stocked row whose Mp is still the old pack value for an IC of that name, and `memoryUsed` while it
 * still equals the sum of the old rows. `ratingOf(actorId)` supplies the stocked IC's real Rating (the old pack Mp
 * did not scale with it); a row with no actor behind it is read at the pack's Rating 6.
 */
function fixHost(actor, ratingOf) {
  const rows = actor.system?.stockedIC;
  if (!Array.isArray(rows) || !rows.length) return null;
  let changed = false;
  const oldSum = rows.reduce((n, r) => n + (Number(r?.memoryRequired) || 0), 0);
  const fixed = rows.map(r => {
    const old = OLD[r?.name];
    if (!old || !sameNumber(r.memoryRequired, old.mem)) return r;
    changed = true;
    return { ...r, memoryRequired: icMemory(r.name, (r.actorId && ratingOf?.(r.actorId)) || 6) };
  });
  if (!changed) return null;
  const delta = { 'system.stockedIC': fixed };
  if (sameNumber(actor.system.memoryUsed, oldSum)) {
    delta['system.memoryUsed'] = fixed.reduce((n, r) => n + (Number(r?.memoryRequired) || 0), 0);
  }
  return delta;
}

export const IcBookFixes = {
  OLD,
  /** `fixActor` hook: an `update()` delta, or null. `ratingOf(ref)` looks a stocked IC's rating up (optional). */
  fixActor(actor, ratingOf) {
    if (actor?.type === 'ic') return fixIC(actor);
    if (actor?.type === 'host') return fixHost(actor, ratingOf);
    return null;
  },
};
