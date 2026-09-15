/**
 * Every soak card is posted with the fields the soak card reads.
 *
 * `_postSoakCard` destructures `stagedPower` / `stagedLevel`. The Adrenal Pump's crash (M&M p.63)
 * passed `power` / `level` instead, so its card came up with no Power and a NaN target number —
 * the crash could not be resisted from the card at all. Nothing failed loudly: `Math.max(2, NaN)`
 * is NaN, and the card rendered. This checks every literal call site, source-level, because the
 * card cannot be built without Foundry.
 */
import { readFileSync } from 'node:fs';

export const name = 'soak-payload';

const src = readFileSync(new URL('../scripts/documents/SR3EActor.js', import.meta.url), 'utf8');

/** The object literal passed to each `_postSoakCard({ … })` call, brace-matched. */
function literalCalls(text) {
  const out = [];
  for (const m of text.matchAll(/_postSoakCard\(\{/g)) {
    let depth = 0, i = m.index + m[0].length - 1;
    const start = i;
    for (; i < text.length; i++) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}' && --depth === 0) break;
    }
    out.push(text.slice(start, i + 1));
  }
  return out;
}

export async function run(t) {
  const calls = literalCalls(src);
  t.ok('found the literal soak-card calls', calls.length >= 2, `${calls.length} calls`);
  t.eq('every one passes stagedPower and stagedLevel (not power / level)',
    calls.filter(c => !/\bstagedPower\s*:/.test(c) || !/\bstagedLevel\s*:/.test(c)), []);

  const crash = src.slice(src.indexOf('static async _postAugmentationCrash'), src.indexOf('static async _commitAttributeBoost'));
  t.ok('the Adrenal Pump crash is resisted without armour — it is not an attack', /noArmor:\s*true/.test(crash));

  const card = src.slice(src.indexOf('  async _postSoakCard(payload)'));
  t.ok('noArmor zeroes both armour ratings on the card',
    /if \(payload\.noArmor\) \{\s*ballistic = 0;\s*impact\s*= 0;/.test(card));
}
