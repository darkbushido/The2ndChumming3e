/**
 * Layered armour (SR3 p.285, TODO 112) and splitting stacks out of storage (TODO 113).
 *
 * Both reported in play on 2026-09-13: a player could not wear a Secure Long Coat and a helmet
 * together (legal), and could not take two stim patches out of a stack of ten in storage.
 *
 * The book's own worked example is the anchor for the armour rules — Twitch, p.285: armor vest
 * with plates (4/3), lined coat (4/2) and a small riot shield (1/2), Quickness 6 → 7 ballistic,
 * 6 impact, +3 to Quickness-linked tests, and 2 Combat Pool dice lost.
 */
import { installGlobals, installGame } from './helpers/foundry.mjs';
installGlobals();
const { SR3E } = await import('../scripts/config.js');
installGame({ sr3e: { SR3E } });
const { SR3EActor } = await import('../scripts/documents/SR3EActor.js');

export const name = 'armor-layering';

const piece = (name, ballistic, impact, accessory = false) => ({ name, ballistic, impact, accessory });
const L = (pieces, q) => SR3EActor.layeredArmor(pieces, q);

export async function run(t) {
  /* ── Twitch, SR3 p.285 — every number the example prints ─────────────────────────── */
  const twitch = L([piece('Armor Vest w/ Plates', 4, 3), piece('Lined Coat', 4, 2),
                    piece('Riot Shield (small)', 1, 2, true)], 6);
  t.is('Twitch: 7 ballistic — 4 + (4 ÷ 2) + 1',        twitch.ballistic, 7);
  t.is('Twitch: 6 impact — 3 + (2 ÷ 2) + 2',           twitch.impact, 6);
  t.is('Twitch: the full ballistic worn is 9',         twitch.sumBallistic, 9);
  t.is('Twitch: the full impact worn is 7',            twitch.sumImpact, 7);
  t.is('Twitch: Quickness-linked tests +3 (9 − 6)',     twitch.quicknessTN, 3);
  t.is('Twitch: loses 2 Combat Pool dice — rounded UP, as the example requires', twitch.combatPoolPenalty, 2);
  t.ok('Twitch: two body pieces is layering',          twitch.layered);

  /* ── The armour jacket example on the same page: Quickness 3, 5/3 → one die ─────────── */
  const jacket = L([piece('Armor Jacket', 5, 3)], 3);
  t.is('armour jacket at Quickness 3: one Combat Pool die', jacket.combatPoolPenalty, 1);
  t.is('…one piece is not layering, so no Quickness TN',   jacket.quicknessTN, 0);
  t.is('…and it protects at its own rating',             `${jacket.ballistic}/${jacket.impact}`, '5/3');

  /* ── The case reported in play: a coat and a helmet ───────────────────────────────── */
  const coatHelm = L([piece('Secure Long Coat', 4, 2), piece('Military Helmet', 2, 2, true)], 5);
  t.is('coat + helmet: the helmet adds IN FULL — 6 ballistic', coatHelm.ballistic, 6);
  t.is('…4 impact',                                           coatHelm.impact, 4);
  t.ok('…a helmet "does not count as layering"',              !coatHelm.layered);
  t.is('…so there is no Quickness penalty',                   coatHelm.quicknessTN, 0);
  t.is('…but the helmet counts toward the Combat Pool burden (6 over 5 → 1)', coatHelm.combatPoolPenalty, 1);

  /* ── Edges ─────────────────────────────────────────────────────────────────────────── */
  t.is('a third body piece adds nothing (4 + 4÷2, the third 4 ignored)',
    L([piece('A', 4, 0), piece('B', 4, 0), piece('C', 4, 0)]).ballistic, 6);
  const cross = L([piece('Heavy front', 5, 1), piece('Padded', 2, 4)]);
  t.is('each type takes its own best piece — ballistic 5 + 2÷2', cross.ballistic, 6);
  t.is('…impact 4 + 1÷2',                                  cross.impact, 4);
  t.is('nothing worn: nothing protects',                  `${L([]).ballistic}/${L([]).impact}`, '0/0');
  t.is('no Quickness given: no burden computed',          L([piece('X', 12, 12)]).combatPoolPenalty, 0);
  t.is('armour under Quickness costs nothing',            L([piece('Vest', 2, 1)], 6).combatPoolPenalty, 0);

  /* ── Helmets and shields are recognised by name ───────────────────────────────────── */
  const acc = n => SR3EActor.isArmorAccessory({ name: n });
  t.ok('Security Helmet is a helmet',  acc('Security Helmet'));
  t.ok('Military Helmet is a helmet',  acc('Military Helmet'));
  t.ok('Riot Shield is a shield',      acc('Riot Shield'));
  t.ok('Secure Long Coat is not',      !acc('Secure Long Coat'));
  t.ok('a word match: "Shieldwall Jacket" is not a shield', !acc('Shieldwall Jacket'));

  /* ── Which pieces are worn ────────────────────────────────────────────────────────── */
  const arm = (id, name, b, i, flags = {}) => ({ id, type: 'armor', name, system: { ballistic: b, impact: i },
                                                flags: { The2ndChumming3e: flags } });
  const coat = arm('c', 'Secure Long Coat', 4, 2, { worn: true });
  const helm = arm('h', 'Military Helmet', 2, 2, { worn: true });
  const vest = arm('v', 'Armor Vest', 2, 1);
  const kept = arm('s', 'Armor Jacket', 5, 3, { worn: true, stored: true });
  const actor = (items, equippedArmor = '') => ({ type: 'character', system: { equippedArmor }, items });
  const ids = a => SR3EActor.wornArmorItems(a).map(i => i.id).sort().join(',');
  t.is('every piece flagged worn is worn — more than one', ids(actor([coat, helm, vest])), 'c,h');
  t.is('the legacy single field still counts (importer, generator macro)', ids(actor([vest], 'v')), 'v');
  t.is('…alongside flagged pieces',                        ids(actor([coat, vest], 'v')), 'c,v');
  t.is('a stored piece is never worn',                     ids(actor([kept])), '');

  const ar = SR3EActor.armorRatings(actor([coat, helm]));
  t.is('armorRatings combines worn pieces by p.285',       `${ar.ballistic}/${ar.impact}`, '6/4');
  t.is('…and names them all',                              ar.worn.name, 'Secure Long Coat + Military Helmet');
  const lace = { type: 'cyberware', name: 'Bone Lace, Titanium', system: { mods: '+1IMP,+1BAL,' } };
  t.is('implant armour stays additive on top (TODO 75)',   (() => { const r = SR3EActor.armorRatings(actor([coat, helm, lace])); return `${r.ballistic}/${r.impact}`; })(), '7/5');

  /* ── Stacks (TODO 113) ────────────────────────────────────────────────────────────── */
  const gear = (qty, extra = {}) => ({ type: 'gear', name: 'Stim Patch [2]', system: { quantity: qty, cost: 50, ...extra } });
  t.is('gear counts in quantity',       SR3EActor.stackField(gear(10)), 'quantity');
  t.is('ammunition counts in rounds',   SR3EActor.stackField({ type: 'ammunition', system: { rounds: 50 } }), 'rounds');
  t.is('armour is not a stack',         SR3EActor.stackField({ type: 'armor', system: { ballistic: 2 } }), null);
  t.is('thrown weapons count in quantity', SR3EActor.stackField({ type: 'thrown', system: { quantity: 3 } }), 'quantity');
  t.ok('same item, different counts: the same stack',   SR3EActor.stackKey(gear(10)) === SR3EActor.stackKey(gear(2)));
  t.ok('different notes: NOT merged (strict)',          SR3EActor.stackKey(gear(1, { description: 'a' })) !== SR3EActor.stackKey(gear(1, { description: 'b' })));
  t.ok('different names: not the same stack',
    SR3EActor.stackKey(gear(1)) !== SR3EActor.stackKey({ ...gear(1), name: 'Trauma Patch' }));

  const P = p => SR3EActor.planStackMove(p);
  const s = x => JSON.stringify(x);
  t.is('take 2 of 10, nothing on the far side: 8 stay, a new stack of 2',
    s(P({ have: 10, moving: 2 })), s({ moving: 2, sourceQty: 8, flipSource: false, target: null, createQty: 2 }));
  t.is('take all 10: the item itself moves',
    s(P({ have: 10, moving: 10 })), s({ moving: 10, sourceQty: 10, flipSource: true, target: null, createQty: null }));
  t.is('take 2 onto an existing stack of 3: it becomes 5, 8 stay',
    s(P({ have: 10, moving: 2, target: { id: 'x', qty: 3 } })),
    s({ moving: 2, sourceQty: 8, flipSource: false, target: { id: 'x', qty: 5 }, createQty: null }));
  t.is('put all 10 back onto the stored stack of 3: 13 there, the source goes',
    s(P({ have: 10, moving: 10, target: { id: 'x', qty: 3 } })),
    s({ moving: 10, sourceQty: null, flipSource: false, target: { id: 'x', qty: 13 }, createQty: null }));
  t.is('moving 0 changes nothing', P({ have: 10, moving: 0 }).createQty, null);
  t.is('moving more than there is is clamped to all', P({ have: 10, moving: 99 }).flipSource, true);
}
