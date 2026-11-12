/**
 * The web gear designer's page · TODO 298. The rules are `lib/` — the system's own scripts/data modules, copied as-is
 * by tools/build-designer.mjs. This file is only the DOM shell; everything it shows comes from `GearDesign.assemble` /
 * `GearDesign.assembleVehicle`, exactly what Foundry's importer runs.
 */
import { GearDesign, IMPROVE_KEYS } from './lib/gear-design.mjs';
import { ModRatings } from './lib/mod-ratings.mjs';
import { ModCatalog } from './lib/mod-catalog.mjs';
import { VehicleDesign, CLASSES } from './lib/vehicle-design.mjs';
import { CHASSIS, CATEGORIES, PLANTS } from './lib/vehicle-design-tables.mjs';
import { DesignOptions, OPTIONS } from './lib/design-options.mjs';

const $ = sel => document.querySelector(sel);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const yen = n => `${Math.round(Number(n) || 0).toLocaleString()}¥`;

const cat = await (await fetch('catalogue.json')).json();
const items = cat.items;
const lookup = ref => items[ref] ?? null;
const refs = kind => Object.keys(items).filter(r => items[r].kind === kind).sort((a, b) => items[a].name.localeCompare(items[b].name));
const FIREARMS = refs('firearm'), MODS = refs('mod'), AMMO = refs('ammo'), VMODS = refs('vmod');
$('#version').textContent = `Rules: system ${cat.system}.`;

const IMPROVE_LABELS = { accel: 'Acceleration +', speed: 'Speed +', handling: 'Handling − (on-road)', handlingOffRoad: 'Handling − (off-road)',
  economySteps: 'Economy (5% steps)', cargo: 'Cargo + CF', load: 'Load + kg', signature: 'Signature +' };

const blankFor = kind => {
  const d = GearDesign.blank(cat.system);
  if (kind === 'vehicle') { d.kind = 'vehicle'; d.vehicle = GearDesign.normaliseVehicle({}); }
  return d;
};
let design = blankFor('weapon');
let loadWarnings = [];

