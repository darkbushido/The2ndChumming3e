/**
 * Vehicle Control Rig and Control Pool — pure rules (TODO 167, rules check 0.6.1).
 *
 * > "Each level adds +2 to the user's Reaction and +1D6 Initiative dice while rigging."
 * >                                                                          — SR3 p.301
 * > "A rigger's Control Pool is equal to the character's Reaction, modified only by his or her
 * > vehicle control rig (VCR) cyberware. Reaction bonuses from other sources are of no help. …
 * > The maximum number of Control Pool dice that a character can add to any control-related
 * > test is equal to the base number of skill dice involved in the test. Only characters with a
 * > Vehicle Control Rig (see p. 301) can use a Control Pool."                  — SR3 p.44
 * > "Reaction and Initiative dice bonuses from a vehicle control rig apply only to characters
 * > who are jacked into and driving a rigger-equipped vehicle. Bonuses for boosted and wired
 * > reflexes … do NOT apply"                                                   — SR3 p.140
 *
 * ⚠ **+2 Reaction per level, not +1.** Both VCR initiative paths, the chase and the gunnery Control
 * Pool added the level once until 0.6.1.
 * ⚠ **The Control Pool is NOT the Vehicle Skill.** The skill is the per-test CAP (p.44, restated on
 * p.134 and p.147); the pool is Reaction + 2 × VCR. The two are easy to conflate because the cap is
 * usually the smaller, which is why the chase and the Driving Test read the skill for so long.
 * ⚠ **No VCR, no Control Pool** — p.141's cops *"are not rigged, so they get no Control Pool dice"*.
 * `reactionBase` is the UNAUGMENTED Reaction: wired reflexes and the rest do not apply (p.140).
 */

const whole = n => Math.max(0, Math.floor(Number(n) || 0));

export class Rigging {
  /** Reaction while jacked in: base + 2 per VCR level (p.301). */
  static vcrReaction(reactionBase, vcrLevel) {
    return whole(reactionBase) + 2 * whole(vcrLevel);
  }

  /** Initiative dice while jacked in: 1 + 1 per VCR level (p.301). */
  static vcrInitiativeDice(vcrLevel) {
    return 1 + whole(vcrLevel);
  }

  /** The Control Pool: Reaction + 2 × VCR, and 0 without a VCR (p.44). */
  static controlPool(reactionBase, vcrLevel) {
    return whole(vcrLevel) > 0 ? Rigging.vcrReaction(reactionBase, vcrLevel) : 0;
  }

  /** Control Pool dice one test may take: what is left, up to the test's base skill dice (p.44). */
  static controlPoolDice(available, skillDice) {
    return Math.min(whole(available), whole(skillDice));
  }

  /* ── Drones run from a remote-control deck · SR3 p.154 ─────────────────────────────────────────
   * > "A rigger may operate only one drone in his or her network in primary mode. This mode enables
   * > the rigger to control the drone as if he or she were directly jacked into it. The rigger may
   * > use Combat and Control Pool dice … and receives all rigger bonuses for those tests. Success
   * > Tests for drones in secondary mode are made with the drones' Pilot Ratings rather than the
   * > rigger's Skill or Attribute Ratings. Combat or Control Pool dice may not be added"
   * > "Even though he is in captain's chair mode, Rigger X receives his usual Initiative bonus"
   *
   * The system's modes map onto the book's: **VCR** = jumped into the primary drone (one vehicle per
   * character, as the book allows one primary); **RCD** = a secondary drone, or the captain's chair;
   * **Auto** = no rigger at all.
   * ⚠ RCD used to roll the RIGGER's Gunnery and Driving skill for the drone, and dropped the rigger's
   * VCR Initiative — both the opposite of p.154 (found writing the Drones guide, 2026-10-12).
   */

  /** Who supplies the dice for a drone's own test: `'rigger'` (jumped in) or `'pilot'` (Pilot Rating). */
  static droneTestRoller(controlMode, hasRigger) {
    return hasRigger && controlMode === 'vcr' ? 'rigger' : 'pilot';
  }

  /** Does the rigger roll VCR Initiative? Jumped in always; in the captain's chair (RCD) only with a VCR. */
  static usesVcrInitiative(controlMode, vcrLevel) {
    if (controlMode === 'vcr') return true;
    return controlMode === 'rcd' && whole(vcrLevel) > 0;
  }
}
