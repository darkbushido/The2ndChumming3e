/**
 * The web gear designer's page · TODO 298. Two wizards in the 🛠 Vehicle Designer's look:
 *  - Weapon — `lib/weapon-designer-view.mjs`, priced by `GearDesign.assemble`;
 *  - Vehicle — `lib/vehicle-designer-view.mjs`, the very markup and wiring of the Foundry window (TODO 287/297).
 * `lib/` is the system's own scripts/data modules, copied as-is by tools/build-designer.mjs. This file only keeps the
 * state, the link and the two buttons on the last step.
 */
import { GearDesign } from './lib/gear-design.mjs';
import { WeaponDesignerView } from './lib/weapon-designer-view.mjs';
import { VehicleDesignerView, blankDesign } from './lib/vehicle-designer-view.mjs';
import { DesignerArt } from './lib/designer-art.mjs';

const $ = sel => document.querySelector(sel);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

DesignerArt.dir = 'vehicles';
const cat = await (await fetch('catalogue.json')).json();
const items = cat.items;
const lookup = ref => items[ref] ?? null;
$('#version').textContent = `Rules: system ${cat.system}.`;

/** Vehicle mods as the Foundry window's shop index: `{ uuid, name, system }`, keyed by compendium uuid. */
const vmods = Object.entries(items).filter(([, i]) => i.kind === 'vmod').map(([ref, i]) => ({ uuid: GearDesign.uuidOf(ref), ref, name: i.name, system: i.system }));
const refOfUuid = uuid => vmods.find(m => m.uuid === uuid)?.ref ?? null;

const FINISH = `<button type="button" class="vd-nav vd-copy">🔗 Copy link</button><button type="button" class="vd-next vd-download">💾 Download JSON</button>`;
let kind = 'weapon';
const weapon = { design: GearDesign.blank(cat.system), ui: {}, step: 1, items, r: null,
  img: ref => items[ref]?.img ?? '', finish: () => FINISH };
const vehicle = { design: blankDesign(), ui: {}, step: 1, mods: vmods, modAll: vmods, isActor: false,
  finishLabel: 'Price & share', finish: ch => (ch ? FINISH : '') };

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
    if (kind === 'vehicle') {
      const a = await GearDesign.assembleVehicle(r.design, lookup);
      Object.assign(vehicle.design, a.designer);
      vehicle.step = a.designer.chassis ? 5 : 1;
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
  document.querySelectorAll('[data-kind]').forEach(b => b.classList.toggle('active', b.dataset.kind === kind));
  $('#weapon-root').hidden = kind !== 'weapon';
  $('#vehicle-root').hidden = kind !== 'vehicle';
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
  const root = kind === 'weapon' ? $('#weapon-root') : $('#vehicle-root');
  root.querySelector('.vd-copy')?.addEventListener('click', async e => {
    try { await navigator.clipboard.writeText(location.href); e.target.textContent = '✓ Copied'; }
    catch { prompt('Copy this link:', location.href); }
  });
  root.querySelector('.vd-download')?.addEventListener('click', () => {
    const name = link.name || (kind === 'weapon' ? items[link.base]?.name : vehicle.design.chassis) || 'design';
    const blob = new Blob([JSON.stringify(link, null, 2)], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `${name.replace(/[^\w-]+/g, '_')}.sr3e-design.json` });
    a.click();
    URL.revokeObjectURL(a.href);
  });
}

document.querySelectorAll('[data-kind]').forEach(b => b.addEventListener('click', () => { kind = b.dataset.kind; loadWarnings.length = 0; render(); }));
render();
