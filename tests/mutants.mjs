/**
 * Known-wrong implementations, used to prove the suites can actually FAIL.
 *
 * ── WHY THIS EXISTS ──────────────────────────────────────────────────────────────────
 *
 * A green suite proves nothing on its own. It proves something only if you know it would
 * have gone red had the rule been wrong — and twice in one session that turned out not to
 * hold here. The two ways a test quietly stops testing anything:
 *
 *   1. VACUOUS ARRANGEMENT — the setup neutered the assertion. A decker with no cyberdeck
 *      has a null Hacking Pool, `?? 0` makes every field 0, and every "charged correctly"
 *      assertion passes against zeros.
 *   2. NON-DISCRIMINATING FIXTURE — the old and new rules agree on the numbers chosen. Had
 *      the complementary-dice test used Flux 4 against skill 6, capped and uncapped both
 *      give 4 and the test says nothing about which rule is implemented.
 *
 * Every mutant below is a bug this project ACTUALLY SHIPPED. Reinstating each one must turn
 * its suite red. A mutant that SURVIVES is a precise statement: that rule is not covered,
 * whatever the green tick says.
 *
 * ⚠ Mutants are applied by reassigning a static on the class, which works because the
 * suites call through the class (`SR3EActor.essenceValue(…)`) rather than holding a
 * destructured reference. If a suite is ever rewritten to destructure the function, its
 * mutants will silently survive — which this harness will then report, correctly.
 */

const ACTOR = { module: '../scripts/documents/SR3EActor.js', klass: 'SR3EActor' };
const ITEM  = { module: '../scripts/documents/SR3EItem.js',  klass: 'SR3EItem'  };
const MIJI  = { module: '../scripts/SR3EMIJI.js',            klass: 'SR3EMIJI'  };
const HEAL  = { module: '../scripts/SR3EHealing.js',         klass: 'SR3EHealing' };
const RATING = { module: '../scripts/data/item-rating.mjs',  klass: 'ItemRating' };
const AMMO   = { module: '../scripts/data/ammo-stock.mjs',   klass: 'AmmoStock' };

