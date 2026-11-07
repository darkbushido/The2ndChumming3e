/**
 * The Security Sheaf — the rules that are numbers · MDF p.23-24 · TODO 128 part 3.
 *
 * p.23: *"Triggered IC activate (rolling into initiative) at the top of the next Combat Phase (-10 from an
 * ICs Initiative for each phase that has already transpired)."*
 * p.24: IC may be assigned "so long as the total Mp size … are less than the host's available Memory
 * (generally System Rating x500Mp)"; Mainframe Support lifts that and is **required for Gray or Black IC**.
 *
 * Reported, never enforced (warn, never refuse). Pure: no Foundry globals.
 */
const whole = n => Math.max(0, Math.floor(Number(n) || 0));

export const SheafRules = {
  /** Initiative modifier for IC triggered in Initiative Pass `pass` (1-based): −10 per phase already past. */
  initiativePenalty(pass) {
    return -10 * Math.max(0, whole(pass) - 1);
  },

  /** The host's default Memory: System Rating × 500 Mp (p.24). */
  defaultMemory(systemRating) {
    return whole(systemRating) * 500;
  },

  /**
   * Check a stocked sheaf. `ic` = [{ name, grading, memoryRequired }].
   * → { used, total, over, graded } where `graded` names Gray/Black IC a host without Mainframe Support
   * should not carry.
   */
  stockingReport({ memoryTotal = 0, mainframeSupport = false, ic = [] } = {}) {
    const used = ic.reduce((s, r) => s + whole(r.memoryRequired), 0);
    const total = whole(memoryTotal);
    const graded = mainframeSupport ? []
      : ic.filter(r => /^(gray|grey|black)$/i.test(r.grading ?? '')).map(r => r.name ?? 'IC');
    return { used, total, over: mainframeSupport ? 0 : Math.max(0, used - total), graded };
  },
};
