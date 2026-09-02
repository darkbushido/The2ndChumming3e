/**
 * Parse `scripts/macros/populate-mr-johnsons-contacts.js` · TODO 84 / 86
 *
 * The generator is the source of truth for the 62 Little Black Book contacts: the shipped packs
 * are built by running it inside Foundry. Several tools need to read it — the audit, and the
 * pack patcher that carries its corrections into `packs/` without a full rebuild.
 *
 * ⚠ **THIS EXISTS BECAUSE THE SAME PARSER WAS WRITTEN THREE TIMES AND TWO WERE WRONG.** Both
 * ad-hoc versions silently read every record as `baseActor`'s DEFAULTS — I3 W3 C3, karma null —
 * and produced confident, wrong tables that were only caught by spot-checking against a record
 * whose real values were already known. One parser, used everywhere, checked once.
 *
 * ⚠ **The defaults below MUST match `baseActor`'s own signature.** An omitted attribute is not
 * "no value", it is 3 — and an omitted `karma` is `null`, not 0. Getting this wrong is exactly
 * how the Metroplex Guardsman stub hid in plain sight: every one of its attributes was the
 * function's default and nothing looked unusual.
 */

/** `baseActor`'s own defaults. Keep in step with the macro. */
export const BASE_ACTOR_DEFAULTS = {
  metatype: 'human', body: 3, quickness: 3, strength: 3,
  intelligence: 3, willpower: 3, charisma: 3, essence: 6, magic: 0,
};

/**
 * @param {string} src  the macro's source text
 * @returns {Map<string, object>} keyed by UPPER-CASE contact name. Each entry carries the
 *          parsed values plus `_start`/`_end`, the offsets of its object literal in `src`, so
 *          a caller can rewrite exactly that span.
 */
export function parseGenerator(src) {
  const gen = new Map();
  // baseActor('Name', page, { … }) — non-greedy to the `}` that closes the object.
  for (const m of src.matchAll(/baseActor\(\s*'([^']+)'\s*,\s*(\d+)\s*,\s*\{([\s\S]*?)\}\s*\)/g)) {
    const [, name, page, bodyText] = m;
    const num = (k) => {
      const v = new RegExp(`\\b${k}\\s*:\\s*(-?\\d+(?:\\.\\d+)?|null)`).exec(bodyText);
      return !v || v[1] === 'null' ? null : Number(v[1]);
    };
    const str = (k) => (new RegExp(`\\b${k}\\s*:\\s*'([^']*)'`).exec(bodyText) ?? [])[1] ?? null;
    const D = BASE_ACTOR_DEFAULTS;
    gen.set(name.toUpperCase(), {
      _start: m.index + m[0].indexOf('{') + 1,
      _end:   m.index + m[0].lastIndexOf('}'),
      name, page: Number(page),
      metatype:     str('metatype')     ?? D.metatype,
      body:         num('body')         ?? D.body,
      quickness:    num('quickness')    ?? D.quickness,
      strength:     num('strength')     ?? D.strength,
      intelligence: num('intelligence') ?? D.intelligence,
      willpower:    num('willpower')    ?? D.willpower,
      charisma:     num('charisma')     ?? D.charisma,
      essence:      num('essence')      ?? D.essence,
      magic:        num('magic')        ?? D.magic,
      // ⚠ No default. `null` means the macro states none, which is NOT the same as zero —
      // `baseActor` writes `karmaPool: karmaPool ?? karma ?? 0` and `pr` reaches only the note.
      pr:    num('pr'),
      karma: num('karma'),
      /* Every `skill(...)` call in this contact's `items:` array, in file order.
       *
       * ⚠ **The block runs from this `baseActor(` to the NEXT one**, not to the closing brace.
       * Counting braces would mean tracking the nested objects inside `items:`; the entries are
       * strictly sequential in the file, so the next `baseActor(` is a reliable terminator and
       * the last entry simply runs to end-of-file. */
      skills: [],
    });
  }

  // Second pass: slice each contact's block and pull its skill() calls out.
  const entries = [...gen.values()].sort((a, z) => a._start - z._start);
  entries.forEach((e, i) => {
    const end = i + 1 < entries.length ? entries[i + 1]._start : src.length;
    const block = src.slice(e._end, end);
    /* ⚠ **Escaped apostrophes must be handled.** `Charge's Habits` is a real knowledge skill
     * (Corp Bodyguard, p.48) and the generator writes it `'Charge\'s Habits'`. A naive
     * `'([^']*)'` stops at the backslash-quote and the call is not captured at all — which the
     * audit then reports as a skill missing from the generator when it is plainly there. This
     * was the documented "safe failure" until the regeneration actually produced one. */
    const STR = "'((?:[^'\\\\]|\\\\.)*)'";
    const CALL = new RegExp(
      `\\bskill\\(\\s*${STR}\\s*,\\s*(\\d+)\\s*,\\s*${STR}\\s*`
      + `(?:,\\s*${STR}\\s*)?(?:,\\s*${STR}\\s*)?\\)`, 'g');
    const unesc = (x) => String(x ?? '').replace(/\\(.)/g, '$1');
    for (const sm of block.matchAll(CALL)) {
      e.skills.push({
        name:   unesc(sm[1]),
        rating: Number(sm[2]),
        attr:   unesc(sm[3]),
        tier:   sm[4] ? unesc(sm[4]) : 'active',
        spec:   unesc(sm[5]),
      });
    }
  });
  return gen;
}
