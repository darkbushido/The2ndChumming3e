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
import { Hands } from './data/hands.mjs';
import { ReadyWeapon } from './data/ready-weapon.mjs';
import { WeaponAccessories } from './data/weapon-accessories.mjs';

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
  // `value: true` — the state carries the RESOLVED modifier rather than a tick or a
  // count, because the number comes from a two-axis table lookup and not from this row.
  { key: 'visibility',     label: 'Visibility impaired',           mod: null, mvp: true, select: 'visibility', value: true, group: 'conditions' },
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
  // TODO 49 — rendered now (it had no `mvp` flag, so the GM window never showed it) and GUESSED: the
  // attacker holds a second ready pistol/SMG-class gun (p.112). The GM unticks it when only one is fired.
  { key: 'secondFirearm',  label: 'Using a second firearm',        mod: +2,   mvp: true,  group: 'gear', gear: true,
    note: 'p.112 — +2 each gun; cancels smartlink, smart goggles and laser' },
  // NOT an mvp checkbox: the attacker declares Take Aim on their own roll screen
  // (they are the one spending the Simple Actions). Rendering it here too would
  // double-count every aimed shot.
  { key: 'aimedShot',      label: 'Aimed shot',                    mod: -1,   auto: true, per: true, group: 'attacker', note: 'declared by the attacker, per Simple Action' },
  { key: 'calledShot',     label: 'Called shot',                   mod: +4,   auto: true, group: 'attacker',   note: 'declared in the fire dialog' },
  { key: 'imageMag',       label: 'Image magnification',           mod: null,             group: 'gear',       note: 'Special' },
  // A signed number the GM types. NOT a rule from any table - the point is the cases no
  // table covers. `value: true` so sumModifiers takes the number as given, exactly as it
  // does for the visibility lookup; `situational: true` tells the renderer to draw a
  // number box instead of a checkbox.
  {
    key: 'situational', label: 'GM situational modifier', mod: null, mvp: true, value: true,
    situational: true, group: 'conditions',
    note: 'anything the tables do not cover',
  },
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

/**
 * The five selectable ways of seeing, flattened from the table's two axes: the COLUMN
 * (type of vision) and the slash WITHIN a cell (cybernetic vs natural).
 *
 * Flattened deliberately, rather than offered as a vision dropdown plus a "cybernetic"
 * checkbox. Two controls would permit "Normal + cybernetic", which means nothing — p.111:
 * *"Modifiers listed singly apply equally to all types of vision"* — and the Normal column
 * carries no slash anywhere. Five options have no unrepresentable or meaningless state.
 *
 * ⚠ Low-Light and Thermographic are NOT interchangeable: they differ in six of the eight
 * conditions, and in Thermal Smoke they invert (low-light +4, thermographic +8/+6 — the
 * smoke exists to blind thermo). A single "enhanced vision" toggle would be wrong.
 */
export const SR3E_VISION_TYPES = [
  { key: 'normal',      label: 'Normal',                     column: 'normal',   natural: true  },
  { key: 'lowLightNat', label: 'Low-Light (natural)',        column: 'lowLight', natural: true  },
  { key: 'lowLightCyb', label: 'Low-Light (cybernetic)',     column: 'lowLight', natural: false },
  { key: 'thermoNat',   label: 'Thermographic (natural)',    column: 'thermo',   natural: true  },
  { key: 'thermoCyb',   label: 'Thermographic (cybernetic)', column: 'thermo',   natural: false },
];

/**
 * Read one Visibility Table cell for a given vision source.
 *
 * A cell is either a bare number, a single string (`'+4'`), or a slashed pair
 * (`'+4/+2'` = cybernetic/natural). Singles apply to everything (p.111), so they are
 * returned regardless of source — that is the rule, not a convenience.
 */
function visibilityCell(cell, natural) {
  if (typeof cell === 'number') return cell;
  const parts = String(cell).split('/');
  const pick  = parts.length === 1 ? parts[0] : (natural ? parts[1] : parts[0]);
  const n     = parseInt(pick, 10);
  return Number.isFinite(n) ? n : 0;
}

/**
 * The Visibility Table modifier for a condition seen with a given vision type.
 * Unknown or empty condition means "not impaired" → 0.
 *
 * @param {string} condition  a key of SR3E_VISIBILITY_TABLE
 * @param {string} visionKey  a key of SR3E_VISION_TYPES
 */
export function visibilityModifier(condition, visionKey) {
  const row = SR3E_VISIBILITY_TABLE[condition];
  if (!row) return 0;
  const vision = SR3E_VISION_TYPES.find(v => v.key === visionKey) ?? SR3E_VISION_TYPES[0];
  return visibilityCell(row[vision.column], vision.natural);
}

