/**
 * World migrations — bring documents already in play up to date with a system change.
 *
 * ⚠ **FOUNDRY EMBEDS ITEMS, IT DOES NOT LINK THEM.** An actor holding "Enhanced Articulation"
 * carries its OWN copy, made at drag time. Correcting the compendium entry changes nothing for
 * anyone who already has one, and there is no relink — the copy belongs to that character now,
 * deliberately, because players customise them. So a pack fix needs a second pass over the
 * world, and this is it.
 *
 * ⚠ **Compendium packs are NOT migrated here, and that is on purpose.** Packs ship as files
 * with the system, so a pack correction belongs in the pack itself (see
 * `tools/patch-enhanced-articulation.mjs`) rather than being re-applied in every world on every
 * load. This migrates what the world owns.
 *
 * ## Adding a migration
 *
 * Append to `MIGRATIONS` with the system version that introduces it. Entries run in order, and
 * only those newer than the world's stored version run at all.
 *
 * Two rules, both learned from the shape of this system rather than invented:
 *
 * 1. **Fill blanks; do not overwrite decisions.** A GM who has already typed a value keeps it.
 *    Every field patch here goes through `_fillBlank`.
 * 2. **Be idempotent.** Re-running must be a no-op. The version stamp is a fast path, not a
 *    guarantee — a half-finished run leaves the stamp unchanged and the next load repeats it.
 */

import { SRCG_BONUSES } from './data/srcg-bonuses.js';

const SYSTEM = 'The2ndChumming3e';
const SETTING = 'systemMigrationVersion';

/**
 * Fill a field only when the document has no meaningful value there.
 *
 * `0` and `''` count as unset: these are schema defaults on `NumberField`/`StringField`, so a
 * field that has never been touched is indistinguishable from one deliberately set to its
 * default. Treating them as unset is what makes the migration useful at all; the cost is that
 * a GM who deliberately set 0 gets it refilled once, which is why migrations are narrow and
 * name a specific item rather than sweeping a type.
 */
function _fillBlank(system, field, value) {
  const current = system?.[field];
  const unset = current === undefined || current === null || current === '' || current === 0;
  if (!unset || current === value) return null;
  return value;
}

/**
 * Patch embedded items on one actor by NAME.
 *
 * @returns {object|null} an update payload for `actor.update`, or null when nothing changed
 */
function _patchItemsByName(actor, byName, fixItem = null) {
  const items = actor?.items ?? [];
  const changed = [];

  for (const item of items) {
    const patch = byName[item.name];
    if (!patch) continue;
    // ⚠ `type` is a GUARD, not a field. This map is keyed by name alone and now spans
    // cyberware, bioware and adept powers, so without it a shared name would write one
    // type's bonuses onto another's item — and `system.type` is not a field any of them has.
    // An entry with no `type` (a hand-written migration like Enhanced Articulation) matches
    // any item, which is the old behaviour and stays correct for a name naming one thing.
    if (patch.type && item.type !== patch.type) continue;
    const delta = {};
    for (const [field, value] of Object.entries(patch)) {
      if (field === 'type') continue;
      const v = _fillBlank(item.system, field, value);
      if (v !== null) delta[`system.${field}`] = v;
    }
    if (Object.keys(delta).length) changed.push({ _id: item.id, ...delta });
  }

  /* ── The corrective pass ────────────────────────────────────────────────────────
   *
   * ⚠ **This is the only thing here that OVERWRITES.** Every other migration fills blanks
   * and a GM who typed a value keeps it — that rule exists because a migration cannot tell
   * a deliberate choice from a default.
   *
   * A fixer is for the case where it can: a value that is not merely different but
   * *meaningless on that document*, and actively wrong. It runs separately, returns an
   * explicit delta or null, and each one has to argue for itself at the call site.
   */
  if (fixItem) {
    for (const item of items) {
      const delta = fixItem(item);
      if (delta && Object.keys(delta).length) {
        const existing = changed.find(c => c._id === item.id);
        if (existing) Object.assign(existing, delta);
        else changed.push({ _id: item.id, ...delta });
      }
    }
  }

  return changed.length ? changed : null;
}

