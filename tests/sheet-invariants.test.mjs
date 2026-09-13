/**
 * Source-level checks for sheet, dialog and CSS changes on `fix/racial-mods` that no behavioural
 * suite can reach — the sheets cannot be imported without Foundry (same reasoning as
 * `gm-writes` and `gm-tools`). Each pins something built or fixed on this branch, so a later
 * edit that quietly undoes it goes red. The live checks for the same features are in TODO 93.
 */
import { readFileSync } from 'node:fs';

export const name = 'sheet-invariants';

const read = rel => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

export async function run(t) {
  const actorSheet = read('scripts/sheets/SR3EActorSheet.js');
  const itemSheet  = read('scripts/sheets/SR3EItemSheet.js');
  const vehSheet   = read('scripts/sheets/SR3EVehicleSheet.js');
  const item       = read('scripts/documents/SR3EItem.js');
  const query      = read('scripts/SR3EQuery.js');
  const models     = read('scripts/data/ItemDataModels.js');
  const css        = read('styles/sr3e.css');
  const config     = read('scripts/config.js');

  /* ── Species (TODO 93): the GM gets a working dropdown, a player a disabled one ────────── */
  const species = actorSheet.slice(actorSheet.indexOf('_speciesField(metatype) {'),
                                   actorSheet.indexOf('_speciesField(metatype) {') + 1200);
  t.ok('Species: only the GM\'s dropdown carries the field name',
    /\$\{gm \? 'name="system\.metatype"' : 'disabled'\}/.test(species));
  t.ok('…and an unrecognised stored value is kept as its own option',
    /\(unrecognised\)/.test(species));

  /* ── Vision pre-selection (TODO 36): follows the condition until the GM touches it ────── */
  t.ok('ranged window pre-selects via bestVisionKey',       /bestVisionKey\(vision, ''\)/.test(item));
  t.ok('…and only a human change stops the following',      /visTouched = true/.test(item) && /!visTouched/.test(item));
  t.ok('melee window has one vision dropdown PER FIGHTER',  /gmm-vis-type-\$\{side\}/.test(item));

  /* ── Implant armour (TODO 75): nullable override fields, shown on the item sheet ───────── */
  t.ok('bonusImpact / bonusBallistic are NULLABLE (null = from mods)',
    (models.match(/bonus(Impact|Ballistic):\s+new NumberField\(\{ integer: true, nullable: true, initial: null \}\)/g) ?? []).length === 4);
  t.ok('the item sheet offers both boxes, blank meaning "from mods"',
    /Implant Armour/.test(itemSheet) && /name="system\.\$\{field\}" value="\$\{s\[field\] \?\? ''\}"/.test(itemSheet));

  /* ── Vehicle unlink (TODO 107) ──────────────────────────────────────────────────────── */
  t.ok('the Vehicles tab has a labelled ✕ remove button',
    /data-action="unlinkVehicle"/.test(actorSheet) && /unlinkVehicle:\s+SR3EActorSheet\._onUnlinkVehicle/.test(actorSheet));
  t.ok('Auto says in its tooltip that it removes the vehicle', /Autopilot — the vehicle runs on its own Pilot/.test(actorSheet));
  const link = query.slice(query.indexOf("CONFIG.queries['sr3e.vehicle.link']"), query.indexOf("CONFIG.queries['sr3e.damage.apply']"));
  t.ok('vehicle.link: an unlink clears the control mode',      /if \(!driverActorId\) changes\['system\.controlMode'\] = ''/.test(link));
  t.ok('vehicle.link: an unlink grants NO ownership',          /if \(driverActorId && _requesterId/.test(link));

  /* ── Corner dropdowns are styled like the text boxes (TODO 108) ─────────────────────── */
  const sel = css.slice(css.indexOf('[data-corner-role] select {'), css.indexOf('[data-corner-role] select {') + 400);
  t.ok('every two-corner card styles its <select>s', /background: var\(--sr-surface\)/.test(sel) && /color: var\(--sr-text\)/.test(sel));
  t.ok('…including their options', /\[data-corner-role\] select option/.test(css));
  t.ok('the Reach election\'s first option is explicitly selected', /<option value="self" selected>/.test(read('scripts/documents/SR3EActor.js')));

  /* ── Crash dialog layout (TODO 93 note) ─────────────────────────────────────────────── */
  t.ok('crash dialog: short speed label, bottom-aligned row',
    /Speed \(km\/h\)/.test(vehSheet) && /grid-template-columns:1fr 1fr 1fr;gap:6px 10px;padding:4px 0;align-items:end/.test(vehSheet));

  /* ── The dwarf toxin box is offered only for Body (TODO 98) ─────────────────────────── */
  t.ok('the toxin checkbox is enabled only while Body is selected',
    /\$\{selectedKey === 'body' \? '' : 'disabled'\}/.test(actorSheet) && /tBox\.disabled = !isBody/.test(actorSheet));

  /* ── Essence near the edge (TODO 103) ───────────────────────────────────────────── */
  t.ok('the Essence block takes its state from SR3EActor.essenceState',
    /essenceState\(attr\.essence\?\.value/.test(actorSheet) && /essence-\$\{essState\}/.test(actorSheet));
  t.ok('…the tooltip quotes the books with curly quotes, so the title attribute is not cut short',
    /“the spirit slips away and the body dies”/.test(actorSheet) && !/: "the spirit slips/.test(actorSheet));
  t.ok('…and the CSS has both states',
    /\.attr-block\.essence-low \{/.test(css) && /\.attr-block\.essence-dead \{/.test(css));

  /* ── Several armour pieces worn at once (TODO 112) ─────────────────────────────────── */
  const equip = actorSheet.slice(actorSheet.indexOf('static async _onEquipArmor('), actorSheet.indexOf('static async _onApplyDamage('));
  t.ok('Wear/Take off toggles the piece\'s own worn flag, not a single slot',
    /setFlag\('The2ndChumming3e', 'worn', !isWorn\)/.test(equip) && !/'system\.equippedArmor': newEquipped/.test(equip));
  t.ok('the Armor tab lists every worn piece from armorRatings', /wornArmorItems\(actor\)/.test(actorSheet) && /Currently Worn/.test(actorSheet));
  t.ok('the Combat Pool box\'s base excludes only the manual modifier (armour dice not absorbed)',
    /\(d\.combatPool \?\? 0\) - \(sys\.combatPoolMod \?\? 0\)/.test(actorSheet));
  t.ok('attribute and skill roll dialogs pre-apply the layered-armour TN as a delta',
    (actorSheet.match(/data-qtn=/g) ?? []).length >= 3 && /tn\.dataset\.qtn = nextQ/.test(actorSheet));
  t.ok('ranged attacks itemise the layered-armour TN beside the wound modifier',
    /Layered armour \+\$\{armorQTN\}/.test(item) && /woundPenalty \+ armorQTN/.test(item));
  t.ok('Quickness is no longer lowered by armour (p.285 takes Combat Pool dice)',
    !/attr\.quickness\.value = Math\.max\(1, quickVal - armorEncPenalty\)/.test(read('scripts/documents/SR3EActor.js')));

  /* ── Splitting stacks out of storage (TODO 113) ───────────────────────────────────── */
  const store = actorSheet.slice(actorSheet.indexOf('static async _onToggleStored('), actorSheet.indexOf('static async _onEquipMelee('));
  t.ok('storage asks how many of a stack', /_promptStackCount\(item, have, storing\)/.test(store));
  t.ok('…and moves it by planStackMove, merging into an identical stack by stackKey',
    /SA\.planStackMove\(/.test(store) && /SA\.stackKey\(i\) === key/.test(store));
  t.ok('a split-off copy is never born worn', /stored: storing, worn: false/.test(store));

  /* ── Citation (TODO 93 note): dermal armor's "does not aid in healing" is SR3 p.283 ─── */
  t.ok('racialDermalArmor cites p.283, not p.281', /Natural dermal armor · \*SR3 p\.56, p\.283\*/.test(config));

  /* ── Drops never fail silently (TODO 97: "cannot drag equipment from a compendium") ─── */
  const drops = actorSheet.slice(actorSheet.indexOf('async _onDrop(event)'), actorSheet.indexOf('static dropFailureMessage('));
  t.ok('a drop that throws is caught and TOLD to the person, not left in the console',
    /try \{\s*return await super\._onDrop\(event\);[\s\S]{0,200}ui\.notifications\.warn\(SR3EActorSheet\.dropFailureMessage\(err\)\)/.test(drops));
  t.ok('a drop that resolves to nothing (a damaged, null-id pack entry) is told, not read .documentName off',
    /async _onDropDocument\(event, document\) \{\s*if \(!document\)/.test(drops));
  t.ok('a vehicle or drone dropped on a character is deployed or linked through the GM',
    /dropped\?\.type !== 'vehicle'/.test(drops) && /asGM\('sr3e\.actor\.create', \{ driverActorId: this\.actor\.id, source: `\$\{dropped\.pack\}\|\$\{packId\}`/.test(drops)
      && /getDragEventData\(event\)\?\.uuid/.test(drops)
      && /asGM\('sr3e\.vehicle\.link', \{ vehicleId: dropped\.id, driverActorId: this\.actor\.id \}\)/.test(drops));
  t.ok('the sheet still hands ordinary drops to core (items were never the problem)', /super\._onDropDocument\(event, document\)/.test(drops));

  /* ── Damage Compensators are concealed like the Pain Editor (TODO 116, M&M p.71) ───── */
  const conceal = actorSheet.slice(actorSheet.indexOf('_woundsConcealed() {'), actorSheet.indexOf('_tabs() {'));
  t.ok('installed Damage Compensators conceal the tracks when the setting is on', /derived\?\.damageCompensators \?\? 0\) > 0\) return true/.test(conceal));
  t.ok('…still never for the GM, and only with the setting on', /if \(game\.user\.isGM\) return false/.test(conceal) && /if \(!on\) return false/.test(conceal)
    && conceal.indexOf('if (!on) return false') < conceal.indexOf('damageCompensators'));
}
