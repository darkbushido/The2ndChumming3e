/**
 * What Karma buys — the Karma Pool in play, and Good Karma between runs.  · *SR3 p.168, p.180-181,
 * p.190, p.244-248*  (TODO 216, TODO 212, the audit of 2026-10-11)
 *
 * The audit found the Karma Pool had never worked: every roll dialog's "Use Karma Pool" checkbox was
 * collected and passed along and read by nothing, the one re-roll function was never called (and
 * charged a point per die, where p.246 charges per re-roll), and a spend LOWERED the pool's size,
 * so a spent point never came back. Good Karma could not buy Power Points, spells or focus bonds.
 *
 *   "It costs 1 Karma Pool die to re-roll failures once, 2 Karma Pool dice (for a total of 3) to
 *    re-roll failures again, 3 more dice for the third re-roll, and so on. Once a dice comes up as a
 *    success, it may not be re-rolled."                                                  (p.246)
 *   "A player may not spend additional Karma to re-roll failed dice on an 'oops' roll."   (p.246)
 *   "A player may spend 1 point of Karma to buy an additional die for use in a test, up to a maximum
 *    of however many skill, Attribute or rating dice he is currently using (not including dice from
 *    other pools) … (2 more Karma Pool for a second die, 3 more Karma Pool for a third, and so on)."
 *                                                                                         (p.246)
 *   "In order for a character to burn Karma Pool in this manner, he must at least achieve one
 *    success on the test normally."                                                       (p.246)
 *   "We recommend that this rule not be used unless the Target Number is 12 or higher. The lowest a
 *    target number can be reduced to using this option is 8."                             (p.248)
 *   "During game play, adepts may purchase additional Power Points at a cost of 20 Good Karma
 *    Points per Power Point."                                                             (p.168)
 *   "Learning spells also costs Good Karma … equal to the desired Force."                 (p.180)
 *   Focus Bonding Table: specific spell 1×, spell category 3×, spirit 2×, power 5×, sustaining 1×,
 *    weapon (3 + Reach) × Force, expendable 0.                                            (p.190)
 *   "No specialization can have a rating higher than twice the base skill rating, except for a
 *    Rating 1 base skill with a Rating 3 specialization."                                 (p.84)
 */
import { readFileSync } from 'node:fs';
import { KarmaPool, GoodKarma, FOCUS_BONDING } from '../scripts/data/karma-uses.mjs';
import { Ledger } from '../scripts/data/ledger.mjs';

export const name = 'karma-uses';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

