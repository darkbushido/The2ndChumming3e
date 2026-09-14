/**
 * Healing — a guided flow that runs like combat · TODO 115.
 *
 * Every roll is a chat card, and whoever makes THAT roll presses its button: the medic rolls
 * Biotech, the patient rolls Body, the caster rolls Sorcery. The result card carries the next
 * step, the book's time, and the bill.
 *
 * Sources — every rule below was checked against the core rulebook text (printed pages):
 *   pp.125-126  Condition Monitor, overflow, Healing Stun, Wound Table
 *   pp.127-128  Stages of Healing, Healing Table, Doctoring Table, Medical Costs, Body Part Types,
 *               Deadly Wounds and Permanent Damage
 *   p.129       Using Biotech, First Aid Table, Deadly Wounds and First Aid, Trauma Patches,
 *               Magical Characters and Damage
 *   p.178       Permanent Spell Base Time
 *   pp.193-194  Heal, Treat, Stabilize
 *   pp.304-305  Medkit (Biotech 3, supplies run out on a 1 on 1D6), Stabilization Unit, slap patches
 *   p.62        Lifestyle costs (paid daily at monthly ÷ 30, p.127)
 * The sr3-guides healing page (sr3-guides/rules/healing.md) agrees with all of it; it omits the
 * Body Part Types Table, Stabilize, the Permanent Spell Base Time, re-testing when professional
 * help arrives, and donor-organ Magic loss, which are included here.
 *
 * ⚠ **Nothing heals by itself** (the system's ethos). A result card OFFERS the change — "Lower to
 * Moderate", "Erase 1 Stun box", "Charge 600¥" — and a person clicks it.
 *
 * The rules are pure statics with no Foundry access, tested in tests/healing.test.mjs. The UI
 * half reads `game` only when called.
 */

import { itemRating } from './data/item-rating.mjs';

const LEVEL_NAME = { L: 'Light', M: 'Moderate', S: 'Serious', D: 'Deadly' };
const NEXT_DOWN  = { D: 'S', S: 'M', M: 'L', L: '' };
const FLOOR_BOX  = { D: 10, S: 6, M: 3, L: 1, '': 0 };
const FLAG       = 'The2ndChumming3e';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const yen = n => `${Math.round(n).toLocaleString()}¥`;

export class SR3EHealing {

  /* ════════════════════════════════════════════════════════════════════════════════════════
   *  Tables
   * ════════════════════════════════════════════════════════════════════════════════════════ */

  static LEVEL_NAME = LEVEL_NAME;

  /** Wound Table (p.126): the Body Test for "does this need medical attention?". Deadly always does. */
  static WOUND_TEST_TN = { L: 2, M: 4, S: 6 };

  /** Healing Table (p.127). Times in HOURS. */
  static HEALING_TABLE = {
    D: { base: 30 * 24, min: 3 * 24, tn: 10, lifestyle: 'hospitalized' },
    S: { base: 20 * 24, min: 2 * 24, tn: 8,  lifestyle: 'high' },
    M: { base: 10 * 24, min: 1 * 24, tn: 6,  lifestyle: 'middle' },
    L: { base: 24,      min: 2,      tn: 4,  lifestyle: 'low' },
  };

  /** First Aid Table (p.129): TN and treatment time in Combat Turns. Deadly is stabilize-only. */
  static FIRST_AID_TABLE = { L: { tn: 4, turns: 5 }, M: { tn: 6, turns: 10 }, S: { tn: 8, turns: 15 }, D: { tn: 10, turns: null } };

  /** Medical Costs Table (p.128). */
  static MEDICAL_COSTS = {
    paramedic:    { D: 400, S: 200, M: 100, L: 50 },
    doctorPerDay: { D: 400, S: 200, M: 100, L: 50 },
    hospitalPerDay: 500,     // Hospitalization lifestyle, includes doctor's services
    icuPerDay:      1000,    // Intensive care, Deadly wounds only
  };

  /** Lifestyle, per month (p.62); paid daily at ÷ 30 while healing (p.127). */
  static LIFESTYLE_MONTHLY = { street: 0, squatter: 100, low: 1000, middle: 5000, high: 10000, luxury: 100000 };

  /** Permanent Spell Base Time (p.178), in Combat Turns, by the spell's Drain Level. */
  static PERMANENT_SPELL_TURNS = { L: 5, M: 10, S: 15, D: 20 };

  /** Body Part Types Table (p.128) — growing a DNA-matched replacement. */
  static BODY_PARTS = {
    small: { label: 'Eye or small organ', weeks: 3, cost: 7500 },
    large: { label: 'Large organ',        weeks: 5, cost: 15000 },
    hand:  { label: 'Hand / foot',        weeks: 6, cost: 15000 },
    limb:  { label: 'Limb',               weeks: 8, cost: 25000 },
  };

  /** Deadly Wounds and Permanent Damage (p.128) — the two 1D6 tables. */
  static ORGAN_TABLE = [null, 'body', 'strength', 'quickness', 'intelligence', 'willpower', 'reaction'];
  static LIMB_TABLE  = [null, 'right arm', 'left arm', 'right leg', 'left leg', 'an ear', 'an eye'];

  /** Gear (pp.304-305), matched by item name so a GM's own homebrew item counts too. */
  static EQUIPMENT = {
    medkit:        /\bmedkit\b(?!\s*supplies)/i,
    stabilization: /stabili[sz]ation\s+unit/i,
    trauma:        /trauma\s+patch/i,
    antidote:      /antidote\s+patch/i,
  };
  static MEDKIT_BIOTECH  = 3;
  static MEDKIT_RESTOCK  = 50;

  /* ════════════════════════════════════════════════════════════════════════════════════════
   *  Pure rules
   * ════════════════════════════════════════════════════════════════════════════════════════ */

  /** Damage Level for a number of filled boxes: 1 Light, 3 Moderate, 6 Serious, 10 Deadly (p.125). */
  static woundLevel(boxes) {
    const b = Number(boxes) || 0;
    return b >= 10 ? 'D' : b >= 6 ? 'S' : b >= 3 ? 'M' : b >= 1 ? 'L' : '';
  }

  /**
   * Boxes left after healing ONE Damage Level (p.127): *"the damage on the Condition Monitor drops
   * to the lowest point for the next Damage Level"* — a Serious wound healed to Moderate has 3.
   */
  static oneLevelDown(boxes) {
    return FLOOR_BOX[NEXT_DOWN[SR3EHealing.woundLevel(boxes)] ?? ''] ?? 0;
  }

  /** The Body / Willpower bands both tables use: 1-3 +0, 4-6 −1, 7-9 −2, 10+ −3. */
  static attributeBand(value) {
    const v = Number(value) || 0;
    return v >= 10 ? -3 : v >= 7 ? -2 : v >= 4 ? -1 : 0;
  }

  /**
   * Recovering Stun (p.126): the higher of Body or Willpower against TN 2, *"modified by any
   * appropriate Stun or Physical injury modifiers"*. `woundMod` is the system's (negative) value.
   */
  static stunRecovery({ body = 0, willpower = 0, woundMod = 0 } = {}) {
    const useWil = (Number(willpower) || 0) > (Number(body) || 0);
    return { dice: Math.max(Number(body) || 0, Number(willpower) || 0),
             attribute: useWil ? 'Willpower' : 'Body',
             tn: 2 - Math.min(0, Number(woundMod) || 0) };
  }

  /** Minutes to recover ONE Stun box: 60 ÷ successes (p.126). No successes → none this rest. */
  static stunBoxMinutes(successes) {
    const s = Number(successes) || 0;
    return s > 0 ? 60 / s : null;
  }

  /**
   * First aid TN (p.129). `awakenedApplied` is the medic choosing to treat an Awakened patient
   * gently (+2); declining it risks their Magic (see `magicLossRolls`).
   */
  static firstAidTN({ level, awakened = false, awakenedApplied = true, conditions = 'good',
                      body = 0, medkit = true, savior = false } = {}) {
    const row = SR3EHealing.FIRST_AID_TABLE[level];
    if (!row) return null;
    const parts = [[`${LEVEL_NAME[level]} wound`, row.tn]];
    if (awakened && awakenedApplied) parts.push(['Patient is Awakened', 2]);
    if (conditions === 'bad')      parts.push(['Bad conditions', 1]);
    if (conditions === 'terrible') parts.push(['Terrible conditions', 3]);
    const band = SR3EHealing.attributeBand(body);
    if (band) parts.push([`Patient's Body ${body}`, band]);
    if (!medkit) parts.push(['No medkit available', 4]);
    else if (savior) parts.push(['Savior advanced medkit (M&M p.95)', -1]);
    return { tn: parts.reduce((s, [, v]) => s + v, 0), parts, turns: row.turns, stabilizeOnly: level === 'D' };
  }

  /**
   * First aid outcome (p.129): one success lowers the wound ONE level, never more; a Deadly wound
   * is stabilized instead. Treatment time ÷ successes = uninterrupted Combat Turns (rounded up).
   */
  static firstAidOutcome({ level, successes }) {
    const s = Number(successes) || 0;
    const row = SR3EHealing.FIRST_AID_TABLE[level] ?? {};
    if (level === 'D') return { stabilized: s >= 1, lowered: false, turns: null };
    return { stabilized: false, lowered: s >= 1, turns: s >= 1 && row.turns ? Math.ceil(row.turns / s) : null };
  }

  /**
   * Magic loss (p.129): *"When an Awakened character suffers a Deadly wound or is treated without
   * the +2 modifier… rolls 2D6… If the Awakened character is being treated for a Deadly wound and
   * the +2 modifier is not applied, roll 2D6 twice."*
   */
  static magicLossRolls({ awakened = false, deadly = false, treatedWithoutMod = false } = {}) {
    if (!awakened) return 0;
    if (deadly && treatedWithoutMod) return 2;
    return deadly || treatedWithoutMod ? 1 : 0;
  }

  /** A 2D6 at or below current Magic loses a point (p.129). */
  static magicLost(roll, magic) { return (Number(roll) || 0) <= (Number(magic) || 0); }

  /** Does it need a doctor? Body (natural) vs the Wound Table (p.126); Deadly always does (p.127). */
  static attentionTN(level, { stabilizationUnit = false } = {}) {
    const tn = SR3EHealing.WOUND_TEST_TN[level];
    return tn === undefined ? null : Math.max(2, tn - (stabilizationUnit ? 2 : 0));
  }
  static needsMedicalAttention({ level, successes }) {
    return level === 'D' || (Number(successes) || 0) === 0;
  }

  /**
   * Doctoring Table (p.128) — only when a doctor with a real medical degree is involved.
   * ⚠ Conditions: *"only one applies"*. Body and Willpower are NATURAL (the table's asterisk).
   */
  static doctoringModifier({ intensiveCare = false, magicalCare = false, conditions = 'hospital',
                             magician = false, body = 0, willpower = 0 } = {}) {
    const parts = [];
    if (intensiveCare) parts.push(['Intensive care', -2]);
    if (magicalCare)   parts.push(['Long-term magical care', -2]);
    const cond = { notHospital: ['Not in hospital or clinic', 2], bad: ['Bad conditions', 3],
                   terrible: ['Terrible conditions', 4] }[conditions];
    if (cond) parts.push(cond);
    if (magician) parts.push(['Patient is a magician', 2]);
    const b = SR3EHealing.attributeBand(body), w = SR3EHealing.attributeBand(willpower);
    if (b) parts.push([`Natural Body ${body}`, b]);
    if (w) parts.push([`Natural Willpower ${willpower}`, w]);
    return { mod: parts.reduce((s, [, v]) => s + v, 0), parts };
  }

