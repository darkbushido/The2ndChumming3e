/**
 * Markdown hazards that break how a file RENDERS while the text still reads fine — `npm run docs:check`.
 *
 *   · an escaped backtick (\`) outside code: the backslash makes the backtick literal, so the code span
 *     never opens and whatever it wrapped is read as Markdown/HTML. TODO-DONE.md #105-#108 had 13 of them;
 *   · a raw HTML element outside code that is not on the allowlist. #108's escaped `<select>` became a
 *     real dropdown and every entry after it vanished into it in a Markdown preview.
 *
 * Prose placeholders (`<weapon>`, `<user>`) are not HTML element names and are left alone. Fenced blocks
 * and inline code spans are stripped before checking, keeping line numbers.
 *
 *   npm run docs:check              every tracked *.md
 *   node tools/check-markdown.mjs FILE…
 *
 * Read-only. Exits 1 on a finding.
 */
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Tags the docs use on purpose: TODO anchors, table line breaks, collapsible sections. */
export const ALLOWED_TAGS = new Set(['a', 'br', 'details', 'summary', 'sub', 'sup', 'kbd']);

/** Real HTML element names — anything else in angle brackets is a placeholder, not markup. */
const HTML_ELEMENTS = new Set(`a abbr address area article aside audio b base bdi bdo blockquote body br button
canvas caption cite code col colgroup data datalist dd del details dfn dialog div dl dt em embed fieldset
figcaption figure footer form h1 h2 h3 h4 h5 h6 head header hr html i iframe img input ins kbd label legend li
link main map mark menu meta meter nav noscript object ol optgroup option output p picture pre progress q rp rt
ruby s samp script section select slot small source span strong style sub summary sup table tbody td template
textarea tfoot th thead time title tr track u ul var video wbr`.split(/\s+/));

/** Blank out code (fences and inline spans) so it is never checked, preserving line breaks. */
function stripCode(text) {
  const blank = s => s.replace(/[^\n]/g, ' ');
  return text
    .replace(/^([ \t]*)(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1\2[ \t]*$/gm, blank)
    .replace(/(?<!\\)(`+)(?!`)[\s\S]*?(?<!`)\1(?!`)/g, blank);
}

/** @returns {{line: number, message: string}[]} */
export function checkMarkdown(text) {
  const src = stripCode(text.replace(/\r\n/g, '\n'));
  const lineOf = i => src.slice(0, i).split('\n').length;
  const out = [];
  for (const m of src.matchAll(/\\`/g)) {
    out.push({ line: lineOf(m.index), message: 'escaped backtick (\\`) — the code span never opens; use a plain `' });
  }
  for (const m of src.matchAll(/<\/?([a-zA-Z][\w-]*)(?:\s[^<>\n]*)?\/?>/g)) {
    const tag = m[1].toLowerCase();
    if (HTML_ELEMENTS.has(tag) && !ALLOWED_TAGS.has(tag)) {
      out.push({ line: lineOf(m.index), message: `raw HTML <${tag}> outside code — wrap it in backticks` });
    }
  }
  return out.sort((a, b) => a.line - b.line);
}

export function trackedMarkdown() {
  return execFileSync('git', ['ls-files', '*.md'], { cwd: ROOT, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const files = process.argv.length > 2 ? process.argv.slice(2) : trackedMarkdown();
  let bad = 0;
  for (const f of files) {
    for (const { line, message } of checkMarkdown(readFileSync(path.resolve(ROOT, f), 'utf8'))) {
      console.log(`${f}:${line}  ${message}`);
      bad++;
    }
  }
  console.log(bad ? `\n${bad} Markdown problem(s) in ${files.length} files.` : `Markdown OK — ${files.length} files.`);
  process.exit(bad ? 1 : 0);
}
