/**
 * The 🔎 Legwork GM tool — TODO 268. SR3 p.253-256.
 *
 * The rules are `tests/legwork.test.mjs`. Here: what the roll is set up with (`roll`), what the card says
 * (`rolled`, with Foundry stubbed), and source-level invariants for the dialog, which needs a live client
 * (TESTING.md, *Legwork*).
 */
import { readFileSync } from 'node:fs';
import { installGlobals, installGame, makeActor, useScriptedRolls } from './helpers/foundry.mjs';
installGlobals();
globalThis.foundry.utils.escapeHTML ??= s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
globalThis.foundry.applications.ux = { TextEditor: { implementation: { enrichHTML: async s => s } } };
globalThis.CONST.CHAT_MESSAGE_STYLES.OTHER ??= 0;
const { SR3ELegwork } = await import('../scripts/SR3ELegwork.js');

export const name = 'legwork-tool';
const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

export async function run(t) {
  /* ── The card ─────────────────────────────────────────────────────────────────── */
  const posted = [];
  globalThis.ChatMessage = { create: async m => { posted.push(m); return m; }, getSpeaker: () => ({}) };
  installGame();
  game.users = Object.assign([{ id: 'gm', isGM: true }, { id: 'p2', isGM: false }], { activeGM: { isSelf: true } });
  const table = { name: 'Who is killing the ghouls?', results: { contents: [
    { range: [3, 30], name: '3+', description: 'THREE' },
    { range: [1, 1],  name: '1',  description: 'ONE' },
    { range: [2, 2],  name: '2',  description: 'TWO' },
  ] } };
  globalThis.fromUuid = async uuid => (uuid === 'RollTable.ghouls' ? table : null);
  const ctx = (o = {}) => ({ mode: 'ask', runnerName: 'Twitch', contactName: 'Mama Lou', spec: 'Street', level: 2, levelDice: 1,
    dice: 6, tn: 4, baseTN: 4, rushed: false, wounds: 0, tableUuid: 'RollTable.ghouls', tableName: table.name,
    cha: 4, int: 5, private: true, maxSearches: 3, ...o });
  const hits = n => ({ successes: n, dice: Array.from({ length: n }, () => ({ total: 5, success: true })) });

  await SR3ELegwork.rolled(ctx(), hits(3));
  let c = posted.at(-1).content;
  t.ok('three successes show the 1, 2 and 3+ rows', /ONE/.test(c) && /TWO/.test(c) && /THREE/.test(c));
  t.ok('…in success order', c.indexOf('ONE') < c.indexOf('TWO') && c.indexOf('TWO') < c.indexOf('THREE'));
  t.ok('the fee: 4 × 5 × 50 = 1,000¥ ÷ 3 = 333¥', /1,000¥/.test(c) && /333¥/.test(c));
  t.ok('…and Negotiation sets the price (p.254)', /Negotiation/.test(c));
  t.ok('the level dice are named', /\+1 for a Level 2 contact/.test(c));
  t.eq('a GM-only card is whispered to the GMs', posted.at(-1).whisper, ['gm']);

  await SR3ELegwork.rolled(ctx({ private: false }), hits(1));
  c = posted.at(-1).content;
  t.ok('one success shows only the first row', /ONE/.test(c) && !/TWO/.test(c) && !/THREE/.test(c));
  t.ok('…and a public card is not whispered', !('whisper' in posted.at(-1)));

  await SR3ELegwork.rolled(ctx({ cha: null }), hits(2));
  t.ok('no stats: the fee is the formula, not a number', /no stats were given/.test(posted.at(-1).content));

  await SR3ELegwork.rolled(ctx(), hits(0));
  c = posted.at(-1).content;
  t.ok('no successes: no fee', !/Fee/.test(c));

  useScriptedRolls([7, 9]);
  await SR3ELegwork.rolled(ctx({ mode: 'ear', tn: 6 }), hits(1));
  c = posted.at(-1).content;
  t.ok('an ear to the ground with a success reports back in 2D6 hours', /reports back in <strong>7 hours<\/strong>/.test(c));
  t.ok('…its TN is explained as the table +2', /table TN 4 \+2/.test(c));
  t.ok('…and the fee is still shown (p.254: "determined as described above")', /333¥|1,000¥/.test(c));
  await SR3ELegwork.rolled(ctx({ mode: 'ear', tn: 6 }), hits(0));
  t.ok('…with none, the contact hears nothing', /hears nothing/.test(posted.at(-1).content));

  await SR3ELegwork.rolled(ctx({ mode: 'matrix', levelDice: 0, cha: null, int: null, contactName: '' }), hits(2));
  c = posted.at(-1).content;
  t.ok('a Matrix search: base time 2D6 hours', /Base time <strong>9 hours<\/strong>/.test(c));
  t.ok('…no Hacking Pool, and the search limit', /No Hacking Pool/.test(c) && /At most 3 searches/.test(c));
  t.ok('…and no fee', !/Fee/.test(c));

  await SR3ELegwork.rolled(ctx({ tableUuid: 'RollTable.gone' }), hits(2));
  t.ok('a table this client cannot read: the GM is pointed at it', /GM: read <em>Who is killing the ghouls\?<\/em>, every row up to 2/.test(posted.at(-1).content));
  await SR3ELegwork.rolled(ctx({ tableUuid: '' }), hits(2));
  t.ok('no table: read the adventure\'s, every row up to the successes', /No success table chosen/.test(posted.at(-1).content));

  /* ── The roll ─────────────────────────────────────────────────────────────────── */
  const calls = [];
  const contact = { id: 'c1', type: 'contact', name: 'Mama Lou', system: { loyalty: 1, connection: 1 } };
  const runner = makeActor({ id: 'r1', name: 'Twitch', attributes: { intelligence: 5 }, items: [contact], system: { woundMod: -2 } });
  const npc = makeActor({ id: 'n1', name: 'Mama Lou (NPC)' });
  installGame({ actors: [runner, npc], sr3e: { SR3EActor: { rollThen: async (...a) => { calls.push(a); } } } });
  const choice = o => ({ mode: 'ask', runnerRef: 'r1', contactId: 'c1', spec: 'Street', level: 1, dice: 5, baseTN: 4, other: 0,
    rushed: false, tableId: '', cha: 3, int: 3, private: true, ...o });
  globalThis.game.tables = { get: () => null };

  await SR3ELegwork.roll(choice({ rushed: true }));
  t.is('asking, rushed, Moderate wounds: TN 4 +2 rushed +2 wounds = 8', calls.at(-1)[2], 8);
  t.is('…rolled by the runner', calls.at(-1)[0], runner);
  t.is('…through the legwork follow-up', calls.at(-1)[3].followUp.kind, 'legwork');
  t.is('…with the dice the GM set', calls.at(-1)[1], 5);
  await SR3ELegwork.roll(choice({ mode: 'ear' }), new Map([['c1', { actor: npc }]]));
  t.is("the contact's ear-to-the-ground test: TN 4 +2, no runner's wounds = 6", calls.at(-1)[2], 6);
  t.is('…rolled by the contact\'s world NPC when there is one', calls.at(-1)[0], npc);
  await SR3ELegwork.roll(choice({ mode: 'ear' }), new Map([['c1', { actor: { ...npc, pack: 'sr3e-mr-johnsons-contacts' } }]]));
  t.is('…never by a compendium archetype (the runner carries the dice)', calls.at(-1)[0], runner);
  await SR3ELegwork.roll(choice({ mode: 'matrix', contactId: '' }));
  t.is('a Matrix search needs no contact; TN 4 + wounds 2 = 6', calls.at(-1)[2], 6);
  t.is('…and carries the search limit, ceil(5 ÷ 2) = 3', calls.at(-1)[3].followUp.ctx.maxSearches, 3);
  const before = calls.length;
  await SR3ELegwork.roll(choice({ contactId: '' }));
  t.is('asking with no contact does not roll', calls.length, before);
  await SR3ELegwork.roll(choice({ dice: null }));
  t.is('…nor does a roll with no dice', calls.length, before);

  /* ── Source-level invariants ──────────────────────────────────────────────────── */
  const tool  = read('scripts/SR3ELegwork.js');
  const sr3e  = read('scripts/sr3e.js');
  const actor = read('scripts/documents/SR3EActor.js');
  t.ok('the dialog is wired through DialogV2.wait\'s render option', /render: \(_event, dialog\) => wireDialog\(dialog, dialog\.element\)/.test(tool) && !/renderDialogV2/.test(tool));
  t.ok('it uses native DOM only', !/\$\(|jQuery|\.val\(|\.on\(/.test(tool));
  t.ok('its runner list hides templates and puts the scene first', /sceneFirst\(game\.actors\s*\n?\s*\.filter\(a => \(a\.type === 'character'/.test(tool) && /isLiveActor/.test(tool));
  t.ok('runners are named by actorRef / actorFrom (an unlinked token is its own actor, TODO 260)', /value="\$\{actorRef\(a\)\}"/.test(tool) && /actorFrom\(choice\.runnerRef\)/.test(tool));
  t.ok('the tool is GM-only', /if \(!game\.user\.isGM\) \{ ui\.notifications\.warn\('Legwork is a GM tool/.test(tool));
  t.ok('the test rolls through rollThen, so 💥 waits', /SR3EActor\.rollThen\(/.test(tool) && /legwork: *\['SR3ELegwork', 'rolled'\]/.test(actor));
  t.ok('the GM picks the contact Level (1/2/3), offered from Loyalty', /id="lw-level"/.test(tool) && /levelFromLoyalty\(c\?\.system\?\.loyalty\)/.test(tool));
  t.ok('stats come from the linked NPC, then the archetype', /\[contact\?\.system\?\.npcUuid, contact\?\.system\?\.archetypeUuid\]/.test(tool));
  t.ok('the button sits with the GM tools, GM-only', /mk\('sr3e-legwork-btn', '🔎 Legwork',\s+\(\) => SR3ELegwork\.open\(\),\s+true\)/.test(sr3e));
  t.ok('…next to Escape Artist', /sr3e-escape-btn[^\n]*\n\s*mk\('sr3e-legwork-btn'/.test(sr3e));
  t.ok('the class is registered on game.sr3e', /game\.sr3e = \{[^}]*\bSR3ELegwork\b/.test(sr3e));
  t.ok('nothing is written to an actor or item (offer, never apply — the fee is shown, not charged)', !/\.update\(|updateEmbedded|setFlag|createEmbedded/.test(tool));
  t.ok('the card carries no buttons (nothing to guard or gate)', !/<button/.test(tool.slice(tool.indexOf('static async rolled'))));
}
