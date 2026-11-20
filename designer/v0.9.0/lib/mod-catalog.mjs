/**
 * The Vehicle Designer's mod shop — each vehicle mod's shelf, a one-line summary and whether it fits · TODO 297
 *
 * The maintainer, 2026-11-08: "The mods should be more of a visual shopping situation that has icons for the different
 * thing as well as descriptions of what they do"; ruled: category tabs with icons, our own one-liners ("Write our own
 * one-liners"), and a mod that does not fit the chassis hidden behind a "show all" switch, its reason shown in amber
 * ("Hide, with a 'show all' switch") — warn, never refuse.
 *
 * The summaries are OUR words — what the mod does at the table — never rulebook text; each cites its printed page through
 * the pack entry's `bookPage`. Keyed by the mod's name without the " (Vehicle)" tag (`keyOf`). Pure — no Foundry.
 *
 * `fit(ctx)` → a reason string when the book restricts the mod away from this design, else null. `ctx`:
 * { category (chassis category), drone, body, plant (plant code), hasHull }.
 */

/** The shop's shelves, in tab order: id → label. The icon for each is `DesignerArt.modIcon(id)`. */
export const SHELVES = {
  engine:      'Engine & power',
  control:     'Control & piloting',
  armor:       'Armour & protection',
  stealth:     'Signature & stealth',
  weapons:     'Weapon mounts',
  electronics: 'Electronics & sensors',
  cabin:       'Crew & cabin',
  special:     'Special equipment',
};

const GROUND = ['car', 'bike'];
const WATER = ['boat', 'ship', 'sub'];
const AIR = ['fixedwing', 'rotor', 'vectored'];
const COMBUSTION = ['G', 'D', 'M', 'J', 'JET'];

const only = (cats, what) => c => (cats.includes(c.category) ? null : `For ${what} only`);
const notBike = what => c => (c.category === 'bike' ? `Not for motorcycles${what ? ` (${what})` : ''}` : null);
const plants = (codes, what) => c => (!c.plant || codes.includes(c.plant) ? null : `Needs ${what}`);
const both = (...fs) => c => fs.map(f => f(c)).find(Boolean) ?? null;
/**
 * An electric drive anywhere on the design: an electric main plant, a Hybrid Engine (a battery engine with the combustion
 * one, R3R p.117) or an Auxiliary Engine on an electric plant. SunCell is "compatible with electric-engine driven vehicles"
 * (R3R p.126); the maintainer, 2026-11-09: "Hybrid or electric aux" count. `c.electric` is set by the designer.
 */
const electricDrive = c => (!c.plant || ['E', 'EC'].includes(c.plant) || c.electric ? null
  : 'Needs an electric drive — an electric plant, a Hybrid Engine or an electric Auxiliary Engine');

