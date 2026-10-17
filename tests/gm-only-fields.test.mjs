/**
 * Karma Pool, Good Karma and Total Karma are the GM's to type · TODO 218.
 *
 * Pure rule (`GmOnlyFields`) tested behaviourally; the sheet can't be imported without Foundry, so the
 * wiring is a SOURCE-LEVEL check, backed by the live-checklist step as a player.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { GmOnlyFields } from '../scripts/data/gm-only-fields.mjs';

export const name = 'gm-only-fields';
const read = rel => readFileSync(fileURLToPath(new URL(`../${rel}`, import.meta.url)), 'utf8');

export async function run(t) {
  const G = GmOnlyFields;
  for (const f of ['system.karma', 'system.totalKarma', 'system.karmaPool', 'system.karmaPoolSpent']) {
    t.is(`${f} is the GM's`, G.isGmOnly(f), true);
    t.is(`…a player cannot edit it`, G.canEdit(f, false), false);
    t.is(`…the GM can`, G.canEdit(f, true), true);
  }
  t.is('nuyen is NOT locked', G.canEdit('system.nuyen', false), true);
  t.is('combat pool mod is NOT locked', G.canEdit('system.combatPoolMod', false), true);

  /* ── strip: both spellings, players only ── */
  const flat = { 'system.karma': 9, 'system.nuyen': 5, 'system.totalKarma': 1, 'system.karmaPool': 3 };
  t.eq('flat: a player loses the karma keys and keeps the rest', G.strip(flat, false), { 'system.nuyen': 5 });
  const nested = { system: { karma: 9, nuyen: 5, totalKarma: 1, karmaPool: 3, karmaPoolSpent: 2 }, name: 'x' };
  t.eq('nested (what Foundry hands _prepareSubmitData): same', G.strip(nested, false), { system: { nuyen: 5 }, name: 'x' });
  t.eq('the GM is untouched', G.strip(nested, true), nested);
  t.is('the input is not mutated', nested.system.karma, 9);

  /* ── the sheet is wired to it (source-level) ── */
  const sheet = read('scripts/sheets/SR3EActorSheet.js');
  t.ok('the sheet imports the rule', /import \{ GmOnlyFields \} from '\.\.\/data\/gm-only-fields\.mjs'/.test(sheet));
  t.ok('_inlineField drops the name for a non-GM', /GmOnlyFields\.canEdit\(name, game\.user\.isGM\)[\s\S]{0,400}readonly disabled/.test(sheet));
  t.ok('the pool block locks its boxes', /lock\(spentField\)/.test(sheet) && /lock\(modField\)/.test(sheet));
  t.ok('the sheet submit strips the fields for a non-GM',
    /_prepareSubmitData\([^)]*\)\s*\{\s*return GmOnlyFields\.strip\(super\._prepareSubmitData/.test(sheet));
  t.ok('_onFieldChange refuses all three paths for a non-GM',
    (sheet.match(/!GmOnlyFields\.canEdit\((spentField|modField|name), game\.user\.isGM\)\) return this\.render\(\)/g) ?? []).length === 3);
  t.ok('Good Karma and Total Karma still go through _inlineField',
    /_inlineField\('Good Karma', 'system\.karma'/.test(sheet) && /_inlineField\('Total Karma', 'system\.totalKarma'/.test(sheet));
}
