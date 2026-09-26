/**
 * The TODO 121 rules-check ledger — every unit of every guide page, resolved with evidence.
 *
 *   node tools/rules-ledger.mjs init 0.6.0      enumerate guides/ into audit/rules-ledger-0.6.0.json
 *                                               (merges: a unit whose text is unchanged keeps its verdict)
 *   node tools/rules-ledger.mjs status 0.6.0    counts by verdict, and what is still unchecked
 *   node tools/rules-ledger.mjs check 0.6.0     verify every resolved entry's evidence; exit 1 on any fault
 *   node tools/rules-ledger.mjs report 0.6.0    write audit/rules-check-0.6.0.md from the ledger
 *
 * ⚠ **This script judges nothing.** It enumerates, so coverage is a fact rather than a feeling, and it
 * re-verifies evidence, so a quote or a code location cannot be invented. Whether a guide line MATCHES
 * the code is decided by whoever fills the entry — and every `diverges` goes to the maintainer.
 *
 * Verdicts and what each one must carry (enforced by `check`):
 *   match           pdf[] and code[]            the guide line, the PDF and the code all agree
 *   diverges        pdf[] and code[] and note   the code differs from the PDF; `note` says how
 *   guide-differs   pdf[] and note              the GUIDE differs from the PDF (the code is not the issue)
 *   not-implemented pdf[] and search[]          the rule is real; `search` patterns re-run over scripts/ and must find nothing
 *   unverifiable    reason                      could not be checked (say why); listed for the maintainer
 *   no-rule-claim   reason                      prose that states no rule; rejected if it cites a page or a modifier
 *
 * Evidence formats:
 *   pdf:    { file, pdfPage, printedPage, quote, ocrQuote? }   `quote` must appear in that page's text (whitespace-normalised);
 *           `ocrQuote`, when set, is what the OCR source checks instead (a table the OCR layout prints in another order)
 *           — read from the PDFs when they are on this machine, else from the Shadowrun-OCR checkout beside
 *           this repo or SR-OCR/ (SR3_PDF_DIR / SR3_OCR_DIR override). Copy quotes from the layout text, one column at
 *           a time: they then verify against either source.
 *   code:   { file, line, snippet }                 `snippet` must appear within 5 lines of `line`
 *   search: { pattern, path? }                      a regex; must have zero matches under `path` (default scripts/)
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { bookPages, wordsOnPage } from './lib/book-pages.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GUIDES = path.join(ROOT, 'guides');
const PDF_DIR = process.env.SR3_PDF_DIR ?? 'C:\\Users\\lance\\Documents\\Shadowrun 3rd Edition PDFs';
// Without the PDFs: the OCR text (tools/lib/book-pages.mjs) — the untracked SR-OCR/ in this checkout, else
// the Shadowrun-OCR checkout beside it.
const OCR_DIR = process.env.SR3_OCR_DIR
  ?? [path.join(ROOT, 'SR-OCR'), path.join(ROOT, '..', 'Shadowrun-OCR')].find(existsSync)
  ?? path.join(ROOT, '..', 'Shadowrun-OCR');
const SKIP = new Set(['CLAUDE.md', 'TODO.md', 'README.md']);
const VERDICTS = ['match', 'diverges', 'guide-differs', 'not-implemented', 'unverifiable', 'no-rule-claim'];

const norm = s => String(s).replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/\s+/g, ' ').trim().toLowerCase();
const hash = s => createHash('sha1').update(s).digest('hex').slice(0, 10);
const ledgerPath = v => path.join(ROOT, 'audit', `rules-ledger-${v}.json`);

function guideFiles(dir = GUIDES, out = []) {
  for (const name of readdirSync(dir)) {
    if (['_site', 'vendor', 'node_modules', '_includes', '_sass', '.bundle', '.jekyll-cache', 'tools'].includes(name)) continue;
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) guideFiles(p, out);
    else if (name.endsWith('.md') && !SKIP.has(name)) out.push(p);
  }
  return out.sort();
}

/** Split a page into units: table rows, list items, fenced blocks, paragraphs. Front matter is skipped. */
function unitsOf(file) {
  const lines = readFileSync(file, 'utf8').replace(/\r\n/g, '\n').split('\n');
  let i = 0;
  if (lines[0] === '---') { i = lines.indexOf('---', 1) + 1; }
  const units = [];
  let cur = null, fence = false;
  const flush = () => { if (cur) { units.push(cur); cur = null; } };
  for (; i < lines.length; i++) {
    const l = lines[i], n = i + 1;
    if (/^\s*```/.test(l)) {
      if (!fence) { flush(); cur = { start: n, end: n, text: l }; fence = true; }
      else { cur.text += '\n' + l; cur.end = n; fence = false; flush(); }
      continue;
    }
    if (fence) { cur.text += '\n' + l; cur.end = n; continue; }
    if (!l.trim()) { flush(); continue; }
    if (/^\s*\|/.test(l)) {
      flush();
      if (!/^\s*\|[\s:|-]+\|\s*$/.test(l)) units.push({ start: n, end: n, text: l });
      continue;
    }
    if (/^\s*([-*]|\d+\.)\s/.test(l) || /^#{1,6}\s/.test(l)) { flush(); cur = { start: n, end: n, text: l }; continue; }
    if (cur) { cur.text += '\n' + l; cur.end = n; } else cur = { start: n, end: n, text: l };
  }
  flush();
  return units;
}

function load(v) {
  if (!existsSync(ledgerPath(v))) throw new Error(`no ledger for ${v} — run: node tools/rules-ledger.mjs init ${v}`);
  return JSON.parse(readFileSync(ledgerPath(v), 'utf8'));
}
const save = (v, l) => writeFileSync(ledgerPath(v), JSON.stringify(l, null, 2) + '\n');

function init(v) {
  const prev = existsSync(ledgerPath(v)) ? load(v) : { entries: [] };
  const keep = new Map(prev.entries.map(e => [`${e.file}|${e.hash}`, e]));
  const entries = [];
  let carried = 0;
  for (const f of guideFiles()) {
    const rel = path.relative(GUIDES, f).replace(/\\/g, '/');
    unitsOf(f).forEach((u, idx) => {
      const h = hash(u.text);
      const old = keep.get(`${rel}|${h}`);
      if (old) carried++;
      entries.push({
        id: `${rel}#${idx + 1}`, file: rel, lines: [u.start, u.end], hash: h, text: u.text,
        verdict: old?.verdict ?? null, pdf: old?.pdf, code: old?.code, search: old?.search,
        note: old?.note, reason: old?.reason,
      });
    });
  }
  save(v, { version: v, generated: new Date().toISOString().slice(0, 10), entries });
  console.log(`${entries.length} units in ${new Set(entries.map(e => e.file)).size} pages; ${carried} carried over. → ${path.relative(ROOT, ledgerPath(v))}`);
}

