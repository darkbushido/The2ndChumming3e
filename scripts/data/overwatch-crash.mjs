/**
 * Overwatch's second trigger — crashing an icon · MDF p.22, p.26 · TODO 128.
 *
 * *"Overwatch is tracked on the Security Sheaf … Failing a test using the Hacking skill · Crashing an icon
 * without Suppressing it"* (p.22). *"Deckers who crash an icon while running Suppression in an active
 * utility slot, may degrade 1 point of the utility's rating, to avoid accruing Overwatch"* (p.26).
 *
 * Offer, never apply: the GM says an icon crashed; this module only works out what each choice costs.
 * Pure: no Foundry globals.
 */

const whole = n => Math.max(0, Math.floor(Number(n) || 0));

export const OverwatchCrash = {
  /** A program's working rating: the degraded `currentRating` if set, else its `rating`. */
  effectiveRating(sys) {
    const cur = whole(sys?.currentRating);
    return cur > 0 ? cur : whole(sys?.rating);
  },

  /** The decker's Suppression program (name match), or null. */
  findSuppression(items) {
    return [...(items ?? [])].find(i => /^suppression\b/i.test(i?.name ?? '')
      && OverwatchCrash.effectiveRating(i.system) > 0) ?? null;
  },

  /**
   * What a crash costs. `suppress` is the decker's choice; it is only honoured with Suppression running.
   * → { overwatch: 0|1, degrade: 0|1, suppressed, newRating }
   */
  resolve({ suppressionRating = 0, suppress = false } = {}) {
    const rating = whole(suppressionRating);
    if (suppress && rating > 0) {
      return { overwatch: 0, degrade: 1, suppressed: true, newRating: rating - 1 };
    }
    return { overwatch: 1, degrade: 0, suppressed: false, newRating: rating };
  },
};
