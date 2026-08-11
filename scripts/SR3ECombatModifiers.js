/**
 * SR3 Ranged Combat Modifiers — the GM's TN adjudication surface.
 *
 * Transcribed from the core rulebook p.112 (PDF page 114; book page = PDF − 2).
 *
 * ── What is here and what is deliberately not ────────────────────────────────
 * The MVP ships the maintainer's minimum set plus the three gear modifiers. The
 * rest of p.112 is transcribed in SR3E_RANGED_MODIFIERS for reference and for the
 * later "automated suggestions" pass, but is NOT rendered as checkboxes yet.
 *
 * Four modifiers are computed elsewhere and must NEVER become checkboxes, or the
 * GM would double-count them:
 *   - range → base TN      (SR3EItem._getRangeBands / _rangeBandForDistance)
 *   - attacker wounded     (system.woundMod, folded in by rollPool)
 *   - recoil, all modes    (rollWeapon, incl. heavy-weapon doubling)
 *   - defaulting penalty   (promptDefaultChoice, +2/+3/+4)
 *
 * ── Partial cover is +4 ──────────────────────────────────────────────────────
 * The Quick Start Rules give +2 for the same rule, word-for-word identical prose.
 * Core governs, as it does everywhere else in this system. Core also scopes it:
 * "For cover provided by environmental conditions such as smoke or darkness, use
 * the modifiers given on the Visibility Table" — so this checkbox is PHYSICAL
 * obstruction only.
 */

/**
 * The full p.112 table. Reference + future automation; only `mvp:true` rows render.
 *
 * `group` decides WHERE a row renders in the GM window, and lives on the data rather than
 * in the dialog's layout so the deferred rows drop into place when they land instead of
 * forcing a re-sort. It is independent of `gear`, which means something else: "guessable
 * from the attacker's kit, so pre-tick it". Rows that never render (`auto: true`) still
 * carry a group, so promoting one to `mvp` needs no other change.
 */
export const SR3E_RANGED_MODIFIERS = [
  { key: 'recoilSA',       label: 'Recoil, semi-automatic',        mod: +1,   auto: true, group: 'attacker',   note: 'second shot that Combat Phase' },
  { key: 'recoilBF',       label: 'Recoil, burst-fire',            mod: +3,   auto: true, group: 'attacker',   note: 'per burst that Combat Phase' },
  { key: 'recoilFA',       label: 'Recoil, full-auto',             mod: +1,   auto: true, group: 'attacker',   note: 'per round fired that Combat Phase' },
  { key: 'recoilHeavy',    label: 'Recoil, heavy weapon',          mod: null, auto: true, group: 'attacker',   note: '2 × uncompensated recoil' },
  { key: 'blindFire',      label: 'Blind fire',                    mod: +8,               group: 'conditions' },
  { key: 'partialCover',   label: 'Partial cover',                 mod: +4,   mvp: true,  group: 'target',     note: 'physical obstruction; smoke/darkness use the Visibility Table' },
  { key: 'visibility',     label: 'Visibility impaired',           mod: null, select: 'visibility', group: 'conditions' },
  { key: 'multiTarget',    label: 'Multiple targets',              mod: +2,   per: true,  group: 'target',     note: 'per additional target that Combat Phase' },
  { key: 'targetRunning',  label: 'Target running',                mod: +2,   mvp: true,  group: 'target' },
  { key: 'targetStill',    label: 'Target stationary',             mod: -1,   mvp: true,  group: 'target' },
  { key: 'atkMelee',       label: 'Attacker in melee combat',      mod: +2,   per: true,  group: 'attacker',   note: 'per opponent' },
  { key: 'atkRunning',     label: 'Attacker running',              mod: +4,   mvp: true,  group: 'attacker' },
  { key: 'atkRunningDiff', label: 'Attacker running (difficult)',  mod: +6,               group: 'attacker' },
  { key: 'atkWalking',     label: 'Attacker walking',              mod: +1,               group: 'attacker' },
  { key: 'atkWalkingDiff', label: 'Attacker walking (difficult)',  mod: +2,               group: 'attacker' },
  { key: 'wounded',        label: 'Attacker wounded',              mod: null, auto: true, group: 'attacker',   note: 'Damage Modifiers Table, p.126' },
  { key: 'smartlink',      label: 'Smartlink (with smartgun)',     mod: -2,   mvp: true,  group: 'gear', gear: true },
  { key: 'smartGoggles',   label: 'Smart goggles (with smartgun)', mod: -1,   mvp: true,  group: 'gear', gear: true },
  { key: 'laserSight',     label: 'Laser sight',                   mod: -1,   mvp: true,  group: 'gear', gear: true },
  { key: 'secondFirearm',  label: 'Using a second firearm',        mod: +2,               group: 'attacker' },
  // NOT an mvp checkbox: the attacker declares Take Aim on their own roll screen
  // (they are the one spending the Simple Actions). Rendering it here too would
  // double-count every aimed shot.
  { key: 'aimedShot',      label: 'Aimed shot',                    mod: -1,   auto: true, per: true, group: 'attacker', note: 'declared by the attacker, per Simple Action' },
  { key: 'calledShot',     label: 'Called shot',                   mod: +4,   auto: true, group: 'attacker',   note: 'declared in the fire dialog' },
  { key: 'imageMag',       label: 'Image magnification',           mod: null,             group: 'gear',       note: 'Special' },
];

