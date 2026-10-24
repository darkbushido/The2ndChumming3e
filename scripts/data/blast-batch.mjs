/**
 * A grenade blast's targets — who rolls their own Damage Resistance, who the GM rolls in one batch, and
 * when the whole blast has been resisted (TODO 249, TODO 250). Pure: no Foundry globals.
 *
 * TODO 249 — the maintainer, in play 2026-10-23: "dealing with all the npcs in a grenade blast is annoying
 * it should be all done at once for NPCs only". Player characters keep their own soak cards and roll their
 * own dice; every caught NPC is rolled by ONE GM click and listed on one summary card. Nothing is applied:
 * each row offers the same 🩸 Assign the wound / 💥 Knockdown buttons a soak result offers.
 *
 * TODO 250 — "the blast marker should go away as soon as everything has been resolved". The grenade card
 * names who it caught (`flags.The2ndChumming3e.blast`); each soak card it leads to names the blast too. The
 * blast is resolved when every individual target's soak has been rolled (or the GM ✕'d its step) and the
 * NPC batch has been rolled (or ✕'d) — read from the cards' `acted` ledgers, so it holds on every client
 * and after a reload. The Foundry side (SR3EActor.autoClearBlast) then deletes the marker.
 */
import { OpenSteps } from './open-steps.mjs';

/** The grenade card's per-target "Resist Damage" button — one per individually rolled target, in order. */
export const SOAK_STEP = 'sr-soak-btn';
/** The soak card's roll button. */
export const SOAK_ROLL_STEP = 'sr-soak-roll-btn';
/** The grenade card's GM button that rolls every NPC at once. */
export const BATCH_STEP = 'sr-blast-npc-btn';

export const BlastBatch = {
  /**
   * Split the caught targets. `isPC(actor)` is `SR3EQuery.isPlayerCharacter` — a player's character, never
   * merely "has a player owner" (a GM-run NPC lent to a player for a scene is still an NPC to the table).
   *
   * Batched: characters and NPCs that are not a player's character. Individual: player characters, and
   * anything that is not a person — a vehicle or drone resists with its own armour rules (hardened armour,
   * p.132) on its own card, as before.
   *
   * @param {{actorId:string, actor:{type:string}}[]} targets  in card order
   * @param {(actor) => boolean} isPC
   * @returns {{ individual: object[], batch: object[] }}  both keep the input order
   */
  split(targets = [], isPC = () => true) {
    const individual = [];
    const batch = [];
    for (const t of targets) {
      const type = t?.actor?.type;
      const person = type === 'character' || type === 'npc';
      if (person && !isPC(t.actor)) batch.push(t); else individual.push(t);
    }
    return { individual, batch };
  },

  /** The blast's identity — the marker it drew. Null when nothing was drawn (no marker to clear). */
  key(regionId, markerId) {
    if (regionId) return `region:${regionId}`;
    if (markerId) return `marker:${markerId}`;
    return null;
  },

  /**
   * Has every target of this blast resisted?
   *
   * - An individual target (button `i` of SOAK_STEP on the grenade card) is done when a soak card for it,
   *   from this blast, has had its roll clicked — or when the GM ✕'d its Resist button (nobody will take it).
   *   ⚠ The Resist button being clicked is NOT enough: the soak card it posts is still to be rolled.
   * - The NPC batch is done when its button was used (its record names any NPC the GM sent to a card of its
   *   own, `separate`, and those must be rolled like an individual target) or ✕'d.
   *
   * @param {object} p
   * @param {string[]} p.individualIds   actor ids, in the order of the grenade card's SOAK_STEP buttons
   * @param {string[]} p.batchIds        actor ids the batch covers
   * @param {object}   p.acted           the grenade card's acted-ledger
   * @param {{actorId:string, rolled:boolean}[]} p.soakCards  this blast's soak cards
   */
  resolved({ individualIds = [], batchIds = [], acted = {}, soakCards = [] } = {}) {
    const a = acted ?? {};
    const rolled = id => soakCards.some(c => c?.actorId === id && c.rolled);
    const indivOk = individualIds.every((id, i) => {
      const key = OpenSteps.key(SOAK_STEP, i);
      return OpenSteps.isDismissed(a, key) || (!!a[key] && rolled(id));
    });
    if (!indivOk) return false;
    if (!batchIds.length) return true;
    const entry = a[OpenSteps.key(BATCH_STEP, 0)];
    if (!entry) return false;
    if (OpenSteps.isDismissed(a, OpenSteps.key(BATCH_STEP, 0))) return true;
    return (entry.data?.separate ?? []).every(rolled);
  },

  /**
   * Would auto-clearing do anything? A blast that caught no one has nothing to wait for, but its marker is
   * the only record of where the grenade went off — it stays until 🧹 Clear.
   */
  tracks({ individualIds = [], batchIds = [] } = {}) {
    return individualIds.length + batchIds.length > 0;
  },

  /** The indices of a roll's dice still to explode (the Rule of Six, SR3 p.38). */
  explodeIdx(dice = []) {
    return dice.map((d, i) => (d?.needsExplosion ? i : -1)).filter(i => i >= 0);
  },

  /** Is every row's roll finished? */
  allDone(rows = []) {
    return rows.every(r => BlastBatch.explodeIdx(r?.dice).length === 0);
  },

  /** Successes on a finished roll. */
  successes(dice = []) {
    return dice.filter(d => d?.success).length;
  },
};
