/**
 * Who was shot at this Combat Phase · SR3 p.111, p.116 (TODO 56.2).
 */
import { readFileSync } from 'node:fs';
import { PhaseTargets } from '../scripts/data/phase-targets.mjs';
import { ActionEconomy } from '../scripts/data/action-economy.mjs';

export const name = 'phase-targets';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

export async function run(t) {
  const P = PhaseTargets;
  let rec = {};
  t.eq('nothing recorded: no targets', P.current(rec, '1|0'), []);
  t.is('…so the first target is 1st', P.ordinal(P.current(rec, '1|0'), 'brian'), 1);
  rec = P.add(rec, '1|0', 'brian', 'tokB');
  rec = P.add(rec, '1|0', 'snot', 'tokS');
  const now = P.current(rec, '1|0');
  t.is('a new target after two is 3rd (+4)', P.ordinal(now, 'able'), 3);
  t.is('shooting Brian again keeps his place — targets, not shots', P.ordinal(now, 'brian'), 1);
  t.is('…and Snot is 2nd', P.ordinal(now, 'snot'), 2);
  t.eq('adding Brian again does not duplicate him', P.current(P.add(rec, '1|0', 'brian', 'tokB'), '1|0').map(x => x.key), ['brian', 'snot']);
  t.is('the fire walks from the last one engaged', P.previous(now, 'able')?.tokenId, 'tokS');
  t.is('…and turning back to Brian walks from Snot', P.previous(now, 'brian')?.tokenId, 'tokS');
  t.is('…and from Brian when Snot is shot again', P.previous(now, 'snot')?.tokenId, 'tokB');
  t.eq('a record from another phase reads as empty', P.current(rec, '1|1'), []);
  t.eq('…and adding in the new phase starts over', P.current(P.add(rec, '1|1', 'able'), '1|1').map(x => x.key), ['able']);
  t.eq('the empty record is a full one — an ObjectField update merges {}', P.EMPTY, { phase: '', targets: [] });

  /* ── The GM's undo (TODO 48) puts it back ─────────────────────────────────── */
  const before = { system: { targetsThisPhase: rec }, items: [] };
  const snap = ActionEconomy.snapshot(before);
  t.eq('the snapshot copies the record by value', snap.actor.targetsThisPhase, P.normalize(rec));
  t.eq('unchanged: nothing to restore', ActionEconomy.restorePlan(snap, before), []);
  const after = { system: { targetsThisPhase: P.add(rec, '1|0', 'able', 'tokA') }, items: [] };
  const plan = ActionEconomy.restorePlan(snap, after);
  t.eq('a shot at a new target is undone with it', plan.map(p => [p.field, p.back.targets.length]), [['targetsThisPhase', 2]]);
  t.is('…shown as a count', ActionEconomy.display(plan[0].now), '3 targets shot at');
  t.is('an actor never shot at snapshots as the empty record', JSON.stringify(ActionEconomy.snapshot({ system: {}, items: [] }).actor.targetsThisPhase), JSON.stringify(P.EMPTY));

  /* ── The wiring, source-level ─────────────────────────────────────────────── */
  const item = read('scripts/documents/SR3EItem.js');
  t.ok('rollWeapon reads the record for this phase, keyed by token', /PhaseTargets\.current\(actor\.system\.targetsThisPhase, _phase\)/.test(item)
    && /const _targetKey = targetToken\?\.id \?\? targetActor\.id/.test(item));
  t.ok('…prefills the ordinal select and the walking metres', /Math\.min\(5, prefill\.ordinal \?\? 1\)/.test(item) && /value="\$\{prefill\.metres \?\? 0\}"/.test(item));
  t.ok('…measured from the last target\'s token', /SR3EItem\._measureDistance\(_prevTok, targetToken\)/.test(item));
  t.ok('…charges the +2 on an SS-only gun that has no dialog', /additionalTNPenalty: SR3EItem\.multiTargetTN\(targetPrefill\.ordinal\)/.test(item));
  t.ok('…and records the target with the rounds fired', /'system\.targetsThisPhase': PhaseTargets\.add\(/.test(item));
  t.ok('resetRecoil clears it with the full empty record', (read('scripts/documents/SR3EActor.js').match(/'system\.targetsThisPhase': \{ phase: '', targets: \[\] \}/g) ?? []).length === 2);
}
