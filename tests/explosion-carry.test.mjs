/**
 * The explosion carry payload must preserve every field `_postWaveCard` reads off `state`.
 *
 * ⚠ This is a SOURCE-LEVEL INVARIANT test, not a behaviour test, and that is deliberate.
 *
 * `_postWaveCard` builds one chat card per wave of a Rule-of-Six roll. When dice explode it
 * rebuilds the whole roll state into a button payload **by hand**, listing ~70 fields one at
 * a time, and the next wave reconstructs `state` from that payload. A field that is read on
 * the final wave but missing from the carry is therefore silently `undefined` for any roll
 * whose dice exploded — and the failure is invisible: a branch guarded on it just never runs.
 *
 * An audit on 2026-08-19 found SEVEN such fields, all live:
 *
 *   ammoType             APDS/Flechette armour effects dropped from the soak
 *   isDodgeRoll          } no dodge result AND no soak button — the attack simply
 *   dodgePayload         } stops, with no Damage Resistance Test and no error
 *   isSpellDefenseRoll   } the caster's successes are never reduced, and
 *   spellDefenseContext  } `_pendingDefenseCard` is never set, so no resist/drain card
 *   escapeContext        the entire Escape Artist result card
 *   fallingContext       the entire Falling damage card
 *
 * ⚠ WHY THEY SURVIVED is the part worth understanding before trusting play-testing to find
 * the next one. `_rollWave` sets `needsExplosion = face === 6 && !success`, so a 6 at TN 6 or
 * lower is ALREADY a success and never explodes. Every one of these needs **TN ≥ 7** to
 * reach. Dodge was hardcoded at TN 4 and so was literally unreachable until the p.113
 * modifiers landed the same day. Falling (TN = metres fallen) and Escape Artist
 * (TN = restraint rating) reach it easily; Spell Defense needs a Force 7+ spell.
 *
 * Hand-listing ~70 fields across three sites with no check is the actual defect. This test is
 * the check. It parses the source rather than exercising the code, because exercising it
 * would need a live roll per field at TN ≥ 7 — far more machinery, catching less.
 */
import fs from 'node:fs';

export const name = 'explosion-carry';

const SRC   = fs.readFileSync(new URL('../scripts/documents/SR3EActor.js', import.meta.url), 'utf8');
const LINES = SRC.split('\n');

/** Extract the balanced `{ … }` literal beginning at (1-based) `startLine`. */
function objectAt(startLine) {
  let depth = 0, started = false;
  const out = [];
  for (let i = startLine - 1; i < LINES.length; i++) {
    for (const ch of LINES[i]) {
      if (ch === '{') { depth++; started = true; }
      else if (ch === '}') depth--;
    }
    out.push(LINES[i]);
    if (started && depth <= 0) break;
  }
  return out.join('\n');
}

/** Property names declared in an object literal — both `k: v` and shorthand `k,`. */
function declaredKeys(text) {
  const keys = new Set();
  for (const raw of text.split('\n')) {
    if (raw.trim().startsWith('//')) continue;
    const line = raw.replace(/\/\/.*$/, '');
    for (const m of line.matchAll(/(?:^|[{,])\s*([A-Za-z_$][\w$]*)\s*(?=[,:}])/g)) keys.add(m[1]);
  }
  return keys;
}

