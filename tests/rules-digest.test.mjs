/**
 * The rules digest (`.claude/rules-digest.md`, TODO 289) must never drift from `.claude/rules/*.md`.
 *
 *   · the committed digest is byte-for-byte what `node tools/rules-digest.mjs --write` produces —
 *     so any edit to a rules file, a heading or a cited page fails here until it is regenerated;
 *   · every rules file is listed with its hash, and every section heading appears;
 *   · the parser finds book citations, bare pages, owners, and maps SR3 to PDF page = printed + 2;
 *   · it stays small (the point is tokens) and never reads SR-OCR/.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildDigest, citations, owners, pdfFor, sections, lookup, rulesFiles, DIGEST, RULES_DIR, ROOT } from '../tools/rules-digest.mjs';

export const name = 'rules-digest';

const read = p => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');

export async function run(t) {
  const committed = read(DIGEST), built = buildDigest();
  t.ok('digest is current — run: node tools/rules-digest.mjs --write', committed === built);

  for (const f of rulesFiles()) {
    t.ok(`digest lists ${f} with a hash`, new RegExp(`\`${f}\` [0-9a-f]{12}`).test(committed));
    const n = sections(read(join(RULES_DIR, f))).filter(s => s.level > 1).length;
    const block = committed.split(`\n## ${f.replace(/\.md$/, '')}\n`)[1]?.split('\n## ')[0] ?? '';
    t.eq(`${f}: one digest line per section`, block.split('\n').filter(l => l.startsWith('- **')).length, n);
  }

  // A changed page must change the digest (the drift the test exists for).
  t.ok('a cited page change changes the line', buildDigest() !== built.replace('SR3 p.113-114', 'SR3 p.115'));

  t.eq('citations: coded, ranged and bare', citations('· *SR3 p.38-39* … MitS p.151 … · *p.168*').map(c => `${c.code} p.${c.page}`),
    ['SR3 p.38-39', 'MITS p.151', '? p.168']);
  t.eq('a page in a list inherits the book before it', citations('SR3 p.124, p.116 · M&M p.63/p.71 · Cannon Companion p.86')
    .map(c => `${c.code} p.${c.page}`), ['SR3 p.124', 'SR3 p.116', 'MM p.63', 'MM p.71', 'CC p.86']);
  t.eq('a word ending in p is not a page', citations('see app.12 and step.3'), []);
  t.eq('SR3 maps to PDF page = printed + 2', pdfFor({ code: 'SR3', first: 113 }), 'Shadowrun 3e - Core Rules {FAN25000}.pdf PDF p.115');
  t.ok('a book with no verified offset never guesses one', pdfFor({ code: 'CC', first: 10 }).includes('offset unverified'));
  t.eq('owners: backticked repo files', owners('in `scripts/data/combat-pool.mjs` and `tests/x.test.mjs:12`, not `foo`'),
    ['scripts/data/combat-pool.mjs', 'tests/x.test.mjs']);

  // TODO 290: every citation in the rules files names its book (each was checked against its PDF).
  t.eq('no rules-file citation is missing its book', rulesFiles().flatMap(f =>
    citations(read(join(RULES_DIR, f))).filter(c => c.code === '?').map(c => `${f} p.${c.page}`)), []);

  t.ok('lookup finds a section by heading', lookup(['damage', 'staging']).some(h => h.inHead && h.rel.endsWith('combat-resolution.md')));

  // The point is tokens: the digest must stay a small fraction of what it replaces.
  const full = rulesFiles().reduce((n, f) => n + read(join(RULES_DIR, f)).length, 0);
  t.ok('digest is under 15% of the rules files it indexes', committed.length < full * 0.15, `${committed.length} vs ${full}`);

  const src = read(join(ROOT, 'tools', 'rules-digest.mjs'));
  t.ok('the tool never reads SR-OCR', !/readFileSync\([^)]*SR-OCR|join\([^)]*'SR-OCR'/.test(src));
}
