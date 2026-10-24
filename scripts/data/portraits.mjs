/**
 * Portraits from an optional portrait module · TODO 262 ("Meet the contact").
 *
 * ⚠ **The system works with no portrait module installed** and never names one. Any ACTIVE module
 * whose manifest carries the flag below is a source; with none, every function here returns
 * nothing and the picker hides itself.
 *
 *   module.json   "flags": { "The2ndChumming3e": { "portraits": { "index": "portraits/index.json", "schema": 1 } } }
 *   index.json    { schema: 1, count, jobs: { job: group }, archetypes: { "<actor name>": { job, exact, ages? } },
 *                   entries: [ { path, metatype, base, gender, age, minor, lifestyle, job, group, ethnicity } ] }
 *   path          relative to the module folder; the image URL is `modules/<id>/<path>`.
 *
 * The module's builder (`build_index.py` in the portrait repo) refuses orphans and unapproved models, so
 * this side only checks shape. The contract is also written down in `.claude/rules/portraits.md`.
 *
 * ⚠ **Offer, never apply.** Nothing here writes a document; `isStockImg` tells a caller whether an
 * actor's picture is one nobody chose, which is the only time a dialog may PRESELECT a portrait.
 *
 * Pure — no Foundry.
 */

export const SCHEMA = 1;
export const FLAG_SCOPE = 'The2ndChumming3e';
const MYSTERY_MAN = 'icons/svg/mystery-man.svg';

/** The system's metatypes (config.js) — what a portrait's `base` must be. */
export const BASES = ['human', 'elf', 'dwarf', 'ork', 'troll', 'other'];

/** Seattle's population by system metatype, for "🎲 Seattle mix" (the maintainer's figures, 2026-10-24). */
export const DEMOGRAPHICS = { human: 0.65, ork: 0.16, elf: 0.12, dwarf: 0.03, troll: 0.025, other: 0.015 };

export class Portraits {
  /** A metatype drawn by population weight. */
  static rollMetatype(rng = Math.random, weights = DEMOGRAPHICS) {
    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    let r = rng() * total;
    for (const [k, w] of Object.entries(weights)) {
      if ((r -= w) < 0) return k;
    }
    return Object.keys(weights)[0];
  }

  /**
   * Active modules that publish a portrait index: `[{ moduleId, url }]`.
   * @param {Iterable<{id, active, flags?}>} modules  e.g. `game.modules`
   */
  static sources(modules) {
    const out = [];
    for (const m of modules ?? []) {
      const p = m?.active && m.flags?.[FLAG_SCOPE]?.portraits;
      if (!p || p.schema !== SCHEMA || typeof p.index !== 'string' || !p.index) continue;
      if (p.index.includes('..') || /^[a-z]+:|^\//i.test(p.index)) continue;   // stays inside the module
      out.push({ moduleId: m.id, url: `modules/${m.id}/${p.index}` });
    }
    return out;
  }

  /**
   * Check an index's shape. Returns `{ ok, error?, entries, archetypes, jobs }`; bad entries are dropped,
   * a bad index yields `ok: false` and empty lists (a broken module never breaks the system).
   */
  static validate(json, moduleId) {
    const empty = { ok: false, entries: [], archetypes: {}, jobs: {} };
    if (!json || typeof json !== 'object') return { ...empty, error: 'not an object' };
    if (json.schema !== SCHEMA) return { ...empty, error: `schema ${json.schema}, expected ${SCHEMA}` };
    if (!Array.isArray(json.entries)) return { ...empty, error: 'no entries' };
    const entries = json.entries
      .filter(e => e && typeof e.path === 'string' && !e.path.includes('..') && /\.(webp|png|jpe?g)$/i.test(e.path)
        && typeof e.metatype === 'string' && BASES.includes(e.base)
        && (e.gender === 'female' || e.gender === 'male') && typeof e.job === 'string')
      .map(e => ({ ...e, minor: !!e.minor, moduleId, src: `modules/${moduleId}/${e.path}` }));
    const archetypes = json.archetypes && typeof json.archetypes === 'object' ? json.archetypes : {};
    const jobs = json.jobs && typeof json.jobs === 'object' ? json.jobs : {};
    return { ok: true, entries, archetypes, jobs };
  }

  /** Merge several validated indexes into one. */
  static merge(indexes) {
    const out = { entries: [], archetypes: {}, jobs: {} };
    for (const ix of indexes) {
      if (!ix?.ok) continue;
      out.entries.push(...ix.entries);
      Object.assign(out.jobs, ix.jobs);
      for (const [k, v] of Object.entries(ix.archetypes)) out.archetypes[k] ??= v;
    }
    return out;
  }

  /** 'female' | 'male' | null from whatever a sheet's free-text gender holds. */
  static normaliseGender(text) {
    const s = String(text ?? '').trim().toLowerCase();
    if (/^(f|female|woman|women|girl|she|her)\b/.test(s)) return 'female';
    if (/^(m|male|man|men|boy|he|him)\b/.test(s)) return 'male';
    return null;
  }

  /** The portrait job for a Little Black Book archetype name, or null. */
  static archetypeJob(index, actorName) {
    return index?.archetypes?.[actorName] ?? null;
  }

  /**
   * Portraits for a person, best match first, each tagged with how it matched.
   * Tiers, in order — a later tier only fills in when the earlier ones are thin:
   *   1 'exact'     same metatype and job        3 'job'       same job, any metatype
   *   2 'base'      same base metatype and job   4 'group'     same metatype, a job in the same group
   *   5 'metatype'  same metatype, any job
   * Gender and age (when given) filter every tier; minors appear only when `minor` is asked for.
   *
   * @param {{entries, jobs}} index  merged index
   * @param {{metatype, gender?, job?, ages?: string[], minor?: boolean}} want
   * @returns {Array<object>}  entries with `match`
   */
  static candidates(index, want) {
    const entries = index?.entries ?? [];
    const jobs = index?.jobs ?? {};
    const base = BASES.includes(want.metatype) ? want.metatype : null;
    const fits = e => (!want.gender || e.gender === want.gender)
      && (!!want.minor === e.minor)
      && (!want.ages?.length || want.ages.includes(e.age));
    const pool = entries.filter(fits);
    const group = want.job ? jobs[want.job] : null;
    const tiers = [
      ['exact',    e => e.metatype === want.metatype && e.job === want.job],
      ['base',     e => base && e.base === base && e.job === want.job],
      ['job',      e => e.job === want.job],
      ['group',    e => group && e.metatype === want.metatype && jobs[e.job] === group],
      ['metatype', e => e.metatype === want.metatype || (base && e.base === base)],
    ];
    const seen = new Set();
    const out = [];
    for (const [match, test] of tiers) {
      if ((match !== 'metatype' && match !== 'group') && !want.job) continue;
      for (const e of pool) {
        if (seen.has(e.src) || !test(e)) continue;
        seen.add(e.src);
        out.push({ ...e, match });
      }
    }
    return out;
  }

  /** A picture nobody chose: blank, Foundry's mystery man, or a core placeholder icon. */
  static isStockImg(img) {
    return !img || img === MYSTERY_MAN || String(img).startsWith('icons/svg/');
  }
}
