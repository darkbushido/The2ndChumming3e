/**
 * Spirit pictures — 0.9.1. Summoned spirits pointed at `systems/sr3e/assets/spirits/<category>.svg` (wrong system id,
 * folder never existed → broken image). They get `spiritIcon(category)`; a world copy is repointed.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spiritIcon, ICON_DIR } from '../scripts/data/item-icons.mjs';
import { SpiritArt } from '../scripts/data/spirit-art.mjs';
import { SPIRIT_TYPES } from '../scripts/documents/SR3ESpiritSummoning.js';

export const name = 'spirit-art';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OLD = c => `systems/sr3e/assets/spirits/${c}.svg`;

function* jsFiles(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) yield* jsFiles(p); else if (/\.(js|mjs)$/.test(f)) yield p;
  }
}

export async function run(t) {
  t.is('elemental', spiritIcon('elemental'), `${ICON_DIR}/spirit-elemental.svg`);
  t.is('nature', spiritIcon('nature'), `${ICON_DIR}/spirit-nature.svg`);
  t.is('an unknown category gets the plain spirit', spiritIcon('watcher'), `${ICON_DIR}/spirit.svg`);
  t.is('no category gets the plain spirit', spiritIcon(undefined), `${ICON_DIR}/spirit.svg`);

  const cats = new Set(Object.values(SPIRIT_TYPES).map(d => d.category));
  const missing = [...cats].filter(c => !existsSync(join(ROOT, 'styles/icons', `spirit-${c}.svg`)));
  t.eq('every spirit category has a drawn icon of its own', missing, []);

  // Every nature spirit the core book lists is summonable (SR3 p.266: land, waters, sky, man) — Sea was missing.
  const natureKeys = Object.entries(SPIRIT_TYPES).filter(([, d]) => d.category === 'nature').map(([k]) => k).sort();
  t.eq('all 14 SR3 nature spirits are summonable', natureKeys, [
    'city_spirit', 'desert_spirit', 'field_spirit', 'forest_spirit', 'hearth_spirit', 'lake_spirit', 'mist_spirit',
    'mountain_spirit', 'prairie_spirit', 'river_spirit', 'sea_spirit', 'storm_spirit', 'swamp_spirit', 'wind_spirit']);
  t.is('a Sea Spirit is a nature spirit with the leaf icon', spiritIcon(SPIRIT_TYPES.sea_spirit.category), `${ICON_DIR}/spirit-nature.svg`);
  t.ok('Sea Spirit carries the Waters class stats (B F+2, R F-1)', SPIRIT_TYPES.sea_spirit.stats(6).body === 8 && SPIRIT_TYPES.sea_spirit.stats(6).reaction === 5);

  const mk = (img, tex, flags, isToken = false) => ({ img, isToken, flags, prototypeToken: { texture: { src: tex } } });
  const F = c => ({ The2ndChumming3e: { spiritCategory: c } });
  t.eq('a broken elemental picture and token are repointed', SpiritArt.fixActor(mk(OLD('elemental'), OLD('elemental'), F('elemental'))),
    { img: spiritIcon('elemental'), 'prototypeToken.texture.src': spiritIcon('elemental') });
  t.eq('the category comes from the flag', SpiritArt.fixActor(mk(OLD('elemental'), 'x.png', F('nature'))), { img: spiritIcon('nature') });
  t.eq('no flag: the old file name names it', SpiritArt.fixActor(mk(OLD('nature'), OLD('nature'), {})),
    { img: spiritIcon('nature'), 'prototypeToken.texture.src': spiritIcon('nature') });
  t.eq('an unlinked token actor gets the picture only', SpiritArt.fixActor(mk(OLD('nature'), OLD('nature'), F('nature'), true)), { img: spiritIcon('nature') });
  t.is('a GM\'s own art is kept', SpiritArt.fixActor(mk('worlds/x/fire.webp', 'worlds/x/fire.webp', F('elemental'))), null);
  t.is('idempotent', SpiritArt.fixActor(mk(spiritIcon('elemental'), spiritIcon('elemental'), F('elemental'))), null);

  const mig = readFileSync(join(ROOT, 'scripts/SR3EMigrations.js'), 'utf8');
  t.ok('the 0.9.1 migration is wired', /version: '0\.9\.1'[\s\S]{0,1200}SpiritArt\.fixActor/.test(mig));

  const bad = [];
  for (const f of jsFiles(join(ROOT, 'scripts'))) {
    if (/systems\/sr3e\//.test(readFileSync(f, 'utf8').replace(/DEAD_PREFIX = '[^']*'/, ''))) bad.push(f.slice(ROOT.length + 1));
  }
  t.eq('no scripts/ file names the wrong system id (systems/sr3e/)', bad.filter(f => !/SR3EMigrations|spirit-art/.test(f)), []);
}
