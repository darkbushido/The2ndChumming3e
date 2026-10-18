/**
 * A spell's Target code → its cast target number · SR3 pp.182-183, 191-197 — rules-check 0.7.0. **Pure — no Foundry.**
 *
 * The Target code on a spell is both the Sorcery Test's TN and (for most) the Attribute the target
 * resists with. The simple codes (W B I Q, F, a number) read straight off the target. The rest are
 * the ones the book gives as a formula or a table, which the code used to treat as "unknown →
 * Willpower/Body":
 *
 *   10-E   Heal, Treat, Decrease (Cybered) Attribute — "Target: 10 - Essence" (pp.193-194): the target's
 *          Essence, rounded up (a fraction makes it harder, not easier), never below 2.
 *   DT     Detect … — the Detection Spell Target Number table (p.192): in sight 4, out of sight 6,
 *          on a different plane 10, behind an astral barrier "+ Force".
 *   OR     Analyze Device, and any spell on a non-living target — the Object Resistance Table (p.182):
 *          natural 3, manufactured low-tech 5, high-tech 8, highly processed 10+. "The Force of the
 *          spell must be equal to or greater than half the Object Resistance, rounded down."
 *   TOX/DP Antidote, Detox ("Toxin Strength"), Cure Disease ("Power") — the toxin's Strength / the
 *          disease's Power. The code cannot know it; the caster is asked.
 *   ATT    Increase (Cybered) Attribute — "The target number is the Attribute to be increased" (p.194):
 *          the target's current rating in it. REA is the same for Reaction (Increase Reaction / Reflexes).
 *   4+MIN  Stabilize — "add the number of minutes elapsed since the character took the Deadly damage" (p.194).
 *   Fling  "See text": "Treat the Sorcery Test as a normal Ranged Combat Test" (p.197) — the ranged
 *          base TN by range band (4 / 5 / 6 / 9, p.112); the band is the caster's / GM's to pick.
 *
 * Everything here is a default the caster or GM can move (an adjustment on the cast dialog): warn,
 * never refuse. An unrecognised code falls back to Mana→Willpower / Physical→Body and says so.
 */

/** The Detection Spell Target Number table · SR3 p.192. */
export const DETECTION_ROWS = [
  { key: 'sight',  label: 'Target is in sight of the caster', say: 'in sight', tn: 4 },
  { key: 'out',    label: 'Target is out of sight of the caster', say: 'out of sight', tn: 6 },
  { key: 'plane',  label: 'Target is on a different plane', say: 'on a different plane', tn: 10 },
];

/** The Object Resistance Table · SR3 p.182. Highly processed objects are "10+" — 10 is the floor. */
export const OBJECT_ROWS = [
  { key: 'natural', label: 'Natural objects (trees, soil, unprocessed water)', tn: 3 },
  { key: 'lowtech', label: 'Manufactured low-tech (brick, leather, simple plastics)', tn: 5 },
  { key: 'hightech', label: 'Manufactured high-tech (advanced plastics, alloys, electronics)', tn: 8 },
  { key: 'processed', label: 'Highly processed (computers, complex toxic wastes) — 10+', tn: 10 },
];

/** Ranged base TN by range band · SR3 p.112 (Short 4, Medium 5, Long 6, Extreme 9) — Fling, p.197. */
export const FLING_BANDS = [
  { key: 'short',   label: 'Short',   tn: 4 },
  { key: 'medium',  label: 'Medium',  tn: 5 },
  { key: 'long',    label: 'Long',    tn: 6 },
  { key: 'extreme', label: 'Extreme', tn: 9 },
];

const ATTR_BY_LETTER = {
  B: ['body', 'Body'], C: ['charisma', 'Charisma'], I: ['intelligence', 'Intelligence'],
  Q: ['quickness', 'Quickness'], S: ['strength', 'Strength'], W: ['willpower', 'Willpower'],
};
const SIMPLE = {
  W: ['willpower', 'Willpower'], B: ['body', 'Body'], I: ['intelligence', 'Intelligence'], Q: ['quickness', 'Quickness'],
};

const val = (attributes, key, dflt) => attributes?.[key]?.value ?? attributes?.[key]?.base ?? dflt;
const atLeast2 = n => Math.max(2, Math.trunc(Number(n) || 0));

