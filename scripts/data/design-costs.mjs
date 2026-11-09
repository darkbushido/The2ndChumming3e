/**
 * A vehicle mod's DESIGN figures — what it costs in Design Points when a manufacturer builds it in · TODO 287
 *
 * R3R p.112: a modification fitted at design time uses its Vehicle Design Point Cost, not its parts cost; each Vehicle
 * Customization entry (R3R pp.126-155) prints a "Design Specifications" block. Its CF and Load can differ from the
 * customization figures (Nitrous Oxide: design CF 1.5, customization 2). The maintainer, 2026-11-07: "Add designCost
 * field now". Figures are transcribed per row from the printed page — the book is the authority; the text is ours.
 *
 * Rows: [name, bookPage, cfCost discriminator (only where one name+page has several documents), designCost, designCf,
 * designLoad]. A blank figure means the entry prints none (or prints a rule the GM applies) — the designer asks.
 *
 * `points(text, ctx)` evaluates a figure: "35", "55 per level", "Chassis x 0.25 per level", "Plant x 0.75 per level",
 * "25 x Body", "Pilot x 50", "Rating x 50", "Rating 1: 5, 2: 10", "Per level 1-3: 35, 4-6: 75", "(levels)^3 x 50",
 * "Body^2 x 5kg per level". Anything else → null: the GM types it (warn, never refuse).
 */

const blank = v => v == null || String(v).trim() === '';

