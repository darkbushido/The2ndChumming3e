/**
 * Page text of a rulebook, for the rules-check ledger (TODO 121) — from the PDF or from its OCR text.
 *
 * Two sources, same page numbering (PDF page, 1-based):
 *   - **PDF** (`pdftotext`, the maintainer's library) — the authority when it is on this machine.
 *   - **OCR text** — the `darkbushido/Shadowrun-OCR` checkout: one `pdftotext -layout` dump per book,
 *     pages separated by form feeds, books with no text layer OCR'd into the same shape (`[no-text]`
 *     in the name). Used when the PDFs are not here — a cloud session, a second machine.
 *
 * ⚠ The OCR text is copyrighted rulebook text. It is READ from a sibling checkout, never copied into
 * this repo (`tests/sr-ocr-guard.test.mjs`); the ledger carries only the short quotes it always has.
 *
 * Every source yields `views` — the whole page and each column on its own — because a two-column
 * page in layout text runs both columns along each line, so a sentence that wraps is only contiguous
 * inside its own column. A quote is found if it appears in ANY view.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

/**
 * The column gutter of a layout page: the character position that is blank (two spaces) on the most
 * lines, searched across the middle 30-70% of the page width. -1 on a page with no text.
 */
export function gutterOf(lines) {
  const w = Math.max(0, ...lines.map(l => l.length));
  let best = -1, bestScore = -Infinity;
  for (let g = Math.floor(w * 0.3); g <= w * 0.7; g++) {
    let score = 0;
    for (const l of lines) {
      if (l.length <= g) continue;
      if (l[g] === ' ' && l[g - 1] === ' ') score++;
      else if (l[g] !== ' ') score -= 0.2;   // text crossing here: a heading or a table, not a gutter
    }
    if (score > bestScore) { bestScore = score; best = g; }
  }
  return best;
}

/**
 * Split a layout page into its left and right columns. A line whose text crosses the gutter is cut
 * at the nearest run of 2+ spaces (within 12 characters), else kept whole in the left column.
 */
export function splitColumns(pageText) {
  const lines = pageText.split('\n');
  const g = gutterOf(lines);
  const left = [], right = [];
  for (const l of lines) {
    if (g < 0 || l.length <= g) { left.push(l); continue; }
    let cut = g;
    if (l[g] !== ' ') {
      cut = -1;
      let bestD = 13;
      for (const m of l.matchAll(/ {2,}/g)) {
        const end = m.index + m[0].length, d = Math.abs(end - g);
        if (m.index > 0 && d < bestD) { bestD = d; cut = end; }
      }
    }
    if (cut < 0) { left.push(l); continue; }
    left.push(l.slice(0, cut));
    right.push(l.slice(cut));
  }
  return [left.join('\n'), right.join('\n')];
}

/** The book's name without extension or the OCR repo's `[no-text]` marker, for matching a PDF to its text. */
export const bookKey = file => path.basename(file).replace(/\.(pdf|txt)$/i, '').replace(/\s*\[no-text\]\s*$/i, '').trim().toLowerCase();

/** Every `.txt` under `dir`, keyed by `bookKey`. */
export function indexOcr(dir) {
  const out = new Map();
  const walk = d => {
    for (const name of readdirSync(d)) {
      const p = path.join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name.toLowerCase().endsWith('.txt')) out.set(bookKey(name), p);
    }
  };
  walk(dir);
  return out;
}

/** Page `page` (1-based PDF page) of a form-feed-separated text dump. */
export const pageOfText = (text, page) => text.split('\f')[page - 1] ?? '';

/**
 * A page reader. `pdfDir` is used when it exists; otherwise `ocrDir`. `read(file, page)` returns
 * `{ whole, views, source }` or throws naming what is missing.
 */
export function bookPages({ pdfDir, ocrDir }) {
  const usePdf = pdfDir && existsSync(pdfDir);
  const source = usePdf ? 'pdf' : 'ocr';
  let ocr = null;
  const texts = new Map(), cache = new Map();

  function fromPdf(file, page) {
    const full = path.join(pdfDir, file);
    if (!existsSync(full)) throw new Error(`PDF not found: ${full}`);
    // An xpdf build takes margins, not -x/-W. -layout is the same text the OCR repo holds, so a quote
    // copied from the OCR text verifies here too.
    const run = extra => execFileSync('pdftotext', ['-f', String(page), '-l', String(page), ...extra, full, '-'], { encoding: 'utf8', maxBuffer: 1 << 24 });
    const whole = run([]), layout = run(['-layout']);
    return { whole, views: [run(['-marginr', '308']), run(['-marginl', '308']), whole, layout, ...splitColumns(layout)] };
  }

  function fromOcr(file, page) {
    if (!ocrDir || !existsSync(ocrDir)) {
      throw new Error(`neither the PDFs (${pdfDir}) nor the OCR text (${ocrDir}) are on this machine — clone darkbushido/Shadowrun-OCR beside this repo or set SR3_OCR_DIR`);
    }
    ocr ??= indexOcr(ocrDir);
    const txt = ocr.get(bookKey(file));
    if (!txt) throw new Error(`no OCR text for ${file} under ${ocrDir}`);
    if (!texts.has(txt)) texts.set(txt, readFileSync(txt, 'utf8'));
    const whole = pageOfText(texts.get(txt), page);
    return { whole, views: [whole, ...splitColumns(whole)] };
  }

  return {
    source,
    read(file, page) {
      const key = `${file}|${page}`;
      if (!cache.has(key)) cache.set(key, { ...(usePdf ? fromPdf(file, page) : fromOcr(file, page)), source });
      return cache.get(key);
    },
  };
}
