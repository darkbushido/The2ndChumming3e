/**
 * Recover the structured stats trapped in Mr. Johnson's Little Black Book notes · TODO 83
 *
 * All 62 actors in `sr3e-mr-johnsons-contacts` carry their real numbers as PROSE, in
 * `system.notes`, in one shape:
 *
 *   > Mr. Johnson's Little Black Book, p.53. PR 3. Karma Pool 6.
 *
 * So a Karma Pool the system has a field for was never written to it, and a **Professional
 * Rating** — a real SR3 NPC stat — had nowhere to go at all.
 *
 * ⚠ **NO FOUNDRY DEPENDENCY, deliberately.** Three consumers need this and only one of them
 * runs inside Foundry: the pack patcher (`tools/patch-johnson-contacts.mjs`, plain node), the
 * world migration (`SR3EMigrations`), and the tests. A static on `SR3EActor` could not be
 * imported by the tool without stubbing half the client API.
 *
 * ⚠ **The prose is KEPT.** It is the source citation, and page 53 is where a GM looks the NPC
 * up. This lifts the numbers out; it does not replace the note.
 */

/**
 * Parse a Little Black Book note. **Pure.**
 *
 * ⚠ **Every field is independently optional, and two shipped records prove it matters.**
 * *Metroplex Guardsman* has a page and nothing else; *Dock Worker* has a page and a PR but no
 * Karma Pool. A parser that required all three would silently skip both — and "60 of 62
 * patched" is the kind of number nobody questions. Each key is absent rather than zero when
 * the book does not give it, so a caller can tell "the book says 0" from "the book is silent".
 *
 * ⚠ **Tolerates the HTML wrapper.** The field is an `HTMLField`, so the shipped value is
 * `<p>…</p>`; tags are stripped before matching rather than being matched around.
 *
 * @param {string} notes  raw `system.notes`, HTML or plain
 * @returns {{page?: number, professionalRating?: number, karmaPool?: number}}
 */
export function parseJohnsonNotes(notes) {
  const text = String(notes ?? '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ');
  const out = {};

  // ⚠ `p.` only — NOT a bare number. "PR 3" would otherwise match a loose \d+ scan.
  const page = /\bp\.\s*(\d+)/i.exec(text);
  if (page) out.page = Number(page[1]);

  // ⚠ Word-boundary on PR so "PARASECURITY" or a stray "PR" inside a word cannot match.
  const pr = /\bPR\s*:?\s*(\d+)/i.exec(text);
  if (pr) out.professionalRating = Number(pr[1]);

  const kp = /\bKarma\s+Pool\s*:?\s*(\d+)/i.exec(text);
  if (kp) out.karmaPool = Number(kp[1]);

  return out;
}

/**
 * Is this note from the Little Black Book at all?
 *
 * ⚠ **The guard that keeps the migration honest.** `parseJohnsonNotes` will happily find a
 * "Karma Pool 6" in any actor's notes; only a book citation makes it this book's data. A GM
 * who typed "Karma Pool 6" as a reminder in their own NPC's notes must not have it written
 * into the field.
 */
export function isJohnsonNote(notes) {
  return /Mr\.?\s*Johnson'?s\s+Little\s+Black\s+Book/i.test(
    String(notes ?? '').replace(/<[^>]+>/g, ' '));
}
