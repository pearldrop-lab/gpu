/* ============================================================================
   09 · APP — camera cinematics, cutaway choreography, callout projection,
   pointer/keyboard/touch input, and the HUD.
   ========================================================================== */

const OVERVIEW = { target: [-1.0, 2.0, 0], yaw: 0.62, pitch: 0.44, dist: 62 };
const ORBIT_KEYS = new Set(['arrowleft', 'arrowright', 'arrowup', 'arrowdown', '+', '=', '-', '_']);

/* Which part belongs to which feature, for click-through on the model. */
const PART_FEATURE = {};
{
  const map = {
    die: [PART.DIE_A, PART.DIE_B, PART.BRIDGE, PART.INTERPOSER, PART.SUBSTRATE],
    cache: [PART.CACHE, PART.BUMPS],
    hbm: [PART.HBM],
    optics: [PART.PHOTONIC, PART.FIBER, PART.PORTS, PART.BRACKET],
    vapour: [PART.CHANNELS, PART.COLDPLATE, PART.FINS, PART.SHROUD],
    power: [PART.VRM, PART.INDUCTOR, PART.CAPS, PART.POWER],
    sched: [PART.SCHED],
    trust: [PART.SECURITY],
  };
  for (const k in map) for (const p of map[k]) PART_FEATURE[p] = k;
}

/* Exploded-view displacement per part. */
const EXPLODE = {};
{
  const e = {
    [PART.SHROUD]: [0, 13, 0], [PART.FINS]: [0, 9.5, 0],
    [PART.COLDPLATE]: [0, 6.6, 0], [PART.CHANNELS]: [0, 5.2, 0],
    [PART.DIE_A]: [0, 3.4, 0], [PART.DIE_B]: [0, 3.4, 0], [PART.BRIDGE]: [0, 3.4, 0],
    [PART.SCHED]: [0, 3.4, 0], [PART.SECURITY]: [0, 3.4, 0],
    [PART.BUMPS]: [0, 2.4, 0], [PART.CACHE]: [0, 1.7, 0],
    [PART.HBM]: [0, 2.2, 0],
    [PART.BACKPLATE]: [0, -5.5, 0], [PART.SCREWS]: [0, -7.5, 0],
    [PART.PHOTONIC]: [0, 1.2, -2.2], [PART.FIBER]: [0, 1.0, -1.2],
    [PART.INDUCTOR]: [0, 1.6, 0], [PART.CAPS]: [0, 1.6, 0], [PART.VRM]: [0, 1.0, 0],
  };
  for (const k in e) EXPLODE[k] = e[k];
}

class App {
  constructor() {
    this.canvas = document.getElementById('gl');
    this.renderer = new Renderer(this.canvas);

    this.cam = { ...OVERVIEW, target: OVERVIEW.target.slice(), fov: 0.60, pos: [0, 0, 0] };
    this.goal = { ...OVERVIEW, target: OVERVIEW.target.slice(), fov: 0.60 };
    this.tween = null;
    this.mode = 'overview';
    this.active = null;          // active feature object
    this.stage = 'view';         // 'view' | 'macro'
    this.exploded = false;
    this.autoRotate = true;
    this.idle = 0;
    this.hoverPart = -1;
    this.time = 0;
    this.reveal = 0;
    this.uiHidden = false;

    this.parts = new Float32Array(32 * 4);
    this.partFx = new Float32Array(32 * 4);
    this.pState = [];
    for (let i = 0; i < 32; i++) {
      this.pState.push({ a: 1, aG: 1, o: [0, 0, 0], oG: [0, 0, 0], hl: 0, hlG: 0 });
      this.parts[i * 4 + 3] = 1;
    }

    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.hoverFeature = null;
    this.pickFeature = null;
    this._buildRibbon();
    this._buildCallouts();
    this._bindInput();
    this._resize();
    window.addEventListener('resize', () => this._resize());

    this.frames = 0; this.fpsT = 0; this.fps = 0;
    document.getElementById('stat-tris').textContent =
      (this.renderer.triCount / 1000).toFixed(1) + 'k';
    this.last = performance.now();
    this._intro();
    requestAnimationFrame((t) => this._loop(t));
  }

