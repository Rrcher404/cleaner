// CLEANER party: wardrobe -> house party + dance-off -> podium. (Isolde)
(function () {
  const C = window.Cleaner;
  const P = C.party;
  const A = C.art;
  const INK = '#3b2f4a';
  const W = 960, H = 600;
  const BPM = 112, SPB = 60 / BPM;
  const ROUND_BEATS = 32; // ~17s per dancer
  const DIRS = ['left', 'up', 'down', 'right'];
  const DIR_ROT = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };
  const DIR_COL = { left: '#ff7eb6', up: '#7ec8ff', down: '#8be38b', right: '#ffd166' };
  const KEYMAP = { ArrowLeft: 'left', ArrowUp: 'up', ArrowDown: 'down', ArrowRight: 'right', a: 'left', w: 'up', s: 'down', d: 'right', A: 'left', W: 'up', S: 'down', D: 'right' };
  const PASTELS = ['#ff7eb6', '#7ec8ff', '#ffd166', '#8be38b', '#c9a7ff', '#ffb38a'];
  const SLOT_LABELS = { hat: 'Hat', top: 'Top', bottom: 'Bottom', shoes: 'Shoes', accessory: 'Extra' };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const dot = (c) => `<span class="pt-dot" style="background:${c}"></span>`;
  const arrowSvg = (d) => `<svg viewBox="-24 -24 48 48" aria-hidden="true"><path transform="rotate(${(DIR_ROT[d] * 180) / Math.PI})" d="M18 0 L2 -15 L2 -7 L-16 -7 L-16 7 L2 7 L2 15 Z" fill="#fff" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/></svg>`;

  const STYLE = `<style>
#party-root{container-type:size;padding:0;gap:0;background:#3f2f63;overflow:hidden}
#party-root canvas.pt-scene{position:absolute;inset:0;width:100%;height:100%}
#party-root .pt-ui{position:absolute;inset:0;pointer-events:none;font-size:3.3cqh}
#party-root .pt-ui *{pointer-events:auto}
#party-root .pt-ui .pt-pass{pointer-events:none}
#party-root .btn{font-size:3.7cqh;padding:.35em 1.1em;border-width:.6cqh;box-shadow:0 .9cqh 0 var(--ink)}
#party-root .btn.small{font-size:3cqh;border-width:.5cqh;box-shadow:0 .6cqh 0 var(--ink)}
#party-root .btn:active{box-shadow:0 .2cqh 0 var(--ink)}
#party-root h2{font-size:5.6cqh;line-height:1.1}
#party-root p{font-size:3.2cqh}
#party-root .pt-dot{display:inline-block;width:.8em;height:.8em;border-radius:50%;border:.4cqh solid var(--ink);margin-right:.3em;vertical-align:-.05em}
#party-root .pt-ward{position:absolute;left:46%;right:8.5%;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;gap:1.3cqh;padding:3cqh 3cqh 3.6cqh;border-width:.6cqh;border-radius:4cqh;box-shadow:0 1cqh 0 var(--ink)}
#party-root .pt-ward h2{text-align:left}
#party-root .pt-ward .sub{text-align:left;margin-top:-1cqh}
#party-root .pt-slot{display:grid;grid-template-columns:4.2em 2.1em 1fr 2.1em;gap:.45em;align-items:center}
#party-root .pt-lab{font-weight:700;text-align:right}
#party-root .pt-val{background:var(--cream);border:.45cqh solid var(--ink);border-radius:999px;padding:.2em .5em;font-weight:600;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#party-root .pt-val.flash{animation:ptflash .35s ease-out}
@keyframes ptflash{0%{transform:scale(1.12);background:var(--butter)}}
#party-root .pt-arr{font:inherit;font-weight:700;height:2.1em;width:2.1em;border-radius:50%;border:.5cqh solid var(--ink);background:var(--butter);color:var(--ink);cursor:pointer;box-shadow:0 .5cqh 0 var(--ink);padding:0;line-height:1;touch-action:manipulation}
#party-root .pt-arr:active{transform:translateY(.4cqh);box-shadow:0 .1cqh 0 var(--ink)}
#party-root .pt-sw{display:flex;gap:.9cqh;flex-wrap:wrap}
#party-root .pt-sw button{width:max(5cqh,26px);height:max(5cqh,26px);flex:none;border-radius:50%;border:.45cqh solid var(--ink);cursor:pointer;padding:0;box-shadow:0 .4cqh 0 var(--ink);touch-action:manipulation}
#party-root .pt-sw button.on{transform:scale(1.18);box-shadow:0 0 0 .5cqh #fff,0 0 0 1cqh var(--ink)}
#party-root .pt-ward .row{margin-top:1cqh;justify-content:flex-start;flex-wrap:nowrap;gap:1.6cqh}
#party-root .pt-ward .btn{font-size:3.3cqh;white-space:nowrap;padding:.35em .9em}
#party-root .pt-ward .btn.small{font-size:2.8cqh}
#party-root .pt-hud{position:absolute;left:2.5cqw;right:2.5cqw;top:2.5cqh;display:flex;justify-content:space-between;align-items:center;pointer-events:none}
#party-root .pt-hud *{pointer-events:none}
#party-root .chip{font-size:3.2cqh;border-width:.5cqh}
#party-root .pt-keys{position:absolute;left:50%;bottom:3cqh;transform:translateX(-50%);display:flex;gap:2.2cqh}
#party-root .pt-key{width:12.5cqh;height:12.5cqh;border-radius:3.2cqh;border:.7cqh solid var(--ink);cursor:pointer;box-shadow:0 1cqh 0 var(--ink);padding:1.6cqh;touch-action:none;transition:transform .06s}
#party-root .pt-key svg{width:100%;height:100%;display:block}
#party-root .pt-key.want{animation:ptwant .27s ease-in-out infinite alternate}
#party-root .pt-key.hit{transform:translateY(.8cqh) scale(.96);box-shadow:0 .2cqh 0 var(--ink)}
@keyframes ptwant{to{transform:translateY(-.8cqh) scale(1.06)}}
#party-root .pt-over{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(40,28,64,.45)}
#party-root .pt-over.side{justify-content:flex-end;padding-right:3cqw;background:rgba(40,28,64,.12)}
#party-root .pt-over.side .pt-card{max-width:38cqw;padding:3cqh 3cqh}
#party-root .pt-card{max-width:66cqw;display:flex;flex-direction:column;gap:2cqh;align-items:center;text-align:center;padding:4cqh 5cqh;border-width:.6cqh;border-radius:4cqh;box-shadow:0 1cqh 0 var(--ink)}
#party-root .pt-big{font-size:10cqh;line-height:1;animation:bob 1.6s ease-in-out infinite}
#party-root .pt-stats{display:flex;gap:1.2cqh;flex-wrap:wrap;justify-content:center}
#party-root .pt-stats span{background:var(--cream);border:.45cqh solid var(--ink);border-radius:999px;padding:.15em .7em;font-weight:600}
#party-root .pt-bottom{position:absolute;left:0;right:0;bottom:5cqh;display:flex;justify-content:center}
#party-root .pt-final{position:absolute;left:57%;right:3%;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;gap:2cqh;align-items:center;padding:3cqh;border-width:.6cqh;border-radius:4cqh;box-shadow:0 1cqh 0 var(--ink)}
#party-root .pt-final h2{font-size:5cqh}
#party-root table.scores{font-size:3cqh;border-spacing:0 .9cqh}
#party-root table.scores td{padding:.3em .55em;border-width:.45cqh}
#party-root table.scores th{font-size:2.3cqh;font-weight:600;opacity:.7;padding:0 .4em}
#party-root .pop-in{animation:popin .35s cubic-bezier(.2,1.6,.4,1)}
</style>`;

  // ---------- canvas helpers ----------
  function rr(g, x, y, w, h, r) { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); }
  function ell(g, x, y, rx, ry) { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); }
  function label(g, text, x, y, size, fill, stroke, align) {
    g.font = `700 ${size}px Fredoka, system-ui, sans-serif`;
    g.textAlign = align || 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    g.lineWidth = Math.max(4, size * 0.2); g.strokeStyle = stroke || INK; g.strokeText(text, x, y);
    g.fillStyle = fill || '#fff'; g.fillText(text, x, y);
  }
  function arrowShape(g, x, y, dir, s, fill) {
    g.save(); g.translate(x, y); g.rotate(DIR_ROT[dir]);
    g.beginPath();
    g.moveTo(s, 0); g.lineTo(s * 0.1, -s * 0.85); g.lineTo(s * 0.1, -s * 0.38); g.lineTo(-s * 0.9, -s * 0.38);
    g.lineTo(-s * 0.9, s * 0.38); g.lineTo(s * 0.1, s * 0.38); g.lineTo(s * 0.1, s * 0.85); g.closePath();
    g.restore();
    g.lineJoin = 'round'; g.lineWidth = Math.max(3, s * 0.16); g.strokeStyle = INK; g.fillStyle = fill; g.fill(); g.stroke();
  }
  function nameTag(g, p, x, y, big) {
    const s = big ? 19 : 15;
    g.font = `700 ${s}px Fredoka, system-ui, sans-serif`;
    const w = g.measureText(p.name).width + s * 1.6;
    rr(g, x - w / 2, y, w, s * 1.6, s * 0.8); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 3; g.strokeStyle = INK; g.stroke();
    ell(g, x - w / 2 + s * 0.75, y + s * 0.8, s * 0.32, s * 0.32); g.fillStyle = p.color; g.fill(); g.lineWidth = 2; g.stroke();
    g.fillStyle = INK; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(p.name, x + s * 0.3, y + s * 0.85);
  }

  // ---------- little party music (own WebAudio graph; honours Cleaner.muted) ----------
  function makeMusic() {
    let ac = null;
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); } catch (e) { ac = null; }
    let start = performance.now() / 1000 + 0.2, pausedAt = null;
    const time = () => (pausedAt !== null ? pausedAt : performance.now() / 1000) - start;
    // freeze song time while the page is hidden (tab switch, phone lock): otherwise a dance round keeps
    // running on the wall clock and every arrow is auto-missed by the time the kid comes back
    const onVis = () => {
      const now = performance.now() / 1000;
      if (document.hidden) { if (pausedAt === null) pausedAt = now; }
      else if (pausedAt !== null) { start += now - pausedAt; pausedAt = null; }
    };
    document.addEventListener('visibilitychange', onVis);
    if (!ac) return { time, stop() { document.removeEventListener('visibilitychange', onVis); } };
    const master = ac.createGain(); master.gain.value = 0.32; master.connect(ac.destination);
    const at = (st) => ac.currentTime + (st - time());
    const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
    function osc(freq, t0, dur, type, vol, slideTo) {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t0);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g).connect(master); o.start(t0); o.stop(t0 + dur + 0.03);
    }
    let noiseBuf = null;
    function noise(t0, dur, vol, hp) {
      if (!noiseBuf) { const len = ac.sampleRate * 0.3; noiseBuf = ac.createBuffer(1, len, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; }
      const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
      f.type = 'highpass'; f.frequency.value = hp; s.buffer = noiseBuf;
      g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      s.connect(f).connect(g).connect(master); s.start(t0); s.stop(t0 + dur + 0.02);
    }
    // I – V – vi – IV, the happiest four chords there are
    const CH = [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]];
    const ARP = [0, 1, 2, 1, 2, 0, 1, 2];
    const MEL = [76, -1, 79, 76, 74, -1, 72, 74, 74, -1, 71, 74, 79, -1, 74, -1, 72, -1, 76, 72, 69, -1, 72, 76, 72, -1, 69, 72, 77, 76, 74, 72];
    let step = 0;
    function play(n, t0) {
      const bar = Math.floor(n / 8) % 4, s = n % 8, ch = CH[bar];
      if (s % 2 === 0) osc(150, t0, 0.18, 'sine', 0.9, 45);                       // kick
      if (s === 2 || s === 6) noise(t0, 0.12, 0.25, 1800);                        // clap
      if (s % 2 === 1) noise(t0, 0.04, 0.12, 7000);                               // hat
      osc(mtof(ch[0] - 24), t0, SPB * 0.45, 'triangle', 0.35);                    // bass
      osc(mtof(ch[ARP[s]] + 12), t0, SPB * 0.4, 'square', 0.035);                 // arp sparkle
      const m = MEL[n % 32]; if (m > 0 && Math.floor(n / 32) % 2 === 1) osc(mtof(m), t0, SPB * 0.5, 'triangle', 0.12);
    }
    function schedule() {
      const now = time();
      while (step * (SPB / 2) < now + 0.15) {
        const st = step * (SPB / 2);
        if (st >= now - 0.02 && !C.muted) { try { play(step, Math.max(ac.currentTime, at(st))); } catch (e) {} }
        step++;
      }
    }
    const iv = setInterval(schedule, 25);
    schedule();
    return { time, stop() { clearInterval(iv); document.removeEventListener('visibilitychange', onVis); try { master.gain.setTargetAtTime(0, ac.currentTime, 0.05); setTimeout(() => ac.close(), 300); } catch (e) {} } };
  }

  // =====================================================================
  P.start = function (opts) {
    const root = opts.root, onDone = opts.onDone || (() => {});
    const players = opts.players && opts.players.length ? opts.players : [{ name: 'Guest', color: C.COLORS[0], score: 0 }];
    players.forEach((p) => {
      p.outfit = Object.assign(A.defaultOutfit(), p.outfit || {});
      if (typeof p.score !== 'number') p.score = 0;
    });
    const choreScore = players.map((p) => p.score);
    const dance = players.map(() => null);

    root.innerHTML = STYLE + '<canvas class="pt-scene"></canvas><div class="pt-ui"></div>';
    const cv = root.querySelector('canvas.pt-scene');
    const ui = root.querySelector('.pt-ui');
    const DPR = Math.min(2, window.devicePixelRatio || 1);
    cv.width = W * DPR; cv.height = H * DPR;
    const g = cv.getContext('2d');

    let alive = true, raf = 0, T = 0, last = performance.now();
    let phase = null, music = null;
    const listeners = [];
    const on = (el, ev, fn, o) => { el.addEventListener(ev, fn, o); listeners.push([el, ev, fn, o]); };
    const songT = () => (music ? music.time() : T);

    // ---------- confetti & sparkles (own layer, drawn on top of the scene) ----------
    const bits = [];
    function confetti(n, x, y, spread) {
      for (let i = 0; i < n && bits.length < 420; i++) {
        const fromTop = x === undefined;
        bits.push({
          x: fromTop ? Math.random() * W : x + C.rand(-10, 10), y: fromTop ? C.rand(-40, -5) : y,
          vx: fromTop ? C.rand(-20, 20) : C.rand(-1, 1) * (spread || 260), vy: fromTop ? C.rand(40, 90) : C.rand(-420, -160),
          r: Math.random() * 6, vr: C.rand(-8, 8), w: C.rand(6, 11), h: C.rand(4, 7), c: PASTELS[i % PASTELS.length],
          sh: Math.random() < 0.25 ? 1 : 0, sway: Math.random() * 6, life: 1,
        });
      }
    }
    function drawBits(dt) {
      for (let i = bits.length - 1; i >= 0; i--) {
        const b = bits[i];
        b.vy = Math.min(b.vy + 420 * dt, 110); b.vx *= 1 - 1.6 * dt;
        b.x += (b.vx + Math.sin(T * 3 + b.sway) * 25) * dt; b.y += b.vy * dt; b.r += b.vr * dt;
        if (b.y > H + 20) { bits.splice(i, 1); continue; }
        g.save(); g.translate(b.x, b.y); g.rotate(b.r); g.fillStyle = b.c;
        if (b.sh) { A.heart(g, 0, 0, b.w * 0.5); g.fill(); }
        else { g.scale(1, Math.abs(Math.cos(b.r * 1.3)) + 0.15); g.fillRect(-b.w / 2, -b.h / 2, b.w, b.h); }
        g.restore();
      }
    }
    const sparks = [];
    function sparkle(x, y, n, col) {
      for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = C.rand(80, 260); sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, life: C.rand(0.4, 0.8), c: col || PASTELS[i % 6] }); }
    }
    function drawSparks(dt) {
      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i]; p.life -= dt; if (p.life <= 0) { sparks.splice(i, 1); continue; }
        p.vy += 380 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        g.globalAlpha = Math.min(1, p.life * 2.5); g.fillStyle = p.c; g.beginPath();
        for (let k = 0; k < 8; k++) { const rr2 = k % 2 ? 2 : 6.5, an = (k / 8) * Math.PI * 2 + p.life * 5; g.lineTo(p.x + Math.cos(an) * rr2, p.y + Math.sin(an) * rr2); }
        g.fill();
      }
      g.globalAlpha = 1;
    }

    // ---------- the living room ----------
    function drawRoom(ballX, spot) {
      const st = songT(), beat = st / SPB, bn = Math.floor(beat), bp = beat - bn, pulse = Math.max(0, 1 - bp * 3);
      const wg = g.createLinearGradient(0, 0, 0, 400); wg.addColorStop(0, '#3a2b5e'); wg.addColorStop(1, '#634a8a');
      g.fillStyle = wg; g.fillRect(0, 0, W, 402);
      g.fillStyle = 'rgba(255,214,224,.05)'; for (let x = 0; x < W; x += 64) g.fillRect(x, 0, 32, 400);
      // window with a sleepy moon
      rr(g, 64, 96, 156, 176, 20); const sk = g.createLinearGradient(0, 96, 0, 272); sk.addColorStop(0, '#1f2552'); sk.addColorStop(1, '#40488a');
      g.fillStyle = sk; g.fill(); g.lineWidth = 6; g.strokeStyle = '#fff6e9'; g.stroke(); g.lineWidth = 3; g.strokeStyle = INK; rr(g, 61, 93, 162, 182, 22); g.stroke();
      g.fillStyle = '#fff1b8'; ell(g, 178, 136, 18, 18); g.fill(); g.fillStyle = '#2a3165'; ell(g, 186, 130, 15, 15); g.fill();
      g.fillStyle = '#fff'; for (let i = 0; i < 9; i++) { const sx = 80 + ((i * 53) % 120), sy = 112 + ((i * 37) % 140); g.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(T * 1.5 + i)); g.fillRect(sx, sy, 2.5, 2.5); }
      g.globalAlpha = 1;
      g.fillStyle = '#fff6e9'; g.fillRect(139, 96, 6, 176); g.fillRect(64, 181, 156, 6);
      for (const cx of [46, 222]) { rr(g, cx - 18, 82, 36, 206, 14); g.fillStyle = '#ffd6e0'; g.fill(); g.lineWidth = 3; g.strokeStyle = INK; g.stroke(); }
      // picture: a tiny sparkling sponge (we earned this party)
      rr(g, 742, 110, 120, 92, 10); g.fillStyle = '#fff1b8'; g.fill(); g.lineWidth = 3; g.strokeStyle = INK; g.stroke();
      rr(g, 754, 122, 96, 68, 6); g.fillStyle = '#cfe8ff'; g.fill(); g.stroke();
      rr(g, 780, 140, 44, 30, 8); g.fillStyle = '#ffd166'; g.fill(); g.stroke();
      g.fillStyle = '#e8b04a'; for (const [hx, hy] of [[790, 150], [806, 160], [813, 147]]) { ell(g, hx, hy, 3, 3); g.fill(); }
      g.fillStyle = '#fff'; ell(g, 836, 136, 3 + pulse * 2, 3 + pulse * 2); g.fill();
      // couch
      rr(g, 680, 300, 250, 70, 24); g.fillStyle = '#9fe0c3'; g.fill(); g.lineWidth = 3.5; g.strokeStyle = INK; g.stroke();
      rr(g, 666, 330, 278, 64, 20); g.fillStyle = '#c9f2df'; g.fill(); g.stroke();
      rr(g, 700, 312, 46, 38, 12); g.fillStyle = '#ffd6e0'; g.fill(); g.stroke();
      // plant
      rr(g, 20, 352, 44, 46, 8); g.fillStyle = '#ffb38a'; g.fill(); g.lineWidth = 3; g.strokeStyle = INK; g.stroke();
      for (let k = 0; k < 5; k++) { g.save(); g.translate(42, 352); g.rotate(-1 + k * 0.5 + Math.sin(T * 2 + k) * 0.05); ell(g, 0, -26, 9, 26); g.fillStyle = '#8be38b'; g.fill(); g.stroke(); g.restore(); }
      // bunting
      for (let row = 0; row < 2; row++) {
        const y0 = 26 + row * 14, n = 14;
        g.lineWidth = 2; g.strokeStyle = INK; g.beginPath(); g.moveTo(0, y0); g.quadraticCurveTo(W / 2, y0 + 50, W, y0); g.stroke();
        for (let i = row; i < n; i += 2) {
          const u = (i + 0.5) / n, x = u * W, y = y0 + 100 * u * (1 - u);
          const sw = Math.sin(T * 2 + i) * 0.12;
          g.save(); g.translate(x, y); g.rotate(sw); g.beginPath(); g.moveTo(-14, 0); g.lineTo(14, 0); g.lineTo(0, 24); g.closePath();
          g.fillStyle = PASTELS[i % 6]; g.fill(); g.lineWidth = 2.5; g.stroke(); g.restore();
        }
      }
      // floor + dance rug
      g.fillStyle = '#8a5d55'; g.fillRect(0, 400, W, 200);
      g.fillStyle = '#7a4f4c'; for (let y = 430; y < H; y += 34) g.fillRect(0, y, W, 3);
      g.fillStyle = '#fff6e9'; g.fillRect(0, 396, W, 10); g.fillStyle = INK; g.fillRect(0, 405, W, 3);
      g.save(); rr(g, 210, 425, 540, 160, 26); g.clip();
      const cols = 9, rows = 3, tw = 540 / cols, th = 160 / rows;
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
        const lit = (i + j * 2 + bn) % 3 === 0;
        g.fillStyle = lit ? PASTELS[(i + j + bn) % 6] : 'rgba(40,28,64,.55)';
        g.globalAlpha = lit ? 0.55 + 0.4 * pulse : 1;
        g.fillRect(210 + i * tw + 2, 425 + j * th + 2, tw - 4, th - 4);
      }
      g.globalAlpha = 1; g.restore();
      rr(g, 210, 425, 540, 160, 26); g.lineWidth = 4; g.strokeStyle = INK; g.stroke();
      // light beams + roaming spots
      g.save(); g.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 5; k++) {
        const a = Math.PI / 2 + Math.sin(T * 0.7 + k * 1.3) * 0.9, len = 620;
        const x2 = ballX + Math.cos(a - 0.09) * len, y2 = 64 + Math.sin(a - 0.09) * len, x3 = ballX + Math.cos(a + 0.09) * len, y3 = 64 + Math.sin(a + 0.09) * len;
        const bg = g.createLinearGradient(ballX, 64, (x2 + x3) / 2, (y2 + y3) / 2);
        bg.addColorStop(0, 'rgba(255,255,255,.28)'); bg.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = bg; g.globalAlpha = 0.5;
        g.beginPath(); g.moveTo(ballX, 64); g.lineTo(x2, y2); g.lineTo(x3, y3); g.closePath(); g.fill();
        g.globalAlpha = 1;
      }
      for (let k = 0; k < 14; k++) {
        const a = T * 0.35 + k * 0.45, d = 140 + ((k * 97) % 380);
        const sx = ballX + Math.cos(a) * d, sy = 64 + Math.abs(Math.sin(a)) * d * 0.9;
        g.fillStyle = PASTELS[k % 6]; g.globalAlpha = 0.22; ell(g, sx, sy, 9, 6); g.fill();
      }
      g.globalAlpha = 1; g.restore();
      if (spot) { // spotlight on the star of the moment
        g.save(); g.globalCompositeOperation = 'lighter';
        const sg = g.createRadialGradient(spot.x, spot.y, 10, spot.x, spot.y, 150);
        sg.addColorStop(0, 'rgba(255,241,184,.4)'); sg.addColorStop(1, 'rgba(255,241,184,0)');
        g.fillStyle = sg; g.beginPath(); g.moveTo(spot.x - 26, 0); g.lineTo(spot.x + 26, 0); g.lineTo(spot.x + 130, spot.y); g.lineTo(spot.x - 130, spot.y); g.closePath();
        g.globalAlpha = 0.45; g.fill(); g.globalAlpha = 1;
        ell(g, spot.x, spot.y, 110, 24); g.fillStyle = sg; g.fill();
        g.restore();
      }
      // string lights
      g.lineWidth = 2; g.strokeStyle = INK; g.beginPath(); g.moveTo(0, 6); g.quadraticCurveTo(W / 4, 40, W / 2, 6); g.quadraticCurveTo((3 * W) / 4, 40, W, 6); g.stroke();
      for (let i = 0; i < 24; i++) {
        const u = (i + 0.5) / 24, half = u < 0.5 ? u * 2 : u * 2 - 1, x = u * W, y = 6 + 34 * 2 * half * (1 - half) + 6;
        const on = (i + bn) % 2 === 0;
        g.fillStyle = PASTELS[i % 6]; g.globalAlpha = on ? 1 : 0.45;
        ell(g, x, y, 5, 7); g.fill(); g.globalAlpha = 1; g.lineWidth = 1.5; g.stroke();
        if (on) { g.fillStyle = 'rgba(255,255,255,.25)'; ell(g, x, y, 11, 11); g.fill(); }
      }
      // disco ball
      g.lineWidth = 2; g.strokeStyle = INK; g.beginPath(); g.moveTo(ballX, 0); g.lineTo(ballX, 38); g.stroke();
      const br = 28 * (1 + pulse * 0.04);
      g.save(); ell(g, ballX, 64, br, br); g.fillStyle = '#c7cde0'; g.fill(); g.clip();
      for (let row = -4; row <= 4; row++) for (let col = -5; col <= 5; col++) {
        const fx = ballX + col * 7 + ((T * 18) % 7) - 3.5 + (row % 2) * 3.5, fy = 64 + row * 7;
        const v = 0.5 + 0.5 * Math.sin(col * 1.7 + row * 0.9 + T * 4);
        g.fillStyle = v > 0.85 ? '#fff' : v > 0.55 ? PASTELS[(col + row + 12) % 6] : `rgba(90,80,130,${0.15 + v * 0.3})`;
        g.fillRect(fx - 3, fy - 3, 6, 6);
      }
      g.fillStyle = 'rgba(255,255,255,.55)'; ell(g, ballX - 10, 54, 8, 5); g.fill();
      g.restore();
      ell(g, ballX, 64, br, br); g.lineWidth = 3.5; g.strokeStyle = INK; g.stroke();
      g.fillStyle = '#fff'; g.globalAlpha = pulse; label(g, '✦', ballX + 20, 44, 18, '#fff', 'rgba(0,0,0,0)'); g.globalAlpha = 1;
    }

    // =====================================================================
    // (a) WARDROBE
    function drawDressingRoom(p, pose, tt) {
      g.fillStyle = '#fff6e9'; g.fillRect(0, 0, W, H);
      for (let x = 0; x < W; x += 56) { g.fillStyle = (x / 56) % 2 ? '#ffe9ef' : '#fff6e9'; g.fillRect(x, 0, 56, 470); }
      g.fillStyle = '#e8c9a8'; g.fillRect(0, 470, W, 130); g.fillStyle = '#dcb894'; for (let x = 0; x < W; x += 110) g.fillRect(x, 470, 4, 130);
      g.fillStyle = INK; g.fillRect(0, 467, W, 4);
      // vanity mirror with bulbs
      const mx = 235, my = 285;
      ell(g, mx, my, 172, 250); g.fillStyle = '#ffd166'; g.fill(); g.lineWidth = 4; g.strokeStyle = INK; g.stroke();
      ell(g, mx, my, 150, 228); const mg = g.createLinearGradient(0, 60, 0, 510); mg.addColorStop(0, '#e4f2ff'); mg.addColorStop(1, '#ffe3ee');
      g.fillStyle = mg; g.fill(); g.stroke();
      g.save(); ell(g, mx, my, 150, 228); g.clip(); g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 14;
      g.beginPath(); g.moveTo(mx - 120, my - 60); g.lineTo(mx - 40, my - 200); g.moveTo(mx - 100, my + 10); g.lineTo(mx - 20, my - 130); g.stroke(); g.restore();
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2 - Math.PI / 2, bx = mx + Math.cos(a) * 162, by = my + Math.sin(a) * 240;
        const lit = 0.6 + 0.4 * Math.sin(T * 3 + i * 0.8);
        g.fillStyle = `rgba(255,241,184,${0.35 * lit})`; ell(g, bx, by, 15, 15); g.fill();
        g.fillStyle = '#fffbe6'; ell(g, bx, by, 8, 8); g.fill(); g.lineWidth = 2.5; g.strokeStyle = INK; g.stroke();
      }
      // rug in the player's colour
      ell(g, mx, 520, 140, 28); g.fillStyle = p.color; g.fill(); g.lineWidth = 4; g.strokeStyle = INK; g.stroke();
      ell(g, mx, 520, 110, 19); g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 3; g.setLineDash([8, 8]); g.stroke(); g.setLineDash([]);
      A.drawCharacter(g, mx, 518, 2.9, p, tt, pose);
    }

    function wardrobe(i) {
      const p = players[i];
      let changedAt = -9;
      const state = { t0: T };
      const poke = () => { changedAt = T; };
      phase = {
        draw(dt) {
          const pose = T - changedAt < 0.75 ? 'cheer' : (T - state.t0) % 9 > 7.2 ? 'dance' : 'idle';
          drawDressingRoom(p, pose, T);
        },
      };
      const skinSw = A.SKINS.map((c) => `<button data-skin="${c}" style="background:${c}" aria-label="Skin tone"></button>`).join('');
      const hairSw = A.HAIRS.map((c) => `<button data-hair="${c}" style="background:${c}" aria-label="Hair colour"></button>`).join('');
      const slotRows = A.SLOTS.map((s) => `
        <div class="pt-slot"><span class="pt-lab">${SLOT_LABELS[s]}</span>
          <button class="pt-arr" data-slot="${s}" data-d="-1" aria-label="Previous ${SLOT_LABELS[s]}">&#9664;&#xFE0E;</button>
          <span class="pt-val" data-val="${s}"></span>
          <button class="pt-arr" data-slot="${s}" data-d="1" aria-label="Next ${SLOT_LABELS[s]}">&#9654;&#xFE0E;</button></div>`).join('');
      const multi = players.length > 1;
      ui.innerHTML = `<div class="card pt-ward pop-in">
          <h2>${dot(p.color)}${esc(p.name)}, get dressed!</h2>
          <p class="sub">${multi ? `Player ${i + 1} of ${players.length} · ` : ''}Party starts when everyone looks fabulous.</p>
          ${slotRows}
          <div class="pt-slot"><span class="pt-lab">Skin</span><div class="pt-sw" style="grid-column:2/5">${skinSw}</div></div>
          <div class="pt-slot"><span class="pt-lab">Hair</span><div class="pt-sw" style="grid-column:2/5">${hairSw}</div></div>
          <div class="row"><button class="btn small alt" id="pt-rand">🎲 Surprise me</button>
          <button class="btn" id="pt-done">${i < players.length - 1 ? 'Looking good! →' : "Let's party! 🎉"}</button></div>
        </div>`;
      const refresh = (flash) => {
        A.SLOTS.forEach((s) => {
          const el = ui.querySelector(`[data-val="${s}"]`), it = A.OUTFITS[s].find((o) => o.id === p.outfit[s]) || A.OUTFITS[s][0];
          el.textContent = it.name;
          if (flash === s || flash === '*') { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
        });
        ui.querySelectorAll('[data-skin]').forEach((b) => b.classList.toggle('on', b.dataset.skin === p.outfit.skin));
        ui.querySelectorAll('[data-hair]').forEach((b) => b.classList.toggle('on', b.dataset.hair === p.outfit.hair));
      };
      refresh();
      ui.querySelectorAll('.pt-arr').forEach((b) => (b.onclick = () => {
        const s = b.dataset.slot, list = A.OUTFITS[s], idx = Math.max(0, list.findIndex((o) => o.id === p.outfit[s]));
        p.outfit[s] = list[(idx + +b.dataset.d + list.length) % list.length].id;
        C.sfx('pop'); poke(); refresh(s); sparkle(235, s === 'hat' ? 130 : s === 'shoes' ? 505 : 330, 8);
      }));
      ui.querySelectorAll('[data-skin]').forEach((b) => (b.onclick = () => { p.outfit.skin = b.dataset.skin; C.sfx('click'); poke(); refresh(); }));
      ui.querySelectorAll('[data-hair]').forEach((b) => (b.onclick = () => { p.outfit.hair = b.dataset.hair; C.sfx('click'); poke(); refresh(); sparkle(235, 180, 8); }));
      ui.querySelector('#pt-rand').onclick = () => {
        p.outfit = Object.assign(p.outfit, A.randomOutfit());
        C.sfx('whoosh'); setTimeout(() => C.sfx('pop'), 120); poke(); refresh('*'); sparkle(235, 300, 22);
      };
      ui.querySelector('#pt-done').onclick = () => {
        C.sfx('ding'); sparkle(235, 300, 26);
        if (i < players.length - 1) wardrobe(i + 1); else partyIntro();
      };
      cv.onpointerdown = (e) => { const pt = C.pointer(cv, e); if (pt.x < 480) { poke(); C.sfx('pop'); sparkle(pt.x, pt.y, 10); } };
    }

    // =====================================================================
    // (b) PARTY SCENE + DANCE-OFF
    function crowdLayout(active) {
      const n = players.length;
      if (active === undefined || active < 0) {
        const gap = Math.min(200, 760 / Math.max(1, n));
        return players.map((p, i) => ({ p, i, x: W / 2 + (i - (n - 1) / 2) * gap, y: 470, s: n > 3 ? 1.35 : 1.55 }));
      }
      const sides = [150, 810, 300, 660];
      let k = 0;
      return players.map((p, i) => (i === active ? { p, i, x: W / 2, y: 452, s: 1.7, star: true } : { p, i, x: sides[k++], y: 440, s: 1.1 }));
    }
    function drawCrowd(active, reactions) {
      const st = songT();
      const lay = crowdLayout(active).sort((a, b) => a.y - b.y || (a.star ? 1 : -1));
      lay.forEach((c) => {
        let pose = 'dance';
        const r = reactions && reactions[c.i];
        if (r && T < r.until) pose = r.pose;
        // whole-beat offsets keep everyone on the beat but on different moves
        A.drawCharacter(g, c.x, c.y, c.s, c.p, pose === 'dance' ? st + c.i * SPB : T + c.i, pose);
        nameTag(g, c.p, c.x, c.y + 14, c.star);
      });
    }

    function partyIntro() {
      cv.onpointerdown = null;
      if (!music) music = makeMusic();
      C.sfx('fanfare');
      confetti(140);
      const t0 = T;
      phase = {
        draw() {
          drawRoom(W / 2, null);
          drawCrowd(-1);
          const k = Math.min(1, (T - t0) / 0.5), wob = Math.sin(T * 4) * 0.04;
          g.save(); g.translate(W / 2, 175); g.rotate(wob); g.scale(0.4 + 0.6 * k, 0.4 + 0.6 * k);
          label(g, 'HOUSE PARTY!', 0, 0, 74, '#fff1b8');
          g.restore();
          label(g, 'The house is spotless. Time to make some noise!', W / 2, 238, 24, '#fff');
          if (Math.random() < 0.15) confetti(1);
        },
      };
      ui.innerHTML = `<div class="pt-bottom pop-in"><button class="btn" id="pt-go">Start the dance-off! 💃</button></div>`;
      ui.querySelector('#pt-go').onclick = () => { C.sfx('click'); danceIntro(0); };
    }

    const reactions = {};
    function react(i, pose, dur) { reactions[i] = { pose, until: T + dur }; }

    function danceBackdrop(active, round) {
      drawRoom(W / 2, { x: W / 2, y: 452 });
      drawCrowd(active, reactions);
      if (Math.random() < 0.08) confetti(1);
      if (round && !round.done) drawRing(round);
    }

    function danceIntro(i) {
      const p = players[i];
      Object.keys(reactions).forEach((k) => delete reactions[k]);
      phase = { draw() { danceBackdrop(i, null); } };
      const pass = players.length > 1 ? `<p><b>Pass the device to ${esc(p.name)}!</b></p>` : '';
      ui.innerHTML = `<div class="pt-over"><div class="card pt-card pop-in">
        <h2>${dot(p.color)}${esc(p.name)}'s dance-off!</h2>
        ${pass}
        <div class="row">${DIRS.map((d) => `<span style="display:inline-block;width:6cqh;height:6cqh;background:${DIR_COL[d]};border:.5cqh solid ${INK};border-radius:1.4cqh;padding:.6cqh">${arrowSvg(d)}</span>`).join('')}</div>
        <p>Hit the arrow just as it lands in the ring — on the beat! Tap the buttons or use your arrow keys.</p>
        <button class="btn" id="pt-go">I'm ready! 🎶</button></div></div>`;
      ui.querySelector('#pt-go').onclick = () => { C.sfx('click'); danceRound(i); };
    }

    function danceRound(i) {
      const p = players[i];
      const startBeat = Math.ceil(songT() / SPB) + 1;
      const prompts = [];
      let prev = '', prev2 = '';
      for (let b = 4; b < ROUND_BEATS - 2; b++) {
        if (b < 12 && b % 2) continue;      // warm-up: every other beat
        if (b >= 12 && b % 8 === 7) continue; // a breath every bar
        let d; do { d = DIRS[Math.floor(Math.random() * 4)]; } while (d === prev && d === prev2);
        prev2 = prev; prev = d;
        prompts.push({ dir: d, time: (startBeat + b) * SPB, res: null });
      }
      const R = { i, startBeat, endTime: (startBeat + ROUND_BEATS) * SPB, prompts, points: 0, combo: 0, best: 0, perfect: 0, good: 0, miss: 0, fb: null, done: false };
      ui.innerHTML = `
        <div class="pt-hud"><div class="chip">${dot(p.color)}${esc(p.name)} · <span id="pt-pts">0</span> pts</div><div class="chip timer" id="pt-time">17</div></div>
        <div class="pt-keys">${DIRS.map((d) => `<button class="pt-key" data-k="${d}" style="background:${DIR_COL[d]}" aria-label="${d}">${arrowSvg(d)}</button>`).join('')}</div>`;
      const keyEls = {}; ui.querySelectorAll('.pt-key').forEach((b) => (keyEls[b.dataset.k] = b));
      const ptsEl = ui.querySelector('#pt-pts'), timeEl = ui.querySelector('#pt-time');

      function judge(dir) {
        if (R.done) return;
        const el = keyEls[dir]; if (el) { el.classList.add('hit'); setTimeout(() => el.classList.remove('hit'), 90); }
        const now = songT();
        let best = null, bd = 1e9;
        for (const pr of prompts) { if (pr.res) continue; const d = Math.abs(now - pr.time); if (d < bd) { bd = d; best = pr; } }
        if (!best || bd > 0.3) return; // nothing close — free press, no penalty
        const dt = now - best.time;
        if (best.dir !== dir) return resolve(best, 'miss', 'Oops!');
        if (Math.abs(dt) <= 0.09) resolve(best, 'perfect', 'Perfect!');
        else if (Math.abs(dt) <= 0.19) resolve(best, 'good', 'Good!');
        else resolve(best, 'miss', dt < 0 ? 'Too early!' : 'Too late!');
      }
      function resolve(pr, res, text) {
        pr.res = res; R[res]++;
        if (res === 'miss') {
          R.combo = 0; C.sfx('wrong'); react(i, 'idle', 0.35);
        } else {
          R.combo++; R.best = Math.max(R.best, R.combo);
          const pts = res === 'perfect' ? 10 + Math.min(R.combo, 10) : 5 + Math.floor(Math.min(R.combo, 10) / 2);
          R.points += pts; ptsEl.textContent = R.points;
          C.sfx(res === 'perfect' ? 'pop' : 'pick');
          sparkle(W / 2, 150, res === 'perfect' ? 14 : 7, DIR_COL[pr.dir]);
          if (res === 'perfect') react(i, 'cheer', 0.3);
          if (R.combo > 0 && R.combo % 5 === 0) { confetti(30, W / 2, 300, 380); players.forEach((q, k) => k !== i && react(k, 'cheer', 0.9)); C.sfx('ding'); text = `${R.combo} combo!`; }
        }
        R.fb = { text, res, at: T };
      }
      phase = {
        round: R,
        update() {
          if (R.done) return;
          const now = songT();
          for (const pr of prompts) if (!pr.res && now > pr.time + 0.19) resolve(pr, 'miss', 'Miss');
          const cur = prompts.find((pr) => !pr.res);
          DIRS.forEach((d) => keyEls[d].classList.toggle('want', !!cur && cur.dir === d && cur.time - now < SPB * 1.2));
          timeEl.textContent = Math.max(0, Math.ceil(R.endTime - now));
          if (now >= R.endTime) finishRound(R);
        },
        draw() { danceBackdrop(i, R); },
        key: judge,
      };
      ui.querySelectorAll('.pt-key').forEach((b) => (b.onpointerdown = (e) => { e.preventDefault(); judge(b.dataset.k); }));
    }

    function drawRing(R) {
      const now = songT(), beat = now / SPB, bp = beat - Math.floor(beat), pulse = Math.max(0, 1 - bp * 3.5);
      const cx = W / 2, cy = 150, r0 = 46;
      g.fillStyle = 'rgba(40,28,64,.55)'; ell(g, cx, cy, r0 + 6, r0 + 6); g.fill();
      g.lineWidth = 9; g.strokeStyle = INK; ell(g, cx, cy, r0 * (1 + pulse * 0.07), r0 * (1 + pulse * 0.07)); g.stroke();
      g.lineWidth = 5; g.strokeStyle = '#fff'; g.stroke();
      const rel = beat - R.startBeat;
      if (rel < 4) {
        const txt = rel < 0 ? '' : ['3', '2', '1', 'GO!'][Math.floor(rel)];
        if (txt) label(g, txt, cx, cy + 2, txt === 'GO!' ? 38 : 50 * (1 + pulse * 0.2), '#fff1b8');
      }
      const pend = R.prompts.filter((pr) => !pr.res);
      const cur = pend[0], nxt = pend[1];
      if (cur) {
        const lead = SPB * 1.6, u = Math.min(1, Math.max(0, (now - (cur.time - lead)) / lead));
        if (u > 0) {
          const rr2 = r0 + (1 - u) * 100;
          g.globalAlpha = u; g.lineWidth = 5; g.strokeStyle = DIR_COL[cur.dir]; ell(g, cx, cy, rr2, rr2); g.stroke(); g.globalAlpha = 1;
          arrowShape(g, cx, cy, cur.dir, 18 + u * 14, DIR_COL[cur.dir]);
        }
      }
      if (nxt && nxt.time - now < SPB * 3) {
        g.globalAlpha = 0.85; arrowShape(g, cx + 92, cy, nxt.dir, 14, DIR_COL[nxt.dir]); g.globalAlpha = 1;
        label(g, 'next', cx + 92, cy + 30, 14, '#fff');
      }
      if (R.fb && T - R.fb.at < 0.7) {
        const k = (T - R.fb.at) / 0.7;
        g.globalAlpha = 1 - k * k;
        const col = R.fb.res === 'perfect' ? '#fff1b8' : R.fb.res === 'good' ? '#c9f2df' : '#ffd6e0';
        label(g, R.fb.text, cx - 150, cy - 10 - k * 24, 34 * (1 + (1 - k) * 0.15), col);
        g.globalAlpha = 1;
      }
      if (R.combo >= 2) label(g, `combo ×${R.combo}`, cx - 150, cy + 28, 18, '#fff');
    }

    function finishRound(R) {
      R.done = true;
      const p = players[R.i];
      dance[R.i] = R;
      p.score += R.points;
      C.sfx('fanfare'); confetti(90, W / 2, 360, 420);
      react(R.i, 'cheer', 99);
      const grade = R.points >= 280 ? '🌟' : R.points >= 180 ? '🕺' : R.points >= 80 ? '💃' : '🐣';
      const msg = R.points >= 280 ? 'Legendary moves!' : R.points >= 180 ? 'What a groove!' : R.points >= 80 ? 'Nice moves!' : 'Brave little dance!';
      const nextI = R.i + 1;
      const last = nextI >= players.length;
      ui.innerHTML = `<div class="pt-over side"><div class="card pt-card pop-in">
        <div class="pt-big">${grade}</div>
        <h2>${msg}</h2>
        <div class="pt-stats"><span>Perfect × ${R.perfect}</span><span>Good × ${R.good}</span><span>Best combo ${R.best}</span></div>
        <h2>${dot(p.color)}${esc(p.name)} +${R.points} party points</h2>
        <button class="btn" id="pt-next">${last ? 'To the podium! 🏆' : `Next dancer: ${esc(players[nextI].name)} →`}</button></div></div>`;
      ui.querySelector('#pt-next').onclick = () => { C.sfx('click'); last ? podium() : danceIntro(nextI); };
    }

    // =====================================================================
    // (c) PODIUM
    function podium() {
      Object.keys(reactions).forEach((k) => delete reactions[k]);
      const rank = players.map((p, i) => ({ p, i })).sort((a, b) => b.p.score - a.p.score);
      const blocks = [
        { x: 268, w: 150, h: 160, c: '#ffd166', n: '1' },
        { x: 112, w: 150, h: 112, c: '#cfe8ff', n: '2' },
        { x: 424, w: 150, h: 76, c: '#ffd6e0', n: '3' },
      ];
      const base = 568;
      C.sfx('fanfare'); setTimeout(() => C.sfx('fanfare'), 500);
      confetti(200);
      phase = {
        draw() {
          drawRoom(343, { x: 343, y: base - 160 });
          blocks.forEach((b, k) => {
            if (!rank[k]) return;
            rr(g, b.x, base - b.h, b.w, b.h + 30, 14); g.fillStyle = b.c; g.fill(); g.lineWidth = 4; g.strokeStyle = INK; g.stroke();
            rr(g, b.x, base - b.h, b.w, 14, 14); g.fillStyle = 'rgba(255,255,255,.5)'; g.fill();
            label(g, b.n, b.x + b.w / 2, base - b.h / 2 + 8, 46, '#fff');
          });
          // 4th place cheers from the floor
          if (rank[3]) { A.drawCharacter(g, 640, base + 4, 1.05, rank[3].p, songT() + 3 * SPB, 'dance'); nameTag(g, rank[3].p, 640, base - 150, false); }
          blocks.forEach((b, k) => {
            const r = rank[k]; if (!r) return;
            const x = b.x + b.w / 2, y = base - b.h, s = k === 0 ? 1.45 : 1.2;
            A.drawCharacter(g, x, y, s, r.p, k === 0 ? T : songT() + k * SPB, k === 0 ? 'cheer' : 'dance');
            nameTag(g, r.p, x, base - b.h + 22, k === 0);
            if (k === 0) { // the champion's crown floats above whatever hat they chose
              const lift = Math.abs(Math.sin(T * 6)) * 10 * s;
              const cy = y - 182 * s - lift + Math.sin(T * 2.5) * 4;
              g.save(); g.translate(x, cy); g.rotate(Math.sin(T * 2) * 0.08);
              g.beginPath(); g.moveTo(-26, 14); g.lineTo(-30, -16); g.lineTo(-14, -2); g.lineTo(0, -24); g.lineTo(14, -2); g.lineTo(30, -16); g.lineTo(26, 14); g.closePath();
              g.fillStyle = '#ffd166'; g.fill(); g.lineWidth = 4; g.strokeStyle = INK; g.lineJoin = 'round'; g.stroke();
              for (const [jx, jc] of [[-14, '#7ec8ff'], [0, '#ff5d8f'], [14, '#8be38b']]) { ell(g, jx, 4, 4, 4); g.fillStyle = jc; g.fill(); g.lineWidth = 2; g.stroke(); }
              g.restore();
              if (Math.random() < 0.2) sparkle(x + C.rand(-40, 40), cy + C.rand(-20, 20), 1, '#fff1b8');
            }
          });
          if (Math.random() < 0.3) confetti(1);
        },
      };
      const champ = rank[0].p;
      const multi = players.length > 1;
      const tied = rank.filter((r) => r.p.score === champ.score); // equal top scores: don't crown one kid by array order
      const rows = rank.map((r) => `<tr><td>${['🥇', '🥈', '🥉', '🏅'][rank.filter((q) => q.p.score > r.p.score).length]}</td><td>${dot(r.p.color)}${esc(r.p.name)}</td><td>${choreScore[r.i]}</td><td>+${dance[r.i] ? dance[r.i].points : 0}</td><td>${r.p.score}</td></tr>`).join('');
      ui.innerHTML = `<div class="card pt-final pop-in">
        <h2>🏆 ${tied.length > 1 ? `It's a tie! ${tied.map((r) => esc(r.p.name)).join(' & ')} share the crown!` : `${esc(champ.name)} ${multi ? 'wins the party!' : 'threw the party of the year!'}`}</h2>
        <table class="scores"><tr><th></th><th></th><th>🧽 chores</th><th>💃 dance</th><th>total</th></tr>${rows}</table>
        <button class="btn" id="pt-again">Play again 🔁</button></div>`;
      ui.querySelector('#pt-again').onclick = () => { C.sfx('click'); finish(); };
    }

    // ---------- loop, input, cleanup ----------
    function loop(now) {
      if (!alive) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now; T += dt;
      g.setTransform(DPR, 0, 0, DPR, 0, 0);
      g.clearRect(0, 0, W, H);
      try {
        if (phase && phase.update) phase.update(dt);
        if (phase && phase.draw) phase.draw(dt);
      } catch (e) { console.error(e); }
      drawBits(dt); drawSparks(dt);
      raf = requestAnimationFrame(loop);
    }
    on(window, 'keydown', (e) => {
      const d = KEYMAP[e.key];
      if (!d || !phase || !phase.key) return;
      e.preventDefault();
      if (!e.repeat) phase.key(d);
    });

    function finish() {
      if (!alive) return;
      alive = false;
      cancelAnimationFrame(raf);
      listeners.forEach(([el, ev, fn, o]) => el.removeEventListener(ev, fn, o));
      cv.onpointerdown = null;
      if (music) music.stop();
      onDone();
    }

    wardrobe(0);
    raf = requestAnimationFrame(loop);
    return { stop: () => { if (alive) { alive = false; cancelAnimationFrame(raf); listeners.forEach(([el, ev, fn, o]) => el.removeEventListener(ev, fn, o)); if (music) music.stop(); } } };
  };
})();
