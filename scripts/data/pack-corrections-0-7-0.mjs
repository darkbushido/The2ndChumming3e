/**
 * Pack data corrections shipped in 0.7.0 — the migration half · rules check 0.7.0.
 *
 * ⚠ **Foundry embeds items, it doesn't link them**, so correcting a compendium entry changes nothing
 * for a copy already in a world. Each correction below is the pack fix's twin: it finds the OWNED copy
 * and brings it to the book's value.
 *
 * ⚠ **This is a corrective (overwriting) pass, and it argues for itself.** A field is changed ONLY
 * when it still holds exactly the value the old pack shipped — a value that was wrong against the book
 * (page cited per entry). A GM or player who has since typed their own number, or an item that never
 * came from the pack, no longer matches `from` and is left alone. A `gate` pins WHICH item it is where a
 * name is shared (the twelve Standard Bows are all "Standard Bow"). Idempotent: once corrected,
 * `from` no longer matches.
 *
 * Pure — no Foundry. `fixItem(item)` / `fixActor(actor)` return an update delta or null.
 */

const same = (a, b) => String(a ?? '') === String(b ?? '');
const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

const SHOCK_GLOVE_NOTES = "SR3 p.275 prints the damage as \"(STR - 1)M Stun +7S Stun\": the glove's fist damage is (STR - 1)M Stun (the Damage field) and the gloves deliver an extra +7S Stun (the Extra Damage field), which the melee result resists separately, with Impact armour at half (SR3 p.124). Eight discharges, then a 1-hour recharge (p.276) - not tracked.";

/** A recoilMod fix: only the shipped 0 / blank becomes the book's RC. */
const RC = n => ({ path: 'system.recoilMod', from: ['', 0], to: n });

/** A recoilModIntegral fill: the bracketed RC of the Firearms table (SR3 p.276), only where still blank. */
const RCI = n => ({ path: 'system.recoilModIntegral', from: ['', null], to: n });

