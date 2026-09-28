/**
 * Implanted weapons get a weapon entry — TODO 151, in a live world.
 *
 * Reported in play: "Cyber weapons don't show up in the weapons list, and cannot be used in combat."
 * The implant carried Essence and cost only. Now the active GM's `createItem` hook (`_armImplant`,
 * sr3e.js) builds the weapon from `scripts/data/cyber-weapons.mjs`, and `_disarmImplant` removes it
 * with the implant. `tests/cyber-weapons.test.mjs` pins the pure module; this proves the hooks fire
 * on real pack entries and that the owning player sees an attack-ready weapon.
 */
import { test, expect } from './fixtures.mjs';
import { createTestActor, deleteActors, sweepTestActors } from './foundry.mjs';

const OWNER = '__TEST Cyber Weapons';
const PACKS = {
  spur:  ['The2ndChumming3e.sr3e-sr3-cyberware', 'sr3e-cyberware-0383'],  // Spur(CYB), (STR)M
  cygun: ['The2ndChumming3e.sr3e-mm-cyberware',  'sr3e-cyberware-0339'],  // CyGun Heavy(HPist)(CYB), 9M
};

/** Fit an implant from its pack onto the test actor (GM page); returns the implant's id. */
async function fit(page, [pack, id]) {
  return page.evaluate(async ({ n, pack, id }) => {
    const src = await game.packs.get(pack).getDocument(id);
    const [made] = await game.actors.getName(n).createEmbeddedDocuments('Item', [src.toObject()]);
    return made.id;
  }, { n: OWNER, pack, id });
}

/** The weapon linked to an implant, as a client sees it. */
function linkedWeapon(page, implantId) {
  return page.evaluate(({ n, implantId }) => {
    const w = game.actors.getName(n)?.items.find(i => i.flags?.The2ndChumming3e?.cyberwareId === implantId);
    return w ? { type: w.type, name: w.name, category: w.system.category, damage: w.system.damage,
      mode: w.system.mode ?? null, ammunition: w.system.ammunition ?? null, ready: w.system.ready,
      hands: w.system.hands } : null;
  }, { n: OWNER, implantId });
}

test.describe('cyber weapons (TODO 151)', () => {
  let created = [];

  test.beforeEach(async ({ janitor }) => {
    await sweepTestActors(janitor.page);
    const a = await createTestActor(janitor.page, { name: OWNER, ownerUserName: 'Player2', withToken: false });
    created = [a.id];
  });

  test.afterEach(async ({ janitor }) => {
    await deleteActors(janitor.page, created);
    created = [];
    await sweepTestActors(janitor.page);
  });

  test('a spur becomes a CYB melee weapon, and goes with the implant', async ({ player2, janitor }) => {
    const implant = await fit(janitor.page, PACKS.spur);

    await expect.poll(() => linkedWeapon(player2.page, implant), { timeout: 20_000 }).not.toBeNull();
    const w = await linkedWeapon(player2.page, implant);
    expect(w).toMatchObject({ type: 'melee', name: 'Spur', category: 'CYB', damage: '(STR)M', ready: true, hands: 0 });

    // The owning player's melee pool can be built from it — the attack flow's first step.
    const pool = await player2.page.evaluate(({ n, implant }) => {
      const a = game.actors.getName(n);
      const weapon = a.items.find(i => i.flags?.The2ndChumming3e?.cyberwareId === implant);
      return game.sr3e.SR3EItem._buildMeleePoolInfo(a, weapon) != null;
    }, { n: OWNER, implant });
    expect(pool, 'the spur can be attacked with').toBe(true);

    await janitor.page.evaluate(({ n, id }) => game.actors.getName(n).deleteEmbeddedDocuments('Item', [id]),
      { n: OWNER, id: implant });
    await expect.poll(() => linkedWeapon(player2.page, implant), { timeout: 20_000 }).toBeNull();
  });

  test('a cybergun becomes a firearm with its internal magazine (M&M p.41)', async ({ player2, janitor }) => {
    const implant = await fit(janitor.page, PACKS.cygun);

    await expect.poll(() => linkedWeapon(player2.page, implant), { timeout: 20_000 }).not.toBeNull();
    expect(await linkedWeapon(player2.page, implant)).toMatchObject({
      type: 'firearm', name: 'CyGun Heavy', category: 'HPist', damage: '9M', mode: 'SA', ammunition: '10(m)',
      ready: true, hands: 0,
    });

    await janitor.page.evaluate(({ n, id }) => game.actors.getName(n).deleteEmbeddedDocuments('Item', [id]),
      { n: OWNER, id: implant });
    await expect.poll(() => linkedWeapon(player2.page, implant), { timeout: 20_000 }).toBeNull();
  });
});
