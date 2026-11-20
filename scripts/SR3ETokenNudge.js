/**
 * Step a token a short way WITHOUT turning it · TODO 313 · SR3 p.124
 *
 * "Driven back about a metre" (a Knockdown Test with some successes but below the threshold) is a move, not a
 * turn — but dragging the token makes Foundry, and modules such as About Face, face it the way it moved. This
 * writes ONLY `x`/`y`. ⚠ Nothing here may name `rotation`: tests/token-nudge.test.mjs strips comments and
 * fails if it appears. The update carries `sr3eNudge: true` so a module that rotates on move can skip it;
 * core has no standard option that suppresses rotation, and none is invented here.
 *
 * Offer, never apply: a person opens the dialog, picks the direction and distance and confirms.
 * Geometry is the pure `scripts/data/token-nudge.mjs`.
 */
import { TokenNudge } from './data/token-nudge.mjs';
import { actorFrom } from './data/actor-ref.mjs';

export class SR3ETokenNudge {
  /** The TokenDocument on the viewed scene that stands for an actor (a token actor's own, else its first). */
  static tokenDocFor(actor) {
    if (!actor) return null;
    if (actor.isToken) return actor.token ?? null;
    return actor.getActiveTokens?.(true, true)?.[0] ?? null;
  }

  /** Centre of a token document in canvas pixels. */
  static centre(doc) {
    if (!doc) return null;
    const g = doc.parent?.grid?.size ?? canvas.scene?.grid?.size ?? 100;
    return { x: doc.x + (doc.width ?? 1) * g / 2, y: doc.y + (doc.height ?? 1) * g / 2 };
  }

  /**
   * Open the dialog for a token and, on Move, nudge it. Returns the destination, or null if cancelled.
   * @param {TokenDocument} doc
   * @param {{attackerRef?: string|null}} [opts]  the attacker (an actor ref) — enables "directly away"
   */
  static async open(doc, { attackerRef = null } = {}) {
    if (!doc) { ui.notifications?.warn('SR3E | That token is not on this scene.'); return null; }
    const scene = doc.parent ?? canvas.scene;
    const grid = scene?.grid ?? {};
    const attackerDoc = attackerRef ? SR3ETokenNudge.tokenDocFor(actorFrom(attackerRef)) : null;
    const attacker = attackerDoc && attackerDoc.id !== doc.id ? SR3ETokenNudge.centre(attackerDoc) : null;
    const target = SR3ETokenNudge.centre(doc);
    const canAway = !!TokenNudge.awayVector(attacker, target);
    const units = grid.units || 'm';

    const opts = [
      ...(canAway ? [`<option value="${TokenNudge.AWAY}" selected>Directly away from the attacker</option>`] : []),
      ...Object.entries(TokenNudge.COMPASS).map(([k, c], i) =>
        `<option value="${k}"${!canAway && i === 0 ? ' selected' : ''}>${c.label}</option>`),
    ].join('');

    let pick = null;
    await foundry.applications.api.DialogV2.wait({
      window: { title: `${doc.name} — step` },
      content: `
        <p style="font-size:12px;margin-bottom:8px">Moves the token only — it is <strong>not turned</strong>.</p>
        <label style="display:block;font-size:12px;margin-bottom:6px">Direction
          <select id="nudge-dir" style="width:100%;margin-top:4px">${opts}</select></label>
        <label style="display:block;font-size:12px">Distance (${units})
          <input id="nudge-dist" type="number" min="0" step="any" value="1" style="width:100%;margin-top:4px"/></label>
        <p id="nudge-note" style="font-size:10px;color:var(--sr-dim);margin-top:6px"></p>`,
      buttons: [
        { label: 'Move', action: 'go', default: true,
          callback: (_e, _b, dlg) => {
            const el = dlg.element;
            pick = { dir: el.querySelector('#nudge-dir')?.value, dist: Number(el.querySelector('#nudge-dist')?.value) };
          } },
        { label: 'Cancel', action: 'cancel' },
      ],
      render: (_event, dlg) => {
        const el = dlg.element;
        const dist = el.querySelector('#nudge-dist');
        const note = el.querySelector('#nudge-note');
        const refresh = () => {
          const px = TokenNudge.pixels(Number(dist?.value), grid.distance, grid.size);
          note.textContent = px > 0 ? `${Math.round(px)} px on the canvas` : 'Enter a distance above 0.';
        };
        dist?.addEventListener('input', refresh);
        dist?.addEventListener('keydown', e => { if (e.key === 'Enter') e.preventDefault(); });
        refresh();
      },
    });
    if (!pick) return null;

    const vector = TokenNudge.vectorFor(pick.dir, { attacker, target });
    return SR3ETokenNudge.move(doc, vector, pick.dist);
  }

  /** Move a token by a vector × distance. x/y only; routed through the GM if the user cannot update it. */
  static async move(doc, vector, distance) {
    const grid = (doc.parent ?? canvas.scene)?.grid ?? {};
    const dest = TokenNudge.destination({ x: doc.x, y: doc.y }, vector, distance,
      { gridDistance: grid.distance, gridSize: grid.size, snap: !!grid.size && grid.type !== 0 });
    if (!dest) { ui.notifications?.warn('SR3E | No direction or distance to move.'); return null; }
    if (doc.canUserModify(game.user, 'update')) {
      await doc.update({ x: dest.x, y: dest.y }, { animate: true, sr3eNudge: true });
    } else {
      await game.sr3e.SR3EQuery.asGM('sr3e.token.nudge', { uuid: doc.uuid, x: dest.x, y: dest.y });
    }
    return dest;
  }
}
