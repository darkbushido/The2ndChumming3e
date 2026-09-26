/**
 * The rules-check ledger reads book pages from the PDFs OR from the OCR text · TODO 121.
 *
 * The OCR text is `pdftotext -layout`: both columns of a page run along each line, so a sentence that
 * wraps inside one column is only contiguous once the page is split at its gutter. These cases pin the
 * split, the book-name match (the OCR repo marks scanned books `[no-text]`), and the page numbering
 * (form feeds, 1-based PDF pages). No book text is used — the pages below are made up.
 */
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { splitColumns, gutterOf, bookKey, pageOfText, bookPages, wordsOnPage } from '../tools/lib/book-pages.mjs';

export const name = 'book-pages';

const norm = s => s.replace(/\s+/g, ' ').trim();

// Two columns; the left gutter edge moves by a few characters from line to line, as real pages do.
const PAGE = [
  'LEFT HEADING                                RIGHT HEADING',
  'The quick brown fox jumps over the          All spells cast while astral',
  'lazy dog and then keeps on running          projecting cause physical',
  'until it reaches the river bank.            damage, regardless of Force.',
  '                                               Otherwise Drain is stun.',
  'A second paragraph starts here.             The end.',
].join('\n');

export async function run(t) {
  const lines = PAGE.split('\n');
  const g = gutterOf(lines);
  t.ok('the gutter falls between the two columns', g > 'lazy dog and then keeps on running'.length && g < 44);

  const [left, right] = splitColumns(PAGE);
  t.ok('a sentence wrapped in the RIGHT column reads through once split',
    norm(right).includes('All spells cast while astral projecting cause physical damage, regardless of Force.'));
  t.ok('…and one in the LEFT column', norm(left).includes('jumps over the lazy dog and then keeps on running until it'));
  t.ok('…which the whole page does not give', !norm(PAGE).includes('astral projecting cause'));
  t.ok('a right-only line (indented past the gutter) lands on the right', norm(right).includes('Otherwise Drain is stun.'));
  t.ok('the left column carries none of the right', !/spells|Drain/.test(left));

  const [l1, r1] = splitColumns('A TABLE HEADING THAT SPANS THE WHOLE PAGE WIDTH WITHOUT A GAP\nleft text          right text');
  t.ok('a line with no gap near the gutter stays whole on the left', l1.includes('SPANS THE WHOLE PAGE') && !r1.includes('SPANS'));

  t.eq('an empty page splits into two empty columns', splitColumns(''), ['', '']);

  t.is('a PDF name matches its OCR text', bookKey('Shadowrun 3e - Core Rules {FAN25000}.pdf'), bookKey('Shadowrun 3e - Core Rules {FAN25000}.txt'));
  t.is('…including a scanned book marked [no-text]', bookKey('Shadowrun 3e - Critters.pdf'), bookKey('x/Shadowrun 3e - Critters [no-text].txt'));

  t.is('page 1 is before the first form feed', pageOfText('one\ftwo\fthree', 1), 'one');
  t.is('page 3 is the third', pageOfText('one\ftwo\fthree', 3), 'three');
  t.is('a page past the end is empty, not undefined', pageOfText('one', 9), '');

  // The reader: no PDF directory → the OCR text, found by book name in a subfolder.
  const dir = mkdtempSync(path.join(tmpdir(), 'book-pages-'));
  mkdirSync(path.join(dir, '3e', 'Supplements'), { recursive: true });
  writeFileSync(path.join(dir, '3e', 'Supplements', 'Book Two [no-text].txt'), `cover\f${PAGE}\fback`);
  const books = bookPages({ pdfDir: path.join(dir, 'no-such-pdfs'), ocrDir: dir });
  t.is('without the PDFs the source is the OCR text', books.source, 'ocr');
  const pg = books.read('Book Two.pdf', 2);
  t.ok('…page 2 is the second form-feed page', pg.whole.includes('LEFT HEADING'));
  t.ok('…and its views include the split columns', pg.views.some(v => norm(v).includes('astral projecting cause physical')));
  // Both present: the OCR text is the default; SR3_BOOK_SOURCE=pdf (prefer: 'pdf') turns it round.
  mkdirSync(path.join(dir, 'pdfs'));
  t.is('with both, the OCR text is the source', bookPages({ pdfDir: path.join(dir, 'pdfs'), ocrDir: dir }).source, 'ocr');
  t.is('…and prefer pdf makes it the PDFs', bookPages({ pdfDir: path.join(dir, 'pdfs'), ocrDir: dir, prefer: 'pdf' }).source, 'pdf');
  t.is('prefer pdf with no PDFs still reads the OCR text', bookPages({ pdfDir: path.join(dir, 'nope'), ocrDir: dir, prefer: 'pdf' }).source, 'ocr');
  const pdfFirst = bookPages({ pdfDir: path.join(dir, 'pdfs'), ocrDir: dir, prefer: 'pdf' });
  t.is('…and a book the PDFs lack is read from the OCR text', pdfFirst.read('Book Two.pdf', 2).source, 'ocr');

  let err = '';
  try { books.read('Missing Book.pdf', 1); } catch (e) { err = e.message; }
  t.ok('a book with no OCR text is an error naming it', /no OCR text for Missing Book\.pdf/.test(err));

  const none = bookPages({ pdfDir: path.join(dir, 'nope'), ocrDir: path.join(dir, 'nope-either') });
  err = '';
  try { none.read('Book Two.pdf', 1); } catch (e) { err = e.message; }
  t.ok('with neither source, the error says how to get the OCR text', /Shadowrun-OCR/.test(err));

  // A table quoted down its columns (the PDF's reading order) against the layout text's rows.
  const TABLE = 'Level   Cost      Avail\nLevel 1  12,000   6/48 hrs\nLevel 2  60,000   8/48 hrs';
  t.ok('a column-order quote is found word by word in a row-order table', wordsOnPage('Level 1 Level 2 Cost 12,000 60,000', TABLE));
  t.ok('…but a number not on the page is not', !wordsOnPage('Level 1 Level 2 Cost 12,000 65,000', TABLE));
  t.ok('…and a word used twice must be on the page twice', !wordsOnPage('12,000 12,000 Level Level Level Level', TABLE));
  t.ok('a word hyphenated across a line still counts', wordsOnPage('the magician loader', 'the magi-\ncian load-\ner'));
  t.ok('an empty quote proves nothing', !wordsOnPage('', TABLE));

  const ledger = readFileSync(new URL('../tools/rules-ledger.mjs', import.meta.url), 'utf8');
  t.ok('the ledger reads pages through book-pages, not its own pdftotext call', /from '\.\/lib\/book-pages\.mjs'/.test(ledger) && !/execFileSync\('pdftotext'/.test(ledger));
  t.ok('…accepts a word-by-word match on the OCR source only', /pg\.source === 'ocr' && wordsOnPage\(/.test(ledger));
  t.ok('…and lists every quote that passed that way', /LOOSE/.test(ledger) && /looseQuotes\.push/.test(ledger));
  t.ok('…and checks `ocrQuote` only on the OCR source', /pg\.source === 'ocr' \? \(p\.ocrQuote \?\? p\.quote\) : p\.quote/.test(ledger));
}
