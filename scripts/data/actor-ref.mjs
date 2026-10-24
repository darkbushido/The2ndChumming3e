/**
 * Naming an actor on a chat card so the button reaches the RIGHT one · TODO 260. Pure — no Foundry.
 *
 * Seen in play, 2026-10-24: marking one goon prone marked every goon copied from the same sidebar NPC, and a
 * freshly dragged token arrived with old statuses. Reproduced in `test-shadowrun`: three wounds assigned to Goon A
 * left the sidebar NPC, Goon A AND Goon B at 3.
 *
 * ⚠ **An unlinked token's actor has the SAME `id` as its sidebar actor.** Cards carried `actorId`, buttons did
 * `game.actors.get(actorId)`, and that is the sidebar actor — whose data every unlinked token of it inherits. So a
 * card must name a token actor by its **uuid** (`Scene.…Token.…Actor.…`), and a linked or world actor by its id
 * (unchanged, so every card already in a chat log keeps working).
 *
 * - `of(actor)`: the reference to WRITE — the uuid for a token actor, else the id.
 * - `resolve(ref, lookups)`: the actor to READ — an id through the world actors, anything else through the uuid
 *   lookup, and only an Actor. A plain id resolves exactly as `game.actors.get` did.
 * - `same(a, b)`: do two references (or actors) name the same actor? A token actor is never "the same" as its
 *   sidebar actor — that is the whole bug.
 */
export const ActorRef = {
  /** The reference to put on a card. `null` for no actor. */
  of(actor) {
    if (!actor) return null;
    return actor.isToken ? (actor.uuid ?? actor.id ?? null) : (actor.id ?? null);
  },

  /** Does this reference look like a document uuid rather than a bare id? */
  isUuid(ref) {
    return typeof ref === 'string' && ref.includes('.');
  },

  /**
   * The actor a reference names, or null.
   * @param {string|null|undefined} ref
   * @param {{ byId: (id: string) => any, byUuid: (uuid: string) => any }} lookups
   */
  resolve(ref, { byId, byUuid }) {
    if (!ref || typeof ref !== 'string') return null;
    if (!ActorRef.isUuid(ref)) return byId(ref) ?? null;
    let doc = null;
    try { doc = byUuid(ref) ?? null; } catch { doc = null; }
    return doc?.documentName === 'Actor' ? doc : null;
  },

  /** Do two references or actors name the same actor? */
  same(a, b) {
    const ra = typeof a === 'string' ? a : ActorRef.of(a);
    const rb = typeof b === 'string' ? b : ActorRef.of(b);
    return !!ra && ra === rb;
  },
};

/**
 * The rows of a target picker (TODO 260): one per TOKEN on the scene — each unlinked goon its own row, a linked
 * actor once however many tokens it has — numbered when names repeat ("SWAT Team Member 2"). `tokens` are
 * `{ name, actor }` (a token's `actor` is its own synthetic actor when unlinked). Each row's `ref` is
 * `ActorRef.of(actor)`. `keep(actor)` filters (live, not the attacker…). Empty when the scene has no usable token —
 * the caller then falls back to the world's actors.
 */
export function tokenRows(tokens, keep = () => true) {
  const seen = new Set();
  const rows = [];
  for (const t of tokens ?? []) {
    const actor = t?.actor;
    if (!actor || !keep(actor)) continue;
    const ref = ActorRef.of(actor);
    if (!ref || seen.has(ref)) continue;
    seen.add(ref);
    rows.push({ ref, actor, name: actor.isToken ? (t.name || actor.name) : actor.name });
  }
  const count = new Map();
  for (const r of rows) count.set(r.name, (count.get(r.name) ?? 0) + 1);
  const nth = new Map();
  for (const r of rows) {
    if (count.get(r.name) < 2) continue;
    const i = (nth.get(r.name) ?? 0) + 1;
    nth.set(r.name, i);
    r.name = `${r.name} ${i}`;
  }
  return rows;
}

/** The reference to write on a card (Foundry-side shorthand for `ActorRef.of`). */
export const actorRef = actor => ActorRef.of(actor);

/**
 * The actor a card's reference names — what every `game.actors.get(id)` became (TODO 260). Reads the live
 * `game.actors` and `fromUuidSync` at call time, so a plain id behaves exactly as before, everywhere.
 */
export function actorFrom(ref) {
  return ActorRef.resolve(ref, {
    byId:   id => globalThis.game?.actors?.get?.(id),
    byUuid: uuid => globalThis.fromUuidSync?.(uuid),
  });
}