export const SpellTarget = {
  DETECTION_ROWS, OBJECT_ROWS, FLING_BANDS,

  /** The code without its descriptive suffix — "W(R)" → "W", "4+MIN V" → "4+MINV", "10-E(V)" → "10-E". */
  base(token) {
    return String(token ?? '').toUpperCase().replace(/\([^)]*\)/g, '').replace(/\s+/g, '');
  },

  /** What sort of code this is. `spellName` only matters for "See text" (Fling). */
  kind(token, spellName = '') {
    const b = SpellTarget.base(token);
    if (b === '') return 'blank';
    if (SIMPLE[b]) return 'attr';
    if (b === 'F') return 'force';
    if (/^\d+$/.test(b)) return 'number';
    if (b === '10-E' || b === '10-ESSENCE') return 'essence';
    if (b === 'DT') return 'detect';
    if (b === 'OR') return 'object';
    if (/^TOX/.test(b)) return 'toxin';
    if (b === 'DP' || b === 'POWER' || /^DISEASE/.test(b)) return 'disease';
    if (b === 'ATT' || b === 'ATTRIBUTE') return 'attribute';
    if (b === 'REA' || b === 'REACTION') return 'reaction';
    if (/^4\+MIN/.test(b)) return 'stabilize';
    if (b === 'SEETEXT' && /fling/i.test(String(spellName))) return 'fling';
    return 'unknown';
  },

  /** Does the cast dialog need to show this code's TN (inputs or an adjustment)? The plain ones do not. */
  needsPrompt(kind) {
    return !['attr', 'force', 'number', 'blank'].includes(kind);
  },

  /** The inputs a kind asks for — drives the dialog. */
  asks(kind) {
    return {
      row:      kind === 'detect' || kind === 'object',
      barrier:  kind === 'detect',
      strength: kind === 'toxin' || kind === 'disease',
      minutes:  kind === 'stabilize',
      band:     kind === 'fling',
    };
  },

  /** Heal / Treat / Decrease (pp.193-194): 10 − Essence, rounded up, never below 2. */
  essenceTN(essence) {
    return Math.max(2, Math.ceil(10 - (Number(essence) || 0)));
  },

  /** The Detection table + "+ Force" behind an astral barrier (p.192). */
  detectionTN(rowKey, force = 0, behindBarrier = false) {
    const row = DETECTION_ROWS.find(r => r.key === rowKey) ?? DETECTION_ROWS[1];
    return row.tn + (behindBarrier ? Math.max(0, Number(force) || 0) : 0);
  },

  /** The default Detection row: in sight when the target's token is on the canvas and visible, else out of sight. */
  defaultDetectionRow({ onCanvas = false, visible = false } = {}) {
    return onCanvas && visible ? 'sight' : 'out';
  },

  /** The Object Resistance row for a material; `familiar` is Analyze Device's −2 (p.192). */
  objectTN(rowKey, { familiar = false } = {}) {
    const row = OBJECT_ROWS.find(r => r.key === rowKey) ?? OBJECT_ROWS[2];
    return row.tn - (familiar ? 2 : 0);
  },

  /** The least Force that affects an object: half the Object Resistance, rounded down (p.182). */
  objectMinForce(objectResistance) {
    return Math.floor((Number(objectResistance) || 0) / 2);
  },

  /** Stabilize (p.194): 4 + minutes since the Deadly damage — the same rule as the healing flow. */
  stabilizeTN(minutes) {
    return 4 + Math.max(0, Math.trunc(Number(minutes) || 0));
  },

  /** Fling: the ranged base TN for a band. */
  flingTN(bandKey) {
    return (FLING_BANDS.find(b => b.key === bandKey) ?? FLING_BANDS[0]).tn;
  },

  /** [attribute key, name] named by a spell's "(B)" … "(W)" tag — "Increased Attribute (S)". */
  attributeOf(spellName) {
    const m = /\(([BCIQSW])\)/i.exec(String(spellName ?? ''));
    return m ? ATTR_BY_LETTER[m[1].toUpperCase()] : null;
  },

  /** Is this spell one of the Decrease Attribute family (the target resists with the Attribute affected, p.193)? */
  isDecrease(spellName) {
    return /^\s*decrease/i.test(String(spellName ?? ''));
  },

  /**
   * Resolve the cast TN and the resist Attribute for one target.
   *   target: { type, attributes }  — `type === 'vehicle'` is a non-living target (Object Resistance Table).
   *   inputs: { row, barrier, familiar, strength, minutes, band, adjust } — what the cast dialog collected.
   * Returns { kind, tn, resistAttr, resistName, attrLabel, source, check, pending }.
   * `source` is the card's words for where the TN came from; `check` = the TN is the GM's to check.
   */
  resolve({ token, spellName = '', spellType = 'Mana', force = 1, target = {}, inputs = {} } = {}) {
    const attrs = target?.attributes;
    const adjust = Math.trunc(Number(inputs.adjust) || 0);
    const finish = (r) => {
      const tn = atLeast2(r.tn + adjust);
      return { check: false, pending: false, ...r, tn,
        source: r.source + (adjust ? `, GM ${adjust > 0 ? '+' : ''}${adjust}` : '') };
    };
    const mana = spellType !== 'Physical';
    const fb = mana ? ['willpower', 'Willpower'] : ['body', 'Body'];
    const resist = ([a, n]) => ({ resistAttr: a, resistName: n });
    let kind = SpellTarget.kind(token, spellName);

    // A non-living target is resisted by nothing: the Object Resistance Table sets the TN (p.182).
    if (target?.type === 'vehicle' && ['attr', 'blank', 'attribute', 'reaction', 'essence', 'unknown'].includes(kind)) kind = 'object';

    switch (kind) {
      case 'attr': {
        const [a, n] = SIMPLE[SpellTarget.base(token)];
        return finish({ kind, tn: val(attrs, a, 3), ...resist([a, n]), attrLabel: n, source: `target's ${n}` });
      }
      case 'force':
        return finish({ kind, tn: force ?? 1, ...resist(['willpower', 'Willpower']), attrLabel: 'Force', source: `Force ${force}` });
      case 'number': {
        const n = parseInt(SpellTarget.base(token));
        return finish({ kind, tn: n, ...resist(['willpower', 'Willpower']), attrLabel: `Fixed ${n}`, source: 'fixed' });
      }
      case 'blank':
        return finish({ kind, tn: val(attrs, fb[0], 3), ...resist(fb), attrLabel: fb[1], source: `target's ${fb[1]}` });
      case 'essence': {
        const ess = attrs?.essence?.value ?? attrs?.essence?.base ?? 6;
        const dec = SpellTarget.isDecrease(spellName) ? SpellTarget.attributeOf(spellName) : null;
        return finish({ kind, tn: SpellTarget.essenceTN(ess), ...resist(dec ?? fb), attrLabel: '10 − Essence',
          source: `10 − Essence ${ess} (p.193)` });
      }
      case 'detect': {
        const row = DETECTION_ROWS.find(r => r.key === inputs.row) ?? DETECTION_ROWS[1];
        const barrier = !!inputs.barrier;
        return finish({ kind, tn: SpellTarget.detectionTN(row.key, force, barrier), ...resist(fb), attrLabel: 'Detection table',
          source: `Detection table (p.192): ${row.say} ${row.tn}${barrier ? ` + Force ${force} behind an astral barrier` : ''}` });
      }
      case 'object': {
        const row = OBJECT_ROWS.find(r => r.key === inputs.row) ?? OBJECT_ROWS[2];
        const familiar = !!inputs.familiar;
        const or = SpellTarget.objectTN(row.key, { familiar });
        const minF = SpellTarget.objectMinForce(row.tn);
        const low = (Number(force) || 0) < minF;
        return finish({ kind, tn: or, ...resist(fb), attrLabel: 'Object Resistance',
          source: `Object Resistance Table (p.182): ${row.label.split(' (')[0].toLowerCase()} ${row.tn}${familiar ? ' −2 familiar' : ''}; `
            + `Force must be at least ${minF} (half, rounded down)${low ? ' — ⚠ this Force is too low to affect it' : ''}${target?.type === 'vehicle' ? '; a vehicle adds its Body and half Armor to the Resistance before halving' : ''}` });
      }
      case 'toxin':
      case 'disease': {
        const s = Math.trunc(Number(inputs.strength));
        const known = Number.isFinite(s) && s > 0;
        const what = kind === 'toxin' ? "toxin's Strength" : "disease's Power";
        return finish({ kind, tn: known ? s : 2, ...resist(fb), attrLabel: kind === 'toxin' ? 'Toxin Strength' : 'Disease Power',
          source: known ? `the ${what} (${s}, as entered)` : `the ${what} — not entered, GM to set`, check: !known, pending: !known });
      }
      case 'attribute': {
        const a = SpellTarget.attributeOf(spellName);
        if (!a) return finish({ kind: 'unknown', tn: val(attrs, fb[0], 3), ...resist(fb), attrLabel: fb[1], check: true,
          source: `target's ${fb[1]} — which Attribute this spell raises could not be read from its name; GM to check the TN` });
        return finish({ kind, tn: val(attrs, a[0], 3), ...resist(a), attrLabel: a[1], source: `target's ${a[1]} rating, the Attribute raised (p.194)` });
      }
      case 'reaction':
        return finish({ kind, tn: val(attrs, 'reaction', 3), ...resist(fb), attrLabel: 'Reaction', source: "target's Reaction rating (p.194)" });
      case 'stabilize': {
        const m = Math.max(0, Math.trunc(Number(inputs.minutes) || 0));
        return finish({ kind, tn: SpellTarget.stabilizeTN(m), ...resist(fb), attrLabel: '4 + minutes',
          source: `4 + ${m} minute${m === 1 ? '' : 's'} since the Deadly damage (p.194)` });
      }
      case 'fling': {
        const b = FLING_BANDS.find(x => x.key === inputs.band) ?? FLING_BANDS[0];
        const flingTn = SpellTarget.flingTN(b.key);
        return finish({ kind, tn: flingTn, ...resist(fb), attrLabel: 'Ranged Combat Test',
          source: `a normal Ranged Combat Test, ${b.label.toLowerCase()} range ${flingTn} (p.197, p.112)` });
      }
      default:
        return finish({ kind: 'unknown', tn: val(attrs, fb[0], 3), ...resist(fb), attrLabel: fb[1], check: true,
          source: `target's ${fb[1]} — the Target code "${String(token).trim()}" is not one this system reads; GM to check the TN` });
    }
  },
};