  /** Healing Table TN for one stage, with the doctor's modifier and a stabilization unit (−2, p.305). */
  static stageTN(level, { doctorMod = 0, stabilizationUnit = false } = {}) {
    const row = SR3EHealing.HEALING_TABLE[level];
    return row ? Math.max(2, row.tn + doctorMod - (stabilizationUnit ? 2 : 0)) : null;
  }

  /**
   * Time to heal one stage (p.127): base ÷ successes, never below the minimum.
   * `baseMultiplier` — a lost eye or limb adds 50% to the base (p.128).
   * `timeMultiplier` — a destroyed organ doubles *"the time for the entire healing process"*.
   * ⚠ No successes: the book gives no time. Returned as `null` — the GM's call.
   */
  static stageHours({ level, successes, baseMultiplier = 1, timeMultiplier = 1 } = {}) {
    const row = SR3EHealing.HEALING_TABLE[level];
    const s = Number(successes) || 0;
    if (!row || s <= 0) return null;
    return Math.max(row.min, (row.base * baseMultiplier) / s) * timeMultiplier;
  }

  /** Whole days, for billing. A part-day is billed as a day. */
  static billableDays(hours) { return hours > 0 ? Math.ceil(hours / 24) : 0; }

  /**
   * What recovery costs (p.128) for `days` at this level.
   * care: 'none' | 'doctor' (doctor's services per day) | 'hospital' (500¥/day, includes the
   * doctor) | 'icu' (1,000¥/day, Deadly only). Lifestyle is the minimum for the level at ÷ 30 a
   * day (p.127) unless the patient is in hospital, which IS the Hospitalized lifestyle.
   */
  static recoveryCost({ level, days = 0, care = 'none' } = {}) {
    const C = SR3EHealing.MEDICAL_COSTS;
    const d = Math.max(0, Number(days) || 0);
    const perDay = care === 'doctor' ? (C.doctorPerDay[level] ?? 0)
      : care === 'hospital' ? C.hospitalPerDay
      : care === 'icu' && level === 'D' ? C.icuPerDay : 0;
    const minLife = SR3EHealing.HEALING_TABLE[level]?.lifestyle ?? 'low';
    const inHospital = care === 'hospital' || care === 'icu';
    const lifePerDay = inHospital ? 0
      : minLife === 'hospitalized' ? C.hospitalPerDay
      : (SR3EHealing.LIFESTYLE_MONTHLY[minLife] ?? 0) / 30;
    return { care: perDay * d, lifestyle: Math.round(lifePerDay * d), minLifestyle: minLife, perDay, lifePerDay };
  }

  /** Deadly Wounds and Permanent Damage (p.127): Body (4), +2 after a trauma patch; dermal armor counts. */
  static permanentDamageTN({ traumaPatch = false } = {}) { return 4 + (traumaPatch ? 2 : 0); }
  static permanentDamage(successes) {
    const s = Number(successes) || 0;
    return s >= 2 ? 'none' : s === 1 ? 'limb' : 'organ';
  }

  /** Trauma patch stabilization (p.129): Body vs 4 + dermal armor + blood filter ratings. */
  static traumaPatchTN({ dermalArmor = 0, bloodFilter = 0 } = {}) {
    return 4 + (Number(dermalArmor) || 0) + (Number(bloodFilter) || 0);
  }

  /** Heal / Treat (pp.193-194): TN 10 − Essence, rounded up (a fraction makes it harder, not easier). */
  static healSpellTN(essence) { return Math.max(2, Math.ceil(10 - (Number(essence) || 0))); }

  /**
   * Heal / Treat result (p.194): each success heals a box up to the Force, OR divides the base
   * time the spell needs to become permanent (p.178, by Drain Level = the patient's wound level).
   * Treat becomes permanent in half the time, rounded down. Drain: (Wound Level) for Heal,
   * −1(Wound Level) for Treat — the −1 is on the TN (Force ÷ 2).
   */
  static healSpell({ spell = 'heal', successes = 0, toHealing = null, force = 1, level = 'L' } = {}) {
    const s = Math.max(0, Number(successes) || 0);
    const heal = Math.min(Math.max(0, toHealing ?? s), s, Math.max(0, Number(force) || 0));
    const timeSucc = s - heal;
    const base = SR3EHealing.PERMANENT_SPELL_TURNS[level] ?? 5;
    let turns = timeSucc > 0 ? Math.ceil(base / timeSucc) : base;
    if (spell === 'treat') turns = Math.floor(turns / 2);
    return { boxes: heal, timeSuccesses: timeSucc, turns: Math.max(1, turns),
             drainTN: Math.max(2, Math.floor((Number(force) || 0) / 2) + (spell === 'treat' ? -1 : 0)),
             drainLevel: level };
  }

  /** Stabilize (p.194): TN 4 + minutes since the Deadly damage; no effect unless Force ≥ overflow. */
  static stabilizeSpell({ force = 0, overflow = 0, minutes = 0 } = {}) {
    return { tn: 4 + Math.max(0, Number(minutes) || 0), effective: (Number(force) || 0) >= (Number(overflow) || 0) };
  }

  /** Medkit supplies run out on a 1 on 1D6 after a treatment (p.304). */
  static medkitSuppliesOut(d6) { return Number(d6) === 1; }

  /**
   * The first-aid dice with a medkit · *M&M p.136, 138*:
   * > "If used by a character without Biotech Skill, medkits provide Biotech Skill equal to their
   * > rating. If used by a character with Biotech Skill, they provide Complementary dice for
   * > Biotech Tests equal to their rating."
   * ⚠ Complementary dice are the full rating added as dice — the reading this system already uses
   * for R3's complementary dice (CLAUDE.md, *Electronic Warfare*). No Biotech and no medkit →
   * defaulting (`defaulting: true`). The core medkit is Rating 3 (its "doctor" is Biotech 3, p.304).
   */
  static firstAidDice({ biotech = 0, medkitRating = 0 } = {}) {
    const b = Math.max(0, Number(biotech) || 0), m = Math.max(0, Number(medkitRating) || 0);
    if (b > 0) return { dice: b + m, defaulting: false, note: m ? `Biotech ${b} + medkit ${m} (complementary dice)` : `Biotech ${b}` };
    if (m > 0) return { dice: m, defaulting: false, note: `the medkit's Biotech ${m} (no Biotech skill)` };
    return { dice: 0, defaulting: true, note: 'no Biotech and no medkit — defaulting' };
  }

  /** Heal N boxes of Physical: overflow first, then the track. */
  static healBoxes({ physical = 0, overflow = 0, n = 0 } = {}) {
    let left = Math.max(0, Number(n) || 0);
    const fromOver = Math.min(left, Number(overflow) || 0); left -= fromOver;
    return { physical: Math.max(0, (Number(physical) || 0) - left), overflow: (Number(overflow) || 0) - fromOver };
  }

  /** A time for people: "2 days 4 hours", "35 minutes". */
  static formatHours(hours) {
    if (hours === null || hours === undefined) return '—';
    if (hours < 1) return `${Math.round(hours * 60)} minutes`;
    const d = Math.floor(hours / 24), h = Math.round(hours - d * 24);
    return [d ? `${d} day${d === 1 ? '' : 's'}` : '', h ? `${h} hour${h === 1 ? '' : 's'}` : ''].filter(Boolean).join(' ') || '0 hours';
  }

  /** *"A Combat Turn is roughly three seconds long"* (SR3 p.39). */
  static COMBAT_TURN_SECONDS = 3;

  /** "15 Combat Turns (45 seconds)", "40 Combat Turns (2 minutes)". */
  static formatTurns(turns) {
    const t = Math.max(0, Number(turns) || 0);
    const sec = t * SR3EHealing.COMBAT_TURN_SECONDS;
    const real = sec < 60 ? `${sec} seconds` : `${Math.round(sec / 60)} minute${Math.round(sec / 60) === 1 ? '' : 's'}`;
    return `${t} Combat Turn${t === 1 ? '' : 's'} (${real})`;
  }

  /**
   * The road from this wound to healed, one Healing Table stage at a time (p.127): each stage
   * takes at most its base time (1 success) and at least its minimum, then the organ multiplier.
   * Zero successes has no time at all, so "at most" means "if every roll gets a success".
   */
  static recoveryRoad(level, { baseMultiplier = 1, timeMultiplier = 1 } = {}) {
    const stages = [];
    for (let lvl = level; SR3EHealing.HEALING_TABLE[lvl]; lvl = NEXT_DOWN[lvl]) {
      const row = SR3EHealing.HEALING_TABLE[lvl];
      stages.push({ from: lvl, to: NEXT_DOWN[lvl] ?? '', tn: row.tn, lifestyle: row.lifestyle,
                    minH: SR3EHealing.stageHours({ level: lvl, successes: 1e9, baseMultiplier, timeMultiplier }),
                    maxH: SR3EHealing.stageHours({ level: lvl, successes: 1, baseMultiplier, timeMultiplier }) });
    }
    return { stages, minH: stages.reduce((s, x) => s + x.minH, 0), maxH: stages.reduce((s, x) => s + x.maxH, 0) };
  }

  /* ════════════════════════════════════════════════════════════════════════════════════════
   *  Reading actors (not pure, but plain-object friendly)
   * ════════════════════════════════════════════════════════════════════════════════════════ */

  /**
   * The best usable piece of this kind of gear among these actors' items.
   * ⚠ **The BEST, not the first** — a character carrying a Medkit [3] and a Medkit [6] used to get
   * whichever sorted first. Skipped: anything in storage (not on hand — TODO 113's `stored` flag)
   * and a medkit out of supplies. The first actor listed wins a tie (the medic before the patient).
   */
  static findEquipment(actors, kind) {
    const re = SR3EHealing.EQUIPMENT[kind];
    const flag = (i, k) => (typeof i.getFlag === 'function' ? i.getFlag(FLAG, k) : i.flags?.[FLAG]?.[k]);
    let best = null;
    for (const a of actors.filter(Boolean)) {
      for (const i of (a.items ?? [])) {
        if (!re.test(String(i.name ?? ''))) continue;
        if (flag(i, 'stored')) continue;
        if (kind === 'medkit' && flag(i, 'suppliesOut')) continue;
        const rating = itemRating(i);
        if (!best || rating > best.rating) best = { actorId: a.id, itemId: i.id, name: i.name, rating };
      }
    }
    return best;
  }

