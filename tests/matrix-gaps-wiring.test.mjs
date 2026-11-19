/** Source-level checks for the three Matrix gaps — Orthodox IC on play hosts, the ten-row sheaf, dump shock on a crash · TODO 128. */
import { readFileSync } from 'node:fs';

export const name = 'matrix-gaps-wiring';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

export async function run(t) {
  const actor = read('scripts/documents/SR3EActor.js');
  const main  = read('scripts/sr3e.js');
  const sheet = read('scripts/sheets/SR3EHostSheet.js');
  const gen   = read('scripts/SR3EMatrixGenerator.js');
  const mig   = read('scripts/SR3EMigrations.js');
  const css   = read('styles/sr3e.css');

  /* ---- the ten-row sheaf ---- */
  t.ok('a new host is seeded from defaultSteps (TS 1-9 + Convergence)', sheet.includes('const triggerSteps = defaultSteps();'));
  t.ok('the Init Sheaf button seeds the same ten rows', sheet.includes("'system.triggerSteps': defaultSteps()"));
  t.ok('the sheet marks the Convergence row and shows C for it', sheet.includes("isConvergence(s) ? 'convergence' : ''") && sheet.includes("isConvergence(s) ? 'C'"));
  t.ok('the Convergence row has its own style', css.includes('.trigger-step.convergence'));
  t.ok('a migration brings existing hosts to ten rows, hosts only', mig.includes('convergenceDelta(actor.system?.triggerSteps)') && mig.includes("actor?.type === 'host'"));

  /* ---- dump shock ---- */
  t.ok('the Convergence card takes its numbers from the pure rule, not from the attacker being "not VR-Hot"',
    actor.includes('attacker._postDefraggedDumpshock(rating') && !actor.includes('const isStun        = !isVRHot;'));
  t.ok('the Convergence options go to the GM only (whispered), the dumpshock card is the public offer',
    /static async _postConvergenceCard[\s\S]*?whisper: gm/.test(actor));
  t.ok('the manual Dumpshock button uses the shared Defragged card', actor.includes('return this._postDefraggedDumpshock(result.power);'));
  t.ok('the Defragged card offers no roll to an immune user and always states the +2', actor.includes('ds.immune') && actor.includes('DumpShock.TN_PENALTY'));
  t.ok('the Defragged card keeps Willpower and no armour (maintainer rulings, TODO 201)',
    /_postDefraggedDumpshock[\s\S]*?resistAttr:\s+'willpower'[\s\S]*?noArmor:\s+true/.test(actor));
  t.ok('a crash is detected on the cyberdeck item and on the Orthodox monitor, by the active GM only',
    ['preUpdateItem', 'updateItem', 'preUpdateActor', 'updateActor'].every(h => main.includes(`Hooks.on('${h}'`))
    && main.includes('const _isActiveGM = () => game.user?.id === game.users?.activeGM?.id;'));
  t.ok('the previous value rides options, and only the filling save counts', main.includes('options.sr3eCmBefore') && main.includes('DumpShock.crossedFull('));
  t.ok('the Orthodox IC-damage card marks its update so the crash is not announced twice',
    actor.includes("{ sr3eCrashCard: true }") && main.includes('options?.sr3eCrashCard'));
  t.ok('the Defragged hook stands down in an Orthodox world and the Orthodox hook in a Defragged one',
    main.includes("_matrixRuleset() === 'orthodox') return;") && main.includes("_matrixRuleset() !== 'orthodox') return;"));

  /* ---- Orthodox IC on play hosts ---- */
  t.ok('the Orthodox generator plans IC and Trigger Steps from the alert ladder', gen.includes("import { plan as orthodoxPlan } from './data/orthodox-sheaf.mjs'") && gen.includes('orthodoxPlan({'));
  t.ok('it creates the IC actors and stores the rows the Orthodox host sheet reads',
    gen.includes("'system.orthodoxActiveIC': rows") && gen.includes("'system.triggerSteps': sheaf.steps") && gen.includes('orthodoxIcType: p.icType'));
  t.ok('stored links use actorRef', gen.includes('actorId: actorRef(ic)'));
  t.ok('the scenario deploys the first IC and a play host deploys none', gen.includes('deployed: scenario && i === 0'));
  t.ok('there is no IC-rating box any more: the rating ramps from the Security Value', !gen.includes('gen-icrating'));
}
