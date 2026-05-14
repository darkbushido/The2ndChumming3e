/**
 * Converts rawdata/cyberdecksDF.json into packs/sr3e-cyberdecks.db (NeDB / NDJSON format).
 * Run once from the project root: node build-cyberdeck-pack.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));

const raw = JSON.parse(readFileSync(join(__dir, 'rawdata', 'cyberdecksDF.json'), 'utf8'));

const items = [];
let idx = 0;

for (const era of Object.values(raw.cyberdecks)) {
  for (const deck of era) {
    const id = `sr3e-deck-${String(idx).padStart(4, '0')}`;
    idx++;

    items.push(JSON.stringify({
      img: 'icons/svg/network.svg',
      _id: id,
      name: deck.name,
      type: 'cyberdeck',
      system: {
        era:          deck.era ?? '',
        cost:         deck.cost ?? 0,
        streetIndex:  deck.streetIndex ?? 0,
        availability: deck.availability ?? '',
        legalityCode: deck.legalityCode ?? '4P-S',
        weight:       0,
        notes:        deck.notes ?? '',
        damage: {
          matrixConditionMonitor: { boxes: 10, current: 0, woundPenalties: [0,1,2,3,4,5] },
          burnedSlots: [],
        },
        attributes: {
          mpcp:     { value: deck.mpcp ?? 0, base: deck.mpcp ?? 0, multiplier: 8, costPerMp: 300 },
          firewall: { value: deck.firewall ?? 0, base: deck.firewall ?? 0, multiplier: 8, costPerMp: 200 },
          response: { value: deck.response ?? 0, base: deck.response ?? 0, maxLevel: 0, initiativeDice: 0, reactionBonus: 0 },
          memory:          { total: deck.memory ?? 0, used: 0, unit: 'Mp' },
          utilitySlots:    { total: 0, available: 0 },
          dataTransferRate: { value: deck.dataTransferRate ?? 0, unit: 'Mp per Combat Turn' },
          fluxRating:      { value: 1, wireless: false },
        },
        derivedStats: {
          matrixInitiative:  { base: 0, dice: '0d6', userModeRequired: 'VR-Hot' },
          hackingPoolBonus:  0,
          personaStorage:    0,
          iconPhysicalStats: { strength: 0, quickness: 0 },
        },
        modules:           [],
        utilitySlotsArray: [],
        storedUtilities:   [],
      },
    }));
  }
}

const outPath = join(__dir, 'packs', 'sr3e-cyberdecks.db');
writeFileSync(outPath, items.join('\n') + '\n', 'utf8');
console.log(`Wrote ${items.length} cyberdecks to ${outPath}`);
