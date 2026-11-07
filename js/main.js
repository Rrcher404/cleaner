// CLEANER main: screens, hot-seat flow, game loop, HUD.
(function () {
  const C = window.Cleaner;
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const fx = document.getElementById('fx').getContext('2d');
  const screen = document.getElementById('screen');
  const partyRoot = document.getElementById('party-root');
  const hud = document.getElementById('hud');
  const $ = (id) => document.getElementById(id);

  const CHORE_ORDER = ['wall', 'trash', 'bed', 'takeout'];
  const DEFAULT_NAMES = ['Bubbles', 'Mopsy', 'Dusty', 'Sudsy'];

  const state = {
    players: [], difficulty: C.DIFFICULTY.easy,
    choreIdx: 0, turnIdx: 0,
    active: null, // {chore, handle, time, done}
  };

  // ---------- helpers ----------
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const dot = (color) => `<span class="dot" style="background:${color}"></span>`;
  function show(html, opts = {}) {
    partyRoot.classList.add('hidden');
    screen.classList.remove('hidden');
    screen.classList.toggle('clear', !!opts.clear);
    screen.innerHTML = `<div class="pop-in" style="display:contents">${html}</div>`;
  }
  function toast(text) {
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = text;
    document.getElementById('stage').appendChild(t); setTimeout(() => t.remove(), 1300);
  }
  function chore(id) { return C.chores[id]; }
  function newPlayer(i, name) {
    return { name: name || DEFAULT_NAMES[i], color: C.COLORS[i], score: 0, choreScores: {},
      outfit: C.art.defaultOutfit ? C.art.defaultOutfit() : {} };
  }

  // ---------- idle background (title etc.) ----------
  let idleT = 0;
  function drawIdle(dt) {
    idleT += dt;
    const g = ctx;
    g.fillStyle = '#fff6e9'; g.fillRect(0, 0, C.W, C.H);
    // wallpaper stripes
    for (let x = 0; x < C.W; x += 60) { g.fillStyle = (x / 60) % 2 ? '#ffe9ef' : '#fff6e9'; g.fillRect(x, 0, 60, 430); }
    g.fillStyle = '#e8c9a8'; g.fillRect(0, 430, C.W, 170);
    g.fillStyle = '#dcb894'; for (let x = 0; x < C.W; x += 120) g.fillRect(x, 430, 4, 170);
    // floating bubbles
    for (let i = 0; i < 14; i++) {
      const bx = (i * 137 + idleT * 30 * (1 + (i % 3) * 0.3)) % (C.W + 80) - 40;
      const by = 380 - ((idleT * 40 + i * 90) % 420);
      g.beginPath(); g.arc(bx, by, 10 + (i % 4) * 5, 0, Math.PI * 2);
      g.fillStyle = 'rgba(207,232,255,.55)'; g.fill(); g.strokeStyle = 'rgba(126,200,255,.9)'; g.lineWidth = 2; g.stroke();
      g.beginPath(); g.arc(bx - 4, by - 4, 3, 0, Math.PI * 2); g.fillStyle = '#fff'; g.fill();
    }
    if (C.art.drawCharacter && state.players.length) {
      const n = state.players.length;
      state.players.forEach((p, i) => C.art.drawCharacter(g, C.W / 2 + (i - (n - 1) / 2) * 140, 540, 1, p, idleT + i, 'idle'));
    }
  }

  // ---------- screens ----------
  function titleScreen() {
    if (state.players.length) state.lastNames = state.players.map((p) => p.name); // Play again keeps the roster
    state.players = [];
    const letters = 'CLEANER'.split('').map((l, i) => `<span style="animation:bob 2s ${i * 0.1}s ease-in-out infinite">${l}</span>`).join('');
    show(`
      <div class="big-emoji">🧽</div>
      <h1 class="logo">${letters}</h1>
      <p class="sub">Scrub, sort, tidy and toss — then throw the house party of the year.</p>
      <div class="row"><button class="btn" id="go">Let's clean!</button></div>
    `);
    $('go').onclick = () => { C.sfx('click'); setupScreen(); };
  }

  function setupScreen() {
    const prev = state.players.length ? state.players.map((p) => p.name) : state.lastNames || [];
    let count = Math.max(1, prev.length || 1);
    let names = prev.slice();
    const render = () => {
      const cards = Array.from({ length: count }, (_, i) => `
        <div class="card pcard">
          <div class="swatch" style="background:${C.COLORS[i]}"></div>
          <input data-i="${i}" maxlength="10" value="${esc(names[i] || DEFAULT_NAMES[i])}" aria-label="Player ${i + 1} name">
        </div>`).join('');
      const diffs = Object.values(C.DIFFICULTY).map((d) => `
        <button data-d="${d.id}" class="${state.difficulty.id === d.id ? 'on' : ''}">${d.label}
        <small>${d.time}s · ${['tidy-ish', 'holey sponge', 'chaos puppy'][d.level - 1]}</small></button>`).join('');
      show(`
        <h2>Who's cleaning?</h2>
        <div class="row">
          <button class="btn small alt" id="minus" ${count <= 1 ? 'disabled' : ''}>−</button>
          <b>${count} player${count > 1 ? 's' : ''}</b>
          <button class="btn small alt" id="plus" ${count >= 4 ? 'disabled' : ''}>+</button>
        </div>
        <div class="players">${cards}</div>
        <h2>How messy?</h2>
        <div class="diff">${diffs}</div>
        <div class="row"><button class="btn alt" id="back">Back</button><button class="btn" id="start">Start chores</button></div>
        <p class="sub">${count > 1 ? 'Take turns on one device — pass it along between turns!' : 'Solo shift. Go for a high score!'}</p>
      `);
      screen.querySelectorAll('input').forEach((inp) => (inp.oninput = () => (names[+inp.dataset.i] = inp.value)));
      $('minus').onclick = () => { C.sfx('click'); count--; render(); };
      $('plus').onclick = () => { C.sfx('click'); count++; render(); };
      screen.querySelectorAll('.diff button').forEach((b) => (b.onclick = () => { C.sfx('click'); state.difficulty = C.DIFFICULTY[b.dataset.d]; render(); }));
      $('back').onclick = () => { C.sfx('click'); titleScreen(); };
      $('start').onclick = () => {
        C.sfx('fanfare');
        state.players = Array.from({ length: count }, (_, i) => newPlayer(i, (names[i] || '').trim()));
        state.choreIdx = 0; state.turnIdx = 0;
        turnIntro();
      };
    };
    render();
  }

  function choreMap() {
    return `<div class="choremap">${CHORE_ORDER.map((id, i) => {
      const c = chore(id); const cls = i < state.choreIdx ? 'done' : i === state.choreIdx ? 'now' : '';
      return `<span class="c ${cls}">${c ? c.emoji : '❔'} ${c ? c.name : id}</span>`;
    }).join('')}<span class="c ${state.choreIdx >= CHORE_ORDER.length ? 'now' : ''}">🎉 Party</span></div>`;
  }

  function turnIntro() {
    const c = chore(CHORE_ORDER[state.choreIdx]);
    const p = state.players[state.turnIdx];
    if (!c) { toast('Chore missing!'); return nextTurn(); }
    const pass = state.players.length > 1 ? `<h2>${dot(p.color)}${esc(p.name)}'s turn!</h2>` : '';
    show(`
      ${choreMap()}
      <div class="big-emoji">${c.emoji}</div>
      <h2>Round ${state.choreIdx + 1}: ${c.name}</h2>
      ${pass}
      <div class="card"><p>${c.howTo}</p></div>
      <p class="sub">${state.difficulty.label} · ${state.difficulty.time} seconds</p>
      <button class="btn" id="ready">Ready!</button>
    `);
    $('ready').onclick = () => { C.sfx('click'); startChore(); };
  }

  function startChore() {
    const id = CHORE_ORDER[state.choreIdx];
    const c = chore(id);
    const p = state.players[state.turnIdx];
    screen.classList.add('hidden');
    hud.classList.remove('hidden');
    $('hud-player').innerHTML = `${dot(p.color)}${esc(p.name)}`;
    $('hud-chore').textContent = `${c.emoji} ${c.name}`;
    $('hud-bar').style.width = '0%';
    const act = { id, chore: c, time: state.difficulty.time, progress: 0, done: false, lastTick: 99 };
    state.active = act;
    try {
      act.handle = c.start({
        canvas, ctx, difficulty: state.difficulty, player: p,
        setProgress: (v) => { act.progress = C.clamp(v, 0, 1); $('hud-bar').style.width = (act.progress * 100).toFixed(0) + '%'; },
        complete: () => { if (!act.done) endChore(true); },
      });
    } catch (e) { console.error(e); act.handle = null; endChore(false); }
  }

  function endChore(completed) {
    const act = state.active; if (!act || act.done) return;
    act.done = true;
    let raw = 0;
    try { raw = act.handle && act.handle.stop ? +act.handle.stop() || 0 : 0; } catch (e) { console.error(e); }
    raw = Math.round(C.clamp(raw, 0, 100));
    const bonus = completed ? Math.round(act.time * 2) : 0;
    const mult = state.difficulty.level; // harder = more points
    const total = (raw + bonus) * mult;
    const p = state.players[state.turnIdx];
    p.choreScores[act.id] = total; p.score += total;
    hud.classList.add('hidden');
    C.sfx(completed ? 'fanfare' : 'ding');
    if (completed) C.burst(C.W / 2, C.H / 2, '#ffd166', 40);
    const stars = raw >= 90 ? '⭐⭐⭐' : raw >= 60 ? '⭐⭐' : raw >= 25 ? '⭐' : '💨';
    show(`
      <h2>${completed ? 'Sparkling!' : "Time's up!"}</h2>
      <div class="big-emoji">${stars}</div>
      <div class="card"><p>Job quality <b>${raw}</b>${bonus ? ` + speed bonus <b>${bonus}</b>` : ''}${mult > 1 ? ` × ${mult} (${state.difficulty.label})` : ''}</p>
      <h2>+${total}</h2></div>
      <button class="btn" id="next">Next</button>
    `, { clear: true });
    $('next').onclick = () => { C.sfx('click'); state.active = null; nextTurn(); };
  }

  function nextTurn() {
    state.turnIdx++;
    if (state.turnIdx >= state.players.length) { state.turnIdx = 0; return roundScores(); }
    turnIntro();
  }

  function scoreTable() {
    const sorted = [...state.players].sort((a, b) => b.score - a.score);
    return `<table class="scores">${sorted.map((p) => `<tr><td>${['🥇', '🥈', '🥉', '🏅'][sorted.filter((q) => q.score > p.score).length]}</td><td>${dot(p.color)}${esc(p.name)}</td><td>${p.score}</td></tr>`).join('')}</table>`;
  }

  function roundScores() {
    state.choreIdx++;
    const last = state.choreIdx >= CHORE_ORDER.length;
    show(`
      ${choreMap()}
      <h2>${last ? 'All chores done! 🏠✨' : 'Round complete!'}</h2>
      ${scoreTable()}
      <button class="btn" id="next">${last ? 'Throw the house party! 🎉' : 'Next chore'}</button>
    `);
    $('next').onclick = () => { C.sfx('click'); last ? startParty() : turnIntro(); };
  }

  function startParty() {
    screen.classList.add('hidden');
    partyRoot.classList.remove('hidden');
    partyRoot.innerHTML = '';
    state.mode = 'party';
    if (!C.party.start) { partyRoot.innerHTML = '<h2>Party coming soon!</h2>'; return; }
    C.party.start({ root: partyRoot, players: state.players, difficulty: state.difficulty, onDone: () => { state.mode = null; partyRoot.classList.add('hidden'); partyRoot.innerHTML = ''; titleScreen(); } });
  }

  // ---------- loop ----------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const act = state.active;
    if (act && !act.done && act.handle) {
      act.time -= dt;
      const secs = Math.max(0, Math.ceil(act.time));
      const te = $('hud-time'); te.textContent = secs; te.classList.toggle('low', secs <= 10);
      if (secs <= 5 && secs < act.lastTick) { act.lastTick = secs; C.sfx('tick'); }
      try { act.handle.update && act.handle.update(dt); act.handle.draw && act.handle.draw(ctx); }
      catch (e) { console.error(e); endChore(false); }
      if (act.time <= 0) endChore(false);
    } else if (act && act.done && act.handle) {
      // keep last scene frozen under result card
    } else if (state.mode !== 'party') {
      drawIdle(dt);
    }
    C.drawParticles(fx, dt);
    requestAnimationFrame(frame);
  }

  // mute button
  const mb = document.createElement('button');
  mb.className = 'btn small alt mute'; mb.setAttribute('aria-label', 'Toggle sound');
  const setMb = () => (mb.textContent = C.muted ? '🔇' : '🔊');
  setMb(); mb.onclick = () => { C.setMuted(!C.muted); setMb(); mb.blur(); }; // blur: keep Space/Enter for the game, not re-toggling mute
  document.getElementById('stage').appendChild(mb);

  // ---------- boot (with ?debug=wall|trash|bed|takeout|party) ----------
  const params = new URLSearchParams(location.search);
  const dbg = params.get('debug');
  if (dbg) {
    state.players = [newPlayer(0, 'Tester'), newPlayer(1, 'Buddy')];
    state.players[0].score = 420; state.players[1].score = 380;
    state.difficulty = C.DIFFICULTY[params.get('d')] || C.DIFFICULTY.easy;
    if (dbg === 'party') startParty();
    else { state.choreIdx = Math.max(0, CHORE_ORDER.indexOf(dbg)); turnIntro(); }
  } else titleScreen();
  requestAnimationFrame(frame);
  C._state = state; // for debugging
})();
