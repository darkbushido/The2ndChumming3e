// ════════════════════════════════════════════════════════════════════════════
//  SR3E — Chrome Threat Generator
//  Paste into a Foundry macro (Type: Script) and run as the GM.
//
//  Generates semi-random Little Black Book-style NPCs, each with a PAIR OF
//  OBVIOUS CYBERARMS, at a THREAT LEVEL of 1-10:
//
//     1-2  street muscle — a starting troll wins comfortably
//     3    an even fight
//     4    NPC/Professional Rating Superior/4 — hard for ONE troll head-on
//     5-7  beyond the Little Black Book's scale; teams only
//     8-9  prime runner / black-ops chrome; plan for it or run
//     10   horrific — a sub-zero cyberzombie on Move-by-Wire 4, or a sniper
//          whose tactical computer is fed all eight senses it can use
//
//  Rules followed (page cites are to the book, not the PDF):
//    · Cyberarm base Strength by race: human 4 · ork/dwarf 6 · troll 8,
//      enhanced up to +3 with no extra Essence                     — M&M p.33
//    · Limb Strength ≤ min(2 × Body, Body + 4), natural Body         — M&M p.33
//    · Pair of cyberarms +1 Body, pair of legs +2, torso +1; two cyberlimbs
//      +2 unarmed Power                                        — M&M p.33, p.28
//    · Enhancement past +3 requires a cybertorso ("w/Torso" rows)    — M&M p.28
//    · Move-by-Wire: excludes every other Reaction/Initiative enhancer; its
//      Quickness does not count toward Reaction (the system handles both) — p.30
//    · Tactical computer: 1 rating point per 2 applicable senses, +1 Combat Pool
//      die per point, max +4; an orientation system counts as 2 senses — p.22
//    · Cybermancy: Essence below 0 only via a delta clinic; subject gets an
//      invoked memory stimulator and an auto-injector                 — p.54-58
//    · Grades (Alpha ×.8, Beta ×.6, Delta ×.5) are applied BY THE SYSTEM from
//      `grade`; the costs below are the book's standard figures       — M&M p.45
//    · Attributes include racial modifiers (SR3 p.56), capped at the Racial
//      Modified Limit (SR3 p.245). Troll dermal armour is added by the sheet.
//
//  The arms' Strength is a `bonusStr` on the cyberarm item, so the sheet shows
//  natural Strength + the limb's surplus. Reaction, initiative dice, Body and
//  Essence are DERIVED from the implants — nothing is hand-set on the actor.
// ════════════════════════════════════════════════════════════════════════════

