/**
 * Vehicle collisions — with a person, another vehicle, or a barrier — TODO 189.
 *
 * Every figure here is metres per Combat Turn (the unit of the Impact Damage Levels Table, p.147).
 * ⚠ **The table is not in this file.** It stays in one place, `SR3EActor.crashDamage`
 * (`speed → { power, level }`), and every function below takes it as `table` — so a fix to the table
 * reaches the pedestrian, the vehicle and the barrier rules at once, and a second copy cannot drift.
 *
 * **Vehicle-Pedestrian Collisions · SR3 p.148.** *"The Power of the collision is equal to the vehicle's
 * speed divided by 10, and the Damage Level is one stage higher than that listed for the vehicle's speed
 * on the Impact Damage Levels Table … If the corresponding Damage Level on the Impact Damage Levels Table
 * is Destroyed, the Power of the collision increases by half of its original value, rounded down."* The
 * vehicle: *"the Damage Level is one stage lower than that listed … a vehicle moving between 1 and 20
 * meters per turn would take no damage from the collision, while one moving between 21 and 60 meters per
 * turn would resist only Light damage."* Worked, p.149: 60 m/turn → **6S**.
 *
 * **Vehicle against vehicle · SR3 p.143, p.147.** *"calculate the difference in speed between the two
 * vehicles; then divide the result by 10 and round that number up … The attacker reduces the Power of the
 * collision damage by his vehicle's Body Rating, multiplied by the number of successes on his test. For the
 * Damage Level, use the level corresponding to the difference in speed."* Worked, p.147: 148 m/turn → 15S;
 * Body 3 × 5 successes takes the rammer's to "2S" (*"Target numbers cannot be reduced below 2"*); the target's
 * is not reduced. ⚠ The book gives vehicle collisions ONLY as a ram. An ACCIDENTAL collision uses the same
 * formula with nobody's Power reduced — the maintainer's ruling, 2026-10-17 (TODO 189).
 *
 * **Walls and Barriers · SR3 p.148.** *"If the vehicle's speed is less than or equal to the Barrier Rating
 * multiplied by 20, the vehicle comes to a halt. Use the standard crash rules … If the vehicle's speed is
 * greater than the Barrier Rating multiplied by 20, the barrier collapses and the vehicle continues … The
 * vehicle loses speed after such a collision, however, equal to the Barrier Rating multiplied by 20. The
 * Power of the collision damage equals the Barrier Rating … Use the loss in speed on the Impact Damage
 * Levels Table to determine the Damage Level."* Worked: 300 m/turn into Heavy Structural (BR 16) — 320 >
 * 300, so the cruiser stops.
 *
 * **Braking · SR3 p.142.** *"The increase or decrease is equal to the vehicle's Acceleration Rating,
 * multiplied by the number of successes generated on the test … If a vehicle decelerates more than its
 * Acceleration Rating x 4, it must make a Crash Test."* The book has no stopping-distance rule, so none is
 * invented: the speed left is shown and the GM judges whether the braking was in time.
 *
 * Pure: no Foundry globals.
 */

export const STAGES = ['L', 'M', 'S', 'D'];

export const PAGES = {
  pedestrian: 'SR3 p.148',
  vehicle:    'SR3 p.143, p.147',
  barrier:    'SR3 p.148',
  braking:    'SR3 p.142',
};

const num = v => Math.max(0, Number(v) || 0);
const whole = v => Math.max(0, Math.trunc(Number(v) || 0));

function needTable(table) {
  if (typeof table !== 'function') throw new Error('Collisions: pass the Impact Damage Levels Table (SR3EActor.crashDamage) as `table`');
  return table;
}