/** name (without " (Vehicle)") → { shelf, blurb, fit? }. */
export const MODS = {
  // Engine & power — R3R p.126
  'GridLink(TM) Power':        { shelf: 'engine', blurb: 'Draws power from GridLink road coils while driving on equipped streets.', fit: only(GROUND, 'ground vehicles') },
  'SunCell Power':             { shelf: 'engine', blurb: 'Roof solar cells that recharge an electric vehicle in daylight.', fit: both(notBike(), electricDrive) },
  'Nitrous Oxide Injectors':   { shelf: 'engine', blurb: 'Short boosts: extra dice to accelerate, or a burst to 2½× Speed. 20 charges.', fit: plants(['G', 'D'], 'a gasoline or diesel plant') },
  'Turbocharging/Superconductive Drive': { shelf: 'engine', blurb: 'Each level: Speed +15, Acceleration +1, Signature −1, Economy −5%.',
    fit: c => (AIR.includes(c.category) && c.plant !== 'E' && c.plant !== 'EC' ? 'Aircraft engines are already turbocharged (electric excepted)' : null) },

  // Control & piloting — pp.127-130
  'Adjusted Controls(Dwarf)':  { shelf: 'control', blurb: 'Controls sized for dwarfs; others drive it at +3.' },
  'Adjusted Controls(Troll)':  { shelf: 'control', blurb: 'Controls sized for trolls; others drive it at +3.' },
  'Adjusted Controls(Other)':  { shelf: 'control', blurb: 'Controls adapted for a driver who cannot use the standard ones.' },
  'Advanced Drone Pilot':      { shelf: 'control', blurb: 'Raises the Pilot rating above 1 — smarter, more independent drones.' },
  'Autonavigation System':     { shelf: 'control', blurb: 'Collision avoidance and self-driving; adds dice to Driving Tests out of combat.' },
  'Cont. Manu. Contr.':        { shelf: 'control', blurb: 'Backup systems: ignore damage modifiers for as many boxes as the rating.' },
  'Datajack Port':             { shelf: 'control', blurb: 'Jack in and drive by virtual dashboard (Reaction +1 without a rig).', fit: c => (c.category === 'bike' ? 'Motorcycles take the motorcycle datajack port' : null) },
  'Datajack Port(Motorcycles)': { shelf: 'control', blurb: 'The datajack port, built into a motorcycle.', fit: only(['bike'], 'motorcycles') },
  'Bike Gyro-Stabilization Gear': { shelf: 'control', blurb: 'Self-balancing gyros so a bike can be autonav-driven or remote-controlled.', fit: only(['bike'], 'motorcycles') },
  'Drive-by-Wire System':      { shelf: 'control', blurb: 'Computer steering: Handling −1 a level (up to 3), plus a one-time 10% boost.' },
  'Improved Control Surfaces': { shelf: 'control', blurb: 'Better rudders and fins: Handling −1 an increment, at most −2.', fit: only(WATER, 'watercraft') },
  'Improved Suspension':       { shelf: 'control', blurb: 'On-road Handling −1 a level, at most −2 (bikes: on- and off-road).', fit: only(GROUND, 'wheeled ground vehicles') },
  'Off-Road Suspension':       { shelf: 'control', blurb: 'Off-road Handling −1 a level and on-road +1; Speed −15, less Economy.', fit: only(GROUND, 'wheeled ground vehicles') },
  'Rem-Contr. Intr. Bod':      { shelf: 'control', blurb: 'Lets a rigger drive it over a remote-control network (Pilot 1). Drones have it built in.',
    fit: c => (c.drone ? 'A drone already has remote control' : null) },
  'Rigger Adaptation':         { shelf: 'control', blurb: 'Full rigger interface (datajack included): Control Pool and the rig\'s full bonuses.' },

  // Armour & protection — pp.131-133
  'Ablative Armor':            { shelf: 'armor', blurb: 'Blow-off plates: Armor +2 a level up to Body; not hardened, wears down under heavy hits.',
    fit: c => (AIR.includes(c.category) ? 'Not for aircraft' : null) },
  'APPS':                      { shelf: 'armor', blurb: 'Belts, airbags and bracing: crash damage Power halved. Priced per seat.', fit: notBike() },
  'Vehicle Armor':             { shelf: 'armor', blurb: 'Hardened plating: Armor +1 a level; every 6 points makes Handling 1 worse.',
    fit: c => (c.body === 0 ? 'A Body 0 vehicle cannot carry armour' : null) },
  'Concealed Armor':           { shelf: 'armor', blurb: 'Armour hidden inside — costs cargo space and needs a Perception Test to spot.',
    fit: c => (c.body === 0 ? 'A Body 0 vehicle cannot carry armour' : null) },
  'Crash Cages':               { shelf: 'armor', blurb: 'Padded, cushioned cabin: +6 dice for everyone\'s crash Damage Resistance.', fit: notBike() },
  'Roll Bars':                 { shelf: 'armor', blurb: 'Crash protection (+3 dice, or no rag-top penalty); needed for some roof mounts.' },
  'Smart Armor System':        { shelf: 'armor', blurb: 'Explosive cells that can stage an incoming hit down a level. Military grade.',
    fit: c => (c.body < 4 ? 'Needs Body 4 or more' : null) },

  // Signature & stealth — pp.134-135
  'Active Thermal Masking':    { shelf: 'stealth', blurb: 'Coolant that hides engine heat for a while: Signature +1 a level, at a Speed cost.',
    fit: both(notBike(), plants(COMBUSTION, 'a combustion engine')) },
  'Noisemaker Dispenser':      { shelf: 'stealth', blurb: 'Drops bubble canisters: +3 to detect or target the boat for three turns.', fit: only(WATER, 'boats, ships and submarines') },
  'Radar-Absorbent Materials': { shelf: 'stealth', blurb: 'Radar-eating coatings: Signature +1 a level, at most +3. Military grade.' },
  'Thermal Baffles':           { shelf: 'stealth', blurb: 'Heat-blocking panels: Signature +1 a level, at most +2; heavy.', fit: plants(COMBUSTION, 'a combustion engine') },
  'Photovoltaic Chameleon Paint': { shelf: 'stealth', blurb: 'Colour-shifting paint that blends the vehicle into its surroundings.' },

  // Weapon mounts — pp.135-141
  'External Hardpoint':        { shelf: 'weapons', blurb: 'A visible fixed mount for a heavy or vehicle weapon (2 of the Body\'s mount points).' },
  'External Firmpoint':        { shelf: 'weapons', blurb: 'A visible fixed mount for an LMG or small arm (1 mount point).' },
  'Internal Hardpoint':        { shelf: 'weapons', blurb: 'A hidden, armoured heavy-weapon mount that extends to fire.' },
  'Internal Firmpoint':        { shelf: 'weapons', blurb: 'A hidden, armoured light-weapon mount that extends to fire.' },
  'Pintle Mount':              { shelf: 'weapons', blurb: 'A simple swivel for a hand-fired gun: wide arc, 2 points of recoil compensation.' },
  'Ring Mount':                { shelf: 'weapons', blurb: 'A rotating roof ring the gunner stands in: full circle of fire.' },
  'Ring Mount(Door Mount)':    { shelf: 'weapons', blurb: 'A ring-style mount set in a door or hatch.' },
  'Gunnery Recoil Adjuster':   { shelf: 'weapons', blurb: 'Micro-actuators on a fixed mount or turret: −1 recoil a level.' },
  'Launch Control System(Medium)': { shelf: 'weapons', blurb: 'Fires one more rocket or missile per pass (uses a firmpoint).' },
  'Launch Control System(Heavy)':  { shelf: 'weapons', blurb: 'Fires one more anti-ship rocket or missile per pass (uses a hardpoint).' },
  'External Missile Mount':    { shelf: 'weapons', blurb: 'Roof rack or wing pylon for rockets and missiles; up to Body of them.' },
  'Internal Missile Mount':    { shelf: 'weapons', blurb: 'An armoured missile bay: opens to fire, hidden otherwise.' },
  'Smartlink-I':               { shelf: 'weapons', blurb: 'Connects a mounted smartgun to a smartlinked gunner.' },
  'Smartlink-II':              { shelf: 'weapons', blurb: 'The improved smartlink link for a mounted smartgun.' },
  'Mini-Turret':               { shelf: 'weapons', blurb: 'A small crewed turret for light weapons.' },
  'Small Turret':              { shelf: 'weapons', blurb: 'A crewed turret for one heavier weapon.' },
  'Medium Turret':             { shelf: 'weapons', blurb: 'A crewed turret for heavy or twin weapons.' },
  'Large Turret':              { shelf: 'weapons', blurb: 'A light-tank-class turret (four hardpoints).' },
  'Extra-larget Turret':       { shelf: 'weapons', blurb: 'The biggest turret, for warships and heavy armour.' },
  'Extra-large Turret':        { shelf: 'weapons', blurb: 'The biggest turret, for warships and heavy armour.' },   // the anti-air pack entry spells it right
  'Remote Micro Turret':       { shelf: 'weapons', blurb: 'A tiny weapons-only turret fired from inside by sensors.' },
  'Remote Mini Turret':        { shelf: 'weapons', blurb: 'A weapons-only turret fired from inside by sensors.' },
  'Remote Small Turret':       { shelf: 'weapons', blurb: 'A weapons-only turret for one heavier weapon, fired remotely.' },
  'Remote Medium Turret':      { shelf: 'weapons', blurb: 'A weapons-only turret for heavy or twin weapons, fired remotely.' },
  'Remote Large Turret':       { shelf: 'weapons', blurb: 'A large weapons-only turret, fired remotely.' },
  'Remote Ex-Large Turret':    { shelf: 'weapons', blurb: 'The biggest weapons-only turret, fired remotely.' },
  'Assault Cannon Cust. Kit':  { shelf: 'weapons', blurb: 'Converts an assault cannon to sit in a fixed mount or turret.' },
  'Grenade Launcher Cust.Kit': { shelf: 'weapons', blurb: 'Converts a grenade launcher to sit in a fixed mount or turret.' },
  'HMG Customization Kit':     { shelf: 'weapons', blurb: 'Converts a heavy machine gun to sit in a fixed mount or turret.' },
  'MMG Customization Kit':     { shelf: 'weapons', blurb: 'Converts a medium machine gun to sit in a fixed mount or turret.' },
  'LMG Customization Kit':     { shelf: 'weapons', blurb: 'Converts a light machine gun to sit in a fixed mount or turret.' },
  'Pistol Customization Kit':  { shelf: 'weapons', blurb: 'Converts a pistol to sit in a fixed mount or turret.' },
  'Rifle Customization Kit':   { shelf: 'weapons', blurb: 'Converts a rifle to sit in a fixed mount or turret.' },
  'Shotgun Customization Kit': { shelf: 'weapons', blurb: 'Converts a shotgun to sit in a fixed mount or turret.' },
  'Submachinegun Cust. Kit':   { shelf: 'weapons', blurb: 'Converts an SMG to sit in a fixed mount or turret.' },

  // Electronics & sensors — pp.142-148
  'Autosoft Interpretation':   { shelf: 'electronics', blurb: '"Skillwires" for drones: lets the pilot run autosofts.' },
  'BattleTac FDDM Receiver':   { shelf: 'electronics', blurb: 'Receives BattleTac fire-direction data for indirect fire.' },
  'BattleTac IVIS Receiver':   { shelf: 'electronics', blurb: 'Receives BattleTac IVIS: shared tactical picture for the crew.' },
  'ECM':                       { shelf: 'electronics', blurb: 'Jammers, chaff and flares that confuse enemy sensors.' },
  'ECCM':                      { shelf: 'electronics', blurb: 'Counters enemy jamming of your sensors and links.' },
  'ED':                        { shelf: 'electronics', blurb: 'Electronic deception: feeds enemy sensors false range and position.' },
  'ECD':                       { shelf: 'electronics', blurb: 'Reality-checks your sensors against deception (ED).' },
  'Electronics Port':          { shelf: 'electronics', blurb: 'Space and power for gear like radios, cameras or a remote-control deck.' },
  'Power Amplifier':           { shelf: 'electronics', blurb: 'Raises the Flux of sensors, ECM, ECCM and transmitters.' },
  'Remote-Control Encryption': { shelf: 'electronics', blurb: 'Encrypts the remote-control link against interception.' },
  'Retransmission Unit':       { shelf: 'electronics', blurb: 'Relays a rigger\'s signal on to other drones.' },
  'Sensors':                   { shelf: 'electronics', blurb: 'A sensor suite (video, thermal, radar…) — the Sensor rating.' },
  'Enhanced Sensors':          { shelf: 'electronics', blurb: 'An upgraded sensor package.' },
  'Medium-Range Infared':      { shelf: 'electronics', blurb: 'An infrared spotlight for thermal-vision crews.' },
  'White-Light':               { shelf: 'electronics', blurb: 'A powerful visible-light spotlight.' },
  'Library Transponder Chip':  { shelf: 'electronics', blurb: 'A swappable set of transponder IDs for the vehicle.' },

  // Crew & cabin — pp.150-155
  'Bench Seat':                { shelf: 'cabin', blurb: 'Seating for several passengers.' },
  'Bucket Seat':               { shelf: 'cabin', blurb: 'A single supportive seat.' },
  'Folding Bench Seat':        { shelf: 'cabin', blurb: 'A bench that folds away for cargo.' },
  'Ejection Seat(Standard)':   { shelf: 'cabin', blurb: 'Throws the occupant clear in an emergency.' },
  'Ejection Seat(Reinforced)': { shelf: 'cabin', blurb: 'A tougher ejection seat with better protection.' },
  'Small Sidecar':             { shelf: 'cabin', blurb: 'A sidecar for one: more CF, Handling +1.', fit: only(['bike'], 'motorcycles') },
  'Medium Sidecar':            { shelf: 'cabin', blurb: 'A bigger sidecar: more CF, Handling +1, room for a hardpoint.', fit: only(['bike'], 'motorcycles') },
  'Large Sidecar':             { shelf: 'cabin', blurb: 'The largest sidecar: most CF, Handling +2.', fit: only(['bike'], 'motorcycles') },
  'Valkyrie Module':           { shelf: 'cabin', blurb: 'A trauma-care bay that keeps a patient alive in transit.' },

  // Special equipment
  'Amphibious Package':        { shelf: 'special', blurb: 'Lets a ground vehicle swim; levels 1-3 trade CF for water Speed and Handling.', fit: only(GROUND, 'ground vehicles') },
  'Anti-Theft System':         { shelf: 'special', blurb: 'Better maglocks and alarms on doors and controls.' },
  'Electric Shock System':     { shelf: 'special', blurb: 'Shocks anyone who tampers with the vehicle.' },
  'Proximity Alert':           { shelf: 'special', blurb: 'Warns when someone comes near the parked vehicle.' },
  'Morphing License Plate':    { shelf: 'special', blurb: 'A plate that changes its number on command.' },
  'Artic':                     { shelf: 'special', blurb: 'Cold-weather package for arctic operation.' },
  'Ski-Skids':                 { shelf: 'special', blurb: 'Skis or skids to run over snow and ice.' },
  'Lure Ammo AM-56':           { shelf: 'special', blurb: 'Lure rounds for the AM-56 launcher.' },
  'VAUBAN Missile A.T.':       { shelf: 'special', blurb: 'VAUBAN anti-missile defence.' },
  'VAUBAN Vehicle A.T.':       { shelf: 'special', blurb: 'VAUBAN active vehicle defence.' },
};

