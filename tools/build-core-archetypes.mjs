/**
 * Build the SR3 core rulebook's Sample Characters into an Actor pack — TODO (see TODO.md, "core archetypes").
 *
 *   node tools/build-core-archetypes.mjs            # write packs-src/sr3e-sr3-archetypes/
 *   node tools/build-core-archetypes.mjs --check    # report unresolved items and the Essence audit; write nothing
 *
 * The data is `tools/data/core-archetypes.mjs` (the book's stats, page by page). Each item is resolved
 * against the shipped packs' source (`packs-src/`) so names and numbers match the rest of the system;
 * an item the packs do not have becomes a plain gear item named as the book prints it (REPORTED, not hidden).
 *
 * ⚠ **Generated documents** — flagged `flags.The2ndChumming3e.generatedBy: 'build-core-archetypes'`.
 *   Never hand-edit the pack source; change the data or this builder and re-run
 *   (`tests/core-archetypes.test.mjs` rebuilds the plan in memory and fails on any difference).
 * ⚠ **Ids are DERIVED** (sha1 of a stable seed), never random, so a re-run reuses every key.
 * ⚠ **Attributes are the book's natural (unaugmented) rating**; the system adds the cyberware, adept-power
 *   and troll-hide bonuses itself (see the header of the data file).
 * ⚠ Rated items go through `ModRatings.withLevel`, the same rule the item sheet's Level dropdown uses.
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ModRatings } from '../scripts/data/mod-ratings.mjs';
import { restockImage, TYPE_ART } from '../scripts/data/item-icons.mjs';
import { parseSpecialisations } from '../scripts/data/skill-rules.mjs';
import { CORE_ARCHETYPES } from './data/core-archetypes.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const PACK = 'sr3e-sr3-archetypes';
const SRC = join(ROOT, 'packs-src');
const SYSTEM_ID = 'The2ndChumming3e';
const GENERATOR = 'build-core-archetypes';
const CHECK = process.argv.includes('--check');

const { SR3E } = await import(pathToFileURL(join(ROOT, 'scripts', 'config.js')).href);

// ── ids ──────────────────────────────────────────────────────────────────────────────────
const B62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
export const idFor = seed => {
  const h = createHash('sha1').update(`core-archetypes|${seed}`).digest();
  let out = '';
  for (let i = 0; out.length < 16; i++) out += B62[h[i] % 62];
  return out;
};

// ── the shipped packs, indexed ───────────────────────────────────────────────────────────
const PACK_ORDER = ['sr3e-sr3-', 'sr3e-mm-', 'sr3e-cc-', 'sr3e-r3-', 'sr3e-'];
const rank = pack => { const i = PACK_ORDER.findIndex(p => pack.startsWith(p)); return i < 0 ? 99 : i; };
const norm = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function indexPacks() {
  const idx = new Map();   // `${type}|${norm(name)}` → [{pack, doc}]
  for (const pack of readdirSync(SRC)) {
    if (pack === PACK || pack === 'sr3e-mr-johnsons-contacts' || pack === 'sr3e-example-characters') continue;
    for (const f of readdirSync(join(SRC, pack))) {
      if (f.startsWith('_folder')) continue;
      const g = JSON.parse(readFileSync(join(SRC, pack, f), 'utf8'));
      const doc = g.doc;
      if (!doc?.type || !g._key?.startsWith('!items!')) continue;
      const k = `${doc.type}|${norm(doc.name)}`;
      (idx.get(k) ?? idx.set(k, []).get(k)).push({ pack, doc });
    }
  }
  for (const list of idx.values()) list.sort((a, b) => rank(a.pack) - rank(b.pack));
  return idx;
}
const INDEX = indexPacks();
const TYPE_OF = { cy: 'cyberware', bw: 'bioware', sp: 'spell', ap: 'adeptpower', fw: 'firearm', ml: 'melee', pr: 'projectile',
  th: 'thrown', ar: 'armor', am: 'ammunition', ge: 'gear' };
// A throwing/grenade item may live under another type in the packs.
const ALT_TYPES = { th: ['thrown', 'projectile', 'melee'], pr: ['projectile', 'thrown'], ge: ['gear', 'armor', 'medical', 'cyberdeck', 'projectile', 'ammunition', 'cyberware'],
  am: ['ammunition', 'projectile'], ml: ['melee', 'projectile'] };
/** The book's wording → the name the shipped packs use. Only where the two differ. */
const ALIASES = {
  'Low-light Goggles': 'Goggles - Low Light', 'Thermographic Goggles': 'Goggles - Thermographic',
  'Goggles': 'Goggles - Low Light + Thermographic', 'Pocket Secretary': 'Basic Pocket Secretary', 'Stim Patch': 'Stimulant Patch',
  'Electronics Tools Kit': 'Electronic ToolKit', 'Pistol Tools Kit': 'Gunsmith Kit (Pistol)', 'Large Flashlight': 'Flashlight - Large',
  'Low-Light Binoculars': 'Binoculars - Low Light', 'Sequencer': 'Keypad Sequencer', 'Wristphone': 'Wrist Phone',
  'DocWagon Contract, Gold': 'DocWagon Gold', 'DocWagon Contract, Basic': 'DocWagon Basic', 'Respirator': 'Respirator (Armor)',
  'Stealth Grapple Line': 'Stealth Grapple Line (100m)', 'Ration Bars': 'Ration Bars (10 Days)', 'Shamanic Lodge': 'Shaman Lodge',
  'Elemental Conjuring Supplies': 'Elemental Conjuring Materials', 'Arrow': 'Arrows', 'Micro Flare': 'Micro Flares', 'Flash-Pak': 'Flash-Pak',
  'Lead Pipe': 'Pipe', 'BTL Simdeck': 'BTL-modified simdeck', 'Armor Clothing': 'Armor Clothing',
};
const find = (kind, rawName) => {
  const name = ALIASES[rawName] ?? rawName;
  for (const type of ALT_TYPES[kind] ?? [TYPE_OF[kind]]) {
    const hit = INDEX.get(`${type}|${norm(name)}`)?.[0];
    if (hit) return hit;
  }
  return null;
};

