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

const SHOCKSTUN = { module: '../scripts/data/shock-stun.mjs', klass: 'ShockStun' };
const EXTRADMG = { module: '../scripts/data/extra-damage.mjs', klass: 'ExtraDamage' };
const INTEGRALRC = { module: '../scripts/data/integral-rc.mjs', klass: 'IntegralRC' };
const SHOTGUN = { module: '../scripts/data/shotgun.mjs', klass: 'Shotgun' };
const MODFIX = { module: '../scripts/data/mod-book-fixes.mjs', klass: 'ModBookFixes' };
const FAMILIES = { module: '../scripts/data/rated-families.mjs', klass: 'RatedFamilies' };
const MODFOR = { module: '../scripts/data/mod-for.mjs', klass: 'ModFor' };
const MODRATE = { module: '../scripts/data/mod-ratings.mjs', klass: 'ModRatings' };
const PACKFIX = { module: '../scripts/data/pack-corrections-0-7-0.mjs', klass: 'PackFixes070' };
const ACTOR = { module: '../scripts/documents/SR3EActor.js', klass: 'SR3EActor' };
const ITEM  = { module: '../scripts/documents/SR3EItem.js',  klass: 'SR3EItem'  };
const VARM  = { module: '../scripts/data/vehicle-armor.mjs', klass: 'VehicleArmor' };
const STALL = { module: '../scripts/data/stall-speed.mjs', klass: 'StallSpeed' };
const MIJI  = { module: '../scripts/SR3EMIJI.js',            klass: 'SR3EMIJI'  };
const HEAL  = { module: '../scripts/SR3EHealing.js',         klass: 'SR3EHealing' };
const RATING = { module: '../scripts/data/item-rating.mjs',  klass: 'ItemRating' };
const AMMO   = { module: '../scripts/data/ammo-stock.mjs',   klass: 'AmmoStock' };
const BOOKPAGE = { module: '../scripts/data/book-page.mjs',  klass: 'BookPage' };
const BLASTBATCH = { module: '../scripts/data/blast-batch.mjs', klass: 'BlastBatch' };
const ACCESSORIES = { module: '../scripts/data/weapon-accessories.mjs', klass: 'WeaponAccessories' };
const SLOTS  = { module: '../scripts/data/cyber-slots.mjs',  klass: 'CyberSlots' };
const LEDGER = { module: '../scripts/data/ledger.mjs',       klass: 'Ledger' };
const BUY    = { module: '../scripts/data/purchasing.mjs', klass: 'Purchasing' };
const RIG    = { module: '../scripts/data/rigging.mjs',    klass: 'Rigging' };
const PORDER = { module: '../scripts/data/patient-order.mjs', klass: 'PatientOrder' };
const MACROREF = { module: '../scripts/data/macro-refresh.mjs', klass: 'MacroRefresh' };
const GSEARCH = { module: '../scripts/data/gear-search.mjs', klass: 'GearSearch' };
const READY  = { module: '../scripts/data/ready-weapon.mjs', klass: 'ReadyWeapon' };
const SKILLRULES = { module: '../scripts/data/skill-rules.mjs', klass: 'SkillRules' };
const KARMA  = { module: '../scripts/data/karma-uses.mjs', klass: 'KarmaPool' };
const GOODKARMA = { module: '../scripts/data/karma-uses.mjs', klass: 'GoodKarma' };
const CPOOL = { module: '../scripts/data/combat-pool.mjs', klass: 'CombatPool' };
const FUNDS = { module: '../scripts/data/funds.mjs', klass: 'Funds' };
const GMONLY = { module: '../scripts/data/gm-only-fields.mjs', klass: 'GmOnlyFields' };
const SPELLLIMITS = { module: '../scripts/data/spell-limits.mjs', klass: 'SpellLimits' };
const AREAEFFECT = { module: '../scripts/data/area-effect.mjs', klass: 'AreaEffect' };
const AREASHAPE = { module: '../scripts/data/area-shape.mjs', klass: 'AreaShape' };
const SPELLTN = { module: '../scripts/data/spell-target.mjs', klass: 'SpellTarget' };
const FLING = { module: '../scripts/data/fling.mjs', klass: 'Fling' };
const MPRONE = { module: '../scripts/data/melee-prone.mjs', klass: 'MeleeProne' };
const WILLING = { module: '../scripts/data/willing-target.mjs', klass: 'WillingTarget' };

const RANGEB = { module: '../scripts/data/range-bands.mjs', klass: 'RangeBands' };
const APDSM = { module: '../scripts/data/apds.mjs', klass: 'Apds' };
const MAGICLOSS = { module: '../scripts/data/magic-loss.mjs', klass: 'MagicLoss' };
const ADEPTLEVELS = { module: '../scripts/data/adept-levels.mjs', klass: 'AdeptLevels' };
const INITASTRAL = { module: '../scripts/data/initiate-astral.mjs', klass: 'InitiateAstral' };
const MISFIRE = { module: '../scripts/data/misfire.mjs', klass: 'Misfire' };
const COLLISIONS = { module: '../scripts/data/collisions.mjs', klass: 'Collisions' };
const CONCEAL = { module: '../scripts/data/concealment.mjs', klass: 'Concealment' };

