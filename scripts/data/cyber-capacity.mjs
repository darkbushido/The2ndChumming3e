/**
 * What a cyberlimb or a cybereye holds — capacity, built-in implants, their Essence and price · TODO 276 (the cyberlimb
 * slice; TODO 256's data). Pure — no Foundry.
 *
 * Built-in cyberware lives INSIDE its host (`system.installed`, scripts/data/item-mods.mjs) and still counts for the
 * character: Essence, attribute and skill bonuses, implant armour, vision — every reader goes through `flatten`.
 *
 * **Two kinds of host:**
 *   - **a cyberlimb** holds Equipment Capacity Units (ECU) — M&M p.37: obvious / synthetic, hand or foot 2/1, lower arm 4/2,
 *     upper arm 6/3, full arm 10/5, lower leg 8/4, upper leg 12/6, full leg 20/10, skull 2/1, torso 7/3; a Kid Stealth leg 10.
 *     Each built-in device takes its ECU (M&M p.36; `system.ecu`, else `ECU_TABLE`, else unknown — warned). Its Essence is the
 *     device's own (the Cyberlimb Mods copies carry the reduced figure, M&M p.36);
 *   - **an eye or ear replacement** holds `.5` Essence of modifications free (SR3 p.299, p.62's worked example): what its
 *     mods cost over that is Essence.
 *
 * **Grade — the maintainer, 2026-10-27:** *"it lowers the capacity but you have to match the grade for addons"* — for now the
 * capacity is reduced by the SAME factor as the grade's Essence (alpha ×.8, beta ×.6, delta ×.5), and a mod's own size by its
 * grade, so a grade-matched host holds as many mods as a standard one (*"a deltaware eye can fit the same number of mods as a
 * normal grade eye"*). ⚠ To audit against the books (M&M p.36 prints a 10 / 20 / 25% ECU cut). A mod of another grade than its
 * host is warned.
 *
 * **Price** (`builtInCost`): a device built into a limb costs ×4 its normal price while Man & Machine is off (SR3 p.303; the
 * maintainer's TODO 256 decision — its normal price with M&M on); a direct neural interface adds +50% and STACKS on that (SR3
 * p.303; the maintainer, 2026-10-27); a synthetic limb's +50% does NOT apply to built-in devices (the maintainer, 2026-10-27).
 * ⚠ M&M pp.36-39's cost column was not readable in the brief — those prices stay editable on the items.
 */
import { ItemMods } from './item-mods.mjs';

/** Grade → its Essence multiplier (SR3 p.298; the config's `cyberwareGradeEssence`). "Used" does not change it. */
export const GRADE = { standard: 1, basic: 1, alpha: 0.8, alphaware: 0.8, beta: 0.6, betaware: 0.6, delta: 0.5, deltaware: 0.5 };

/** A limb's ECU · M&M p.37 — `[match, obvious, synthetic]`, most specific first. */
export const LIMB_ECU = [
  [/kid\s*stealth/i,              10, 10],
  [/\b(hand|foot)\b/i,             2,  1],
  [/fore\s*arm|lower\s*arm/i,      4,  2],
  [/upper\s*arm/i,                 6,  3],
  [/fore\s*leg|lower\s*leg/i,      8,  4],
  [/upper\s*leg|thigh/i,          12,  6],
  [/cyber\s*arms?\b|\barms?\b/i,  10,  5],
  [/cyber\s*legs?\b|\blegs?\b/i,  20, 10],
  [/skull/i,                       2,  1],
  [/torso/i,                       7,  3],
];

/**
 * A built-in device's ECU · M&M p.36 — `[match, ecu]` (a function of the item for the rated ones). The GM's sizes for
 * anything else (M&M p.37): micro .5, small 1, medium 3, large 5 — typed into the item's ECU field.
 */
