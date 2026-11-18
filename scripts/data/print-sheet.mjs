/**
 * Printable character sheet · TODO 302.
 *
 * Pure: no Foundry globals. `snapshot()` reads an actor-shaped object (`{ name, type, system, items }`)
 * and its linked vehicles into plain rows; `render()` turns a snapshot into a complete, self-contained
 * HTML document with print CSS. The sheet opens it in a new window and the browser's print dialog does
 * the rest (paper, or Save as PDF).
 *
 * Settled with the maintainer (2026-11-17): our own compact two-column layout (not the book's sheet
 * art), core stats + Karma TOTALS only (no ledger), skills, gear, cyber/bioware, magic, contacts and a
 * stat block per linked vehicle/drone the exporter can see. No biography or notes. No round-trip —
 * Foundry's core Export Data / Import Data already does that. Export to Nullsheen JSON is TODO 303.
 *
 * Everything a document supplies is escaped: names and free-text fields are user-written.
 */

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ESC[c]);

const num = (v, d = 0) => (Number.isFinite(Number(v)) && v !== null && v !== '' ? Number(v) : d);
const cap = s => String(s ?? '').replace(/^./, c => c.toUpperCase());
const sys = doc => doc?.system ?? {};
const list = items => (Array.isArray(items) ? items : Array.from(items ?? []));

export const ATTRS = ['body', 'quickness', 'strength', 'charisma', 'intelligence', 'willpower'];

/** "6 (4)" when the current value differs from the base, else "6". */
export function attrText(a) {
  const value = num(a?.value), base = a?.base;
  return base !== undefined && base !== null && num(base) !== value ? `${value} (${num(base)})` : `${value}`;
}

const byName = (a, b) => String(a.name).localeCompare(String(b.name));

function skillRows(items) {
  return items.filter(i => i.type === 'skill').map(i => {
    const s = sys(i);
    const specs = (s.specialisations ?? []).filter(x => x?.name)
      .map(x => `${x.name} ${num(s.rating) + num(x.level, 1)}`);
    if (!specs.length && s.specialisation) specs.push(String(s.specialisation));
    return { name: i.name, rating: num(s.rating), type: s.skillType || 'active',
      attribute: cap(s.linkedAttribute), specs: specs.join(', ') };
  }).sort(byName);
}

const WEAPON_TYPES = ['firearm', 'melee', 'projectile', 'thrown'];

function weaponRows(items) {
  return items.filter(i => WEAPON_TYPES.includes(i.type)).map(i => {
    const s = sys(i);
    const extra = i.type === 'firearm' ? [s.mode, s.ammunition && `Ammo ${s.ammunition}`, s.recoilMod ? `RC ${s.recoilMod}` : '']
      : i.type === 'melee' ? [`Reach ${num(s.reach)}`]
      : [s.quantity ? `×${s.quantity}` : ''];
    return { name: i.name, kind: i.type, category: s.category || '', damage: s.damage || '',
      notes: extra.filter(Boolean).join(' · ') };
  }).sort(byName);
}

function armorRows(items) {
  return items.filter(i => i.type === 'armor').map(i => ({
    name: i.name, ballistic: num(sys(i).ballistic), impact: num(sys(i).impact), worn: !!sys(i).worn,
  })).sort(byName);
}

function wareRows(items) {
  return items.filter(i => i.type === 'cyberware' || i.type === 'bioware').map(i => {
    const s = sys(i);
    return { name: i.name, kind: i.type, rating: s.rating ?? null, grade: s.grade || '',
      cost: i.type === 'cyberware' ? num(s.essenceCost) : num(s.bioIndex) };
  }).sort(byName);
}

const GEAR_TYPES = ['gear', 'ammunition', 'drug', 'medical', 'focus', 'cyberdeck', 'program'];

function gearRows(items) {
  return items.filter(i => GEAR_TYPES.includes(i.type)).map(i => {
    const s = sys(i);
    const qty = s.quantity ?? s.rounds ?? null;
    return { name: i.name, rating: s.rating ?? s.force ?? null, quantity: qty };
  }).sort(byName);
}