/** A pack name → the catalogue's key: " (Vehicle)" off, and a turret's "(Anti-Air)" / "(Pop-Up)" variant to its base. */
export function keyOf(name) {
  const base = String(name ?? '').replace(/\s*\(Vehicle\)\s*$/, '').trim();
  if (MODS[base]) return base;
  const stem = base.replace(/\((Anti-Air|Pop-Up)\)$/, '').trim();
  return MODS[stem] ? stem : base;
}

/**
 * What a vehicle can carry more than one of (the maintainer, 2026-11-08: "Mounts, turrets, seats, kits stack") — weapon
 * mounts and turrets, seats, weapon customization kits, electronics ports, spotlights, sidecars' cousins the launch
 * controls and dispensers. Everything else is once per vehicle: a second turbocharger is a higher level, not a second mod.
 */
const STACKS = /(Turret|Firmpoint|Hardpoint|Missile Mount|Pintle Mount|Ring Mount|Seat|Cust(omization|\.) ?Kit|Electronics Port|White-Light|Infared|Infrared|Launch Control|Dispenser|APPS)/i;

/**
 * The books' maximum level for a rated mod with no level list to read it from (R3R "Max Rating/Improvement"): Nitrous 6
 * (p.126), CMCs 9 (p.128), Drive-by-Wire −3 Handling and the suspensions and control surfaces −2 (p.129), RAM +3 Signature
 * (p.134), Thermal Baffles and Active Thermal Masking +2 Signature (pp.134-135).
 */