export const DESIGN_COSTS = [
  ["GridLink(TM) Power (Vehicle)","r3.126",null,"2","",""],
  ["SunCell Power (Vehicle)","r3.126",null,"5","",""],
  ["Nitrous Oxide Injectors (Vehicle)","r3.126",null,"55 per level","1.5","15kg"],
  ["Adjusted Controls(Dwarf) (Vehicle)","r3.127",null,"25","",""],
  ["Adjusted Controls(Troll) (Vehicle)","r3.127",null,"35","",""],
  ["Adjusted Controls(Other) (Vehicle)","r3.127",null,"30","",""],
  ["Advanced Drone Pilot (Vehicle)","r3.127",null,"Rating 1: 0, 2: 50, 3: 250, 4: 1250, 5: 5000","",""],
  ["Autonavigation System (Vehicle)","r3.127",null,"Rating 1: 5, 2: 10, 3: 50, 4: 150","",""],
  ["Cont. Manu. Contr. (Vehicle)","r3.128",null,"Per level 1-3: 35, 4-6: 75, 7-9: 150","","25kg"],
  ["Rem-Contr. Intr. Bod (Vehicle)","sr3.306,r3.130",null,"25 x Body","",""],
  ["Datajack Port (Vehicle)","sr3.306,r3.128",null,"25","",""],
  ["Datajack Port(Motorcycles) (Vehicle)","sr3.306,r3.128",null,"25","",""],
  ["Bike Gyro-Stabilization Gear (Vehicle)","r3.129",null,"Chassis x 0.25","","5kg"],
  ["Rigger Adaptation (Vehicle)","sr3.306,r3.130",null,"35","",""],
  ["APPS (Vehicle)","r3.131",null,"30 per seat","",""],
  ["Crash Cages (Vehicle)","r3.132",null,"40","","10kg"],
  ["Roll Bars (Vehicle)","r3.133",null,"0","",""],
  ["Vehicle Armor (Vehicle)","r3.131",null,"50 per level","","Body^2 x 5kg per level"],
  ["Concealed Armor (Vehicle)","r3.132",null,"50 per level","2 per level","Body^2 x 5kg per level"],
  ["Smart Armor System (Vehicle)","r3.133",null,"250","2","Body x 50kg"],
  ["Gunnery Recoil Adjuster (Vehicle)","r3.137",null,"10 per level","",""],
  ["Launch Control System(Medium) (Vehicle)","r3.137",null,"10","0.5","10kg"],
  ["Launch Control System(Heavy) (Vehicle)","r3.137",null,"25","1","10kg"],
  ["Smartlink-I (Vehicle)","r3.139",null,"25","",""],
  ["Smartlink-II (Vehicle)","r3.139",null,"35","",""],
  ["Pistol Customization Kit (Vehicle)","r3.136",null,"1","","0"],
  ["Submachinegun Cust. Kit (Vehicle)","r3.136",null,"1","","0.25"],
  ["Rifle Customization Kit (Vehicle)","r3.136",null,"2","","0.5"],
  ["Shotgun Customization Kit (Vehicle)","r3.136",null,"2","","0.5"],
  ["Grenade Launcher Cust.Kit (Vehicle)","r3.136",null,"2","","0.5"],
  ["LMG Customization Kit (Vehicle)","r3.136",null,"2","","0.5"],
  ["MMG Customization Kit (Vehicle)","r3.136",null,"3","","1"],
  ["HMG Customization Kit (Vehicle)","r3.136",null,"3","","1"],
  ["Assault Cannon Cust. Kit (Vehicle)","r3.136",null,"3","","1"],
  ["External Hardpoint (Vehicle)","sr3.312,r3.136",null,"25","1","10kg+Weapon"],
  ["External Firmpoint (Vehicle)","sr3.312,r3.136",null,"10","0.5","10kg+Weapon"],
  ["Internal Hardpoint (Vehicle)","sr3.312,r3.136",null,"35","4","10kg+Weapon"],
  ["Internal Firmpoint (Vehicle)","sr3.312,r3.136",null,"20","3","10kg+Weapon"],
  ["External Missile Mount (Vehicle)","r3.138",null,"0","0",""],
  ["Internal Missile Mount (Vehicle)","r3.138",null,"0","2+3/missile","0"],
  ["Pintle Mount (Vehicle)","sr3.312,r3.138",null,"1","0",""],
  ["Ring Mount (Vehicle)","r3.138",null,"10","1","25kg"],
  ["Ring Mount(Door Mount) (Vehicle)","r3.138",null,"10","16","25kg"],
  ["Mini-Turret (Vehicle)","sr3.312,r3.139",null,"125","6","25kg"],
  ["Small Turret (Vehicle)","sr3.312,r3.139",null,"250","7","100kg"],
  ["Medium Turret (Vehicle)","r3.139",null,"500","16","1000kg"],
  ["Large Turret (Vehicle)","r3.139",null,"1500","60","6000kg"],
  ["Extra-larget Turret (Vehicle)","r3.139",null,"3000","120","30000kg"],
  ["Remote Micro Turret (Vehicle)","r3.141",null,"100","0","10kg"],
  ["Remote Mini Turret (Vehicle)","r3.141",null,"175","3","25kg"],
  ["Remote Small Turret (Vehicle)","r3.141",null,"350","4","100kg"],
  ["Remote Medium Turret (Vehicle)","r3.141",null,"600","4","1000kg"],
  ["Remote Large Turret (Vehicle)","r3.141",null,"2500","32","8000kg"],
  ["Remote Ex-Large Turret (Vehicle)","r3.141",null,"5000","64","35000kg"],
  ["Mini-Turret(Anti-Air) (Vehicle)","r3.139",null,"187.5","7","25kg"],
  ["Small Turret(Anti-Air) (Vehicle)","r3.139",null,"375","8","100kg"],
  ["Medium Turret(Anti-Air) (Vehicle)","r3.139",null,"750","17","1000kg"],
  ["Large Turret(Anti-Air) (Vehicle)","r3.139",null,"2250","61","6000kg"],
  ["Extra-large Turret(Anti-Air) (Vehicle)","r3.139",null,"4500","121","30000kg"],
  ["Remote Micro Turret(Anti-Air) (Vehicle)","r3.141",null,"150","1","10kg"],
  ["Remote Mini Turret(Anti-Air) (Vehicle)","r3.141",null,"262.5","4","25kg"],
  ["Remote Small Turret(Anti-Air) (Vehicle)","r3.141",null,"525","5","100kg"],
  ["Remote Medium Turret(Anti-Air) (Vehicle)","r3.141",null,"900","5","1000kg"],
  ["Remote Large Turret(Anti-Air) (Vehicle)","r3.141",null,"3750","33","8000kg"],
  ["Mini-Turret(Pop-Up) (Vehicle)","r3.139",null,"125","12","25kg"],
  ["Small Turret(Pop-Up) (Vehicle)","r3.139",null,"250","14","100kg"],
  ["Medium Turret(Pop-Up) (Vehicle)","r3.139",null,"500","32","1000kg"],
  ["Remote Micro Turret(Pop-Up) (Vehicle)","r3.141",null,"100","1","10kg"],
  ["Remote Mini Turret(Pop-Up) (Vehicle)","r3.141",null,"175","6","25kg"],
  ["Remote Small Turret(Pop-Up) (Vehicle)","r3.141",null,"350","8","100kg"],
  ["Remote Medium Turret(Pop-Up) (Vehicle)","r3.141",null,"600","8","1000kg"],
  ["Autosoft Interpretation (Vehicle)","r3.142",null,"Pilot x 50","1",""],
  ["BattleTac FDDM Receiver (Vehicle)","r3.142",null,"350","",""],
  ["BattleTac IVIS Receiver (Vehicle)","r3.142",null,"250","",""],
  ["ECM (Vehicle)","r3.143",null,"Rating 1: 100, 2: 200, 3: 300, 4: 500, 5: 750, 6: 1000, 7: 2000, 8: 3000, 9: 5000, 10: 10000","Rating 1: 0, 2: 1, 3: 2, 4: 2, 5: 3, 6: 4, 7: 6, 8: 10, 9: 12, 10: 16","Rating 1: 5, 2: 10, 3: 15, 4: 20, 5: 25, 6: 50, 7: 75, 8: 100, 9: 150, 10: 250"],
  ["ECCM (Vehicle)","r3.145",null,"Rating 1: 100, 2: 200, 3: 300, 4: 400, 5: 500, 6: 750, 7: 1000, 8: 2500, 9: 3000, 10: 5000","Rating 1: 0, 2: 1, 3: 2, 4: 2, 5: 3, 6: 4, 7: 6, 8: 10, 9: 12, 10: 16","Rating 1: 3, 2: 5, 3: 8, 4: 12, 5: 18, 6: 25, 7: 50, 8: 75, 9: 100, 10: 150"],
  ["ED (Vehicle)","r3.145",null,"Rating 1: 150, 2: 300, 3: 500, 4: 750, 5: 1000, 6: 2500","Rating 1: 1, 2: 2, 3: 4, 4: 5, 5: 6, 6: 8","Rating 1: 10, 2: 20, 3: 30, 4: 45, 5: 50, 6: 75"],
  ["ECD (Vehicle)","r3.145",null,"Rating 1: 100, 2: 300, 3: 500, 4: 750, 5: 1500, 6: 3000","Rating 1: 1, 2: 2, 3: 3, 4: 4, 5: 6, 6: 8","Rating 1: 25, 2: 30, 3: 35, 4: 45, 5: 60, 6: 75"],
  ["Power Amplifier (Vehicle)","r3.146",null,"5 per level","0.25 per level","1kg per level"],
  ["Remote-Control Encryption (Vehicle)","r3.147",null,"Rating x 50","",""],
  ["Sensors (Vehicle)","r3.147",null,"Rating 1: 50, 2: 75, 3: 100, 4: 125, 5: 150, 6: 200, 7: 300, 8: 500, 9: 1000, 10: 5000","Rating 1: 0, 2: 1, 3: 2, 4: 2, 5: 3, 6: 4, 7: 6, 8: 10, 9: 12, 10: 16","Rating 1: 12, 2: 20, 3: 25, 4: 35, 5: 50, 6: 75, 7: 110, 8: 150, 9: 200, 10: 250"],
  ["Electronics Port (Vehicle)","r3.145",null,"10","",""],
  ["Retransmission Unit (Vehicle)","r3.147",null,"250","1","5kg"],
  ["Amphibious Package (Vehicle)","r3.149",null,"Rating 1: 25, 2: 80, 3: 200","Rating 1: 0, 2: 0, 3: 2",""],
  ["Anti-Theft System (Vehicle)","r3.150",null,"Per level 3-6: 4, 7-9: 10, 10+: 50","",""],
  ["Electric Shock System (Vehicle)","r3.150",null,"20","",""],
  ["Proximity Alert (Vehicle)","r3.150",null,"2","",""],
  ["Bench Seat (Vehicle)","r3.153",null,"0","6",""],
  ["Folding Bench Seat (Vehicle)","r3.153",null,"0","6",""],
  ["Bucket Seat (Vehicle)","r3.153",null,"0","6",""],
  ["Small Sidecar (Vehicle)","r3.154",null,"10","",""],
  ["Medium Sidecar (Vehicle)","r3.154",null,"20","",""],
  ["Large Sidecar (Vehicle)","r3.154",null,"35","",""],
  ["White-Light (Vehicle)","r3.154",null,"6","",""],
  ["Medium-Range Infared (Vehicle)","r3.154",null,"6","",""],
  ["Ejection Seat(Standard) (Vehicle)","r3.150",null,"35","6",""],
  ["Ejection Seat(Reinforced) (Vehicle)","r3.150",null,"70","",""],
  ["Valkyrie Module (Vehicle)","r3.155",null,"3000","10","400kg"],
  ["Photovoltaic Chameleon Paint (Vehicle)","r3.152",null,"50","",""],
  ["Pintle Mount (Vehicle)","sr3.312",null,"1","0",""],
  ["Datajack Port (Vehicle)","r3.128",null,"25","",""],
  ["Datajack Port(Motorcycles) (Vehicle)","r3.128",null,"25","",""],
  ["Rigger Adaptation (Vehicle)","r3.130",null,"35","",""],
  ["Drive-by-Wire System (Vehicle)","r3.129",null,"Chassis x 0.75 per level","",""],
  ["Improved Suspension (Vehicle)","r3.129",null,"Chassis x 0.25 per level","",""],
  ["Improved Control Surfaces (Vehicle)","r3.129",null,"Chassis x 0.4 per level","",""],
  ["Off-Road Suspension (Vehicle)","r3.129",null,"Chassis x 0.5 per level","",""],
  ["Turbocharging/Superconductive Drive (Vehicle)","r3.126",null,"Plant x 0.75 per level","",""],
  ["Noisemaker Dispenser (Vehicle)","r3.134",null,"350","16+8/noisemaker","150kg+25kg/noisemaker"],
  ["Radar-Absorbent Materials (Vehicle)","r3.134",null,"(levels)^3 x 50","",""],
  ["Thermal Baffles (Vehicle)","r3.135",null,"75 per level","","Body x 50kg per level"],
];

