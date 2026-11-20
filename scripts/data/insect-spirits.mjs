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
    male: row('Male', 0, -1, 4, 2, 2, '(STR)M', [SMELL, 'Materialization', 'Pestilence']),
  } },
  beetle: { totem: 'Beetle', castes: {
    male:   row('Male', 3, 1, 4, 6, 2, '(STR)S', [SMELL, 'Materialization']),
    female: row('Female', 2, 2, 3, 2, 2, '(STR)M', [SMELL, 'Materialization']),
  } },
  cicada: { totem: 'Cicada', castes: {
    male: row('Male', 2, 1, 4, 3, 1, '(STR)L', [SMELL, 'Materialization']),
  } },
  firefly: { totem: 'Firefly', castes: {
    male: row('Male', 0, -1, 4, 1, 2, '(STR)L', [SMELL, 'Materialization']),
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

export const InsectSpirits = {
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

  /** Banishing a true-form insect spirit counts its Force doubled — MitS p.128. */
  banishForce: F => F * 2,

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
