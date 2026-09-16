/**
 * Cybermancy — cyberzombies, Chronic Dissociation Syndrome and cancer · M&M pp.50-59 (TODO 111).
 */
import { readFileSync } from 'node:fs';
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { SR3EActor } = await import('../scripts/documents/SR3EActor.js');
const { Cyberzombie, CDS_TABLE, PAGE } = await import('../scripts/data/cyberzombie.mjs');

export const name = 'cyberzombie';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

export async function run(t) {
  const C = Cyberzombie;

  /* ── Essence may go below 0 — but only for a cyberzombie ──────────────────── */
  t.is('an ordinary character is floored at 0 — "an Essence of 0 means you\'re dead" (SR3 p.55)',
    SR3EActor.essenceValue({ base: 6, lost: 8 }), 0);
  t.is('a cyberzombie keeps the negative, because CDS is graded by it',
    SR3EActor.essenceValue({ base: 6, lost: 8, cybermancy: true }), -2);
  t.is('…and reads as a cyberzombie, not as dead', SR3EActor.essenceState(-2, { cybermancy: true }), 'cyberzombie');
  t.is('anyone else at 0 is still dead', SR3EActor.essenceState(0), 'dead');
  t.is('below 1 is still merely low', SR3EActor.essenceState(0.5), 'low');

  /* ── The Chronic Dissociation Syndrome Table · p.59 ───────────────────────── */
  const row = e => { const r = C.cdsTest(e); return `${r.months}/${r.tn}`; };
  t.eq('every printed row, top to bottom',
    [0, -0.5, -0.51, -1, -1.01, -1.5, -1.51, -2, -2.01, -2.5, -2.51, -3, -3.01, -3.5].map(row),
    ['6/3', '6/3', '6/4', '6/4', '6/5', '6/5', '4/5', '4/5', '4/6', '4/6', '3/6', '3/6', '2/6', '2/6']);
  t.eq('−3.51 or lower: every 2 months at TN 8', C.cdsTest(-3.51), { months: 2, tn: 8 });
  t.eq('…+1 for every further −0.5', [C.cdsTest(-4.01).tn, C.cdsTest(-4.51).tn, C.cdsTest(-5.01).tn], [9, 10, 11]);
  t.is('above 0 there is no test at all', C.cdsTest(1), null);
  t.ok('0 or less is where it applies', C.applies(0) && C.applies(-1) && !C.applies(0.1));
  t.is('the table is the book\'s eight rows', CDS_TABLE.length, 8);

  /* ── What CDS does · p.59 ─────────────────────────────────────────────────── */
  t.eq('+4 Perception, +3 everything else', [C.CDS_EFFECTS.perception, C.CDS_EFFECTS.other], [4, 3]);
  t.ok('…and it cannot initiate action', /cannot initiate action, only react/.test(C.CDS_EFFECTS.note));
  t.is('death in 3 + Willpower weeks — Willpower 5 is 8', C.weeksToLive(5), 8);

  /* ── Treatment · p.59 — and its inversion ────────────────────────────────── */
  t.eq('Spell Resistance 8, easier by 1 each repeat', [0, 1, 2, 6, 9].map(n => C.treatmentTN(n)), [8, 7, 6, 2, 2]);
  const succeeded = C.treatmentOutcome(2), failed = C.treatmentOutcome(0);
  t.ok('⚠ SUCCEEDING on the Spell Resistance Test KILLS the patient', succeeded.died && !succeeded.cured);
  t.ok('…and failing it is the cure', failed.cured && !failed.died);
  t.eq('recovery: a week, less a day per Willpower success', [0, 3, 7, 9].map(n => C.recoveryDays(n)), [7, 4, 0, 0]);

  /* ── The cancer roll at the operation · p.59 ─────────────────────────────── */
  t.is('the threshold is double the absolute Essence', C.cancerThreshold(-2.5), 5);
  t.ok('2D6 under it means cancer', C.cancerRoll(4, -2.5, { body: 0 }).cancer);
  t.ok('…and on it does not', !C.cancerRoll(5, -2.5, { body: 0 }).cancer);
  t.ok('Body 4-7 adds 1 to the roll, so it can save the character', !C.cancerRoll(4, -2.5, { body: 5 }).cancer);
  t.is('Body 8+ adds 2', C.cancerRoll(4, -2.5, { body: 9 }).total, 6);
  t.is('symbiotes add another', C.cancerRoll(4, -2.5, { body: 0, symbiotes: true }).total, 5);
  t.is('the page is cited', PAGE, 'M&M p.59');

  /* ── The wiring, source-level ────────────────────────────────────────────── */
  const actorSrc = read('scripts/documents/SR3EActor.js');
  t.ok('the Essence floor is lifted for a cyberzombie and nobody else',
    /return cybermancy \? raw : Math\.max\(0, raw\);/.test(actorSrc));
  t.ok('…and the derivation passes the flag', /cybermancy: !!this\.system\?\.cybermancy\?\.is/.test(actorSrc));
  const sheet = read('scripts/sheets/SR3EActorSheet.js');
  t.ok('the Cyber tab has the block, and the GM alone marks it', /_cyberzombieLine\(actor\)/.test(sheet)
    && /Only the GM marks a cyberzombie/.test(sheet));
  t.ok('the CDS check rolls Willpower against the table', /CZ\.cdsTest\(ess\)/.test(sheet) && /rollPool\(wil, test\.tn/.test(sheet));
  t.ok('…and says what failing it costs, without applying it', /develops CDS/.test(sheet) && /Mark it on the Cyber tab/.test(sheet));
  t.ok('the Essence box only opens below 0 for a cyberzombie', /min="\$\{isCyberzombie \? -12 : 0\}"/.test(sheet));
  t.is('both actor types carry the flag', (read('scripts/data/ActorDataModels.js').match(/cybermancy:/g) ?? []).length, 2);
}
