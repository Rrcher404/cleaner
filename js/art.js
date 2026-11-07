// CLEANER art: procedural chibi characters + wardrobe catalogue. (Isolde)
// drawCharacter(ctx, x, y, scale, player, t, pose) — x,y = feet centre, scale 1 ≈ 120px tall.
// The player's colour always lives on the TOP (every top style is tinted with it, plus the sneaker
// laces), so hot-seat players stay distinguishable at a glance no matter what they wear.
// Signature detail: the cowlick. One curl of hair with lagging secondary motion that pokes out of
// every hat in the catalogue — no hat ever quite tames it.
(function () {
  const C = window.Cleaner;
  const A = C.art;
  const INK = '#3b2f4a';

  A.OUTFITS = {
    hat: [
      { id: 'none', name: 'No hat' },
      { id: 'party', name: 'Party hat', color: '#ff7eb6' },
      { id: 'crown', name: 'Crown', color: '#ffd166' },
      { id: 'bow', name: 'Big bow', color: '#ff8fab' },
      { id: 'beanie', name: 'Beanie', color: '#7ec8ff' },
      { id: 'sunhat', name: 'Sun hat', color: '#f6dcae' },
      { id: 'bandana', name: 'Cleaning bandana', color: '#ff6b7f' },
    ],
    top: [
      { id: 'tee', name: 'Comfy tee' },
      { id: 'stripes', name: 'Stripy tee' },
      { id: 'hoodie', name: 'Cozy hoodie' },
      { id: 'heart', name: 'Heart sweater' },
      { id: 'tank', name: 'Tank top' },
      { id: 'apron', name: 'Cleaning apron' },
    ],
    bottom: [
      { id: 'shorts', name: 'Denim shorts', color: '#7aa6d9' },
      { id: 'jeans', name: 'Jeans', color: '#5d7fc2' },
      { id: 'skirt', name: 'Twirly skirt', color: '#ff9ec4' },
      { id: 'tutu', name: 'Tutu', color: '#ffc4e1' },
      { id: 'leggings', name: 'Dotty leggings', color: '#b59cf0' },
      { id: 'cargo', name: 'Cargo pants', color: '#c8ab7e' },
    ],
    shoes: [
      { id: 'sneakers', name: 'Sneakers', color: '#ffffff' },
      { id: 'boots', name: 'Rain boots', color: '#ffd166' },
      { id: 'bunny', name: 'Bunny slippers', color: '#ffe3ee' },
      { id: 'sandals', name: 'Sandals', color: '#b07a52' },
      { id: 'socks', name: 'Odd socks', color: '#8be38b' },
      { id: 'skates', name: 'Roller skates', color: '#cfe8ff' },
    ],
    accessory: [
      { id: 'none', name: 'Nothing' },
      { id: 'sunglasses', name: 'Cool shades', color: INK },
      { id: 'hearts', name: 'Heart glasses', color: '#ff5d8f' },
      { id: 'scarf', name: 'Stripy scarf', color: '#ffd166' },
      { id: 'wand', name: 'Bubble wand', color: '#7ec8ff' },
      { id: 'duster', name: 'Feather duster', color: '#ff9ec4' },
    ],
  };
  A.SKINS = ['#ffe0c7', '#f2c7a5', '#e0a983', '#c68863', '#9a6446', '#6e4630'];
  A.HAIRS = ['#5a3b2e', '#2e2433', '#f0c35e', '#d4683a', '#ece4f2', '#ff9ec4', '#7ab8ff'];
  A.SLOTS = ['hat', 'top', 'bottom', 'shoes', 'accessory'];

  A.defaultOutfit = () => ({ hat: 'none', top: 'tee', bottom: 'shorts', shoes: 'sneakers', accessory: 'none', skin: '#f2c7a5', hair: '#5a3b2e' });
  A.randomOutfit = () => {
    const pick = (a) => a[Math.floor(Math.random() * a.length)];
    const o = {};
    A.SLOTS.forEach((s) => (o[s] = pick(A.OUTFITS[s]).id));
    o.skin = pick(A.SKINS); o.hair = pick(A.HAIRS);
    return o;
  };
  const item = (slot, id) => A.OUTFITS[slot].find((o) => o.id === id) || A.OUTFITS[slot][0];

  // ---------- colour helpers ----------
  const rgbCache = {};
  function rgb(h) {
    if (rgbCache[h]) return rgbCache[h];
    let s = String(h).replace('#', '');
    if (s.length === 3) s = s.split('').map((c) => c + c).join('');
    const n = parseInt(s, 16) || 0;
    return (rgbCache[h] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]);
  }
  function shade(h, amt) { // amt -1..1 (neg = darker)
    const f = (c) => Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt);
    const [r, g, b] = rgb(h);
    return `rgb(${f(r)},${f(g)},${f(b)})`;
  }
  A.shade = shade;

  // ---------- drawing helpers ----------
  function ell(g, x, y, rx, ry, rot) { g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, Math.PI * 2); }
  function fs(g, fill) { g.fillStyle = fill; g.fill(); g.stroke(); }
  function limb(g, x1, y1, x2, y2, w, color, lw) {
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2);
    g.strokeStyle = INK; g.lineWidth = w + lw * 2; g.stroke();
    g.strokeStyle = color; g.lineWidth = w; g.stroke();
    g.strokeStyle = INK; g.lineWidth = lw;
  }
  function heart(g, x, y, s) {
    g.beginPath();
    g.moveTo(x, y + s * 0.9);
    g.bezierCurveTo(x - s * 1.4, y - s * 0.1, x - s * 0.7, y - s * 1.2, x, y - s * 0.45);
    g.bezierCurveTo(x + s * 0.7, y - s * 1.2, x + s * 1.4, y - s * 0.1, x, y + s * 0.9);
    g.closePath();
  }
  A.heart = heart;
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = (k) => 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3);

  // ---------- pose rig ----------
  // Returns offsets in local units (feet origin, y up negative).
  const BEAT = 112 / 60; // dance tempo matches the party song
  function rig(pose, t) {
    const R = {
      bob: 0, lift: 0, lean: 0, tilt: 0, sq: 1, eyes: 'open', mouth: 'smile', energy: 0.25, phase: t * 2.4,
      feet: [[-10, 0], [10, 0]], hands: [[-26, -25], [26, -25]], busy: false,
    };
    if (pose === 'walk' || pose === 'carry') {
      const p = t * 9, s = Math.sin(p);
      R.bob = 1 - Math.abs(Math.cos(p)) * 2.4;
      R.feet = [[-10 + s * 2, -Math.max(0, s) * 6], [10 + s * 2, -Math.max(0, -s) * 6]];
      R.hands = [[-24, -27 + s * 4], [24, -27 - s * 4]];
      R.tilt = s * 0.04; R.energy = 0.6; R.phase = p * 2;
      if (pose === 'carry') {
        // both hands grip a load at the right hip; body leans away from it
        R.hands = [[19, -40 + s], [29, -36 + s]];
        R.lean = -0.07; R.mouth = 'determined'; R.busy = true;
      }
    } else if (pose === 'dance') {
      const beat = t * BEAT, n = ((Math.floor(beat) % 4) + 4) % 4, ph = beat - Math.floor(beat);
      const hop = Math.sin(ph * Math.PI);
      R.bob = 2 - hop * 7;
      R.sq = 1 - 0.07 * (1 - hop);
      const side = n % 2 ? 1 : -1;
      R.lean = side * 0.09 * hop;
      R.tilt = -side * 0.08 * hop;
      const moves = [
        [[-26, -27], [38, -80]],
        [[-38, -80], [26, -27]],
        [[-40, -74], [40, -74]],
        [[-14, -44], [14, -44]],
      ];
      const a = moves[(n + 3) % 4], b = moves[n % 4], k = ease(ph / 0.3);
      R.hands = [0, 1].map((i) => [lerp(a[i][0], b[i][0], k), lerp(a[i][1], b[i][1], k) + hop * 2]);
      const lf = n % 2;
      R.feet = [[-11 - (lf ? 0 : 2), lf ? 0 : -hop * 5], [11 + (lf ? 2 : 0), lf ? -hop * 5 : 0]];
      R.eyes = n % 4 === 2 ? 'happy' : 'open';
      R.mouth = n % 4 >= 2 ? 'open' : 'smile';
      R.energy = 1; R.phase = beat * Math.PI * 2;
    } else if (pose === 'cheer') {
      const j = Math.abs(Math.sin(t * 6));
      R.lift = j * 10; R.bob = -j * 1.5; R.sq = 1 + 0.04 * j;
      const w = Math.sin(t * 12) * 3;
      R.hands = [[-38 - w, -80], [38 + w, -80]];
      R.feet = [[-9, 0], [9, 0]];
      R.eyes = 'happy'; R.mouth = 'open'; R.energy = 1; R.phase = t * 12;
    } else { // idle
      R.bob = Math.sin(t * 2.4) * 1.2;
      const sw = Math.sin(t * 2.4) * 1;
      R.hands = [[-26 - sw, -25], [26 + sw, -25]];
      R.tilt = Math.sin(t * 1.1) * 0.04;
      if (t % 3.7 < 0.13) R.eyes = 'blink';
    }
    return R;
  }

  // hand position of the carry pose (where a bag should hang), in canvas coords
  A.carryHand = function (x, y, scale, t, facing) {
    const R = rig('carry', t || 0), f = facing === -1 ? -1 : 1;
    return { x: x + R.hands[1][0] * scale * f, y: y + (R.hands[1][1] + R.bob + 3) * scale };
  };

  // ---------- body parts ----------
  const LONG_LEG = { jeans: 1, leggings: 1, cargo: 1 };
  const SLEEVE = { tee: 'short', stripes: 'short', apron: 'short', hoodie: 'long', heart: 'long', tank: 'none' };

  function topColor(o, col) {
    if (o.top === 'hoodie') return shade(col, -0.1);
    if (o.top === 'heart') return shade(col, 0.22);
    return col;
  }

  function bodyPath(g) {
    g.beginPath();
    g.moveTo(-15, -56);
    g.quadraticCurveTo(0, -60, 15, -56);
    g.quadraticCurveTo(22, -50, 23, -24);
    g.quadraticCurveTo(23, -17, 16, -17);
    g.lineTo(-16, -17);
    g.quadraticCurveTo(-23, -17, -23, -24);
    g.quadraticCurveTo(-22, -50, -15, -56);
    g.closePath();
  }

  function drawLegs(g, o, R, lw) {
    const skin = o.skin, bc = item('bottom', o.bottom).color;
    const legCol = LONG_LEG[o.bottom] ? bc : skin;
    for (let i = 0; i < 2; i++) {
      const hx = i ? 9 : -9, hy = -19 + R.bob, [fx, fy] = R.feet[i];
      limb(g, hx, hy, fx, fy - 4, 10, legCol, lw);
      if (o.bottom === 'leggings') {
        g.fillStyle = '#fff';
        for (const k of [0.35, 0.7]) { ell(g, lerp(hx, fx, k) + (i ? 1 : -1), lerp(hy, fy - 4, k), 1.6, 1.6); g.fill(); }
      }
      if (o.bottom === 'cargo') { g.fillStyle = shade(bc, -0.15); g.fillRect(lerp(hx, fx, 0.4) + (i ? 2 : -5), lerp(hy, fy, 0.4) - 2, 3, 5); }
      if (o.shoes === 'socks') {
        const sc = i ? '#ff9ec4' : '#8be38b'; // mismatched on purpose
        limb(g, lerp(hx, fx, 0.55), lerp(hy, fy - 4, 0.55), fx, fy - 4, 10.5, sc, lw);
        if (i) { g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(fx - 5, fy - 8); g.lineTo(fx + 5, fy - 8); g.stroke(); g.strokeStyle = INK; g.lineWidth = lw; }
      }
      if (o.shoes === 'boots') {
        g.beginPath(); g.roundRect ? g.roundRect(fx - 7.5, fy - 15, 15, 13, 4) : g.rect(fx - 7.5, fy - 15, 15, 13);
        fs(g, '#ffd166');
      }
    }
  }

  function drawShoe(g, o, i, fx, fy, col, lw) {
    const d = i ? 1 : -1, x = fx + d * 2, y = fy - 3;
    g.lineWidth = lw;
    switch (o.shoes) {
      case 'boots':
        ell(g, x, y, 10, 6); fs(g, '#ffd166');
        g.fillStyle = '#fff6'; ell(g, x - 3, y - 2, 3, 1.5); g.fill();
        break;
      case 'bunny':
        ell(g, x - d * 3, y - 7, 2.6, 6, -d * 0.35); fs(g, '#ffe3ee');
        ell(g, x + d * 1, y - 7.5, 2.6, 6, d * 0.15); fs(g, '#ffe3ee');
        ell(g, x, y, 11, 6.5); fs(g, '#ffe3ee');
        g.fillStyle = INK; ell(g, x + d * 4, y - 1.5, 1.1, 1.1); g.fill();
        g.fillStyle = '#ff7eb6'; ell(g, x + d * 8, y + 0.5, 1.6, 1.3); g.fill();
        break;
      case 'sandals':
        ell(g, x, y + 1.5, 10, 4.5); fs(g, '#b07a52');
        ell(g, x, y - 0.5, 8.5, 4.5); fs(g, o.skin);
        g.strokeStyle = '#b07a52'; g.lineWidth = 2.6; g.beginPath(); g.moveTo(x - 5, y - 3); g.lineTo(x + 5, y - 3); g.stroke();
        g.strokeStyle = INK; g.lineWidth = lw;
        break;
      case 'socks':
        ell(g, x, y, 9, 5.5); fs(g, i ? '#ff9ec4' : '#8be38b');
        break;
      case 'skates':
        g.fillStyle = INK; g.fillRect(x - 9, y + 3, 18, 2.5);
        for (const wx of [-5.5, 5.5]) { ell(g, x + wx, y + 7, 3.2, 3.2); fs(g, i ? '#ff7eb6' : '#7ec8ff'); }
        g.beginPath(); g.roundRect ? g.roundRect(x - 9, y - 9, 16, 13, 5) : g.rect(x - 9, y - 9, 16, 13); fs(g, '#fff');
        ell(g, x + d * 4, y + 1, 6, 3.5); fs(g, '#fff');
        break;
      default: // sneakers — white with player-colour laces
        ell(g, x, y, 10, 6); fs(g, '#fff');
        g.beginPath(); g.moveTo(x - 9, y + 2); g.lineTo(x + 9, y + 2); g.lineWidth = lw * 0.6; g.stroke(); g.lineWidth = lw;
        g.fillStyle = col; ell(g, x - d * 1, y - 2.5, 3, 2); g.fill();
    }
  }

  function drawBottom(g, o, lw) {
    const bc = item('bottom', o.bottom).color;
    g.lineWidth = lw;
    switch (o.bottom) {
      case 'shorts':
        g.beginPath(); g.moveTo(-21, -28); g.lineTo(21, -28); g.lineTo(21.5, -13); g.lineTo(2.5, -13);
        g.lineTo(0, -17); g.lineTo(-2.5, -13); g.lineTo(-21.5, -13); g.closePath(); fs(g, bc);
        g.strokeStyle = shade(bc, 0.45); g.lineWidth = 1.6; g.beginPath(); g.moveTo(-19, -16); g.lineTo(-4, -16); g.moveTo(4, -16); g.lineTo(19, -16); g.stroke();
        g.strokeStyle = INK; g.lineWidth = lw;
        break;
      case 'skirt':
        g.beginPath(); g.moveTo(-20, -28); g.lineTo(20, -28); g.lineTo(29, -7); g.quadraticCurveTo(0, -2, -29, -7); g.closePath(); fs(g, bc);
        g.lineWidth = 1.6; g.beginPath(); for (const px of [-12, 0, 12]) { g.moveTo(px * 0.8, -24); g.lineTo(px * 1.25, -6); } g.stroke(); g.lineWidth = lw;
        break;
      case 'tutu':
        for (const [yy, rx, c] of [[-14, 33, shade(bc, -0.08)], [-19, 30, bc]]) {
          g.beginPath();
          for (let k = 0; k <= 12; k++) {
            const a = Math.PI + (k / 12) * Math.PI * 2, px = Math.cos(a) * rx, py = yy + Math.sin(a) * 7 + (k % 2 ? 2.5 : 0);
            k ? g.lineTo(px, py) : g.moveTo(px, py);
          }
          g.closePath(); fs(g, c);
        }
        g.fillStyle = '#fff';
        for (const [sx, sy] of [[-18, -17], [6, -12], [20, -19], [-6, -21]]) { ell(g, sx, sy, 1.4, 1.4); g.fill(); }
        break;
      default: // long-leg bottoms: a waist piece
        g.beginPath(); g.roundRect ? g.roundRect(-21, -28, 42, 14, 5) : g.rect(-21, -28, 42, 14); fs(g, bc);
    }
  }

  function drawTop(g, o, col, lw) {
    const tc = topColor(o, col);
    g.lineWidth = lw;
    if (o.top === 'hoodie') { // hood bunched behind the neck
      ell(g, 0, -55, 22, 8); fs(g, shade(col, -0.25));
    }
    bodyPath(g); g.fillStyle = tc; g.fill();
    g.save(); bodyPath(g); g.clip();
    if (o.top === 'stripes') {
      g.fillStyle = 'rgba(255,255,255,.85)';
      for (let y = -52; y < -16; y += 8) g.fillRect(-25, y, 50, 3.5);
    } else if (o.top === 'tank') {
      g.fillStyle = o.skin; ell(g, 0, -57, 12, 8); g.fill();
      g.fillStyle = o.skin; g.fillRect(-24, -60, 8, 14); g.fillRect(16, -60, 8, 14);
    } else if (o.top === 'heart') {
      g.fillStyle = shade(col, -0.12); g.fillRect(-25, -22, 50, 6);
    } else if (o.top === 'hoodie') {
      g.fillStyle = shade(col, -0.22); g.fillRect(-25, -21, 50, 5);
    }
    g.restore();
    bodyPath(g); g.stroke();
    if (o.top === 'tank') {
      g.lineWidth = lw * 0.8; g.beginPath(); g.ellipse(0, -57, 12, 8, 0, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); g.lineWidth = lw;
    }
    if (o.top === 'heart') { heart(g, 0, -38, 7); g.lineWidth = lw * 0.8; fs(g, '#fff'); g.lineWidth = lw; }
    if (o.top === 'hoodie') {
      g.lineWidth = 2; g.strokeStyle = '#fff';
      g.beginPath(); g.moveTo(-5, -53); g.lineTo(-6, -43); g.moveTo(5, -53); g.lineTo(6, -43); g.stroke();
      g.strokeStyle = INK; g.lineWidth = lw * 0.7;
      g.beginPath(); g.moveTo(-12, -24); g.lineTo(-10, -33); g.lineTo(10, -33); g.lineTo(12, -24); g.stroke();
      g.lineWidth = lw;
    }
    if (o.top === 'apron') {
      g.lineWidth = lw * 0.7;
      g.beginPath(); g.moveTo(-10, -45); g.lineTo(-8, -56); g.moveTo(10, -45); g.lineTo(8, -56); g.stroke();
      g.beginPath(); g.roundRect ? g.roundRect(-14, -46, 28, 31, 6) : g.rect(-14, -46, 28, 31); fs(g, '#fff6e9');
      g.beginPath(); g.roundRect ? g.roundRect(-8, -32, 16, 9, 3) : g.rect(-8, -32, 16, 9); fs(g, '#c9f2df');
      heart(g, 0, -39, 2.6); g.fillStyle = col; g.fill();
      g.lineWidth = lw;
    }
  }

  function drawArm(g, o, col, sx, sy, hx, hy, lw) {
    const tc = topColor(o, col), sl = SLEEVE[o.top] || 'short';
    limb(g, sx, sy, hx, hy, 9, o.skin, lw);
    if (sl === 'long') limb(g, sx, sy, lerp(sx, hx, 0.8), lerp(sy, hy, 0.8), 10.5, tc, lw);
    else if (sl === 'short') limb(g, sx, sy, lerp(sx, hx, 0.42), lerp(sy, hy, 0.42), 11.5, tc, lw);
    ell(g, hx, hy, 5.6, 5.6); fs(g, o.skin);
  }

  function drawHeld(g, o, hx, hy, t, lw) {
    if (o.accessory === 'wand') {
      const ex = hx + 15, ey = hy - 17;
      limb(g, hx, hy, ex, ey + 6, 2.6, '#ffd166', lw * 0.7);
      g.lineWidth = lw * 0.8; ell(g, ex, ey, 7, 7); g.strokeStyle = INK; g.stroke();
      g.lineWidth = 2.6; g.strokeStyle = '#7ec8ff'; g.stroke(); g.strokeStyle = INK; g.lineWidth = lw;
      for (let i = 0; i < 3; i++) {
        const age = (t * 0.7 + i / 3) % 1, bx = ex + age * 18 + Math.sin(age * 7 + i * 2) * 4, by = ey - age * 44, r = 2.5 + age * 4.5;
        g.globalAlpha = 1 - age;
        ell(g, bx, by, r, r); g.fillStyle = 'rgba(207,232,255,.5)'; g.fill();
        g.lineWidth = 1.4; g.strokeStyle = '#7ec8ff'; g.stroke();
        g.fillStyle = '#fff'; ell(g, bx - r * 0.35, by - r * 0.35, r * 0.25, r * 0.25); g.fill();
      }
      g.globalAlpha = 1; g.strokeStyle = INK; g.lineWidth = lw;
    } else if (o.accessory === 'duster') {
      const a = 0.75 + Math.sin(t * 5) * 0.22, ex = hx + Math.sin(a) * 24, ey = hy - Math.cos(a) * 24;
      limb(g, hx, hy + 3, ex, ey, 3, '#b07a52', lw * 0.7);
      const puffs = [[0, -6, 7], [-6, -1, 5.5], [6, -1, 5.5], [-3, -11, 5], [4, -11, 5]];
      g.lineWidth = lw;
      puffs.forEach(([px, py, r]) => { ell(g, ex + px, ey + py, r, r); g.stroke(); });
      g.fillStyle = '#ff9ec4'; puffs.forEach(([px, py, r]) => { ell(g, ex + px, ey + py, r, r); g.fill(); });
      g.fillStyle = '#ffd6e0'; ell(g, ex - 2, ey - 9, 2.4, 2.4); g.fill();
    }
  }

  function drawScarf(g, o, t, R, lw) {
    const sway = Math.sin(R.phase - 0.8) * 3 * R.energy;
    g.lineWidth = lw;
    g.beginPath(); g.moveTo(-12, -52); g.quadraticCurveTo(-15 + sway, -40, -11 + sway * 1.6, -32);
    g.lineTo(-4 + sway * 1.6, -33); g.quadraticCurveTo(-6 + sway, -42, -4, -51); g.closePath(); fs(g, '#ffd166');
    g.fillStyle = '#ff7eb6'; g.fillRect(-11 + sway * 1.4, -39, 6.5, 2.6);
    ell(g, 0, -55, 20, 6.5); fs(g, '#ffd166');
    g.save(); ell(g, 0, -55, 20, 6.5); g.clip(); g.fillStyle = '#ff7eb6'; for (const sx of [-12, 0, 12]) g.fillRect(sx - 2, -62, 4, 14); g.restore();
    ell(g, 0, -55, 20, 6.5); g.stroke();
  }

  function drawHair(g, o, lw) {
    const hair = o.hair;
    g.save(); ell(g, 0, -83, 31, 29); g.clip();
    g.beginPath();
    g.moveTo(-36, -74); g.lineTo(-36, -118); g.lineTo(36, -118); g.lineTo(36, -74);
    const pts = [[31, -74], [21, -91], [8, -95], [-6, -94], [-19, -91], [-31, -74]];
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
      g.quadraticCurveTo((ax + bx) / 2, Math.max(ay, by) + 5, bx, by);
    }
    g.closePath();
    g.fillStyle = hair; g.fill();
    g.lineWidth = lw * 0.75; g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 3;
    g.beginPath(); g.arc(0, -86, 24, 1.15 * Math.PI, 1.4 * Math.PI); g.stroke();
    g.restore();
    g.strokeStyle = INK; g.lineWidth = lw;
    ell(g, 0, -83, 31, 29); g.stroke();
  }

  function drawFace(g, o, R, lw, sc) {
    const er = Math.max(3.8, 1.6 / sc);
    g.fillStyle = INK; g.strokeStyle = INK;
    for (const ex of [-11, 11]) {
      if (R.eyes === 'blink') { g.lineWidth = lw * 0.8; g.beginPath(); g.moveTo(ex - 4, -79); g.lineTo(ex + 4, -79); g.stroke(); }
      else if (R.eyes === 'happy') { g.lineWidth = lw * 0.85; g.beginPath(); g.arc(ex, -77, 4.2, 1.1 * Math.PI, 1.9 * Math.PI); g.stroke(); }
      else {
        ell(g, ex, -79, er, er * 1.08); g.fill();
        g.fillStyle = '#fff'; ell(g, ex - er * 0.3, -79 - er * 0.4, er * 0.35, er * 0.35); g.fill(); g.fillStyle = INK;
      }
    }
    g.fillStyle = 'rgba(255,105,140,.42)';
    const cr = Math.max(6, 2.2 / sc);
    ell(g, -20, -71, cr, cr * 0.62); g.fill(); ell(g, 20, -71, cr, cr * 0.62); g.fill();
    g.lineWidth = lw * 0.75;
    if (R.mouth === 'open') {
      g.beginPath(); g.moveTo(-5, -73); g.quadraticCurveTo(0, -73.5, 5, -73); g.quadraticCurveTo(5, -65, 0, -65); g.quadraticCurveTo(-5, -65, -5, -73); g.closePath();
      g.fillStyle = '#c44569'; g.fill(); g.stroke();
      g.fillStyle = '#ff9ec4'; ell(g, 0, -67, 2.6, 1.5); g.fill();
    } else if (R.mouth === 'determined') {
      g.beginPath(); g.moveTo(-4, -71); g.quadraticCurveTo(0, -73, 4, -71); g.stroke();
    } else {
      g.beginPath(); g.arc(0, -74, 4.5, 0.18 * Math.PI, 0.82 * Math.PI); g.stroke();
    }
    g.lineWidth = lw;
  }

  function drawGlasses(g, o, lw) {
    g.lineWidth = lw * 0.8;
    if (o.accessory === 'sunglasses') {
      g.beginPath(); g.moveTo(-4, -81); g.quadraticCurveTo(0, -83, 4, -81); g.stroke();
      for (const ex of [-12, 12]) {
        g.beginPath(); g.roundRect ? g.roundRect(ex - 8, -86, 16, 11, 4) : g.rect(ex - 8, -86, 16, 11); fs(g, INK);
        g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1.8; g.beginPath(); g.moveTo(ex - 4, -83); g.lineTo(ex - 1, -86 + 1); g.stroke();
        g.strokeStyle = INK; g.lineWidth = lw * 0.8;
      }
    } else if (o.accessory === 'hearts') {
      g.beginPath(); g.moveTo(-4, -81); g.lineTo(4, -81); g.stroke();
      for (const ex of [-12, 12]) { heart(g, ex, -81, 7); fs(g, '#ff5d8f'); g.fillStyle = 'rgba(255,255,255,.7)'; ell(g, ex - 3, -83, 1.6, 1.6); g.fill(); }
    }
    g.lineWidth = lw;
  }

  // returns cowlick anchor [x, y, baseAngle]
  function drawHat(g, o, lw) {
    const h = item('hat', o.hat), hc = h.color;
    g.lineWidth = lw;
    switch (o.hat) {
      case 'party': {
        g.beginPath(); g.moveTo(-15, -104); g.lineTo(6, -150); g.lineTo(16, -103); g.quadraticCurveTo(0, -99, -15, -104); g.closePath();
        g.fillStyle = hc; g.fill();
        g.save(); g.clip(); g.fillStyle = '#fff1b8';
        for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(-20, -108 - k * 12); g.lineTo(20, -116 - k * 12); g.lineTo(20, -110 - k * 12); g.lineTo(-20, -102 - k * 12); g.fill(); }
        g.restore();
        g.beginPath(); g.moveTo(-15, -104); g.lineTo(6, -150); g.lineTo(16, -103); g.quadraticCurveTo(0, -99, -15, -104); g.closePath(); g.stroke();
        ell(g, 6, -151, 5.5, 5.5); fs(g, '#fff1b8');
        return [-16, -100, -1.2];
      }
      case 'crown': {
        g.beginPath(); g.moveTo(-17, -102); g.lineTo(-19, -126); g.lineTo(-9, -114); g.lineTo(0, -130); g.lineTo(9, -114); g.lineTo(19, -126); g.lineTo(17, -102);
        g.quadraticCurveTo(0, -98, -17, -102); g.closePath(); fs(g, hc);
        g.fillStyle = '#fff6'; g.fillRect(-13, -110, 3, 6);
        g.lineWidth = lw * 0.6; ell(g, 0, -107, 3, 3); fs(g, '#ff5d8f'); ell(g, -10, -106, 2.2, 2.2); fs(g, '#7ec8ff'); ell(g, 10, -106, 2.2, 2.2); fs(g, '#8be38b');
        g.lineWidth = lw;
        return [-5, -112, -0.3];
      }
      case 'bow': {
        const bx = 17, by = -106;
        g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(bx - 18, by - 18, bx - 15, by + 4); g.closePath(); fs(g, hc);
        g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(bx + 18, by - 18, bx + 15, by + 4); g.closePath(); fs(g, hc);
        ell(g, bx, by - 1, 4.5, 4.5); fs(g, shade(hc, -0.15));
        return [-3, -110, 0];
      }
      case 'beanie': {
        g.beginPath(); g.ellipse(0, -92, 31, 26, 0, Math.PI, 0); g.closePath(); fs(g, hc);
        g.lineWidth = 1.6; g.strokeStyle = shade(hc, -0.25);
        g.beginPath(); for (const rx of [-18, -6, 6, 18]) { g.moveTo(rx, -99); g.quadraticCurveTo(rx * 0.7, -110, rx * 0.4, -116); } g.stroke();
        g.strokeStyle = INK; g.lineWidth = lw;
        g.beginPath(); g.roundRect ? g.roundRect(-32, -98, 64, 11, 5) : g.rect(-32, -98, 64, 11); fs(g, shade(hc, -0.12));
        return [1, -116, 0.1];
      }
      case 'sunhat': {
        ell(g, 0, -101, 50, 10); fs(g, hc);
        g.beginPath(); g.ellipse(0, -103, 25, 19, 0, Math.PI, 0); g.closePath(); fs(g, hc);
        g.beginPath(); g.rect(-25, -108, 50, 5); g.fillStyle = '#ff9ec4'; g.fill();
        g.beginPath(); g.moveTo(-25, -108); g.lineTo(25, -108); g.moveTo(-25, -103); g.lineTo(25, -103); g.lineWidth = lw * 0.6; g.stroke();
        g.lineWidth = lw; ell(g, 19, -106, 4.5, 4.5); fs(g, '#fff1b8');
        return [2, -121, 0.15];
      }
      case 'bandana': {
        g.beginPath(); g.moveTo(-31, -92); g.quadraticCurveTo(-30, -116, 0, -115); g.quadraticCurveTo(30, -116, 31, -92);
        g.quadraticCurveTo(0, -99, -31, -92); g.closePath(); fs(g, hc);
        g.save(); g.clip(); g.fillStyle = '#fff';
        for (const [dx, dy] of [[-18, -101], [-4, -108], [10, -103], [22, -97], [-8, -97], [2, -100]]) { ell(g, dx, dy, 2, 2); g.fill(); }
        g.restore();
        g.beginPath(); g.moveTo(29, -95); g.lineTo(41, -101); g.lineTo(38, -91); g.closePath(); fs(g, hc);
        g.beginPath(); g.moveTo(29, -95); g.lineTo(40, -88); g.lineTo(31, -86); g.closePath(); fs(g, hc);
        return [7, -113, 0.2];
      }
      default:
        return [4, -110, 0.15];
    }
  }

  function drawCowlick(g, o, anchor, R, lw) {
    const [bx, by, base] = anchor;
    const ang = base + Math.sin(R.phase - 0.9) * 0.32 * R.energy; // lags behind the bounce
    g.save(); g.translate(bx, by); g.rotate(ang);
    g.beginPath(); g.moveTo(0, 2); g.quadraticCurveTo(-3, -9, 4, -14); g.quadraticCurveTo(10, -17, 9, -11);
    g.lineCap = 'round';
    g.strokeStyle = INK; g.lineWidth = 4.5 + lw * 1.6; g.stroke();
    g.strokeStyle = o.hair; g.lineWidth = 4.5; g.stroke();
    g.restore();
    g.strokeStyle = INK; g.lineWidth = lw;
  }

  // ---------- main entry ----------
  A.drawCharacter = function (g, x, y, scale, player, t, pose) {
    player = player || {};
    const o = Object.assign(A.defaultOutfit(), player.outfit || {});
    const col = player.color || '#ff7eb6';
    scale = scale || 1; t = t || 0;
    const R = rig(pose || 'idle', t);
    const lw = Math.max(3.5, 1.8 / scale);
    g.save();
    g.translate(x, y);
    g.scale(scale * (player.facing === -1 ? -1 : 1), scale);
    g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = INK; g.lineWidth = lw;

    // ground shadow
    g.fillStyle = 'rgba(40,25,60,.22)';
    ell(g, 0, 2, 25 - R.lift * 0.7, 6 - R.lift * 0.15); g.fill();
    g.translate(0, -R.lift);

    drawLegs(g, o, R, lw);
    for (let i = 0; i < 2; i++) drawShoe(g, o, i, R.feet[i][0], R.feet[i][1], col, lw);

    // upper body: bob, lean and squash around the hips
    g.save();
    g.translate(0, -19 + R.bob);
    g.rotate(R.lean);
    g.scale(1 + (1 - R.sq) * 0.6, R.sq);
    g.translate(0, 19);
    g.lineWidth = lw;

    drawBottom(g, o, lw);
    drawTop(g, o, col, lw);
    if (o.accessory === 'scarf') drawScarf(g, o, t, R, lw);

    // arms sit between body and head: raised hands read in silhouette beside the big head
    const sh = [[-17, -47], [17, -47]];
    for (let i = 0; i < 2; i++) drawArm(g, o, col, sh[i][0], sh[i][1], R.hands[i][0], R.hands[i][1], lw);

    // head group (tilts around the neck)
    g.save();
    g.translate(0, -55); g.rotate(R.tilt); g.translate(0, 55);
    g.lineWidth = lw;
    ell(g, -30, -80, 5.5, 6.5); fs(g, o.skin);
    ell(g, 30, -80, 5.5, 6.5); fs(g, o.skin);
    ell(g, 0, -83, 31, 29); fs(g, o.skin);
    drawHair(g, o, lw);
    drawFace(g, o, R, lw, scale);
    drawGlasses(g, o, lw);
    const anchor = drawHat(g, o, lw);
    drawCowlick(g, o, anchor, R, lw);
    g.restore();

    if (!R.busy) drawHeld(g, o, R.hands[1][0], R.hands[1][1], t, lw);

    g.restore();
    g.restore();
  };
})();
