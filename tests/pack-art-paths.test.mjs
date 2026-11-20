/**
 * 0.9.1 — no pack ships a world-relative picture (`assets/…` exists only on one server), and the example
 * characters' world copies are repointed without touching a GM's own art.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ExampleCharacterArt, DEFAULT_ACTOR_IMG, SHIPPED } from '../scripts/data/example-character-art.mjs';

export const name = 'pack-art-paths';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OK = /^(systems\/The2ndChumming3e\/|icons\/|modules\/)/;

function* files(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) yield* files(p); else if (f.endsWith('.json')) yield p;
  }
}
function* paths(o, trail = '') {
  if (Array.isArray(o)) { for (const [i, v] of o.entries()) yield* paths(v, `${trail}[${i}]`); return; }
  if (o && typeof o === 'object') {
    for (const [k, v] of Object.entries(o)) {
      if ((k === 'img' || k === 'src') && typeof v === 'string') yield [`${trail}.${k}`, v];
      else yield* paths(v, `${trail}.${k}`);
    }
  }
}

export async function run(t) {
  const bad = [];
  for (const f of files(join(ROOT, 'packs-src'))) {
    for (const [at, v] of paths(JSON.parse(readFileSync(f, 'utf8')))) {
      if (v && !OK.test(v)) bad.push(`${f.slice(ROOT.length)}${at}: ${v}`);
    }
  }
  t.eq('no packs-src picture is world-relative (assets/… or any path outside the system, core icons or modules)', bad, []);

  const src = `Compendium.The2ndChumming3e.sr3e-example-characters.Actor.abc`;
  const mk = (img, tex, cs = src, isToken = false) => ({ img, isToken, _stats: { compendiumSource: cs }, prototypeToken: { texture: { src: tex } } });
  t.eq('shipped art on an example character → default icon, picture and token', ExampleCharacterArt.fixActor(mk(SHIPPED[1], SHIPPED[1])),
    { img: DEFAULT_ACTOR_IMG, 'prototypeToken.texture.src': DEFAULT_ACTOR_IMG });
  t.eq('an unlinked token actor gets the picture only', ExampleCharacterArt.fixActor(mk(SHIPPED[0], SHIPPED[0], src, true)), { img: DEFAULT_ACTOR_IMG });
  t.is('a GM\'s own upload is kept', ExampleCharacterArt.fixActor(mk('assets/mine.png', 'assets/mine.png')), null);
  t.is('the shipped path on an actor not from the pack is kept', ExampleCharacterArt.fixActor(mk(SHIPPED[1], SHIPPED[1], 'Compendium.x.other.Actor.z')), null);
  t.is('an actor with no compendium source is kept', ExampleCharacterArt.fixActor({ img: SHIPPED[1], _stats: {} }), null);
  t.is('idempotent', ExampleCharacterArt.fixActor(mk(DEFAULT_ACTOR_IMG, DEFAULT_ACTOR_IMG)), null);
  const mig = readFileSync(join(ROOT, 'scripts/SR3EMigrations.js'), 'utf8');
  t.ok('the 0.9.1 migration is wired', /version: '0\.9\.1'[\s\S]{0,1200}ExampleCharacterArt\.fixActor/.test(mig));
}
