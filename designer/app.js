/**
 * The web gear designer's page · TODO 298. Two wizards in the 🛠 Vehicle Designer's look:
 *  - Weapon — `lib/weapon-designer-view.mjs`, priced by `GearDesign.assemble`;
 *  - Vehicle — `lib/vehicle-designer-view.mjs`, the very markup and wiring of the Foundry window (TODO 287/297);
 *  - Armour — `lib/armor-designer-view.mjs`, priced by `GearDesign.assembleArmor` (TODO 305);
 *    or a book vehicle with aftermarket mods — `lib/book-vehicle-view.mjs`, priced by `GearDesign.assembleBookVehicle`.
 * `lib/` is the system's own scripts/data modules, copied as-is by tools/build-designer.mjs. This file only keeps the
 * state, the link and the two buttons on the last step.
 */
import { GearDesign } from './lib/gear-design.mjs';
import { WeaponDesignerView } from './lib/weapon-designer-view.mjs';
import { VehicleDesignerView, blankDesign } from './lib/vehicle-designer-view.mjs';
import { BookVehicleView } from './lib/book-vehicle-view.mjs';
import { ArmorDesignerView } from './lib/armor-designer-view.mjs';
import { DesignerArt } from './lib/designer-art.mjs';
import { WeaponArt } from './lib/weapon-art.mjs';

const $ = sel => document.querySelector(sel);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

DesignerArt.dir = 'vehicles';
WeaponArt.dir = 'weapons';
const cat = await (await fetch('catalogue.json')).json();
const items = cat.items;
const lookup = ref => items[ref] ?? null;
$('#version').textContent = `Rules: system ${cat.system}.`;

/** Vehicle mods as the Foundry window's shop index: `{ uuid, name, system }`, keyed by compendium uuid. */
const vmods = Object.entries(items).filter(([, i]) => i.kind === 'vmod').map(([ref, i]) => ({ uuid: GearDesign.uuidOf(ref), ref, name: i.name, system: i.system }));
const refOfUuid = uuid => vmods.find(m => m.uuid === uuid)?.ref ?? null;

const FINISH = `<button type="button" class="vd-nav vd-copy">🔗 Copy link</button><button type="button" class="vd-next vd-download">💾 Download JSON</button>`;
let kind = 'weapon';
let mode = 'design';   // the vehicle tab: 'design' (R3R) or 'book'
const weapon = { design: GearDesign.blank(cat.system), ui: {}, step: 1, items, r: null,
  img: ref => items[ref]?.img ?? '', finish: () => FINISH };
const vehicle = { design: blankDesign(), ui: {}, step: 1, mods: vmods, modAll: vmods, isActor: false,
  finishLabel: 'Price & share', finish: ch => (ch ? FINISH : '') };

const book = { design: { ...GearDesign.blank(cat.system), kind: 'vehicle' }, ui: {}, step: 1, items, r: null,
  img: ref => items[ref]?.img ?? '', finish: () => FINISH };

const armor = { design: { ...GearDesign.blank(cat.system), kind: 'armor' }, ui: {}, step: 1, items, r: null,
  img: ref => items[ref]?.img ?? '', finish: () => FINISH };

/** The vehicle wizard's design as a link's design: its mods become references. */
function vehicleLink() {
  const v = vehicle.design;
  const { design } = GearDesign.normalise({ format: GearDesign.FORMAT, schema: GearDesign.SCHEMA, kind: 'vehicle', name: v.name,
    vehicle: v, mods: v.mods.map(m => ({ ref: refOfUuid(m.uuid), rating: m.level ?? undefined })).filter(m => m.ref) });
  return design;
}

/* ── load from the link ─────────────────────────────────────────────────────────── */
const loadWarnings = [];
const fromHash = /[#&]d=([A-Za-z0-9_-]+)/.exec(location.hash)?.[1];
if (fromHash) {
  try {
    const r = GearDesign.normalise(await GearDesign.decode(fromHash));
    loadWarnings.push(...r.warnings);
    if (r.design.system && r.design.system !== cat.system) loadWarnings.push(`This link was made with system ${r.design.system}; shown with ${cat.system}'s rules.`);
    kind = r.design.kind;
    if (kind === 'vehicle' && r.design.base) {
      mode = 'book';
      book.design = { ...r.design, system: cat.system };
      book.step = 3;
    } else if (kind === 'vehicle') {
      const a = await GearDesign.assembleVehicle(r.design, lookup);
      Object.assign(vehicle.design, a.designer);
      vehicle.step = a.designer.chassis ? 5 : 1;
    } else if (kind === 'armor') {
      armor.design = { ...r.design, system: cat.system };
      armor.step = r.design.base ? 3 : 1;
    } else {
      weapon.design = { ...r.design, system: cat.system };
      weapon.step = r.design.base ? 4 : 1;
    }
  } catch { loadWarnings.push('The link could not be read — starting a new design.'); }
}

/* ── render ─────────────────────────────────────────────────────────────────────── */
let seq = 0;
async function render() {
  const mine = ++seq;
  document.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => { mode = b.dataset.mode; loadWarnings.length = 0; render(); }));
