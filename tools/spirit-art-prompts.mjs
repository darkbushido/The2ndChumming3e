#!/usr/bin/env node
/**
 * The ComfyUI batch for summoned-spirit portraits · one picture per SPIRIT TYPE.
 *
 *   node tools/spirit-art-prompts.mjs [out.json]   write the batch (default dist/spirit-art/prompts.json)
 *
 * Then: node tools/comfy-run.mjs dist/spirit-art/prompts.json dist/spirit-art/raw --count 2
 *       python tools/key-art.py <dir of the picked pngs> dist/spirit-art/keyed
 * and put the winners in styles/spirits/<slug>.webp (listed in SPIRIT_PICTURES, scripts/data/spirit-art.mjs).
 * Looks are our own words — never rulebook text. The slug is the SPIRIT_TYPES key with dashes.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const STYLE = 'masterpiece, best quality, anime style, flat color, cel shading, thick black outline, lineart, '
  + 'solo, full body, centered, (simple background:1.4), (flat dark grey background:1.5), #242422 background, no shadow, no text, '
  + 'monster, creature, fantasy spirit, glowing eyes, cyberpunk';
export const NEGATIVE = 'gradient, vignette, shadow, drop shadow, cast shadow, floor, ground, reflection, scenery, landscape, detailed background, '
  + 'realistic, 3d, photo, painterly, blurry, lowres, text, watermark, signature, logo, border, frame, white outline, halo, multiple views, '
  + '2girls, 1girl, 1boy, human, person, cropped, out of frame';

/** Slug → { name, look }. Keys mirror SPIRIT_TYPES (tests/spirit-art.test.mjs keeps them equal). */
export const LOOKS = {
  'earth-elemental':   { name: 'Earth Elemental',   look: 'a hulking humanoid golem of packed soil, boulders and glittering crystal veins, moss on its shoulders, heavy fists, glowing amber eyes' },
  'air-elemental':     { name: 'Air Elemental',     look: 'a swirling tornado-shaped being of pale wind and cloud, a faint vague face and sweeping arms of spiralling gusts, pale blue and white' },
  'fire-elemental':    { name: 'Fire Elemental',    look: 'a lean humanoid made entirely of roaring orange and yellow flame, ember sparks flying off, white-hot eyes, trailing fire for hair' },
  'water-elemental':   { name: 'Water Elemental',   look: 'a flowing humanoid shape of clear blue water with a rippling surface, foam crests, bubbles and drifting currents inside it, deep teal eyes' },
  'forest-spirit':     { name: 'Forest Spirit',     look: 'a tall antlered woodland guardian of bark, twisted branches and leaves, a stag-skull face with soft green glowing eyes, vines and mushrooms growing on it' },
  'river-spirit':      { name: 'River Spirit',      look: 'a graceful serpentine water being with a long flowing body of river current, reeds and river stones, fish scales shimmering along its sides, silver eyes' },
  'wind-spirit':       { name: 'Wind Spirit',       look: 'a bird-like airy being with wide feathery wings made of streaming wind ribbons and drifting leaves, sharp pale face, swift and weightless' },
  'field-spirit':      { name: 'Field Spirit',      look: 'a gentle scarecrow-like harvest guardian of wheat stalks, straw and wildflowers, a hare-eared head, warm golden glow, poppies at its feet' },
  'city-spirit':       { name: 'City Spirit',       look: 'a gaunt urban being woven from concrete, rebar, wires, neon tubes and scrap, a hooded figure of sewer steam and smog, glowing magenta eyes' },
  'desert-spirit':     { name: 'Desert Spirit',     look: 'a lithe jackal-headed being of swirling sand and sun-bleached bone, cracked dry earth skin, a billowing sand cloak, burning orange eyes' },
  'mountain-spirit':   { name: 'Mountain Spirit',   look: 'a massive rugged stone giant with a craggy granite body, snow-capped shoulders, icicle beard, deep-set pale blue eyes, rock fists' },
  'swamp-spirit':      { name: 'Swamp Spirit',      look: 'a hunched bog creature of dark mud, rotting roots and hanging moss, glowing will-o-wisp lights, slimy lily pads, sickly yellow-green eyes' },
};

export const batch = () => Object.entries(LOOKS).map(([slug, { name, look }]) =>
  ({ slug, name, look, prompt: `${name}, ${look}, ${STYLE}`, negative: NEGATIVE }));

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const file = resolve(process.argv[2] ?? join(ROOT, 'dist', 'spirit-art', 'prompts.json'));
  const list = batch();
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(list, null, 2));
  console.log(`${list.length} spirit pictures to draw → ${file}`);
}