/**
 * Natural vision by metatype · *SR3 p.56* — Racial Modifications Table.
 * Elves and orks have low-light vision; dwarves and trolls thermographic. Humans neither.
 */
export const SR3E_RACIAL_VISION = { elf: 'lowLight', ork: 'lowLight', dwarf: 'thermo', troll: 'thermo' };

/**
 * Which vision a character has, from metatype and implants · TODO 99.
 *
 * Feeds a REMINDER in the GM's TN windows, never a selection — the GM still picks the row
 * (TODO 36 is pre-selecting). So a wrong guess costs a misleading hint, not a wrong TN.
 *
 * ⚠ **Replaced eyes lose racial vision.** SR3 p.299: *"If a metahuman has his or her eyes
 * cybernetically replaced, he or she loses natural vision enhancements such as low light or
 * thermographic vision."* **Cat's Eyes do the same** (M&M p.64: *"Like cybereyes, any racial
 * benefits, such as thermographic vision, are lost"*).
 *
 * ⚠ **A low-light or thermographic IMPLANT does not by itself mean the eyes were replaced.**
 * p.299 offers *"retinal modification, rather than eye replacement"*. Only an item that IS the
 * replacement (`Eyes, Cyber Replacement`, `Cybereyes …`) or Cat's Eyes removes racial vision;
 * otherwise both are reported and the GM knows which the character uses.
 *
 * ⚠ **Cat's Eyes count as NATURAL** on the Visibility Table (M&M p.64: *"this vision counts as
 * natural, not cybernetic"*) — bioware, so the better column, unlike cybereyes.
 *
 * ⚠ **Thermosense Organs are not vision** (M&M p.75, a heat sense) and are excluded, though
 * their name matches "thermo". Worn goggles are out of scope for now.
 *
 * Name-matched on stems, because the packs abbreviate and the contacts pack uses its own
 * spellings (`Low Light`, `Thermographic Vision`, `Eyes, Low-Light`).
 *
 * @param {{metatype?: string, items?: Iterable<{type:string, name:string}>}} actor
 * @returns {{ metatype: string, racial: string|null, replacedBy: string|null,
 *             natural: Array<{column:string, source:string|null}>,
 *             cyber:   Array<{column:string, source:string}> }}
 *   `source` is the item granting it, or `null` for the metatype's own eyes.
 */
export function detectVision(actor) {
  const metatype = String(actor?.system?.metatype ?? actor?.metatype ?? '').trim().toLowerCase();
  const racial   = SR3E_RACIAL_VISION[metatype] ?? null;
  const items    = [...(actor?.items ?? [])];

  let replacedBy = null;
  const natural = [];
  const cyber   = [];
  const LOW     = /low[\s-]?light/i;
  const THERMO  = /thermograph/i;

  for (const i of items) {
    const name = String(i?.name ?? '');
    if (i?.type === 'cyberware') {
      if (/cyber\s*replacement|\bcybereyes?\b/i.test(name)) replacedBy ??= name;
      if (LOW.test(name))    cyber.push({ column: 'lowLight', source: name });
      if (THERMO.test(name)) cyber.push({ column: 'thermo',   source: name });
    } else if (i?.type === 'bioware' && /cat'?s\s*eyes/i.test(name)) {
      replacedBy ??= name;
      natural.push({ column: 'lowLight', source: name });
    }
  }
  if (racial && !replacedBy) natural.unshift({ column: racial, source: null });
  return { metatype, racial, replacedBy, natural, cyber };
}

/**
 * One line of plain text for the GM window, from `detectVision` — e.g.
 * *"Tor (troll): Thermographic (natural)"* or
 * *"Kestrel (elf): Low-Light (cybernetic) — Eyes, Low-Light · racial low-light lost to
 * Eyes, Cyber Replacement (SR3 p.299)"*.
 *
 * ⚠ Plain text — it carries actor and item names, so callers must escape it.
 */
