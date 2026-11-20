/**
 * Simple line art for the Vehicle Designer's cards — one silhouette per chassis type and per power plant, one icon per mod
 * shelf · TODO 297. The maintainer, 2026-11-08: "Simple drawn silhouettes" — original inline SVG, no image files, drawn in
 * `currentColor` so the system's theme colours them. Pure strings; no Foundry.
 */

const svg = (body, vb = '0 0 120 60') =>
  `<svg class="vd-art" viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
const wheel = (x, y, r = 8) => `<circle cx="${x}" cy="${y}" r="${r}"/>`;

/** Chassis category → its silhouette body (viewBox 120×60). */
const CHASSIS = {
  car: `<path d="M8 40 L14 28 L36 26 L48 14 L80 14 L94 26 L110 30 L112 40 Z"/>${wheel(30, 42)}${wheel(90, 42)}<path d="M52 18 L52 26 M50 26 L92 26"/>`,
  bike: `${wheel(24, 40, 12)}${wheel(96, 40, 12)}<path d="M24 40 L48 22 L74 22 L96 40 M48 22 L60 40 L74 22 M70 14 L80 14 L74 22"/>`,
  boat: `<path d="M6 32 L114 32 L100 48 L18 48 Z M40 32 L46 18 L78 18 L84 32"/><path d="M4 54 Q14 50 24 54 T44 54 T64 54 T84 54 T104 54" stroke-width="2"/>`,
  ship: `<path d="M4 34 L116 34 L104 50 L14 50 Z M24 34 L24 22 L56 22 L56 34 M60 34 L60 26 L92 26 L92 34 M38 22 L38 10 M38 10 L46 10"/>`,
  sub: `<path d="M10 34 Q10 22 30 22 L94 22 Q112 22 112 34 Q112 46 94 46 L30 46 Q10 46 10 34 Z M48 22 L52 10 L68 10 L70 22 M112 34 L118 26 M112 34 L118 42"/>`,
  hover: `<path d="M8 40 Q8 32 20 32 L100 32 Q112 32 112 40 Q112 48 100 48 L20 48 Q8 48 8 40 Z M28 32 L36 18 L80 18 L88 32"/><circle cx="96" cy="22" r="8"/><path d="M90 16 L102 28 M102 16 L90 28" stroke-width="2"/>`,
  rotor: `<path d="M20 34 Q20 22 40 22 L64 22 Q74 22 76 30 L110 30 L112 24 M76 36 L40 40 Q20 40 20 34 Z M44 22 L44 14 M10 14 L84 14 M36 44 L28 52 M56 44 L64 52 M24 52 L70 52"/>`,
  fixedwing: `<path d="M8 32 L100 28 Q116 30 112 34 L8 36 Z M44 30 L60 8 L70 8 L62 30 M48 34 L62 54 L70 54 L64 34 M12 32 L6 18 L14 18 L22 31"/>`,
  vectored: `<path d="M10 32 Q14 24 34 24 L86 24 Q106 24 110 32 Q106 40 86 40 L34 40 Q14 40 10 32 Z"/><circle cx="28" cy="32" r="10"/><circle cx="92" cy="32" r="10"/><path d="M28 42 L28 52 M92 42 L92 52" stroke-width="2"/>`,
  // Special vehicles: a locomotive on its rail (trailers, barges and airships have their own drawings on the cards).
  special: `<path d="M4 42 L4 18 L92 18 Q112 20 114 42 Z M92 18 L92 30 L110 30 M16 26 L80 26"/><path d="M2 48 L118 48" stroke-width="2"/>${wheel(20, 46, 4)}${wheel(40, 46, 4)}${wheel(80, 46, 4)}${wheel(100, 46, 4)}`,
};

/** Art id (`chassis-catalog.mjs`) → its drawing (viewBox 120×60). Shared by chassis that are only bigger versions of one another. */
const W = (x, y, r = 8) => `<circle cx="${x}" cy="${y}" r="${r}"/>`;
const SEA = '<path d="M2 56 Q12 52 22 56 T42 56 T62 56 T82 56 T102 56 T122 56" stroke-width="2"/>';
const RAIL = '<path d="M2 48 L118 48" stroke-width="2"/>';
const TRACK = (x1, x2, y = 44) => `<path d="M${x1} ${y - 6} L${x2} ${y - 6} Q${x2 + 8} ${y - 6} ${x2 + 8} ${y} Q${x2 + 8} ${y + 6} ${x2} ${y + 6} L${x1} ${y + 6} Q${x1 - 8} ${y + 6} ${x1 - 8} ${y} Q${x1 - 8} ${y - 6} ${x1} ${y - 6} Z"/>${W(x1, y, 3)}${W((x1 + x2) / 2, y, 3)}${W(x2, y, 3)}`;
const ART = {
  // Bikes — each its own shape.
  'racing-bike': `${W(22, 44, 11)}${W(98, 44, 11)}<path d="M22 44 L44 30 L82 26 L98 44 M40 30 Q56 16 80 20 L90 28 M64 22 L56 14 L46 16"/>`,
  'chopper': `${W(16, 44, 10)}${W(104, 44, 13)}<path d="M16 44 L46 36 L74 38 L104 44 M16 44 L34 14 M28 12 L40 16 M50 36 Q58 26 70 30 L74 38 M80 38 L90 30"/>`,
  'dirt-bike': `${W(24, 42, 13)}${W(96, 42, 13)}<path d="M24 42 L50 24 L70 24 L96 42 M46 24 L38 10 L32 10 M60 24 L66 14 L84 16 M70 24 L76 34"/><path d="M14 38 L12 34 M104 36 L108 32" stroke-width="2"/>`,
  'scooter': `${W(22, 46, 7)}${W(96, 46, 7)}<path d="M22 46 L30 34 L60 34 Q62 46 74 46 L96 46 M36 34 L36 26 L56 26 L58 34 M84 46 L80 14 L74 12 M76 14 L90 14"/>`,
  'atv': `${W(22, 42, 11)}${W(98, 42, 11)}<path d="M10 30 L36 30 L44 22 L76 22 L84 30 L110 30 M44 22 L50 30 L70 30 L76 22 M60 22 L62 12 L54 10 L72 10"/>`,
  // Boats and ships.
  'skiff': `<path d="M20 36 L100 36 L92 46 L30 46 Z M30 36 L24 26"/>${SEA}`,
  'water-scooter': `<path d="M22 40 L98 38 Q104 44 94 48 L30 48 Z M54 38 L60 24 L72 24 M52 38 Q46 30 52 28"/>${SEA}`,
  'speedboat': `<path d="M6 38 L114 34 L100 48 L18 48 Z M52 36 L62 24 L84 24 L88 35"/>${SEA}`,
  'cruiser-boat': `<path d="M6 36 L114 36 L100 50 L16 50 Z M34 36 L38 24 L82 24 L88 36 M48 24 L52 16 L70 16 L72 24"/>${SEA}`,
  'yacht': `<path d="M4 36 L116 34 L102 50 L14 50 Z M24 35 L28 26 L92 26 L96 34 M36 26 L40 18 L80 18 L82 26 M52 18 L54 10 L68 10"/>${SEA}`,
  'corvette': `<path d="M4 38 L116 36 L104 50 L14 50 Z M40 37 L40 28 L70 28 L70 37 M52 28 L52 16 M84 37 L88 32 L100 32"/>${SEA}`,
  'cruiser-ship': `<path d="M4 38 L116 36 L106 50 L12 50 Z M14 38 L18 32 L30 32 M38 37 L38 26 L76 26 L76 37 M50 26 L50 14 M62 26 L62 18 M88 37 L92 32 L106 32"/>${SEA}`,
  'destroyer': `<path d="M4 38 L116 34 L104 48 L14 48 Z M44 37 L44 26 L66 26 L66 36 M56 26 L56 12 M18 38 L22 34 L32 34 M84 35 L88 30 L100 30"/>${SEA}`,
  'frigate': `<path d="M6 38 L114 36 L104 48 L16 48 Z M34 37 L34 24 L74 24 L74 37 M52 24 L52 12 M84 36 L94 32"/>${SEA}`,
  'carrier': `<path d="M2 32 L118 32 L118 36 L2 36 Z M10 36 L110 36 L100 50 L20 50 Z M78 32 L78 18 L92 18 L92 32 M84 18 L84 10"/>${SEA}`,
  'freighter': `<path d="M2 36 L118 36 L108 50 L10 50 Z M14 36 L14 26 L30 26 L30 36 M34 36 L34 26 L50 26 L50 36 M54 36 L54 26 L70 26 L70 36 M84 36 L84 16 L104 16 L104 36"/>${SEA}`,
  'merchantman': `<path d="M4 36 L116 36 L104 50 L14 50 Z M20 36 L20 28 L56 28 L56 36 M76 36 L76 20 L98 20 L98 36 M86 20 L86 12"/>${SEA}`,
  'tug': `<path d="M14 36 L106 36 L98 50 L22 50 Z M14 40 Q8 40 10 46 M30 36 L30 22 L60 22 L60 36 M44 22 L44 10 L52 10"/><circle cx="102" cy="42" r="4"/>${SEA}`,
  'patrol-boat': `<path d="M6 38 L114 36 L100 48 L18 48 Z M44 37 L48 26 L80 26 L84 36 M62 26 L62 16 M22 38 L26 32 L36 32"/>${SEA}`,
  'trawler': `<path d="M8 36 L112 36 L100 50 L18 50 Z M70 36 L70 22 L94 22 L94 36 M30 36 L30 10 L58 30"/>${SEA}`,
  // A barge: an unpowered hull on a tow line behind a little tug.
  'barge': `<path d="M54 36 L116 36 L112 48 L58 48 Z M60 36 L60 28 L108 28 L108 36"/><path d="M4 40 L14 40 L22 36 L32 36 L30 48 L8 48 Z M16 36 L16 30 L24 30"/><path d="M32 40 L54 40" stroke-dasharray="3 3" stroke-width="2"/>${SEA}`,
  // Cars and trucks.
  'sedan': `<path d="M8 40 L14 30 L36 28 L48 16 L80 16 L94 28 L110 31 L112 40 Z M52 18 L52 28 M50 28 L92 28"/>${W(30, 42)}${W(90, 42)}`,
  'sports-car': `<path d="M6 40 L10 32 L40 28 L54 20 L78 20 L96 30 L114 34 L114 40 Z M54 22 L56 29"/>${W(28, 42, 7)}${W(94, 42, 7)}`,
  'subcompact': `<path d="M24 42 L26 30 L40 18 L74 18 L88 30 L96 32 L96 42 Z M58 18 L58 30 M40 30 L88 30"/>${W(40, 44, 7)}${W(80, 44, 7)}`,
  'limo': `<path d="M4 40 L8 30 L24 28 L32 18 L96 18 L104 28 L116 31 L116 40 Z M48 18 L48 28 M68 18 L68 28 M28 28 L104 28"/>${W(22, 42, 7)}${W(100, 42, 7)}`,
  'suv': `<path d="M8 42 L10 26 L28 24 L38 12 L102 12 L108 24 L112 42 Z M66 12 L66 24 M30 24 L108 24"/>${W(30, 44, 9)}${W(90, 44, 9)}`,
  'van': `<path d="M8 42 L8 24 L22 10 L110 10 L112 42 Z M22 10 L22 26 L8 26 M60 10 L60 42"/>${W(28, 44)}${W(92, 44)}`,
  'rv': `<path d="M4 44 L4 18 Q4 8 14 8 L114 8 L114 44 Z M4 22 L22 22 L22 8 M34 16 L54 16 L54 26 L34 26 Z M68 16 L100 16 L100 26 L68 26 Z"/>${W(24, 46, 7)}${W(92, 46, 7)}`,
  'sand-buggy': `<path d="M8 38 L112 38 M16 38 L34 16 L80 16 L100 38 M48 16 L56 38 M34 16 L28 6 M80 16 L86 6"/>${W(26, 42, 11)}${W(94, 42, 11)}`,
  'semi-tractor': `<path d="M30 42 L30 14 L60 10 L66 24 L76 24 L76 42 Z M34 14 L34 26 L60 26 M76 36 L112 36 M52 10 L52 2"/>${W(44, 46)}${W(92, 46)}${W(108, 46)}`,
  'box-truck': `<path d="M4 42 L4 10 L80 10 L80 42 Z M80 18 L100 18 L114 30 L114 42 L80 42 M84 20 L84 30 L110 30"/>${W(20, 46)}${W(40, 46)}${W(98, 46)}`,
  'apc-wheeled': `<path d="M6 40 L10 26 L28 18 L96 18 L112 28 L114 40 Z M50 18 L54 10 L70 10 L72 18 M70 13 L96 9"/>${W(22, 44, 7)}${W(44, 44, 7)}${W(76, 44, 7)}${W(98, 44, 7)}`,
  'apc-tracked': `<path d="M8 34 L12 22 L30 16 L96 16 L112 24 L112 34 Z M50 16 L54 8 L70 8 L72 16"/>${TRACK(18, 102)}`,
  'caterpillar': `<path d="M30 34 L30 14 L58 14 L58 34 M58 22 L90 22 L90 34 M14 34 L4 46 L18 46 M30 34 L14 34"/>${TRACK(36, 98)}`,
  'forklift': `<path d="M40 44 L40 20 L66 20 L66 8 L84 8 L90 22 L90 44 Z M28 4 L28 48 M28 46 L6 46 M28 34 L8 34"/>${W(50, 48, 7)}${W(84, 48, 7)}`,
  // Aircraft.
  'airliner': `<path d="M4 32 Q4 26 14 26 L104 26 Q116 28 116 32 Q116 36 104 36 L14 36 Q4 36 4 32 Z M50 34 L70 52 L80 52 L66 34 M12 26 L6 12 L14 12 L24 26 M20 30 L100 30"/>`,
  'hsct': `<path d="M2 34 L40 28 L110 30 L118 33 L110 36 L40 38 Z M40 30 L84 30 L108 32 M30 30 L22 14 L30 14 L44 29 M56 38 L76 52 L86 52 L80 38"/>`,
  'jet-fighter': `<path d="M4 32 L60 28 L104 30 L116 32 L104 34 L60 36 Z M46 30 L34 10 L44 10 L64 29 M46 34 L34 54 L44 54 L64 35 M10 31 L4 18 L12 18 L20 30 M84 30 Q90 26 98 30"/>`,
  'single-engine': `<path d="M14 30 L92 30 Q100 30 104 34 L92 38 L14 36 Z M104 26 L104 42 M14 30 L6 18 L14 18 L24 30 M40 30 L66 30 M50 30 L50 24 L70 24"/>${W(84, 46, 4)}${W(30, 44, 3)}`,
  'twin-engine': `<path d="M8 30 L98 30 Q110 32 98 36 L8 36 Z M10 30 L4 16 L12 16 L22 30 M40 33 L100 33 M54 24 L54 42 M76 24 L76 42"/><path d="M50 22 L58 22 M72 22 L80 22" stroke-width="2"/>`,
  'ultralight': `<path d="M14 14 L106 14 M60 14 L48 40 L76 40 L60 14 M52 40 L52 48 M72 40 L72 48 M48 40 L20 44 L12 36"/>${W(50, 50, 3)}${W(74, 50, 3)}`,
  'attack-heli': `<path d="M30 36 L56 28 L96 28 Q104 32 96 38 L56 40 Z M30 36 L6 32 L4 24 M64 28 L64 18 M30 18 L100 18 M76 40 L76 48 M58 34 L88 34 M86 40 L104 42"/>`,
  'utility-heli': `<path d="M44 40 Q34 26 52 22 L92 22 Q108 26 104 40 Z M44 34 L8 30 L4 22 M70 22 L70 12 M24 12 L114 12 M58 40 L56 48 M90 40 L92 48 M50 48 L100 48"/>`,
  'cargo-heli': `<path d="M14 42 L14 24 Q14 16 26 16 L98 16 Q110 16 112 30 L108 42 Z M28 16 L28 8 M96 16 L96 8 M4 8 L52 8 M72 8 L118 8 M24 42 L24 50 M100 42 L100 50"/>`,
  'autogyro': `<path d="M36 40 L44 26 L76 26 L82 40 Z M60 26 L60 10 M20 10 L100 10 M36 32 L18 30 M14 22 L14 40"/>${W(46, 46, 4)}${W(76, 46, 4)}`,
  'tilt-wing': `<path d="M12 36 Q12 30 22 30 L98 30 Q110 32 98 38 L22 38 Q12 38 12 36 Z M14 30 L8 20 L16 20 L24 30 M44 28 L76 28 M50 28 L50 10 M70 28 L70 10 M40 10 L60 10 M60 10 L80 10"/>`,
  'thunderbird': `<path d="M6 34 Q10 24 30 24 L92 24 Q112 26 114 34 Q112 42 92 42 L30 42 Q10 42 6 34 Z M44 42 L36 52 M80 42 L88 52 M50 24 L60 16 L80 16 L84 24 M10 30 L4 22"/>`,
  'jump-jet': `<path d="M4 32 L60 28 L108 32 L60 36 Z M46 30 L36 12 L46 12 L62 29 M46 34 L36 52 L46 52 L62 35 M10 31 L4 20 L12 20 L20 30 M54 36 L54 46 M70 36 L70 46"/><path d="M52 50 L56 50 M68 50 L72 50" stroke-width="2"/>`,
  'hovercraft': `<path d="M8 42 Q8 34 20 34 L100 34 Q112 34 112 42 Q112 50 100 50 L20 50 Q8 50 8 42 Z M24 34 L32 20 L80 20 L88 34"/><circle cx="98" cy="22" r="9"/><path d="M92 16 L104 28 M104 16 L92 28" stroke-width="2"/>`,
  // Special.
  'zeppelin': `<path d="M6 26 Q6 8 60 8 Q114 8 114 26 Q114 44 60 44 Q6 44 6 26 Z M10 26 L110 26 M44 44 L48 52 L72 52 L76 44 M108 14 L118 6 M108 38 L118 46"/>`,
  'mini-blimp': `<path d="M24 28 Q24 14 58 14 Q92 14 92 28 Q92 42 58 42 Q24 42 24 28 Z M90 20 L100 12 M90 36 L100 44 M54 42 L54 48 L64 48 L64 42"/>`,
  'semiballistic': `<path d="M8 32 L84 28 Q112 30 116 32 Q112 34 84 36 L8 36 Z M20 30 L12 12 L20 12 L36 29 M20 36 L12 52 L20 52 L36 35"/><path d="M6 30 L2 32 L6 34" stroke-width="2"/>`,
  'suborbital': `<path d="M10 32 Q10 24 24 24 L96 26 Q116 30 96 38 L24 40 Q10 40 10 32 Z M44 26 L56 10 L66 10 L62 26 M44 38 L56 54 L66 54 L62 38 M24 28 L12 28 M24 36 L12 36"/><path d="M8 30 L2 30 M8 34 L2 34" stroke-width="2"/>`,
  'loco-bullet': `<path d="M4 42 L4 26 L70 22 Q108 22 116 42 Z M74 24 Q96 26 104 34 L74 34 M20 30 L60 30"/>${RAIL}${W(20, 46, 3)}${W(40, 46, 3)}${W(84, 46, 3)}`,
  'loco-bulk': `<path d="M4 42 L4 14 L90 14 L90 22 L114 22 L114 42 Z M90 22 L90 42 M14 22 L80 22 M96 28 L108 28"/>${RAIL}${W(16, 46, 4)}${W(32, 46, 4)}${W(48, 46, 4)}${W(72, 46, 4)}${W(88, 46, 4)}${W(104, 46, 4)}`,
  'loco-express': `<path d="M4 42 L4 18 L92 18 Q112 20 114 42 Z M92 18 L92 30 L110 30 M16 26 L80 26"/>${RAIL}${W(20, 46, 4)}${W(40, 46, 4)}${W(80, 46, 4)}${W(100, 46, 4)}`,
  'loco-switcher': `<path d="M20 42 L20 26 L72 26 L72 12 L100 12 L100 42 Z M76 16 L96 16 L96 24 L76 24 M36 26 L36 18 L44 18"/>${RAIL}${W(34, 46, 4)}${W(58, 46, 4)}${W(86, 46, 4)}`,
  'loco-nonrail': `<path d="M4 40 L4 20 L36 20 L36 12 L56 12 L60 20 L60 40 Z M60 30 L66 30 M66 22 L116 22 L116 40 L66 40 Z"/>${W(18, 44, 6)}${W(46, 44, 6)}${W(78, 44, 6)}${W(104, 44, 6)}`,
  'streetcar': `<path d="M8 42 L8 16 Q8 10 16 10 L104 10 Q112 10 112 16 L112 42 Z M16 18 L32 18 L32 28 L16 28 Z M40 18 L56 18 L56 28 L40 28 Z M64 18 L80 18 L80 28 L64 28 Z M88 18 L104 18 L104 28 L88 28 Z M60 10 L52 2 L70 2"/>${RAIL}${W(24, 46, 3)}${W(96, 46, 3)}`,
  'railcar-freight': `<path d="M10 42 L10 14 L110 14 L110 42 Z M60 14 L60 42 M10 42 L4 42 M110 42 L116 42"/>${RAIL}${W(22, 46, 3)}${W(34, 46, 3)}${W(86, 46, 3)}${W(98, 46, 3)}`,
  'railcar-passenger': `<path d="M8 42 L8 16 Q8 12 12 12 L108 12 Q112 12 112 16 L112 42 Z M16 20 L28 20 L28 28 L16 28 Z M36 20 L48 20 L48 28 L36 28 Z M56 20 L68 20 L68 28 L56 28 Z M76 20 L88 20 L88 28 L76 28 Z M96 20 L104 20 L104 34 L96 34 Z"/>${RAIL}${W(22, 46, 3)}${W(98, 46, 3)}`,
  'trailer-box': `<path d="M4 40 L4 10 L106 10 L106 40 Z M106 34 L112 34"/><path d="M112 34 L118 34" stroke-dasharray="2 2" stroke-width="2"/>${W(16, 44, 6)}${W(32, 44, 6)}`,
  'trailer-axle': `<path d="M24 36 L24 22 L84 22 L84 36 Z M84 34 L112 34"/>${W(54, 42, 8)}`,
  // Submarines.
  'attack-sub': `<path d="M8 34 Q8 24 28 24 L96 24 Q114 26 114 34 Q114 42 96 44 L28 44 Q8 44 8 34 Z M46 24 L50 12 L66 12 L68 24 M48 16 L40 16 M8 34 L2 26 M8 34 L2 42"/>`,
  'boomer': `<path d="M4 34 Q4 24 24 24 L100 24 Q116 26 116 34 Q116 42 100 44 L24 44 Q4 44 4 34 Z M78 24 L80 12 L94 12 L96 24 M30 24 L30 20 L70 20 L70 24 M38 20 L38 24 M48 20 L48 24 M58 20 L58 24"/>`,
  'patrol-sub': `<path d="M16 34 Q16 26 32 26 L92 26 Q106 28 106 34 Q106 40 92 42 L32 42 Q16 42 16 34 Z M54 26 L56 16 L70 16 L72 26 M16 34 L8 28 M16 34 L8 40"/>`,
  'commercial-sub': `<path d="M8 34 Q8 22 30 22 L94 22 Q112 22 112 34 Q112 46 94 46 L30 46 Q8 46 8 34 Z M48 22 L52 12 L68 12 L70 22"/>${W(40, 34, 3)}${W(54, 34, 3)}${W(68, 34, 3)}${W(82, 34, 3)}`,
  'minisub': `<path d="M30 34 Q30 22 54 22 L74 22 Q94 24 94 34 Q94 44 74 46 L54 46 Q30 46 30 34 Z M30 34 L22 28 M30 34 L22 40"/><path d="M76 26 Q86 30 76 42" stroke-width="2"/>`,
  'bathyscaph': `<path d="M20 26 Q20 12 60 12 Q100 12 100 26 L100 30 L20 30 Z M60 30 L60 34"/><circle cx="60" cy="44" r="10"/>${W(60, 44, 4)}`,
  // Drones.
  'crawler-wheeled': `<path d="M30 40 L30 26 L90 26 L90 40 Z M54 26 L54 18 L66 18 L66 26"/>${W(36, 44, 7)}${W(60, 44, 7)}${W(84, 44, 7)}`,
  'crawler-tracked': `<path d="M30 34 L30 22 L90 22 L90 34 M54 22 L54 14 L66 14 L66 22"/>${TRACK(32, 88)}`,
  'uav-fixed': `<path d="M14 32 L100 30 Q110 32 100 34 L14 34 Z M44 31 L36 12 L48 12 L60 31 M44 33 L36 52 L48 52 L60 33 M16 32 L8 22 L16 22 L26 31 M104 26 L104 38"/>`,
  'rotor-uav': `<circle cx="60" cy="34" r="8"/><path d="M52 30 L28 20 M68 30 L92 20 M52 38 L28 48 M68 38 L92 48 M14 20 L42 20 M78 20 L106 20 M14 48 L42 48 M78 48 L106 48"/>`,
  'vt-uav': `<path d="M24 34 Q24 26 40 26 L84 26 Q100 26 100 34 Q100 42 84 42 L40 42 Q24 42 24 34 Z"/><circle cx="18" cy="34" r="8"/><circle cx="106" cy="34" r="8"/><path d="M18 42 L18 50 M106 42 L106 50" stroke-width="2"/>`,
  'skimmer': `<path d="M24 40 Q24 34 32 34 L88 34 Q96 34 96 40 Q96 46 88 46 L32 46 Q24 46 24 40 Z M40 34 L46 26 L70 26 L74 34"/><circle cx="84" cy="22" r="7"/>`,
  'walker': `<path d="M30 20 L90 20 L84 32 L36 32 Z M40 32 L28 42 L34 54 M54 32 L60 44 L52 54 M68 32 L60 44 M80 32 L92 42 L86 54 M90 20 L100 14"/>`,
  'anthroform': `<circle cx="60" cy="10" r="6"/><path d="M48 18 L72 18 L70 36 L50 36 Z M48 20 L38 34 L40 42 M72 20 L82 34 L80 42 M54 36 L50 56 M66 36 L70 56 M44 56 L52 56 M68 56 L76 56"/>`,
  'sea-sled': `<path d="M20 34 Q20 26 36 26 L90 26 Q104 28 104 34 Q104 40 90 42 L36 42 Q20 42 20 34 Z M20 34 L12 28 M20 34 L12 40 M60 26 L60 18 L80 18"/>${SEA}`,
};

/** A drone's badge: a little antenna over the silhouette. */
const DRONE = `<path d="M104 4 L104 14 M98 6 Q104 0 110 6 M95 10 Q104 1 113 10" stroke-width="2"/>`;

/** Power plant code → its icon body (viewBox 60×60). */
const PLANT = {
  G: `<path d="M14 52 L14 14 Q14 8 20 8 L36 8 Q42 8 42 14 L42 52 Z M14 24 L42 24 M42 18 L50 26 L50 44 Q50 48 46 48"/>`,
  D: `<path d="M14 52 L14 14 Q14 8 20 8 L36 8 Q42 8 42 14 L42 52 Z M20 32 L36 32 M28 24 L28 40"/>`,
  M: `<path d="M18 52 L18 18 Q18 8 30 8 Q42 8 42 18 L42 52 Z M30 26 Q22 36 30 44 Q38 36 30 26 Z"/>`,
  E: `<path d="M12 18 L48 18 L48 50 L12 50 Z M20 12 L20 18 M40 12 L40 18 M32 24 L24 36 L36 36 L28 46"/>`,
  EC: `<path d="M10 16 L50 16 L50 48 L10 48 Z M20 16 L20 48 M30 16 L30 48 M40 16 L40 48"/><circle cx="30" cy="32" r="5"/>`,
  J: `<circle cx="30" cy="30" r="5"/><path d="M30 25 Q22 8 30 4 Q38 8 30 25 M35 30 Q52 22 56 30 Q52 38 35 30 M30 35 Q38 52 30 56 Q22 52 30 35 M25 30 Q8 38 4 30 Q8 22 25 30"/>`,
  JET: `<path d="M6 22 L44 18 Q56 30 44 42 L6 38 Z M14 22 L14 38 M22 21 L22 39 M30 20 L30 40"/>`,
  N: `<circle cx="30" cy="30" r="4"/><ellipse cx="30" cy="30" rx="24" ry="9"/><ellipse cx="30" cy="30" rx="24" ry="9" transform="rotate(60 30 30)"/><ellipse cx="30" cy="30" rx="24" ry="9" transform="rotate(120 30 30)"/>`,
  S: `<path d="M28 6 L28 50 M28 8 L50 44 L28 44 M26 12 L8 40 L26 40 M8 52 L52 52"/>`,
  R: `<path d="M30 4 Q42 14 40 36 L20 36 Q18 14 30 4 Z M20 30 L12 42 L20 40 M40 30 L48 42 L40 40 M24 42 L30 56 L36 42"/>`,
};

/** Mod shelf → its icon body (viewBox 60×60). */
const SHELF = {
  engine: `<circle cx="30" cy="30" r="10"/><path d="M30 6 L30 14 M30 46 L30 54 M6 30 L14 30 M46 30 L54 30 M13 13 L19 19 M41 41 L47 47 M13 47 L19 41 M41 19 L47 13"/>`,
  control: `<circle cx="30" cy="30" r="22"/><circle cx="30" cy="30" r="5"/><path d="M8 30 L25 30 M35 30 L52 30 M30 35 L30 52"/>`,
  armor: `<path d="M30 6 L50 14 L50 30 Q50 46 30 54 Q10 46 10 30 L10 14 Z"/>`,
  stealth: `<path d="M4 30 Q30 6 56 30 Q30 54 4 30 Z"/><circle cx="30" cy="30" r="8"/><path d="M10 50 L50 10"/>`,
  weapons: `<circle cx="30" cy="30" r="20"/><circle cx="30" cy="30" r="6"/><path d="M30 4 L30 16 M30 44 L30 56 M4 30 L16 30 M44 30 L56 30"/>`,
  electronics: `<path d="M30 54 L30 30 M30 30 Q14 22 14 8 M30 30 Q46 22 46 8 M20 40 Q30 34 40 40 M14 46 Q30 36 46 46"/>`,
  cabin: `<path d="M18 8 L18 40 L44 40 L44 52 M18 40 L12 52 M18 24 L36 24 Q42 24 42 30 L42 40"/>`,
  special: `<path d="M14 46 L36 24 M32 14 Q40 6 48 14 Q52 22 44 26 L40 22 L34 28 L30 24 L36 18 Z M10 50 L18 42"/>`,
};

/** Where the chassis pictures ship, and which art ids have one (`tests/vehicle-designer-shop.test.mjs` checks the files). */
export const PICTURE_DIR = 'systems/The2ndChumming3e/styles/vehicles';
export const PICTURES = new Set(Object.keys(ART));
/** The top-down token icon of each chassis (TODO 297, the maintainer 2026-11-08: "render it top down so we can use it as an icon"). */
export const TOKEN_DIR = `${PICTURE_DIR}/top`;
/** A new design's actor image and token texture: the chassis' top-down icon, or null when it has none. */
export const tokenImage = art => (PICTURES.has(art) ? `${TOKEN_DIR}/${art}.webp` : null);

export const DesignerArt = {
  /** Where `picture` finds the chassis pictures — Foundry's system path; the web designer points it at its own copy (TODO 298). */
  dir: PICTURE_DIR,
  /** A chassis card's silhouette (a drone gets the antenna badge). */
  chassis(category, drone = false) {
    return svg((CHASSIS[category] ?? CHASSIS.special) + (drone ? DRONE : ''));
  },
  /**
   * A chassis card's own drawing (its `chassis-catalog.mjs` art id), drawn at `scale` (0.6-1) so the bigger chassis of a
   * family look bigger, anchored bottom-centre; falls back to the category silhouette.
   */
  /**
   * A chassis' picture (TODO 297, the maintainer 2026-11-08: "more anime style then line drawing", generated on the
   * maintainer's own ComfyUI, transparent background): `styles/vehicles/<art>.webp`, drawn at `scale` of the card
   * (bottom-centred) so the bigger chassis of a family look bigger. A drone gets its antenna badge over it. An art id with
   * no picture falls back to the line drawing (`vehicle`).
   */
  picture(art, category, drone = false, scale = 1) {
    if (!PICTURES.has(art)) return this.vehicle(art, category, drone, scale);
    const s = Math.round(Math.min(1, Math.max(0.4, scale)) * 100);
    return `<div class="vd-pic">${drone ? `<span class="vd-pic-drone">${svg(DRONE)}</span>` : ''}<img src="${this.dir}/${art}.webp" alt="" loading="lazy" style="max-width:${s}%;max-height:${s}%"/></div>`;
  },
  vehicle(art, category, drone = false, scale = 1) {
    const body = ART[art] ?? CHASSIS[category] ?? CHASSIS.special;
    const s = Math.min(1, Math.max(0.4, scale));
    const inner = s === 1 ? body : `<g transform="translate(${60 * (1 - s)} ${60 * (1 - s)}) scale(${s})">${body}</g>`;
    return svg(inner + (drone ? DRONE : ''));
  },
  /** A power plant card's icon. */
  plant(code) { return svg(PLANT[code] ?? PLANT.G, '0 0 60 60'); },
  /** A mod shelf's icon (the tab and every card on it). */
  shelf(id) { return svg(SHELF[id] ?? SHELF.special, '0 0 60 60'); },
  /** Which keys have art — for the tests. */
  keys: { art: Object.keys(ART), chassis: Object.keys(CHASSIS), plant: Object.keys(PLANT), shelf: Object.keys(SHELF) },
};
