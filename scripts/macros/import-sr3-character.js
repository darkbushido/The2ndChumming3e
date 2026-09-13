// ════════════════════════════════════════════════════════════════════════════
//  Nullsheen.com SR3 Character JSON → The 2nd Chumming 3e Importer
//  Run this macro, then paste the JSON exported from nullsheen.com.
//  Supports: attributes, skills, gear, weapons, armor, ammo, cyberware,
//            bioware, spells, adept powers, contacts, drugs.
//  Weapon mods: gas-vent recoil compensation auto-applied; all mods noted.
//  Edges/flaws appended to actor notes. Vehicles noted but not imported.
// ════════════════════════════════════════════════════════════════════════════

// ── Lookup tables ─────────────────────────────────────────────────────────────

const ATTR_MAP = {
  QCK: 'quickness', STR: 'strength',    CHA: 'charisma',
  INT: 'intelligence', WIL: 'willpower', BOD: 'body',    REA: 'reaction',
};

// Fallback linked-attribute for active skills missing an attribute code
const SKILL_ATTR_FALLBACK = {
  Biotech:    'intelligence',
  Athletics:  'quickness',
  Bike:       'reaction',
  Stealth:    'quickness',
  Swimming:   'quickness',
  Climbing:   'quickness',
  Running:    'quickness',
  Driving:    'reaction',
  Pilot:      'reaction',
};

// Reverse map: skill name (lowercase) → EVERY config entry carrying that name, in config order.
//
// ⚠ **A name can appear in several categories, and the type decides which one is meant.**
// Shotguns, Gunnery, Car, Demolitions and Wilderness Survival are each listed twice in
// SR3E.skills — once in their real active category, and again under "Background knowledge".
// This map used to keep only the LAST entry per name, and Background knowledge comes late in
// the config, so every one of those imported as a KNOWLEDGE skill (TODO 95 — reported in play
// as Wilderness Survival; the same troll's Shotguns 6 had gone the same way). `_skillItem`
// now picks the entry whose skill type matches what the export says the skill IS.
const _skillEntries = {};
for (const [cat, skillList] of Object.entries(game.sr3e?.SR3E?.skills ?? {})) {
  for (const sk of (skillList ?? [])) {
    if (sk.name) (_skillEntries[sk.name.toLowerCase()] ??= []).push({ cat, entry: sk });
  }
}

// The generator's knowledge-skill prefixes (SR3SkillsPanel.js, `KnowledgeSkills`) → our
// knowledge categories. One to one; the generator lists exactly these nine.
const KNOWLEDGE_PREFIX = {
  SW: '6th World knowledge', AC: 'Academic skills',  AK: 'Area knowledge',
  BK: 'Background knowledge', IN: 'Interests',        PD: 'Program design',
  ST: 'Street knowledge',     SV: 'Survival knowledge', SF: 'System familiarity',
};

// Nullsheen spell Class codes → our category values
const SPELL_CLASS_MAP = {
  C: 'Combat', E: 'Combat',
  D: 'Detection', H: 'Health', I: 'Illusion', N: 'Illusion',
  M: 'Manipulation', T: 'Manipulation', Z: 'Other',
};
const SPELL_TYPE_MAP     = { P: 'Physical', M: 'Mana' };
const SPELL_DURATION_MAP = { I: 'Instant', S: 'Sustained', P: 'Permanent', L: 'Limited', T: 'Task' };

// ── Helpers ───────────────────────────────────────────────────────────────────

function _num(v, fallback = 0)  { const n = parseFloat(v); return isNaN(n) ? fallback : n; }
function _int(v, fallback = 0)  { const n = parseInt(v);   return isNaN(n) ? fallback : n; }
function _str(v)                { return v != null ? String(v) : ''; }

/** Pull the firearm category code out of a name like "Morrissey Alta (HPist)" */
function _fireCat(name) {
  const m = (name ?? '').match(/\(([^)]+)\)\s*$/);
  return m ? m[1] : '';
}

