/**
 * The melee GM window picks up Prone · SR3 p.123 (TODO 245).
 *
 *   Melee Modifiers Table: "Opponent prone  –2"
 *   "Opponent Prone — This modifier applies if the opponent is lying on the ground."   — SR3 p.123
 *
 * The maintainer, in play 2026-10-23: "when someone is prone the melee gm difficulty sheet should know that they
 * are and auto mark them as prone". So `rollMeleeAttack` reads each fighter's core `prone` status
 * (`MeleeProne.isProne`, actor OR token), carries two booleans in the negotiate payload, and the window
 * PRESELECTS its "who is DOWN" row — the GM can still change it. With no window (NPC vs NPC) the flow applies
 * the −2 itself, as it does the multiple-targets +2.
 */
import { readFileSync } from 'node:fs';
const { MeleeProne, PRONE_STATUS, PRONE_MOD } = await import('../scripts/data/melee-prone.mjs');
const { sumMeleeModifiers } = await import('../scripts/SR3ECombatModifiers.js');

export const name = 'melee-prone';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

const actor = (...ids) => ({ statuses: new Set(ids) });

export async function run(t) {
  t.is('the status read is Foundry’s core prone', PRONE_STATUS, 'prone');
  t.is('p.123 prints Opponent prone as -2', PRONE_MOD, -2);

  /* ==== Detection ==== */
  t.ok('an actor with the prone status is prone', MeleeProne.isProne(actor('prone')));
  t.ok('another status is not prone', !MeleeProne.isProne(actor('sr3e-stunned', 'unconscious')));
  t.ok('no actor, no token: not prone', !MeleeProne.isProne(null, null));
  t.ok('an actor with no statuses set is not prone', !MeleeProne.isProne({}));
  // An unlinked token keeps its own synthetic actor: the HUD's prone lives there, not on the world actor
  // `_promptTarget` returns.
  t.ok('an unlinked token’s own prone counts though the world actor is standing',
    MeleeProne.isProne(actor(), { actor: actor('prone') }));
  t.ok('a token document reporting the status counts',
    MeleeProne.isProne(actor(), { document: { hasStatusEffect: id => id === 'prone' } }));
  t.ok('a standing token on a standing actor is not prone',
    !MeleeProne.isProne(actor(), { actor: actor(), document: { hasStatusEffect: () => false } }));

  /* ==== Who is DOWN ==== */
  t.is('neither down', MeleeProne.side(false, false), null);
  t.is('attacker down', MeleeProne.side(true, false), 'attacker');
  t.is('defender down', MeleeProne.side(false, true), 'defender');
  t.is('both down — each has a prone opponent', MeleeProne.side(true, true), 'both');

  /* ==== The bonus lands on the one STANDING ==== */
  const pair = d => `${d.atk}/${d.def}`;
  t.is('a prone defender gives the attacker -2', pair(MeleeProne.deltas('defender')), '-2/0');
  t.is('a prone attacker gives the defender -2', pair(MeleeProne.deltas('attacker')), '0/-2');
  t.is('both prone: both -2', pair(MeleeProne.deltas('both')), '-2/-2');
  t.is('nobody prone: nothing', pair(MeleeProne.deltas(null)), '0/0');
  t.is('the window’s sum honours "both"', pair(sumMeleeModifiers({ prone: 'both' })), '-2/-2');
  t.is('the window’s sum still reads a prone defender', pair(sumMeleeModifiers({ prone: 'defender' })), '-2/0');

  /* ==== Source: the flow detects, carries and (with no window) applies ==== */
  const item = read('scripts/documents/SR3EItem.js');
  const flow = item.slice(item.indexOf('static async rollMeleeAttack'), item.indexOf('static _getEquippedMelee'));
  t.ok('rollMeleeAttack reads the attacker’s prone from actor and token',
    /MeleeProne\.isProne\(actor,\s*atkTok\)/.test(flow));
  t.ok('rollMeleeAttack reads the defender’s prone from actor and token',
    /MeleeProne\.isProne\(targetActor,\s*tgtTok\)/.test(flow));
  const payload = flow.slice(flow.indexOf("'sr3e.melee.negotiate'"), flow.indexOf('{ timeout: 300_000 }'));
  t.ok('the negotiate payload carries atkProne and defProne', /\batkProne,/.test(payload) && /\bdefProne,/.test(payload));
  const after = flow.slice(flow.indexOf('{ timeout: 300_000 }'), flow.indexOf('postMeleeCard'));
  t.ok('with no window (adjudicated === false) the flow applies the prone deltas itself',
    /gm\.adjudicated === false \? MeleeProne\.side\(atkProne, defProne\)/.test(after)
    && /MeleeProne\.deltas\(_mProne\)/.test(after) && /gm\.defTN\s*=/.test(after));

  /* ==== Source: the window preselects, never forces ==== */
  const win = item.slice(item.indexOf('static async _promptGMMeleeWindow'), item.indexOf('static async _promptGMAttackWindow'));
  t.ok('the window derives its preselection from the carried booleans',
    /MeleeProne\.side\(ctx\.atkProne === true, ctx\.defProne === true\)/.test(win));
  t.ok('the prone select is rendered with that preselection and a "both" option',
    /sideSelect\('gmm-prone'[^\n]*\{ pre: pronePre, both: true \}/.test(win));
  t.ok('the select offers a both-of-them option', /<option value="both"/.test(win));
  t.ok('the window says where the preselection came from', /gmm-prone-hint/.test(win));
  t.ok('the TNs still come from what the GM leaves selected (#gmm-prone read live)',
    /prone:\s*el\.querySelector\('#gmm-prone'\)\?\.value \|\| null/.test(win));
  t.ok('the preselection is not locked', !/id="gmm-prone"[^>]*disabled/.test(win) && !/#gmm-prone[^\n]*disabled\s*=/.test(win));

  /* ==== The card says when the flow applied it itself (no window) ==== */
  t.is('card line: prone defender',
    MeleeProne.cardNote('defender', 'Geist', 'Zip'),
    '\u{1F53B} Zip is prone \u2014 Geist -2 TN (SR3 p.123), applied without a GM window');
  t.is('card line: prone attacker',
    MeleeProne.cardNote('attacker', 'Geist', 'Zip'),
    '\u{1F53B} Geist is prone \u2014 Zip -2 TN (SR3 p.123), applied without a GM window');
  t.ok('card line: both prone names both',
    /Geist and Zip are prone \u2014 both -2 TN/.test(MeleeProne.cardNote('both', 'Geist', 'Zip')));
  t.is('card line: nobody prone, no line', MeleeProne.cardNote(null, 'Geist', 'Zip'), null);
  t.ok('postMeleeCard is handed autoProne, which only the no-window branch sets',
    /autoProne:\s*_mProne,/.test(flow)
    && /const _mProne = gm\.adjudicated === false \?[^;]*: null;/.test(flow));
  const actorSrc = read('scripts/documents/SR3EActor.js');
  const card = actorSrc.slice(actorSrc.indexOf('static async postMeleeCard'),
    actorSrc.indexOf('<div class="sr-melee-boxing">', actorSrc.indexOf('static async postMeleeCard')));
  t.ok('the boxing card renders the prone line from ctx.autoProne',
    /MeleeProne\.cardNote\(ctx\.autoProne \?\? null, atk\.name, def\.name\)/.test(card) && /sr-melee-prone-note/.test(card));
  t.ok('…and from nothing else (no status read on the card, so an adjudicated exchange shows no line)',
    !/isProne\(/.test(card) && !/statuses/.test(card));

  /* ==== The rule is documented ==== */
  t.ok('melee-combat.md describes the prone preselection',
    /TODO 245/.test(read('.claude/rules/melee-combat.md')));
}
