/**
 * Sheet fields only the GM may type into · TODO 218. Pure — no Foundry.
 *
 * The maintainer, 2026-10-11: players should not edit their Karma Pool, and (decided with TODO 218) the
 * same goes for Good Karma and Total Karma. Spending is untouched: a roll's "Use Karma Pool", the Spend
 * Karma calculator and the GM-routed verbs all write through `actor.update`, not through the sheet's
 * form, so they never meet this lock.
 *
 * ⚠ **A render-time lock, not a data-model one.** The fields stay ordinary persisted fields; the sheet
 * shows them read-only to a non-GM and, because a sheet submit sends every NAMED input, also keeps the
 * name off them and strips them from the submitted data (`strip`) — a lock that only greys the box
 * would still let a stale or hand-built form write the value.
 * ⚠ It is a curtain on the sheet, not security: a player in the console can still call `actor.update`.
 * That fits the trusted-table ethos; the 📒 Ledger records the edit either way.
 */
export const PAGE = 'TODO 218';

/** Data paths a non-GM cannot type into on the sheet. */
export const FIELDS = Object.freeze([
  'system.karma',           // Good Karma
  'system.totalKarma',      // career total
  'system.karmaPool',       // Karma Pool size
  'system.karmaPoolSpent',  // Karma Pool spent (the "left" box)
]);

export const GmOnlyFields = {
  PAGE, FIELDS,

  /** Is this data path GM-only? */
  isGmOnly(path) { return FIELDS.includes(String(path ?? '')); },

  /** May this user type into `path`? */
  canEdit(path, isGM) { return !!isGM || !FIELDS.includes(String(path ?? '')); },

  /**
   * A copy of submitted form data without the GM-only fields, for a non-GM. Handles both spellings —
   * flat (`{ 'system.karma': 5 }`) and nested (`{ system: { karma: 5 } }`) — because Foundry expands the
   * form before `_prepareSubmitData` returns it. A GM's data is returned untouched.
   */
  strip(data, isGM) {
    if (isGM || !data || typeof data !== 'object') return data;
    const out = JSON.parse(JSON.stringify(data));
    for (const path of FIELDS) {
      delete out[path];
      const parts = path.split('.');
      let node = out;
      for (let i = 0; i < parts.length - 1 && node && typeof node === 'object'; i++) node = node[parts[i]];
      if (node && typeof node === 'object') delete node[parts[parts.length - 1]];
    }
    return out;
  },
};
