/**
 * The Vehicle Designer's chassis cards — each chassis' drawing and a one-line summary · TODO 297
 *
 * The maintainer, 2026-11-08: "special vehicle icons suck, a barge is not a 6 wheeled truck"; "each bike should look very
 * different because they are"; "also check the chasis descriptions". Ruled: a drawing per kind of vehicle — chassis that
 * are only larger versions of one another (the caterpillars, the hovercraft, the merchantmen…) share one, drawn bigger for
 * the bigger Body (`scale`). The summaries are OUR words from R3R's chassis descriptions (printed pp.104-109), never
 * book text.
 *
 * `TOWED` — the chassis that take no power plant: R3R p.109, a trailer "does not take a power plant"; a barge is "the
 * waterborne version of a trailer", towed behind a boat; rail cars are "non-powered", pulled by a locomotive.
 * Pure — no Foundry.
 */

/** id → [art id, one-liner]. */
export const CHASSIS_INFO = {
  // Bikes (p.104)
  'atv':             ['atv', 'Three or four fat wheels: easy off-road, slower and worse on the street.'],
  'chopper':         ['chopper', 'A heavy, long, low motorcycle built for long-distance cruising.'],
  'offroad-bike':    ['dirt-bike', 'A dirt bike: better off-road Handling, at the expense of on-road.'],
  'racing-cycle':    ['racing-bike', 'A sport bike built to reach and hold high speeds.'],
  'scooter':         ['scooter', 'A cheap city commuter — modest performance, low price.'],
  // Boats (p.104)
  'skiff':           ['skiff', 'A small open boat under 6 m.'],
  'water-scooter':   ['water-scooter', 'A jet ski — the motorcycle of the water.'],
  'speedboat':       ['speedboat', 'A 7-10 m high-speed boat, from cigarette racers to day-trippers.'],
  'sport-cruiser':   ['cruiser-boat', 'A 10-20 m pleasure boat with a cabin.'],
  'yacht':           ['yacht', 'A 20-40 m luxury boat; comes with basic living amenities.'],
  // Cars (pp.104-105)
  'apc-tracked':     ['apc-tracked', 'A tracked armoured troop carrier, 15-30 tonnes; no tank.'],
  'apc-wheeled':     ['apc-wheeled', 'A wheeled armoured troop carrier, 15-30 tonnes.'],
  'caterpillar-heavy':     ['caterpillar', 'Heavy tracked civilian base — bulldozers to cranes.'],
  'caterpillar-light':     ['caterpillar', 'Light tracked civilian base for construction vehicles.'],
  'caterpillar-medium':    ['caterpillar', 'Medium tracked civilian base for construction vehicles.'],
  'caterpillar-miniature': ['caterpillar', 'A small tracked work vehicle.'],
  'industrial-mover-heavy':  ['forklift', 'A heavy indoor lifter — forklifts, cherry-pickers, cleaners.'],
  'industrial-mover-light':  ['forklift', 'A light indoor lifter: strong, slow, low emissions.'],
  'industrial-mover-medium': ['forklift', 'An indoor lifter: strong, slow, low emissions.'],
  'limousine':       ['limo', 'A stretched luxury car with room for passengers and extras.'],
  'rv':              ['rv', 'A 1¼-2½ tonne motorhome for long trips; living amenities included.'],
  'sand-buggy':      ['sand-buggy', 'An open tube-frame off-roader for up to four.'],
  'sedan':           ['sedan', 'A four-seat mid-size car, family to luxury.'],
  'sports-car':      ['sports-car', 'A two-seater built for very high speed.'],
  'suv':             ['suv', 'Pickups, 4WDs and jeeps under 1¼ tonnes.'],
  'subcompact':      ['subcompact', 'A small, cheap city car — one or two seats, little cargo.'],
  'tractor':         ['semi-tractor', 'A semi cab: no cargo of its own, pulls trailers of up to 18 tonnes.'],
  'transport-medium': ['box-truck', 'A 2½-5 tonne freight truck.'],
  'transport-heavy': ['box-truck', 'A 5-10 tonne heavy freight truck.'],
  'van':             ['van', 'A 1¼-2½ tonne van.'],
  // Fixed-wing (p.105)
  'airliner':        ['airliner', 'A multi-engine passenger jet for long-haul routes.'],
  'hsct':            ['hsct', 'A hypersonic transport that crosses oceans in hours.'],
  'jet-fighter':     ['jet-fighter', 'A supersonic combat jet: light armour, heavy ordnance.'],
  'single-engine':   ['single-engine', 'A small multi-passenger plane with one engine.'],
  'twin-engine':     ['twin-engine', 'A middleweight commuter plane.'],
  'ultralight':      ['ultralight', 'A very small single-pilot aircraft.'],
  // Hovercraft (p.105)
  'hovercraft-light':  ['hovercraft', 'An SUV-sized air-cushion craft for land and water.'],
  'hovercraft-medium': ['hovercraft', 'A van-sized air-cushion craft for passengers, cargo or patrol.'],
  'hovercraft-heavy':  ['hovercraft', 'A transport-sized air-cushion craft; marines use it for assaults.'],
  // Rotor craft (p.106)
  'attack-helicopter':  ['attack-heli', 'A one- or two-seat gunship, lightly armoured.'],
  'autogyro':           ['autogyro', 'A one-seat ultralight rotorcraft — versatile but frail.'],
  'cargo-helicopter':   ['cargo-heli', 'A big helicopter for heavy loads.'],
  'utility-helicopter': ['utility-heli', 'A medium multipurpose helicopter.'],
  'tilt-wing-heavy':    ['tilt-wing', 'A heavy plane whose wings tilt for vertical take-off.'],
  'tilt-wing-medium':   ['tilt-wing', 'A plane whose wings tilt for vertical take-off.'],
  // Ships (pp.106-107)
  'aircraft-carrier-heavy':  ['carrier', 'A 75-100 thousand tonne carrier for many aircraft.'],
  'aircraft-carrier-light':  ['carrier', 'A 10-25 thousand tonne carrier for helicopters and special missions.'],
  'aircraft-carrier-medium': ['carrier', 'A 40-50 thousand tonne multi-role carrier.'],
  'corvette':        ['corvette', 'A small fast warship for coastal waters.'],
  'cruiser':         ['cruiser-ship', 'A medium general-purpose warship.'],
  'destroyer':       ['destroyer', 'A light warship specialised in one kind of naval combat.'],
  'freighter':       ['freighter', 'A giant ocean-going cargo ship or tanker.'],
  'frigate':         ['frigate', 'A light escort and anti-submarine warship.'],
  'harbor-tug':      ['tug', 'A heavy utility boat that pushes and pulls barges around a harbour.'],
  'merchantman-heavy':  ['merchantman', 'A general commercial hull, up to 125 m.'],
  'merchantman-light':  ['merchantman', 'A light general commercial hull.'],
  'merchantman-medium': ['merchantman', 'A mid-size general commercial hull.'],
  'patrol-craft':    ['patrol-boat', 'A coastal patrol vessel, often lightly armed.'],
  'trawler':         ['trawler', 'A small ship: fishing boat, ferry — or spy ship.'],
  // Vectored thrust (p.108)
  'thunderbird':     ['thunderbird', 'A low-altitude jet-lift gunship on stubby wings — a T-bird.'],
  'jump-jet-fighter': ['jump-jet', 'A jet fighter with lift vents for vertical take-off and hover.'],
  // Special (p.109)
  'barge':           ['barge', 'An unpowered cargo hull towed behind a boat — the water\'s trailer.'],
  'locomotive-bullet':    ['loco-bullet', 'A high-speed train engine (bullet trains, maglev).'],
  'locomotive-bulk':      ['loco-bulk', 'A slow, enormously strong freight engine.'],
  'locomotive-express':   ['loco-express', 'A moderately fast passenger engine.'],
  'locomotive-non-rail':  ['loco-nonrail', 'A locomotive that leaves the rails — a road train.'],
  'locomotive-streetcar': ['streetcar', 'A city tram or subway car; all its CF is People Space.'],
  'locomotive-switcher':  ['loco-switcher', 'A small yard engine that shuffles cars.'],
  'rail-car-freight':        ['railcar-freight', 'An unpowered freight car pulled by a locomotive.'],
  'rail-car-long-passenger': ['railcar-passenger', 'An unpowered long passenger car.'],
  'rail-car-short-passenger': ['railcar-passenger', 'An unpowered short passenger car.'],
  'semiballistic':   ['semiballistic', 'A passenger rocket that arcs out of the atmosphere; rocket plant only.'],
  'suborbital':      ['suborbital', 'A rocket-boosted spaceplane that can\'t reach orbit alone.'],
  'trailer-heavy-axle': ['trailer-axle', 'An unpowered heavy utility trailer.'],
  'trailer-light-axle': ['trailer-axle', 'An unpowered light utility trailer.'],
  'trailer-20ft':    ['trailer-box', 'An unpowered 20-foot box trailer.'],
  'trailer-40ft':    ['trailer-box', 'An unpowered 40-foot box trailer.'],
  'trailer-53ft':    ['trailer-box', 'An unpowered 53-foot box trailer.'],
  'zeppelin':        ['zeppelin', 'A rigid helium airship — huge, but easy to bring down.'],
  // Submarines (pp.107-108)
  'attack-submarine':  ['attack-sub', 'A middleweight war sub for sub-surface, surface and air targets.'],
  'bathyscaph':        ['bathyscaph', 'A deep-diving research sub.'],
  'boomer':            ['boomer', 'The biggest war sub: slow, stealthy, carries missiles.'],
  'commercial-sub-heavy':  ['commercial-sub', 'A heavy passenger and cargo sub.'],
  'commercial-sub-light':  ['commercial-sub', 'A light passenger and cargo sub.'],
  'commercial-sub-medium': ['commercial-sub', 'A passenger and cargo sub.'],
  'minisub-heavy':     ['minisub', 'A heavy minisub: shuttles to underwater stations.'],
  'minisub-light':     ['minisub', 'A one- or two-person minisub for pleasure or espionage.'],
  'minisub-medium':    ['minisub', 'A half-dozen-person minisub for underwater work.'],
  'patrol-submarine':  ['patrol-sub', 'A small, non-nuclear sub that patrols one sea.'],
  // Drones
  'crawler-micro':          ['crawler-wheeled', 'A palm-sized ground drone.'],
  'crawler-medium-tracked': ['crawler-tracked', 'A motorcycle-sized tracked ground drone.'],
  'crawler-medium-wheeled': ['crawler-wheeled', 'A motorcycle-sized wheeled ground drone.'],
  'crawler-small':          ['crawler-tracked', 'A toaster-to-dog-sized ground drone, tracks or wheels.'],
  'uav-fixed-large':  ['uav-fixed', 'A troll-sized drone plane; some can carry a person.'],
  'uav-fixed-medium': ['uav-fixed', 'A person-sized drone plane.'],
  'uav-fixed-small':  ['uav-fixed', 'A model-plane-sized drone.'],
  'skimmer-medium':   ['skimmer', 'A drone hovercraft, medium crawler size.'],
  'skimmer-small':    ['skimmer', 'A small drone hovercraft.'],
  'tilt-wing-uav-medium': ['tilt-wing', 'A drone tilt-wing plane.'],
  'tilt-wing-uav-large':  ['tilt-wing', 'A large drone tilt-wing plane.'],
  'rotor-uav-medium': ['rotor-uav', 'A drone helicopter.'],
  'rotor-uav-micro':  ['rotor-uav', 'A palm-sized drone rotorcraft (or wing-flapping "hummingbird").'],
  'rotor-uav-small':  ['rotor-uav', 'A small drone helicopter.'],
  'vt-uav-medium':    ['vt-uav', 'A drone T-bird or jump-jet.'],
  'vt-uav-large':     ['vt-uav', 'A large drone T-bird or jump-jet.'],
  'anthroform-medium': ['anthroform', 'A human-shaped walker drone for hazardous work.'],
  'anthroform-large':  ['anthroform', 'A large human-shaped walker drone.'],
  'mini-blimp':        ['mini-blimp', 'A miniature blimp that can hover for surveillance indefinitely.'],
  'walker-xl':         ['walker', 'A sedan-sized legged drone.'],
  'walker-large':      ['walker', 'A subcompact-sized legged drone.'],
  'walker-medium':     ['walker', 'A legged drone, medium crawler size.'],
  'walker-micro':      ['walker', 'A palm-sized legged drone.'],
  'walker-small':      ['walker', 'A small legged drone.'],
  'sea-sled-large':    ['sea-sled', 'A drone sub for surveying; divers can ride it.'],
  'sea-sled-medium':   ['sea-sled', 'A drone sub for surveying; divers can ride it.'],
  'sea-sled-small':    ['sea-sled', 'A small drone sub for surveying.'],
};