export async function run(t) {
  /* ── The pool is a size and a spent count ─────────────────────────────────── */
  t.eq('a pool of 4 with 1 spent has 3 left', KarmaPool.state({ karmaPool: 4, karmaPoolSpent: 1 }),
    { size: 4, spent: 1, available: 3 });
  t.eq('a character from before the field reads as unspent', KarmaPool.state({ karmaPool: 2 }),
    { size: 2, spent: 0, available: 2 });
  t.is('…and never below nothing', KarmaPool.available({ karmaPool: 1, karmaPoolSpent: 5 }), 0);

  // ⚠ The shipped bug: a spend lowered `karmaPool`, so the point never came back.
  const sp = KarmaPool.spend({ karmaPool: 4, karmaPoolSpent: 1 }, 2);
  t.eq('spending raises the spent count', sp.update, { karmaPoolSpent: 3 });
  t.ok('…and leaves the pool\'s size alone — a spent point comes back on a refresh', !('karmaPool' in sp.update));
  t.is('…within what is left, it is not over', sp.over, false);
  t.is('spending more than is left is reported', KarmaPool.spend({ karmaPool: 2, karmaPoolSpent: 1 }, 2).over, true);
  t.eq('…but still recorded, never refused', KarmaPool.spend({ karmaPool: 2, karmaPoolSpent: 1 }, 2).update, { karmaPoolSpent: 3 });

  const bn = KarmaPool.burn({ karmaPool: 4, karmaPoolSpent: 1 }, 2);
  t.eq('burning lowers the size — gone for ever', bn.update, { karmaPool: 2 });
  t.ok('…and does not touch what was spent', !('karmaPoolSpent' in bn.update));
  t.is('a burn cannot take the pool below 0', KarmaPool.burn({ karmaPool: 1 }, 5).update.karmaPool, 0);
  t.eq('the refresh gives back the spent, nothing else', KarmaPool.refresh(), { karmaPoolSpent: 0 });

  /* ── Re-rolling failures: 1, then 2 more, then 3 more ─────────────────────── */
  t.is('the first re-roll of a test costs 1', KarmaPool.rerollCost(0), 1);
  t.is('the second costs 2 more', KarmaPool.rerollCost(1), 2);
  t.is('the third costs 3 more', KarmaPool.rerollCost(2), 3);
  t.is('twice in all costs 3 — p.246\'s "for a total of 3"', KarmaPool.rerollTotal(2), 3);
  t.is('three times costs 6', KarmaPool.rerollTotal(3), 6);

  /* ── Buying dice: 1, 3, 6, capped by base dice ────────────────────────────── */
  t.is('one die costs 1', KarmaPool.extraDiceCost(1), 1);
  t.is('two dice cost 3', KarmaPool.extraDiceCost(2), 3);
  t.is('three dice cost 6', KarmaPool.extraDiceCost(3), 6);
  t.is('none costs nothing', KarmaPool.extraDiceCost(0), 0);
  t.is('the ceiling is the base dice', KarmaPool.extraDiceCap(4), 4);
  t.is('an Open Test re-roll of 3 dice costs 6', KarmaPool.openTestRerollCost(3), 6);

  /* ── What a finished roll may do ──────────────────────────────────────────── */
  t.eq('2 hits and 3 misses: re-roll or buy, no disaster to avoid',
    KarmaPool.options({ successes: 2, failures: 3, glitch: false }),
    { reroll: true, avoidDisaster: false, buySuccesses: true });
  t.eq('no hits: re-roll, but successes cannot be bought (one must be rolled)',
    KarmaPool.options({ successes: 0, failures: 4, glitch: false }),
    { reroll: true, avoidDisaster: false, buySuccesses: false });
  t.eq('all hits: nothing to re-roll',
    KarmaPool.options({ successes: 3, failures: 0, glitch: false }),
    { reroll: false, avoidDisaster: false, buySuccesses: true });
  t.eq('a Rule of One: only avoiding the disaster — no re-roll on an "oops" roll',
    KarmaPool.options({ successes: 0, failures: 4, glitch: true }),
    { reroll: false, avoidDisaster: true, buySuccesses: false });
  t.eq('…and once averted, it is a plain failure that still cannot be re-rolled',
    KarmaPool.options({ successes: 0, failures: 4, glitch: false, disasterAverted: true }),
    { reroll: false, avoidDisaster: false, buySuccesses: false });
  t.is('avoiding a disaster costs 1', KarmaPool.AVOID_DISASTER_COST, 1);
  t.is('two successes are bought with 2 burned', KarmaPool.buySuccessesCost(2), 2);

  /* ── Hooper-Nelson (p.248) ────────────────────────────────────────────────── */
  t.eq('TN 18, burn 6: TN 12, 6 burned', KarmaPool.hooperNelson(18, 6), { tn: 12, burned: 6, recommended: true });
  t.eq('never below 8 — the excess is not burned', KarmaPool.hooperNelson(12, 10), { tn: 8, burned: 4, recommended: true });
  t.eq('under TN 12 it is not recommended, but the GM may', KarmaPool.hooperNelson(10, 1), { tn: 9, burned: 1, recommended: false });
  t.eq('a TN already at 8 burns nothing', KarmaPool.hooperNelson(8, 3), { tn: 8, burned: 0, recommended: false });

  /* ── Good Karma: Power Points, spells, foci, the specialisation ceiling ───── */
  t.is('a Power Point costs 20', GoodKarma.powerPointCost(1), 20);
  t.is('two cost 40', GoodKarma.powerPointCost(2), 40);
  t.is('a Force 6 spell costs 6', GoodKarma.spellCost(6), 6);
  t.is('p.181: Fireball at Force 8 with the −2 limit costs 6', GoodKarma.spellCost(8, 2), 6);
  t.is('…and a limit cannot make it pay you', GoodKarma.spellCost(1, 3), 0);

  const gear = name => ({ type: 'gear', name, system: {} });
  t.is('"Power Focus (Rating 1)" is a power focus', GoodKarma.focusType(gear('Power Focus (Rating 1)'))?.key, 'power');
  t.is('"Specific Spell Focus (Invisibility)" is a specific spell focus', GoodKarma.focusType(gear('Specific Spell Focus (Invisibility)'))?.key, 'specific');
  t.is('⚠ "Spell Category Focus" is a CATEGORY focus, not a specific one', GoodKarma.focusType(gear('Spell Category Focus (Combat)'))?.key, 'category');
  t.is('"Spirit Focus (Rating 2)" is a spirit focus', GoodKarma.focusType(gear('Spirit Focus (Rating 2)'))?.key, 'spirit');
  t.is('a sustaining focus', GoodKarma.focusType(gear('Sustaining Focus'))?.key, 'sustaining');
  t.is('an expendable spell focus', GoodKarma.focusType(gear('Expendable Spell Focus'))?.key, 'expendable');
  t.is('a medkit is no focus', GoodKarma.focusType(gear('Medkit')), null);
  t.is('a melee weapon flagged isFocus is a weapon focus, whatever its name',
    GoodKarma.focusType({ type: 'melee', name: 'Katana', system: { isFocus: true } })?.key, 'weapon');
  t.is('…and one not flagged is not', GoodKarma.focusType({ type: 'melee', name: 'Katana', system: {} }), null);

  t.is('Force from the item\'s rating first', GoodKarma.focusForce(gear('Power Focus (Rating 1)'), 3), 3);
  t.is('…else from the name: "(Rating 2)"', GoodKarma.focusForce(gear('Spirit Focus (Rating 2)')), 2);
  t.is('…or "Weapon Focus 2"', GoodKarma.focusForce({ name: 'Sword (Weapon Focus 2)' }), 2);
  t.is('…and null when neither says', GoodKarma.focusForce(gear('Specific Spell Focus (Invisibility)')), null);

  // p.190, every row of the Focus Bonding Table at Force 3.
  t.is('specific spell: 1 × Force', GoodKarma.bondingCost('specific', 3), 3);
  t.is('spell category: 3 × Force', GoodKarma.bondingCost('category', 3), 9);
  t.is('spirit: 2 × Force', GoodKarma.bondingCost('spirit', 3), 6);
  t.is('power: 5 × Force', GoodKarma.bondingCost('power', 3), 15);
  t.is('sustaining: 1 × Force', GoodKarma.bondingCost('sustaining', 3), 3);
  t.is('expendable: nothing', GoodKarma.bondingCost('expendable', 3), 0);
  t.is('weapon, Reach 1: (3 + 1) × Force', GoodKarma.bondingCost('weapon', 3, 1), 12);
  t.is('weapon, Reach 0: 3 × Force — Reach is not ignored either way', GoodKarma.bondingCost('weapon', 3, 0), 9);
  t.is('no Force, no price — the GM is asked, not guessed at', GoodKarma.bondingCost('power', null), null);
  t.is('the table has its seven rows', FOCUS_BONDING.length, 7);

  t.is('a specialisation tops out at twice the base skill', GoodKarma.specCeiling(4), 8);
  t.is('…except a base of 1, which may carry a 3', GoodKarma.specCeiling(1), 3);
  t.ok('base 4, spec 9 is over', GoodKarma.specOverCeiling(4, 9));
  t.ok('base 4, spec 8 is not', !GoodKarma.specOverCeiling(4, 8));
  t.ok('base 1, spec 3 is not', !GoodKarma.specOverCeiling(1, 3));

  /* ── The GM's undo for a Good Karma purchase (TODO 212) ───────────────────── */
  const revert = { actor: { 'system.attributes.body.base': 4 } };
  const spend  = Ledger.diff({ karma: 20, nuyen: 0 }, { karma: 10 }, { reason: 'Body 4 → 5', when: 7, revert });
  t.eq('a purchase\'s karma line carries how to undo it', spend[0].revert, revert);
  t.ok('…and is undoable', Ledger.undoable(spend[0]));
  const award = Ledger.diff({ karma: 0 }, { karma: 5 }, { revert, when: 8 });
  t.ok('an AWARD carries no reversal — only a spend does', !award[0].revert && !Ledger.undoable(award[0]));
  const both = Ledger.diff({ karma: 20, nuyen: 100 }, { karma: 10, nuyen: 50 }, { revert, when: 9 });
  t.ok('…nor does the nuyen line beside it', !both.find(e => e.kind === 'nuyen').revert);
  t.ok('a line with no reversal cannot be undone', !Ledger.undoable(Ledger.entry({ kind: 'karma', delta: -5 })));

  const ledger = [Ledger.entry({ kind: 'nuyen', delta: 5, when: 1 }), spend[0]];
  t.is('the undo button finds its line by time', Ledger.find(ledger, 7), 1);
  const marked = Ledger.markReverted(ledger, 1);
  t.ok('…marks it undone', marked[1].reverted && !Ledger.undoable(marked[1]));
  t.ok('…without touching the ledger it was given', !ledger[1].reverted);

  t.eq('the plan: refund the spend, and set Body back', Ledger.revertPlan(spend[0]),
    { refund: 10, actor: [{ path: 'system.attributes.body.base', value: 4 }], items: [], deleteItems: [] });
  t.is('an undone line has no plan', Ledger.revertPlan(marked[1]), null);

  /* ── The wiring (source-level: sheets and cards cannot run without Foundry) ── */
  const actorSrc = read('scripts/documents/SR3EActor.js');
  const sheetSrc = read('scripts/sheets/SR3EActorSheet.js');
  const itemSrc  = read('scripts/documents/SR3EItem.js');
  const mainSrc  = read('scripts/sr3e.js');

  t.ok('the dead re-roll function is gone', !/_handleKarmaReroll/.test(actorSrc));
  t.ok('nothing collects the old, unread "useKarma" option any more',
    !/useKarma/.test(actorSrc + sheetSrc + itemSrc));
  for (const [file, src, n] of [['the sheet', sheetSrc, 2], ['the weapon flows', itemSrc, 2]]) {
    t.is(`${file}: every roll dialog shows the 🍀 row`, (src.match(/karmaRollRow\(actor\)/g) ?? []).length, n);
    t.is(`${file}: …and reads it back`, (src.match(/readKarmaRollRow\(/g) ?? []).length, n);
  }
  t.is('both weapon flows copy the row into the roll options',
    (itemSrc.match(/Object\.assign\(options, weaponOpts\.karma \?\? \{\}\)/g) ?? []).length, 2);
  t.is('both weapon flows cap bought dice at the dice before Combat Pool',
    (itemSrc.match(/\{ \.\.\.options, karmaDiceCap \}/g) ?? []).length, 2);

  // rollPool charges what the dialogs collected.
  const rollPool = actorSrc.slice(actorSrc.indexOf('async rollPool('), actorSrc.indexOf('_rollWave(count, tn, isFirstWave'));
  t.ok('rollPool buys the extra dice', /options\.karmaDice/.test(rollPool) && /extraDiceCost/.test(rollPool));
  t.ok('…burns for Hooper-Nelson', /options\.hooperNelson/.test(rollPool) && /burnKarmaPool/.test(rollPool));
  t.ok('…and holds the roll when asked', /karmaHold/.test(rollPool));

  // ⚠ The hold sits BEFORE the result block, whose branches post cards and draw blast markers.
  const wave   = actorSrc.slice(actorSrc.indexOf('async _postWaveCard('));
  const holdAt = wave.indexOf('state.karmaHold');
  t.ok('a held roll stops before anything resolves',
    holdAt > 0 && holdAt < wave.indexOf('Result block — only shown when all dice are resolved'));
  t.ok('…and only once every die is done', /if \(allDone && state\.karmaHold && !state\.physicalDice\)/.test(wave));
  t.ok('✔ Done resolves by coming back without the hold', /_postWaveCard\(\{ \.\.\.state, karmaHold: false \}\)/.test(actorSrc));

  // The chat card is the roller's to decide, once, on every client.
  t.ok('the 🍀 buttons are the roller\'s alone', /_isDeciderId\(held\.actorId\)/.test(mainSrc));
  t.ok('…and claimed on the message, so a reload cannot spend the same roll twice',
    /_claimExplosion\(mid, 'karmahold', 0\)/.test(mainSrc));
  t.ok('a held roll is a ⏳ step', /'sr-karma-done-btn':/.test(read('scripts/data/open-steps.mjs')));

  // The pool is not a Combat Turn pool.
  const resetAll = sheetSrc.slice(sheetSrc.indexOf('static async _onResetAllPools'), sheetSrc.indexOf('static async _onResetAllPools') + 300);
  t.ok('"Reset All Pools" leaves the Karma Pool alone ("does not refresh every Combat Turn")', !/karmaPool/.test(resetAll));
  t.ok('the GM has a refresh on the sheet', /refreshKarmaPool:\s+SR3EActorSheet\._onRefreshKarmaPool/.test(sheetSrc));
  t.ok('…and for the party, among the GM tools', /mk\('sr3e-karma-refresh-btn'/.test(mainSrc));

  // Every Spend-calculator purchase can be undone.
  const calc = sheetSrc.slice(sheetSrc.indexOf('static async _onSpendKarmaCalculator'));
  t.is('every purchase that spends karma records how to undo it',
    (calc.match(/ledgerRevert:/g) ?? []).length, (calc.match(/'system\.karma': karma - /g) ?? []).length);
  t.ok('the ledger passes the reversal through', /revert:\s+options\?\.ledgerRevert/.test(actorSrc));
  t.ok('the ↺ is the GM\'s', /game\.user\.isGM && L\.undoable\(e\)/.test(sheetSrc));
  t.ok('Power Points bought count toward the adept\'s total',
    /ppTotal\s+= \(actor\.system\.attributes\?\.magic\?\.value \?\? 0\) \+ ppBought/.test(sheetSrc));
}
