/**
 * Insect spirits — true-form workers, soldiers, males and females · MitS p.127-137 (TODO 312).
 *
 * An insect shaman summons spirits that ARE their totem. Sunday scope is the **true-form** spirit that follows "all the
 * standard rules for spirits" (MitS p.128) and is summoned by the ordinary Conjuring procedure (SR3 p.186, MitS p.128,
 * any domain). Not here: flesh-forms (they need a host), Queens/Mothers, the hive and nest limits — TODO 312.
 *
 * The numbers are the Insect Spirit Table (MitS p.136-137): a row per type and caste, attributes written from Force.
 * Charisma, Intelligence, Willpower and Essence are F on every row; Magic is F, as for every spirit here.
 *   body:  F + b      quickness: F + q   (the book's "(F+q) x m" — m is the movement multiplier, kept as `moveMult`)
 *   strength: F + s   reaction: F x r    initiative: Reaction + 10 (+ 1D6), MitS p.136 — the table's INIT line
 * ⚠ Read from the page images, not the text layer; the Body column's "/y" half and the Reaction multiplier are
 * the readings the maintainer should confirm against the book (audit note in TODO 312). No natural armour is applied.
 *
 * Pure — no Foundry.
 */

/** Totem name → colony. Hive totems: MitS p.129; solitary: p.130. (The book lists Mosquito among the solitary examples, p.131.) */
export const INSECT_TOTEMS = {
  Ant: 'hive', Fly: 'hive', Termite: 'hive', Wasp: 'hive',
  Beetle: 'solitary', Cicada: 'solitary', Firefly: 'solitary', Mantid: 'solitary', Mosquito: 'solitary', Roach: 'solitary',
};

// reading of MitS p.136 table — maintainer to confirm: (1) Body "x/y" = true-form / flesh-form // MitS p.136 Body = true/flesh (maintainer 2026-11-20, tentative).
// Only the true-form half `b` drives stats. The flesh half is kept below as FLESH_BODY_TABLE and NOT applied: the p.128 prose makes a
// flesh-form's physical Attributes host-based (soldier host + Force, worker host − 1), which CONFLICTS with a fixed flesh Body — reported to the maintainer.
// (2) Quickness "(F+q) x m": q is the attribute, m the movement multiplier — confirmed by the maintainer. (3) Reaction column is literal (Fx r) — settled.
// The whole table is this one block — a correction is one edit. Every stat stays editable on the spirit's sheet.
const row = (label, b, q, m, s, r, attack, powers) => ({ label, b, q, m, s, r, attack, powers });
const SMELL = 'Enhanced Senses (Smell)';
const WEAK = ['Reduced Senses (Sight)', 'Vulnerability (Insecticides)'];

/** type → { totem, castes: { casteKey: row } } · the Insect Spirit Table, MitS p.136-137. */
export const INSECT_TABLE = {
  ant: { totem: 'Ant', castes: {
    soldier: row('Soldier', 1, 4, 4, 4, 2, '(STR)M', [SMELL, 'Materialization', 'Paralyzing Touch', 'Venom']),
    worker:  row('Worker', -2, 0, 3, 2, 1, '(STR)M', [SMELL, 'Materialization', 'Skill']),
  } },
  termite: { totem: 'Termite', castes: {
    soldier: row('Soldier', 1, 4, 4, 5, 2, '(STR)M', [SMELL, 'Materialization', 'Paralyzing Touch', 'Venom']),
    worker:  row('Worker', -2, 0, 3, 3, 1, '(STR)M', [SMELL, 'Materialization', 'Skill']),
  } },
  wasp: { totem: 'Wasp', castes: {
    male:   row('Male', 0, 4, 4, 3, 2, '(STR)M', [SMELL, 'Materialization', 'Paralyzing Touch', 'Venom']),
    female: row('Female', 1, 4, 4, 4, 2, '(STR)M', [SMELL, 'Materialization', 'Paralyzing Touch', 'Venom']),
  } },
  fly: { totem: 'Fly', castes: {
    male: row('Male', 0, 1, 4, 2, 2, '(STR)M', [SMELL, 'Materialization', 'Pestilence']),
  } },
  beetle: { totem: 'Beetle', castes: {
    male:   row('Male', 3, 1, 4, 6, 2, '(STR)S', [SMELL, 'Materialization']),
    female: row('Female', 2, 2, 3, 2, 2, '(STR)M', [SMELL, 'Materialization']),
  } },
  cicada: { totem: 'Cicada', castes: {
    male: row('Male', 2, 1, 4, 3, 1, '(STR)L', [SMELL, 'Materialization']),
  } },
  firefly: { totem: 'Firefly', castes: {
    male: row('Male', 0, 1, 4, 1, 2, '(STR)L', [SMELL, 'Materialization']),
  } },
  mantid: { totem: 'Mantid', castes: {
    male: row('Male', 2, 5, 4, 3, 3, '(STR)M', [SMELL, 'Venom']),
  } },
  mosquito: { totem: 'Mosquito', castes: {
    male:   row('Male', 0, 3, 4, 3, 2, '(STR)M', [SMELL, 'Paralyzing Touch']),
    female: row('Female', -1, 3, 4, 2, 2, '(STR)M', [SMELL, 'Paralyzing Touch', 'Pestilence']),
  } },
  roach: { totem: 'Roach', castes: {
    male: row('Male', 2, 4, 4, 2, 2, '(STR)M', [SMELL, 'Venom']),
  } },
};