/**
 * The migrations themselves.
 *
 * `version` is the system version that INTRODUCES the change — a world on that version or
 * newer has already had it.
 */
const MIGRATIONS = [
  {
    version: '0.4.5.4',
    label: 'Enhanced Articulation — category skill bonus (M&M p.66)',
    /**
     * TODO 10 added `improvedSkillCategory`, and the compendium entry was corrected in the
     * pack. Actors who already owned a copy still carry the empty version, so the Roll Skill
     * dialog offers them nothing.
     *
     * ⚠ Five categories, not four — the book's Vehicle sentence is easy to miss.
     * ⚠ Commas only; "Build/Repair skills" contains a slash.
     */
    items: {
      'Enhanced Articulation': {
        improvedSkillCategory:
          'Combat skills, Physical skills, Technical skills, Build/Repair skills, Vehicle skills',
        improvedSkillDice: 1,
      },
    },
  },
  {
    version: '0.4.5.5',
    label: 'Cyberware/bioware attribute bonuses from the SRCG `Mods` field (TODO 8)',
    /**
     * No shipped cyberware or bioware document carried a single `bonus*` value — the `v2`
     * populate rewrite dropped the parsing the legacy macro had. So every one of them was
     * mechanically inert, which is why Enhanced Articulation appeared to do nothing.
     *
     * The map is generated: `node tools/build-mods-bonuses.mjs`. 142 items.
     *
     * ⚠ Fills blanks only, like every migration here — a GM who typed their own value keeps
     * it. That matters more than usual at this size: this touches 142 item names at once.
     */
    items: SRCG_BONUSES,
  },
  {
    version: '0.4.5.6',
    label: 'Adept powers — bonuses, and clearing Attribute Boost skill dice (TODO 59, 63)',
    /**
     * All 117 shipped adept powers were mechanically inert: `build-mods-bonuses.mjs` read
     * only Cyberware.json and Bioware.json, so no adept power reached `SRCG_BONUSES`, and
     * `AdeptPowerData` declared no `mods` field, so the 14 that ship with a `mods` string
     * lost it at load anyway. Both are fixed; this carries the result to worlds in play.
     *
     * ⚠ `SRCG_BONUSES` is re-applied wholesale rather than filtered to the 9 new adept
     * entries. It fills blanks only, so re-running it over cyberware and bioware changes
     * nothing — and naming a subset here would be a second list to keep in step with the
     * generated one.
     */
    items: SRCG_BONUSES,
    /**
     * ⚠ **The one corrective migration.** It CLEARS a value a GM may have typed.
     *
     * The item sheet offered "Improves Skill" on all 117 powers, so an `Attribute Boost(STR)`
     * could be — and in play was — configured to grant +4 dice to Unarmed Combat. Attribute
     * Boost grants no skill dice under any reading of SR3 p.168: it is an activated,
     * expiring boost to a Physical Attribute, paid for with Drain.
     *
     * So the field is not "a GM's preference this migration should respect". It is a control
     * that should never have been rendered, and the dice it produces are dice the character
     * is not entitled to roll. The sheet no longer offers it; this removes what it left
     * behind.
     *
     * ⚠ Scoped to `attributeBoost` powers ONLY. Improved Ability's `improvedSkillName` is
     * the whole point of that power and must survive untouched.
     */
    fixItem: (item) => {
      if (item.type !== 'adeptpower') return null;
      if (!item.system?.improvedSkillName) return null;
      const kind = globalThis.game?.sr3e?.SR3E?.adeptPowerKind?.(item.name);
      if (kind !== 'attributeBoost') return null;
      console.log(`SR3E | clearing bogus "Improves Skill" on ${item.name} `
        + `(was "${item.system.improvedSkillName}") — SR3 p.168 grants no skill dice`);
      return { 'system.improvedSkillName': '' };
    },
  },
  {
    version: '0.4.5.7',
    label: 'Karma Pool starts at 1 (SR3 p.244, TODO 80)',
    /**
     * > "Every twentieth point has been added to the Karma Pool (**each character starts with
     * > 1 Karma Pool**) and the rest has gone to Good Karma."   — p.244
     *
     * `karmaPool` initialised to 0, so every character has been a point short since the field
     * existed. The schema default is now 1, which fixes new actors and does nothing for
     * anyone already playing.
     *
     * ⚠ **Fill-blanks cannot do this**, and that is the whole difficulty: 0 is both "never
     * touched" and a value a GM may have set on purpose. So this does not fill a blank — it
     * recognises a Pool that still equals **exactly** what the old, wrong formula produced
     * (`⌊total / 20⌋`, with no starting point) and moves it to the right one. A GM who has
     * adjusted the Pool by hand — up or down, including to 0 on a character who should have
     * more — no longer matches, and is left alone.
     *
     * ⚠ A brand-new character has total 0 and Pool 0 under the old formula, 1 under the new,
     * so they are corrected too. That is the intended case, not a false positive.
     */
    fixActor: (actor) => {
      if (actor.type !== 'character' && actor.type !== 'npc') return null;
      const pool  = actor.system?.karmaPool;
      const total = actor.system?.totalKarma ?? 0;
      if (typeof pool !== 'number') return null;
      /* ⚠ Deliberately NOT `karmaPoolForTotal`, which since TODO 81 divides by 10 for
       * humans. This migration corrects the STARTING POINT and nothing else, so it must stay
       * pinned to the arithmetic the old code actually used — `⌊total / 20⌋` for every
       * metatype — plus one. Calling the shared helper would silently turn a documented +1
       * into a 3 → 7 jump for humans, computed from a `totalKarma` that TODO 81 shows was
       * never reliably written. */
      const buggy   = Math.floor(Math.max(0, total) / 20);
      const correct = buggy + 1;
      if (pool !== buggy || pool === correct) return null;   // hand-adjusted, or already right
      console.log(`SR3E | ${actor.name}: Karma Pool ${pool} → ${correct} `
        + '(p.244 — every character starts with 1)');
      return { 'system.karmaPool': correct };
    },
  },
];

