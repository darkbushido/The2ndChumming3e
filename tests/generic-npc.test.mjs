/**
 * Race-agnostic generic NPCs · TODO 273: mix rolling, the token delta, face choice, and the source-level
 * invariants of the preCreateToken hook (sync, GM-only, unlinked only, never writes the sidebar actor).
 */
import { readFileSync } from 'node:fs';
import { GenericNpc, SEATTLE_MIX, MIX_RACES, GENERIC_FLAG } from '../scripts/data/generic-npc.mjs';
import { DEMOGRAPHICS } from '../scripts/data/portraits.mjs';

export const name = 'generic-npc';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const seeded = (s = 7) => () => ((s = (s * 16807) % 2147483647) / 2147483647);

const LIMITS = {
  human: { body: 6, quickness: 6, strength: 6, charisma: 6, intelligence: 6, willpower: 6 },
  ork:   { body: 9, quickness: 6, strength: 8, charisma: 5, intelligence: 5, willpower: 6 },
  elf:   { body: 6, quickness: 7, strength: 6, charisma: 8, intelligence: 6, willpower: 6 },
  dwarf: { body: 7, quickness: 6, strength: 8, charisma: 6, intelligence: 6, willpower: 7 },
  troll: { body: 11, quickness: 5, strength: 10, charisma: 4, intelligence: 4, willpower: 6 },
};
const opts = rng => ({ rng, limits: LIMITS, racialMax: l => Math.round(l * 1.5) });
const E = (o, n) => ({ path: `p/${o.base}/${o.job}/${n}.webp`, src: `m/p/${o.base}/${o.job}/${n}.webp`, metatype: o.base,
  gender: 'male', age: '30s', minor: false, lifestyle: 'low', group: 'civilian', ethnicity: 'Latino', ...o });

