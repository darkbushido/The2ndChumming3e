/**
 * Token nudge — the knockdown "driven back" move · TODO 311 · SR3 p.124.
 * The geometry is pure; the source-level checks pin what the Foundry side must never do.
 */
import { readFileSync } from 'node:fs';
const { TokenNudge } = await import('../scripts/data/token-nudge.mjs');

export const name = 'token-nudge';

const read = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const close = (a, b) => Math.abs(a - b) < 1e-9;

export async function run(t) {
  /* ── Compass: canvas +y is south ─────────────────────────────────────────────── */
  t.eq('north is up the screen (dy −1)', TokenNudge.compassVector('N'), { dx: 0, dy: -1 });
  t.eq('east is +x', TokenNudge.compassVector('E'), { dx: 1, dy: 0 });
  t.eq('south is +y', TokenNudge.compassVector('S'), { dx: 0, dy: 1 });
  t.is('eight directions', Object.keys(TokenNudge.COMPASS).length, 8);
  const ne = TokenNudge.compassVector('NE');
  t.ok('a diagonal is a unit vector', close(Math.hypot(ne.dx, ne.dy), 1) && ne.dx > 0 && ne.dy < 0);
  t.is('an unknown key has no vector', TokenNudge.compassVector('up'), null);

  /* ── Away from the attacker ─────────────────────────────────────────────────── */
  const away = TokenNudge.awayVector({ x: 100, y: 100 }, { x: 300, y: 100 });
  t.eq('target east of the attacker → pushed east', away, { dx: 1, dy: 0 });
  const awayN = TokenNudge.awayVector({ x: 100, y: 300 }, { x: 100, y: 100 });
  t.eq('target north of the attacker → pushed north', awayN, { dx: 0, dy: -1 });
  const awayD = TokenNudge.awayVector({ x: 0, y: 0 }, { x: 30, y: 40 });
  t.ok('an angled push is normalised', close(awayD.dx, 0.6) && close(awayD.dy, 0.8));
  t.is('the same spot has no direction', TokenNudge.awayVector({ x: 5, y: 5 }, { x: 5, y: 5 }), null);
  t.is('no attacker, no direction', TokenNudge.awayVector(null, { x: 5, y: 5 }), null);
  t.eq('vectorFor("away") uses both centres',
    TokenNudge.vectorFor('away', { attacker: { x: 0, y: 0 }, target: { x: -10, y: 0 } }), { dx: -1, dy: 0 });
  t.eq('vectorFor a compass key ignores the tokens', TokenNudge.vectorFor('W', {}), { dx: -1, dy: 0 });

  /* ── Metres → pixels ────────────────────────────────────────────────────────── */
  t.is('1 m on a 2 m / 100 px grid is 50 px', TokenNudge.pixels(1, 2, 100), 50);
  t.is('1 m on a 1 m / 100 px grid is 100 px', TokenNudge.pixels(1, 1, 100), 100);
  t.is('no distance → 0', TokenNudge.pixels(0, 1, 100), 0);
  t.is('a bad grid → 0', TokenNudge.pixels(1, 0, 100), 0);

  /* ── Snapping ───────────────────────────────────────────────────────────────── */
  t.eq('an orthogonal push is unchanged', TokenNudge.snapDelta(100, 0, 100), { dx: 100, dy: 0 });
  t.eq('a diagonal 0.707-square push lands on one diagonal square', TokenNudge.snapDelta(70.7, -70.7, 100), { dx: 100, dy: -100 });
  t.eq('a push that would snap to nothing keeps its raw offset', TokenNudge.snapDelta(20, 10, 100), { dx: 20, dy: 10 });
  t.eq('a gridless scene is not snapped', TokenNudge.snapDelta(13, 7, 0), { dx: 13, dy: 7 });

  /* ── Destination ────────────────────────────────────────────────────────────── */
  const grid = { gridDistance: 1, gridSize: 100 };
  t.eq('1 m east of (200,300) is (300,300)', TokenNudge.destination({ x: 200, y: 300 }, { dx: 1, dy: 0 }, 1, grid), { x: 300, y: 300 });
  t.eq('1 m north', TokenNudge.destination({ x: 200, y: 300 }, { dx: 0, dy: -1 }, 1, grid), { x: 200, y: 200 });
  t.eq('2 m on a 1 m grid goes two squares', TokenNudge.destination({ x: 0, y: 0 }, { dx: 0, dy: 1 }, 2, grid), { x: 0, y: 200 });
  t.is('no vector → no move', TokenNudge.destination({ x: 0, y: 0 }, null, 1, grid), null);
  t.is('zero distance → no move', TokenNudge.destination({ x: 0, y: 0 }, { dx: 1, dy: 0 }, 0, grid), null);
  const dest = TokenNudge.destination({ x: 0, y: 0 }, { dx: 1, dy: 0 }, 1, grid);
  t.eq('the result is x and y only — never a rotation', Object.keys(dest).sort(), ['x', 'y']);

  /* ── Source-level: the Foundry side ─────────────────────────────────────────── */
  const strip = s => s.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
  const nudge = read('scripts/SR3ETokenNudge.js');
  t.ok('the nudge never writes rotation', !/rotation/.test(strip(nudge)));
  t.ok('the move updates x/y only', /\{\s*x:\s*dest\.x,\s*y:\s*dest\.y\s*\}/.test(nudge));
  t.ok('a move the user cannot make goes through sr3e.token.nudge', /asGM\('sr3e\.token\.nudge'/.test(nudge));
  const q = read('scripts/SR3EQuery.js');
  t.ok('the GM verb is registered and GM-asserted',
    /CONFIG\.queries\['sr3e\.token\.nudge'\][\s\S]{0,400}assertActiveGM/.test(q));
  const hooks = read('scripts/sr3e.js');
  t.ok('the push-back button is permission-gated with _mine and the one-shot guard',
    /\.sr-pushback-btn[\s\S]{0,400}_checkBtn\(btn, mid, 'pushback', i\)[\s\S]{0,400}_mine\(/.test(hooks)
    && /_claimBtn\(btn, mid, 'pushback', i\)/.test(hooks));
  const actor = read('scripts/documents/SR3EActor.js');
  t.ok('the staggered knockdown card offers the button', /sr-pushback-btn/.test(actor));
  t.ok('the Token HUD gets a Step 1 m control', /sr3e-nudge-hud/.test(hooks));
}
