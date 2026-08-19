/**
 * A pool spend must be ROLLED, not merely paid for.
 *
 * `spendCombatPool` / `spendAstralPool` / `spendHackingPool` / `spendSpellPool` all clamp to
 * what the actor actually has and **return what was deducted**. Discarding that return and
 * building the dice from the requested number means a character rolls dice they do not own:
 * ask for 4 with 2 left, and you spend 2 and roll 4. Nothing on screen says so.
 *
 * ⚠ This is the ENFORCEMENT of a rule, not a tidiness concern. SR3 p.122, on striking several
 * opponents in one Combat Phase:
 *
 *   "Dice from the Combat Pool must be allocated separately for each attack."
 *
 * The clamp is what makes that true — a second attack can only draw on what the first left
 * behind. Throw the return away and the pool is effectively refilled for every attack.
 *
 * Six sites did exactly that, found 2026-08-19: both corners of melee, both corners of astral,
 * and three Matrix roll paths. CLAUDE.md had already documented the identical bug in
 * cybercombat ("built its dice from the raw input while clamping the spend"), which is the
 * best evidence that a prose warning does not hold this line on its own.
 *
 * ⚠ SOURCE-LEVEL TEST, deliberately. Catching this behaviourally needs a live actor with a
 * partly-spent pool per call site; the defect is a shape in the source, so the source is what
 * is checked. Same reasoning as `explosion-carry.test.mjs`.
 */
import fs from 'node:fs';

export const name = 'pool-spend';

const FILES = [
  'SR3EActor.js',
  'SR3EItem.js',
];

const SOURCES = FILES.map(f => ({
  file: f,
  text: fs.readFileSync(new URL(`../scripts/documents/${f}`, import.meta.url), 'utf8'),
}));

/** Every `spend*Pool(` call, with the line it sits on. */
function spendCalls(text) {
  const out = [];
  text.split('\n').forEach((line, i) => {
    for (const m of line.matchAll(/\bspend(Combat|Astral|Hacking|Spell)Pool\s*\(/g)) {
      out.push({ line: i + 1, pool: m[1], text: line.trim() });
    }
  });
  return out;
}

/**
 * Does this call USE its return value? A call whose result is assigned, returned, compared or
 * passed onward is fine; a bare `await x.spendYPool(n);` statement is the bug.
 */
function usesReturn(line) {
  const t = line.trim();
  // Bare statement: optionally guarded by `if (...)`, then `await <expr>.spendXPool(...);`
  const bare = /^(?:if\s*\([^)]*\)\s*)?await\s+[\w?.$[\]]+\.spend(?:Combat|Astral|Hacking|Spell)Pool\s*\([^;]*\)\s*;?$/;
  return !bare.test(t);
}

/**
 * Known-safe bare calls. Each needs a reason. An entry added without one defeats the test.
 */
const EXEMPT = new Map([
  // (empty — every current call site uses its return)
]);

export async function run(t) {
  const all = SOURCES.flatMap(s => spendCalls(s.text).map(c => ({ ...c, file: s.file })));

  t.ok('the scan found pool-spend call sites at all', all.length > 0);

  const discarded = all.filter(c => !usesReturn(c.text) && !EXEMPT.has(`${c.file}:${c.line}`));

  t.is(discarded.length
      ? 'pool spends whose clamped return is DISCARDED (dice would be rolled that were never '
        + `paid for): ${discarded.map(c => `${c.file}:${c.line}`).join(', ')} — capture the `
        + 'return and build the dice from it, or add it to EXEMPT with a reason'
      : 'every pool spend uses the number it was actually granted',
    discarded.length, 0);

  // ── The helpers must still return the deduction, or the rule above is vacuous ──
  const actor = SOURCES.find(s => s.file === 'SR3EActor.js').text;
  for (const pool of ['Combat', 'Astral', 'Hacking', 'Spell']) {
    const re = new RegExp(`async\\s+spend${pool}Pool\\s*\\([^)]*\\)\\s*\\{[\\s\\S]{0,1200}?\\n  \\}`, 'm');
    const body = actor.match(re)?.[0];
    t.ok(`spend${pool}Pool exists`, !!body);
    if (body) t.ok(`spend${pool}Pool returns a value, so callers have something to roll`,
      /\breturn\b/.test(body));
  }

  // ── The six that were wrong, named individually ────────────────────────────
  // Melee and astral rebuild their pools from the grant; a regression that reverts one of
  // them puts the requested number back into the dice.
  t.ok('melee builds its dice from what was spent, not what was typed',
    /atkPool\s*=\s*Math\.max\(1,\s*atkSkillDice\s*\+\s*atkSpent\)/.test(actor)
    && /defPool\s*=\s*Math\.max\(1,\s*defSkillDice\s*\+\s*defSpent\)/.test(actor));
  t.ok('astral captures both grants',
    /atkAstralSpent\s*=/.test(actor) && /defAstralSpent\s*=/.test(actor));
  t.ok('the three Matrix paths build their pool from the grant',
    /ccRating\s*\+\s*ccSpent/.test(actor)
    && /hackRating\s*\+\s*hackSpent/.test(actor)
    && /skillRating\s*\+\s*npSpent/.test(actor));

  // ── And the player is told, rather than silently rolling fewer dice ─────────
  t.ok('a short grant warns the user',
    /only \$\{atkSpent\} of \$\{atkCombatPool\}/.test(actor));
}