const unresolved = [];
const clone = o => JSON.parse(JSON.stringify(o));

const GRADE_NAME = { Alpha: 'Alpha' };
/** Mirror of `SR3EActor.gradedEssenceCost` (M&M p.45) — the Essence audit only; the sheet is the authority. */
const GRADE_MULT = { alpha: 0.8, beta: 0.6, delta: 0.5 };
export function gradedEssenceCost(cost, grade) {
  const base = parseFloat(cost ?? 0);
  if (!Number.isFinite(base) || base <= 0) return 0;
  const raw = String(grade ?? '').toLowerCase(); const used = /used/.test(raw);
  let key = raw.replace(/used/g, '').trim();
  if (used && /^delta(ware)?$/.test(key)) key = 'beta';
  const mult = GRADE_MULT[key] ?? 1;
  if (mult === 1) return parseFloat(base.toFixed(2));
  return Math.max(0.01, Math.ceil(Number((base * mult * 100).toFixed(6))) / 100);
}
const parseMag = ammo => { const m = /(\d+)\s*\(\s*([a-z]+)\s*\)/i.exec(String(ammo ?? '')); return m ? { size: Number(m[1]), mech: m[2].toLowerCase() } : null; };

/** The embedded-item skeleton Foundry keeps, beside the system data. */
function embedded(actorId, seed, src, packName) {
  return {
    _id: idFor(`${actorId}|${seed}`),
    name: src.name, type: src.type, img: restockImage({ name: src.name, type: src.type, system: src.system }) ?? TYPE_ART[src.type] ?? src.img,
    system: src.system, effects: [], folder: null, sort: 0, ownership: { default: 0 },
    flags: src.free ? { [SYSTEM_ID]: { insideReplacement: true } } : {},
    _stats: { compendiumSource: packName ? `Compendium.${SYSTEM_ID}.${packName}.Item.${src.id}` : null, duplicateSource: null,
      coreVersion: '14', systemId: SYSTEM_ID, systemVersion: null, createdTime: 1788537621572, modifiedTime: 1788537621572, lastModifiedBy: null },
  };
}


function describeUnresolved(a, it) { unresolved.push(`${a.name}: ${it.t} "${it.n}"`); }

