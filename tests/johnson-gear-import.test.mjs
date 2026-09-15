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
  t.is('no contact item links to an SR2-edition pack', linked.filter(d => /^sr3e-(sr2|ct|ssc|st|fof|pna)-/.test(packOf(d))).map(d => d.name).join(', '), '');

  /* The three first-pass helmets (once linked to the SR2 helmet): the maintainer's ruling, the SR3
   * Security Helmet (p.284) — each at the rating its contact's page prints (tools/relink-johnson-helmets.mjs). */
  const helmets = items.filter(d => d.name === 'Helmet');
  t.ok('every "Helmet" links to the SR3 Security Helmet, page and all',
    helmets.length === 3 && helmets.every(d => packOf(d) === 'sr3e-sr3-armor' && d.system.bookPage === 'sr3.284'));
  // All three at 2/1 — the maintainer's ruling: p.62 prints 1/1 for two of them, but no SR3 helmet is
  // 1/1 (Security Helmet +1/+2 p.284, CC's Rapid Transit +0/+2 and Military +2/+3; every 1/1 is SR2).
  t.eq('…all three at 2/1, by the maintainer\'s ruling', helmets.map(d => `${d.system.ballistic}/${d.system.impact}`), ['2/1', '2/1', '2/1']);

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
