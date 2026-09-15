/**
 * The action economy — one Combat Phase, what each action costs, and the GM's undo · TODO 48.
 *
 * Rules (`scripts/data/action-economy.mjs`) from SR3 pp.105-108; the wiring source-level, since the
 * tracker and the roll flows cannot run without Foundry.
 */
import { readFileSync } from 'node:fs';
import { ActionEconomy, ACTIONS } from '../scripts/data/action-economy.mjs';

export const name = 'action-economy';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

export async function run(t) {
  const E = ActionEconomy;

  /* ── What a phase holds · p.105, p.107 ─────────────────────────────────────── */
  const two = E.charge(E.charge(E.empty('1|0'), 'fireWeapon').ledger, 'readyWeapon').ledger;
  t.eq('two Simple Actions fit ("up to two Simple Actions or one Complex Action", p.105)', [two.simple, E.charge(E.empty(), 'fireWeapon').over], [2, false]);
  t.ok('a third Simple does not fit — recorded anyway, flagged', E.charge(two, 'fireWeapon').over && E.charge(two, 'fireWeapon').ledger.simple === 3);
  t.ok('a Complex after a Simple does not fit', E.charge(E.charge(E.empty(), 'fireWeapon').ledger, 'meleeAttack').over);
  const cx = E.charge(E.empty(), 'castSpell').ledger;
  t.ok('a Simple after a Complex does not fit ("may not take Simple Actions", p.107)', E.charge(cx, 'fireWeapon').over);
  t.ok('…but a Free still does ("may also take a Free Action", p.107)', !E.charge(cx, 'dropObject').over);
  t.ok('the Free does not use up a Simple slot', !E.charge(E.charge(E.empty(), 'dropObject').ledger, 'fireWeapon').over
    && !E.charge(E.charge(E.charge(E.empty(), 'dropObject').ledger, 'fireWeapon').ledger, 'readyWeapon').over);
  t.ok('only one Free per phase', E.charge(E.charge(E.empty(), 'dropObject').ledger, 'freeAction').over);
  t.eq('remaining after one Simple', E.remaining(E.charge(E.empty(), 'fireWeapon').ledger), { simple: 1, complex: 0, free: 1 });

  /* ── Costs, from the page ──────────────────────────────────────────────────── */
  t.is('SA / BF / SS fire a weapon — Simple (p.106)', ACTIONS[E.fireAction('SA')].cost, 'simple');
  t.is('FULL AUTO is a different action — Complex (p.108)', ACTIONS[E.fireAction('FA')].cost, 'complex');
  t.eq('the Complex actions of p.107-108',
    ['meleeAttack', 'castSpell', 'fireVehicleWeapon', 'reloadFirearm', 'summonSpirit', 'useSkill'].map(k => ACTIONS[k].cost),
    Array(6).fill('complex'));
  t.eq('the Simple ones of p.106-107',
    ['throwWeapon', 'insertClip', 'removeClip', 'readyWeapon', 'quickDraw', 'takeAim', 'observeInDetail'].map(k => ACTIONS[k].cost),
    Array(7).fill('simple'));
  t.ok('every action cites its page', Object.values(ACTIONS).every(a => /^SR3 p\.10[5-8]$/.test(a.page)));
  t.ok('nothing reactive is in the table — dodge, soak, resistance cost the defender nothing',
    !Object.keys(ACTIONS).some(k => /dodge|soak|resist|defen|initiative/i.test(k)));

  /* ── A ledger belongs to one phase ─────────────────────────────────────────── */
  t.eq('a ledger from another phase reads as empty — nothing has to clear it', E.ledgerFor(two, '1|1'), E.empty('1|1'));
  t.is('…and this phase\'s reads back', E.ledgerFor(two, '1|0').simple, 2);
  t.is('uncharge frees the slot', E.uncharge(two, 1).simple, 1);

  /* ── The GM's undo ─────────────────────────────────────────────────────────── */
  const before = { system: { combatPoolSpent: 0, roundsFiredThisPhase: 0, karmaPool: 3, nuyen: 500 },
    items: [{ id: 'g', name: 'Predator', type: 'firearm', system: { loadedRounds: 15, loadedAmmoType: 'regular' } },
            { id: 'k', name: 'Knife', type: 'thrown', system: { quantity: 3 } },
            { id: 's', name: 'Sorcery', type: 'skill', system: { rating: 5 } }] };
  const snap = E.snapshot(before, 1000);
  t.eq('the snapshot holds what an action can spend — and nothing else (not nuyen, not skills)',
    [Object.keys(snap.actor).sort(), Object.keys(snap.items).sort()], [['combatPoolSpent', 'karmaPool', 'roundsFiredThisPhase'], ['g', 'k']]);
  const after = { system: { ...before.system, combatPoolSpent: 4, roundsFiredThisPhase: 3 },
    items: [{ ...before.items[0], system: { loadedRounds: 12, loadedAmmoType: 'regular' } }, before.items[2]] };
  const plan = E.restorePlan(snap, after);
  t.eq('the undo puts back the pool dice, the recoil count and the rounds fired',
    plan.filter(p => !p.gone).map(p => `${p.field}:${p.now}→${p.back}`),
    ['combatPoolSpent:4→0', 'roundsFiredThisPhase:3→0', 'loadedRounds:12→15']);
  t.ok('…and says so when an item has gone since (the last knife thrown)', plan.some(p => p.gone && p.name === 'Knife'));
  t.eq('nothing changed → nothing to put back', E.restorePlan(snap, before), []);
  t.ok('the snapshot rides on the ledger entry', E.charge(E.empty(), 'fireWeapon', 'x', 'GM', snap).ledger.log[0].snap.at === 1000);

  /* ── Wiring ───────────────────────────────────────────────────────────────── */
  const item = read('scripts/documents/SR3EItem.js');
  const main = read('scripts/sr3e.js');
  const led  = read('scripts/SR3EActionLedger.js');
  const summ = read('scripts/documents/SR3ESpiritSummoning.js');
  t.ok('the old GM-local Map is gone', !/_actionTracker/.test(main));
  t.ok('the tracker renders for everyone (no isGM gate around it)', /SR3EActionLedger\.renderTracker\(combat, el\);/.test(main));
  t.ok('the ledger is a combatant flag, written by the GM through sr3e.action.charge',
    /setFlag\(FLAG, KEY, ledger\)/.test(led) && /CONFIG\.queries\['sr3e\.action\.charge'\]/.test(led) && /assertActiveGM/.test(led));
  t.ok('a charge never advances the turn — only the GM\'s Complex / second Simple do',
    (led.match(/nextTurn\(\)/g) ?? []).length === 2 && !/charge[\s\S]{0,400}nextTurn/.test(led.slice(led.indexOf('static async charge'), led.indexOf('static async write'))));
  const charges = ['useSkill', 'meleeAttack', 'castSpell', 'fireVehicleWeapon', 'readyWeapon', 'removeClip', 'insertClip', 'reloadFirearm'];
  t.eq('every flow charges its action', charges.filter(k => !new RegExp(`charge\\([^)]*'${k}'`).test(item)), []);
  t.ok('firearms are charged by fire mode, thrown weapons as Throw Weapon',
    /_isConsumable\(\) \? 'throwWeapon' : game\.sr3e\.SR3EActionLedger\.rules\.fireAction\(fireModeResult\?\.mode\)/.test(item));
  t.ok('only NATURE spirits are a Complex Action (elementals take hours)', /spiritDef\.category === 'nature'\) game\.sr3e\.SR3EActionLedger\?\.charge\(conjurer, 'summonSpirit'/.test(summ));
  t.is('every flow snapshots at its start, for the undo', (item.match(/SR3EActionLedger\?\.begin\(actor\)/g) ?? []).length + (summ.match(/begin\(conjurer\)/g) ?? []).length, 7);
  t.ok('the dodge, soak and resistance handlers never charge', !/charge\(/.test(
    ['static async handleDodgeDeclare', 'static async handleSoakRollClick'].map(h => {
      const a = read('scripts/documents/SR3EActor.js'); const i = a.indexOf(h); return i < 0 ? '' : a.slice(i, i + 3000); }).join('')));
  t.ok('the undo is GM only, a ticked list, and frees the slot', /static async openUndo[\s\S]{0,120}if \(!game\.user\.isGM\) return;/.test(led)
    && /class="sr3e-undo-val"[^>]*checked/.test(led) && /ActionEconomy\.uncharge\(SR3EActionLedger\.ledgerOf\(cbt\), chosen\.idx\)/.test(led));
}