/** What the book prints for an item the packs do not have: a typed item carrying the printed numbers, nothing invented. */
function generic(a, it) {
  const page = `sr3.${a.sheet}`;
  const note = it.d ? `<p>${html(it.d)}</p>` : '';
  switch (it.t) {
    case 'ar':
      return { name: it.n, type: 'armor', system: { ballistic: it.b ?? 0, impact: it.i ?? 0, concealability: '', cost: 0, weight: 0, bookPage: page, notes: note, rating: null, modFor: '' }, generic: true };
    case 'ml':
      return { name: it.n, type: 'melee', system: { category: it.cat ?? '', skill: it.skill ?? '', attribute: 'strength', reach: it.reach ?? '', damage: it.dmg ?? '', concealability: '', weight: '', cost: 0, bookPage: page, notes: note, legal: true }, generic: true };
    case 'th':
      return { name: it.n, type: 'thrown', system: { category: it.cat ?? '', concealability: '', damage: it.dmg ?? '', quantity: it.q ?? 1, cost: 0, weight: 0, bookPage: page, notes: note, legal: true }, generic: true };
    case 'cy':
      // Cyberears — not a row in the shipped packs. Numbers from SR3 p.62's worked example: alphaware ears cost .24 Essence
      // (.3 base) and 8,000¥ (4,000¥ base) and take up to .5 Essence of mods free; the table (p.299) is the authority.
      return { name: it.n, type: 'cyberware', system: { cyberwareCategory: 'Earware', essenceCost: 0.3, cost: 4000, availability: '', streetIndex: 1, legalCode: 'Legal', mods: '',
          capacity: 0.5, isReplacement: true, bookPage: 'sr3.299', grade: 'Standard', rating: null, description: 'Replaces the ears; holds .5 Essence of ear mods free' }, generic: true };
    case 'sp':
      return { name: it.n, type: 'spell', system: { category: '', type: '', duration: '', range: '', drain: '', target: '', bookPage: '', damage: '', description: '' }, generic: true };
    default:
      return { name: it.n, type: 'gear', 
        system: { quantity: it.q ?? 1, cost: 0, weight: 0, description: note, rating: it.r ?? null, bookPage: page }, generic: true };
  }
}

/** A resolved or generic item → { name, type, img, system, id } (not yet an embedded doc). */
function resolve(a, it) {
  const hit = find(it.t, it.n);
  if (!hit) {
    describeUnresolved(a, it);
    const g = generic(a, it);
    if (it.g) g.system.grade = it.g;
    g.free = !!it.free;
    return g;
  }
  const doc = clone(hit.doc);
  let system = doc.system;
  if (it.r != null) {
    const withLevel = ModRatings.withLevel({ name: doc.name, type: doc.type, system }, it.r);
    system = withLevel.system;
    system.rating = it.r;
  }
  if (it.g) system.grade = GRADE_NAME[it.g] ?? it.g;
  if (it.q && 'quantity' in system) system.quantity = it.q;
  return { name: doc.name, type: doc.type, img: doc.img, system, id: doc._id, pack: hit.pack, free: !!it.free };
}

// ── skills ───────────────────────────────────────────────────────────────────────────────
const ACTIVE_CATS = new Set(Object.keys(SR3E.skills).filter(c => SR3E.skillTypeForCategory(c) === 'active'));
const SKILL_ALIASES = { 'Whips/Flails': ['Whips', 'Whips & Flails', 'Whips/Flails'], 'Throwing Weapons': ['Throwing Weapons'],
  'Submachine Guns': ['Submachine Guns'], 'Hovercraft': ['Hovercraft'] };
function skillMeta(name, tier) {
  if (tier === 'language') return { category: 'Language', linkedAttribute: 'lan', skillType: 'language' };
  const names = [name, ...(SKILL_ALIASES[name] ?? [])];
  const wantActive = tier === 'active';
  for (const n of names) {
    for (const [cat, list] of Object.entries(SR3E.skills)) {
      if (ACTIVE_CATS.has(cat) !== wantActive || cat === 'Language') continue;
      const m = list.find(s => norm(s.name) === norm(n));
      if (m) return { category: cat, linkedAttribute: m.linkedAttribute, skillType: SR3E.skillTypeForCategory(cat) };
    }
  }
  return null;
}