const books = bookPages({ pdfDir: PDF_DIR, ocrDir: OCR_DIR });
const pdfPageText = (file, page) => books.read(file, page);
/** Quotes that passed only by `wordsOnPage` on the OCR text — listed by `check`, counted in the report. */
const looseQuotes = [];

function allScripts(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) allScripts(p, out);
    else if (/\.(m?js)$/.test(name)) out.push(p);
  }
  return out;
}

function faults(e, current) {
  const f = [];
  if (!VERDICTS.includes(e.verdict)) return [`verdict must be one of ${VERDICTS.join(', ')}`];
  if (current && current.hash !== e.hash) f.push('the guide text changed since init — run init to merge, then re-resolve');
  const needPdf = ['match', 'diverges', 'guide-differs', 'not-implemented'].includes(e.verdict);
  const needCode = ['match', 'diverges'].includes(e.verdict);
  if (needPdf && !(e.pdf?.length)) f.push('needs pdf[] evidence');
  for (const p of e.pdf ?? []) {
    try {
      const pg = pdfPageText(p.file, p.pdfPage), t = pg.whole;
      // `ocrQuote`: the same passage as the OCR layout text prints it, where the PDF's reading order differs.
      const quote = pg.source === 'ocr' ? (p.ocrQuote ?? p.quote) : p.quote;
      if (!quote || quote.length < 25) f.push(`pdf quote too short to mean anything (${p.file} p.${p.printedPage})`);
      else if (!pg.views.some(v => [norm(v), norm(v).replace(/- /g, '')].some(x => x.includes(norm(quote))))) {
        if (pg.source === 'ocr' && wordsOnPage(quote, t)) looseQuotes.push(`${e.id}  pdf page ${p.pdfPage}: "${quote.slice(0, 60)}…"`);
        else f.push(`pdf quote NOT FOUND on ${p.file} pdf page ${p.pdfPage}: "${quote.slice(0, 60)}…"`);
      }
      if (!new RegExp(`(^|\\D)${p.printedPage}(\\D|$)`).test(t)) f.push(`printed page ${p.printedPage} not found on pdf page ${p.pdfPage}`);
    } catch (err) { f.push(`pdf check failed: ${err.message.split('\n')[0]}`); }
  }
  if (needCode && !(e.code?.length)) f.push('needs code[] evidence');
  for (const c of e.code ?? []) {
    const p = path.join(ROOT, c.file);
    if (!existsSync(p)) { f.push(`code file missing: ${c.file}`); continue; }
    const lines = readFileSync(p, 'utf8').split('\n');
    const win = lines.slice(Math.max(0, c.line - 6), c.line + 5).join(' ');
    if (!c.snippet || c.snippet.length < 8) f.push(`code snippet too short (${c.file}:${c.line})`);
    else if (!norm(win).includes(norm(c.snippet))) f.push(`code snippet NOT FOUND within 5 lines of ${c.file}:${c.line}`);
  }
  if (['diverges', 'guide-differs'].includes(e.verdict) && !e.note) f.push('needs a note saying how it differs');
  if (e.verdict === 'not-implemented') {
    if (!(e.search?.length)) f.push('needs search[] proving the code has no such behaviour');
    for (const s of e.search ?? []) {
      const re = new RegExp(s.pattern, 'i');
      const hits = allScripts(path.join(ROOT, s.path ?? 'scripts')).filter(p => re.test(readFileSync(p, 'utf8')));
      if (hits.length) f.push(`search /${s.pattern}/ FOUND in ${hits.map(h => path.relative(ROOT, h)).join(', ')} — so it is not "not implemented"`);
    }
  }
  if (['unverifiable', 'no-rule-claim'].includes(e.verdict) && !e.reason) f.push('needs a reason');
  if (e.verdict === 'no-rule-claim' && /\((?:SR3|M&M|MitS|MDF|R3|Matrix)[^)]*\bp{1,2}\.?\s*\d|(^|\s)[+\u2212-]\d/.test(e.text))
    f.push('cites a page or a modifier, so it is a rule claim — resolve it as one');
  return f;
}