function spellRows(items) {
  return items.filter(i => i.type === 'spell').map(i => {
    const s = sys(i);
    return { name: i.name, force: s.force ?? null, category: s.category || '', type: s.type || '',
      range: s.range || '', duration: s.duration || '', drain: s.drain || '' };
  }).sort(byName);
}

function powerRows(items) {
  return items.filter(i => i.type === 'adeptpower').map(i => {
    const s = sys(i);
    return { name: i.name, level: s.hasLevels ? num(s.level, 1) : null, cost: num(s.powerCost) * (s.hasLevels ? num(s.level, 1) : 1) };
  }).sort(byName);
}

function contactRows(items) {
  return items.filter(i => i.type === 'contact').map(i => ({
    name: i.name, archetype: sys(i).archetype || '', loyalty: num(sys(i).loyalty, 1), connection: num(sys(i).connection, 1),
  })).sort(byName);
}

const V_ATTRS = [['handling', 'Handling'], ['speed', 'Speed'], ['accel', 'Accel'], ['body', 'Body'], ['armor', 'Armor'],
  ['sig', 'Sig'], ['autonav', 'Autonav'], ['pilot', 'Pilot'], ['sensor', 'Sensor'], ['cargo', 'Cargo'], ['load', 'Load']];

/** One vehicle or drone as a stat block. */
export function vehicleBlock(v) {
  const s = sys(v), a = s.attributes ?? {};
  const items = list(v.items);
  return {
    name: v.name, vehicleType: s.vehicleType || '',
    stats: V_ATTRS.map(([k, label]) => ({ label, value: k === 'handling' && a.handlingOffRoad
      && num(a.handlingOffRoad.value) !== num(a.handling?.value)
      ? `${num(a.handling?.value)}/${num(a.handlingOffRoad.value)}` : `${num(a[k]?.value)}` })),
    damage: num(s.damage?.value),
    weapons: items.filter(i => i.type === 'vehicleweapon' || WEAPON_TYPES.includes(i.type))
      .map(i => ({ name: i.name, damage: sys(i).damage || '', mode: sys(i).mode || '' })).sort(byName),
    mods: items.filter(i => i.type === 'vehiclemod').map(i => i.name).sort(),
  };
}

/** Read an actor (and its visible linked vehicles) into plain data. */
export function snapshot(actor, vehicles = []) {
  const s = sys(actor), at = s.attributes ?? {}, d = s.derived ?? {}, items = list(actor.items);
  const magic = num(at.magic?.value);
  return {
    name: actor.name ?? '', type: actor.type ?? '',
    metatype: cap(s.metatype),
    profile: [['Gender', s.gender], ['Age', s.age], ['Height', s.height], ['Weight', s.weight], ['Ethnicity', s.ethnicity]]
      .filter(([, v]) => v).map(([label, value]) => ({ label, value })),
    attributes: [
      ...ATTRS.map(k => ({ label: cap(k), value: attrText(at[k]) })),
      { label: 'Essence', value: `${Math.round(num(at.essence?.value, 6) * 100) / 100}` },
      ...(magic ? [{ label: 'Magic', value: attrText(at.magic) }] : []),
      { label: 'Reaction', value: attrText(at.reaction) },
    ],
    derived: [
      { label: 'Initiative', value: d.initiative !== undefined ? `${num(d.initiative)} + ${num(d.initiativeDice, 1)}D6` : '' },
      { label: 'Combat Pool', value: d.combatPool ?? '' },
      ...(d.spellPool !== null && d.spellPool !== undefined ? [{ label: 'Spell Pool', value: d.spellPool }] : []),
      ...(d.hackingPool ? [{ label: 'Hacking Pool', value: d.hackingPool }] : []),
      ...(d.controlPool ? [{ label: 'Control Pool', value: d.controlPool }] : []),
      { label: 'Karma Pool', value: num(s.karmaPool) },
    ].filter(r => r.value !== ''),
    wounds: {
      stun: { value: num(s.wounds?.stun?.value), max: num(s.wounds?.stun?.max, 10) },
      physical: { value: num(s.wounds?.physical?.value), max: num(s.wounds?.physical?.max, 10) },
      overflow: num(s.wounds?.overflow?.value),
    },
    karma: { karma: num(s.karma), total: num(s.totalKarma), pool: num(s.karmaPool) },
    nuyen: num(s.nuyen),
    reputation: [['Street Cred', s.streetCred], ['Notoriety', s.notoriety], ['Public Awareness', s.reputation]]
      .filter(([, v]) => num(v)).map(([label, value]) => ({ label, value: num(value) })),
    magicInfo: magic ? [['Tradition', s.magicTradition], ['Type', s.magicType], ['Totem', s.magicTotem],
      ['Element', s.magicElement], ['Initiate grade', num(s.initiateGrade) || '']]
      .filter(([, v]) => v).map(([label, value]) => ({ label, value })) : [],
    skills: skillRows(items),
    weapons: weaponRows(items),
    armor: armorRows(items),
    ware: wareRows(items),
    gear: gearRows(items),
    spells: spellRows(items),
    powers: powerRows(items),
    contacts: contactRows(items),
    vehicles: list(vehicles).map(vehicleBlock),
  };
}