export const MAX_LEVEL = {
  'Nitrous Oxide Injectors': 6, 'Cont. Manu. Contr.': 9, 'Drive-by-Wire System': 3, 'Improved Suspension': 2,
  'Off-Road Suspension': 2, 'Improved Control Surfaces': 2, 'Radar-Absorbent Materials': 3, 'Thermal Baffles': 2,
  'Active Thermal Masking': 2,
};

/**
 * Aftermarket mods with no design figures at all — bought and fitted afterwards, not designed in (the maintainer,
 * 2026-11-08: "0 points, neutral note"). They price at 0 points with a note, not a ⚠.
 */
// Ablative Armor: R3R p.131 says it is not available as a design option — it goes on after the build.
export const AFTERMARKET = new Set(['Morphing License Plate', 'Library Transponder Chip', 'Ablative Armor']);

/** The packs' shortened mod names written out (the maintainer, 2026-11-09: "any time you're shortening a name, mousing over
 * should expose the full name"). Keys are the name without "(Vehicle)". */
export const FULL_NAMES = {
  'Rem-Contr. Intr. Bod':     'Remote-Control Interface Body',
  'Cont. Manu. Contr.':       'Contingency Manual Controls',
  'Assault Cannon Cust. Kit': 'Assault Cannon Customization Kit',
  'Submachinegun Cust. Kit':  'Submachinegun Customization Kit',
  'VAUBAN Missile A.T.':      'VAUBAN Missile Anti-Theft',
  'VAUBAN Vehicle A.T.':      'VAUBAN Vehicle Anti-Theft',
};

