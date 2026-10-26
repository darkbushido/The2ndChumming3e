/**
 * Generic NPCs — a race-agnostic archetype whose every token is a different person · TODO 278.
 *
 * The GM marks an NPC (or makes one from an Actor-compendium archetype) as *generic* with a race MIX — the Seattle
 * mix by default, or his own. When an UNLINKED token of it is created, `prepareToken` (the `preCreateToken` hook in
 * sr3e.js, active GM only) rolls a race from the mix, shifts that token's own actor data to it
 * (`data/metatype-shift.mjs`, SR3 p.56) and, when a portrait source is active, gives it a face of that race whose
 * job matches the archetype (`Portraits`, read-only). With no portrait module the stats still vary.
 *
 * ⚠ **Nothing is written to the sidebar actor** when a token is made: the changes go in the token's `delta`
 *   (TODO 260 — an unlinked token's actor shares its id with the sidebar actor, so writing there would reach every
 *   copy). The sidebar actor stays the template; the race is always shifted FROM its own metatype.
 * ⚠ A generic is a LIVE actor (`isTemplate: false`), so it shows in target and roster lists.
 * ⚠ Linked tokens are left alone: one actor cannot be several people.
 */
import { GenericNpc, GENERIC_FLAG, MIX_RACES, SEATTLE_MIX } from './data/generic-npc.mjs';
import { Portraits } from './data/portraits.mjs';
import { SR3EMeetContact } from './SR3EMeetContact.js';

const SCOPE = 'The2ndChumming3e';

export class SR3EGenericNpc {
  /** The generic settings on an actor, or null when it is not generic. */
  static settingsOf(actor) {
    const f = actor?.getFlag?.(SCOPE, GENERIC_FLAG);
    return f && typeof f === 'object' ? f : null;
  }

  /** Load the portrait index ahead of time (GM, at `ready`): `preCreateToken` is synchronous and cannot await it. */
  static async warm() {
    if (!game.user.isGM || !Portraits.sources(game.modules).length) return;
    try { await SR3EMeetContact.index(); } catch (err) { console.warn('SR3E | generic NPC: portraits unavailable:', err); }
  }

  /**
   * `preCreateToken` (synchronous — Foundry does not await it): roll this token's person.
   * Faces come from the index `warm()` already loaded; without it the stats still vary.
   * @param {TokenDocument} token  the token being created (not yet saved)
   * @returns {boolean} whether it changed the token
   */
  static prepareToken(token) {
    const actor = token.baseActor ?? token.actor;
    const settings = SR3EGenericNpc.settingsOf(actor);
    if (!settings || token.actorLink) return false;
    if (game.user.id !== game.users.activeGM?.id) return false;

    const index = SR3EMeetContact._index;                 // null until warm() has run (or with no portrait module)
    const mapping = index ? Portraits.archetypeJob(index, actor.name) : null;

    const roll = GenericNpc.forToken({
      attrs: SR3EMeetContact._attrsOf(actor),
      bookMetatype: actor.system?.metatype,
      mix: settings.mix,
      index, job: mapping?.job ?? null, ages: mapping?.ages ?? null,
      gender: Portraits.normaliseGender(actor.system?.gender),
    }, { limits: game.sr3e.SR3E.racialLimits, racialMax: l => game.sr3e.SR3EActor.racialMax(l) });

    const data = { delta: roll.delta };
    if (roll.texture) data.texture = { src: roll.texture };
    token.updateSource(data);
    return true;
  }