/* ── Rendering ──────────────────────────────────────────────────────────── */

const table = (head, rows) => !rows.length ? '' :
  `<table><thead><tr>${head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${
    rows.map(r => `<tr>${r.map(c => `<td>${esc(c ?? '')}</td>`).join('')}</tr>`).join('')}</tbody></table>`;

const section = (title, body, cls = '') => !body ? '' : `<section class="${cls}"><h2>${esc(title)}</h2>${body}</section>`;

const kv = rows => !rows.length ? '' :
  `<dl>${rows.map(r => `<div><dt>${esc(r.label)}</dt><dd>${esc(r.value)}</dd></div>`).join('')}</dl>`;

/** A condition track as boxes: filled ones marked. */
export function track(value, max) {
  const n = Math.max(0, Math.min(num(max, 10), 30));
  let out = '';
  for (let i = 1; i <= n; i++) out += `<span class="box${i <= value ? ' on' : ''}"></span>`;
  return out;
}

const SKILL_TYPES = [['active', 'Active skills'], ['knowledge', 'Knowledge skills'], ['language', 'Language skills']];

/** Render a snapshot to a complete HTML document. `opts.autoPrint` adds the print-on-load script. */
export function render(snap, opts = {}) {
  const { autoPrint = true, generated = '' } = opts;
  const skills = SKILL_TYPES.map(([t, title]) => section(title,
    table(['Skill', 'Rating', 'Attribute', 'Specialisations'],
      snap.skills.filter(s => (s.type || 'active') === t).map(s => [s.name, s.rating, s.attribute, s.specs])))).join('');

  const vehicles = snap.vehicles.map(v => section(`${v.name}${v.vehicleType ? ` — ${cap(v.vehicleType)}` : ''}`,
    `<div class="vstats">${v.stats.map(st => `<div><b>${esc(st.label)}</b> ${esc(st.value)}</div>`).join('')}</div>`
    + (v.damage ? `<p>Damage boxes filled: ${esc(v.damage)}</p>` : '')
    + table(['Weapon', 'Damage', 'Mode'], v.weapons.map(w => [w.name, w.damage, w.mode]))
    + (v.mods.length ? `<p class="small"><b>Mods:</b> ${esc(v.mods.join(', '))}</p>` : ''), 'vehicle')).join('');

  const body = `
<header>
  <h1>${esc(snap.name)}</h1>
  <div class="sub">${esc([snap.metatype, ...snap.profile.map(p => `${p.label} ${p.value}`)].filter(Boolean).join(' · '))}</div>
</header>
<div class="cols">
  ${section('Attributes', kv(snap.attributes))}
  ${section('Derived', kv(snap.derived))}
  ${section('Condition', `
    <div class="track"><span class="tl">Stun</span>${track(snap.wounds.stun.value, snap.wounds.stun.max)}</div>
    <div class="track"><span class="tl">Physical</span>${track(snap.wounds.physical.value, snap.wounds.physical.max)}</div>
    ${snap.wounds.overflow ? `<p>Overflow: ${esc(snap.wounds.overflow)}</p>` : ''}`)}
  ${section('Karma & resources', kv([
    { label: 'Karma', value: snap.karma.karma }, { label: 'Total Karma', value: snap.karma.total },
    { label: 'Karma Pool', value: snap.karma.pool }, { label: 'Nuyen', value: `${snap.nuyen}¥` },
    ...snap.reputation]))}
  ${section('Magic', kv(snap.magicInfo))}
</div>
${skills}
${section('Weapons', table(['Weapon', 'Type', 'Damage', 'Notes'], snap.weapons.map(w => [w.name, w.category || w.kind, w.damage, w.notes])))}
${section('Armour', table(['Armour', 'Ballistic', 'Impact', 'Worn'], snap.armor.map(a => [a.name, a.ballistic, a.impact, a.worn ? '✔' : ''])))}
${section('Cyberware & bioware', table(['Item', 'Rating', 'Grade', 'Essence / Index'], snap.ware.map(w => [w.name, w.rating ?? '', w.grade, w.cost])))}
${section('Gear', table(['Item', 'Rating', 'Qty'], snap.gear.map(g => [g.name, g.rating ?? '', g.quantity ?? ''])))}
${section('Spells', table(['Spell', 'Force', 'Category', 'Type', 'Range', 'Duration', 'Drain'],
    snap.spells.map(s => [s.name, s.force ?? '', s.category, s.type, s.range, s.duration, s.drain])))}
${section('Adept powers', table(['Power', 'Level', 'Power Points'], snap.powers.map(p => [p.name, p.level ?? '', p.cost])))}
${section('Contacts', table(['Contact', 'Archetype', 'Loyalty', 'Connection'], snap.contacts.map(c => [c.name, c.archetype, c.loyalty, c.connection])))}
${vehicles ? `<h2 class="group">Vehicles &amp; drones</h2>${vehicles}` : ''}
<footer>${esc(generated)}</footer>`;

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(snap.name)} — character sheet</title>
<style>${PRINT_CSS}</style></head>
<body>${body}${autoPrint ? '\n<script>window.addEventListener("load", () => setTimeout(() => window.print(), 200));</script>' : ''}
</body></html>`;
}

export const PRINT_CSS = `
:root { --ink:#111; --muted:#555; --rule:#999; }
* { box-sizing:border-box; }
body { font:10pt/1.3 "Helvetica Neue", Arial, sans-serif; color:var(--ink); background:#fff; margin:16px; }
header { border-bottom:2px solid var(--ink); margin-bottom:8px; }
h1 { font-size:18pt; margin:0; }
.sub { color:var(--muted); margin:2px 0 6px; }
h2 { font-size:10.5pt; text-transform:uppercase; letter-spacing:.06em; border-bottom:1px solid var(--rule); margin:10px 0 4px; }
h2.group { font-size:12pt; border-bottom:2px solid var(--ink); }
.cols { columns:2; column-gap:18px; }
section { break-inside:avoid; }
.cols section { margin-bottom:6px; }
dl { margin:0; display:grid; grid-template-columns:repeat(2, 1fr); gap:1px 12px; }
dl div { display:flex; justify-content:space-between; border-bottom:1px dotted #ccc; }
dt { color:var(--muted); } dd { margin:0; font-weight:600; }
table { width:100%; border-collapse:collapse; font-size:9pt; }
th { text-align:left; color:var(--muted); font-weight:600; border-bottom:1px solid var(--rule); }
td, th { padding:1px 6px 1px 0; }
tr { break-inside:avoid; }
tbody tr:nth-child(even) td { background:#f3f3f3; }
.track { display:flex; align-items:center; gap:2px; margin:2px 0; }
.tl { width:60px; color:var(--muted); }
.box { width:12px; height:12px; border:1px solid var(--ink); display:inline-block; }
.box.on { background:var(--ink); }
.vstats { display:grid; grid-template-columns:repeat(6, auto); gap:2px 10px; font-size:9pt; }
.small { font-size:9pt; }
footer { margin-top:12px; color:var(--muted); font-size:8pt; }
@media print { body { margin:0; } @page { margin:12mm; } tbody tr:nth-child(even) td { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
`;

export const PrintSheet = { esc, attrText, track, snapshot, vehicleBlock, render };
