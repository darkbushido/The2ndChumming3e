/**
 * The Little Black Book contacts' gear conversions — TODO 86, second pass (2026-09-14).
 *
 * With TODO 91's gear and medical packs shipping, `tools/import-johnson-gear.mjs` converts exact
 * matches into gear and medical items too. Its rules, checked against what it actually wrote:
 *   · SR2 packs are never targets — the Little Black Book is an SR3 book.
 *   · the contact's own rating wins (`Medkit [Rating 5]` stays 5, not the pack's 3).
 *   · a stub whose line gives no rating is never matched to one of several rated variants.
 *   · a converted item carries its provenance, which is what makes a second run a no-op.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ClassicLevel } from 'classic-level';
import { copyPacks } from '../tools/lib/pack-copy.mjs';

export const name = 'johnson-gear-import';

const root = new URL('../', import.meta.url);
const packsDir = new URL('packs', root).pathname.replace(/^\/([A-Za-z]:)/, '$1');

export async function run(t) {
  const items = [];
  const copy = copyPacks(packsDir);
  try {
    const db = new ClassicLevel(join(copy.dir, 'sr3e-mr-johnsons-contacts'), { valueEncoding: 'json' });
    await db.open();
    for await (const [k, d] of db.iterator()) if (k.startsWith('!actors.items!')) items.push(d);
    await db.close();
  } finally { copy.cleanup(); }

  const linked = items.filter(d => d._stats?.compendiumSource);
  const packOf = d => d._stats.compendiumSource.split('.')[2];
  t.ok('converted items record where they came from', linked.length >= 50, `${linked.length} linked`);
  /* ⚠ One known exception, from the FIRST pass (2026-09-03, before SR2 packs were excluded): three
   * contacts' "Helmet" link to `sr3e-sr2-armor` (1/1, SR2 p.241). SR3 core prints no plain helmet —
   * only a Security Helmet (1/2, p.284) — so re-pointing would change their stats on a guess. Left
   * for the maintainer (TODO 86). Nothing else may link to an SR2 pack. */
  const SR2_KNOWN = new Set(['Helmet']);
  t.is('no contact item links to an SR2-edition pack (bar the three first-pass helmets)',
    linked.filter(d => /^sr3e-(sr2|ct|ssc|st|fof|pna)-/.test(packOf(d)) && !SR2_KNOWN.has(d.name)).map(d => d.name).join(', '), '');
  t.is('…and that exception is exactly the three helmets', linked.filter(d => /^sr3e-sr2-/.test(packOf(d))).length, 3);

  const medkits = items.filter(d => /^Medkit/.test(d.name));
  t.ok('every medkit is now a medical item', medkits.length >= 5 && medkits.every(d => d.type === 'medical'));
  t.ok('the contact\'s own rating wins — "[Rating 5]" stays 5', medkits.filter(d => /Rating 5/.test(d.name)).every(d => d.system.rating === 5));
  t.ok('…"[Rating 3]" / "(Rating 3)" stay 3', medkits.filter(d => /Rating 3/.test(d.name)).every(d => d.system.rating === 3));
  const plain = medkits.find(d => d.name === 'Medkit');
  t.ok('a plain "Medkit" is the core book\'s (SR3 p.304), by the reviewed alias', plain && packOf(plain) === 'sr3e-sr3-medical' && plain.system.bookPage === 'sr3.304');

  const unrated = items.filter(d => /^Micro-(transceiver|recorder)$/.test(d.name));
  t.ok('a stub with no rating is NOT matched to one of ten rated variants', unrated.length > 0 && unrated.every(d => !d._stats?.compendiumSource && d.type === 'gear'));

  const tool = readFileSync(new URL('tools/import-johnson-gear.mjs', root), 'utf8');
  t.ok('the tool skips items it already converted (gear → gear keeps the type)', /if \(it\._stats\?\.compendiumSource\) continue;/.test(tool));
  t.ok('its index reads through a copy, so a report never churns the checkout', /copyPacks\(PACKDIR\)/.test(tool));
  t.ok('cyberware and skills are still refused as targets', !/TO_TYPES = new Set\([^)]*'(cyberware|skill)'/.test(tool));
}