function currentUnits() {
  const map = new Map();
  for (const f of guideFiles()) {
    const rel = path.relative(GUIDES, f).replace(/\\/g, '/');
    unitsOf(f).forEach((u, idx) => map.set(`${rel}#${idx + 1}`, { hash: hash(u.text) }));
  }
  return map;
}

function status(v) {
  const l = load(v), counts = {};
  for (const e of l.entries) counts[e.verdict ?? 'UNCHECKED'] = (counts[e.verdict ?? 'UNCHECKED'] ?? 0) + 1;
  console.log(`${l.entries.length} units`, counts);
  const byFile = {};
  for (const e of l.entries) if (!e.verdict) byFile[e.file] = (byFile[e.file] ?? 0) + 1;
  for (const [k, n] of Object.entries(byFile)) console.log(`  unchecked  ${String(n).padStart(4)}  ${k}`);
}

function check(v) {
  const l = load(v), cur = currentUnits();
  let bad = 0;
  const ids = new Set(l.entries.map(e => e.id));
  for (const id of cur.keys()) if (!ids.has(id)) { console.log(`MISSING  ${id} — guides has a unit the ledger lacks; run init`); bad++; }
  for (const e of l.entries) {
    if (!e.verdict) { console.log(`UNCHECKED ${e.id}  ${e.text.split('\n')[0].slice(0, 70)}`); bad++; continue; }
    const f = faults(e, cur.get(e.id));
    if (f.length) { bad++; console.log(`FAULT    ${e.id}`); f.forEach(x => console.log(`           - ${x}`)); }
  }
  for (const q of looseQuotes) console.log(`LOOSE    ${q}`);
  if (looseQuotes.length) console.log(`\n${looseQuotes.length} quote(s) found only word by word (a table read in another order) — exact on the PDFs, not on the OCR layout.`);
  console.log(`\nquotes checked against the ${books.source === 'pdf' ? `PDFs (${PDF_DIR})` : `OCR text (${OCR_DIR})`}`);
  console.log(bad ? `${bad} unit(s) not resolved or not verifiable.` : `all ${l.entries.length} units resolved and every piece of evidence re-verified.`);
  return bad === 0;
}

