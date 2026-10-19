/**
 * Shock weapons stun the target · SR3 p.124-125 (maintainer's ruling 2026-10-18).
 *
 *   "A successful hit by a stun weapon stuns the target for a number of Combat Turns equal to the Power of the
 *    attack, minus one-half (round down) any impact armor worn, and also minus the successes generated from a Body
 *    or Willpower Test (whichever is greater) made against a Target Number 4. This state of disorientation imposes
 *    an additional +2 target modifier to all tests for as long as it lasts.
 *    Impact armor protects against shock weapons, but its rating is halved (rounding down)."   — SR3 p.124-125
 *
 * The damage is the weapon's Stun code through the normal soak; the stun condition deals none of its own.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { ShockStun, STUN_TN, STUN_MOD, STUN_STATUS } = await import('../scripts/data/shock-stun.mjs');
const { SR3EActor } = await import('../scripts/documents/SR3EActor.js');
const { PackFixes070 } = await import('../scripts/data/pack-corrections-0-7-0.mjs');
const { STEP_BUTTONS } = await import('../scripts/data/open-steps.mjs');

export const name = 'shock-stun';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

export async function run(t) {
  /* ── the duration: Power − ½ Impact (down) − successes, never below 0 ─────────────────────────── */
  t.is('Power 6 (a Stun Baton), no armour, no successes: 6 Combat Turns', ShockStun.duration({ power: 6, impact: 0, successes: 0 }), 6);
  t.is('…successes come off one for one', ShockStun.duration({ power: 6, impact: 0, successes: 2 }), 4);
  t.is('…Impact armour counts at half: 4 -> 2', ShockStun.duration({ power: 6, impact: 4, successes: 0 }), 4);
  t.is('…rounded DOWN: Impact 5 is 2, not 3', ShockStun.duration({ power: 6, impact: 5, successes: 0 }), 4);
  t.is('…Impact 1 takes nothing off', ShockStun.duration({ power: 6, impact: 1, successes: 0 }), 6);
  t.is('the Shock Glove (Power 7) vs Impact 3 and 2 successes: 7 - 1 - 2 = 4', ShockStun.duration({ power: 7, impact: 3, successes: 2 }), 4);
  t.is('the Super Shock (Power 10), Impact 4, 1 success: 10 - 2 - 1 = 7', ShockStun.duration({ power: 10, impact: 4, successes: 1 }), 7);
  t.is('never below 0: enough successes is "not stunned"', ShockStun.duration({ power: 6, impact: 4, successes: 9 }), 0);
  t.is('…exactly cancelled is 0 too', ShockStun.duration({ power: 6, impact: 4, successes: 4 }), 0);
  t.is('garbage in, 0 out', ShockStun.duration({ power: 'x' }), 0);
  t.is('half Impact helper: 0,1,2,3,5 -> 0,0,1,1,2', [0, 1, 2, 3, 5].map(ShockStun.halfImpact).join(','), '0,0,1,1,2');

  /* ── Body or Willpower, whichever is greater ───────────────────────────────────────────────────── */
  t.eq('Body 6 vs Willpower 3: Body', ShockStun.resistDice(6, 3), { dice: 6, attr: 'body' });
  t.eq('Body 3 vs Willpower 6: Willpower', ShockStun.resistDice(3, 6), { dice: 6, attr: 'willpower' });
  t.eq('a tie is Body', ShockStun.resistDice(4, 4), { dice: 4, attr: 'body' });
  t.is('the test is against Target Number 4', STUN_TN, 4);

  /* ── which Power: the printed Power of the shock code ─────────────────────────────────────────── */
  t.is('"7S Stun" prints Power 7', ShockStun.printedPower('7S Stun'), 7);
  t.is('"+7S Stun" (as the glove\'s table writes it) too', ShockStun.printedPower('+7S Stun'), 7);
  t.is('"10S Stun" (the Super Shock)', ShockStun.printedPower('10S Stun'), 10);
  t.is('a formula has none printed: the caller falls back to the Power it resolved', ShockStun.printedPower('(STR)S'), null);
  t.is('blank has none', ShockStun.printedPower(''), null);

  /* ── which weapons are shock weapons ─────────────────────────────────────────────────────────── */
  t.ok('the flag makes a shock weapon', ShockStun.isShock({ system: { shock: true, category: 'CLB' } }));
  t.ok('a Taser category always is, flag or not', ShockStun.isShock({ system: { category: 'Tasr' } }));
  t.ok('an ordinary club is not', !ShockStun.isShock({ system: { category: 'CLB', damage: '(STR+1)M' } }));
  t.is('a baton\'s main code is the shock', ShockStun.mainCode({ system: { shock: true, damage: '6S Stun' } }), '6S Stun');
  t.is('…as fired, after a GM edit, wins over the item\'s', ShockStun.mainCode({ system: { shock: true, damage: '6S Stun' } }, '8S Stun'), '8S Stun');
  t.is('the glove\'s FIST is not a shock (its extra code is)', ShockStun.mainCode({ system: { shock: true, damage: '(STR-1)M Stun', extraDamage: '7S Stun' } }), '');
  t.is('a non-shock weapon has none', ShockStun.mainCode({ system: { damage: '9M' } }), '');

  /* ── countdown, and the +2 ──────────────────────────────────────────────────────────────────── */
  t.eq('counts down 3,2,1,0 and stops at 0', [3, 2, 1, 0].map(ShockStun.countDown), [2, 1, 0, 0]);
  t.is('while stunned: +2 to all tests (p.125)', ShockStun.tnMod(true), 2);
  t.is('…the constant is 2', STUN_MOD, 2);
  t.is('…not stunned: nothing', ShockStun.tnMod(false), 0);
  t.is('the status id the token carries', STUN_STATUS, 'sr3e-stunned');

  /* ── the +2 lands where "all tests" does: standingTN, and the dodge ──────────────────────────── */
  const stunned = { system: { sustainedSpells: [], derived: {} }, flags: { The2ndChumming3e: { stunTurns: 3 } } };
  const clear   = { system: { sustainedSpells: [], derived: {} } };
  t.is('a stunned actor adds +2 to the standing TN', SR3EActor.standingTN(stunned), 2);
  t.is('…an unstunned one adds nothing', SR3EActor.standingTN(clear), 0);
  t.is('…the status icon alone stuns, with no count (a GM ticked it)', SR3EActor.standingTN({ ...clear, statuses: new Set(['sr3e-stunned']) }), 2);
  t.is('…it stacks with drugs', SR3EActor.standingTN({ system: { sustainedSpells: [], derived: { drugTN: 2 } }, flags: stunned.flags }), 4);
  t.ok('…and the breakdown names it with the turns left', /Stunned \+2 \(3 Combat Turns\)/.test(SR3EActor.standingNote(stunned)));
  t.is('stunTurns reads the flag, 0 when missing', [SR3EActor.stunTurns(stunned), SR3EActor.stunTurns(clear)].join(','), '3,0');
  t.is('the Dodge Test takes the stun as its own term', SR3EActor.dodgeTN({ stunned: 2 }), 6);
  t.ok('…and names it', SR3EActor.dodgeTNParts({ stunned: 2 }).some(p => /\+2 stunned/.test(p)));
  t.is('…together with the wound, drugs and the rest', SR3EActor.dodgeTN({ woundMod: -1, drugs: 2, stunned: 2 }), 9);

  /* ── the packs and the migration ─────────────────────────────────────────────────────────────── */
  const sys = (pack, file) => {
    const dir = new URL(`../packs-src/${pack}/`, import.meta.url);
    return JSON.parse(readFileSync(new URL(readdirSync(dir).find(n => n.endsWith(file)), dir), 'utf8')).doc.system;
  };
  t.ok('the Stun Baton is flagged shock', sys('sr3e-sr3-melee', '.sr3e-melee-0081.json').shock === true);
  t.ok('…the AZ-150 Stun Baton (Cannon Companion: "use the rules for Shock Weapons")', sys('sr3e-cc-melee', '.sr3e-melee-0050.json').shock === true);
  t.ok('…the Shock Glove', sys('sr3e-sr3-melee', '.sr3e-melee-0109.json').shock === true);
  t.ok('…the Defiance Super Shock', sys('sr3e-sr3-firearms', '.sr3e-firearm-0642.json').shock === true);
  t.ok('…the Jupiter Taser Club (both copies), the Nova Telcom Taser, the Yamaha Pulsar',
    ['sr3e-sota2-firearms/.sr3e-firearm-0646.json', 'sr3e-sota2-firearms/.sr3e-firearm-1257.json',
      'sr3e-tss-firearms/.sr3e-firearm-0650.json', 'sr3e-cc-firearms/.sr3e-firearm-0654.json']
      .every(x => { const [p, f] = x.split('/'); return sys(p, f).shock === true; }));
  t.ok('an ordinary Club is not', sys('sr3e-sr3-melee', '.sr3e-melee-0069.json').shock !== true);
  const fx = (type, nm, sy) => PackFixes070.fixItem({ type, name: nm, system: sy });
  t.eq('migration: an owned Stun Baton gains the flag', fx('melee', 'Stun Baton', { shock: false, damage: '6S Stun' }), { 'system.shock': true });
  t.eq('…an owned Defiance Super Shock', fx('firearm', 'Defiance Super Shock', { shock: false }), { 'system.shock': true });
  t.is('…already flagged: nothing', fx('melee', 'Stun Baton', { shock: true }), null);
  t.is('…a same-named gear item is skipped', fx('gear', 'Stun Baton', { shock: false }), null);
  t.ok('…the owned Shock Glove gains it with the extra code',
    fx('melee', 'Shock Glove', { damage: '(STR-1)M Stun', extraDamage: '7S Stun', shock: false, notes: 'x' })?.['system.shock'] === true);

  /* ── the wiring, source-level (sheets and chat handlers cannot be imported) ──────────────────── */
  const actor = read('scripts/documents/SR3EActor.js');
  const main  = read('scripts/sr3e.js');
  const models = read('scripts/data/ItemDataModels.js');
  t.is('MeleeData and FirearmData both declare `shock` (default false)', (models.match(/shock:\s+new BooleanField\(\{ initial: false \}\)/g) ?? []).length, 2);
  t.is('the item sheet shows the tick on melee and firearms', (read('scripts/sheets/SR3EItemSheet.js').match(/'Shock weapon[^']*', 'shock'/g) ?? []).length, 2);
  t.ok('sr3e-stunned is a registered status effect', /id: 'sr3e-stunned'/.test(main));
  t.ok('the soak card offers the stun on a shock hit, only for a shock code', /if \(shockCode\) \{[\s\S]{0,1500}sr-shock-stun-btn/.test(actor));
  t.ok('…reading the weapon through the attack\'s weaponItemId', /game\.actors\.get\(payload\.attackerActorId\)\?\.items\?\.get\(payload\.weaponItemId\)/.test(actor));
  t.ok('…the glove\'s extra payload names its own shock code', /shockCode:\s+extraCode/.test(actor));
  t.ok('…and the melee soak payloads carry the weapon id', (actor.match(/weaponItemId:\s+(winnerWeaponId|fc\.atkWeaponId) \|\| undefined/g) ?? []).length === 2);
  t.ok('a shock hit is resisted with Impact armour, halved (also a taser)', /const shock\s+= payload\.shock === true \|\| !!shockCode;[\s\S]{0,400}if \(shock\) \{\s+const halved = ExtraDamage\.shockImpact\(impact\)/.test(actor)
    && /payload\.useImpact === true \|\| shock;/.test(actor));
  t.ok('the stun duration takes the FULL Impact (it halves it itself)', /impact:\s+impactWorn/.test(actor));
  t.ok('the Body/Willpower Test goes through rollPool with the shockStun follow-up', /actor\.rollPool\([\s\S]{0,260}followUp: \{ kind: 'shockStun'/.test(actor));
  t.ok('shockStun is in FOLLOW_UPS', /shockStun:\s+\['SR3EActor', '_shockStunOutcome'\]/.test(actor));
  t.ok('the outcome offers Mark stunned only when turns > 0, applying nothing itself', /turns > 0 \? `<div class="sr-soak-action">\s+<button class="sr-shock-stun-mark-btn"/.test(actor)
    && !/_shockStunOutcome[\s\S]{0,1200}markStunned\(/.test(actor.slice(actor.indexOf('static async _shockStunOutcome'), actor.indexOf('static async handleShockStunMarkClick'))));
  t.ok('the Resist button ROLLS: one user (_isDeciderId), one-shot', /\.sr-shock-stun-btn[\s\S]{0,200}_checkBtn[\s\S]{0,300}_isDeciderId\(pl\.actorId\)[\s\S]{0,400}_claimBtn/.test(main));
  t.ok('the Mark button is the owner\'s or the GM\'s (_mineId), one-shot', /\.sr-shock-stun-mark-btn[\s\S]{0,200}_checkBtn[\s\S]{0,300}_mineId\(pl\.actorId\)[\s\S]{0,400}_claimBtn/.test(main));
  t.ok('the Resist button is a ⏳ step for the target', 'sr-shock-stun-btn' in STEP_BUTTONS && !('sr-shock-stun-mark-btn' in STEP_BUTTONS));
  t.ok('removing the status by hand clears the count (active GM)', /deleteActiveEffect[\s\S]{0,400}unsetFlag\('The2ndChumming3e', 'stunTurns'\)/.test(main));

  const combat = read('scripts/documents/SR3ECombat.js');
  t.ok('the count goes down once per Combat Turn, from _newRound', /async _newRound\(\) \{[\s\S]{0,260}await this\._countDownStun\(\);/.test(combat));
  t.ok('…and NOT from _endOfTurnReset (it also runs at the start and end of the fight)',
    !combat.slice(combat.indexOf('async _endOfTurnReset()'), combat.indexOf('async _countDownStun()')).includes('_countDownStun'));
  t.ok('…it counts with ShockStun.countDown and clears at 0', /ShockStun\.countDown\(turns\)[\s\S]{0,300}actor\.clearStunned\(\)/.test(combat));
  t.ok('ending the combat clears the stun', /endCombat\(\)[\s\S]{0,1200}clearStunned\?\.\(\)/.test(combat));
  t.ok('the roll\'s follow-up needs no new explosion-carry field (it rides `followUp`)', /followUp:\s+state\.followUp\s+\?\? null/.test(actor));
}
