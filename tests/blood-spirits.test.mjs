/**
 * Blood spirits — MitS p.133-134 (TODO 315). The stat line is the Blood Spirit block, MitS p.134.
 */
import { readFileSync } from 'node:fs';
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { BloodSpirits, BLOOD_SACRIFICES } = await import('../scripts/data/blood-spirits.mjs');
const { SPIRIT_TYPES } = await import('../scripts/documents/SR3ESpiritSummoning.js');
const { spiritIcon, ICON_DIR } = await import('../scripts/data/item-icons.mjs');

export const name = 'blood-spirits';

export async function run(t) {
  // ── The stat line, MitS p.134, at two Forces ─────────────────────────────────────────────
  t.eq('F4 — B F+1, Q F+2 (x3), S F-2, C/I/W/E/Mag F, R F+1, INIT astral (F+1)+20, physical (F+1)+10', BloodSpirits.stats(4),
    { body: 5, quickness: 6, strength: 2, charisma: 4, intelligence: 4, willpower: 4, essence: 4, magic: 4, reaction: 5,
      initiative: 25, initiativePhysical: 15, moveMultiplier: 3 });
  t.eq('F6 — the same line', BloodSpirits.stats(6),
    { body: 7, quickness: 8, strength: 4, charisma: 6, intelligence: 6, willpower: 6, essence: 6, magic: 6, reaction: 7,
      initiative: 27, initiativePhysical: 17, moveMultiplier: 3 });
  t.eq('powers (p.134)', BloodSpirits.powers(), ['Essence Drain', 'Fear', 'Guard', 'Materialization', 'Noxious Breath']);
  t.eq('weakness (p.134)', BloodSpirits.weaknesses(), ['Essence Loss (1 point per day)']);

  // ── The Blood Spirit Table, p.134 ─────────────────────────────────────────────────────────
  t.is('small animal → 1', BloodSpirits.maxForce('small'), 1);
  t.is('medium animal → 2', BloodSpirits.maxForce('medium'), 2);
  t.is('large animal → 3', BloodSpirits.maxForce('large'), 3);
  t.is('an Awakened animal adds +1 (devil rat → 2)', BloodSpirits.maxForce('small', { awakenedAnimal: true }), 2);
  t.is('mundane sentient → its Essence, rounded down', BloodSpirits.maxForce('mundane', { rating: 5.8 }), 5);
  t.is('Awakened sentient → its Magic', BloodSpirits.maxForce('awakened', { rating: 6 }), 6);
  t.is('unknown sacrifice → null', BloodSpirits.maxForce('spirit'), null);
  t.is('five rows', Object.keys(BLOOD_SACRIFICES).length, 5);

  // ── Who may summon — warn, never refuse ──────────────────────────────────────────────────
  t.eq('the GM is never warned', BloodSpirits.summonVerdict({ isGM: true }), { offered: true, warn: false });
  t.eq('a non-sacrificer is offered AND warned', BloodSpirits.summonVerdict({ knowsSacrificing: false }), { offered: true, warn: true });
  t.eq('a sacrificer is not warned', BloodSpirits.summonVerdict({ knowsSacrificing: true }), { offered: true, warn: false });
  t.ok('Sacrificing found in an item name', BloodSpirits.knowsSacrificing({ itemNames: ['Metamagic: Sacrificing'] }));
  t.ok('…or the notes', BloodSpirits.knowsSacrificing({ notes: 'Initiate 2: Masking, sacrifice' }));
  t.ok('nothing → no', !BloodSpirits.knowsSacrificing({ itemNames: ['Ares Predator'], notes: '' }));

  // ── The cost is stated, never applied ────────────────────────────────────────────────────
  t.ok('cost text names the kill and the hours', /4 hours/.test(BloodSpirits.costText(4)) && /KILLED/.test(BloodSpirits.costText(4)));
  t.ok('upkeep text names the leash', /400 m/.test(BloodSpirits.upkeepText(4)));
  const src = readFileSync(new URL('../scripts/documents/SR3ESpiritSummoning.js', import.meta.url), 'utf8');
  t.ok('the summon flow never damages or deletes a victim', !/blood[\s\S]{0,400}(applyDamage|\.delete\(\))/i.test(src));

  // ── Wired into summoning ─────────────────────────────────────────────────────────────────
  const def = SPIRIT_TYPES.blood_spirit;
  t.is('one blood entry, category blood', Object.values(SPIRIT_TYPES).filter(v => v.category === 'blood').length, 1);
  t.is('entry stats come from the module', def.stats(4).reaction, 5);
  t.ok('entry lists the weakness', def.powers.includes('Weakness: Essence Loss (1 point per day)'));
  t.is('blood spirits get their own icon', spiritIcon('blood', 'blood_spirit'), `${ICON_DIR}/spirit-blood.svg`);
}
