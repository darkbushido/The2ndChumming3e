/**
 * Healing (TODO 115) — the pure rules behind the guided card flow, pinned to the core rulebook's
 * tables (pp.125-129, 178, 193-194, 304-305) and Man & Machine's medkit rule (p.136, 138).
 * Plus source-level checks of the wiring the unit tests cannot reach (cards, gates, sheet button).
 */
import { readFileSync } from 'node:fs';
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
installGame({});
const { SR3EHealing: H } = await import('../scripts/SR3EHealing.js');

export const name = 'healing';

export async function run(t) {
  /* ── Condition Monitor and stages (pp.125, 127) ─────────────────────────────────── */
  t.is('0 boxes: unhurt',  H.woundLevel(0), '');
  t.is('1 box: Light',     H.woundLevel(1), 'L');
  t.is('3 boxes: Moderate', H.woundLevel(3), 'M');
  t.is('6 boxes: Serious', H.woundLevel(6), 'S');
  t.is('10 boxes: Deadly', H.woundLevel(10), 'D');
  t.is('the book\'s example: a Serious wound healed to Moderate keeps exactly 3 boxes', H.oneLevelDown(8), 3);
  t.is('Deadly heals to Serious — 6 boxes', H.oneLevelDown(10), 6);
  t.is('Moderate heals to Light — 1 box', H.oneLevelDown(5), 1);
  t.is('Light heals away', H.oneLevelDown(2), 0);
  t.is('nothing to heal stays at nothing', H.oneLevelDown(0), 0);

  /* ── Body / Willpower bands ─────────────────────────────────────────────────────── */
  t.is('bands: 1-3 +0, 4-6 −1, 7-9 −2, 10+ −3', [3, 4, 6, 7, 9, 10].map(H.attributeBand).join(','), '0,-1,-1,-2,-2,-3');

  /* ── Stun (p.126) ───────────────────────────────────────────────────────────────── */
  const st = H.stunRecovery({ body: 5, willpower: 6, woundMod: -2 });
  t.is('Stun: the HIGHER of Body or Willpower', `${st.attribute} ${st.dice}`, 'Willpower 6');
  t.is('…against TN 2 + the injury modifiers (−2 → +2)', st.tn, 4);
  t.is('one box takes 60 minutes ÷ successes', H.stunBoxMinutes(3), 20);
  t.is('no successes: no recovery this rest', H.stunBoxMinutes(0), null);

  /* ── First aid (p.129) ──────────────────────────────────────────────────────────── */
  const fa = H.firstAidTN({ level: 'M', awakened: true, awakenedApplied: true, conditions: 'bad', body: 5, medkit: false });
  t.is('Moderate 6 + Awakened 2 + bad 1 + Body 5 (−1) + no medkit 4 = 12', fa.tn, 12);
  t.is('terrible conditions are +3, not +4 (that is the Doctoring Table)',
    H.firstAidTN({ level: 'L', conditions: 'terrible', body: 3 }).tn, 7);
  t.is('declining the Awakened +2 lowers the TN', H.firstAidTN({ level: 'L', awakened: true, awakenedApplied: false, body: 3 }).tn, 4);
  t.is('a Savior advanced medkit is −1 more (M&M p.95)', H.firstAidTN({ level: 'L', body: 3, savior: true }).tn, 3);
  t.ok('a Deadly wound is stabilize-only', H.firstAidTN({ level: 'D', body: 3 }).stabilizeOnly);
  const out = H.firstAidOutcome({ level: 'S', successes: 2 });
  t.ok('one success lowers ONE level — no more, however many', out.lowered && !out.stabilized);
  t.is('treatment time 15 turns ÷ 2 successes → 8 (rounded up)', out.turns, 8);
  t.ok('a Deadly wound with a success is stabilized, not lowered',
    H.firstAidOutcome({ level: 'D', successes: 1 }).stabilized && !H.firstAidOutcome({ level: 'D', successes: 1 }).lowered);
  t.ok('no successes: nothing', !H.firstAidOutcome({ level: 'L', successes: 0 }).lowered);

  /* ── The medkit's dice (M&M p.136, 138) ─────────────────────────────────────────── */
  t.is('Biotech 4 + a Rating 3 medkit: complementary dice → 7', H.firstAidDice({ biotech: 4, medkitRating: 3 }).dice, 7);
  t.is('no Biotech: the medkit\'s rating IS the skill → 3', H.firstAidDice({ biotech: 0, medkitRating: 3 }).dice, 3);
  t.ok('neither: defaulting', H.firstAidDice({}).defaulting);
  t.ok('medkit supplies run out on a 1 (p.304)', H.medkitSuppliesOut(1) && !H.medkitSuppliesOut(2) && !H.medkitSuppliesOut(6));

  /* ── Magic loss (p.129) ─────────────────────────────────────────────────────────── */
  t.is('Deadly AND treated without the +2: roll TWICE', H.magicLossRolls({ awakened: true, deadly: true, treatedWithoutMod: true }), 2);
  t.is('a Deadly wound alone: once', H.magicLossRolls({ awakened: true, deadly: true }), 1);
  t.is('treated without the +2 alone: once', H.magicLossRolls({ awakened: true, treatedWithoutMod: true }), 1);
  t.is('neither: none', H.magicLossRolls({ awakened: true }), 0);
  t.is('a mundane patient: never', H.magicLossRolls({ awakened: false, deadly: true, treatedWithoutMod: true }), 0);
  t.ok('a 2D6 AT the Magic rating loses a point', H.magicLost(5, 5) && !H.magicLost(6, 5));

  /* ── Does it need a doctor? (pp.126-127) ────────────────────────────────────────── */
  t.is('Wound Table: Light 2 / Moderate 4 / Serious 6', ['L', 'M', 'S'].map(l => H.attentionTN(l)).join('/'), '2/4/6');
  t.is('Deadly has no test — it always needs medical attention', H.attentionTN('D'), null);
  t.ok('…and needsMedicalAttention says so even with successes', H.needsMedicalAttention({ level: 'D', successes: 5 }));
  t.is('a stabilization unit is −2 (p.305), floored at 2', H.attentionTN('M', { stabilizationUnit: true }), 2);

  /* ── Doctoring Table (p.128) ────────────────────────────────────────────────────── */
  t.is('in hospital, magician +2, natural Body 7 (−2), Willpower 4 (−1) → −1',
    H.doctoringModifier({ conditions: 'hospital', magician: true, body: 7, willpower: 4 }).mod, -1);
  t.is('intensive care −2 and long-term magical care −2', H.doctoringModifier({ intensiveCare: true, magicalCare: true, body: 3, willpower: 3 }).mod, -4);
  t.is('conditions: only ONE applies — terrible is +4', H.doctoringModifier({ conditions: 'terrible', body: 3, willpower: 3 }).mod, 4);
  t.is('not in hospital or clinic +2', H.doctoringModifier({ conditions: 'notHospital', body: 3, willpower: 3 }).mod, 2);

  /* ── Healing Table (p.127) ──────────────────────────────────────────────────────── */
  t.is('Moderate, 3 successes: 10 days ÷ 3 = 80 hours', H.stageHours({ level: 'M', successes: 3 }), 80);
  t.is('never below the minimum: Light with 24 successes is 2 hours, not 1', H.stageHours({ level: 'L', successes: 24 }), 2);
  t.is('organ damage doubles the whole time: Deadly, 1 success → 60 days', H.stageHours({ level: 'D', successes: 1, timeMultiplier: 2 }), 1440);
  t.is('a lost limb is base +50%: Serious, 2 successes → 15 days', H.stageHours({ level: 'S', successes: 2, baseMultiplier: 1.5 }), 360);
  t.is('no successes: the book gives no time — null, the GM\'s call', H.stageHours({ level: 'S', successes: 0 }), null);
  t.is('stage TN: Serious 8, doctor −1, stabilization unit −2 → 5', H.stageTN('S', { doctorMod: -1, stabilizationUnit: true }), 5);

  /* ── Costs (pp.127-128, lifestyle p.62) ─────────────────────────────────────────── */
  const c1 = H.recoveryCost({ level: 'M', days: 4, care: 'doctor' });
  t.is('Moderate, 4 days of doctor visits: 100¥ × 4', c1.care, 400);
  t.is('…and 4 days of the Middle lifestyle at 5,000¥ ÷ 30', c1.lifestyle, 667);
  const c2 = H.recoveryCost({ level: 'S', days: 3, care: 'hospital' });
  t.is('hospital: 500¥ a day, doctor included', c2.care, 1500);
  t.is('…and the hospital IS the lifestyle — nothing more', c2.lifestyle, 0);
  t.is('intensive care is Deadly only', H.recoveryCost({ level: 'S', days: 2, care: 'icu' }).care, 0);
  t.is('intensive care: 1,000¥ a day', H.recoveryCost({ level: 'D', days: 2, care: 'icu' }).care, 2000);
  t.is('Deadly outside a hospital still needs the Hospitalized lifestyle (500¥/day)',
    H.recoveryCost({ level: 'D', days: 2, care: 'none' }).lifestyle, 1000);
  t.is('paramedic first aid: 50 / 100 / 200 / 400', ['L', 'M', 'S', 'D'].map(l => H.MEDICAL_COSTS.paramedic[l]).join('/'), '50/100/200/400');
  t.is('a part-day bills as a day', H.billableDays(25), 2);
  t.is('Body Part Types: a limb is 8 weeks and 25,000¥', `${H.BODY_PARTS.limb.weeks}/${H.BODY_PARTS.limb.cost}`, '8/25000');

  /* ── Deadly wounds (pp.127-129) ─────────────────────────────────────────────────── */
  t.is('permanent damage: 0 successes → organ', H.permanentDamage(0), 'organ');
  t.is('1 → an eye or limb', H.permanentDamage(1), 'limb');
  t.is('2+ → none', H.permanentDamage(2), 'none');
  t.is('TN 4, +2 after a trauma patch', H.permanentDamageTN({ traumaPatch: true }), 6);
  t.is('the organ table: 1 Body … 6 Reaction', H.ORGAN_TABLE.slice(1).join(','), 'body,strength,quickness,intelligence,willpower,reaction');
  t.is('trauma patch TN: 4 + dermal armor 1 + blood filter 2', H.traumaPatchTN({ dermalArmor: 1, bloodFilter: 2 }), 7);

  /* ── Heal / Treat / Stabilize (pp.178, 193-194) ─────────────────────────────────── */
  t.is('Heal TN 10 − Essence 6 = 4', H.healSpellTN(6), 4);
  t.is('a fractional Essence rounds the TN UP: 10 − 5.32 → 5', H.healSpellTN(5.32), 5);
  const hs = H.healSpell({ spell: 'heal', successes: 4, toHealing: 3, force: 3, level: 'S' });
  t.is('4 successes: 3 to boxes (Force 3), 1 to time', `${hs.boxes}/${hs.timeSuccesses}`, '3/1');
  t.is('…permanent after 15 turns (Serious base 15 ÷ 1)', hs.turns, 15);
  t.is('Treat takes half the time, rounded down', H.healSpell({ spell: 'treat', successes: 4, toHealing: 3, force: 3, level: 'S' }).turns, 7);
  t.is('boxes never exceed the Force', H.healSpell({ successes: 9, toHealing: 9, force: 4, level: 'M' }).boxes, 4);
  t.is('Heal Drain: Force 6 ÷ 2 = 3', H.healSpell({ force: 6, successes: 1, level: 'M' }).drainTN, 3);
  t.is('Treat Drain: −1 → 2', H.healSpell({ spell: 'treat', force: 6, successes: 1, level: 'M' }).drainTN, 2);
  t.is('…at the patient\'s wound level', H.healSpell({ force: 6, successes: 1, level: 'M' }).drainLevel, 'M');
  const sp = H.stabilizeSpell({ force: 3, overflow: 4, minutes: 2 });
  t.is('Stabilize TN: 4 + minutes', sp.tn, 6);
  t.ok('…and no effect when Force is below the overflow', !sp.effective && H.stabilizeSpell({ force: 4, overflow: 4 }).effective);
  t.is('healed boxes come off the overflow first', JSON.stringify(H.healBoxes({ physical: 10, overflow: 2, n: 3 })), '{"physical":9,"overflow":0}');

  /* ── Finding the gear ───────────────────────────────────────────────────────────── */
  const who = (id, items) => ({ id, items });
  const kit = (id, name, flags = {}, rating) => ({ id, name, type: 'gear', system: rating ? { rating } : {}, flags: { The2ndChumming3e: flags } });
  t.is('a medkit is found, with its rating', H.findEquipment([who('a', [kit('k', 'Medkit', {}, 3)])], 'medkit')?.rating, 3);
  t.is('"Medkit Supplies" is not a medkit', H.findEquipment([who('a', [kit('s', 'Medkit Supplies')])], 'medkit'), null);
  t.is('a medkit whose supplies ran out does not count', H.findEquipment([who('a', [kit('k', 'Medkit', { suppliesOut: true })])], 'medkit'), null);
  t.is('a stabilization unit is found either spelling', H.findEquipment([who('a', [kit('u', 'Stabilisation Unit')])], 'stabilization')?.itemId, 'u');
  t.is('ratings are read from "[N]" too', H.findEquipment([who('a', [kit('p', 'Antidote Patch [5]')])], 'antidote')?.rating, 5);
  // Reported in play: two players carry Medkit [6]s. With other gear about, the best must win.
  t.is('the BEST medkit wins, not the first — [3] then [6] gives the 6',
    H.findEquipment([who('a', [kit('k3', 'Medkit [3]'), kit('k6', 'Medkit [6]')])], 'medkit')?.itemId, 'k6');
  t.is('…across the medic and the patient too',
    H.findEquipment([who('medic', [kit('k3', 'Medkit [3]')]), who('patient', [kit('k6', 'Medkit [6]')])], 'medkit')?.actorId, 'patient');
  t.is('a GM-edited rating counts — Medkit [6] set to 2 loses to a Medkit [3]',
    H.findEquipment([who('a', [kit('k6', 'Medkit [6]', {}, 2), kit('k3', 'Medkit [3]')])], 'medkit')?.itemId, 'k3');
  t.is('a medkit in storage is not on hand', H.findEquipment([who('a', [kit('k6', 'Medkit [6]', { stored: true }), kit('k3', 'Medkit [3]')])], 'medkit')?.rating, 3);
  t.is('an empty [6] does not beat a stocked [3]',
    H.findEquipment([who('a', [kit('k6', 'Medkit [6]', { suppliesOut: true }), kit('k3', 'Medkit [3]')])], 'medkit')?.rating, 3);
  // TODO 139: an empty medkit is refilled by buying Medkit Supplies, never from the healing card mid-fight.
  t.ok('"Medkit Supplies" is a refill, a medkit is not', H.isMedkitSupplies('Medkit Supplies') && !H.isMedkitSupplies('Medkit [6]'));
  t.is('only the empty medkits need supplies',
    H.emptyMedkits([kit('k6', 'Medkit [6]', { suppliesOut: true }), kit('k3', 'Medkit [3]'), kit('s', 'Medkit Supplies', { suppliesOut: true })]).map(i => i.id).join(), 'k6');
  t.is('Medkit Supplies are 50¥, 2/24hrs, Street Index 1.5 (SR3 p.304)',
    JSON.stringify(H.MEDKIT_SUPPLIES), '{"name":"Medkit Supplies","cost":50,"availability":"2/24hrs","streetIndex":1.5}');
  {
    const heal = readFileSync(new URL('../scripts/SR3EHealing.js', import.meta.url), 'utf8');
    const buy  = readFileSync(new URL('../scripts/SR3EPurchase.js', import.meta.url), 'utf8');
    t.ok('the healing card offers no restock button', !/act:\s*'restock'/.test(heal) && !/case 'restock'/.test(heal));
    t.ok('paying for Medkit Supplies refills an empty medkit', /isMedkitSupplies\(payload\.name\)/.test(buy) && /unsetFlag\('The2ndChumming3e', 'suppliesOut'\)/.test(buy));
    t.ok('Buy gear offers the supplies when a medkit is empty', /emptyMedkits\(actor\.items\)/.test(buy) && /#sr-buy-supplies/.test(buy));
  }
  t.is('"Medkit Rating 6", the generator\'s spelling, reads 6', H.findEquipment([who('a', [kit('k', 'Medkit Rating 6')])], 'medkit')?.rating, 6);
  t.is('first aid with a Medkit [6] and Biotech 4: 4 dice + 6 complementary', H.firstAidDice({ biotech: 4, medkitRating: 6 }).dice, 10);
  t.is('…and with no Biotech the kit\'s 6 is the skill', H.firstAidDice({ biotech: 0, medkitRating: 6 }).dice, 6);
  t.is('times read like people write them', [H.formatHours(0.5), H.formatHours(80), H.formatHours(2)].join(' | '), '30 minutes | 3 days 8 hours | 2 hours');

  /* ── Dice / TN on a roll card: the GM's, not the player's (reported in play) ────── */
  const box = v => ({ value: String(v), readOnly: false, title: '', on: {}, addEventListener(e, f) { this.on[e] = f; } });
  const cardHtml = (pool, tn) => { const b = { '.sr-heal-pool': box(pool), '.sr-heal-tn': box(tn) }; return { b, querySelector: s => b[s] ?? null }; };
  const fakeMsg = (flag = null) => ({ id: 'm1', flag, getFlag() { return this.flag; }, async setFlag(_s, _k, v) { this.flag = v; } });
  const prevUser = game.user, prevMessages = game.messages, prevActors = game.actors;
  try {
    game.user = { isGM: false };
    let h = cardHtml(6, 5);
    H.wireCard(fakeMsg({ tn: 3 }), h);
    t.ok('a player\'s Dice and TN boxes are read-only', h.b['.sr-heal-pool'].readOnly && h.b['.sr-heal-tn'].readOnly);
    t.is('…and show what the GM saved, not what was posted', String(h.b['.sr-heal-tn'].value), '3');
    t.is('…and a player\'s box saves nothing', Object.keys(h.b['.sr-heal-tn'].on).length, 0);

    game.user = { isGM: true };
    const m = fakeMsg();
    h = cardHtml(6, 5);
    H.wireCard(m, h);
    t.ok('the GM\'s boxes stay editable', !h.b['.sr-heal-pool'].readOnly && !h.b['.sr-heal-tn'].readOnly);
    h.b['.sr-heal-tn'].value = '4'; h.b['.sr-heal-tn'].on.change?.();
    h.b['.sr-heal-pool'].value = '8'; h.b['.sr-heal-pool'].on.change?.();
    t.is('a GM edit is saved on the message, where the rolling client can read it', `${m.flag?.pool}/${m.flag?.tn}`, '8/4');

    // The roll itself: a player rolls the saved numbers, whatever their own copy of the card says.
    let rolled = null;
    game.actors = { get: () => ({ name: 'R', rollPool: async (pool, tn) => { rolled = [pool, tn]; } }) };
    game.messages = { get: () => fakeMsg({ pool: 8, tn: 4 }) };
    const tampered = cardHtml(30, 2);
    const btn = { closest: s => (s === '.sr-heal-card' ? tampered : { dataset: { messageId: 'm1' } }) };
    game.user = { isGM: false };
    await H.rollFromCard(btn, { rollerId: 'r', pool: 6, tn: 5, label: 'x' });
    t.is('a player rolls the GM\'s saved Dice and TN, not a box typed into', JSON.stringify(rolled), '[8,4]');
    game.messages = { get: () => fakeMsg(null) };
    await H.rollFromCard(btn, { rollerId: 'r', pool: 6, tn: 5, label: 'x' });
    t.is('…and with nothing saved, what was posted', JSON.stringify(rolled), '[6,5]');
    game.user = { isGM: true };
    await H.rollFromCard(btn, { rollerId: 'r', pool: 6, tn: 5, label: 'x' });
    t.is('a GM rolling reads their own boxes', JSON.stringify(rolled), '[30,2]');
  } finally { game.user = prevUser; game.messages = prevMessages; game.actors = prevActors; }

  /* ── Changing the patient: one set of ops, run by the owner or by the GM ─────────── */
  const patient = ({ physical = 0, overflow = 0, stun = 0, flag = null, owner = true } = {}) => ({
    id: 'pt', uuid: 'Actor.pt', name: 'Pt', type: 'character', isOwner: owner, flag, updates: [],
    system: { wounds: { physical: { value: physical }, overflow: { value: overflow }, stun: { value: stun } }, attributes: {} },
    getFlag() { return this.flag; }, async setFlag(_s, _k, v) { this.flag = v; }, async unsetFlag() { this.flag = null; },
    async update(d) {
      this.updates.push(d);
      for (const [k, v] of Object.entries(d)) { const [, , track] = k.split('.'); this.system.wounds[track].value = v; }
    },
  });
  let pt = patient({ physical: 3, flag: { stabilized: true } });
  let r = await H._applyOp(pt, { kind: 'lower' });
  t.is('lower: Moderate drops to Light\'s one box', `${r.before}→${r.after}`, '3→1');
  t.ok('…and the record stays while a wound remains', pt.flag?.stabilized === true);
  r = await H._applyOp(pt, { kind: 'lower' });
  t.is('lower from Light: healed, and the record is cleared', `${r.after}/${pt.flag}`, '0/null');
  pt = patient({ physical: 6 });
  r = await H._applyOp(pt, { kind: 'boxes', n: 2 });
  t.is('Heal 2 boxes of Serious: 6 → 4, marked magically healed', `${r.after}/${pt.flag?.magicHealed}`, '4/true');
  pt = patient({ physical: 2, overflow: 1, flag: { stabilized: true } });
  r = await H._applyOp(pt, { kind: 'boxes', n: 5 });
  t.is('healing every box by magic clears the record, so the next injury is a new set', `${r.after}+${r.afterOver}/${r.done}/${pt.flag}`, '0+0/true/null');
  pt = patient({ stun: 2 });
  r = await H._applyOp(pt, { kind: 'eraseStun' });
  t.is('erase a Stun box', r.after, 1);
  pt = patient({ physical: 10, flag: { stabilized: true } });
  await H._applyOp(pt, { kind: 'record', patch: { timeMultiplier: 2 } });
  t.is('record merges into the flag', JSON.stringify(pt.flag), '{"stabilized":true,"timeMultiplier":2}');

  const prevSr3e = game.sr3e;
  try {
    let sent = null;
    game.sr3e = { ...prevSr3e, SR3EQuery: { asGM: async (verb, data) => { sent = { verb, data }; return { before: 3, after: 1 }; } } };
    pt = patient({ physical: 3, owner: true });
    await H.applyToPatient(pt, { kind: 'lower' });
    t.ok('the patient\'s owner writes directly, asking nobody', pt.updates.length === 1 && sent === null);
    pt = patient({ physical: 3, owner: false });
    await H.applyToPatient(pt, { kind: 'lower' });
    t.ok('a medic treating someone else\'s character asks the GM, with the intent — not a box count',
      sent?.verb === 'sr3e.heal.apply' && sent.data.uuid === 'Actor.pt' && sent.data.op.kind === 'lower' && pt.updates.length === 0);

    // Who can be picked as the patient (reported in play: player A could not treat player B).
    game.sr3e = { ...prevSr3e, isLiveActor: () => true, SR3EQuery: { isPlayerCharacter: a => !!a.pc } };
    const cast = [
      { name: 'Mine', type: 'character', isOwner: true },
      { name: 'Other PC', type: 'character', isOwner: false, pc: true },
      { name: 'Seen NPC', type: 'npc', isOwner: false, testUserPermission: () => true },
      { name: 'Hidden NPC', type: 'npc', isOwner: false, testUserPermission: () => false },
      { name: 'A car', type: 'vehicle', isOwner: true },
    ];
    t.is('a player may treat their own, other players\' characters and anyone they can see — not hidden NPCs',
      H.patientsFor({ isGM: false }, cast).map(a => a.name).join(', '), 'Mine, Other PC, Seen NPC');
    t.is('a GM may treat anyone (but not a vehicle)', H.patientsFor({ isGM: true }, cast).length, 4);
  } finally { game.sr3e = prevSr3e; }

  /* ── Rapid Healing reaches the patient's Body tests (TODO 76) ──────────────────── */
  const adept = { system: { derived: { situationalBonuses: [
    { label: 'Rapid Healing', situation: 'healing', dice: 2 },
    { label: 'Nephritic Screen', situation: 'toxin', dice: 1 },
    { label: 'Nothing', situation: 'healing', dice: 0 },
  ] } } };
  t.is('only the healing situation counts: +2', H.healingSituationDice(adept).dice, 2);
  t.is('…and it is named for the card', H.healingSituationDice(adept).labels.join(), 'Rapid Healing +2');
  t.is('no derived data: nothing, and no throw', H.healingSituationDice({}).dice, 0);
  const healSrc = readFileSync(new URL('../scripts/SR3EHealing.js', import.meta.url), 'utf8');
  for (const [step, pool] of [['attention', 'pool: s.bodyNatural + hd.dice'], ['stage', 'pool: s.bodyNatural + hd.dice'],
                              ['permanent', 'pool: s.bodyNatural + dermal + hd.dice']]) {
    const body = healSrc.slice(healSrc.indexOf(`case '${step}': {`), healSrc.indexOf(`case '${step}': {`) + 4000);
    t.ok(`the ${step} test adds the healing-situation dice`, body.includes(pool));
  }

  /* ── How long it takes ──────────────────────────────────────────────────────────── */
  const road = H.recoveryRoad('M');
  t.is('Moderate to healed: two stages', road.stages.map(x => `${x.from}→${x.to || 'healed'} ${x.minH}-${x.maxH}h TN${x.tn}`).join(' | '),
    'M→L 24-240h TN6 | L→healed 2-24h TN4');
  t.is('…and all of it: 26 hours at best, 264 at 1 success a stage', `${road.minH}-${road.maxH}`, '26-264');
  t.is('organ damage doubles every stage of the road', H.recoveryRoad('D', { timeMultiplier: 2 }).stages[0].minH, 144);
  t.is('a lost limb adds 50% to the base, not the minimum', `${H.recoveryRoad('S', { baseMultiplier: 1.5 }).stages[0].minH}/${H.recoveryRoad('S', { baseMultiplier: 1.5 }).stages[0].maxH}`, '48/720');
  t.is('Combat Turns in real time (3 seconds each, p.39)', [1, 15, 40].map(H.formatTurns).join(' | '),
    '1 Combat Turn (3 seconds) | 15 Combat Turns (45 seconds) | 40 Combat Turns (2 minutes)');
  const lines = H._lines(['plain', H._timeBox('12 days', 'sub'), '']);
  t.ok('a time box goes onto the card as a block, text as a line, blanks dropped',
    lines.includes('<div class="sr-heal-line">plain</div>') && lines.includes('class="sr-heal-time"') && !lines.includes('sr-heal-line"></div>'));

  /* ── Wiring (source level — the sheets and hooks cannot be imported) ────────────── */
  const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
  const entry = read('scripts/sr3e.js'), actor = read('scripts/documents/SR3EActor.js'), sheet = read('scripts/sheets/SR3EActorSheet.js');
  t.ok('the roll button is the roller\'s alone', /\.sr-heal-roll-btn[\s\S]{0,300}_isDeciderId\(pl\.rollerId\)/.test(entry));
  t.ok('action buttons need the patient\'s owner, the medic who rolled, or the GM', /\.sr-heal-act-btn[\s\S]{0,300}_mineAny\(pl\.ownerId, pl\.byId\)/.test(entry));
  t.ok('the GM has a heal.apply verb that runs _applyOp in the actor\'s queue', /'sr3e\.heal\.apply'[\s\S]{0,300}SR3EQueue\.run\(doc\.uuid, \(\) => game\.sr3e\.SR3EHealing\._applyOp\(doc, op\)\)/.test(read('scripts/SR3EQuery.js')));
  t.ok('a cancelled Charge / Next hands the button back', /act\(btn, pl\) === false/.test(entry));
  t.ok('the final wave posts the result card', /allDone && state\.healingContext[\s\S]{0,120}SR3EHealing\.onRolled/.test(actor));
  t.ok('the character sheet has the 🩹 Healing button', /data-action="openHealing"/.test(sheet) && /openHealing:\s+SR3EActorSheet\._onOpenHealing/.test(sheet));
  {
    // TODO 138: the button moved whenever the character was hurt, because the wound status text
    // ("unconscious", TN/Init modifier, ☠ DEAD) sat before it in the same wrapping flex row.
    const row = sheet.slice(sheet.indexOf('<div class="wound-tracks">'), sheet.indexOf('</header>'));
    const btn = row.indexOf('data-action="openHealing"');
    const after = marker => row.indexOf(marker) > btn;
    t.ok('TODO 138: 🩹 Healing comes before the wound status, ☠ DEAD and the Init Mod, so damage cannot move it',
      btn > 0 && after('${deadHtml}') && after('unconscious') && after('const wm    = sys.woundMod') && after('Init Mod:'));
  }
  t.ok('the GM tools list has it too, for everyone', /mk\('sr3e-heal-btn'[^\n]*false\)/.test(entry));
  t.ok('every render wires the Dice / TN boxes', /SR3EHealing\.wireCard\(message, html\)/.test(entry));
  const css = read('styles/sr3e.css');
  const numRule = css.match(/\.sr-roll-card input\[type="number"\]\s*\{([^}]*)\}/)?.[1] ?? '';
  t.ok('chat-card number boxes get the system\'s text colour (they were #222 on a dark card — invisible)', /color:\s*var\(--sr-text\)/.test(numRule));
  const heal = read('scripts/SR3EHealing.js');
  t.ok('Spell Pool dice on a Heal card are spent from the caster when they roll', /static async rollFromCard[\s\S]{0,2000}p\.spellPool > 0[\s\S]{0,80}roller\.spendSpellPool\(p\.spellPool\)/.test(heal));
  t.ok('"does it need a doctor?" at Deadly posts no roll (it posted "TN null" in play)', /case 'attention': \{\s*[\s\S]{0,200}attentionTN\(s\.level\) === null\)[\s\S]{0,40}return H\._postAction/.test(heal));
  t.ok('no card prints a bare "${n} boxes" (it read "(1 boxes)" in play)', !/\$\{[^}]+\} boxes\b/.test(heal));
}