/** The table's flesh-form Body half, as printed ("F", "F − 3", "F x 2") — tentative, NOT applied (see the comment above the table). */
export const FLESH_BODY_TABLE = {
  'ant.soldier': 'F', 'ant.worker': 'F − 3', 'termite.soldier': 'F', 'termite.worker': 'F − 3',
  'wasp.male': 'F − 1', 'wasp.female': 'F − 1', 'fly.male': 'F − 2', 'beetle.male': 'F x 2', 'beetle.female': 'F',
  'cicada.male': 'F − 2', 'firefly.male': 'F − 2', 'mantid.male': 'F + 1', 'mosquito.male': 'F', 'mosquito.female': 'F − 1', 'roach.male': 'F + 1',
};

export const InsectSpirits = {
  /** The table's printed flesh-form Body for a type + caste (information only; flesh stats follow the host, p.128). */
  fleshBodyTable: (type, caste) => FLESH_BODY_TABLE[`${type}.${caste}`] ?? null,

  /** Every totem an insect shaman can follow. */
  totems: () => Object.keys(INSECT_TOTEMS),

  /** Is this a shaman's totem an insect totem? (case-insensitive; blank = no) */
  isInsectTotem: totem => Object.keys(INSECT_TOTEMS).some(t => t.toLowerCase() === String(totem ?? '').trim().toLowerCase()),

  /** Hive or solitary, for a totem or an insect type key; null if neither. */
  colony(x) {
    const k = String(x ?? '');
    const t = INSECT_TOTEMS[k] ?? INSECT_TOTEMS[INSECT_TABLE[k.toLowerCase()]?.totem];
    return t ?? null;
  },

  /**
   * May this conjurer summon insect spirits without a warning? The GM always may; a shaman may if their totem is an
   * insect (MitS p.127: "Insect shamans can summon ... actual insect spirits"). Anyone else may still, with a warning.
   */
  summonVerdict({ isGM = false, totem = '' } = {}) {
    if (isGM) return { offered: true, warn: false };
    const ok = InsectSpirits.isInsectTotem(totem);
    return { offered: ok, warn: !ok };
  },

  /** The row for a type + caste, or null. */
  entry: (type, caste) => INSECT_TABLE[type]?.castes?.[caste] ?? null,

  /** The `SPIRIT_TYPES` key for a type + caste. */
  key: (type, caste) => `insect_${type}_${caste}`,

  /** Attributes at Force `F` for a type + caste, from the table. */
  stats(type, caste, F) {
    const r = InsectSpirits.entry(type, caste);
    if (!r) return null;
    const reaction = F * r.r;
    return {
      body: F + r.b, quickness: F + r.q, strength: F + r.s,
      charisma: F, intelligence: F, willpower: F, essence: F, magic: F,
      reaction, initiative: reaction + 10, moveMult: r.m, attack: r.attack,
    };
  },

  /** Powers shown on the spirit — the row's, then its weaknesses. True-forms also get the standard spirit powers (MitS p.132). */
  powers: (type, caste) => InsectSpirits.entry(type, caste)?.powers ?? [],
  weaknesses: () => [...WEAK],

  /** Banishing a true-form insect spirit counts its Force doubled — MitS p.128. A flesh-form cannot be banished at all. */
  banishForce: F => F * 2,
  banishable: form => form !== 'flesh',

  // ---- Flesh-form · MitS p.128-129 ---------------------------------------------------------------------------------
  // A flesh-form is the spirit merged with a host body (usually a metahuman; "in a pinch" an animal or paracritter).

  /** Which flesh-form rule a caste follows. Workers have their own; soldiers AND the solitary males/females share one (p.128).
   *  Queens, Mothers and the female mantid (always a flesh-form, host-based) are not offered yet — TODO 312. */
  fleshRule: caste => (caste === 'worker' ? 'worker' : (caste === 'soldier' || caste === 'male' || caste === 'female') ? 'soldier' : null),
  fleshAvailable: (type, caste) => !!InsectSpirits.entry(type, caste) && InsectSpirits.fleshRule(caste) !== null,

  /**
   * Attributes of a flesh-form at Force `F` on `host` ({ body, quickness, strength }) — MitS p.128.
   *   worker:  physical = host − 1 each;  soldier / solitary: physical = host + F.  Mental = F; Essence and Magic F as true-form.
   * Reaction is "calculated normally" (the table's footnote for the female mantid, p.137): (Quickness + Intelligence) / 2, down.
   * Initiative = Reaction + 10, as the true-form rows. No natural armour (p.128) — the table's "/y" body half is not applied anyway.
   */
  fleshStats(type, caste, F, host = {}) {
    const rule = InsectSpirits.fleshRule(caste);
    const r = InsectSpirits.entry(type, caste);
    if (!rule || !r) return null;
    const d = rule === 'worker' ? -1 : F;
    const phys = a => Math.max(1, (Number(a) || 0) + d);
    const body = phys(host.body), quickness = phys(host.quickness), strength = phys(host.strength);
    const reaction = Math.floor((quickness + F) / 2);
    return {
      body, quickness, strength,
      charisma: F, intelligence: F, willpower: F, essence: F, magic: F,
      reaction, initiative: reaction + 10, moveMult: 1, attack: r.attack,
    };
  },

  /** Powers of a flesh-form: the row's, minus Materialization (already in the flesh). */
  fleshPowers: (type, caste) => InsectSpirits.powers(type, caste).filter(p => p !== 'Materialization'),
  /** Flesh-form workers and soldiers keep Reduced Senses (Sight) but NOT the insecticide vulnerability — MitS p.128. */
  fleshWeaknesses: () => WEAK.filter(w => !w.startsWith('Vulnerability')),

  /** Karma Pool when summoned: flesh 1, true-form 2, Queen/Mother 4; a good merge is half the host's, rounded up — MitS p.129. */
  karmaPool: (form, { hostKarmaPool = 0, merge = false } = {}) =>
    form === 'flesh' ? (merge ? Math.ceil((Number(hostKarmaPool) || 0) / 2) : 1) : 2,

  /** Weeks of incubation in the host = the spirit's Force — MitS p.129. */
  incubationWeeks: F => F,

  /**
   * The transformation Opposed Test — MitS p.129: host Willpower against the spirit's Force. Each side rolls its rating
   * against the other's rating as target number; a Queen/Mother that helped summon adds +2 to the HOST's target number.
   */
  transformationTest: ({ hostWillpower, force, queenHelped = false }) => ({
    hostDice: Math.max(0, Number(hostWillpower) || 0), hostTN: force + (queenHelped ? 2 : 0),
    spiritDice: force, spiritTN: Math.max(2, Number(hostWillpower) || 0),
  }),

  /** The Transformation Table (MitS p.128) for the host's NET successes (host successes minus the spirit's). */
  transformation(net) {
    if (net <= 0) return { key: 'destroyed', flesh: false, merge: false, text: 'The host is destroyed and a true-form insect spirit emerges.' };
    if (net <= 2) return { key: 'full', flesh: true, merge: false, text: 'The host becomes a human-sized version of the insect — changed shape and mass, extra limbs. A flesh-form.' };
    if (net === 3) return { key: 'partial', flesh: true, merge: false, text: 'The host gains some insectoid traits — chitinous armour, multifaceted eyes, undeveloped extra limbs. A flesh-form.' };
    if (net === 4) return { key: 'aspect', flesh: true, merge: false, text: 'The host gains only a single physical aspect of the insect. A flesh-form.' };
    return { key: 'good-merge', flesh: true, merge: true, text: 'A "good merge": the host keeps its original form and gains aura masking (p.117). Not a free spirit — it stays under the Queen\'s or shaman\'s control. The spirit has the host\'s memories and can mimic them.' };
  },

  /** Successes of `dice` d6 against `tn`, Rule of Six (a 6 is rolled again and added). `rng()` is in [0,1). */
  rollSuccesses(dice, tn, rng = Math.random) {
    let hits = 0;
    for (let i = 0; i < dice; i++) {
      let total = 0, die;
      do { die = 1 + Math.floor(rng() * 6); total += die; } while (die === 6);
      if (total >= tn) hits++;
    }
    return hits;
  },

  /** Flat list for building `SPIRIT_TYPES`: [{ key, type, caste, label, totem }]. */
  list() {
    const out = [];
    for (const [type, def] of Object.entries(INSECT_TABLE)) {
      for (const [caste, r] of Object.entries(def.castes)) {
        out.push({ key: InsectSpirits.key(type, caste), type, caste, totem: def.totem, label: `${def.totem} Spirit — ${r.label}` });
      }
    }
    return out;
  },
};
