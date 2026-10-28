/**
 * A firearm's printed Recoil Compensation — the RC column of the books' weapon tables · TODO 280. Pure — no Foundry.
 *
 * Found walking TESTING §77i (2026-10-27): the Cannon Companion's guns shipped with no `recoilMod` at all, so an Ares
 * Crusader (RC 2, its integral Rating 2 gas vent) fired with none. The upstream data (`rawdata/SRCG-*`) has no RC column,
 * so every figure here was read from the printed table, page cited per row:
 *
 *   - **Cannon Companion pp.116-118** (the weapon summary tables; each gun's own section table, its `bookPage`, prints the
 *     same column). The Ares Thunderer is the gunsmithing example, CC p.78: "3 points of recoil compensation".
 *   - **SR3 pp.278-279** — already filled in the core pack and its owned copies by the 0.7.0 corrections
 *     (`pack-corrections-0-7-0.mjs`); repeated here so the copies inside Mr. Johnson's contacts get them too.
 *
 * "2(3)" is `recoilMod` 2 and `recoilModIntegral` 3; "(1)" is no plain figure and a bracketed 1 — the bracketed figure is
 * the weapon's TOTAL with its integral accessories in use (SR3 p.276, `integral-rc.mjs`). A gun the table prints "—" for
 * is not listed.
 *
 * ⚠ **Fill blanks only.** `recoilMod` is set only while it is blank or 0 and `recoilModIntegral` only while it is blank: a
 * figure a GM typed is theirs. A row is pinned to the gun's `bookPage`, so a hand-made gun of the same name is left alone.
 * Idempotent.
 *
 * The Panther Assault Cannon prints "(2)/(1)": it comes with the bipod OR the strap and hip brace (CC p.26), and one field
 * cannot hold both, so it ships as two documents, "[Bipod]" (2) and "[Shoulder Strap Hip-Brace]" (1) — the maintainer,
 * 2026-10-27, for the one gun that does this. A world's copy of the OLD single Panther is taken to be the bipod version (the
 * maintainer, 2026-10-27: "assume its a bipod and update") — `oldPanther`. Not here: the TSS and France guns (out of scope).
 */
import { IntegralMods } from './integral-mods.mjs';

/** `[name, bookPage, rc, bracketed]` — `rc` 0 is the table's "—" outside the brackets, `bracketed` null where none. */
export const PRINTED_RC = [
  /* ── Cannon Companion p.116 · pistols ───────────────────────────────────── */
  ['Beretta Model 200ST',          'cc.18', 0, 1],
  ['Hammerli Model 610S',          'cc.18', 1, null],
  ['Ares Crusader',                'cc.18', 2, null],
  ['FN 5-7C',                      'cc.19', 1, null],
  ['Savalette Guardian',           'cc.19', 1, null],
  ['Savalette Guardian SL2',       'cc.19', 1, null],   // the pack's smartlink variant of the Guardian's row
  /* ── CC pp.116-117 · submachine guns and rifles ──────────────────────────── */
  ['Colt Cobra TZ-110',            'cc.21', 2, 3],
  ['Heckler & Koch MP-5 TX',       'cc.21', 2, null],
  ['Ingram SuperMach 100 Std',     'cc.21', 3, null],
  ['Ingram SuperMach 100 Ext',     'cc.21', 3, null],
  ['Sandler TMP',                  'cc.21', 0, 1],
  ['Barret Model 121',             'cc.21', 0, 2],
  ['Ares Alpha',                   'cc.22', 2, null],
  ['Ares HVAR',                    'cc.22', 3, null],
  ['Colt M22A2',                   'cc.22', 1, null],
  ['Heckler & Koch G12A3z',        'cc.22', 2, null],
  ['HK G38 Assault',               'cc.22', 2, null],
  ['HK G38 Carbine',               'cc.22', 2, null],
  ['HK G38 LMG',                   'cc.22', 2, null],
  ['Semopal vz/88V',               'cc.22', 2, null],
  ['Steyr AUG-CSL Assault',        'cc.22', 1, null],
  ['Steyr AUG-CSL Carbine',        'cc.22', 1, null],
  ['Steyr AUG-CSL SMG',            'cc.22', 1, null],
  ['Steyr AUG-CSL LMG',            'cc.22', 1, null],
  ['Franchi SPAS-22',              'cc.23', 0, 1],
  ['Ares Exec. Protector',         'cc.31', 0, 1],
  /* ── CC p.118 · heavy weapons ───────────────────────────────────────────── */
  ['Ares HV MP-LMG',               'cc.26', 3, null],
  ['Ares MP-LMG',                  'cc.26', 2, 3],
  ['FN MAG-5 MMG',                 'cc.26', 2, 8],
  ['Panther Assault Cannon [Bipod]',                    'cc.26', 0, 2],
  ['Panther Assault Cannon [Shoulder Strap Hip-Brace]', 'cc.26', 0, 1],
  /* ── CC p.78 · the gunsmithing example ──────────────────────────────────── */
  ['Ares Thunderer',               'cc.78', 3, null],
  /* ── SR3 pp.278-279 (the 0.7.0 corrections' rows) ───────────────────────── */
  ['Heckler & Koch HK227',         'sr3.278', 2, 3],
  ['Ingram Smartgun Mod. 20t',     'sr3.278', 2, 3],
  ['Ranger Arms SM-3',             'sr3.278', 2, null],
  ['FN HAR',                       'sr3.278', 2, null],
  ['AK-97 SMG/Carbine',            'sr3.278', 0, 1],
  ['Ceska Black Scorpion',         'sr3.278', 0, 1],
  ['Fichetti Security 500a',       'sr3.278', 0, 1],
  ['Heckler & Koch HK227-S',       'sr3.278', 0, 1],
  ['Uzi III',                      'sr3.278', 0, 1],
  ['Ingram Valiant',               'sr3.279', 3, null],
  ['Ultimax MMG',                  'sr3.279', 0, 6],
  ['RPK HMG',                      'sr3.279', 0, 6],
];

