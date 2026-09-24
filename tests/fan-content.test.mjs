/**
 * No fan content ships inside a pack named for an official book · TODO 117.
 *
 * ⚠ **This is a RATCHET, and it is the whole point of the change it guards.** 121 documents citing
 * the fan code `pw` were sitting in the SR2 packs — 115 of them in `sr3e-sr2-firearms`, which by
 * document count was therefore mostly not SR2. The source-book toggle could not reach them, which
 * breaks the system's own rule that it *"ships no sourcebook content it cannot turn off"*. Nothing
 * in the suite noticed for as long as it was true, because nothing was counting.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { fanCodes, FAN_CODES } from '../tools/archive-fan-content.mjs';

export const name = 'fan-content';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const PACKS = new URL('../packs-src/', import.meta.url);

export async function run(t) {
  /* ── The reader ───────────────────────────────────────────────────────────── */
  t.eq('a fan page is recognised', fanCodes('pw.30'), ['pw']);
  t.eq('…including alongside an official one', fanCodes('sr2.264,pw.18').sort(), ['pw']);
  t.eq('an official page is not fan', fanCodes('sr3.303'), []);
  // ⚠ UNKNOWN IS NOT FAN. 200 documents have a blank or "???" page; treating those as fan would
  //   move content on a guess, which is the mistake TODO 117 exists to warn about.
  t.eq('a "???" page is unknown, not fan', fanCodes('sr2.???'), []);
  t.eq('…and so is a blank one', fanCodes(''), []);
  t.eq('…and undefined', fanCodes(undefined), []);
  t.ok('the fan codes are the ones the archive already names',
    ['pw', 'cp', 'cb1', 'ray', 'nagee', 'bjf', 'adh'].every(c => FAN_CODES.has(c)));

  /* ── The ratchet ──────────────────────────────────────────────────────────── */
  const offenders = [];
  let total = 0;
  for (const pack of readdirSync(PACKS)) {
    let files; try { files = readdirSync(new URL(`${pack}/`, PACKS)); } catch { continue; }
    for (const f of files) {
      if (!f.endsWith('.json')) continue;
      let d; try { d = JSON.parse(readFileSync(new URL(`${pack}/${f}`, PACKS), 'utf8')); } catch { continue; }
      if (!/^!(items|actors)!/.test(d._key ?? '')) continue;
      total++;
      const codes = fanCodes(d.doc?.system?.bookPage);
      if (codes.length) offenders.push(`${pack}: ${d.doc?.name} (${codes.join(',')})`);
    }
  }
  t.ok(`the packs hold ${total} documents`, total > 4000);   // 4,707 with SR2 parked (2026-09-24)
  t.is(`no shipped document cites a fan code${offenders.length ? ` — ${offenders.slice(0, 5).join('; ')}` : ''}`,
    offenders.length, 0);

  /* ── What was moved is still there, and still restorable ──────────────────── */
  const moved = ['sr3e-sr2-firearms', 'sr3e-sr2-armor', 'sr3e-sr2-melee', 'sr3e-sr2-projectiles'];
  let archived = 0;
  for (const pack of moved) {
    const url = new URL(`../archive/non-sr3-content/${pack}.json`, import.meta.url);
    t.ok(`${pack}'s fan documents are archived`, existsSync(url));
    const rows = JSON.parse(readFileSync(url, 'utf8'));
    archived += rows.length;
    // ⚠ A restore is "a direct write back under the same key", so the key and the whole document
    //   must both survive — an archive of names would not be reversible.
    t.ok(`…each with its LevelDB key and full document`,
      rows.every(r => /^!(items|actors)!/.test(r._key) && r.doc && r.doc.name));
    // ⚠ Bucketed by the fan CODE, not the generic "fan": the existing archive lumps ten sources
    //   together and its own README admits the result is hard to inventory.
    t.ok('…bucketed by its fan code, so it can be restored per book',
      rows.every(r => FAN_CODES.has(r.bucket)));
  }
  t.is('121 documents were moved', archived, 121);

  /* ── The code is named, and deliberately not registered ───────────────────── */
  const config = read('scripts/config.js');
  t.ok('config.js explains why `pw` is not in SOURCE_BOOKS', /`pw` is a fan code and is deliberately NOT registered/.test(config));
  // ⚠ Registering a code with no pack behind it renders an EMPTY CHECKBOX in Configure Source
  //   Books — CLAUDE.md's "the filter only reaches packs". The two must move together or not at all.
  t.ok('…naming the empty-checkbox trap', /empty checkbox/i.test(config));
  const registered = /^\s*pw:\s*\{/m.test(config);
  const shipsPw = offenders.length > 0;
  t.ok('`pw` is registered if and only if something ships it', registered === shipsPw);
}
