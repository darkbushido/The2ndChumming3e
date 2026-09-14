/**
 * Authoritative document CREATION must relay through the GM.
 *
 * `Actor.create` requires the **`ACTOR_CREATE`** permission, which the base Player role does
 * not have. A sheet that calls it directly therefore works for the GM, throws for everyone
 * else, and — because the button is rendered unconditionally — looks like a broken feature
 * rather than a permission problem.
 *
 * That is exactly what TODO 71 was, reported from play 2026-08-30: the Vehicles tab's
 * "+ Create & Assign" button opened its dialog, took the player's choice, and then died on
 * `Actor.implementation.create(data)`. It was the last authoritative write in the system still
 * running on the clicking client; every other one relays through `SR3EQuery.asGM` precisely
 * because a player's client may not have permission — pools, damage, card state, Essence.
 *
 * ⚠ **Ownership is the half that gets forgotten**, and it fails differently: creation succeeds,
 * the vehicle appears on the player's sheet, and then refuses to roll because they do not own
 * it. That reads as a *second* bug. `sr3e.actor.create` grants the requester OWNER, and this
 * file asserts it, because nothing else would notice its removal.
 *
 * ⚠ **SOURCE-LEVEL TEST, deliberately.** Reproducing this behaviourally needs a live world, two
 * connected clients and a non-GM user — the defect is a shape in the source, so the source is
 * what is checked. Same reasoning as `explosion-carry.test.mjs` and `pool-spend.test.mjs`.
 */
import fs from 'node:fs';

export const name = 'gm-writes';

const read = (rel) =>
  fs.readFileSync(new URL(`../scripts/${rel}`, import.meta.url), 'utf8');

const SHEETS = ['sheets/SR3EActorSheet.js', 'sheets/SR3EVehicleSheet.js'];
const QUERY  = read('SR3EQuery.js');

export async function run(t) {

  /* ── No sheet may create an Actor on the clicking client ────────────────────────────── */

  for (const rel of SHEETS) {
    const src = read(rel);
    // `Actor.create(` or `Actor.implementation.create(` — the two spellings that reach the
    // permission-gated path. `createEmbeddedDocuments` is NOT this: embedded items on an actor
    // the user already owns need no world-level create permission.
    const hits = [...src.matchAll(/\bActor(?:\.implementation)?\.create\s*\(/g)];
    t.is(`${rel} never calls Actor.create directly`, hits.length, 0);
  }

  /* ── The verbs exist, and are GM-gated ──────────────────────────────────────────────── */

  for (const verb of ['sr3e.actor.create', 'sr3e.vehicle.link']) {
    t.ok(`${verb} is registered`, QUERY.includes(`CONFIG.queries['${verb}']`));
  }

  /* Slice each handler from its registration to the next one, so the assertions below cannot
   * be satisfied by some other handler's body. */
  const handlerBody = (verb) => {
    const i = QUERY.indexOf(`CONFIG.queries['${verb}']`);
    if (i < 0) return '';
    const next = QUERY.indexOf('CONFIG.queries[', i + 1);
    return QUERY.slice(i, next < 0 ? QUERY.length : next);
  };

  const create = handlerBody('sr3e.actor.create');
  const link   = handlerBody('sr3e.vehicle.link');

  /* ⚠ `assertActiveGM()` is what makes relaying meaningful. Without it the handler runs
   * wherever it was invoked and the permission problem is exactly where it started — the
   * registration is on every client; only this call decides who may execute. */
  t.ok('actor.create asserts it is the active GM', /assertActiveGM\(\)/.test(create));
  t.ok('vehicle.link asserts it is the active GM',   /assertActiveGM\(\)/.test(link));

  /* ⚠ `once(rid, …)` deduplicates a retried query. Creation is the one verb where a duplicate
   * is not idempotent — it would leave a second vehicle behind. */
  t.ok('actor.create is wrapped in once()', /SR3EQuery\.once\(\s*rid/.test(create));
  t.ok('vehicle.link is wrapped in once()',   /SR3EQuery\.once\(\s*lrid|SR3EQuery\.once\(\s*rid/.test(link));

  /* ── Ownership: the silent half ──────────────────────────────────────────────────────── */

  /* ⚠ Without this the vehicle is created, shows on the player's sheet, and cannot be rolled.
   * Nothing else in the suite would notice if it were dropped. */
  t.ok('actor.create grants the requester OWNER',
    /_requesterId/.test(create) && /DOCUMENT_OWNERSHIP_LEVELS\.OWNER/.test(create));
  t.ok('vehicle.link grants the requester OWNER too',
    /_requesterId/.test(link) && /DOCUMENT_OWNERSHIP_LEVELS\.OWNER/.test(link));

  /* ── The sheet actually uses them ────────────────────────────────────────────────────── */

  /* ⚠ Both "deploy template" buttons had the identical bug and neither was reported — a
   * template is usually GM-owned, so a player rarely reaches one. They were found the moment
   * this file existed, which is the argument for a source-level invariant over a bug report. */
  for (const rel of SHEETS) {
    t.ok(`${rel}'s template deploy relays through the GM`,
      /asGM\(\s*'sr3e\.actor\.create',\s*\{\s*\n?\s*fromActorId/.test(read(rel)));
  }

  const sheet = read('sheets/SR3EActorSheet.js');
  t.ok('the sheet asks the GM to create',
    /asGM\(\s*'sr3e\.actor\.create'/.test(sheet));
  t.ok('…and to link',
    /asGM\(\s*'sr3e\.vehicle\.link'/.test(sheet));

  /* ⚠ Linking an EXISTING vehicle is the option that was missing entirely, not a nicety: the
   * link lives on the vehicle (`system.driverActorId`), so without it a GM who had already
   * built a vehicle could only assign it from the vehicle's own sheet. That is why the feature
   * read as broken rather than inverted, and why a fix that only relayed `create` through the
   * GM would still not have solved the reported case. */
  t.ok('the dialog offers existing world vehicles',
    /Link an existing vehicle/.test(sheet));

  /* ⚠ Templates must stay out of the list. `preCreateActor` flags anything imported from a
   * compendium so it does not pollute targeting and selection dialogs (CLAUDE.md); a picker
   * that ignored the flag would offer every pack vehicle ever dragged in. */
  /* ⚠ Slice from the METHOD, not the first mention of its name — `_onCreateLinkVehicle`
   * appears in the `actions` registration ~3800 lines earlier, and slicing from there sweeps
   * in most of the file and makes these assertions pass on unrelated code. */
  const flow = sheet.slice(sheet.indexOf('static async _onCreateLinkVehicle'),
                           sheet.indexOf('static async _onToggleVehicleMode'));
  t.ok('the flow was located', flow.length > 200 && flow.length < 12000);

  t.ok('…filtered through isLiveActor, the one template rule (F2)', /isLiveActor/.test(flow));

  /* ── No inline handlers in that dialog ───────────────────────────────────────────────── */

  /* ⚠ The old dialog carried `onchange="document.getElementById('veh-blank')…"`. Inline
   * handlers reaching for `document` do not work in the ApplicationV2 rendering context — see
   * CLAUDE.md — so this is a real failure mode, not style. */
  t.is('the vehicle dialog uses no inline event attributes',
    (flow.match(/\son(?:change|click|input)\s*=\s*"/g) ?? []).length, 0);
  t.ok('…wiring through DialogV2\'s render option instead', /render:\s*\(/.test(flow));
}
