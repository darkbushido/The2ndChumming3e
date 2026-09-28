/**
 * The leaked-ledger cleanup · TODO 197. The fixture is the maintainer's world on 2026-09-27: Buzzz and
 * Velvet carried every one of each other's entries (one array shared in memory), Ploder was untouched.
 * The discriminating cases: two entries genuinely shared (both at 6 karma, both awarded 3), and an
 * entry that fits NEITHER chain (Velvet's ¥54,500 → 51,500 before an unlogged ¥10,000) — only its
 * `by` says whose it is.
 */
import { classifyLedgers } from '../tools/lib/ledger-cleanup.mjs';
import { consoleScript } from '../tools/ledger-cleanup.mjs';

export const name = 'ledger-cleanup';

const t0 = Date.parse('2026-09-27T13:00:00');
const at = (h, m, s = 0) => t0 + ((h - 13) * 3600 + m * 60 + s) * 1000;
const e = (when, kind, delta, from, to, reason, by) => ({ when, kind, delta, from, to, reason, by });

// Both characters' ledgers held this, in this order.
const mixed = [
  e(at(13, 53, 48), 'nuyen', -3000, 54500, 51500, '', 'QueenB'),
  e(at(14, 47, 59), 'karma', 3, 6, 9, 'Session rewards', 'Gamemaster'),
  e(at(14, 47, 59), 'nuyen', 5000, 13495, 18495, 'Session rewards', 'Gamemaster'),
  e(at(14, 49, 35), 'nuyen', 3000, 18495, 21495, '', 'Kihtith'),
  e(at(14, 52, 16), 'nuyen', 2000, 61500, 63500, '', 'Gamemaster'),
  e(at(14, 53, 38), 'nuyen', -1200, 63500, 62300, '', 'QueenB'),
  e(at(14, 59, 3), 'karma', -1, 9, 8, 'Learned Computer', 'Kihtith'),
];
const buzzz  = { id: 'b', name: 'Buzzz',  owners: ['Kihtith'], current: { karma: 8, nuyen: 21495, pool: 1 }, ledger: mixed };
const velvet = { id: 'v', name: 'Velvet', owners: ['QueenB'],  current: { karma: 7, nuyen: 62300, pool: 1 }, ledger: [...mixed,
  e(at(15, 2, 21), 'karma', -1, 9, 8, 'Learned Lock Picking', 'QueenB'),
  e(at(15, 2, 46), 'karma', -1, 8, 7, 'Learned Electronics', 'QueenB')] };
const ploder = { id: 'p', name: 'Ploder', owners: ['Longbrain'], current: { karma: 0, nuyen: 49497, pool: 1 }, ledger: [
  e(at(14, 39, 10), 'nuyen', 5000, 33897, 38897, '', 'Longbrain'),
  e(at(14, 53, 28), 'nuyen', 600, 48897, 49497, '', 'Longbrain')] };

export async function run(t) {
  const [B, V, P] = classifyLedgers([buzzz, velvet, ploder]);
  const kept = r => r.rows.filter(x => x.verdict !== 'remove').map(x => `${x.entry.kind} ${x.entry.delta}`);

  t.eq("Buzzz loses Velvet's three nuyen entries", B.remove, [0, 4, 5]);
  t.eq('…and keeps his own chain, the shared karma award included', kept(B),
    ['karma 3', 'nuyen 5000', 'nuyen 3000', 'karma -1']);
  t.eq("Velvet loses Buzzz's award, his ¥3,000 and his Learned Computer", V.remove, [2, 3, 6]);
  t.ok("…keeps the ¥54,500 entry that fits neither chain, because her player made it",
    V.rows[0].verdict === 'keep' && /player/.test(V.rows[0].why));
  t.ok('…and keeps the karma award both genuinely had', V.rows[1].verdict === 'keep' && B.rows[1].verdict === 'keep');
  t.eq('Ploder, who shares nothing, is untouched', P.remove, []);

  const orphan = { ...buzzz, ledger: [e(1, 'nuyen', 1, 1, 2, '', 'Gamemaster')], owners: [] };
  const twin   = { ...orphan, id: 'x', name: 'X' };
  t.ok('a shared entry no character explains is kept and flagged, never removed',
    classifyLedgers([orphan, twin]).every(r => r.rows[0].verdict === 'unsure' && !r.remove.length));

  const script = consoleScript();
  t.ok('the console script carries the tested function verbatim', script.includes(classifyLedgers.toString()));
  t.ok('…is a dry run unless APPLY is set', /const APPLY = false;/.test(script) && /if \(!APPLY\) return/.test(script));
  t.ok('…shows a blank reason as "By hand", never "(none)" or a dash',
    /\|\| 'By hand'/.test(script) && !/'\(none\)'/.test(script));
  t.ok('…refuses to run for a player', /if \(!game\.user\.isGM\) return/.test(script));
  t.ok('…parses', (() => { try { new Function(script.replace(/^\/\/.*\n/, '')); return true; } catch { return false; } })());
}
