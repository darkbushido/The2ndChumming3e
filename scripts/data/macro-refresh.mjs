/**
 * Keeping the system's world macros current — TODO 260 (found in the live walk, 2026-10-24).
 *
 * `sr3e.js` creates the system's world macros from `scripts/macros/*.js` on first load, and used to skip any
 * macro that already existed — so a world kept the command text it was created with, and a fix to the file
 * (the Chrome Threat Generator's ModRatings) never reached it. The `ready` hook now REFRESHES them.
 *
 * Which macros are the system's: one carrying the flag `flags.The2ndChumming3e.macroPath`, or — for a macro made
 * before the flag existed — a SCRIPT macro with exactly the managed name (it is adopted: flagged, then
 * refreshed). A macro the GM made themselves (no flag, another name) is never touched.
 */

/** The flag namespace and key a managed macro carries. */
export const FLAG_SCOPE = 'The2ndChumming3e';
export const FLAG_KEY   = 'macroPath';

/** Line endings differ between a Windows checkout and a fetched file; they are not a change. */
const norm = s => String(s ?? '').replace(/\r\n?/g, '\n');

export const MacroRefresh = {
  /** The path flag of a macro document (or plain data), or ''. */
  pathFlag(macro) {
    return String(macro?.flags?.[FLAG_SCOPE]?.[FLAG_KEY] ?? macro?.getFlag?.(FLAG_SCOPE, FLAG_KEY) ?? '');
  },

  /**
   * The macro in `macros` that this definition manages, or null: flagged with its path first, else an
   * unflagged script macro of exactly its name. A flagged macro for ANOTHER path is never adopted.
   */
  find(def, macros) {
    const list = [...(macros ?? [])];
    const flagged = list.find(m => MacroRefresh.pathFlag(m) === def.path);
    if (flagged) return flagged;
    return list.find(m => m?.name === def.name && m?.type === 'script' && !MacroRefresh.pathFlag(m)) ?? null;
  },

  /**
   * What to do with one managed macro given the file's current body `src`:
   *   'create'  — none exists;
   *   'adopt'   — an old unflagged macro of the managed name: flag it (and refresh its body if it differs);
   *   'refresh' — flagged, body differs;
   *   'skip'    — flagged and already current.
   */
  decide(def, existing, src) {
    if (!existing) return 'create';
    const same = norm(existing.command) === norm(src);
    if (!MacroRefresh.pathFlag(existing)) return 'adopt';
    return same ? 'skip' : 'refresh';
  },

  /** The update to write for an 'adopt' / 'refresh' decision (flag always set, command only if it differs). */
  changes(def, existing, src) {
    const out = { [`flags.${FLAG_SCOPE}.${FLAG_KEY}`]: def.path };
    if (norm(existing?.command) !== norm(src)) out.command = src;
    return out;
  },

  /** The data to create a managed macro with. */
  createData(def, src) {
    return { name: def.name, type: 'script', command: src, img: def.img, flags: { [FLAG_SCOPE]: { [FLAG_KEY]: def.path } } };
  },
};