export const Collisions = {
  /** One stage up the L-M-S-D ladder, capped at Deadly. */
  stageUp(level) {
    const i = STAGES.indexOf(level);
    return i < 0 ? 'L' : STAGES[Math.min(STAGES.length - 1, i + 1)];
  },

  /** One stage down; `null` once it falls off the bottom (no damage). */
  stageDown(level) {
    const i = STAGES.indexOf(level) - 1;
    return i >= 0 ? STAGES[i] : null;
  },

  /**
   * A vehicle hits a person or critter · SR3 p.148.
   * @param {{speed:number, table:Function}} o  `speed` in m/turn
   * @returns {{ speed:number,
   *   pedestrian:{ power:number, level:'L'|'M'|'S'|'D', pastDeadly:boolean },
   *   vehicle:{ power:number, level:'L'|'M'|'S'|null } }}
   */
  pedestrian({ speed = 0, table } = {}) {
    const base = needTable(table)(num(speed));
    // The table's level one stage HIGHER. From Destroyed there is nowhere to go, so the Power grows by half.
    const pastDeadly = base.level === 'D';
    return {
      speed: num(speed),
      pedestrian: {
        power: pastDeadly ? base.power + Math.floor(base.power / 2) : base.power,
        level: Collisions.stageUp(base.level),
        pastDeadly,
      },
      // The vehicle faces the same Power at one stage LOWER — Light falls off the bottom: no damage.
      vehicle: { power: base.power, level: Collisions.stageDown(base.level) },
    };
  },

  /**
   * Two vehicles collide · SR3 p.143, p.147.
   * @param {object} o
   * @param {number} [o.speedA]    the acting vehicle (the rammer), m/turn
   * @param {number} [o.speedB]    the other vehicle, m/turn
   * @param {number} [o.speedDiff] the difference directly — wins over A and B (a head-on is the GM's call)
   * @param {{successes:number, body:number}|null} [o.ram] a RAM: the rammer's Ramming Test successes and
   *   Body. Null is an accident, where nobody's Power is reduced.
   * @param {Function} o.table
   * @returns {{ diff:number, power:number, level:string, first:{power:number}, other:{power:number} }}
   *   `first` is the acting vehicle's Power, `other` the target's (never reduced).
   */
  vehicle({ speedA = 0, speedB = 0, speedDiff = null, ram = null, table } = {}) {
    const diff  = speedDiff == null ? Math.abs(num(speedA) - num(speedB)) : num(speedDiff);
    const t     = needTable(table)(diff);
    const cut   = ram ? whole(ram.body) * whole(ram.successes) : 0;
    // p.147: the Power drops, never the level; "Target numbers cannot be reduced below 2".
    const first = Math.min(t.power, Math.max(2, t.power - cut));
    return { diff, power: t.power, level: t.level, first: { power: first }, other: { power: t.power } };
  },

  /**
   * A vehicle meets a wall · SR3 p.148.
   * @returns {{ rating:number, threshold:number, breaksThrough:boolean, speedAfter:number,
   *   lost:number, power:number|null, level:string|null }}
   *   Stopped: `power`/`level` are null — resolve it as an ordinary crash at `speed`.
   */
  barrier({ speed = 0, rating = 0, table } = {}) {
    const v         = num(speed);
    const br        = whole(rating);
    const threshold = br * 20;
    if (v <= threshold) {
      return { rating: br, threshold, breaksThrough: false, speedAfter: 0, lost: v, power: null, level: null };
    }
    // The barrier collapses; the vehicle loses BR × 20, and the level reads that LOSS off the table.
    return {
      rating: br, threshold, breaksThrough: true, speedAfter: v - threshold, lost: threshold,
      power: br, level: needTable(table)(threshold).level,
    };
  },

  /**
   * The Braking Test · SR3 p.142.
   * @returns {{ speedAfter:number, reduction:number, crashTest:boolean }}
   *   `crashTest`: it decelerated MORE than Acceleration × 4 (not "at least").
   */
  braking({ speed = 0, acceleration = 0, successes = 0 } = {}) {
    const v         = num(speed);
    const asked     = whole(acceleration) * whole(successes);
    const reduction = Math.min(v, asked);
    return { speedAfter: v - reduction, reduction, crashTest: reduction > whole(acceleration) * 4 };
  },

  /**
   * How many hits a pedestrian's optional dodge must beat. ⚠ A HOUSE RULE — the book has no dodge against
   * a vehicle. A ram is opposed by the Ramming Test's own successes (the ordinary Dodge Test comparison,
   * p.113: a tie goes to the attacker). An accident has no successes — the driver was trying to stop — so
   * the weakest hit is assumed, one: the pedestrian needs two to leap clear. The GM may type any number.
   * @param {{how:'ram'|'accident', ramSuccesses?:number, override?:number|string|null}} o
   */
  dodgeToBeat({ how = 'accident', ramSuccesses = 0, override = null } = {}) {
    const typed = override === '' || override == null ? null : Number(override);
    if (typed != null && Number.isFinite(typed)) return Math.max(0, Math.trunc(typed));
    return how === 'ram' ? Math.max(1, whole(ramSuccesses)) : 1;
  },
};
