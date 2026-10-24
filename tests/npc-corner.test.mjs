/**
 * NPC-side corners in their own colour · TODO 246
 *
 * Reported in play (2026-10-23): "in the melee window i rolled for the player by accident.
 * kinda want the npcs to use a different colored button". The GM owns every actor, so both
 * Submit buttons on a two-corner card are live for them and used to look identical.
 *
 * Three layers:
 *   1. the pure decision (`NpcCorner`, scripts/data/npc-corner.mjs);
 *   2. `SR3EActor.cornerActions` — the ONE renderer all eight two-corner cards share —
 *      actually emitting the class and tooltip;
 *   3. source level: every card goes through `cornerActions`, and the CSS rule and its
 *      custom property exist.
 */
import fs from 'node:fs';
import { installGlobals, installGame } from './helpers/foundry.mjs';
import { NpcCorner, NPC_CORNER_CLASS } from '../scripts/data/npc-corner.mjs';

installGlobals();
const { SR3E } = await import('../scripts/config.js');

const pc   = { id: 'pc1',  name: 'Ripper' };
const goon = { id: 'npc1', name: 'Halloweener "Ganger"' };
const PCS  = new Set(['pc1']);
const isPC = a => PCS.has(a?.id);

installGame({
  actors: [pc, goon],
  sr3e: { SR3E, SR3EQuery: { isPlayerCharacter: isPC } },
});
const { SR3EActor } = await import('../scripts/documents/SR3EActor.js');

export const name = 'npc-corner';

const ROOT = new URL('../', import.meta.url);
const read = p => fs.readFileSync(new URL(p, ROOT), 'utf8');

export async function run(t) {
  /* ---- 1. the decision ---- */
  t.is('a player character is not the NPC side',  NpcCorner.isNpc(pc, isPC), false);
  t.is('an NPC is the NPC side',                   NpcCorner.isNpc(goon, isPC), true);
  t.is('no actor → the GM decides it → NPC side',  NpcCorner.isNpc(null, isPC), true);

  const d = NpcCorner.decorate(goon, 'Ganger', isPC);
  t.is('NPC corner gets the class', d.cls, NPC_CORNER_CLASS);
  t.ok('NPC tooltip names the corner', d.title.startsWith('NPC — Ganger'));
  const p = NpcCorner.decorate(pc, 'Ripper', isPC);
  t.is('PC corner gets no class',   p.cls, '');
  t.is('PC corner gets no tooltip', p.title, '');
  t.ok('label falls back to the actor name', NpcCorner.decorate(goon, '', isPC).title.includes('Halloweener'));
  t.is('no actor and no label still has a tooltip', NpcCorner.decorate(null, '', isPC).title, "NPC (the GM's side)");

  /* ---- 2. cornerActions emits it ---- */
  const html = SR3EActor.cornerActions('{}', [
    { role: 'attacker', label: pc.name,   owner: pc.id },
    { role: 'defender', label: goon.name, owner: goon.id },
  ]);
  const buttons = [...html.matchAll(/<button class="sr-corner-submit-btn([^"]*)"([^>]*)>/g)];
  t.is('two submit buttons', buttons.length, 2);
  t.ok('the PC button has no NPC class',  !buttons[0][1].includes(NPC_CORNER_CLASS));
  t.ok('the PC button has no NPC title',  !/title=/.test(buttons[0][2]));
  t.ok('the NPC button carries the class', buttons[1][1].includes(NPC_CORNER_CLASS));
  t.ok('the NPC button carries a tooltip', /title="NPC — /.test(buttons[1][2]));
  t.ok('quotes in a name are escaped in the tooltip', buttons[1][2].includes('&quot;Ganger&quot;'));
  t.ok('the GM override is not coloured', !/sr-corner-resolve-btn[^"]*sr-corner-npc/.test(html));

  const noOwner = SR3EActor.cornerActions('{}', [{ role: 'host', label: 'Host', owner: '' }]);
  t.ok('a corner with no owner is the GM side', noOwner.includes(NPC_CORNER_CLASS));

  /* ---- 3. source level ---- */
  const actorSrc = read('scripts/documents/SR3EActor.js');
  const body = actorSrc.slice(actorSrc.indexOf('static cornerActions('), actorSrc.indexOf('static readCornerEl('));
  t.ok('cornerActions asks NpcCorner', body.includes('NpcCorner.decorate('));
  t.ok('cornerActions uses isPlayerCharacter, not hasPlayerOwner',
    body.includes('isPlayerCharacter') && !body.includes('hasPlayerOwner'));
  const calls = (actorSrc.match(/SR3EActor\.cornerActions\(payload/g) ?? []).length
    + (read('scripts/SR3EMIJI.js').match(/SR3EActor\.cornerActions\(payload/g) ?? []).length;
  t.is('all eight two-corner cards render through cornerActions', calls, 8);

  const css = read('styles/sr3e.css');
  t.ok('--sr-npc is declared on :root', /:root\s*\{[^}]*--sr-npc:\s*#[0-9a-f]{3,8};/i.test(css));
  t.ok('the NPC corner rule exists and uses --sr-npc',
    /\.sr-corner-submit-btn\.sr-corner-npc\s*\{[^}]*var\(--sr-npc\)/.test(css));
  const rule = css.indexOf('.sr-corner-submit-btn.sr-corner-npc {');
  const disabled = css.indexOf('.sr-corner-submit-btn:disabled');
  t.ok('the NPC rule sits before :disabled, so a locked NPC button still dims', rule > 0 && rule < disabled);
}
