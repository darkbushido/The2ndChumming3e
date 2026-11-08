/**
 * 🎲 Matrix generator — two GM buttons in the Actors directory (TODO 128, rules in `data/matrix-generator.mjs`).
 *
 *   Generate Host      a host for play: its numbers, and (Defragged) a proposed IC set stocked in it.
 *   Test Scenario      the same, plus a decker already logged in, so the whole turn flow can be tried in one click.
 *
 * ⚠ **It proposes; the GM decides.** Every number is rolled by the pure module, shown in an editable dialog with a
 * 🎲 Re-roll, and only then created. Nothing is applied to an existing actor, and IC are left unassigned to Trigger
 * Steps on a play host (the book says "GMs may stock the sheaf however they like", MDF p.24) — only the test scenario
 * spreads them over the first steps so the sheaf can be activated at once.
 *
 * Both rulesets: the world's `matrixRuleset` decides which fields the dialog shows and which actor fields are written
 * (Defragged: rating, tier, Memory; Orthodox: security code and value, the five subsystems — SR3 p.205).
 */
import * as G from './data/matrix-generator.mjs';
import { defaultTopology } from './sheets/SR3EHostSheet.js';
import { actorRef } from './data/actor-ref.mjs';

const SYSTEM  = 'The2ndChumming3e';
const IC_PACK = `${SYSTEM}.sr3e-mdf-ic`;
const esc = s => foundry.utils.escapeHTML(String(s ?? ''));
const num = (el, d = 0) => { const n = parseInt(el?.value, 10); return Number.isFinite(n) ? n : d; };
const generatedFlag = kind => ({ [SYSTEM]: { generated: { kind, by: 'matrix-generator' } } });

const ruleset = () => { try { return game.settings.get(SYSTEM, 'matrixRuleset'); } catch { return 'defragged'; } };
const options = (list, selected) => list.map(v => `<option value="${esc(v)}"${v === selected ? ' selected' : ''}>${esc(v)}</option>`).join('');
const row = (label, inner) => `<label style="display:flex;align-items:center;gap:8px;margin:4px 0;"><span style="flex:0 0 150px">${label}</span>${inner}</label>`;

export class SR3EMatrixGenerator {

  /* ── dialogs ─────────────────────────────────────────────────────────────── */

  static openHost()     { return SR3EMatrixGenerator._open({ scenario: false }); }
  static openScenario() { return SR3EMatrixGenerator._open({ scenario: true }); }

  static async _open({ scenario }) {
    if (!game.user.isGM) return ui.notifications.warn('Only the GM can generate Matrix hosts.');
    const orthodox = ruleset() === 'orthodox';
    const d = orthodox
      ? G.rollOrthodoxHost({ difficulty: G.SUGGESTED_DIFFICULTY.Green, code: 'Green' })
      : G.rollDefraggedHost();
    const tier = d.securityTierName;

    const fields = orthodox ? `
      ${row('Security code', `<select id="gen-code">${options(G.ORTHODOX_CODES, d.orthodoxSecurityCode)}</select>`)}
      ${row('Intrusion difficulty', `<select id="gen-diff">${options(G.DIFFICULTIES, G.SUGGESTED_DIFFICULTY[d.orthodoxSecurityCode])}</select>`)}
      ${row('Security Value', `<input id="gen-sv" type="number" min="0" value="${d.orthodoxSecurityValue}" style="width:70px"/>`)}
      ${row('Subsystems', G.SUBSYSTEMS.map(s => `<span>${s[0].toUpperCase()}<input id="gen-sub-${s}" type="number" min="0" value="${d.orthodoxSubsystems[s]}" style="width:48px"/></span>`).join(' '))}
      <p style="font-size:11px;color:var(--sr-muted)">SR3 p.205 Host Rating Table. The book does not pair a code with a difficulty — Blue Easy, Green and Orange Average, Red Hard is a starting point.</p>
      ${scenario ? row('IC rating', '<input id="gen-icrating" type="number" min="1" value="5" style="width:70px"/>') : ''}`
    : `
      ${row('System Rating', `<input id="gen-rating" type="number" min="1" max="12" value="${d.systemRating}" style="width:70px"/>`)}
      ${row('Security tier', `<select id="gen-tier">${options(Object.keys(G.TIER_DATA), tier)}</select>`)}
      ${row('IC to stock', `<input id="gen-count" type="number" min="0" value="${G.suggestICCount(tier, d.systemRating)}" style="width:70px"/>`)}
      ${row('Mainframe Support', '<input id="gen-mainframe" type="checkbox"/>')}
      <p id="gen-note" style="font-size:11px;color:var(--sr-muted)">Memory is System Rating × 500 Mp (MDF p.24). Gray and Black IC need the Mainframe Support module — tick it if the proposal includes them.</p>`;

    let result = null;
    await foundry.applications.api.DialogV2.wait({
      window: { title: scenario ? '🎲 Matrix test scenario' : '🎲 Generate Matrix host' },
      content: `<div style="padding:6px 0">
        ${row('Host name', `<input id="gen-name" type="text" value="Generated Host" style="flex:1"/>`)}
        ${scenario ? row('Decker name', '<input id="gen-decker" type="text" value="Generated Decker" style="flex:1"/>') : ''}
        ${fields}
        <button type="button" id="gen-reroll" style="margin-top:6px">🎲 Re-roll</button>
      </div>`,
      buttons: [
        {
          label: scenario ? 'Create host, IC and decker' : 'Create host', action: 'create', default: true,
          callback: (_e, _b, dialog) => { result = SR3EMatrixGenerator._read(dialog.element, orthodox, scenario); },
        },
        { label: 'Cancel', action: 'cancel' },
      ],
      render: (_event, dialog) => SR3EMatrixGenerator._wireDialog(dialog, dialog.element, orthodox),
    });
    if (!result) return null;
    return SR3EMatrixGenerator.create(result, { scenario });
  }