/** Item corrections: `{ type, name, gate?, fixes: [{ path, from, to }] }`, paths relative to the item. */
export const ITEM_CORRECTIONS = [
  /* ── Melee · SR3 p.275 ────────────────────────────────────────────────────────── */
  { type: 'melee', name: 'Sap', fixes: [{ path: 'system.damage', from: '(STR+1)M Stun', to: '(STR+2)M Stun' }] },
  { type: 'melee', name: 'Monofilament Whip', fixes: [{ path: 'system.reach', from: '1', to: '2' }] },
  { type: 'melee', name: 'Shock Glove', fixes: [
    { path: 'system.damage', from: '7S Stun', to: '(STR-1)M Stun' },
    { path: 'system.notes', from: '', to: SHOCK_GLOVE_NOTES },
    // The second code, in its own field so the melee result posts a separate Resist button for it (SR3 p.275-276).
    { path: 'system.extraDamage', from: '', to: '7S Stun' },
  ] },
  // The Combat Axe sits under Pole Arms/Staffs in the book's melee table (maintainer's ruling 2026-10-18).
  { type: 'melee', name: 'Combat Axe', gate: { 'system.damage': '(STR)S' }, fixes: [
    { path: 'system.category', from: 'EDG', to: 'POL' },
    { path: 'system.skill', from: 'Edged Weapons', to: 'Pole Arms/Staff' },
  ] },
  { type: 'melee', name: 'Combat Axe Thrusting Point', fixes: [
    { path: 'system.category', from: 'other', to: 'POL' },
    { path: 'system.skill', from: 'Armed Combat', to: 'Pole Arms/Staff' },
    { path: 'system.concealability', from: '-', to: '12' },
    { path: 'system.reach', from: '-', to: '0' },
  ] },

  /* ── Remington Roomsweeper · SR3 p.277 ──────────────────────────────────────────────────────────
   * "The weapon uses heavy-pistol ranges, but shotgun rules." `system.shotgunRules` makes it follow them while the
   * category stays HPist (ranges, Pistols skill). Only the shipped false/blank is set; the pack's name, or the
   * book's own spelling on a hand-made copy still in the heavy-pistol category. */
  { type: 'firearm', name: 'Rmngton Roomsweeper ShG', gate: { 'system.bookPage': 'sr3.278' }, fixes: [{ path: 'system.shotgunRules', from: [false, ''], to: true }] },
  { type: 'firearm', name: 'Remington Roomsweeper', gate: { 'system.category': 'HPist' }, fixes: [{ path: 'system.shotgunRules', from: [false, ''], to: true }] },

  /* ── Bows and crossbows · SR3 p.276 ───────────────────────────────────────────── */
  // Standard Bow: damage (Str Min + 2)M, Concealability 2. The Str Min 3 bow shipped 4M…
  { type: 'projectile', name: 'Standard Bow', gate: { 'system.strMin': 3, 'system.cost': 300 },
    fixes: [{ path: 'system.damage', from: '4M', to: '5M' }] },
  // …and the Str Min 10 bow had Concealability and Strength Minimum swapped.
  { type: 'projectile', name: 'Standard Bow', gate: { 'system.damage': '12M', 'system.cost': 1000 }, fixes: [
    { path: 'system.concealability', from: '10', to: '2' },
    { path: 'system.strMin', from: 1, to: 10 },
  ] },
  { type: 'projectile', name: 'Heavy Crossbow', fixes: [{ path: 'system.damage', from: '8S', to: '6S' }] },

  /* ── Spell targets · SR3 p.193, p.197 ─────────────────────────────────────────── */
  { type: 'spell', name: 'Detect Magic', fixes: [{ path: 'system.target', from: '6(4)', to: 'DT' }] },
  { type: 'spell', name: 'Fling', fixes: [{ path: 'system.target', from: '4(RC)', to: 'See text' }] },

  /* ── Firing modes · the Firing Mode Table, SR3 p.117, wins over the Firearms table ── */
  { type: 'firearm', name: 'Defiance Super Shock', fixes: [{ path: 'system.mode', from: 'SA', to: 'SS' }] },
  { type: 'firearm', name: 'Ares Viper Slivergun', fixes: [{ path: 'system.mode', from: 'SA/BF', to: 'SA' }] },
  { type: 'firearm', name: 'AK-97 SMG/Carbine', fixes: [{ path: 'system.mode', from: 'SA/BF/FA', to: 'SA/BF' }] },
  { type: 'firearm', name: 'Heckler & Koch HK227', fixes: [{ path: 'system.mode', from: 'SA/BF/FA', to: 'SA/BF' }] },
  { type: 'firearm', name: 'Ingram Smartgun Mod. 20t', fixes: [{ path: 'system.mode', from: 'BF/FA', to: 'SA/BF' }] },
  { type: 'firearm', name: 'Uzi III', fixes: [{ path: 'system.mode', from: 'BF', to: 'SA/BF' }] },
  { type: 'firearm', name: 'Ingram Valiant', fixes: [{ path: 'system.mode', from: 'BF/FA', to: 'FA' }] },

  /* ── Firearm Recoil Compensation · the Firearms tables RC column, SR3 pp.278-279 ────────────────
   * `system.recoilMod` is the weapon's own RC, ADDED to the shooter's (SR3EItem.recoilTN totalComp); the
   * "(1RC)" text in `accessories` is never parsed, so it is not double counted. The figure stored is the one
   * outside the parentheses — a parenthesised figure "counts only when every integral accessory is in use"
   * and stays in the accessories text (HK227 2(3): stock Retr. Stock(1RC); RPK/Ultimax (6): the tripod).
   * Only a copy still at the shipped 0/blank is set, gated on the book page so a same-named non-core item
   * (a Cannon Companion or Fields of Fire rewrite) is left alone. */
  { type: 'firearm', name: 'Heckler & Koch HK227', gate: { 'system.bookPage': 'sr3.278' }, fixes: [RC(2)] },
  { type: 'firearm', name: 'Ingram Smartgun Mod. 20t', gate: { 'system.bookPage': 'sr3.278' }, fixes: [RC(2)] },
  { type: 'firearm', name: 'Ranger Arms SM-3', gate: { 'system.bookPage': 'sr3.278' }, fixes: [RC(2)] },
  { type: 'firearm', name: 'Ingram Valiant', gate: { 'system.bookPage': 'sr3.279' }, fixes: [RC(3)] },
  // FN HAR: RC 2 (the Rating 2 gas vent); rifle stocks give no RC (SR3 p.277: "Neither affect recoil").
  { type: 'firearm', name: 'FN HAR', gate: { 'system.bookPage': 'sr3.278' }, fixes: [
    RC(2),
    { path: 'system.accessories', from: 'Laser Sight, Gas Vent II(2RC), Fold Stock(1RC)', to: 'Laser Sight, Gas Vent II(2RC)' },
  ] },
  /* The bracketed RC: "full recoil compensation that only applies when all integral accessories are used" (SR3 p.276),
   * the Firearms table pp.278-279. A new field, so a copy owned before it holds blank (fill blanks, never overwrite). */
  { type: 'firearm', name: 'AK-97 SMG/Carbine', gate: { 'system.bookPage': 'sr3.278' }, fixes: [RCI(1)] },
  { type: 'firearm', name: 'Ceska Black Scorpion', gate: { 'system.bookPage': 'sr3.278' }, fixes: [RCI(1)] },
  { type: 'firearm', name: 'Fichetti Security 500a', gate: { 'system.bookPage': 'sr3.278' }, fixes: [RCI(1)] },
  { type: 'firearm', name: 'Heckler & Koch HK227', gate: { 'system.bookPage': 'sr3.278' }, fixes: [RCI(3)] },
  { type: 'firearm', name: 'Heckler & Koch HK227-S', gate: { 'system.bookPage': 'sr3.278' }, fixes: [RCI(1)] },
  { type: 'firearm', name: 'Ingram Smartgun Mod. 20t', gate: { 'system.bookPage': 'sr3.278' }, fixes: [RCI(3)] },
  { type: 'firearm', name: 'Uzi III', gate: { 'system.bookPage': 'sr3.278' }, fixes: [RCI(1)] },
  { type: 'firearm', name: 'Ultimax MMG', gate: { 'system.bookPage': 'sr3.279' }, fixes: [RCI(6)] },
  { type: 'firearm', name: 'RPK HMG', gate: { 'system.bookPage': 'sr3.279' }, fixes: [RCI(6)] },
  // Ultimax MMG: RC (6) with its tripod (SR3 p.279) — recorded in the accessories text, like the RPK HMG.
  { type: 'firearm', name: 'Ultimax MMG', gate: { 'system.bookPage': 'sr3.279' }, fixes: [
    { path: 'system.accessories', from: 'None', to: 'Tripod(6RC)' },
  ] },
];

