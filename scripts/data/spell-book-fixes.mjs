/**
 * Spell data corrected against the books — TODO 123, `audit/spells-audit.md`. **Pure — no Foundry.**
 *
 * One table, two users: `tools/fix-spell-book-values.mjs` corrects `packs-src`, and the 0.9.0 migration
 * corrects copies already in a world (Foundry embeds items, it doesn't link them).
 *
 * ⚠ **This OVERWRITES, and argues for it:** a field changes ONLY while it still holds exactly the value
 * the old pack shipped — a value verified wrong against the printed entry (book and page per row). A GM
 * who has since typed their own value, or a spell that never came from the pack, no longer matches `from`
 * and is left alone. Each entry is also gated on the spell's `bookPage`, so a same-named spell from
 * another book is never touched. Idempotent: once corrected, `from` no longer matches.
 *
 * `damageTrack` is a fill-blank in effect: it only ever moves from '' (the shipped blank) to 'Stun'.
 */

const same = (a, b) => String(a ?? '') === String(b ?? '');

/** The book's Manipulation subtypes (SR3 pp.196-198; MitS pp.144-148; TWL). Category `from` → `to` by name. */
const CONTROL_SR3     = ['Control Actions', 'Control Emotion', 'Control Thoughts', 'Influence'];
const TELEKINETIC_SR3 = ['Clout', 'Fling', 'Levitate', 'Magic Fingers', 'Poltergeist'];
const TRANSFORM_SR3   = ['Armor', 'Astral Barrior', 'Ice Sheet', 'Ignite', 'Light', 'Petrify', 'Physical Barrier', 'Shadow'];
const CONTROL_MITS    = ['Alter Memory', 'Calm Animal', 'Calm Pack', 'Compel Truth', 'Control Animal', 'Control Pack',
  'Mob Mind', 'Mob Mood'];
const TELEKINETIC_MITS = ['Animate', 'Bind', 'Net', 'Catfall', 'Deflect', 'Gecko Crawl', 'Lock', 'Mana Bind', 'Mana Net',
  'Redirect', 'Shape Earth', 'Shape Water', 'Use(Skill)->'];
const TRANSFORM_MITS  = ['Alter Temperature', 'Astral Armor', 'Clean(Element)->', 'Control Fire', 'Create Food', 'Fashion',
  'Firewall', 'Fix', 'Flame Aura', 'Freeze Water', 'Glue', 'Glue Strip', 'Limited Armor', 'Limited Physical Barrior',
  'Makeover', 'Mana Static', 'Mist', 'Reinforce', 'Shapechange', 'Spell Shield', 'Spell Wall', 'Spirit Barrior',
  'Sterilize', 'Transform', 'Wind'];
const TRANSFORM_TWL   = ['Alter Pressure', 'Personal Thermostat', 'Radiation Barrier', 'Radiation Shield', 'Shape Snow/Ice'];

const cat = (names, book, from, to, page) =>
  names.map(name => ({ name, book, page, fixes: [{ field: 'category', from, to }] }));

