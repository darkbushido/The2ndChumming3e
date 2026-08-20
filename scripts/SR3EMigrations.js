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
function _patchItemsByName(actor, byName) {
  const items = actor?.items ?? [];
  const changed = [];

  for (const item of items) {
    const patch = byName[item.name];
    if (!patch) continue;
    const delta = {};
    for (const [field, value] of Object.entries(patch)) {
      const v = _fillBlank(item.system, field, value);
      if (v !== null) delta[`system.${field}`] = v;
    }
    if (Object.keys(delta).length) changed.push({ _id: item.id, ...delta });
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
  async _apply(m) {
    let count = 0;
    if (!m.items) return count;

    // ── World actors ────────────────────────────────────────────────────────
    for (const actor of game.actors) {
      const updates = _patchItemsByName(actor, m.items);
      if (!updates) continue;
      await actor.updateEmbeddedDocuments('Item', updates);
      count += updates.length;
      console.log(`SR3E | ${m.version}: ${actor.name} — ${updates.length} item(s)`);
    }

    // ── Unlinked token actors, scene by scene ───────────────────────────────
    for (const scene of game.scenes) {
      for (const token of scene.tokens) {
        // A LINKED token shares the world actor already handled above; patching it again
        // would be harmless but doubles the count and the log noise.
        if (token.actorLink) continue;
        const actor = token.actor;
        if (!actor) continue;
        const updates = _patchItemsByName(actor, m.items);
        if (!updates) continue;
        await actor.updateEmbeddedDocuments('Item', updates);
        count += updates.length;
        console.log(`SR3E | ${m.version}: ${scene.name}/${token.name} (unlinked) — ${updates.length} item(s)`);
      }
    }

    // ── World items sitting loose in the sidebar ────────────────────────────
    for (const item of game.items) {
      const patch = m.items[item.name];
      if (!patch) continue;
      const delta = {};
      for (const [field, value] of Object.entries(patch)) {
        const v = _fillBlank(item.system, field, value);
        if (v !== null) delta[`system.${field}`] = v;
      }
      if (!Object.keys(delta).length) continue;
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
