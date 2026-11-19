/**
 * The Perception Test — TODO 304 · SR3 p.231-232.
 * Rules are pure (`scripts/data/perception.mjs`); the dialog and the sheet button are source-level invariants,
 * backed by TESTING.md §87.
 */
import { readFileSync } from 'node:fs';
const { Perception, PERCEPTION_MODIFIERS, BASE_TN } = await import('../scripts/data/perception.mjs');

export const name = 'perception';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const mod = k => PERCEPTION_MODIFIERS.find(m => m.key === k).mod;

export async function run(t) {
  /* ── Target number · p.231-232 ── */
  t.is('base TN is 4 (p.231)', BASE_TN, 4);
  t.is('nothing ticked → 4', Perception.targetNumber(), 4);
  t.is('distracted +2 → 6', Perception.targetNumber({ picks: ['distracted'] }), 6);
  t.is('very small object +6 → 10', Perception.targetNumber({ picks: ['verySmall'] }), 10);
  t.is('grenade blast −8 floors at 2', Perception.targetNumber({ picks: ['grenade'] }), 2);
  t.is('action very obvious −4 + distracted +2 → 2', Perception.targetNumber({ picks: ['obvious', 'distracted'] }), 2);
  t.is('base is an item’s own number (Concealability 6) + partially hidden', Perception.targetNumber({ base: 6, picks: ['partHidden'] }), 8);
  t.is('blank base falls back to 4', Perception.targetNumber({ base: '' }), 4);
  t.is('visibility adds (Full Darkness +8)', Perception.targetNumber({ visibility: 8 }), 12);
  t.is('GM extra adds', Perception.targetNumber({ extra: 3 }), 7);
  t.is('unknown pick ignored', Perception.targetNumber({ picks: ['nope'] }), 4);
  t.is('sound enhancement with no rating is −2', Perception.soundEnhanceMod(0), -2);
  t.is('sound enhancement rating 3 is −3', Perception.soundEnhanceMod(3), -3);
  t.is('…and in the TN', Perception.targetNumber({ base: 8, picks: ['soundEnhance'], soundRating: 3 }), 5);
  t.is('silenced shot is 0', mod('silencedShot'), 0);
  t.is('single gunshot −2', mod('gunshot'), -2);
  t.is('full autofire −6', mod('auto'), -6);
  t.is('floors away +6', mod('floorsAway'), 6);
  t.is('brightly colored −2', mod('bright'), -2);
  t.is('action not obvious +4', mod('notObvious'), 4);
  t.is('gloves +2 (touch)', mod('gloves'), 2);
  t.is('odor obvious −4', mod('odorObvious'), -4);
  t.is('a cold +2 (taste)', mod('cold'), 2);
  const sight = Perception.modifiersFor('sight').map(m => m.key);
  t.ok('sight offers distracted and partially hidden', sight.includes('distracted') && sight.includes('partHidden'));
  t.ok('…but not gunshot', !sight.includes('gunshot'));

  /* ── Dice · p.231, p.169 ── */
  t.is('Intelligence dice', Perception.dicePool({ intelligence: 5 }), 5);
  t.is('+ Enhanced Perception + complementary', Perception.dicePool({ intelligence: 5, situational: 2, extra: 1 }), 8);
  t.is('never negative', Perception.dicePool({ intelligence: 1, extra: -5 }), 0);
  t.is('group: average 4,5,6 = 5, + 3 members', Perception.groupDice([4, 5, 6]), 8);
  t.is('group average rounds down', Perception.groupDice([4, 5]), 6);
  t.is('empty group', Perception.groupDice([]), 0);

  /* ── Success table · p.232 ── */
  t.is('0 successes', Perception.successLine(0), 'Nothing noticed.');
  t.is('1 success', Perception.successLine(1), 'Something is there.');
  t.ok('2 successes', /general type/.test(Perception.successLine(2)));
  t.ok('3 successes', /exact nature/.test(Perception.successLine(3)));
  t.ok('4+ successes', /no specifics/.test(Perception.successLine(7)));

  /* ── Source-level: the sheet, the dialog, the follow-up ── */
  const sheet = read('scripts/sheets/SR3EActorSheet.js');
  t.ok('sheet registers openPerception', /openPerception:\s*SR3EActorSheet\._onOpenPerception/.test(sheet));
  t.ok('the button sits right after 🩹 Healing', /🩹 Healing<\/button>\s*<button[^>]*data-action="openPerception"/.test(sheet));
  // The row fit (maintainer, 2026-11-18): Stun over Physical, and Healing…Carry as one nowrap group.
  t.ok('Stun and Physical are stacked', /<div class="wound-track-stack">\s*\$\{this\._woundTrack\('stun'[\s\S]{0,120}_woundTrack\('physical'[^\n]*\n\s*<\/div>/.test(sheet));
  t.ok('Healing, Perception, Stim and Carry are one group', /<div class="wound-actions">\s*<button[^>]*openHealing[\s\S]*?openPerception[\s\S]*?system\.stimBonus[\s\S]*?Carry: <strong>\$\{weightDisplay\}<\/strong>\s*<\/span>\s*<\/div>/.test(sheet));
  const css = read('styles/sr3e.css');
  t.ok('the group never wraps inside', /\.wound-actions\s*\{[^}]*flex-wrap:\s*nowrap/.test(css));
  t.ok('the stack is a column', /\.wound-track-stack\s*\{[^}]*flex-direction:\s*column/.test(css));
  t.ok('the handler opens SR3EPerception', /_onOpenPerception[\s\S]{0,120}SR3EPerception\.open\(this\.actor\)/.test(sheet));
  const dlg = read('scripts/SR3EPerception.js');
  t.ok('dialog waits and wires through render', /DialogV2\.wait\(/.test(dlg) && /render: \(_event, dialog\) => wireDialog/.test(dlg));
  t.ok('rolls through rollPool, wound modifier kept', /actor\.rollPool\(/.test(dlg) && !/skipWoundMod/.test(dlg));
  t.ok('the TN field is editable (GM override)', /id="pc-tn" type="number"/.test(dlg));
  t.ok('it decides nothing — no document writes', !/\.update\(|createEmbeddedDocuments/.test(dlg));
  t.ok('FOLLOW_UPS.perception is registered', /perception:\s*\['SR3EPerception', 'rolled'\]/.test(read('scripts/documents/SR3EActor.js')));
  t.ok('SR3EPerception on game.sr3e', /SR3EHealing, SR3EPerception,/.test(read('scripts/sr3e.js')));
  t.ok('Concealment reads the same success table', /perceptionLine\(successes\) \{ return Perception\.successLine/.test(read('scripts/SR3EConcealment.js')));
}
