/** IC Memory = Rating² × Final Multiplier · MDF p.33, pp.40-44 · and the `sr3e-mdf-ic` pack pinned to it. */
import { readFileSync, readdirSync } from 'node:fs';
import { AGENT_IC, PASSIVE_IC, icMemory } from '../scripts/data/ic-memory.mjs';

export const name = 'ic-memory';

export async function run(t) {
  // Spot values read off the PROGRAM SIZE TABLE (p.33).
  t.eq('Rating 6 × multiplier 7 = 252 (table row 6, col 7)', icMemory('Blaster', 6), 252);
  t.eq('Rating 6 × multiplier 26 = 936', icMemory('Sparky', 6), 936);
  t.eq('Rating 5 × multiplier 3 = 75 (table row 5, col 3)', icMemory('ARis', 5), 75);
  t.eq('Alert and System Sweep are a flat 100 Mp, whatever the rating', [icMemory('Alert', 4), icMemory('System Sweep', 9)], [100, 100]);
  t.eq('Barrier ×3 and Databomb ×4 at Rating 6', [icMemory('Barrier', 6), icMemory('Databomb', 6)], [108, 144]);
  t.eq('an IC the book does not print costs 0, not NaN', icMemory('Nonesuch', 6), 0);
  t.eq('15 agents are tabled, 5 passive', [Object.keys(AGENT_IC).length, Object.keys(PASSIVE_IC).length], [15, 5]);

  // The pack must say what the book says. It was hand-authored (10-30 Mp each, five wrong gradings) until the
  // 2026-11 match against MDF pp.40-44.
  const dir = new URL('../packs-src/sr3e-mdf-ic/', import.meta.url);
  const entries = readdirSync(dir).map(f => JSON.parse(readFileSync(new URL(f, dir), 'utf8')).doc);
  const byName = n => entries.find(e => e.name === n || e.name === `${n} (Passive)`);
  const bad = [];
  for (const [name, book] of Object.entries(AGENT_IC)) {
    const e = byName(name);
    if (!e) { bad.push(`${name} missing`); continue; }
    if (e.system.grading !== book.grading) bad.push(`${name} grading ${e.system.grading} ≠ ${book.grading}`);
    if (e.system.memoryRequired !== icMemory(name, e.system.rating)) bad.push(`${name} Mp ${e.system.memoryRequired}`);
    if (!String(e.system.bookPage).endsWith(`.${book.page}`)) bad.push(`${name} page ${e.system.bookPage}`);
  }
  for (const name of Object.keys(PASSIVE_IC)) {
    const e = byName(name);
    if (!e) bad.push(`${name} missing`);
    else if (e.system.memoryRequired !== icMemory(name, e.system.rating)) bad.push(`${name} Mp ${e.system.memoryRequired}`);
  }
  t.eq('every sr3e-mdf-ic entry matches its MDF grading, Mp and page', bad, []);
}