document.querySelectorAll('[data-kind]').forEach(b => b.classList.toggle('active', b.dataset.kind === kind));
  $('#weapon-root').hidden = kind !== 'weapon';
  $('#armor-root').hidden = kind !== 'armor';
  $('#vehicle-modes').hidden = kind !== 'vehicle';
  document.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  $('#vehicle-root').hidden = kind !== 'vehicle' || mode !== 'design';
  $('#book-root').hidden = kind !== 'vehicle' || mode !== 'book';
  $('#loadwarn').innerHTML = loadWarnings.map(w => `<div class="loadwarn">⚠ ${esc(w)}</div>`).join('');

  let link;
  if (kind === 'weapon') {
    const { design } = GearDesign.normalise(weapon.design);
    const r = await GearDesign.assemble(design, lookup);
    if (mine !== seq) return;
    weapon.r = r;
    const el = $('#weapon-root .vd-wizard');
    el.innerHTML = WeaponDesignerView.html(weapon);
    WeaponDesignerView.wire(el, weapon, { render });
    design.claimed = { cost: r.totals.cost, rc: r.totals.rc };
    link = design;
  } else if (kind === 'armor') {
    const { design } = GearDesign.normalise(armor.design);
    const r = await GearDesign.assembleArmor(design, lookup);
    if (mine !== seq) return;
    armor.r = r;
    const el = $('#armor-root .vd-wizard');
    el.innerHTML = ArmorDesignerView.html(armor);
    ArmorDesignerView.wire(el, armor, { render });
    design.claimed = { cost: r.totals.cost, ...(r.totals.conceal != null ? { conceal: r.totals.conceal } : {}) };
    link = design;
  } else if (mode === 'book') {
    const { design } = GearDesign.normalise(book.design);
    const r = await GearDesign.assembleBookVehicle(design, lookup);
    if (mine !== seq) return;
    book.r = r;
    const el = $('#book-root .vd-wizard');
    el.innerHTML = BookVehicleView.html(book);
    BookVehicleView.wire(el, book, { render });
    design.claimed = { cost: r.totals.cost };
    link = design;
  } else {
    const el = $('#vehicle-root .vd-wizard');
    el.innerHTML = VehicleDesignerView.html(vehicle);
    VehicleDesignerView.wire(el, vehicle, { render });
    el.querySelector('.vd-name')?.addEventListener('change', e => { vehicle.design.name = e.target.value; render(); });
    link = vehicleLink();
    const a = await GearDesign.assembleVehicle(link, lookup);
    if (mine !== seq) return;
    link.claimed = { cost: a.totals.cost, dp: a.totals.dp };
  }
  const payload = await GearDesign.encode(link);
  if (mine !== seq) return;
  history.replaceState(null, '', `#d=${payload}`);
  wireFinish(link);
}

function wireFinish(link) {
  const root = kind === 'weapon' ? $('#weapon-root') : kind === 'armor' ? $('#armor-root') : mode === 'book' ? $('#book-root') : $('#vehicle-root');
  root.querySelector('.vd-copy')?.addEventListener('click', async e => {
    try { await navigator.clipboard.writeText(location.href); e.target.textContent = '✓ Copied'; }
    catch { prompt('Copy this link:', location.href); }
  });
  root.querySelector('.vd-download')?.addEventListener('click', () => {
    const name = link.name || (link.base ? items[link.base]?.name : vehicle.design.chassis) || 'design';
    const blob = new Blob([JSON.stringify(link, null, 2)], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `${name.replace(/[^\w-]+/g, '_')}.sr3e-design.json` });
    a.click();
    URL.revokeObjectURL(a.href);
  });
}

document.querySelectorAll('[data-kind]').forEach(b => b.addEventListener('click', () => { kind = b.dataset.kind; loadWarnings.length = 0; render(); }));
render();
