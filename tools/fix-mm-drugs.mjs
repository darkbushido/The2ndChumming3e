/**
 * Man & Machine's drugs: one item per drug, every column filled from the book · TODO 124.
 *
 *   node tools/fix-mm-drugs.mjs          # rewrite packs-src/sr3e-mm-drugs, rebuild the pack
 *   node tools/fix-mm-drugs.mjs --check  # report only; exit 1 if anything would change
 *
 * The pack came from two upstream sources and most drugs shipped TWICE — one item with Speed and
 * Vector, another with Addiction, Tolerance and Edge — so the addiction rules (M&M p.108) had
 * nothing whole to read. Worse: CS carried its Speed and Vector swapped, Neuro-stun IX/X shipped
 * again as "Neurostun", Novacoke was spelled Novocoke, and Kamikaze's addiction row was SR2's
 * (4P, sr2.246 — SR2 has its own Kamikaze in sr3e-sr2-drugs; M&M prints 5P, pp.120 and 157).
 *
 * Source: `rawdata/MM-Drugs.json`, transcribed from M&M's tables (pp.122, 157-158).
 * - Every column the book prints is the BOOK'S; a differing non-blank value is replaced and
 *   REPORTED. That includes purchasing: nine availabilities were wrong on the first run, most of
 *   them another column's value (Green Ring 3 "500" — its cost; Bliss "2/30min" — Burn's).
 * - `category` is set only where the transcription gives one (the magical compounds, p.123);
 *   elsewhere the pack keeps upstream's finer classes (Stimulants, Narcotics …).
 * - The legacy `effect` field (the upstream name for Edge) moves to `edge`, or to `damage` when it
 *   held a damage code ("6D stun", "Special").
 * Ids are kept: the item a group keeps is the one a world most likely copied (the correctly
 * named one, then the one with the addiction data). Idempotent — a second run changes nothing.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readSourceDir, writeSourceDir, rebuildPack } from './lib/pack-source.mjs';
import { DrugRules } from '../scripts/data/drug-rules.mjs';

const REPO  = join(dirname(fileURLToPath(import.meta.url)), '..');
const PACK  = 'sr3e-mm-drugs';
const check = process.argv.includes('--check');
const book  = JSON.parse(readFileSync(join(REPO, 'rawdata', 'MM-Drugs.json'), 'utf8'));
const rows  = new Map(book.drugs.map(d => [d.name, d]));
const alias = n => book.aliases[n] ?? n;

const STATS    = ['vector', 'speed', 'damage', 'addiction', 'tolerance', 'edge', 'fixFactor', 'legality'];
const PURCHASE = ['availability', 'cost', 'streetIndex'];
const blank = v => v === undefined || v === null || v === '' || v === 0;
const norm  = v => String(v ?? '').toLowerCase().replace(/\s+/g, '').replace(/[—–]/g, '-');

const dir     = join(REPO, 'packs-src', PACK);
const entries = readSourceDir(dir);
const groups  = new Map();
// ⚠ Documents `tools/build-default-gear.mjs` generated (Narcoject) are that tool's to write — it
// regenerates them from upstream and its test fails on any other edit. Left exactly as they are.
const generated = doc => doc?.flags?.The2ndChumming3e?.generatedBy === 'build-default-gear';
for (const [key, doc] of entries) {
  if (!key.startsWith('!items!') || generated(doc)) continue;
  const name = alias(doc.name);
  if (!groups.has(name)) groups.set(name, []);
  groups.get(name).push(key);
}

const out = new Map([...entries].filter(([k, d]) => !k.startsWith('!items!') || generated(d)));
const report = [];
let changed = 0;
for (const [name, keys] of [...groups].sort(([a], [b]) => a.localeCompare(b))) {
  const score = k => (entries.get(k).name === name ? 2 : 0) + (entries.get(k).system?.addiction ? 1 : 0);
  keys.sort((a, b) => score(b) - score(a) || a.localeCompare(b));
  const [keepKey, ...drop] = keys;
  const before = JSON.stringify(entries.get(keepKey));
  const doc = JSON.parse(before);
  const sys = doc.system;
  const others = drop.map(k => entries.get(k).system);

  // Merge the halves: the keeper's value, else the first other item's.
  for (const f of Object.keys(sys)) {
    if (!blank(sys[f])) continue;
    const from = others.find(o => !blank(o?.[f]));
    if (from) sys[f] = from[f];
  }
  // A page from the item's own book beats an SR2 page an import left on it.
  if (/^sr2\./.test(sys.bookPage ?? '')) sys.bookPage = others.map(o => o.bookPage).find(p => /^mm\./.test(p ?? '')) ?? sys.bookPage;

  // The legacy Edge column.
  for (const o of [sys, ...others]) {
    if (blank(o.effect)) continue;
    if (DrugRules.parseEdge(o.effect)) { if (blank(sys.edge)) sys.edge = o.effect; }
    else if (blank(sys.damage)) sys.damage = o.effect;
  }
  sys.effect = '';

  const row = rows.get(name);
  if (!row) report.push(`  ? ${name}: not in M&M's tables — merged only`);
  else {
    for (const f of [...STATS, ...PURCHASE, 'category']) {
      if (blank(row[f]) || norm(row[f]) === norm(sys[f])) continue;
      if (!blank(sys[f])) report.push(`  ~ ${name}.${f}: "${sys[f]}" → "${row[f]}"`);
      sys[f] = row[f];
    }
  }
  if (doc.name !== name) { report.push(`  ~ name: "${doc.name}" → "${name}"`); doc.name = name; }
  if (drop.length) report.push(`  - ${name}: merged ${drop.length} duplicate${drop.length > 1 ? 's' : ''} (${drop.map(k => k.slice(7)).join(', ')}) into ${keepKey.slice(7)}`);
  if (drop.length || JSON.stringify(doc) !== before) changed++;
  out.set(keepKey, doc);
}

console.log(report.length ? report.join('\n') : '  nothing to change');
if (check) { console.log(`\n${changed} drug(s) would change.`); process.exit(changed ? 1 : 0); }
if (!changed) { console.log('\nsr3e-mm-drugs already matches the book.'); process.exit(0); }
const r = writeSourceDir(dir, out);
const rebuilt = existsSync(join(REPO, 'packs')) ? await rebuildPack(REPO, PACK) : false;
console.log(`\n${changed} drug(s) changed — packs-src: ${r.written} written, ${r.removed} removed; pack ${rebuilt ? 'rebuilt' : 'unchanged'}.`);
