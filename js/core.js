// CLEANER core: shared namespace, helpers, audio, particles.
(function () {
  const C = (window.Cleaner = window.Cleaner || {});
  C.W = 960; C.H = 600;
  C.DIFFICULTY = {
    easy:  { id: 'easy',  label: 'Easy',       time: 60, level: 1 },
    hard:  { id: 'hard',  label: 'Hard',       time: 50, level: 2 },
    super: { id: 'super', label: 'Super Hard', time: 40, level: 3 },
  };
  C.COLORS = ['#ff7eb6', '#7ec8ff', '#ffd166', '#8be38b'];
  C.chores = C.chores || {};
  C.party = C.party || {};
  C.art = C.art || {};

  C.rand = (a, b) => a + Math.random() * (b - a);
  C.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  C.lerp = (a, b, t) => a + (b - a) * t;
  C.dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
  C.pointer = (canvas, e) => {
    const r = canvas.getBoundingClientRect();
    const p = e.touches ? e.touches[0] || e.changedTouches[0] : e;
    return { x: ((p.clientX - r.left) / r.width) * C.W, y: ((p.clientY - r.top) / r.height) * C.H };
  };

  // ---------- Tiny synth SFX (WebAudio, no files) ----------
  let ac = null;
  C.muted = false;
  try { C.muted = localStorage.getItem('cleaner-muted') === '1'; } catch (e) {}
  function ctx() {
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  function tone(freq, dur, type = 'sine', vol = 0.15, slide = 0, delay = 0) {
    const a = ctx(); if (!a || C.muted) return;
    const t0 = a.currentTime + delay;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(a.destination); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function noise(dur, vol = 0.08, hp = 1200) {
    const a = ctx(); if (!a || C.muted) return;
    const len = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    f.type = 'highpass'; f.frequency.value = hp; g.gain.value = vol;
    s.buffer = buf; s.connect(f).connect(g).connect(a.destination); s.start();
  }
  let lastScrub = 0;
  const SFX = {
    pop: () => tone(600, 0.12, 'sine', 0.18, 500),
    scrub: () => { const n = performance.now(); if (n - lastScrub > 90) { lastScrub = n; noise(0.07, 0.05, 2500); } },
    pick: () => tone(520, 0.08, 'triangle', 0.15, 200),
    drop: () => tone(300, 0.12, 'triangle', 0.18, -120),
    ding: () => { tone(880, 0.25, 'sine', 0.15); tone(1320, 0.3, 'sine', 0.1, 0, 0.08); },
    wrong: () => tone(180, 0.25, 'square', 0.08, -60),
    whoosh: () => noise(0.25, 0.06, 600),
    tick: () => tone(1000, 0.04, 'square', 0.05),
    click: () => tone(700, 0.05, 'triangle', 0.12),
    fanfare: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.3, 'triangle', 0.14, 0, i * 0.12)),
  };
  C.sfx = (name) => { try { (SFX[name] || (() => {}))(); } catch (e) {} };
  C.setMuted = (m) => { C.muted = m; try { localStorage.setItem('cleaner-muted', m ? '1' : '0'); } catch (e) {} };

  // ---------- Sparkle particles (drawn on #fx by main) ----------
  C.particles = [];
  C.burst = (x, y, color = '#ffd166', count = 12) => {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, s = C.rand(60, 260);
      C.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 80, life: C.rand(0.5, 1), max: 1,
        r: C.rand(3, 7), color, star: Math.random() < 0.4 });
    }
  };
  C.drawParticles = (g, dt) => {
    g.clearRect(0, 0, C.W, C.H);
    for (let i = C.particles.length - 1; i >= 0; i--) {
      const p = C.particles[i];
      p.life -= dt; if (p.life <= 0) { C.particles.splice(i, 1); continue; }
      p.vy += 400 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      g.globalAlpha = Math.min(1, p.life * 2); g.fillStyle = p.color;
      g.beginPath();
      if (p.star) {
        for (let k = 0; k < 8; k++) { const rr = k % 2 ? p.r * 0.4 : p.r * 1.4, an = (k / 8) * Math.PI * 2 + p.life * 6;
          g.lineTo(p.x + Math.cos(an) * rr, p.y + Math.sin(an) * rr); }
      } else g.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
  };
})();
