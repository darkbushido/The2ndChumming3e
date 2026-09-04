/**
 * The book's wording → the shipped packs' names, for the Little Black Book contacts · TODO 86
 *
 * Mr. Johnson's Little Black Book prints a contact's chrome the way a person would say it —
 * *"Cybereyes (Display Link, Flare Compensation, Low Light), Smartlink 2, Headware Memory
 * [300 Mp]"*. The packs, which come from the Shadowrun Character Generator, name the same
 * things differently: `Eyes, Cyber Replacement`, `Eyes, Disp Link`, `Smartlink II`,
 * `Memory (300 Mps)`.
 *
 * Without this layer only 87 of 182 split pieces matched anything.
 *
 * ⚠ **Rating-bearing names are RULES, not entries.** `Smartlink 2` → `Smartlink II` but
 * `Reaction Enhancers 2` → `Reaction Enhancer [2]` and `Headware Memory [300 Mp]` →
 * `Memory (300 Mps)`. Enumerating every rating would be hundreds of lines that drift; the
 * patterns below capture the rating and rebuild the pack's own format.
 *
 * ⚠ **An alias must name something that ACTUALLY SHIPS.** `tests/johnson-aliases.test.mjs`
 * resolves every one of these against the real packs, because a typo here fails the same silent
 * way a name mismatch does — the implant is skipped and nobody is told.
 */

/** Exact (case-insensitive) book wording → pack name. */
export const IMPLANT_ALIASES = {
  // Cybereyes and cyberears: the book names the assembly, the packs name the replacement.
  'cybereyes':                 'Eyes, Cyber Replacement',
  'cyberear':                  'Ears Cyber Replacement',
  'cyberears':                 'Ears Cyber Replacement',
  'cosmetic cybereyes':        'Eyes, Cosmetic',
  'flamboyant cybereyes':      'Eyes, Cosmetic',
  'display link':              'Eyes, Disp Link',

  // Headware. The book says "Headware X"; the packs drop the prefix.
  'headware telephone':        'Telephone',
  'telephone':                 'Telephone',
  'headware radio':            'Radio [1]',
  'datajack':                  'Datajack',
  'induction datajack':        'Induction Datajack',
  'voice modulator':           'Voice Modulator',
  'subvocal microphone':       'Subvocal Microphone',
  'simlink':                   'SimLink Simrig [1]',
  'simrig':                    'Simrig Base Cyber',

  // Bioware
  'clean metabolism':          'Clean Metabolism',
  'dietware':                  'Dietware',
  'synaptic accelerator':      'Synaptic Accelerator[1]',

  // Limbs and implanted weapons
  'cyberlegs':                 'Pair Obvious Cyberlegs',
  'cyberleg':                  'Obvious Cyberleg',
  /* ⚠ The book writes `Cyber Implant Weapon (Retractable Spur)` — the parenthesis names WHICH
   * weapon, so it is consumed by the implant rather than imported as a second item. See
   * `MODS_CONSUMED_BY` in the importer. */
  'cyber implant weapon':      'Spur, Retractable',
  'retractable spur':          'Spur, Retractable',
  'reflex trigger':            'Reflex Trigger [1]',
};

/**
 * Modifications listed inside `(…)` after Cybereyes / Cyberears.
 *
 * ⚠ **These are NOT free-standing implants.** SR3 p.300 gives cybereyes a .5 Essence allowance
 * that their mods ride inside, so they are imported as items but the CONTACT'S ESSENCE stays the
 * book's printed figure — see the `essence.lost` note in the importer.
 */
export const EYE_MOD_ALIASES = {
  'display link':              'Eyes, Disp Link',
  'image link':                'Eyes, Image Link',
  'flare compensation':        'Eyes, Flare Compensation',
  'low light':                 'Eyes, Low-Light',
  'low-light':                 'Eyes, Low-Light',
  'low light vision':          'Eyes, Low-Light',
  'thermographic':             'Eyes, Thermographic',
  'thermographic vision':      'Eyes, Thermographic',
  'opticam':                   'Eyes, Opticam',
  'camera':                    'Eyes, Camera',
  'microscopic vision':        'Eyes, Microscopic Vision',
  'retinal clock':             'Eyes, Retinal Clock',
  'protective covers':         'Eyes, Protective Covers',
};

