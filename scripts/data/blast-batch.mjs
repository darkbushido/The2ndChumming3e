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
 * blast is resolved when every individual target's soak roll has posted its final result (every 💥 rolled)
 * or the GM ✕'d its step, and the NPC batch has been rolled with no 6 still pending (or ✕'d) — read from
 * the cards themselves, so it holds on every client and after a reload. The Foundry side (SR3EActor.autoClearBlast) then deletes the marker.
 */
import { OpenSteps } from './open-steps.mjs';

/** The grenade card's per-target "Resist Damage" button — one per individually rolled target, in order. */
export const SOAK_STEP = 'sr-soak-btn';
/** The soak card's roll button. */
export const SOAK_ROLL_STEP = 'sr-soak-roll-btn';
/** The grenade card's GM button that rolls every NPC at once. */
export const BATCH_STEP = 'sr-blast-npc-btn';

export const BlastBatch = {
  /** A drone: a vehicle actor whose type is `drone` (`system.vehicleType`, as the sr3e-*-drones packs set it). */
  isDrone(actor) {
    return actor?.type === 'vehicle' && actor?.system?.vehicleType === 'drone';
  },

  /**
   * Split the caught targets. `isPC(actor)` is `SR3EQuery.isPlayerCharacter` — a player's character, never
   * merely "has a player owner".
   *
   * Batched (the GM's): characters and NPCs that are not a player's character, and **drones on the GM's side**
   * — the maintainer, 2026-10-24: a drone is the player's when it is itself a player's (`isPC`) OR its
   * controlling rigger (`system.driverActorId`, via `controllerOf`) is a player character; only drones with no
   * player controller join the batch. Individual: player characters, player-side drones, and every other
   * vehicle, which resists on its own card as before.
   *
   * @param {{actorId:string, actor:object}[]} targets  in card order
   * @param {(actor) => boolean} isPC
   * @param {(actor) => object|null} controllerOf  the drone's rigger/driver actor, or null
   * @returns {{ individual: object[], batch: object[] }}  both keep the input order
   */
  split(targets = [], isPC = () => true, controllerOf = () => null) {
    const individual = [];
    const batch = [];
    for (const t of targets) {
      const a = t?.actor;
      const type = a?.type;
      let gmSide = false;
      if (type === 'character' || type === 'npc') gmSide = !isPC(a);
      else if (BlastBatch.isDrone(a)) {
        const ctrl = controllerOf(a);
        gmSide = !isPC(a) && !(ctrl && isPC(ctrl));
      }
      if (gmSide) batch.push(t); else individual.push(t);
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
   * Has every target of this blast resisted — COMPLETELY? (The maintainer, 2026-10-24: "no early clear".)
   *
   * - A target rolling on its own card is finished when its Damage Resistance roll has posted its RESULT — the
   *   final wave, after every 💥 (`soakResults`, the actor ids of this blast's final soak waves). Clicking Resist,
   *   or Roll, is not enough: explosions may still be owed.
   * - ✕ in the ⏳ panel still counts: the grenade card's Resist step for that target, or its soak card's roll step.
   * - The NPC batch is finished when its step was ✕'d, or when it was used AND no NPC or drone on its card still
   *   has a pending 6 (`batchRows`, the card's rows) AND every NPC the GM sent to a card of its own is finished
   *   as above. A batch that rolled no one (`data.rolled: 0`) has no card to wait for.
   *
   * @param {object} p
   * @param {string[]} p.individualIds  actor ids, in the order of the grenade card's SOAK_STEP buttons
   * @param {string[]} p.batchIds       actor ids the batch covers
   * @param {object}   p.acted          the grenade card's acted-ledger
   * @param {{actorId:string, dismissed:boolean}[]} p.soakCards  this blast's soak cards (roll step ✕'d?)
   * @param {string[]} p.soakResults    actor ids whose soak roll has posted its final result
   * @param {{dice:object[]}[]|null} p.batchRows  the batch card's rows, or null when there is none
   */
  resolved({ individualIds = [], batchIds = [], acted = {}, soakCards = [], soakResults = [], batchRows = null } = {}) {
    const a = acted ?? {};
    const finished = id => soakResults.includes(id) || soakCards.some(c => c?.actorId === id && c.dismissed);
    const indivOk = individualIds.every((id, i) => OpenSteps.isDismissed(a, OpenSteps.key(SOAK_STEP, i)) || finished(id));
    if (!indivOk) return false;
    if (!batchIds.length) return true;
    const key = OpenSteps.key(BATCH_STEP, 0);
    const entry = a[key];
    if (!entry) return false;
    if (OpenSteps.isDismissed(a, key)) return true;
    const rolled = Number(entry.data?.rolled ?? batchIds.length) || 0;
    if (rolled > 0 && !(Array.isArray(batchRows) && BlastBatch.allDone(batchRows))) return false;
    return (entry.data?.separate ?? []).every(finished);
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