  /** Dermal armor rating for the permanent-damage and trauma-patch tests: a troll's hide + plating/sheath. */
  static dermalArmorRating(actor) {
    const SA = globalThis.game?.sr3e?.SR3EActor;
    let r = SA?.racialDermalArmor?.(actor?.system?.metatype) ?? 0;
    const pats = globalThis.game?.sr3e?.SR3E?.dermalArmorImplants ?? [/^\s*dermal\s+(plating|sheath)\b/i];
    for (const i of (actor?.items ?? [])) {
      if (i.type === 'cyberware' && pats.some(re => re.test(String(i.name ?? '')))) r += itemRating(i) || 1;
    }
    return r;
  }

  /**
   * Dice from the `healing` situation — Rapid Healing (SR3 p.170: Body *"for Healing Tests, and
   * crippling-injury tests"*) and anything else a GM or item puts there. They ride the Wound
   * Table test, each stage of healing and the permanent-damage test (TODO 76). ⚠ The Wound Table
   * itself says *"cyberware offers no benefits"* — these are magic, and do.
   * @returns {{dice:number, labels:string[]}}
   */
  static healingSituationDice(actor) {
    const list = (actor?.system?.derived?.situationalBonuses ?? []).filter(b => b.situation === 'healing' && (b.dice ?? 0) > 0);
    return { dice: list.reduce((s, b) => s + b.dice, 0), labels: list.map(b => `${b.label} +${b.dice}`) };
  }

  static _skill(actor, re) {
    let best = null;
    for (const i of (actor?.items ?? [])) {
      if (i.type !== 'skill' || !re.test(String(i.system?.skillName || i.name))) continue;
      const r = Number(i.system?.rating) || 0;
      if (!best || r > best.rating) best = { rating: r, name: i.system?.skillName || i.name };
    }
    return best;
  }

  static _state(actor) {
    const w = actor.system?.wounds ?? {};
    const phys = w.physical?.value ?? 0, stun = w.stun?.value ?? 0, over = w.overflow?.value ?? 0;
    const at = actor.system?.attributes ?? {};
    return {
      physical: phys, stun, overflow: over,
      level: SR3EHealing.woundLevel(phys), stunLevel: SR3EHealing.woundLevel(stun),
      awakened: (at.magic?.value ?? at.magic?.base ?? 0) > 0, magic: at.magic?.value ?? 0,
      bodyNatural: at.body?.base ?? 0, body: at.body?.value ?? at.body?.base ?? 0,
      willpower: at.willpower?.value ?? at.willpower?.base ?? 0, willNatural: at.willpower?.base ?? 0,
      essence: at.essence?.value ?? 6, woundMod: actor.system?.woundMod ?? 0,
      record: actor.getFlag?.(FLAG, 'healing') ?? {},
    };
  }

  /* ════════════════════════════════════════════════════════════════════════════════════════
   *  The menu
   * ════════════════════════════════════════════════════════════════════════════════════════ */

  /**
   * Who a user may pick as the patient: their own characters, and — because a medic treats other
   * people — every other player's character and anyone they can see. Only owned patients used to
   * be listed, so player A could not treat player B (reported in play). Hidden NPCs stay hidden.
   */
  static patientsFor(user, actors) {
    const LIMITED = globalThis.CONST?.DOCUMENT_OWNERSHIP_LEVELS?.LIMITED ?? 1;
    return actors.filter(a => (a.type === 'character' || a.type === 'npc') && game.sr3e.isLiveActor(a)
      && (user.isGM || a.isOwner || game.sr3e.SR3EQuery.isPlayerCharacter(a) || a.testUserPermission?.(user, LIMITED)));
  }

  /** The GM-tools entry (and "Treat someone else…"): pick a patient first. */
  static async openPicker() {
    const actors = SR3EHealing.patientsFor(game.user, game.actors.contents ?? [...game.actors])
      .sort((a, b) => Number(b.isOwner) - Number(a.isOwner) || a.name.localeCompare(b.name));
    if (!actors.length) { ui.notifications.warn('No characters you can heal.'); return; }
    let id = null;
    await foundry.applications.api.DialogV2.wait({
      window: { title: '🩹 Healing — who is hurt?' },
      content: `<select id="sr-heal-who" style="width:100%">${actors.map(a => {
        const s = SR3EHealing._state(a);
        return `<option value="${a.id}">${esc(a.name)} — Physical ${s.physical}${s.overflow ? `+${s.overflow}` : ''}, Stun ${s.stun}</option>`;
      }).join('')}</select>`,
      buttons: [{ label: 'Next', action: 'ok', default: true, callback: (_e, _b, d) => { id = d.element.querySelector('#sr-heal-who').value; } },
                { label: 'Cancel', action: 'cancel' }],
    });
    const a = id ? game.actors.get(id) : null;
    if (a) await SR3EHealing.open(a, { fromPicker: true });
  }

  /** The step menu for one patient — the book's order, with what each step needs. */
  static async open(patient, { fromPicker = false } = {}) {
    const s = SR3EHealing._state(patient);
    const rec = s.record;
    const hurt = s.physical > 0 || s.overflow > 0;
    const steps = [
      { key: 'stabilize', show: s.level === 'D' || s.overflow > 0, label: '🚑 Stabilize the Deadly wound',
        note: rec.stabilized ? 'already stabilized' : `losing a box every ${s.bodyNatural || 1} Combat Turns until stabilized (p.125)` },
      { key: 'firstaid', show: hurt, label: '🩹 First aid (Biotech)',
        note: rec.magicHealed ? '⚠ magic already used on these injuries — first aid cannot help (p.129)' : 'within 1 hour of the injury; one level, once' },
      { key: 'magic', show: hurt, label: '✨ Magical healing (Heal / Treat)',
        note: rec.magicHealed ? '⚠ already magically healed — only once per set of injuries (p.194)' : 'Treat within 1 hour; Heal any time; once only' },
      { key: 'attention', show: hurt && s.level !== 'D', label: '🩺 Does it need a doctor? (Body test)',
        note: 'do first aid and magic first (p.127)' },
      { key: 'stage', show: hurt, label: '🛏 Heal one stage (Healing Table)', note: 'time, lifestyle and the bill' },
      { key: 'permanent', show: s.level === 'D' || s.overflow > 0, label: '💀 Deadly wound — permanent damage (Body 4)', note: 'organ, limb or clean' },
      { key: 'magicloss', show: s.awakened, label: '🔮 Awakened — Magic loss check (2D6)', note: 'after a Deadly wound or treatment without the +2' },
      { key: 'stun', show: s.stun > 0, label: '😴 Recover Stun (rest)', note: 'Body or Willpower vs 2 + injury modifiers' },
    ].filter(x => x.show);

    const status = `${esc(patient.name)}: Physical <strong>${s.physical}</strong>${s.overflow ? ` + ${s.overflow} overflow` : ''}
      (${LEVEL_NAME[s.level] ?? 'unhurt'}) · Stun <strong>${s.stun}</strong> (${LEVEL_NAME[s.stunLevel] ?? 'none'})
      ${rec.stabilized ? ' · <span style="color:var(--sr-green)">stabilized</span>' : ''}
      ${rec.magicHealed ? ' · magically healed' : ''}${rec.timeMultiplier > 1 ? ` · healing time ×${rec.timeMultiplier}` : ''}${rec.baseMultiplier > 1 ? ` · base time ×${rec.baseMultiplier}` : ''}`;

    if (!steps.length) {
      // From the sheet, an unhurt character is usually the MEDIC — ask who they are treating.
      if (fromPicker) { ui.notifications.info(`${patient.name} has nothing to heal.`); return; }
      ui.notifications.info(`${patient.name} has nothing to heal — who are you treating?`);
      return SR3EHealing.openPicker();
    }
    let pick = null;
    await foundry.applications.api.DialogV2.wait({
      window: { title: `🩹 Healing — ${patient.name}` },
      content: `<div style="font-size:12px;margin-bottom:8px">${status}</div>
        ${hurt ? (() => {
          const mult = { baseMultiplier: rec.baseMultiplier ?? 1, timeMultiplier: rec.timeMultiplier ?? 1 };
          const road = SR3EHealing.recoveryRoad(s.level || 'L', mult);
          return SR3EHealing._timeBox(`${SR3EHealing.formatHours(road.minH)} – ${SR3EHealing.formatHours(road.maxH)}`,
            'to heal fully by the Healing Table, one stage at a time — first aid or magic first can take a stage off')
            + SR3EHealing._roadHtml(s.level || 'L', mult);
        })() : ''}
        <div style="display:flex;flex-direction:column;gap:4px">${steps.map((x, i) => `
          <label style="display:grid;grid-template-columns:16px 1fr;gap:6px;align-items:start;padding:3px 2px;cursor:pointer">
            <input type="radio" name="sr-heal-step" value="${x.key}" ${i === 0 ? 'checked' : ''}/>
            <span><strong>${x.label}</strong><br><span style="font-size:11px;color:var(--sr-muted)">${x.note}</span></span>
          </label>`).join('')}</div>
        <p style="font-size:11px;color:var(--sr-muted);margin-top:8px">Order (SR3 p.127): stabilize → first aid (within an hour) →
        magic (once) → does it need a doctor? → heal one stage at a time. Nothing is applied until someone clicks it on a card.</p>`,
      buttons: [{ label: 'Next', action: 'ok', default: true,
                  callback: (_e, _b, d) => { pick = d.element.querySelector('input[name="sr-heal-step"]:checked')?.value; } },
                { label: 'Treat someone else…', action: 'other', callback: () => { pick = 'other'; } },
                ...(game.user.isGM ? [{ label: 'New injuries (clear record)', action: 'reset',
                  callback: () => { pick = 'reset'; } }] : []),
                { label: 'Cancel', action: 'cancel' }],
    });
    if (!pick) return;
    if (pick === 'other') return SR3EHealing.openPicker();
    if (pick === 'reset') { await patient.unsetFlag(FLAG, 'healing'); ui.notifications.info(`${patient.name}: healing record cleared.`); return; }
    return SR3EHealing.setup(patient, pick);
  }

  /* ════════════════════════════════════════════════════════════════════════════════════════
   *  Step set-up → a card with a Roll button for whoever rolls
   * ════════════════════════════════════════════════════════════════════════════════════════ */

  static _actorOptions(filterFn = () => true, selectedId = null, sortFn = null) {
    // Whoever is on the scene — a medic works at the patient's side (F2) — and always the one
    // already chosen, so a default from off the canvas is never silently dropped.
    let list = game.sr3e.sceneFirst(game.actors.filter(a => (a.type === 'character' || a.type === 'npc') && game.sr3e.isLiveActor(a) && filterFn(a)));
    const chosen = selectedId ? game.actors.get(selectedId) : null;
    if (chosen && !list.includes(chosen)) list = [chosen, ...list];
    if (sortFn) list = list.sort(sortFn);
    return list.map(a => `<option value="${a.id}" ${a.id === selectedId ? 'selected' : ''}>${esc(a.name)}</option>`).join('');
  }

  static async _form(title, content, render) {
    let out = null;
    await foundry.applications.api.DialogV2.wait({
      window: { title }, content, render,
      buttons: [{ label: 'Post card', action: 'ok', default: true, callback: (_e, _b, d) => {
                  out = {}; d.element.querySelectorAll('[data-f]').forEach(el => {
                    out[el.dataset.f] = el.type === 'checkbox' ? el.checked : el.value; }); } },
                { label: 'Cancel', action: 'cancel' }],
    });
    return out;
  }