export function visionReminder(name, v) {
  const label = (column, nat) =>
    SR3E_VISION_TYPES.find(t => t.column === column && t.natural === nat)?.label ?? column;
  const kind  = column => (column === 'thermo' ? 'thermographic' : 'low-light');

  const parts = [
    ...v.natural.map(n => label(n.column, true) + (n.source ? ` — ${n.source}` : '')),
    ...v.cyber.map(c => `${label(c.column, false)} — ${c.source}`),
  ];
  const who  = v.metatype && v.metatype !== 'human' ? `${name} (${v.metatype})` : name;
  let line   = `${who}: ${parts.length ? parts.join('; ') : 'normal vision only'}`;
  if (v.racial && v.replacedBy) {
    line += ` · racial ${kind(v.racial)} lost to ${v.replacedBy} (SR3 p.299)`;
  } else if (v.racial && v.cyber.length) {
    line += ' · no eye replacement on the sheet, so racial vision is kept (retinal modification, p.299)';
  }
  // The open question from TODO 36, surfaced rather than silently settled.
  if (v.cyber.length && !v.replacedBy) {
    line += ' · implants are pre-selected as cybernetic; if they are retinal mods, the column is the GM\'s call (p.111)';
  }
  return line;
}

/**
 * The Visibility-row keys (`SR3E_VISION_TYPES`) a character can actually use, from
 * `detectVision`. **Normal is always available** — enhanced vision can be switched off or
 * ignored, and in Thermal Smoke that is the better choice for thermographic eyes.
 */
export function visionOptions(v) {
  const keyFor = (column, natural) =>
    SR3E_VISION_TYPES.find(t => t.column === column && t.natural === natural)?.key;
  const keys = ['normal',
    ...(v?.natural ?? []).map(n => keyFor(n.column, true)),
    ...(v?.cyber   ?? []).map(c => keyFor(c.column, false))];
  return [...new Set(keys.filter(Boolean))];
}

/**
 * Which Visibility row to PRE-SELECT for a character in a condition · TODO 36.
 *
 * The one of `visionOptions` with the lowest modifier — a character with several ways of
 * seeing uses the best one. Ties prefer the natural eyes, then the order above, so an
 * unimpaired condition (every option 0) still selects the character's headline vision.
 *
 * ⚠ **A pre-selection, never a decision.** The GM's dropdown stays free; the windows stop
 * following the condition the moment the GM touches it.
 *
 * ⚠ **Implants read as CYBERNETIC**, including a low-light implant that might be a retinal
 * modification — whether retinal mods take the natural column is not settled by the book
 * (p.111 splits on *"cybernetic or electronic"*), and `visionReminder` says so.
 */
export function bestVisionKey(v, condition = '') {
  const opts = visionOptions(v);
  // Headline order when nothing distinguishes them: natural enhancement, cyber, then normal.
  const rank = k => (k === 'normal' ? 2 : SR3E_VISION_TYPES.find(t => t.key === k)?.natural ? 0 : 1);
  return opts
    .map(k => ({ k, mod: visibilityModifier(condition, k), r: rank(k) }))
    .sort((a, b) => a.mod - b.mod || a.r - b.r)[0]?.k ?? 'normal';
}