export const EAR_MOD_ALIASES = {
  'hearing amplification':     'Ear Hearing Amplification',
  'recorder':                  'Ear Recorder',
  'sound dampener':            'Ear Dampener',
  'dampener':                  'Ear Dampener',
  'high frequency':            'Ear High Frequency',
  'low frequency':             'Ear Low Frequency',
};

/**
 * Patterns that carry a RATING. `[regex, (m) => packName]`, tried before the exact maps.
 *
 * ⚠ Each rebuilds the pack's own bracket style, and they differ by family on purpose:
 * `Reaction Enhancer [2]` has a space, `Cerebral Booster[1]` does not, `Memory (300 Mps)` uses
 * parentheses and pluralises. Those are the shipped spellings, not a house style.
 */
export const RATED_PATTERNS = [
  [/^smartlink\s*(?:ii|2)$/i,                    () => 'Smartlink II'],
  [/^smartlink$/i,                               () => 'Smartlink'],
  [/^reaction enhancers?\s*(\d+)$/i,             m => `Reaction Enhancer [${m[1]}]`],
  [/^boosted reflexes\s*(\d+)$/i,                m => `Boosted Reflexes [${m[1]}]`],
  [/^wired reflexes\s*(\d+)$/i,                  m => `Wired Reflexes [${m[1]}]`],
  [/^muscle replacement\s*(\d+)$/i,              m => `Muscle Replacement [${m[1]}]`],
  [/^reflex trigger\s*(\d+)$/i,                  m => `Reflex Trigger [${m[1]}]`],
  [/^headware memory\s*\[?\s*(\d+)\s*mp\]?$/i,   m => `Memory (${m[1]} Mps)`],
  [/^headware radio\s*\[?\s*(?:rating\s*)?(\d+)\s*\]?$/i, m => `Radio [${m[1]}]`],
  [/^data compactor\s*(\d+)$/i,                  m => `Data Compactor [${m[1]}]`],
  [/^encephalon\s*(\d+)$/i,                      m => `Encephalon [${m[1]}]`],
  [/^math spu\s*(\d+)$/i,                        m => `Math SPU [${m[1]}]`],
  [/^cerebral booster\s*(\d+)$/i,                m => `Cerebral Booster[${m[1]}]`],
  [/^mnemonic enhancer\s*(\d+)$/i,               m => `Mnemonic Enhancer[${m[1]}]`],
  [/^synaptic accelerator\s*(\d+)$/i,            m => `Synaptic Accelerator[${m[1]}]`],
  [/^tracheal\s*\(air\)\s*filter\s*(\d+)$/i,     m => `Filter: Air [${m[1]}]`],
  [/^(?:rigger|vehicle) control rig\s*(\d+)$/i,  m => `Vehicle Control Rig [${m[1]}]`],
  [/^select sound filter\s*(\d+)$/i,             m => `Sound Filter [${m[1]}]`],
  [/^bone lacing$/i,                             () => null],   // needs its mod — see below
];

/** Eye/ear mods that carry a rating. */
export const RATED_MOD_PATTERNS = [
  [/^electronic\s+(?:vision|visual)?\s*magnification\s*(\d+)$/i,
    m => `Eyes, Vision Magnification, Electronic[${m[1]}]`],
  [/^optical\s+(?:vision|visual)?\s*magnification\s*(\d+)$/i,
    m => `Eyes, Vision Magnification, Optical[${m[1]}]`],
  [/^select sound filter\s*(\d+)$/i,             m => `Sound Filter [${m[1]}]`],
];

