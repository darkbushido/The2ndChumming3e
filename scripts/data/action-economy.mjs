/**
 * The action economy — what one Combat Phase holds, and what each action costs · SR3 pp.105-108
 * (TODO 48). Pure: no Foundry. `scripts/SR3EActionLedger.js` stores the ledger and charges it.
 *
 * > "During his Combat Phase, a character may take up to two Simple Actions or one Complex
 * > Action." — p.105
 * > "A Free Action may be taken in place of a Simple Action." — p.105
 * > "Only one Free Action may be made by each character during any given Combat Phase." — p.105
 * > "A character who wishes to take a Complex Action may also take a Free Action that Combat
 * > Phase, but may not take Simple Actions." — p.107
 *
 * ⚠ **Charge the actor who OPENED the action, never the one answering it.** Dodge, Full Defense,
 * Damage and Spell Resistance cost the defender nothing from their own phase; charging them would
 * halve every defender's turn. Initiative is not an action either. None of them is in `ACTIONS`.
 * ⚠ **Over-spending is REPORTED, never refused** — minimal guardrails. A charge that does not fit
 * is still recorded, flagged `over`, and the GM decides.
 * ⚠ **The ledger belongs to one Combat Phase.** It carries the key of the phase it was written in
 * (`round|turn`); a ledger from any other phase reads as empty, so nothing has to clear it.
 */

import { PhaseTargets } from './phase-targets.mjs';

/** Every action the system can charge by itself, with its cost and page. */
export const ACTIONS = {
  fireWeapon:        { cost: 'simple',  label: 'Fire Weapon',                  page: 'SR3 p.106' },   // SS / SA / BF, bows
  fireAutomatic:     { cost: 'complex', label: 'Fire Automatic Weapon',        page: 'SR3 p.108' },   // FA
  throwWeapon:       { cost: 'simple',  label: 'Throw Weapon',                 page: 'SR3 p.107' },
  insertClip:        { cost: 'simple',  label: 'Insert Clip',                  page: 'SR3 p.106' },
  removeClip:        { cost: 'simple',  label: 'Remove Clip',                  page: 'SR3 p.107' },
  reloadFirearm:     { cost: 'complex', label: 'Reload Firearm',               page: 'SR3 p.108' },   // no clip
  readyWeapon:       { cost: 'simple',  label: 'Ready Weapon',                 page: 'SR3 p.107' },
  quickDraw:         { cost: 'simple',  label: 'Quick Draw',                   page: 'SR3 p.107' },
  takeAim:           { cost: 'simple',  label: 'Take Aim',                     page: 'SR3 p.107' },
  meleeAttack:       { cost: 'complex', label: 'Melee/Unarmed Attack',         page: 'SR3 p.108' },
  castSpell:         { cost: 'complex', label: 'Cast Spell',                   page: 'SR3 p.108' },
  fireVehicleWeapon: { cost: 'complex', label: 'Fire Mounted or Vehicle Weapon', page: 'SR3 p.108' },
  summonSpirit:      { cost: 'complex', label: 'Summon Nature Spirit',         page: 'SR3 p.108' },
  useSkill:          { cost: 'complex', label: 'Use Skill',                    page: 'SR3 p.108' },
  observeInDetail:   { cost: 'simple',  label: 'Observe in Detail',            page: 'SR3 p.106' },
  changeGunMode:     { cost: 'simple',  label: 'Change Gun Mode',              page: 'SR3 p.106' },
  dropObject:        { cost: 'free',    label: 'Drop Object',                  page: 'SR3 p.105' },
  // The GM's own marks on the tracker — an action the system did not see.
  simpleAction:      { cost: 'simple',  label: 'Simple Action',                page: 'SR3 p.105' },
  complexAction:     { cost: 'complex', label: 'Complex Action',               page: 'SR3 p.107' },
  freeAction:        { cost: 'free',    label: 'Free Action',                  page: 'SR3 p.105' },
};

