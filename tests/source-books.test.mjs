/**
 * Source-book filtering — SR3ESourceBooks.
 *
 * Runs against the REAL system.json, not a fixture, so a pack added with a book code
 * that has no SOURCE_BOOKS entry shows up here rather than in play.
 *
 * The two properties worth protecting are fail-visible ones: a pack with no book flag
 * (system content) and a pack whose book code the setting has never seen must BOTH stay
 * visible. Getting either wrong makes content vanish silently, which is far worse than
 * showing something that should have been hidden.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { installGlobals, installGame } from './helpers/foundry.mjs';

installGlobals();
const SYS  = 'The2ndChumming3e';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(root, 'system.json'), 'utf8'));

const { SOURCE_BOOKS, defaultAllowedBooks } = await import('../scripts/config.js');

// The setting values the module reads. Reassigned per scenario below. Keyed properly:
// returning one blob for every key made the edition gate read the allowed-books map.
let stored = {};
let edition = 'SR3';
installGame({ packs: manifest.packs });
globalThis.game.settings.get = (_ns, key) => (key === 'edition' ? edition : stored);

const { SR3ESourceBooks } = await import('../scripts/SR3ESourceBooks.js');
globalThis.game.sr3e = { SR3ESourceBooks };

export const name = 'source-books';

const allOn  = () => Object.fromEntries(Object.keys(SOURCE_BOOKS).map(c => [c, true]));
const allOff = () => Object.fromEntries(Object.keys(SOURCE_BOOKS).map(c => [c, false]));
const visible = () => globalThis.game.packs.filter(p => SR3ESourceBooks.packAllowed(p)).length;
const forType = type => globalThis.game.packs.filter(p => {
  const types = p.metadata?.flags?.[SYS]?.itemTypes;
  return Array.isArray(types) && types.includes(type) && SR3ESourceBooks.packAllowed(p);
}).length;

export async function run(t) {
  const packs      = globalThis.game.packs;
  const systemOnly = packs.filter(p => !p.metadata?.flags?.[SYS]?.book).length;
  const perBook    = {};
  for (const p of packs) {
    const b = p.metadata?.flags?.[SYS]?.book;
    if (b) perBook[b] = (perBook[b] ?? 0) + 1;
  }

  /* ---- registry integrity, against the real manifest ---- */
  const codes   = new Set(Object.keys(SOURCE_BOOKS));
  const orphans = Object.keys(perBook).filter(b => !codes.has(b));
  t.eq('every book code used by a pack has a SOURCE_BOOKS entry', orphans, []);
  t.ok('every registered book has a label and an edition',
    Object.values(SOURCE_BOOKS).every(b => b.label && b.edition));
  t.ok('the manifest declares at least one pack', packs.length > 0);

  /* ---- the filter ---- */
  stored = {};
  const defaults = defaultAllowedBooks();
  const hiddenAtDefault = Object.entries(defaults)
    .filter(([, on]) => !on)
    .reduce((n, [code]) => n + (perBook[code] ?? 0), 0);
  t.is('defaults hide exactly the packs of the default-off books',
    visible(), packs.length - hiddenAtDefault);

  stored = allOn();
  t.is('everything on shows every pack', visible(), packs.length);

  stored = allOff();
  t.is('everything off leaves only unflagged system packs', visible(), systemOnly);
  t.is('everything off empties the cyberware picker', forType('cyberware'), 0);

  stored = { ...allOff(), sr3: true };
  t.is('one book on shows that book plus system packs',
    visible(), (perBook.sr3 ?? 0) + systemOnly);

  /* ---- fail-visible ---- */
  stored = allOff();
  t.is('a pack with no book flag survives every book being off',
    SR3ESourceBooks.packAllowed({ metadata: { flags: { [SYS]: { itemTypes: ['skill'] } } } }), true);
  t.is('a pack with no flags at all survives',
    SR3ESourceBooks.packAllowed({ metadata: {} }), true);

  stored = { sr3: true };
  t.is('an unrecognised book code defaults to visible, never hidden',
    SR3ESourceBooks.packAllowed({ metadata: { flags: { [SYS]: { book: 'not-a-real-book' } } } }), true);

  /* ---- the picker follows the sidebar ---- */
  stored = allOn();
  const cyberAll = forType('cyberware');
  stored = { ...allOff(), sr3: true };
  t.ok('hiding books shrinks the item picker too',
    forType('cyberware') < cyberAll,
    `picker showed ${forType('cyberware')} of ${cyberAll} cyberware packs`);

  /* ---- edition gate ---- */
  const sr3Books = Object.entries(SOURCE_BOOKS).filter(([, b]) => b.edition === 'SR3').map(([c]) => c);
  const sr2Books = Object.entries(SOURCE_BOOKS).filter(([, b]) => b.edition === 'SR2').map(([c]) => c);
  t.ok('the registry knows about both editions', sr3Books.length > 0 && sr2Books.length > 0,
    `SR3 ${sr3Books.length}, SR2 ${sr2Books.length}`);

  stored = allOn();
  edition = 'SR3';
  t.ok('playing SR3, every SR2 book is hidden even with its toggle on',
    sr2Books.every(c => SR3ESourceBooks.isAllowed(c) === false));
  t.ok('playing SR3, SR3 books are shown', sr3Books.every(c => SR3ESourceBooks.isAllowed(c)));

  edition = 'SR2';
  t.ok('playing SR2, every SR3 book is hidden even with its toggle on',
    sr3Books.every(c => SR3ESourceBooks.isAllowed(c) === false));
  t.ok('playing SR2, SR2 books are shown', sr2Books.every(c => SR3ESourceBooks.isAllowed(c)));

  // The edition gate must not override the fail-visible rules.
  t.is('an unrecognised book code stays visible in either edition',
    SR3ESourceBooks.isAllowed('not-a-real-book'), true);
  t.is('a pack with no book flag stays visible in either edition',
    SR3ESourceBooks.packAllowed({ metadata: {} }), true);

  // Both gates apply: right edition but switched off is still hidden.
  stored = { ...allOn(), [sr2Books[0]]: false };
  t.is('a book of the played edition can still be switched off individually',
    SR3ESourceBooks.isAllowed(sr2Books[0]), false);

  edition = 'SR3';
  stored = allOn();
}
