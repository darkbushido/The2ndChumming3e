/**
 * TODO.md holds only open work; TODO-DONE.md holds the finished items — `npm run todo:archive`.
 *
 *   · no item marked ✅ is left in TODO.md, and nothing unfinished sits in TODO-DONE.md;
 *   · every number from 1 to the highest is in exactly one of the two (numbers are cited from
 *     code, tests, CLAUDE.md and commits, so one must never vanish or be reused);
 *   · every link to a numbered item names the file that holds it;
 *   · the files are what a run of the tool would write (the Contents table is generated).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { plan, ROOT } from '../tools/todo-archive.mjs';

export const name = 'todo-archive';

const read  = rel => readFileSync(join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
const items = text => [...text.matchAll(/^## (\d+)\.\s(.*)$/gm)].map(m => ({ n: Number(m[1]), done: m[2].includes('✅') }));

export async function run(t) {
  const todo = read('TODO.md'), done = read('TODO-DONE.md');
  const open = items(todo), closed = items(done);

  t.eq('no ✅ item left in TODO.md — run npm run todo:archive', open.filter(i => i.done).map(i => i.n), []);
  t.eq('nothing unfinished in TODO-DONE.md', closed.filter(i => !i.done).map(i => i.n), []);

  const all = [...open, ...closed].map(i => i.n).sort((a, b) => a - b);
  const max = all.at(-1);
  t.ok('some items exist', all.length > 100, String(all.length));
  t.eq('every number 1..max appears exactly once across both files',
    Array.from({ length: max }, (_, i) => i + 1).filter(n => all.filter(x => x === n).length !== 1), []);

  const home = Object.fromEntries([...open.map(i => [i.n, 'TODO.md']), ...closed.map(i => [i.n, 'TODO-DONE.md'])]);
  const wrong = [];
  const check = (file, text, self) => {
    for (const m of text.matchAll(/\]\((?:\.\.\/)?(TODO(?:-DONE)?\.md)?#(\d+)[^)]*\)/g)) {
      const target = m[1] ?? self;
      if (home[m[2]] && target !== home[m[2]]) wrong.push(`${file}: ${m[0]}`);
    }
  };
  check('TODO.md', todo, 'TODO.md');
  check('TODO-DONE.md', done, 'TODO-DONE.md');
  for (const f of readdirSync(join(ROOT, 'audit')).filter(f => f.endsWith('.md'))) {
    const text = read(`audit/${f}`);
    for (const m of text.matchAll(/\]\((?:\.\.\/)?(TODO(?:-DONE)?\.md)#(\d+)[^)]*\)/g))
      if (home[m[2]] && m[1] !== home[m[2]]) wrong.push(`audit/${f}: ${m[0]}`);
  }
  t.eq('every link to an item names the file holding it', wrong, []);

  const { files } = plan();
  const stale = Object.entries(files).filter(([p, text]) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n') !== text).map(([p]) => p);
  t.eq('the files match what npm run todo:archive would write', stale, []);
}
