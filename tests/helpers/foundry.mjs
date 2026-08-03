/**
 * Minimal Foundry globals, so system classes can be imported outside Foundry.
 *
 * The system's document classes are declared as `extends Item` / `extends Actor` /
 * `extends Combat`, and those base classes are resolved at MODULE EVALUATION time. So the
 * stubs have to be installed before the first import, not before the first call — see
 * `installGlobals()` usage in the test files.
 *
 * These are stubs, not a Foundry emulator. They exist to let pure logic — dice pools,
 * queue ordering, parsers — be exercised without a browser. Anything that genuinely needs
 * Foundry (rendering, persistence, hooks) belongs in TESTING.md as a manual check.
 */

/** Install the base classes and ambient globals every system module expects at import. */
export function installGlobals() {
  globalThis.Item   ??= class {};
  globalThis.Actor  ??= class {};
  globalThis.Combat ??= class {};
  globalThis.ui     ??= { notifications: { info() {}, warn() {}, error() {} } };
  globalThis.CONFIG ??= {};
  globalThis.CONST  ??= { CHAT_MESSAGE_STYLES: { ROLL: 0 } };
  globalThis.ChatMessage ??= { create: async () => {}, getSpeaker: () => ({}) };
  globalThis.foundry ??= {
    applications: { api: { ApplicationV2: class {}, DialogV2: { wait: async () => {} } } },
    utils: { randomID: () => 'stub' },
  };
}

/**
 * A Roll stub that returns a scripted sequence of totals, so dice-dependent behaviour is
 * deterministic. Values are consumed in order; once exhausted it yields `fallback`.
 *
 *   const dice = useScriptedRolls([6, 2]);
 *   ...
 *   dice.remaining()   // how many were left unused
 */
export function useScriptedRolls(sequence = [], fallback = 1) {
  const queue = [...sequence];
  globalThis.Roll = class {
    constructor(_formula) {}
    async evaluate() { this.total = queue.length ? queue.shift() : fallback; return this; }
  };
  return { remaining: () => queue.length, push: (...v) => queue.push(...v) };
}

/** A fake Actor with just the fields the roll paths read. */
export function makeActor({ id = 'actor', name = id, type = 'character', attributes = {},
                            derived = {}, items = [], system = {} } = {}) {
  const attrs = {};
  for (const [k, v] of Object.entries(attributes)) attrs[k] = typeof v === 'number' ? { base: v, value: v } : v;
  return {
    id, name, type, items,
    system: { attributes: attrs, derived, ...system },
    getActiveTokens: () => [],
  };
}

/** A fake skill Item. */
export function makeSkill(name, rating, { specialisation = '', category = '' } = {}) {
  return { type: 'skill', name, system: { rating, skillRating: rating, specialisation, category } };
}

/**
 * Install a fake `game`. Pass `packs` as plain declaration objects and they gain the
 * `metadata.flags` shape the pack helpers expect.
 */
export function installGame({ settings = {}, packs = [], actors = [], systemId = 'The2ndChumming3e', sr3e = {} } = {}) {
  const packList = packs.map(p => ({
    collection: `${systemId}.${p.name}`,
    metadata: { flags: p.flags ?? {} },
  }));
  globalThis.game = {
    system: { id: systemId },
    settings: { get: (_ns, key) => settings[key] },
    packs: packList,
    actors: Object.assign([...actors], {
      contents: actors,
      get: id => actors.find(a => a.id === id) ?? null,
    }),
    sr3e,
    users: { activeGM: { isSelf: true } },
  };
  return globalThis.game;
}
