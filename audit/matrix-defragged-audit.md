# *The Matrix Defragged v2* — audit · TODO 119

**Audited 2026-09-16** against `Shadowrun 3e - The Matrix Defragged v2.pdf` (Brinoceros, rev. 22 May
2024). The PDF has a real text layer, so every quotation below was extracted with `pdftotext -layout`,
not transcribed by hand. Page numbers are the book's own `{>> N <<}` markers.

Until now CLAUDE.md's *Matrix rules (Matrix Defragged v2)* section carried a standing warning that it
**could not be audited at all** because the book was not in the library. It is, and this is that audit.
That warning can come down; what replaces it is the list below.

---

## Summary

| | |
|---|---|
| Rules checked | 14 |
| ✅ Agree with the book | 8 |
| 📘 CLAUDE.md wrong, code right | 3 |
| 🔴 Code wrong — **fixed here** | 2 |
| ❓ Cannot be read from the text layer | 1 |
| Raised as new work | TODO 128 (Overwatch on a crash, and Suppression) |

---

## ✅ Confirmed — the book says what we say

1. **System Rating** — *"All Matrix enabled devices have a System Rating, which determines the TN for
   users attempting to take action against a host or its assets. System Ratings range between 1-12, but
   can be higher. Most hosts are assigned a System Rating by the GM, while cyberdecks and other devices
   use their MPCP Rating or Device Rating respectively."* (p.12)
2. **The seven Security Tiers and their thresholds** — Ivory 0, Blue 1, Green 2, Orange 3, Red 4, Black
   5, Ultraviolet 6, with the descriptions we carry (p.11-12). `tests/tables.test.mjs` asserted these
   against CLAUDE.md and said outright that this was **not** independent verification; it is now.
3. **Hacking Pool** — *"Intelligence + (MPCP Rating /3 rounded down)"* (p.10).
4. **Sys/Sec** — *"Taken together, the System Rating and Security Tier can be referred to as Sys/Sec"*
   (p.12).
5. **The hacking procedure** — roll Hacking + Hacking Pool against the host's System Rating; compare the
   successes to the Security Threshold; *"A tie goes in favor of the hacker."* Failure accrues a point of
   Overwatch (p.22). Our "≥ the threshold succeeds" is that tie rule stated the other way round.
6. **Overwatch is 10 boxes and the tenth is Convergence** (p.22-23), which dumps the user with Dumpshock,
   hands meta-data to GOD/the DemiGOD and can send a team to their coordinates (p.23).
7. **IC and agent initiative by the host's Security Tier** — *"Ivory = Agent's Rating · Blue = 1d6 +
   Agent's Rating · Green = 2d6 · Orange = 3d6 · Red+ = 4d6"*, and *"Firewall = Host/Device's Security
   Threshold"* (p.35). Both match, including Red/Black/Ultraviolet sharing 4d6.
8. **Sys/Sec modifiers** — hardlined −2, Tortoise +2, real-time meat-world communication +1 (p.14).
   ⚠ The table has a **fourth row we do not carry**: *"Circumstantial modifiers such as Matrix noise,
   jamming, or wound modifiers — ±1-4."* Added to CLAUDE.md.

## 📘 CLAUDE.md was wrong; the code was right

These three were documentation defects. The code already did what the book says, so nothing shipped
wrong — but CLAUDE.md is read as the specification, so each would have been built to eventually.

| # | CLAUDE.md said | The book (p.26) | The code |
|---|---|---|---|
| 1 | attacker rolls *"vs TN = target's System Rating"* | *"against a base target number 4, modified as appropriate"* | TN 4 ✅ |
| 2 | defender rolls *"vs same TN"* (i.e. System Rating) | *"against a base target number 4"* | TN 4 ✅ |
| 3 | resist *"Body (physical) or System Rating (Matrix entity) vs Power"* | *"Roll the target icon's System Rating (or MPCP) against a target number equal to the attack's Power, minus the target's Security Threshold or Firewall (which act as armor)"* | MPCP / Rating, with the firewall carried as armour ✅ |

