/**
 * The Concealment view — TODO 195. SR3 p.45, p.231-232, p.236-237, p.270 (and p.301-303, M&M p.21, p.32).
 *
 * The rules and the "what is visible" heuristic are pure (`scripts/data/concealment.mjs`) and tested here.
 * The dialogs, the chat card and the entry points need a live client: they are SOURCE-LEVEL invariants,
 * backed by TESTING.md §52.
 */
import { readFileSync } from 'node:fs';
import { installGlobals, installGame, makeActor } from './helpers/foundry.mjs';
installGlobals();
globalThis.foundry.utils.escapeHTML ??= s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const { Concealment, NOTICE, SEARCH_HALF, SEARCH_FULL, SEARCH_TABLE } = await import('../scripts/data/concealment.mjs');
const { SR3EConcealment } = await import('../scripts/SR3EConcealment.js');

export const name = 'concealment';

const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const item = (type, nm, system = {}, flags = undefined) => ({ id: nm.toLowerCase().replace(/\W+/g, '-'), type, name: nm, system, flags });

export async function run(t) {
  /* ── Concealability as a number ─────────────────────────────────────────────────── */
  t.is('"5" is 5', Concealment.parse('5'), 5);
  t.is('"4/6" reads the leading figure', Concealment.parse('4/6'), 4);
  t.is('a dash is no rating', Concealment.parse('—'), null);
  t.is('blank is no rating', Concealment.parse(''), null);
  t.is('and so is nothing at all', Concealment.parse(undefined), null);
  t.is('a rating of 0 is a rating (not "none")', Concealment.parse('0'), 0);

  /* ── The target number · p.45, p.231, p.270, p.237 ──────────────────────────────── */
  const TN = (c, m, mod) => Concealment.targetNumber(c, m, mod);
  t.is('noticing: the Perception Test is against the Concealability itself (p.231)', TN(8, NOTICE), 8);
  t.is('a p.270 search: HALF, rounded down — Concealability 7 → 3', TN(7, SEARCH_HALF), 3);
  t.is('…and 8 → 4', TN(8, SEARCH_HALF), 4);
  t.is('a p.237 manual search: the whole Concealability', TN(7, SEARCH_FULL), 7);
  t.is('no target number is below 2 (p.112): half of 3 is 1, read as 2', TN(3, SEARCH_HALF), 2);
  t.is('modifiers add on: Concealability 8 with a distracted perceiver (+2)', TN(8, NOTICE, 2), 10);
  t.is('…and subtract, to the floor', TN(3, NOTICE, -4), 2);

  /* ── The Physical Search Modifiers Table · p.236 ────────────────────────────────── */
  const S = o => Concealment.searchModifier(o);
  t.is('an amateur, cursory, fearful search: +2 +2 +2', S({ professional: 'amateur', time: 'cursory', searcher: 'fearful' }).mod, 6);
  t.is('semi-trained, brisk, normal: +1 +1', S({ professional: 'semi', time: 'brisk' }).mod, 2);
  t.is('trained, detailed, in complete control: 0 −1 −2', S({ professional: 'trained', time: 'detailed', searcher: 'control' }).mod, -3);
  t.is('"practically a strip search" (3-5 minutes) is −3', S({ time: 'strip-ish' }).mod, -3);
  t.is('the defaults are the table\'s zero row', S({}).mod, 0);
  t.ok('a 6-10 minute strip search finds the weapon outright', S({ time: 'strip' }).found === true);
  t.ok('…and a shorter one does not', S({ time: 'strip-ish' }).found === false);
  t.eq('the table has the book\'s rows (3 / 7 / 3)', [SEARCH_TABLE.professional.length, SEARCH_TABLE.time.length, SEARCH_TABLE.searcher.length], [3, 7, 3]);

  /* ── What shows: weapons ────────────────────────────────────────────────────────── */
  const gun   = item('firearm', 'Ares Predator', { concealability: '5', ready: false, hands: 1, category: 'HPist' });
  const smg   = item('firearm', 'Uzi III', { concealability: '4', ready: true, hands: 2, category: 'MaPist' });
  const knife = item('melee', 'Knife', { concealability: '8', ready: false, category: 'EDG' });
  const katana = item('melee', 'Katana', { concealability: '3', ready: false, category: 'EDG' });
  const fists = item('melee', 'Unarmed', { concealability: '', ready: true, category: 'UNA' });
  const spur  = item('melee', 'Spur', { concealability: '', ready: true, category: 'CYB', hands: 0 });
  const stash = item('firearm', 'Stashed Rifle', { concealability: '2', ready: false, category: 'AsRf' }, { The2ndChumming3e: { stored: true } });
  const vest  = item('armor', 'Armor Vest', { concealability: '6' });
  const bag   = item('armor', 'Spare Jacket', { concealability: '4' });
  const rows = Concealment.rows([gun, smg, knife, katana, fists, spur, stash, vest, bag], { wornIds: [vest.id] });
  const byName = n => rows.find(r => r.name === n);
  t.is('a stowed pistol needs a Perception Test against its Concealability', `${byName('Ares Predator').state}/${byName('Ares Predator').needsTest}/${byName('Ares Predator').conceal}`, 'stowed/true/5');
  t.is('a weapon IN HAND is plain sight: no test', `${byName('Uzi III').state}/${byName('Uzi III').needsTest}`, 'drawn/false');
  t.ok('fists are not "carried"', !byName('Unarmed'));
  t.ok('a stored (stashed) weapon is not on the person', !byName('Stashed Rifle'));
  t.ok('armour that is not worn is not shown', !byName('Spare Jacket'));
  t.is('worn armour is, with its Concealability', `${byName('Armor Vest').state}/${byName('Armor Vest').conceal}`, 'worn/6');
  t.is('an implanted weapon is listed, never "in hand"', byName('Spur').state, 'body');
  t.is('an item with no Concealability is shown, unrated', `${byName('Spur').conceal}/${byName('Spur').note.length > 0}`, 'null/true');

  /* ── …least concealed first ─────────────────────────────────────────────────────── */
  t.eq('sorted: in hand, then ascending Concealability (the Katana 3 is the easiest to spot), unrated last',
    rows.map(r => r.name), ['Uzi III', 'Katana', 'Ares Predator', 'Armor Vest', 'Knife', 'Spur']);
  t.eq('…and ties break by name', Concealment.sort([
    { name: 'B', conceal: 5, needsTest: true, state: 'stowed' }, { name: 'A', conceal: 5, needsTest: true, state: 'stowed' }]).map(r => r.name), ['A', 'B']);

  /* ── What shows: implants ───────────────────────────────────────────────────────── */
  const C = (nm, cat, flags) => Concealment.classifyImplant(item('cyberware', nm, { cyberwareCategory: cat }, flags));
  t.is('a Synthetic Cyberarm has Concealability 8 (the Limbs table, p.303)', `${C('Synthetic Cyberarm', 'Cyberlimbs').state}/${C('Synthetic Cyberarm', 'Cyberlimbs').conceal}`, 'disguised/8');
  t.is('…the note says clothing adds 3 (p.301)', /clothing over it adds 3/.test(C('Pair Synthetic Cyberlegs', 'Cyberlimbs').note), true);
  t.is('an Obvious Cyberarm needs no test', `${C('Obvious Cyberarm', 'Cyberlimbs').state}/${C('Obvious Cyberarm', 'Cyberlimbs').conceal}`, 'obvious/null');
  t.is('Kid Stealth legs are obvious (M&M)', C('Pair Kid Stealth Legs', 'Cyberlimbs').state, 'obvious');
  t.is('an Obvious Cyberskull too', C('Obvious Cyberskull', 'Cyberlimbs').state, 'obvious');
  t.is('a cyberlimb ENHANCEMENT in the same category is not a visible limb', C('Quickness [5] w/Torso', 'Cyberlimbs'), null);
  t.is('…nor is an induction pad', C('Induction Pad', 'Cyberlimbs'), null);
  t.is('cyberears are an obvious prosthesis (p.299)', C('Ears Cyber Replacement', 'Earware').state, 'obvious');
  t.is('cybereyes are the GM\'s call (p.299)', C('Eyes, Cyber Replacement', 'Eyeware').state, 'judge');
  t.is('an Induction Datajack: Concealability 10 against physical searches (M&M p.21)', C('Induction Datajack', 'Headware').conceal, 10);
  t.is('a plain Datajack is the GM\'s call (p.93)', C('Datajack', 'Headware').state, 'judge');
  t.is('wired reflexes are internal', C('Wired Reflexes 2', 'Bodyware'), null);
  t.is('a stored implant is not in the body', C('Obvious Cyberarm', 'Cyberlimbs', { The2ndChumming3e: { stored: true } }), null);
  t.is('an implanted weapon is listed as the weapon, not twice', C('Hand Razors', 'Cyberweapons'), null);
  const impl = Concealment.rows([item('cyberware', 'Synthetic Cyberarm', { cyberwareCategory: 'Cyberlimbs' }),
    item('cyberware', 'Obvious Cyberleg', { cyberwareCategory: 'Cyberlimbs' }), item('cyberware', 'Eyes, Cyber Replacement', { cyberwareCategory: 'Eyeware' }), gun]);
  t.eq('implants sort with the rest: obvious first, then by number, the GM\'s call after the rated',
    impl.map(r => r.name), ['Obvious Cyberleg', 'Ares Predator', 'Synthetic Cyberarm', 'Eyes, Cyber Replacement']);

  /* ── The tool, from stubbed actors ──────────────────────────────────────────────── */
  const guard = makeActor({ id: 'g1', name: 'Rico', items: [gun, vest, knife] });
  guard.items = [gun, vest, knife].map(i => ({ ...i }));
  installGame({ actors: [guard], sr3e: { SR3EActor: { wornArmorItems: a => a.items.filter(i => i.type === 'armor') } } });
  const r2 = SR3EConcealment.rowsFor(guard);
  t.eq('rowsFor reads the actor\'s worn armour through SR3EActor.wornArmorItems', r2.map(x => x.name), ['Ares Predator', 'Armor Vest', 'Knife']);
  const html = SR3EConcealment.cardHtml(guard, r2.map((r, i) => ({ ...r, show: i !== 2 })));
  t.ok('the card names the character', /What Rico is carrying/.test(html));
  t.ok('…lists what was ticked, with its Concealability', /Ares Predator/.test(html) && /Concealability 5 · stowed/.test(html) && /Concealability 6 · worn/.test(html));
  t.ok('…and leaves out what was not', !/Knife/.test(html));
  t.ok('…says that a lower number is easier to spot', /lower it is, the easier to spot/.test(html));
  t.is('each testable row carries a GM-only test button with its number', (html.match(/sr-conceal-test-btn/g) ?? []).length, 2);
  const pl = JSON.parse(html.match(/sr-conceal-test-btn" data-payload='([^']*)'/)[1]);
  t.eq('…whose payload is plain JSON', [pl.actorId, pl.name, pl.conceal], ['g1', 'Ares Predator', 5]);
  t.ok('an in-hand weapon or obvious chrome gets no test button',
    !/sr-conceal-test-btn/.test(SR3EConcealment.cardHtml(guard, [{ kind: 'weapon', name: 'Uzi', state: 'drawn', conceal: 4, needsTest: false }])));
  t.is('the Perception Success Table, read on the successes (p.232)', [0, 1, 2, 3, 4, 6].map(n => SR3EConcealment.perceptionLine(n).split(' ')[0]).join('/'),
    'Nothing/Something/Something/The/The/The');
  t.ok('…1 success: "Something is there."', SR3EConcealment.perceptionLine(1) === 'Something is there.');
  t.ok('…4 or more: it is known, with no specifics', /no specifics/.test(SR3EConcealment.perceptionLine(5)));

  /* ── Source-level invariants ────────────────────────────────────────────────────── */
  const tool  = read('scripts/SR3EConcealment.js');
  const sr3e  = read('scripts/sr3e.js');
  const sheet = read('scripts/sheets/SR3EActorSheet.js');
  const actor = read('scripts/documents/SR3EActor.js');
  t.ok('both dialogs are wired through DialogV2.wait\'s render option', (tool.match(/render: \(_event, dialog\) => wireDialog\(dialog, dialog\.element\)/g) ?? []).length === 2 && !/renderDialogV2/.test(tool));
  t.ok('it uses native DOM only', !/\$\(|jQuery|\.val\(/.test(tool));
  t.ok('its actor lists hide templates and put the scene first', /sceneFirst\(game\.actors\s*\n?\s*\.filter\(a => \(a\.type === 'character'/.test(tool) && /isLiveActor/.test(tool));
  t.ok('the tool is GM-only', /isGM\) \{ ui\.notifications\.warn\('The Concealment view is a GM tool/.test(tool));
  t.ok('the test button is GM-only', /sr-conceal-test-btn[\s\S]{0,300}!game\.user\.isGM\) return _denyBtn/.test(sr3e));
  t.ok('the Perception Test goes through rollPool, with a follow-up for the Success Table', /observer\.rollPool\(/.test(tool) && /concealPerception: *\['SR3EConcealment', 'perceptionRolled'\]/.test(actor));
  t.ok('the class is registered on game.sr3e', /SR3ECollision, SR3EConcealment, SR3EVehicleSheet,/.test(sr3e));
  t.ok('entry points: the Rollable Tables GM tools and the character sheet (GM only)',
    /mk\('sr3e-conceal-btn', '👁 Concealment',\s+\(\) => SR3EConcealment\.open\(\), true\)/.test(sr3e)
    && /data-action="concealment"/.test(sheet) && /game\.user\.isGM \? `<button type="button" class="btn-sm" data-action="concealment"/.test(sheet));
  t.ok('all three readings of a search\'s target number are offered, never one picked silently', Object.keys({ NOTICE, SEARCH_HALF, SEARCH_FULL }).length === 3
    && /Object\.entries\(MODES\)/.test(tool));
  t.ok('nothing is written back to an item', !/\.update\(|updateEmbedded|setFlag/.test(tool));
}
