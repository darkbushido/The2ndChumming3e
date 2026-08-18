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

export const MUTANTS = [
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
];
