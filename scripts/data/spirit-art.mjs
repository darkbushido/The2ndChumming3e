/**
 * A summoned spirit's picture — 0.9.1; the type portraits (styles/spirits) upgrade our own neon defaults — 0.9.2.
 *
 * Spirits were created with `systems/sr3e/assets/spirits/<category>.svg`: the wrong system id and a folder that
 * never existed, so every summoned spirit showed a broken image. They now get `spiritIcon(category)`; this repoints
 * a spirit already standing in a world.
 *
 * ⚠ **This OVERWRITES, and argues for it:** a picture changes only while it starts with the dead
 * `systems/sr3e/assets/spirits/` prefix. A GM's own art is never touched. The category is the spirit's
 * `spiritCategory` flag, else read from the old file name. Idempotent. Pure — no Foundry.
 */
import { spiritIcon, spiritCategoryIcon, SPIRIT_ICON_OF, SPIRIT_FALLBACK } from './item-icons.mjs';

export const DEAD_PREFIX = 'systems/sr3e/assets/spirits/';
const isDead = p => typeof p === 'string' && p.startsWith(DEAD_PREFIX);
/** One of OUR neon defaults (never a GM's art) — these may be upgraded to the type's portrait. */
const OURS = new Set([...Object.keys(SPIRIT_ICON_OF), SPIRIT_FALLBACK].map(c => spiritCategoryIcon(c)));
const isOurs = p => OURS.has(p);

export const SpiritArt = {
  fixActor(actor) {
    const img = actor?.img, tex = actor?.prototypeToken?.texture?.src;
    const flags = actor?.flags?.The2ndChumming3e ?? {};
    const deadImg = isDead(img), deadTex = !actor?.isToken && isDead(tex);
    const category = flags.spiritCategory
      ?? (deadImg || deadTex ? String(deadImg ? img : tex).slice(DEAD_PREFIX.length).replace(/\.svg$/, '') : undefined);
    const to = spiritIcon(category, flags.spiritTypeKey);
    // Portraits: one of our neon defaults — and only that — moves to its type's drawn picture, when there is one.
    const portrait = flags.isSpirit && to !== spiritCategoryIcon(category);
    const delta = {};
    if (deadImg || (portrait && isOurs(img))) delta.img = to;
    if (deadTex || (portrait && !actor?.isToken && isOurs(tex))) delta['prototypeToken.texture.src'] = to;
    return Object.keys(delta).length ? delta : null;
  },
};