if (!game.user.isGM) {
  ui.notifications.warn('SR3E: only the GM can generate NPCs.');
  return;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const rand  = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
const pick  = arr => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const pickW = table => {                        // [[value, weight], …]
  let r = Math.random() * table.reduce((s, [, w]) => s + w, 0);
  for (const [v, w] of table) { if ((r -= w) < 0) return v; }
  return table[table.length - 1][0];
};

function skill(name, rating, linkedAttribute, spec = null, category = 'Combat skills') {
  return {
    name, type: 'skill',
    system: {
      skillName: name, rating, linkedAttribute,
      skillType: 'active', category,
      // `level` is the BONUS over the base rating; 2 is the chargen gap (SR3 p.57).
      specialisations: spec ? [{ name: spec, level: 2 }] : [],
    },
  };
}

function cyberware(name, essenceCost, grade, extra = {}) {
  return {
    name, type: 'cyberware',
    system: { essenceCost, grade, cyberwareCategory: extra.category ?? 'Bodyware',
              bookPage: extra.bookPage ?? '', ...extra.system },
  };
}

function melee(name, category, damage, reach, extra = {}) {
  return { name, type: 'melee',
           system: { category, damage, reach, bookPage: extra.bookPage ?? '',
                     concealability: extra.concealability ?? '' } };
}

function firearm(name, category, damage, mode, ammunition, magazine, extra = {}) {
  return { name, type: 'firearm',
           system: { category, damage, mode, ammunition,
                     loadedAmmoType: extra.ammo ?? 'regular', loadedRounds: magazine,
                     accessories: extra.accessories ?? '', recoilMod: extra.recoilMod ?? 0,
                     bookPage: extra.bookPage ?? '' } };
}

function armor(name, ballistic, impact, bookPage = 'sr3.284') {
  return { name, type: 'armor', system: { ballistic, impact, bookPage } };
}

/** Mirrors SR3EActor.gradedEssenceCost — per item, rounded UP to 2dp. For the notes only. */
const GRADE_MULT = { standard: 1, alpha: 0.8, beta: 0.6, delta: 0.5 };
function gradedEssence(cost, grade) {
  const m = GRADE_MULT[String(grade).toLowerCase()] ?? 1;
  if (!cost) return 0;
  return m === 1 ? cost : Math.max(0.01, Math.ceil(cost * m * 100) / 100);
}
const essenceOf = items => items.reduce((s, i) => s + gradedEssence(i.system.essenceCost, i.system.grade), 0);

// ── Implant builders ────────────────────────────────────────────────────────

// Wired Reflexes is the LAST thing given back when the Essence budget runs out.
const wired = (r, g) => r > 0 && Object.assign(
  cyberware(`Wired Reflexes [${r}]`, [0, 2, 3, 5][r], g,
    { category: 'Headware', bookPage: 'sr3.302',
      system: { rating: r, bonusRea: 2 * r, bonusInitDice: r } }),
  { _wired: r });

const reactionEnh = (r, g) => r > 0 && cyberware(`Reaction Enhancer [${r}]`, 0.3 * r, g,
  { category: 'Headware', bookPage: 'sr3.302', system: { rating: r, bonusRea: r } });

// Dermal plating is the first thing given back when the Essence budget runs out.
const dermal = (r, g) => r > 0 && Object.assign(
  cyberware(`Dermal Plating [${r}]`, 0.5 * r, g,
    { bookPage: 'sr3.302', system: { rating: r, bonusBod: r } }),
  { _dermal: r });

const moveByWire = (r, g) => cyberware(`Move-by-Wire [${r}]`, [0, 2.5, 4, 5.5, 7][r], g,
  { category: 'Headware', bookPage: 'mm.30',
    system: { rating: r, bonusQui: r, bonusRea: 2 * r, bonusInitDice: r } });

// ── Threat levels ───────────────────────────────────────────────────────────
//  Index = level. Level 4 reproduces the original generator (Superior/4).

// ⚠ Every table below is 1-INDEXED BY THREAT LEVEL, so each opens with a deliberate elision:
// `L.skill[4]` must be the level-4 figure, not the fifth entry. no-sparse-arrays exists to catch
// an accidental double comma, which is the same syntax — so it is disabled here, at the one place
// the sparseness is the point, rather than repo-wide.
/* eslint-disable no-sparse-arrays */
const L = {
  rel:     [, 'Inferior', 'Inferior', 'Equal', 'Superior', 'Superior', 'Superior', 'Superior', 'Superior', 'Superior', 'Superior'],
  pr:      [, 1, 2, 3, 4, 4, 4, 4, 4, 4, 4],        // the LBB scale stops at 4
  skill:   [, 3, 4, 5, 6, 6, 7, 7, 8, 8, 9],
  attr:    [, -1, -1, 0, 0, 0, 1, 1, 1, 2, 2],     // added to the human-scale roll
  grade:   [, 'Standard', 'Standard', 'Standard', 'Alpha', 'Alpha', 'Alpha', 'Beta', 'Beta', 'Delta', 'Delta'],
  wired:   [, 0, 1, 1, 2, 2, 2, 2, 3, 3, 3],
  armEnh:  [, 1, 2, 2, 3, 3, 3, 3, 3, 3, 3],
  dermal:  [, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3],       // brawlers get +2 of this (max 3)
  karma:   [, 0, 1, 1, 3, 3, 4, 4, 5, 5, 6],
  apds:    lvl => lvl >= 4,
};
/* eslint-enable no-sparse-arrays */

const ARMOR_BY_LEVEL = lvl =>
    lvl <= 1 ? armor('Armor Vest', 2, 1)
  : lvl <= 3 ? armor('Lined Coat', 4, 2)
  : lvl <= 6 ? armor('Armor Jacket', 5, 3)
  : lvl <= 8 ? armor('Light Security Armor', 6, 4)
  :            armor('Heavy Security Armor', 7, 5);

/* eslint-disable-next-line no-sparse-arrays -- 1-indexed by threat level, like the L tables above */
const LEVEL_BLURB = [, 'Street muscle with a cheap arm. A troll should win.',
  'Gang lieutenant. A troll should still win.',
  'An even fight for a starting troll.',
  'Superior/4 — hard for one troll head-on; two is a death sentence.',
  'Veteran chrome. A troll needs help.',
  'Corporate special operations. Teams only.',
  'Beta-grade elite. Expect casualties.',
  'Prime-runner chrome. Plan for it or leave.',
  'Delta-grade black ops. Leave.',
  'HORRIFIC — cyberzombie or perfect sniper.'];

// ── Races ───────────────────────────────────────────────────────────────────

const RACES = {
  human: { mods: { body: 0, quickness: 0, strength: 0, charisma: 0, intelligence: 0, willpower: 0 },
           limit: { body: 6, quickness: 6, strength: 6, charisma: 6, intelligence: 6, willpower: 6 },
           armBase: 4 },
  ork:   { mods: { body: 3, quickness: 0, strength: 2, charisma: -1, intelligence: -1, willpower: 0 },
           limit: { body: 9, quickness: 6, strength: 8, charisma: 5, intelligence: 5, willpower: 6 },
           armBase: 6 },
  troll: { mods: { body: 5, quickness: -1, strength: 4, charisma: -2, intelligence: -2, willpower: 0 },
           limit: { body: 11, quickness: 5, strength: 10, charisma: 4, intelligence: 4, willpower: 6 },
           armBase: 8 },
};
const RACE_WEIGHTS = [['ork', 45], ['troll', 30], ['human', 25]];

// ── Archetypes ──────────────────────────────────────────────────────────────
//  build(ctx) → { cyber, weapons, armor, skills, equipMelee, blurb, tactics,
//                 [arms], [combatPoolMod], [notes], [cybermancy] }
//  ctx = { lvl, g (grade), sk (primary skill), race, raceKey, a (attributes) }

const ARCHETYPES = {

  // Closes to melee and stays there. Combat axe matches a troll's Reach 2.
  brawler: {
    label: 'Chrome Brawler',
    build: ({ lvl, g, sk, race, a }) => {
      // From level 8 a cybertorso lets the arms take enhancement past +3 (M&M p.28) —
      // otherwise natural Strength catches up with the limbs and they add nothing.
      const torso = lvl >= 8;
      const enh = torso ? 5 : null;
      const armCap = Math.min(2 * a.body, a.body + 4);
      return {
      armsOverride: torso ? { armStr: Math.min(armCap, race.armBase + enh), armCap } : null,
      cyber: [
        wired(Math.max(0, L.wired[lvl] - 1), g),
        reactionEnh(clamp(Math.ceil(lvl / 3), 1, 3), g),
        dermal(Math.min(3, L.dermal[lvl] + 2), g),
        cyberware('Spur, Retractable (CYB)', 0.3, g, { bookPage: 'sr3.302' }),
        ...(torso ? [
          cyberware('Obvious Cybertorso', 1.5, g, { bookPage: 'mm.28', system: { bonusBod: 1 } }),
          // Essence only — the arms item carries the Strength.
          cyberware(`Strength Enhancement [${enh}] w/Torso`, 0.4, g, { bookPage: 'mm.28' }),
        ] : []),
      ],
      weapons: [
        melee('Combat Axe', 'EDG', '(STR)S', 2, { bookPage: 'sr3.275', concealability: '2' }),
        melee('Spur, Retractable', 'CYB', '(STR)M', 0, { bookPage: 'sr3.302' }),
        firearm('Ares Predator', 'HPist', '9M', 'SA', '15(c)', 15,
          { bookPage: 'sr3.278', ammo: L.apds(lvl) ? 'apds' : 'regular' }),
      ],
      armor: ARMOR_BY_LEVEL(lvl),
      equipMelee: 'Combat Axe',
      skills: [
        skill('Edged Weapons',        sk,     'strength', 'Combat Axe'),
        skill('Cyber Implant Combat', sk,     'strength', 'Spurs'),
        skill('Unarmed Combat',       sk - 1, 'strength'),
        skill('Pistols',              sk - 2, 'quickness'),
        skill('Athletics',            sk - 1, 'body', null, 'Physical skills'),
      ],
      blurb: 'Walks straight through the door and into reach. Plated hide and a combat axe on the end of arms that do not get tired.',
      tactics: 'close fast, take the Reach election onto the troll, spend Combat Pool on offence.',
      };
    },
  },

  // Out-speeds and out-shoots. APDS halves the troll's Ballistic armour.
  gunner: {
    label: 'Razor Gunner',
    build: ({ lvl, g, sk }) => ({
      cyber: [
        wired(L.wired[lvl], g),
        cyberware('Smartlink', 0.5, g, { category: 'Headware', bookPage: 'sr3.302' }),
        dermal(L.dermal[lvl], g),
        cyberware('Hand Razor, Retractable (CYB)', 0.2, g, { bookPage: 'sr3.302' }),
      ],
      weapons: [
        lvl <= 3
          ? firearm('Uzi III', 'SMG', '6M', 'BF', '24(c)', 24,
              { bookPage: 'sr3.278', accessories: 'Smartlink' })
          : firearm('Heckler & Koch HK227', 'SMG', '7M', 'SA/BF/FA', '28(c)', 28,
              { bookPage: 'sr3.278', ammo: 'apds', accessories: 'Smartlink, gas vent 2', recoilMod: 2 }),
        firearm('Ares Predator', 'HPist', '9M', 'SA', '15(c)', 15,
          { bookPage: 'sr3.278', ammo: L.apds(lvl) ? 'apds' : 'regular', accessories: 'Smartlink' }),
        melee('Hand Razor, Retractable', 'CYB', '(STR)L', 0, { bookPage: 'sr3.302' }),
      ],
      armor: ARMOR_BY_LEVEL(lvl),
      equipMelee: 'Hand Razor, Retractable',
      skills: [
        skill('Submachine Guns',      sk,     'quickness', lvl <= 3 ? 'Uzi III' : 'HK227'),
        skill('Pistols',              sk,     'quickness', 'Ares Predator'),
        skill('Cyber Implant Combat', sk - 1, 'strength', 'Hand Razors'),
        skill('Unarmed Combat',       sk - 2, 'strength'),
        skill('Athletics',            sk - 2, 'body', null, 'Physical skills'),
      ],
      blurb: 'More passes than you. Keeps a distance, walks bursts of armour-piercing rounds, and only closes when you are already on the floor.',
      tactics: 'stay out of reach, spend passes shooting APDS, retreat from melee.',
    }),
  },

  // Company muscle: armed for both ranges.
  heavy: {
    label: 'Corp Enforcer',
    build: ({ lvl, g, sk }) => ({
      cyber: [
        wired(L.wired[lvl], g),
        dermal(L.dermal[lvl], g),
        cyberware('Hand Blade, Retractable (CYB)', 0.25, g, { bookPage: 'sr3.302' }),
      ],
      weapons: [
        melee('Katana', 'EDG', '(STR+3)M', 1, { bookPage: 'sr3.275', concealability: '3' }),
        melee('Hand Blade, Retractable', 'CYB', '(STR+3)L', 0, { bookPage: 'sr3.302' }),
        lvl <= 3
          ? firearm('AK-97 SMG/Carbine', 'SMG', '6M', 'SA/BF/FA', '30(c)', 30, { bookPage: 'sr3.278' })
          : firearm('FN HAR', 'AsRf', '8M', 'SA/BF/FA', '35(c)', 35,
              { bookPage: 'sr3.278', ammo: lvl >= 7 ? 'apds' : 'regular',
                accessories: 'Gas vent 2', recoilMod: 2 }),
      ],
      armor: ARMOR_BY_LEVEL(lvl),
      equipMelee: 'Katana',
      skills: [
        skill('Edged Weapons',        sk,     'strength', 'Katana'),
        lvl <= 3 ? skill('Submachine Guns', sk - 1, 'quickness')
                 : skill('Assault Rifles',  sk - 1, 'quickness'),
        skill('Cyber Implant Combat', sk - 1, 'strength', 'Hand Blades'),
        skill('Unarmed Combat',       sk - 1, 'strength'),
        skill('Athletics',            sk - 2, 'body', null, 'Physical skills'),
      ],
      blurb: 'Company muscle with company chrome. Opens with the rifle, finishes with the katana, and files a report afterwards.',
      tactics: 'rifle bursts on approach, katana once engaged; call for backup when hurt.',
    }),
  },

  // Tactical computer fed by cyber senses. Level 10 = all 8 senses = +4 Combat Pool.
  sniper: {
    label: 'Tac-Comp Sniper',
    minLevel: 6,
    build: ({ lvl, g, sk }) => {
      // Applicable senses: sight + hearing (touch/taste/smell rarely count, p.22)
      // + thermographic + low-light, + orientation system (counts as 2), + ultrasound
      // + olfactory boost. Rating = senses / 2, max 4.
      const tc = lvl >= 10 ? 4 : lvl >= 8 ? 3 : lvl >= 4 ? 2 : 1;
      const senses = ['sight', 'hearing', 'thermographic', 'low-light'];
      const eyes = [
        cyberware('Eyes, Cyber Replacement', 0.2, g, { category: 'Headware', bookPage: 'sr3.300' }),
        cyberware('Eyes, Thermographic', 0.2, g, { category: 'Headware', bookPage: 'sr3.300' }),
        cyberware('Eyes, Low-Light', 0.2, g, { category: 'Headware', bookPage: 'sr3.300' }),
      ];
      if (tc >= 3) {
        eyes.push(cyberware('Orientation System', 0.25, g, { category: 'Headware', bookPage: 'mm.17' }));
        senses.push('orientation (×2)');
      }
      if (tc >= 4) {
        eyes.push(cyberware('Eyes, Ultrasound', 0.5, g, { category: 'Headware', bookPage: 'mm.18' }),
                  cyberware('Olfactory Boost [2]', 0.2, g, { category: 'Headware', bookPage: 'mm.17',
                    system: { rating: 2 } }));
        senses.push('ultrasound', 'smell');
      }
      const top = lvl >= 10;
      return {
        combatPoolMod: tc,
        cyber: [
          // A sniper wins on Combat Pool, not initiative — one rating less until level 9,
          // or the tactical computer and its senses do not fit in 6 Essence.
          wired(lvl >= 9 ? 3 : Math.max(0, L.wired[lvl] - 1), g),
          cyberware('Tactical Computer', 1.5, g, { category: 'Headware', bookPage: 'mm.22',
            system: { rating: tc, description:
              `<p>Rating ${tc}: ${senses.join(', ')}. +${tc} Combat Pool (set as the actor's
              Combat Pool modifier), +${tc} Small Unit Tactics, ${25 * tc}% of Combat Pool usable
              for Surprise Tests (M&amp;M p.22).</p>` } }),
          cyberware('Smartlink II', 0.5, g, { category: 'Headware', bookPage: 'mm.31' }),
          cyberware('Range Finder (SmrtLnk)', 0.1, g, { category: 'Headware', bookPage: 'mm.32' }),
          ...eyes,
          dermal(L.dermal[lvl], g),
          cyberware('Hand Razor, Retractable (CYB)', 0.2, g, { bookPage: 'sr3.302' }),
        ],
        weapons: [
          top
            ? firearm('Barret Model 121', 'Snip', '14D', 'SA', '14(c)', 14,
                { bookPage: 'cc.21', ammo: 'apds', accessories: 'Smartlink II, imaging scope 3' })
            : firearm('Ranger Arms SM-3', 'Snip', '14S', 'SA', '6(m)', 6,
                { bookPage: 'sr3.278', ammo: L.apds(lvl) ? 'apds' : 'regular',
                  accessories: 'Smartlink II, imaging scope 3' }),
          firearm('Ares Predator', 'HPist', '9M', 'SA', '15(c)', 15,
            { bookPage: 'sr3.278', ammo: 'apds', accessories: 'Smartlink II' }),
          melee('Hand Razor, Retractable', 'CYB', '(STR)L', 0, { bookPage: 'sr3.302' }),
        ],
        armor: lvl >= 6 ? armor('Camo Full Suit (Urban)', 5, 3) : ARMOR_BY_LEVEL(lvl),
        equipMelee: 'Hand Razor, Retractable',
        skills: [
          skill('Rifles',               sk,     'quickness', top ? 'Barret 121' : 'Ranger Arms SM-3'),
          skill('Pistols',              sk - 1, 'quickness', 'Ares Predator'),
          skill('Stealth',              sk - 1, 'quickness', null, 'Physical skills'),
          skill('Small Unit Tactics',   Math.max(1, sk - 3), 'intelligence', null, 'Technical skills'),
          skill('Cyber Implant Combat', sk - 3, 'strength', 'Hand Razors'),
        ],
        blurb: 'You will not see this one. A tactical computer drinking from every sense it owns, a smartlinked anti-materiel rifle, and all the time in the world.',
        tactics: 'never engage in reach; fire from 500m+, relocate after two shots, hand-razor anyone who finds the nest.',
        notes: `<p><strong>Tactical computer ${tc}:</strong> +${tc} Combat Pool is on the actor's
          Combat Pool modifier — remove it if the GM rules a sense does not apply (e.g. sight in
          full darkness without the thermographic eyes).</p>`,
      };
    },
  },

  // Cybermancy. Move-by-Wire needs every point of Essence it can get, and more.
  zombie: {
    label: 'Cyberzombie',
    minLevel: 10,
    build: ({ lvl, g, race, raceKey, a }) => {
      const mbw = clamp(lvl - 6, 1, 4);
      // A cybertorso lets the limbs take Strength enhancement past +3 (M&M p.28).
      const enh = 6;
      const armCap = Math.min(2 * a.body, a.body + 4);
      const armStr = Math.min(armCap, race.armBase + enh);
      return {
        cybermancy: true,
        armsOverride: { armStr, armCap, enh },
        cyber: [
          moveByWire(mbw, g),
          cyberware('Pair Obvious Cyberlegs', 2, g, { bookPage: 'sr3.303', system: { bonusBod: 2 } }),
          cyberware('Obvious Cybertorso', 1.5, g, { bookPage: 'mm.28', system: { bonusBod: 1 } }),
          cyberware('Obvious Cyberskull', 0.75, g, { category: 'Headware', bookPage: 'mm.28' }),
          // Essence only — the arms item carries the Strength, so bonusStr stays 0 here.
          cyberware(`Strength Enhancement [${enh}] w/Torso`, 0.6, g, { bookPage: 'mm.28' }),
          cyberware('Spur, Retractable (CYB)', 0.3, g, { bookPage: 'sr3.302' }),
          cyberware('Invoked Memory Stim', 0.25, g, { category: 'Headware', bookPage: 'mm.21' }),
          cyberware('Autoinjector', 0.1, g, { bookPage: 'mm.25' }),
        ],
        weapons: [
          melee('Combat Axe', 'EDG', '(STR)S', 2, { bookPage: 'sr3.275', concealability: '2' }),
          melee('Spur, Retractable', 'CYB', '(STR)M', 0, { bookPage: 'sr3.302' }),
          firearm('Ares Predator', 'HPist', '9M', 'SA', '15(c)', 15,
            { bookPage: 'sr3.278', ammo: 'apds' }),
        ],
        armor: armor('Heavy Security Armor', 7, 5),
        equipMelee: 'Combat Axe',
        skills: [
          skill('Edged Weapons',        L.skill[lvl],     'strength', 'Combat Axe'),
          skill('Cyber Implant Combat', L.skill[lvl],     'strength', 'Spurs'),
          skill('Unarmed Combat',       L.skill[lvl] - 1, 'strength'),
          skill('Pistols',              L.skill[lvl] - 3, 'quickness'),
          skill('Athletics',            L.skill[lvl] - 2, 'body', null, 'Physical skills'),
        ],
        blurb: `More machine than ${raceKey}, kept alive by a delta clinic's ritual and a drug cocktail. It twitches at rest. It does not when it moves.`,
        tactics: 'straight line, no cover, no fear. Move-by-Wire forces extra actions at the end of the first (and second) Initiative Pass.',
        notes: `<p><strong>Move-by-Wire ${mbw}</strong> (M&amp;M p.30): +${mbw} QCK (not for Reaction),
          +${2 * mbw} REA, +${mbw}D6 Initiative, +${mbw} dice Athletics/Stealth.
          ${mbw >= 3 ? `Must take an extra action at the end of the first${mbw >= 4 ? ' and second' : ''}
          Initiative Pass of every Combat Turn (−10 Initiative after each — not automated).` : ''}
          Automatic Stress on QCK/REA and TLE-x risk (Willpower (${2 * mbw}) Test) — not automated.</p>
          <p><strong>Cyber replacements:</strong> arms, legs, torso, skull — too many for any
          armour/Body bonus from dermal plating or similar (M&amp;M p.33), so it has none.</p>`,
      };
    },
  },
};

// ── Names ───────────────────────────────────────────────────────────────────

const HANDLES = {
  default: ['Rebar', 'Piston', 'Clamp', 'Knuckles', 'Hydraulic', 'Anvil', 'Vise', 'Crowbar',
    'Torque', 'Girder', 'Lugnut', 'Scrap', 'Rivet', 'Chrome Jack', 'Deadlift', 'Wrecker',
    'Gearbox', 'Sledge', 'Bolt', 'Ironside'],
  sniper: ['Longshot', 'Deadeye', 'Crosshair', 'Farsight', 'Windage', 'Overwatch', 'Parallax', 'Zero'],
  zombie: ['Lazarus', 'Revenant', 'Stitch', 'Carrion', 'Husk', 'Wight', 'Specimen', 'Sutures'],
};
const FIRST = ['Marcus', 'Dana', 'Viktor', 'Imani', 'Rico', 'Tasha', 'Oleg', 'Keiko',
  'Dmitri', 'Luz', 'Tomas', 'Ngozi', 'Brandt', 'Yusuf', 'Sal'];
const LAST  = ['Kowalski', 'Okafor', 'Reyes', 'Varga', 'Tanaka', 'Mbeki', 'Novak',
  'Haldane', 'Ruiz', 'Petrov', 'Oyelaran', 'Brecht'];

// ── Builder ─────────────────────────────────────────────────────────────────

function buildThreat(archKey, raceKey, lvl) {
  const race = RACES[raceKey];
  const arch = ARCHETYPES[archKey];
  const g    = L.grade[lvl];

  // Human-scale roll + level, then the Racial Modifications Table, capped at the limit.
  const roll = { body: rand(5, 6), quickness: rand(5, 6), strength: rand(4, 5),
                 charisma: rand(1, 3), intelligence: rand(4, 5), willpower: rand(4, 6) };
  const a = {};
  for (const k of Object.keys(roll)) {
    const bump = k === 'charisma' ? 0 : L.attr[lvl];
    a[k] = clamp(roll[k] + bump + race.mods[k], 1, race.limit[k]);
  }

  // Humans get the extra skill point — they need it to keep up with a troll.
  const sk = clamp(L.skill[lvl] + (raceKey === 'human' ? 1 : rand(0, 1)), 1, 10);
  const kit = arch.build({ lvl, g, sk, race, raceKey, a });
  kit.cyber = kit.cyber.filter(Boolean);

  // Cyberarm Strength: race base + enhancement, within the Body cap (M&M p.33).
  const armCap = kit.armsOverride?.armCap ?? Math.min(2 * a.body, a.body + 4);
  const armStr = kit.armsOverride?.armStr
    ?? Math.min(armCap, race.armBase + clamp(L.armEnh[lvl] - (lvl >= 4 ? rand(0, 1) : 0), 0, 3));
  const strSurplus = Math.max(0, armStr - a.strength);

  const arms = cyberware('Pair Obvious Cyberarms', 2, g, {
    bookPage: 'sr3.303',
    system: {
      bonusBod: 1,             // pair of cyberarms · M&M p.33
      bonusStr: strSurplus,    // limb rating over natural Strength
      description: `<p><strong>Obvious</strong> chrome — no attempt to pass as flesh.</p>
        <p>Limb Strength <strong>${armStr}</strong> (${raceKey} base ${race.armBase} + enhancement).
        Natural Strength ${a.strength}; the +${strSurplus} is the limb's surplus, used whenever
        the arms are doing the work (M&amp;M p.33). Cap for this Body: ${armCap}.</p>`,
    },
  });

  // ── Essence budget. Only a cyberzombie may go below 0 (M&M p.54). ──────────
  // Give back dermal plating first, then Wired Reflexes, one rating at a time.
  let chrome = [arms, ...kit.cyber];
  const trimmed = [];
  const step = (key, make, label) => {
    const d = chrome.find(i => i[key]);
    if (!d) return false;
    const smaller = make(d[key] - 1, g);
    chrome = chrome.flatMap(i => i === d ? (smaller ? [smaller] : []) : [i]);
    trimmed.push(`${label} ${d[key]}→${d[key] - 1}`);
    return true;
  };
  if (!kit.cybermancy) {
    while (6 - essenceOf(chrome) < 0.1) {
      if (!step('_dermal', dermal, 'Dermal Plating') && !step('_wired', wired, 'Wired Reflexes')) break;
    }
  }
  chrome.forEach(i => { delete i._dermal; delete i._wired; });
  const essence = parseFloat((6 - essenceOf(chrome)).toFixed(2));

  // Cybermancy side effects · M&M p.56-58
  let willpower = a.willpower;
  let zombieNotes = '';
  // Essence 0 is already fatal without the ritual (M&M p.54), so 0 counts.
  if (kit.cybermancy && essence <= 0) {
    const neg = Math.abs(essence);
    const lost = Math.ceil(neg / 0.5);               // 1 per half point "or part thereof"
    const restored = Math.min(4, lost);              // the ritual restores up to 4
    willpower = Math.max(1, a.willpower - lost + restored);
    const survivalTN = neg <= 0.5 ? 4 : neg <= 1 ? 6 : neg <= 1.5 ? 8 : neg <= 2 ? 10
      : neg <= 2.5 ? 12 : neg <= 3 ? 14 : 16 + 2 * Math.ceil((neg - 3) / 0.25);
    zombieNotes = `<p><strong>CYBERMANCY — Essence ${essence.toFixed(2)}</strong> (the sheet
      floors Essence at 0; this is the real figure). M&amp;M p.54-58:</p>
      <ul>
        <li><strong>Magical resistance:</strong> +${Math.ceil(neg)} to the TN of every spell,
          critter power or metamagic against it — healing included, elemental manipulation excepted.</li>
        <li><strong>Physical overflow halved</strong> (round up). Each time overflow is healed or
          stabilised: Willpower (2 × overflow) Test or it dies.</li>
        <li><strong>Permanently dual-natured</strong>; perceives astrally only with Aura Reading.
          Cannot use magic.</li>
        <li>Willpower −${lost} for negative Essence, ${restored} restored by the ritual.</li>
        <li>Auto-injector cocktail: ${(3000 * neg).toLocaleString()}¥ per 10 days. Runs out → dies.</li>
        <li>Survived surgery at TN ${survivalTN}.</li>
      </ul>`;
  }

  const handle = pick(HANDLES[archKey] ?? HANDLES.default);
  const name = `"${handle}" ${pick(FIRST)} ${pick(LAST)}`;
  const essStd = chrome.reduce((s, i) => s + i.system.essenceCost, 0);

  const items = [
    ...kit.skills.filter(s => s.system.rating > 0),
    skill('Intimidation', clamp(L.skill[lvl] - 2 + rand(0, 1), 1, 8), 'charisma', null, 'Social skills'),
    ...chrome,
    ...kit.weapons,
    // Two cyberlimbs add +2 Power to unarmed attacks · M&M p.33
    melee('Cyberarm Strike', 'UNA', '(STR+2)M Stun', 0, { bookPage: 'mm.033' }),
    kit.armor,
  ];

  const arch_ = ARCHETYPES[archKey];
  return {
    actor: {
      name,
      type: 'character',
      img: 'icons/svg/mystery-man.svg',
      system: {
        metatype: raceKey,
        professionalRating: L.pr[lvl],
        karmaPool: L.karma[lvl],
        combatPoolMod: kit.combatPoolMod ?? 0,
        nuyen: rand(1, 6) * 250 * lvl,
        astralMode: kit.cybermancy && essence <= 0 ? 'dual' : '',
        attributes: {
          body:         { base: a.body,         value: a.body },
          quickness:    { base: a.quickness,    value: a.quickness },
          strength:     { base: a.strength,     value: a.strength },
          charisma:     { base: a.charisma,     value: a.charisma },
          intelligence: { base: a.intelligence, value: a.intelligence },
          willpower:    { base: willpower,      value: willpower },
          essence:      { base: 6, lost: null },   // null → derived from installed chrome
          magic:        { base: 0, value: 0 },
          reaction:     { override: false },       // derived from QCK + INT + implants
        },
        biography: `<p>${kit.blurb}</p>`,
        notes: `<p><strong>Threat level ${lvl}/10</strong> — ${LEVEL_BLURB[lvl]}</p>
          <p><strong>NPC/Professional Rating:</strong> ${L.rel[lvl]}/${L.pr[lvl]}${lvl > 4
            ? ' (level ' + lvl + ' is beyond the Little Black Book scale)' : ''} ·
            <strong>${arch_.label}</strong> (${raceKey}) · ${g}ware</p>
          <p><strong>Cyberarms:</strong> obvious pair, limb Strength ${armStr} (natural ${a.strength}).
          +1 Body and +2 unarmed Power from the pair (M&amp;M p.33).</p>
          <p><strong>Chrome:</strong> ${essStd.toFixed(2)} book Essence → ${(6 - essence).toFixed(2)}
          at ${g} grade → Essence <strong>${essence.toFixed(2)}</strong>.
          ${trimmed.length ? `Trimmed to fit: ${trimmed.join(', ')}.` : ''}</p>
          <p><strong>Tactics vs. a troll:</strong> ${kit.tactics}</p>
          ${kit.notes ?? ''}${zombieNotes}`,
      },
      prototypeToken: { name: handle, actorLink: false,
                        disposition: CONST.TOKEN_DISPOSITIONS.HOSTILE },
    },
    items,
    equipMelee: kit.equipMelee,
    armorName:  kit.armor.name,
  };
}

// ── Dialog ──────────────────────────────────────────────────────────────────

const archOpts = Object.entries(ARCHETYPES)
  .map(([k, v]) => `<option value="${k}">${v.label}${v.minLevel ? ` (level ${v.minLevel}+)` : ''}</option>`)
  .join('');
const raceOpts = Object.keys(RACES)
  .map(k => `<option value="${k}">${k[0].toUpperCase() + k.slice(1)}</option>`).join('');

let choice = null;
await foundry.applications.api.DialogV2.wait({
  window: { title: 'Generate Chrome Threat' },
  content: `
    <div style="display:grid;grid-template-columns:auto 1fr;gap:6px 10px;align-items:center">
      <label for="ct-level">Threat level</label>
      <input id="ct-level" type="number" min="1" max="10" value="4"/>
      <label for="ct-arch">Archetype</label>
      <select id="ct-arch"><option value="random">Random (for the level)</option>${archOpts}</select>
      <label for="ct-race">Metatype</label>
      <select id="ct-race"><option value="random">Random (ork / troll / human)</option>${raceOpts}</select>
      <label for="ct-count">How many</label>
      <input id="ct-count" type="number" min="1" max="6" value="1"/>
    </div>
    <p id="ct-blurb" style="font-size:0.85em;opacity:0.85;margin-top:8px">${LEVEL_BLURB[4]}</p>`,
  render: (_event, dialog) => {
    const html  = dialog.element;
    const input = html.querySelector('#ct-level');
    const blurb = html.querySelector('#ct-blurb');
    input?.addEventListener('input', () => {
      blurb.textContent = LEVEL_BLURB[clamp(parseInt(input.value) || 4, 1, 10)];
    });
  },
  buttons: [
    { label: 'Generate', action: 'go', default: true,
      callback: (_e, _b, dialog) => {
        const el = dialog.element;
        choice = {
          level: clamp(parseInt(el.querySelector('#ct-level').value) || 4, 1, 10),
          arch:  el.querySelector('#ct-arch').value,
          race:  el.querySelector('#ct-race').value,
          count: clamp(parseInt(el.querySelector('#ct-count').value) || 1, 1, 6),
        };
      } },
    { label: 'Cancel', action: 'cancel' },
  ],
});
if (!choice) return;

// ── Create ──────────────────────────────────────────────────────────────────

const FOLDER_NAME = 'Chrome Threats';
let folder = game.folders.find(f => f.type === 'Actor' && f.name === FOLDER_NAME);
if (!folder) folder = await Folder.create({ name: FOLDER_NAME, type: 'Actor', color: '#8a1c1c' });

function randomArchetype(lvl, raceKey) {
  // Level 10 is the horror tier: the cyberzombie or the perfect sniper.
  if (lvl >= 10) return pick(['zombie', 'sniper']);
  const pool = ['brawler', 'gunner', 'heavy'];
  if (lvl >= ARCHETYPES.sniper.minLevel) pool.push('sniper');
  // A human's arms cap at Strength 7 without a torso — a 7S axe barely scratches a
  // troll — so a RANDOM human is never a brawler. Pick Brawler explicitly to override.
  return pick(raceKey === 'human' ? pool.filter(k => k !== 'brawler') : pool);
}

const made = [];
for (let n = 0; n < choice.count; n++) {
  const raceKey = choice.race === 'random' ? pickW(RACE_WEIGHTS) : choice.race;
  const archKey = choice.arch === 'random' ? randomArchetype(choice.level, raceKey) : choice.arch;
  const t = buildThreat(archKey, raceKey, choice.level);
  try {
    const actor = await Actor.create({ ...t.actor, folder: folder.id }, { renderSheet: false });
    const created = await actor.createEmbeddedDocuments('Item', t.items);
    const armorItem = created.find(i => i.type === 'armor' && i.name === t.armorName);
    const meleeItem = created.find(i => i.type === 'melee' && i.name === t.equipMelee);
    await actor.update({
      'system.equippedArmor': armorItem?.id ?? '',
      'system.equippedMelee': meleeItem?.id ?? '',
    });
    made.push(actor);
  } catch (err) {
    console.error(`SR3E | Chrome Threat "${t.actor.name}" failed:`, err);
    ui.notifications.warn(`SR3E: failed to create "${t.actor.name}" — see console (F12).`);
  }
}

if (made.length) {
  ui.notifications.info(`SR3E: ${made.length} level-${choice.level} chrome threat(s) created in "${FOLDER_NAME}".`);
  made[0].sheet.render(true);
}