export const SR3EMigrations = {

  /** Register the stored version. World-scoped and hidden, like `clocks`. */
  registerSettings() {
    game.settings.register(SYSTEM, SETTING, {
      scope: 'world',
      config: false,
      type: String,
      // '' means "never migrated" — a fresh world stamps the current version and runs
      // nothing, because its documents were created against the current schema.
      default: '',
    });
  },

  /**
   * Run any migrations newer than the world's stored version.
   *
   * ⚠ GM ONLY, and specifically the ACTIVE GM. Every connected GM would otherwise run the
   * same updates simultaneously — the same reasoning as every other authoritative write in
   * this system.
   */
  async migrate() {
    if (!game.user.isGM) return;
    if (game.users.activeGM && !game.users.activeGM.isSelf) return;

    const current = game.system.version;
    const stored = game.settings.get(SYSTEM, SETTING);

    // A world that has never recorded a version: stamp and do nothing. Its documents were
    // created against whatever schema shipped with it, and running historical migrations over
    // them would be guesswork.
    if (!stored) {
      await game.settings.set(SYSTEM, SETTING, current);
      console.log(`SR3E | Migration baseline set to ${current}`);
      return;
    }

    const pending = MIGRATIONS.filter(m => foundry.utils.isNewerVersion(m.version, stored));
    if (!pending.length) return;

    ui.notifications?.info(`SR3E: applying ${pending.length} migration(s) — do not close Foundry.`);
    console.log(`SR3E | Migrating world from ${stored} to ${current}`, pending.map(m => m.version));

    let total = 0;
    for (const m of pending) {
      try {
        total += await SR3EMigrations._apply(m);
      } catch (err) {
        // Leave the stamp alone so the next load retries, and say so loudly. A migration that
        // half-ran and then reported success is the worst outcome available here.
        console.error(`SR3E | Migration ${m.version} failed — version NOT advanced.`, err);
        ui.notifications?.error(`SR3E: migration ${m.version} failed. See the console; it will retry on reload.`);
        return;
      }
    }

    await game.settings.set(SYSTEM, SETTING, current);
    const msg = total
      ? `SR3E: migrated ${total} document(s) to ${current}.`
      : `SR3E: already up to date at ${current}.`;
    console.log(`SR3E | ${msg}`);
    if (total) ui.notifications?.info(msg);
  },

  /**
   * Apply one migration across everything the world owns.
   *
   * ⚠ **Three populations, and the third is the one people forget.** World actors are obvious;
   * world items are easy; **unlinked token actors carry their own actor data on the scene** and
   * are reached through neither. A character dragged onto a scene with "Link Actor Data" off is
   * a separate document living in `scene.tokens[].actor`, and skipping it means the fix works
   * everywhere except the token actually being played.
   */
  /**
   * One actor: its embedded items, then the actor document itself.
   *
   * ⚠ **`fixActor` is the third hook and it is NOT a fill-blanks pass.** `items` fills blank
   * fields by item name and `fixItem` corrects one; both operate on embedded items, which is
   * every migration written before 0.4.5.7. A rule living on the ACTOR — the Karma Pool's
   * starting point — has nowhere to land in either. It returns a delta or `null`, and like
   * `fixItem` it must argue its case at the call site, because it can overwrite.
   */
  async _applyToActor(m, actor, label) {
    let count = 0;
    const updates = _patchItemsByName(actor, m.items ?? {}, m.fixItem);
    if (updates) {
      await actor.updateEmbeddedDocuments('Item', updates);
      count += updates.length;
      console.log(`SR3E | ${m.version}: ${label} — ${updates.length} item(s)`);
    }
    if (m.fixActor) {
      const delta = m.fixActor(actor);
      if (delta) {
        await actor.update(delta);
        count++;
        console.log(`SR3E | ${m.version}: ${label} — actor`, delta);
      }
    }
    return count;
  },

  async _apply(m) {
    let count = 0;
    if (!m.items && !m.fixItem && !m.fixActor) return count;

    // ── World actors ────────────────────────────────────────────────────────
    for (const actor of game.actors) {
      count += await SR3EMigrations._applyToActor(m, actor, actor.name);
    }

    // ── Unlinked token actors, scene by scene ───────────────────────────────
    for (const scene of game.scenes) {
      for (const token of scene.tokens) {
        // A LINKED token shares the world actor already handled above; patching it again
        // would be harmless but doubles the count and the log noise.
        if (token.actorLink) continue;
        const actor = token.actor;
        if (!actor) continue;
        count += await SR3EMigrations._applyToActor(
          m, actor, `${scene.name}/${token.name} (unlinked)`);
      }
    }

    // ── World items sitting loose in the sidebar ────────────────────────────
    // ⚠ Routed through `_patchItemsByName` rather than re-implementing it. This block used
    // to carry its own copy of the fill-blanks loop, so it silently missed the type guard
    // and the corrective fixer the moment either was added — a duplicate that only diverges
    // when someone extends the original, which is the worst time to notice.
    for (const item of game.items) {
      const updates = _patchItemsByName({ items: [item] }, m.items ?? {}, m.fixItem);
      if (!updates) continue;
      const { _id, ...delta } = updates[0];
      void _id;
      await item.update(delta);
      count++;
      console.log(`SR3E | ${m.version}: world item ${item.name}`);
    }

    return count;
  },

  /**
   * Re-run every migration regardless of the stored version, from the console:
   *
   *   game.sr3e.SR3EMigrations.force()
   *
   * For a GM who imported an actor from an older world, or who wants to verify. Safe, because
   * every migration fills blanks only.
   */
  async force() {
    if (!game.user.isGM) return ui.notifications?.warn('GM only.');
    let total = 0;
    for (const m of MIGRATIONS) total += await SR3EMigrations._apply(m);
    await game.settings.set(SYSTEM, SETTING, game.system.version);
    ui.notifications?.info(`SR3E: forced migration touched ${total} document(s).`);
    return total;
  },

  /** Exposed for tests. */
  _migrations: MIGRATIONS,
  _fillBlank,
  _patchItemsByName,
};
