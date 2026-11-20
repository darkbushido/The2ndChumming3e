/**
 * TODO 311 — the example characters live in the Characters pack (`sr3e-sr3-archetypes`), filed in role folders, and a world
 * copy's compendium source follows them (0.9.1).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CharacterPackMerge as M, MOVED_IDS, NEW_PACK } from '../scripts/data/character-pack-merge.mjs';
import { ExampleCharacterArt, SHIPPED, DEFAULT_ACTOR_IMG } from '../scripts/data/example-character-art.mjs';

export const name = 'character-pack-merge';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OLD = 'sr3e-example-characters';

function* files(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!['node_modules', '.git', '.claude', 'packs', 'archive', 'SR-OCR'].includes(e.name)) yield* files(join(dir, e.name)); }
    else if (/\.(m?js|json|md)$/.test(e.name)) yield join(dir, e.name);
  }
}

export async function run(t) {
  // ── the pure rule ──
  const id = MOVED_IDS[0];
  t.is('a moved actor from the old pack is re-pointed', M.repoint(`Compendium.The2ndChumming3e.${OLD}.Actor.${id}`), `Compendium.The2ndChumming3e.${NEW_PACK}.Actor.${id}`);
  t.is('every moved id re-points', MOVED_IDS.every(i => M.repoint(`Compendium.The2ndChumming3e.${OLD}.Actor.${i}`)?.includes(NEW_PACK)), true);
  t.is('an id that did not move is left alone', M.repoint(`Compendium.The2ndChumming3e.${OLD}.Actor.zzzz`), null);
  t.is('another pack is left alone', M.repoint(`Compendium.The2ndChumming3e.sr3e-mr-johnsons-contacts.Actor.${id}`), null);
  t.is('already re-pointed → idempotent', M.fixActor({ _stats: { compendiumSource: `Compendium.The2ndChumming3e.${NEW_PACK}.Actor.${id}` } }), null);
  t.is('no source → null', M.fixActor({ _stats: {} }), null);
  t.eq('fixActor writes the one field', M.fixActor({ _stats: { compendiumSource: `Compendium.The2ndChumming3e.${OLD}.Actor.${id}` } }),
    { '_stats.compendiumSource': `Compendium.The2ndChumming3e.${NEW_PACK}.Actor.${id}` });

  // ── the art migration still works on a re-pointed copy ──
  const re = { img: SHIPPED[0], isToken: false, _stats: { compendiumSource: `Compendium.The2ndChumming3e.${NEW_PACK}.Actor.${id}` }, prototypeToken: { texture: { src: SHIPPED[0] } } };
  t.eq('art fix accepts the new pack name', ExampleCharacterArt.fixActor(re), { img: DEFAULT_ACTOR_IMG, 'prototypeToken.texture.src': DEFAULT_ACTOR_IMG });
  const mig = readFileSync(join(ROOT, 'scripts/SR3EMigrations.js'), 'utf8');
  t.ok('the re-point is wired as a 0.9.1 migration', /version: '0\.9\.1'[\s\S]{0,1500}CharacterPackMerge\.fixActor/.test(mig));
  t.ok('…after the art entry (which keys on the old name)', mig.indexOf('ExampleCharacterArt.fixActor(actor)') < mig.indexOf('CharacterPackMerge.fixActor(actor)'));

  // ── the pack ──
  const dir = join(ROOT, 'packs-src', NEW_PACK);
  const docs = readdirSync(dir).map(f => JSON.parse(readFileSync(join(dir, f), 'utf8')));
  const folders = docs.filter(g => g._key.startsWith('!folders!'));
  const actors = docs.filter(g => g._key.startsWith('!actors!'));
  t.eq('six role folders', folders.map(f => f.doc.name).sort(),
    ['Face & Legwork', 'Magic', 'Matrix & Tech', 'Opposition (GM)', 'Riggers', 'Street Fighters']);
  t.ok('every folder is an Actor folder', folders.every(f => f.doc.type === 'Actor'));
  t.is('twenty actors: sixteen archetypes + four opposition', actors.length, 20);
  const ids = new Set(folders.map(f => f.doc._id));
  t.eq('every actor is in a folder', actors.filter(a => !ids.has(a.doc.folder)).map(a => a.doc.name), []);
  t.ok('the four moved actors kept their ids and sit in Opposition', MOVED_IDS.every(i => {
    const a = actors.find(g => g.doc._id === i);
    return a && folders.find(f => f.doc._id === a.doc.folder)?.doc.name === 'Opposition (GM)';
  }));

  // ── the old pack is gone everywhere but migrations and tests ──
  const sys = JSON.parse(readFileSync(join(ROOT, 'system.json'), 'utf8'));
  t.is('system.json declares no example-characters pack', JSON.stringify(sys).includes(OLD), false);
  t.is('no packs-src directory for it', readdirSync(join(ROOT, 'packs-src')).includes(OLD), false);
  const stray = [];
  for (const f of files(ROOT)) {
    const rel = f.slice(ROOT.length + 1).split(String.fromCharCode(92)).join('/');
    if (/^(tests\/|audit\/|TESTING|TODO|CHANGELOG|release-notes)/.test(rel) || /migrations?|example-character-art|character-pack-merge/i.test(rel)) continue;
    if (readFileSync(f, 'utf8').includes(OLD)) stray.push(rel);
  }
  t.eq('nothing else names sr3e-example-characters', stray, []);
}
