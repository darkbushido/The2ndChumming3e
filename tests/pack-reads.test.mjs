/**
 * Every pack read that OFFERS content honours the source-book filter — reported 2026-11-09:
 * the Vehicle Designer offered VAUBAN mods from the France Sourcebook, a book that is off by
 * default. The maintainer's rule: nothing a user can pick, buy, search or drop may come from a
 * book the GM has switched off.
 *
 * The ratchet reads every `game.packs` iteration/lookup in `scripts/`: the statement must call
 * `packAllowed` (`SR3ESourceBooks.packAllowed`, or go through `SR3EItem._packsForType`, which
 * does), or be named in ALLOW with the reason it only resolves something already chosen.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export const name = 'pack-reads';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

/** Reads that resolve, repair or count — none of them is a list a person picks from. */
const ALLOW = [
  [/_packsForType/,                         'SR3EItem._packsForType — calls packAllowed itself unless ignoreBookFilter'],
  [/packageName === SYSTEM/,                'SR3EPackRepair: removes broken entries from every system pack'],
  [/out\[b\] = |_packCounts/,               'Source Books dialog: how many packs each book has, on or off'],
  [/game\.packs\.get\(PACK_ID\)/,           'GM build macros writing one named pack (skills, Mr Johnson\'s contacts)'],
  [/game\.packs\.get\(collection\)/,        'sr3e.actor.create: resolves the entry the picker already offered'],
  [/game\.packs\.get\(dropped\.pack\)/,     'SR3EPurchase drop: resolves a dropped item, then WARNS if its book is off'],
  [/game\.packs\.get\(IC_PACK\)/,         'Host generator: copies the IC the Defragged ruleset already chose — no picker, the ruleset setting gates it'],
];

function* files(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) yield* files(p);
    else if (/\.m?js$/.test(f)) yield p;
  }
}

export async function run(t) {
  const offenders = [];
  let seen = 0;
  for (const file of files(join(ROOT, 'scripts'))) {
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (!/game\.packs\b/.test(line)) return;
      if (/^\s*(\/\*|\*|\/\/)/.test(line)) return;               // a comment
      seen++;
      const around = lines.slice(Math.max(0, i - 3), i + 6).join('\n');
      if (/packAllowed/.test(around)) return;
      if (ALLOW.some(([p]) => p.test(around))) return;
      offenders.push(`${relative(ROOT, file)}:${i + 1}  ${line.trim()}`);
    });
  }
  t.ok('the ratchet found pack reads to check', seen >= 8);
  t.ok(`every game.packs read honours packAllowed or is an allowed lookup${offenders.length ? `\n      ${offenders.join('\n      ')}` : ''}`,
    offenders.length === 0);

  const sheet = readFileSync(join(ROOT, 'scripts/sheets/SR3EActorSheet.js'), 'utf8');
  t.ok('the vehicle and archetype pickers on the actor sheet both filter by book',
    (sheet.match(/metadata\.type === 'Actor'\s*\n\s*&& \(game\.sr3e\?\.SR3ESourceBooks\?\.packAllowed\(p\)/g) ?? []).length === 2);
}