/** The DocWagon Paramedic's medkit · MJLBB p.65 "medkit 5" — see `docwagonMedkit`. */
export const DOCWAGON_MEDKIT = {
  name: 'Medkit [Rating 5]', rating: '5', weight: '5', cost: 280, availability: '4/24hrs', bookPage: 'mm.138',
};

/** Vehicle / drone actor corrections: `{ name, fixes: [{ path, from, to }] }`, paths relative to the actor. */
export const ACTOR_CORRECTIONS = [
  /* ── Vehicles · SR3 pp.309-311 ────────────────────────────────────────────────── */
  { name: 'Hughes WK-2', fixes: [
    { path: 'system.attributes.cargo.value', from: 70, to: 72 },
    { path: 'system.attributes.cargo.base', from: 70, to: 72 },
  ] },
  { name: 'Northrup Wasp PRC-42B', fixes: [
    { path: 'system.attributes.load.value', from: 72, to: 68 },
    { path: 'system.attributes.load.base', from: 72, to: 68 },
  ] },
  // Both G12A variants print one Availability, 3/72 hrs (SR3 p.311); the pack said 4/96 hrs.
  { name: 'Chrysler-Nissan G12A(cargo)', fixes: [{ path: 'system.availability', from: '4/96 hrs', to: '3/72 hrs' }] },
  { name: 'Chrysler-Nissan G12A(passenger)', fixes: [{ path: 'system.availability', from: '4/96 hrs', to: '3/72 hrs' }] },
  /* ── Drones · SR3 p.312 ───────────────────────────────────────────────────────── */
  { name: 'Generic Surv. Drone VTOL', fixes: [
    { path: 'system.cost', from: 6250, to: 8125 },
    { path: 'system.streetIndex', from: 0.75, to: 1 },
  ] },
  // The misspelt duplicate becomes the book's Dalmatian (the pack's sr3e-drone-0043). The actor is renamed
  // and corrected, never deleted — a world's drone stays on its scene.
  { name: 'Cyberspace Designs Dalmation', rename: 'Cyberspace Designs Dalmatian', fixes: [
    { path: 'system.cost', from: 15800, to: 16000 },
    { path: 'system.streetIndex', from: 0.75, to: 1 },
    { path: 'system.attributes.speed.value', from: 108, to: 105 },
    { path: 'system.attributes.speed.base', from: 108, to: 105 },
    { path: 'system.attributes.sig.value', from: 5, to: 6 },
    { path: 'system.attributes.sig.base', from: 5, to: 6 },
  ] },
];

/* ── Aircraft stall speed · SR3 p.132, Rigger 3 Revised ───────────────────────────────────────────
 * "Fixed-wing aircraft have two Speed Ratings. The higher number is its maximum safe speed; the lower represents the
 * aircraft's stall speed." The packs stored the LOWER number in `speed` (the book's "135/340" row became speed 135, the
 * maximum surviving only in the notes as "Alt-mode Speed/Accel: 135(340)/22"). Each row is [name, stall, max, bookPage?]:
 * `speed` becomes the maximum and the new `stallSpeed` field the lower. Same rule as every correction here: a field is
 * changed only while it still holds the shipped value — a GM-edited Speed is left as typed, and `stallSpeed` only fills a
 * blank. `bookPage` pins a name the pack gave a single letter or a truncated word ("A", "P", "Lockheed"). The vehicle
 * types read from the book rows: fixed-wing aircraft (including the thunderbird LAVs and the suborbitals), the
 * fixed-wing/STOL UAVs. Boats, ships, submarines and the Nizhinyi BMV-2 (no readable book page) are NOT here. */
