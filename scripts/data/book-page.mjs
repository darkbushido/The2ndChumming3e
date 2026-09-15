/**
 * A document's book and page · TODO 117.
 *
 * `system.bookPage` holds the upstream generator's `code.page` form — `sr3.303`, `mm.025`, several
 * sources comma-separated (`sr3.312,r3.172`). This module is the one place that reads it: the item
 * sheet shows it as *"SR3 p.303"*, and `tools/check-packs.mjs` reports documents without one and
 * documents whose page names a different book from the pack they ship in.
 *
 * Pure — no Foundry globals — so the tools and the tests can use it.
 */

/** Short labels, in the citation style CLAUDE.md uses. Codes not listed print as their code. */
export const BOOK_ABBREVIATIONS = {
  sr3: 'SR3', sr2: 'SR2', cc: 'CC', mm: 'M&M', mits: 'MitS', r3: 'R3', sota: 'SOTA 2063', sota2: 'SOTA 2064',
  tal: 'Target: Awakened Lands', twl: 'Target: Wastelands', fra: 'France', ger: 'Germany', ssg: 'SSG',
  tss: 'TSS', 'matrix-defragged': 'Matrix Defragged', mat: 'Matrix', lbb: 'Little Black Book',
  ct: 'Cybertechnology', ssc: 'SSC', st: 'Shadowtech', fof: 'Fields of Fire', pna: 'Paranormal Animals',
  r2: 'Rigger 2', vr2: 'VR 2.0',
};

/**
 * Upstream spellings of a code this system registers under another name. The generator writes
 * State of the Art 2064 as `sta2` in its page fields; the book registry (and the pack flags) call
 * it `sota2`. Without the alias all 63 SOTA 2064 documents read as filed under the wrong book.
 */
export const CODE_ALIASES = { sta2: 'sota2' };

export const BookPage = {
  /** Blank, or still the `???` placeholder the SR2 import left. */
  missing(bp) {
    const s = String(bp ?? '').trim();
    return !s || /\?\?\?/.test(s);
  },

  /** `sr3.312,r3.172` → `[{code:'sr3', page:'312'}, {code:'r3', page:'172'}]`. */
  parse(bp) {
    return String(bp ?? '').split(',').map(s => s.trim()).filter(Boolean).map(part => {
      const m = /^([a-z0-9-]+)\.(.+)$/i.exec(part);
      if (!m) return { code: null, page: part };
      const code = m[1].toLowerCase();
      return { code: CODE_ALIASES[code] ?? code, page: m[2].replace(/^0+(?=\d)/, '') };
    });
  },

  /** The book codes a page names — `sr3.312,r3.172` → `['sr3', 'r3']`. */
  codes(bp) {
    return BookPage.parse(bp).map(p => p.code).filter(Boolean);
  },

  /** "SR3 p.303 · R3 p.172"; '' for nothing. An unknown code prints as itself. */
  format(bp) {
    return BookPage.parse(bp).map(({ code, page }) => {
      if (!code) return page;
      const label = BOOK_ABBREVIATIONS[code] ?? code;
      return /^\?+$|^x+$/i.test(page) ? `${label}, page unknown` : `${label} p.${page}`;
    }).join(' · ');
  },

  /**
   * True when the page names a book and none of its codes is the pack's own — a document
   * shipping in a book it does not come from (so that book's toggle hides it wrongly).
   * System packs (no book) and documents with no page never count.
   */
  namesOtherBook(bp, packBook) {
    if (!packBook || BookPage.missing(bp)) return false;
    const codes = BookPage.codes(bp);
    return codes.length > 0 && !codes.includes(packBook);
  },
};
