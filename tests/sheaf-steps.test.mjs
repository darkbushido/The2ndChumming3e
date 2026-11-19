/** The Defragged sheaf's ten rows, Convergence as the tenth · MDF p.23-24 · TODO 128. */
import * as S from '../scripts/data/sheaf-steps.mjs';

export const name = 'sheaf-steps';

export async function run(t) {
  const d = S.SheafSteps.defaultSteps();
  t.eq('a new sheaf has ten rows', d.length, 10);
  t.eq('rows 1-9 are TS 1-9 and the tenth is Convergence', [d[0].label, d[8].label, d[9]?.label], ['TS 1', 'TS 9', 'Convergence']);
  t.eq('step numbers run 1-10', d.map(s => s.step), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  t.ok('only the tenth is flagged Convergence', d.filter(S.SheafSteps.isConvergence).length === 1 && S.SheafSteps.isConvergence(d[9]));
  t.ok('the Convergence row says Dumpshock and the security team', /Dumpshock/.test(d[9]?.description ?? '') && /security team/.test(d[9]?.description ?? ''));
  t.ok('a plain TS row is blank, untriggered, unhidden', d.slice(0, 9).every(s => !s.description && !s.triggered && !s.hidden && s.ic.length === 0));

  // Migration delta
  const nine = d.slice(0, 9);
  t.eq('a nine-row sheaf gets the tenth row appended', S.SheafSteps.convergenceDelta(nine)?.['system.triggerSteps'].length, 10);
  t.eq('…and keeps the first nine untouched', S.SheafSteps.convergenceDelta(nine)['system.triggerSteps'].slice(0, 9), nine);
  const initTen = [...nine, { step: 10, label: 'TS 10', triggered: false, hidden: false, ic: [], description: '' }];
  t.eq('the sheet\'s untouched "TS 10" is relabelled Convergence', S.SheafSteps.convergenceDelta(initTen)?.['system.triggerSteps'][9].label, 'Convergence');
  t.eq('a tenth row the GM wrote in is left alone', S.SheafSteps.convergenceDelta([...nine, { step: 10, label: 'TS 10', ic: [], description: 'my own' }]), null);
  t.eq('a tenth row with IC on it is left alone', S.SheafSteps.convergenceDelta([...nine, { step: 10, label: 'TS 10', ic: [{ name: 'Killer' }], description: '' }]), null);
  t.eq('a tenth row the GM renamed is left alone', S.SheafSteps.convergenceDelta([...nine, { step: 10, label: 'The Reckoning', ic: [], description: '' }]), null);
  t.eq('an already-correct sheaf yields null (idempotent)', S.SheafSteps.convergenceDelta(d), null);
  t.eq('an uninitialised sheaf is left empty', S.SheafSteps.convergenceDelta([]), null);
  t.eq('an Orthodox host\'s tally rows are not touched', S.SheafSteps.convergenceDelta([{ tally: 3, event: 'Probe-5' }]), null);
  t.eq('a sheaf of some other length is not guessed at', S.SheafSteps.convergenceDelta(nine.slice(0, 5)), null);
  const once = S.SheafSteps.convergenceDelta(nine)['system.triggerSteps'];
  t.eq('applying it twice changes nothing more', S.SheafSteps.convergenceDelta(once), null);
}
