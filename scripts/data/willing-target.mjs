/**
 * A willing subject takes no Spell Resistance Test · SR3 p.178, p.183 — TODO 191. **Pure — no Foundry.**
 *
 * > "Living targets may always make a Spell Resistance Test against spells, unless the target of the
 * > spell is willing." — p.183
 * > "If the target makes no Spell Resistance Test, all the successes from the Sorcery Test are used,
 * > according to the spell's description, to determine the spell's effect. When casting spells against
 * > non-resisting targets (which are generally non-living targets) one success always insures some
 * > degree of effect." — p.183
 * > "To touch an unwilling target, the caster must make a normal unarmed [Combat Test]" — p.178
 *
 * So the Sorcery Test is still made (the spell has to be cast; with no successes "the spell fails and
 * there is no effect", p.182, and Drain is owed either way) — what a willing subject changes is that
 * no Resist Spell is offered and every success goes to the effect. ⚠ The book gives a willing subject
 * no lower target number: the cast TN stays the targeted Attribute (p.182).
 *
 * ⚠ A **damaging** spell (Combat, Elemental) never takes this path: it is meant to hurt, and an
 * elemental spell is "treated like normal ranged attacks" with a Damage Resistance Test (p.183) that no
 * willingness waives. The caller offers the choice only when `canBeWilling(category)`.
 *
 * Default: the caster's own self, or a friendly / party actor. Only a default — the caster always
 * overrides it in the dialog (warn, never refuse).
 */

export const WillingTarget = {
  /** May this spell category be cast on a willing, unresisting subject? Combat and Elemental may not. */
  canBeWilling(category) {
    return !/^\s*(combat|elemental)\s*$/i.test(String(category ?? ''));
  },

  /**
   * The default for one target: the caster themself, an actor the caster's player also owns, a party
   * member, or a token whose disposition is friendly. `facts` are booleans the caller reads from
   * Foundry: `{ isSelf, sameOwner, bothPlayerOwned, friendlyToken }`.
   */
  defaultWilling(facts = {}) {
    return !!(facts.isSelf || facts.sameOwner || facts.bothPlayerOwned || facts.friendlyToken);
  },

  /** Does this cast resolve `targetId` without a Resistance Test? */
  resolvesUnresisted(sc, targetId) {
    return !sc?.isElemental && Array.isArray(sc?.willingTargetIds) && sc.willingTargetIds.includes(targetId);
  },

  /** The ids to carry on the cast, from the dialog's ticks — only targets that exist and only for a spell that may. */
  carriedIds(category, targetIds, ticked) {
    if (!WillingTarget.canBeWilling(category)) return [];
    const ok = new Set(targetIds ?? []);
    return [...new Set(ticked ?? [])].filter(id => ok.has(id));
  },

  /**
   * The card line for a willing target — states the effect rather than offering a Resist button.
   * `successes` is the caster's count against that target; 0 means the spell did not take.
   */
  effectLine({ targetName, spellName, successes, touch = false }) {
    const n = Math.max(0, Math.floor(Number(successes) || 0));
    if (n === 0) return `${targetName} is willing, but the casting had no successes — ${spellName} fails (p.182).`;
    const touchNote = touch ? ' No Unarmed Combat Test is needed to touch a willing subject (p.178).' : '';
    return `${targetName} is willing — no Spell Resistance Test (p.183). All ${n} success${n === 1 ? '' : 'es'} set `
      + `${spellName}'s effect, as the spell's description says.${touchNote}`;
  },
};
