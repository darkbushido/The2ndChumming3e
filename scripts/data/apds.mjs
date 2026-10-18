/**
 * APDS armour effect · pure. SR3 p.116: *"APDS halves (round down) the Ballistic Rating of armor or the Barrier
 * Rating of an object in any attack."* and *"APDS ammunition is not anti-vehicular and is therefore treated as
 * normal ammunition against vehicles and drones."* A vehicle's (or drone's) Armor is not halved.
 */
export const Apds = {
  /** The Ballistic rating after APDS, plus the card note. `isVehicle`: the target is a vehicle or drone. */
  resolve(ballistic, isVehicle) {
    const b = Math.max(0, Number(ballistic) || 0);
    if (isVehicle) return { ballistic: b, halved: false, note: `APDS is not anti-vehicular: treated as normal ammunition against a vehicle or drone (p.116) — Armor ${b} stands` };
    const half = Math.floor(b / 2);
    return { ballistic: half, halved: true, note: `APDS — ballistic armour halved (now ${half})` };
  },
};
