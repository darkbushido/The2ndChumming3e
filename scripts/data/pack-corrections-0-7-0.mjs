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
    if (same(get(doc, f.path), f.from)) delta[f.path] = f.to;
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
    for (const c of ITEM_CORRECTIONS) {
      if (c.type !== item?.type || c.name !== item?.name || !gateOk(item, c.gate)) continue;
      const delta = applyFixes(item, c);
      if (Object.keys(delta).length) return delta;
    }
    return null;
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
