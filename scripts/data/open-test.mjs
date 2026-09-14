/**
 * Open Tests, rolled a wave at a time · *SR3 p.40*
 *
 * An Open Test has no target number: the highest single die is the result, and every 6 is rolled
 * again and added, as often as it keeps coming up 6. The Chase Scene's Driver Points rolled that
 * in a silent loop; now each wave of 6s is a 💥 click like every other roll (the maintainer,
 * 2026-09-14: "all explosions should be interactive").
 *
 * A die is `{ faces: number[], total: number, pending: boolean }` — pending while its last face is
 * a 6. Pure; `rng` returns a face 1-6.
 */

const d6 = () => Math.ceil(Math.random() * 6);

/** The first wave: one face per die. */
export function openTestFirstWave(pool, rng = d6) {
  return Array.from({ length: Math.max(1, pool | 0) }, () => {
    const face = rng();
    return { faces: [face], total: face, pending: face === 6 };
  });
}

/** Roll one more face on every pending die. Never mutates its input. */
export function openTestExplode(dice, rng = d6) {
  return dice.map(d => {
    if (!d.pending) return { ...d, faces: [...d.faces] };
    const face = rng();
    return { faces: [...d.faces, face], total: d.total + face, pending: face === 6 };
  });
}

export const openTestPending = dice => dice.filter(d => d.pending).length;

/** The result — the highest single die. Only final once nothing is pending. */
export const openTestHighest = dice => Math.max(0, ...dice.map(d => d.total));
