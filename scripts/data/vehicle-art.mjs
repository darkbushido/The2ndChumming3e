/**
 * Vehicle token art for copies already in a world — the migration half of TODO 257.
 *
 * ⚠ **Foundry embeds actors from a pack, it doesn't link them**, so pointing the packs at the drawn art
 * (`tools/build-vehicle-art.mjs`) changes nothing for a vehicle a GM dragged into the world before.
 * `fixActor` gives such a copy the pack's picture and token.
 *
 * ⚠ **This overwrites, and argues for itself:** a field changes only while it still holds a STOCK value
 * (blank, Foundry's mystery man, the old type textures, or one of the drawn files). A picture someone
 * chose is never touched. The token's SIZE changes only while it is still Foundry's 1 × 1 default
 * (or already ours) — a GM who sized the token keeps that size. Idempotent.
 *
 * Vehicles only — the maintainer, 2026-10-24: *"for vehicals yes"*. Drones keep their old picture.
 * Matched by NAME (`VEHICLE_ART`, generated from the reviewed map), so a renamed copy is left alone.
 *
 * Pure — no Foundry.
 */
import { VEHICLE_ART } from './vehicle-art-map.mjs';

export const IMG_DIR = 'systems/The2ndChumming3e/styles/textures/vehicles';
/** The type textures every vehicle and drone carried before the drawn art existed. */
export const STOCK_IMAGES = ['vehicles-default.webp', 'drone-default.webp']
  .map(f => `systems/The2ndChumming3e/styles/textures/${f}`);
const MYSTERY_MAN = 'icons/svg/mystery-man.svg';

/** A picture nobody chose: blank, a type texture, Foundry's default token, or one of the drawn files. */
export const isStock = img => !img || img === MYSTERY_MAN || STOCK_IMAGES.includes(img) || img.startsWith(`${IMG_DIR}/`);

export class VehicleArt {
  /** The drawn art for a vehicle name: `{ img, width, height }`, or null. */
  static artFor(name) {
    const a = VEHICLE_ART[name];
    return a ? { img: `${IMG_DIR}/${a[0]}`, width: a[1], height: a[2] } : null;
  }

  /**
   * An update delta giving an owned vehicle its drawn art, or null.
   * An unlinked token's actor (`isToken`) gets the picture only — its token lives on the scene.
   */
  static fixActor(actor) {
    if (actor?.type !== 'vehicle' || actor.system?.vehicleType === 'drone') return null;
    const art = VehicleArt.artFor(actor.name);
    if (!art) return null;
    const delta = {};
    if (isStock(actor.img) && actor.img !== art.img) delta.img = art.img;
    if (!actor.isToken) {
      const tok = actor.prototypeToken ?? {};
      if (isStock(tok.texture?.src)) {
        if (tok.texture?.src !== art.img) delta['prototypeToken.texture.src'] = art.img;
        const w = tok.width ?? 1, h = tok.height ?? 1;
        const defaultSize = (w === 1 && h === 1) || (w === art.width && h === art.height);
        if (defaultSize && w !== art.width) delta['prototypeToken.width'] = art.width;
        if (defaultSize && h !== art.height) delta['prototypeToken.height'] = art.height;
      }
    }
    return Object.keys(delta).length ? delta : null;
  }
}
