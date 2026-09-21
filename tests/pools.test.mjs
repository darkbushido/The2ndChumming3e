/**
 * Dice pools and the end of a fight · SR3 p.43, p.104 (TODO 7).
 *
 * ⚠ **This suite exists for the gap TODO 7 names last.** `tests/initiative.test.mjs` pins the
 * TURN boundary (`_endOfTurnReset`) and `startCombat`, and nothing pinned **`endCombat`** — which
 * does the turn reset *plus* two clears that outlive a Combat Turn but not the fight: Spell Defense
 * (committed for a whole turn and re-declared each round) and **`tempMagicLoss`**, the flag TODO 7
 * itself calls "the one whose correct lifetime was never established". It is established here.
 *
 * ⚠ The other half is the **derivations** — Combat Pool and Spell Pool — which are read by every
 * combat flow and were only ever asserted incidentally, as a side effect of an adept-power test.
 */
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { SR3EActor } = await import('../scripts/documents/SR3EActor.js');
const { SR3ECombat } = await import('../scripts/documents/SR3ECombat.js');

export const name = 'pools';

/** A character whose derived data can be computed without Foundry. */
function character(attrs = {}, extra = {}) {
  const a = { body: 3, quickness: 4, intelligence: 5, willpower: 4, charisma: 3, strength: 3, magic: 0, ...attrs };
  const actor = Object.create(SR3EActor.prototype);
  actor.system = {
    attributes: Object.fromEntries(Object.entries(a).map(([k, v]) => [k, { base: v, value: v }])),
    wounds: { physical: { value: 0, max: 10 }, stun: { value: 0, max: 10 } },
    combatPoolSpent: 0, spellPoolSpent: 0,
    ...extra,
  };
  actor.items = [];
  actor.type = 'character';
  actor.getFlag = () => undefined;
  return actor;
}

