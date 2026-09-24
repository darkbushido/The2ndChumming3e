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

const { SOURCE_BOOKS, PLAYABLE_EDITIONS, defaultAllowedBooks } = await import('../scripts/config.js');

// The setting values the module reads. Reassigned per scenario below. Keyed properly:
// returning one blob for every key made the edition gate read the allowed-books map.
let stored = {};
let edition = 'SR3';
// The Matrix ruleset. '' = unset, which fails VISIBLE, so the book scenarios below count every pack.
let ruleset = '';
installGame({ packs: manifest.packs });
globalThis.game.settings.get = (_ns, key) =>
  (key === 'edition' ? edition : key === 'matrixRuleset' ? ruleset : stored);

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
  // Counts are edition-aware: a pack is visible only if its book belongs to the edition
  // being played AND is switched on. Packs of the other edition never count.
  const inEdition = code => (SOURCE_BOOKS[code]?.edition ?? 'SR3') === edition;
  const packsIn = codes => codes.filter(inEdition).reduce((n, c) => n + (perBook[c] ?? 0), 0);
  const allCodes = Object.keys(perBook);

  stored = {};
  const defaults = defaultAllowedBooks();
  t.is('defaults show the played edition\'s enabled books plus system packs',
    visible(), packsIn(allCodes.filter(c => defaults[c] !== false)) + systemOnly);

  stored = allOn();
  t.is('everything on shows every pack of the played edition',
    visible(), packsIn(allCodes) + systemOnly);
  // SR2 is parked (2026-09-24): its packs are in archive/sr2/ and no pack of another edition ships. The
  // gate itself is exercised below with SR2 made playable; here, prove nothing shipping is hidden by it,
  // and that an edition cannot ship packs without being playable.
  t.is('no pack is hidden by the edition gate while only SR3 ships', visible(), packs.length);
  t.eq('every shipping pack belongs to a playable edition',
    allCodes.filter(c => !PLAYABLE_EDITIONS.includes(SOURCE_BOOKS[c]?.edition ?? 'SR3')), []);

  // The core rulebook of the played edition cannot be switched off, so "everything off"
  // leaves the system packs plus whatever the core book contributes.
  stored = allOff();
  const coreCode  = Object.entries(SOURCE_BOOKS).find(([, b]) => b.core && b.edition === edition)?.[0];
  t.ok('the played edition has a core book', !!coreCode);
  t.is('everything off leaves system packs plus the core book',
    visible(), systemOnly + (perBook[coreCode] ?? 0));
  t.is('the core book cannot be switched off', SR3ESourceBooks.isAllowed(coreCode), true);

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

  PLAYABLE_EDITIONS.push('SR2');   // the gate, as it will work when SR2 packs come back
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
  const sr2NonCore = sr2Books.find(c => !SOURCE_BOOKS[c].core);
  stored = { ...allOn(), [sr2NonCore]: false };
  t.is('a non-core book of the played edition can still be switched off individually',
    SR3ESourceBooks.isAllowed(sr2NonCore), false);
  t.is('switching off a supplement does not affect the core book',
    SR3ESourceBooks.isAllowed(sr2Books.find(c => SOURCE_BOOKS[c].core)), true);
  PLAYABLE_EDITIONS.pop();

  // While SR2 ships nothing, a world stored as SR2 plays SR3 — otherwise it would see every book hidden.
  edition = 'SR2';
  stored = allOn();
  t.is('a world stored as SR2, with no SR2 packs shipping, plays SR3', SR3ESourceBooks.edition, 'SR3');
  t.ok('…so the SR3 books are shown, not hidden', sr3Books.every(c => SR3ESourceBooks.isAllowed(c)));

  edition = 'SR3';
  stored = allOn();

  /* ---- the Matrix ruleset gate (2026-09-14) ----
   * "not have them in the compendium if we aren't using the orthodox decking method" — the maintainer.
   * The Orthodox decks/programs show only under Orthodox; the Defragged decks/programs, whose item
   * types the Orthodox pickers also read, only under Defragged. Everything else ignores the setting. */
  const nameOf    = p => p.collection.split('.').pop();
  const byRuleset = r => packs.filter(p => p.metadata?.flags?.[SYS]?.matrixRuleset === r).map(nameOf);
  const shown     = name => SR3ESourceBooks.packAllowed(packs.find(p => nameOf(p) === name));
  t.eq('the manifest tags the two Orthodox packs', byRuleset('orthodox').sort(), ['sr3e-sr3-odm-cyberdecks', 'sr3e-sr3-odm-programs']);
  t.eq('…and the two Defragged packs that share their item types', byRuleset('defragged').sort(), ['sr3e-mdf-cyberdecks', 'sr3e-mdf-programs']);
  t.ok('the Orthodox packs belong to the core book (so the book toggles still apply too)',
    packs.filter(p => p.metadata?.flags?.[SYS]?.matrixRuleset === 'orthodox').every(p => p.metadata.flags[SYS].book === 'sr3'));

  ruleset = 'defragged';
  t.is('Defragged: the Orthodox decks are hidden', shown('sr3e-sr3-odm-cyberdecks'), false);
  t.is('Defragged: the Defragged decks show', shown('sr3e-mdf-cyberdecks'), true);
  t.is('Defragged: a deck picker offers only the Defragged pack', forType('cyberdeck'), 1);
  ruleset = 'orthodox';
  t.is('Orthodox: the Orthodox programs show', shown('sr3e-sr3-odm-programs'), true);
  t.is('Orthodox: the Defragged programs are hidden', shown('sr3e-mdf-programs'), false);
  t.is('Orthodox: a program picker offers only the Orthodox pack', forType('program'), 1);
  t.is('Orthodox: untagged Matrix packs (IC, hosts, agents) are untouched', shown('sr3e-mdf-ic'), true);
  ruleset = '';
  t.is('an unreadable/unset ruleset fails VISIBLE', shown('sr3e-sr3-odm-cyberdecks') && shown('sr3e-mdf-cyberdecks'), true);
  globalThis.game.settings.get = () => { throw new Error('pre-init'); };
  t.is('…as does a setting that throws (pre-init)', SR3ESourceBooks.rulesetAllows({ metadata: { flags: { [SYS]: { matrixRuleset: 'orthodox' } } } }), true);
  globalThis.game.settings.get = (_ns, key) =>
    (key === 'edition' ? edition : key === 'matrixRuleset' ? ruleset : stored);
  // The book gate is AND'ed, not replaced: a ruleset-tagged pack from a switched-off book stays hidden.
  ruleset = 'orthodox';
  t.is('the book gate still applies to a ruleset-tagged pack', SR3ESourceBooks.packAllowed({ metadata: { flags: { [SYS]: { book: 'mm', matrixRuleset: 'orthodox' } } } }), SR3ESourceBooks.isAllowed('mm'));
  stored = { ...allOn(), mm: false };
  t.is('…so switching its book off hides it even under Orthodox', SR3ESourceBooks.packAllowed({ metadata: { flags: { [SYS]: { book: 'mm', matrixRuleset: 'orthodox' } } } }), false);
  ruleset = ''; stored = allOn();
}
