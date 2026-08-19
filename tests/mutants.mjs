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
];