export const ECU_TABLE = [
  [/chemical\s*analy[sz]er/i, .5], [/custom\s*cyberdeck/i, 5], [/cyberdeck/i, 4], [/cyberfin/i, .25],
  [/hold-?\s*out/i, 1], [/light\s*pistol/i, 1.5], [/machine\s*pistol/i, 2], [/heavy\s*pistol/i, 2.5], [/\bsmg\b|submachine/i, 3],
  [/shotgun/i, 3.5], [/clip\s*port/i, .25], [/laser\s*sight/i, .25], [/silencer/i, .5], [/sound\s*suppress/i, 1],
  [/cybersquirt/i, 2], [/taser/i, 1], [/datajack/i, .5], [/fingertip/i, .25], [/foot\s*anchor/i, 4], [/gas\s*spectrometer/i, .5],
  [/retractable\s*hand\s*blade|hand\s*blade.*retract/i, 1], [/hand\s*blade/i, .5],
  [/retractable\s*(hand\s*)?razor|razor.*retract/i, .5], [/razor/i, .25],
  [/retractable\s*horn|horn.*retract/i, 1], [/horn/i, .5],
  [/hydraulic\s*jack/i, it => 4 + .5 * rating(it)], [/independent\s*cybereyes?.*pair|pair.*independent/i, 2], [/independent\s*cybereye/i, 1],
  [/magnetic\s*system/i, 3], [/orientation\s*system/i, 1], [/remote\s*control\s*deck/i, 5], [/climbing\s*claw/i, 1],
  [/shock\s*hand/i, 1], [/smartlink/i, .5], [/induction\s*pad/i, .25],
  [/retractable\s*spur|spur.*retract/i, 1], [/spur/i, .5],
  [/strength\s*enhancement/i, it => Math.max(0, rating(it) - 3)], [/subdermal\s*display|biomonitor/i, .5],
  [/tactical\s*computer/i, 4], [/venom\s*sac/i, .25],
  [/ablative/i, it => rating(it)], [/plating|armor:\s*(ballistic|impact)/i, it => .5 * Math.max(1, rating(it))],
  [/gyro\s*mount|gyromount/i, 4], [/cyberhand\s*safety|hand\s*safety/i, .5], [/cyber\s*holster/i, 4], [/cyberskate/i, 2],
  [/integrity/i, it => Math.max(1, rating(it))], [/direct\s*neural|\bdni\b/i, .25],
];

const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const rating = it => Math.max(0, num(it?.system?.rating));
const r2 = n => Math.round(n * 100) / 100;
const quarter = n => Math.round(n * 4) / 4;
const CYBER = ['cyberware', 'bioware'];

