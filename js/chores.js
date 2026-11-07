// CLEANER chores (Kaz): wall, trash, bed, takeout.
// Every chore: start(api) -> { update(dt), draw(ctx), stop() -> 0..100 }.
// Input = pointer events + setPointerCapture (mouse/touch/pen). Every listener goes through
// listeners() so stop() can tear them all down; Cleaner._kazListeners counts live ones (debug).
(function () {
  const C = window.Cleaner;
  const W = C.W, H = C.H, TAU = Math.PI * 2, INK = '#3b2f4a';
  const PAL = { cream: '#fff6e9', blush: '#ffd6e0', mint: '#c9f2df', sky: '#cfe8ff', butter: '#fff1b8' };
  const FONT = (s, w = 700) => `${w} ${s}px Fredoka, system-ui, sans-serif`;
  const rand = C.rand, clamp = C.clamp, lerp = C.lerp, dist = C.dist;
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeBack = (t) => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
  C._kazListeners = C._kazListeners || 0;

  // ---------- listener + pointer plumbing ----------
  function listeners() {
    const list = [];
    return {
      on(t, type, fn, opts) { t.addEventListener(type, fn, opts); list.push([t, type, fn, opts]); C._kazListeners++; },
      off() { list.forEach(([t, ty, fn, o]) => t.removeEventListener(ty, fn, o)); C._kazListeners -= list.length; list.length = 0; },
    };
  }
  // h.down(p,e) / h.move(p,e,isDown) / h.up(p,e). Returns release() for stop().
  function pointerInput(api, L, h) {
    const cv = api.canvas, active = new Set();
    const pos = (e) => C.pointer(cv, e);
    L.on(cv, 'pointerdown', (e) => {
      e.preventDefault();
      try { cv.setPointerCapture(e.pointerId); } catch (_) {}
      active.add(e.pointerId); h.down && h.down(pos(e), e);
    });
    L.on(cv, 'pointermove', (e) => { h.move && h.move(pos(e), e, active.has(e.pointerId)); });
    const up = (e) => { if (!active.has(e.pointerId)) return; active.delete(e.pointerId); h.up && h.up(pos(e), e); };
    L.on(cv, 'pointerup', up); L.on(cv, 'pointercancel', up); L.on(cv, 'lostpointercapture', up);
    L.on(cv, 'contextmenu', (e) => e.preventDefault());
    return () => { active.forEach((id) => { try { cv.releasePointerCapture(id); } catch (_) {} }); active.clear(); };
  }

  // ---------- drawing helpers ----------
  function rr(g, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function paint(g, fill, lw = 4) {
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (lw) { g.lineWidth = lw; g.strokeStyle = INK; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke(); }
  }
  const circ = (g, x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, TAU); };
  const ell = (g, x, y, rx, ry, rot = 0) => { g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, TAU); };
  function shadow(g, x, y, rx, ry, a = 0.15) { g.fillStyle = `rgba(59,47,74,${a})`; ell(g, x, y, rx, ry); g.fill(); }
  function prerender(fn) { const c = document.createElement('canvas'); c.width = W; c.height = H; fn(c.getContext('2d')); return c; }
  function text(g, s, x, y, size = 22, fill = '#fff', lw = 5) {
    g.font = FONT(size); g.textAlign = 'center'; g.textBaseline = 'middle';
    if (lw) { g.lineWidth = lw; g.strokeStyle = INK; g.lineJoin = 'round'; g.strokeText(s, x, y); }
    g.fillStyle = fill; g.fillText(s, x, y);
  }
  function hint(g, s, t, y = 92) { // in-scene instruction pill (sits just under main's HUD)
    g.save(); g.font = FONT(21, 600);
    const w = g.measureText(s).width + 44, yy = y + Math.sin(t * 3) * 2;
    rr(g, W / 2 - w / 2, yy - 20, w, 40, 20); paint(g, 'rgba(255,255,255,.93)', 3);
    g.fillStyle = INK; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s, W / 2, yy + 1); g.restore();
  }
  function downArrow(g, x, y, t, col = PAL.butter) {
    const b = Math.sin(t * 6) * 6;
    g.beginPath(); g.moveTo(x - 16, y - 34 + b); g.lineTo(x + 16, y - 34 + b); g.lineTo(x + 16, y - 18 + b); g.lineTo(x + 26, y - 18 + b);
    g.lineTo(x, y + b); g.lineTo(x - 26, y - 18 + b); g.lineTo(x - 16, y - 18 + b); g.closePath(); paint(g, col, 3.5);
  }
  function dashedSlot(g, x, y, w, h, col, t) {
    g.save(); g.setLineDash([10, 8]); g.lineDashOffset = -t * 20; rr(g, x - w / 2, y - h / 2, w, h, 18);
    g.fillStyle = 'rgba(255,255,255,.35)'; g.fill(); g.lineWidth = 4; g.strokeStyle = col; g.stroke(); g.restore();
  }
  function floorPlanks(g, y0, y1, c1 = '#e8c9a8', c2 = '#dcb894') {
    g.fillStyle = c1; g.fillRect(0, y0, W, y1 - y0);
    g.strokeStyle = c2; g.lineWidth = 3;
    for (let y = y0 + 34, r = 0; y < y1; y += 34, r++) {
      g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
      for (let x = (r % 2) * 90; x < W; x += 180) { g.beginPath(); g.moveTo(x, y - 34); g.lineTo(x, y); g.stroke(); }
    }
    g.fillStyle = 'rgba(59,47,74,.08)'; g.fillRect(0, y0, W, 10);
  }

  // A person: Isolde's chibi if available, else a simple cute fallback.
  let artWarned = false;
  function drawPerson(g, x, y, s, player, t, pose) {
    if (C.art && typeof C.art.drawCharacter === 'function') {
      try { g.save(); C.art.drawCharacter(g, x, y, s, player, t, pose); g.restore(); return; }
      catch (e) { g.restore(); if (!artWarned) { artWarned = true; console.warn('drawCharacter failed, using fallback', e); } }
    }
    const col = (player && player.color) || '#ff7eb6', o = (player && player.outfit) || {};
    const walk = pose === 'walk' || pose === 'carry' ? Math.sin(t * 13) : 0;
    g.save(); g.translate(x, y); g.scale(s, s);
    shadow(g, 0, 0, 26, 7);
    g.lineCap = 'round';
    for (const k of [-1, 1]) {
      g.beginPath(); g.moveTo(k * 8, -32); g.lineTo(k * 8 + walk * k * 8, -5);
      g.lineWidth = 12; g.strokeStyle = INK; g.stroke(); g.lineWidth = 6; g.strokeStyle = '#7a6a94'; g.stroke();
    }
    for (const k of [-1, 1]) { // arms
      const up = pose === 'carry' || pose === 'cheer';
      g.beginPath(); g.moveTo(k * 16, -58); g.lineTo(k * (up ? 30 : 24), up ? -78 : -36 + walk * k * 4);
      g.lineWidth = 11; g.strokeStyle = INK; g.stroke(); g.lineWidth = 5; g.strokeStyle = o.skin || '#f2c7a5'; g.stroke();
    }
    rr(g, -20, -68, 40, 42, 14); paint(g, col, 3.5);
    circ(g, 0, -92, 28); paint(g, o.skin || '#f2c7a5', 3.5);
    g.beginPath(); g.arc(0, -94, 29, Math.PI * 1.02, Math.PI * 1.98); g.closePath(); paint(g, o.hair || '#5a3b2e', 3.5);
    g.fillStyle = INK; circ(g, -9, -88, 3.4); g.fill(); circ(g, 9, -88, 3.4); g.fill();
    g.fillStyle = '#ff9fb5'; ell(g, -16, -80, 5, 3); g.fill(); ell(g, 16, -80, 5, 3); g.fill();
    g.beginPath(); g.arc(0, -82, 5, 0.2, Math.PI - 0.2); g.lineWidth = 2.5; g.strokeStyle = INK; g.stroke();
    g.restore();
  }

  // ---------- trash item art (centered at 0,0, ~56px) ----------
  const KIND = { can: 'recycle', bottle: 'recycle', paper: 'recycle', banana: 'compost', apple: 'compost', chips: 'trash', gum: 'trash' };
  function drawItem(g, type, x, y, s = 1, rot = 0) {
    g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
    switch (type) {
      case 'can':
        rr(g, -15, -24, 30, 48, 7); paint(g, '#ff8a8a', 0);
        g.fillStyle = '#fff'; g.fillRect(-15, -7, 30, 13);
        rr(g, -15, -24, 30, 48, 7); paint(g, null, 3.5);
        ell(g, 0, -23, 13, 4); paint(g, '#d9d4e3', 3);
        g.fillStyle = '#ff8a8a'; circ(g, 0, 0, 4); g.fill(); break;
      case 'bottle':
        rr(g, -7, -34, 14, 10, 3); paint(g, '#8be38b', 3);
        g.beginPath(); g.moveTo(-6, -25); g.quadraticCurveTo(-15, -20, -15, -8); g.lineTo(-15, 22); g.quadraticCurveTo(-15, 28, -9, 28);
        g.lineTo(9, 28); g.quadraticCurveTo(15, 28, 15, 22); g.lineTo(15, -8); g.quadraticCurveTo(15, -20, 6, -25); g.closePath();
        paint(g, 'rgba(160,214,255,.95)', 3.5);
        g.fillStyle = PAL.butter; g.fillRect(-13, 0, 26, 11); g.strokeStyle = INK; g.lineWidth = 2; g.strokeRect(-13, 0, 26, 11);
        g.fillStyle = 'rgba(255,255,255,.8)'; rr(g, -10, -14, 5, 12, 3); g.fill(); break;
      case 'paper': {
        g.beginPath();
        for (let i = 0; i < 11; i++) { const a = (i / 11) * TAU, r = i % 2 ? 17 : 23; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
        g.closePath(); paint(g, '#fffdf7', 3.5);
        g.beginPath(); g.moveTo(-10, -6); g.lineTo(2, 2); g.lineTo(9, -9); g.moveTo(-4, 10); g.lineTo(6, 6);
        g.lineWidth = 2; g.strokeStyle = '#b7aec6'; g.stroke(); break; }
      case 'banana':
        for (const a of [-0.9, 0, 0.9]) {
          g.save(); g.rotate(a); g.beginPath(); g.moveTo(-6, -4); g.quadraticCurveTo(-12, 16, -3, 28); g.quadraticCurveTo(4, 30, 7, 26);
          g.quadraticCurveTo(10, 12, 6, -4); g.closePath(); paint(g, '#ffd84d', 3.5);
          g.fillStyle = '#8b5a2b'; circ(g, 2, 26, 3); g.fill(); g.restore();
        }
        rr(g, -7, -16, 14, 16, 5); paint(g, '#ffe77a', 3.5); rr(g, -3, -24, 6, 9, 2); paint(g, '#8b5a2b', 3); break;
      case 'apple':
        g.beginPath(); g.moveTo(-14, -16); g.quadraticCurveTo(-3, 0, -14, 16); g.lineTo(14, 16); g.quadraticCurveTo(3, 0, 14, -16); g.closePath();
        paint(g, '#fff4d6', 3.5);
        ell(g, 0, -18, 16, 7); paint(g, '#ff6b6b', 3.5); ell(g, 0, 18, 16, 7); paint(g, '#ff6b6b', 3.5);
        g.fillStyle = INK; ell(g, -3, -2, 2, 3.5); g.fill(); ell(g, 3, 3, 2, 3.5); g.fill();
        g.beginPath(); g.moveTo(0, -24); g.lineTo(2, -33); g.lineWidth = 3.5; g.strokeStyle = '#8b5a2b'; g.stroke();
        ell(g, 8, -31, 7, 3.5, -0.4); paint(g, '#8be38b', 2.5); break;
      case 'chips':
        g.beginPath(); g.moveTo(-20, -24);
        for (let i = 0; i <= 8; i++) g.lineTo(-20 + i * 5, -24 + (i % 2 ? 4 : 0));
        g.lineTo(20, 24); for (let i = 0; i <= 8; i++) g.lineTo(20 - i * 5, 24 - (i % 2 ? 4 : 0));
        g.closePath(); paint(g, '#ffa94d', 3.5);
        circ(g, 0, 0, 11); paint(g, PAL.butter, 2.5);
        g.fillStyle = INK; circ(g, -4, -2, 1.8); g.fill(); circ(g, 4, -2, 1.8); g.fill();
        g.beginPath(); g.arc(0, 1, 5, 0.3, Math.PI - 0.3); g.lineWidth = 2; g.strokeStyle = INK; g.stroke(); break;
      case 'gum':
        rr(g, -20, 6, 26, 12, 3); paint(g, '#cfe8ff', 3);
        g.beginPath();
        for (let i = 0; i < 9; i++) { const a = (i / 9) * TAU, r = 15 + (i % 3) * 2.5; g.lineTo(4 + Math.cos(a) * r, -4 + Math.sin(a) * r); }
        g.closePath(); paint(g, '#ff9fd0', 3.5);
        g.fillStyle = 'rgba(255,255,255,.75)'; circ(g, -1, -10, 4); g.fill(); break;
      case 'bit': // leaky-bag bit: a little blob of goo + crumb
        ell(g, 0, 4, 14, 6); paint(g, '#a8d672', 3); circ(g, 5, -2, 6); paint(g, '#ffd84d', 3); break;
    }
    g.restore();
  }

  // =====================================================================
  // WALL — scrub grime off an offscreen mask with a (holey) sponge.
  // =====================================================================
  function drawWallBg(g) {
    g.fillStyle = PAL.blush; g.fillRect(0, 0, W, 400);
    for (let x = 0; x < W; x += 80) { g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x, 0, 40, 400); }
    g.fillStyle = 'rgba(255,255,255,.7)';
    for (let y = 30, r = 0; y < 400; y += 52, r++) for (let x = (r % 2) * 40 + 20; x < W; x += 80) { circ(g, x, y, 5); g.fill(); }
    // picture frame
    rr(g, 380, 118, 200, 150, 10); paint(g, '#ffd166', 5);
    rr(g, 396, 134, 168, 118, 4); paint(g, PAL.sky, 3);
    g.save(); rr(g, 396, 134, 168, 118, 4); g.clip();
    circ(g, 520, 166, 18); paint(g, '#fff1b8', 3);
    g.beginPath(); g.ellipse(450, 270, 110, 60, 0, 0, TAU); paint(g, '#8be38b', 3);
    g.beginPath(); g.ellipse(560, 280, 90, 60, 0, 0, TAU); paint(g, '#c9f2df', 3); g.restore();
    // clock
    circ(g, 800, 170, 48); paint(g, PAL.cream, 5); circ(g, 800, 170, 5); paint(g, INK, 0);
    g.beginPath(); g.moveTo(800, 170); g.lineTo(800, 138); g.moveTo(800, 170); g.lineTo(822, 180); g.lineWidth = 5; g.strokeStyle = INK; g.stroke();
    // shelf w/ plant
    rr(g, 110, 210, 150, 16, 6); paint(g, '#e8c9a8', 4);
    rr(g, 160, 170, 46, 40, 8); paint(g, '#7ec8ff', 4);
    for (const a of [-0.6, 0, 0.6]) { ell(g, 183 + a * 22, 154 - Math.abs(a) * -6, 10, 20, a); paint(g, '#8be38b', 3); }
    // wainscot + rail + baseboard
    g.fillStyle = PAL.cream; g.fillRect(0, 400, W, 86);
    for (let x = 20; x < W; x += 160) { rr(g, x, 414, 130, 58, 8); paint(g, null, 3); }
    rr(g, -10, 392, W + 20, 14, 6); paint(g, '#fff', 4);
    rr(g, -10, 482, W + 20, 18, 4); paint(g, '#fff', 4);
    floorPlanks(g, 500, 600);
    // bucket
    g.beginPath(); g.moveTo(60, 515); g.lineTo(150, 515); g.lineTo(140, 585); g.lineTo(70, 585); g.closePath(); paint(g, '#7ec8ff', 4);
    for (const [bx, by, br] of [[80, 512, 12], [100, 506, 15], [124, 511, 12], [140, 506, 9]]) { circ(g, bx, by, br); paint(g, '#fff', 3); }
    g.beginPath(); g.arc(105, 520, 46, Math.PI * 1.1, Math.PI * 1.9); g.lineWidth = 4; g.strokeStyle = INK; g.stroke();
  }
  function paintGrime(m, lvl, X0, Y0, X1, Y1) {
    const k = [0, 1, 1.45, 1.9][lvl];
    m.save(); m.beginPath(); m.rect(X0, Y0, X1 - X0, Y1 - Y0); m.clip();
    const rx = () => rand(X0 + 30, X1 - 30), ry = () => rand(Y0 + 30, Y1 - 30);
    for (let i = 0; i < Math.round(7 * k); i++) { // soft smudges
      const cx = rx(), cy = ry();
      for (let j = 0; j < 5; j++) {
        const x = cx + rand(-45, 45), y = cy + rand(-30, 30), r = rand(34, 62);
        const gr = m.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, 'rgba(140,108,76,.85)'); gr.addColorStop(0.65, 'rgba(140,108,76,.7)'); gr.addColorStop(1, 'rgba(140,108,76,0)');
        m.fillStyle = gr; circ(m, x, y, r); m.fill();
      }
    }
    for (let i = 0; i < Math.round(4 * k); i++) { // mud splats
      const cx = rx(), cy = ry(), r = rand(26, 44);
      m.beginPath();
      for (let a = 0; a < 16; a++) { const an = (a / 16) * TAU, rr2 = r * (a % 2 ? rand(0.6, 0.8) : rand(0.95, 1.25)); m.lineTo(cx + Math.cos(an) * rr2, cy + Math.sin(an) * rr2); }
      m.closePath(); m.fillStyle = '#7a5236'; m.fill(); m.lineWidth = 3; m.strokeStyle = '#5a3b2e'; m.stroke();
      for (let d = 0; d < 5; d++) { const an = rand(0, TAU), dd = r * rand(1.4, 2); circ(m, cx + Math.cos(an) * dd, cy + Math.sin(an) * dd, rand(5, 10)); m.fill(); }
      m.lineCap = 'round'; m.lineWidth = 10; m.strokeStyle = '#7a5236';
      for (let d = 0; d < 2; d++) { const x = cx + rand(-r * 0.6, r * 0.6); m.beginPath(); m.moveTo(x, cy); m.lineTo(x, cy + r + rand(20, 50)); m.stroke(); }
    }
    const cols = ['#e8505b', '#8a5cf6', '#2bb673', '#ff9f1c', '#3a86ff'];
    for (let i = 0; i < Math.round(3 * k); i++) { // crayon scribbles
      m.lineWidth = 9; m.lineCap = 'round'; m.lineJoin = 'round'; m.strokeStyle = pick(cols);
      let x = rx(), y = ry(); m.beginPath(); m.moveTo(x, y);
      for (let s = 0; s < 12; s++) { x = clamp(x + rand(-30, 40), X0, X1); y = clamp(y + (s % 2 ? 46 : -46) + rand(-8, 8), Y0, Y1); m.lineTo(x, y); }
      m.stroke();
    }
    for (let i = 0; i < Math.round(2 * k); i++) { // muddy handprints
      const cx = rx(), cy = ry(), rot = rand(-0.5, 0.5);
      m.save(); m.translate(cx, cy); m.rotate(rot); m.fillStyle = 'rgba(110,78,52,.9)';
      ell(m, 0, 10, 20, 22); m.fill();
      [[-20, -8, -0.9], [-10, -22, -0.25], [2, -26, 0], [14, -22, 0.25], [24, 0, 1]].forEach(([fx, fy, fr]) => { ell(m, fx, fy, 6, 14, fr); m.fill(); });
      m.restore();
    }
    m.restore();
  }

  C.chores.wall = {
    id: 'wall', name: 'Scrub the Wall', emoji: '🧽',
    howTo: 'Drag the sponge over the grime. Pop the soap bubbles for a super sponge! (On harder levels your sponge has holes — bubbles patch them.)',
    start(api) {
      const lvl = api.difficulty.level, L = listeners();
      const MS = 0.5, X0 = 24, Y0 = 60, X1 = 936, Y1 = 488;
      const bg = prerender(drawWallBg);
      const mask = document.createElement('canvas'); mask.width = W * MS; mask.height = H * MS;
      const m = mask.getContext('2d', { willReadFrequently: true });
      m.setTransform(MS, 0, 0, MS, 0, 0);
      paintGrime(m, lvl, X0, Y0, X1, Y1);
      const THR = 60, grid = [];
      { const d = m.getImageData(0, 0, mask.width, mask.height).data;
        for (let y = 0; y < mask.height; y += 3) for (let x = 0; x < mask.width; x += 3) { const i = (y * mask.width + x) * 4 + 3; if (d[i] > THR) grid.push(i); } }

      const BW = [0, 116, 100, 88][lvl], BH = [0, 78, 68, 60][lvl], holes = [];
      const STRENGTH = [0, 0.8, 0.6, 0.5][lvl]; // fraction of grime removed per full sponge pass
      for (let tries = 0; holes.length < [0, 0, 3, 6][lvl] && tries < 500; tries++) {
        const hh = { x: rand(-BW / 2 + 15, BW / 2 - 15), y: rand(-BH / 2 + 15, BH / 2 - 15), r: rand(9, 11) };
        if (holes.every((o) => dist(o.x, o.y, hh.x, hh.y) > 25)) holes.push(hh);
      }
      const sp = { x: 480, y: 330, down: false, lx: 480, ly: 330, vx: 0 };
      let power = 0, t = 0, frac = 0, sampleT = 0, done = false, lastSpark = 0, scrubMoved = 0;
      const bubbles = [], suds = [];
      let bubT = 2.5;
      const size = () => { const k = power > 0 ? 1.45 : 1; return { w: BW * k, h: BH * k, holes: power > 0 ? [] : holes, f: power > 0 ? 0.92 : STRENGTH }; };
      let stamp = null, stampKey = '';
      function getStamp() {
        const s = size(), key = s.w + '|' + s.holes.length;
        if (key !== stampKey) {
          stampKey = key; stamp = document.createElement('canvas');
          stamp.width = Math.ceil(s.w * MS); stamp.height = Math.ceil(s.h * MS);
          const c = stamp.getContext('2d'); c.scale(MS, MS);
          rr(c, 0, 0, s.w, s.h, 20); c.fillStyle = '#000'; c.fill();
          c.globalCompositeOperation = 'destination-out';
          s.holes.forEach((hh) => { circ(c, s.w / 2 + hh.x, s.h / 2 + hh.y, hh.r); c.fill(); });
        }
        return stamp;
      }
      function scrubTo(x, y) {
        const s = size(), st = getStamp();
        const dx = x - sp.lx, dy = y - sp.ly, d = Math.hypot(dx, dy), n = Math.max(1, Math.ceil(d / 6));
        // each stamp removes a distance-scaled share so one full pass removes s.f of the grime (frame-rate independent)
        const stepLen = d > 0 ? d / n : 2, weff = (s.w + s.h) / 2;
        m.globalCompositeOperation = 'destination-out'; m.globalAlpha = 1 - Math.pow(1 - s.f, stepLen / weff);
        for (let i = 1; i <= n; i++) m.drawImage(st, sp.lx + (dx * i) / n - s.w / 2, sp.ly + (dy * i) / n - s.h / 2, s.w, s.h);
        m.globalCompositeOperation = 'source-over'; m.globalAlpha = 1;
        sp.lx = x; sp.ly = y; scrubMoved += d;
        if (d > 2) { C.sfx('scrub'); if (Math.random() < 0.5) suds.push({ x: x + rand(-s.w / 2, s.w / 2), y: y + rand(-s.h / 2, s.h / 2), r: rand(4, 9), life: 0.7 }); }
      }
      const moveTo = (p) => { sp.vx = p.x - sp.x; sp.x = clamp(p.x, 0, W); sp.y = clamp(p.y, 40, H); };
      const release = pointerInput(api, L, {
        down(p) { moveTo(p); sp.down = true; sp.lx = sp.x; sp.ly = sp.y; scrubTo(sp.x, sp.y); },
        move(p, e, isDown) { moveTo(p); if (isDown && sp.down) scrubTo(sp.x, sp.y); else { sp.lx = sp.x; sp.ly = sp.y; } },
        up() { sp.down = false; },
      });
      function sample() {
        const d = m.getImageData(0, 0, mask.width, mask.height).data;
        let c = 0; for (let i = 0; i < grid.length; i++) if (d[grid[i]] < THR) c++;
        frac = grid.length ? c / grid.length : 1;
        api.setProgress(Math.min(1, frac / 0.95));
        if (frac - lastSpark > 0.04) { lastSpark = frac; C.burst(sp.x, sp.y - 20, '#fff1b8', 8); C.sfx('ding'); }
        if (frac >= 0.95 && !done) { done = true; api.complete(); }
      }
      return {
        update(dt) {
          t += dt; power = Math.max(0, power - dt);
          if ((sampleT -= dt) <= 0) { sampleT = 0.25; sample(); }
          if ((bubT -= dt) <= 0) {
            bubT = [0, 6, 5.5, 5][lvl] + rand(-1, 1);
            bubbles.push({ x: rand(140, 820), y: H + 30, r: rand(30, 38), vy: -rand(48, 70), ph: rand(0, TAU) });
          }
          const s = size();
          for (let i = bubbles.length - 1; i >= 0; i--) {
            const b = bubbles[i]; b.y += b.vy * dt; b.x += Math.cos(t * 2 + b.ph) * 26 * dt;
            const nx = clamp(b.x, sp.x - s.w / 2, sp.x + s.w / 2), ny = clamp(b.y, sp.y - s.h / 2, sp.y + s.h / 2);
            if (dist(nx, ny, b.x, b.y) < b.r + 10) { // generous touch
              bubbles.splice(i, 1); power = 5; stampKey = ''; C.sfx('pop'); C.burst(b.x, b.y, '#7ec8ff', 18);
            } else if (b.y < 30) bubbles.splice(i, 1);
          }
          for (let i = suds.length - 1; i >= 0; i--) { suds[i].life -= dt; suds[i].y += 20 * dt; if (suds[i].life <= 0) suds.splice(i, 1); }
        },
        draw(g) {
          g.drawImage(bg, 0, 0);
          g.drawImage(mask, 0, 0, W, H);
          for (const b of bubbles) {
            circ(g, b.x, b.y, b.r); g.fillStyle = 'rgba(207,232,255,.55)'; g.fill(); g.lineWidth = 3.5; g.strokeStyle = '#7ec8ff'; g.stroke();
            g.fillStyle = '#fff'; circ(g, b.x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.22); g.fill();
            text(g, '✦', b.x + 4, b.y + 4, 16, '#fff', 0);
          }
          for (const s of suds) { g.globalAlpha = Math.min(1, s.life * 2); circ(g, s.x, s.y, s.r); paint(g, '#fff', 2); }
          g.globalAlpha = 1;
          // sponge
          const s = size(), x = sp.x - s.w / 2, y = sp.y - s.h / 2, lift = sp.down ? 0 : -6;
          g.save(); g.translate(0, lift);
          if (!sp.down) shadow(g, sp.x, sp.y + s.h / 2 + 10, s.w * 0.45, 8, 0.12);
          if (power > 0) { g.shadowColor = '#fff'; g.shadowBlur = 24; }
          rr(g, x, y, s.w, s.h, 20); paint(g, power > 0 ? '#fff1b8' : '#ffd84d', 4);
          g.shadowBlur = 0;
          g.save(); rr(g, x, y, s.w, s.h, 20); g.clip(); g.fillStyle = '#8be38b'; g.fillRect(x, y, s.w, s.h * 0.28);
          g.beginPath(); g.moveTo(x, y + s.h * 0.28); g.lineTo(x + s.w, y + s.h * 0.28); g.lineWidth = 3; g.strokeStyle = INK; g.stroke(); g.restore();
          rr(g, x, y, s.w, s.h, 20); paint(g, null, 4);
          for (const hh of s.holes) { circ(g, sp.x + hh.x, sp.y + hh.y, hh.r); paint(g, 'rgba(255,214,224,.9)', 3); }
          g.fillStyle = 'rgba(255,255,255,.6)'; rr(g, x + 10, y + s.h * 0.4, 10, s.h * 0.4, 5); g.fill();
          if (power > 0) {
            g.beginPath(); g.arc(sp.x, sp.y, Math.max(s.w, s.h) / 2 + 12, -Math.PI / 2, -Math.PI / 2 + TAU * (power / 5));
            g.lineWidth = 5; g.strokeStyle = '#7ec8ff'; g.stroke();
            text(g, '✨ SUPER SPONGE ✨', sp.x, y - 22, 18, '#fff1b8', 5);
          }
          g.restore();
          if (!scrubMoved && t > 1.2) hint(g, 'Hold & scrub the mucky wall!', t);
          else if (holes.length && power <= 0 && t < 9) hint(g, 'Holey sponge! Pop a bubble to patch it 🫧', t);
        },
        stop() { L.off(); release(); return Math.round(clamp(frac / 0.95, 0, 1) * 100); },
      };
    },
  };

  // =====================================================================
  // TRASH — sort floor items into recycle / compost / trash bins.
  // =====================================================================
  const BINS = [
    { kind: 'recycle', x: 190, color: '#7ec8ff', label: 'RECYCLE', icons: ['can', 'bottle'] },
    { kind: 'compost', x: 480, color: '#8be38b', label: 'COMPOST', icons: ['banana', 'apple'] },
    { kind: 'trash', x: 770, color: '#c4b2e6', label: 'TRASH', icons: ['chips', 'gum'] },
  ];
  const BIN_TOP = 452, BIN_W = 160;
  function drawTrashBg(g) {
    g.fillStyle = PAL.sky; g.fillRect(0, 0, W, 210);
    for (let x = 0; x < W; x += 48) { g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(x, 0, 18, 210); }
    rr(g, 620, 40, 200, 130, 10); paint(g, '#fff', 5);
    g.fillStyle = '#bfe3ff'; g.fillRect(632, 52, 176, 106);
    circ(g, 770, 86, 18); paint(g, PAL.butter, 3);
    ell(g, 680, 120, 34, 14); paint(g, '#fff', 3);
    g.beginPath(); g.moveTo(720, 46); g.lineTo(720, 166); g.moveTo(626, 106); g.lineTo(814, 106); g.lineWidth = 5; g.strokeStyle = INK; g.stroke();
    rr(g, 120, 120, 220, 14, 6); paint(g, '#e8c9a8', 4); // shelf
    rr(g, 140, 80, 40, 40, 6); paint(g, '#ff7eb6', 3.5); text(g, 'A', 160, 101, 22, '#fff', 4);
    rr(g, 190, 92, 34, 28, 6); paint(g, '#ffd166', 3.5);
    circ(g, 270, 100, 20); paint(g, '#8be38b', 3.5);
    rr(g, -10, 200, W + 20, 16, 4); paint(g, '#fff', 4);
    floorPlanks(g, 216, 600);
    ell(g, 480, 330, 400, 110); paint(g, PAL.blush, 4);
    ell(g, 480, 330, 340, 82); g.setLineDash([12, 10]); g.lineWidth = 3; g.strokeStyle = '#ff9fb5'; g.stroke(); g.setLineDash([]);
  }
  function drawBin(g, b, t) {
    const x = b.x + (b.shake > 0 ? Math.sin(t * 60) * 6 * b.shake : 0), sq = 1 + (b.gulp || 0) * 0.08;
    g.save(); g.translate(x, BIN_TOP + 140); g.scale(1 / sq, sq); g.translate(-x, -(BIN_TOP + 140));
    shadow(g, x, BIN_TOP + 146, BIN_W * 0.55, 10);
    g.beginPath(); g.moveTo(x - BIN_W / 2, BIN_TOP); g.lineTo(x + BIN_W / 2, BIN_TOP); g.lineTo(x + BIN_W / 2 - 14, BIN_TOP + 150); g.lineTo(x - BIN_W / 2 + 14, BIN_TOP + 150); g.closePath();
    paint(g, b.color, 4);
    for (const dx of [-40, 0, 40]) { g.beginPath(); g.moveTo(x + dx, BIN_TOP + 62); g.lineTo(x + dx * 0.92, BIN_TOP + 140); g.lineWidth = 3; g.strokeStyle = 'rgba(59,47,74,.25)'; g.stroke(); }
    rr(g, x - 54, BIN_TOP + 14, 108, 46, 14); paint(g, '#fff', 3);
    drawItem(g, b.icons[0], x - 24, BIN_TOP + 37, 0.62, -0.2); drawItem(g, b.icons[1], x + 24, BIN_TOP + 37, 0.62, 0.2);
    text(g, b.label, x, BIN_TOP + 84, 20, '#fff', 5);
    // lid (opens while an item hovers over this bin)
    const open = b.open || 0;
    g.save(); g.translate(x - BIN_W / 2 - 4, BIN_TOP); g.rotate(-open * 0.9);
    rr(g, 0, -16, BIN_W + 8, 18, 8); paint(g, b.color, 4); rr(g, BIN_W / 2 - 16, -26, 40, 12, 6); paint(g, '#fff', 3);
    g.restore(); g.restore();
  }
  function drawPuppy(g, pup, t) {
    const mv = pup.state !== 'wait' ? 1 : 0, bob = Math.sin(t * 16) * 3 * mv;
    g.save(); g.translate(pup.x, pup.y); g.scale(pup.face, 1);
    shadow(g, 0, 2, 40, 9);
    for (const [lx, ph] of [[-22, 0], [-10, Math.PI], [14, Math.PI], [26, 0]]) { rr(g, lx - 5, -20 + Math.sin(t * 16 + ph) * 4 * mv, 10, 22, 5); paint(g, '#d9a066', 3); }
    g.beginPath(); g.moveTo(-32, -34); g.quadraticCurveTo(-44, -46, -48, -58 + Math.sin(t * 22) * 7); g.lineWidth = 9; g.strokeStyle = INK; g.stroke(); g.lineWidth = 4; g.strokeStyle = '#e8b98a'; g.stroke();
    ell(g, 0, -30 + bob, 36, 20); paint(g, '#e8b98a', 3.5);
    ell(g, -8, -36 + bob, 12, 9); paint(g, '#fff6e9', 0);
    circ(g, 34, -52 + bob, 21); paint(g, '#e8b98a', 3.5);
    ell(g, 24, -50 + bob, 8, 15, 0.35); paint(g, '#b07a4f', 3);
    ell(g, 50, -46 + bob, 11, 8); paint(g, '#fff6e9', 3);
    g.fillStyle = INK; circ(g, 58, -49 + bob, 4.5); g.fill(); circ(g, 38, -57 + bob, 3.4); g.fill();
    g.fillStyle = '#ff9fb5'; ell(g, 40, -45 + bob, 5, 3); g.fill();
    if (pup.carry) { g.restore(); drawItem(g, pup.carry.type, pup.x + pup.face * 60, pup.y - 36 + bob, 0.7, pup.face * 0.5); return; }
    g.restore();
  }

  C.chores.trash = {
    id: 'trash', name: 'Pick Up the Trash', emoji: '🗑️',
    howTo: 'Drag each item into the right bin: recycle, compost or trash. Peek at the pictures on the bins!',
    start(api) {
      const lvl = api.difficulty.level, L = listeners();
      const bg = prerender(drawTrashBg);
      const n = [0, 8, 12, 16][lvl];
      const types = Object.keys(KIND), items = [];
      const bag = []; while (bag.length < n) bag.push(...types.slice().sort(() => Math.random() - 0.5));
      for (let i = 0; i < n; i++) {
        let x, y, tries = 0;
        do { x = rand(70, 890); y = rand(236, 406); tries++; }
        while (tries < 200 && items.some((o) => dist(o.x, o.y, x, y) < (n > 12 ? 70 : 82)));
        items.push({ type: bag[i], kind: KIND[bag[i]], x, y, hx: x, hy: y, rot: rand(-0.5, 0.5), held: false, anim: null, done: false });
      }
      BINS.forEach((b) => { b.open = 0; b.shake = 0; b.gulp = 0; });
      let t = 0, sorted = 0, mistakes = 0, drag = null, finished = false, boops = 0;
      const pup = { state: 'wait', timer: rand(5, 7), x: -100, y: 320, face: 1, target: null, carry: null, dest: null };
      const free = (it) => !it.done && !it.anim && !it.held && it !== pup.carry;
      const binAt = (p) => (p.y > BIN_TOP - 50 ? BINS.find((b) => Math.abs(p.x - b.x) < 118) : null);
      const release = pointerInput(api, L, {
        down(p, e) {
          if (drag) return;
          if (lvl >= 3 && pup.state !== 'wait' && dist(p.x, p.y, pup.x + pup.face * 20, pup.y - 36) < 70) {
            if (pup.carry) { pup.carry.hx = pup.carry.x; pup.carry.hy = pup.carry.y; pup.carry = null; }
            pup.state = 'flee'; boops++; C.sfx('pop'); C.burst(pup.x, pup.y - 60, '#ff9fb5', 14); return;
          }
          let best = null, bd = 56;
          for (const it of items) if (!it.done && !it.anim) { const d = dist(p.x, p.y, it.x, it.y); if (d < bd) { bd = d; best = it; } }
          if (!best) return;
          if (best === pup.carry) { pup.carry = null; pup.state = 'flee'; }
          if (best === pup.target) pup.state = pup.state === 'run' ? 'flee' : pup.state;
          best.held = true; drag = { it: best, ox: best.x - p.x, oy: best.y - p.y, id: e.pointerId };
          C.sfx('pick');
        },
        move(p, e) {
          if (!drag || e.pointerId !== drag.id) return;
          drag.it.x = clamp(p.x + drag.ox, 20, W - 20); drag.it.y = clamp(p.y + drag.oy, 70, H - 20); drag.p = p;
        },
        up(p, e) {
          if (!drag || e.pointerId !== drag.id) return;
          const it = drag.it, b = binAt(p) || binAt(it); drag = null; it.held = false;
          if (b && b.kind === it.kind) {
            it.anim = { k: 'in', t: 0, dur: 0.28, fx: it.x, fy: it.y, tx: b.x, ty: BIN_TOP + 10, bin: b };
            C.sfx('drop');
          } else if (b) {
            mistakes++; b.shake = 1; C.sfx('wrong');
            it.anim = { k: 'back', t: 0, dur: 0.45, fx: it.x, fy: it.y, tx: it.hx, ty: it.hy };
          } else {
            it.y = clamp(it.y, 236, 410); it.hx = it.x; it.hy = it.y; C.sfx('drop');
          }
        },
      });
      function updatePup(dt) {
        const go = (tx, ty, sp) => { const d = dist(pup.x, pup.y, tx, ty); if (d < 1) return true; const k = Math.min(1, (sp * dt) / d);
          pup.face = tx > pup.x ? 1 : -1; pup.x += (tx - pup.x) * k; pup.y += (ty - pup.y) * k; return d < sp * dt + 2; };
        if (pup.state === 'wait') {
          if ((pup.timer -= dt) > 0) return;
          const cands = items.filter(free);
          if (!cands.length) { pup.timer = 3; return; }
          pup.target = pick(cands); pup.x = pup.target.x < 480 ? W + 90 : -90; pup.y = pup.target.y + 26; pup.state = 'run'; C.sfx('whoosh');
        } else if (pup.state === 'run') {
          if (!free(pup.target)) { pup.state = 'flee'; return; }
          if (go(pup.target.x - pup.face * 56, pup.target.y + 26, 230)) {
            pup.carry = pup.target; pup.state = 'drag';
            pup.dest = { x: pup.carry.x < 480 ? rand(620, 880) : rand(80, 340), y: rand(250, 410) };
          }
        } else if (pup.state === 'drag') {
          const done = go(pup.dest.x, pup.dest.y, 110);
          if (pup.carry) { pup.carry.x = pup.x + pup.face * 60; pup.carry.y = pup.y - 26; }
          if (done) { if (pup.carry) { pup.carry.y = clamp(pup.y - 10, 236, 410); pup.carry.hx = pup.carry.x; pup.carry.hy = pup.carry.y; } pup.carry = null; pup.state = 'flee'; }
        } else if (pup.state === 'flee') {
          if (go(pup.x < 480 ? -120 : W + 120, pup.y, 340)) { pup.state = 'wait'; pup.timer = rand(6, 9); pup.target = null; }
        }
      }
      return {
        update(dt) {
          t += dt;
          for (const b of BINS) {
            const hov = drag && drag.p && binAt(drag.p) === b;
            b.open = lerp(b.open, hov ? 1 : 0, Math.min(1, dt * 14)); b.shake = Math.max(0, b.shake - dt * 2.5); b.gulp = Math.max(0, b.gulp - dt * 4);
          }
          for (const it of items) {
            const a = it.anim; if (!a) continue;
            a.t = Math.min(1, a.t + dt / a.dur);
            const e = a.k === 'back' ? easeBack(a.t) : easeOut(a.t);
            it.x = lerp(a.fx, a.tx, e); it.y = lerp(a.fy, a.ty, e) - (a.k === 'back' ? Math.sin(a.t * Math.PI) * 50 : 0);
            if (a.t >= 1) {
              if (a.k === 'in') {
                it.done = true; sorted++; a.bin.gulp = 1; C.burst(a.bin.x, BIN_TOP - 10, a.bin.color, 14); C.sfx('ding');
                api.setProgress(sorted / n);
              } else { it.x = it.hx; it.y = it.hy; }
              it.anim = null;
            }
          }
          if (lvl >= 3) updatePup(dt);
          if (sorted >= n && !finished) { finished = true; api.complete(); }
        },
        draw(g) {
          g.drawImage(bg, 0, 0);
          const live = items.filter((it) => !it.done && it !== (drag && drag.it)).sort((a, b) => a.y - b.y);
          for (const it of live) {
            if (it.anim && it.anim.k === 'in') continue;
            shadow(g, it.x, it.y + 26, 26, 7);
            drawItem(g, it.type, it.x, it.y + Math.sin(t * 3 + it.hx) * 1.5, 1, it.rot);
          }
          if (lvl >= 3 && pup.state !== 'wait') drawPuppy(g, pup, t);
          BINS.forEach((b) => drawBin(g, b, t));
          for (const it of items) if (it.anim && it.anim.k === 'in') drawItem(g, it.type, it.x, it.y, 1 - it.anim.t * 0.6, it.rot + it.anim.t * 3);
          if (drag) { const it = drag.it; shadow(g, it.x, it.y + 40, 24, 6, 0.12); drawItem(g, it.type, it.x, it.y, 1.18, Math.sin(t * 10) * 0.08); }
          if (t < 5 && !sorted) hint(g, 'Drag each thing into its matching bin ⬇', t);
          else if (lvl >= 3 && pup.state === 'drag') hint(g, 'Sneaky puppy! Tap it to make it drop 🐶', t);
        },
        stop() {
          L.off(); release(); if (drag) drag.it.held = false;
          return Math.round(clamp((sorted / n) * 100 - mistakes * 6 + boops * 2, 0, 100));
        },
        _dbg: { items, pup, BINS },
      };
    },
  };

  // =====================================================================
  // BED — wrinkles -> blanket -> pillows -> teddy (strict order).
  // =====================================================================
  const MAT = { x: 236, y: 196, w: 488, h: 276 };
  const PILLOW_COLS = [['#ffb3c7', '#ff7eb6'], ['#bfe0ff', '#7ec8ff'], ['#fff1b8', '#ffd166'], ['#c9f2df', '#5fd39a']];
  function drawBedBg(g) {
    g.fillStyle = '#e9ddff'; g.fillRect(0, 0, W, 150);
    for (let x = 0; x < W; x += 60) { g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(x, 0, 30, 150); }
    rr(g, 60, 26, 130, 100, 10); paint(g, '#fff', 5); g.fillStyle = '#bfe3ff'; g.fillRect(70, 36, 110, 80);
    circ(g, 150, 62, 14); paint(g, PAL.butter, 3);
    g.beginPath(); g.moveTo(125, 30); g.lineTo(125, 122); g.lineWidth = 5; g.strokeStyle = INK; g.stroke();
    g.beginPath(); g.moveTo(760, 34); for (let i = 0; i <= 6; i++) g.lineTo(760 + i * 28, 34 + (i % 2) * 10); g.lineWidth = 3; g.stroke();
    for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(762 + i * 28, 36 + (i % 2) * 10); g.lineTo(790 + i * 28, 36 + ((i + 1) % 2) * 10); g.lineTo(776 + i * 28, 66); g.closePath(); paint(g, ['#ff7eb6', '#7ec8ff', '#ffd166'][i % 3], 3); }
    rr(g, -10, 140, W + 20, 14, 4); paint(g, '#fff', 4);
    floorPlanks(g, 154, 600, '#f0d6b8', '#e2c29e');
    ell(g, 480, 548, 300, 46); paint(g, PAL.mint, 4);
    // bed frame
    g.beginPath(); g.moveTo(214, 230); g.lineTo(214, 120); g.quadraticCurveTo(214, 76, 260, 76); g.lineTo(700, 76); g.quadraticCurveTo(746, 76, 746, 120); g.lineTo(746, 230); g.closePath();
    paint(g, '#ff9fc0', 5);
    g.save(); g.translate(480, 116); g.beginPath(); g.moveTo(0, 14); g.bezierCurveTo(-26, -6, -14, -26, 0, -12); g.bezierCurveTo(14, -26, 26, -6, 0, 14); paint(g, '#fff', 3.5); g.restore();
    rr(g, 222, 452, 516, 44, 12); paint(g, '#ff9fc0', 5);
    rr(g, 236, 490, 22, 24, 6); paint(g, '#d97aa0', 4); rr(g, 702, 490, 22, 24, 6); paint(g, '#d97aa0', 4);
    rr(g, MAT.x, MAT.y, MAT.w, MAT.h, 18); paint(g, PAL.mint, 4);
    g.fillStyle = 'rgba(255,255,255,.7)';
    for (let y = MAT.y + 22; y < MAT.y + MAT.h - 10; y += 34) for (let x = MAT.x + 22 + ((y / 34) % 2) * 17; x < MAT.x + MAT.w - 10; x += 34) { circ(g, x, y, 3.5); g.fill(); }
  }
  function drawPillow(g, x, y, w, h, col, s = 1, t = 0) {
    g.save(); g.translate(x, y); g.scale(s, s);
    g.beginPath(); g.moveTo(-w / 2, -h / 2 + 8); g.quadraticCurveTo(0, -h / 2 - 6, w / 2, -h / 2 + 8); g.quadraticCurveTo(w / 2 + 8, 0, w / 2, h / 2 - 8);
    g.quadraticCurveTo(0, h / 2 + 6, -w / 2, h / 2 - 8); g.quadraticCurveTo(-w / 2 - 8, 0, -w / 2, -h / 2 + 8); g.closePath(); paint(g, col[0], 4);
    g.beginPath(); g.moveTo(-w / 2 + 16, 0); g.quadraticCurveTo(0, 6, w / 2 - 16, 0); g.lineWidth = 2.5; g.strokeStyle = col[1]; g.stroke();
    g.restore();
  }
  function drawTeddy(g, x, y, s = 1) {
    g.save(); g.translate(x, y); g.scale(s, s);
    for (const k of [-1, 1]) { circ(g, k * 18, 22, 12); paint(g, '#c98b5a', 3.5); circ(g, k * 26, -2, 9); paint(g, '#c98b5a', 3.5); }
    ell(g, 0, 10, 22, 24); paint(g, '#d99a66', 3.5); ell(g, 0, 14, 12, 13); paint(g, '#f2d2b0', 0);
    for (const k of [-1, 1]) { circ(g, k * 17, -38, 9); paint(g, '#c98b5a', 3.5); }
    circ(g, 0, -22, 22); paint(g, '#d99a66', 3.5); ell(g, 0, -15, 10, 7); paint(g, '#f2d2b0', 2.5);
    g.fillStyle = INK; circ(g, -8, -26, 3); g.fill(); circ(g, 8, -26, 3); g.fill(); ell(g, 0, -18, 4, 3); g.fill();
    g.fillStyle = '#ff9fb5'; ell(g, -14, -17, 4, 2.5); g.fill(); ell(g, 14, -17, 4, 2.5); g.fill();
    g.beginPath(); g.moveTo(-8, -6); g.lineTo(0, -1); g.lineTo(8, -6); g.lineTo(8, 4); g.lineTo(0, -1); g.lineTo(-8, 4); g.closePath(); paint(g, '#ff7eb6', 2.5);
    g.restore();
  }

  C.chores.bed = {
    id: 'bed', name: 'Make the Bed', emoji: '🛏️',
    howTo: 'Swipe to smooth the wrinkles, drag the blanket up, plop the pillows in place, then tuck in Teddy!',
    start(api) {
      const lvl = api.difficulty.level, L = listeners();
      const bg = prerender(drawBedBg);
      const NEED = [0, 230, 340, 520][lvl], HEAVY = [0, 240, 260, 340][lvl]; // swipe px per wrinkle; px of pull per full blanket
      const wrinkles = [];
      for (let i = 0; i < [0, 3, 5, 7][lvl]; i++) {
        let x, y, tries = 0;
        do { x = rand(290, 670); y = rand(300, 440); tries++; } while (tries < 100 && wrinkles.some((w) => dist(w.x, w.y, x, y) < 90));
        wrinkles.push({ x, y, ang: rand(-0.6, 0.6), amt: 1 });
      }
      const nP = [0, 2, 3, 4][lvl], match = lvl >= 2, pw = nP === 4 ? 104 : 124;
      const slots = Array.from({ length: nP }, (_, i) => ({ x: 480 + (i - (nP - 1) / 2) * (nP === 4 ? 116 : 150), y: 236, col: PILLOW_COLS[match ? i : 0], fill: null }));
      const spots = [[110, 300], [850, 300], [100, 430], [860, 440], [170, 540], [790, 545]].sort(() => Math.random() - 0.5);
      const objs = slots.map((s, i) => ({ kind: 'pillow', col: match ? s.col : PILLOW_COLS[0], x: spots[i][0], y: spots[i][1], hx: spots[i][0], hy: spots[i][1], placed: false, anim: null, rot: rand(-0.4, 0.4) }));
      if (match) objs.sort(() => Math.random() - 0.5);
      const ts = spots[nP];
      const teddy = { kind: 'teddy', x: ts[0], y: ts[1], hx: ts[0], hy: ts[1], placed: false, anim: null, rot: rand(-0.3, 0.3) };
      const TEDDY_SPOT = { x: 480, y: 352 };
      let step = 0, t = 0, blanket = 0, mistakes = 0, drag = null, swipe = null, finished = false, blanketAnim = null;
      const STEPS = ['Swipe across the wrinkles to smooth them!', 'Drag the blanket up onto the bed!',
        match ? 'Plop each pillow on its matching color!' : 'Drag the pillows to the top of the bed!', 'Tuck Teddy in the middle!'];
      const wrinkleProg = () => wrinkles.length ? wrinkles.reduce((a, w) => a + (1 - w.amt), 0) / wrinkles.length : 1;
      function progress() {
        const pp = nP ? objs.filter((o) => o.placed).length / nP : 1;
        return wrinkleProg() * 0.3 + blanket * 0.2 + (step >= 2 ? pp * 0.35 : 0) + (teddy.placed ? 0.15 : 0);
      }
      const bl = () => { const k = blanket; return { x0: lerp(300, 226, k), x1: lerp(660, 734, k), y0: lerp(512, 272, k), y1: lerp(590, 492, k) }; };
      function advance() {
        step++; C.sfx('ding'); C.burst(480, 330, '#fff1b8', 24);
        if (step >= 4 && !finished) { finished = true; api.setProgress(1); api.complete(); }
      }
      const release = pointerInput(api, L, {
        down(p, e) {
          if (drag || swipe) return;
          if (step === 0) swipe = { x: p.x, y: p.y, id: e.pointerId };
          else if (step === 1) {
            const b = bl();
            if (p.x > b.x0 - 40 && p.x < b.x1 + 40 && p.y > b.y0 - 50 && p.y < b.y1 + 30) { drag = { blanket: true, sy: p.y, s0: blanket, id: e.pointerId }; blanketAnim = null; C.sfx('pick'); }
          } else {
            const pool = step === 2 ? objs : [teddy];
            let best = null, bd = 80;
            for (const o of pool) if (!o.placed && !o.anim) { const d = dist(p.x, p.y, o.x, o.y); if (d < bd) { bd = d; best = o; } }
            if (best) { drag = { o: best, ox: best.x - p.x, oy: best.y - p.y, id: e.pointerId }; C.sfx('pick'); }
          }
        },
        move(p, e) {
          if (swipe && e.pointerId === swipe.id) {
            const d = dist(swipe.x, swipe.y, p.x, p.y);
            for (const w of wrinkles) {
              if (w.amt <= 0) continue;
              const vx = p.x - swipe.x, vy = p.y - swipe.y, l2 = vx * vx + vy * vy || 1;
              const k = clamp(((w.x - swipe.x) * vx + (w.y - swipe.y) * vy) / l2, 0, 1);
              if (dist(swipe.x + vx * k, swipe.y + vy * k, w.x, w.y) < 62) {
                w.amt = Math.max(0, w.amt - d / NEED); C.sfx('scrub');
                if (w.amt <= 0) { C.burst(w.x, w.y, '#c9f2df', 12); C.sfx('pop'); }
              }
            }
            swipe.x = p.x; swipe.y = p.y;
            if (wrinkles.every((w) => w.amt <= 0) && step === 0) { swipe = null; advance(); }
            api.setProgress(progress());
          } else if (drag && e.pointerId === drag.id) {
            if (drag.blanket) { blanket = clamp(drag.s0 + (drag.sy - p.y) / HEAVY, 0, 1); api.setProgress(progress()); }
            else { drag.o.x = clamp(p.x + drag.ox, 30, W - 30); drag.o.y = clamp(p.y + drag.oy, 80, H - 30); }
          }
        },
        up(p, e) {
          if (swipe && e.pointerId === swipe.id) swipe = null;
          if (!drag || e.pointerId !== drag.id) return;
          const d = drag; drag = null;
          if (d.blanket) {
            if (blanket >= 0.78) blanketAnim = { to: 1 };
            else if (lvl >= 3) blanketAnim = { to: blanket * 0.65 };
            C.sfx('whoosh'); return;
          }
          const o = d.o;
          if (o.kind === 'teddy') {
            if (dist(o.x, o.y, TEDDY_SPOT.x, TEDDY_SPOT.y) < 110) { o.anim = { fx: o.x, fy: o.y, tx: TEDDY_SPOT.x, ty: TEDDY_SPOT.y, t: 0, place: true }; C.sfx('drop'); }
            else { o.hx = o.x; o.hy = o.y; C.sfx('drop'); }
            return;
          }
          let best = null, bd = 100;
          for (const s of slots) if (!s.fill) { const dd = dist(o.x, o.y, s.x, s.y); if (dd < bd) { bd = dd; best = s; } }
          if (best && (!match || best.col === o.col)) { best.fill = o; o.anim = { fx: o.x, fy: o.y, tx: best.x, ty: best.y, t: 0, place: true }; C.sfx('drop'); }
          else if (best) { mistakes++; C.sfx('wrong'); o.anim = { fx: o.x, fy: o.y, tx: o.hx, ty: o.hy, t: 0, back: true }; }
          else { o.hx = o.x; o.hy = o.y; C.sfx('drop'); }
        },
      });
      return {
        update(dt) {
          t += dt;
          if (blanketAnim) {
            blanket = lerp(blanket, blanketAnim.to, Math.min(1, dt * 10));
            if (Math.abs(blanket - blanketAnim.to) < 0.01) {
              blanket = blanketAnim.to; const full = blanketAnim.to === 1; blanketAnim = null;
              if (full && step === 1) advance();
            }
            api.setProgress(progress());
          }
          for (const o of [...objs, teddy]) {
            const a = o.anim; if (!a) continue;
            a.t = Math.min(1, a.t + dt / (a.back ? 0.45 : 0.22));
            const e = a.back ? easeBack(a.t) : easeOut(a.t);
            o.x = lerp(a.fx, a.tx, e); o.y = lerp(a.fy, a.ty, e) - (a.back ? Math.sin(a.t * Math.PI) * 40 : 0);
            if (a.t >= 1) {
              o.anim = null;
              if (a.place) {
                o.placed = true; o.rot = 0; C.burst(o.x, o.y, o.kind === 'teddy' ? '#ff9fb5' : o.col[1], 10);
                api.setProgress(progress());
                if (step === 2 && objs.every((q) => q.placed)) advance();
                else if (step === 3 && teddy.placed) advance();
              }
            }
          }
        },
        draw(g) {
          g.drawImage(bg, 0, 0);
          for (const w of wrinkles) {
            if (w.amt <= 0 || blanket > 0.95) continue;
            g.save(); g.translate(w.x, w.y); g.rotate(w.ang); g.globalAlpha = 0.35 + 0.65 * w.amt;
            const amp = 9 * w.amt + 2;
            for (let r = -1; r <= 1; r++) {
              g.beginPath();
              for (let x = -60; x <= 60; x += 6) g.lineTo(x, r * 16 + Math.sin(x / 9 + r) * amp * (1 - Math.abs(x) / 70));
              g.lineWidth = 6; g.strokeStyle = '#8fd1b5'; g.stroke(); g.lineWidth = 2.5; g.strokeStyle = INK; g.stroke();
            }
            g.restore(); g.globalAlpha = 1;
            if (step === 0) { g.save(); g.globalAlpha = 0.25 + 0.15 * Math.sin(t * 5 + w.x); circ(g, w.x, w.y, 62); g.lineWidth = 3; g.setLineDash([8, 8]); g.strokeStyle = INK; g.stroke(); g.restore(); }
          }
          // blanket
          const b = bl(), wob = (1 - blanket) * 10;
          g.beginPath(); g.moveTo(b.x0, b.y0);
          for (let x = b.x0; x <= b.x1; x += 6) g.lineTo(x, b.y0 + Math.sin(x / 23 + t * 2 * (drag && drag.blanket ? 1 : 0)) * wob);
          g.lineTo(b.x1 + wob, b.y1);
          for (let x = b.x1; x >= b.x0; x -= 6) g.lineTo(x, b.y1 + Math.sin(x / 17) * (wob + 3));
          g.closePath(); paint(g, '#fff1b8', 4);
          g.save(); g.clip();
          g.fillStyle = 'rgba(255,159,192,.55)';
          for (let x = b.x0 + 30; x < b.x1; x += 60) for (let y = b.y0 + 40; y < b.y1; y += 50) { g.save(); g.translate(x, y); g.beginPath(); g.moveTo(0, 7); g.bezierCurveTo(-12, -2, -6, -12, 0, -5); g.bezierCurveTo(6, -12, 12, -2, 0, 7); g.fill(); g.restore(); }
          g.fillStyle = '#ffd166'; g.fillRect(b.x0 - 10, b.y0 - 12, b.x1 - b.x0 + 30, 26);
          g.restore();
          g.beginPath(); g.moveTo(b.x0, b.y0 + 14); g.lineTo(b.x1, b.y0 + 14); g.lineWidth = 3; g.strokeStyle = INK; g.stroke();
          if (step >= 2) for (const s of slots) if (!s.fill) dashedSlot(g, s.x, s.y, pw + 8, 70, s.col[1], t);
          if (step >= 3 && !teddy.placed) { g.save(); g.setLineDash([8, 8]); g.lineDashOffset = -t * 20; circ(g, TEDDY_SPOT.x, TEDDY_SPOT.y, 44); g.lineWidth = 4; g.strokeStyle = '#ff7eb6'; g.stroke(); g.restore(); }
          const all = [...objs, teddy].filter((o) => o !== (drag && drag.o)).sort((a, c) => (a.placed === c.placed ? a.y - c.y : a.placed ? -1 : 1));
          for (const o of all) {
            const active = (step === 2 && o.kind === 'pillow' && !o.placed) || (step === 3 && o.kind === 'teddy' && !o.placed);
            if (!o.placed) shadow(g, o.x, o.y + 34, 50, 8);
            g.save(); g.translate(o.x, o.y + (active ? Math.sin(t * 5 + o.hx) * 3 : 0)); g.rotate(o.rot);
            if (o.kind === 'pillow') drawPillow(g, 0, 0, pw, 64, o.col); else drawTeddy(g, 0, 0);
            g.restore();
          }
          if (drag && drag.o) { const o = drag.o; shadow(g, o.x, o.y + 46, 46, 8, 0.12);
            if (o.kind === 'pillow') drawPillow(g, o.x, o.y, pw, 64, o.col, 1.12); else drawTeddy(g, o.x, o.y, 1.15); }
          if (step === 1 && !drag) { g.save(); g.translate(480, b.y0 - 30); g.rotate(Math.PI); downArrow(g, 0, 0, t, PAL.mint); g.restore(); }
          if (step < 4) hint(g, STEPS[step], t);
        },
        stop() { L.off(); release(); return Math.round(clamp(progress() * 100 - mistakes * 4, 0, 100)); },
        _dbg: { wrinkles, objs, teddy, slots, TEDDY_SPOT, get step() { return step; }, get blanket() { return blanket; } },
      };
    },
  };

  // =====================================================================
  // TAKEOUT — tie bag, carry to curb, hop obstacles, pick up leaks.
  // =====================================================================
  const GY = 506, DOOR_X = 96, BAG_X = 178, CURB_X = 812, BIN_X = 880;
  function drawStreetBg(g) {
    const sky = g.createLinearGradient(0, 0, 0, GY); sky.addColorStop(0, '#bfe3ff'); sky.addColorStop(1, '#eaf6ff');
    g.fillStyle = sky; g.fillRect(0, 0, W, GY);
    for (const [x, y, s] of [[300, 110, 1], [560, 80, 0.8], [700, 150, 1.1]]) { g.save(); g.translate(x, y); g.scale(s, s);
      g.beginPath(); g.arc(0, 0, 26, Math.PI, 0); g.arc(30, -10, 30, Math.PI, 0); g.arc(64, 0, 24, Math.PI, 0); g.closePath(); paint(g, '#fff', 3.5); g.restore(); }
    circ(g, 880, 90, 34); paint(g, PAL.butter, 4);
    for (let x = 240; x < 800; x += 46) { rr(g, x, 400, 12, 106, 5); paint(g, '#fff', 3); } // fence
    rr(g, 230, 420, 580, 12, 6); paint(g, '#fff', 3); rr(g, 230, 458, 580, 12, 6); paint(g, '#fff', 3);
    // house
    g.fillStyle = '#ffd6e0'; g.fillRect(0, 230, 200, GY - 230); g.lineWidth = 5; g.strokeStyle = INK; g.strokeRect(-5, 230, 205, GY - 230);
    g.beginPath(); g.moveTo(-20, 236); g.lineTo(90, 150); g.lineTo(222, 236); g.closePath(); paint(g, '#ff7eb6', 5);
    for (let y = 262; y < GY; y += 26) { g.beginPath(); g.moveTo(0, y); g.lineTo(198, y); g.lineWidth = 2; g.strokeStyle = 'rgba(59,47,74,.12)'; g.stroke(); }
    rr(g, 50, 330, 92, GY - 330 + 4, 12); paint(g, '#7ec8ff', 5); circ(g, 126, 424, 6); paint(g, PAL.butter, 3);
    rr(g, 66, 346, 60, 40, 8); paint(g, '#cfe8ff', 3);
    rr(g, 148, 280, 40, 40, 6); paint(g, '#fff', 4);
    // ground
    g.fillStyle = '#8be38b'; g.fillRect(0, GY, W, 20); g.fillStyle = '#e9e2f2'; g.fillRect(0, GY + 20, W, H - GY - 20);
    g.beginPath(); g.moveTo(0, GY); g.lineTo(W, GY); g.lineWidth = 4; g.strokeStyle = INK; g.stroke();
    for (let x = 0; x < W; x += 80) { g.beginPath(); g.moveTo(x, GY + 20); g.lineTo(x, H); g.lineWidth = 2; g.strokeStyle = 'rgba(59,47,74,.15)'; g.stroke(); }
    g.fillStyle = '#c9c1d6'; g.fillRect(CURB_X + 10, GY + 20, W, H); g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(CURB_X + 10, GY + 20, 200, 8);
    // flag
    g.beginPath(); g.moveTo(CURB_X, GY); g.lineTo(CURB_X, GY - 90); g.lineWidth = 4; g.strokeStyle = INK; g.stroke();
    g.beginPath(); g.moveTo(CURB_X, GY - 90); g.lineTo(CURB_X + 40, GY - 78); g.lineTo(CURB_X, GY - 66); g.closePath(); paint(g, '#ffd166', 3);
  }
  function drawBag(g, x, y, tied, s = 1, ties = 0, need = 1, t = 0) {
    g.save(); g.translate(x, y); g.scale(s, s);
    shadow(g, 0, 2, 30, 6);
    g.beginPath(); g.moveTo(-26, -6); g.quadraticCurveTo(-34, -40, -18, -58); g.lineTo(18, -58); g.quadraticCurveTo(34, -40, 26, -6); g.quadraticCurveTo(0, 6, -26, -6); g.closePath();
    paint(g, '#8a7fb0', 4);
    g.fillStyle = 'rgba(255,255,255,.35)'; ell(g, -12, -34, 5, 12, 0.2); g.fill();
    if (tied) {
      g.beginPath(); g.moveTo(-10, -58); g.lineTo(0, -64); g.lineTo(10, -58); paint(g, null, 4);
      ell(g, -10, -72, 9, 6, -0.6); paint(g, '#8a7fb0', 3.5); ell(g, 10, -72, 9, 6, 0.6); paint(g, '#8a7fb0', 3.5); circ(g, 0, -64, 5); paint(g, '#6d6394', 3);
    } else {
      const open = 1 - ties / need;
      g.beginPath(); g.moveTo(-18, -58); g.lineTo(-24 * open - 6, -72); g.lineTo(24 * open + 6, -72); g.lineTo(18, -58); paint(g, '#8a7fb0', 3.5);
      drawItem(g, 'banana', -8, -74, 0.45, -0.3); drawItem(g, 'can', 10, -76, 0.45, 0.4);
      g.globalAlpha = 0.6; g.lineWidth = 3; g.strokeStyle = '#8be38b';
      for (const k of [-1, 1]) { g.beginPath(); for (let i = 0; i < 12; i++) g.lineTo(k * 22 + Math.sin(i / 2 + t * 4) * 5, -82 - i * 3); g.stroke(); }
      g.globalAlpha = 1;
    }
    g.restore();
  }
  function drawCat(g, x, face, t, walking) {
    g.save(); g.translate(x, GY); g.scale(face, 1);
    shadow(g, 0, 2, 30, 6);
    g.beginPath(); g.moveTo(-22, -16); g.quadraticCurveTo(-46, -30, -38, -56 + Math.sin(t * 3) * 6); g.lineWidth = 10; g.strokeStyle = INK; g.stroke(); g.lineWidth = 5; g.strokeStyle = '#ffb36b'; g.stroke();
    const st = walking ? Math.sin(t * 12) * 4 : 0;
    for (const lx of [-14, 12]) { rr(g, lx - 5, -14 + st * (lx > 0 ? 1 : -1), 10, 14, 4); paint(g, '#ffb36b', 3); }
    ell(g, 0, -22, 26, 17); paint(g, '#ffb36b', 3.5);
    circ(g, 20, -42, 17); paint(g, '#ffb36b', 3.5);
    for (const ex of [8, 28]) { g.beginPath(); g.moveTo(ex - 7, -52); g.lineTo(ex, -68); g.lineTo(ex + 7, -54); g.closePath(); paint(g, '#ffb36b', 3); }
    g.fillStyle = INK; circ(g, 18, -44, 2.6); g.fill(); circ(g, 28, -44, 2.6); g.fill();
    g.fillStyle = '#ff9fb5'; ell(g, 23, -37, 3, 2); g.fill();
    for (let i = -10; i <= -6; i += 4) { g.beginPath(); g.moveTo(-6, i - 18); g.lineTo(6, i - 20); g.lineWidth = 3; g.strokeStyle = '#e8873a'; g.stroke(); }
    g.restore();
  }
  function drawObstacle(g, o, t) {
    if (o.type === 'puddle') {
      ell(g, o.x, GY + 4, o.w / 2, 9); paint(g, '#7ec8ff', 3.5); g.fillStyle = 'rgba(255,255,255,.7)'; ell(g, o.x - o.w * 0.18, GY + 2, o.w * 0.12, 3); g.fill();
    } else if (o.type === 'blocks') {
      rr(g, o.x - 22, GY - 40, 44, 40, 6); paint(g, '#ff7eb6', 3.5); text(g, 'A', o.x, GY - 19, 22, '#fff', 4);
      rr(g, o.x - 14, GY - 66, 28, 26, 5); paint(g, '#ffd166', 3.5); text(g, 'b', o.x, GY - 53, 16, '#fff', 3);
    } else if (o.type === 'car') {
      rr(g, o.x - 28, GY - 30, 56, 20, 8); paint(g, '#8be38b', 3.5); rr(g, o.x - 14, GY - 44, 28, 16, 6); paint(g, PAL.sky, 3.5);
      circ(g, o.x - 16, GY - 8, 8); paint(g, INK, 0); circ(g, o.x + 16, GY - 8, 8); paint(g, INK, 0);
    } else if (o.type === 'cat') drawCat(g, o.x, o.face, t, o.speed > 0);
  }

  C.chores.takeout = {
    id: 'takeout', name: 'Take Out the Trash', emoji: '🚮',
    howTo: 'Tap the bag to tie it, then carry it to the curb. Hold ◀ ▶ (or arrow keys) to walk. Hit HOP, flick up, or press Space to jump the toys!',
    start(api) {
      const lvl = api.difficulty.level, L = listeners(), player = api.player || { color: '#ff7eb6' };
      const bg = prerender(drawStreetBg);
      const nBags = [0, 1, 2, 3][lvl], TIES = [0, 1, 2, 3][lvl], SPEED = [0, 250, 270, 290][lvl];
      const LEAK = [0, 0, 3.0, 1.9][lvl];
      // Obstacles come in groups at fixed slots so every landing zone is fair: hop length (~170px) < gap between groups.
      // Super pairs two toys close enough to clear with one hop; the walking cat roams its own slot.
      const groups = lvl === 1 ? [['blocks'], ['puddle']] : lvl === 2 ? [['blocks'], ['puddle'], ['cat']] : [['blocks', 'car'], ['puddle'], ['cat']];
      groups.sort(() => Math.random() - 0.5);
      const centers = lvl === 1 ? [400, 640] : lvl === 2 ? [350, 556, 752] : [372, 574, 748];
      const obs = [];
      groups.forEach((gp, i) => {
        const c = centers[i] + rand(-8, 8);
        gp.forEach((type, j) => {
          const x = c + (j - (gp.length - 1) / 2) * 66;
          obs.push({ type, x, x0: x, w: type === 'puddle' ? 84 : type === 'blocks' ? 44 : 56, h: type === 'puddle' ? 0 : type === 'blocks' ? 62 : type === 'car' ? 42 : 56,
            face: pick([-1, 1]), speed: type === 'cat' && lvl >= 3 ? 55 : 0 });
        });
      });
      const me = { x: 228, y: 0, vy: 0, face: -1, kb: 0, stun: 0, inv: 0, coyote: 0, buf: 0, moving: false };
      let t = 0, delivered = 0, bumps = 0, carrying = false, ties = 0, bagX = BAG_X, toss = null, finished = false, leakT = LEAK, picked = 0;
      let tied = false;
      const bits = [], keys = new Set(), holds = new Map();
      const hop = () => { me.buf = 0.14; };
      const tryTie = () => {
        if (tied || carrying || toss || delivered >= nBags) return false;
        ties++; C.sfx('click'); C.burst(bagX, GY - 70, '#c4b2e6', 6);
        if (ties >= TIES) { tied = true; C.sfx('ding'); }
        return true;
      };
      const nearBag = () => !carrying && !toss && delivered < nBags && Math.abs(me.x - bagX) < 70;
      L.on(window, 'keydown', (e) => {
        const k = e.code;
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'Space', 'KeyA', 'KeyD', 'KeyW', 'Enter'].includes(k)) e.preventDefault(); // Enter too: it ties/hops, and must not also click a focused button (e.g. mute)
        if (e.repeat) return;
        keys.add(k);
        if (k === 'Space' || k === 'ArrowUp' || k === 'KeyW' || k === 'Enter') { if (!(nearBag() && !tied && tryTie())) hop(); }
      });
      L.on(window, 'keyup', (e) => keys.delete(e.code));
      L.on(window, 'blur', () => { keys.clear(); holds.clear(); });
      const release = pointerInput(api, L, {
        down(p, e) {
          if (dist(p.x, p.y, PADS.hop.x, PADS.hop.y) < PADS.hop.r + 14) { hop(); PADS.hop.flash = 0.15; return; }
          for (let i = bits.length - 1; i >= 0; i--) {
            if (dist(p.x, p.y, bits[i].x, GY - 8) < 54) { const b = bits.splice(i, 1)[0]; picked++; C.sfx('pick'); C.burst(b.x, GY - 10, '#8be38b', 10); return; }
          }
          if (!tied && !carrying && !toss && delivered < nBags && dist(p.x, p.y, bagX, GY - 40) < 75) { tryTie(); return; }
          const pad = dist(p.x, p.y, PADS.l.x, PADS.l.y) < PADS.l.r + 12 ? -1 : dist(p.x, p.y, PADS.r.x, PADS.r.y) < PADS.r.r + 12 ? 1 : 0;
          holds.set(e.pointerId, { x: p.x, sy: p.y, pad }); // press = walk (never hop: a first press must not launch you into a toy)
        },
        move(p, e) {
          const hd = holds.get(e.pointerId); if (!hd) return;
          hd.x = p.x;
          if (hd.sy - p.y > 40) { hop(); hd.sy = p.y; } else if (p.y > hd.sy) hd.sy = p.y; // flick up while holding = hop
        },
        up(p, e) { holds.delete(e.pointerId); },
      });
      const hb = 13; // player half-width (forgiving)
      const PADS = { l: { x: 62, y: 556, r: 36 }, r: { x: 150, y: 556, r: 36 }, hop: { x: 826, y: 556, r: 38, flash: 0 } };
      function progress() {
        let part = 0;
        if (delivered < nBags) part = carrying ? 0.15 + 0.85 * clamp((me.x - BAG_X) / (CURB_X - BAG_X), 0, 1) : tied ? 0.15 : (ties / TIES) * 0.15;
        let p = (delivered + part) / nBags;
        if (delivered >= nBags && bits.length) p = 0.97;
        return Math.min(1, p);
      }
      return {
        update(dt) {
          t += dt;
          let dir = 0;
          if (keys.has('ArrowLeft') || keys.has('KeyA')) dir -= 1;
          if (keys.has('ArrowRight') || keys.has('KeyD')) dir += 1;
          if (!dir && holds.size) { const hd = [...holds.values()].pop(); dir = hd.pad || (Math.abs(hd.x - me.x) > 26 ? (hd.x > me.x ? 1 : -1) : 0); }
          me.stun = Math.max(0, me.stun - dt); me.inv = Math.max(0, me.inv - dt);
          if (me.stun > 0) dir = 0;
          me.moving = dir !== 0;
          if (dir) me.face = dir;
          me.x = clamp(me.x + dir * SPEED * dt + me.kb * dt, 30, 930); me.kb *= Math.pow(0.02, dt);
          // jump w/ coyote time + buffer
          const grounded = me.y <= 0;
          me.coyote = grounded ? 0.09 : Math.max(0, me.coyote - dt); me.buf = Math.max(0, me.buf - dt);
          if (me.buf > 0 && me.coyote > 0 && me.stun <= 0) { me.vy = 720; me.buf = 0; me.coyote = 0; C.sfx('whoosh'); }
          me.vy -= 2300 * dt; me.y = Math.max(0, me.y + me.vy * dt); if (me.y <= 0 && me.vy < 0) me.vy = 0;
          // obstacles
          for (const o of obs) {
            if (o.speed) { o.x += o.face * o.speed * dt; if (Math.abs(o.x - o.x0) > 40) { o.x = o.x0 + Math.sign(o.x - o.x0) * 40; o.face *= -1; } }
            if (me.inv > 0) continue;
            // forgiving hitboxes: 12px inset each side, top 16px of the sprite doesn't count
            const hitX = Math.abs(me.x - o.x) < o.w / 2 - 12 + hb;
            const hit = o.type === 'puddle' ? me.y < 2 && Math.abs(me.x - o.x) < o.w / 2 - 14 : hitX && me.y < o.h - 16;
            if (hit) {
              bumps++; me.inv = 1.1; me.stun = o.type === 'puddle' ? 0.35 : 0.45; me.kb = (me.x < o.x ? -1 : 1) * 380; me.vy = 260;
              C.sfx('wrong'); C.burst(me.x, GY - 60, '#cfe8ff', 8);
              if (carrying && LEAK) bits.push({ x: clamp(me.x + rand(-30, 30), 40, 900), type: pick(['can', 'banana', 'paper', 'bit']), pop: 0 });
            }
          }
          // bag lifecycle
          // 60px reach: the player spawns 50px from the bag, so tying it from the start spot now picks it up (was 46 -> kids walked off bag-less)
          if (!carrying && tied && !toss && Math.abs(me.x - bagX) < 60 && me.y < 40) { carrying = true; C.sfx('pick'); }
          if (carrying) {
            if (LEAK && me.moving) { leakT -= dt; if (leakT <= 0) { leakT = LEAK * rand(0.8, 1.2); bits.push({ x: me.x - me.face * 30, type: pick(['can', 'banana', 'paper', 'bit']), pop: 0 }); C.sfx('drop'); } }
            if (me.x >= CURB_X) { carrying = false; toss = { t: 0, fx: me.x, fy: GY - 70 }; C.sfx('whoosh'); }
          }
          if (toss) {
            toss.t += dt / 0.5;
            if (toss.t >= 1) {
              toss = null; delivered++; C.sfx('ding'); C.burst(BIN_X, GY - 150, '#8be38b', 20);
              if (delivered < nBags) { tied = false; ties = 0; bagX = BAG_X; leakT = LEAK; }
            }
          }
          for (const b of bits) b.pop = Math.min(1, b.pop + dt * 4);
          PADS.hop.flash = Math.max(0, PADS.hop.flash - dt);
          api.setProgress(progress());
          if (delivered >= nBags && !bits.length && !toss && !finished) { finished = true; api.complete(); }
        },
        draw(g) {
          g.drawImage(bg, 0, 0);
          // curb bin (lid opens on toss)
          const lid = toss ? Math.sin(Math.min(1, toss.t * 1.4) * Math.PI) : 0;
          rr(g, BIN_X - 40, GY - 130, 80, 130, 10); paint(g, '#5fd39a', 4);
          circ(g, BIN_X - 26, GY - 4, 9); paint(g, INK, 0);
          for (const dx of [-16, 0, 16]) { g.beginPath(); g.moveTo(BIN_X + dx, GY - 108); g.lineTo(BIN_X + dx, GY - 20); g.lineWidth = 3; g.strokeStyle = 'rgba(59,47,74,.3)'; g.stroke(); }
          text(g, `${delivered}/${nBags}`, BIN_X, GY - 64, 22, '#fff', 5);
          g.save(); g.translate(BIN_X + 44, GY - 132); g.rotate(lid * 1.2); rr(g, -90, -12, 92, 16, 6); paint(g, '#3fb57f', 4); g.restore();
          for (const o of obs) drawObstacle(g, o, t);
          for (const b of bits) {
            const s = 0.55 * easeBack(b.pop);
            circ(g, b.x, GY - 8, 26); g.fillStyle = `rgba(255,241,184,${0.35 + 0.2 * Math.sin(t * 6)})`; g.fill();
            drawItem(g, b.type, b.x, GY - 10, s);
          }
          // bag at door
          if (!carrying && !toss && delivered < nBags) {
            drawBag(g, bagX, GY, tied, 1, ties, TIES, t);
            if (!tied) { downArrow(g, bagX, GY - 110, t); text(g, TIES > 1 ? `Tap ×${TIES - ties}` : 'Tap!', bagX, GY - 158, 18, '#fff', 4); }
          }
          // player
          const blink = me.inv > 0 && Math.floor(t * 14) % 2 === 0;
          const pose = carrying ? 'carry' : me.moving ? 'walk' : 'idle';
          if (!blink) {
            const py = GY - me.y;
            if (carrying) drawBag(g, me.x + me.face * 32, py - 30, true, 0.8);
            drawPerson(g, me.x, py, 1, player, t, pose);
          } else shadow(g, me.x, GY, 22, 6);
          if (toss) {
            const k = toss.t, x = lerp(toss.fx, BIN_X, k), y = lerp(toss.fy, GY - 140, k) - Math.sin(k * Math.PI) * 120;
            g.save(); g.translate(x, y); g.rotate(k * 6); drawBag(g, 0, 30, true, 0.8); g.restore();
          }
          let msg = '';
          if (!tied && !carrying && delivered < nBags && t < 25) msg = TIES > 1 ? `Tap the bag ${TIES} times to tie it!` : 'Tap the bag to tie it!';
          else if (carrying && t < 14 && delivered === 0) msg = 'Hold ▶ to walk · HOP (or flick up / Space) over toys!';
          else if (delivered >= nBags && bits.length) msg = 'Tap the dropped bits to pick them up!';
          else if (tied && !carrying && !toss && delivered < nBags) msg = delivered > 0 ? 'Next bag! Head back to the door ←' : 'Walk to the bag to pick it up ←';
          else if (bits.length && carrying && LEAK) msg = 'Leaky bag! Tap the bits on the ground';
          // touch pads (also fine with a mouse); sit on the sidewalk below the play line
          const dirNow = [...holds.values()].map((hd) => hd.pad);
          for (const [pd, lab, on] of [[PADS.l, '◀', dirNow.includes(-1) || keys.has('ArrowLeft') || keys.has('KeyA')], [PADS.r, '▶', dirNow.includes(1) || keys.has('ArrowRight') || keys.has('KeyD')], [PADS.hop, 'HOP', PADS.hop.flash > 0 || me.y > 0]]) {
            circ(g, pd.x, pd.y + (on ? 2 : 0), pd.r); paint(g, on ? '#fff1b8' : 'rgba(255,255,255,.85)', 4);
            text(g, lab, pd.x, pd.y + (on ? 3 : 1), lab === 'HOP' ? 20 : 24, lab === 'HOP' ? '#ff7eb6' : '#7ec8ff', 4);
          }
          if (msg) hint(g, msg, t);
        },
        stop() {
          L.off(); release(); keys.clear(); holds.clear();
          return Math.round(clamp((delivered / nBags) * 100 - bumps * 5 - bits.length * 5, 0, 100));
        },
        _dbg: { me, obs, bits, get bagX() { return bagX; }, get tied() { return tied; }, get carrying() { return carrying; }, get delivered() { return delivered; }, get bumps() { return bumps; } },
      };
    },
  };
})();
