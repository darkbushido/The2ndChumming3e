/**
 * Move finished TODOs out of TODO.md into TODO-DONE.md, so TODO.md shows only what is left.
 *
 *   npm run todo:archive           move every ✅ item, regenerate the Contents table
 *   npm run todo:archive -- --check  exit 1 if a run would change anything (changes nothing)
 *
 * An item is `## N. Title`. It is DONE when its heading carries ✅ — mark it, then run this.
 * Numbers never change: an archived item keeps its number, and links to it are rewritten to
 * point at whichever file now holds it (`TODO.md#48` ↔ `TODO-DONE.md#48`), in both files and
 * in `audit/*.md`. Un-mark an item (remove the ✅) and a run moves it back.
 *
 * TODO.md is laid out by GROUP (`### <group>` headings, the names in GROUPS). Everything under
 * the `📌 Notes & parked` heading that is not a numbered item stays at the end of TODO.md.
 * A `## ` heading that is not numbered belongs to the item above it and travels with it.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export const GROUPS = [
  '🔵 In progress',
  '🟢 Socket combat — follow-ups',
  '🔴 Confirmed bugs, still open',
  '📕 Rules not implemented',
  '🧙 Adept powers',
  '🪄 Spells & drugs',
  '🖥 Matrix',
  '📦 Content gaps',
  '🔧 Tooling & infrastructure',
  '🧹 Housekeeping',
  '🗂 Unsorted',
];
const NOTES = '📌 Notes & parked';
const DONE_GROUP = '✅ Done — kept for the record';   // the pre-split layout's heading; dropped

// Items the pre-split Contents table never listed.
const FIRST_RUN_GROUP = { 125: '📦 Content gaps' };

const ITEM_RE = /^## (\d+)\.\s/;
const isDone  = heading => heading.includes('✅');

/** Strip a group name down to its leading words, so '🧙 Adept powers — see …' matches. */
const groupOf = cell => GROUPS.find(g => cell.startsWith(g)) ?? null;

/** Split a file into { preamble, blocks: [{kind:'group'|'item'|'notes', …, lines}] }. */
function segment(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const headingKind = l => {
    if (ITEM_RE.test(l)) return 'item';
    const m = /^### (.+)$/.exec(l);
    if (!m) return null;
    if (m[1].startsWith(NOTES)) return 'notes';
    if (m[1] === DONE_GROUP || groupOf(m[1])) return 'group';
    return null;
  };
  const blocks = [];
  let preamble = [];
  let cur = null;
  for (const l of lines) {
    const kind = headingKind(l);
    if (kind) {
      cur = { kind, lines: [l] };
      if (kind === 'item') { cur.n = Number(ITEM_RE.exec(l)[1]); cur.done = isDone(l); }
      if (kind === 'group') cur.name = l.slice(4) === DONE_GROUP ? DONE_GROUP : groupOf(l.slice(4));
      blocks.push(cur);
    } else if (cur) cur.lines.push(l);
    else preamble.push(l);
  }
  for (const b of blocks) while (b.lines.length && b.lines.at(-1).trim() === '') b.lines.pop();
  while (preamble.length && preamble.at(-1).trim() === '') preamble.pop();
  return { preamble, blocks };
}

/** Group membership read from the pre-split Contents table (first run only). */
function groupsFromContents(preamble) {
  const byNum = {}, inParens = {};
  for (const row of preamble) {
    const m = /^\| ([^|]+?) \| (.*) \|$/.exec(row);
    if (!m) continue;
    const g = groupOf(m[1]);
    if (!g) continue;
    const outside = m[2].replace(/\([^)]*\)/g, ' ');
    for (const [n] of outside.matchAll(/\b\d+\b/g)) byNum[n] ??= g;
    for (const [n] of m[2].matchAll(/\b\d+\b/g)) inParens[n] = g;   // last mention wins
  }
  return { byNum, inParens };
}

const title = b => b.lines[0].replace(ITEM_RE, '').replace(/\s+—\s+\*\*.*$/, '').trim();

/** Rewrite links to a numbered item so they name the file that holds it. */
function relink(text, whereIs, prefix = '') {
  return text.replace(/\]\(((?:\.\.\/)?)(TODO(?:-DONE)?\.md)?#(\d+)([^)]*)\)/g, (all, up, _file, n, rest) => {
    const target = whereIs[n];
    if (!target) return all;
    if (prefix === '' && !up && target === 'SELF') return `](#${n}${rest})`;
    return `](${up || prefix}${target === 'SELF' ? whereIs.__self : target}#${n}${rest})`;
  });
}