  /** Mark an actor as a Generic NPC: a dialog for the mix, then the flag and an unlinked, numbered prototype token. */
  static async mark(actor) {
    if (!game.user.isGM) {
      ui.notifications.warn('SR3E: only the GM can make a Generic NPC.');
      return null;
    }
    if (!actor || !['npc', 'character'].includes(actor.type)) {
      ui.notifications.warn('SR3E: a Generic NPC is a character or NPC actor.');
      return null;
    }
    const current = SR3EGenericNpc.settingsOf(actor)?.mix;
    const custom = current && typeof current === 'object' ? GenericNpc.mixOf(current) : null;
    const pct = r => Math.round(((custom ?? SEATTLE_MIX)[r] ?? 0) * (custom ? 1 : 1000)) / (custom ? 1 : 10);
    const content = `
      <div class="sr3e-generic" style="display:flex;flex-direction:column;gap:6px;min-width:380px">
        <div style="color:var(--sr-muted);font-size:12px">${actor.name}: each unlinked token dragged onto the board becomes
          a different person — race rolled from this mix, stats restated for it (SR3 p.56), a face of that race if a
          portrait module is active. The sidebar actor is not changed.</div>
        <label><input type="radio" name="gen-mix" value="seattle" ${custom ? '' : 'checked'}/> Seattle mix
          <span style="color:var(--sr-muted)">(human 65%, ork 16%, elf 12%, dwarf 3%, troll 2.5%)</span></label>
        <label><input type="radio" name="gen-mix" value="custom" ${custom ? 'checked' : ''}/> Custom mix (weights, any scale)</label>
        <div style="display:flex;gap:8px;flex-wrap:wrap">${MIX_RACES.map(r =>
          `<label>${r} <input type="number" min="0" step="any" data-race="${r}" value="${pct(r)}" style="width:64px"/></label>`).join('')}</div>
      </div>`;
    let result = null;
    const wireMix = (_app, el) => {
      el.querySelectorAll('[data-race]').forEach(i => i.addEventListener('input', () => {
        const radio = el.querySelector('input[name="gen-mix"][value="custom"]');
        if (radio) radio.checked = true;
      }));
    };
    await foundry.applications.api.DialogV2.wait({
      window: { title: `Generic NPC — ${actor.name}` },
      content,
      buttons: [
        { label: 'Make generic', action: 'ok', default: true,
          callback: (_e, _b, dialog) => {
            const el = dialog.element;
            if (el.querySelector('input[name="gen-mix"]:checked')?.value !== 'custom') { result = { mix: 'seattle' }; return; }
            const mix = {};
            el.querySelectorAll('[data-race]').forEach(i => { mix[i.dataset.race] = Number(i.value) || 0; });
            result = { mix: GenericNpc.mixOf(mix) };
          } },
        { label: 'Cancel', action: 'cancel' },
      ],
      render: (_event, dialog) => wireMix(dialog, dialog.element),
    });
    if (!result) return null;

    await actor.update({
      [`flags.${SCOPE}.${GENERIC_FLAG}`]: { mix: result.mix },
      [`flags.${SCOPE}.isTemplate`]: false,
      prototypeToken: {
        actorLink: false,
        appendNumber: true,
        prependAdjective: false,
        texture: { ring: { enabled: true } },
        sight: { enabled: true },
      },
    });
    ui.notifications.info(`SR3E: ${actor.name} is now a Generic NPC — drag its tokens onto a scene.`);
    return actor;
  }

  /** Make a world NPC from an Actor-compendium archetype and mark it generic. */
  static async create({ archetypeUuid } = {}) {
    if (!game.user.isGM) {
      ui.notifications.warn('SR3E: only the GM can make a Generic NPC.');
      return null;
    }
    const archetype = archetypeUuid ? await fromUuid(archetypeUuid) : null;
    if (!archetype?.pack || archetype.documentName !== 'Actor') {
      ui.notifications.warn('SR3E: pick an Actor in a compendium (a Little Black Book archetype).');
      return null;
    }
    let created;
    try {
      created = await game.sr3e.SR3EQuery.asGM('sr3e.actor.create', { source: `${archetype.pack}|${archetype.id}`, name: archetype.name });
    } catch (err) {
      console.error('SR3E | generic NPC create failed:', err);
      ui.notifications.error('Could not create the NPC — is a GM connected?');
      return null;
    }
    const npc = await fromUuid(created.uuid);
    const done = await SR3EGenericNpc.mark(npc);
    if (!done) ui.notifications.info(`SR3E: ${npc?.name} was created but not made generic — use "Make Generic NPC…" on it.`);
    return npc;
  }
}
