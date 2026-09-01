/**
 * Recovering the stats trapped in Little Black Book notes · TODO 83
 *
 * All 62 actors in `sr3e-mr-johnsons-contacts` carry their real numbers as prose:
 *
 *   > Mr. Johnson's Little Black Book, p.53. PR 3. Karma Pool 6.
 *
 * So a Karma Pool the system has a field for was never written to it, and Professional Rating
 * had nowhere to go at all.
 *
 * ⚠ **The two incomplete records are the point of this file.** *Metroplex Guardsman* gives a
 * page and nothing else; *Dock Worker* gives a page and a PR but no Karma Pool. A parser that
 * required all three would skip both — and "60 of 62 patched" is the kind of number nobody
 * questions.
 */
import { parseJohnsonNotes, isJohnsonNote } from '../scripts/data/johnson-notes.mjs';

export const name = 'johnson-notes';

export async function run(t) {

  /* ── The shape 60 of the 62 actually ship ────────────────────────────────────────────── */

  const full = parseJohnsonNotes("<p>Mr. Johnson's Little Black Book, p.53. PR 3. Karma Pool 6.</p>");
  t.is('the page is read', full.page, 53);
  t.is('the Professional Rating is read', full.professionalRating, 3);
  t.is('the Karma Pool is read', full.karmaPool, 6);

  /* ⚠ The field is an HTMLField, so the shipped value is wrapped. Tags are stripped rather
   * than matched around — a parser written against the plain text would find nothing. */
  t.is('plain text parses identically',
    parseJohnsonNotes("Mr. Johnson's Little Black Book, p.53. PR 3. Karma Pool 6.").page, 53);

  /* ── The two incomplete shipped records ──────────────────────────────────────────────── */

  const guardsman = parseJohnsonNotes("<p>Mr. Johnson's Little Black Book, p.63.</p>");
  t.is('Metroplex Guardsman still yields its page', guardsman.page, 63);
  t.is('…and no PR key at all',        guardsman.professionalRating, undefined);
  t.is('…and no Karma Pool key',       guardsman.karmaPool, undefined);

  const dock = parseJohnsonNotes("<p>Mr. Johnson's Little Black Book, p.67. PR 2.</p>");
  t.is('Dock Worker yields page and PR', dock.professionalRating, 2);
  t.is('…and omits Karma Pool',          dock.karmaPool, undefined);

  /* ⚠ **Absent, not zero.** A caller must be able to tell "the book is silent" from "the book
   * says 0" — writing 0 into the field would look like a deliberate value and a fill-blanks
   * migration could never correct it afterwards. */
  t.ok('a missing value is undefined rather than 0',
    !('karmaPool' in dock) && dock.karmaPool !== 0);

  /* ── Things that must NOT match ──────────────────────────────────────────────────────── */

  /* ⚠ `PR` needs a word boundary. "Parasecurity Expert" is a shipped contact name, and a
   * loose /PR\s*\d/ against a note mentioning it would be a plausible mis-parse. */
  t.is('PR inside a word does not match',
    parseJohnsonNotes('PARASECURITY 4 expert').professionalRating, undefined);

  /* ⚠ The page needs its `p.`. A bare number scan would read "PR 3" as page 3. */
  t.is('a bare number is not a page', parseJohnsonNotes('PR 3. Karma Pool 6.').page, undefined);
  t.is('…while PR and Pool still read', parseJohnsonNotes('PR 3. Karma Pool 6.').karmaPool, 6);

  t.is('empty notes yield nothing',      Object.keys(parseJohnsonNotes('')).length, 0);
  t.is('undefined does not throw',       Object.keys(parseJohnsonNotes(undefined)).length, 0);
  t.is('unrelated prose yields nothing',
    Object.keys(parseJohnsonNotes('<p>A friendly fixer who owes the team a favour.</p>')).length, 0);

  /* ── The citation guard ──────────────────────────────────────────────────────────────── */

  /* ⚠ **This is what keeps the migration honest.** `parseJohnsonNotes` will find a "Karma Pool
   * 6" in anyone's notes; only a book citation makes it this book's data. A GM who typed
   * "Karma Pool 6" as a reminder on their own NPC must not have it written into the field. */
  t.ok('a Little Black Book note is recognised',
    isJohnsonNote("<p>Mr. Johnson's Little Black Book, p.53. PR 3. Karma Pool 6.</p>"));
  t.ok('…without the apostrophe too',
    isJohnsonNote('Mr Johnsons Little Black Book, p.53.'));
  t.ok("a GM's own note is NOT",
    !isJohnsonNote('<p>Tough guy. Karma Pool 6. PR 4.</p>'));
  t.ok('…even when it parses cleanly',
    parseJohnsonNotes('Karma Pool 6. PR 4.').karmaPool === 6
      && !isJohnsonNote('Karma Pool 6. PR 4.'));
  t.ok('empty notes are not a citation', !isJohnsonNote(''));
  t.ok('undefined is not a citation',    !isJohnsonNote(undefined));
}
