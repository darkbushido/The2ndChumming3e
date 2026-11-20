/**
 * A summoned spirit's picture — 0.9.1.
 *
 * Spirits were created with `systems/sr3e/assets/spirits/<category>.svg`: the wrong system id and a folder that
 * never existed, so every summoned spirit showed a broken image. They now get `spiritIcon(category)`; this repoints
 * a spirit already standing in a world.
 *
 * ⚠ **This OVERWRITES, and argues for it:** a picture changes only while it starts with the dead
 * `systems/sr3e/assets/spirits/` prefix. A GM's own art is never touched. The category is the spirit's
 * `spiritCategory` flag, else read from the old file name. Idempotent. Pure — no Foundry.
 */
import { spiritIcon } from './item-icons.mjs';

export const DEAD_PREFIX = 'systems/sr3e/assets/spirits/';
const isDead = p => typeof p === 'string' && p.startsWith(DEAD_PREFIX);

export const SpiritArt = {
  fixActor(actor) {
    const img = actor?.img, tex = actor?.prototypeToken?.texture?.src;
    const deadImg = isDead(img), deadTex = !actor?.isToken && isDead(tex);
    if (!deadImg && !deadTex) return null;
    const category = actor?.flags?.The2ndChumming3e?.spiritCategory
      ?? String(deadImg ? img : tex).slice(DEAD_PREFIX.length).replace(/\.svg$/, '');
    const to = spiritIcon(category);
    const delta = {};
    if (deadImg) delta.img = to;
    if (deadTex) delta['prototypeToken.texture.src'] = to;
    return delta;
  },
};