const blank = v => v === undefined || v === null || v === '';

/** The old single Panther, as shipped before the split (CC p.26), and what its bipod version is. */
export const OLD_PANTHER = {
  name: 'Panther Assault Cannon', bookPage: 'cc.26',
  accessories: 'Either: Folding Bipod(2RC) or Shoulder Strap & Hip Brace(1RC)',
  becomes: 'Panther Assault Cannon [Bipod]', bipod: 'Folding Bipod(2RC)', legality: '2-H',   // CC p.118
  notes: 'Cannon Companion p.26: the Panther comes with EITHER a detachable underbarrel folding bipod OR a shoulder strap and hip brace; the RC column (p.118) prints (2)/(1). One document per version (the maintainer, 2026-10-27, TODO 280).',
};

export const PrintedRC = {
  PRINTED_RC,

  /** The table row for this gun — its name AND its book page — or null. */
  rowFor(item) {
    if (item?.type !== 'firearm') return null;
    const page = String(item?.system?.bookPage ?? '').trim();
    return PRINTED_RC.find(([name, bookPage]) => name === item.name && bookPage === page) ?? null;
  },

  /**
   * A world's copy of the OLD single Panther becomes the bipod version — the maintainer, 2026-10-27: "assume its a bipod and
   * update". ⚠ **This RENAMES, and argues for it:** only a firearm still named exactly "Panther Assault Cannon" on CC p.26 —
   * the name no shipped document carries any more. Its accessories text and integral mods are rewritten only while the
   * text is still the shipped "Either: …" (a GM who typed their own keeps it); the bracketed RC, the notes and the Legality (2-H) fill blanks.
   * Mods a GM installed stay. Idempotent: once renamed it is no longer the old name.
   */
  oldPanther(item) {
    if (item?.type !== 'firearm' || item.name !== OLD_PANTHER.name) return null;
    const sys = item.system ?? {};
    if (String(sys.bookPage ?? '').trim() !== OLD_PANTHER.bookPage) return null;
    const delta = { name: OLD_PANTHER.becomes };
    if (blank(sys.recoilModIntegral)) delta['system.recoilModIntegral'] = 2;
    if (blank(sys.notes)) delta['system.notes'] = OLD_PANTHER.notes;
    // ⚠ The 0.9.0 legality fill looks up by NAME and runs first — the old name no longer has an entry, so fill it here.
    if (blank(sys.legality)) delta['system.legality'] = OLD_PANTHER.legality;
    if (sys.accessories === OLD_PANTHER.accessories) {
      delta['system.accessories'] = OLD_PANTHER.bipod;
      const own = (Array.isArray(sys.installed) ? sys.installed : []).filter(m => !IntegralMods.isIntegral(m));
      const fill = IntegralMods.fillDelta({ type: 'firearm', system: { accessories: OLD_PANTHER.bipod, installed: own } });
      delta['system.installed'] = fill?.['system.installed'] ?? own;
      delta['flags.The2ndChumming3e.integralDone'] = true;
    }
    return delta;
  },

  /** The fill for one gun: `{ 'system.recoilMod'?, 'system.recoilModIntegral'? }`, or null when nothing is blank. */
  fillDelta(item) {
    const old = PrintedRC.oldPanther(item);
    if (old) return old;
    const row = PrintedRC.rowFor(item);
    if (!row) return null;
    const [, , rc, bracketed] = row;
    const sys = item.system ?? {};
    const delta = {};
    if (rc > 0 && (blank(sys.recoilMod) || Number(sys.recoilMod) === 0)) delta['system.recoilMod'] = rc;
    if (bracketed != null && blank(sys.recoilModIntegral)) delta['system.recoilModIntegral'] = bracketed;
    return Object.keys(delta).length ? delta : null;
  },
};