  /** Live behaviour: a changed code/difficulty/rating/tier re-suggests what hangs off it; Re-roll fills fresh numbers. */
  static _wireDialog(app, html, orthodox) {
    const $ = s => html.querySelector(s);
    if (orthodox) {
      const reroll = () => {
        const h = G.rollOrthodoxHost({ difficulty: $('#gen-diff').value, code: $('#gen-code').value });
        $('#gen-sv').value = h.orthodoxSecurityValue;
        for (const s of G.SUBSYSTEMS) $(`#gen-sub-${s}`).value = h.orthodoxSubsystems[s];
      };
      $('#gen-code').addEventListener('change', () => { $('#gen-diff').value = G.SUGGESTED_DIFFICULTY[$('#gen-code').value]; reroll(); });
      $('#gen-diff').addEventListener('change', reroll);
      $('#gen-reroll').addEventListener('click', reroll);
      return;
    }
    const suggest = () => { $('#gen-count').value = G.suggestICCount($('#gen-tier').value, num($('#gen-rating'), 6)); };
    $('#gen-rating').addEventListener('change', () => { $('#gen-tier').value = G.suggestTier(num($('#gen-rating'), 6)); suggest(); });
    $('#gen-tier').addEventListener('change', suggest);
    $('#gen-reroll').addEventListener('click', () => {
      const h = G.rollDefraggedHost();
      $('#gen-rating').value = h.systemRating; $('#gen-tier').value = h.securityTierName; suggest();
    });
  }

  static _read(html, orthodox, scenario) {
    const $ = s => html.querySelector(s);
    const v = { orthodox, name: $('#gen-name').value.trim() || 'Generated Host', deckerName: scenario ? ($('#gen-decker').value.trim() || 'Generated Decker') : null };
    if (orthodox) {
      Object.assign(v, {
        orthodoxSecurityCode: $('#gen-code').value, orthodoxSecurityValue: num($('#gen-sv')),
        orthodoxSubsystems: Object.fromEntries(G.SUBSYSTEMS.map(s => [s, num($(`#gen-sub-${s}`))])),
        icRating: scenario ? Math.max(1, num($('#gen-icrating'), 5)) : 0,
      });
    } else {
      const h = G.rollDefraggedHost({ systemRating: num($('#gen-rating'), 6), tier: $('#gen-tier').value });
      Object.assign(v, h, { icCount: Math.max(0, num($('#gen-count'))), mainframeSupport: $('#gen-mainframe').checked });
    }
    return v;
  }

  /* ── creation ────────────────────────────────────────────────────────────── */

  /** Create what the dialog asked for. Returns `{ host, ic, decker }` (documents). GM only. */
  static async create(v, { scenario = false } = {}) {
    if (!game.user.isGM) return null;
    const host = v.orthodox ? await SR3EMatrixGenerator._orthodoxHost(v, scenario) : await SR3EMatrixGenerator._defraggedHost(v, scenario);
    const decker = scenario ? await SR3EMatrixGenerator._decker(host, v) : null;
    ui.notifications.info(`Generated ${host.name}${decker ? ` and ${decker.name}` : ''}.`);
    return { host, decker };
  }