/**
 * Group order and headings for the GM window — the order the GM reads them in, which is
 * not the book's table order.
 *
 * Gear is last and separated deliberately: those rows are **guesses the system made**
 * from the attacker's kit, not judgements the GM is being asked for, and they previously
 * sat indistinguishable among rows that are.
 */
export const SR3E_MODIFIER_GROUPS = [
  { key: 'target',     label: 'Target' },
  { key: 'attacker',   label: 'Attacker' },
  { key: 'conditions', label: 'Conditions' },
  { key: 'gear',       label: 'Gear', note: 'detected from the attacker’s kit; override freely' },
];

/**
 * Visibility Table, p.112.
 *
 * **The slash means: first = cybernetic/electronic vision, second = NATURAL vision.**
 * Stated twice in the core rulebook, though not on p.112 itself — the visibility
 * prose on p.111 and again in the Perception Table footnote:
 *
 *   "If the number listed is split by a slash, the first modifier applies to
 *    cybernetic or electronic vision and the second to natural vision. Modifiers
 *    listed singly apply equally to all types of vision."
 *
 * Note the direction: cyber vision is the WORSE of the two. In Mist, low-light
 * reads +2 cyber against 0 natural — an elf's own eyes beat cybereyes.
 *
 * Not rendered in the MVP. Because the system knows metatype and can read
 * cyberware, this is ultimately automatable: the GM picks the CONDITION and the
 * modifier derives itself from the attacker's eyes.
 */
export const SR3E_VISIBILITY_TABLE = {
  'Full Darkness':        { normal: +8, lowLight: '+8/+8', thermo: '+4/+2' },
  'Minimal Light':        { normal: +6, lowLight: '+4/+2', thermo: '+4/+2' },
  'Partial Light':        { normal: +2, lowLight: '+1/0',  thermo: '+2/+1' },
  'Glare':                { normal: +2, lowLight: '+4/+2', thermo: '+4/+2' },
  'Mist':                 { normal: +2, lowLight: '+2/0',  thermo: 0       },
  'Light Smoke/Fog/Rain': { normal: +4, lowLight: '+4/+2', thermo: 0       },
  'Heavy Smoke/Fog/Rain': { normal: +6, lowLight: '+6/+4', thermo: '+1/0'  },
  'Thermal Smoke':        { normal: +4, lowLight: '+4',    thermo: '+8/+6' },
};

/** SR3 p.112: "No target number can ever be less than 2." */
export const SR3E_MIN_TN = 2;

/** The rows the GM window actually renders, in table order. */
export function mvpModifiers() {
  return SR3E_RANGED_MODIFIERS.filter(m => m.mvp);
}

