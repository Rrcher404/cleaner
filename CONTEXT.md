# CLEANER — build contract (binding for every agent)

A small, cute, polished browser chore game. **Vanilla HTML/CSS/JS, no build step, no npm.** Open `index.html` (or `python3 -m http.server`) and play. Plain `<script>` tags (no ES modules) so it also works from `file://`.

## Game flow (owned by `js/main.js` — orchestrator)
1. **Title** → **Setup**: pick 1–4 local players (name + color), pick difficulty: Easy / Hard / Super Hard.
2. **Chore rounds**, in order: `wall` → `trash` → `bed` → `takeout`.
   Hot-seat multiplayer: for each chore, every player takes a turn ("Pass to Mia!" card between turns).
3. After each chore: round scoreboard.
4. After all chores: **House Party** (`js/party.js`) — every player dresses up, then the party plays out; final scores / winner crowned.

## Global namespace
Everything hangs off `window.Cleaner` (created in `js/core.js`, loaded first).

```js
Cleaner.W = 960; Cleaner.H = 600;          // logical canvas size; CSS scales it
Cleaner.DIFFICULTY = {
  easy:  { id:'easy',  label:'Easy',       time:60, level:1 },
  hard:  { id:'hard',  label:'Hard',       time:50, level:2 },
  super: { id:'super', label:'Super Hard', time:40, level:3 },
};
Cleaner.COLORS = ['#ff7eb6','#7ec8ff','#ffd166','#8be38b']; // player colors
Cleaner.sfx(name)   // names: 'pop','scrub','pick','drop','ding','wrong','whoosh','fanfare','tick','click'
Cleaner.rand(a,b), Cleaner.clamp(v,a,b), Cleaner.lerp(a,b,t), Cleaner.dist(x1,y1,x2,y2)
Cleaner.pointer(canvas, evt) -> {x,y}       // converts a pointer event into logical 960x600 coords
Cleaner.burst(x,y,color,count)              // spawn sparkle particles; main draws them on top layer
Cleaner.chores = {}                          // registry, filled by js/chores.js
Cleaner.party  = {}                          // filled by js/party.js
Cleaner.art    = {}                          // filled by js/art.js
```

## Chore interface (Kaz → `js/chores.js`)
```js
Cleaner.chores.wall = {
  id:'wall', name:'Scrub the Wall', emoji:'🧽',
  howTo:'Drag the sponge over the grime. Grab bubbles to patch your sponge holes!',
  start(api) { ... return { update(dt), draw(ctx), stop() } }
};
```
`api` = `{ canvas, ctx, difficulty /* DIFFICULTY entry */, player /* {name,color,outfit} */, complete(), setProgress(p /*0..1*/) }`
- `start` attaches its own pointer/keyboard listeners to `api.canvas`/`window`; **`stop()` must remove them** and return the raw score **0–100** (quality of the job).
- main owns the loop: calls `update(dt seconds)` then `draw(ctx)` each frame. Chore draws the full 960×600 scene (background included). main draws HUD (timer, progress bar, player chip) as DOM overlay — chores do NOT draw timer/HUD.
- Call `api.setProgress()` as the job advances; call `api.complete()` when 100% done (main then calls `stop()` and grants a time bonus). On timeout main calls `stop()` itself.
- Difficulty scales via `difficulty.level` (1,2,3): more grime/trash/obstacles, sloppier tools.

### The four chores
- **wall — Scrub the Wall.** Grimy wall (smudges, crayon, mud splats) on an offscreen mask canvas; sponge follows pointer while held, erases grime. **The sponge has holes**: level 1 = 0 holes, 2 = 3 holes, 3 = 6 holes; holes don't clean, so you leave polka-dot streaks. Soap bubbles float by — pop one (touch it with the sponge) to patch all holes for 5s and get a bigger sponge. Progress = cleaned fraction (sample the mask on a coarse grid every ~0.25s). Done at ≥ 95%.
- **trash — Pick Up the Trash.** Messy room floor with mixed items: recycling (can, bottle, paper), compost (banana peel, apple core), trash (chip bag, gum). Drag each into the right bin (3 bins, color + icon). Wrong bin = item bounces back + 'wrong'. Count: 8 / 12 / 16 items. Level 3: a mischievous puppy occasionally drags an item away.
- **bed — Make the Bed.** Messy bed: steps in order — (1) straighten the sheet by swiping across wrinkles, (2) drag the blanket up from the floor onto the bed, (3) drop pillows onto pillow spots, (4) place teddy bear. Level 2–3: more wrinkles, more pillows, pillows must match a slot color.
- **takeout — Take Out the Trash.** Side view: house door left, curb bins right. Click the full trash bag to tie it, then guide the player (arrow keys / A-D, or hold pointer left/right side) carrying the bag to the curb. Hop (Space / tap) over obstacles (toys, puddles, a cat). Level scales obstacles + speed + a leaky bag that drops bits you can tap to pick back up. Number of bags: 1 / 2 / 3.

## Art & party (Isolde → `js/art.js`, `js/party.js`)
```js
Cleaner.art.OUTFITS = { hat:[...], top:[...], bottom:[...], shoes:[...], accessory:[...] } // each item {id,name,color?}
Cleaner.art.defaultOutfit() -> {hat:'none', top:'tee', bottom:'shorts', shoes:'sneakers', accessory:'none', skin:'#f2c7a5', hair:'#5a3b2e'}
Cleaner.art.drawCharacter(ctx, x, y, scale, player /*{color,outfit}*/, t /*seconds*/, pose /*'idle'|'walk'|'dance'|'carry'|'cheer'*/)
   // x,y = feet center; scale 1 ≈ 120px tall. Cute chibi: big head, dot eyes, rosy cheeks.
Cleaner.party.start({ root /*HTMLElement*/, players /*[{name,color,score,outfit}]*/, onDone() })
```
- Party = DOM screen inside `root`: (a) **Wardrobe** — each player in turn picks hat/top/bottom/shoes/accessory + skin/hair with a live canvas preview (outfit saved to `player.outfit`); (b) **Party scene** canvas — disco lights, all players dancing, confetti, a short "dance-off" minigame (press the shown arrow on beat, ~20s, each player one turn, adds bonus points); (c) **Final** podium: winner crowned, "Play again" button calling `onDone()`.
- Chores (Kaz) may call `Cleaner.art.drawCharacter` (e.g. takeout player) — guard with `if (Cleaner.art.drawCharacter)`.

## Visual language (everyone)
Pastel, rounded, soft shadows, chunky outlines (`#3b2f4a`, 3–4px), font **Fredoka** (loaded in index.html; fallback `system-ui`). Palette: cream `#fff6e9`, blush `#ffd6e0`, mint `#c9f2df`, sky `#cfe8ff`, butter `#fff1b8`, ink `#3b2f4a`. Draw everything procedurally (canvas paths/emoji) — no image files.

## Rules for agents
- Only edit the files you own. Don't touch `index.html`, `js/core.js`, `js/main.js`, `css/style.css` (orchestrator) — if you need a change there, say so in your report.
- No git commits/pushes. No external network calls besides the Google Font already linked.
- Test in a browser if you can (the built-in Browser/Playwright tools, `python3 -m http.server 8137` from the repo root). `?debug=wall` (or trash/bed/takeout/party) in the URL jumps straight to that screen with 2 test players.
- Write a short report to `reports/<yourname>.md` and return a 5-line summary.