export async function run(t) {
  /* the mix */
  t.is('five races, no "other" (it has no stat row)', JSON.stringify(MIX_RACES), JSON.stringify(['human', 'ork', 'elf', 'dwarf', 'troll']));
  t.is('the Seattle mix is DEMOGRAPHICS (human 65, ork 16, elf 12, dwarf 3, troll 2.5)',
    JSON.stringify(SEATTLE_MIX), JSON.stringify({ human: DEMOGRAPHICS.human, ork: DEMOGRAPHICS.ork, elf: DEMOGRAPHICS.elf, dwarf: DEMOGRAPHICS.dwarf, troll: DEMOGRAPHICS.troll }));
  t.is('a missing or "seattle" flag is the Seattle mix', JSON.stringify(GenericNpc.mixOf('seattle')), JSON.stringify(SEATTLE_MIX));
  t.is('garbage falls back to the Seattle mix', JSON.stringify(GenericNpc.mixOf({ human: -3, ork: 'x' })), JSON.stringify(SEATTLE_MIX));
  t.is('a custom mix keeps positive weights over the five races only',
    JSON.stringify(GenericNpc.mixOf({ troll: 1, ork: 3, human: 0, other: 9 })), JSON.stringify({ ork: 3, troll: 1 }));
  t.is('a one-race mix always rolls that race', [1, 2, 3, 4, 5].every(() => GenericNpc.roll({ elf: 1 }) === 'elf'), true);

  const rng = seeded();
  const counts = { human: 0, ork: 0, elf: 0, dwarf: 0, troll: 0 };
  const N = 20000;
  for (let i = 0; i < N; i++) counts[GenericNpc.roll('seattle', rng)]++;
  const share = r => counts[r] / N;
  t.ok('rolled shares follow the Seattle mix (human ~66%, ork ~16%, elf ~12%)',
    Math.abs(share('human') - 0.66) < 0.02 && Math.abs(share('ork') - 0.162) < 0.015 && Math.abs(share('elf') - 0.122) < 0.015);
  t.ok('dwarves and trolls appear, rarely', counts.dwarf > 0 && counts.troll > 0 && share('troll') < 0.05);

  /* the token delta */
  const attrs = { body: 9, quickness: 4, strength: 8, charisma: 3, intelligence: 4, willpower: 5 };
  const toTroll = GenericNpc.forToken({ attrs, bookMetatype: 'ork', mix: { troll: 1 } }, opts());
  t.is('delta: the rolled metatype', toTroll.delta.system.metatype, 'troll');
  t.is('delta: shifted from the BOOK race (ork Body 9 -> troll 11)', toTroll.delta.system.attributes.body.base, 11);
  t.is('delta: Quickness 4 -> 3 (troll -1, ork 0)', toTroll.delta.system.attributes.quickness.base, 3);
  t.is('delta: only changed attributes (Willpower absent)', 'willpower' in toTroll.delta.system.attributes, false);
  t.is('no portrait source: no texture, still varied stats', toTroll.texture, null);
  const same = GenericNpc.forToken({ attrs, bookMetatype: 'ork', mix: { ork: 1 } }, opts());
  t.is('rolling the book\'s own race changes no attribute', 'attributes' in same.delta.system, false);

  /* faces: this race, this job, best tier, gender */
  const index = { jobs: { cook: 'civilian', fixer: 'underworld' }, entries: [
    E({ base: 'troll', job: 'cook', gender: 'female' }, 'a'),
    E({ base: 'troll', job: 'cook', gender: 'female' }, 'b'),
    E({ base: 'troll', job: 'fixer', gender: 'female' }, 'c'),
    E({ base: 'ork', job: 'cook', gender: 'female' }, 'd'),
    E({ base: 'troll', job: 'cook', gender: 'male', minor: true }, 'e'),
  ] };
  const face = GenericNpc.pickFace(index, { metatype: 'troll', job: 'cook', gender: 'female' }, seeded());
  t.ok('a face of the rolled race and the archetype\'s job', face && face.base === 'troll' && face.job === 'cook' && face.gender === 'female');
  t.is('no face of that race and job -> null (never another race)', GenericNpc.pickFace(index, { metatype: 'dwarf', job: 'cook', gender: 'female' }), null);
  t.is('no job (archetype not in the index) -> null', GenericNpc.pickFace(index, { metatype: 'troll', job: null, gender: 'female' }), null);
  t.is('no index -> null', GenericNpc.pickFace(null, { metatype: 'troll', job: 'cook' }), null);
  t.is('a minor is never chosen for an adult', [1, 2, 3, 4, 5, 6].every(i => GenericNpc.pickFace(index, { metatype: 'troll', job: 'cook', gender: 'male' }, seeded(i)) === null), true);
  const withFace = GenericNpc.forToken({ attrs, bookMetatype: 'ork', mix: { troll: 1 }, index, job: 'cook', gender: 'female' }, opts(seeded(3)));
  t.ok('forToken: texture and gender come from the face', /^m\/p\/troll\/cook\//.test(withFace.texture) && withFace.delta.system.gender === 'female'
    && withFace.delta.system.ethnicity === 'Latino');

  /* the hook and the module, source-level */
  const gen = strip(read('scripts/SR3EGenericNpc.js'));
  const main = strip(read('scripts/sr3e.js'));
  t.ok('flag name', GENERIC_FLAG === 'genericNpc');
  t.ok('preCreateToken is registered and does not await (Foundry would not wait)',
    /Hooks\.on\('preCreateToken', \(token\) => \{[^}]*SR3EGenericNpc\.prepareToken\(token\)/.test(main) && !/Hooks\.on\('preCreateToken', async/.test(main));
  t.ok('prepareToken is synchronous', /static prepareToken\(token\)/.test(gen) && !/async prepareToken/.test(gen));
  t.ok('only the active GM rolls', /game\.user\.id !== game\.users\.activeGM\?\.id\) return false/.test(gen));
  t.ok('linked tokens are left alone', /token\.actorLink\) return false/.test(gen));
  t.ok('it writes the TOKEN (updateSource delta), never the sidebar actor, when a token is made',
    /token\.updateSource\(data\)/.test(gen) && !/prepareToken[\s\S]*?actor\.update\(/.test(gen.slice(gen.indexOf('static prepareToken'), gen.indexOf('static async mark'))));
  t.ok('the portrait index is warmed at ready, GM only', /Hooks\.once\('ready', \(\) => \{ SR3EGenericNpc\.warm\(\); \}\)/.test(main) && /!game\.user\.isGM/.test(gen));
  t.ok('a generic stays a live actor (isTemplate false) with an unlinked, numbered token',
    /isTemplate`\]: false/.test(gen) && /actorLink: false/.test(gen) && /appendNumber: true/.test(gen));
  t.ok('portraits are read through Portraits, and no portrait module is named',
    /Portraits\.archetypeJob/.test(gen) && /Portraits\.sources/.test(gen) && !/sr3e-portraits/.test(gen));
  t.ok('the mark dialog is wired through DialogV2.wait\'s render option', /render: \(_event, dialog\) => wireMix\(dialog, dialog\.element\)/.test(gen));
  t.ok('registered on game.sr3e', /game\.sr3e = \{[^}]*\bSR3EGenericNpc\b/.test(main));
}
