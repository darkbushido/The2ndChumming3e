/**
 * The drug packs carry what the drug rules read · TODO 124.
 *
 * Man & Machine's pack shipped most drugs as TWO half-items (Speed/Vector on one, Addiction/
 * Tolerance/Edge on the other), with CS's Speed and Vector swapped, nine availabilities taken from
 * the wrong column, and SR2's Kamikaze rating on the M&M item. `tools/fix-mm-drugs.mjs` rebuilt it
 * from a transcription of the book's tables (`rawdata/MM-Drugs.json`); this keeps it that way.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { DrugRules } from '../scripts/data/drug-rules.mjs';

export const name = 'drug-packs';

const root   = new URL('../', import.meta.url);
const fsPath = u => u.pathname.replace(/^\/([A-Za-z]:)/, '$1');
const items  = pack => {
  const dir = fsPath(new URL(`packs-src/${pack}`, root));
  return readdirSync(dir).map(f => JSON.parse(readFileSync(join(dir, f), 'utf8'))).filter(g => g._key.startsWith('!items!')).map(g => g.doc);
};

export async function run(t) {
  const mm   = items('sr3e-mm-drugs');
  const book = JSON.parse(readFileSync(new URL('rawdata/MM-Drugs.json', root), 'utf8')).drugs;
  const by   = n => mm.find(d => d.name === n)?.system;

  const names = mm.map(d => d.name);
  t.eq('one item per drug — no half-items left', names.filter((n, i) => names.indexOf(n) !== i), []);
  t.eq('every drug in M&M\'s tables ships', book.map(r => r.name).filter(n => !names.includes(n)), []);
  t.eq('no item keeps its Edge in the legacy `effect` field', mm.filter(d => d.system.effect).map(d => d.name), []);
  const addictive = mm.filter(d => d.system.addiction);
  t.ok('the addictive drugs are there', addictive.length >= 12, `${addictive.length}`);
  t.eq('…each with an Edge the rules can read', addictive.filter(d => !DrugRules.drugEdge(d.system)).map(d => d.name), []);
  t.eq('…and a Fix Factor', addictive.filter(d => !d.system.fixFactor).map(d => d.name), []);
  t.eq('Cram is 4M / 2 / 5/50 / 2 days — the book\'s worked example (p.109, p.122)',
    ['addiction', 'tolerance', 'edge', 'fixFactor'].map(f => by('Cram')?.[f]), ['4M', '2', '5/50', '2 days']);
  t.is('Kamikaze is M&M\'s 5P (pp.120, 157), not SR2\'s 4P', by('Kamikaze')?.addiction, '5P');
  t.is('…and cites M&M', by('Kamikaze')?.bookPage, 'mm.120');
  t.eq('CS/Tear Gas: Speed and Vector the right way round',
    [by('CS/Tear Gas')?.speed, by('CS/Tear Gas')?.vector], ['1 Combat Turn', 'Contact or inhalation']);
  t.is('Green Ring 3\'s availability is not its cost', by('Green Ring 3')?.availability, '14/2 wks');
  t.ok('Novacoke is spelled as the book spells it', names.includes('Novacoke') && !names.includes('Novocoke'));

  const r = spawnSync(process.execPath, [fsPath(new URL('tools/fix-mm-drugs.mjs', root)), '--check'], { encoding: 'utf8' });
  t.is('tools/fix-mm-drugs.mjs --check finds nothing left to change', r.status, 0, r.stdout.split('\n').slice(-3).join(' '));

  /* ── Every drug pack's Addiction code parses ───────────────────────────────── */
  const packs = readdirSync(fsPath(new URL('packs-src', root))).filter(p => /-drugs$/.test(p));
  const bad = [];
  for (const p of packs) for (const d of items(p)) {
    const a = d.system?.addiction;
    if (!a) continue;
    const parsed = DrugRules.parseAddiction(a);
    if (parsed.M === null && parsed.P === null) bad.push(`${p}: ${d.name} "${a}"`);
  }
  t.eq('every Addiction code in every drug pack parses (M&M 4M/5P and SR2 4M+3P alike)', bad, []);
}
