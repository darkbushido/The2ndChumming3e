#!/usr/bin/env node
/**
 * Rigger 3 Revised's control, engine and signature modifications — absent from the upstream data, so the packs had none
 * (TODO 265, 2026-10-27: the maintainer pointed at R3R p.126, p.129 and p.134). Writes one `packs-src` JSON per mod into
 * `sr3e-r3-vehicle-mods`; ids are fixed (sr3e-vehiclemod-0300…), so a re-run rewrites the same files. Then `npm run
 * packs:build` (and `packs:install` with Foundry CLOSED).
 *
 * Every figure is the book's customization specification (printed page per row). What each changes is
 * `scripts/data/vehicle-mods.mjs`; a mod priced from the vehicle ships at cost 0 and is priced when it lands on one
 * (`VehicleMods.price`). R3R prints no Legality for these — left blank, for the maintainer.
 *
 *   node tools/add-r3r-vehicle-mods.mjs           write
 *   node tools/add-r3r-vehicle-mods.mjs --check   exit 1 if a file differs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const DIR = new URL('../packs-src/sr3e-r3-vehicle-mods/', import.meta.url);
const IMG = 'systems/The2ndChumming3e/styles/textures/vehicles-default.webp';

/** `[id, name, bookPage, rating, cost, availability, streetIndex, equipment, time, cf, load, description]` */
const MODS = [
  ['0300', 'Drive-by-Wire System', 'r3.129', 1, 0, '8/16 days', '2.5', 'Vehicle Facility',
    'Body x 160 hrs/Vehicle B/R(10-On-Road Handling), Computer(4), Electronics(4)', '0', '',
    'Computer-controlled steering. Handling −1 a level (levels 1-3), and a one-time +10% the player splits among Acceleration, Speed and Load (set it on this mod). Not with improved suspension or control surfaces. Parts: the vehicle\'s original cost × 0.25 a level (worked out when installed). R3R p.129.'],
  ['0301', 'Improved Suspension', 'r3.129', 1, 0, '6/12 days', '2', 'Vehicle Facility', 'Level x 40 hrs/Vehicle B/R(4)', '0', '',
    'Wheeled ground vehicles. On-road Handling −1 a level (a motorcycle\'s off-road too), at most −2. Not with drive-by-wire. Parts: the vehicle\'s original cost × 0.1 a level. R3R p.129.'],
  ['0302', 'Improved Control Surfaces', 'r3.129', 1, 0, '6/12 days', '2', 'Vehicle Facility', 'Level x 40 hrs/Vehicle B/R(4)', '0', '',
    'Watercraft. Handling −1 an increment, at most −2. Not with drive-by-wire. Parts: the vehicle\'s original cost × 0.15 an increment. R3R p.129.'],
  ['0303', 'Off-Road Suspension', 'r3.129', 1, 0, '6/12 days', '2', 'Vehicle Facility', 'Level x 40 hrs/Vehicle B/R(4)', '0', '',
    'Wheeled ground vehicles. Off-road Handling −1 and on-road Handling +1 a level (at most 2), Speed −15 however many levels, and lower Economy. Parts per level: cars × 0.35, bikes × 0.2, medium/heavy transports and tractors × 0.5 of the original cost. R3R pp.129-130.'],
  ['0304', 'Turbocharging/Superconductive Drive', 'r3.126', 1, 0, '6/12 days', '1.5', 'Vehicle Facility',
    '8 hrs per level/Vehicle B/R(levels+2; drones and hovercraft levels+3; electric aircraft levels+4)', '0', '',
    'Methane, gasoline or diesel engines (superconductive drive: electric). Speed +15, Acceleration +1 and Signature −1 a level; Economy −5% a level. Aircraft cannot be turbocharged unless electric. The new maximum Speed is 1.5 × the vehicle\'s (one level always allowed). Parts: 10% of the vehicle\'s list cost a level. R3R p.126.'],
  ['0305', 'Active Thermal Masking', 'r3.134', 1, 0, '8/21 days', '2', 'Vehicle Facility', 'Level x 8 hrs/Vehicle B/R(4)', '3', '100kg',
    'A coolant system for customized combustion engines (not motorcycles): one level per level of engine customization, at most +2. While it runs, Signature +1 and Speed −15 m/turn a level, for 60 − 5 × level minutes; then Signature 2 for 10 minutes. Parts: the engine customization\'s cost × 2, +0.25 for each further level. R3R p.134.'],
  ['0306', 'Noisemaker Dispenser', 'r3.134', null, 350000, '8/21 days', '4.5', 'Ship Facility', '48 hrs/Submarine B/R(4)',
    '16+8/noisemaker', '150kg+25kg/noisemaker',
    'Ships, subs and boats. A released noisemaker adds +3 to every target number to detect or target the boat for that Combat Turn and the next two. 16 CF and 150 kg, plus 8 CF and 25 kg a noisemaker. R3R p.134.'],
  ['0307', 'Radar-Absorbent Materials', 'r3.134', 1, 0, '18/30 days', 'NA', 'Vehicle Facility', '12 hrs/Vehicle B/R(4)', '0', '',
    'Radar-absorbing coatings. Signature +1 a level, at most +3. Use the military-grade Street Index. Parts: (levels)³ × 25,000¥. R3R pp.134-135.'],
  ['0308', 'Thermal Baffles', 'r3.135', 1, 0, '6/14 days', '2', 'Vehicle Facility', 'Level x 8 hrs/Vehicle B/R(4)', '3', 'Body*50kg',
    'Combustion engines. Signature +1 a level, at most +2 (or what the Load allows); the same as a + to thermographic Perception Tests against the vehicle. 3 CF and Body × 50 kg a level. Parts a level: Body × 5,000¥ ground vehicles, 6,000¥ motorcycles, 7,500¥ trucks and fixed-wing, 10,000¥ tractors and helicopters, 3,750¥ hovercraft, 2,500¥ watercraft and zeppelins. R3R p.135.'],
];

const slug = name => `${name}-vehicle`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const check = process.argv.includes('--check');
let differ = 0;
for (const [n, name, bookPage, rating, cost, availability, streetIndex, installEquipment, installTime, cfCost, load, description] of MODS) {
  const id = `sr3e-vehiclemod-${n}`;
  const doc = {
    _key: `!items!${id}`,
    doc: {
      _id: id, name: `${name} (Vehicle)`, type: 'vehiclemod', img: IMG,
      system: { cost, availability, streetIndex, installEquipment, installTime, cfCost, load, bookPage, description, rating,
        modFor: 'vehicle', legality: '' },
      effects: [],
    },
    embedded: {},
  };
  const file = new URL(`${slug(name)}.${id}.json`, DIR);
  const text = `${JSON.stringify(doc, null, 2)}\n`;
  const same = existsSync(file) && readFileSync(file, 'utf8') === text;
  if (same) continue;
  differ++;
  if (check) console.log(`differs: ${name}`);
  else writeFileSync(file, text);
}
console.log(check ? `${differ} of ${MODS.length} differ` : `${differ} of ${MODS.length} written`);
if (check && differ) process.exit(1);
