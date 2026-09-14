---
title: Healing
parent: Rules
nav_order: 4
---

# Healing
{: .no_toc }

What happens after someone gets hurt, step by step and in the order you do
it at the table: who rolls, what they roll, and what it achieves. All rules
are from the core rulebook, *(SR3 p.125–129)* and *(SR3 p.162, p.193–194)*.

1. TOC
{:toc}

{: .fixed }
> Original gist: "Healing Rules Reference".
> - **Stun**: TN is **2 plus your injury modifiers**, not 2 plus the number of
>   boxes filled. Recovering **one box** takes **60 minutes ÷ successes**. You
>   roll the **higher** of Body or Willpower; that's the rule, not a GM option.
> - **First aid**: TN is **4 / 6 / 8 / 10** by wound level. One success lowers
>   the wound **one Damage Level**, never more. It doesn't heal a box per
>   success, and there is no "capped by medkit rating".
> - **Heal / Treat**: TN is **10 − the patient's Essence**, not the number of
>   boxes filled. Each success heals **one box, up to the spell's Force**.
>   Heal has no +2 penalty after an hour.
> - **Natural healing** uses the Healing Table (TN 4 / 6 / 8 / 10), and the
>   base time is divided by your successes. The "nurse / hospital / DocWagon"
>   modifiers in the original were invented. The real ones are on the
>   Doctoring Table below.
> - The fourth level is **Deadly**, not "Lethal".

---

## Who's involved

| Role | Who they are | What they roll |
| :--- | :--- | :--- |
| **Patient** | The wounded character | **Body** (natural Body, no cyberware) for most healing tests; Body or Willpower for Stun |
| **Medic** | Anyone with **Biotech** skill, ideally with a **medkit** | **Biotech** for first aid and stabilizing |
| **Magician** | A spellcaster who knows **Heal** or **Treat** | **Sorcery** (+ Spell Pool), then **Willpower** for Drain |
| **Doctor** | Someone with a real medical degree, not just Biotech skill | Nothing; they give the patient the Doctoring Table modifiers |
| **GM** | | Judges conditions (bad, terrible), lifestyle, and interruptions |

Gear that matters: a **medkit** (first aid without one is +4 TN), a **trauma
patch** for a dying patient, and a **hospital** for intensive care.
*(SR3 p.128–129)*

---

## The sequence at a glance

