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
  + '(top-down view:1.5), (from directly above:1.5), (overhead view:1.4), (aerial view:1.3), token art, solo, centered, whole creature visible, '
  + '(simple background:1.4), (flat dark grey background:1.5), #242422 background, no shadow, no text, '
  + 'monster, creature, fantasy spirit, glowing eyes, cyberpunk';
/** For a look that is just a real animal: the 'monster, cyberpunk' tags in STYLE turn a bison into machinery (the maintainer, 2026-11-20: "why not just ask for a bison?"). */
export const PLAIN_STYLE = 'masterpiece, best quality, anime style, flat color, cel shading, thick black outline, lineart, (top-down view:1.5), (from directly above:1.5), '
  + '(aerial view:1.3), solo, (simple background:1.4), (flat dark grey background:1.5), #242422 background, no shadow, no text';
export const NEGATIVE = 'side view, front view, from the side, from below, standing, gradient, vignette, shadow, drop shadow, cast shadow, floor, ground, reflection, scenery, landscape, detailed background, '
  + 'realistic, 3d, photo, painterly, blurry, lowres, text, watermark, signature, logo, border, frame, white outline, halo, multiple views, '
  + 'splayed legs, sprawling, legs spread, spread eagle, distorted anatomy, bad anatomy, 2girls, 1girl, 1boy, human, person, cropped, out of frame';

/** Slug → { name, look }. Keys mirror SPIRIT_TYPES (tests/spirit-art.test.mjs keeps them equal). */
export const LOOKS = {
  'earth-elemental':   { name: 'Earth Elemental',   look: 'seen from above: a hulking stone golem with broad boulder shoulders and two heavy fists spread out, crystal veins and moss across its back, glowing amber eyes looking up' },
  'air-elemental':     { name: 'Air Elemental',     look: 'seen from above: a spiralling whirlwind with a pale vague face at its eye, arms of wind curling outward in a circular swirl, pale blue and white' },
  'fire-elemental':    { name: 'Fire Elemental',    look: 'seen from above: a spreading humanoid of roaring orange and yellow flame, arms and legs splayed outward like a starfish, ember sparks scattering, white-hot eyes' },
  'water-elemental':   { name: 'Water Elemental',   look: 'seen from above: a splash-shaped being of clear blue water spreading in all directions with a ripple ring around a face-like swirl, foam and bubbles' },
  'forest-spirit':     { name: 'Forest Spirit',     look: 'seen from above: an antlered woodland guardian, wide antlers and bark shoulders, arms of twisted branches with leaves, mushrooms and vines on its back, green glowing eyes' },
  'river-spirit':      { name: 'River Spirit',      look: 'seen from above: a coiled serpentine water being curled in a loop, river-current body with fish scales and reeds, a finned head with silver eyes' },
  'wind-spirit':       { name: 'Wind Spirit',       look: 'seen from above: a bird-like airy being with two wide feathered wings fully spread, wings of streaming wind ribbons and leaves, a sharp pale head' },
  'field-spirit':      { name: 'Field Spirit',      look: 'seen from above: a scarecrow-like harvest guardian with a hare-eared head, arms spread of wheat stalks and straw, wildflowers and poppies, warm golden glow' },
  'city-spirit':       { name: 'City Spirit',       look: 'seen from above: a gaunt hooded urban being woven from concrete, rebar, wires and neon tubes, long clawed arms spread, steam and smog, glowing magenta eyes' },
  'desert-spirit':     { name: 'Desert Spirit',     look: 'seen from above: a lithe jackal-headed being of sand and bone, arms spread, billowing sand cloak around it, burning orange eyes' },
  'mountain-spirit':   { name: 'Mountain Spirit',   look: 'seen from above: a massive rugged stone giant, broad craggy granite shoulders with snowy caps, icicle beard, fists spread wide, pale blue eyes' },
  'swamp-spirit':      { name: 'Swamp Spirit',      look: 'seen from above: a sprawling bog creature of dark mud and rotting roots, hanging moss, lily pads and will-o-wisp lights, limbs splayed, yellow-green eyes' },
  'sea-spirit':        { name: 'Sea Spirit',        look: 'seen from above: a vast ocean being, a sprawling body of dark deep-blue waves with a whirlpool at its centre, long tentacle-like arms of surging water, foam crests, a pair of pale glowing eyes in the swirl' },
  'lake-spirit':       { name: 'Lake Spirit',       look: 'seen from above: a single graceful water creature with a long finned body of blue-green water curled in a gentle circle, lily pads on its back, a serene face, silver eyes' },
  'storm-spirit':      { name: 'Storm Spirit',      look: 'seen from above: a churning thundercloud being, dark grey swirling cloud body with crackling yellow lightning arcs spreading outward like limbs, bright white eyes' },
  'mist-spirit':       { name: 'Mist Spirit',       look: 'seen from above: a drifting ghostly fog being, soft pale grey wisps curling outward from a hazy hooded face, thin tendrils of vapour, faint cold blue glowing eyes' },
  'prairie-spirit':    { name: 'Prairie Spirit',    look: 'animal, bison, buffalo, brown fur, big hump, curved horns, glowing amber eyes', plain: true },
  'hearth-spirit':     { name: 'Hearth Spirit',     look: 'seen from above: a small domestic household guardian with a round body of warm embers and glowing coals ringed by a circle of bricks, tiny arms holding a lit candle and a broom, soft orange glow, friendly bright eyes' },
};

export const batch = () => Object.entries(LOOKS).map(([slug, { name, look, plain }]) =>
  ({ slug, name, look, prompt: plain ? `${look}, ${PLAIN_STYLE}` : `${name}, ${look}, ${STYLE}`, negative: NEGATIVE }));

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const file = resolve(process.argv[2] ?? join(ROOT, 'dist', 'spirit-art', 'prompts.json'));
  const list = batch();
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(list, null, 2));
  console.log(`${list.length} spirit pictures to draw → ${file}`);
}
