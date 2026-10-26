/**
 * Tokens see, and wear the dynamic ring · TODO 262 follow-up (the maintainer, 2026-10-25).
 *
 * Mr. Johnson's Little Black Book NPCs shipped `prototypeToken.sight.enabled: false` and `ring.enabled: false`,
 * so every contact met in play came out blind and ringless. Three parts:
 *   1. every actor in `packs-src/sr3e-mr-johnsons-contacts` has vision and the ring on;
 *   2. `preCreateActor` turns vision on for every new actor — only when the data does not say;
 *   3. the 0.9.0 migration (`TokenSight.fixActor`) turns a world character's/NPC's PROTOTYPE token to see —
 *      never a placed (unlinked) token, never a vehicle.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TokenSight } from '../scripts/data/token-sight.mjs';

export const name = 'contact-tokens';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PACK = join(ROOT, 'packs-src', 'sr3e-mr-johnsons-contacts');

export async function run(t) {
  const actors = readdirSync(PACK).filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(readFileSync(join(PACK, f), 'utf8')))
    .filter(g => g._key?.startsWith('!actors!'));
  t.is("the contacts pack still holds its 62 NPCs (the fixture isn't vacuous)", actors.length, 62);
  const blind = actors.filter(g => g.doc.prototypeToken?.sight?.enabled !== true).map(g => g.doc.name);
  t.is('every contact token has vision on', blind.join(', '), '');
  const ringless = actors.filter(g => g.doc.prototypeToken?.ring?.enabled !== true).map(g => g.doc.name);
  t.is('every contact token wears the dynamic ring', ringless.join(', '), '');

  const src = readFileSync(join(ROOT, 'scripts', 'sr3e.js'), 'utf8');
  const hook = src.slice(src.indexOf("Hooks.on('preCreateActor'"), src.indexOf('🍀 Refresh Karma Pools'));
  t.ok('preCreateActor defaults vision on for every new actor, unless the data says otherwise',
    /if \(_data\.prototypeToken\?\.sight\?\.enabled === undefined\)\s*\{\s*document\.updateSource\(\{ prototypeToken: \{ sight: \{ enabled: true \} \} \}\);/.test(hook));

  /* ── 3. The 0.9.0 migration: world characters and NPCs, prototype only ───────────── */
  const actor = (type, enabled, isToken = false) => ({ type, isToken, prototypeToken: { sight: { enabled } } });
  const ON = JSON.stringify({ 'prototypeToken.sight.enabled': true });
  t.is('a blind world NPC → vision on', JSON.stringify(TokenSight.fixActor(actor('npc', false))), ON);
  t.is('a blind world character → vision on', JSON.stringify(TokenSight.fixActor(actor('character', false))), ON);
  t.is('a prototype with no sight data → vision on', JSON.stringify(TokenSight.fixActor({ type: 'npc', isToken: false })), ON);
  t.is('already seeing → nothing (idempotent)', TokenSight.fixActor(actor('npc', true)), null);
  t.is('an unlinked token on a scene keeps its vision (the GM may have blinded it)', TokenSight.fixActor(actor('npc', false, true)), null);
  t.is('a vehicle is not migrated', TokenSight.fixActor(actor('vehicle', false)), null);
  t.is('no actor → nothing, no throw', TokenSight.fixActor(null), null);
  const mig = readFileSync(join(ROOT, 'scripts', 'SR3EMigrations.js'), 'utf8');
  t.ok('the migration is a 0.9.0 entry that uses TokenSight.fixActor and argues its overwrite',
    /version: '0\.9\.0',\s*label: 'Characters and NPCs see[\s\S]*?OVERWRITES[\s\S]*?fixActor: TokenSight\.fixActor,/.test(mig));
}