/**
 * Normalise a Nullsheen Mode string to a valid SR3E mode string.
 * SR3E understands SS, SA, BF, FA, and "/" combinations thereof.
 *
 * DAR (Double-Action Revolver) = SA in game terms.
 * DAR(SA) is Nullsheen being explicit — same result.
 * Some entries have typos (period instead of slash) or exotic notations
 * (bracket secondary, "2x", multi-weapon parentheses) that need flattening.
 */
function _normalizeMode(raw) {
  const s = raw.trim();
  if (!s) return '';
  const EXACT = {
    'DAR':      'SA',
    'DAR(SA)':  'SA',
    'SA.BF/FA': 'SA/BF/FA',  // period typo in Nullsheen source
    'SA[SS]':   'SA/SS',     // LeMat secondary-barrel bracket notation
    '2x SS':    'SS',
    '2x SA':    'SA',
    '2x SA/FA': 'SA/FA',
  };
  if (EXACT[s]) return EXACT[s];
  // Multi-weapon "(primary)/(secondary)" — take the primary weapon's modes.
  const multi = s.match(/^\(([^)]+)\)\//);
  if (multi) return multi[1];
  return s;
}

/**
 * Parse weaponMods array → { recoilMod: N, notes: '<p>...</p>' }
 * Auto-detects gas-vent-N id pattern to apply recoil compensation.
 * All other mods are noted by label + cost.
 */
function _parseWeaponMods(mods) {
  if (!mods?.length) return { recoilMod: 0, notes: '' };
  let recoilMod = 0;
  const lines = [];
  for (const m of mods) {
    const id    = _str(m.id);
    const label = _str(m.label ?? m.name ?? m.Name ?? id);
    const cost  = _int(m.cost);
    const gasVent = id.match(/^gas-vent-(\d+)$/);
    if (gasVent) recoilMod += _int(gasVent[1]);
    lines.push(label + (cost ? ` (¥${cost.toLocaleString()})` : ''));
  }
  const notes = lines.length
    ? `<p><strong>Mods:</strong> ${lines.join(', ')}</p>`
    : '';
  return { recoilMod, notes };
}

// ── Item builders ─────────────────────────────────────────────────────────────

function _skillItem(s) {
  const nsType  = _str(s.type);  // 'Active' | 'Knowledge' | 'Language'
  const typeOf  = cat => game.sr3e?.SR3E?.skillTypeForCategory?.(cat);
  const wanted  = nsType === 'Active' ? 'active' : nsType === 'Language' ? 'language' : 'knowledge';

  // Resolve the category. For a name listed in several categories, take the one whose skill
  // type matches the export's own type — see `_skillEntries` above for why.
  const entries = _skillEntries[_str(s.name).toLowerCase()] ?? [];
  const match   = entries.find(e => typeOf(e.cat) === wanted);
  const prefix  = /^([A-Z]{2}):/.exec(_str(s.name))?.[1];

  let category;
  if (nsType === 'Language') {
    category = 'Language';
  } else if (match) {
    category = match.cat;
  } else if (nsType !== 'Active' && KNOWLEDGE_PREFIX[prefix]) {
    category = KNOWLEDGE_PREFIX[prefix];                 // "ST:Arms Dealers" → Street knowledge
  } else {
    category = nsType === 'Active' ? 'Technical skills' : 'Academic skills';
  }

  // skillType must be written explicitly — the schema defaults it to 'active', so leaving
  // it unset made every imported knowledge/language skill read as active. Derived from the
  // resolved category (not Nullsheen's own type string) so it always agrees with the
  // sheet's category-first classification: e.g. "MA:Aikido" → Martial Arts → knowledge.
  const skillType = game.sr3e?.SR3E?.skillTypeForCategory?.(category)
    ?? (nsType === 'Language' ? 'language' : nsType === 'Active' ? 'active' : 'knowledge');

  // Languages are rated against the Language slot, not a physical/mental attribute.
  // When the export omits the attribute (it does for Bike and Armor B/R), the matched config
  // entry knows it; the small table below is only the last resort.
  const attr = skillType === 'language'
    ? 'lan'
    : (ATTR_MAP[s.attribute ?? ''] ?? match?.entry?.linkedAttribute
       ?? SKILL_ATTR_FALLBACK[s.name] ?? 'intelligence');

  /* ⚠ The generator writes a PLACEHOLDER when no specialisation was chosen — `weapon->`,
   * `vehicle->`. Imported as-is it became a specialisation literally named "weapon->", which
   * the legacy-string migration then rated at +2. Anything ending in `->` is a picker prompt. */
  const spec = /->\s*$/.test(_str(s.specialization)) ? '' : _str(s.specialization);

  return {
    name: s.name,
    type: 'skill',
    system: {
      skillName:       s.name,
      rating:          _int(s.rating),
      linkedAttribute: attr,
      specialisation:  spec,
      category,
      skillType,
    },
  };
}