/**
 * `Bone Lacing (Plastic)` — the material is in the mods, and the pack keys on it.
 * ⚠ Note the pack spells it **`Bone Lace`**, not "Bone Lacing".
 */
/**
 * Implants whose parenthesised contents are a QUALIFIER, not sub-modifications — the mods must
 * not also be imported as separate items. `Bone Lacing (Plastic)` is one implant, and
 * `Cyber Implant Weapon (Retractable Spur)` names which weapon it is.
 */
export const MODS_CONSUMED_BY = [/^bone lacing$/i, /^cyber implant weapon$/i];

export const BONE_LACE = {
  plastic: 'Bone Lace, Plastic', aluminium: 'Bone Lace, Aluminium',
  aluminum: 'Bone Lace, Aluminium', titanium: 'Bone Lace, Titanium',
  ceramic: 'Bone Lace, Ceramic', kevlar: 'Bone Lace, Kevlar',
};

/**
 * Spell names. 60 of the contacts' 67 spells already match; these are the rest.
 *
 * ⚠ **`Hot Potatoe` is a TYPO IN THE PACK**, not in the book. Aliased rather than corrected here
 * because renaming a pack entry is [#87]'s kind of job and would need the same care; recorded in
 * `audit/upstream-defects.md`.
 */
export const SPELL_ALIASES = {
  'antidote':                  'Antidote    (TOX LEV)',
  'increase reflexes (+1)':    'Incr. Reflexes +1INI DIE',
  'increase reflexes (+2)':    'Incr. Reflexes +2INI DIE',
  'increase reflexes (+3)':    'Incr. Reflexes +3INI DIE',
  'hot potato':                'Hot Potatoe',
  'limited armor (heat)':      'Limited Armor',
};

/** Resolve one book name to a pack name, or null. */
export function resolveImplant(name, mods = []) {
  const n = String(name ?? '').trim();
  const low = n.toLowerCase();

  if (/^bone lacing$/i.test(n)) {
    const mat = mods.map(m => m.trim().toLowerCase()).find(m => BONE_LACE[m]);
    return mat ? BONE_LACE[mat] : null;
  }
  for (const [re, fn] of RATED_PATTERNS) {
    const m = re.exec(n);
    if (m) return fn(m);
  }
  return IMPLANT_ALIASES[low] ?? null;
}

/**
 * Resolve a parenthesised modification, given whether it hangs off eyes or ears.
 *
 * ⚠ **It falls back to the OTHER host's map, and then to `resolveImplant`.** Both fallbacks
 * exist because the book's own data needs them, not for tidiness:
 *
 *   · **Trid Pirate (p.55) lists `Cyberear (Display Link, Image Link, Opticam)`** — three
 *     *vision* mods on an ear. Almost certainly "Cybereyes" in the source; either way the mods
 *     are real and resolvable, so trying the eye map recovers them.
 *   · **Mercenary (p.61) has a MISPLACED CLOSING PAREN**:
 *     `Cybereyes (Thermographic, Flare Compensation, Muscle Replacement 2, Smartlink 2,
 *     Wired Reflexes 2)` — the last three are separate implants that ended up inside the
 *     parentheses. `resolveImplant` recovers them rather than dropping three pieces of chrome.
 *
 * Both are logged in `audit/upstream-defects.md`; this recovers them, it does not hide them.
 */
export function resolveMod(mod, host = 'eye') {
  const n = String(mod ?? '').trim();
  const low = n.toLowerCase();
  for (const [re, fn] of RATED_MOD_PATTERNS) {
    const m = re.exec(n);
    if (m) return fn(m);
  }
  const primary = host === 'ear' ? EAR_MOD_ALIASES : EYE_MOD_ALIASES;
  const other   = host === 'ear' ? EYE_MOD_ALIASES : EAR_MOD_ALIASES;
  return primary[low] ?? other[low] ?? resolveImplant(n) ?? null;
}

export function resolveSpell(name) {
  return SPELL_ALIASES[String(name ?? '').trim().toLowerCase()] ?? null;
}