export const ActionEconomy = {
  ACTIONS,

  /** The key of the Combat Phase in progress — one per slot of the combat queue. */
  phaseKey(round, turn) { return `${Number(round) || 0}|${Number(turn) || 0}`; },

  empty(phase = '') { return { phase, simple: 0, complex: 0, free: 0, log: [] }; },

  /** The ledger for THIS phase: the stored one if it was written in this phase, else empty. */
  ledgerFor(stored, phase) {
    if (!stored || stored.phase !== phase) return ActionEconomy.empty(phase);
    return { phase, simple: stored.simple ?? 0, complex: stored.complex ?? 0, free: stored.free ?? 0,
             log: Array.isArray(stored.log) ? [...stored.log] : [] };
  },

  /** The action a firearm shot is — by FIRE MODE, not "an attack happened" (p.106 vs p.108). */
  fireAction(mode) { return String(mode ?? '').toUpperCase() === 'FA' ? 'fireAutomatic' : 'fireWeapon'; },

  /**
   * Would this cost still fit the phase? p.105/107: two Simple, OR one Complex — and one Free with
   * either. ⚠ The Free does not take a Simple's place in the count: *"A Free Action may be taken in
   * place of a Simple Action"* says you may, not that it uses one up, and *"Only one Free Action
   * may be made … during any given Combat Phase"* caps it at one regardless.
   */
  fits(ledger, cost) {
    const l = ledger ?? ActionEconomy.empty();
    if (cost === 'complex') return l.complex === 0 && l.simple === 0;
    if (cost === 'simple')  return l.complex === 0 && l.simple < 2;
    if (cost === 'free')    return l.free === 0;
    return true;
  },

  /**
   * Record an action. Returns `{ ledger, over }` — `over` when it did not fit, recorded anyway.
   * `what` is shown in the log ("Fire Weapon (SA) — Ares Predator").
   */
  charge(ledger, actionKey, what = '', by = '', snap = null) {
    const a = ACTIONS[actionKey];
    if (!a) throw new Error(`unknown action '${actionKey}'`);
    const l = ledger ? { ...ledger, log: [...(ledger.log ?? [])] } : ActionEconomy.empty();
    const over = !ActionEconomy.fits(l, a.cost);
    l[a.cost] = (l[a.cost] ?? 0) + 1;
    l.log.push({ action: actionKey, cost: a.cost, what: what || a.label, by, over, ...(snap ? { snap } : {}) });
    return { ledger: l, over };
  },

  /** Remove one logged entry (the GM's undo). */
  uncharge(ledger, index) {
    const l = { ...ledger, log: [...(ledger?.log ?? [])] };
    const [gone] = l.log.splice(index, 1);
    if (gone) l[gone.cost] = Math.max(0, (l[gone.cost] ?? 0) - 1);
    return l;
  },

  /** What is left this phase: `{ simple, complex, free }`, each 0 or more. */
  remaining(ledger) {
    const l = ledger ?? ActionEconomy.empty();
    return {
      simple:  l.complex ? 0 : Math.max(0, 2 - l.simple),
      complex: l.complex || l.simple ? 0 : 1,
      free:    l.free ? 0 : 1,
    };
  },

  /* ── The GM's undo (the maintainer, 2026-09-15: *"in case the player makes a big mistake or shoots
   *    themselves by accident"*) ─────────────────────────────────────────────────────────────────
   * An action is snapshotted BEFORE its dialogs spend anything; undoing it puts back every snapshotted
   * value that has changed since, and the GM picks which. Damage is never auto-applied, so what an
   * action can have spent is exactly this: pool dice, the recoil count, Karma Pool, and ammunition. */

  /** Actor fields an action can spend. */
  SNAP_ACTOR: ['combatPoolSpent', 'spellPoolSpent', 'astralPoolSpent', 'hackingPoolSpent', 'roundsFiredThisPhase', 'karmaPool',
               'targetsThisPhase'],
  /** Object fields, copied and compared by VALUE — who was shot at this phase (TODO 56.2). */
  SNAP_OBJECT: { targetsThisPhase: v => PhaseTargets.normalize(v) },
  /** Item fields an action can spend — rounds in a gun, a thrown stack, an ammunition stock. */
  SNAP_ITEM: ['loadedRounds', 'loadedAmmoType', 'quantity', 'rounds', 'reloads'],
  SNAP_TYPES: ['firearm', 'projectile', 'thrown', 'ammunition'],

  /** A snapshot of `{ system, items: [{ id, name, type, system }] }` plain data, taken at `at`. */
  snapshot(actorData, at = Date.now()) {
    const sys = actorData?.system ?? {};
    const actor = {};
    for (const k of ActionEconomy.SNAP_ACTOR) {
      const norm = ActionEconomy.SNAP_OBJECT[k];
      if (norm) actor[k] = norm(sys[k]);
      else if (sys[k] !== undefined) actor[k] = sys[k];
    }
    const items = {};
    for (const i of actorData?.items ?? []) {
      if (!ActionEconomy.SNAP_TYPES.includes(i.type)) continue;
      const f = {};
      for (const k of ActionEconomy.SNAP_ITEM) if (i.system?.[k] !== undefined) f[k] = i.system[k];
      if (Object.keys(f).length) items[i.id] = { name: i.name, ...f };
    }
    return { at, actor, items };
  },

  /**
   * The snapshot a charge carries: the one its flow took with `begin`, if taken in this phase.
   * ⚠ **Every charge in a flow carries it, not just the first** (TODO 152). A flow can charge twice —
   * Ready Weapon then Fire Weapon, Remove Clip then Insert Clip — and when only the first entry held
   * the snapshot, the undo's default (the LAST entry) put nothing back, so the GM had to press ↺ again.
   */
  pendingSnap(pending, phase) {
    return pending && pending.phase === phase ? pending.snap : null;
  },

  /**
   * What an undo would put back: every snapshotted value that differs now, as
   * `[{ kind: 'actor'|'item', id, name, field, now, back }]`. An item deleted since is listed with
   * `gone: true` — it cannot be restored field by field, so the dialog says so.
   */
  restorePlan(snap, actorData) {
    if (!snap) return [];
    const out = [];
    const sys = actorData?.system ?? {};
    for (const [k, back] of Object.entries(snap.actor ?? {})) {
      const norm = ActionEconomy.SNAP_OBJECT[k];
      const now  = norm ? norm(sys[k]) : sys[k];
      const same = norm ? JSON.stringify(now) === JSON.stringify(back) : now === back;
      if (!same) out.push({ kind: 'actor', id: null, name: '', field: k, now, back });
    }
    const byId = new Map((actorData?.items ?? []).map(i => [i.id, i]));
    for (const [id, s] of Object.entries(snap.items ?? {})) {
      const cur = byId.get(id);
      const { name, ...fields } = s;
      if (!cur) { out.push({ kind: 'item', id, name, field: null, gone: true }); continue; }
      for (const [k, back] of Object.entries(fields)) {
        if (cur.system?.[k] !== back) out.push({ kind: 'item', id, name, field: k, now: cur.system?.[k], back });
      }
    }
    return out;
  },

  /** A value as the undo dialog shows it — a target record as its count. */
  display(v) {
    if (v && typeof v === 'object' && Array.isArray(v.targets)) return `${v.targets.length} target${v.targets.length === 1 ? '' : 's'} shot at`;
    return String(v);
  },

  /** A one-line summary for a tooltip: "Fire Weapon (SA) · Ready Weapon". */
  summary(ledger) {
    return (ledger?.log ?? []).map(e => `${e.what} (${e.cost})${e.over ? ' ⚠ over' : ''}`).join(' · ');
  },
};
