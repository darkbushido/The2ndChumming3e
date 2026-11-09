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
  special: `<path d="M14 40 L14 24 L60 24 L60 16 L96 16 L106 30 L106 40 Z"/>${wheel(30, 44)}${wheel(54, 44)}${wheel(88, 44)}`,
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

export const DesignerArt = {
  /** A chassis card's silhouette (a drone gets the antenna badge). */
  chassis(category, drone = false) {
    return svg((CHASSIS[category] ?? CHASSIS.special) + (drone ? DRONE : ''));
  },
  /** A power plant card's icon. */
  plant(code) { return svg(PLANT[code] ?? PLANT.G, '0 0 60 60'); },
  /** A mod shelf's icon (the tab and every card on it). */
  shelf(id) { return svg(SHELF[id] ?? SHELF.special, '0 0 60 60'); },
  /** Which keys have art — for the tests. */
  keys: { chassis: Object.keys(CHASSIS), plant: Object.keys(PLANT), shelf: Object.keys(SHELF) },
};