export function plan(root = ROOT) {
  const todoPath = join(root, 'TODO.md'), donePath = join(root, 'TODO-DONE.md');
  const todo = segment(readFileSync(todoPath, 'utf8'));
  const done = existsSync(donePath) ? segment(readFileSync(donePath, 'utf8')) : null;

  // The Contents section is regenerated; keep everything else in the preamble.
  const cStart = todo.preamble.findIndex(l => l === '## Contents');
  let cEnd = cStart;
  if (cStart >= 0) { cEnd = cStart + 1; while (cEnd < todo.preamble.length && !/^#/.test(todo.preamble[cEnd])) cEnd++; }
  const contentsRows = cStart >= 0 ? todo.preamble.slice(cStart, cEnd) : [];
  const preamble = cStart >= 0 ? [...todo.preamble.slice(0, cStart), ...todo.preamble.slice(cEnd)] : todo.preamble;
  while (preamble.length && preamble.at(-1).trim() === '') preamble.pop();
  const firstRun = contentsRows.some(r => r.includes(DONE_GROUP));
  const table = firstRun ? groupsFromContents(contentsRows) : { byNum: {}, inParens: {} };

  const items = [], notes = [];
  let group = null;
  for (const b of todo.blocks) {
    if (b.kind === 'group') { group = b.name; continue; }
    if (b.kind === 'notes') { group = NOTES; notes.push(b); continue; }
    const g = table.byNum[b.n] ?? table.inParens[b.n] ?? FIRST_RUN_GROUP[b.n]
      ?? (GROUPS.includes(group) ? group : '🗂 Unsorted');
    items.push({ ...b, group: g });
  }
  for (const b of done?.blocks ?? []) if (b.kind === 'item') items.push({ ...b, group: '🗂 Unsorted' });

  const seen = new Set();
  for (const it of items) {
    if (seen.has(it.n)) throw new Error(`TODO ${it.n} appears twice across TODO.md and TODO-DONE.md`);
    seen.add(it.n);
  }
  const open = items.filter(i => !i.done).sort((a, b) => a.n - b.n);
  const closed = items.filter(i => i.done).sort((a, b) => a.n - b.n);

  const whereIs = {};
  for (const i of open) whereIs[i.n] = 'TODO.md';
  for (const i of closed) whereIs[i.n] = 'TODO-DONE.md';
  const local = self => Object.fromEntries(Object.entries(whereIs).map(([n, f]) => [n, f === self ? 'SELF' : f]).concat([['__self', self]]));

  // ── TODO.md ──
  const out = [...preamble, '', '## Contents', '',
    `**${open.length} open.** ${closed.length} done — see [TODO-DONE.md](TODO-DONE.md).`, '',
    '| Group | Open |', '|---|---|'];
  for (const g of GROUPS) {
    const gi = open.filter(i => i.group === g);
    if (gi.length) out.push(`| ${g} | ${gi.map(i => `[${i.n}](#${i.n}) ${title(i).replace(/\|/g, '\\|')}`).join('<br>')} |`);
  }
  out.push(`| ${NOTES} | combat-audit questions · known drift · ODM/MDF |`, '');
  for (const g of GROUPS) {
    const gi = open.filter(i => i.group === g);
    if (!gi.length) continue;
    out.push(`### ${g}`, '');
    for (const i of gi) out.push(...i.lines, '');
  }
  for (const b of notes) out.push(...b.lines, '');
  const todoText = relink(out.join('\n').replace(/\n+$/, '\n'), local('TODO.md'));

  // ── TODO-DONE.md ──
  const dOut = done?.preamble.length ? [...done.preamble, ''] : [
    '# TODO — done', '',
    'Finished items, moved here from [TODO.md](TODO.md) by `npm run todo:archive`. Kept for the',
    'record: each keeps its number, its reasoning and the commit that closed it, because code,',
    'tests, CLAUDE.md and commit messages cite them by number. In number order.', '',
    '⚠ Several entries record something **left open** or **noticed and not fixed** inside an',
    'otherwise finished item. If one of those becomes work, give it a new number in TODO.md.', ''];
  for (const i of closed) dOut.push(...i.lines, '');
  const doneText = relink(dOut.join('\n').replace(/\n+$/, '\n'), local('TODO-DONE.md'));

  // ── audit/*.md — they link as ../TODO.md#N ──
  const files = { [todoPath]: todoText, [donePath]: doneText };
  const auditDir = join(root, 'audit');
  if (existsSync(auditDir)) for (const f of readdirSync(auditDir).filter(f => f.endsWith('.md'))) {
    const p = join(auditDir, f);
    const before = readFileSync(p, 'utf8');
    const after = before.replace(/(\]\((?:\.\.\/)?)TODO(?:-DONE)?\.md#(\d+)/g,
      (all, head, n) => whereIs[n] ? `${head}${whereIs[n]}#${n}` : all);
    if (after !== before) files[p] = after;
  }
  return { files, open: open.map(i => i.n), closed: closed.map(i => i.n) };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { files, open, closed } = plan();
  const changed = Object.entries(files).filter(([p, t]) => !existsSync(p) || readFileSync(p, 'utf8').replace(/\r\n/g, '\n') !== t);
  if (process.argv.includes('--check')) {
    if (changed.length) { console.error(`todo:archive would change: ${changed.map(([p]) => p).join(', ')}`); process.exit(1); }
    console.log(`TODO.md is tidy — ${open.length} open, ${closed.length} done.`);
  } else {
    for (const [p, t] of changed) writeFileSync(p, t);
    console.log(`${open.length} open, ${closed.length} done. Wrote ${changed.length} file(s).`);
  }
}