export const AIRCRAFT_STALL = [
  ['Aztech Liebre RPV', 60, 1620],
  ['CAS Wandjina RPV', 60, 500],
  ['FMC-Stonebrooke TADS Firebird', 40, 105],
  ['GM-Nissan Spotter', 40, 200],
  ['GTE-Ford Retrans Unit', 40, 105],
  ['P', 40, 105, 'r3.176'],
  ['A', 200, 1000, 'r3.192'],
  ['Airbus A1570 HSCT', 125, 3000],
  ['Artemis Nightglider', 10, 60],
  ['Aztech Halcon GAA', 150, 1800],
  ['Aztech Lobo Medium Scout LAV', 250, 850],
  ['Bac-Dessault-MBB EFA Variants', 150, 2000],
  ['CASA J-239 Raven', 135, 400],
  ['Embraer-Dassault Mistral', 135, 300],
  ['F-B China Clipper Suborbital', 150, 1250],
  ['Fiat-Fokker Cloud Nine', 60, 200],
  ['GD SV250 Semiballistic', 200, 1500],
  ['GMC Harpy Scout LAV', 250, 850],
  ['Hawker-Ridley HS-895 Skytruck', 135, 320],
  ['Ilyushin IL-159 Suborbital', 150, 750],
  ['Lear-Cessna Platinum I', 135, 330],
  ['Lear-Cessna Platinum II', 135, 800],
  ['Lockheed C-260 Transport', 150, 600],
  ['Lockheed', 125, 2500, 'r3.178'],
  ['Moonlight Aerospace Avenger', 40, 200],
  ['MCT Indrahar O-5P Surv. Drone', 60, 300],
  ['Cessna C750(Cargo)', 135, 340],
  ['Cessna C750(Passenger)', 135, 340],
  ['GMC Banshee', 250, 1000],
];

ACTOR_CORRECTIONS.push(...AIRCRAFT_STALL.map(([name, stall, max, bookPage]) => ({
  name,
  ...(bookPage ? { gate: { 'system.bookPage': bookPage } } : {}),
  fixes: [
    { path: 'system.attributes.speed.value', from: stall, to: max },
    { path: 'system.attributes.speed.base',  from: stall, to: max },
    { path: 'system.stallSpeed', from: [0, ''], to: stall },
  ],
})));

const gateOk = (doc, gate) => Object.entries(gate ?? {}).every(([p, v]) => same(get(doc, p), v));

function applyFixes(doc, c) {
  const delta = {};
  for (const f of c.fixes) {
    if ([].concat(f.from).some(v => same(get(doc, f.path), v))) delta[f.path] = f.to;
  }
  return delta;
}

export class PackFixes070 {
  /** Is this embedded Medkit the DocWagon Paramedic contact's shipped Rating 3 core medkit? */
  static isDocwagonMedkit(item) {
    const actor = item?.parent;
    const isParamedic = actor?.name === 'DocWagon Paramedic'
      || String(actor?._stats?.compendiumSource ?? '').endsWith('evde7uJkZD9DBlpe');
    const s = item?.system ?? {};
    return item?.type === 'medical' && item?.name === 'Medkit' && isParamedic
      && same(s.rating, '3') && same(s.cost, 200) && same(s.bookPage, 'sr3.304');
  }

  /** Update delta for one item, or null. Only a field still holding the old shipped value changes. */
  static fixItem(item) {
    if (PackFixes070.isDocwagonMedkit(item)) {
      const d = DOCWAGON_MEDKIT;
      return { name: d.name, 'system.rating': d.rating, 'system.weight': d.weight, 'system.cost': d.cost,
        'system.availability': d.availability, 'system.bookPage': d.bookPage };
    }
    // Every matching entry contributes: one weapon can owe a firing-mode fix AND a Recoil Compensation fix.
    const delta = {};
    for (const c of ITEM_CORRECTIONS) {
      if (c.type !== item?.type || c.name !== item?.name || !gateOk(item, c.gate)) continue;
      Object.assign(delta, applyFixes(item, c));
    }
    return Object.keys(delta).length ? delta : null;
  }

  /** Update delta for a vehicle/drone actor, or null. */
  static fixActor(actor) {
    if (actor?.type !== 'vehicle') return null;
    for (const c of ACTOR_CORRECTIONS) {
      if (c.name !== actor.name && !(c.alt ?? []).includes(actor.name)) continue;
      if (!gateOk(actor, c.gate)) continue;
      const delta = applyFixes(actor, c);
      if (c.rename && actor.name === c.name) delta.name = c.rename;
      if (Object.keys(delta).length) return delta;
    }
    return null;
  }
}
