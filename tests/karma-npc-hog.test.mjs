/**
 * Karma for NPCs, the Karma Pool in Resources, undoing an award, and the Hand of God · TODO 267.
 *
 * Asked 2026-10-25 after the Karma audit: NPCs get a Karma Pool (SR3 p.248) and their tokens come in UNLINKED so a
 * burned point stays on the token; the Pool shows beside Good and Total Karma; the GM can undo an award; and the Hand
 * of God (SR3 p.248). The rules are pure modules tested here; the sheet and hooks can't be imported without Foundry,
 * so their wiring is SOURCE-LEVEL, backed by the TODO 267 live checklist.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { SR3EActor } = await import('../scripts/documents/SR3EActor.js');
const { TokenLink } = await import('../scripts/data/token-link.mjs');
const { HandOfGod } = await import('../scripts/data/hand-of-god.mjs');
const { Ledger } = await import('../scripts/data/ledger.mjs');

export const name = 'karma-npc-hog';
const read = rel => readFileSync(fileURLToPath(new URL(`../${rel}`, import.meta.url)), 'utf8');
const between = (src, from, to) => {
  const i = src.indexOf(from);
  const j = i < 0 ? -1 : src.indexOf(to, i + from.length);
  return i < 0 ? '' : src.slice(i, j < 0 ? undefined : j);
};

export async function run(t) {
  const models = read('scripts/data/ActorDataModels.js');
  const sheet  = read('scripts/sheets/SR3EActorSheet.js');
  const main   = read('scripts/sr3e.js');

  /* ── F1: NPCs have a Karma Pool (SR3 p.248) ─────────────────────────────────── */
  const npcSchema = between(models, 'class NpcData', 'static migrateData');
  t.ok('NpcData declares karmaPool', /karmaPool:\s+new NumberField\(\{ integer: true, initial: 0, min: 0 \}\)/.test(npcSchema));
  t.ok('…and karmaPoolSpent', /karmaPoolSpent:\s+new NumberField/.test(npcSchema));
  t.ok('…but still no Good or Total Karma (an NPC earns nothing, TODO 83)',
    !/\bkarma:\s+new NumberField/.test(npcSchema) && !/totalKarma:/.test(npcSchema));
  t.ok('an NPC with the field has a pool', SR3EActor.hasKarmaPool({ system: { karmaPool: 0 } }));
  t.ok('…and still no Good Karma', !SR3EActor.hasGoodKarma({ system: { karmaPool: 3 } }));

  // A pool of 0 is one the GM never gave: nothing is offered on a roll (and no "none left of 0" clutter).
  t.is('no Karma row for a pool of 0', SR3EActor.karmaRollRow({ system: { karmaPool: 0, karmaPoolSpent: 0 } }), '');
  t.ok('a row for a pool of 3', /3 left of 3/.test(SR3EActor.karmaRollRow({ system: { karmaPool: 3, karmaPoolSpent: 0 } })));
  t.ok('a spent-out pool still says so', /none left of 2/.test(SR3EActor.karmaRollRow({ system: { karmaPool: 2, karmaPoolSpent: 2 } })));

  /* ── F1: NPC tokens come in unlinked (the maintainer, 2026-10-25) ─────────────── */
  const JOHNSON = "<p>Mr. Johnson's Little Black Book, p.53. PR 3. Karma Pool 6.</p>";
  t.is('an npc is unlinked',                        TokenLink.linked({ type: 'npc' }), false);
  t.is('a Little Black Book contact is unlinked',   TokenLink.linked({ type: 'character', notes: JOHNSON }), false);
  t.is('a character is linked',                     TokenLink.linked({ type: 'character', notes: '<p>Street sam.</p>' }), true);
  t.is('…with no notes too',                        TokenLink.linked({ type: 'character' }), true);
  t.is('a vehicle is linked',                       TokenLink.linked({ type: 'vehicle' }), true);
  t.is("a GM's own note quoting a pool is not a contact",
    TokenLink.linked({ type: 'character', notes: '<p>Tough. PR 3. Karma Pool 6.</p>' }), true);
  const pre = between(main, "Hooks.on('preCreateActor', (document, _data, options", '\n});');
  t.ok('preCreateActor decides the link through TokenLink',
    /TokenLink\.linked\(\{ type: document\.type, notes: document\.system\?\.notes \}\)/.test(pre)
    && /prototypeToken: \{ actorLink: linked \}/.test(pre));
  t.ok('…and no longer forces every token linked', !/actorLink: true \}/.test(pre));

  // Refresh Karma Pools reaches NPC tokens on the scene, by token (each its own pool).
  const refresh = between(main, 'async function _openKarmaRefreshDialog', '\nasync function ');
  t.ok('Refresh Karma Pools lists NPC tokens on this scene',
    /canvas\?\.scene\?\.tokens/.test(refresh) && /row\(actorRef\(t\.actor\)/.test(refresh));
  t.ok('…and refreshes by actorRef, so an unlinked token is reached', /actorFrom\(id\)\?\.refreshKarmaPool\(\)/.test(refresh));

  /* ── F3: the Karma Pool beside Good and Total Karma ───────────────────────────── */
  const bio = between(sheet, '  _tabBio(sys) {', '  _ledgerTable(');
  const summary = between(bio, 'sr-karma-pool-summary', '</label>');
  t.ok('Resources shows the Karma Pool for an actor that has one',
    /hasKarmaPool\(this\.actor\)\s*\?\s*`<label class="inline-field sr-karma-pool-summary"/.test(bio));
  t.ok('…read-only', /readonly disabled/.test(summary));
  t.ok('…and unnamed, so the sheet submit never carries it', !/name=/.test(summary));
  t.ok('…with a link to the Attributes tab', /data-action="switchTab" data-tab="attributes"/.test(bio));

  /* ── F5: undo a karma award (the 📒 Ledger) ──────────────────────────────────── */
  const before = { karma: 10, totalKarma: 40, karmaPool: 3, nuyen: 500 };
  const award  = { award: { karma: 9, totalKarma: 10, karmaPool: 1, nuyen: 200 } };
  const lines  = Ledger.diff(before, { karma: 19, totalKarma: 50, karmaPool: 4, nuyen: 700 }, { revert: award, when: 5, reason: 'Session rewards' });
  const totalLine = lines.find(e => e.kind === 'total');
  t.ok("an award's record rides on the Total Karma line", !!totalLine?.revert?.award);
  t.ok('…not on the Good Karma line', !lines.find(e => e.kind === 'karma').revert);
  t.ok('…and that line is undoable', Ledger.undoable(totalLine));
  t.ok('a Good Karma line of an award is NOT undoable as a purchase', !Ledger.undoable({ ...lines.find(e => e.kind === 'karma'), revert: award }));
  t.is('revertPlan (the purchase undo) refuses an award line', Ledger.revertPlan(totalLine), null);

  // All of an award can go to the Pool (a human crossing the tenth with 1 karma): there is no Good Karma line,
  // which is why the record rides on Total Karma.
  const allPool = Ledger.diff({ karma: 0, totalKarma: 9, karmaPool: 1 }, { totalKarma: 10, karmaPool: 2 },
    { revert: { award: { karma: 0, totalKarma: 1, karmaPool: 1 } } });
  t.ok('an award that is all Pool is still undoable', Ledger.undoable(allPool.find(e => e.kind === 'total')));

  // The plan takes the AMOUNTS back off the current values, so what happened since stays.
  const plan = Ledger.awardPlan(totalLine, { karma: 4, totalKarma: 50, karmaPool: 4, nuyen: 100 });
  t.eq('the undo takes back each amount from the current values',
    plan.map(r => [r.key, r.from, r.to]), [['karma', 4, -5], ['totalKarma', 50, 40], ['karmaPool', 4, 3], ['nuyen', 100, 0]]);
  t.eq('…Good Karma spent since goes below 0 and says so; nuyen stops at 0 and says so',
    plan.filter(r => r.short).map(r => r.key), ['karma', 'nuyen']);
  t.is('an undone award cannot be undone again', Ledger.awardPlan({ ...totalLine, reverted: true }, before), null);

  // Two lines share time and reason; the button names the kind.
  const both = [{ kind: 'karma', when: 5, reason: 'r' }, { kind: 'total', when: 5, reason: 'r' }];
  t.is('find looks for a Good Karma line by default', Ledger.find(both, 5), 0);
  t.is('…and the Total Karma line when asked',       Ledger.find(both, 5, null, 'total'), 1);

  // Both award paths record what they added.
  const awardKarma = between(sheet, 'static async _onAwardKarma()', 'static async _onSpendKarmaCalculator()');
  t.ok('Award Karma records the award for the ↺',
    /ledgerRevert: \{ award: \{ karma: goodKarma, totalKarma: amount, karmaPool: poolGained \} \}/.test(awardKarma));
  const rewards = between(main, 'async function _openSessionRewardDialog', '\nasync function ');
  t.ok('Session Rewards records the award (with its nuyen) for the ↺',
    /award: \{ karma: sp\.goodKarma, totalKarma: karma, karmaPool: sp\.poolGained, nuyen \}/.test(rewards)
    && /ledgerReason: 'Session rewards', ledgerRevert \}/.test(rewards));
  t.ok('the ↺ names the line it undoes by kind', /data-kind="\$\{esc\(e\.kind\)\}"/.test(sheet)
    && /if \(kind === 'total'\) return SR3EActorSheet\._undoKarmaAward\(actor, entry\)/.test(sheet));
  t.ok('the award undo is GM-only (through the GM-gated ↺ handler)',
    /static async _onUndoKarmaSpend\(_ev, target\) \{\s*if \(!game\.user\.isGM\) return;/.test(sheet));

  /* ── The Hand of God (SR3 p.248) ─────────────────────────────────────────────── */
  const sam = { karma: 12, totalKarma: 140, karmaPool: 7, karmaPoolSpent: 2, handOfGodUsed: false };
  t.eq('burns all Good Karma and the whole Pool (its size, spent or not)', HandOfGod.burned(sam), { goodKarma: 12, karmaPool: 7 });
  t.eq('the update empties Good Karma and the Pool and records the use', HandOfGod.update(),
    { 'system.karma': 0, 'system.karmaPool': 0, 'system.karmaPoolSpent': 0, 'system.handOfGodUsed': true });
  t.ok('…and leaves Total Karma alone (everything ever earned, p.242)', !('system.totalKarma' in HandOfGod.update()));
  t.eq('a player character with a Pool and no prior use: no warnings', HandOfGod.warnings(sam), []);
  t.is('a Pool under 1 is warned (p.248: "must possess at least 1 Karma Pool Point")',
    HandOfGod.warnings({ ...sam, karmaPool: 0 }).length, 1);
  t.ok('…a second use is warned ("only once, ever")', /once, ever/.test(HandOfGod.warnings({ ...sam, handOfGodUsed: true })[0]));
  t.ok('…a non-player character is warned ("allows player characters")',
    /player characters/.test(HandOfGod.warnings(sam, { isPlayerCharacter: false })[0]));

  // The GM's ↺ (the purchase undo, TODO 212) puts it back: the Good Karma line carries the restore.
  const hogLines = Ledger.diff(sam, { karma: 0, karmaPool: 0, karmaPoolSpent: 0 }, { revert: HandOfGod.revert(sam), reason: 'Hand of God (SR3 p.248)' });
  const hogKarma = hogLines.find(e => e.kind === 'karma');
  const hogPlan  = Ledger.revertPlan(hogKarma);
  t.is('the ↺ refunds the burned Good Karma', hogPlan?.refund, 12);
  t.eq('…and restores the Pool and clears the use',
    Object.fromEntries(hogPlan.actor.map(a => [a.path, a.value])),
    { 'system.karmaPool': 7, 'system.karmaPoolSpent': 2, 'system.handOfGodUsed': false });

  t.ok('CharacterData records the use', /handOfGodUsed:\s+new BooleanField\(\{ initial: false \}\)/.test(models));
  t.ok('the sheet registers ✋ Hand of God', /handOfGod:\s+SR3EActorSheet\._onHandOfGod/.test(sheet)
    && /data-action="handOfGod"/.test(bio));
  const hog = between(sheet, 'static async _onHandOfGod()', 'static async _onSpendKarmaCalculator()');
  t.ok('Hand of God asks before burning (Cancel is the default)', /label: 'Cancel', action: 'cancel', default: true/.test(hog));
  t.ok('…warns, never refuses', /HoG\.warnings\(/.test(hog) && !/return;\s*\/\/ refuse/.test(hog));
  t.ok('…writes through actor.update with a reason and its undo',
    /actor\.update\(HoG\.update\(\), \{ ledgerReason: 'Hand of God \(SR3 p\.248\)', ledgerRevert: HoG\.revert\(sys\) \}\)/.test(hog));
  t.ok('…and changes no wound (no automation of outcomes)', !/wounds/.test(hog));
}
