/**
 * Converts rawdata/Armor.json into packs/sr3e-armor.db (NeDB / NDJSON format).
 * Run once from the project root: node build-armor-pack.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));

const raw = JSON.parse(readFileSync(join(__dir, 'rawdata', 'Armor.json'), 'utf8'));

function parseIntField(val) {
  if (!val || val === '-' || val === '') return 0;
  const s = String(val).replace(/^\+/, '').trim();
  const n = Math.round(parseFloat(s));
  return isNaN(n) ? 0 : Math.max(0, n);
}

function parseFloatField(val) {
  if (!val || val === '-' || val === '') return 0;
  const s = String(val).replace(/^\+/, '').trim();
  const n = parseFloat(s);
  return isNaN(n) ? 0 : Math.max(0, n);
}

function parseCost(val) {
  if (!val || val === '-' || val === '') return 0;
  const s = String(val).replace(/^\+/, '').trim();
  const n = parseInt(s);
  return isNaN(n) ? 0 : Math.max(0, n);
}

const lines = raw.map((entry, i) => {
  const id = `sr3e-armor-${String(i).padStart(4, '0')}`;
  const name = String(entry.Name).replace(/\s+/g, ' ').trim();

  const ballistic = parseIntField(entry.Ballistic);
  const impact    = parseIntField(entry.Impact);
  const weight    = parseFloatField(entry.Weight);
  const cost      = parseCost(entry.Cost);

  // Store concealability as string - "-", "10", "+2", "varies" are all valid
  const concealability = String(entry.Concealability ?? '-').trim();

  // Note non-integer or special source values so nothing is silently dropped
  const notes = [];
  const rawB = String(entry.Ballistic ?? '').trim();
  const rawI = String(entry.Impact ?? '').trim();
  if (rawB.startsWith('+') && ballistic > 0) notes.push(`Ballistic +${ballistic} (additive modifier)`);
  if (rawI.startsWith('+') && impact > 0) notes.push(`Impact +${impact} (additive modifier)`);
  if (['(special)', 'varies'].includes(rawB.toLowerCase())) notes.push(`Ballistic: ${rawB}`);
  if (['(special)', 'varies'].includes(rawI.toLowerCase())) notes.push(`Impact: ${rawI}`);

  const item = {
    img: 'icons/svg/shield.svg',
    _id: id,
    name,
    type: 'armor',
    system: {
      concealability,
      ballistic,
      impact,
      weight,
      availability: String(entry.Availability ?? '').trim(),
      cost,
      streetIndex: String(entry['Street Index'] ?? '').trim(),
      bookPage: String(entry.BookPage ?? '').trim(),
      notes: notes.join(' | '),
    },
  };

  return JSON.stringify(item);
});

const outPath = join(__dir, 'packs', 'sr3e-armor.db');
writeFileSync(outPath, lines.join('\n') + '\n', 'utf8');
console.log(`Wrote ${lines.length} armor items to ${outPath}`);
