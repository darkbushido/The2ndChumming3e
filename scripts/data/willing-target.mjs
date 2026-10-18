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
 * ⚠ An **Elemental** spell never takes this path: it is "treated like normal ranged attacks" with a
 * Damage Resistance Test (p.183) that no willingness waives. The caller offers the choice only when
 * `canBeWilling(category)`. A **Combat** spell may (the maintainer's ruling, 0.7.0: a willing target of a
 * Manabolt takes no Resistance Test) — but it is meant to hurt, so its default is NOT willing: only a
 * deliberate tick. Every other spell (Health, Illusion, Manipulation, Detection, Transformation — the
 * buffs) defaults to willing for self, a same-owner / party / friendly actor, so a buff on an ally never
 * asks for a resistance roll.
 *
 * Default: the caster's own self, or a friendly / party actor. Only a default — the caster always
 * overrides it in the dialog (warn, never refuse).
 */

export const WillingTarget = {
  /** May this spell category be cast on a willing, unresisting subject? Everything but Elemental (a Damage Resistance Test). */
  canBeWilling(category) {
    return !/^\s*elemental\s*$/i.test(String(category ?? ''));
  },

  /** A Combat spell is meant to hurt: willing is only ever ticked deliberately (p.183, 0.7.0 ruling). */
  defaultsToUnwilling(category) {
    return /^\s*combat\s*$/i.test(String(category ?? ''));
  },

  /**
   * The default for one target: the caster themself, an actor the caster's player also owns, a party
   * member, or a token whose disposition is friendly. `facts` are booleans the caller reads from
   * Foundry: `{ isSelf, sameOwner, bothPlayerOwned, friendlyToken }`. A Combat spell defaults to NOT
   * willing for everyone, the caster included.
   */
  defaultWilling(facts = {}, category = '') {
    if (WillingTarget.defaultsToUnwilling(category)) return false;
    return !!(facts.isSelf || facts.sameOwner || facts.bothPlayerOwned || facts.friendlyToken);
  },

  /** Does this cast resolve `targetId` without a Resistance Test? */
  resolvesUnresisted(sc, targetId) {
    return !sc?.isElemental && Array.isArray(sc?.willingTargetIds) && sc.willingTargetIds.includes(targetId);
  },

  /** A non-living target (a vehicle) makes no Spell Resistance Test at all (p.183: "Living targets may always…"). */
  isNonLiving(actorType) {
    return actorType === 'vehicle';
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
  effectLine({ targetName, spellName, successes, touch = false, nonLiving = false }) {
    const n = Math.max(0, Math.floor(Number(successes) || 0));
    if (n === 0) return `${targetName} is willing, but the casting had no successes — ${spellName} fails (p.182).`;
    if (nonLiving) return `${targetName} is not living — no Spell Resistance Test (p.183); the ${n} success${n === 1 ? '' : 'es'} set ${spellName}'s effect (one success always insures some degree of effect).`;
    const touchNote = touch ? ' No Unarmed Combat Test is needed to touch a willing subject (p.178).' : '';
    return `${targetName} is willing — no Spell Resistance Test (p.183). All ${n} success${n === 1 ? '' : 'es'} set `
      + `${spellName}'s effect, as the spell's description says.${touchNote}`;
  },
};