function skillItem(a, s, idx) {
  const meta = skillMeta(s.name, s.tier);
  if (!meta && s.tier === 'active') {
    unresolved.push(`${a.name}: skill "${s.name}" (${s.tier}) — not in SR3ESkills`);
  }
  const m = meta ?? (s.tier === 'active' ? { category: 'Combat skills', linkedAttribute: 'intelligence', skillType: 'active' }
    : { category: 'Street knowledge', linkedAttribute: 'intelligence', skillType: 'knowledge' });
  const system = {
    skillName: s.name, rating: s.rating, linkedAttribute: m.linkedAttribute, category: m.category, skillType: m.skillType,
    specialisation: s.spec ?? '',
    specialisations: s.spec ? parseSpecialisations(s.spec, s.rating) : [],
    force: 0, description: '',
  };
  return { name: s.name, type: 'skill', system };
}

// ── weapons: loaded, with the spare ammunition the book lists ──────────────────────────
function weaponItems(a, it, base) {
  const out = [];
  const w = base;
  const mag = parseMag(w.system.ammunition);
  const isFirearm = w.type === 'firearm';
  const smart = it.sl ? { smartgun: true } : {};
  if (isFirearm) {
    w.system = { ...w.system, ...smart, ready: true };
    const type = it.type ?? 'regular';
    const total = it.rounds ?? 0;
    const size = mag?.size ?? 0;
    w.system.loadedAmmoType = 'regular';
    w.system.loadedRounds = Math.min(size, total);
    if (it.acc) w.system.accessories = [w.system.accessories && w.system.accessories !== 'None' ? w.system.accessories : '', it.acc].filter(Boolean).join(', ');
    // Spare rounds of the loaded type, then each extra type.
    const spare = [{ type: 'regular', rounds: Math.max(0, total - w.system.loadedRounds) }, ...(it.extra ?? []).map(e => ({ type: e.type ?? 'regular', rounds: e.rounds }))]
      .filter(s => s.rounds > 0);
    void type;
    for (const s of spare) out.push({ kind: 'ammo', gun: w, mag, ...s });
  }
  return { weapon: w, ammo: out };
}

function ammoItem(a, gun, mag, spare) {
  const label = SR3E.ammoTypes[spare.type]?.label ?? 'Regular';
  const cls = (gun.system.category ?? '') || '';
  const gunClass = cls ? ({ MaPist: 'LPist', MPist: 'LPist', VHP: 'HPist', Carb: 'AsRf', LCarb: 'AsRf' }[cls] ?? cls) : '';
  if (mag && mag.mech === 'c' && mag.size > 0 && spare.rounds % mag.size === 0) {
    const clipName = `${mag.size}-Rnd Clip (${label})`;
    const hit = INDEX.get(`ammunition|${norm(clipName)}`)?.[0];
    if (hit) {
      const doc = clone(hit.doc);
      doc.system.reloads = spare.rounds / mag.size;
      doc.system.gunClass = gunClass;
      return { name: doc.name, type: 'ammunition', img: doc.img, system: doc.system, id: doc._id, pack: hit.pack };
    }
  }
  return { name: `${label} rounds (${gun.name})`, type: 'ammunition', 
    system: { ammoType: spare.type, loadMechanism: mag?.mech ?? 'c', countedIn: 'rounds', rounds: spare.rounds, gunClass, reloads: 0, roundsPerReload: 0,
      cost: 0, weight: 0, bookPage: `sr3.${a.sheet}`, notes: '' } };
}

// ── the actor ────────────────────────────────────────────────────────────────────────────
let TEMPLATE = null;
function template() {
  if (TEMPLATE) return TEMPLATE;
  const dir = join(SRC, 'sr3e-mr-johnsons-contacts');
  const f = readdirSync(dir).find(n => n.startsWith('mercenary.'));
  TEMPLATE = JSON.parse(readFileSync(join(dir, f), 'utf8')).doc;
  return TEMPLATE;
}

