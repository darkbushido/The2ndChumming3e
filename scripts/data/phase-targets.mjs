/**
 * Who has been shot at this Combat Phase · SR3 p.111, p.116 (TODO 56.2). Pure — no Foundry.
 *
 * > "If a character is attacking multiple targets within a single Combat Phase, he adds a +2 modifier per
 * > additional target." — p.111. Walking full-auto fire wastes a round per metre between targets (p.116).
 *
 * The fire dialog used to ask for both by hand, and nothing warned when a player forgot they had already
 * shot at someone. The actor keeps `system.targetsThisPhase = { phase, targets: [{ key, tokenId }] }`,
 * where `phase` is the action ledger's `round|turn` key (TODO 48). A record from another phase reads as
 * empty, so nothing has to clear it on time; `resetRecoil` clears it too.
 *
 * ⚠ **The ordinal counts TARGETS, not shots.** A second burst at someone already shot keeps that target's
 * ordinal. Both dialog fields are PREFILLED from this, never enforced.
 */
export const PhaseTargets = {
  /** The empty record. ⚠ Write this to clear, never `{}` — an ObjectField update MERGES, so `{}` changes nothing. */
  EMPTY: Object.freeze({ phase: '', targets: [] }),

  /** A record as a full, fresh `{ phase, targets }` — for snapshots and writes. */
  normalize(record) {
    return { phase: record?.phase ?? '', targets: (record?.targets ?? []).map(t => ({ ...t })) };
  },

  /** The targets engaged in `phase`, in order — empty for a record from another phase. */
  current(record, phase) {
    return record && record.phase === phase && Array.isArray(record.targets) ? record.targets : [];
  },

  /** This target's ordinal: its place in the list, or next in line for a new one. */
  ordinal(targets, key) {
    const i = (targets ?? []).findIndex(t => t.key === key);
    return i >= 0 ? i + 1 : (targets ?? []).length + 1;
  },

  /** The target engaged just before `key` — the one the fire walks FROM (null if none). */
  previous(targets, key) {
    const list = (targets ?? []).filter(t => t.key !== key);
    return list.length ? list[list.length - 1] : null;
  },

  /** The record with `key` added (once), for `phase`. */
  add(record, phase, key, tokenId = null) {
    const targets = PhaseTargets.current(record, phase);
    if (targets.some(t => t.key === key)) return { phase, targets };
    return { phase, targets: [...targets, { key, tokenId }] };
  },
};
