/**
 * The web gear designer's page · TODO 298. The rules are `lib/` — the system's own scripts/data modules, copied as-is
 * by tools/build-designer.mjs. This file is only the DOM shell; everything it shows comes from `GearDesign.assemble`,
 * exactly what Foundry's importer runs.
 */
import { GearDesign } from './lib/gear-design.mjs';
import { ModRatings } from './lib/mod-ratings.mjs';

const $ = sel => document.querySelector(sel);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const yen = n => `${Math.round(n).toLocaleString()}¥`;

const cat = await (await fetch('catalogue.json')).json();
const items = cat.items;
const lookup = ref => items[ref] ?? null;
const refs = kind => Object.keys(items).filter(r => items[r].kind === kind).sort((a, b) => items[a].name.localeCompare(items[b].name));
const FIREARMS = refs('firearm'), MODS = refs('mod'), AMMO = refs('ammo');
$('#version').textContent = `Rules: system ${cat.system}.`;

let design = GearDesign.blank(cat.system);
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
function picker(input, list, pool, onPick) {
  const show = () => {
    const q = input.value.trim().toLowerCase();
    const hits = pool.filter(r => !q || items[r].name.toLowerCase().includes(q)).slice(0, 60);
    list.innerHTML = hits.map(r => `<li tabindex="0" data-ref="${esc(r)}"><span>${esc(items[r].name)}</span>`
      + `<span class="muted">${esc(items[r].system.category ?? '')} ${yen(Number(items[r].system.cost) || 0)} · ${esc(items[r].system.bookPage ?? '')}</span></li>`).join('');
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

picker($('#base-search'), $('#base-list'), FIREARMS, ref => { design.base = ref; render(); });
picker($('#mod-search'), $('#mod-list'), MODS, ref => {
  const levels = ModRatings.levelsOf(items[ref]);
  const first = levels ? Number(Object.keys(levels)[0]) : null;
  design.mods.push(first == null ? { ref } : { ref, rating: first });
  render();
});
picker($('#ammo-search'), $('#ammo-list'), AMMO, ref => { design.ammo.push({ ref, qty: 1 }); render(); });

$('#name').addEventListener('input', e => { design.name = e.target.value; render(); });

/* ── render ─────────────────────────────────────────────────────────────────────── */
let lastPayload = '';
async function render() {
  const base = lookup(design.base);
  $('#base-chosen').innerHTML = base
    ? `<strong>${esc(base.name)}</strong> — ${esc(base.system.category)} · ${esc(base.system.damage)} · ${esc(base.system.mode)} · ${yen(Number(base.system.cost) || 0)} · ${esc(base.system.bookPage)}`
      + (base.system.installed?.length ? `<br>Built in: ${base.system.installed.map(m => esc(m.name)).join(', ')}` : '')
    : 'No firearm chosen yet.';
  $('#name').value = design.name;

  $('#mods').innerHTML = design.mods.map((m, i) => {
    const it = lookup(m.ref);
    const levels = it && ModRatings.levelsOf(it);
    const sel = levels ? `<select data-mod-level="${i}">${Object.keys(levels).map(l => `<option value="${l}" ${Number(l) === m.rating ? 'selected' : ''}>Level ${l}</option>`).join('')}</select>` : '';
    return `<div class="row"><span class="name">${esc(it?.name ?? m.ref)} <span class="muted">${esc(it?.system?.mount ?? '')} ${esc(it?.system?.bookPage ?? '')}</span></span>${sel}`
      + `<button data-mod-remove="${i}" aria-label="Remove">✕</button></div>`;
  }).join('') || '<p class="muted">None.</p>';

  $('#ammo').innerHTML = design.ammo.map((a, i) => {
    const it = lookup(a.ref);
    return `<div class="row"><span class="name">${esc(it?.name ?? a.ref)} <span class="muted">${yen(Number(it?.system?.cost) || 0)} each · ${esc(it?.system?.bookPage ?? '')}</span></span>`
      + `<input type="number" min="1" max="${GearDesign.LIMITS.qty}" value="${a.qty}" data-ammo-qty="${i}" style="width:5em" aria-label="Quantity">`
      + `<button data-ammo-remove="${i}" aria-label="Remove">✕</button></div>`;
  }).join('') || '<p class="muted">None.</p>';

  const { design: clean } = GearDesign.normalise(design);
  const r = await GearDesign.assemble(clean, lookup);
  const t = r.totals;
  $('#totals').innerHTML = [
    ['Cost', yen(t.cost)], ['RC from mods', t.rc], ['Smartgun', t.smartgun ? 'yes' : 'no'], ['Laser sight', t.laserSight ? 'yes' : 'no'],
    ['Mounts used', Object.entries(t.mounts).map(([k, v]) => `${k}: ${esc(v)}`).join('<br>') || '—'],
  ].map(([k, v]) => `<div class="stat">${k}<b>${v}</b></div>`).join('');
  const warns = [...loadWarnings, ...(design.base ? r.warnings : [])];
  $('#warnings').innerHTML = warns.map(w => `<div class="warn">⚠ ${esc(w)}</div>`).join('');

  clean.claimed = { cost: t.cost, rc: t.rc };
  design.claimed = clean.claimed;
  lastPayload = await GearDesign.encode(clean);
  history.replaceState(null, '', `#d=${lastPayload}`);
}

document.addEventListener('change', e => {
  const el = e.target;
  if (el.dataset.modLevel != null) { design.mods[el.dataset.modLevel].rating = Number(el.value); render(); }
  if (el.dataset.ammoQty != null) { design.ammo[el.dataset.ammoQty].qty = Math.max(1, Number(el.value) || 1); render(); }
});
document.addEventListener('click', e => {
  const el = e.target;
  if (el.dataset.modRemove != null) { design.mods.splice(Number(el.dataset.modRemove), 1); render(); }
  if (el.dataset.ammoRemove != null) { design.ammo.splice(Number(el.dataset.ammoRemove), 1); render(); }
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
  const blob = new Blob([JSON.stringify(clean, null, 2)], { type: 'application/json' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `${(clean.name || lookup(clean.base)?.name || 'design').replace(/[^\w-]+/g, '_')}.sr3e-design.json` });
  a.click();
  URL.revokeObjectURL(a.href);
});
$('#reset').addEventListener('click', () => { design = GearDesign.blank(cat.system); loadWarnings = []; render(); });

render();
