#!/usr/bin/env node
/**
 * The ComfyUI batch for the weapon designer's per-model pictures · TODO 300.
 *
 *   node tools/weapon-art-prompts.mjs [out.json]    write the batch (default dist/weapon-art/prompts.json); changes nothing else
 *
 * One entry per hand weapon in the shipped firearm and melee packs that has no picture yet: `{ slug, name, group, prompt }`.
 * Run it on the maintainer's ComfyUI (Flux dev, the vehicle pictures' style), save each as `<slug>.png`, then key them:
 *   python tools/key-art.py <pngs dir> styles/weapons
 * and add the slugs to `PICTURES` in scripts/data/weapon-art.mjs (tests/weapon-designer-shop.test.mjs checks the two match).
 * The prompts never name a real manufacturer's look beyond the book's own weapon name — the picture is an original drawing.
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WeaponCatalog, CATEGORY_NAMES } from '../scripts/data/weapon-catalog.mjs';
import { slug, PICTURES } from '../scripts/data/weapon-art.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
/** What each firearm should look like, in our own words — `tools/data/weapon-looks.json` (the maintainer's review, 2026-11-13). */
export const LOOKS = JSON.parse(readFileSync(join(ROOT, 'tools', 'data', 'weapon-looks.json'), 'utf8'));
export const STYLE = 'anime style illustration, clean cel shading, crisp dark outline, side view, single object centred, '
  + 'plain flat solid dark charcoal grey background (#242422), no shadow, no drop shadow, no cast shadow, no glow, no text, no hands, no people, cyberpunk 2060s design';
/** The background is the designer card's --sr-surface (#242422): key-art.py keys whatever colour the border is, so any
 *  leftover edge blends into the card instead of showing as a white halo (the maintainer, 2026-11-19). */
/** Things the model must not draw — fed to the sampler's negative prompt. The baked-in grey drop shadow survived keying (0.9.0 bug). */
export const NEGATIVE = 'white background, light background, gradient background, shadow, drop shadow, cast shadow, ground shadow, reflection, white outline, halo, glow edge, border, frame, text, watermark, hands, people';

/**
 * What a gun visibly carries, from its pack data — the maintainer, 2026-11-13: "the ares alpha has an integrated under
 * barrel grenade launcher". Read from `system.accessories` (the book's accessory column, e.g. "Grenade Launcher 8(m),
 * RC(2), Smartlink-2"), the installed accessories, the firing modes and the ammunition feed. Order: first match wins per part.
 */
export const FEATURES = [
  [/grenade launcher/i, 'integrated underbarrel grenade launcher'],
  [/shotgun|mini-?shotgun/i, 'integrated underbarrel shotgun'],
  [/laser/i, 'laser sight under the barrel'],
  [/imaging scope|scope/i, 'scope on top'],
  [/silencer|suppress/i, 'long sound suppressor on the muzzle'],
  [/gas vent/i, 'vented muzzle brake'],
  [/tripod/i, 'mounted on a tripod'],
  [/bipod/i, 'folding bipod near the muzzle'],
  [/fore ?grip/i, 'vertical foregrip'],
  [/folding stock|collapsible stock|retractable stock|telescoping stock|detachable stock/i, 'folding stock'],
  [/hip pad|bracing/i, 'hip brace'],
];
export function features(doc) {
  const s = doc?.system ?? {};
  const text = [s.accessories ?? '', ...(s.installed ?? []).map(m => m?.name ?? '')].join(', ');
  const out = [];
  for (const [re, part] of FEATURES) if (re.test(text) && !out.includes(part)) out.push(part);
  const ammo = String(s.ammunition ?? '');
  if (/\(b\)/i.test(ammo)) out.push('ammunition belt feeding from a box');
  else if (/\(cy\)/i.test(ammo)) out.push('revolver cylinder');
  else if (/\(d\)/i.test(ammo)) out.push('drum magazine');
  else if (Number.parseInt(ammo, 10) >= 50) out.push('large high-capacity magazine');
  if (/FA/.test(String(s.mode ?? ''))) out.push('full-auto');
  return out;
}

/** Added for a gun with a built-in smartgun system (`system.smartgun`). */
export const SMARTGUN = 'built-in smartgun system with glowing LED indicator lights along the receiver and a lit smartlink contact on the grip';

/** The batch: every shipped hand weapon without a picture, one entry per slug. */
export function batch(root = ROOT, { all = false } = {}) {
  const shipped = new Set((JSON.parse(readFileSync(join(root, 'system.json'), 'utf8')).packs ?? []).map(p => p.name));
  const out = new Map();
  for (const pack of readdirSync(join(root, 'packs-src')).filter(p => /-(firearms|melee)$/.test(p) && shipped.has(p)).sort()) {
    for (const f of readdirSync(join(root, 'packs-src', pack)).filter(x => x.endsWith('.json')).sort()) {
      const { doc } = JSON.parse(readFileSync(join(root, 'packs-src', pack, f), 'utf8'));
      const s = slug(doc.name);
      if (!s || (!all && PICTURES.has(s)) || out.has(s)) continue;
      const what = CATEGORY_NAMES[doc.system?.category] ?? (doc.type === 'melee' ? 'melee weapon' : 'firearm');
      // The maintainer, 2026-11-13: "smartguns should get some LED lights".
      const smart = doc.system?.smartgun ? `${SMARTGUN}, ` : '';
      const parts = features(doc);
      out.set(s, { slug: s, name: doc.name, group: WeaponCatalog.groupOf(doc), smartgun: !!doc.system?.smartgun, what: what.toLowerCase(),
        features: parts, page: doc.system?.bookPage ?? '', look: LOOKS[s]?.look ?? '', tech: !!LOOKS[s]?.tech, negative: NEGATIVE,
        prompt: `${doc.name}, ${LOOKS[s]?.look ?? `a ${what.toLowerCase()}`}, ${parts.length ? `${parts.join(', ')}, ` : ''}${smart}${STYLE}` });
    }
  }
  return [...out.values()];
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // --all: every weapon, pictured or not — regenerating the whole set without the baked-in shadow.
  const args = process.argv.slice(2);
  const all  = args.includes('--all');
  const file = resolve(args.find(a => a !== '--all') ?? join(ROOT, 'dist', 'weapon-art', 'prompts.json'));
  const list = batch(ROOT, { all });
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(list, null, 2));
  console.log(`${list.length} weapon pictures to draw → ${file}`);
}