/** `{ name, book (bookPage prefix), page (citation), fixes: [{ field, from, to }], rename? }` */
export const SPELL_CORRECTIONS = [
  /* ── Field values against the printed entry ─────────────────────────────────────────────── */
  { name: 'Mass Blindness', book: 'mits.', page: 'MitS p.143', fixes: [{ field: 'type', from: 'Mana', to: 'Physical' }] },
  { name: 'Fashion',        book: 'mits.', page: 'MitS p.147', fixes: [{ field: 'drain', from: '+1(L)', to: '+1(M)' }] },
  { name: 'Diagnose',       book: 'mits.', page: 'MitS p.141', fixes: [{ field: 'duration', from: 'Sustained', to: 'Instant' }] },
  // "Ram works just like Wreck, except the caster must touch the target."
  { name: 'Ram->',          book: 'mits.', page: 'MitS p.140', fixes: [{ field: 'range', from: 'LOS', to: 'T' }] },
  { name: 'Splash',         book: 'twl.',  page: 'TWL p.124',  fixes: [{ field: 'range', from: 'LOS', to: 'LOS(A)' }] },
  { name: 'Radiation Barrier', book: 'twl.', page: 'TWL p.111', fixes: [{ field: 'range', from: 'LOS', to: 'LOS(A)' }] },
  { name: 'Personal Thermostat', book: 'twl.', page: 'TWL p.119', fixes: [{ field: 'range', from: 'LOS', to: 'P' }] },
  { name: 'Alter Pressure', book: 'twl.',  page: 'TWL p.130',  fixes: [{ field: 'bookPage', from: 'twl.131', to: 'twl.130' }] },

  /* ── Stun damage the name does not say (SpellDealsStun reads a blank track from the name) ───── */
  ...['Steam', 'Smoke Cloud', 'Thunderbolt', 'Thunderclap'].map(name =>
    ({ name, book: 'mits.', page: 'MitS p.145', fixes: [{ field: 'damageTrack', from: '', to: 'Stun' }] })),
  ...['Waterbolt', 'Splash'].map(name =>
    ({ name, book: 'twl.', page: 'TWL p.124', fixes: [{ field: 'damageTrack', from: '', to: 'Stun' }] })),
  { name: 'Clout', book: 'sr3.', page: 'SR3 p.197', fixes: [{ field: 'damageTrack', from: '', to: 'Stun' }] },

  /* ── The book's Manipulation subtypes (the maintainer, 2026-11-08: "Relabel to the book") ───── */
  ...cat(CONTROL_SR3, 'sr3.', 'Manipulation', 'Control', 'SR3 p.196'),
  ...cat(TELEKINETIC_SR3, 'sr3.', 'Transformation', 'Telekinetic', 'SR3 p.197'),
  ...cat(TRANSFORM_SR3, 'sr3.', 'Manipulation', 'Transformation', 'SR3 p.198'),
  ...cat(CONTROL_MITS, 'mits.', 'Manipulation', 'Control', 'MitS p.144-145'),
  ...cat(TELEKINETIC_MITS, 'mits.', 'Transformation', 'Telekinetic', 'MitS p.145-146'),
  ...cat(TRANSFORM_MITS, 'mits.', 'Manipulation', 'Transformation', 'MitS p.146-148'),
  ...cat(TRANSFORM_TWL, 'twl.', 'Manipulation', 'Transformation', 'TWL pp.111-130'),

  /* ── Misspelt names (the maintainer, 2026-11-08: "Packs + owned copies") ───────────────────── */
  { name: 'Astral Barrior', book: 'sr3.', page: 'SR3 p.198', fixes: [], rename: 'Astral Barrier' },
  { name: 'Hot Potatoe', book: 'mits.', page: 'MitS p.143', fixes: [], rename: 'Hot Potato' },
  { name: 'Limited Physical Barrior', book: 'mits.', page: 'MitS p.147', fixes: [], rename: 'Limited Physical Barrier' },
  { name: 'Spirit Barrior', book: 'mits.', page: 'MitS p.148', fixes: [], rename: 'Spirit Barrier' },
];

export const SpellBookFixes = {
  /** Update delta for one spell item (`{ 'system.x': v, name? }`), or null. */
  fixItem(item) {
    if (item?.type !== 'spell') return null;
    const sys = item.system ?? {};
    const page = String(sys.bookPage ?? '');
    // An owned copy may carry its learned Force in the name ("Manaball (F5)" on the archetypes) — match the
    // spell's own name, and keep the suffix through a rename.
    const m = String(item.name ?? '').match(/^(.*?)(\s*\(F\d+\))?$/);
    const base = m[1], suffix = m[2] ?? '';
    const delta = {};
    for (const c of SPELL_CORRECTIONS) {
      if (c.name !== base || !page.startsWith(c.book)) continue;
      for (const f of c.fixes) {
        if (same(sys[f.field], f.from) && !same(sys[f.field], f.to)) delta[`system.${f.field}`] = f.to;
      }
      if (c.rename) delta.name = c.rename + suffix;
    }
    return Object.keys(delta).length ? delta : null;
  },

  /** Apply a delta to a plain document in place (the pack tool). */
  apply(doc, delta) {
    for (const [k, v] of Object.entries(delta)) {
      if (k === 'name') doc.name = v;
      else doc.system[k.slice('system.'.length)] = v;
    }
  },
};