/* ── load from the link ─────────────────────────────────────────────────────────── */
const fromHash = /[#&]d=([A-Za-z0-9_-]+)/.exec(location.hash)?.[1];
if (fromHash) {
  try {
    const r = GearDesign.normalise(await GearDesign.decode(fromHash));
    design = { ...r.design, system: cat.system };
    loadWarnings = r.warnings;
    if (r.design.system && r.design.system !== cat.system) loadWarnings.push(`This link was made with system ${r.design.system}; shown with ${cat.system}'s rules.`);
  } catch { loadWarnings = ['The link could not be read — starting a new design.']; }
}

/* ── pickers ────────────────────────────────────────────────────────────────────── */
function picker(input, list, pool, label, onPick) {
  const show = () => {
    const q = input.value.trim().toLowerCase();
    const hits = pool().filter(r => !q || label(r).name.toLowerCase().includes(q)).slice(0, 80);
    list.innerHTML = hits.map(r => { const l = label(r); return `<li tabindex="0" data-ref="${esc(r)}"><span>${esc(l.name)}</span><span class="muted">${esc(l.info)}</span></li>`; }).join('');
    list.hidden = !hits.length;
  };
  input.addEventListener('focus', show);
  input.addEventListener('input', show);
  input.addEventListener('keydown', e => { if (e.key === 'Escape') list.hidden = true; });
  const choose = li => { if (!li) return; onPick(li.dataset.ref); input.value = ''; list.hidden = true; };
  list.addEventListener('click', e => choose(e.target.closest('li')));
  list.addEventListener('keydown', e => { if (e.key === 'Enter') choose(e.target.closest('li')); });
  document.addEventListener('click', e => { if (e.target !== input && !list.contains(e.target)) list.hidden = true; });
}
const itemLabel = r => ({ name: items[r].name, info: `${items[r].system.category ?? ''} ${yen(items[r].system.cost)} · ${items[r].system.bookPage ?? ''}` });

picker($('#base-search'), $('#base-list'), () => FIREARMS, itemLabel, ref => { design.base = ref; render(); });
picker($('#mod-search'), $('#mod-list'), () => MODS, itemLabel, ref => {
  const levels = ModRatings.levelsOf(items[ref]);
  const first = levels ? Number(Object.keys(levels)[0]) : null;
  design.mods.push(first == null ? { ref } : { ref, rating: first });
  render();
});
picker($('#ammo-search'), $('#ammo-list'), () => AMMO, itemLabel, ref => { design.ammo.push({ ref, qty: 1 }); render(); });

// Vehicles
picker($('#chassis-search'), $('#chassis-list'), () => CHASSIS.map(c => c.id),
  id => { const c = VehicleDesign.chassis(id); return { name: c.name, info: `${CATEGORIES[c.category] ?? c.category}${c.drone ? ' (drone)' : ''} · ${c.dp} DP · ${c.page}` }; },
  id => { design.vehicle.chassis = id; design.vehicle.plant = ''; render(); });
picker($('#vmod-search'), $('#vmod-list'), () => VMODS, r => ({ name: items[r].name, info: `${items[r].system.designCost ?? '—'} DP · ${items[r].system.bookPage ?? ''}` }), ref => {
  const it = items[ref];
  if (!ModCatalog.stacks(it.name) && design.mods.some(m => ModCatalog.sameMod(items[m.ref]?.name, it.name))) return;
  design.mods.push(ModCatalog.rated(it) ? { ref, rating: Number(it.system.rating) || 1 } : { ref });
  render();
});

/* ── the kind tabs ──────────────────────────────────────────────────────────────── */
document.querySelectorAll('[data-kind]').forEach(b => b.addEventListener('click', () => {
  if (design.kind === b.dataset.kind) return;
  design = blankFor(b.dataset.kind);
  loadWarnings = [];
  render();
}));

$('#name').addEventListener('input', e => { design.name = e.target.value; render(); });

/* ── render ─────────────────────────────────────────────────────────────────────── */
function renderWeapon() {
  const base = lookup(design.base);
  $('#base-chosen').innerHTML = base
    ? `<strong>${esc(base.name)}</strong> — ${esc(base.system.category)} · ${esc(base.system.damage)} · ${esc(base.system.mode)} · ${yen(base.system.cost)} · ${esc(base.system.bookPage)}`
      + (base.system.installed?.length ? `<br>Built in: ${base.system.installed.map(m => esc(m.name)).join(', ')}` : '')
    : 'No firearm chosen yet.';
  $('#mods').innerHTML = design.mods.map((m, i) => {
    const it = lookup(m.ref);
    const levels = it && ModRatings.levelsOf(it);
    const sel = levels ? `<select data-mod-level="${i}">${Object.keys(levels).map(l => `<option value="${l}" ${Number(l) === m.rating ? 'selected' : ''}>Level ${l}</option>`).join('')}</select>` : '';
    return `<div class="row"><span class="name">${esc(it?.name ?? m.ref)} <span class="muted">${esc(it?.system?.mount ?? '')} ${esc(it?.system?.bookPage ?? '')}</span></span>${sel}`
      + `<button data-mod-remove="${i}" aria-label="Remove">✕</button></div>`;
  }).join('') || '<p class="muted">None.</p>';
  $('#ammo').innerHTML = design.ammo.map((a, i) => {
    const it = lookup(a.ref);
    return `<div class="row"><span class="name">${esc(it?.name ?? a.ref)} <span class="muted">${yen(it?.system?.cost)} each · ${esc(it?.system?.bookPage ?? '')}</span></span>`
      + `<input type="number" min="1" max="${GearDesign.LIMITS.qty}" value="${a.qty}" data-ammo-qty="${i}" style="width:5em" aria-label="Quantity">`
      + `<button data-ammo-remove="${i}" aria-label="Remove">✕</button></div>`;
  }).join('') || '<p class="muted">None.</p>';
}

function renderVehicle(r) {
  const v = design.vehicle;
  const ch = VehicleDesign.chassis(v.chassis);
  $('#chassis-chosen').innerHTML = ch
    ? `<strong>${esc(ch.name)}</strong> — ${esc(CATEGORIES[ch.category] ?? ch.category)} · Body ${esc(ch.body)} · Handling ${esc(ch.handling)} · Armor ${esc(ch.armor)} · ${ch.dp} DP · ${esc(ch.page)}`
    : 'No chassis chosen yet.';
  const plants = ch ? VehicleDesign.plantsFor(ch.id) : [];
  $('#plant').innerHTML = `<option value="">— none (towed) —</option>` + plants.map(p => `<option value="${esc(p.id)}" ${p.id === v.plant ? 'selected' : ''}>${esc(PLANTS[p.plant]?.name ?? p.plant)} — ${esc(p.label)} (${esc(p.page)})</option>`).join('');
  $('#plant').disabled = !ch;
  $('#improve').innerHTML = IMPROVE_KEYS.map(k => `<label>${IMPROVE_LABELS[k]}<input type="number" min="0" step="any" data-improve="${k}" value="${v.improve[k] ?? ''}" style="width:100%"></label>`).join('');
  $('#smart').checked = v.smartMaterials;
  $('#vclass').innerHTML = Object.entries(CLASSES).map(([k, c]) => `<option value="${k}" ${k === v.vehicleClass ? 'selected' : ''}>${esc(c.label)}</option>`).join('');
  $('#markup').value = v.markUpExtra;

  const fitCtx = ch ? { category: ch.category, chassisId: ch.id, body: VehicleDesign.bodyOf(ch), hasHull: /H/.test(String(ch.body)), plantCode: VehicleDesign.plantRow(v.plant)?.plant ?? '', drone: !!ch.drone } : {};
  $('#option-add').innerHTML = '<option value="">Add a design option…</option>'
    + OPTIONS.filter(o => !ch || !DesignOptions.misfit(o.id, fitCtx)).map(o => `<option value="${esc(o.id)}">${esc(o.group)}: ${esc(o.name)} (${esc(o.page)})</option>`).join('');
  const priced = r?.result?.options ?? [];
  $('#options').innerHTML = v.options.map((o, i) => {
    const def = DesignOptions.get(o.id);
    const inputs = def.inputs.map(([k, label]) => `<label class="muted">${esc(label)} <input type="${typeof o[k] === 'number' ? 'number' : 'text'}" min="0" step="any" data-opt="${i}" data-opt-key="${esc(k)}" value="${esc(o[k])}" style="width:6em"></label>`).join(' ');
    const p = priced[i];
    return `<div class="row"><span class="name">${esc(o.name)} <span class="muted">${esc(def.page)}${p ? ` · ${p.dp} DP` : ''}</span></span>${inputs}<button data-opt-remove="${i}" aria-label="Remove">✕</button></div>`;
  }).join('') || '<p class="muted">None.</p>';

  const rows = r?.designer?.mods ?? [];
  $('#vmods').innerHTML = design.mods.map((m, i) => {
    const it = lookup(m.ref);
    const row = rows.find(x => x.uuid === GearDesign.uuidOf(m.ref));
    const max = it ? ModCatalog.maxLevel(it) : null;
    const levels = it && ModRatings.levelsOf(it);
    const opts = levels ? Object.keys(levels).map(Number) : (max ? Array.from({ length: max }, (_x, n) => n + 1) : null);
    const sel = it && ModCatalog.rated(it) && opts ? `<select data-mod-level="${i}">${opts.map(l => `<option value="${l}" ${l === m.rating ? 'selected' : ''}>Level ${l}</option>`).join('')}</select>` : '';
    return `<div class="row"><span class="name">${esc(it?.name ?? m.ref)} <span class="muted">${row ? `${row.dp} DP` : ''} ${esc(it?.system?.bookPage ?? '')}</span></span>${sel}`
      + `<button data-mod-remove="${i}" aria-label="Remove">✕</button></div>`;
  }).join('') || '<p class="muted">None.</p>';
}

let seq = 0;
async function render() {
  const mine = ++seq;
  const isVehicle = design.kind === 'vehicle';
  document.querySelectorAll('[data-kind]').forEach(b => b.classList.toggle('primary', b.dataset.kind === design.kind));
  document.querySelectorAll('.weapon-only').forEach(el => { el.hidden = isVehicle; });
  document.querySelectorAll('.vehicle-only').forEach(el => { el.hidden = !isVehicle; });
  $('#name').value = design.name;

  const { design: clean } = GearDesign.normalise(design);
  const r = isVehicle ? await GearDesign.assembleVehicle(clean, lookup) : await GearDesign.assemble(clean, lookup);
  if (mine !== seq) return;
  if (isVehicle) renderVehicle(r); else renderWeapon();

  const t = r.totals;
  let stats;
  if (isVehicle) {
    const s = r.result?.stats ?? {};
    stats = r.result?.chassis ? [['Design Points', t.dp], ['Price', yen(t.cost)], ['Availability', esc(r.result.availability?.text ?? '—')], ['Street Index', r.result.streetIndex ?? '—'],
      ['Handling', `${s.handling ?? '—'}/${s.handlingOffRoad ?? '—'}`], ['Speed / Accel', `${s.speed ?? '—'} / ${s.accel ?? '—'}`], ['Signature', s.sig ?? '—'],
      ['Cargo / Load', `${s.cargo ?? '—'} CF / ${s.load ?? '—'} kg`]] : [];
  } else {
    stats = [['Cost', yen(t.cost)], ['RC from mods', t.rc], ['Smartgun', t.smartgun ? 'yes' : 'no'], ['Laser sight', t.laserSight ? 'yes' : 'no'],
      ['Mounts used', Object.entries(t.mounts).map(([k, v]) => `${k}: ${esc(v)}`).join('<br>') || '—']];
  }
  $('#totals').innerHTML = stats.map(([k, v]) => `<div class="stat">${k}<b>${v}</b></div>`).join('');
  const started = isVehicle ? !!design.vehicle.chassis : !!design.base;
  $('#warnings').innerHTML = [...loadWarnings, ...(started ? r.warnings : [])].map(w => `<div class="warn">⚠ ${esc(w)}</div>`).join('');

  clean.claimed = isVehicle ? { cost: t.cost, dp: t.dp } : { cost: t.cost, rc: t.rc };
  design.claimed = clean.claimed;
  history.replaceState(null, '', `#d=${await GearDesign.encode(clean)}`);
}

/* ── edits ──────────────────────────────────────────────────────────────────────── */
document.addEventListener('change', e => {
  const el = e.target;
  const v = design.vehicle;
  if (el.dataset.modLevel != null) design.mods[el.dataset.modLevel].rating = Number(el.value);
  else if (el.dataset.ammoQty != null) design.ammo[el.dataset.ammoQty].qty = Math.max(1, Number(el.value) || 1);
  else if (el.dataset.improve) { if (Number(el.value) > 0) v.improve[el.dataset.improve] = Number(el.value); else delete v.improve[el.dataset.improve]; }
  else if (el.dataset.opt != null) { const o = v.options[el.dataset.opt]; o[el.dataset.optKey] = el.type === 'number' ? Number(el.value) || 0 : el.value; }
  else if (el.id === 'plant') v.plant = el.value;
  else if (el.id === 'smart') v.smartMaterials = el.checked;
  else if (el.id === 'vclass') v.vehicleClass = el.value;
  else if (el.id === 'markup') v.markUpExtra = Math.min(3, Math.max(0, Number(el.value) || 0));
  else if (el.id === 'option-add') { const row = DesignOptions.newRow(el.value); if (row) v.options.push(row); el.value = ''; }
  else return;
  render();
});
document.addEventListener('click', e => {
  const el = e.target;
  if (el.dataset.modRemove != null) design.mods.splice(Number(el.dataset.modRemove), 1);
  else if (el.dataset.ammoRemove != null) design.ammo.splice(Number(el.dataset.ammoRemove), 1);
  else if (el.dataset.optRemove != null) design.vehicle.options.splice(Number(el.dataset.optRemove), 1);
  else return;
  render();
});

$('#copy').addEventListener('click', async () => {
  await render();
  try { await navigator.clipboard.writeText(location.href); $('#copy').textContent = 'Copied ✓'; }
  catch { prompt('Copy this link:', location.href); }
  setTimeout(() => { $('#copy').textContent = 'Copy link'; }, 1500);
});
$('#download').addEventListener('click', async () => {
  await render();
  const { design: clean } = GearDesign.normalise(design);
  const fallback = design.kind === 'vehicle' ? VehicleDesign.chassis(design.vehicle.chassis)?.name : lookup(clean.base)?.name;
  const blob = new Blob([JSON.stringify(clean, null, 2)], { type: 'application/json' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `${(clean.name || fallback || 'design').replace(/[^\w-]+/g, '_')}.sr3e-design.json` });
  a.click();
  URL.revokeObjectURL(a.href);
});
$('#reset').addEventListener('click', () => { design = blankFor(design.kind); loadWarnings = []; render(); });

render();
