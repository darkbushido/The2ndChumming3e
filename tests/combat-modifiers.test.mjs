/**
 * The GM's TN modifier grouping — SR3ECombatModifiers.mvpModifierGroups.
 *
 * The window used to render p.112 in the BOOK's order, which is not the order a GM reads
 * it in: cover, movement and detected gear were interleaved as one flat list of
 * checkboxes. Gear especially needed separating — those rows are guesses the system made
 * from the attacker's kit, not judgements the GM is being asked for.
 *
 * The grouping lives on the data (a `group` field per row) rather than in the dialog's
 * layout, so the deferred rows drop into place when they land. These assertions pin the
 * invariants that make that safe — above all that grouping never LOSES a row, since a
 * modifier missing from this window is one the GM silently cannot apply.
 *
 * No Foundry stubs: this module is pure data and pure functions.
 */
const {
  SR3E_RANGED_MODIFIERS, SR3E_MODIFIER_GROUPS, SR3E_VISIBILITY_TABLE, SR3E_VISION_TYPES,
  mvpModifiers, mvpModifierGroups, visibilityModifier, sumModifiers,
} = await import('../scripts/SR3ECombatModifiers.js');

export const name = 'combat-modifiers';

export async function run(t) {
  const groups = mvpModifierGroups();
  const flat   = groups.flatMap(g => g.rows);

  /* ---- grouping must not lose or duplicate anything ---- */
  t.is('every rendered modifier survives grouping', flat.length, mvpModifiers().length);
  t.is('and none is rendered twice',
    new Set(flat.map(m => m.key)).size, flat.length);
  t.ok('every grouped row is one the window renders', flat.every(m => m.mvp === true));

  /* ---- read order, not book order ---- */
  // Target before Attacker before Gear. The book interleaves them; a GM ticking boxes
  // does not.
  t.is('groups follow the declared reading order',
    groups.map(g => g.key).join(','), 'target,attacker,conditions,gear');
  t.is('gear is last, so system guesses sit apart from GM judgements',
    groups[groups.length - 1].key, 'gear');
  t.ok('the gear group explains that its rows are detected',
    Boolean(groups.find(g => g.key === 'gear')?.note));

  /* ---- the groups hold what they claim ---- */
  const keysIn = k => (groups.find(g => g.key === k)?.rows ?? []).map(m => m.key).sort().join(',');
  t.is('Target holds cover and target movement',
    keysIn('target'), 'partialCover,targetRunning,targetStill');
  t.is('Attacker holds attacker movement', keysIn('attacker'), 'atkRunning');
  t.is('Conditions holds visibility', keysIn('conditions'), 'visibility');
  t.is('Gear holds the three detectable items',
    keysIn('gear'), 'laserSight,smartGoggles,smartlink');
  t.ok('every gear row is flagged as guessable from the kit',
    (groups.find(g => g.key === 'gear')?.rows ?? []).every(m => m.gear === true));

  /* ---- empty groups cost nothing ----
   * Asserted against a synthetic group rather than whichever real one happens to be
   * empty today: `conditions` used to serve here and stopped the moment visibility was
   * promoted to a rendered row, which made the assertion about the roster rather than
   * about the behaviour.
   */
  {
    SR3E_MODIFIER_GROUPS.push({ key: 'emptyTestGroup', label: 'Empty' });
    try {
      t.ok('a declared group with no rendered rows is dropped',
        !mvpModifierGroups().some(g => g.key === 'emptyTestGroup'),
        `groups: ${mvpModifierGroups().map(g => g.key).join(',')}`);
    } finally {
      SR3E_MODIFIER_GROUPS.pop();
    }
  }

  /* ---- fail-visible: a bad group must not vanish a modifier ----
   * A typo in a `group` string is exactly the kind of thing nobody notices — until a shot
   * resolves wrong because the GM never saw the checkbox. It must surface, not disappear.
   */
  {
    const bogus = { key: 'bogusTest', label: 'Bogus', mod: +1, mvp: true, group: 'typoed-group' };
    SR3E_RANGED_MODIFIERS.push(bogus);
    try {
      const withBogus = mvpModifierGroups();
      const all = withBogus.flatMap(g => g.rows).map(m => m.key);
      t.ok('a row with an unrecognised group still renders', all.includes('bogusTest'),
        `rendered: ${all.join(',')}`);
      t.is('and it lands in a trailing Other group',
        withBogus[withBogus.length - 1].key, 'other');
    } finally {
      SR3E_RANGED_MODIFIERS.pop();
    }
  }

  {
    const orphan = { key: 'orphanTest', label: 'Orphan', mod: +1, mvp: true };  // no group at all
    SR3E_RANGED_MODIFIERS.push(orphan);
    try {
      const all = mvpModifierGroups().flatMap(g => g.rows).map(m => m.key);
      t.ok('a row with no group at all still renders', all.includes('orphanTest'),
        `rendered: ${all.join(',')}`);
    } finally {
      SR3E_RANGED_MODIFIERS.pop();
    }
  }

  /* ---- every row carries a group, rendered or not ----
   * Promoting a deferred row to `mvp` should need no other change; if it arrives without
   * a group it lands in "Other" instead of where it belongs.
   */
  const ungrouped = SR3E_RANGED_MODIFIERS.filter(m => !m.group);
  t.is('every modifier in the table declares a group', ungrouped.length, 0,
    `missing: ${ungrouped.map(m => m.key).join(',') || 'none'}`);

  const knownGroups = new Set(SR3E_MODIFIER_GROUPS.map(g => g.key));
  const strays = SR3E_RANGED_MODIFIERS.filter(m => m.group && !knownGroups.has(m.group));
  t.is('and every declared group actually exists', strays.length, 0,
    `unknown: ${strays.map(m => `${m.key}→${m.group}`).join(',') || 'none'}`);

  /* ---- Visibility Table lookup (p.112, slash rule p.111) ----
   * "If the number listed is split by a slash, the first modifier applies to cybernetic
   *  or electronic vision and the second to natural vision. Modifiers listed singly
   *  apply equally to all types of vision."
   */
  const vis = (c, v) => visibilityModifier(c, v);

  t.is('normal vision reads the plain column',      vis('Full Darkness', 'normal'), 8);
  t.is('a slashed cell gives cyber the FIRST value', vis('Minimal Light', 'lowLightCyb'), 4);
  t.is('and natural the SECOND',                     vis('Minimal Light', 'lowLightNat'), 2);

  // The direction matters and is counter-intuitive: cyber vision is the WORSE of the two,
  // so an elf's own eyes beat cybereyes. A flipped slash would silently favour cyberware.
  t.ok('cybernetic is never better than natural',
    SR3E_VISION_TYPES.filter(v => !v.natural).every(cyb => {
      const nat = SR3E_VISION_TYPES.find(n => n.natural && n.column === cyb.column);
      return Object.keys(SR3E_VISIBILITY_TABLE)
        .every(c => vis(c, cyb.key) >= vis(c, nat.key));
    }));

  // A single value with no slash applies to every vision source (p.111). Thermal Smoke's
  // Low-Light cell is '+4' — both sources must read 4, not 4 and 0.
  t.is('an unslashed cell applies to cyber',   vis('Thermal Smoke', 'lowLightCyb'), 4);
  t.is('and equally to natural',               vis('Thermal Smoke', 'lowLightNat'), 4);

  // Thermal smoke exists to blind thermographic vision — it inverts the usual advantage.
  t.ok('thermal smoke punishes thermographic hardest',
    vis('Thermal Smoke', 'thermoCyb') > vis('Thermal Smoke', 'lowLightCyb'));

  // Zero is a real answer, not "unset": thermographic vision sees through mist perfectly.
  t.is('a genuine zero resolves as zero', vis('Mist', 'thermoNat'), 0);
  t.is('no condition selected is not impaired', vis('', 'normal'), 0);
  t.is('an unknown condition is not impaired',  vis('Pea Soup', 'normal'), 0);
  t.is('an unknown vision falls back to normal', vis('Full Darkness', 'nonsense'), 8);

  /* ---- and it reaches the target number ----
   * `visibility` carries mod:null, and sumModifiers skips null-mod rows — so without the
   * `value` branch the GM could pick Full Darkness and the TN would not move at all.
   */
  t.is('a resolved visibility modifier reaches the TN sum',
    sumModifiers({ visibility: vis('Full Darkness', 'normal') }), 8);
  t.is('and combines with ordinary checkboxes',
    sumModifiers({ visibility: 2, partialCover: true }), 6);
  t.is('an unset visibility contributes nothing', sumModifiers({ partialCover: true }), 4);
}