/**
 * A gear row's rating: the export's `Rating` when it is a number ("-" means none), else the one
 * in its name — `Medkit [6]`, `Medkit Rating 6`. 0 when there is neither.
 *
 * ⚠ The name half mirrors `ratingFromName` in `scripts/data/item-rating.mjs`, duplicated ON
 * PURPOSE: this file is pasted into a Macro and cannot import. If one changes, change both.
 */
function _gearRating(g) {
  const r = parseInt(_str(g.Rating), 10);
  if (Number.isFinite(r) && r > 0) return r;
  const s = _str(g.Name);
  const m = /\[\s*(\d+)\s*\]/.exec(s) ?? /\brating\s*\[?\s*(\d+)/i.exec(s);
  return m ? Number(m[1]) : 0;
}

function _gearItems(gear) {
  const items = [];
  for (const g of gear ?? []) {
    const qty      = Math.max(1, _int(g.Amount, 1));
    const type     = _str(g.Type);
    const balStr   = _str(g.Ballistic);
    const impStr   = _str(g.Impact);
    const hasBal   = balStr !== '' && balStr !== '-' && !isNaN(parseFloat(balStr));

    if (type === 'Firearms') {
      const { recoilMod, notes } = _parseWeaponMods(g.weaponMods);
      items.push({
        name: g.Name,
        type: 'firearm',
        system: {
          category:       _fireCat(g.Name),
          concealability: _str(g.Concealability),
          ammunition:     _str(g.Ammunition),
          mode:           _normalizeMode(_str(g.Mode)),
          damage:         _str(g.Damage),
          weight:         _num(g.Weight),
          recoilMod,
          availability:   _str(g.Availability),
          cost:           _int(g.Cost),
          streetIndex:    _str(g['Street Index']),
          accessories:    _str(g.Accessories),
          bookPage:       _str(g.BookPage),
          notes,
        },
      });

    } else if (type === 'Clothing and Armor' && hasBal) {
      items.push({
        name: g.Name,
        type: 'armor',
        system: {
          concealability: _str(g.Concealability),
          ballistic:      Math.round(_num(balStr)),
          impact:         Math.round(_num(impStr)),
          weight:         _num(g.Weight),
          availability:   _str(g.Availability),
          cost:           _int(g.Cost),
          streetIndex:    _str(g['Street Index']),
          bookPage:       _str(g.BookPage),
        },
      });

    } else if (type === 'Ammunition') {
      items.push({
        name: qty > 1 ? `${g.Name} ×${qty}` : g.Name,
        type: 'ammunition',
        system: {
          concealability: _str(g.Concealability),
          damage:         _str(g.Damage),
          weight:         _num(g.Weight) * qty,
          availability:   _str(g.Availability),
          cost:           _int(g.Cost),
          streetIndex:    _str(g['Street Index']),
          bookPage:       _str(g.BookPage),
        },
      });

    } else if (type === 'Bow and crossbow') {
      const dmg = _str(g.Damage);
      // Real damage code starts with a digit ("7M"); ammo references start with "(" ("(As crossbow)")
      if (/^\d/.test(dmg)) {
        // Weapon — bow or crossbow
        items.push({
          name: g.Name,
          type: 'projectile',
          system: {
            category:       _fireCat(g.Name) || 'Bow',
            concealability: _str(g.Concealability),
            damage:         dmg,
            weight:         _num(g.Weight),
            availability:   _str(g.Availability),
            cost:           _int(g.Cost),
            streetIndex:    _str(g['Street Index']),
            bookPage:       _str(g.BookPage),
          },
        });
      } else {
        // Ammo — bolts or arrows; name often encodes count ("10 Bolts")
        const nm      = _str(g.Name);
        const mech    = nm.toLowerCase().includes('bolt') ? 'bolt' : 'arrow';
        const countM  = nm.match(/^(\d+)\s/);
        const rounds  = countM ? _int(countM[1]) * qty : qty;
        items.push({
          name: nm,
          type: 'ammunition',
          system: {
            ammoType:      'regular',
            loadMechanism:  mech,
            rounds,
            weight:         _num(g.Weight) * qty,
            availability:   _str(g.Availability),
            cost:           _int(g.Cost),
            streetIndex:    _str(g['Street Index']),
            bookPage:       _str(g.BookPage),
          },
        });
      }

    } else if (type === 'Grenades') {
      items.push({
        name: qty > 1 ? `${g.Name} ×${qty}` : g.Name,
        type: 'thrown',
        system: {
          category:       'Grenade',
          concealability: _str(g.Concealability),
          damage:         _str(g.Damage),
          weight:         _num(g.Weight) * qty,
          quantity:       qty,
          availability:   _str(g.Availability),
          cost:           _int(g.Cost),
          streetIndex:    _str(g['Street Index']),
          bookPage:       _str(g.BookPage),
        },
      });

    } else if (type === 'Drugs') {
      items.push({
        name: qty > 1 ? `${g.Name} ×${qty}` : g.Name,
        type: 'drug',
        system: {
          addiction:    _str(g.Addiction),
          tolerance:    _str(g.Tolerance),
          effect:       _str(g.Edge),   // "Edge" column in source tables
          availability: _str(g.Availability),
          cost:         _int(g.Cost),
          streetIndex:  _str(g['Street Index']),
          bookPage:     _str(g.BookPage),
          notes:        g.Notes ? `<p>${_str(g.Notes)}</p>` : '',
        },
      });

    } else {
      // Plain gear: clothing without armour stats, lifestyles, medkits, credsticks, misc.
      // ⚠ The export's Rating, Availability, Street Index and BookPage used to be dropped, so a
      // Medkit [6] kept its rating only in its name (reported in play, 2026-09-13).
      items.push({
        name: qty > 1 ? `${g.Name} ×${qty}` : g.Name,
        type: 'gear',
        system: {
          quantity:     qty,
          rating:       _gearRating(g),
          cost:         _int(g.Cost),
          weight:       _num(g.Weight) * qty,
          availability: _str(g.Availability),
          streetIndex:  _str(g['Street Index']),
          bookPage:     _str(g.BookPage),
        },
      });
    }
  }
  return items;
}

/** Weapons array (separate from gear) — handles both firearm and melee entries */
function _weaponItems(weapons) {
  return (weapons ?? []).map(w => {
    const name = _str(w.Name ?? w.name);
    const hasReach = w.Reach != null || w.reach != null;
    const wtype = _str(w.Type ?? w.type).toLowerCase();

    if (wtype === 'melee' || hasReach) {
      return {
        name,
        type: 'melee',
        system: {
          category:       _str(w.Category ?? w.category),
          concealability: _str(w.Concealability),
          reach:          _int(w.Reach ?? w.reach),
          damage:         _str(w.Damage ?? w.damage),
          weight:         _num(w.Weight ?? w.weight),
          availability:   _str(w.Availability),
          cost:           _int(w.Cost ?? w.cost),
          streetIndex:    _str(w['Street Index'] ?? w.streetIndex),
          bookPage:       _str(w.BookPage ?? w.bookPage),
        },
      };
    }
    const { recoilMod, notes } = _parseWeaponMods(w.weaponMods);
    return {
      name,
      type: 'firearm',
      system: {
        category:       _fireCat(name),
        concealability: _str(w.Concealability),
        ammunition:     _str(w.Ammunition),
        mode:           _normalizeMode(_str(w.Mode)),
        damage:         _str(w.Damage ?? w.damage),
        weight:         _num(w.Weight ?? w.weight),
        recoilMod,
        availability:   _str(w.Availability),
        cost:           _int(w.Cost ?? w.cost),
        streetIndex:    _str(w['Street Index'] ?? w.streetIndex),
        accessories:    _str(w.Accessories),
        bookPage:       _str(w.BookPage ?? w.bookPage),
        notes,
      },
    };
  });
}

function _spellItem(sp) {
  // Nullsheen uses capitalised field names (Name, Class, Type, etc.)
  const classCode    = _str(sp.Class    ?? sp.class    ?? sp.category ?? '').trim();
  const typeCode     = _str(sp.Type     ?? sp.type     ?? '').trim();
  const durationCode = _str(sp.Duration ?? sp.duration ?? '').trim();
  return {
    name: _str(sp.Name ?? sp.name),
    type: 'spell',
    system: {
      category:    (SPELL_CLASS_MAP[classCode]    ?? classCode)    || 'Combat',
      type:        (SPELL_TYPE_MAP[typeCode]       ?? typeCode)    || 'Physical',
      range:       _str(sp.Range    ?? sp.range)                  || 'LOS',
      target:      _str(sp.Target   ?? sp.target),
      duration:    (SPELL_DURATION_MAP[durationCode] ?? durationCode) || 'Instant',
      drain:       _str(sp.Drain    ?? sp.drain),
      bookPage:    _str(sp.BookPage ?? sp.bookPage),
      description: (sp.Notes ?? sp.notes) ? `<p>${_str(sp.Notes ?? sp.notes)}</p>` : '',
    },
  };
}

function _contactItem(c) {
  const level = _int(c.Level ?? c.level, 1);
  return {
    name: _str(c.Name ?? c.name) || 'Unknown Contact',
    type: 'contact',
    system: {
      loyalty:    level,
      connection: level,
      archetype:  _str(c.Archtype ?? c.archetype ?? c.Type ?? ''),
      notes:      (c.GeneralInfo ?? c.notes) ? `<p>${_str(c.GeneralInfo ?? c.notes)}</p>` : '',
    },
  };
}

/** Build an HTML block summarising edges and flaws for the actor's Notes field. */
function _edgesFlawsNotes(cj) {
  const edges = (cj.edges ?? []).map(e => {
    const cost = e.cost != null ? ` [${e.cost > 0 ? '+' : ''}${e.cost}]` : '';
    return _str(e.name) + cost;
  });
  const flaws = (cj.flaws ?? []).map(f => {
    const cost = f.cost != null ? ` [${f.cost}]` : '';
    return _str(f.name) + cost;
  });
  const parts = [];
  if (edges.length) parts.push(`<p><strong>Edges:</strong> ${edges.join(', ')}</p>`);
  if (flaws.length)  parts.push(`<p><strong>Flaws:</strong> ${flaws.join(', ')}</p>`);
  return parts.join('');
}

// ── Dialog ────────────────────────────────────────────────────────────────────

let jsonText = '';
await foundry.applications.api.DialogV2.wait({
  window: { title: 'Import Nullsheen 3e Character' },
  content: `
    <p style="margin:0 0 4px;font-size:13px">
      Go to <strong>nullsheen.com</strong>, build your character, then use
      <em>Export → JSON</em>. Paste the result below:
    </p>
    <textarea id="sr3json"
      style="width:100%;height:280px;font-size:11px;font-family:monospace;
             background:#111;color:#ccc;border:1px solid #444;border-radius:4px;
             padding:6px;box-sizing:border-box"
      placeholder='{ "street_name": "...", "skills": [...], "gear": [...] }'></textarea>
    <p style="margin:6px 0 0;font-size:11px;color:#888">
      Imports: attributes · skills · firearms · bows/crossbows · grenades ·
      armor · ammo · drugs · cyberware · bioware · spells · adept powers · contacts
    </p>`,
  buttons: [
    {
      label: 'Import',
      action: 'import',
      default: true,
      callback: (_e, _b, dialog) => {
        jsonText = dialog.element.querySelector('#sr3json')?.value ?? '';
      },
    },
    { label: 'Cancel', action: 'cancel' },
  ],
});

if (!jsonText.trim()) return;

let cj;
try { cj = JSON.parse(jsonText); }
catch (e) { return void ui.notifications.error(`SR3 Import — invalid JSON: ${e.message}`); }

// ── Build actor data ──────────────────────────────────────────────────────────

const a     = cj.attributes ?? {};

/* ⚠ **Racial modifiers are ADDED here** · SR3 p.56. The generator exports the player's
 * allocation in `attributes` and the Racial Modifications Table's part separately in
 * `raceBonuses`; its own sheet shows the sum. Reading `attributes` alone — which this macro
 * did until 2026-09-11 — imported every metahuman at human ratings: a troll's Body 10 as 5.
 *
 * The rule lives on SR3EActor rather than in this file on purpose. This macro is copied into
 * each world as a Macro document on first load and never refreshed, so logic kept here only
 * reaches a world whose GM deletes and recreates the macro. Kept in the system, a later fix to
 * the rule reaches everyone. */
const racial = game.sr3e.SR3EActor.racialAttributes({
  allocation: a, race: cj.race, raceBonuses: cj.raceBonuses,
});
const ra = racial.attributes;
const nuyen = Math.max(0, _int(cj.chargenCash) - _int(cj.cashSpent)) + _int(cj.cash);

// magicalTradition may be a plain string or an object { name, description, ... }
const tradObj = cj.magicalTradition;
const trad    = typeof tradObj === 'string' ? tradObj : (_str(tradObj?.name));

const notesText = (cj.notes ? `<p>${cj.notes}</p>` : '') + _edgesFlawsNotes(cj);

const actorData = {
  name: (_str(cj.street_name) || _str(cj.name) || 'Imported Character').trim(),
  type: 'character',
  system: {
    age:       _str(cj.age),
    metatype:  (_str(cj.race) || 'human').toLowerCase(),
    nuyen,
    karma:     _int(cj.karma),
    karmaPool: _int(cj.karmaPool),
    notes:     notesText,
    biography: cj.description ? `<p>${cj.description}</p>` : '',
    attributes: {
      // `base` is the FINISHED rating — allocation plus race — which is how every shipped
      // metahuman stores it too. Nothing adds the racial part again at derive time.
      body:         { base: ra.body,         value: ra.body         },
      quickness:    { base: ra.quickness,    value: ra.quickness    },
      strength:     { base: ra.strength,     value: ra.strength     },
      charisma:     { base: ra.charisma,     value: ra.charisma     },
      intelligence: { base: ra.intelligence, value: ra.intelligence },
      willpower:    { base: ra.willpower,    value: ra.willpower    },
      // Essence: `value` is derived, `lost` is the persisted permanent loss. Leaving
      // `lost` at 0 is correct here — the derivation takes max(lost, installed), so an
      // imported character reads the right Essence from their cyberware immediately, and
      // the ratchet hook records the mark the first time that hardware is touched.
      essence:      { base: 6, value: 6, lost: 0 },
      magic:        { base: a.Magic        ?? 0, value: a.Magic        ?? 0 },
      reaction:     { base: a.Reaction     ?? 3, value: a.Reaction     ?? 3 },
    },
  },
};

// Awakened / Adept flags
if (cj.magical && (a.Magic ?? 0) > 0) {
  actorData.system.magicTradition = trad;
  actorData.system.magicType      = 'Full';
} else if (cj.adept && (a.Magic ?? 0) > 0) {
  actorData.system.magicType = 'Adept';
}

// ── Create actor ──────────────────────────────────────────────────────────────

const actor = await Actor.create(actorData);
if (!actor) return void ui.notifications.error('SR3 Import — failed to create actor.');

// ── Collect items ─────────────────────────────────────────────────────────────

const items = [];

for (const s of cj.skills   ?? []) items.push(_skillItem(s));
items.push(..._gearItems(cj.gear));
items.push(..._weaponItems(cj.weapons));
for (const sp of cj.spells  ?? []) items.push(_spellItem(sp));
for (const c of cj.contacts ?? []) items.push(_contactItem(c));

for (const c of cj.cyberware ?? []) {
  // ⚠ The generator exports GRADED Essence and cost (an alpha implant's EssCost is already ×.8).
  // Keep those, and record the base they came from, or the Essence total grades them twice
  // (TODO 101). The rule lives in system code so a fix reaches worlds with an old macro copy.
  const graded = game.sr3e.SR3EActor.importedCyberwareCosts({
    essCost: _num(c.EssCost ?? c.essCost, 0.5), cost: _int(c.Cost), grade: _str(c.Grade) });
  items.push({
    name: c.Name,
    type: 'cyberware',
    system: {
      essenceCost:       graded.essenceCost,
      essenceCostBase:   graded.essenceCostBase,
      grade:             graded.grade,
      cost:              graded.cost,
      costBase:          graded.costBase,
      availability:      _str(c.Availability),
      streetIndex:       _num(c.StreetIndex ?? c['Street Index']),
      legalCode:         _str(c.LegalCode),
      mods:              _str(c.Mods),
      capacity:          _num(c.Capacity),
      cyberwareCategory: _str(c.Category),
      bookPage:          _str(c.BookPage),
      description:       c.Notes ? `<p>${_str(c.Notes)}</p>` : '',
    },
  });
}

for (const b of cj.bioware ?? []) {
  items.push({
    name: b.Name,
    type: 'bioware',
    system: {
      bioIndex:         _num(b.BioIndex ?? b.EssCost, 0.25),
      grade:            _str(b.Grade) || 'Standard',
      cost:             _int(b.Cost),
      availability:     _str(b.Availability),
      streetIndex:      _num(b.StreetIndex ?? b['Street Index']),
      mods:             _str(b.Mods),
      biowareCategory:  _str(b.Category),
      bookPage:         _str(b.BookPage),
    },
  });
}

for (const pw of cj.powers ?? []) {
  items.push({
    name: _str(pw.Name ?? pw.name),
    type: 'adeptpower',
    system: {
      powerCost:   _num(pw.Cost ?? pw.powerCost ?? pw.cost, 0.5),
      hasLevels:   (pw.HasLevels ?? pw.hasLevels) ?? false,
      level:       _int(pw.Rating ?? pw.level, 1),
      mods:        _str(pw.Mods ?? pw.mods),
      bookPage:    _str(pw.BookPage ?? pw.bookPage),
      description: (pw.Notes ?? pw.notes) ? `<p>${_str(pw.Notes ?? pw.notes)}</p>` : '',
    },
  });
}

// ── Embed items ───────────────────────────────────────────────────────────────

const created = await actor.createEmbeddedDocuments('Item', items);

// ── Auto-equip the highest-ballistic armor piece ──────────────────────────────

const armorItems = created.filter(i => i.type === 'armor');
if (armorItems.length) {
  const best = armorItems.reduce((a, b) =>
    (b.system.ballistic ?? 0) > (a.system.ballistic ?? 0) ? b : a);
  await actor.update({ 'system.equippedArmor': best.id });
}

// ── Create vehicle / drone actors ─────────────────────────────────────────────

function _vattr(n) { return { base: n, value: n }; }

function _vehicleActorData(v, isDrone) {
  // Parse "A/B" slash pairs into two ints; dash or missing → 0
  function _pair(field) {
    const parts = _str(v[field]).split('/');
    return [_int(parts[0], 0), _int(parts[1] ?? parts[0], 0)];
  }
  const [handling, handlingOff] = _pair('Handling');
  const [speed, accel]          = _pair('Speed/Accel');
  const [body, armor]           = _pair('Body/Armor');
  const [sig, autonav]          = _pair('Sig/Autonav');
  const [pilot, sensor]         = _pair('Pilot/Sensor');
  const [cargo, load]           = _pair('Cargo/Load');

  const seatStr = _str(v.Seating ?? v.seating);
  // If seating string ends in 'm' it's a motorcycle seat
  const vehicleType = isDrone ? 'drone' : (/m$/i.test(seatStr.trim()) ? 'bike' : 'car');

  return {
    name: _str(v.name ?? v.Name),
    type: 'vehicle',
    system: {
      vehicleType,
      seating:      parseInt(seatStr) || 0,
      cost:         _int(v['$Cost'] ?? v.Cost),
      streetIndex:  _num(v['Street Index']),
      availability: _str(v.Availability),
      bookPage:     _str(v['Book.Page'] ?? v.BookPage),
      notes:        v.Notes ? `<p>${_str(v.Notes)}</p>` : '',
      attributes: {
        handling:        _vattr(handling),
        handlingOffRoad: _vattr(handlingOff),
        speed:           _vattr(speed),
        accel:           _vattr(accel),
        body:            _vattr(body),
        armor:           _vattr(armor),
        sig:             _vattr(sig),
        autonav:         _vattr(autonav),
        pilot:           _vattr(pilot),
        sensor:          _vattr(sensor),
        cargo:           _vattr(cargo),
        load:            _vattr(load),
      },
    },
  };
}

let vehicleCount = 0;
for (const v of cj.vehicles ?? []) {
  try   { await Actor.create(_vehicleActorData(v, false)); vehicleCount++; }
  catch (err) { console.error(`SR3 Import | vehicle "${v.name}":`, err); }
}
for (const d of cj.drones ?? []) {
  try   { await Actor.create(_vehicleActorData(d, true)); vehicleCount++; }
  catch (err) { console.error(`SR3 Import | drone "${d.name}":`, err); }
}

// ── Summary notification ──────────────────────────────────────────────────────

const count   = t => created.filter(i => i.type === t).length;
const weapons = ['firearm', 'melee', 'projectile', 'thrown'].reduce((n, t) => n + count(t), 0);

ui.notifications.info(
  `Imported "${actor.name}": ` +
  `${count('skill')} skills · ${weapons} weapons · ${count('armor')} armor · ` +
  `${count('ammunition')} ammo · ${count('drug')} drugs · ${count('gear')} gear · ` +
  `${count('cyberware')} cyber · ${count('bioware')} bio · ` +
  `${count('spell')} spells · ${count('adeptpower')} powers · ` +
  `${count('contact')} contacts` +
  (vehicleCount ? ` · ${vehicleCount} vehicles/drones` : '')
);

/* Say what the racial step did, so a GM can check it against the generator's sheet. */
const _ABBR = { body: 'BOD', quickness: 'QCK', strength: 'STR',
                charisma: 'CHA', intelligence: 'INT', willpower: 'WIL' };
if (racial.source === 'export' || racial.source === 'table') {
  const mods = Object.entries(racial.modifiers).filter(([, v]) => v)
    .map(([k, v]) => `${v > 0 ? '+' : ''}${v} ${_ABBR[k]}`).join(', ');
  ui.notifications.info(`"${actor.name}": ${actorData.system.metatype} racial modifiers applied (${mods})`
    + (racial.source === 'table' ? ' — from the SR3 p.56 table; the export carried none.' : '.'));
} else if (racial.source === 'unknown') {
  ui.notifications.warn(`"${actor.name}": race "${cj.race}" is not in the Racial Modifications Table `
    + '— no racial modifiers applied. Set the attributes by hand.');
}
if (racial.belowOne.length) {
  ui.notifications.warn(`"${actor.name}": ${racial.belowOne.map(k => _ABBR[k]).join(', ')} below 1 `
    + 'after racial modifiers. Only Magic may be 0 (SR3 p.56) — the allocation needs changing.',
    { permanent: true });
}

actor.sheet.render(true);
