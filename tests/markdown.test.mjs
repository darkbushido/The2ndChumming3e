/**
 * Markdown that renders wrong while its text reads fine — `npm run docs:check` (tools/check-markdown.mjs).
 * TODO-DONE.md #105-#108 were written with \` for `, and #108's escaped `<select>` became a real dropdown
 * that swallowed every entry after it in a Markdown preview.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkMarkdown, trackedMarkdown, ROOT } from '../tools/check-markdown.mjs';

export const name = 'markdown';

export async function run(t) {
  // The detector, on the shapes that actually shipped.
  const hits = s => checkMarkdown(s).map(f => f.message.split(' ')[0] + ':' + f.line);
  t.eq('an escaped backtick is caught', hits('by \\`handleMeleeRoll\\` here').length, 2);
  t.ok('…and the <select> it exposed', hits('covers this \\`<select>\\`, and').some(h => h.startsWith('raw')));
  t.eq('the line number is right', checkMarkdown('a\nb\nc \\`x\\`')[0]?.line, 3);
  t.eq('code spans are left alone', hits('a `<select>` and ``x `y` z`` and `\\`'), []);
  t.eq('fenced blocks are left alone', hits('```html\n<select>\n<div>\n```\ntext'), []);
  t.eq('anchors, <br>, <details> and prose placeholders are allowed',
    hits('<a id="1"></a> x<br>y <details><summary>s</summary></details> <weapon> <user>'), []);
  t.ok('an unlisted real element is caught', hits('see <div class="x"> here').length === 1);

  // The repository itself.
  const found = [];
  for (const f of trackedMarkdown()) {
    for (const p of checkMarkdown(readFileSync(join(ROOT, f), 'utf8'))) found.push(`${f}:${p.line} ${p.message}`);
  }
  t.eq('no tracked Markdown file has a rendering hazard — npm run docs:check', found, []);
}
