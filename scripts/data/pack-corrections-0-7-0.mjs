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

/** A recoilMod fix: only the shipped 0 / blank becomes the book's RC. */
const RC = n => ({ path: 'system.recoilMod', from: ['', 0], to: n });

/** Item corrections: `{ type, name, gate?, fixes: [{ path, from, to }] }`, paths relative to the item. */
export const ITEM_CORRECTIONS = [
  /* ── Melee · SR3 p.275 ────────────────────────────────────────────────────────── */
  { type: 'melee', name: 'Sap', fixes: [{ path: 'system.damage', from: '(STR+1)M Stun', to: '(STR+2)M Stun' }] },
  { type: 'melee', name: 'Monofilament Whip', fixes: [{ path: 'system.reach', from: '1', to: '2' }] },
  { type: 'melee', name: 'Shock Glove', fixes: [
    { path: 'system.damage', from: '7S Stun', to: '(STR-1)M Stun' },
    { path: 'system.notes', from: '', to: 'SR3 p.275 prints the damage as "(STR - 1)M Stun +7S Stun": the glove\'s fist damage is (STR - 1)M Stun, plus an extra 7S Stun. The damage field holds only the first code (the roller parses one); the GM adds the +7S Stun by hand.' },
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
      const delta = applyFixes(actor, c);
      if (c.rename && actor.name === c.name) delta.name = c.rename;
      if (Object.keys(delta).length) return delta;
    }
    return null;
  }
}
