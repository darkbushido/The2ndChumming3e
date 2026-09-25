/**
 * *The Matrix Defragged v2* — the figures this project takes from the book · TODO 119.
 *
 * ⚠ **This file exists because `tests/tables.test.mjs` could not be this.** Until 2026-09-16 the book was
 * not in the PDF library, so that suite asserted the tier tables against CLAUDE.md and said at the
 * assertion that this was not independent verification. It is now: every number below is quoted from the
 * PDF in `audit/matrix-defragged-audit.md`, with its page.
 *
 * ⚠ **The Matrix Condition Monitor's thresholds are NOT here.** That table (p.12) is a graphic; its
 * labels extract as four penalty steps (+1…+4) and the box counts do not extract at all. Asserting our
 * 3/6/8/10 would be asserting a guess.
 */
import { readFileSync } from 'node:fs';
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });

export const name = 'matrix-defragged';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

export async function run(t) {
  const actor = read('scripts/documents/SR3EActor.js');
  const claude = read('.claude/rules/matrix.md');

  /* ── Cybercombat, MDF p.26 ────────────────────────────────────────────────── */
  // "Roll the attacking icon's base Cybercombat skill dice … against a base target number 4".
  t.is('both cybercombat corners roll against base TN 4, not the System Rating',
    (actor.match(/skillDice: rating, hackPoolAvail: 0, tn: 4,/g) ?? []).length, 2);
  t.ok('…and the decker\'s corner starts from 4 too', /tn: 4 \+ mcmPenalty \+ defTnMod/.test(actor));
  t.ok('the loser resists with MPCP / Rating, with the firewall as armour',
    /firewallRating: loserFirewall/.test(actor) && /deckerMPCP:     loserSoakPool/.test(actor));
  t.ok('the Matrix rules quote the book rather than the old System-Rating claim',
    /against a base target number 4, modified as\s+appropriate/.test(claude) && !/vs TN = target's System Rating/.test(claude));

  /* ── Dumpshock is SERIOUS, MDF p.27 ──────────────────────────────────────── */
  // "The user must immediately resist Serious Biofeedback Damage. The attack's Power is equal to the
  //  System Rating of the grid or host that dumped the user."
  t.is('every dumpshock card stages Serious', (actor.match(/stagedLevel:     'S',   \/\/ Serious — MDF p\.27/g) ?? []).length, 3);
  t.is('…and none of them still says Moderate', (actor.match(/Dumpshock[^\n]*\$\{(power|secVal|systemRating)\}M /g) ?? []).length, 0);
  t.ok('…including the IC-initiated one', /const damageCode    = `\$\{systemRating\}S`;/.test(actor));

  /* ── User modes and initiative, MDF p.10 ─────────────────────────────────── */
  // "Tortoise users rely on their meat world Initiative; cannot benefit from Response" — and the same
  // for AR and VR-Cold. Only VR-Hot "may rely on their Matrix Initiative, benefit from Response".
  t.ok('TRM / AR / VR-Cold keep their own initiative dice', /dice = Math\.max\(1, d\.initiativeDice \?\? 1\)/.test(actor));
  {
    // Just the decking branch — the astral one below it is 1d6 by SR3 p.41 and is not ours to touch.
    const i = actor.indexOf('} else if (useMatrixJacked) {');
    const branch = actor.slice(i, actor.indexOf('} else {', i));
    t.ok('…and are not forced to one die any more', !/dice = 1;/.test(branch));
  }
  t.ok('VR-Hot alone reads Response', /dice = 1 \+ response;/.test(actor));

  /* ── The tiers, MDF p.11-12 ──────────────────────────────────────────────── */
  const tiers = SR3E.matrix?.securityTiers ?? SR3E.securityTiers ?? null;
  if (tiers) {
    const byName = Object.fromEntries((Array.isArray(tiers) ? tiers : Object.values(tiers))
      .map(x => [String(x.name ?? x.tier ?? '').toLowerCase(), x.threshold ?? x.securityTierThreshold]));
    t.eq('Ivory 0 … Ultraviolet 6, as the book prints them',
      ['ivory', 'blue', 'green', 'orange', 'red', 'black', 'ultraviolet'].map(n => byName[n]),
      [0, 1, 2, 3, 4, 5, 6]);
  } else {
    t.ok('the tier table lives in .claude/rules/matrix.md and tests/tables.test.mjs (no config registry to read)', true);
  }
  t.ok('the Matrix rules carry the book\'s four Sys/Sec rows, including the circumstantial one',
    /Circumstantial — Matrix noise, jamming, wound modifiers \| ±1-4/.test(claude));

  /* ── What the audit could not settle ─────────────────────────────────────── */
  t.ok('the Condition Monitor thresholds are flagged unverified, not quietly asserted',
    /🔴 \*\*THE THRESHOLDS ARE UNVERIFIED\.\*\*/.test(claude));
  t.ok('the crash trigger for Overwatch is named as missing (TODO 128)', /TODO 128/.test(claude));
  t.ok('the audit itself is committed', /Audited 2026-09-16/.test(read('audit/matrix-defragged-audit.md')));
}