export const ModCatalog = {
  /** A mod's name without "(Vehicle)", and its full form for a mouse-over: `{ short, full }`. */
  names(name) {
    const short = String(name ?? '').replace(/\s*\(Vehicle\)$/, '');
    return { short, full: FULL_NAMES[short] ?? short };
  },

  /** Does the design carry an electric drive besides its main plant? `options` are its option rows; `plantOf(id)` → plant code. */
  electricExtra(options = [], plantOf = () => null) {
    return options.some(o => o?.id === 'hybrid' || (o?.id === 'aux-engine' && ['E', 'EC'].includes(plantOf(o.auxPlant))));
  },

  SHELVES,
  MODS,
  keyOf,

  /**
   * Is the cart's mod the same pack mod as this card's? By its exact name (the "(Vehicle)" suffix, spacing and case
   * aside) — NOT `keyOf`, which folds the Pop-Up and Anti-Air variants into their base for the blurb. The maintainer,
   * 2026-11-09: adding a Mini-Turret(Pop-Up) highlighted the other mini-turrets as added.
   */
  sameMod(a, b) {
    const n = x => String(x ?? '').replace(/\s*\(Vehicle\)\s*$/, '').replace(/\s+/g, ' ').trim().toLowerCase();
    return n(a) === n(b);
  },

  /** The shop card for a pack mod: { shelf, blurb, variant } — an unknown mod goes on Special with no blurb. */
  card(name) {
    const key = keyOf(name);
    const m = MODS[key];
    const variant = /\((Anti-Air|Pop-Up)\)/.exec(String(name ?? ''))?.[1] ?? null;
    const extra = variant === 'Anti-Air' ? ' Anti-air: elevates to engage aircraft.' : variant === 'Pop-Up' ? ' Pop-up: stows out of sight when not firing.' : '';
    return { shelf: m?.shelf ?? 'special', blurb: m ? m.blurb + extra : '', variant };
  },

  /** Whether a vehicle can carry more than one of this mod (else a second copy is a level, not a mod). */
  stacks(name) { return STACKS.test(String(name ?? '')); },

  /** Whether the mod has levels (its pack entry carries a rating) — only those get a Level box. */
  rated(mod) { return mod?.system?.rating != null; },

  /**
   * The highest level a rated mod can take, or null when the book sets none: the books' printed maximum (`MAX_LEVEL`), else
   * the highest level its design figures list ("Rating 1: …, 4: …"), else the end of its last closed band ("Per level 1-3:
   * …, 7-9: …"). "10+" is open-ended.
   */
  maxLevel(mod) {
    if (!this.rated(mod)) return null;
    const book = MAX_LEVEL[keyOf(mod.name)];
    if (book) return book;
    const text = `${mod.system?.designCost ?? ''} ${mod.system?.designCf ?? ''}`;
    if (/\d+\+/.test(text)) return null;
    const listed = [...text.matchAll(/(\d+)\s*:/g)].map(m => Number(m[1]));
    const bands = [...text.matchAll(/\d+\s*-\s*(\d+)\s*:/g)].map(m => Number(m[1]));
    const all = [...listed, ...bands];
    return all.length ? Math.max(...all) : null;
  },

  /** An aftermarket mod with no design figures (0 points, a note — not a warning). */
  aftermarket(name) { return AFTERMARKET.has(keyOf(name)); },

  /** Why this mod does not fit the design (a string), or null — warn, never refuse. */
  misfit(name, ctx = {}) {
    return MODS[keyOf(name)]?.fit?.(ctx) ?? null;
  },
};
