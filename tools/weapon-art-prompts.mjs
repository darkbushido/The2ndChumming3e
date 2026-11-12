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
export const STYLE = 'anime style illustration, clean cel shading, crisp dark outline, side view, single object centred, '
  + 'plain flat pure white background, no text, no hands, no people, cyberpunk 2060s design';

/** The batch: every shipped hand weapon without a picture, one entry per slug. */
export function batch(root = ROOT) {
  const shipped = new Set((JSON.parse(readFileSync(join(root, 'system.json'), 'utf8')).packs ?? []).map(p => p.name));
  const out = new Map();
  for (const pack of readdirSync(join(root, 'packs-src')).filter(p => /-(firearms|melee)$/.test(p) && shipped.has(p)).sort()) {
    for (const f of readdirSync(join(root, 'packs-src', pack)).filter(x => x.endsWith('.json')).sort()) {
      const { doc } = JSON.parse(readFileSync(join(root, 'packs-src', pack, f), 'utf8'));
      const s = slug(doc.name);
      if (!s || PICTURES.has(s) || out.has(s)) continue;
      const what = CATEGORY_NAMES[doc.system?.category] ?? (doc.type === 'melee' ? 'melee weapon' : 'firearm');
      out.set(s, { slug: s, name: doc.name, group: WeaponCatalog.groupOf(doc), prompt: `${doc.name}, a ${what.toLowerCase()}, ${STYLE}` });
    }
  }
  return [...out.values()];
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const file = resolve(process.argv[2] ?? join(ROOT, 'dist', 'weapon-art', 'prompts.json'));
  const list = batch();
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(list, null, 2));
  console.log(`${list.length} weapon pictures to draw → ${file}`);
}