function report(v) {
  const l = load(v), ok = check(v);
  const by = k => l.entries.filter(e => e.verdict === k);
  const pages = new Set(l.entries.map(e => e.file)).size;
  const out = [];
  out.push(`# Rules check v${v} — code vs \`guides/\`, PDFs as authority (TODO 121)`, '');
  out.push(ok
    ? `**Status: COMPLETE — all ${l.entries.length} units of ${pages} guide pages resolved, and every quote and code location re-verified by \`tools/rules-ledger.mjs check\`.**`
    : `**Status: PARTIAL — the ledger has unresolved or unverifiable entries; this record is not a completed check.**`, '');
  out.push(`Book text: ${books.source === 'pdf' ? 'the PDFs' : 'the OCR text (Shadowrun-OCR), the PDFs being absent'}.`
    + (looseQuotes.length ? ` ${looseQuotes.length} quote(s) matched word by word only (tables in the OCR layout run across rows); \`check\` lists them as LOOSE.` : ''), '');
  out.push('Generated from `audit/rules-ledger-' + v + '.json`. Regenerate; do not hand-edit. A complete record proves the ledger is',
    'fully evidenced — it does not prove the evidence was read correctly. Every `diverges` and every `unverifiable`',
    'below is the maintainer\'s to decide.', '');
  out.push('| Verdict | Units |', '| :--- | ---: |', ...VERDICTS.map(k => `| ${k} | ${by(k).length} |`), `| unchecked | ${l.entries.filter(e => !e.verdict).length} |`, '');
  const sect = (title, list, fmt) => { if (!list.length) return; out.push(`## ${title} (${list.length})`, '', ...list.map(fmt), ''); };
  const q = e => (e.pdf ?? []).map(p => `> "${p.quote}" — ${p.file}, printed p.${p.printedPage}`).join('\n');
  const c = e => (e.code ?? []).map(x => `\`${x.file}:${x.line}\``).join(', ');
  sect('Code diverges from the book', by('diverges'), e => `### ${e.id}\n\nGuide: ${e.text.split('\n')[0]}\n\n${q(e)}\n\nCode: ${c(e)}\n\n${e.note}\n`);
  sect('The guide differs from the book', by('guide-differs'), e => `### ${e.id}\n\nGuide: ${e.text.split('\n')[0]}\n\n${q(e)}\n\n${e.note}\n`);
  sect('Real rules the code does not implement', by('not-implemented'), e => `### ${e.id}\n\nGuide: ${e.text.split('\n')[0]}\n\n${q(e)}\n\nSearched: ${(e.search ?? []).map(s => '`/' + s.pattern + '/`').join(', ')} — no matches.\n${e.note ? '\n' + e.note + '\n' : ''}`);
  sect('Could not be verified', by('unverifiable'), e => `- **${e.id}** — ${e.reason}`);
  out.push(`## Matches (${by('match').length})`, '', 'Each carries its quote and code location in the ledger; not repeated here.', '');
  const un = l.entries.filter(e => !e.verdict);
  sect('Unchecked', un, e => `- ${e.id}`);
  writeFileSync(path.join(ROOT, 'audit', `rules-check-${v}.md`), out.join('\n') + '\n');
  console.log(`wrote audit/rules-check-${v}.md`);
}

const [cmd, v] = process.argv.slice(2);
if (!cmd || !v || !['init', 'status', 'check', 'report'].includes(cmd)) {
  console.error('usage: node tools/rules-ledger.mjs <init|status|check|report> <version, e.g. 0.6.0>');
  process.exit(2);
}
try {
  if (cmd === 'init') init(v);
  else if (cmd === 'status') status(v);
  else if (cmd === 'check') process.exit(check(v) ? 0 : 1);
  else report(v);
} catch (err) { console.error(err.message); process.exit(2); }