const num = s => { const n = Number(String(s).replace(/,/g, '')); return Number.isFinite(n) ? n : null; };

/** The value a "Rating 1: a, 2: b" or "Per level 3-6: a, 7-9: b, 10+: c" list gives for `level`. */
function band(list, level) {
  for (const part of list.split(',')) {
    const m = part.trim().match(/^(\d+)(?:\s*-\s*(\d+)|(\+))?\s*:\s*([\d.]+)/);
    if (!m) return null;
    const lo = Number(m[1]);
    const hi = m[3] ? Infinity : m[2] ? Number(m[2]) : lo;
    if (level >= lo && level <= hi) return Number(m[4]);
  }
  return null;
}

export const DesignCosts = {
  /** The row for an item — by name and book page (and its cfCost where one name+page has several), or null. */
  rowFor(item) {
    if (item?.type !== 'vehiclemod') return null;
    const page = String(item?.system?.bookPage ?? '').trim();
    return DESIGN_COSTS.find(([name, bookPage, disc]) =>
      name === item.name && bookPage === page && (disc == null || disc === String(item.system?.cfCost ?? ''))) ?? null;
  },

  /**
   * A figure's value. ctx: `{ level, body, chassis, plant, pilot }` — level is the mod's rating / levels / seats (default 1),
   * chassis and plant their Design Point costs. Returns a number, or null when the text is not one of the shapes above.
   */
  points(text, ctx = {}) {
    if (blank(text)) return null;
    const t = String(text).trim().replace(/kg/gi, '').replace(/\s+/g, ' ');
    const level = Number(ctx.level ?? 1) || 1;
    const body = Number(ctx.body ?? 0);
    let m;
    if ((m = t.match(/^Rating (\d.*)$/)) && m[1].includes(':')) return band(m[1], level);
    if ((m = t.match(/^Per level (.*)$/))) { const b = band(m[1], level); return b == null ? null : b * level; }
    if ((m = t.match(/^\(levels\)\^(\d) x ([\d.]+)$/))) return level ** Number(m[1]) * Number(m[2]);
    const perLevel = / per (level|seat)$/.test(t);
    const core = t.replace(/ per (level|seat)$/, '');
    let v = null;
    if ((m = core.match(/^([\d.,]+)$/))) v = num(m[1]);
    else if ((m = core.match(/^Chassis x ([\d.]+)$/))) v = ctx.chassis == null ? null : Number(ctx.chassis) * Number(m[1]);
    else if ((m = core.match(/^Plant x ([\d.]+)$/))) v = ctx.plant == null ? null : Number(ctx.plant) * Number(m[1]);
    else if ((m = core.match(/^([\d.]+) x Body$/)) || (m = core.match(/^Body x ([\d.]+)$/))) v = body * Number(m[1]);
    else if ((m = core.match(/^Body\^2 x ([\d.]+)$/))) v = body * body * Number(m[1]);
    else if ((m = core.match(/^Pilot x ([\d.]+)$/))) v = ctx.pilot == null ? null : Number(ctx.pilot) * Number(m[1]);
    else if ((m = core.match(/^Rating x ([\d.]+)$/))) return level * Number(m[1]);
    if (v == null) return null;
    return perLevel ? v * level : v;
  },

  /** The fill for one mod: `{ 'system.designCost'?, 'system.designCf'?, 'system.designLoad'? }` — blanks only — or null. */
  fillDelta(item) {
    const row = DesignCosts.rowFor(item);
    if (!row) return null;
    const [, , , cost, cf, load] = row;
    const sys = item.system ?? {};
    const delta = {};
    if (!blank(cost) && blank(sys.designCost)) delta['system.designCost'] = cost;
    if (!blank(cf) && blank(sys.designCf)) delta['system.designCf'] = cf;
    if (!blank(load) && blank(sys.designLoad)) delta['system.designLoad'] = load;
    return Object.keys(delta).length ? delta : null;
  },
};