  /** Finish any camera flight and transition instantly (headless harness). */
  snap() {
    this.reveal = 1.2;
    if (this.tween) { this.tween.t = 1; this._updateCamera(0.0001); }
    Object.assign(this.cam, {
      yaw: this.goal.yaw, pitch: this.goal.pitch, dist: this.goal.dist,
    });
    this.cam.target = this.goal.target.slice();
    for (let i = 0; i < 32; i++) {
      const p = this.pState[i];
      p.a = p.aG; p.hl = p.hlG; p.o = p.oG.slice();
    }
    this._updateCamera(0.0001);
  }

  /* --------------------------------------------------------------- intro */
  _intro() {
    const start = { target: [-1, 2.5, 0], yaw: -1.35, pitch: 0.16, dist: 96 };
    Object.assign(this.cam, { yaw: start.yaw, pitch: start.pitch, dist: start.dist });
    this.cam.target = start.target.slice();
    this.flyTo(OVERVIEW, this.reduced ? 0.3 : 3.2);
    const el = document.getElementById('loader');
    setTimeout(() => { el.classList.add('gone'); }, 260);
    document.body.classList.add('ready');
  }

  _buildRibbon() {
    document.getElementById('ribbon').innerHTML = HEADLINE
      .map(([v, l]) => `<div class="hl"><b>${v}</b><span>${l}</span></div>`).join('');
  }

  /* ------------------------------------------------------------ callouts */
  _buildCallouts() {
    const left = document.getElementById('rail-left');
    const right = document.getElementById('rail-right');
    this.svg = document.getElementById('leaders');
    this.calloutEls = [];

    FEATURES.forEach((f, i) => {
      const el = document.createElement('button');
      el.className = 'callout ' + f.side;
      el.type = 'button';
      el.setAttribute('aria-label', `Inspect ${f.title}`);
      el.innerHTML = `
        <span class="c-tag">${f.tag}</span>
        <span class="c-body">
          <span class="c-kicker">${f.kicker}</span>
          <span class="c-title">${f.title}</span>
          <span class="c-teaser">${f.teaser}</span>
        </span>
        <span class="c-go" aria-hidden="true">INSPECT
          <svg viewBox="0 0 16 10" width="16" height="10"><path d="M0 5h13M9 1l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>
        </span>`;
      el.addEventListener('click', () => this.select(f));
      el.addEventListener('mouseenter', () => this.setHoverFeature(f));
      el.addEventListener('mouseleave', () => this.setHoverFeature(null));
      (f.side === 'left' ? left : right).appendChild(el);

      const ns = 'http://www.w3.org/2000/svg';
      const g = document.createElementNS(ns, 'g');
      g.setAttribute('class', 'leader');
      const path = document.createElementNS(ns, 'path');
      path.setAttribute('class', 'leader-line');
      const head = document.createElementNS(ns, 'path');
      head.setAttribute('class', 'leader-head');
      const ring = document.createElementNS(ns, 'circle');
      ring.setAttribute('class', 'leader-ring');
      ring.setAttribute('r', '10');
      const dot = document.createElementNS(ns, 'circle');
      dot.setAttribute('class', 'leader-dot');
      dot.setAttribute('r', '2.6');
      g.append(path, ring, dot, head);
      this.svg.appendChild(g);

      this.calloutEls.push({ f, el, g, path, head, ring, dot, i });
    });
  }

  setHoverFeature(f) {
    this.hoverFeature = f ? f.id : null;
    this._refreshHighlight();
  }

  /** Highlight is driven by both the rail hover and the 3D hover. */
  _refreshHighlight() {
    const id = this.hoverFeature || this.pickFeature;
    const strength = this.hoverFeature ? 1 : 0.75;
    for (let i = 0; i < 32; i++) this.pState[i].hlG = 0;
    if (id) {
      for (const p in PART_FEATURE) {
        if (PART_FEATURE[p] === id) this.pState[p].hlG = strength;
      }
    }
    for (const c of this.calloutEls) c.g.classList.toggle('hot', c.f.id === id);
  }

