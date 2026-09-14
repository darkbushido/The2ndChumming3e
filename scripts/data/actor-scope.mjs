/**
 * Which actors a picker offers · F2 (reported in play, 2026-09-14: *"chunky salsa lists everything,
 * not just the actors on the scene"*).
 *
 * `sceneFirst(actors)` — for a list about what is happening NOW (a blast, a fall, a medic at the
 * patient's side, a target): the actors with a token on the scene; with none there (theatre of
 * the mind), everyone passed in. The target pickers already worked this way; this is their rule,
 * shared. Filter out templates (`game.sr3e.isLiveActor`) BEFORE calling it.
 *
 * Which scene: the drawn canvas when there is one (`getActiveTokens`, as the pickers always read
 * it); otherwise the viewed scene's, else the active scene's, token documents — a client that
 * draws no canvas still has a scene in play, and used to be offered the whole world.
 *
 * ⚠ Rosters are deliberately NOT scene-scoped — a vehicle's pilot and passengers, an agent's
 * operator, a chase, the healing patient picker (downtime care happens off the map).
 */
export function sceneFirst(actors, {
  ready = globalThis.canvas?.ready,
  scene = globalThis.game?.scenes?.viewed ?? globalThis.game?.scenes?.active ?? null,
} = {}) {
  let onScene;
  if (ready) onScene = actors.filter(a => a.getActiveTokens?.().length > 0);
  else if (scene?.tokens) {
    const ids = new Set([...scene.tokens].map(t => t.actorId));
    onScene = actors.filter(a => ids.has(a.id));
  } else return actors;
  return onScene.length ? onScene : actors;
}