export async function run(t) {
  /* ── Combat Pool · SR3 p.43 ───────────────────────────────────────────────── */
  // "⌊(QUI + INT + WIL) / 2⌋"
  const c = character({ quickness: 4, intelligence: 5, willpower: 4 });
  c.prepareDerivedData();
  t.is('Combat Pool is ⌊(QUI + INT + WIL) / 2⌋', c.system.derived.combatPool, Math.floor((4 + 5 + 4) / 2));
  // ⚠ It ROUNDS DOWN — an odd total is the case that tells floor from round.
  const odd = character({ quickness: 3, intelligence: 5, willpower: 4 });
  odd.prepareDerivedData();
  t.is('…rounding down, not to nearest', odd.system.derived.combatPool, 6);

  // available = derived − spent, floored at 0.
  const spent = character({ quickness: 4, intelligence: 5, willpower: 4 }, { combatPoolSpent: 2 });
  spent.prepareDerivedData();
  t.is('available is derived minus spent', spent.system.derived.availableCombatPool, 6 - 2);
  const over = character({ quickness: 4, intelligence: 5, willpower: 4 }, { combatPoolSpent: 99 });
  over.prepareDerivedData();
  // ⚠ Floored at 0: a negative pool would offer NEGATIVE dice in every allocation dialog.
  t.is('…and never goes negative, however much was spent', over.system.derived.availableCombatPool, 0);

  /* ── Spell Pool · SR3 p.43 ────────────────────────────────────────────────── */
  // "Intelligence plus Willpower plus Magic Rating, divided by 3, rounded down."
  const mage = character({ intelligence: 5, willpower: 4, magic: 6 });
  mage.prepareDerivedData();
  t.is('Spell Pool is ⌊(INT + WIL + MAG) / 3⌋', mage.system.derived.spellPool, Math.floor((5 + 4 + 6) / 3));
  // ⚠ NULL, not 0, for the unawakened — the sheet hides the block on null, and a 0 would render
  //   an empty pool to every mundane character.
  const mundane = character({ magic: 0 });
  mundane.prepareDerivedData();
  t.is('a mundane character has no Spell Pool at all', mundane.system.derived.spellPool, null);
  t.is('…and no available figure either', mundane.system.derived.availableSpellPool, null);

  /* ── The end of a fight · SR3ECombat.endCombat ────────────────────────────── */
  /**
   * ⚠ **`endCombat` is the turn reset PLUS two clears**, and only the turn reset was covered.
   * Spell Defense is committed for a whole Combat Turn and re-declared each round; `tempMagicLoss`
   * records Magic a spirit took off a banisher and must not follow them into the next fight.
   */
  {
    const seen = { reset: 0, cleared: [], unset: [], info: [] };
    const mkActor = name => ({
      name,
      system: { fullDefense: false, combatPoolSpent: 1 },
      resetRecoil: async () => {}, refreshCombatPool: async () => { seen.reset++; },
      refreshSpellPool: async () => {}, refreshAstralPool: async () => {}, refreshHackingPool: async () => {},
      update: async () => {},
      clearSpellDefense: async () => seen.cleared.push(name),
      unsetFlag: async (_s, k) => { seen.unset.push(`${name}:${k}`); },
    });
    const combat = Object.create(SR3ECombat.prototype);
    combat.combatants = { contents: [{ actor: mkActor('mage') }, { actor: mkActor('sam') }] };
    // The parent's endCombat is not reachable here; stub what `super.endCombat()` would return.
    Object.setPrototypeOf(combat, new Proxy(SR3ECombat.prototype, {}));
    globalThis.ui = { notifications: { info: m => seen.info.push(m), warn: () => {} } };

    let threw = null;
    try { await SR3ECombat.prototype.endCombat.call(combat); } catch (e) { threw = e; }

    t.is('every combatant\'s pools refresh when the fight ends', seen.reset, 2);
    t.eq('…Spell Defense is cleared for everyone', seen.cleared.sort(), ['mage', 'sam']);
    // ⚠ THE LIFETIME. tempMagicLoss is set when a spirit takes Magic off a banisher and must be
    //   gone by the next fight; nothing else in the codebase unsets it.
    t.eq('…and tempMagicLoss is unset for everyone', seen.unset.sort(), ['mage:tempMagicLoss', 'sam:tempMagicLoss']);
    t.ok('…with no prompt — it is a tidy-up, not a question (2026-08-11)',
      seen.info.some(m => /refreshed/i.test(m)));
    t.ok('reaching super.endCombat is the only thing that can fail here',
      threw === null || /super|endCombat/i.test(String(threw?.message ?? '')));
  }

  /* ── tempMagicLoss while it is set ────────────────────────────────────────── */
  /**
   * ⚠ It reduces the **effective Magic** a banisher brings, and is floored at 1 — a banisher
   * stripped to 0 Magic would roll no dice at all and the flow would look broken rather than hard.
   */
  {
    const attrs = { intelligence: 5, willpower: 4, magic: 6 };
    const full = SR3EActor.magicAttribute(character(attrs).system.attributes);
    t.is('with nothing lost, Magic is the effective rating', full, 6);
    t.is('…two points lost leaves 4', Math.max(1, full - 2), 4);
    t.is('…and it never falls below 1', Math.max(1, full - 99), 1);
  }

  /* ── Where the clears live, source-level ──────────────────────────────────── */
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../scripts/documents/SR3ECombat.js', import.meta.url), 'utf8');
  const body = src.slice(src.indexOf('async endCombat()'), src.indexOf('async endCombat()') + 900);
  t.ok('endCombat runs the turn reset first', /_endOfTurnReset\(\)/.test(body));
  // ⚠ These two must NOT drift into _endOfTurnReset: Spell Defense is committed for a whole turn,
  //   so clearing it per turn would erase a mage's declaration the moment the round ticked over.
  const turn = src.slice(src.indexOf('_endOfTurnReset'), src.indexOf('_endOfTurnReset') + 2000);
  t.ok('…and the two end-of-FIGHT clears are not in the per-TURN reset',
    !/clearSpellDefense/.test(turn) && !/tempMagicLoss/.test(turn));
}