  /* --------------------------------------------------------------- input */
  _bindInput() {
    const c = this.canvas;
    let dragging = false, panning = false, lx = 0, ly = 0, moved = 0;
    const pointers = new Map();
    let pinchDist = 0;

    const down = (e) => {
      c.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, [e.clientX, e.clientY]);
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinchDist = Math.hypot(a[0] - b[0], a[1] - b[1]);
        dragging = false;
        return;
      }
      dragging = true;
      panning = e.button === 2 || e.shiftKey;
      lx = e.clientX; ly = e.clientY; moved = 0;
      this.tween = null;
      this.idle = 0;
      c.classList.add('grabbing');
    };
    const move = (e) => {
      if (pointers.has(e.pointerId)) pointers.set(e.pointerId, [e.clientX, e.clientY]);
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (pinchDist) this.zoomBy(Math.pow(pinchDist / d, 1.6));
        pinchDist = d;
        return;
      }
      if (!dragging) { this.pendingPick = [e.clientX, e.clientY]; return; }
      const dx = e.clientX - lx, dy = e.clientY - ly;
      lx = e.clientX; ly = e.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      this.idle = 0;
      if (panning) {
        const k = this.goal.dist * 0.0012;
        const right = [Math.cos(this.goal.yaw), 0, -Math.sin(this.goal.yaw)];
        const upv = [0, 1, 0];
        for (let i = 0; i < 3; i++) {
          this.goal.target[i] += -right[i] * dx * k + upv[i] * dy * k;
        }
      } else {
        this.goal.yaw -= dx * 0.0055;
        this.goal.pitch = clamp(this.goal.pitch + dy * 0.0048, -0.35, 1.5);
      }
      this.autoRotate = false;
    };
    const up = (e) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinchDist = 0;
      if (dragging && moved < 6) this._clickAt(e.clientX, e.clientY);
      dragging = false;
      c.classList.remove('grabbing');
    };
    c.addEventListener('pointerdown', down);
    c.addEventListener('pointermove', move);
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.zoomBy(Math.exp(clamp(e.deltaY, -120, 120) * 0.0013));
      this.autoRotate = false;
      this.idle = 0;
    }, { passive: false });

    window.addEventListener('keydown', (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k >= '1' && k <= '8') { this.select(FEATURES[+k - 1]); e.preventDefault(); return; }
      if (ORBIT_KEYS.has(k)) this.tween = null;
      switch (k) {
        case 'escape': this.back(); break;
        case 'arrowleft': this.goal.yaw += 0.09; this.autoRotate = false; e.preventDefault(); break;
        case 'arrowright': this.goal.yaw -= 0.09; this.autoRotate = false; e.preventDefault(); break;
        case 'arrowup': this.goal.pitch = clamp(this.goal.pitch + 0.06, -0.35, 1.5); e.preventDefault(); break;
        case 'arrowdown': this.goal.pitch = clamp(this.goal.pitch - 0.06, -0.35, 1.5); e.preventDefault(); break;
        case '+': case '=': this.zoomBy(0.86); break;
        case '-': case '_': this.zoomBy(1.16); break;
        case 'r': this.back(); this.goal.target = OVERVIEW.target.slice(); break;
        case ' ': this.autoRotate = !this.autoRotate; e.preventDefault(); break;
        case 'x': this.toggleExplode(); break;
        case 'm': if (this.active) this.setStage(this.stage === 'macro' ? 'view' : 'macro'); break;
        case 'h': this.toggleUI(); break;
        case 'f': this.toggleFullscreen(); break;
        default: return;
      }
      this.idle = 0;
    });

    document.getElementById('btn-back').addEventListener('click', () => this.back());
    document.getElementById('btn-explode').addEventListener('click', () => this.toggleExplode());
    document.getElementById('btn-reset').addEventListener('click', () => {
      this.back(); this.goal.target = OVERVIEW.target.slice();
    });
    document.getElementById('btn-stage').addEventListener('click', () => {
      this.setStage(this.stage === 'macro' ? 'view' : 'macro');
    });
    document.getElementById('btn-ui').addEventListener('click', () => this.toggleUI());
  }

  _clickAt(x, y) {
    const r = this.canvas.getBoundingClientRect();
    const id = this.renderer.pick(x - r.left, y - r.top, this.parts);
    const fid = PART_FEATURE[id];
    if (fid) {
      const f = FEATURES.find((v) => v.id === fid);
      if (f) this.select(f);
    }
  }

  zoomBy(k) {
    const min = this.mode === 'overview' ? 8 : 0.45;
    this.goal.dist = clamp(this.goal.dist * k, min, 160);
    this.tween = null;
  }

  toggleUI() {
    this.uiHidden = !this.uiHidden;
    document.body.classList.toggle('ui-hidden', this.uiHidden);
  }

  toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.();
  }

  toggleExplode() {
    this.exploded = !this.exploded;
    document.getElementById('btn-explode').classList.toggle('on', this.exploded);
    this._applyParts();
  }

  /* ------------------------------------------------------------- camera */
  flyTo(view, dur = 1.5) {
    const from = {
      target: this.cam.target.slice(), yaw: this.cam.yaw,
      pitch: this.cam.pitch, dist: this.cam.dist,
    };
    // Shortest angular path.
    let dy = view.yaw - from.yaw;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    this.tween = {
      from, to: { ...view, target: view.target.slice(), yaw: from.yaw + dy },
      t: 0, dur: this.reduced ? Math.min(dur, 0.4) : dur,
    };
    Object.assign(this.goal, { yaw: from.yaw + dy, pitch: view.pitch, dist: view.dist });
    this.goal.target = view.target.slice();
  }

  /* ------------------------------------------------------ state changes */
  select(f) {
    if (!f) return;
    this.active = f;
    this.mode = 'feature';
    this.stage = 'view';
    this.setHoverFeature(null);
    this.flyTo(f.view, 1.6);
    this._applyParts();
    this._fillPanel(f);
    document.body.classList.add('inspecting');
    document.body.classList.remove('macro');
    for (const c of this.calloutEls) c.el.classList.toggle('active', c.f === f);
  }

  setStage(stage) {
    if (!this.active) return;
    this.stage = stage;
    this.flyTo(stage === 'macro' ? this.active.macro : this.active.view, 1.3);
    document.body.classList.toggle('macro', stage === 'macro');
    const b = document.getElementById('btn-stage');
    b.textContent = stage === 'macro' ? '↤  PULL BACK' : 'DIVE TO CIRCUIT LEVEL  ↦';
    document.getElementById('macro-hint').textContent = this.active.macroHint;
  }

  back() {
    if (this.mode === 'overview') return;
    if (this.stage === 'macro') { this.setStage('view'); return; }
    this.mode = 'overview';
    this.active = null;
    this.stage = 'view';
    document.body.classList.remove('inspecting', 'macro');
    for (const c of this.calloutEls) c.el.classList.remove('active');
    this.flyTo(OVERVIEW, 1.5);
    this._applyParts();
  }

  _fillPanel(f) {
    document.getElementById('p-tag').textContent = f.tag;
    document.getElementById('p-kicker').textContent = f.kicker;
    document.getElementById('p-title').textContent = f.title;
    document.getElementById('p-body').innerHTML = f.body;
    document.getElementById('p-specs').innerHTML = f.specs.map(([k, v]) => `
      <div class="spec"><dt>${k}</dt><dd>${v}</dd></div>`).join('');
    document.getElementById('btn-stage').textContent = 'DIVE TO CIRCUIT LEVEL  ↦';
    document.getElementById('macro-hint').textContent = f.macroHint;
    const idx = FEATURES.indexOf(f);
    document.getElementById('p-index').textContent =
      `${String(idx + 1).padStart(2, '0')} / ${String(FEATURES.length).padStart(2, '0')}`;
  }

  /** Recompute every part's target alpha and displacement. */
  _applyParts() {
    for (let i = 0; i < 32; i++) {
      this.pState[i].aG = 1;
      this.pState[i].oG = [0, 0, 0];
    }
    if (this.exploded) {
      for (const p in EXPLODE) this.pState[p].oG = EXPLODE[p].slice();
    }
    const f = this.active;
    if (f) {
      for (const p of f.hide) this.pState[p].aG = 0;
      for (const p in f.lift) {
        const o = f.lift[p];
        this.pState[p].oG = [o[0], o[1], o[2]];
      }
    }
  }

  /* --------------------------------------------------------------- frame */
  _resize() {
    const w = window.innerWidth, h = window.innerHeight;
    const dpr = clamp(window.devicePixelRatio || 1, 1, 2);
    // Keep the pixel budget sane on huge displays.
    const budget = 2600 * 1500;
    const scale = Math.min(1, Math.sqrt(budget / (w * dpr * h * dpr)));
    this.renderer.resize(w, h, dpr * scale);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    this.vw = w; this.vh = h;
    this._cacheRects();
    document.getElementById('stat-res').textContent =
      `${this.renderer.width}×${this.renderer.height}`;
  }

  _cacheRects() {
    if (!this.calloutEls) return;
    for (const c of this.calloutEls) c.rect = c.el.getBoundingClientRect();
    this.rectAge = 0;   // replay the dense-refresh window after a reflow
  }

  _updateCamera(dt) {
    const c = this.cam, g = this.goal;
    if (this.tween) {
      const tw = this.tween;
      tw.t = Math.min(1, tw.t + dt / tw.dur);
      const e = easeInOutCubic(tw.t);
      // A touch of arc so the flight feels flown, not lerped.
      const arc = Math.sin(tw.t * Math.PI) * (this.reduced ? 0 : 0.14);
      c.yaw = lerp(tw.from.yaw, tw.to.yaw, e);
      c.pitch = lerp(tw.from.pitch, tw.to.pitch, e);
      c.dist = lerp(tw.from.dist, tw.to.dist, e) * (1 + arc);
      for (let i = 0; i < 3; i++) c.target[i] = lerp(tw.from.target[i], tw.to.target[i], e);
      if (tw.t >= 1) this.tween = null;
    } else {
      const k = 9;
      c.yaw = damp(c.yaw, g.yaw, k, dt);
      c.pitch = damp(c.pitch, g.pitch, k, dt);
      c.dist = damp(c.dist, g.dist, k, dt);
      for (let i = 0; i < 3; i++) c.target[i] = damp(c.target[i], g.target[i], k, dt);
    }
    if (this.autoRotate && this.mode === 'overview' && !this.tween && !this.reduced) {
      this.goal.yaw += dt * 0.055;
    }
    const cp = Math.cos(c.pitch), sp = Math.sin(c.pitch);
    c.pos = [
      c.target[0] + c.dist * cp * Math.sin(c.yaw),
      c.target[1] + c.dist * sp,
      c.target[2] + c.dist * cp * Math.cos(c.yaw),
    ];
  }

  _updateParts(dt) {
    for (let i = 0; i < 32; i++) {
      const p = this.pState[i];
      p.a = damp(p.a, p.aG, 6.5, dt);
      p.hl = damp(p.hl, p.hlG, 9, dt);
      for (let k = 0; k < 3; k++) p.o[k] = damp(p.o[k], p.oG[k], 5.5, dt);
      this.parts[i * 4] = p.o[0];
      this.parts[i * 4 + 1] = p.o[1];
      this.parts[i * 4 + 2] = p.o[2];
      this.parts[i * 4 + 3] = p.a;
      this.partFx[i * 4] = p.hl;
    }
  }

  _updateLeaders() {
    const show = this.mode === 'overview' && !this.uiHidden && this.vw > 900;
    this.svg.style.opacity = show ? 1 : 0;
    if (!show) return;
    // The entry animation moves the boxes; keep the rects honest while it plays,
    // then fall back to an occasional refresh.
    this.rectAge = (this.rectAge || 0) + 1;
    if (this.rectAge < 180 || this.rectAge % 30 === 0) {
      for (const c of this.calloutEls) c.rect = c.el.getBoundingClientRect();
    }
    const vp = this.renderer.viewProj;
    const out = [0, 0, 0, 0];
    for (const c of this.calloutEls) {
      M4.project(out, vp, c.f.anchor);
      if (out[3] <= 0.01) { c.g.style.opacity = 0; continue; }
      const ax = (out[0] / out[3] * 0.5 + 0.5) * this.vw;
      const ay = (1 - (out[1] / out[3] * 0.5 + 0.5)) * this.vh;
      const r = c.rect || c.el.getBoundingClientRect();
      const leftSide = c.f.side === 'left';
      const bx = leftSide ? r.right : r.left;
      const by = r.top + r.height / 2;
      const stub = leftSide ? 18 : -18;
      const mx = bx + stub;
      c.path.setAttribute('d', `M ${bx.toFixed(1)} ${by.toFixed(1)} L ${mx.toFixed(1)} ${by.toFixed(1)} L ${ax.toFixed(1)} ${ay.toFixed(1)}`);
      const ang = Math.atan2(ay - by, ax - mx);
      const hx = ax - Math.cos(ang) * 9, hy = ay - Math.sin(ang) * 9;
      const s = 5.2;
      const p1 = [hx + Math.cos(ang + 2.5) * s, hy + Math.sin(ang + 2.5) * s];
      const p2 = [hx + Math.cos(ang - 2.5) * s, hy + Math.sin(ang - 2.5) * s];
      c.head.setAttribute('d', `M ${hx.toFixed(1)} ${hy.toFixed(1)} L ${p1[0].toFixed(1)} ${p1[1].toFixed(1)} L ${p2[0].toFixed(1)} ${p2[1].toFixed(1)} Z`);
      c.ring.setAttribute('cx', ax.toFixed(1)); c.ring.setAttribute('cy', ay.toFixed(1));
      c.dot.setAttribute('cx', ax.toFixed(1)); c.dot.setAttribute('cy', ay.toFixed(1));
      c.g.style.opacity = 1;
    }
  }

  _doPick() {
    if (!this.pendingPick) return;
    const [x, y] = this.pendingPick;
    this.pendingPick = null;
    const tip = document.getElementById('tooltip');
    tip.style.transform = `translate(${Math.min(x + 16, this.vw - 240)}px, ${y + 16}px)`;
    const r = this.canvas.getBoundingClientRect();
    const id = this.renderer.pick(x - r.left, y - r.top, this.parts);
    if (id === this.hoverPart) return;
    this.hoverPart = id;
    const name = PART_NAMES[id];
    if (id >= 0 && name) {
      tip.textContent = name + (PART_FEATURE[id] ? '  ·  click to inspect' : '');
      tip.classList.add('on');
      this.canvas.style.cursor = PART_FEATURE[id] ? 'pointer' : 'grab';
    } else {
      tip.classList.remove('on');
      this.canvas.style.cursor = 'grab';
    }
    this.pickFeature = PART_FEATURE[id] || null;
    this._refreshHighlight();
  }

  _loop(now) {
    requestAnimationFrame((t) => this._loop(t));
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.time += dt;
    this.idle += dt;
    if (this.idle > 12 && this.mode === 'overview' && !this.tween) this.autoRotate = true;
    this.reveal = Math.min(1.2, this.reveal + dt * 0.55);

    this._updateCamera(dt);
    this._updateParts(dt);

    const aspect = this.renderer.width / this.renderer.height;
    this.renderer.setCamera(this.cam, aspect);
    this._doPick();

    const d = this.cam.dist;
    const dof = clamp(smoothstep(16, 2.2, d) * 0.80 + 0.04, 0.04, 0.84);
    const macroness = smoothstep(14, 3, d);

    this.renderer.render({
      time: this.time,
      camPos: this.cam.pos,
      parts: this.parts,
      partFx: this.partFx,
      xray: this.mode === 'overview' ? 0.4 : 1.0,
      focusPoint: this.cam.target,
      focusAmt: macroness,
      focusDist: d,
      dof,
      aoRadius: clamp(d * 0.030, 0.02, 0.9),
      ao: 0.85,
      bloom: lerp(0.75, 0.85, macroness),
      exposure: lerp(0.95, 1.05, macroness),
      vignette: lerp(0.42, 0.60, macroness),
      reveal: this.reveal,
    });

    this._updateLeaders();

    // HUD
    this.frames++; this.fpsT += dt;
    if (this.fpsT > 0.5) {
      this.fps = Math.round(this.frames / this.fpsT);
      this.frames = 0; this.fpsT = 0;
      document.getElementById('stat-fps').textContent = this.fps;
    }
    const mag = Math.max(1, OVERVIEW.dist / Math.max(this.cam.dist, 0.001));
    document.getElementById('stat-mag').textContent = '×' + (mag * 4.2).toFixed(mag > 4 ? 0 : 1);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const fail = (msg) => {
    document.getElementById('loader').classList.add('gone');
    const el = document.getElementById('fallback');
    el.style.display = 'flex';
    document.getElementById('fallback-msg').textContent = msg;
  };
  try {
    if (!document.createElement('canvas').getContext('webgl2')) {
      return fail('This viewer needs WebGL 2. Try a current Chrome, Edge, Firefox or Safari 15+, and make sure hardware acceleration is on.');
    }
    window.app = new App();
  } catch (err) {
    console.error(err);
    fail(String(err && err.message ? err.message : err));
  }
});
