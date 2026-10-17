/**
 * The dodge declaration runs ONCE · TODO 221.
 *
 * Found live (2026-10-11): an attack on a target in Full Defense posted two "Full Defense (N dice
 * auto-committed)" cards and two "dodges" cards. Full Defense has no dialog to wait on, so a second
 * run of `handleDodgeDeclare` announced, spent the reserve and rolled again.
 *
 * The click handler's only guard was `_claimBtn`, a Set that lives in ONE module instance of ONE
 * browser. A second copy of the card on another client, or a second evaluation of sr3e.js (a hot
 * reload mid play-test registers the hook again, with a Set of its own), got past it. The claim on
 * the message (`sr3e.card.mark`, GM-serialised, first claim stands) answers `already`; the handler
 * ignored that answer.
 *
 * sr3e.js cannot be imported without Foundry, so this reads the source.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const name = 'dodge-declare-once';

const read = rel => readFileSync(fileURLToPath(new URL(`../${rel}`, import.meta.url)), 'utf8');

export async function run(t) {
  const main = read('scripts/sr3e.js');
  const i = main.indexOf(`querySelectorAll('.sr-dodge-declare-btn').forEach`);
  t.ok('the dodge-declare handler is found', i > 0);
  const block = main.slice(i, i + 3500);

  t.ok('the handler keeps the result of its claim on the message',
    /const claimed = await _markActed\(mid, 'defender'/.test(block));
  t.ok('…and stands down when the claim came back `already`, BEFORE it declares anything',
    /if \(claimed\?\.already\)[\s\S]{0,120}return;[\s\S]*await SR3EActor\.handleDodgeDeclare\(_p\)/.test(block));
  t.ok('handleDodgeDeclare is called exactly once in the whole handler',
    (block.match(/handleDodgeDeclare\(/g) ?? []).length === 1);
  t.ok('the auto-click is claimed once per card and index, and still routes through the button\'s click',
    /_isTheDecider\(p\) && _claimAuto\(`\$\{mid\}\|dodgeauto\|\$\{i\}`\)[\s\S]{0,300}btn\.click\(\)/.test(block));

  t.ok('the one-shot Sets survive a second evaluation of the module (shared on globalThis)',
    /const _usedButtons = \(globalThis\.__sr3eUsedButtons \?\?= new Set\(\)\)/.test(main)
    && /const _autoOpened = \(globalThis\.__sr3eAutoOpened \?\?= new Set\(\)\)/.test(main));

  // The consuming half: the Full Defense announcement and the clear are inside handleDodgeDeclare,
  // behind `reserved > 0`, so one run means one card.
  const actor = read('scripts/documents/SR3EActor.js');
  const h = actor.slice(actor.indexOf('static async handleDodgeDeclare'), actor.indexOf('static async handleDodgeDeclare') + 3500);
  t.is('the auto-commit announcement is posted from one place only', (actor.match(/_announceFullDefense\(/g) ?? []).length, 2);   // definition + the one call
  t.ok('…which is inside handleDodgeDeclare, after the spend and before the clear',
    /spendCombatPool\(wanted\)[\s\S]{0,200}_announceFullDefense\([\s\S]{0,80}clearFullDefense\(\)/.test(h));
}
