/**
 * Every shipped SVG parses — 0.9.0 bug: armor-shield/-suit/-plate ended on an unclosed `<path …` (the
 * generator, tools/build-item-icons.mjs, dropped the `/>`), so browsers showed a broken image in the designer.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

export async function run(t) {
  const dir = join(root, 'styles/icons');
  const bad = [];
  for (const f of readdirSync(dir).filter(n => n.endsWith('.svg'))) {
    const src = readFileSync(join(dir, f), 'utf8');
    // Every tag closes before the next one opens.
    if (/<[a-zA-Z][^<>]*</.test(src) || !/<\/svg>\s*$/.test(src)) bad.push(f);
  }
  t.ok(`every styles/icons SVG is well formed${bad.length ? ` — broken: ${bad.join(', ')}` : ''}`, bad.length === 0);
  const gen = readFileSync(join(root, 'tools/build-item-icons.mjs'), 'utf8');
  t.ok('the icon generator never ends an entry on an unclosed tag', !/^<[a-z]+ [^>]*`\],$/m.test(gen));
}