export const MUTANTS = [
  {
    id:     'wound-assigned-twice',
    suite:  'open-steps',
    module: '../scripts/data/open-steps.mjs', klass: 'OpenSteps', method: 'runOnce',
    was:    'the Assign-the-wound button applied its boxes on every click from any copy of the card — the chat pop-up, then the chat log, wounded the character twice (TODO 137)',
    impl:   async (acted, key, entry, act) => ({ ...(await act()), acted: { ...(acted ?? {}), [key]: entry } }),
  },
  {
    id:     'implant-is-no-weapon',
    suite:  'cyber-weapons',
    module: '../scripts/data/cyber-weapons.mjs', klass: 'CyberWeapons', method: 'weaponData',
    was:    'an implanted weapon (spur, hand razors, cybergun) gave Essence loss and nothing to attack with (TODO 151)',
    impl:   () => null,
  },
  {
    id:     'limb-weapon-is-no-weapon',
    suite:  'cyber-weapons',
    module: '../scripts/data/cyber-weapons.mjs', klass: 'CyberWeapons', method: 'isCyberweapon',
    was:    'a spur, blade or cybergun built into a cyberlimb (category Cyberlimb Mods) installed with no attack, because only the Cyberweapons category was read (TODO 255)',
    impl:   item => item?.type === 'cyberware' && item?.system?.cyberwareCategory === 'Cyberweapons',
  },
  {
    id:     'cybergun-as-melee',
    suite:  'cyber-weapons',
    module: '../scripts/data/cyber-weapons.mjs', klass: 'CyberWeapons', method: 'gunCode',
    was:    'a cybergun would be built as a melee weapon if its gun code were not read (TODO 151)',
    impl:   () => null,
  },
  {
    id:     'rigger-dumpshock-as-decker',
    suite:  'rigger-shock',
    module: '../scripts/data/rigger-shock.mjs', klass: 'RiggerShock', method: 'dumpShock',
    was:    'a rigger\'s dump shock was a decker\'s — a host\'s System Rating, Body to resist, the track by user mode — not (RC deck + 4)S or 5S Stun with Willpower (SR3 p.156, TODO 198)',
    impl:   () => ({ power: 6, level: 'S', isStun: true, resistAttr: 'body', page: 'SR3 p.156' }),
  },
  {
    id:     'rigger-disorient-no-round-up',
    suite:  'rigger-shock',
    module: '../scripts/data/rigger-shock.mjs', klass: 'RiggerShock', method: 'disorientation',
    was:    'disorientation rounded down — "Divide the number of successes into 30 (round up)" (SR3 p.156, TODO 198)',
    impl:   (s) => { const n = Math.max(1, s | 0); const seconds = Math.floor(30 / n); return { seconds, turns: Math.floor(seconds / 3) }; },
  },
  {
    id:     'rigger-feedback-never',
    suite:  'rigger-shock',
    module: '../scripts/data/rigger-shock.mjs', klass: 'RiggerShock', method: 'feedbackStage',
    was:    'no code path checked a VCR-rigged vehicle\'s damage against its rigger — no 6M/6S Willpower card at Serious or Destroyed (SR3 p.145, TODO 199)',
    impl:   () => null,
  },
  {
    id:     'open-steps-fold-on-finish',
    suite:  'open-steps',
    module: '../scripts/data/open-steps.mjs', klass: 'OpenSteps', method: 'shouldFold',
    was:    'a card folded the moment its last step was taken — a self-clicking dodge declaration folded the attack card before anyone read it (TODO 147, caught by e2e)',
    impl:   (steps = []) => steps.length > 0 && steps.every(s => s.done),
  },
  {
    id:     'fallen-wall-costs-nothing',
    suite:  'blast',
    module: '../scripts/data/blast.mjs', klass: 'Blast', method: 'pastBarrier',
    was:    'a blast through a fallen wall kept its full Power; SR3 p.119 takes the Barrier Rating off (TODO 149)',
    impl:   power => Math.max(0, Number(power) || 0),
  },
  {
    id:     'open-steps-fold-cards-with-no-steps',
    suite:  'open-steps',
    module: '../scripts/data/open-steps.mjs', klass: 'OpenSteps', method: 'finished',
    was:    'a card with no steps counted as finished, so every roll result would fold away unread (TODO 147)',
    impl:   (steps = []) => steps.every(s => s.done),
  },
  {
    id:     'open-steps-attacker-owes-the-defence',
    suite:  'open-steps',
    module: '../scripts/data/open-steps.mjs', klass: 'OpenSteps', method: 'ownerId',
    was:    'the attacker was read as owing the target\'s step, putting the defence on the wrong player (TODO 147)',
    impl:   p => (p?.attackerActorId ?? p?.actorId ?? p?.targetActorId ?? null),
  },
  {
    id:     'ammo-ignores-gun-class',
    suite:  'ammo-stock',
    ...AMMO, method: 'classFits',
    was:    'loose rounds fitted any firearm; SR3 p.279 shares ammunition only within a gun class (TODO 173)',
    impl:   () => true,
  },
  {
    id:     'belt-loads-at-quickness',
    suite:  'ammo-stock',
    ...AMMO, method: 'reloadActions', needsOriginal: '_reloadActionsOriginal',
    was:    'belt-fed loose rounds loaded at Quickness a Complex Action; SR3 p.280 gives Quickness × 2 (TODO 173)',
    impl:   function (sys, o = {}) {
      const mech = String(o.gunMech ?? sys?.loadMechanism ?? '').toLowerCase();
      return this._reloadActionsOriginal(mech === 'belt' ? { ...sys, loadMechanism: 'm' } : sys, { ...o, gunMech: mech === 'belt' ? 'm' : o.gunMech });
    },
  },
  {
    id:     'used-cyberware-stress-1d6-halved',
    suite:  'stress',
    module: '../scripts/data/stress.mjs', klass: 'Stress', method: 'usedStartingPoints',
    was:    'used cyberware started with 1D6 ÷ 2 rounded down (0 on a 1); the maintainer chose M&M p.45\'s 1D3 (TODO 174)',
    impl:   die => Math.floor(Math.max(0, Number(die) || 0) / 2),
  },
  {
    id:     'used-delta-reads-as-delta',
    suite:  'essence',
    ...ACTOR, method: 'gradedEssenceCost',
    was:    'Used Delta read as delta (×.5); M&M p.11 installs it as betaware (TODO 174)',
    impl:   (cost, grade) => {
      const b = parseFloat(cost ?? 0);
      if (!(b > 0)) return 0;
      const k = String(grade ?? '').toLowerCase().replace(/\bused\b/g, '').trim();
      const m = { alpha: 0.8, alphaware: 0.8, beta: 0.6, betaware: 0.6, delta: 0.5, deltaware: 0.5 }[k] ?? 1;
      if (m === 1) return parseFloat(b.toFixed(2));
      return Math.max(0.01, Math.ceil(Number((b * m * 100).toFixed(6))) / 100);
    },
  },
  {
    id:     'area-radius-narrow-per-die',
    suite:  'area-spells',
    ...ITEM, method: 'spellAreaRadius',
    was:    'narrowing an area spell cost 1 die per metre, like widening; SR3 p.181 charges 2 (TODO 171)',
    impl:   (m, w = 0, mode = 'widen') => Math.max(1, mode === 'narrow' ? (Number(m) || 0) - (Number(w) || 0) : (Number(m) || 0) + (Number(w) || 0)),
  },
  {
    id:     'staging-each-side-separately',
    suite:  'net-staging',
    ...ACTOR, method: 'netStagedDamage',
    was:    'the attacker staged up on raw successes and the soak staged down on its own — floor(A/2) − floor(D/2) '
          + 'instead of p.113\'s net comparison (TODO 165)',
    impl:   (base, a, d) => {
      const S = ['L', 'M', 'S', 'D'];
      const up = Math.min(3, S.indexOf(base.level) + Math.floor((Number(a) || 0) / 2));
      const idx = up - Math.floor((Number(d) || 0) / 2);
      return idx < 0 ? { power: base.power, level: null, soaked: true, net: 0 }
                     : { power: base.power, level: S[idx], soaked: false, net: 0 };
    },
  },
  {
    id:     'vehicle-power-rounds-up',
    suite:  'vehicle-targets',
    ...ITEM, method: 'vehicleTargetDamage',
    was:    'Power halved rounding UP and Light passed through at Light (SR3 p.149, TODO 168)',
    impl:   (d, { av = false } = {}) => av ? { damage: d, noEffect: false, note: '' }
      : { damage: { ...d, power: Math.ceil(d.power / 2), level: ({ D: 'S', S: 'M', M: 'L', L: 'L' })[d.level] }, noEffect: false, note: '' },
  },
  {
    id:     'vcr-plus-one-reaction',
    suite:  'rigging',
    ...RIG, method: 'vcrReaction',
    was:    'a VCR added +1 Reaction per level; SR3 p.301 gives +2 (TODO 167)',
    impl:   (base, vcr) => (Number(base) || 0) + (Number(vcr) || 0),
  },
  {
    id:     'control-pool-without-a-rig',
    suite:  'rigging',
    ...RIG, method: 'controlPool',
    was:    'an unrigged driver had a Control Pool; SR3 p.44: "Only characters with a Vehicle Control Rig" (TODO 167)',
    impl:   (base, vcr) => (Number(base) || 0) + 2 * (Number(vcr) || 0),
  },
  {
    id:     'rcd-drone-rolls-the-riggers-skill',
    suite:  'rigging',
    ...RIG, method: 'droneTestRoller',
    was:    "a drone in RCD rolled the rigger's Gunnery and Driving skills; SR3 p.154: secondary drones use their Pilot Ratings",
    impl:   (_mode, hasRigger) => hasRigger ? 'rigger' : 'pilot',
  },
  {
    id:     'secondary-drone-gets-combat-pool',
    suite:  'rigging',
    ...RIG, method: 'gunneryCombatPool',
    was:    'drone gunnery offered a Combat Pool to a secondary drone (or none to the jumped-in rigger); SR3 p.154/p.157 give it to the primary drone only (0.7.0)',
    impl:   (_roller, available) => Number(available) || 0,
  },
  {
    id:     'hardened-armour-counts-the-burst',
    suite:  'vehicle-armor',
    ...VARM, method: 'comparedPower',
    was:    'the soak card compared the staged Power, burst / full-auto bonus included, with the vehicle Armor; SR3 p.132 / p.149 leave it out (0.7.0)',
    impl:   (staged) => Number(staged) || 0,
  },
  {
    id:     'stall-speed-never-warns',
    suite:  'aircraft-stall',
    ...STALL, method: 'below',
    was:    'an aircraft below its stall speed raised no warning and no Crash Test offer; the model had no stall speed at all (SR3 p.132, 0.7.0)',
    impl:   () => false,
  },
  {
    id:     'stall-migration-keeps-the-low-speed-as-max',
    suite:  'aircraft-stall',
    ...PACKFIX, method: 'fixActor', needsOriginal: '_fixActorOriginal',
    was:    'owned aircraft kept the stall speed in Speed (the lower number of the 135/340 row) and got no stall speed (SR3 p.132, 0.7.0)',
    impl:   function (actor) {
      const d = this._fixActorOriginal(actor);
      if (!d) return d;
      delete d['system.attributes.speed.value'];
      delete d['system.attributes.speed.base'];
      return d;
    },
  },
  {
    id:     'captains-chair-loses-vcr-initiative',
    suite:  'rigging',
    ...RIG, method: 'usesVcrInitiative',
    was:    `a rigger in RCD rolled ordinary Initiative; SR3 p.154: in the captain's chair Rigger X "receives his usual Initiative bonus"`,
    impl:   mode => mode === 'vcr',
  },
  {
    id:     'mana-spells-deal-stun',
    suite:  'spell-damage',
    ...ITEM, method: 'spellDealsStun',
    was:    'the damage track followed Mana/Physical — Manabolt, Manaball and Death Touch dealt Stun (SR3 p.191, TODO 169)',
    impl:   spell => (spell?.system?.type ?? 'Mana') !== 'Physical',
  },
  {
    id:     'drain-clamps-at-deadly',
    suite:  'spell-damage',
    ...ITEM, method: 'parseDrainFormula', needsOriginal: '_parseDrainFormulaOriginal',
    was:    'Drain Level clamped at Deadly with no +2 Power per level past it (SR3 p.191, TODO 170)',
    impl:   function (code, force, level) {
      const r = this._parseDrainFormulaOriginal(code, force, level);
      if (!r || r.level !== 'D') return r;
      const noPast = this._parseDrainFormulaOriginal(code, force, 'M');
      return { tn: noPast.tn, level: 'D' };
    },
  },
  {
    id:     'overflow-death-at-body',
    suite:  'overflow-death',
    ...ACTOR, method: 'deadFromOverflow',
    was:    'dead at overflow >= Body; SR3 p.125 kills only "by more than the character’s Body Rating" (TODO 166)',
    impl:   (o, b) => (Number(b) || 0) > 0 && (Number(o) || 0) >= (Number(b) || 0),
  },
  {
    id:     'quick-strike-unwounded-boxes',
    suite:  'quick-strike',
    module: '../scripts/data/quick-strike.mjs', klass: 'QuickStrike', method: 'unwounded',
    was:    '"unwounded" read as no boxes on either track; the maintainer ruled it is no injury modifier (MITS p.151, 2026-09-15)',
    impl:   sys => !((sys?.wounds?.physical?.value ?? 0) > 0) && !((sys?.wounds?.stun?.value ?? 0) > 0),
  },
  {
    id:     'gyro-shared-allowance',
    suite:  'gyro',
    ...ACTOR, method: 'gyroOnRecoil',
    was:    'one gyro allowance shared by recoil and movement (p.113 "total") — recoil ate the movement offset; '
          + 'the maintainer ruled the full rating applies to each (2026-09-15, CC p.34)',
    impl:   (rating, recoil) => { const r = Math.max(0, Number(recoil) || 0), g = Math.max(0, Number(rating) || 0);
      const used = Math.min(g, r); return { recoil: r - used, used, left: g - used }; },
  },
  {
    id:     'smartgun-walking-waste',
    suite:  'fire-modes',
    ...ITEM, method: 'walkingWaste',
    was:    'every metre walked wasted a round, smartgun or not — the player had to know p.116 and leave it at 0 (TODO 56.1)',
    impl:   metres => Math.max(0, Math.trunc(Number(metres) || 0)),
  },
  {
    id:     'laser-read-over-whole-text',
    suite:  'gyro',
    ...ACCESSORIES, method: 'fromText',
    was:    '`/laser/` over the whole accessories text — the Ballista\'s Laser Designator and the Sonic Beam '
          + 'Rifle\'s "MP Laser III" battery note were guessed as laser sights (TODO 18)',
    impl:   text => ({ smartgun: /smart/i.test(String(text ?? '')), laserSight: /laser/i.test(String(text ?? '')) }),
  },
  {
    id:     'loose-rounds-shown-as-clips',
    suite:  'ammo-stock',
    ...AMMO, method: 'loadLabel',
    was:    'the sheet printed every stock\'s loadMechanism — loose rounds default to (c), so unloaded rounds and '
          + 'boxes of rounds read "Removable Clip" (TODO 133/142, reported in the trial session)',
    impl:   (sys, labels = {}) => { const m = String(sys?.loadMechanism ?? 'c'); return { code: m, title: labels[m] ?? m }; },
  },
  {
    id:     'clip-rounds-converted-unevenly',
    suite:  'ammo-stock',
    ...AMMO, method: 'reloadsFromRounds',
    was:    'converting a clip stored as rounds (TODO 143) must not round an uneven count into whole reloads — '
          + '35 rounds of a 10-round clip would become 3 clips and lose 5 rounds',
    impl:   (name, sys = {}) => { const m = /(\d+)\s*-?\s*(?:rnd|round)s?\b/i.exec(String(name ?? '')); const per = Number(m?.[1] ?? 0);
      const n = Math.floor(Number(sys?.rounds) || 0); return sys?.countedIn !== 'reloads' && per > 0 && n > 0 ? { reloads: Math.floor(n / per), roundsPerReload: per } : null; },
  },
  {
    id:     'ammo-fits-by-mechanism-only',
    suite:  'ammo-stock',
    ...AMMO, method: 'fits',
    was:    'stock matched the gun by loading mechanism alone — every shipped box of rounds says (c), so 74 '
          + 'revolvers, tube-fed shotguns and break actions had nothing to load (found checking TODO 23)',
    impl:   (sys, gunMech) => !gunMech || String(sys?.loadMechanism ?? 'c').toLowerCase() === String(gunMech).toLowerCase(),
  },
  {
    id:     'bookpage-sta2-not-aliased',
    suite:  'book-page',
    ...BOOKPAGE, method: 'codes',
    was:    'upstream\'s `sta2` read as its own book — all 63 SOTA 2064 documents reported as filed under the wrong one',
    impl:   bp => String(bp ?? '').split(',').map(s => /^([a-z0-9-]+)\./i.exec(s.trim())?.[1]?.toLowerCase()).filter(Boolean),
  },
  {
    id:     'bookpage-placeholder-counts',
    suite:  'book-page',
    ...BOOKPAGE, method: 'missing',
    was:    'only a blank page counted as missing — the SR2 import\'s 314 "sr2.???" looked sourced',
    impl:   bp => !String(bp ?? '').trim(),
  },
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
    id:     'medkit-supplies-refill-any-kit',
    suite:  'healing',
    ...HEAL, method: 'emptyMedkits',
    was:    'TODO 139: restocking ignored whether the kit had run out, so a stocked kit could be "refilled"',
    impl:   function (items) { return [...(items ?? [])].filter(i => this.EQUIPMENT.medkit.test(String(i.name ?? ''))); },
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
    id:     'karma-attr-maximum-floors',
    suite:  'karma',
    ...ACTOR, method: 'karmaAttributeMaximum',
    was:    'Math.floor - p.245 prints the maximum rounded UP (7 -> 11, 9 -> 14, troll Body 11 (17)); '
          + 'flooring said "past max" a point early in Spend Karma',
    impl:   (racialLimit) => Math.floor((Number(racialLimit) || 0) * 1.5),
  },
  {
    id:     'spec-rises-with-the-base',
    suite:  'karma',
    ...SKILLRULES, method: 'specsAfterRatingChange',
    was:    'raising the base skill left every specialisation bonus alone, so the specialisation rose '
          + 'with it for free - p.245: Specializations do not automatically increase when the base skill increases',
    impl:   () => null,
  },
  {
    id:     'spec-bonus-goes-negative',
    suite:  'karma',
    ...SKILLRULES, method: 'specsAfterRatingChange',
    was:    'no floor: a base that catches up to the specialisation turned its bonus into a penalty',
    impl:   (specs, o, n) => (!specs?.length || !(o > 0) || !(n > 0) || o === n) ? null
      : specs.map(sp => ({ ...sp, level: (sp.level || 0) - (n - o) })),
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
    id:     'flechette-flag-voids-damage-code',
    suite:  'damage-codes',
    ...ITEM, method: 'parseDamageCode',
    was:    'a trailing (f) flechette flag made the whole code unparseable, so `10S(f)` grenades did no damage (TODO 146)',
    // The parser as it was: only a plain code or a STR expression reads; `(f)` matches neither.
    impl:   function (code) {
      if (!code) return null;
      const isStun = /stun/i.test(code);
      const m = code.trim().replace(/\s*(stun)?\s*$/i, '').trim().match(/^(\d+)\s*([LMSD])$/i);
      return m ? { power: parseInt(m[1]), level: m[2].toUpperCase(), isStun } : null;
    },
  },
  {
    id:     'thrown-grenade-rolls-firearms',
    suite:  'grenade-skill',
    ...ITEM, method: 'weaponSkillFor',
    was:    'no category entry for GR, so a thrown grenade fell through to the Firearms skill (SR3 p.86, TODO 148)',
    impl:   function (code, type) {
      if (code === 'GrLn') return 'Launch Weapons';
      if (code === 'HPist') return 'Pistols';
      return type === 'melee' ? 'Armed Combat' : 'Firearms';
    },
  },
  {
    id:     'defensive-grenade-falls-off-like-offensive',
    suite:  'blast',
    module: '../scripts/data/blast.mjs', klass: 'Blast', method: 'perMetre',
    was:    'every grenade lost 1 Power per metre; a defensive grenade loses 1 per HALF metre (SR3 p.119, TODO 150)',
    impl:   text => (/^\s*[-−–]?\s*\d/.test(String(text ?? '')) ? 1 : null),
  },
  {
    id:     'core-grenades-defensive-loses-one-per-metre',
    suite:  'core-grenades',
    module: '../tools/build-core-grenades.mjs', klass: 'CoreGrenades', method: 'buildDoc',
    was:    'the shipped Defensive grenades carried the Offensive falloff (-1/m) instead of the printed -1/.5m (SR3 p.283, TODO 144)',
    impl:   function (row) {
      const d = this.__origBuild(row);
      d.doc.system.blast = '-1/m';
      return d;
    },
    needsOriginal: '__origBuild',
  },
  {
    id:     'launcher-reads-its-own-blast',
    suite:  'mini-grenade',
    module: '../scripts/data/mini-grenade.mjs', klass: 'MiniGrenade', method: 'round',
    was:    'a launched grenade read the launcher, which has no blast, so a Defensive mini-grenade fell off at -1/m (SR3 p.283, TODO 163)',
    impl:   weaponSystem => weaponSystem,
  },
  {
    id:     'launcher-mixes-grenades',
    suite:  'mini-grenade',
    ...AMMO, method: 'reloadPlan', needsOriginal: '_reloadPlanMini',
    was:    'every mini-grenade is `regular`, so a launcher topped up offensive rounds with defensive ones and fired them all as one grenade (TODO 163)',
    impl:   function (sys, magSize, current = {}, opts = {}) { return this._reloadPlanMini(sys, magSize, { ...current, ammoId: '' }, opts); },
  },
  {
    id:     'mini-grenade-cost-not-doubled',
    suite:  'mini-grenade',
    module: '../scripts/data/mini-grenade.mjs', klass: 'MiniGrenade', method: 'fromGrenade', needsOriginal: '_fromGrenade',
    was:    'the p.283 Mini-grenade row doubles the cost (x2) and adds 2 to Availability; a copy of the grenade row would ship otherwise (TODO 163)',
    impl:   function (g) { return { ...this._fromGrenade(g), cost: g.cost, avail: g.avail }; },
  },
  {
    id:     'coded-flechette-raises-level-twice',
    suite:  'flechette-weapons',
    ...ITEM, method: 'flechetteAmmo',
    was:    'an (f) Damage Code got the full flechette rules, raising its level AGAIN — the code already has the increase (SR3 p.116)',
    impl:   function (system, loaded = 'regular') {
      if (loaded && loaded !== 'regular') return loaded;
      return (system?.flechette === true || /\(f\)/i.test(system?.damage ?? '')) ? 'flechette' : loaded;
    },
  },
  {
    id:     'pack-repair-removes-without-a-twin',
    suite:  'pack-repair',
    module: '../scripts/data/pack-repair.mjs', klass: 'PackRepair', method: 'plan',
    was:    'a broken entry was removable even with no identical twin — deleting the only copy of a document (TODO 145)',
    impl:   entries => {
      const all = [...entries ?? []];
      const broken = all.filter(e => e?._id == null || e._id === '');
      return { broken, removable: broken, kept: [] };
    },
  },
  {
    id:     'damaging-grenade-becomes-an-effect',
    suite:  'area-effect',
    module: '../scripts/data/area-effect.mjs', klass: 'AreaEffect', method: 'of',
    was:    'a grenade WITH a Damage Code was treated as an area-effect grenade, so it skipped its damage and soak (TODO 155)',
    impl:   system => {
      const text = String(system?.areaEffect ?? '').trim();
      const radius = Number(system?.areaRadius);
      if (!text && !(radius > 0)) return null;
      return { text, radius: radius > 0 ? radius : null, turns: null };
    },
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

  /* ── Vehicle collisions · TODO 189 (SR3 p.142, p.143, p.147, p.148) ───────────────────────────── */
  {
    id:     'pedestrian-collision-has-no-knockdown',
    suite:  'collisions',
    ...COLLISIONS, method: 'pedestrianSoakFlags',
    was:    'the pedestrian struck by a vehicle gets no Knockdown Test (the original build suppressed it as "the book gives none for '
          + 'a collision"). The maintainer ruled 2026-10-17 that the core Knockdown rule (p.124) applies: being hit by a car is going to suck',
    impl:   () => ({ useImpact: true, noKnockdown: true }),
  },
  {
    id:     'pedestrian-level-not-raised',
    suite:  'collisions',
    ...COLLISIONS, method: 'pedestrian',
    was:    'p.148 - the pedestrian suffers the level ONE STAGE HIGHER than the Impact Damage Levels Table. '
          + 'Reading the table straight undersells every car-on-person collision (Rex Karz\'s 60 m/turn is 6S, not 6M)',
    impl:   ({ speed = 0, table } = {}) => {
      const b = table(Math.max(0, Number(speed) || 0));
      return { speed, pedestrian: { power: b.power, level: b.level, pastDeadly: false }, vehicle: { power: b.power, level: null } };
    },
  },
  {
    id:     'pedestrian-vehicle-level-not-lowered',
    suite:  'collisions',
    ...COLLISIONS, method: 'pedestrian',
    was:    'p.148 - the VEHICLE resists the level one stage LOWER than the table ("a vehicle moving between 1 and 20 '
          + 'meters per turn would take no damage"). Giving it the table\'s level makes every low-speed bump hurt the car',
    impl:   ({ speed = 0, table } = {}) => {
      const b = table(Math.max(0, Number(speed) || 0));
      const up = { L: 'M', M: 'S', S: 'D', D: 'D' }[b.level];
      return { speed, pedestrian: { power: b.power, level: up, pastDeadly: b.level === 'D' }, vehicle: { power: b.power, level: b.level } };
    },
  },
  {
    id:     'pedestrian-past-deadly-capped',
    suite:  'collisions',
    ...COLLISIONS, method: 'pedestrian',
    was:    'p.148 - "If the corresponding Damage Level … is Destroyed, the Power of the collision increases by half '
          + 'of its original value, rounded down". Capping the level and dropping the extra Power makes a 250 m/turn '
          + 'impact no worse than a 70 m/turn one',
    impl:   ({ speed = 0, table } = {}) => {
      const b = table(Math.max(0, Number(speed) || 0));
      const up = { L: 'M', M: 'S', S: 'D', D: 'D' }[b.level];
      const down = { L: null, M: 'L', S: 'M', D: 'S' }[b.level];
      return { speed, pedestrian: { power: b.power, level: up, pastDeadly: b.level === 'D' }, vehicle: { power: b.power, level: down } };
    },
  },
  {
    id:     'collision-target-power-reduced',
    suite:  'collisions',
    ...COLLISIONS, method: 'vehicle',
    was:    'p.143 / p.147 - only the RAMMER reduces the Power it faces by Body x successes; "the Damage Code of 15S '
          + 'is not reduced" for the target. Applying it to both halves the damage every rammed vehicle takes',
    impl:   ({ speedA = 0, speedB = 0, speedDiff = null, ram = null, table } = {}) => {
      const diff = speedDiff == null ? Math.abs(speedA - speedB) : speedDiff;
      const t = table(diff);
      const cut = ram ? (ram.body | 0) * (ram.successes | 0) : 0;
      const p = Math.min(t.power, Math.max(2, t.power - cut));
      return { diff, power: t.power, level: t.level, first: { power: p }, other: { power: p } };
    },
  },
  {
    id:     'collision-accident-reduces-rammer',
    suite:  'collisions',
    ...COLLISIONS, method: 'vehicle',
    was:    'the maintainer\'s ruling (2026-10-17): an ACCIDENTAL collision uses the ram formula WITHOUT the rammer\'s Body x '
          + 'successes reduction. Treating every collision as a ram halves what the car in an accident takes',
    impl:   ({ speedA = 0, speedB = 0, speedDiff = null, ram = null, table } = {}) => {
      const diff = speedDiff == null ? Math.abs(speedA - speedB) : speedDiff;
      const t = table(diff);
      const cut = (ram?.body ?? 3) * (ram?.successes ?? 3);
      return { diff, power: t.power, level: t.level, first: { power: Math.min(t.power, Math.max(2, t.power - cut)) }, other: { power: t.power } };
    },
  },
  {
    id:     'collision-power-floor-dropped',
    suite:  'collisions',
    ...COLLISIONS, method: 'vehicle',
    was:    'p.147 - "Target numbers cannot be reduced below 2": the book\'s Mach 6 faces 2S, not 0S',
    impl:   ({ speedA = 0, speedB = 0, speedDiff = null, ram = null, table } = {}) => {
      const diff = speedDiff == null ? Math.abs(speedA - speedB) : speedDiff;
      const t = table(diff);
      const cut = ram ? (ram.body | 0) * (ram.successes | 0) : 0;
      return { diff, power: t.power, level: t.level, first: { power: Math.max(0, t.power - cut) }, other: { power: t.power } };
    },
  },
  {
    id:     'barrier-stops-only-below',
    suite:  'collisions',
    ...COLLISIONS, method: 'barrier',
    was:    'p.148 - "less than OR EQUAL to the Barrier Rating multiplied by 20, the vehicle comes to a halt". '
          + 'Strict "<" lets a car at exactly BR x 20 smash through',
    impl:   ({ speed = 0, rating = 0, table } = {}) => {
      const th = rating * 20;
      if (speed < th) return { rating, threshold: th, breaksThrough: false, speedAfter: 0, lost: speed, power: null, level: null };
      return { rating, threshold: th, breaksThrough: true, speedAfter: speed - th, lost: th, power: rating, level: table(th).level };
    },
  },
  {
    id:     'barrier-level-from-impact-speed',
    suite:  'collisions',
    ...COLLISIONS, method: 'barrier',
    was:    'p.148 - "Use the LOSS IN SPEED on the Impact Damage Levels Table to determine the Damage Level". '
          + 'Reading the speed the car hit at turns a glass pane into a Deadly collision',
    impl:   ({ speed = 0, rating = 0, table } = {}) => {
      const th = rating * 20;
      if (speed <= th) return { rating, threshold: th, breaksThrough: false, speedAfter: 0, lost: speed, power: null, level: null };
      return { rating, threshold: th, breaksThrough: true, speedAfter: speed - th, lost: th, power: rating, level: table(speed).level };
    },
  },
  {
    id:     'barrier-power-from-speed',
    suite:  'collisions',
    ...COLLISIONS, method: 'barrier',
    was:    'p.148 - "The Power of the collision damage equals the Barrier Rating of the wall". Using speed / 10 (the '
          + 'crash rule) ignores what the car went through',
    impl:   ({ speed = 0, rating = 0, table } = {}) => {
      const th = rating * 20;
      if (speed <= th) return { rating, threshold: th, breaksThrough: false, speedAfter: 0, lost: speed, power: null, level: null };
      return { rating, threshold: th, breaksThrough: true, speedAfter: speed - th, lost: th, power: Math.ceil(speed / 10), level: table(th).level };
    },
  },
  {
    id:     'barrier-keeps-its-speed',
    suite:  'collisions',
    ...COLLISIONS, method: 'barrier',
    was:    'p.148 - the vehicle "loses speed after such a collision, however, equal to the Barrier Rating multiplied by 20"',
    impl:   ({ speed = 0, rating = 0, table } = {}) => {
      const th = rating * 20;
      if (speed <= th) return { rating, threshold: th, breaksThrough: false, speedAfter: 0, lost: speed, power: null, level: null };
      return { rating, threshold: th, breaksThrough: true, speedAfter: speed, lost: th, power: rating, level: table(th).level };
    },
  },
  {
    id:     'braking-crash-at-the-limit',
    suite:  'collisions',
    ...COLLISIONS, method: 'braking',
    was:    'p.142 - "If a vehicle decelerates MORE THAN its Acceleration Rating x 4, it must make a Crash Test". '
          + 'Exactly x 4 is not more than',
    impl:   ({ speed = 0, acceleration = 0, successes = 0 } = {}) => {
      const reduction = Math.min(speed, acceleration * successes);
      return { speedAfter: speed - reduction, reduction, crashTest: reduction >= acceleration * 4 };
    },
  },
  {
    id:     'braking-below-standstill',
    suite:  'collisions',
    ...COLLISIONS, method: 'braking',
    was:    'p.142 - speed changes by Acceleration x successes, but a car cannot go below a standstill (negative speed '
          + 'would read as a collision at a made-up speed)',
    impl:   ({ speed = 0, acceleration = 0, successes = 0 } = {}) => {
      const reduction = acceleration * successes;
      return { speedAfter: speed - reduction, reduction, crashTest: reduction > acceleration * 4 };
    },
  },
  {
    id:     'accident-dodge-needs-zero',
    suite:  'collisions',
    ...COLLISIONS, method: 'dodgeToBeat',
    was:    'the pedestrian\'s optional dodge (a house rule): an accident has no successes, so the weakest hit (1) is '
          + 'assumed - 0 would let a single lucky die dodge a speeding car, and a tie must still go to the vehicle (p.113)',
    impl:   ({ how = 'accident', ramSuccesses = 0, override = null } = {}) => {
      const typed = override === '' || override == null ? null : Number(override);
      if (typed != null && Number.isFinite(typed)) return Math.max(0, Math.trunc(typed));
      return how === 'ram' ? Math.max(1, ramSuccesses | 0) : 0;
    },
  },
  {
    id:     'breakthrough-belt-stages-one',
    suite:  'collisions',
    ...ACTOR, method: 'collisionPassengerDamage',
    was:    'p.148 - through a barrier a restrained passenger takes NO damage and the UNRESTRAINED stage down one; the '
          + 'ordinary crash rule (p.147: a belt stages one level) must not be applied there',
    impl:   ({ power = 0, level = 'L', impact = 0, belted = false } = {}) => {
      const S = ['L', 'M', 'S', 'D'];
      const p = Math.max(0, power - impact);
      const idx = S.indexOf(level) - (belted ? 1 : 0);
      return { power: p, level: idx >= 0 ? S[idx] : null, tn: Math.max(2, p) };
    },
  },

  /* ── The Concealment view · TODO 195 (SR3 p.45, p.231, p.236, p.237, p.270, p.301-303) ─────────── */
  {
    id:     'conceal-search-halved',
    suite:  'concealment',
    ...CONCEAL, method: 'targetNumber',
    was:    'the p.270 half-rating reading of a search, ruled OUT by the maintainer (2026-10-17): p.237 searches against the whole '
          + 'Concealability, plus the Physical Search Modifiers Table. Halving it makes every pat-down twice as easy to win',
    impl:   (c, mode, mod = 0) => Math.max(2, (mode === 'search-full' ? Math.floor(c / 2) : Math.trunc(c)) + Math.trunc(mod)),
  },
  {
    id:     'conceal-search-drops-table-modifier',
    suite:  'concealment',
    ...CONCEAL, method: 'targetNumber',
    was:    'p.237 - a manual search applies the Physical Search Modifiers Table (p.236) on top of the Concealability; '
          + 'a search that ignores the modifier total is the same number whether it takes a second or ten minutes',
    impl:   (c, mode, mod = 0) => Math.max(2, Math.trunc(c) + (mode === 'search-full' ? 0 : Math.trunc(mod))),
  },
  {
    id:     'conceal-no-floor-of-two',
    suite:  'concealment',
    ...CONCEAL, method: 'targetNumber',
    was:    'p.112 - "no target number can ever be less than 2": Concealability 1 must read as 2',
    impl:   (c, _mode, mod = 0) => Math.trunc(c) + Math.trunc(mod),
  },
  {
    id:     'conceal-sorted-most-concealed-first',
    suite:  'concealment',
    ...CONCEAL, method: 'sort', needsOriginal: '_sortOriginal',
    was:    'Concealability is the Perception Test\'s target number, so the LOWEST is the easiest to spot: the list reads '
          + 'least concealed first. Sorting the other way shows the table the best-hidden gear at the top',
    impl:   function (rows) { return this._sortOriginal(rows).reverse(); },
  },
  {
    id:     'conceal-search-table-signs-flipped',
    suite:  'concealment',
    ...CONCEAL, method: 'searchModifier', needsOriginal: '_searchOriginal',
    was:    'p.236 - a LONGER, more professional search is a lower target number (Detailed -1, Deliberate -2); a cursory '
          + 'one by an amateur is higher. Flipping the signs makes careful searches easier to beat',
    impl:   function (o) { const r = this._searchOriginal(o); return { ...r, mod: -r.mod }; },
  },
  {
    id:     'conceal-strip-search-needs-a-roll',
    suite:  'concealment',
    ...CONCEAL, method: 'searchModifier', needsOriginal: '_searchOriginal2',
    was:    'p.236 - a 6-10 minute strip search: "Weapon found" - no test is rolled at all',
    impl:   function (o) { return { ...this._searchOriginal2(o), found: false }; },
  },
  {
    id:     'conceal-synthetic-limb-obvious',
    suite:  'concealment',
    ...CONCEAL, method: 'classifyImplant', needsOriginal: '_classifyOriginal',
    was:    'p.301/p.303 - a SYNTHETIC cyberlimb is disguised, with Concealability 8; only an obvious one is plain sight. '
          + 'Treating both alike hides the one the table can roll against',
    impl:   function (item) {
      const k = this._classifyOriginal(item);
      return k && k.state === 'disguised' && k.conceal === 8 ? { ...k, state: 'obvious', conceal: null } : k;
    },
  },
  {
    id:     'conceal-limb-enhancement-shown',
    suite:  'concealment',
    ...CONCEAL, method: 'classifyImplant', needsOriginal: '_classifyOriginal2',
    was:    'the Cyberlimbs category also holds the enhancements and accessories ("Quickness [5] w/Torso", "Induction Pad"); '
          + 'listing them as limbs would show the table chrome the character does not wear on the outside',
    impl:   function (item) {
      const k = this._classifyOriginal2(item);
      return k ?? (item?.system?.cyberwareCategory === 'Cyberlimbs' ? { state: 'obvious', conceal: null, note: '' } : null);
    },
  },
  {
    id:     'conceal-stored-implant-shown',
    suite:  'concealment',
    ...CONCEAL, method: 'classifyImplant', needsOriginal: '_classifyOriginal3',
    was:    'an implant in the stash is carried, not fitted - it is not on the character\'s body for anyone to see',
    impl:   function (item) {
      return this._classifyOriginal3({ ...item, flags: undefined });
    },
  },
  {
    id:     'conceal-unworn-armour-shown',
    suite:  'concealment',
    ...CONCEAL, method: 'rows', needsOriginal: '_rowsOriginal',
    was:    'only armour actually WORN can be seen: a spare jacket in the kit bag is not on anybody',
    impl:   function (items, o = {}) {
      return this._rowsOriginal(items, { ...o, wornIds: items.filter(i => i.type === 'armor').map(i => i.id) });
    },
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
  {
    id:     'half-slot-is-a-certain-hit',
    suite:  'cyber-slots',
    ...SLOTS, method: 'systemHit',
    was:    'M&M p.128 - a partly filled Essence slot is a CHANCE, not a hit: "If Leggy had rolled '
          + 'a 6, he might not have taken any damage at all because that slot is only half full … '
          + 'a 50-50 chance between the smartlink getting hit and no damage being done." Reading '
          + 'the slot as occupied-therefore-hit doubles how often a lone cheap implant breaks, and '
          + 'no fill-rule test would notice',
    impl:   (assignment, d6) => {
      const slots = assignment?.slots ?? assignment ?? [];
      const slot  = slots.find(s => s.index === Math.trunc(Number(d6) || 0)) ?? null;
      if (!slot || !slot.entries.length) {
        return { slot: d6, empty: true, partial: false, hitChance: 0, candidates: [], note: 'empty' };
      }
      const candidates = slot.entries.map(e => ({ ...e, share: e.amount / slot.filled }));
      return { slot: d6, empty: false, partial: false, hitChance: 1, candidates, note: 'hit' };
    },
  },
  {
    id:     'wound-effects-count-successes',
    suite:  'cyber-slots',
    ...SLOTS, method: 'woundEffects',
    was:    'M&M p.127 counts the MARGIN OF FAILURE - "the difference between the highest roll and '
          + 'the number of damage boxes suffered" - not successes. a roll of 1,1,2,2,3 against 6 '
          + 'boxes is 3 wound effects; counting successes gives 0 and the whole rule never fires',
    impl:   (dice, boxes) => {
      const rolled = (Array.isArray(dice) ? dice : [dice]).map(Number);
      const b = Math.max(0, Math.trunc(Number(boxes) || 0));
      return rolled.filter(d => d >= b).length;
    },
  },
  {
    id:     'ledger-rewrite-checks-length-only',
    suite:  'ledger',
    ...LEDGER, method: 'reconcile',
    was:    'an append-only check that compares LENGTHS rather than content (TODO 79). A player '
          + 'editing the reason on a past entry, or swapping one entry for another, keeps the array '
          + 'the same length and sails straight through - which is exactly the rewrite the guard '
          + 'exists to stop, and the one a player would actually attempt',
    impl:   (current, next, { isGM = false } = {}) => {
      if (isGM) return { ok: true, why: '' };
      const cur = Array.isArray(current) ? current : [];
      const nxt = Array.isArray(next) ? next : [];
      return nxt.length < cur.length
        ? { ok: false, why: 'the ledger is append-only' }
        : { ok: true, why: '' };
    },
  },
  {
    id:     'ledger-delete-ignores-a-stale-row',
    suite:  'ledger',
    ...LEDGER, method: 'without',
    was:    'a GM delete that trusts the row index alone (TODO 153). The sheet is drawn, a player '
          + 'spends karma, the entries move, and the GM click removes a different line from the '
          + 'one they read',
    impl:   (entries, idx) => (Array.isArray(entries) && idx >= 0 && idx < entries.length
      ? entries.filter((_e, i) => i !== idx) : null),
  },
  {
    id:     'migration-restores-a-burned-pool',
    suite:  'migrations',
    ...LEDGER, method: 'touched',
    was:    'migrations 0.4.5.7 and 0.4.5.11 recognised a Karma Pool by its old default (Karma audit, '
          + '2026-10-25). Burning, added later, lowers the size for ever (SR3 p.246) and can land on that '
          + 'default, so force() gave a burned point back - a human at 34 career karma burning 4 -> 1 got 2',
    impl:   () => false,
  },
  {
    id:     'ledger-duplicate-inherits-history',
    suite:  'ledger',
    ...LEDGER, method: 'inherited',
    was:    'a duplicated character kept its source\'s whole ledger (TODO 193) - Foundry\'s Duplicate '
          + 'copies system.ledger with everything else, so the copy showed the other character\'s '
          + 'awards and purchases as its own: "the ledger is adding things to the wrong characters"',
    impl:   () => false,
  },
  {
    id:     'availability-reduction-shortens-the-wait',
    suite:  'purchasing',
    ...BUY, method: 'reduceAvailability',
    was:    'SR3 p.272 - buying the Availability target number down ADDS to the base time that the '
          + "successes then divide: Cheshire's TN 24 to 12 costs \"24 extra days (2 x 12 = 24)\" and "
          + 'makes the base 14 + 24 = 38, so 2 successes deliver in 19 days. Reading the wait as a '
          + 'reduction of the time instead is the intuitive-but-backwards version, and it still '
          + 'produces a plausible number for every case the book does not work',
    impl:   (avail, streetIndex, reduceBy = 0) => {
      const by = Math.max(0, Math.floor(Number(reduceBy) || 0));
      const capped = Math.min(by, Math.max(0, Number(avail?.tn) || 0));
      return {
        tn: (Number(avail?.tn) || 0) - capped,
        reducedBy: capped,
        extraDays: capped * 2,
        streetIndex: Math.round(((Number(streetIndex) || 0) + capped * 0.1) * 10) / 10,
        baseTime: Math.max(0, (Number(avail?.time) || 0) - capped * 2),
      };
    },
  },
  {
    id:     'negotiation-loss-is-merely-no-discount',
    suite:  'purchasing',
    ...BUY, method: 'negotiate',
    was:    'SR3 p.273 - the haggle is a Success Contest and losing it COSTS: "If the player loses, '
          + 'the gamemaster can either raise the price or demand the extra percentage up front." '
          + 'Clamping the adjustment at zero turns every bad roll into a free retry, which nobody '
          + 'at the table would ever notice as wrong',
    impl:   (price, buyerHits, sourceHits) => {
      const net = Math.max(0, Math.floor(Number(buyerHits) || 0) - Math.floor(Number(sourceHits) || 0));
      const adjustment = Math.round(-net * 0.05 * (Number(price) || 0));
      return { net, toBuyer: net > 0, percent: net * 0.05, adjustment,
        price: Math.max(0, Math.round((Number(price) || 0) + adjustment)) };
    },
  },
  {
    id:     'buy-haggle-leaves-pay-live',
    suite:  'purchasing',
    ...BUY, method: 'cardButtons',
    was:    'shipped in 0.8.0 (reported 2026-10-25): the Source found card kept its 💴 Pay live after a 🤝 haggle, '
          + 'at the asking price the haggle had replaced, and only the clicking browser knew the button was used — '
          + 'the GM saw the card as untouched and could pay it a second time',
    impl:   (acted = {}) => (acted?.['buy:pay'] ? { negotiate: 'Already paid for.', pay: 'Paid.' }
      : acted?.['buy:negotiate'] ? { negotiate: 'Already haggled.', pay: null } : { negotiate: null, pay: null }),
  },
  {
    id:     'attribute-hover-says-nothing',
    suite:  'attribute-sources',
    ...ACTOR, method: 'attributeBreakdown',
    was:    'the generic tooltips the sheet had — "Cyber/bio augmentation" with no item named (TODO 100, reported in play)',
    impl:   ({ label = '', total = null } = {}) => `${label}${total !== null ? ` ${total}` : ''}`,
  },
  {
    id:     'elemental-spells-resisted-like-combat-spells',
    suite:  'elemental-spells',
    ...ITEM, method: 'isElementalSpell',
    was:    'SR3 p.183 - "These spells can be dodged" and "the Resistance Test is actually a Damage '
          + 'Resistance Test". Every elemental spell went down the combat-spell path until 0.6: no '
          + 'dodge, a Willpower-only resist, no armour (rules-check 0.6.0, Finding 4)',
    impl:   () => false,
  },
  {
    id:     'elemental-cast-at-flat-4',
    suite:  'elemental-spells',
    ...ITEM, method: 'spellTakesGMWindow',
    was:    'SR3 p.183 - "Cover, visibility, injury and sustaining modifiers apply". The cast never '
          + 'opened the GM\'s TN window, so a Flamethrower through Thermal Smoke was cast at a flat 4 (TODO 131)',
    impl:   () => false,
  },
  {
    id:     'elemental-touch-takes-cover',
    suite:  'elemental-spells',
    ...ITEM, method: 'spellTakesGMWindow',
    was:    'SR3 p.182 - "Spells with a range of touch are not subject to cover or visibility modifiers" '
          + '(the easy way to get TODO 131 wrong)',
    impl:   () => true,
  },
  {
    id:     'personal-spell-takes-cover',
    suite:  'elemental-spells',
    ...ITEM, method: 'spellTakesGMWindow',
    was:    'SR3 p.182 - cover and visibility are about seeing the target; a personal spell\'s target is '
          + 'the caster. Touch was excluded and personal forgotten',
    impl:   range => !/^\s*T/i.test(String(range ?? '')),
  },
  {
    id:     'elemental-level-fixed-at-moderate',
    suite:  'elemental-spells',
    ...ITEM, method: 'spellChoosesDamageLevel',
    was:    'SR3 p.196 - "The caster chooses the spell\'s Base Damage Level when it is cast". The dialog '
          + 'offered it to Combat spells only, so every Fireball was cast, and drained, at Moderate',
    impl:   category => /^\s*combat\s*$/i.test(String(category ?? '')),
  },
  {
    id:     'elemental-full-impact',
    suite:  'elemental-spells',
    ...ACTOR, method: 'elementalImpact',
    was:    'SR3 p.196 - Impact armour protects "at only half its normal rating (round down)"',
    impl:   ({ impact = 0 } = {}) => Math.max(0, Number(impact) || 0),
  },
  {
    id:     'elemental-halves-ballistic',
    suite:  'elemental-spells',
    ...ACTOR, method: 'elementalImpact',
    was:    'SR3 p.196 - IMPACT armour at half. The ranged soak card defaults to Ballistic, and elemental '
          + 'spells now reach it through the ranged flow, so this is the easy way to get it wrong',
    impl:   ({ ballistic = 0 } = {}) => Math.floor(Math.max(0, Number(ballistic) || 0) / 2),
  },
  {
    id:     'mystic-armor-left-out-of-astral',
    suite:  'astral-soak',
    ...ACTOR, method: 'astralSoakTN',
    was:    'SR3 p.170 - "Mystic Armor also protects against damage done in astral combat". The astral '
          + 'soak card built its TN from the Power alone until 0.6 (rules-check 0.6.0, Finding 5)',
    impl:   ({ power = 0 } = {}) => Math.max(2, Number(power) || 0),
  },
  {
    id:     'mdf-hacking-pool-core-formula',
    suite:  'rules-check-063',
    module: '../scripts/data/mdf-rules.mjs', klass: 'MdfRules', method: 'hackingPool',
    was:    'the Defragged Hacking Pool used SR3 core\'s floor((INT + MPCP) / 3); MDF p.11 is INT + floor(MPCP / 3) (0.6.3 rules check)',
    impl:   (i, m) => Math.floor(((Number(i) || 0) + (Number(m) || 0)) / 3),
  },
  {
    id:     'mdf-matrix-cm-3-6-8',
    suite:  'rules-check-063',
    module: '../scripts/data/mdf-rules.mjs', klass: 'MdfRules', method: 'matrixCMPenalty',
    was:    'the Matrix Condition Monitor penalised from box 3 (+1/+2/+3 at 3/6/8); MDF p.12 is +1 at 1, +2 at 3, +3 at 6, +4 at 10 (0.6.3 rules check)',
    impl:   (b) => (b >= 8 ? 3 : b >= 6 ? 2 : b >= 3 ? 1 : 0),
  },
  {
    id:     'rammer-power-unreduced',
    suite:  'rules-check-063',
    ...ACTOR, method: 'ramCollision',
    was:    'a rammer\'s own damage kept the full Power (the level was staged down instead); SR3 p.143 takes Body x successes off the Power, floor 2 (0.6.3 rules check)',
    impl:   ({ speedDiff = 0 } = {}) => {
      const d = Math.abs(Number(speedDiff) || 0), power = Math.max(1, Math.ceil(d / 10));
      return { power, level: d >= 201 ? 'D' : d >= 61 ? 'S' : d >= 21 ? 'M' : 'L', rammerPower: power };
    },
  },
  {
    id:     'ortho-alert-passive-only',
    suite:  'rules-check-063',
    ...ACTOR, method: 'orthoAlertSubsystemMod',
    was:    'the passive alert\'s +2 to subsystems fell away at active alert; SR3 p.211 never removes it (0.6.3 rules check)',
    impl:   (a) => (a === 'passive' ? 2 : 0),
  },
  {
    id:     'flechette-coded-ignores-dermal',
    suite:  'flechette-weapons',
    ...ACTOR, method: 'flechetteCodedDrop',
    was:    'an (f) Damage Code kept its built-in level increase against dermal armour, which "negates the Damage Level '
          + 'increase of flechette ammunition" (SR3 p.116) - the card left it to the GM (TODO 161)',
    impl:   () => 0,
  },
  {
    id:     'orthodox-dumpshock-uses-ic-table',
    suite:  'tables',
    ...ACTOR, method: 'orthoDumpShock',
    was:    'the Orthodox deck crash posted a flat Serious on a track by user mode (MDF\'s rule); SR3 p.226-227 is Stun, '
          + 'Blue L / Green M / Orange S / Red D — and the IC table beside it (Blue M, Red S) is the easy one to misread (TODO 202)',
    impl:   (code, value) => ({ power: Math.max(1, Number(value) || 0),
      level: ({ Blue: 'M', Green: 'M', Orange: 'S', Red: 'S' })[code] ?? 'S', isStun: true, onTable: true }),
  },
  {
    id:     'natural-armor-left-out-of-astral',
    suite:  'astral-soak',
    ...ACTOR, method: 'astralSoakTN',
    was:    'SR3 p.175 - "the Power of the attack is reduced by the target\'s natural armor". Only Mystic '
          + 'Armor was deducted; a critter\'s natural armour had no field, and the GM lowered the TN by hand (TODO 177)',
    impl:   ({ power = 0, mysticArmor = 0 } = {}) => Math.max(2, (Number(power) || 0) - Math.max(0, Number(mysticArmor) || 0)),
  },
  {
    id:     'every-fighter-adds-the-astral-combat-pool',
    suite:  'astral-soak',
    ...ACTOR, method: 'astralAttackPool',
    was:    'SR3 p.174 - a perceiving / dual being uses its Combat Pool in astral combat; only a projector has the '
          + 'Astral Combat Pool. Both corners were offered the Astral Combat Pool whatever the astral mode (0.8.0 rules check)',
    impl:   ({ derived = {} } = {}) => ({ kind: 'astral', label: 'Astral Combat Pool',
      available: Math.max(0, derived?.availableAstralPool ?? 0) }),
  },
  {
    id:     'every-astral-fighter-deals-charisma-damage',
    suite:  'astral-soak',
    ...ACTOR, method: 'astralDamageCode',
    was:    'SR3 p.176 Astral Damage Codes - a dual being deals (Strength)M (or its weapon), a spirit (Force)M; only an '
          + 'astral being uses Charisma. Every fighter dealt (Charisma)M until the 0.8.0 rules check',
    impl:   ({ attributes = {}, weaponFocus = null } = {}) => {
      const cha = Math.max(1, attributes?.charisma?.base ?? 1);
      return { code: weaponFocus ? `${cha + weaponFocus.power}${weaponFocus.level}` : `${cha}M`, basis: 'charisma', label: '' };
    },
  },
  {
    id:     'dual-beings-resist-astral-with-willpower',
    suite:  'astral-soak',
    ...ACTOR, method: 'astralResistPool',
    was:    'SR3 p.175 - "Willpower or Force for astral beings, or Body for dual beings". The astral '
          + 'soak card offered Willpower to everyone until 0.6.2 (TODO 132)',
    impl:   ({ attributes = {} } = {}) => ({ key: 'willpower', label: 'Willpower',
      value: Math.max(attributes?.willpower?.value ?? 0, attributes?.willpower?.base ?? 0, 1), combatPool: false }),
  },
  {
    id:     'new-weapons-arrive-in-hand',
    suite:  'ready-weapon',
    ...READY, method: 'putAwayOnCreate',
    was:    'every weapon created on a character read as ready (the field\'s initial true), so new characters '
          + 'started with their whole kit, grenades included, in hand (TODO 135/136)',
    impl:   () => false,
  },
  {
    id:     'healing-ignores-scene-tokens',
    suite:  'healing',
    ...HEAL, method: 'patientsFor',
    was:    'the healing picker listed world actors only, so a downed NPC — an unlinked token whose base actor '
          + 'is a compendium template — could not be picked at all (TODO 207)',
    impl:   (user, actors) => actors.filter(a => (a.type === 'character' || a.type === 'npc') && game.sr3e.isLiveActor(a)
      && (user.isGM || a.isOwner || game.sr3e.SR3EQuery.isPlayerCharacter(a) || a.testUserPermission?.(user, 1))),
  },
  {
    id:     'phase-key-ignores-the-pass',
    suite:  'action-economy',
    module: '../scripts/data/action-economy.mjs', klass: 'ActionEconomy', method: 'phaseKey',
    was:    'the phase key was round|turn only, and a second Initiative Pass is the same combatant in the same '
          + 'round, so it showed the first pass\'s two Simple Actions as already taken (TODO 206)',
    impl:   (round, turn) => `${Number(round) || 0}|${Number(turn) || 0}`,
  },
  {
    id:     'thrown-only-by-listed-code',
    suite:  'grenade-skill',
    ...ITEM, method: 'weaponSkillFor',
    was:    'a projectile reached Throwing Weapons only through a listed thrown code, so a grenade with a blank '
          + 'category or an "(AP)" in its name asked for a firearm skill — SR3 p.86: Throwing Weapons governs '
          + '"any item thrown by the user" (TODO 210)',
    impl:   function (code, type) {   // a function, not an arrow: called through the class, `this` is SR3EItem
      const m = this.WEAPON_SKILL_MAP[code];
      if (code && m) return m.skill;
      if (type === 'thrown' || (type === 'projectile' && ['TK', 'SH', 'Imp', 'Ctrp', 'GR', 'BOL', 'THR', 'other'].includes(code ?? ''))) return 'Throwing Weapons';
      if (type === 'firearm') return 'Firearms';
      return 'Firearms';
    },
  },
  /* ── The Karma Pool and Good Karma · SR3 p.168, p.180, p.190, p.246-248 (the audit of 2026-10-11) ── */
  {
    id:     'karma-spend-lowers-the-pool',
    suite:  'karma-uses',
    ...KARMA, method: 'spend',
    was:    'a Karma Pool spend lowered `karmaPool` itself (the only re-roll code did `karmaPool - amount`), so a '
          + 'spent point never came back — SR3 p.246: spent pools refresh; only BURNED points are gone for ever',
    impl:   (sys, n) => ({ update: { karmaPool: Math.max(0, (sys?.karmaPool ?? 0) - n) }, over: false }),
  },
  {
    id:     'karma-reroll-flat-price',
    suite:  'karma-uses',
    ...KARMA, method: 'rerollCost',
    was:    'the old re-roll charged a flat point (per die) — SR3 p.246: "1 Karma Pool die to re-roll failures '
          + 'once, 2 Karma Pool dice (for a total of 3) to re-roll failures again"',
    impl:   () => 1,
  },
  {
    id:     'karma-reroll-an-oops-roll',
    suite:  'karma-uses',
    ...KARMA, method: 'options',
    was:    'a plausible misreading: re-rolling a Rule of One — SR3 p.246: "A player may not spend additional '
          + 'Karma to re-roll failed dice on an \'oops\' roll"',
    impl:   ({ successes, failures, glitch }) => ({ reroll: failures > 0, avoidDisaster: !!glitch, buySuccesses: successes > 0 }),
  },
  {
    id:     'karma-extra-dice-flat-price',
    suite:  'karma-uses',
    ...KARMA, method: 'extraDiceCost',
    was:    'a plausible misreading: a point a die — SR3 p.246 prices them incrementally ("2 more Karma Pool for '
          + 'a second die, 3 more Karma Pool for a third")',
    impl:   (n) => Math.max(0, n | 0),
  },
  {
    id:     'hooper-nelson-no-floor',
    suite:  'karma-uses',
    ...KARMA, method: 'hooperNelson',
    was:    'a plausible misreading: no floor — SR3 p.248: "The lowest a target number can be reduced to using '
          + 'this option is 8"',
    impl:   (tn, burn) => ({ tn: tn - burn, burned: burn, recommended: tn >= 12 }),
  },
  {
    id:     'weapon-focus-ignores-reach',
    suite:  'karma-uses',
    ...GOODKARMA, method: 'bondingCost',
    was:    'a plausible misreading: a weapon focus at 3 × Force — the Focus Bonding Table (SR3 p.190) says '
          + '"(3 + Weapon Reach) x Force"',
    impl:   (key, force) => {
      const per = { specific: 1, category: 3, spirit: 2, power: 5, sustaining: 1, expendable: 0, weapon: 3 }[key];
      return per === undefined || !(force > 0) ? null : per * force;
    },
  },
  {
    id:     'spec-ceiling-without-the-exception',
    suite:  'karma-uses',
    ...GOODKARMA, method: 'specCeiling',
    was:    'a plausible misreading: twice the base, always — SR3 p.84 excepts "a Rating 1 base skill with a '
          + 'Rating 3 specialization"',
    impl:   (b) => 2 * Math.max(0, b | 0),
  },
  {
    id:     'limited-spell-drains-at-full-force',
    suite:  'spell-limits',
    ...SPELLLIMITS, method: 'drainForce',
    was:    'the shipped behaviour (TODO 223): a limit could only be taken off the learning cost, so a Force 8 Fireball '
          + 'with the exclusive limit still drained as Force 8 and was Physical at Magic 6 — SR3 p.180: the limit may '
          + '"reduce the Force of a spell for purposes of Drain"',
    impl:   (force) => Math.max(0, Math.floor(Number(force) || 0)),
  },
  {
    id:     'limit-off-the-cost-also-cuts-drain',
    suite:  'spell-limits',
    ...SPELLLIMITS, method: 'drainForce',
    was:    'a plausible misreading: a limit lowers BOTH Drain and the learning cost — p.180: it is "either … or", '
          + '"the player chooses which when the spell is learned"',
    impl:   (force, spell) => Math.max(0, Math.floor(Number(force) || 0)
      - (spell?.system?.limitFetish ? 1 : 0) - (spell?.system?.limitExclusive ? 2 : 0)),
  },
  {
    id:     'patients-hostile-above-players',
    suite:  'patient-order',
    ...PORDER, method: 'tier',
    was:    'a hostile token outranked the party: a player character on a hostile-disposition token sank to the bottom '
          + '(TODO 208 asks for players first, hostile NPCs last)',
    impl:   ({ isPlayer = false, hostile = false } = {}) => (hostile ? 2 : isPlayer ? 0 : 1),
  },
  {
    id:     'patients-hostile-not-last',
    suite:  'patient-order',
    ...PORDER, method: 'tier',
    was:    'hostile NPCs sorted with the other NPCs instead of at the bottom (TODO 208)',
    impl:   ({ isPlayer = false } = {}) => (isPlayer ? 0 : 1),
  },
  {
    id:     'patients-hostile-dropped',
    suite:  'patient-order',
    ...PORDER, method: 'order',
    was:    'hostile NPCs were filtered out of the list instead of listed last — "every actor stays in the list" (TODO 208)',
    impl:   function (entries) { return [...entries].filter(e => !e.hostile).sort((a, b) => this.tier(a) - this.tier(b)); },
  },
  {
    id:     'gear-search-any-word',
    suite:  'gear-search',
    ...GSEARCH, method: 'matches',
    was:    'a search matched on ANY word, so "ares viper" listed every Ares item (TODO 154 wants a narrowing search)',
    impl:   function (entry, query) {
      const words = this.tokens(query);
      const name = String(entry?.name ?? '').toLowerCase();
      return words.some(w => name.includes(w));
    },
  },
  {
    id:     'gear-drop-from-switched-off-book-is-silent',
    suite:  'gear-search',
    ...GSEARCH, method: 'dropWarnings',
    was:    'a drop from a switched-off book fills the form with no word said (2026-10-17 ruling: warn, but fill anyway)',
    impl:   function ({ name = 'That item', type = '' } = {}, buyable) {
      return this.isBuyable(type, buyable) ? [] : [`${name} is a ${type}, which is not normally bought here — filled in anyway.`];
    },
  },
  {
    id:     'gear-drop-of-unbuyable-type-is-silent',
    suite:  'gear-search',
    ...GSEARCH, method: 'dropWarnings',
    was:    'a drop of a spell or skill fills the form with no word said (2026-10-17 ruling: warn naming why, but fill anyway)',
    impl:   ({ name = 'That item', packAllowed = true } = {}) =>
      packAllowed ? [] : [`${name} is from a book that is switched off (Configure Source Books) — filled in anyway.`],
  },
  {
    id:     'gear-search-blank-lists-everything',
    suite:  'gear-search',
    ...GSEARCH, method: 'matches',
    was:    'a blank query matched every item, drawing thousands of rows the moment the dialog opened',
    impl:   function (entry, query) {
      const name = String(entry?.name ?? '').toLowerCase();
      return this.tokens(query).every(w => name.includes(w));
    },
  },
  {
    id:     'gear-search-ignores-the-type-filter',
    suite:  'gear-search',
    ...GSEARCH, method: 'search',
    was:    'the search listed spells, skills and contacts from a mixed pack — things the dialog cannot buy',
    impl:   function (entries, query, { limit = this.MAX_HITS } = {}) {
      return (entries ?? []).filter(e => this.matches(e, query)).slice(0, limit);
    },
  },
  {
    id:     'gear-search-unranked',
    suite:  'gear-search',
    ...GSEARCH, method: 'rank',
    was:    'every hit ranked alike, so typing "jacket" listed "Trench Jacket Liner" above "Jacket"',
    impl:   () => 0,
  },
  {
    id:     'karma-lock-strips-flat-keys-only',
    suite:  'gm-only-fields',
    ...GMONLY, method: 'strip',
    was:    'a plausible slip (TODO 218): the submit strip deleted `data["system.karma"]` but Foundry hands '
          + '_prepareSubmitData the EXPANDED form (`{ system: { karma } }`), so a player sheet submit still wrote Karma Pool',
    impl:   (data, isGM) => {
      if (isGM || !data) return data;
      const out = JSON.parse(JSON.stringify(data));
      for (const k of ['system.karma', 'system.totalKarma', 'system.karmaPool', 'system.karmaPoolSpent']) delete out[k];
      return out;
    },
  },
  {
    id:     'willing-damaging-spell-skips-resistance',
    suite:  'willing-target',
    ...WILLING, method: 'canBeWilling',
    was:    'a plausible misreading (TODO 191): any spell may be cast on a willing subject, so a ticked Manabolt on a '
          + 'friend deals its damage with no Resistance Test — p.183 waives the test for "the spell\'s description" '
          + 'effect, and a Combat spell is meant to hurt; an Elemental one is a Damage Resistance Test',
    impl:   () => true,
  },
  {
    id:     'willing-target-still-offered-a-resist-button',
    suite:  'willing-target',
    ...WILLING, method: 'resolvesUnresisted',
    was:    'the shipped behaviour before TODO 191: every cast on a willing ally ran the attack flow and offered a '
          + 'Resist Spell — SR3 p.183: "unless the target of the spell is willing"',
    impl:   () => false,
  },
  {
    id:     'willing-elemental-skips-damage-resistance',
    suite:  'willing-target',
    ...WILLING, method: 'resolvesUnresisted',
    was:    'a willing tick honoured on an elemental cast (p.183: its Resistance Test is a Damage Resistance Test)',
    impl:   (sc, id) => Array.isArray(sc?.willingTargetIds) && sc.willingTargetIds.includes(id),
  },
  {
    id:     'willing-everyone-defaults-ticked',
    suite:  'willing-target',
    ...WILLING, method: 'defaultWilling',
    was:    'a default that ticks every target: a hostile NPC would be pre-marked willing and skip its resistance',
    impl:   () => true,
  },
  {
    id:     'willing-carries-unknown-ids',
    suite:  'willing-target',
    ...WILLING, method: 'carriedIds',
    was:    'carrying whatever the dialog sent, including ids that are not targets of the cast, and on damaging spells',
    impl:   (_c, _ids, ticked) => [...(ticked ?? [])],
  },
  {
    id:     'cloud-ignores-walls',
    suite:  'area-cloud',
    ...AREASHAPE, method: 'clipCircle',
    was:    'the shipped behaviour (TODO 155): a smoke or gas marker is always the full circle, through every wall — '
          + 'the cloud of SR3 p.283 does not pass a wall (TODO 164)',
    impl:   () => null,
  },
  {
    id:     'cloud-clip-is-the-full-ring-as-a-polygon',
    suite:  'area-cloud',
    ...AREASHAPE, method: 'clipCircle',
    was:    'a clip that returns the unclipped ring as a polygon: it looks clipped (a polygon Region) but still crosses walls',
    impl:   (center, radius) => {
      const out = [];
      for (let i = 0; i < 48; i++) { const a = (2 * Math.PI * i) / 48; out.push(center.x + Math.cos(a) * radius, center.y + Math.sin(a) * radius); }
      return out;
    },
  },
  {
    id:     'karma-lock-only-karma-pool',
    suite:  'gm-only-fields',
    ...GMONLY, method: 'canEdit',
    was:    'locking the Karma Pool but leaving Good Karma and Total Karma typeable — the maintainer decided all three (TODO 218)',
    impl:   (path, isGM) => !!isGM || !['system.karmaPool', 'system.karmaPoolSpent'].includes(String(path)),
  },
  {
    id:     'combat-pool-gyro-rounds-up',
    suite:  'combat-pool',
    ...CPOOL, method: 'figure',
    was:    'a plausible slip (TODO 213): halving the pool with Math.ceil — the book (SR3 p.282) says "half", this system rounds '
          + 'down, and the reported 5-dice pool is 2, not 3',
    impl:   ({ base = 0, mod = 0, sense = 0, armour = 0, gyro = false } = {}) => {
      const full = Math.max(0, base + mod + sense - armour);
      return { full, total: gyro ? Math.ceil(full / 2) : full };
    },
  },
  {
    id:     'combat-pool-gyro-halves-the-base-only',
    suite:  'combat-pool',
    ...CPOOL, method: 'figure',
    was:    'halving only the (Q+I+W)/2 base and then adding Combat Sense, the modifier and armour — the gyro halves the whole pool '
          + '"after everything else" (SR3 p.282, TODO 18)',
    impl:   ({ base = 0, mod = 0, sense = 0, armour = 0, gyro = false } = {}) => {
      const full = Math.max(0, base + mod + sense - armour);
      return { full, total: Math.max(0, (gyro ? Math.floor(base / 2) : base) + mod + sense - armour) };
    },
  },
  {
    id:     'combat-pool-modfortotal-ignores-gyro',
    suite:  'combat-pool',
    ...CPOOL, method: 'modForTotal',
    was:    'TODO 225: typing a total under a worn gyro stored total − rest, as if the pool were not halved — base 5, typed 4 '
          + 'stored +2 and the pool read 3 (SR3 p.282)',
    impl:   ({ rest = 0, total = 0 } = {}) => {
      const want = Math.max(0, Math.round(Number(total) || 0));
      return { mod: want - rest, total: want, exact: true };
    },
  },
  {
    id:     'combat-pool-breakdown-omits-armour',
    suite:  'combat-pool',
    ...CPOOL, method: 'breakdown', needsOriginal: '_breakdownOriginal',
    was:    'the sheet showed the gyro but the armour penalty (SR3 p.285) stayed as invisible as before (TODO 213)',
    impl:   function (p = {}) {
      return this._breakdownOriginal({ ...p, armour: 0 });
    },
  },
  {
    id:     'funds-gift-creates-nuyen',
    suite:  'funds',
    ...FUNDS, method: 'give',
    was:    'a plausible slip (TODO 192): crediting the recipient the amount ASKED when the payer was short, so a gift of '
          + '¥500 from a payer holding ¥300 made ¥200 out of nothing — what arrives must be what left (and since the '
          + '2026-10-17 ruling a gift over the balance is blocked outright)',
    impl:   (payerHave, recipientHave, amount) => {
      const have = Math.max(0, Math.floor(payerHave)), n = Math.max(0, Math.floor(amount)), moved = Math.min(have, n);
      return { ok: true, reason: '', amount: n, moved, payerFrom: have, payerTo: have - moved,
        recipientFrom: recipientHave, recipientTo: recipientHave + n };
    },
  },
  {
    id:     'funds-gift-pays-what-you-have',
    suite:  'funds',
    ...FUNDS, method: 'give',
    was:    'the OLD shortfall behaviour for gifts (TODO 192, replaced 2026-10-17): a gift larger than the balance goes through '
          + 'trimmed to what the payer has. The maintainer ruled it is BLOCKED: you cannot give more than you have',
    impl:   (payerHave, recipientHave, amount) => {
      const have = Math.max(0, Math.floor(payerHave)), n = Math.max(0, Math.floor(Number(amount) || 0)), moved = Math.min(have, n);
      return { ok: moved > 0, reason: '', amount: moved, moved, payerFrom: have, payerTo: have - moved,
        recipientFrom: recipientHave, recipientTo: recipientHave + moved };
    },
  },
  {
    id:     'funds-gift-negative-allowed',
    suite:  'funds',
    ...FUNDS, method: 'validateGift',
    was:    'a negative gift accepted (2026-10-17 ruling): "giving" -¥50 takes nuyen from the recipient',
    impl:   (raw, payerHave) => {
      const n = Math.trunc(Number(String(raw).replace(/[¥,\s]/g, '')));
      return Number.isFinite(n) && n <= Math.max(0, payerHave) ? { ok: true, amount: n, reason: '' } : { ok: false, amount: 0, reason: 'no' };
    },
  },
  {
    id:     'funds-gift-fraction-floored',
    suite:  'funds',
    ...FUNDS, method: 'validateGift',
    was:    'a fractional gift quietly floored (2026-10-17 ruling: non-integer amounts are blocked, not rounded)',
    impl:   (raw, payerHave) => {
      const n = Math.floor(Number(String(raw).replace(/[¥,\s]/g, '')));
      return n > 0 && n <= Math.max(0, payerHave) ? { ok: true, amount: n, reason: '' } : { ok: false, amount: 0, reason: 'no' };
    },
  },
  {
    id:     'funds-gift-to-non-player',
    suite:  'funds',
    ...FUNDS, method: 'giftParties',
    was:    'a gift to (or from) a non-player character allowed (2026-10-17 ruling: gifts are between player characters only)',
    impl:   (payer, recipient) => ({ ok: !!payer && !!recipient && payer.id !== recipient.id, reason: '' }),
  },
  {
    id:     'funds-recipients-include-non-players',
    suite:  'funds',
    ...FUNDS, method: 'recipients',
    was:    'the Give list showing every live character instead of only player characters (2026-10-17 ruling)',
    impl:   (actors, payerId, isLive = () => true) => [...(actors ?? [])]
      .filter(a => a && a.id !== payerId && a.type === 'character' && isLive(a))
      .map(a => ({ id: a.id, name: String(a.name ?? '') })).sort((a, b) => a.name.localeCompare(b.name)),
  },
  {
    id:     'funds-subtract-goes-negative',
    suite:  'funds',
    ...FUNDS, method: 'change',
    was:    'taking away more than the balance went below zero — `system.nuyen` has a floor of 0, so the write is rejected '
          + 'rather than warned about (TODO 192)',
    impl:   (have, amount, mode) => {
      const from = Number(have) || 0, n = Number(amount) || 0;
      return mode === 'add' ? { from, to: from + n, delta: n, short: false, shortBy: 0 }
        : { from, to: from - n, delta: -n, short: n > from, shortBy: Math.max(0, n - from) };
    },
  },
  {
    id:     'funds-short-is-silent',
    suite:  'funds',
    ...FUNDS, method: 'change', needsOriginal: '_changeOriginal',
    was:    'a shortfall clamped to 0 without saying so — the rule is warn, never refuse, and a silent clamp is neither (TODO 192)',
    impl:   function (have, amount, mode) { return { ...this._changeOriginal(have, amount, mode), short: false, shortBy: 0 }; },
  },
  {
    id:     'cloud-hole-counts-as-inside',
    suite:  'area-cloud',
    ...AREASHAPE, method: 'contains',
    was:    'membership that ignores holes: a token in a hole of the cloud is still offered the smoke modifier',
    impl:   function (shapes, pt) { return (shapes ?? []).some(s => !s?.hole && this.inShape(s, pt)); },
  },
  {
    id:     'infra-red-smoke-is-plain-smoke',
    suite:  'area-cloud',
    ...AREAEFFECT, method: 'kind',
    was:    'infra-red smoke treated as ordinary smoke: same look, and thermographic vision is never blinded '
          + '(SR3 p.283: "Infra-red smoke contains hot particles that obscure thermographic vision")',
    impl:   (name) => {
      const n = String(name ?? '');
      if (/smoke/i.test(n)) return 'smoke';
      if (/gas|neuro|nerve/i.test(n)) return 'gas';
      return /flash/i.test(n) ? 'flash' : '';
    },
  },
  {
    id:     'ir-smoke-offers-heavy-smoke-row',
    suite:  'area-cloud',
    ...AREAEFFECT, method: 'visibilityCondition',
    was:    'infra-red smoke offered the ordinary Heavy Smoke row, so a thermographic viewer sees almost nothing wrong '
          + '(+1/0) — the p.112 table has a Thermal Smoke row (+8/+6) for exactly this',
    impl:   (kind) => (kind === 'smoke' || kind === 'irsmoke' ? 'Heavy Smoke/Fog/Rain' : null),
  },
  {
    id:     'smoke-offers-the-lowest-row',
    suite:  'area-cloud',
    ...AREAEFFECT, method: 'pickCondition',
    was:    'of several clouds, the row with the LOWEST modifier is offered instead of the worst for the viewer',
    impl:   (kinds, modOf) => {
      let best = null, m = Infinity;
      for (const k of kinds ?? []) {
        const c = ({ smoke: 'Heavy Smoke/Fog/Rain', irsmoke: 'Thermal Smoke' })[k];
        if (c && (Number(modOf?.(c)) || 0) < m) { best = c; m = Number(modOf?.(c)) || 0; }
      }
      return best;
    },
  },
  {
    id:     'wind-cannot-shorten',
    suite:  'area-cloud',
    ...AREAEFFECT, method: 'shiftExpiry',
    was:    'the shipped behaviour (TODO 155): a fixed two Combat Turns the GM cannot change — p.283 "less in windy areas, '
          + 'at the gamemaster\'s discretion"',
    impl:   (expires, _d, round) => ({ expires, remaining: Number.isFinite(expires) ? Math.max(0, expires - round) : null, ended: false }),
  },
  {
    id:     'wind-leaves-a-cloud-with-no-turns-left',
    suite:  'area-cloud',
    ...AREAEFFECT, method: 'shiftExpiry',
    was:    'a shortened cloud that reaches 0 Combat Turns is not marked ended and lingers',
    impl:   (expires, delta, round) => {
      const next = (Number.isFinite(expires) ? expires : round) + Math.trunc(delta);
      return { expires: next, remaining: Math.max(0, next - round), ended: false };
    },
  },
  {
    id:     'gas-card-silent-on-the-vii-viii-split',
    suite:  'area-cloud',
    ...AREAEFFECT, method: 'gasToxin',
    was:    'the card quietly uses VIII for an older copy still named VII (the p.283 table row prints VII; p.250/p.283 text say VIII) '
          + 'and the discrepancy should be NOTED on that card, not picked silently',
    impl:   () => ({ name: 'Neuro-Stun VIII', damage: '6S', speed: 'the end of the following Combat Turn', disorientation: 2, labelled: '', discrepancy: '' }),
  },
  {
    id:     'gas-forgets-the-disorientation',
    suite:  'area-cloud',
    ...AREAEFFECT, method: 'gasToxin',
    was:    'the toxin card omits the +2 disorientation that follows even a resisted dose (SR3 p.250)',
    impl:   () => ({ name: 'Neuro-Stun VIII', damage: '6S', speed: 'the end of the following Combat Turn', disorientation: 0, labelled: 'VII', discrepancy: 'p.250 VIII' }),
  },
  {
    id:     'flare-compensation-changes-nothing',
    suite:  'area-cloud',
    ...AREAEFFECT, method: 'flashMods',
    was:    'a Flash-Pak that hits flare-compensated eyes for the full +4 (SR3 p.283: "+2 if the target has flare compensation")',
    impl:   (flare) => ({ facing: 4, strobe: 2, total: 6, flare: !!flare }),
  },
  {
    id:     'flash-forgets-the-strobe',
    suite:  'area-cloud',
    ...AREAEFFECT, method: 'flashMods',
    was:    'the card states only the +4 / +2 and drops the pak\'s own +2 for the strobing flashes (SR3 p.283)',
    impl:   (flare) => { const facing = flare ? 2 : 4; return { facing, strobe: 0, total: facing, flare: !!flare }; },
  },
  {
    id:     'pack-fix-overwrites-a-gm-edit',
    suite:  'pack-corrections-070',
    ...PACKFIX, method: 'fixItem', needsOriginal: '_fixItemOriginal',
    was:    'the 0.7.0 data migration set the Sap to (STR+2)M Stun whatever it held, overwriting a GM edit of the damage code '
          + 'instead of correcting only the old shipped value (SR3 p.275)',
    impl:   function (item) {
      if (item?.type === 'melee' && item?.name === 'Sap') return { 'system.damage': '(STR+2)M Stun' };
      return this._fixItemOriginal(item);
    },
  },
  {
    id:     'pack-fix-hits-every-4m-bow',
    suite:  'pack-corrections-070',
    ...PACKFIX, method: 'fixItem', needsOriginal: '_fixItemOriginal',
    was:    'the bow migration matched on the shared name "Standard Bow" and damage 4M alone, so the Str Min 2 bow '
          + '(4M by the formula) became 5M too (SR3 p.276: damage is (Str Min + 2)M)',
    impl:   function (item) {
      if (item?.name === 'Standard Bow' && item?.system?.damage === '4M') return { 'system.damage': '5M' };
      return this._fixItemOriginal(item);
    },
  },
  {
    id:     'pack-fix-gives-every-core-medkit-rating-5',
    suite:  'pack-corrections-070',
    ...PACKFIX, method: 'fixItem', needsOriginal: '_fixItemOriginal',
    was:    'the DocWagon medkit migration matched any Rating 3 core Medkit, upgrading every runner medkit '
          + 'to Rating 5 (MJLBB p.65 gives the DocWagon Paramedic alone "medkit 5")',
    impl:   function (item) {
      if (item?.type === 'medical' && item?.name === 'Medkit' && String(item.system?.rating) === '3') {
        return { name: 'Medkit [Rating 5]', 'system.rating': '5', 'system.weight': '5', 'system.cost': 280,
          'system.availability': '4/24hrs', 'system.bookPage': 'mm.138' };
      }
      return this._fixItemOriginal(item);
    },
  },
  {
    id:     'pack-fix-leaves-the-dalmation-misspelt',
    suite:  'pack-corrections-070',
    ...PACKFIX, method: 'fixActor', needsOriginal: '_fixActorOriginal',
    was:    'a world copy of the misspelt "Cyberspace Designs Dalmation" kept its name and its 15,800¥ / Speed 108 numbers '
          + 'after the duplicate left the pack (SR3 p.312 prints one Dalmatian: 16,000¥, Speed 105)',
    impl:   function (actor) {
      if (actor?.name === 'Cyberspace Designs Dalmation') return null;
      return this._fixActorOriginal(actor);
    },
  },
  {
    id:     'pack-fix-overwrites-a-gm-set-recoil-comp',
    suite:  'pack-corrections-070',
    ...PACKFIX, method: 'fixItem', needsOriginal: '_fixItemOriginal',
    was:    'the Recoil Compensation migration set the weapon\x27s RC whatever it held, wiping a GM\x27s own recoilMod, and matched a '
          + 'same-named non-core item (SR3 pp.278-279 give the core HK227 RC 2(3))',
    impl:   function (item) {
      if (item?.type === 'firearm' && item?.name === 'Heckler & Koch HK227') return { 'system.recoilMod': 2 };
      return this._fixItemOriginal(item);
    },
  },
  {
    id:     'willing-combat-spell-never-offered',
    suite:  'willing-target',
    ...WILLING, method: 'canBeWilling',
    was:    'the pre-ruling behaviour: a Combat spell could never be cast on a willing subject, so a Manabolt on a consenting target still had to be resisted (SR3 p.183: "unless the target of the spell is willing"; the maintainer ruled Combat allowed, Elemental not)',
    impl:   c => !/^\s*(combat|elemental)\s*$/i.test(String(c ?? '')),
  },
  {
    id:     'willing-combat-defaults-ticked',
    suite:  'willing-target',
    ...WILLING, method: 'defaultsToUnwilling',
    was:    'a Combat spell pre-ticks the caster and allies as willing: a Manabolt at a party member would skip its Resistance Test unless someone unticked it',
    impl:   () => false,
  },
  {
    id:     'willing-vehicle-resists-a-spell',
    suite:  'willing-target',
    ...WILLING, method: 'isNonLiving',
    was:    'a vehicle was handed a Resist Spell button (SR3 p.183: only "living targets" make a Spell Resistance Test)',
    impl:   () => false,
  },
  {
    id:     'spell-heal-tn-ignores-essence',
    suite:  'spell-target',
    ...SPELLTN, method: 'essenceTN',
    was:    'Heal, Treat and Decrease Attribute (Target "10-E") fell to the Mana fallback and were cast at the target Willpower instead of 10 - Essence (SR3 p.193)',
    impl:   () => 4,
  },
  {
    id:     'spell-detect-ignores-the-table',
    suite:  'spell-target',
    ...SPELLTN, method: 'detectionTN',
    was:    'Detection spells (Target "DT") were cast at the target Willpower instead of the Detection Spell Target Number table (SR3 p.192)',
    impl:   () => 4,
  },
  {
    id:     'spell-detect-barrier-adds-nothing',
    suite:  'spell-target',
    ...SPELLTN, method: 'detectionTN', needsOriginal: '_detectionTNOriginal',
    was:    'a target behind an astral barrier cost no extra (the table says "+ Force", SR3 p.192)',
    impl:   function (row, force) { return this._detectionTNOriginal(row, force, false); },
  },
  {
    id:     'spell-object-resistance-flat',
    suite:  'spell-target',
    ...SPELLTN, method: 'objectTN',
    was:    'Analyze Device (Target "OR") was one flat number whatever the material, not the Object Resistance Table 3/5/8/10 (SR3 p.182)',
    impl:   () => 5,
  },
  {
    id:     'spell-stabilize-ignores-minutes',
    suite:  'spell-target',
    ...SPELLTN, method: 'stabilizeTN',
    was:    'Stabilize was cast at a flat 4: the minutes since the Deadly damage add to the TN (SR3 p.194)',
    impl:   () => 4,
  },
  {
    id:     'spell-fling-flat-short-range',
    suite:  'spell-target',
    ...SPELLTN, method: 'flingTN',
    was:    'Fling ignored the range band: "Treat the Sorcery Test as a normal Ranged Combat Test" (SR3 p.197) is 4/5/6/9 by range',
    impl:   () => 4,
  },
  {
    id:     'fling-damage-ignores-the-thrown-weapon',
    suite:  'fling',
    ...FLING, method: 'damage',
    was:    'a flung throwing weapon did Force + a level instead of its own Damage Code at Strength = Force (SR3 p.117, p.197)',
    impl:   ({ force = 1 } = {}) => ({ base: { power: force, level: 'M', isStun: false }, raw: force + 'M', source: '', gmCall: false }),
  },
  {
    id:     'fling-range-ignores-force',
    suite:  'fling',
    ...FLING, method: 'bands',
    was:    'a flung throwing weapon used its range at Strength 1, not the spell effective Strength = Force (SR3 p.197)',
    impl:   (mults) => (Array.isArray(mults) && mults.length >= 4 ? mults.slice(0, 4) : null),
  },
  {
    id:     'spell-increase-attribute-reads-willpower',
    suite:  'spell-target',
    ...SPELLTN, method: 'attributeOf',
    was:    'Increase Attribute (Target "Att") was cast at Willpower, not "the Attribute to be increased" (SR3 p.194)',
    impl:   () => ['willpower', 'Willpower'],
  },
  {
    id:     'spell-unknown-token-says-nothing',
    suite:  'spell-target',
    ...SPELLTN, method: 'resolve', needsOriginal: '_resolveOriginal',
    was:    'a Target code the system cannot read fell back to Willpower silently, with no note on the card that the GM should check the TN',
    impl:   function (a) { return { ...this._resolveOriginal(a), check: false, source: 'target Willpower' }; },
  },
  {
    id:     'spell-toxin-token-unread',
    suite:  'spell-target',
    ...SPELLTN, method: 'kind', needsOriginal: '_kindOriginal',
    was:    'Antidote and Detox (Target "TOX") were not recognised, so the toxin Strength was never asked for (SR3 p.193)',
    impl:   function (tok, name) { return /^TOX/i.test(String(tok)) ? 'unknown' : this._kindOriginal(tok, name); },
  },
  {
    id:     'bow-range-from-archer-strength',
    suite:  'range-bands',
    ...RANGEB, method: 'rangeStrength',
    was:    "a bow's and crossbow's range multiplied the ARCHER's Strength; SR3 p.110/p.118 use the weapon's Strength Minimum",
    impl:   (_cat, _min, str) => Math.max(1, Number(str) || 1),
  },
  {
    id:     'assault-cannon-not-heavy',
    suite:  'range-bands',
    ...RANGEB, method: 'isHeavyWeapon',
    was:    'the Assault Cannon did not double uncompensated recoil; SR3 p.111 names "all Assault Cannons" as Heavy Weapons',
    impl:   c => ['LMG', 'MMG', 'HMG', 'MinG'].includes(c ?? ''),
  },
  {
    id:     'minimum-range-never-warns',
    suite:  'range-bands',
    ...RANGEB, method: 'minimumRangeWarning',
    was:    "nothing read the Weapon Range Table's minimum-range asterisk (grenade launcher 5 m, missile launcher 20 m, SR3 p.111)",
    impl:   () => '',
  },
  {
    id:     'apds-halves-vehicle-armor',
    suite:  'apds',
    ...APDSM, method: 'resolve',
    was:    "APDS halved a vehicle's or drone's Armor; SR3 p.116 treats it as normal ammunition against vehicles and drones",
    impl:   b => { const h = Math.floor((Number(b) || 0) / 2); return { ballistic: h, halved: true, note: 'APDS' }; },
  },
  {
    id:     'explosive-never-misfires',
    suite:  'misfire',
    ...MISFIRE, method: 'applies',
    was:    "an explosive round never misfired when every attack die came up 1 (SR3 p.116)",
    impl:   () => false,
  },
  {
    id:     'misfire-resisted-with-pool',
    suite:  'misfire',
    ...MISFIRE, method: 'payload', needsOriginal: '_payloadOriginal',
    was:    "the misfire would be resisted with Combat Pool; SR3 p.116 says without",
    impl:   function (o) { const p = this._payloadOriginal(o); return p && { ...p, noPools: false }; },
  },
  {
    id:     'magic-loss-two-not-automatic',
    suite:  'magic-loss',
    ...MAGICLOSS, method: 'lost',
    was:    'a Magic Loss check that was only "2D6 at or below Magic"; SR3 p.160: "A roll of 2 always indicates the loss of a Magic point"',
    impl:   (roll, magic) => (Number(roll) || 0) <= (Number(magic) || 0),
  },
  {
    id:     'adept-level-ignores-fixed-level-names',
    suite:  'adept-levels',
    ...ADEPTLEVELS, method: 'levelOf',
    was:    'the Magic cap read the level of a power only from system.level (hasLevels), so Imp. Reflexes Level 3 / Combat Sense +3 were never checked against Magic (SR3 p.168)',
    impl:   (_name, system = {}) => (system?.hasLevels ? Math.max(1, Math.trunc(Number(system.level) || 1)) : 1),
  },
  {
    id:     'collapsed-adept-power-is-level-one',
    suite:  'adept-levels',
    ...ADEPTLEVELS, method: 'levelOf',
    was:    'the name-only reading before 2026-10-25: a collapsed fixed-level power ("Imp. Reflexes [3]", level 3 in system.level) '
          + 'has no trailing number, so it fell to 1 and an Improved Reflexes 3 on a Magic 2 adept went unwarned (SR3 p.168)',
    impl:   (name, system = {}) => {
      if (system?.hasLevels) return Math.max(1, Math.trunc(Number(system.level) || 1));
      const m = /(?:\s|\+)(\d+)\s*$/.exec(String(name ?? ''));
      return m ? Math.max(1, Number(m[1])) : 1;
    },
  },
  {
    id:     'mp-memory-is-not-a-level',
    suite:  'mod-ratings',
    ...MODRATE, method: 'splitName',
    was:    'shipped through 0.8.0 (reported 2026-10-25): only "[N]" / "Rating N" was a level, so "Pocket Computer (250Mp)" and '
          + 'the rest of the memory, ECCM, Jukebox and adept-power families stayed one document per level',
    impl:   (name) => {
      const m = /^(.*?)\s*(?:\b(?:Rating|Lvl|Lv)\s*)?\[(\d+)\](?:\s+\d+)?\s*$/.exec(String(name ?? '')) ?? /^(.*?)\s+(?:Rating|Lvl|Lv)\s+(\d+)\s*$/.exec(String(name ?? ''));
      return m && m[1].trim() ? { stem: m[1].replace(/\s+/g, ' ').trim(), rating: Number(m[2]) } : null;
    },
  },
  {
    id:     'astral-initiative-ignores-initiate-grade',
    suite:  'initiate-astral',
    ...INITASTRAL, method: 'initiativeBase',
    was:    'the astral Initiative of Intelligence + 20 with no grade term; MitS p.58: a bonus to Astral Reaction equal to the grade',
    impl:   (intelligence, _grade) => (Number(intelligence) || 0) + 20,
  },
  {
    id:     'initiate-pool-allowed-on-magical-skills',
    suite:  'initiate-astral',
    ...INITASTRAL, method: 'allowedOnSkill',
    was:    'letting Initiate Astral Pool dice onto a Magical Skill Test; MitS p.58 excludes them',
    impl:   () => true,
  },
  {
    id:     'initiate-pool-for-everyone',
    suite:  'initiate-astral',
    ...INITASTRAL, method: 'pool',
    was:    'giving every Awakened character an Initiate Astral Pool (0 dice) instead of none; only initiates have one (MitS p.58)',
    impl:   (grade, mod = 0) => Math.max(0, (Number(grade) || 0) + (Number(mod) || 0)),
  },
  {
    id:     'shock-stun-soak-ignores-the-stun',
    suite:  'shock-stun',
    ...SHOCKSTUN, method: 'soakTN',
    was:    'a character already stunned soaked at Power − armour, without the +2; SR3 p.124: "+2 target modifier to all tests" (maintainer 2026-10-18)',
    impl:   (power, armor) => Math.max(2, (Number(power) || 0) - (Number(armor) || 0)),
  },
  {
    id:     'shock-stun-rounds-half-impact-up',
    suite:  'shock-stun',
    ...SHOCKSTUN, method: 'halfImpact',
    was:    'Impact armour against a shock weapon was halved and rounded UP; SR3 p.124-125: "minus one-half (round down) any impact armor worn"',
    impl:   impact => Math.ceil(Math.max(0, Number(impact) || 0) / 2),
  },
  {
    id:     'shock-stun-ignores-the-resist-successes',
    suite:  'shock-stun',
    ...SHOCKSTUN, method: 'duration',
    was:    'the stun lasted Power minus half Impact whatever the Body/Willpower Test rolled; SR3 p.124-125: "and also minus the successes generated"',
    impl:   ({ power, impact = 0 } = {}) => Math.max(0, Math.trunc(Number(power) || 0) - Math.floor((Number(impact) || 0) / 2)),
  },
  {
    id:     'shock-stun-full-impact',
    suite:  'shock-stun',
    ...SHOCKSTUN, method: 'duration',
    was:    'the stun took the full Impact rating off, not half; SR3 p.124-125: "minus one-half (round down) any impact armor worn"',
    impl:   ({ power, impact = 0, successes = 0 } = {}) => Math.max(0, Math.trunc(Number(power) || 0) - (Number(impact) || 0) - Math.trunc(Number(successes) || 0)),
  },
  {
    id:     'shock-stun-can-go-negative',
    suite:  'shock-stun',
    ...SHOCKSTUN, method: 'duration',
    was:    'enough successes made the stun a negative number of Combat Turns instead of none',
    impl:   ({ power, impact = 0, successes = 0 } = {}) => Math.trunc(Number(power) || 0) - Math.floor((Number(impact) || 0) / 2) - Math.trunc(Number(successes) || 0),
  },
  {
    id:     'shock-stun-resists-with-the-lower-of-body-willpower',
    suite:  'shock-stun',
    ...SHOCKSTUN, method: 'resistDice',
    was:    'the stun Test used the lesser of Body and Willpower; SR3 p.124-125: "a Body or Willpower Test (whichever is greater)"',
    impl:   (body, willpower) => {
      const b = Math.max(0, Math.trunc(Number(body) || 0)), w = Math.max(0, Math.trunc(Number(willpower) || 0));
      return w < b ? { dice: w, attr: 'willpower' } : { dice: b, attr: 'body' };
    },
  },
  {
    id:     'shock-stun-body-only',
    suite:  'shock-stun',
    ...SHOCKSTUN, method: 'resistDice',
    was:    'the stun Test was always Body, ignoring a higher Willpower',
    impl:   (body) => ({ dice: Math.max(0, Math.trunc(Number(body) || 0)), attr: 'body' }),
  },
  {
    id:     'shock-stun-plus-one-not-two',
    suite:  'shock-stun',
    ...SHOCKSTUN, method: 'tnMod',
    was:    'the stunned target\x27s modifier was +1 to all tests; SR3 p.125: "an additional +2 target modifier to all tests"',
    impl:   stunned => (stunned ? 1 : 0),
  },
  {
    id:     'shock-stun-counts-down-by-two',
    suite:  'shock-stun',
    ...SHOCKSTUN, method: 'countDown',
    was:    'the stun lost two Combat Turns per Combat Turn',
    impl:   turns => Math.max(0, Math.trunc(Number(turns) || 0) - 2),
  },
  {
    id:     'shock-stun-the-glove-fist-stuns',
    suite:  'shock-stun',
    ...SHOCKSTUN, method: 'mainCode',
    was:    'the Shock Glove\x27s fist code was read as the shock (Power (STR-1)); its shock is the extra 7S Stun (SR3 p.275-276, p.124)',
    impl:   (weaponOrSystem, rawDamage) => {
      const s = weaponOrSystem?.system ?? weaponOrSystem;
      return (s?.shock === true || s?.category === 'Tasr') ? String(rawDamage || s?.damage || '').trim() : '';
    },
  },
  {
    id:     'shock-stun-taser-needs-the-tick',
    suite:  'shock-stun',
    ...SHOCKSTUN, method: 'isShock',
    was:    'a taser (category Tasr) was a shock weapon only with the tick, so a cyber taser or a hand-made taser never stunned (SR3 p.124-125)',
    impl:   w => (w?.system ?? w)?.shock === true,
  },
  {
    id:     'shock-stun-printed-power-not-read',
    suite:  'shock-stun',
    ...SHOCKSTUN, method: 'printedPower',
    was:    'the Power of a "+7S Stun" code was not read through the table\x27s plus sign',
    impl:   code => { const m = String(code ?? '').match(/^\s*(\d+)/); return m ? parseInt(m[1], 10) : null; },
  },
  {
    id:     'shock-stun-not-in-standing-tn',
    suite:  'shock-stun',
    ...ACTOR, method: 'standingTN',
    was:    'the shock-weapon stun was left out of the standing TN, so a stunned target\x27s tests kept their ordinary Target Numbers; SR3 p.125: "+2 target modifier to all tests"',
    impl:   function (actor) { return this.sustainingTN(actor) + this.drugTN(actor); },
  },
  {
    id:     'shock-stun-not-in-the-dodge-tn',
    suite:  'shock-stun',
    ...ACTOR, method: 'dodgeTN',
    was:    'the Dodge Test took drugs and spells but not the stun as its own term, so a stunned target dodged at the plain TN (SR3 p.125, "all tests")',
    impl:   ({ burstRounds = 0, shotgunSpread = 0, woundMod = 0, sustain = 0, drugs = 0 } = {}) => {
      const n = v => Math.max(0, Math.trunc(Number(v) || 0));
      return 4 + Math.floor(n(burstRounds) / 3) + n(shotgunSpread) - Math.min(0, Math.trunc(Number(woundMod) || 0)) + n(sustain) + n(drugs);
    },
  },
  {
    id:     'roomsweeper-ignores-shotgun-rules-flag',
    suite:  'roomsweeper',
    ...SHOTGUN, method: 'usesRules',
    was:    'only category ShtG followed the shotgun rules, so the Remington Roomsweeper (heavy-pistol ranges, "but shotgun rules", SR3 p.277) got no choke, spread or BF recoil doubling',
    impl:   w => (w?.system ?? w)?.category === 'ShtG',
  },
  {
    id:     'roomsweeper-skill-follows-range-category',
    suite:  'roomsweeper',
    ...SHOTGUN, method: 'skillCode',
    was:    'the Roomsweeper rolled the Pistols skill because its HPist category (for heavy-pistol ranges) also picked the skill; it is a shotgun for skill (maintainer ruling, SR3 p.277)',
    impl:   system => system?.category || null,
  },
  {
    id:     'roomsweeper-normal-rounds-still-9s-f',
    suite:  'roomsweeper',
    ...SHOTGUN, method: 'damageCode',
    was:    'the Roomsweeper kept its shot code 9S(f) with normal rounds loaded; SR3 p.277: "loaded with normal rounds … the weapon does 9M damage"',
    impl:   system => String(system?.damage ?? ''),
  },
  {
    id:     'shock-extra-resisted-with-full-impact',
    suite:  'shock-glove',
    ...EXTRADMG, method: 'shockImpact',
    was:    'the glove\x27s extra 7S Stun was resisted with the target\x27s full Impact armour; SR3 p.124: "Impact armor protects against shock weapons, but its rating is halved (rounding down)"',
    impl:   impact => Math.max(0, Number(impact) || 0),
  },
  {
    id:     'shock-extra-rounds-impact-up',
    suite:  'shock-glove',
    ...EXTRADMG, method: 'shockImpact',
    was:    'Impact armour halved against a shock weapon but rounded up (Impact 3 → 2) instead of down (p.124: "rounding down")',
    impl:   impact => Math.ceil(Math.max(0, Number(impact) || 0) / 2),
  },
  {
    id:     'shock-extra-always-the-attackers',
    suite:  'shock-glove',
    ...EXTRADMG, method: 'winnerExtra',
    was:    'the extra damage always came from the attacker\x27s glove, so a defender who won with one dealt none, and a glove-less winner dealt the loser\x27s extra',
    impl:   function (ctx) { return this.normalise(ctx?.atkExtraDamage); },
  },
  {
    id:     'shock-extra-keeps-the-plus-sign',
    suite:  'shock-glove',
    ...EXTRADMG, method: 'normalise',
    was:    'the table\x27s "+7S Stun" was handed to the code parser with its plus sign, which reads no damage at all (one code only, SR3EItem.parseDamageCode)',
    impl:   code => String(code ?? '').trim(),
  },
  {
    id:     'integral-rc-adds-to-the-plain-figure',
    suite:  'integral-rc',
    ...INTEGRALRC, method: 'weaponComp',
    was:    'the bracketed RC was added to the plain one, so an HK227 2(3) with its stock out compensated 5 (SR3 p.276: the parentheses are the FULL recoil compensation; the stock\x27s 1 point makes 3)',
    impl:   (system, inUse = false) => (Number(system?.recoilMod) || 0) + (inUse && system?.recoilModIntegral != null ? Number(system.recoilModIntegral) : 0),
  },
  {
    id:     'integral-rc-ignores-the-tick',
    suite:  'integral-rc',
    ...INTEGRALRC, method: 'weaponComp',
    was:    'the fire dialog\x27s integral-accessories tick changed nothing: the bracketed RC was never used, so a tripod-mounted Ultimax kept 0 compensation (SR3 p.276, p.279 prints (6))',
    impl:   system => Math.max(0, Math.trunc(Number(system?.recoilMod) || 0)),
  },
  {
    id:     'integral-rc-blank-counts-as-zero',
    suite:  'integral-rc',
    ...INTEGRALRC, method: 'has',
    was:    'a weapon with no bracketed RC (null) read as having one worth 0, so ticking the box on an Ares Predator dropped its compensation',
    impl:   system => system?.recoilModIntegral !== undefined,
  },
  {
    id:     'actor-ref-bare-id',
    suite:  'actor-ref',
    module: '../scripts/data/actor-ref.mjs', klass: 'ActorRef', method: 'of',
    was:    'cards named an unlinked token\'s actor by its id, which it shares with its sidebar actor — a wound or Mark prone on one goon landed on every goon of that NPC (TODO 260, seen in play 2026-10-24)',
    impl:   actor => actor?.id ?? null,
  },
  {
    id:     'actor-ref-token-same-as-sidebar',
    suite:  'actor-ref',
    module: '../scripts/data/actor-ref.mjs', klass: 'ActorRef', method: 'same',
    was:    'comparing by id made a goon "the same" as its sidebar NPC and as every other copy (TODO 260)',
    impl:   (a, b) => !!a && !!b && (a.id ?? a) === (b.id ?? b),
  },
  {
    id:     'old-sheet-grenades-stay-in-hand',
    suite:  'ready-weapon',
    module: '../scripts/data/ready-weapon.mjs', klass: 'ReadyWeapon', method: 'putAwayCarriedGrenade',
    was:    'grenades on a pre-0.6 sheet kept ready: true, so every carried grenade counted as in hand (TODO 254, seen in play 2026-10-23)',
    impl:   () => null,
  },
  {
    id:     'melee-each-opponent-a-new-action',
    suite:  'phase-targets',
    module: '../scripts/data/phase-targets.mjs', klass: 'PhaseTargets', method: 'sameMeleeAction',
    was:    'every melee opponent in a phase was charged its own Complex Action; SR3 p.122 makes several opponents one Complex Action (TODO 244)',
    impl:   () => false,
  },
  {
    id:     'round-queue-keeps-removed',
    suite:  'round-queue',
    module: '../scripts/data/round-queue.mjs', klass: 'RoundQueue', method: 'prune',
    was:    'a combatant removed mid-round left its slots in the queue: the next combatant acted twice and a leftover slot gave the top tracker row an extra turn (TODO 251, seen in play 2026-10-23)',
    impl:   (queue, index) => ({ queue: queue ?? [], index: Number(index) || 0, changed: false, actingRemoved: false, removedSlot: null }),
  },
  {
    id:     'round-queue-skips-next-survivor',
    suite:  'round-queue',
    module: '../scripts/data/round-queue.mjs', klass: 'RoundQueue', method: 'prune',
    was:    'pruning the acting combatant without saying so — End Turn then advanced past the survivor the tracker already showed, so they lost their action (TODO 251)',
    impl:   (queue, index, liveIds) => {
      const live = new Set(liveIds); const q = queue ?? [];
      const kept = q.filter(s => live.has(s.id));
      return { queue: kept, index: q.slice(0, index).filter(s => live.has(s.id)).length, changed: kept.length !== q.length, actingRemoved: false, removedSlot: null };
    },
  },
  {
    id:     'melee-prone-ignores-the-token',
    suite:  'melee-prone',
    ...MPRONE, method: 'isProne',
    was:    'a plausible miss (TODO 245): reading only the world actor, so an unlinked goon knocked prone from its '
          + 'token HUD stood in the melee window — its prone lives on the token\x27s own synthetic actor (SR3 p.123)',
    impl:   actor => actor?.statuses?.has?.('prone') === true,
  },
  {
    id:     'melee-prone-both-down-drops-one',
    suite:  'melee-prone',
    ...MPRONE, method: 'side',
    was:    'the single "who is DOWN" select could only name one fighter, so two fighters on the floor gave only the '
          + 'defender -2; each has a prone opponent (SR3 p.123 "Opponent prone -2")',
    impl:   (atkProne, defProne) => (atkProne ? 'attacker' : defProne ? 'defender' : null),
  },
  {
    id:     'melee-prone-bonus-to-the-one-down',
    suite:  'melee-prone',
    ...MPRONE, method: 'deltas',
    was:    'the easy inversion of p.123 "Opponent prone -2": the bonus given to the fighter lying down instead of the '
          + 'one still standing',
    impl:   who => ({ atk: (who === 'attacker' || who === 'both') ? -2 : 0, def: (who === 'defender' || who === 'both') ? -2 : 0 }),
  },
  /* ── TODO 249 / 250: a grenade's NPC batch and its marker. Regressions the rules must not take back. ── */
  {
    id:     'blast-batch-takes-player-characters',
    suite:  'blast-batch',
    ...BLASTBATCH, method: 'split',
    was:    'every caught person went into the GM\x27s NPC batch, so a player\x27s character was rolled for them (TODO 249: "for NPCs only")',
    impl:   (targets = []) => ({
      individual: targets.filter(t => !['character', 'npc'].includes(t?.actor?.type)),
      batch:      targets.filter(t => ['character', 'npc'].includes(t?.actor?.type)),
    }),
  },
  {
    id:     'blast-batch-takes-player-rigged-drones',
    suite:  'blast-batch',
    ...BLASTBATCH, method: 'split',
    was:    'a drone joined the GM\x27s batch whoever rigged it, so a player\x27s drone was rolled for them (the maintainer, 2026-10-24: only drones with no player controller)',
    impl:   (targets = [], isPC = () => true) => {
      const individual = [], batch = [];
      for (const t of targets) {
        const a = t?.actor;
        const gm = (a?.type === 'character' || a?.type === 'npc') ? !isPC(a)
          : (a?.type === 'vehicle' && a?.system?.vehicleType === 'drone' && !isPC(a));
        (gm ? batch : individual).push(t);
      }
      return { individual, batch };
    },
  },
  {
    id:     'blast-batch-clears-while-explosions-pending',
    suite:  'blast-batch',
    ...BLASTBATCH, method: 'resolved',
    was:    'the blast counted a target as resisted once its roll was clicked, with 💥 explosions still owed, so the marker vanished early (the maintainer, 2026-10-24: "no early clear")',
    impl:   ({ individualIds = [], batchIds = [], acted = {}, soakCards = [], soakResults = [] } = {}) => {
      const a = acted ?? {};
      const done = (id, i) => !!a[`step:sr-soak-btn:${i}`] || soakResults.includes(id) || soakCards.some(c => c?.actorId === id);
      return individualIds.every(done) && (!batchIds.length || !!a['step:sr-blast-npc-btn:0']);
    },
  },
  {
    id:     'blast-batch-forgets-separate-npcs',
    suite:  'blast-batch',
    ...BLASTBATCH, method: 'resolved',
    was:    'an NPC the GM sent to a soak card of its own was forgotten once the batch rolled, so the marker went before it resisted (TODO 250)',
    needsOriginal: '_resolvedReal',
    impl:   function (p = {}) {
      const acted = p.acted ?? {};
      const entry = acted['step:sr-blast-npc-btn:0'];
      const stripped = entry ? { ...acted, 'step:sr-blast-npc-btn:0': { ...entry, data: { ...(entry.data ?? {}), separate: [] } } } : acted;
      return this._resolvedReal({ ...p, acted: stripped });
    },
  },
  {
    id:     'blast-batch-dismissal-ignored',
    suite:  'blast-batch',
    ...BLASTBATCH, method: 'resolved',
    was:    'a step the GM ✕\x27d in the ⏳ panel ("nobody will take it") still held the blast open, so the marker never cleared',
    needsOriginal: '_resolvedReal',
    impl:   function (p = {}) {
      const acted = Object.fromEntries(Object.entries(p.acted ?? {}).filter(([, v]) => v?.label !== 'dismissed by the GM'));
      const soakCards = (p.soakCards ?? []).map(c => ({ ...c, dismissed: false }));
      return this._resolvedReal({ ...p, acted, soakCards });
    },
  },
  {
    id:     'mod-fix-overwrites-a-houserule',
    suite:  'mod-book-fixes',
    ...MODFIX, method: 'fixItem', needsOriginal: '_fixItemOriginal',
    was:    'the 0.8.0 mod-value migration set the corrected value whatever the field held, overwriting a GM\'s edited cost, CF or legality '
          + 'instead of correcting only the value we shipped (TODO 261)',
    impl:   function (item) {
      const delta = {};
      for (const f of this.matching(item)) delta[`system.${f.field}`] = f.to;
      return Object.keys(delta).length ? delta : null;
    },
  },
  {
    id:     'mod-fix-hits-every-level',
    suite:  'mod-book-fixes',
    ...MODFIX, method: 'matching',
    was:    'the mod-value fixes matched on the mod name alone, so Concealed Armor 8 (CF 24) was corrected as if it were level 9 (R3 p.132)',
    impl:   function (item) {
      const kind = item?.type === 'vehiclemod' ? 'vehicle' : 'cyberlimb';
      const name = String(item?.name ?? '').replace(/s*[d+]s*$/, '');
      return this.FIXES.filter(f => f.kind === kind && f.name === name);
    },
  },
  {
    id:     'family-keeps-the-highest-level',
    suite:  'mod-ratings',
    ...FAMILIES, method: 'plan',
    was:    'collapsing a rated family kept the HIGHEST level\'s document, so the kept id (and its owned copies\' compendium link) belonged to the wrong level '
          + 'and the lowest level lost its fields (TODO 261: keep the lowest, its id unchanged)',
    impl:   function (members) {
      if (!this.collapses(members)) return null;
      const { levels, unplaced, duplicates, placed } = this.levels(members);
      const keep = [...placed.values()].at(-1);
      return { keep, levels, unplaced, duplicates, folded: [], deleted: members.filter(m => m !== keep).map(m => m.key), count: members.length };
    },
  },
  {
    id:     'family-collapses-a-lone-item',
    suite:  'mod-ratings',
    ...FAMILIES, method: 'collapses',
    was:    'a lone rated document counted as a family, so it was renamed and recorded in the level table with a one-row "dropdown" (TODO 261: only two or more rated documents collapse)',
    impl:   members => members.filter(m => m.level > 0).length >= 1,
  },
  {
    id:     'family-ignores-a-duplicate-level',
    suite:  'mod-ratings',
    ...FAMILIES, method: 'levels',
    was:    'a level printed twice with different numbers silently kept the first and dropped the second — nothing marked it for the maintainer to check against the book (TODO 261: unplaced)',
    impl:   function (members) {
      const placed = new Map();
      for (const m of [...members].filter(x => x.level > 0).sort((a, b) => a.level - b.level)) if (!placed.has(m.level)) placed.set(m.level, m);
      const levels = {};
      for (const [lvl, m] of placed) levels[lvl] = { cost: m.doc.system.cost };
      return { levels, unplaced: [], duplicates: [], placed };
    },
  },
  {
    id:     'migration-repoint-overwrites-a-live-link',
    suite:  'mod-ratings',
    ...MODRATE, method: 'repointSource',
    was:    'the 0.8.0 migration repointed any compendium link to the first pack\'s kept document, even one whose source is not a deleted level (TODO 261: only a DEAD link)',
    impl:   function (item) {
      const m = /^Compendium\.The2ndChumming3e\.([^.]+)\.Item\.(.+)$/.exec(String(item?._stats?.compendiumSource ?? ''));
      return m ? `Compendium.The2ndChumming3e.${m[1]}.Item.kept` : null;
    },
  },
  {
    id:     'repoint-ignores-the-other-pack',
    suite:  'name-fixes',
    ...MODRATE, method: 'repointSource', needsOriginal: '_repointOriginal',
    was:    'a link to a document removed for one in ANOTHER pack ("pack/id", TODO 266: the SR3 Transceiver for the Cannon Companion one) was pointed back into the old pack, so the owned copy kept a dead link',
    impl:   function (item, table) {
      const to = this._repointOriginal(item, table);
      const from = /^Compendium\.The2ndChumming3e\.([^.]+)\./.exec(String(item?._stats?.compendiumSource ?? ''));
      return to && from ? to.replace(/^Compendium\.The2ndChumming3e\.[^.]+\./, `Compendium.The2ndChumming3e.${from[1]}.`) : to;
    },
  },
  {
    id:     'rename-takes-a-houserule-name',
    suite:  'name-fixes',
    module: '../scripts/data/name-fixes.mjs', klass: 'NameFixes', method: 'fixedName',
    was:    'the armour Transceiver rename matched any armour name that merely CONTAINS "Transceiver", so a GM own "Transceiver Mk II (Armor)" was renamed (TODO 266: only the exact old pack names)',
    impl:   function (item) {
      return item?.type === 'armor' && /Transceiver/.test(String(item.name)) && !/^Helmet\/Wrist/.test(String(item.name)) ? 'Helmet/Wrist Transceiver (Armor)' : null;
    },
  },
  {
    id:     'syncname-does-not-swap-the-old-level',
    suite:  'mod-ratings',
    ...MODRATE, method: 'syncName',
    was:    'the name sync appended the new level without taking the old one off — "Medkit [3]" went to "Medkit [3] [5]" (TODO 261, name follows level)',
    impl:   function (name, rating) {
      const n = Number(rating);
      return n > 0 ? `${String(name ?? '').trim()} [${n}]` : String(name ?? '');
    },
  },
  {
    id:     'syncname-eats-any-bracket',
    suite:  'mod-ratings',
    ...MODRATE, method: 'syncName',
    was:    'the name sync stripped ANY trailing bracket or parenthesis, so "Gyro Mount (Deluxe)" lost its text (TODO 261: only a level is swapped)',
    impl:   function (name, rating) {
      const n = Number(rating);
      const base = String(name ?? '').replace(/\s*[[(][^\])]*[\])]\s*$/, '').trim();
      return n > 0 ? `${base} [${n}]` : base;
    },
  },
  {
    id:     'syncname-writes-into-the-compendium',
    suite:  'mod-ratings',
    ...MODRATE, method: 'inPack',
    was:    'the name hooks treated a compendium document like a world item, so a pack would have been renamed "Medkit [1]" (TODO 261: the packs stay plain)',
    impl:   function () { return false; },
  },
  {
    id:     'basename-keeps-the-tag',
    suite:  'mod-for',
    ...MODRATE, method: 'baseName',
    was:    'baseName took the level off but left the mod tag, so "Chemical Seal (Armor) [4]" no longer found "Chemical Seal"\'s level table row (TODO 266: every name-keyed lookup goes through the untagged base name)',
    impl:   function (name) {
      const t = String(name ?? '').replace(/\s+/g, ' ').trim().replace(/^\+\s*/, '');
      return this.splitName(t)?.stem ?? t;
    },
  },
  {
    id:     'basename-keeps-the-plus',
    suite:  'mod-for',
    ...MODRATE, method: 'baseName',
    was:    'baseName kept the old armour options\' leading "+", so a 0.7.0 "+Signal Locator 7" missed the "Signal Locator" row (TODO 266)',
    impl:   function (name) {
      const t = String(name ?? '').replace(/\s+/g, ' ').trim();
      const s = this.splitName(t)?.stem ?? t;
      return s.replace(/\s*\((Armor|Weapon|Cyberlimb|Vehicle)\)\s*$/, '');
    },
  },
  {
    id:     'tagged-doubles-the-tag',
    suite:  'mod-for',
    ...MODRATE, method: 'tagged',
    was:    'tagging appended the tag without checking for one, so a second migration run (or a drop of an already tagged mod) made "Chemical Seal (Armor) (Armor)" (TODO 266: never doubled)',
    impl:   function (name, modFor) {
      const tag = { armor: 'Armor', weapon: 'Weapon', cyberlimb: 'Cyberlimb', vehicle: 'Vehicle' }[modFor];
      const text = String(name ?? '').trim();
      if (!tag) return text;
      const split = this.splitName(text);
      return `${split ? split.stem : text} (${tag})${split ? ` [${split.rating}]` : ''}`;
    },
  },
  {
    id:     'bare-number-is-any-level',
    suite:  'mod-for',
    ...MODRATE, method: 'splitName',
    was:    'any bare trailing number counted as a level, so "Optical Vis. Mag 3" (MAGNIFICATION 3, SR3 p.284) and "Ares Predator 2" were collapsed into families (TODO 266: only the named families are levelled)',
    impl:   function (name) {
      const m = /^(.*?)\s*(?:\b(?:Rating|Lvl|Lv)\s*)?(?:\[(\d+)\]|(\d+))\s*$/.exec(String(name ?? ''));
      const n = m && (m[2] ?? m[3]);
      return m && m[1].trim() && n ? { stem: m[1].replace(/\s+/g, ' ').trim().replace(/^\+\s*/, ''), rating: Number(n) } : null;
    },
  },
  {
    id:     'modfor-ignores-the-category',
    suite:  'mod-for',
    ...MODFOR, method: 'of',
    was:    'a Firearms Accessory was not recognised as a weapon mod, so the weapon accessories shipped and migrated untagged (TODO 266)',
    impl:   function (item) {
      const s = item?.system ?? {};
      if (s.modFor) return s.modFor;
      switch (item?.type) {
        case 'vehiclemod': return 'vehicle';
        case 'cyberware': return s.cyberwareCategory === 'Cyberlimb Mods' ? 'cyberlimb' : '';
        case 'armor': return /^\s*\+/.test(String(item.name ?? '')) ? 'armor' : '';
        default: return '';
      }
    },
  },
  {
    id:     'modfor-overwrites-the-set-value',
    suite:  'mod-for',
    ...MODFOR, method: 'of',
    was:    'the derived value beat a modFor someone had set, so the migration and the pack tool overwrote a GM\'s choice (TODO 266: only blanks are filled)',
    impl:   function (item) {
      const s = item?.system ?? {};
      if (item?.type === 'vehiclemod') return 'vehicle';
      return s.modFor && !(s.category === 'Firearms Accessories') ? s.modFor : (s.category === 'Firearms Accessories' ? 'weapon' : '');
    },
  },
  {
    id:     'gear-level-change-forgets-street-index',
    suite:  'gear-search',
    ...GSEARCH, method: 'fields',
    was:    'fields() read only `streetIndex`, so the Buy dialog level picker (which holds a fields() result, with `index`) reset the Street Index to 1 on every level change (TODO 261, STS (Beacon))',
    impl:   function (entry) {
      return {
        name: entry?.name ?? '', type: entry?.type ?? 'gear', tn: entry?.tn || 4, time: entry?.time || 1, unit: entry?.unit || 'day',
        cost: Number(entry?.cost ?? entry?.system?.cost) || 0,
        index: Number(entry?.streetIndex ?? entry?.system?.streetIndex) || 1,
        uuid: entry?.uuid ?? '', levels: entry?.levels ?? null, rating: entry?.rating ?? null,
        always: !!entry?.always, unknown: !!entry?.unknown,
      };
    },
  },
  {
    id:     'macro-never-refreshed',
    suite:  'macro-refresh',
    ...MACROREF, method: 'decide',
    was:    'an existing world macro was left alone, so a fixed scripts/macros body never reached an older world (TODO 261, Chrome Threat Generator)',
    impl:   (_def, existing) => (existing ? 'skip' : 'create'),
  },
  {
    id:     'macro-refresh-takes-any-name-match',
    suite:  'macro-refresh',
    ...MACROREF, method: 'find',
    was:    'the refresh adopted a macro by name whatever its type or flag, overwriting a chat macro or another managed macro (TODO 261)',
    impl:   (def, macros) => [...(macros ?? [])].find(m => m?.name === def.name) ?? null,
  },
  {
    id:     'macro-refresh-touches-gm-macros',
    suite:  'macro-refresh',
    ...MACROREF, method: 'find',
    was:    'the refresh took any script macro, so a GM-authored macro with another name was overwritten (TODO 261)',
    impl:   (_def, macros) => [...(macros ?? [])].find(m => m?.type === 'script') ?? null,
  },
];
