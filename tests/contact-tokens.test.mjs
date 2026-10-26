/**
 * Tokens see, and wear the dynamic ring · TODO 262 follow-up (the maintainer, 2026-10-25).
 *
 * Mr. Johnson's Little Black Book NPCs shipped `prototypeToken.sight.enabled: false` and `ring.enabled: false`,
 * so every contact met in play came out blind and ringless. Two halves:
 *   1. every actor in `packs-src/sr3e-mr-johnsons-contacts` has vision and the ring on;
 *   2. `preCreateActor` turns vision on for every new actor — only when the data does not say.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

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
}