/** Escape text for interpolation into window markup — actor and item names are free text. */
export function escapeHTML(s) {
  return String(s ?? '').replace(/[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

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
 * What is left of a worn gyro after recoil takes its share, spent on the Attacker movement rows the GM
 * ticked — p.113: *"The total recoil and movement modifiers are reduced by -1 for every point of
 * gyro-stabilization"*. One allowance; the fire dialog spent it on recoil first. Pure.
 */
export const GYRO_MOVEMENT_KEYS = ['atkRunning', 'atkRunningDiff', 'atkWalking', 'atkWalkingDiff'];
export function gyroOffset(state = {}, gyroLeft = 0) {
  const left = Math.max(0, Number(gyroLeft) || 0);
  if (!left) return 0;
  const movement = SR3E_RANGED_MODIFIERS.filter(m => GYRO_MOVEMENT_KEYS.includes(m.key) && state[m.key])
    .reduce((a, m) => a + (m.mod ?? 0), 0);
  return Math.min(left, movement);
}

/**
 * Guess which gear modifiers apply, so the GM window can pre-tick them.
 *
 * **This is a guess, and deliberately so.** The weapon's side is structured now
 * (`smartgun` / `laserSight`, TODO 18 — `WeaponAccessories.flag`), but the actor's side is
 * still read from item names. Every result is presented as a pre-ticked, freely
 * overridable checkbox rather than as a silently applied number.
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
  const gunIsSmart = WeaponAccessories.flag(weapon, 'smartgun');

  const hasItem = re => (actor?.items ?? []).some(i => re.test(String(i.name ?? '').toLowerCase()));

  // Cyberware/bioware smartlink — only counts with a smart-equipped weapon.
  const hasSmartlink = hasItem(/smart\s*(gun\s*)?link|smartlink/);
  // Goggles/glasses are gear rather than cyber; same pair requirement.
  const hasGoggles   = hasItem(/smart\s*(goggle|glasses|display)/);

  // A gun in each hand (p.112, TODO 49): this one is pistol/SMG class and another of that class is
  // ready in the other hand. It "negates any target number reductions from smartlinks, smart goggles
  // or laser sights" — so those guesses are withdrawn, and the GM restores them if only one is fired.
  const dual = !!(actor && weapon && Hands.secondGun(actor.items ?? [], weapon, i => ReadyWeapon.isReady(i)));

  return {
    smartlink:    !dual && gunIsSmart && hasSmartlink,
    // Never both — smartlink (−2) supersedes goggles (−1) on the same shot.
    smartGoggles: !dual && gunIsSmart && hasGoggles && !(gunIsSmart && hasSmartlink),
    laserSight:   !dual && WeaponAccessories.flag(weapon, 'laserSight'),
    secondFirearm: dual,
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
    // `value` rows carry their own resolved modifier (visibility, from the table
    // lookup). Checked BEFORE the falsy guard: 0 is a legitimate result — thermographic
    // vision in Mist is genuinely 0 — and must not be mistaken for "not set".
    // `value` rows carry their own number: the visibility lookup, and the free GM
    // situational row. Both are read here rather than through `mod`.
    if (m.value) { total += Number(v) || 0; continue; }
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

/* ═══════════════════════════════════════════════════════════════════════════
 * MELEE — a separate table, and a different SHAPE (SR3 p.123)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Melee is not ranged with different numbers. Two structural differences drive
 * everything below:
 *
 * 1. **There are TWO target numbers.** Attacker and defender each roll against their
 *    own. A two-column copy of the ranged window would make the GM enter the same
 *    fact twice and let them contradict themselves.
 *
 * 2. **Most rows are RELATIVE.** "Friends in melee" is a single fact about the fight
 *    that lands on both sides at once, in opposite directions — the book states it as
 *    two rows, but they are one control:
 *
 *      "The side with the greater number of friends gets a -1 target number modifier
 *       for each friend more than their opponents have, to a maximum of -4. The side
 *       with the lesser number of friends suffers a +1 target number modifier for each
 *       additional friend their opponents have, to a maximum of +4."
 *
 * So these emit a `{atk, def}` PAIR rather than a single number.
 *
 * Already handled elsewhere, and deliberately NOT here — putting them in the window
 * would double-count:
 *   - Reach          differential, baked into atkTN/defTN by rollMeleeAttack
 *   - Called Shot    +4, declared by the attacker in _promptCalledShot
 *   - Wounded        baked into atkTN/defTN by rollMeleeAttack (`SR3EActor.woundTN`, per fighter).
 *                    ⚠ NOT by rollPool — the boxing card rolls through `_rollWave`, and this line
 *                    saying "rollPool" is how melee went without wound modifiers until 0.5.2 (F3).
 */
export const SR3E_MELEE_MODIFIERS = [
  {
    key: 'friends', label: 'Friends in the melee', kind: 'diff', max: 4, group: 'fight',
    note: 'attacker\u2019s surplus friends; negative if the defender has more',
  },
  {
    key: 'superiorPosition', label: 'Superior position', kind: 'side', mod: -1, group: 'fight',
    note: 'higher or stabler ground, or the opponent is in a restricted position',
  },
  {
    key: 'prone', label: 'Prone', kind: 'sideOpposed', mod: -2, group: 'fight',
    note: 'lying on the ground \u2014 the modifier goes to their OPPONENT',
  },
  {
    key: 'multiTargetAtk', label: 'Attacker striking multiple targets', kind: 'perAtk', mod: +2, group: 'fight',
    note: 'per additional target this Combat Phase',
  },
  {
    key: 'visibility', label: 'Visibility impaired', kind: 'visibility', group: 'conditions',
    note: 'Visibility Table at HALF value, rounded down \u2014 except Full Darkness',
  },
  // WARNING: melee's situational row MUST carry a side. `sumMeleeModifiers` returns a PAIR
  // of deltas and most p.123 rows move both at once in opposite directions, so a bare number
  // has no defined meaning here - it has to say whom it lands on.
  {
    key: 'situational', label: 'GM situational modifier', kind: 'situational', group: 'conditions',
    note: 'anything the tables do not cover - choose whom it applies to',
  },
];

/**
 * The Visibility Table as melee applies it (p.123):
 *
 *   "Consult the Visibility Table, p. 112. Apply the modifiers at half their value,
 *    rounding down, except for Full Darkness."
 *
 * Full Darkness is explicitly exempt and applies in full. Everything else halves,
 * rounding DOWN — so Partial Light with natural low-light (+1) becomes 0, not 1.
 */
export function meleeVisibilityModifier(condition, visionKey) {
  const full = visibilityModifier(condition, visionKey);
  if (condition === 'Full Darkness') return full;
  return Math.floor(full / 2);
}

/**
 * Groups for the melee window. Two, not the ranged four — melee has no Gear row (no
 * smartlink, no laser sight; those are firearm accessories) and no separate Target/Attacker
 * split, because almost every melee row lands on BOTH fighters at once.
 */
export const SR3E_MELEE_MODIFIER_GROUPS = [
  { key: 'fight',      label: 'The fight' },
  { key: 'conditions', label: 'Conditions' },
];

/**
 * `SR3E_MELEE_MODIFIERS` arranged for rendering. Same contract as `mvpModifierGroups`,
 * including the trailing **Other** bucket: a row whose `group` is missing or unrecognised
 * must still render, because silently dropping one removes a modifier the GM is meant to
 * apply and nothing anywhere would report it.
 */
export function meleeModifierGroups() {
  const known = new Set(SR3E_MELEE_MODIFIER_GROUPS.map(g => g.key));
  const groups = SR3E_MELEE_MODIFIER_GROUPS
    .map(g => ({ key: g.key, label: g.label, note: g.note,
                 rows: SR3E_MELEE_MODIFIERS.filter(m => m.group === g.key) }))
    .filter(g => g.rows.length);

  const orphans = SR3E_MELEE_MODIFIERS.filter(m => !known.has(m.group));
  if (orphans.length) groups.push({ key: 'other', label: 'Other', rows: orphans });
  return groups;
}

/**
 * Resolve the melee modifier state into a delta for each side's target number.
 *
 * Returns deltas, NOT target numbers — `rollMeleeAttack` already computes base TNs
 * carrying reach, defaulting and called shot, and these add on top. Handing back
 * finished TNs would silently discard all of that.
 *
 * @param {object} state
 * @param {number} [state.friends]            attacker's surplus friends (may be negative)
 * @param {'attacker'|'defender'|null} [state.superiorPosition]
 * @param {'attacker'|'defender'|null} [state.prone]   who is DOWN
 * @param {number} [state.multiTargetAtk]     additional targets the attacker is striking
 * @param {string} [state.visibilityCondition]
 * @param {string} [state.visibilityVisionAtk]  the attacker's vision (TODO 36)
 * @param {string} [state.visibilityVisionDef]  the defender's vision
 * @param {string} [state.visibilityVision]     both, when the per-side keys are absent
 * @returns {{atk:number, def:number}}
 */
export function sumMeleeModifiers(state = {}) {
  let atk = 0, def = 0;

  // Friends: one fact, both directions, capped at 4 EACH WAY (not 4 total).
  const raw = Math.trunc(Number(state.friends) || 0);
  if (raw) {
    const n = Math.min(Math.abs(raw), 4);
    if (raw > 0) { atk -= n; def += n; }   // attacker outnumbers
    else         { atk += n; def -= n; }   // defender outnumbers
  }

  if (state.superiorPosition === 'attacker') atk -= 1;
  if (state.superiorPosition === 'defender') def -= 1;

  // "Opponent prone" is a bonus to the one still standing.
  if (state.prone === 'defender') atk -= 2;
  if (state.prone === 'attacker') def -= 2;

  const extra = Math.max(0, Math.trunc(Number(state.multiTargetAtk) || 0));
  if (extra) atk += 2 * extra;

  // Environmental: both sides are in the same murk, but each sees it through their OWN eyes —
  // the Melee Modifiers Table (p.123) sends each character to the Visibility Table. A troll's
  // thermographic and a human's normal vision give different numbers in the same darkness.
  if (state.visibilityCondition) {
    const both = state.visibilityVision ?? 'normal';
    atk += meleeVisibilityModifier(state.visibilityCondition, state.visibilityVisionAtk ?? both);
    def += meleeVisibilityModifier(state.visibilityCondition, state.visibilityVisionDef ?? both);
  }

  // The GM's free situational modifier. `situationalSide` is 'atk' | 'def' | 'both';
  // anything else lands on the attacker rather than being dropped, because a number the GM
  // deliberately typed going nowhere is worse than one landing on the likelier side.
  const sit = Math.trunc(Number(state.situational) || 0);
  if (sit) {
    const side = state.situationalSide;
    if (side === 'def')       def += sit;
    else if (side === 'both') { atk += sit; def += sit; }
    else                      atk += sit;
  }

  return { atk, def };
}