export const CyberCapacity = {
  GRADE, LIMB_ECU, ECU_TABLE,

  /** A grade's multiplier: 1 for Standard or anything unknown. */
  gradeMult(grade) {
    const key = String(grade ?? '').toLowerCase().replace(/\bused\b/g, '').trim();
    return GRADE[key] ?? 1;
  },

  /** A limb's printed ECU (M&M p.37), or null for anything that is not a limb. A "Pair" is two limbs. */
  limbEcu(item) {
    if (item?.type !== 'cyberware' || item?.system?.cyberwareCategory !== 'Cyberlimbs') return null;
    const name = String(item?.name ?? '');
    if (/enhancement|quickness|replacement|integrity|smartlink|induction|fingertip|built-?in|peg\s*leg|hook/i.test(name)) return null;
    const row = LIMB_ECU.find(([re]) => re.test(name));
    if (!row) return null;
    const each = /synthetic/i.test(name) ? row[2] : row[1];
    return /\bpair\b/i.test(name) ? each * 2 : each;
  },

  /** What a host holds: 'ecu' (a cyberlimb), 'essence' (an eye / ear replacement), or null (not a capacity host). */
  kind(item) {
    if (item?.type !== 'cyberware') return null;
    const cap = num(item?.system?.capacity);
    if (['Eyeware', 'Earware'].includes(item?.system?.cyberwareCategory) && cap > 0) return 'essence';
    if (CyberCapacity.limbEcu(item) !== null || (item?.system?.cyberwareCategory === 'Cyberlimbs' && cap > 0)) return 'ecu';
    return null;
  },

  /** Its capacity, after its grade (the ruling: the grade's Essence factor). ECU to a quarter, Essence to a hundredth. */
  capacity(item) {
    const kind = CyberCapacity.kind(item);
    if (!kind) return 0;
    const cap = num(item?.system?.capacity);
    const base = kind === 'ecu' ? (cap > 0 ? cap : (CyberCapacity.limbEcu(item) ?? 0)) : cap;
    const v = base * CyberCapacity.gradeMult(item?.system?.grade);
    return kind === 'ecu' ? quarter(v) : r2(v);
  },

  /** A device's ECU, after its grade: its own `ecu`, else the table (M&M p.36); null when unknown. */
  ecuOf(mod) {
    const own = mod?.system?.ecu;
    let base = Number.isFinite(own) && own !== null ? Number(own) : null;
    if (base === null) {
      const row = ECU_TABLE.find(([re]) => re.test(String(mod?.name ?? '')));
      if (row) base = typeof row[1] === 'function' ? row[1](mod) : row[1];
    }
    return base === null ? null : quarter(base * CyberCapacity.gradeMult(mod?.system?.grade));
  },

  /** A cyberware / bioware item's graded Essence (the caller's grading — SR3EActor.gradedEssenceCost). */
  _essence(item, graded) {
    return num(graded(item));
  },

  /** What the host's mods use: ECU (unknowns counted 0, listed) or graded Essence. `{ used, unknown: [names] }`. */
  used(host, graded) {
    const kind = CyberCapacity.kind(host);
    const mods = ItemMods.installed(host);
    if (kind === 'ecu') {
      const unknown = [];
      const used = mods.reduce((s, m) => { const e = CyberCapacity.ecuOf(m); if (e === null) unknown.push(m?.name ?? '?'); return s + (e ?? 0); }, 0);
      return { used: quarter(used), unknown };
    }
    if (kind === 'essence') {
      return { used: r2(mods.filter(m => CYBER.includes(m?.type)).reduce((s, m) => s + CyberCapacity._essence(m, graded), 0)), unknown: [] };
    }
    return { used: 0, unknown: [] };
  },

  /**
   * The Essence the host's built-in implants add to the character: an eye / ear replacement's mods over its capacity (SR3
   * p.299); a limb's (and any other host's) mods in full — their own reduced figures (M&M p.36). Recursive.
   */
  nestedEssence(host, graded) {
    const mods = ItemMods.installed(host).filter(m => CYBER.includes(m?.type));
    const own = mods.reduce((s, m) => s + CyberCapacity._essence(m, graded) + CyberCapacity.nestedEssence(m, graded), 0);
    if (CyberCapacity.kind(host) === 'essence') return r2(Math.max(0, own - CyberCapacity.capacity(host)));
    return r2(own);
  },

  /**
   * Every cyberware / bioware the character has, built-in implants included: the items themselves, then each one's
   * installed implants (recursively) as plain objects — `{ ...entry, id: 'host.entry', builtIn: true, hostName }` — so the
   * readers that sum bonuses, armour, vision and names see them. ⚠ Not for Essence: `nestedEssence` applies the capacity.
   */
  *flatten(items) {
    const walk = function* (host, depth) {
      if (depth > ItemMods.MAX_DEPTH) return;
      for (const m of ItemMods.installed(host)) {
        if (!CYBER.includes(m?.type)) continue;
        const flags = m.flags ?? {};
        yield { ...m, id: `${host.id ?? host._id ?? '?'}.${m._id}`, builtIn: true, hostName: host.name,
          getFlag: (scope, key) => flags?.[scope]?.[key] };
        yield* walk(m, depth + 1);
      }
    };
    for (const item of items ?? []) {
      yield item;
      if (item?.type === 'cyberware' || item?.type === 'bioware') yield* walk(item, 1);
    }
  },

  /** Warnings for installing `mod` into a capacity host — over capacity, unknown size, another grade. Never a refusal. */
  installWarnings(host, mod, graded) {
    const kind = CyberCapacity.kind(host);
    if (!kind) return [];
    const out = [];
    const after = { ...host, system: { ...(host.system ?? {}), installed: [...ItemMods.installed(host), mod] } };
    const cap = CyberCapacity.capacity(host);
    const { used, unknown } = CyberCapacity.used(after, graded);
    if (kind === 'ecu') {
      if (used > cap) out.push(`${host.name} holds ${cap} ECU; this makes ${used} (M&M p.37).`);
      if (unknown.includes(mod?.name ?? '?')) out.push(`${mod?.name}: its ECU is not known — set it on the item (M&M p.37: micro .5, small 1, medium 3, large 5).`);
    } else if (used > cap) {
      out.push(`${host.name} holds ${cap} Essence of mods free; this makes ${used} — the rest costs Essence (SR3 p.299).`);
    }
    const hg = CyberCapacity.gradeMult(host?.system?.grade), mg = CyberCapacity.gradeMult(mod?.system?.grade);
    if (CYBER.includes(mod?.type) && hg !== mg) {
      out.push(`${mod?.name} is ${mod?.system?.grade || 'Standard'} grade in a ${host?.system?.grade || 'Standard'} ${host.name} — built-in mods match their host's grade (the maintainer).`);
    }
    return out;
  },

  /**
   * A device built into a limb, priced (SR3 p.303): ×4 its normal cost while Man & Machine is off (`mmOn` false), its normal
   * cost with it on; +50% for a direct neural interface, stacking. A synthetic limb adds nothing here.
   */
  builtInCost(normalCost, { mmOn = false, dni = false } = {}) {
    const c = Math.max(0, num(normalCost)) * (mmOn ? 1 : 4);
    return Math.round(dni ? c * 1.5 : c);
  },
};