CLAUDE.md is corrected, with the book's wording quoted in place.

## 🔴 Code divergences — both fixed on `feature/0-6-rules`

### 1. Dumpshock was Moderate; the book says **Serious**

> "The user must immediately resist **Serious** Biofeedback Damage. The attack's Power is equal to the
> System Rating of the grid or host that dumped the user. Tortoise and AR users are immune to this
> damage; VR-Cold users apply the damage to their Stun track; and VR-Hot users to Physical." — p.27

Three sites posted `(System Rating)M`. All three now post `S`. The Power, the track and the Tortoise/AR
immunity were already right.

### 2. TRM / AR / VR-Cold were forced to **1 initiative die**

> "Tortoise users rely on their **meat world Initiative**; cannot benefit from Response, but may use
> their Hacking Pool." — p.10, and the same sentence for AR and VR-Cold.

The book excludes **Response**, not the character's own initiative dice. `rollInitiative` set `dice = 1`
for all three modes, so a decker with wired reflexes lost the dice they had paid for the moment they
jacked in — in the mode the book describes as *meat world* initiative. Now `dice = derived.initiativeDice`
(floored at 1). VR-Hot is untouched: it is the one mode that *"may rely on their Matrix Initiative,
benefit from Response"*, and it already reads `reaction.base` + Response × 2 with 1 + Response dice.

⚠ **These two are bug fixes** under the maintainer's versioning rule, and would normally go straight to
`main`. They are on this branch because the audit that found them is, and because both touch the same
file as the audit's CLAUDE.md corrections. Nothing else on the branch depends on them.

## ❓ Unresolved — the Matrix Condition Monitor's thresholds

The **MATRIX CONDITION MONITOR** table (p.12) is a graphic. Its labels extract — `Icon | +1 TN | +2 TN |
+3 TN | +4 TN` — but the box counts under each label do not, and this machine has no PDF rasteriser, so
they could not be read.

What this establishes:
- The track is **10 boxes** and filling it crashes the icon (p.12, p.26: *"When an icon achieves 10 boxes
  of Overload Damage, it crashes"*). ✅ We say 10.
- There are **FOUR** penalty steps, +1 through +4. **We model three** (+1/+2/+3 at 3/6/8, crash at 10).

So our thresholds are unverified and our top step is probably missing. **For the maintainer:** p.12 of the
PDF, one look at the table. CLAUDE.md now carries a 🔴 marker saying exactly this.

## Also noted

- **Overwatch has a second trigger we do not implement** — *"Crashing an icon without Suppressing it"*
  (p.22), and the **Suppression** utility that avoids it (p.26) exists in the program list but nowhere in
  the code. Raised as **TODO 128**.
- **The Security Sheaf's Trigger Steps** (p.22) — ten steps, each able to hold IC that activate *"at the
  top of the next Combat Phase (-10 from an IC's Initiative for each phase that has already transpired)"*.
  The host sheet tracks Overwatch as a bare 10-box track with no steps and no stocking. Folded into
  TODO 128 as the smaller half.
- **Alerts** *"increase all target numbers utilizing the Hacking skill by +2"* (p.24) — implemented
  (`alertPenalty`). ✅
- **Cybercombat ties** — *"Ties are resolved in favor of the defender"* (p.26). Our card posts 🤝 Tie and
  deals no damage, which protects the defender but does not let them hit back. Whether the book means the
  defender *wins the exchange* (and so deals their damage, as a melee tie does for the attacker in SR3
  p.122) or merely that the attack fails is genuinely ambiguous. **Left as it is, for the maintainer.**
- **Book and page on the MDF packs** — 116 documents across the five `sr3e-mdf-*` packs, **28** with no
  `system.bookPage`. TODO 117 says all 116 lack one; that is stale, and the remaining 28 belong to it.
- **`tests/tables.test.mjs`'s caveat can be narrowed**: the tier table is now verified against the book.
  Its warning stays only for what this audit could not read — the Condition Monitor thresholds.