const html = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function notesHtml(a) {
  const li = x => `<li>${html(x)}</li>`;
  const p = [`<p>Shadowrun, Third Edition, p.${a.page} (record sheet p.${a.sheet}). Stats as printed; the book's race, not converted.</p>`];
  const pr = Object.entries(a.priorities).map(([k, v]) => `${k[0].toUpperCase()}${k.slice(1)} ${v}`).join(', ');
  p.push(`<p>Priorities: ${pr}. Resources ${a.resources.toLocaleString('en-US')}¥ (spent in creation).</p>`);
  p.push(`<p>Starting nuyen: ${a.nuyen}¥ + (3D6 × 100¥)${a.nuyen ? '' : ''}. Lifestyle: ${html(a.lifestyle)}.</p>`);
  if (a.contacts?.length) p.push(`<p>Contacts:</p><ul>${a.contacts.map(li).join('')}</ul>`);
  if (a.programs?.length) p.push(`<p>Programs: ${html(a.programs.join(', '))}.</p>`);
  if (a.extras?.length) p.push(`<p>Also carried: ${html(a.extras.join('; '))}.</p>`);
  if (a.notes?.length) p.push(`<p>Record-sheet notes:</p><ul>${a.notes.map(li).join('')}</ul>`);
  return p.join('');
}

export function buildActor(a) {
  const tpl = clone(template());
  const id = idFor(`actor|${a.key}`);
  const attr = n => ({ base: n, value: n, mod: 0, force: 0 });
  const sys = tpl.system;
  sys.metatype = a.race;
  sys.nuyen = a.nuyen;
  sys.karma = 0; sys.totalKarma = 0; sys.karmaPool = 1; sys.professionalRating = 0;
  sys.notes = notesHtml(a);
  sys.bookPage = `sr3.${a.page}`;
  Object.assign(sys.attributes, {
    body: attr(a.attrs.b), quickness: attr(a.attrs.q), strength: attr(a.attrs.s), charisma: attr(a.attrs.c),
    intelligence: attr(a.attrs.i), willpower: attr(a.attrs.w),
    magic: attr(a.attrs.m),
    essence: { base: 6, value: a.attrs.e, force: 0, lost: Number((6 - a.attrs.e).toFixed(2)) },
  });
  sys.attributes.reaction = { base: 3, value: 3, reactionBonus: 0, diceBonus: 0, override: false, force: 0 };
  sys.magicTradition = a.magic?.tradition ?? '';
  sys.magicType = a.magic?.type ?? '';
  sys.magicTotem = a.magic?.totem ?? '';
  sys.professionalRating = 0;

  const items = [];
  const push = (seed, built) => items.push(embedded(id, seed, built, built.pack));
  a.skills.forEach((s, i) => {
    push(`skill|${i}|${s.name}`, skillItem(a, s, i));
    if (s.tier === 'language' && s.rw) {
      push(`skill|${i}|${s.name}|rw`, { ...skillItem(a, { ...s, name: `${s.name} Read/Write`, rating: s.rw, spec: '' }, i) });
    }
  });
  a.items.forEach((it, i) => {
    const base = resolve(a, it);
    const seed = `${it.t}|${i}|${it.n}`;
    const copies = (it.t === 'cy' || it.t === 'bw') && it.q > 1 ? it.q : 1;
    for (let c = 0; c < copies; c++) {
      let b = c === 0 ? base : resolve(a, it);
      if (copies > 1 && b.system && 'quantity' in b.system) b.system.quantity = 1;
      if (it.t === 'ap') {
        if (it.level) b.system.level = it.level;
        if (it.skill) { b.system.improvedSkillName = it.skill; b.system.improvedSkillDice = it.level ?? 1; }
        if (it.label) b.name = it.label;
      }
      if (it.t === 'sp') {
        b.system.force = it.f;
        b.name = `${b.name} (F${it.f})`;
        if (it.x) b.system.description = `<p>${it.x === 'Fetish' ? 'Fetish required' : it.x} spell.</p>`;
      }
      if (it.d && ['cy', 'bw', 'ap', 'sp'].includes(it.t)) b.system.description = `${b.system.description ? `${b.system.description} — ` : ''}${html(it.d)}`.replace(/^(?!<p>)/, '');
      else if (it.d && it.t !== 'ge') b.system.notes = b.system.notes ? b.system.notes : `<p>${html(it.d)}</p>`;
      if (it.d && it.t === 'ge' && !b.generic) b.system.description = `<p>${html(it.d)}</p>`;
      if (it.n2) b.name = it.n2;
      if (it.t === 'am' && it.rounds && b.system && 'rounds' in b.system) { b.system.rounds = it.rounds; b.system.countedIn = 'rounds'; }
      if (it.t === 'pr' && /bow/i.test(b.name) && b.system && 'loadedRounds' in b.system) { b.system.loadedRounds = 1; b.system.loadedAmmoType = 'regular'; }
      if (it.r != null && it.t === 'ge' && !b.generic) b.system.rating = it.r;
      if (it.t === 'fw') {
        const { weapon, ammo } = weaponItems(a, it, b);
        push(`${seed}|${c}`, weapon);
        ammo.forEach((s, j) => push(`${seed}|ammo|${j}`, ammoItem(a, weapon, s.mag, s)));
        if (it.minis) {
          const m = resolve(a, { t: 'am', n: it.minis.n, q: it.minis.q });
          // A launcher is loaded with one grenade ITEM (TODO 163): its magazine from that stock, the rest still carried.
          const size = parseMag(weapon.system.ammunition)?.size ?? it.minis.q;
          const loaded = Math.min(size, it.minis.q);
          if (m.system && 'rounds' in m.system) { m.system.rounds = it.minis.q - loaded; m.system.countedIn = 'rounds'; }
          weapon.system.loadedRounds = loaded;
          weapon.system.equippedAmmoId = idFor(`${id}|${seed}|minis`);
          push(`${seed}|minis`, m);
        }
      } else {
        push(`${seed}|${c}`, b);
      }
    }
  });

  const doc = {
    ...tpl,
    _id: id, name: a.name, img: 'icons/svg/mystery-man.svg',
    items: items.map(i => i._id),
    folder: null, ownership: { default: 0 },
    flags: { [SYSTEM_ID]: { isTemplate: false, generatedBy: GENERATOR } },
    _stats: { ...tpl._stats, lastModifiedBy: null, createdTime: 1788537621572, modifiedTime: 1788537621572, systemVersion: null, coreVersion: '14' },
    sort: 0,
  };
  doc.prototypeToken.name = a.name;
  doc.prototypeToken.sight.enabled = true;
  doc.prototypeToken.ring.enabled = true;
  doc.prototypeToken.texture.src = 'icons/svg/mystery-man.svg';
  const embeddedMap = {};
  for (const i of items) embeddedMap[`!actors.items!${id}.${i._id}`] = i;
  return { _key: `!actors!${id}`, doc, embedded: embeddedMap };
}