/** The chassis that take no power plant (R3R p.109): they are towed or pulled. */
export const TOWED = new Set(['barge', 'rail-car-freight', 'rail-car-long-passenger', 'rail-car-short-passenger',
  'trailer-heavy-axle', 'trailer-light-axle', 'trailer-20ft', 'trailer-40ft', 'trailer-53ft']);

export const ChassisCatalog = {
  /**
   * Can this chassis pull trailers? Ground vehicles and boats (the maintainer, 2026-11-09): bikes, cars and trucks,
   * hovercraft, boats and ships, and locomotives (which pull rail cars). Not aircraft, subs, drones' walkers, or a towed
   * chassis itself.
   */
  canTow(ch) {
    if (!ch || TOWED.has(ch.id)) return false;
    return ['bike', 'car', 'hover', 'boat', 'ship'].includes(ch.category) || /^locomotive-/.test(ch.id);
  },

  /** The card for a chassis: { art, blurb, towed }. */
  card(id) {
    const [art, blurb] = CHASSIS_INFO[id] ?? [null, ''];
    return { art, blurb, towed: TOWED.has(id) };
  },

  /**
   * How big to draw a chassis within its art family: 1 for the family's biggest Body, down to 0.6 for its smallest — so a
   * heavy caterpillar is drawn bigger than a miniature one. `chassis` is the whole table.
   */
  scale(id, chassis) {
    const art = CHASSIS_INFO[id]?.[0];
    const bodyOf = c => parseInt(String(c.body), 10) || 0;
    const fam = chassis.filter(c => CHASSIS_INFO[c.id]?.[0] === art);
    const me = chassis.find(c => c.id === id);
    if (!me || fam.length < 2) return 1;
    const lo = Math.min(...fam.map(bodyOf));
    const hi = Math.max(...fam.map(bodyOf));
    return hi === lo ? 1 : Math.round((0.6 + 0.4 * (bodyOf(me) - lo) / (hi - lo)) * 100) / 100;
  },
};