export const MUTANTS = [
  {
    id:     'reload-docks-rounds-for-reloads',
    suite:  'ammo-stock',
    ...AMMO, method: 'reloadPlan',
    was:    'every stock counted in rounds — a "7-round cy reload ×6" wanted 42 rounds and docked 7 '
          + 'per reload (TODO 114, reported in play)',
    impl:   (sys, magSize) => { const have = Number(sys?.rounds) || 0; const loaded = Math.min(magSize, have);
      return { unit: 'rounds', field: 'rounds', loaded, remaining: have - loaded, short: loaded < magSize, mismatch: false }; },
  },
  {
    id:     'reload-keeps-partial-clip',
    suite:  'ammo-stock',
    ...AMMO, method: 'reloadPlan',
    needsOriginal: '_reloadPlan',
    was:    'a reload bigger than the magazine left the clip in stock, so an 8-round gun could draw '
          + 'from one 10-round clip for ever',
    impl:   function (sys, magSize, current, opts) { const p = this._reloadPlan(sys, magSize, current, opts);
      return p.mismatch && sys.roundsPerReload > magSize ? { ...p, remaining: p.remaining + 1 } : p; },
  },
  {
    id:     'swap-keeps-the-old-rounds',
    suite:  'ammo-stock',
    ...AMMO, method: 'reloadPlan',
    needsOriginal: '_reloadPlan',
    was:    'a clip swap that kept the old clip\'s rounds — the maintainer\'s rule is "if you swap mags you '
          + 'get the new amount and lose what was left in the old mag"',
    impl:   function (sys, magSize, current, opts) { const p = this._reloadPlan(sys, magSize, current, opts);
      return p.unit === 'reloads' ? { ...p, discarded: 0 } : p; },
  },
  {
    id:     'loose-rounds-swap-instead-of-topping-up',
    suite:  'ammo-stock',
    ...AMMO, method: 'reloadPlan',
    needsOriginal: '_reloadPlan',
    was:    'the first cut: loose rounds emptied the gun and refilled it, so a shotgun\'s unfired shells vanished',
    impl:   function (sys, magSize, current, opts) { return this._reloadPlan(sys, magSize, {}, opts); },
  },
  {
    id:     'loose-rounds-of-another-type-lost',
    suite:  'ammo-stock',
    ...AMMO, method: 'reloadPlan',
    needsOriginal: '_reloadPlan',
    was:    'loading a different type round by round threw the unfired rounds away — the maintainer: '
          + '"anything that\'s going round by round … shouldn\'t lose the unused rounds"',
    impl:   function (sys, magSize, current, opts) { const p = this._reloadPlan(sys, magSize, current, opts);
      return p.returned ? { ...p, discarded: p.returned, returned: 0 } : p; },
  },
  {
    id:     'b-read-as-belt',
    suite:  'ammo-stock',
    ...AMMO, method: 'kind',
    needsOriginal: '_kind',
    was:    'config.js labelled (b) "Belt"; SR3 p.280 makes it break action — 14 shipped guns, all break-action',
    impl:   function (mech) { return String(mech).toLowerCase() === 'b' ? 'either' : this._kind(mech); },
  },
  {
    id:     'loose-rounds-take-no-time',
    suite:  'ammo-stock',
    ...AMMO, method: 'reloadActions',
    was:    'no action cost shown — loose rounds loaded as fast as a clip (SR3 p.280: a Complex Action per Quickness rounds)',
    impl:   () => ({ complex: 0, simple: 0, text: '' }),
  },
  {
    id:     'ammo-name-no-type',
    suite:  'ammo-stock',
    ...AMMO, method: 'typeFromLabel',
    was:    'the importer\'s old behaviour — an Explosive clip arrived as Regular',
    impl:   () => null,
  },
  {
    id:     'complementary-capped',
    suite:  'ew-skill',
    ...MIJI, method: '_complementaryDice',
    was:    'min(Flux, skill) — a cap that appears in neither SR3 nor R3 (TODO 54.3)',
    // The old signature took two args; the mutant ignores the second the same way the
    // capped version effectively did when skill was the smaller number.
    impl:   (rating) => Math.max(0, Math.min(rating | 0, 6)),
  },
  {
    id:     'recoil-fa-ignores-own-rounds',
    suite:  'fire-modes',
    ...ITEM, method: 'recoilTN',
    was:    'full auto counting only rounds fired BEFORE the burst (R3/SR3 p.115)',
    impl:   ({ mode, roundsBefore = 0, totalComp = 0, isHeavy = false, isShotgun = false }) => {
      const mult = (isHeavy || (isShotgun && mode === 'BF')) ? 2 : 1;
      const own  = mode === 'BF' ? 3 : 0;          // FA wrongly contributes nothing
      return Math.max(0, (roundsBefore + own) - totalComp) * mult;
    },
  },
  {
    id:     'recoil-double-before-compensating',
    suite:  'fire-modes',
    ...ITEM, method: 'recoilTN',
    was:    'doubling heavy-weapon recoil BEFORE compensation ("2 x uncompensated", SR3 p.111)',
    impl:   ({ mode, roundsBefore = 0, roundsThisShot = 0, totalComp = 0,
               isHeavy = false, isShotgun = false }) => {
      const mult = (isHeavy || (isShotgun && mode === 'BF')) ? 2 : 1;
      const own  = mode === 'BF' ? 3 : mode === 'FA' ? Math.max(0, roundsThisShot | 0) : 0;
      return Math.max(0, ((roundsBefore + own) * mult) - totalComp);
    },
  },
  {
    id:     'essence-high-water-mark',
    suite:  'essence',
    ...ACTOR, method: 'essenceValue',
    was:    'max(lost, installed) — blocks a GM correction and grants a free Essence Slot',
    impl:   ({ base = 6, lost = null, installed = 0 } = {}) => {
      const b = Number.isFinite(Number(base)) ? Number(base) : 6;
      const e = Math.max(Number(lost) || 0, Number(installed) || 0);
      return Math.max(0, parseFloat((b - e).toFixed(2)));
    },
  },
  {
    id:     'heal-stage-drops-by-boxes',
    suite:  'healing',
    ...HEAL, method: 'oneLevelDown',
    was:    'healing a level by removing boxes instead of dropping to the next level\'s lowest box. '
          + 'p.127: a Serious wound healed to Moderate has "only three boxes of damage filled in"',
    impl:   boxes => Math.max(0, (Number(boxes) || 0) - 3),
  },
  {
    id:     'heal-stage-no-minimum',
    suite:  'healing',
    ...HEAL, method: 'stageHours',
    was:    'dropping the Healing Table minimum. p.127: "the actual time can never be lower than the minimum time"',
    impl:   ({ level, successes, baseMultiplier = 1, timeMultiplier = 1 } = {}) => {
      const row = { D: 720, S: 480, M: 240, L: 24 }[level]; const s = Number(successes) || 0;
      return !row || s <= 0 ? null : (row * baseMultiplier / s) * timeMultiplier;
    },
  },
  {
    id:     'magic-loss-deadly-untreated-once',
    suite:  'healing',
    ...HEAL, method: 'magicLossRolls',
    was:    'rolling once for a Deadly wound treated without the +2. p.129: "roll 2D6 twice for magic loss"',
    impl:   ({ awakened = false, deadly = false, treatedWithoutMod = false } = {}) => (awakened && (deadly || treatedWithoutMod) ? 1 : 0),
  },
  {
    id:     'medkit-no-complementary-dice',
    suite:  'healing',
    ...HEAL, method: 'firstAidDice',
    was:    'ignoring the medkit when the medic has Biotech. M&M p.138: it "provide[s] Complementary dice '
          + 'for Biotech Tests equal to their rating"',
    impl:   ({ biotech = 0, medkitRating = 0 } = {}) => biotech > 0 ? { dice: biotech, defaulting: false }
      : medkitRating > 0 ? { dice: medkitRating, defaulting: false } : { dice: 0, defaulting: true },
  },
  {
    id:     'stun-ignores-injury-modifiers',
    suite:  'healing',
    ...HEAL, method: 'stunRecovery',
    was:    'a flat TN 2 for Stun recovery. p.126: "This target number is modified by any appropriate '
          + 'Stun or Physical injury modifiers"',
    impl:   ({ body = 0, willpower = 0 } = {}) => ({ dice: Math.max(body, willpower), attribute: willpower > body ? 'Willpower' : 'Body', tn: 2 }),
  },
  {
    id:     'heal-card-player-edits-dice',
    suite:  'healing',
    ...HEAL, method: 'wireCard',
    was:    'the 0.5.1 card: Dice and TN editable by the player, and a GM edit never left the GM\'s '
          + 'own screen (reported in play)',
    impl:   () => {},
  },
  {
    id:     'damage-compensators-inert',
    suite:  'adept-powers',
    ...ACTOR, method: 'damageCompensatorLevel',
    was:    'Damage Compensators did nothing — no code read them (M&M p.71; reported in play)',
    impl:   () => 0,
  },
  {
    id:     'rating-stored-field-only',
    suite:  'item-rating',
    ...RATING, method: 'itemRating',
    was:    'reading system.rating alone — the shipped VCR [2] (rating 0) added nothing to a rigger, '
          + 'and a Medkit [6] read as no rating (reported in play)',
    impl:   item => Number(item?.system?.rating) || 0,
  },
  {
    id:     'rating-name-first',
    suite:  'item-rating',
    ...RATING, method: 'itemRating',
    was:    'the name read before the stored field (the old cyberware-dice order) — a GM\'s edit to '
          + 'the rating never counted',
    impl:   function (item) { return this.ratingFromName(item?.name) ?? (Number(item?.system?.rating) || 0); },
  },
  {
    id:     'rating-trailing-number',
    suite:  'item-rating',
    ...RATING, method: 'ratingFromName',
    was:    'healing\'s old fallback: any trailing number counted, so "Predator 2" was Rating 2',
    impl:   name => { const m = /\[(\d+)\]|\b(\d+)\s*$/.exec(String(name ?? '')); return m ? Number(m[1] ?? m[2]) : null; },
  },
  {
    id:     'rating-range-reads-low',
    suite:  'item-rating',
    ...RATING, method: 'ratingFromName',
    was:    'a range read as its low end — a contact\'s "Utilities at Rating 4-8" became Rating 4',
    impl:   name => { const s = String(name ?? ''); const m = /\[\s*(\d+)\s*\]/.exec(s) ?? /\brating\s*\[?\s*(\d+)/i.exec(s); return m ? Number(m[1]) : null; },
  },
  {
    id:     'gear-null-rating-reads-the-name',
    suite:  'item-rating',
    ...RATING, method: 'itemRating',
    was:    'null read as "look at the name" — the maintainer: "a column where nil means no rating"',
    impl:   function (item) { const s = Number(item?.system?.rating); return s > 0 ? s : (this.knownRating(item?.name) ?? 0); },
  },
  {
    id:     'gear-rating-column-ignored',
    suite:  'item-rating',
    ...RATING, method: 'knownRating',
    was:    'only the name was read, so a plain Medkit (SR3 p.304: rating 3) or a Basic Medkit read 0 '
          + '(reported 2026-09-14: "do we have reliable ratings for all gear? medkits for one")',
    impl:   function (name) { return this.ratingFromName(name); },
  },
  {
    id:     'healing-ignores-rapid-healing',
    suite:  'healing',
    ...HEAL, method: 'healingSituationDice',
    was:    'the healing flow ignored the `healing` situation, so Rapid Healing (SR3 p.170) added nothing',
    impl:   () => ({ dice: 0, labels: [] }),
  },
  {
    id:     'medkit-first-not-best',
    suite:  'healing',
    ...HEAL, method: 'findEquipment',
    was:    'the first matching item, not the best — a Medkit [3] before a Medkit [6] won',
    impl:   function (actors, kind) {
      const re = this.EQUIPMENT[kind];
      for (const a of actors.filter(Boolean)) for (const i of (a.items ?? [])) {
        if (!re.test(String(i.name ?? ''))) continue;
        if (kind === 'medkit' && i.flags?.The2ndChumming3e?.suppliesOut) continue;
        return { actorId: a.id, itemId: i.id, name: i.name, rating: Number(i.system?.rating) || 0 };
      }
      return null;
    },
  },
  {
    id:     'heal-own-patients-only',
    suite:  'healing',
    ...HEAL, method: 'patientsFor',
    was:    'the 0.5.1 patient list: only characters you own, so player A could not treat player B '
          + '(reported in play)',
    impl:   (user, actors) => actors.filter(a => (a.type === 'character' || a.type === 'npc') && (user.isGM || a.isOwner)),
  },
  {
    id:     'heal-medic-writes-locally',
    suite:  'healing',
    ...HEAL, method: 'applyToPatient',
    was:    'a medic writing another player\'s wounds from their own client, which has no permission to',
    impl:   async function (patient, op) { return this._applyOp(patient, op); },
  },
  {
    id:     'armor-second-layer-not-halved',
    suite:  'armor-layering',
    ...ACTOR, method: 'layeredArmor',
    was:    'adding the second layer in full. SR3 p.285: "one-half (round down) the rating of the '
          + 'next highest-rated piece" — Twitch is 7 ballistic, not 9',
    impl:   (pieces = [], q = null) => {
      const b = pieces.reduce((s, p) => s + (p.ballistic || 0), 0), i = pieces.reduce((s, p) => s + (p.impact || 0), 0);
      const over = q == null ? 0 : Math.max(0, Math.max(b, i) - q);
      return { ballistic: b, impact: i, sumBallistic: b, sumImpact: i, layered: pieces.filter(p => !p.accessory).length >= 2,
               combatPoolPenalty: Math.ceil(over / 2), quicknessTN: q == null ? 0 : Math.max(0, b - q), pieces: [] };
    },
  },
  {
    id:     'armor-helmet-layered',
    suite:  'armor-layering',
    ...ACTOR, method: 'isArmorAccessory',
    was:    'treating a helmet as a second layer (halved). p.285: its bonus "is added to other armor. '
          + 'This does not count as layering" — the coat-and-helmet case reported in play',
    impl:   () => false,
  },
  {
    id:     'armor-pool-rounds-down',
    suite:  'armor-layering',
    ...ACTOR, method: 'layeredArmor',
    was:    'rounding the Combat Pool loss DOWN. The text says "2 full points", but p.285\'s Twitch, '
          + '3 over, loses 2 dice — only rounding up gives that',
    impl:   (pieces = [], q = null) => {
      const body = pieces.filter(p => !p.accessory), acc = pieces.filter(p => p.accessory);
      const lay = k => { const r = body.map(p => p[k] || 0).sort((a, b) => b - a);
        return (r[0] ?? 0) + Math.floor((r[1] ?? 0) / 2) + acc.reduce((s, p) => s + (p[k] || 0), 0); };
      const b = pieces.reduce((s, p) => s + (p.ballistic || 0), 0), i = pieces.reduce((s, p) => s + (p.impact || 0), 0);
      const over = q == null ? 0 : Math.max(0, Math.max(b, i) - q);
      return { ballistic: lay('ballistic'), impact: lay('impact'), sumBallistic: b, sumImpact: i,
               layered: body.length >= 2, combatPoolPenalty: Math.floor(over / 2),
               quicknessTN: q == null || body.length < 2 ? 0 : Math.max(0, b - q), pieces: [] };
    },
  },
  {
    id:     'armor-one-slot-only',
    suite:  'armor-layering',
    ...ACTOR, method: 'wornArmorItems',
    was:    'the single equippedArmor slot — putting on a helmet took the coat off (TODO 112)',
    impl:   (actor) => [...(actor?.items ?? [])].filter(i => i?.type === 'armor' && i.id === actor?.system?.equippedArmor),
  },
  {
    id:     'stack-merge-duplicates',
    suite:  'armor-layering',
    ...ACTOR, method: 'planStackMove',
    was:    'ignoring an identical stack on the far side, so putting 10 stim patches back beside '
          + 'the stored 3 left two stacks of the same thing (TODO 113)',
    impl:   ({ have, moving } = {}) => {
      const h = Math.floor(Number(have) || 0), m = Math.min(h, Math.max(0, Math.floor(Number(moving) || 0)));
      if (m <= 0) return { moving: 0, sourceQty: h, flipSource: false, target: null, createQty: null };
      return m >= h ? { moving: m, sourceQty: h, flipSource: true, target: null, createQty: null }
                    : { moving: m, sourceQty: h - m, flipSource: false, target: null, createQty: m };
    },
  },
  {
    id:     'essence-zero-reads-as-low',
    suite:  'essence',
    ...ACTOR, method: 'essenceState',
    was:    'treating Essence 0 as merely LOW. SR3 p.55: "An Essence of 0 means you\'re dead" — '
          + 'the danger colour must start AT 0, not below it',
    impl:   v => { const n = Number(v); if (!Number.isFinite(n)) return 'ok';
                   return n < 0 ? 'dead' : n < 1 ? 'low' : 'ok'; },
  },
  {
    id:     'essence-one-reads-as-low',
    suite:  'essence',
    ...ACTOR, method: 'essenceState',
    was:    'warning at exactly 1. SR3 p.55 draws the line at "less than 1"',
    impl:   v => { const n = Number(v); if (!Number.isFinite(n)) return 'ok';
                   return n <= 0 ? 'dead' : n <= 1 ? 'low' : 'ok'; },
  },
  {
    id:     'grade-essence-rounds-down',
    suite:  'essence',
    ...ACTOR, method: 'gradedEssenceCost',
    was:    'rounding the graded Essence cost DOWN. M&M p.45: "Round all numbers up." '
          + 'Rounding down refunds Essence nobody paid for, and Essence is permanent',
    impl:   (cost, grade) => {
      const base = parseFloat(cost ?? 0);
      if (!Number.isFinite(base) || base <= 0) return 0;
      const t = { standard: 1, basic: 1, alpha: 0.8, alphaware: 0.8,
                  beta: 0.6, betaware: 0.6, delta: 0.5, deltaware: 0.5 };
      const m = t[String(grade ?? '').toLowerCase().replace(/\bused\b/g, '').trim()] ?? 1;
      return m === 1 ? parseFloat(base.toFixed(2)) : Math.max(0.01, Math.floor(base * m * 100) / 100);
    },
  },
  {
    id:     'grade-unknown-gets-a-discount',
    suite:  'essence',
    ...ACTOR, method: 'gradedEssenceCost',
    was:    "an unknown grade defaulting to alpha's 0.8 rather than full cost. Bioware's "
          + 'Cultured/Exotic and any GM typo land there, and Essence is PERMANENT, so an '
          + 'over-refund cannot be taken back',
    impl:   (cost, grade) => {
      const base = parseFloat(cost ?? 0);
      if (!Number.isFinite(base) || base <= 0) return 0;
      const t = { standard: 1, basic: 1, alpha: 0.8, alphaware: 0.8,
                  beta: 0.6, betaware: 0.6, delta: 0.5, deltaware: 0.5 };
      const m = t[String(grade ?? '').toLowerCase().replace(/\bused\b/g, '').trim()] ?? 0.8;
      return m === 1 ? parseFloat(base.toFixed(2)) : Math.max(0.01, Math.ceil(base * m * 100) / 100);
    },
  },
  {
    id:     'karma-skill-cost-rounds-up',
    suite:  'karma',
    ...ACTOR, method: 'karmaSkillCost',
    was:    'Math.ceil — the state the system shipped in. p.245 says "round fractions down", '
          + 'so every fractional cost was one karma too expensive; the book prints no '
          + 'fractional example, which is why it survived',
    impl:   (newRating, attrRating, isActive) => {
      const n = Number(newRating) || 0, a = Number(attrRating) || 0;
      const m = n <= a ? (isActive ? 1.5 : 1) : n <= 2 * a ? (isActive ? 2 : 1.5) : (isActive ? 2.5 : 2);
      return Math.ceil(n * m);
    },
  },
  {
    id:     'karma-spec-cost-rounds-up',
    suite:  'karma',
    ...ACTOR, method: 'karmaSpecCost',
    was:    'Math.ceil on specialisations — same p.245 clause, same shipped bug',
    impl:   (newRating, attrRating) => {
      const n = Number(newRating) || 0, a = Number(attrRating) || 0;
      return Math.ceil(n * (n <= a ? 0.5 : n <= 2 * a ? 1 : 1.5));
    },
  },
  {
    id:     'karma-attr-always-2x',
    suite:  'karma',
    ...ACTOR, method: 'karmaAttributeCost',
    was:    'always 2x the new rating — p.244 charges 3x above the Racial Modified Limit, '
          + 'so raising past the limit cost a third less than it should',
    impl:   (newRating) => (Number(newRating) || 0) * 2,
  },
  {
    id:     'karma-spec-cap-off-the-skill',
    suite:  'karma',
    ...ACTOR, method: 'karmaMaxSpecialisations',
    was:    'gated on the SKILL rating — p.245 caps specialisations at the LINKED ATTRIBUTE '
          + "rating. Brick's Stealth 5 / Quickness 6 is one apart, so the book's own example "
          + 'reads correctly under either rule',
    impl:   () => 5,
  },
  {
    id:     'karma-award-double-counts-the-twentieth',
    suite:  'karma',
    ...ACTOR, method: 'karmaAward',
    was:    'the full award going to Good Karma AND the pool points granted beside it — '
          + "p.244's Shetani has 62 total karma and 59 Good Karma, so the twentieth point "
          + 'goes to the Pool INSTEAD',
    impl:   (totalKarma, amount) => {
      const t = Math.max(0, Number(totalKarma) || 0), a = Math.max(0, Number(amount) || 0);
      const newTotal = t + a;
      return { newTotal, poolGained: Math.floor(newTotal / 20) - Math.floor(t / 20), goodKarma: a };
    },
  },
  {
    id:     'karma-pool-flat-twentieth-for-humans',
    suite:  'karma',
    ...ACTOR, method: 'karmaPoolDivisor',
    was:    'a flat 20 for every metatype — p.246 says "one-twentieth (one-tenth for humans)", '
          + "and the book's only worked example is an ELF, so nothing pinned to it can tell",
    impl:   () => 20,
  },
  {
    id:     'karma-pool-starts-at-zero',
    suite:  'karma',
    ...ACTOR, method: 'karmaPoolForTotal',
    was:    'floor(total / 20) with no starting point — p.244 says "each character starts '
          + 'with 1 Karma Pool", and the data model initialised to 0',
    impl:   (totalKarma) => Math.floor(Math.max(0, Number(totalKarma) || 0) / 20),
  },
  {
    id:     'karma-spec-capped-at-level-2',
    suite:  'karma',
    ...ACTOR, method: 'karmaSpecTargetRating',
    was:    'the sheet hard-capping a specialisation at level 2 — p.245 says "to improve the '
          + 'specialization beyond that, follow the rules above as normal"',
    impl:   (baseRating, currentLevel = 0) =>
      (Number(baseRating) || 0) + Math.min(1, Number(currentLevel) || 0) + 1,
  },
  {
    id:     'missile-parry-tie-catches',
    suite:  'adept-powers',
    ...ACTOR, method: 'missileParryOutcome',
    was:    '>= instead of > — SR3 p.170 says outright "Ties go to the attacker"',
    impl:   (parryHits, attackHits) => ({ caught: (parryHits ?? 0) >= (attackHits ?? 0) }),
  },
  {
    id:     'missile-parry-tn-from-the-erratum',
    suite:  'adept-powers',
    ...ACTOR, method: 'missileParryTN',
    was:    "the book's worked example, whose long-range base of 8 is the GRENADE table's "
          + 'column (p.119) and contradicts the Weapon Range Table (p.111) the rule cites',
    impl:   () => 2,
  },
  {
    id:     'missile-parry-carries-like-a-dodge',
    suite:  'adept-powers',
    ...ACTOR, method: 'missileParryOutcome',
    was:    "p.113's carry rule applied to a Reaction Test — that rule is specific to the "
          + 'DODGE Test, and Missile Parry (p.170) grants no partial credit',
    impl:   (parryHits, attackHits) => ({
      caught:  (parryHits ?? 0) > (attackHits ?? 0),
      carried: (parryHits ?? 0) > (attackHits ?? 0) ? 0 : (parryHits ?? 0),
    }),
  },
  {
    id:     'dodge-tie-goes-to-defender',
    suite:  'dodge-resolution',
    ...ACTOR, method: 'dodgeOutcome',
    was:    '>= instead of > — a tie wrongly counted as a clean miss (SR3 p.113)',
    impl:   (dodgeHits, attackHits) => ({
      cleanMiss: dodgeHits >= attackHits,
      carried:   dodgeHits >= attackHits ? 0 : dodgeHits,
    }),
  },
  {
    id:     'glitch-sr4-threshold',
    suite:  'rule-of-one',
    ...ACTOR, method: 'isRuleOfOne',
    was:    'ones > pool/2 — SR4\u2019s glitch rule, not SR3\u2019s all-ones Rule of One',
    impl:   (ones, pool) => ones > Math.floor(pool / 2),
  },
  {
    id:     'stage-power-past-deadly',
    suite:  'damage-codes',
    ...ITEM, method: 'stageDamage',
    was:    'staging Power past Deadly outside melee (SR3 p.113 discards the surplus)',
    // Melee rules applied unconditionally — the exact shape of the original bug.
    impl:   function (base, net, opts = {}) {
      return this.__origStageDamage(base, net, { ...opts, meleeRules: true });
    },
    needsOriginal: '__origStageDamage',
  },
  {
    id:     'short-burst-raises-level',
    suite:  'fire-modes',
    ...ITEM, method: 'fireModeDamage',
    was:    'a short burst treated as a weaker burst — +2 Power AND +1 level (SR3 p.115 says the level does NOT rise)',
    impl:   ({ power, level = 'M', mode, rounds = 0, isTracer = false, shortBurst = false }) => {
      const STAGES = ['L', 'M', 'S', 'D'];
      let lvlIdx = STAGES.indexOf(level); if (lvlIdx < 0) lvlIdx = 1;
      let pwr = Number(power) || 0;
      if (mode === 'BF') { pwr += shortBurst ? 2 : 3; lvlIdx = Math.min(3, lvlIdx + 1); }
      else if (mode === 'FA') {
        const rds = Math.max(0, Number(rounds) || 0);
        pwr += isTracer ? (rds - Math.floor(rds / 3)) : rds;
        lvlIdx = Math.min(3, lvlIdx + Math.floor(rds / 3));
      }
      return { power: pwr, level: STAGES[lvlIdx] };
    },
  },
  {
    id:     'one-round-burst-stays-a-burst',
    suite:  'fire-modes',
    ...ITEM, method: 'resolveBurst',
    was:    'a single remaining round resolved as a feeble BURST rather than a single shot (SR3 p.115)',
    impl:   (available) => {
      if (available === null || available === undefined) return { mode: 'BF', rounds: 3, shortBurst: false };
      const have = Math.max(0, Math.trunc(Number(available) || 0));
      if (have >= 3) return { mode: 'BF', rounds: 3, shortBurst: false };
      return { mode: 'BF', rounds: have, shortBurst: true };
    },
  },
  {
    id:     'phase-caps-never-warn',
    suite:  'fire-modes',
    ...ITEM, method: 'phaseFireWarning',
    was:    'no per-phase firing allowance at all — the state before TODO 51',
    impl:   () => null,
  },

  {
    id:     'multi-target-is-full-auto-only',
    suite:  'fire-modes',
    module: '../scripts/documents/SR3EItem.js',
    klass:  'SR3EItem',
    method: 'multiTargetTN',
    was:    "the +2 per additional target reached only full auto, because the dialog kept the "
          + "target ordinal inside its FA-only section — so SA's second shot and BF's second "
          + "burst were both free, and the GM window could not supply the row either",
    impl:   () => 0,
  },

  {
    id:     'walking-fire-waste-is-free',
    suite:  'fire-modes',
    module: '../scripts/documents/SR3EItem.js',
    klass:  'SR3EItem',
    method: 'roundsExpended',
    was:    'the phase cap and recoil were passed the burst size alone while the magazine was '
          + 'decremented by rounds+waste, so a walked round was invisible to the leg that '
          + 'spent it — three targets a metre apart fired 11 rounds against a cap of 10 '
          + 'with no warning',
    impl:   ({ rounds = 0 } = {}) => Math.max(0, Math.trunc(Number(rounds) || 0)),
  },

  {
    id:     'dodge-tn-is-always-four',
    suite:  'dodge-resolution',
    module: '../scripts/documents/SR3EActor.js',
    klass:  'SR3EActor',
    method: 'dodgeTN',
    was:    'the dodge TN was hardcoded 4 with no modifiers at all, so dodging a ten-round '
          + 'burst was exactly as easy as dodging one pistol shot and a Serious-wounded '
          + 'defender dodged as though unhurt',
    impl:   () => 4,
  },
  {
    id:     'dodge-wound-modifier-sign-flipped',
    suite:  'dodge-resolution',
    module: '../scripts/documents/SR3EActor.js',
    klass:  'SR3EActor',
    method: 'dodgeTN',
    was:    'system.woundMod is carried as a NEGATIVE penalty, so it must be subtracted; '
          + 'adding it instead makes wounded defenders HARDER to hit, which reads as '
          + 'perfectly reasonable code',
    impl:   ({ burstRounds = 0, shotgunSpread = 0, woundMod = 0 } = {}) => {
      const n = v => Math.max(0, Math.trunc(Number(v) || 0));
      return 4 + Math.floor(n(burstRounds) / 3) + n(shotgunSpread) + Math.min(0, Math.trunc(Number(woundMod) || 0));
    },
  },

  {
    id:     'melee-tie-deals-no-damage',
    suite:  'full-defense',
    module: '../scripts/documents/SR3EActor.js',
    klass:  'SR3EActor',
    method: 'meleeOutcome',
    was:    'a melee tie was announced as "no damage dealt", where p.122 step 3 says "a tie '
          + 'goes in favor of the attacker" - the attacker hits for base damage and the '
          + 'defender still resists',
    impl:   (a, d) => {
      const x = Math.max(0, Math.trunc(Number(a) || 0));
      const y = Math.max(0, Math.trunc(Number(d) || 0));
      return { winnerIsAtk: x > y, net: Math.abs(x - y), tie: x === y };
    },
  },
  {
    id:     'full-defense-dodge-adds-instead-of-subtracting',
    suite:  'full-defense',
    module: '../scripts/documents/SR3EActor.js',
    klass:  'SR3EActor',
    method: 'fullDefenseOutcome',
    was:    "Full Defense's second-stage dodge SUBTRACTS from the attacker's net before "
          + 'staging (p.124), unlike the ordinary Dodge Test whose successes are added to the '
          + 'Damage Resistance Test and never reduce staging (p.113) - reusing the ordinary '
          + 'rule here silently makes the posture worse than not adopting it',
    impl:   ({ attackHits = 0, skillHits = 0, dodgeHits = 0 } = {}) => {
      const n = v => Math.max(0, Math.trunc(Number(v) || 0));
      const a = n(attackHits), d = n(skillHits), g = n(dodgeHits);
      const blocked = d > a;
      const net = blocked ? 0 : a - d;
      return { blocked, net, cleanMiss: !blocked && g > net, remaining: blocked ? 0 : net,
               dealsDamage: false };
    },
  },
  {
    id:     'full-defense-block-on-a-tie',
    suite:  'full-defense',
    module: '../scripts/documents/SR3EActor.js',
    klass:  'SR3EActor',
    method: 'fullDefenseOutcome',
    was:    'the block test is strict - "if the defender has achieved MORE successes" - so a '
          + 'tie is not a block; relaxing it to >= hands the defender a free block on every '
          + 'level exchange',
    impl:   ({ attackHits = 0, skillHits = 0, dodgeHits = 0 } = {}) => {
      const n = v => Math.max(0, Math.trunc(Number(v) || 0));
      const a = n(attackHits), d = n(skillHits), g = n(dodgeHits);
      const blocked = d >= a;
      const net = blocked ? 0 : a - d;
      const cleanMiss = !blocked && g > net;
      return { blocked, net, cleanMiss,
               remaining: blocked || cleanMiss ? 0 : Math.max(0, net - g), dealsDamage: false };
    },
  },

  // NOTE: there is deliberately NO mutant for `sumMeleeModifiers`'s situational side.
  // This harness patches a STATIC ON A CLASS (`target[m.method] = m.impl`), and
  // `sumMeleeModifiers` is a plain module export — ESM bindings are read-only, so it cannot
  // be swapped from outside. The rule is instead pinned by ten assertions in
  // `melee-modifiers.test.mjs`, including the unknown-side fallback.
  //
  // Writing it anyway is what exposed a hole in the harness on 2026-08-20: `run.mjs`'s parent
  // collapsed the child's exit 2 into 1, so `mutate.mjs` never saw a harness error and
  // reported a mutant that had NEVER RUN as killed, with "0 assertions caught it" as the only
  // clue. Both ends are now guarded — see the comments in those two files.

  {
    id:     'deadly-knockdown-is-just-a-hard-test',
    suite:  'knockdown',
    module: '../scripts/documents/SR3EActor.js',
    klass:  'SR3EActor',
    method: 'knockdownOutcome',
    was:    'p.124 prints NA for Deadly, not 5 - "characters who take a Deadly wound are '
          + 'always knocked down". Treating it as a very hard threshold gives the same answer '
          + 'today and stops doing so the moment anything grants a bonus to the Body Test',
    impl:   ({ level, successes = 0, tested = true } = {}) => {
      const NEEDED = { L: 2, M: 3, S: 4, D: 5 };
      const lvl = String(level ?? '').toUpperCase();
      const needed = NEEDED[lvl] ?? null;
      if (needed === null || !tested) {
        return { needed, automatic: false, knockedDown: false, staggered: false, standing: true };
      }
      const hits = Math.max(0, Math.trunc(Number(successes) || 0));
      if (hits === 0)    return { needed, automatic: false, knockedDown: true,  staggered: false, standing: false };
      if (hits < needed) return { needed, automatic: false, knockedDown: false, staggered: true,  standing: true };
      return { needed, automatic: false, knockedDown: false, staggered: false, standing: true };
    },
  },
  {
    id:     'knockdown-zero-successes-only-staggers',
    suite:  'knockdown',
    module: '../scripts/documents/SR3EActor.js',
    klass:  'SR3EActor',
    method: 'knockdownOutcome',
    was:    'p.124 makes ZERO successes specifically the prone case - "if the character rolls '
          + 'no successes, he falls down" - so staggering needs successes > 0, not merely '
          + 'fewer than needed; folding them together means nobody ever hits the floor',
    impl:   ({ level, successes = 0, tested = true } = {}) => {
      const NEEDED = { L: 2, M: 3, S: 4 };
      const lvl = String(level ?? '').toUpperCase();
      if (lvl === 'D') {
        return { needed: null, automatic: true, knockedDown: true, staggered: false, standing: false };
      }
      const needed = NEEDED[lvl] ?? null;
      if (needed === null || !tested) {
        return { needed, automatic: false, knockedDown: false, staggered: false, standing: true };
      }
      const hits = Math.max(0, Math.trunc(Number(successes) || 0));
      if (hits < needed) return { needed, automatic: false, knockedDown: false, staggered: true, standing: true };
      return { needed, automatic: false, knockedDown: false, staggered: false, standing: true };
    },
  },
  {
    id:     'knockdown-gel-rounds-halve-like-everything-else',
    suite:  'knockdown',
    module: '../scripts/documents/SR3EActor.js',
    klass:  'SR3EActor',
    method: 'knockdownTN',
    was:    'gel rounds resist knockdown against the FULL Power, not half (p.116) - the round '
          + 'is easy to soak and hard to stay upright against, which is the whole point of it',
    impl:   ({ power = 0, strength = 0, isMelee = false } = {}) => {
      if (isMelee) return Math.max(2, Math.trunc(Number(strength) || 0));
      return Math.max(2, Math.floor(Math.max(0, Math.trunc(Number(power) || 0)) / 2));
    },
  },

  {
    id:     'category-bonus-splits-on-slash-too',
    suite:  'skill-category-bonus',
    module: '../scripts/documents/SR3EActor.js',
    klass:  'SR3EActor',
    method: 'parseSkillCategories',
    was:    'the field is split on COMMAS ONLY - "Build/Repair skills" contains a slash, so '
          + 'splitting on it as well tears that category in half and it silently matches '
          + 'nothing, with no error anywhere',
    impl:   raw => String(raw ?? '').split(/[,/]/).map(c => c.trim()).filter(Boolean),
  },
  {
    id:     'category-bonus-excludes-vehicle-skills',
    suite:  'skill-category-bonus',
    module: '../scripts/documents/SR3EActor.js',
    klass:  'SR3EActor',
    method: 'skillCategoryBonus',
    was:    'M&M p.66 covers FIVE categories - the Vehicle sentence is easy to miss, and TODO '
          + '10 did miss it. The bonus is OFFERED for Vehicle skills and the player judges '
          + 'whether the use was physical; dropping the category removes the choice entirely',
    impl:   (bonuses, category) => {
      const want = String(category ?? '').trim().toLowerCase();
      if (!want || want === 'vehicle skills') return { dice: 0, labels: [] };
      let dice = 0;
      const labels = [];
      for (const b of (Array.isArray(bonuses) ? bonuses : [])) {
        const n = Math.trunc(Number(b?.dice) || 0);
        if (n <= 0) continue;
        const cats = (Array.isArray(b?.categories) ? b.categories : [])
          .map(c => String(c ?? '').trim().toLowerCase());
        if (!cats.includes(want)) continue;
        dice += n;
        if (b.label) labels.push(b.label);
      }
      return { dice, labels };
    },
  },

  {
    id:     'martial-arts-are-knowledge-skills',
    suite:  'martial-arts',
    module: '../scripts/config.js',
    klass:  'SR3E',
    method: 'skillTypeForCategory',
    was:    'CC p.87: "Each of these new martial arts skills is considered a Combat skill and '
          + 'uses the standard rules for Active skills... including the use of Combat Pool." '
          + 'Filed as knowledge, Aikido shows in the wrong sheet section and is excluded from '
          + 'every category bonus keyed on Combat skills',
    impl:   category => {
      if (category === 'Language') return 'language';
      if (category === 'Martial Arts') return 'knowledge';
      const active = new Set(['Combat skills', 'Build/Repair skills', 'Magical skills',
        'Physical skills', 'Social skills', 'Technical skills', 'Vehicle skills', 'Martial Arts']);
      return active.has(category) ? 'active' : 'knowledge';
    },
  },
  {
    id:     'martial-arts-aliases-are-separate-skills',
    suite:  'martial-arts',
    module: '../scripts/config.js',
    klass:  'SR3E',
    method: 'resolveMartialArt',
    was:    'the parenthesised names in CC p.87 are the SAME skill under another name - Aikido '
          + '(Jujitsu, Sambo). Treating them as distinct lets a character take all three at '
          + 'full rating, which is three skills where the book has one',
    impl:   () => null,
  },

  {
    id:     'charging-failure-does-both-tests',
    suite:  'charging',
    module: '../scripts/documents/SR3EActor.js',
    klass:  'SR3EActor',
    method: 'chargingFailure',
    was:    'CC p.86 says the +2 to the Knockdown Test applies INSTEAD of the Quickness test. '
          + 'Returning both punishes one failure twice, and reads as the obvious "apply all '
          + 'consequences" implementation',
    impl:   ({ attackFailed = false, knockdownRequired = false } = {}) => {
      if (!attackFailed) return { quicknessTN: null, knockdownTNMod: 0 };
      return { quicknessTN: 5, knockdownTNMod: knockdownRequired ? 2 : 0 };
    },
  },
  {
    id:     'charging-bonus-is-a-target-number',
    suite:  'charging',
    module: '../scripts/documents/SR3EActor.js',
    klass:  'SR3EActor',
    method: 'chargingPowerBonus',
    was:    'the charge bonus is +1 POWER, not a TN change - nearly every other melee option '
          + 'moves a target number, and Power doubles as the Damage Resistance TN, so dropping '
          + 'it makes the charge do nothing at all',
    impl:   () => 0,
  },

  {
    id:     'martial-arts-not-a-combat-category',
    suite:  'skill-category-bonus',
    module: '../scripts/documents/SR3EActor.js',
    klass:  'SR3EActor',
    method: 'skillCategoryBonus',
    was:    'CC p.87 makes martial arts "considered a Combat skill", so a category bonus '
          + 'covering Combat skills must reach MA:Aikido. Matching the category string alone '
          + 'gave a martial artist Enhanced Articulation on Unarmed Combat and Edged Weapons '
          + 'but not on the skill they actually roll - reported from play',
    impl:   (bonuses, category) => {
      const want = String(category ?? '').trim().toLowerCase();
      if (!want) return { dice: 0, labels: [] };
      let dice = 0;
      const labels = [];
      for (const b of (Array.isArray(bonuses) ? bonuses : [])) {
        const n = Math.trunc(Number(b?.dice) || 0);
        if (n <= 0) continue;
        const cats = (Array.isArray(b?.categories) ? b.categories : [])
          .map(c => String(c ?? '').trim().toLowerCase());
        if (!cats.includes(want)) continue;
        dice += n;
        if (b.label) labels.push(b.label);
      }
      return { dice, labels };
    },
  },

  /* ══════════════════════════════════════════════════════════════════════════════
   *  The lookup tables
   * ══════════════════════════════════════════════════════════════════════════════ */

  {
    id:     'wound-modifier-thresholds-shifted',
    suite:  'tables',
    module: '../scripts/documents/SR3EActor.js',
    klass:  'SR3EActor',
    method: '_trackMod',
    was:    'the Condition Monitor puts Moderate at 3 boxes and Serious at 6 - the book states '
          + 'both in worked prose ("should have only three boxes of damage filled in", and '
          + 'Cybersushi filling 6 boxes for a Serious wound). Shifting either boundary by one '
          + 'changes the target number of EVERY roll a wounded character makes',
    impl:   (boxes) => (boxes >= 7 ? 3 : boxes >= 4 ? 2 : boxes >= 1 ? 1 : 0),
  },

  {
    id:     'crash-power-rounds-down',
    suite:  'tables',
    module: '../scripts/documents/SR3EActor.js',
    klass:  'SR3EActor',
    method: 'crashDamage',
    was:    'p.145 - "The Power of a crash is equal to the vehicle\'s speed divided by 10 and '
          + 'ROUNDED UP". Rounding down understates nine speeds in ten, and at low speed it '
          + 'drops the Power to 0, which would make the Damage Resistance Test automatic',
    impl:   (speed) => {
      const s = Math.max(0, Number(speed) || 0);
      return { power: Math.floor(s / 10),
               level: s >= 201 ? 'D' : s >= 61 ? 'S' : s >= 21 ? 'M' : 'L' };
    },
  },

  {
    id:     'crash-damage-levels-off-by-one',
    suite:  'tables',
    module: '../scripts/documents/SR3EActor.js',
    klass:  'SR3EActor',
    method: 'crashDamage',
    was:    'the IMPACT DAMAGE LEVELS TABLE (p.147) breaks at 21, 61 and 201 metres per turn. '
          + 'Reading the bands as 20/60/200 puts every boundary speed one level too low, and '
          + 'boundary speeds are exactly where a GM types a round number',
    impl:   (speed) => {
      const s = Math.max(0, Number(speed) || 0);
      return { power: Math.max(1, Math.ceil(s / 10)),
               level: s > 201 ? 'D' : s > 61 ? 'S' : s > 21 ? 'M' : 'L' };
    },
  },

  {
    id:     'flechette-doubles-the-higher-armour',
    suite:  'tables',
    module: '../scripts/documents/SR3EActor.js',
    klass:  'SR3EActor',
    method: 'flechetteArmor',
    was:    'p.116 - "use either DOUBLE ITS IMPACT ARMOR RATING or its NORMAL BALLISTIC ARMOR '
          + 'RATING, whichever is higher", i.e. max(impact*2, ballistic). This is the state '
          + 'the system actually shipped in: it doubled the HIGHER of the two, which against '
          + 'ballistic 8 / impact 2 gives 16 where the book gives 8 - exactly twice the '
          + 'armour, making flechette useless against precisely the armour it is meant to be '
          + 'merely poor against. The two readings agree whenever Impact is the higher, which '
          + 'is the common case for light armour and is why it survived',
    impl:   ({ ballistic = 0, impact = 0 } = {}) => Math.max(0, Math.max(ballistic, impact)) * 2,
  },

  {
    id:     'vehicle-damage-initiative-not-mirrored',
    suite:  'tables',
    module: '../scripts/documents/SR3EActor.js',
    klass:  'SR3EActor',
    method: 'vehicleDamageModifiers',
    was:    'the VEHICLE DAMAGE MODIFIERS TABLE (p.145) reads +1/-1, +2/-2, +3/-3 - the '
          + 'Initiative penalty mirrors the target-number modifier exactly, as it does for '
          + 'characters. The -layout PDF dump interleaves the two columns so the penalties '
          + 'appear one row low, which reads as Light having no Initiative penalty at all and '
          + 'a dangling -3 belonging to no row; that misreading is what this pins',
    impl:   (level) => {
      const L = String(level ?? '').trim().toUpperCase();
      switch (L) {
        case 'L': return { tn: 1, initiative:  0, speedReduction: 0    };
        case 'M': return { tn: 2, initiative: -1, speedReduction: 0.25 };
        case 'S': return { tn: 3, initiative: -2, speedReduction: 0.5  };
        default:  return { tn: 0, initiative:  0, speedReduction: 0    };
      }
    },
  },

  {
    id:     'vehicle-damage-uses-character-thresholds',
    suite:  'tables',
    module: '../scripts/documents/SR3EActor.js',
    klass:  'SR3EActor',
    method: 'vehicleDamageLevel',
    was:    'a vehicle track is Body x 2 boxes, so its damage bands are PROPORTIONAL to the '
          + 'track. Using the character Condition Monitor thresholds (1/3/6) means a Body 2 '
          + 'drone with a 4-box track needs 6 boxes to reach Serious and can never reach it, '
          + 'while a Body 8 lorry is Serious at 6 of 16',
    impl:   (boxes, _max) => {
      const b = Math.max(0, Math.trunc(Number(boxes) || 0));
      if (b <= 0) return null;
      if (b >= 10) return 'D';
      if (b >= 6)  return 'S';
      if (b >= 3)  return 'M';
      return 'L';
    },
  },

  /* ══════════════════════════════════════════════════════════════════════════════
   *  Adept powers — TODO 60, 63, 64
   * ══════════════════════════════════════════════════════════════════════════════ */

  {
    id:     'improved-ability-uncapped',
    suite:  'adept-powers',
    module: '../scripts/documents/SR3EActor.js',
    klass:  'SR3EActor',
    method: 'improvedAbilityDice',
    was:    'p.169 caps the dice at the LOWER of the base skill rating and Magic - "an adept '
          + 'with Pistols 4 and Magic 5 cannot have more than 4 Improved Ability (Pistols) '
          + 'dice". This is the state the system actually shipped in: the power level was '
          + 'applied with no clamp at all, so a level above the skill rating rolled dice the '
          + 'rules forbid, and it was the ONE adept defect already reaching the table',
    impl:   ({ level = 0 } = {}) => Math.max(0, level),
  },

  {
    id:     'improved-ability-caps-on-the-larger',
    suite:  'adept-powers',
    module: '../scripts/documents/SR3EActor.js',
    klass:  'SR3EActor',
    method: 'improvedAbilityDice',
    was:    'the cap is "whichever is LESS" of skill rating and Magic. Taking the larger of '
          + 'the two passes the book\'s own Pistols 4 / Magic 5 example by accident whenever '
          + 'the level is small, and only diverges once a character invests',
    impl:   ({ level = 0, skillRating = 0, magic = 0 } = {}) =>
      Math.max(0, Math.min(level, Math.max(skillRating, magic))),
  },

  {
    id:     'improved-reflexes-stacks-with-cyber',
    suite:  'adept-powers',
    module: '../scripts/documents/SR3EActor.js',
    klass:  'SR3EActor',
    method: 'reflexBonus',
    was:    'p.169 - "the increase cannot be combined with technological or other magical '
          + 'increases to Reaction or Initiative". Summing is what the system did before '
          + 'TODO 64, and it was invisible only because no adept power carried any data yet; '
          + 'filling the packs would have made it live on the next world load',
    impl:   ({ adeptRea = 0, adeptInit = 0, cyberRea = 0, cyberInit = 0 } = {}) => ({
      rea: adeptRea + cyberRea, initDice: adeptInit + cyberInit,
      conflict: false, source: 'both', dropped: null,
    }),
  },

  {
    id:     'reflex-conflict-resolved-on-reaction-first',
    suite:  'adept-powers',
    module: '../scripts/documents/SR3EActor.js',
    klass:  'SR3EActor',
    method: 'reflexBonus',
    was:    'an Initiative die is worth far more than a point of Reaction across a Combat '
          + 'Turn, so the better package is chosen on DICE first. Comparing Reaction first '
          + 'picks wrong exactly when the two packages are close - +6/+1 wired would beat '
          + 'Improved Reflexes +2/+3',
    impl:   ({ adeptRea = 0, adeptInit = 0, cyberRea = 0, cyberInit = 0 } = {}) => {
      const adept = { rea: adeptRea, initDice: adeptInit };
      const cyber = { rea: cyberRea, initDice: cyberInit };
      const adeptHas = adept.rea !== 0 || adept.initDice !== 0;
      const cyberHas = cyber.rea !== 0 || cyber.initDice !== 0;
      if (!adeptHas) return { ...cyber, conflict: false, source: cyberHas ? 'cyber' : 'none', dropped: null };
      if (!cyberHas) return { ...adept, conflict: false, source: 'adept', dropped: null };
      const adeptWins = adept.rea > cyber.rea
        || (adept.rea === cyber.rea && adept.initDice >= cyber.initDice);
      return adeptWins
        ? { ...adept, conflict: true, source: 'adept', dropped: cyber }
        : { ...cyber, conflict: true, source: 'cyber', dropped: adept };
    },
  },

  {
    id:     'attribute-boost-tn-rounds-down',
    suite:  'adept-powers',
    module: '../scripts/documents/SR3EActor.js',
    klass:  'SR3EActor',
    method: 'attributeBoostTN',
    was:    'p.168 - "a target number equal to one half the base (unaugmented) rating of the '
          + 'Attribute being boosted (ROUND UP)". Rounding down makes every odd-rated '
          + 'attribute a full point easier to boost, and odd ratings are the common case',
    impl:   (baseRating) => Math.max(2, Math.floor((baseRating ?? 0) / 2)),
  },

  {
    id:     'attribute-boost-drain-band-is-exclusive',
    suite:  'adept-powers',
    module: '../scripts/documents/SR3EActor.js',
    klass:  'SR3EActor',
    method: 'attributeBoostDrainLevel',
    was:    'the Attribute Boost Drain Table reads "LESS THAN OR EQUAL TO Racial Modified '
          + 'Limit" and "UP TO Racial Attribute Maximum" - both bands include their boundary. '
          + 'Making them exclusive pushes a boost that lands exactly on the limit up a whole '
          + 'Drain Level, and landing on the limit is the ordinary case',
    impl:   ({ boosted = 0, limit = 6 } = {}) => {
      if (boosted < limit) return 'L';
      if (boosted < Math.round(limit * 1.5)) return 'M';
      return 'S';
    },
  },

  {
    id:     'racial-max-rounds-down',
    suite:  'adept-powers',
    module: '../scripts/documents/SR3EActor.js',
    klass:  'SR3EActor',
    method: 'racialMax',
    was:    'p.244 - the Attribute Maximum is the Racial Modified Limit times 1.5, and the '
          + 'printed table shows 7 -> 11, 9 -> 14, 11 -> 17, 5 -> 8. Flooring gives '
          + '10/13/16/7 and is wrong for four of the twenty non-human cells, always in the '
          + 'direction that makes Drain harsher',
    impl:   (limit) => Math.floor((limit ?? 6) * 1.5),
  },

  {
    id:     'pain-resistance-reduces-the-track',
    suite:  'adept-powers',
    module: '../scripts/documents/SR3EActor.js',
    klass:  'SR3EActor',
    method: 'painAdjustedBoxes',
    was:    'p.170 - "It does not reduce actual damage, only its effect on you". The level '
          + 'comes off the damage used for the injury-modifier LOOKUP, and clamps at zero. '
          + 'Letting it go negative would start crediting an undamaged adept with negative '
          + 'boxes, which reads as a bonus everywhere the number is summed',
    impl:   (boxes, painResistance = 0) =>
      (Math.trunc(Number(boxes) || 0)) - Math.max(0, Math.trunc(Number(painResistance) || 0)),
  },

  {
    id:     'killing-hands-stages-instead-of-replacing',
    suite:  'adept-powers',
    module: '../scripts/documents/SR3EItem.js',
    klass:  'SR3EItem',
    method: 'killingHandsDamage',
    was:    'p.170 - the purchased level REPLACES the base, it does not stage it. Killing '
          + 'Hands (Light) on a (STR)M punch is (STR)L: worse in level, better in kind. '
          + 'Staging would make the cheapest .5-point tier a straight upgrade over a normal '
          + 'punch instead of a trade',
    impl:   (baseCode, level) => {
      const STAGES = ['L', 'M', 'S', 'D'];
      const lvl = String(level ?? '').toUpperCase();
      if (!'LMSD'.includes(lvl) || !lvl) return baseCode;
      const parsed = /^\s*([^\s]+?)([LMSD])\b/.exec(String(baseCode ?? ''));
      if (!parsed) return baseCode;
      const i = STAGES.indexOf(parsed[2]);
      return `${parsed[1]}${STAGES[Math.min(3, i + 1)]}`;
    },
  },

  {
    id:     'situational-bonuses-ignore-their-situation',
    suite:  'adept-powers',
    module: '../scripts/documents/SR3EActor.js',
    klass:  'SR3EActor',
    method: 'situationalBonus',
    was:    'the entire point of the third channel is that a bonus is SCOPED - Counterstrike '
          + 'is "counterattacks only" (MITS p.149) and Sixth Sense "does not apply to any '
          + 'other type of Reaction Test" (p.151). Summing every bonus regardless of '
          + 'situation is what skillBonusDice already does, and is why it could not carry '
          + 'these powers',
    impl:   (bonuses, _situation) => {
      const out = { dice: 0, tn: 0, pool: 0, labels: [] };
      for (const b of (Array.isArray(bonuses) ? bonuses : [])) {
        out.dice += Math.trunc(Number(b?.dice) || 0);
        out.tn   += Math.trunc(Number(b?.tn)   || 0);
        out.pool += Math.trunc(Number(b?.pool) || 0);
        if (b?.label) out.labels.push(b.label);
      }
      return out;
    },
  },

  {
    id:     'enhanced-articulation-reaches-rigging',
    suite:  'adept-powers',
    module: '../scripts/documents/SR3EActor.js',
    klass:  'SR3EActor',
    method: 'reflexBonus',
    was:    'M&M p.66 excludes Enhanced Articulation\'s +1 Reaction from rigging and decking, '
          + 'and derived.reactionNoRigDeck subtracts it ONLY when the cyber package actually '
          + 'landed. reflexBonus (p.169) picks one package or the other, so reporting the '
          + 'adept win as a cyber one makes the subtraction fire against a bonus nobody '
          + 'received - the character loses a point of Reaction they were never given',
    impl:   ({ adeptRea = 0, adeptInit = 0, cyberRea = 0, cyberInit = 0 } = {}) => {
      const adept = { rea: adeptRea, initDice: adeptInit };
      const cyber = { rea: cyberRea, initDice: cyberInit };
      const adeptHas = adept.rea !== 0 || adept.initDice !== 0;
      const cyberHas = cyber.rea !== 0 || cyber.initDice !== 0;
      if (!adeptHas) return { ...cyber, conflict: false, source: cyberHas ? 'cyber' : 'none', dropped: null };
      if (!cyberHas) return { ...adept, conflict: false, source: 'cyber', dropped: null };
      const adeptWins = adept.initDice > cyber.initDice
        || (adept.initDice === cyber.initDice && adept.rea >= cyber.rea);
      return adeptWins
        ? { ...adept, conflict: true, source: 'cyber', dropped: cyber }
        : { ...cyber, conflict: true, source: 'cyber', dropped: adept };
    },
  },

  {
    id:     'pain-editor-zeroes-all-wound-modifiers',
    suite:  'adept-powers',
    module: '../scripts/documents/SR3EActor.js',
    klass:  'SR3EActor',
    method: 'painAdjustedBoxes',
    was:    'M&M p.71 - the Pain Editor ignores penalties from STUN damage only; "Penalties '
          + 'from Physical damage are applied, but without the player\'s knowledge". The '
          + 'derivation recomputes the modifier from the PHYSICAL track rather than zeroing '
          + 'it, and painAdjustedBoxes is what that recomputation runs through. Making it '
          + 'return 0 for everything turns the editor into total immunity, and does the same '
          + 'to Pain Resistance',
    impl:   () => 0,
  },

  {
    id:     'melee-reach-ignores-troll',
    suite:  'racial',
    ...ACTOR, method: 'meleeReach',
    was:    'SR3 p.121 - "Trolls have a natural Reach of 1 that is cumulative with weapon Reach". '
          + 'Melee read weapon Reach alone until 2026-09-12, so a troll with a club fought at 1',
    impl:   (weapon) => {
      const w = Math.trunc(Number(weapon?.system?.reach) || 0);
      return { total: w, weapon: w, natural: 0 };
    },
  },

  {
    id:     'flechette-ignores-dermal-armor',
    suite:  'racial',
    ...ACTOR, method: 'flechetteRaisesLevel',
    was:    'SR3 p.116 - "Dermal armor negates the Damage Level increase of flechette '
          + 'ammunition". Every unarmoured target took the increase until 2026-09-12',
    impl:   ({ ballistic = 0, impact = 0 } = {}) => Math.max(ballistic, impact) <= 0,
  },

  {
    id:     'flechette-dermal-troll-only',
    suite:  'racial',
    ...ACTOR, method: 'dermalArmorSources',
    was:    'SR3 p.116 / M&M p.133 - dermal armor is "plating or sheath", not only a troll\'s '
          + 'hide. Dermal Plating and Dermal Sheath were not recognised until 2026-09-12 (TODO 75)',
    impl:   (actor) => (String(actor?.system?.metatype ?? '').trim().toLowerCase() === 'troll'
      ? ['troll dermal armor'] : []),
  },

  {
    id:     'implant-armor-ignored',
    suite:  'implant-armor',
    ...ACTOR, method: 'implantArmor',
    was:    'SR3 p.300 / M&M p.27-28, p.68 - implant armour is "cumulative with worn armor". '
          + 'The IMP/BAL codes had no field and the soak card read worn armour alone until '
          + '2026-09-12 (TODO 75)',
    impl:   () => ({ impact: 0, ballistic: 0, sources: [] }),
  },

  {
    id:     'implant-armor-zero-means-unset',
    suite:  'implant-armor',
    ...ACTOR, method: 'implantArmor',
    was:    'treating a GM override of 0 as "unset" - the fill-blanks trap the nullable field '
          + 'exists to avoid (the essence.lost pattern)',
    impl:   (items) => {
      const out = { impact: 0, ballistic: 0, sources: [] };
      for (const i of (items ?? [])) {
        if (i?.type !== 'cyberware' && i?.type !== 'bioware') continue;
        const m = String(i.system?.mods ?? '');
        const imp = i.system?.bonusImpact || Number(/([+-]?\d+)IMP/.exec(m)?.[1] ?? 0);
        const bal = i.system?.bonusBallistic || Number(/([+-]?\d+)BAL/.exec(m)?.[1] ?? 0);
        if (!imp && !bal) continue;
        out.impact += imp; out.ballistic += bal;
        out.sources.push({ name: i.name, impact: imp, ballistic: bal });
      }
      return out;
    },
  },

  {
    id:     'collision-ignores-belt-and-armour',
    suite:  'gm-tools',
    ...ACTOR, method: 'collisionPassengerDamage',
    was:    'SR3 p.147 - a seat belt stages collision damage down a level and "only impact '
          + 'armor protects against crash damage". Occupants rolled Body against the full Power '
          + 'at the vehicle\'s level with neither, until 2026-09-13 (TODO 74)',
    impl:   ({ power = 0, level = 'L' } = {}) => ({ power, level, tn: Math.max(2, power) }),
  },

  {
    id:     'gm-window-skips-gm-attacking-pc',
    suite:  'attack-negotiate',
    module: '../scripts/SR3EQuery.js', klass: 'SR3EQuery', method: 'gmWindowOpens',
    was:    '"player" mode skipped the GM\'s TN window whenever a GM asked, so the GM attacking '
          + 'a player got no breakdown of the difficulty - reported in play (TODO 94)',
    impl:   (mode, { requesterIsGM = false } = {}) =>
      mode === 'always' || (mode === 'player' && !requesterIsGM),
  },

  {
    id:     'essence-grades-the-graded-cost',
    suite:  'essence',
    ...ACTOR, method: 'baseEssenceCost',
    was:    'M&M p.45 grades the BASE Essence cost once. The total graded whatever sat in '
          + 'essenceCost, which the item sheet and the importer fill with the already-graded '
          + 'figure, so alphaware was discounted twice (TODO 101, found in play)',
    impl:   (item) => item?.system?.essenceCost ?? 0,
  },

  {
    id:     'drain-reads-base-magic',
    suite:  'magic-attribute',
    ...ACTOR, method: 'magicAttribute',
    was:    'SR3 p.183 — Physical Drain when Force exceeds the caster\'s Magic ATTRIBUTE, which '
          + 'Essence loss lowers. Dispelling, banishing and conjuring read magic.base, so one caster '
          + 'at one Force took Physical Drain in one flow and Stun in another (F5)',
    impl:   (attr) => attr?.magic?.base ?? 0,
  },
  {
    id:     'spell-pool-recount-reads-base',
    suite:  'magic-attribute',
    ...ACTOR, method: 'spellPoolFor',
    was:    'spendSpellPool and rollDispel recounted Spell Pool from base INT/WIL/Magic, so a caster '
          + 'whose Magic had dropped could spend dice the sheet did not show (F5)',
    impl:   (attr) => (attr?.magic?.base ?? 0) > 0
      ? Math.floor(((attr.intelligence?.base ?? 0) + (attr.willpower?.base ?? 0) + attr.magic.base) / 3) : null,
  },

  {
    id:     'astral-casting-drain-stays-stun',
    suite:  'magic-attribute',
    ...ACTOR, method: 'drainIsPhysical',
    was:    'SR3 p.183 — "All spells cast while astrally projecting cause physical damage, regardless '
          + 'of Force." Casting only compared Force with Magic, so an astral mage took Stun Drain',
    impl:   (force, attr) => (Number(force) || 0) > (attr?.magic?.value ?? attr?.magic?.base ?? 0),
  },
  {
    id:     'drain-resisted-with-base-willpower',
    suite:  'magic-attribute',
    ...ACTOR, method: 'drainResistRating',
    was:    'the Drain card read base Willpower first, so a Pain Editor\'s or Adrenal Pump\'s +1 '
          + 'Willpower never reached the Drain Resistance Test (SR3 p.183)',
    impl:   (attr, key = 'willpower') => attr?.[key]?.base ?? attr?.[key]?.value ?? 1,
  },
  {
    id:     'sustaining-charges-focus-held-spells',
    suite:  'sustained-spells',
    ...ACTOR, method: 'sustainingTN',
    was:    'SR3 p.178 — the +2 is for spells the character concentrates on; one held by a sustaining '
          + 'focus costs nothing. Counting every entry charges a mage for their focus',
    impl:   actor => 2 * (actor?.system?.sustainedSpells ?? []).length,
  },
  {
    id:     'dodge-ignores-sustained-spells',
    suite:  'sustained-spells',
    ...ACTOR, method: 'dodgeTN',
    was:    'SR3 p.178 — "+2 target modifier per sustained spell applied to all tests"; the Dodge Test '
          + 'rolls through _rollWave, which never adds it, so the dodge prompt must',
    impl:   ({ burstRounds = 0, shotgunSpread = 0, woundMod = 0 } = {}) => {
      const n = v => Math.max(0, Math.trunc(Number(v) || 0));
      return 4 + Math.floor(n(burstRounds) / 3) + n(shotgunSpread) - Math.min(0, Math.trunc(Number(woundMod) || 0));
    },
  },
  {
    id:     'cybercombat-attack-ignores-wounds',
    suite:  'wound-modifiers',
    ...ACTOR, method: '_buildCCParticipant', needsOriginal: '_buildCCParticipantReal',
    was:    'SR3 p.125 — the Injury Modifier applies to nearly all tests except resisting or avoiding '
          + 'damage. The cybercombat card rolls through _rollWave and never added it to the attack',
    impl:   async function (actor) { return this._buildCCParticipantReal(actor, { attacking: false }); },
  },
  {
    id:     'grenade-throw-ignores-wounds',
    suite:  'aoe-throw-tn',
    ...ITEM, method: 'throwPreTN',
    was:    'SR3 p.126 — wound modifiers apply to every test. The grenade dialog built its TN from 4 + '
          + 'range while the throw skipped rollPool\'s wound modifier, so wounds never reached a throw',
    impl:   ({ armorQTN = 0 } = {}) => ({ mod: Math.max(0, Number(armorQTN) || 0), parts: [] }),
  },
  {
    id:     'next-step-before-the-explosions',
    suite:  'interactive-explosions',
    ...ACTOR, method: 'rollThen',
    was:    'SR3 p.38 — above TN 6 a 6 is rolled again. MIJI, banishing and the rest rolled those waves '
          + 'in a silent loop and went straight on to the next dialog (2026-09-14)',
    impl:   async function (actor, pool, tn, { followUp }) {
      let dice = actor._rollWave(pool, tn, true);
      for (let g = 0; g < 50; g++) {
        const idx = dice.flatMap((d, i) => d.needsExplosion ? [i] : []);
        if (!idx.length) break;
        dice = actor._rollWave(pool, tn, false, dice, idx) ?? dice.map(d => ({ ...d, needsExplosion: false }));
      }
      return this.runFollowUp(followUp, dice);
    },
  },
  {
    id:     'opposed-resolves-before-both-explode',
    suite:  'opposed-explosions',
    ...ACTOR, method: 'settleOpposed',
    was:    'SR3 p.38 — above TN 6 a 6 is rolled again. The opposed result was posted off the first '
          + 'wave, so the winner was decided before anyone rolled their explosions (F4)',
    impl:   (record, side, dice) => {
      const r = JSON.parse(JSON.stringify(record));
      if (r.resolved) return { record: r, complete: false, changed: false };
      if (side) r[side] = { dice, done: true };
      r.resolved = true;
      return { record: r, complete: true, changed: true };
    },
  },
  {
    id:     'melee-ignores-wounds',
    suite:  'melee-wounds',
    ...ACTOR, method: 'woundTN',
    was:    'SR3 p.123 — "Character is wounded" is a Melee Modifiers Table row. Both boxing cards '
          + 'roll through _rollWave, which never adds woundMod, so a Serious wound swung at TN 4 (F3)',
    impl:   () => 0,
  },

  {
    id:     'dwarf-toxin-resistance-missing',
    suite:  'racial',
    ...ACTOR, method: 'racialSituational',
    was:    'SR3 p.56 - a dwarf\'s "Resistance (+2 Body) to any disease or toxin". Not '
          + 'modelled at all until 2026-09-12 (TODO 98)',
    impl:   () => [],
  },
];
