/**
 * Open combat steps — scripts/data/open-steps.mjs and its wiring (TODO 147).
 *
 * Reported in the 2026-09-23 trial session: in a busy fight a card still owed an answer scrolls away
 * and the step is lost. The maintainer chose all three remedies — a "Waiting on…" panel by the combat
 * tracker, a highlight and chat-tab count for the player a card waits on, and folding finished cards.
 * The rules are pure and tested here; the Foundry side needs a live client, so it is checked at source
 * level and in TESTING.md's live checklist.
 */
import { readFileSync } from 'node:fs';
import { OpenSteps, STEP_BUTTONS } from '../scripts/data/open-steps.mjs';

export const name = 'open-steps';

const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

export async function run(t) {
  /* ── Which buttons are steps ─────────────────────────────────────────────────── */
  for (const c of ['sr-soak-btn', 'sr-soak-roll-btn', 'sr-dodge-declare-btn', 'sr-drain-btn', 'sr-knockdown-btn', 'sr-assign-damage-btn']) {
    t.ok(`${c} is a step someone owes`, OpenSteps.isStep(c));
  }
  for (const c of ['sr-prone-btn', 'sr-sustain-btn', 'sr-heal-act-btn', 'sr-buy-pay-btn', 'sr-explode-btn']) {
    t.ok(`${c} is NOT — nobody is waiting on it`, !OpenSteps.isStep(c));
  }

  /* ── Indexing — the same position the card's handlers use ────────────────────── */
  const card = [
    { cls: 'sr-soak-btn', payload: { targetActorId: 'a1' } },
    { cls: 'sr-prone-btn', payload: { actorId: 'a1' } },
    { cls: 'sr-soak-btn', payload: { targetActorId: 'a2' } },
    { cls: 'sr-drain-btn', payload: { actorId: 'caster' } },
  ];
  const steps = OpenSteps.stepsOf(card, {});
  t.is('three steps (the Prone button is not one)', steps.length, 3);
  t.eq('each counted within its own class, in content order',
    steps.map(s => s.key), ['step:sr-soak-btn:0', 'step:sr-soak-btn:1', 'step:sr-drain-btn:0']);
  t.eq('…owed by the payload\'s actor', steps.map(s => s.ownerId), ['a1', 'a2', 'caster']);

  /* ── Done ────────────────────────────────────────────────────────────────────── */
  const acted = { 'step:sr-soak-btn:1': { label: 'x' } };
  const after = OpenSteps.stepsOf(card, acted);
  t.eq('a step marked done is done; its siblings are not', after.map(s => s.done), [false, true, false]);
  t.is('open() leaves the two still owed', OpenSteps.open(after).length, 2);
  t.ok('an older key counts too: a soak roll recorded as "soaker"',
    OpenSteps.isDone('sr-soak-roll-btn', 0, { soaker: { label: 'Target' } }));
  t.ok('…and a dodge declared as "defender"', OpenSteps.isDone('sr-dodge-declare-btn', 0, { defender: {} }));
  t.ok('…but "soaker" does not finish some other card\'s soak button', !OpenSteps.isDone('sr-soak-btn', 0, { soaker: {} }));

  /* ── Collapsing ──────────────────────────────────────────────────────────────── */
  t.ok('a card is finished when it had steps and all are done',
    OpenSteps.finished(OpenSteps.stepsOf(card, { 'step:sr-soak-btn:0': 1, 'step:sr-soak-btn:1': 1, 'step:sr-drain-btn:0': 1 })));
  t.ok('…not while one is open', !OpenSteps.finished(after));
  t.ok('a card with NO steps (a roll result, a note) never folds', !OpenSteps.finished([]));

  /* ── Owners ──────────────────────────────────────────────────────────────────── */
  t.is('an attacker never owes their target\'s step', OpenSteps.ownerId({ attackerActorId: 'bad', targetActorId: 'tgt' }), 'tgt');
  t.is('a decker\'s Matrix card names its decker', OpenSteps.ownerId({ deckerActorId: 'd' }), 'd');
  t.is('no payload → no owner, no throw', OpenSteps.ownerId(null), null);
  const decider = { a1: 'u1', a2: 'u2', caster: 'u1' };
  t.is('countFor: open steps whose owner\'s decider is this user', OpenSteps.countFor('u1', OpenSteps.open(after), id => decider[id]), 2);

  /* ── Wiring (source level — the Foundry side needs a live client) ─────────────── */
  const main = read('scripts/sr3e.js');
  const lastHook = main.lastIndexOf("Hooks.on('renderChatMessageHTML'");
  t.ok('decorate is the LAST renderChatMessageHTML hook, so it runs after each button\'s own handler',
    /SR3EOpenSteps\.decorate\(message, html\)/.test(main.slice(lastHook, lastHook + 200)));
  t.ok('the combat tracker draws the Waiting-on panel', /SR3EOpenSteps\.renderPanel\(el\)/.test(main));
  t.ok('settings and hooks are registered at init', /SR3EOpenSteps\.registerSettings\(\);\s*\n\s*SR3EOpenSteps\.registerHooks\(\);/.test(main));

  const mod = read('scripts/SR3EOpenSteps.js');
  t.ok('a step is recorded through the GM-serialised card.mark', /asGM\('sr3e\.card\.mark', \{ messageId, role: key, label \}\)/.test(mod));
  t.ok('…and bookkeeping never throws into the action', /catch \(err\)[\s\S]{0,80}console\.warn/.test(mod));
  t.ok('owed-by uses the flows\' own decider', /SR3EQuery\.deciderFor\(actor\)/.test(mod));
  t.ok('a finished card folds only when the client setting is on', /OpenSteps\.finished\(steps\) && game\.settings\.get\(MODULE, 'collapseFinishedCards'\)/.test(mod));
  t.ok('a step already done is greyed on every client', /if \(step\.done\) \{[\s\S]{0,120}btn\.disabled = true/.test(mod));

  t.ok('the chat-tab badge goes on the tab BUTTON, never the chat section (which also has data-tab="chat")',
    /querySelectorAll\('#sidebar-tabs \[data-tab="chat"\], #sidebar nav \[data-tab="chat"\]'\)/.test(mod)
    && !/'#sidebar \[data-tab="chat"\]/.test(mod));

  const query = read('scripts/SR3EQuery.js');
  t.ok('card.mark is queued per message, so two marks cannot overwrite each other',
    /'sr3e\.card\.mark'\][\s\S]{0,200}SR3EQueue\.run\(`card:\$\{messageId\}`/.test(query));

  // Every registered step class is a button the system actually renders.
  const src = ['scripts/documents/SR3EActor.js', 'scripts/documents/SR3EItem.js', 'scripts/sheets/SR3EVehicleSheet.js',
    'scripts/SR3EVehicleChase.js', 'scripts/sr3e.js'].map(read).join('\n');
  for (const cls of Object.keys(STEP_BUTTONS)) {
    t.ok(`${cls} is rendered somewhere`, src.includes(cls));
  }
}