/**
 * The same rows, bucketed by `group` and ordered for reading rather than for the book.
 * Empty groups are dropped, so adding a group costs nothing until a row uses it.
 *
 * **Fail-visible.** A row whose `group` is missing or unrecognised lands in a trailing
 * "Other" bucket rather than disappearing: silently dropping it would remove a modifier
 * the GM is meant to adjudicate, and a typo in a `group` string is exactly the kind of
 * thing nobody notices until a shot resolves wrong.
 *
 * @returns {Array<{key: string, label: string, note?: string, rows: object[]}>}
 */
export function mvpModifierGroups() {
  const rows  = mvpModifiers();
  const known = new Set(SR3E_MODIFIER_GROUPS.map(g => g.key));

  const groups = SR3E_MODIFIER_GROUPS
    .map(g => ({ key: g.key, label: g.label, note: g.note, rows: rows.filter(m => m.group === g.key) }))
    .filter(g => g.rows.length);

  const orphans = rows.filter(m => !known.has(m.group));
  if (orphans.length) groups.push({ key: 'other', label: 'Other', rows: orphans });

  return groups;
}

/**
 * Guess which gear modifiers apply, so the GM window can pre-tick them.
 *
 * **This is a guess, and deliberately so.** There is no structured gear data:
 * `accessories` on a firearm is a free-text StringField, the Smartgun Link
 * cyberware is never read for TN maths, and laser sight and gyro have no
 * mechanical representation at all (TODO #18 replaces this with real fields).
 * Every result is presented as a pre-ticked, freely overridable checkbox rather
 * than as a silently applied number.
 *
 * Smartlink and smart goggles are PAIR conditions — core p.112 says "with a
 * properly equipped smart-weapon" — so the cyberware alone earns nothing. A
 * naive actor-only check would hand −2 to someone firing an unmodified pistol.
 *
 * @param {Actor} actor
 * @param {Item}  weapon
 * @returns {{smartlink:boolean, smartGoggles:boolean, laserSight:boolean}}
 */
export function guessGearModifiers(actor, weapon) {
  const acc = String(weapon?.system?.accessories ?? '').toLowerCase();
  const gunIsSmart = /smart/.test(acc);

  const hasItem = re => (actor?.items ?? []).some(i => re.test(String(i.name ?? '').toLowerCase()));

  // Cyberware/bioware smartlink — only counts with a smart-equipped weapon.
  const hasSmartlink = hasItem(/smart\s*(gun\s*)?link|smartlink/);
  // Goggles/glasses are gear rather than cyber; same pair requirement.
  const hasGoggles   = hasItem(/smart\s*(goggle|glasses|display)/);

  return {
    smartlink:    gunIsSmart && hasSmartlink,
    // Never both — smartlink (−2) supersedes goggles (−1) on the same shot.
    smartGoggles: gunIsSmart && hasGoggles && !(gunIsSmart && hasSmartlink),
    laserSight:   /laser/.test(acc),
  };
}

/**
 * Sum the ticked modifiers.
 * @param {object} state  key → true, or an integer count for `per:true` rows
 * @returns {number}
 */
export function sumModifiers(state = {}) {
  let total = 0;
  for (const m of SR3E_RANGED_MODIFIERS) {
    const v = state[m.key];
    if (!v || m.mod == null) continue;
    total += m.per ? m.mod * (Number(v) || 0) : m.mod;
  }
  return total;
}

/**
 * Apply the SR3 floor to a *displayed* target number.
 *
 * The engine already floors every roll (`rollPool`, `SR3EActor.js:1826`), but on
 * card-based rolls that clamp happens at READ time — so an unclamped field would
 * show the GM "TN 0" while the dice actually rolled at 2. A window that lies
 * about the roll it is about to cause is the one thing an adjudication surface
 * must never do.
 *
 * @param {number} raw
 * @returns {{tn:number, floored:boolean, raw:number}}
 */
export function clampTN(raw) {
  const n = Number.isFinite(raw) ? Math.round(raw) : SR3E_MIN_TN;
  return { tn: Math.max(SR3E_MIN_TN, n), floored: n < SR3E_MIN_TN, raw: n };
}
