/**
 * Gas, smoke and flash grenades deal no damage but still land and mark an area — TODO 155.
 *
 * SR3 p.283: gas "affects everything within a 10-meter radius, and lasts for 2 Combat Turns"; smoke "fills an
 * area 20 meters in diameter, lasting for 2 Combat Turns … applying visibility modifiers"; a flash-pak gives
 * "+4 target number modifier (+2 if the target has flare compensation)" and "imposes its own +2 modifier".
 * The throw used to stop with "no damage code" for all of them.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { AreaEffect } from '../scripts/data/area-effect.mjs';

export const name = 'area-effect';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

export async function run(t) {
  const smoke = { areaRadius: 10, areaEffect: 'A smoke cloud 20 m across for 2 Combat Turns' };

  t.ok('no damage code + an area: it is an effect grenade', !!AreaEffect.of(smoke, null));
  t.eq('…with the radius, the text and the Combat Turns it lasts', (({ radius, turns }) => [radius, turns])(AreaEffect.of(smoke, null)), [10, 2]);
  t.is('a grenade that DEALS damage stays a damage grenade, even with effect text on it',
    AreaEffect.of(smoke, { power: 10, level: 'S', isStun: false }), null);
  t.is('a flash-pak (text, no radius) is an effect with no marked area',
    AreaEffect.of({ areaEffect: 'Anyone facing it takes +4' }, null)?.radius, null);
  t.is('a radius alone is enough', !!AreaEffect.of({ areaRadius: 5 }, null), true);
  t.is('an item with neither is not one', AreaEffect.of({}, null), null);
  t.is('a zero radius is no area', AreaEffect.of({ areaRadius: 0 }, null), null);

  t.is('"lasts for 2 Combat Turns" reads as 2', AreaEffect.turns('lasts for 2 Combat Turns (less in windy areas)'), 2);
  t.is('one Combat Turn', AreaEffect.turns('for 1 Combat Turn'), 1);
  t.is('no duration in the text: it lasts until cleared', AreaEffect.turns('Anyone facing it takes +4'), null);

  t.is('smoke is grey', AreaEffect.color('Smoke Grenade'), '#8a9099');
  t.is('infra-red smoke too', AreaEffect.color('Smoke (IR) Grenade'), '#8a9099');
  t.is('gas is green', AreaEffect.color('Gas Grenade (Neuro-Stun VII)'), '#6fbf73');
  t.is('a flash is white', AreaEffect.color('Flash-Pak'), '#f5f5dc');

  // A marker laid in round 3 that lasts 2 Combat Turns is gone when round 5 begins — not before.
  t.is('laid in round 3, 2 turns: ends at round 5', AreaEffect.expiresRound(3, 2), 5);
  t.ok('…still there in round 4', !AreaEffect.hasExpired(5, 4));
  t.ok('…gone in round 5', AreaEffect.hasExpired(5, 5));
  t.ok('…and after', AreaEffect.hasExpired(5, 9));
  t.is('no combat running (NaN round): no expiry, it stays until cleared', AreaEffect.expiresRound(NaN, 2), null);
  t.is('no duration: no expiry', AreaEffect.expiresRound(3, null), null);
  t.ok('a marker with no expiry never expires', !AreaEffect.hasExpired(null, 99));

  // Wiring (source-level: the throw and the resolution need a live canvas).
  const item = read('scripts/documents/SR3EItem.js');
  t.ok('the throw works out the effect from the item and its (missing) damage code', /AreaEffect\.of\(round, parsedRaw\)/.test(item));
  t.ok('…marks the item\'s own radius, not a blast radius', /areaEffect\s*\?\s*\(areaEffect\.radius \?\? 1\)/.test(item.replace(/\s+/g, ' ')) || /\? \(areaEffect\.radius \?\? 1\)/.test(item));
  t.ok('…and no longer refuses a grenade with no damage code when it has an effect', /if \(!damageBase && !areaEffect\)/.test(item));
  t.ok('…carrying the effect to the resolution', /options\.aoeEffect\s+= areaEffect \?/.test(item));
  const actor = read('scripts/documents/SR3EActor.js');
  t.is('the effect is carried through the roll state at every site', (actor.match(/aoeEffect:\s+(options|state)\.aoeEffect\s+\?\? null/g) ?? []).length, 3);
  t.ok('the resolution runs for an effect grenade (no damage base)', /state\.isWeaponRoll && \(state\.damageBase \|\| state\.aoeEffect\)/.test(actor));
  t.ok('…rolls no resistance: no soak buttons for an effect', /if \(state\.aoeEffect\) \{\s*codes = \[\];/.test(actor));
  t.ok('…states that nothing is applied', /Nothing is applied — the GM decides what it does to whom/.test(actor));
  t.ok('…and draws a coloured marker that ends with its Combat Turns', /color: AreaEffect\.color\(state\.aoeEffect\.name\)/.test(actor) && /expiresRound: AreaEffect\.expiresRound\(/.test(actor));
  t.ok('a marker records its end round', /expiresRound, combatId/.test(actor));
  t.ok('the round change clears expired markers', /SR3EActor\.expireAreaMarkers\(_combat\.round\)/.test(read('scripts/sr3e.js')));
  t.ok('the item sheet edits both fields (projectile, thrown and mini-grenade — TODO 163)', (read('scripts/sheets/SR3EItemSheet.js').match(/'areaRadius'/g) ?? []).length === 3
    && (read('scripts/data/ItemDataModels.js').match(/areaRadius:\s+new NumberField/g) ?? []).length === 3);

  // Shipped data: exactly the p.283 rows that have no damage.
  const dir = new URL('../packs-src/sr3e-sr3-projectiles/', import.meta.url);
  const byName = {};
  for (const f of readdirSync(dir).filter(f => f.endsWith('.json'))) {
    const d = JSON.parse(readFileSync(new URL(f, dir), 'utf8')).doc;
    if (d.system.bookPage === 'sr3.283') byName[d.name] = d.system;
  }
  const radius = n => byName[n]?.areaRadius ?? null;
  t.is('Gas: 10 m radius (p.283)', radius('Gas Grenade (Neuro-Stun VII)'), 10);
  t.is('Smoke: 20 m across is a 10 m radius', radius('Smoke Grenade'), 10);
  t.is('Smoke (IR): the same cloud', radius('Smoke (IR) Grenade'), 10);
  t.is('Flash-Pak marks no area', radius('Flash-Pak'), null);
  for (const n of ['Gas Grenade (Neuro-Stun VII)', 'Smoke Grenade', 'Smoke (IR) Grenade', 'Flash-Pak']) {
    t.ok(`${n} states its effect`, (byName[n]?.areaEffect ?? '').length > 20);
  }
  t.ok('the damaging core grenades carry no area effect, so they stay damage grenades',
    ['Offensive HE Grenade', 'Defensive AP Grenade', 'Concussion Grenade'].every(n => !byName[n]?.areaEffect && !byName[n]?.areaRadius));
  t.eq('the two smoke and the gas cloud last 2 Combat Turns',
    ['Gas Grenade (Neuro-Stun VII)', 'Smoke Grenade', 'Smoke (IR) Grenade'].map(n => AreaEffect.turns(byName[n].areaEffect)), [2, 2, 2]);
}
