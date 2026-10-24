/**
 * 🧹 Reset shared NPCs — the one-off GM tool for TODO 260 (asked for by the maintainer, 2026-10-24).
 * Sidebar NPCs with unlinked tokens may still carry wounds and statuses that the shared-actor bug put there.
 */
import { readFileSync } from 'node:fs';
import { NpcReset } from '../scripts/data/npc-reset.mjs';

export const name = 'npc-reset';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

export async function run(t) {
  const N = NpcReset;
  const mk = ({ type = 'npc', linked = false, stun = 0, physical = 0, overflow = 0, effects = [], stunTurns, name = 'Goon' } = {}) => ({
    name, type, prototypeToken: { actorLink: linked },
    system: { wounds: { stun: { value: stun }, physical: { value: physical }, overflow: { value: overflow } } },
    effects, flags: stunTurns ? { The2ndChumming3e: { stunTurns } } : {},
  });
  const prone = { id: 'e1', name: 'Prone', statuses: new Set(['prone']) };
  const drug  = { id: 'e2', name: 'Kamikaze', statuses: new Set() };

  /* ── Who is offered ───────────────────────────────────────────────────── */
  t.ok('a goon template (unlinked tokens) is a shared actor', N.isShared(mk()));
  t.ok('a linked actor — a PC, a named NPC — is never offered: it owns its own damage', !N.isShared(mk({ linked: true })));
  t.ok('a vehicle is not offered', !N.isShared(mk({ type: 'vehicle' })));
  const offered = N.offer([mk({ name: 'Zed', physical: 3 }), mk({ name: 'Ann', effects: [prone] }), mk({ name: 'Clean' }),
    mk({ name: 'PC', linked: true, physical: 9 }), mk({ name: 'Doped', effects: [drug] })]);
  t.eq('only dirty shared actors, by name — clean ones, linked ones and a status-less effect are left out',
    offered.map(r => r.actor.name), ['Ann', 'Zed']);

  /* ── What is cleared ──────────────────────────────────────────────────── */
  const c = N.collected(mk({ stun: 2, physical: 3, overflow: 1, effects: [prone, drug], stunTurns: 2 }));
  t.eq('the three tracks are read', [c.stun, c.physical, c.overflow], [2, 3, 1]);
  t.eq('only STATUS effects are cleared — a drug or augmentation effect stays', c.effects.map(e => e.id), ['e1']);
  t.is('the shock-stun count is read', c.stunTurns, 2);
  t.eq('the update zeroes the tracks', N.woundDelta(c),
    { 'system.wounds.stun.value': 0, 'system.wounds.physical.value': 0, 'system.wounds.overflow.value': 0 });
  t.eq('…and only the tracks that need it', N.woundDelta(N.collected(mk({ physical: 4 }))), { 'system.wounds.physical.value': 0 });
  t.is('the dialog line says what it carries', N.describe(c), 'Physical 3 · Stun 2 · overflow 1 · Prone · stunned 2 turns');
  t.ok('nothing to clear: not dirty', !N.dirty(N.collected(mk())));

  /* ── Wiring ───────────────────────────────────────────────────────────── */
  const src = read('scripts/SR3ENpcReset.js');
  t.ok('GM-only, and offered from the GM tools', /if \(!game\.user\.isGM\) return;/.test(src)
    && /mk\('sr3e-npc-reset-btn', '🧹 Reset shared NPCs', \(\) => SR3ENpcReset\.open\(\), true\)/.test(read('scripts/sr3e.js')));
  t.ok('nothing starts ticked (TODO 96) — the rows\' checkboxes carry no checked attribute',
    /<input type="checkbox" data-actor-id="\$\{esc\(actor\.id\)\}"\/>/.test(src));
  t.ok('the All toggle is wired through wait()\'s render option', /render: \(_event, dialog\) =>[\s\S]{0,200}sr-npcreset-all/.test(src));
  t.ok('clearing deletes only the collected status effects and unsets the stun count',
    /deleteEmbeddedDocuments\('ActiveEffect', c\.effects\.map\(e => e\.id\)\)/.test(src) && /unsetFlag\('The2ndChumming3e', 'stunTurns'\)/.test(src));
}