  static async _defraggedHost(v, scenario) {
    const topo = defaultTopology(v.systemRating);
    const host = await Actor.create({
      name: v.name, type: 'host', flags: generatedFlag(scenario ? 'scenario-host' : 'host'),
      system: {
        systemRating: v.systemRating, securityTierName: v.securityTierName, securityTierColor: v.securityTierColor,
        securityTierThreshold: v.securityTierThreshold, mainframeSupport: v.mainframeSupport, memoryTotal: v.memoryTotal,
        nodes: topo.nodes, pathways: topo.pathways, triggerSteps: topo.triggerSteps,
      },
    });
    const plan = G.proposeIC({ tier: v.securityTierName, systemRating: v.systemRating, memoryTotal: v.memoryTotal, count: v.icCount });
    const stocked = [];
    for (const p of plan.ic) {
      const ic = await SR3EMatrixGenerator._icFromPack(p, host, v);
      if (ic) stocked.push({ actorId: actorRef(ic), name: ic.name, memoryRequired: p.memoryRequired, hidden: false });
    }
    const update = { 'system.stockedIC': stocked, 'system.memoryUsed': plan.used };
    if (scenario) {            // test scaffolding: one IC per step from TS 1, so the sheaf can be activated at once
      update['system.triggerSteps'] = topo.triggerSteps.map((s, i) => (stocked[i] ? { ...s, ic: [{ actorId: stocked[i].actorId, name: stocked[i].name }] } : s));
    }
    await host.update(update);
    if (plan.needsMainframe && !v.mainframeSupport) {
      ui.notifications.warn(`${host.name}: the stocked IC include Gray/Black, which need the Mainframe Support module (MDF p.24). Tick it on the host sheet.`);
    }
    return host;
  }

  /** One IC actor — copied from the `sr3e-mdf-ic` pack (damage, notes, art), at the host's rating, costing its Mp. */
  static async _icFromPack(p, host, v) {
    const pack = game.packs.get(IC_PACK);
    let data = null;
    if (pack) {
      const index = await pack.getIndex();
      const entry = index.find(i => i.name === p.name);
      const doc = entry ? await pack.getDocument(entry._id) : null;
      if (doc) { data = doc.toObject(); delete data._id; delete data._stats; }   // _stats.compendiumSource would flag it a template
    }
    data ??= { name: p.name, type: 'ic', system: { icType: p.name, grading: p.grading } };
    Object.assign(data.system, {
      rating: p.rating, systemRating: v.systemRating, memoryRequired: p.memoryRequired,
      hostSecurityTier: v.securityTierName, activeHostId: host.id, deployed: false,
    });
    data.flags = { ...(data.flags ?? {}), ...generatedFlag('ic') };
    return Actor.create(data);
  }

  static async _orthodoxHost(v, scenario) {
    const host = await Actor.create({
      name: v.name, type: 'host', flags: generatedFlag(scenario ? 'scenario-host' : 'host'),
      system: {
        orthodoxSecurityCode: v.orthodoxSecurityCode, orthodoxSecurityValue: v.orthodoxSecurityValue,
        orthodoxSubsystems: v.orthodoxSubsystems,
      },
    });
    if (scenario && v.icRating) {
      const ic = await Actor.create({
        name: 'Generated Probe', type: 'ic', flags: generatedFlag('ic'),
        system: { orthodoxIcType: 'Probe', rating: v.icRating, activeHostId: host.id, deployed: true },
      });
      if (ic) await host.update({ 'system.orthodoxActiveIC': [{ actorId: actorRef(ic), name: ic.name, icType: 'Probe', rating: v.icRating, alertRequired: 'any' }] });
    }
    return host;
  }

  /** A decker already logged in to `host`, in VR-Hot, with a deck (Defragged) or deck stats (Orthodox) and the skills. */
  static async _decker(host, v) {
    const attributes = { body: { base: 3 }, quickness: { base: 4 }, strength: { base: 3 }, charisma: { base: 3 }, intelligence: { base: 5 }, willpower: { base: 4 } };
    const skill = (name, rating) => ({ name, type: 'skill', system: { rating, linkedAttribute: 'intelligence' } });
    if (v.orthodox) {
      const decker = await Actor.create({
        name: v.deckerName, type: 'character', flags: generatedFlag('decker'),
        system: {
          attributes, matrixUserMode: 'VR-Hot',
          orthodoxDeck: { mccp: 6, masking: 4, sleazeRating: 0 },
          orthodoxRunState: { currentHostId: host.id, alertLevel: 'none' },
        },
      });
      await decker.createEmbeddedDocuments('Item', [skill('Computer', 6), skill('Cybercombat', 5)]);
      return decker;
    }
    const decker = await Actor.create({
      name: v.deckerName, type: 'character', flags: generatedFlag('decker'),
      system: { attributes, matrixUserMode: 'VR-Hot', activeHostId: host.id },
    });
    const [, , , deck] = await decker.createEmbeddedDocuments('Item', [
      skill('Computer', 5), skill('Cybercombat', 5), skill('Hacking', 5),
      { name: 'Generated Deck', type: 'cyberdeck', system: { attributes: { mpcp: { base: 6 }, firewall: { base: 2 }, response: { base: 1 } } } },
    ]);
    await decker.update({ 'system.equippedCyberdeck': deck.id });
    await host.update({
      'system.activeUsers': [...(host.system.activeUsers ?? []), {
        actorId: actorRef(decker), name: decker.name, iconType: 'icon', currentNodeId: null,
        hidden: false, linkLocked: false, marks: [], marksFalsified: false,
      }],
    });
    return decker;
  }
}