/** The body of `_postWaveCard`. */
function postWaveCardBody() {
  const start = LINES.findIndex(l => /async\s+_postWaveCard\s*\(/.test(l)) + 1;
  if (!start) throw new Error('_postWaveCard not found — has it been renamed?');
  let depth = 0, started = false;
  for (let i = start - 1; i < LINES.length; i++) {
    for (const ch of LINES[i]) {
      if (ch === '{') { depth++; started = true; }
      else if (ch === '}') depth--;
    }
    if (started && depth <= 0) return LINES.slice(start - 1, i + 1).join('\n');
  }
  throw new Error('_postWaveCard body did not close');
}

/** The explosion carry payload, found by its own comment rather than by line number. */
function carryPayload() {
  const marker = LINES.findIndex(l => /Explosion button with full state payload/.test(l));
  if (marker < 0) throw new Error('explosion carry payload marker not found');
  const start = LINES.findIndex((l, i) => i > marker && /JSON\.stringify\(\{/.test(l)) + 1;
  if (start <= 0) throw new Error('explosion carry payload not found after its marker');
  return objectAt(start);
}

/**
 * Fields read off `state` but deliberately NOT carried. Every entry needs a reason — an
 * unexplained addition here defeats the whole test.
 */
const EXEMPT = new Map([
  // Scratch: written in the staging branches and consumed by the postSpellDefenseCard block
  // further down the SAME _postWaveCard call. It never crosses a wave.
  ['_pendingDefenseCard', 'same-call scratch, never crosses a wave'],
  // A physical-dice roll forces `allDone = true` on its first wave, so it has no second wave
  // to carry anything into and these two cannot be lost.
  ['physicalDice',        'physical rolls never explode (allDone forced true)'],
  ['physicalSuccesses',   'physical rolls never explode (allDone forced true)'],
]);

/**
 * Names that only ever appear destructured out of a CARRIED context object
 * (`const { netPower, level } = state.fallingContext`), so a regex sees them as reads of
 * `state` when they are not. Each maps to the context that actually carries it.
 */
const NESTED = new Map([
  ['basePower',     'barrierContext'],
  ['currentBR',     'barrierContext'],
  ['material',      'barrierContext'],
  ['baseTime',      'escapeContext'],
  ['restraintName', 'escapeContext'],
  ['netPower',      'fallingContext'],
  ['level',         'fallingContext'],
]);

export async function run(t) {
  const body  = postWaveCardBody();
  const carry = declaredKeys(carryPayload());

  // Every `state.foo`, plus anything destructured straight off `state` itself.
  const reads = new Set([...body.matchAll(/\bstate\.([A-Za-z_$][\w$]*)/g)].map(m => m[1]));
  for (const m of body.matchAll(/const\s*\{([^}]+)\}\s*=\s*state\s*[;,)]/g)) {
    for (const part of m[1].split(',')) {
      const nm = part.split(/[:=]/)[0].trim();
      if (nm) reads.add(nm);
    }
  }

  t.ok('the carry payload was located and is substantial', carry.size > 40);
  t.ok('_postWaveCard reads a substantial number of state fields', reads.size > 40);

  // ── The invariant ─────────────────────────────────────────────────────────
  const missing = [...reads]
    .filter(k => !carry.has(k) && !EXEMPT.has(k) && !NESTED.has(k))
    .sort();

  t.is(missing.length
      ? `fields read off state but NOT carried through explosions: ${missing.join(', ')} — add `
        + 'them to the payload, or to EXEMPT/NESTED in this file with a reason'
      : 'every field read off state survives an explosion wave',
    missing.length, 0);

  // ── The seven the audit found, named so a regression says which ───────────
  for (const k of ['ammoType', 'isDodgeRoll', 'dodgePayload', 'isSpellDefenseRoll',
                   'spellDefenseContext', 'escapeContext', 'fallingContext']) {
    t.ok(`${k} is carried through an explosion wave`, carry.has(k));
  }

  // The p.113 dodge modifiers ride this chain too — they are what made the dodge branch
  // reachable at all, by letting a dodge TN exceed 6.
  t.ok('burstRounds is carried',   carry.has('burstRounds'));
  t.ok('shotgunSpread is carried', carry.has('shotgunSpread'));

  // ── The exemptions must stay TRUE, not merely stay listed ─────────────────
  t.ok('_pendingDefenseCard is still written and read within one call',
    /state\._pendingDefenseCard\s*=/.test(body) && /if\s*\(state\._pendingDefenseCard\)/.test(body));
  t.ok('physical rolls still short-circuit allDone, which is what makes them exempt',
    /allDone\s*=\s*state\.physicalDice\s*\|\|/.test(body));

  // ── And the reason the whole class hid for so long ────────────────────────
  t.ok('a 6 still only explodes when it is not already a success — the TN ≥ 7 gate',
    /needsExplosion\s*=\s*face === 6 && !success/.test(SRC));

  // ── Nested names must still be nested, or the exemption is a lie ──────────
  for (const [nm, ctx] of NESTED) {
    t.ok(`${nm} is still destructured out of ${ctx}, not read off state directly`,
      !new RegExp(`\\bstate\\.${nm}\\b`).test(body) && carry.has(ctx));
  }
}
