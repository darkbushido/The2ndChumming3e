/**
 * Portraits from an optional portrait module, and NPC names · TODO 262 ("Meet the contact").
 *
 * The system must work with NO portrait module, never name one, and never apply a portrait on its own.
 */
import { readFileSync } from 'node:fs';
import { Portraits, SCHEMA, DEMOGRAPHICS, BASES } from '../scripts/data/portraits.mjs';
import { Names, POOLS, ETHNICITIES, STREET_CHANCE } from '../scripts/data/names.mjs';

export const name = 'portraits';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

const flag = (index = 'portraits/index.json', schema = SCHEMA) => ({ The2ndChumming3e: { portraits: { index, schema } } });
const E = (o) => ({ path: `portraits/${o.metatype}/${o.job}/x-${o.n ?? 1}.webp`, base: o.base ?? o.metatype, gender: 'male',
                   age: '30s', minor: false, lifestyle: 'low', group: 'civilian', ethnicity: 'Latino', ...o });

/** A seeded rng so name tests are repeatable. */
const seeded = (s = 1) => () => ((s = (s * 16807) % 2147483647) / 2147483647);

export async function run(t) {
  /* ── Discovery: any active module with the flag; none → nothing ─────────── */
  const mods = [
    { id: 'sr3e-portraits', active: true, flags: flag() },
    { id: 'off', active: false, flags: flag() },
    { id: 'other', active: true, flags: {} },
    { id: 'future', active: true, flags: flag('p.json', 2) },
    { id: 'escape', active: true, flags: flag('../../worlds/x.json') },
    { id: 'abs', active: true, flags: flag('https://evil.example/i.json') },
  ];
  t.is('only the active, flagged, schema-1 module is a source',
    JSON.stringify(Portraits.sources(mods)), JSON.stringify([{ moduleId: 'sr3e-portraits', url: 'modules/sr3e-portraits/portraits/index.json' }]));
  t.is('no modules → no sources (the system works without the portrait module)', Portraits.sources([]).length, 0);
  t.is('undefined modules → no sources, no throw', Portraits.sources(undefined).length, 0);

  /* ── Validation: a broken index never breaks the system ─────────────────── */
  t.is('a wrong schema is refused', Portraits.validate({ schema: 2, entries: [] }, 'm').ok, false);
  t.is('garbage is refused', Portraits.validate('nope', 'm').ok, false);
  const ix = Portraits.validate({ schema: 1, jobs: { cook: 'civilian', bartender: 'civilian', ganger: 'underworld' },
    archetypes: { 'Dock Worker': { job: 'dock_worker', exact: true } },
    entries: [
      E({ metatype: 'troll', job: 'cook', n: 1 }),
      E({ metatype: 'fomori', base: 'troll', job: 'cook', n: 2 }),
      E({ metatype: 'human', job: 'cook', n: 3 }),
      E({ metatype: 'troll', job: 'bartender', n: 4 }),
      E({ metatype: 'troll', job: 'ganger', group: 'underworld', n: 5 }),
      E({ metatype: 'troll', job: 'cook', gender: 'female', n: 6 }),
      E({ metatype: 'troll', job: 'schoolkid', minor: true, age: 'child', n: 7 }),
      E({ metatype: 'troll', job: 'cook', path: '../../secret.webp' }),
      E({ metatype: 'troll', job: 'cook', base: 'goblin', n: 9 }),
      E({ metatype: 'troll', job: 'cook', gender: 'x', n: 10 }),
    ] }, 'sr3e-portraits');
  t.is('bad entries are dropped, good ones kept', ix.entries.length, 7);
  t.is('each entry gets its image URL', ix.entries[0].src, 'modules/sr3e-portraits/portraits/troll/cook/x-1.webp');
  const merged = Portraits.merge([ix, { ok: false }]);

  /* ── Matching ────────────────────────────────────────────────────────────── */
  const c = Portraits.candidates(merged, { metatype: 'troll', gender: 'male', job: 'cook' });
  t.is('best match first: exact, then variant, then any metatype, then same group, then same metatype',
    c.map(e => `${e.match}:${e.n ?? e.path.split('-').pop()}`).join(' '),
    'exact:1 base:2 job:3 group:4 metatype:5');
  t.ok('gender filters every tier', c.every(e => e.gender === 'male'));
  t.ok('minors never appear unless asked for', c.every(e => !e.minor));
  t.is('a minor is found only when a minor is asked for',
    Portraits.candidates(merged, { metatype: 'troll', minor: true }).map(e => e.job).join(), 'schoolkid');
  t.is('no job: same metatype and its variants (the fomori counts as a troll)', Portraits.candidates(merged, { metatype: 'troll', gender: 'male' }).length, 4);
  t.is('ages narrow', Portraits.candidates(merged, { metatype: 'troll', job: 'cook', ages: ['70s'] }).length, 0);
  t.is('an empty index → nothing, no throw', Portraits.candidates({ entries: [] }, { metatype: 'troll', job: 'cook' }).length, 0);
  t.is('archetype → job comes from the module index', Portraits.archetypeJob(merged, 'Dock Worker').job, 'dock_worker');
  t.is('an archetype the index does not know → null', Portraits.archetypeJob(merged, 'Ghost'), null);

  /* ── Gender text and stock pictures ─────────────────────────────────────── */
  t.is('F → female', Portraits.normaliseGender('F'), 'female');
  t.is('Woman → female', Portraits.normaliseGender(' Woman'), 'female');
  t.is('male → male', Portraits.normaliseGender('male'), 'male');
  t.is('blank or other → null (the GM picks)', [Portraits.normaliseGender(''), Portraits.normaliseGender('nonbinary')].join(), ',');
  t.ok('mystery man and blank are stock (may be preselected)', Portraits.isStockImg('icons/svg/mystery-man.svg') && Portraits.isStockImg(''));
  t.is('a chosen picture is not stock (offer, never replace)', Portraits.isStockImg('worlds/x/me.webp'), false);

  /* ── Seattle mix ─────────────────────────────────────────────────────────── */
  t.ok('the population covers exactly the system metatypes', Object.keys(DEMOGRAPHICS).sort().join() === [...BASES].sort().join());
  {
    const rng = seeded(21);
    const rolls = Array.from({ length: 2000 }, () => Portraits.rollMetatype(rng));
    const share = m => rolls.filter(r => r === m).length / rolls.length;
    t.ok(`humans about 65% (${Math.round(share('human') * 100)}%)`, Math.abs(share('human') - 0.65) < 0.05);
    t.ok('trolls rare but present', share('troll') > 0 && share('troll') < 0.06);
  }

  /* ── Names ───────────────────────────────────────────────────────────────── */
  for (const eth of ETHNICITIES) {
    for (const [sub, pool] of Object.entries(POOLS[eth])) {
      t.ok(`${eth}/${sub}: names for women, men and a surname list`, pool.female.length >= 4 && pool.male.length >= 4 && pool.last.length >= 4);
    }
  }
  {
    const n = Names.generate({ ethnicity: 'Latino', gender: 'female', metatype: 'troll', group: 'civilian', streetChance: 0, rng: seeded(3) });
    t.ok('a Latino name for a Latino face', POOLS.Latino.latino.female.includes(n.first) && POOLS.Latino.latino.last.includes(n.last));
    t.is('no street name when the chance is 0', n.street, null);
    t.is('full = first last', n.full, `${n.first} ${n.last}`);
  }
  {
    const n = Names.generate({ ethnicity: 'East Asian', gender: 'male', metatype: 'ork', streetChance: 1, rng: seeded(5) });
    t.ok('a street name when the chance is 1, in quotes', n.street && n.full === `${n.first} "${n.street}" ${n.last}`);
    const sub = Object.values(POOLS['East Asian']).find(p => p.male.includes(n.first));
    t.ok('first and last name come from the same heritage pool', sub && sub.last.includes(n.last));
  }
  {
    const rng = seeded(11);
    const runs = Array.from({ length: 400 }, () => Names.generate({ metatype: 'human', group: 'underworld', rng }));
    const streets = runs.filter(r => r.street).length / runs.length;
    t.ok(`underworld gets a street name about ${STREET_CHANCE.underworld * 100}% of the time (${Math.round(streets * 100)}%)`,
      Math.abs(streets - STREET_CHANCE.underworld) < 0.1);
    const elves = Array.from({ length: 300 }, () => Names.generate({ metatype: 'elf', rng }));
    const known = new Set(Object.values(POOLS).flatMap(f => Object.values(f).flatMap(p => [...p.female, ...p.male])));
    t.ok('elves sometimes take an elven given name', elves.some(e => !known.has(e.first)));
    t.ok('…and usually a real-world one', elves.filter(e => known.has(e.first)).length > 150);
    for (const meta of ['ork', 'troll', 'dwarf', 'human', 'other']) {
      const rs = Array.from({ length: 200 }, () => Names.generate({ metatype: meta, streetChance: 0, rng }));
      t.ok(`${meta}s carry real-world names (born to human families — no fantasy names)`, rs.every(r => known.has(r.first)));
    }
    t.ok('unknown heritage still yields a name', !!Names.generate({ ethnicity: 'Martian', rng }).full);
  }
  t.is('same seed, same name (repeatable)', Names.generate({ rng: seeded(9) }).full, Names.generate({ rng: seeded(9) }).full);

  /* ── The system never names the private module ───────────────────────────── */
  for (const rel of ['scripts/data/portraits.mjs', 'scripts/data/names.mjs', 'scripts/SR3EMeetContact.js', 'system.json']) {
    let src = '';
    try { src = read(rel); } catch { continue; }
    t.ok(`${rel}: does not name the portrait module`, !/sr3e-portraits/.test(src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')));
  }
}
