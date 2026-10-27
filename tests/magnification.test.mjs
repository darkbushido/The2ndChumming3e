/**
 * Image magnification shifts the range band · SR3 p.110, p.113 — TODO 276 (TODO 235's request).
 *
 * A Rating 2 device at Long range shifts two places toward Short (base TN 6 → 4), never below Short. The HIGHEST device in
 * use counts — they do not stack (the maintainer, 2026-10-24): the gun's scope, a worn helmet's magnification, cybereyes.
 */
import { readFileSync } from 'node:fs';
import { Magnification } from '../scripts/data/magnification.mjs';
import { MOD_EFFECTS } from '../scripts/data/mod-effects.mjs';

export const name = 'magnification';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

const scope = r => ({ _id: `s${r}`, name: 'Imaging Scope (Weapon)', type: 'gear', system: { rating: r, modifiers: MOD_EFFECTS['gear|Imaging Scope'] } });
const gun = (...mods) => ({ name: 'Ruger 100', type: 'firearm', system: { installed: mods } });
const helmet = (worn = true) => ({ name: 'Security Helmet', type: 'armor', system: { worn,
  installed: [{ _id: 'h', name: 'Electronic Magnification (Armor)', type: 'armor', system: { rating: 3, modifiers: MOD_EFFECTS['armor|Electronic Magnification'] } }] } });
const eyes = r => ({ name: 'Eyes, Vision Magnification, Electronic', type: 'cyberware', system: { rating: r, modifiers: MOD_EFFECTS['cyberware|Eyes, Vision Magnification, Electronic'] } });

export async function run(t) {
  t.is('Rating 2 at Long (2) → Short (0) — the book\'s example, TN 6 → 4', Magnification.shift(2, 2), 0);
  t.is('Rating 1 at Extreme → Long', Magnification.shift(3, 1), 2);
  t.is('never below Short', Magnification.shift(1, 3), 0);
  t.is('no magnification: unchanged', Magnification.shift(2, 0), 2);
  t.is('no band (unmeasured): unchanged', Magnification.shift(-1, 2), -1);

  t.eq('the gun\'s scope [2]', Magnification.best(gun(scope(2)), []), { rating: 2, source: 'Ruger 100 (Imaging Scope (Weapon))' });
  t.eq('a worn helmet\'s magnification 3 (SR3 p.284)', Magnification.best(gun(), [helmet()]), { rating: 3, source: 'Security Helmet (Electronic Magnification (Armor))' });
  t.is('…not while it is off', Magnification.best(gun(), [helmet(false)]).rating, 0);
  t.eq('cybereyes Vision Magnification [2]', Magnification.best(gun(), [eyes(2)]), { rating: 2, source: 'Eyes, Vision Magnification, Electronic' });
  t.is('they do not stack: scope 2 + helmet 3 + eyes 2 → 3, the highest (the maintainer, TODO 235)', Magnification.best(gun(scope(2)), [helmet(), eyes(2)]).rating, 3);
  t.eq('nothing: rating 0, no source', Magnification.best(gun(), []), { rating: 0, source: null });

  const item = read('scripts/documents/SR3EItem.js');
  t.ok('the attack pre-sets the range to the magnified band', /const mag = Magnification\.best\(this, actor\.items\);[\s\S]{0,300}bandIdx: to, magnified:/.test(item));
  t.ok('…and the dialog says so, still editable', /rangeInfo\.magnified \? `<div[^`]*🔭/.test(item));
  t.ok('the GM window\'s row points at the range shift', /key: 'imageMag'[^\n]*shifts the Range band/.test(read('scripts/SR3ECombatModifiers.js')));
}
