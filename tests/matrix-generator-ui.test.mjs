/** The Matrix generator's Foundry side — source-level (the module cannot be imported without Foundry) · TODO 128. */
import { readFileSync } from 'node:fs';

export const name = 'matrix-generator-ui';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

export async function run(t) {
  const src = read('scripts/SR3EMatrixGenerator.js');
  const main = read('scripts/sr3e.js');
  const sheet = read('scripts/sheets/SR3EHostSheet.js');

  t.ok('GM only: the dialog and the creator both check isGM', (src.match(/if \(!game\.user\.isGM\)/g) ?? []).length >= 2);
  t.ok('the dialog wires through wait()\'s render option, never a global hook',
    src.includes('render: (_event, dialog) => SR3EMatrixGenerator._wireDialog(') && !/Hooks\.on\(['"]renderDialogV2/.test(src));
  t.ok('Confirm assigns the result; Esc leaves it null and creates nothing', src.includes('result = SR3EMatrixGenerator._read(') && src.includes('if (!result) return null;'));
  t.ok('no raw game.actors.get — ids come from documents we just made', !src.includes('game.actors.get('));
  t.ok('an IC copied from the pack drops _stats, or it would be flagged a template', src.includes('delete data._stats'));
  t.ok('the generator never switches Mainframe Support on by itself', src.includes('mainframeSupport: v.mainframeSupport') && src.includes('need the Mainframe Support module'));
  t.ok('both rulesets: Orthodox writes the security code, value and subsystems', ['orthodoxSecurityCode', 'orthodoxSecurityValue', 'orthodoxSubsystems'].every(k => src.includes(k)));
  t.ok('the test scenario logs the decker in under VR-Hot, on both rulesets',
    src.includes("matrixUserMode: 'VR-Hot', activeHostId: host.id") && src.includes('currentHostId: host.id'));
  t.ok('a Defragged decker gets an equipped deck (Hacking Pool is null without one)', src.includes("'system.equippedCyberdeck': deck.id"));
  t.ok('everything generated is flagged', (src.match(/generatedFlag\(/g) ?? []).length >= 5);
  t.ok('the host sheet exports the default map the generator reuses', sheet.includes('export function defaultTopology(') && src.includes("import { defaultTopology } from './sheets/SR3EHostSheet.js'"));
  t.ok('two buttons in the Actors directory, GM only, guarded against doubling',
    main.includes("Hooks.on('renderActorDirectory'") && main.includes('sr3e-gen-host-btn') && main.includes('sr3e-gen-scenario-btn')
    && main.includes("el.querySelector('.sr3e-matrix-gen')"));
}