export const slugName = s => String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);

export function buildAll() {
  unresolved.length = 0;
  const files = new Map();
  for (const a of CORE_ARCHETYPES) {
    const g = buildActor(a);
    const t = /^!actors!(.+)$/.exec(g._key)[1];
    const embeddedSorted = Object.fromEntries(Object.entries(g.embedded).sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0)));
    g.embedded = embeddedSorted;
    files.set(`${slugName(g.doc.name)}.${t}.json`, `${JSON.stringify(g, null, 2)}\n`);
  }
  return { files, unresolved: [...unresolved] };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { files, unresolved: miss } = buildAll();
  if (miss.length) { console.log(`Not in the packs (${miss.length}) — generic items / flagged skills:`); for (const m of miss) console.log('  ' + m); }
  if (CHECK) {
    console.log('\nEssence audit (graded cost of installed cyberware vs the book):');
    for (const a of CORE_ARCHETYPES) {
      const g = buildActor(a);
      const cost = Object.values(g.embedded)  .filter(i => i.type === 'cyberware' && !i.flags?.[SYSTEM_ID]?.insideReplacement)
        .reduce((t, i) => t + gradedEssenceCost(i.system.essenceCost, i.system.grade), 0);
      const want = Number((6 - a.attrs.e).toFixed(2));
      console.log(`  ${a.name.padEnd(24)} installed ${cost.toFixed(2).padStart(5)}  book ${want.toFixed(2).padStart(5)}  ${Math.abs(cost - want) < 0.005 ? 'ok' : `DIFF ${(cost - want).toFixed(2)}`}`);
    }
    console.log(`\n${files.size} actors would be written.`);
    process.exit(0);
  }
  const dir = join(SRC, PACK);
  if (existsSync(dir)) rmSync(dir, { recursive: true });
  mkdirSync(dir, { recursive: true });
  for (const [n, text] of files) writeFileSync(join(dir, n), text);
  console.log(`\nWrote ${files.size} actors to packs-src/${PACK}/`);
}
