const DEFAULT_COLORS = ['#c8a040', '#b33a3a', '#3a7ab3', '#4a9d5f', '#9b59b6', '#cc7a2e'];

// Polar→cartesian helper for building SVG pie-wedge arc paths.
function _polarPoint(cx, cy, r, angleDeg) {
  const rad = (angleDeg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function _wedgePath(cx, cy, r, startDeg, endDeg) {
  const start = _polarPoint(cx, cy, r, endDeg);
  const end   = _polarPoint(cx, cy, r, startDeg);
  const large = (endDeg - startDeg) > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y} Z`;
}

function _buildDial(clock, { interactive }) {
  const r = 32, cx = 36, cy = 36;
  const segDeg = 360 / clock.segments;
  let wedges = '';
  for (let i = 0; i < clock.segments; i++) {
    const filled = i < clock.filled;
    const d = _wedgePath(cx, cy, r, i * segDeg, (i + 1) * segDeg);
    wedges += `<path d="${d}" class="sr3e-clock-wedge${filled ? ' filled' : ''}"
      style="${filled ? `fill:${clock.color}` : ''}"
      ${interactive ? `data-clock-id="${clock.id}" data-wedge="${i + 1}"` : ''}></path>`;
  }
  return `<svg class="sr3e-clock-dial" viewBox="0 0 72 72" width="72" height="72">${wedges}</svg>`;
}

export class SR3EClocks extends foundry.applications.api.ApplicationV2 {

  static DEFAULT_OPTIONS = {
    id:      'sr3e-clocks',
    classes: ['sr3e', 'sr3e-clocks-app'],
    tag:     'div',
    window:  { title: 'Threat Clocks', resizable: true },
    position:{ width: 420, height: 560 },
    resizable: true,
  };

  static instance = null;

  static open() {
    if (!SR3EClocks.instance || SR3EClocks.instance.rendered === false) {
      SR3EClocks.instance = new SR3EClocks();
    }
    SR3EClocks.instance.render(true);
    return SR3EClocks.instance;
  }

  static refresh() {
    if (SR3EClocks.instance?.rendered) SR3EClocks.instance.render();
  }

  _clocks() {
    return game.settings.get('The2ndChumming3e', 'clocks') ?? [];
  }

  async _save(clocks) {
    await game.settings.set('The2ndChumming3e', 'clocks', clocks);
  }

  async _renderHTML(_ctx, _opts) {
    const div = document.createElement('div');
    div.style.cssText = 'flex:1;min-height:0;display:flex;flex-direction:column;overflow:auto;';
    div.innerHTML = this._build();
    return div;
  }

  _replaceHTML(result, content, _opts) {
    content.replaceChildren(result);
  }

  _build() {
    const isGM    = game.user.isGM;
    const clocks  = this._clocks();
    const visible = isGM ? clocks : clocks.filter(c => c.visible);

    if (!visible.length) {
      return `<div class="sr3e-clocks-inner">
        ${isGM ? `<button id="clock-add" type="button" class="btn-add">+ Add Clock</button>` : ''}
        <p class="sr3e-clocks-empty">No active threats.</p>
      </div>`;
    }

    return `<div class="sr3e-clocks-inner">
      ${isGM ? `<button id="clock-add" type="button" class="btn-add">+ Add Clock</button>` : ''}
      <div class="sr3e-clocks-list">
        ${visible.map(c => isGM ? this._buildGMRow(c) : this._buildPlayerRow(c)).join('')}
      </div>
    </div>`;
  }

  _buildGMRow(c) {
    return `<div class="sr3e-clock-row" data-clock-id="${c.id}">
      ${_buildDial(c, { interactive: true })}
      <div class="sr3e-clock-fields">
        <input type="text" class="clock-name" data-clock-id="${c.id}" value="${c.name}" placeholder="Clock name"/>
        <div class="sr3e-clock-controls">
          <label>Segments <input type="number" class="clock-segments" data-clock-id="${c.id}" value="${c.segments}" min="2" max="12"/></label>
          <button type="button" class="clock-step" data-clock-id="${c.id}" data-delta="-1">−</button>
          <span class="clock-fill-count">${c.filled}/${c.segments}</span>
          <button type="button" class="clock-step" data-clock-id="${c.id}" data-delta="1">+</button>
          <input type="color" class="clock-color" data-clock-id="${c.id}" value="${c.color}"/>
          <label class="clock-visible-label">
            <input type="checkbox" class="clock-visible" data-clock-id="${c.id}" ${c.visible ? 'checked' : ''}/> Visible to players
          </label>
          <button type="button" class="clock-delete" data-clock-id="${c.id}">🗑</button>
        </div>
      </div>
    </div>`;
  }

  _buildPlayerRow(c) {
    return `<div class="sr3e-clock-row sr3e-clock-row-readonly">
      ${_buildDial(c, { interactive: false })}
      <div class="sr3e-clock-fields">
        <span class="clock-name-display">${c.name}</span>
        <span class="clock-fill-count">${c.filled}/${c.segments}</span>
      </div>
    </div>`;
  }

  _onRender(_ctx, _opts) {
    if (!game.user.isGM) return;
    const el = this.element;

    el.querySelector('#clock-add')?.addEventListener('click', () => this._addClock());

    el.querySelectorAll('.sr3e-clock-wedge').forEach(w => {
      w.addEventListener('click', ev => {
        const id     = ev.currentTarget.dataset.clockId;
        const target = parseInt(ev.currentTarget.dataset.wedge);
        this._setFilled(id, target);
      });
    });

    el.querySelectorAll('.clock-step').forEach(b => {
      b.addEventListener('click', ev => {
        const id    = ev.currentTarget.dataset.clockId;
        const delta = parseInt(ev.currentTarget.dataset.delta);
        const clock = this._clocks().find(c => c.id === id);
        if (clock) this._setFilled(id, clock.filled + delta);
      });
    });

    el.querySelectorAll('.clock-name').forEach(i => {
      i.addEventListener('change', ev => this._patchClock(ev.currentTarget.dataset.clockId, { name: ev.currentTarget.value }));
    });

    el.querySelectorAll('.clock-segments').forEach(i => {
      i.addEventListener('change', ev => {
        const segments = Math.max(2, Math.min(12, parseInt(ev.currentTarget.value) || 2));
        this._patchClock(ev.currentTarget.dataset.clockId, { segments });
      });
    });

    el.querySelectorAll('.clock-color').forEach(i => {
      i.addEventListener('change', ev => this._patchClock(ev.currentTarget.dataset.clockId, { color: ev.currentTarget.value }));
    });

    el.querySelectorAll('.clock-visible').forEach(i => {
      i.addEventListener('change', ev => this._patchClock(ev.currentTarget.dataset.clockId, { visible: ev.currentTarget.checked }));
    });

    el.querySelectorAll('.clock-delete').forEach(b => {
      b.addEventListener('click', ev => {
        const id = ev.currentTarget.dataset.clockId;
        this._save(this._clocks().filter(c => c.id !== id));
      });
    });
  }

  // Mutators only write the setting — the `updateSetting` hook in sr3e.js re-renders
  // every open instance (including this one) once the write resolves.
  _addClock() {
    const clocks = this._clocks();
    clocks.push({
      id: foundry.utils.randomID(),
      name: `Threat ${clocks.length + 1}`,
      segments: 6,
      filled: 0,
      color: DEFAULT_COLORS[clocks.length % DEFAULT_COLORS.length],
      visible: false,
    });
    this._save(clocks);
  }

  _patchClock(id, patch) {
    const clocks = this._clocks();
    const clock  = clocks.find(c => c.id === id);
    if (!clock) return;
    Object.assign(clock, patch);
    this._save(clocks);
  }

  _setFilled(id, value) {
    const clocks = this._clocks();
    const clock  = clocks.find(c => c.id === id);
    if (!clock) return;
    clock.filled = Math.max(0, Math.min(clock.segments, value));
    this._save(clocks);
  }
}