  static async setup(patient, step) {
    const s = SR3EHealing._state(patient);
    const H = SR3EHealing;
    // Rapid Healing and anything else in the `healing` situation — added to the patient's Body
    // tests (Wound Table, each stage, permanent damage) and named on the card (TODO 76).
    const hd = H.healingSituationDice(patient);
    const hdText = hd.dice ? ` + ${hd.labels.join(', ')}` : '';
    const row = (label, inner) => `<label style="display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;margin:3px 0">${label}${inner}</label>`;
    const chk = (f, label, on, note = '') => `<label style="display:flex;gap:6px;align-items:center;margin:3px 0"><input type="checkbox" data-f="${f}" ${on ? 'checked' : ''}/> ${label}${note ? ` <span style="font-size:11px;color:var(--sr-muted)">${note}</span>` : ''}</label>`;
    const sel = (f, opts) => `<select data-f="${f}">${opts.map(([v, l, on]) => `<option value="${v}" ${on ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
    const cond = f => sel(f, [['good', 'Good'], ['bad', 'Bad (+1) — a city street'], ['terrible', 'Terrible (+3) — street, rain, gunfire']]);
    const biotechOf = a => H._skill(a, /^biotech/i)?.rating ?? -1;

    switch (step) {
      case 'stun': {
        const r = H.stunRecovery({ body: s.body, willpower: s.willpower, woundMod: s.woundMod });
        return H._post(patient, {
          step, rollerId: patient.id, pool: r.dice, tn: r.tn, skipWoundMod: true,
          title: `😴 Recover Stun — ${patient.name}`, rollLabel: `Roll ${r.attribute}`,
          lines: [H._timeBox('60 minutes ÷ successes', `for each box of Stun · ${s.stun} to recover · complete rest (p.126)`),
                  `${r.attribute} ${r.dice} (the higher of Body or Willpower) vs TN 2 + injury modifiers ${-Math.min(0, s.woundMod)} = <strong>${r.tn}</strong>`,
                  s.stun >= 10 ? '⚠ Unconscious from Deadly Stun: does not wake until Stun is back to Serious.' : ''],
        });
      }

      case 'firstaid': {
        // Treating someone else's character: the medic is, by default, your own character.
        const mine = game.user.isGM ? null : game.user.character;
        const defMedic = mine && mine.id !== patient.id ? mine.id
          : game.sr3e.sceneFirst(game.actors.filter(a => (a.type === 'character' || a.type === 'npc') && game.sr3e.isLiveActor(a)))
            .sort((a, b) => biotechOf(b) - biotechOf(a))[0]?.id ?? patient.id;
        const medkit = H.findEquipment([patient, game.actors.get(defMedic)], 'medkit');
        const f = await H._form(`🩹 First aid — ${patient.name}`, `
          ${row('Medic', `<select data-f="medicId">${H._actorOptions(() => true, defMedic, (a, b) => biotechOf(b) - biotechOf(a))}</select>`)}
          <div style="font-size:12px;margin:4px 0">Wound: <strong>${LEVEL_NAME[s.level]}</strong>${s.level === 'D' ? ' — first aid can only <strong>stabilize</strong> it (p.129)' : ''}</div>
          ${row('Conditions', cond('conditions'))}
          ${chk('medkit', 'Medkit available', !!medkit, medkit ? `(${esc(medkit.name)}) — without one +4` : '(none found — +4 unless you have one)')}
          ${s.awakened ? chk('awakenedApplied', 'Treat as Awakened (+2 TN)', true, 'declining it risks Magic (p.129)') : ''}
          ${chk('withinHour', 'Within one hour of the injury', true, 'first aid has no effect after that')}
          ${chk('paramedic', `Paid paramedic (${yen(H.MEDICAL_COSTS.paramedic[s.level] ?? 0)})`, false, 'Medical Costs Table')}
          ${s.record.magicHealed ? '<div style="color:var(--sr-amber);font-size:11px">⚠ Magic has already been used on these injuries — Biotech cannot help (p.129).</div>' : ''}`);
        if (!f) return;
        const medic = game.actors.get(f.medicId);
        const sk = H._skill(medic, /^biotech/i);
        const medkitNow = f.medkit ? (H.findEquipment([medic, patient], 'medkit') ?? medkit) : null;
        const kitRating = medkitNow ? (medkitNow.rating || H.MEDKIT_BIOTECH) : 0;
        const savior = /savior/i.test(medkitNow?.name ?? '');
        const tn = H.firstAidTN({ level: s.level, awakened: s.awakened, awakenedApplied: f.awakenedApplied !== false,
                                  conditions: f.conditions, body: s.body, medkit: f.medkit, savior });
        const dice = H.firstAidDice({ biotech: sk?.rating ?? 0, medkitRating: f.medkit ? kitRating : 0 });
        return H._post(patient, {
          step, rollerId: medic.id, pool: dice.dice, tn: tn.tn, level: s.level,
          defaulting: dice.defaulting, linkedAttr: 'intelligence', skillName: 'Biotech',
          medkit: medkitNow ? { actorId: medkitNow.actorId, itemId: medkitNow.itemId, name: medkitNow.name } : null,
          awakened: s.awakened, treatedWithoutMod: s.awakened && f.awakenedApplied === false,
          paramedic: f.paramedic ? (H.MEDICAL_COSTS.paramedic[s.level] ?? 0) : 0,
          withinHour: f.withinHour, stabilizeOnly: tn.stabilizeOnly,
          title: `🩹 First aid — ${medic.name} treats ${patient.name}`, rollLabel: `Roll Biotech (${medic.name})`,
          lines: [tn.stabilizeOnly ? H._timeBox('Stabilize now', 'Deadly: first aid stops the overflow — it cannot heal the wound')
                    : H._timeBox(`up to ${H.formatTurns(H.FIRST_AID_TABLE[s.level]?.turns)}`, 'the First Aid Table time ÷ successes — uninterrupted (p.129)'),
                  `${dice.defaulting ? 'No Biotech and no medkit — you will choose how to default' : `${dice.dice} dice: ${dice.note}`} vs TN <strong>${tn.tn}</strong>: ${tn.parts.map(([l, v]) => `${l} ${v >= 0 && l !== tn.parts[0][0] ? '+' : ''}${v}`).join(', ')}`,
                  medkitNow ? 'A medkit does not work by itself — it needs a living user (M&M p.138).' : '',
                  tn.stabilizeOnly ? '<strong>Deadly:</strong> one success stabilizes; it cannot heal.'
                    : `One success lowers the wound one level (never more). Time: ${H.FIRST_AID_TABLE[s.level]?.turns} Combat Turns ÷ successes.`,
                  f.withinHour ? '' : '⚠ More than an hour after the injury — first aid has no effect (p.129).',
                  s.record.magicHealed ? '⚠ Magic already used on these injuries — Biotech cannot help.' : ''],
        });
      }

      case 'magic': {
        const caster = game.sr3e.sceneFirst(game.actors.filter(a => (a.type === 'character' || a.type === 'npc') && game.sr3e.isLiveActor(a)
          && H._skill(a, /^sorcery/i))).sort((a, b) => (H._skill(b, /^sorcery/i).rating) - (H._skill(a, /^sorcery/i).rating));
        if (!caster.length) { ui.notifications.warn('Nobody in the world has Sorcery.'); return; }
        const f = await H._form(`✨ Magical healing — ${patient.name}`, `
          ${row('Caster', `<select data-f="casterId">${caster.map(a => `<option value="${a.id}">${esc(a.name)} (Sorcery ${H._skill(a, /^sorcery/i).rating})</option>`).join('')}</select>`)}
          ${row('Spell', sel('spell', [['heal', 'Heal — any time', true], ['treat', 'Treat — within 1 hour, permanent in half the time']]))}
          ${row('Force', `<input type="number" data-f="force" value="${Math.max(1, s.physical)}" min="1" style="width:60px"/>`)}
          ${row('Spell Pool dice', '<input type="number" data-f="spellPool" value="0" min="0" style="width:60px"/>')}
          ${chk('withinHour', 'Within one hour of the injury', true, 'Treat has no effect after that')}
          <div style="font-size:11px;color:var(--sr-muted)">TN 10 − ${esc(patient.name)}'s Essence ${s.essence} = <strong>${H.healSpellTN(s.essence)}</strong>.
          Each success heals a box (up to Force) or shortens the time to become permanent. Touch required.
          Physical damage from Drain cannot be healed by magic (p.162).</div>
          ${s.record.magicHealed ? '<div style="color:var(--sr-amber);font-size:11px">⚠ Already magically healed — a second healing spell has no effect (p.194).</div>' : ''}`);
        if (!f) return;
        const c = game.actors.get(f.casterId);
        const sorc = H._skill(c, /^sorcery/i)?.rating ?? 0;
        const force = Math.max(1, parseInt(f.force) || 1);
        return H._post(patient, {
          step, rollerId: c.id, pool: sorc + Math.max(0, parseInt(f.spellPool) || 0), tn: H.healSpellTN(s.essence),
          spell: f.spell, force, level: s.level, spellPool: Math.max(0, parseInt(f.spellPool) || 0), sorcery: sorc,
          withinHour: f.withinHour,
          title: `✨ ${f.spell === 'treat' ? 'Treat' : 'Heal'} (Force ${force}) — ${c.name} on ${patient.name}`,
          rollLabel: `Roll Sorcery (${c.name})`,
          lines: [`Sorcery ${sorc}${f.spellPool > 0 ? ` + ${f.spellPool} Spell Pool` : ''} vs TN <strong>${H.healSpellTN(s.essence)}</strong> (10 − Essence)`,
                  `Up to ${force} box${force === 1 ? '' : 'es'} healed. Drain ${Math.max(2, Math.floor(force / 2) + (f.spell === 'treat' ? -1 : 0))}${s.level || 'L'} — the patient's wound level.`,
                  f.spell === 'treat' && !f.withinHour ? '⚠ Treat after an hour has no effect (p.194).' : '',
                  s.record.magicHealed ? '⚠ Already magically healed — no effect (p.194).' : ''],
        });
      }

      case 'attention': {
        // No Wound Table row → no test. The menu hides this at Deadly, but an older card's
        // "Next" button can still land here after the wound has got worse.
        if (H.attentionTN(s.level) === null) {
          return H._postAction(patient, `🩺 ${s.level === 'D' ? 'Needs medical attention' : 'No Physical wound'} — ${patient.name}`,
            [s.level === 'D' ? 'A Deadly wound always needs medical attention — there is no test (p.127).' : 'Nothing to test.'],
            [s.level === 'D' ? { act: 'next', ownerId: patient.id, step: 'stage', label: '🛏 Heal one stage' } : null], { color: s.level === 'D' ? 'var(--sr-red)' : '' });
        }
        const unit = H.findEquipment([patient], 'stabilization');
        const f = await H._form(`🩺 Does it need a doctor? — ${patient.name}`, `
          <div style="font-size:12px">Body Test, <strong>natural Body only</strong> (${s.bodyNatural}), against the Wound Table:
          ${LEVEL_NAME[s.level]} = TN ${H.WOUND_TEST_TN[s.level]} (p.126). Taken in combat, it costs the next Combat Turn.</div>
          ${chk('unit', 'In a stabilization unit (−2)', !!unit, unit ? `(${esc(unit.name)})` : '')}`);
        if (!f) return;
        const tn = H.attentionTN(s.level, { stabilizationUnit: f.unit });
        return H._post(patient, {
          step, rollerId: patient.id, pool: s.bodyNatural + hd.dice, tn, skipWoundMod: true, level: s.level,
          title: `🩺 Does it need a doctor? — ${patient.name}`, rollLabel: 'Roll natural Body',
          lines: [`Natural Body ${s.bodyNatural}${hdText} vs TN <strong>${tn}</strong>${f.unit ? ' (stabilization unit −2)' : ''}`,
                  'Any success: heals without medical attention. None: needs medical attention to heal at all.'],
        });
      }

      case 'stage': {
        const unit = H.findEquipment([patient], 'stabilization');
        const lvl = s.level || 'L';
        const f = await H._form(`🛏 Heal one stage — ${patient.name}`, `
          <div style="font-size:12px;margin-bottom:4px">${LEVEL_NAME[lvl]} → ${LEVEL_NAME[NEXT_DOWN[lvl]] ?? 'healed'}.
          Healing Table: base ${H.formatHours(H.HEALING_TABLE[lvl].base)}, minimum ${H.formatHours(H.HEALING_TABLE[lvl].min)},
          TN ${H.HEALING_TABLE[lvl].tn}, minimum lifestyle <strong>${H.HEALING_TABLE[lvl].lifestyle}</strong> (p.127).</div>
          ${H._roadHtml(lvl, { baseMultiplier: s.record.baseMultiplier ?? 1, timeMultiplier: s.record.timeMultiplier ?? 1 })}
          ${row('Care', sel('care', [['none', 'Resting (no doctor)'], ['doctor', `Doctor visits — ${yen(H.MEDICAL_COSTS.doctorPerDay[lvl])}/day`],
                                    ['hospital', `Hospital — ${yen(H.MEDICAL_COSTS.hospitalPerDay)}/day incl. doctor`],
                                    ...(lvl === 'D' ? [['icu', `Intensive care — ${yen(H.MEDICAL_COSTS.icuPerDay)}/day`]] : [])]))}
          ${row('Doctor\'s conditions', sel('conditions', [['hospital', 'Hospital or clinic'], ['notHospital', 'Not in hospital or clinic (+2)'],
                                                        ['bad', 'Bad (+3)'], ['terrible', 'Terrible (+4)']]))}
          ${chk('magicalCare', 'Long-term magical care (−2)', false)}
          ${chk('unit', 'In a stabilization unit (−2)', !!unit, unit ? `(${esc(unit.name)})` : '')}
          <div style="font-size:11px;color:var(--sr-muted)">The Doctoring Table applies only with a real doctor (hospital, clinic or doctor visits):
          intensive care −2; patient is a magician +2; natural Body ${s.bodyNatural} and Willpower ${s.willNatural} by band (p.128).
          ${s.record.timeMultiplier > 1 ? `<br>⚠ Organ damage: the whole healing time is ×${s.record.timeMultiplier}.` : ''}
          ${s.record.baseMultiplier > 1 ? `<br>⚠ Lost eye or limb: base time ×${s.record.baseMultiplier}.` : ''}</div>`);
        if (!f) return;
        const doctor = f.care !== 'none';
        const dm = doctor ? H.doctoringModifier({ intensiveCare: f.care === 'icu', magicalCare: f.magicalCare,
          conditions: f.care === 'hospital' || f.care === 'icu' ? 'hospital' : f.conditions,
          magician: s.awakened, body: s.bodyNatural, willpower: s.willNatural }) : { mod: 0, parts: [] };
        const tn = H.stageTN(lvl, { doctorMod: dm.mod, stabilizationUnit: f.unit });
        return H._post(patient, {
          step, rollerId: patient.id, pool: s.bodyNatural + hd.dice, tn, skipWoundMod: true, level: lvl, care: f.care,
          baseMultiplier: s.record.baseMultiplier ?? 1, timeMultiplier: s.record.timeMultiplier ?? 1,
          title: `🛏 Healing ${LEVEL_NAME[lvl]} → ${LEVEL_NAME[NEXT_DOWN[lvl]] ?? 'healed'} — ${patient.name}`, rollLabel: 'Roll natural Body',
          lines: [(() => {
                    const x = H.recoveryRoad(lvl, { baseMultiplier: s.record.baseMultiplier ?? 1, timeMultiplier: s.record.timeMultiplier ?? 1 }).stages[0];
                    return H._timeBox(`${H.formatHours(x.minH)} – ${H.formatHours(x.maxH)}`,
                      `for ${LEVEL_NAME[lvl]} → ${LEVEL_NAME[NEXT_DOWN[lvl]] ?? 'healed'} · 1 success is the longest; more successes shorten it to the minimum (p.127)`);
                  })(),
                  `Natural Body ${s.bodyNatural}${hdText} vs TN <strong>${tn}</strong>: Healing Table ${H.HEALING_TABLE[lvl].tn}`
                    + dm.parts.map(([l, v]) => `, ${l} ${v > 0 ? '+' : ''}${v}`).join('') + (f.unit ? ', stabilization unit −2' : ''),
                  `Base ${H.formatHours(H.HEALING_TABLE[lvl].base)} ÷ successes, never under ${H.formatHours(H.HEALING_TABLE[lvl].min)}.`],
        });
      }

      case 'permanent': {
        const trauma = H.findEquipment([patient], 'trauma');
        const dermal = H.dermalArmorRating(patient);
        const f = await H._form(`💀 Permanent damage — ${patient.name}`, `
          <div style="font-size:12px">Body Test against TN 4 after a Deadly wound; dermal armor counts (p.127).</div>
          ${chk('traumaUsed', 'A trauma patch was used (+2)', false, trauma ? '' : '')}`);
        if (!f) return;
        const tn = H.permanentDamageTN({ traumaPatch: f.traumaUsed });
        return H._post(patient, {
          step, rollerId: patient.id, pool: s.bodyNatural + dermal + hd.dice, tn, skipWoundMod: true,
          awakened: s.awakened,
          title: `💀 Deadly wound — permanent damage? ${patient.name}`, rollLabel: 'Roll Body',
          lines: [`Natural Body ${s.bodyNatural}${dermal ? ` + dermal armor ${dermal}` : ''}${hdText} vs TN <strong>${tn}</strong>${f.traumaUsed ? ' (trauma patch +2)' : ''}`,
                  '0 successes: a vital organ (time ×2, an Attribute point lost) · 1: an eye or limb (base time +50%) · 2+: nothing lasting.'],
        });
      }

      case 'magicloss': {
        const f = await H._form(`🔮 Magic loss — ${patient.name}`, `
          <div style="font-size:12px">2D6 against current Magic ${s.magic}: a roll at or below it loses 1 Magic, permanently (p.129).</div>
          ${chk('deadly', 'Took a Deadly wound', s.level === 'D' || s.overflow > 0)}
          ${chk('withoutMod', 'Treated without the +2 Awakened modifier', false)}`);
        if (!f) return;
        const n = H.magicLossRolls({ awakened: true, deadly: f.deadly, treatedWithoutMod: f.withoutMod });
        if (!n) { ui.notifications.info('No Magic loss roll is owed.'); return; }
        return H._postAction(patient, `🔮 Magic loss check — ${patient.name}`,
          [`${n} × 2D6 against Magic ${s.magic}.`], [{ act: 'magic-loss', label: `🎲 Roll ${n} × 2D6`, ownerId: patient.id, n }]);
      }

      case 'stabilize': {
        const unit = H.findEquipment([patient], 'stabilization');
        const trauma = H.findEquipment([patient], 'trauma');
        const antidote = H.findEquipment([patient], 'antidote');
        const f = await H._form(`🚑 Stabilize — ${patient.name}`, `
          <div style="font-size:12px;margin-bottom:4px">Overflow ${s.overflow} of ${s.bodyNatural} — a box every ${s.bodyNatural || 1} Combat Turns; death past Body (p.125).</div>
          ${row('How', sel('how', [
            ['unit', `Stabilization unit — automatic${unit ? ` (${esc(unit.name)})` : ' (none carried)'}`, !!unit],
            ['firstaid', 'First aid (Biotech, TN 10) — one success', !unit],
            ['self', 'The patient\'s own Body (natural, TN 10)'],
            ['trauma', `Trauma patch — Body vs 4 + dermal armor${trauma ? ` (${esc(trauma.name)})` : ' (none carried)'}`],
            ['spell', 'Stabilize spell (Force ≥ overflow; TN 4 + minutes)']]))}
          ${row('Minutes since the Deadly damage', '<input type="number" data-f="minutes" value="1" min="0" style="width:60px"/>')}
          ${antidote ? `<div style="font-size:11px;color:var(--sr-muted)">${esc(antidote.name)}: add its rating (${antidote.rating}) in dice to stabilization tests (p.305).</div>` : ''}`);
        if (!f) return;
        const bonus = antidote?.rating ?? 0;
        if (f.how === 'unit') {
          return H._postAction(patient, `🚑 Stabilization unit — ${patient.name}`,
            ['Stabilization units automatically stabilize any person placed inside (p.305); healing tests while in it get −2.'],
            [{ act: 'stabilized', label: '✔ Mark stabilized', ownerId: patient.id }]);
        }
        if (f.how === 'firstaid') return H.setup(patient, 'firstaid');
        if (f.how === 'spell') {
          const casters = game.sr3e.sceneFirst(game.actors.filter(a => (a.type === 'character' || a.type === 'npc') && game.sr3e.isLiveActor(a) && H._skill(a, /^sorcery/i)));
          if (!casters.length) { ui.notifications.warn('Nobody in the world has Sorcery.'); return; }
          const g = await H._form('✨ Stabilize spell', `
            ${row('Caster', `<select data-f="casterId">${casters.map(a => `<option value="${a.id}">${esc(a.name)}</option>`).join('')}</select>`)}
            ${row('Force', `<input type="number" data-f="force" value="${Math.max(1, s.overflow)}" min="1" style="width:60px"/>`)}`);
          if (!g) return;
          const c = game.actors.get(g.casterId), force = Math.max(1, parseInt(g.force) || 1);
          const st = H.stabilizeSpell({ force, overflow: s.overflow, minutes: parseInt(f.minutes) || 0 });
          return H._post(patient, {
            step: 'stabspell', rollerId: c.id, pool: H._skill(c, /^sorcery/i)?.rating ?? 0, tn: st.tn, force,
            effective: st.effective, title: `✨ Stabilize (Force ${force}) — ${c.name} on ${patient.name}`, rollLabel: `Roll Sorcery (${c.name})`,
            lines: [`Sorcery vs TN <strong>${st.tn}</strong> (4 + ${parseInt(f.minutes) || 0} minutes)`,
                    st.effective ? `Force ${force} ≥ overflow ${s.overflow}: one success stabilizes; no Body Test for death is needed.`
                      : `⚠ Force ${force} is below the overflow ${s.overflow} — the spell has no effect (p.194).`,
                    `Drain ${Math.max(2, Math.floor(force / 2) + 1)}M (+1(M)).`],
          });
        }
        const dermal = H.dermalArmorRating(patient);
        const tn = f.how === 'trauma' ? H.traumaPatchTN({ dermalArmor: dermal }) : 10;
        return H._post(patient, {
          step: 'selfstab', rollerId: patient.id, pool: s.bodyNatural + bonus, tn, skipWoundMod: true, trauma: f.how === 'trauma',
          title: `🚑 ${f.how === 'trauma' ? 'Trauma patch' : 'Self-stabilization'} — ${patient.name}`, rollLabel: 'Roll natural Body',
          lines: [`Natural Body ${s.bodyNatural}${bonus ? ` + antidote patch ${bonus}` : ''} vs TN <strong>${tn}</strong>`
                    + (f.how === 'trauma' && dermal ? ` (4 + dermal armor ${dermal})` : ''),
                  'Success: stabilized — no more boxes of overflow. Failure: dies once overflow exceeds Body (p.129).',
                  f.how === 'trauma' ? 'A trauma patch makes permanent damage likelier (+2 on that test).' : ''],
        });
      }
    }
  }

  /* ════════════════════════════════════════════════════════════════════════════════════════
   *  Cards
   * ════════════════════════════════════════════════════════════════════════════════════════ */

  static _payload(o) { return esc(JSON.stringify(o)); }

  /** The big "how long" box on a card — a time buried in a line of text was easy to miss (reported in play). */
  static _timeBox(big, sub = '') {
    return `<div class="sr-heal-time"><span class="sr-heal-time-big">⏱ ${big}</span>${sub ? `<span class="sr-heal-time-sub">${sub}</span>` : ''}</div>`;
  }

  /** The Healing Table stages still ahead, fastest to slowest (1 success), with each TN. */
  static _roadHtml(level, mult = {}) {
    const H = SR3EHealing;
    const road = H.recoveryRoad(level, mult);
    if (!road.stages.length) return '';
    const span = (a, b) => (a === b ? H.formatHours(a) : `${H.formatHours(a)} – ${H.formatHours(b)}`);
    return `<div class="sr-heal-road"><table>
      <tr><th>Stage</th><th>Time</th><th>TN</th></tr>
      ${road.stages.map(x => `<tr><td>${LEVEL_NAME[x.from]} → ${LEVEL_NAME[x.to] ?? 'healed'}</td><td>${span(x.minH, x.maxH)}</td><td>${x.tn}</td></tr>`).join('')}
      ${road.stages.length > 1 ? `<tr class="sr-heal-road-total"><td>All of it</td><td>${span(road.minH, road.maxH)}</td><td></td></tr>` : ''}
    </table></div>`;
  }

  /** Card lines: text is wrapped as a line; a ready-made block (a time box, the road) goes in as it is. */
  static _lines(lines) {
    return lines.filter(Boolean).map(l => (l.startsWith('<div') ? l : `<div class="sr-heal-line">${l}</div>`)).join('');
  }

  /** A roll card: the numbers, editable pool and TN, and a Roll button for whoever rolls. */
  static async _post(patient, ctx) {
    const roller = game.actors.get(ctx.rollerId);
    const p = { ...ctx, patientId: patient.id, label: ctx.title };
    const content = `<div class="sr-roll-card sr-heal-card" data-heal-step="${esc(ctx.step)}">
      <div class="sr-roll-header">${esc(ctx.title)}</div>
      ${SR3EHealing._lines(ctx.lines)}
      <div class="sr-soak-pool-row">
        <span>Dice</span><input type="number" class="sr-heal-pool" value="${ctx.pool}" min="0"/>
        <span>TN</span><input type="number" class="sr-heal-tn" value="${ctx.tn}" min="2"/>
      </div>
      <button type="button" class="sr-heal-roll-btn" data-payload='${H_payload(p)}'>🎲 ${esc(ctx.rollLabel ?? `Roll (${roller?.name ?? ''})`)}</button>
    </div>`;
    return ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: roller ?? patient }), content,
                                style: CONST.CHAT_MESSAGE_STYLES.OTHER });
  }

  /** A card with action buttons only (no roll). */
  static async _postAction(patient, title, lines, actions, { color = '' } = {}) {
    const content = `<div class="sr-roll-card sr-heal-card">
      <div class="sr-roll-header"${color ? ` style="color:${color}"` : ''}>${esc(title)}</div>
      ${SR3EHealing._lines(lines)}
      ${SR3EHealing._buttons(actions)}
    </div>`;
    return ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: patient }), content,
                                style: CONST.CHAT_MESSAGE_STYLES.OTHER });
  }

  static _buttons(actions) {
    return actions.filter(Boolean).map(a => a.input
      ? `<div class="sr-soak-pool-row"><span>${esc(a.input.label)}</span><input type="number" class="sr-heal-n" value="${a.input.value}" min="0" max="${a.input.max ?? 99}"/></div>
         <button type="button" class="sr-heal-act-btn" data-payload='${H_payload(a)}'>${esc(a.label)}</button>`
      : `<button type="button" class="sr-heal-act-btn" data-payload='${H_payload(a)}'>${esc(a.label)}</button>`).join('');
  }

  /**
   * Dice and TN on a roll card are the GM's to change, not the player's (reported in play).
   * ⚠ A GM's edit is SAVED ON THE MESSAGE (flag `healRoll`), not just typed into their own copy of
   * the card: the roll usually runs on the player's client, which never sees another client's DOM.
   * Called from `renderChatMessageHTML`, so every client shows the saved numbers.
   */
  static wireCard(message, html) {
    const saved = message?.getFlag?.(FLAG, 'healRoll') ?? {};
    for (const [cls, key] of [['.sr-heal-pool', 'pool'], ['.sr-heal-tn', 'tn']]) {
      const input = html.querySelector(cls);
      if (!input) continue;
      if (Number.isFinite(saved[key])) input.value = saved[key];
      if (!game.user.isGM) { input.readOnly = true; input.title = 'Set by the GM'; continue; }
      input.addEventListener('change', () => {
        const v = parseInt(input.value);
        if (Number.isFinite(v)) message.setFlag(FLAG, 'healRoll', { ...(message.getFlag(FLAG, 'healRoll') ?? {}), [key]: v });
      });
    }
  }

  /** The Roll button on a healing card. Runs on the roller's client. */
  static async rollFromCard(btn, p) {
    const card = btn.closest('.sr-heal-card');
    const saved = game.messages?.get(btn.closest('[data-message-id]')?.dataset.messageId)?.getFlag(FLAG, 'healRoll') ?? {};
    // Only a GM's own box is read; everyone else rolls what the GM saved, else what was posted.
    let pool = game.user.isGM ? parseInt(card?.querySelector('.sr-heal-pool')?.value) : NaN;
    let tn   = game.user.isGM ? parseInt(card?.querySelector('.sr-heal-tn')?.value) : NaN;
    if (!Number.isFinite(pool)) pool = saved.pool ?? p.pool;
    if (!Number.isFinite(tn))   tn = saved.tn ?? p.tn;
    const roller = game.actors.get(p.rollerId);
    if (!roller) { ui.notifications.warn('That character no longer exists.'); return; }
    if (p.defaulting && pool <= 0) {
      const def = await game.sr3e.SR3EItem.promptDefaultChoice(roller, {
        linkedAttr: p.linkedAttr ?? 'intelligence', title: `Defaulting — ${roller.name}`,
        message: `${roller.name} has no <strong>${esc(p.skillName ?? 'skill')}</strong> — choose how to default:` });
      if (!def) return;
      pool = def.pool; tn += def.tnMod;
    }
    // Spell Pool is charged here, when the caster rolls, not when the card is posted — an unrolled
    // card must cost nothing. A pool that has run dry since drops the dice it could not pay for.
    if (p.spellPool > 0) {
      const spent = await roller.spendSpellPool(p.spellPool);
      if (spent < p.spellPool) {
        pool = Math.max(0, pool - (p.spellPool - spent));
        ui.notifications.info(`${roller.name} had only ${spent} Spell Pool left — rolling ${pool} dice.`);
      }
    }
    if (pool <= 0) { ui.notifications.warn(`${roller.name} has no dice for this.`); return; }
    await roller.rollPool(pool, tn, p.label, { healingContext: { ...p, pool, tn }, skipWoundMod: !!p.skipWoundMod });
  }

  /** Called by `_postWaveCard` on the final wave. Posts the result card for this step. */
  static async onRolled(ctx, successes) {
    const H = SR3EHealing;
    const patient = game.actors.get(ctx.patientId);
    if (!patient) return;
    const s = H._state(patient);
    const n = Number(successes) || 0;
    const nextBoxes = H.oneLevelDown(s.physical);
    // `byId`: whoever made this roll (the medic, the caster) may press what it produced, as well as
    // the patient's owner — a medic treating another player's character (reported in play).
    const by = ctx.rollerId;
    const lower = { act: 'lower', ownerId: patient.id, byId: by, label: `✔ Lower the wound to ${LEVEL_NAME[H.woundLevel(nextBoxes)] ?? 'healed'} (Physical ${s.physical} → ${nextBoxes})` };
    const next  = (step, label) => ({ act: 'next', ownerId: patient.id, byId: by, step, label });
    const stabilized = { act: 'stabilized', ownerId: patient.id, byId: by, label: '✔ Mark stabilized' };
    const charge = (amount, what, payerId = patient.id) => amount > 0
      ? { act: 'charge', ownerId: payerId, amount, what, label: `💴 Charge ${yen(amount)} — ${what}` } : null;
    const good = 'var(--sr-green)', bad = 'var(--sr-red)';

    switch (ctx.step) {
      case 'stun': {
        const min = H.stunBoxMinutes(n);
        return H._postAction(patient, `😴 Stun recovery — ${patient.name}`,
          [min ? H._timeBox(H.formatHours(min / 60), `for 1 box of Stun, resting completely${s.stun > 1
                   ? ` · about ${H.formatHours((min * s.stun) / 60)} for all ${s.stun} if every roll goes like this one` : ''}`)
               : H._timeBox('No recovery this rest', 'no successes — rest and roll again'),
           min ? `${n} success${n === 1 ? '' : 'es'}: <strong>1 box</strong> of Stun returns after ${H.formatHours(min / 60)}.` : '',
           'If the rest is interrupted, roll again: the new result can never be better than the first (p.126).'],
          [min ? { act: 'erase-stun', ownerId: patient.id, label: '✔ Erase 1 Stun box' } : null,
           s.stun > (min ? 1 : 0) ? next('stun', min ? '😴 Roll for the next box' : '😴 Rest and roll again') : null], { color: min ? good : bad });
      }

      case 'firstaid': {
        const out = H.firstAidOutcome({ level: ctx.level, successes: n });
        const noEffect = !ctx.withinHour || s.record.magicHealed;
        const loss = H.magicLossRolls({ awakened: ctx.awakened, deadly: ctx.level === 'D', treatedWithoutMod: ctx.treatedWithoutMod });
        const lines = [], actions = [];
        if (noEffect) lines.push(`⚠ ${!ctx.withinHour ? 'More than an hour after the injury' : 'Magic has already been used'} — first aid has no effect (p.129).`);
        else if (ctx.level === 'D') {
          lines.push(out.stabilized ? `${n} success${n === 1 ? '' : 'es'}: <strong>stabilized</strong> — no more boxes of overflow.`
                                    : 'No successes: not stabilized. The patient rolls natural Body against TN 10 (p.129).');
          actions.push(out.stabilized ? stabilized : next('stabilize', '🚑 Other ways to stabilize'));
          lines.push('When professional help arrives, make another Biotech Test and Body Test (p.129).');
        } else {
          if (out.lowered) lines.push(H._timeBox(H.formatTurns(out.turns), `of uninterrupted treatment · then the wound is ${LEVEL_NAME[NEXT_DOWN[ctx.level]] ?? 'healed'}`));
          lines.push(out.lowered ? `${n} success${n === 1 ? '' : 'es'}: the wound drops <strong>one level</strong>. A serious interruption means starting again.`
                                 : 'No successes: no improvement.');
          if (out.lowered) actions.push(lower);
        }
        if (ctx.medkit) actions.push({ act: 'medkit', ownerId: ctx.rollerId, medkit: ctx.medkit, label: `🎲 Medkit supplies check (1D6) — ${ctx.medkit.name}` });
        if (loss) actions.push({ act: 'magic-loss', ownerId: patient.id, n: loss, label: `🔮 Magic loss: roll ${loss} × 2D6 (p.129)` });
        actions.push(charge(ctx.paramedic, 'paramedic first aid'));
        if (ctx.level !== 'D') actions.push(next('attention', '🩺 Next: does it need a doctor?'));
        return H._postAction(patient, `🩹 First aid result — ${patient.name}`, lines, actions,
          { color: noEffect ? bad : (out.lowered || out.stabilized) ? good : bad });
      }

      case 'magic': {
        const noEffect = s.record.magicHealed || (ctx.spell === 'treat' && !ctx.withinHour);
        const need = s.physical + s.overflow;
        const r = H.healSpell({ spell: ctx.spell, successes: n, toHealing: Math.min(n, ctx.force, need), force: ctx.force, level: ctx.level || 'L' });
        const caster = game.actors.get(ctx.rollerId);
        if (caster) {
          await caster._postDrainCard({ drainTNOverride: r.drainTN, drainLevel: r.drainLevel || 'L',
            drainIsPhysical: ctx.force > (caster.system?.attributes?.magic?.value ?? 0),
            spellName: ctx.spell === 'treat' ? 'Treat' : 'Heal', force: ctx.force, sorceryRating: ctx.sorcery ?? 0,
            spellPoolForDrain: Math.max(0, (caster.system?.derived?.availableSpellPool ?? 0)) });
        }
        if (noEffect || n === 0) {
          return H._postAction(patient, `✨ ${ctx.spell === 'treat' ? 'Treat' : 'Heal'} — no effect`, [
            n === 0 ? 'No successes.' : s.record.magicHealed ? 'Already magically healed — only once per set of injuries (p.194).' : 'Treat cast more than an hour after the injury (p.194).',
            'Drain is still resisted (card above).'], [], { color: bad });
        }
        return H._postAction(patient, `✨ ${ctx.spell === 'treat' ? 'Treat' : 'Heal'} — ${n} success${n === 1 ? '' : 'es'}`, [
          H._timeBox(`${r.boxes} box${r.boxes === 1 ? '' : 'es'} · ${H.formatTurns(r.turns)}`,
            'healed now · sustained this long to become permanent (p.178) — it lapses if the caster stops first'),
          `Split the successes between <strong>boxes healed</strong> (up to Force ${ctx.force}) and the <strong>time</strong> to become permanent
           (${H.PERMANENT_SPELL_TURNS[ctx.level || 'L']} turns base${ctx.spell === 'treat' ? ', halved for Treat' : ''}, ÷ the rest).`,
          `As suggested: <strong>${r.boxes}</strong> box${r.boxes === 1 ? '' : 'es'}, permanent after <strong>${r.turns}</strong> Combat Turns of sustaining.`,
          'Precludes any further healing spell and first aid for these injuries.'],
          [{ act: 'heal-boxes', ownerId: patient.id, byId: by, label: '✔ Heal these boxes', input: { label: 'Boxes', value: r.boxes, max: Math.min(n, ctx.force) } }],
          { color: good });
      }

      case 'attention': {
        const needs = H.needsMedicalAttention({ level: ctx.level, successes: n });
        return H._postAction(patient, `🩺 ${needs ? 'Needs medical attention' : 'Heals without a doctor'} — ${patient.name}`,
          [needs ? 'No successes: medical attention is required for healing to occur (p.127).'
                 : `${n} success${n === 1 ? '' : 'es'}: will heal without medical attention.`],
          [next('stage', '🛏 Heal one stage')], { color: needs ? bad : good });
      }

      case 'stage': {
        const hours = H.stageHours({ level: ctx.level, successes: n, baseMultiplier: ctx.baseMultiplier, timeMultiplier: ctx.timeMultiplier });
        if (hours === null) {
          return H._postAction(patient, `🛏 No progress — ${patient.name}`,
            ['No successes: the Healing Table gives no time for this — the GM\'s call (a re-test later, a doctor, a better lifestyle).'],
            [next('stage', '🛏 Try again')], { color: bad });
        }
        const days = H.billableDays(hours);
        const cost = H.recoveryCost({ level: ctx.level, days, care: ctx.care });
        const after = NEXT_DOWN[ctx.level];
        const rest = after ? H.recoveryRoad(after, { baseMultiplier: ctx.baseMultiplier, timeMultiplier: ctx.timeMultiplier }) : null;
        return H._postAction(patient, `🛏 ${LEVEL_NAME[ctx.level]} heals to ${LEVEL_NAME[after] ?? 'healed'} — ${patient.name}`, [
          H._timeBox(H.formatHours(hours), `until ${LEVEL_NAME[after] ?? 'fully healed'}${rest?.stages.length
            ? ` · then ${H.formatHours(rest.minH)} – ${H.formatHours(rest.maxH)} more to heal fully` : ''}`),
          `${n} success${n === 1 ? '' : 'es'}: <strong>${H.formatHours(hours)}</strong>${ctx.timeMultiplier > 1 ? ` (×${ctx.timeMultiplier} for organ damage)` : ''}${ctx.baseMultiplier > 1 ? ` (base ×${ctx.baseMultiplier})` : ''}.`,
          rest?.stages.length ? H._roadHtml(after, { baseMultiplier: ctx.baseMultiplier, timeMultiplier: ctx.timeMultiplier }) : '',
          `Minimum lifestyle while healing: <strong>${cost.minLifestyle}</strong>${ctx.care === 'hospital' || ctx.care === 'icu' ? ' — met by the hospital' : ` — ${yen(cost.lifePerDay)}/day (monthly ÷ 30)`}.`,
          `Bill for ${days} day${days === 1 ? '' : 's'}: care ${yen(cost.care)}${cost.lifestyle ? `, lifestyle ${yen(cost.lifestyle)}` : ''} (p.128).`,
          'Below the minimum lifestyle the GM may add modifiers (p.127).'],
          [lower, charge(cost.care, `${ctx.care === 'icu' ? 'intensive care' : ctx.care === 'hospital' ? 'hospital' : 'doctor'}, ${days} days`),
           charge(cost.lifestyle, `${cost.minLifestyle} lifestyle, ${days} days`),
           NEXT_DOWN[ctx.level] ? next('stage', '🛏 Heal the next stage') : null], { color: good });
      }

      case 'permanent': {
        const res = H.permanentDamage(n);
        const loss = H.magicLossRolls({ awakened: ctx.awakened, deadly: true });
        const parts = H.BODY_PARTS;
        const costLine = k => `${parts[k].label}: ${parts[k].weeks} weeks to grow, ${yen(parts[k].cost)}`;
        if (res === 'none') return H._postAction(patient, `💀 No lasting damage — ${patient.name}`,
          [`${n} successes: no limb or organ damage (p.128).`], [loss ? { act: 'magic-loss', ownerId: patient.id, n: loss, label: '🔮 Magic loss: roll 2D6 (Deadly wound)' } : null], { color: good });
        if (res === 'limb') return H._postAction(patient, `💀 An eye or limb is lost — ${patient.name}`, [
          '1 success: an eye or limb is mangled beyond healing and must be replaced. Base healing time +50% (p.128).',
          `${costLine('small')} · ${costLine('hand')} · ${costLine('limb')} (Body Part Types, p.128).`,
          ctx.awakened ? '⚠ Awakened: a part not cloned from their own tissue lowers Magic by 1 (p.129).' : ''],
          [{ act: 'd6', table: 'limb', ownerId: patient.id, label: '🎲 Roll 1D6 — which?' },
           { act: 'record', ownerId: patient.id, key: 'baseMultiplier', value: 1.5, label: '✔ Record: base healing time ×1.5' },
           loss ? { act: 'magic-loss', ownerId: patient.id, n: loss, label: '🔮 Magic loss: roll 2D6 (Deadly wound)' } : null], { color: bad });
        return H._postAction(patient, `💀 A vital organ is gravely damaged — ${patient.name}`, [
          '0 successes: continuous Biotech care even once stabilized; the whole healing time doubles; a transplant is needed; one Attribute point is lost for good (p.127-128).',
          `${costLine('small')} · ${costLine('large')} (Body Part Types, p.128).`,
          'A lost point also lowers that Attribute\'s Racial Modified Limit by 1.',
          ctx.awakened ? '⚠ Awakened: a donor organ not cloned from their own tissue lowers Magic by 1 (p.129).' : ''],
          [{ act: 'd6', table: 'organ', ownerId: patient.id, label: '🎲 Roll 1D6 — which Attribute?' },
           { act: 'record', ownerId: patient.id, key: 'timeMultiplier', value: 2, label: '✔ Record: healing time ×2' },
           loss ? { act: 'magic-loss', ownerId: patient.id, n: loss, label: '🔮 Magic loss: roll 2D6 (Deadly wound)' } : null], { color: bad });
      }

      case 'selfstab':
        return H._postAction(patient, `🚑 ${n > 0 ? 'Stabilized' : 'Not stabilized'} — ${patient.name}`,
          [n > 0 ? 'Stabilized — the overflow stops growing.' : 'Failed — the patient dies once overflow exceeds their Body (p.129), unless help arrives.'],
          [n > 0 ? stabilized : next('stabilize', '🚑 Try another way')],
          { color: n > 0 ? good : bad });

      case 'stabspell': {
        const caster = game.actors.get(ctx.rollerId);
        if (caster) await caster._postDrainCard({ drainTNOverride: Math.max(2, Math.floor(ctx.force / 2) + 1), drainLevel: 'M',
          drainIsPhysical: ctx.force > (caster.system?.attributes?.magic?.value ?? 0), spellName: 'Stabilize', force: ctx.force, sorceryRating: ctx.pool });
        const ok = n > 0 && ctx.effective;
        return H._postAction(patient, `✨ Stabilize — ${ok ? 'stabilized' : 'no effect'}`,
          [ok ? 'Vital functions stabilized; no Body Test for death is needed (p.194).'
              : !ctx.effective ? 'Force below the overflow — no effect.' : 'No successes.'],
          [ok ? stabilized : next('stabilize', '🚑 Try another way')],
          { color: ok ? good : bad });
      }
    }
  }

  /* ════════════════════════════════════════════════════════════════════════════════════════
   *  Action buttons — each is a person deciding to apply something
   * ════════════════════════════════════════════════════════════════════════════════════════ */

  /**
   * One change to a patient, computed from LIVE data. Runs on the patient's owner, or on the
   * GM via `sr3e.heal.apply` when a medic treats someone else's character.
   * ops: { kind: 'lower' } · { kind: 'boxes', n } · { kind: 'eraseStun' } · { kind: 'record', patch }
   */
  static async _applyOp(patient, op = {}) {
    const H = SR3EHealing;
    const s = H._state(patient);
    const merge = async patch => patient.setFlag(FLAG, 'healing', { ...(patient.getFlag(FLAG, 'healing') ?? {}), ...patch });
    switch (op.kind) {
      case 'lower': {
        const boxes = H.oneLevelDown(s.physical);
        const upd = { 'system.wounds.physical.value': boxes };
        if (s.level === 'D') upd['system.wounds.overflow.value'] = 0;
        await patient.update(upd);
        if (boxes === 0) await patient.unsetFlag(FLAG, 'healing');     // this set of injuries is over
        return { before: s.physical, after: boxes };
      }
      case 'boxes': {
        const r = H.healBoxes({ physical: s.physical, overflow: s.overflow, n: op.n });
        await patient.update({ 'system.wounds.physical.value': r.physical, 'system.wounds.overflow.value': r.overflow });
        // Fully healed ends this set of injuries (as 'lower' does); the next wound may be healed by magic again.
        const done = r.physical === 0 && r.overflow === 0;
        if (done) await patient.unsetFlag(FLAG, 'healing');
        else await merge({ magicHealed: true });
        return { before: s.physical, beforeOver: s.overflow, after: r.physical, afterOver: r.overflow, done };
      }
      case 'eraseStun': {
        const v = Math.max(0, s.stun - 1);
        await patient.update({ 'system.wounds.stun.value': v });
        return { before: s.stun, after: v };
      }
      case 'record':
        await merge(op.patch ?? {});
        return { ok: true };
      default:
        throw new Error(`SR3E | healing: unknown op '${op.kind}'`);
    }
  }

  /** The patient's owner (or the GM) writes directly; anyone else — the medic — asks the GM. */
  static async applyToPatient(patient, op) {
    if (patient.isOwner) return SR3EHealing._applyOp(patient, op);
    return game.sr3e.SR3EQuery.asGM('sr3e.heal.apply', { uuid: patient.uuid, op });
  }

  static async _d(formula) {
    const r = await new Roll(formula).evaluate();
    return { total: r.total, faces: r.dice.flatMap(d => d.results.map(x => x.result)) };
  }

  static async act(btn, p) {
    const H = SR3EHealing;
    const patient = game.actors.get(p.ownerId);
    if (!patient) { ui.notifications.warn('That character no longer exists.'); return false; }
    // Wounds and the record go through applyToPatient, so a medic can treat another player's
    // character: their own client cannot write to it, the GM does (reported in play).
    const apply = op => H.applyToPatient(patient, op);
    switch (p.act) {
      case 'lower': {
        const r = await apply({ kind: 'lower' });
        return ChatMessage.create({ content: `<div class="sr-roll-card"><div class="sr-roll-result">✔ ${esc(patient.name)}: Physical ${r.before} → <strong>${r.after}</strong>.</div></div>` });
      }
      case 'heal-boxes': {
        const nInput = parseInt(btn.closest('.sr-heal-card')?.querySelector('.sr-heal-n')?.value);
        const r = await apply({ kind: 'boxes', n: Number.isFinite(nInput) ? nInput : 0 });
        return ChatMessage.create({ content: `<div class="sr-roll-card"><div class="sr-roll-result">✔ ${esc(patient.name)}: Physical ${r.before}${r.beforeOver ? `+${r.beforeOver}` : ''} → <strong>${r.after}${r.afterOver ? `+${r.afterOver}` : ''}</strong>. ${r.done ? 'Fully healed.' : 'Magically healed — no further healing spells or first aid for these injuries.'}</div></div>` });
      }
      case 'erase-stun': {
        const r = await apply({ kind: 'eraseStun' });
        return ChatMessage.create({ content: `<div class="sr-roll-card"><div class="sr-roll-result">✔ ${esc(patient.name)}: Stun → <strong>${r.after}</strong>.</div></div>` });
      }
      case 'stabilized':
        await apply({ kind: 'record', patch: { stabilized: true } });
        return ChatMessage.create({ content: `<div class="sr-roll-card"><div class="sr-roll-result" style="color:var(--sr-green)">✔ ${esc(patient.name)} is stabilized.</div></div>` });
      case 'record':
        await apply({ kind: 'record', patch: { [p.key]: p.value } });
        return ChatMessage.create({ content: `<div class="sr-roll-card"><div class="sr-roll-result">✔ Recorded on ${esc(patient.name)}: ${p.key === 'timeMultiplier' ? `healing time ×${p.value}` : `base healing time ×${p.value}`}. Later stages use it.</div></div>` });
      case 'next':
        return (await H.setup(patient, p.step)) ? true : false;
      case 'charge': {
        const have = patient.system?.nuyen ?? 0;
        const ok = await foundry.applications.api.DialogV2.confirm({
          window: { title: `Charge ${patient.name}` },
          content: `<p>Deduct <strong>${yen(p.amount)}</strong> (${esc(p.what)}) from ${esc(patient.name)}'s ${yen(have)}?</p>
            ${p.amount > have ? '<p style="color:var(--sr-red)">They cannot cover it — nuyen will go to 0.</p>' : ''}` });
        if (!ok) return false;
        await patient.update({ 'system.nuyen': Math.max(0, have - p.amount) });
        return ChatMessage.create({ content: `<div class="sr-roll-card"><div class="sr-roll-result">💴 ${esc(patient.name)} paid ${yen(p.amount)} — ${esc(p.what)}. Nuyen ${yen(have)} → ${yen(Math.max(0, have - p.amount))}.</div></div>` });
      }
      case 'medkit': {
        const d = await H._d('1d6');
        const out = H.medkitSuppliesOut(d.total);
        const owner = game.actors.get(p.medkit?.actorId);
        const item = owner?.items.get(p.medkit?.itemId);
        if (out && item) await item.setFlag(FLAG, 'suppliesOut', true);
        return H._postAction(owner ?? patient, `🎲 Medkit supplies — ${p.medkit?.name ?? 'medkit'}`,
          [`1D6: <strong>${d.total}</strong> — ${out ? 'the supplies have <strong>run out</strong>. Until restocked it counts as no medkit (+4).' : 'supplies hold.'} (p.304)`],
          [out && item ? { act: 'restock', ownerId: owner.id, itemId: item.id, label: `🧰 Restock supplies (${yen(H.MEDKIT_RESTOCK)})` } : null],
          { color: out ? 'var(--sr-red)' : 'var(--sr-green)' });
      }
      case 'restock': {
        const item = patient.items.get(p.itemId);
        const have = patient.system?.nuyen ?? 0;
        await patient.update({ 'system.nuyen': Math.max(0, have - H.MEDKIT_RESTOCK) });
        if (item) await item.unsetFlag(FLAG, 'suppliesOut');
        return ChatMessage.create({ content: `<div class="sr-roll-card"><div class="sr-roll-result">🧰 ${esc(patient.name)} restocked ${esc(item?.name ?? 'the medkit')} for ${yen(H.MEDKIT_RESTOCK)}.</div></div>` });
      }
      case 'magic-loss': {
        const magic = patient.system?.attributes?.magic?.value ?? 0;
        const rolls = [];
        for (let i = 0; i < (p.n ?? 1); i++) rolls.push((await H._d('2d6')).total);
        const lost = rolls.filter(r => H.magicLost(r, magic)).length;
        return H._postAction(patient, `🔮 Magic loss — ${patient.name}`,
          [`${rolls.map(r => `2D6 = <strong>${r}</strong>`).join(' · ')} against Magic ${magic}: ${lost ? `<strong>${lost}</strong> point${lost === 1 ? '' : 's'} lost, permanently.` : 'no loss.'}`],
          [lost ? { act: 'lose-magic', ownerId: patient.id, n: lost, label: `✔ Lower Magic by ${lost}` } : null],
          { color: lost ? 'var(--sr-red)' : 'var(--sr-green)' });
      }
      case 'lose-magic': {
        const b = patient.system?.attributes?.magic?.base ?? 0;
        await patient.update({ 'system.attributes.magic.base': Math.max(0, b - (p.n ?? 1)) });
        return ChatMessage.create({ content: `<div class="sr-roll-card"><div class="sr-roll-result">✔ ${esc(patient.name)}: Magic ${b} → ${Math.max(0, b - (p.n ?? 1))}.</div></div>` });
      }
      case 'd6': {
        const d = await H._d('1d6');
        if (p.table === 'organ') {
          const key = H.ORGAN_TABLE[d.total];
          return H._postAction(patient, `💀 1D6 = ${d.total} — ${key[0].toUpperCase() + key.slice(1)}`,
            [`${esc(patient.name)} permanently loses <strong>1 point of ${key}</strong> (p.128). It cannot be recovered, only replaced by cyber or other means.`],
            [{ act: 'lose-attr', ownerId: patient.id, key, label: `✔ Lower ${key} by 1` }], { color: 'var(--sr-red)' });
        }
        let what = H.LIMB_TABLE[d.total];
        if (d.total >= 5) what += ` (${(await H._d('1d6')).total <= 3 ? 'right' : 'left'})`;
        return H._postAction(patient, `💀 1D6 = ${d.total} — ${esc(patient.name)} loses ${what}`,
          ['A replacement is required, natural or cyber, before healing can finish (p.128).'], [], { color: 'var(--sr-red)' });
      }
      case 'lose-attr': {
        const b = patient.system?.attributes?.[p.key]?.base ?? 0;
        await patient.update({ [`system.attributes.${p.key}.base`]: Math.max(0, b - 1) });
        return ChatMessage.create({ content: `<div class="sr-roll-card"><div class="sr-roll-result">✔ ${esc(patient.name)}: ${p.key} ${b} → ${Math.max(0, b - 1)}. Its Racial Modified Limit also drops by 1 (p.128).</div></div>` });
      }
    }
  }
}

/** Payload helper hoisted as a plain function so the template literals above stay readable. */
function H_payload(o) { return SR3EHealing._payload(o); }