| # | Step | When | Who rolls | Roll | Effect |
| :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | [Stabilize](#step-1-stabilize-a-dying-character) | Deadly wound, **right away** | Medic, then patient | Biotech vs **10**; if that fails, Body vs **10** | Stops the bleeding; heals nothing |
| 2 | [First aid](#step-2-first-aid) | Within **1 hour**, **before** any magic | Medic | Biotech vs **4 / 6 / 8** | Wound drops **one level** |
| 3 | [Magical healing](#step-3-magical-healing) | Treat within **1 hour**; Heal any time | Magician | Sorcery vs **10 − Essence** | Heals **1 box per success**, up to Force |
| 4 | [Deadly-wound aftermath](#step-4-deadly-wound-aftermath) | After a Deadly wound | Patient | Body vs **4**; 2D6 for Magic loss if Awakened | May lose an organ, limb or attribute point, or Magic |
| 5 | [Need a doctor?](#step-5-do-you-need-a-doctor) | After steps 2 and 3 | Patient | Body vs **2 / 4 / 6** | Decides whether you heal on your own |
| 6 | [Heal over time](#step-6-heal-over-time) | Each wound level, one at a time | Patient | Body vs **4 / 6 / 8 / 10** | Base time ÷ successes to drop one level |
| — | [Stun recovery](#stun-damage) | Any time you can rest | Patient | Body or Willpower vs **2** | 60 min ÷ successes per box |

**The order matters for two reasons.** First aid can't help once magical
healing has been applied, so do first aid first. And first aid and magic both
have to happen **before** the "need a doctor?" test. *(SR3 p.127, p.129)*

---

## Step 0: The wound  *(SR3 p.125–126)*

Physical and Stun each have **10 boxes**. The **Light / Moderate / Serious /
Deadly** thresholds are **1 / 3 / 6 / 10** boxes, and they add **+1 / +2 /
+3** to target numbers and **−1 / −2 / −3** to Initiative. At 10 boxes you're
unconscious.

- **Stun** past 10 boxes spills into the Physical track, and you're knocked
  out.
- **Physical** past 10 boxes: you can survive overflow up to your **Body**
  rating. Until someone stabilizes you, you take **another box every (Body)
  Combat Turns**. Past Body in overflow, you're dead.

See [Actions & Combat](../combat/#wounds-and-the-condition-monitor) for the
full table.

---

## Step 1: Stabilize a dying character  *(SR3 p.129)*
{: #step-1-stabilize-a-dying-character }

**Only for a Deadly wound.** First aid can **stabilize** a Deadly wound but
can't reduce it.

1. **Medic** rolls **Biotech against TN 10**, with the modifiers from the
   First Aid Table in step 2. **One success** stabilizes the patient: the
   extra box every (Body) Combat Turns stops.
2. If that fails, the **patient** rolls **natural Body against TN 10**. With a
   success they stabilize on their own. If that fails too, they die once the
   damage exceeds their Body rating.
3. **Trauma patch** (optional, last resort): the patient gets an **extra Body
   Test** to stabilize, against TN **4 + the rating of any dermal armor or
   blood filters**. Success stops the overflow damage. It makes permanent
   damage more likely: +2 to the step 4 test.
4. When **professional help** arrives, such as a hospital or a DocWagon
   paramedic with better Biotech, it makes **another Biotech Test and Body
   Test**.

---

## Step 2: First aid  *(SR3 p.129)*
{: #step-2-first-aid }

- **Who:** the medic, rolling **Biotech**.
- **When:** within **one hour** of the injury, and **before** any magical
  healing. Once magic has been used on the wound, first aid can't help.
- **Effect:** **at least one success lowers the wound one Damage Level.** It
  never drops it by more than one level, and it only helps **Physical**
  damage.
- **Time:** treatment time ÷ successes, in **uninterrupted Combat Turns**. A
  serious interruption means starting over.

### First Aid Table  *(SR3 p.129)*

| Damage level | TN | Treatment time |
| :--- | :---: | :---: |
| Light | 4 | 5 Combat Turns |
| Moderate | 6 | 10 Combat Turns |
| Serious | 8 | 15 Combat Turns |
| Deadly | 10 | Special: stabilize only (step 1) |

| Situation | Modifier |
| :--- | :---: |
| Patient is Awakened | +2 |
| Bad conditions (a city street) | +1 |
| Terrible conditions (the same street in a firefight in the rain) | +3 |
| Patient's Body 1–3 / 4–6 / 7–9 / 10+ | +0 / −1 / −2 / −3 |
| No medkit available | +4 |

{: .note }
> **Awakened patients.** The +2 isn't optional. If a medic treats an Awakened
> patient *without* applying it (using gear and drugs that risk their magic),
> the patient rolls **2D6**; on a result **at or below** their Magic, they
> permanently lose 1 Magic. *(SR3 p.129)*

---

## Step 3: Magical healing  *(SR3 p.127, p.193–194)*
{: #step-3-magical-healing }

- **Who:** a magician who knows the spell, **touching** the patient. *(SR3
  p.193)*
- **Roll:** **Sorcery** plus up to as many Spell Pool dice as Sorcery dice,
  against **TN 10 − the patient's Essence**. *(SR3 p.194; p.44)*

| Spell | Type | TN | When | Drain |
| :--- | :---: | :---: | :--- | :---: |
| **Treat** | Mana | 10 − Essence | Within **1 hour** of the injury | −1(Wound Level) |
| **Heal** | Mana | 10 − Essence | Any time | (Wound Level) |

- **Effect:** **each success heals one box** of Physical damage, **up to the
  spell's Force**. You can instead spend successes to divide the base time
  before the spell becomes permanent, or split them between the two. Treat
  becomes permanent in **half** the normal time. *(SR3 p.194)*
- **Drain:** Power = Force ÷ 2 (+0 for Heal, −1 for Treat). The **Damage
  Level** is the patient's wound level when the spell is cast. The magician
  resists with **Willpower**. *(SR3 p.162, p.194)*
- **Once only:** a character can be magically healed **once for a single set
  of injuries**. A successful Heal or Treat rules out further healing spells
  **and first aid**. *(SR3 p.127, p.194)*
- **Drain can't be healed by magic.** Physical damage from Drain heals only
  with rest and medical care. *(SR3 p.162)*

---

## Step 4: Deadly-wound aftermath  *(SR3 p.127–129)*
{: #step-4-deadly-wound-aftermath }

**Only after a Deadly wound.**

**Permanent damage.** The **patient** rolls **Body against TN 4**. Dermal
armor counts for this test, and use of a trauma patch adds +2. *(SR3
p.127–128)*

| Successes | Result |
| :---: | :--- |
| 0 | A vital organ or system is gravely damaged. The patient needs continuous care from someone with Biotech, the **whole healing time doubles**, and a transplant is needed. Roll 1D6 for the attribute permanently lost: 1 Body, 2 Strength, 3 Quickness, 4 Intelligence, 5 Willpower, 6 Reaction. |
| 1 | An eye or limb is lost and must be replaced, either natural or cyber. **Base healing time +50%**. Roll 1D6: 1 right arm, 2 left arm, 3 right leg, 4 left leg, 5 an ear, 6 an eye. |
| 2+ | No lasting damage. |

**Magic loss.** An **Awakened** patient with a Deadly wound rolls **2D6**. At
or below their Magic, they permanently lose 1 point. If the Deadly wound was
also treated without the +2 Awakened modifier, they roll **twice**. *(SR3
p.129)*

---

## Step 5: Do you need a doctor?  *(SR3 p.126–127)*
{: #step-5-do-you-need-a-doctor }

Once first aid and magic are done, the **patient** makes a **Body Test**
(natural Body, no cyberware) against the TN for their current wound:

| Wound level | TN |
| :--- | :---: |
| Light | 2 |
| Moderate | 4 |
| Serious | 6 |
| Deadly | Always needs medical attention |

- **Any successes:** you'll heal without medical attention.
- **No successes:** you won't heal at all until you get medical attention,
  meaning a doctor, clinic or hospital.

You can make this test any time, but doing it in combat costs your whole
next Combat Turn. *(SR3 p.126)*

---

## Step 6: Heal over time  *(SR3 p.127–128)*
{: #step-6-heal-over-time }

Physical damage heals **one Damage Level at a time**: Deadly to Serious,
Serious to Moderate, and so on. When a level heals, the track drops to the
**lowest box** of the next level. A Serious wound that heals to Moderate
leaves exactly 3 boxes filled.

**For each level:**

1. The **patient** rolls **Body** against the TN on the Healing Table below.
   Add Doctoring Table modifiers if a doctor is involved.
2. **Base time ÷ successes** = how long that level takes to heal. It can
   never be shorter than the **minimum time**.
3. When the level heals, repeat for the next level down.

### Healing Table  *(SR3 p.127)*

| Damage level | Base time | Minimum time | TN | Minimum lifestyle |
| :--- | :---: | :---: | :---: | :--- |
| Deadly | 30 days | 3 days | 10 | Hospitalized |
| Serious | 20 days | 2 days | 8 | High |
| Moderate | 10 days | 1 day | 6 | Middle |
| Light | 24 hours | 2 hours | 4 | Low |

If the patient can't support the minimum lifestyle while healing, the GM may
add modifiers. Lifestyle can be paid by the day: the monthly cost ÷ 30.
*(SR3 p.127)*

### Doctoring Table  *(SR3 p.128)*

Use this when a real doctor is looking after the patient.

| Situation | Modifier |
| :--- | :---: |
| Intensive care (hospital only) | −2 |
| Long-term magical care | −2 |
| *Conditions (apply only one):* | |
| Not in a hospital or clinic | +2 |
| Bad conditions | +3 |
| Terrible conditions | +4 |
| Patient is a magician | +2 |
| Patient's natural Body 1–3 / 4–6 / 7–9 / 10+ | +0 / −1 / −2 / −3 |
| Patient's natural Willpower 1–3 / 4–6 / 7–9 / 10+ | +0 / −1 / −2 / −3 |

### What it costs  *(SR3 p.128)*

| Service | Deadly | Serious | Moderate | Light |
| :--- | :---: | :---: | :---: | :---: |
| Paramedic first aid | 400¥ | 200¥ | 100¥ | 50¥ |
| Doctor's services, per day | 400¥ | 200¥ | 100¥ | 50¥ |

A hospitalization lifestyle is **500¥ a day**, including the doctor.
Intensive care, for Deadly wounds only, is **1,000¥ a day**.

---

## Stun damage  *(SR3 p.126)*
{: #stun-damage }

Stun runs on its own track and recovers much faster. **No medicine or known
spell helps**; you just rest.

1. The **patient** rolls **Body or Willpower, whichever is higher**, against
   **TN 2**, plus current Stun and Physical injury modifiers.
2. Recovering **one box** takes **60 minutes ÷ successes**. Erase the box,
   then roll again for the next one.
3. The patient must be **resting completely**. If they're interrupted, they
   start over, and the new roll can't beat the first one.

A character knocked out by Deadly Stun doesn't wake up until the Stun is
back down to **Serious**. Stim patches only mask Stun, at a price. *(SR3
p.126, p.305)*

---

## Worked example

Snot takes a **Serious** Physical wound (6 boxes) from a Predator.

1. **Stabilize**: not needed; it isn't Deadly.
2. **First aid, within the hour.** Teammate Doc has Biotech 4 and a medkit,
   and it's a city street (+1). The TN is 8 + 1 = **9**, less 1 for Snot's
   Body 5 = **8**. Doc gets 1 success: the wound drops to **Moderate** (3
   boxes). Treatment takes 15 ÷ 1 = 15 Combat Turns.
3. **Magic.** The team mage casts Treat, still within the hour, against 10 −
   Snot's Essence 6 = **TN 4**, and gets 2 successes. Two boxes heal, leaving
   **1 box: Light**. Drain is resisted at Moderate, Snot's wound level when
   the spell was cast. Nobody can use first aid or healing magic on this wound
   again.
4. **Aftermath**: not needed; it wasn't Deadly.
5. **Need a doctor?** Snot rolls Body 5 against **TN 2** for a Light wound
   and succeeds. He'll heal on his own.
6. **Heal over time.** Body 5 against **TN 4** gets 2 successes: 24 hours ÷ 2
   = **12 hours**, above the 2-hour minimum. He needs at least a Low
   lifestyle for that time.
