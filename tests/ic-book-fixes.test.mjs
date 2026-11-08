/** The 0.9.0 IC migration · MDF pp.40-44 · TODO 128. Pure rule, plus that it is wired into MIGRATIONS. */
import { readFileSync } from 'node:fs';
import { IcBookFixes, OLD } from '../scripts/data/ic-book-fixes.mjs';
import { AGENT_IC, icMemory } from '../scripts/data/ic-memory.mjs';

export const name = 'ic-book-fixes';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

const ic = (n, system = {}) => ({ type: 'ic', name: n, system: { icType: n, rating: 6, ...OLD_FIELDS(n), ...system } });
const OLD_FIELDS = n => ({ grading: OLD[n].grading, memoryRequired: OLD[n].mem, bookPage: OLD[n].page ?? 'matrix-defragged.40' });
const host = (rows, memoryUsed) => ({ type: 'host', name: 'H', system: { stockedIC: rows, memoryUsed } });

export async function run(t) {
  t.eq('the old table covers exactly the 15 tabled agents', Object.keys(OLD).sort(), Object.keys(AGENT_IC).sort());

  // An untouched copy of each old pack entry is corrected to the book.
  const wrong = [];
  for (const n of Object.keys(OLD)) {
    const d = IcBookFixes.fixActor(ic(n));
    const want = icMemory(n, 6);
    if (OLD[n].mem !== want && d?.['system.memoryRequired'] !== want) wrong.push(`${n} Mp`);
    if (OLD[n].grading !== AGENT_IC[n].grading && d?.['system.grading'] !== AGENT_IC[n].grading) wrong.push(`${n} grading`);
  }
  t.eq('every shipped IC copy is brought to the book', wrong, []);
  t.eq('Killer: Black/25 → Gray/288', IcBookFixes.fixActor(ic('Killer')), { 'system.grading': 'Gray', 'system.memoryRequired': 288 });
  t.eq('Blaster keeps its grading, Mp 18 → 252', IcBookFixes.fixActor(ic('Blaster')), { 'system.memoryRequired': 252 });
  t.eq('Dataworm also gets its page', IcBookFixes.fixActor(ic('Dataworm'))?.['system.bookPage'], 'matrix-defragged.41');

  // Houserule protection: only the exact shipped value is replaced.
  t.eq('an edited Mp is kept', IcBookFixes.fixActor(ic('Killer', { memoryRequired: 40 }))?.['system.memoryRequired'], undefined);
  t.eq('an edited grading is kept', IcBookFixes.fixActor(ic('Killer', { grading: 'White' }))?.['system.grading'], undefined);
  t.eq('the Mp uses the IC\'s real Rating', IcBookFixes.fixActor(ic('Blaster', { rating: 4 }))?.['system.memoryRequired'], 112);
  t.eq('matched by icType even when the actor is renamed', IcBookFixes.fixActor({ ...ic('Killer'), name: 'Mr. Smith' }) !== null, true);
  t.eq('an IC the book never printed is untouched', IcBookFixes.fixActor({ type: 'ic', name: 'Home-brew', system: { icType: 'Home-brew', memoryRequired: 12 } }), null);
  t.eq('a passive IC is untouched', IcBookFixes.fixActor({ type: 'ic', name: 'Barrier (Passive)', system: { icType: 'Barrier', memoryRequired: 108 } }), null);
  t.eq('a character is untouched', IcBookFixes.fixActor({ type: 'character', name: 'Killer', system: {} }), null);

  // Idempotent: apply the delta, run again.
  const once = ic('Sparky');
  const d = IcBookFixes.fixActor(once);
  for (const [k, v] of Object.entries(d)) once.system[k.replace('system.', '')] = v;
  t.eq('a second run yields null', IcBookFixes.fixActor(once), null);

  // Hosts: stocked rows and memoryUsed.
  const rows = [{ actorId: 'a1', name: 'Killer', memoryRequired: 25 }, { actorId: 'a2', name: 'Alert', memoryRequired: 100 }];
  const hd = IcBookFixes.fixActor(host(rows, 125), id => (id === 'a1' ? 6 : 4));
  t.eq('a stocked row is corrected, a passive one kept', hd?.['system.stockedIC'].map(r => r.memoryRequired), [288, 100]);
  t.eq('memoryUsed follows while it was the old sum', hd?.['system.memoryUsed'], 388);
  t.eq('an edited memoryUsed is kept', IcBookFixes.fixActor(host(rows, 999))?.['system.memoryUsed'], undefined);
  t.eq('a row with no actor behind it reads at Rating 6', IcBookFixes.fixActor(host([{ name: 'Killer', memoryRequired: 25 }], 25))?.['system.stockedIC'][0].memoryRequired, 288);
  t.eq('a host with nothing stocked yields null', IcBookFixes.fixActor(host([], 0)), null);
  t.eq('a host whose rows are already corrected yields null', IcBookFixes.fixActor(host([{ name: 'Killer', memoryRequired: 288 }], 288)), null);

  // Wired in, at the number the maintainer chose.
  const mig = read('scripts/SR3EMigrations.js');
  t.ok('the 0.9.0 migration is registered and runs IcBookFixes', mig.includes("version: '0.9.0'") && mig.includes('IcBookFixes.fixActor'));
}
