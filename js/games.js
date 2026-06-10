/* ============================================================
   games.js — играбельные демо-игры на HTML5 Canvas
   window.GAMES[key](root) -> returns destroy()
   ============================================================ */
(function () {
  const GAMES = {};
  window.GAMES = GAMES;

  /* ----------------------- helpers ----------------------- */
  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const lerp = (a, b, t) => a + (b - a) * t;
  const dist = (x1, y1, x2, y2) => Math.hypot(x1 - x2, y1 - y2);

  let actx;
  function beep(freq, dur, type, vol) {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = type || 'square'; o.frequency.value = freq || 440;
      g.gain.value = vol || 0.03;
      o.connect(g); g.connect(actx.destination);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + (dur || 0.08));
      o.stop(actx.currentTime + (dur || 0.08));
    } catch (e) {}
  }

  function pos(canvas, e) {
    const r = canvas.getBoundingClientRect();
    const p = (e.touches && e.touches[0]) ? e.touches[0] : e;
    return {
      x: (p.clientX - r.left) / r.width * canvas.width,
      y: (p.clientY - r.top) / r.height * canvas.height
    };
  }
  function best(key, val) {
    if (val != null) {
      const cur = +localStorage.getItem(key) || 0;
      if (val > cur) localStorage.setItem(key, val);
      return Math.max(cur, val);
    }
    return +localStorage.getItem(key) || 0;
  }
  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function setHud(api, parts) {
    api.hud.innerHTML = parts.map(p => '<span class="pill">' + p + '</span>').join('');
  }
  function gbtn(label, cls) { return el('button', 'game-btn' + (cls ? ' ' + cls : ''), label); }

  function overlay(ctx, W, H, title, lines) {
    ctx.save();
    ctx.fillStyle = 'rgba(8,12,22,.74)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = '800 30px Inter, sans-serif';
    ctx.fillText(title, W / 2, H / 2 - 18);
    ctx.font = '500 15px Inter, sans-serif';
    ctx.fillStyle = '#c7d2e0';
    (lines || []).forEach((l, i) => ctx.fillText(l, W / 2, H / 2 + 12 + i * 22));
    ctx.restore();
  }

  /* developer-card mini draw used by some start screens */
  function drawStars(ctx, x, y, n, size, col) {
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = col;
      ctx.font = (size || 16) + 'px Inter';
      ctx.fillText('★', x + i * (size || 16) * 1.1, y);
    }
  }

  /* ----------------------- shell ----------------------- */
  function createShell(root, opts) {
    opts = opts || {};
    const W = opts.W || 420, H = opts.H || 540;
    root.innerHTML = '';
    const shell = el('div', 'game-shell');
    const wrap = el('div', 'game-canvas-wrap');
    if (opts.maxw) wrap.style.maxWidth = opts.maxw + 'px';
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H; canvas.className = 'game-canvas';
    canvas.style.aspectRatio = W + ' / ' + H;
    wrap.appendChild(canvas);
    const hud = el('div', 'game-hud');
    const controls = el('div');
    controls.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;justify-content:center';
    const hint = el('div', 'game-hint', opts.hint || '');
    shell.append(hud, wrap, controls, hint);
    root.appendChild(shell);

    const ctx = canvas.getContext('2d');
    let raf = null, last = 0, running = false, update = null;
    const cleanups = [];
    const loop = (t) => {
      if (!running) return;
      let dt = (t - last) / 1000; if (dt > 0.05) dt = 0.05; last = t;
      if (update) update(dt, t);
      raf = requestAnimationFrame(loop);
    };
    return {
      canvas, ctx, W, H, hud, controls, hint,
      setLoop(fn) { update = fn; },
      start() { if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(loop); },
      stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = null; },
      on(target, ev, fn, o) { target.addEventListener(ev, fn, o); cleanups.push(() => target.removeEventListener(ev, fn, o)); },
      addCleanup(fn) { cleanups.push(fn); },
      destroy() { this.stop(); cleanups.forEach(c => { try { c(); } catch (e) {} }); }
    };
  }

  /* =========================================================
     1) SPACE DEFENDER — shooter
     ========================================================= */
  GAMES.space = function (root, opts) {
    const api = createShell(root, { W: 420, H: 560, maxw: 420, hint: '← → или перетаскивай · Space / тап — burst. Каждая 5-я волна — босс.' });
    const { ctx, W, H, canvas } = api;
    const name = (opts && opts.name) || 'Игрок';
    let state = 'start', score = 0, lives = 3, wave = 1, combo = 0, bestv = best('bd_space');
    let player, bullets, enemies, ebul, parts, pups, fireT, drag = false;
    const keys = {};
    const stars = Array.from({ length: 60 }, () => ({ x: rand(0, W), y: rand(0, H), z: rand(.3, 1) }));

    function reset() {
      player = { x: W / 2, y: H - 56, w: 36, h: 26, sp: 360, triple: 0, shield: 0 };
      bullets = []; ebul = []; parts = []; pups = [];
      score = 0; lives = 3; wave = 1; combo = 0; fireT = 0;
      spawnWave(); state = 'play';
    }
    function spawnWave() {
      enemies = [];
      if (wave % 5 === 0) {
        const hp = 16 + wave * 3;
        enemies.push({ x: W / 2, y: 90, w: 96, h: 56, hp, maxhp: hp, boss: true, dir: 1, shootT: 0 });
      } else {
        const rows = Math.min(2 + Math.floor(wave / 2), 4), cols = 6;
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++)
          enemies.push({ baseX: 56 + c * 54, x: 56 + c * 54, y: 56 + r * 42, w: 30, h: 22, hp: 1, t: rand(0, 6), shootT: rand(1, 4), boss: false });
      }
    }
    function boom(x, y, col, n) { for (let i = 0; i < (n || 10); i++) parts.push({ x, y, vx: rand(-120, 120), vy: rand(-120, 120), life: rand(.3, .7), col }); }
    function shoot() {
      const sp = -580;
      if (player.triple > 0) { bullets.push({ x: player.x, y: player.y - 14, vx: 0, vy: sp }); bullets.push({ x: player.x, y: player.y - 14, vx: -120, vy: sp }); bullets.push({ x: player.x, y: player.y - 14, vx: 120, vy: sp }); }
      else bullets.push({ x: player.x, y: player.y - 14, vx: 0, vy: sp });
      beep(900, 0.04, 'square', 0.02);
    }

    api.on(window, 'keydown', e => { keys[e.key] = true; if (e.key === ' ') { e.preventDefault(); if (state === 'play') shoot(); else reset(); } });
    api.on(window, 'keyup', e => { keys[e.key] = false; });
    const move = e => { if (state !== 'play') return; player.x = clamp(pos(canvas, e).x, player.w / 2, W - player.w / 2); };
    api.on(canvas, 'pointerdown', e => { if (state !== 'play') { reset(); return; } drag = true; move(e); shoot(); });
    api.on(window, 'pointermove', e => { if (drag) move(e); });
    api.on(window, 'pointerup', () => drag = false);

    api.setLoop((dt) => {
      ctx.fillStyle = '#070b16'; ctx.fillRect(0, 0, W, H);
      stars.forEach(s => { s.y += s.z * 40 * dt; if (s.y > H) { s.y = 0; s.x = rand(0, W); } ctx.fillStyle = 'rgba(255,255,255,' + s.z + ')'; ctx.fillRect(s.x, s.y, 2, 2); });

      if (state === 'play') {
        let mv = 0; if (keys.ArrowLeft || keys.a) mv -= 1; if (keys.ArrowRight || keys.d) mv += 1;
        player.x = clamp(player.x + mv * player.sp * dt, player.w / 2, W - player.w / 2);
        fireT -= dt; if (fireT <= 0) { fireT = player.triple > 0 ? 0.18 : 0.26; shoot(); }
        if (player.triple > 0) player.triple -= dt; if (player.shield > 0) player.shield -= dt;

        bullets.forEach(b => { b.x += b.vx * dt; b.y += b.vy * dt; });
        bullets = bullets.filter(b => b.y > -20);
        ebul.forEach(b => { b.x += b.vx * dt; b.y += b.vy * dt; });
        ebul = ebul.filter(b => b.y < H + 20);

        enemies.forEach(e => {
          e.t = (e.t || 0) + dt;
          if (e.boss) {
            e.x += e.dir * 70 * dt; if (e.x < e.w / 2 || e.x > W - e.w / 2) e.dir *= -1;
            e.shootT -= dt; if (e.shootT <= 0) { e.shootT = 0.5; ebul.push({ x: e.x, y: e.y + e.h / 2, vx: rand(-60, 60), vy: 220 }); }
          } else {
            e.x = e.baseX + Math.sin(e.t * 1.6) * 16; e.y += 4 * dt;
            e.shootT -= dt; if (e.shootT <= 0) { e.shootT = rand(2, 4); ebul.push({ x: e.x, y: e.y + e.h / 2, vx: 0, vy: 190 }); }
          }
        });

        // bullet vs enemy
        bullets.forEach(b => {
          enemies.forEach(e => {
            if (Math.abs(b.x - e.x) < e.w / 2 && Math.abs(b.y - e.y) < e.h / 2) {
              b.dead = true; e.hp -= 1; boom(b.x, b.y, '#7dd3fc', 4);
              if (e.hp <= 0) {
                e.dead = true; combo++; score += (e.boss ? 200 : 10) * Math.max(1, Math.floor(combo / 5) + 1);
                boom(e.x, e.y, e.boss ? '#fca5a5' : '#fde68a', e.boss ? 30 : 12);
                beep(e.boss ? 160 : 440, 0.12, 'sawtooth', 0.04);
                if (!e.boss && Math.random() < 0.12) pups.push({ x: e.x, y: e.y, vy: 90, kind: Math.random() < .5 ? 'triple' : 'shield' });
              }
            }
          });
        });
        bullets = bullets.filter(b => !b.dead);
        enemies = enemies.filter(e => !e.dead);

        // enemy bullet vs player
        ebul.forEach(b => {
          if (Math.abs(b.x - player.x) < player.w / 2 && Math.abs(b.y - player.y) < player.h / 2) {
            b.dead = true;
            if (player.shield > 0) { boom(player.x, player.y, '#67e8f9', 10); beep(700, .06, 'sine', .03); }
            else { lives--; combo = 0; boom(player.x, player.y, '#fca5a5', 16); beep(120, .2, 'sawtooth', .05); if (lives <= 0) { state = 'over'; bestv = best('bd_space', score); } }
          }
        });
        ebul = ebul.filter(b => !b.dead);

        // powerups
        pups.forEach(p => { p.y += p.vy * dt; if (Math.abs(p.x - player.x) < 26 && Math.abs(p.y - player.y) < 26) { p.dead = true; if (p.kind === 'triple') player.triple = 6; else player.shield = 6; beep(1100, .1, 'sine', .04); } });
        pups = pups.filter(p => !p.dead && p.y < H + 20);

        if (enemies.length === 0) { wave++; spawnWave(); }
      }

      // draw enemies
      enemies.forEach(e => {
        ctx.save(); ctx.translate(e.x, e.y);
        if (e.boss) {
          ctx.fillStyle = '#f87171'; rr(ctx, -e.w / 2, -e.h / 2, e.w, e.h, 12); ctx.fill();
          ctx.fillStyle = '#fecaca'; ctx.beginPath(); ctx.arc(0, 0, 12, 0, 7); ctx.fill();
          ctx.fillStyle = '#1f2937'; rr(ctx, -e.w / 2, e.h / 2 + 4, e.w, 6, 3); ctx.fill();
          ctx.fillStyle = '#34d399'; rr(ctx, -e.w / 2, e.h / 2 + 4, e.w * (e.hp / e.maxhp), 6, 3); ctx.fill();
        } else {
          ctx.fillStyle = '#a78bfa'; rr(ctx, -e.w / 2, -e.h / 2, e.w, e.h, 8); ctx.fill();
          ctx.fillStyle = '#ede9fe'; ctx.beginPath(); ctx.arc(-6, 0, 3, 0, 7); ctx.arc(6, 0, 3, 0, 7); ctx.fill();
        }
        ctx.restore();
      });
      // bullets
      ctx.fillStyle = '#7dd3fc'; bullets.forEach(b => ctx.fillRect(b.x - 2, b.y - 8, 4, 12));
      ctx.fillStyle = '#fca5a5'; ebul.forEach(b => { ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, 7); ctx.fill(); });
      // powerups
      pups.forEach(p => { ctx.fillStyle = p.kind === 'triple' ? '#fbbf24' : '#22d3ee'; rr(ctx, p.x - 11, p.y - 11, 22, 22, 6); ctx.fill(); ctx.fillStyle = '#0b1020'; ctx.font = '13px Inter'; ctx.textAlign = 'center'; ctx.fillText(p.kind === 'triple' ? '✦' : '⛨', p.x, p.y + 4); });
      // particles
      parts.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.col; ctx.fillRect(p.x - 2, p.y - 2, 4, 4); ctx.globalAlpha = 1; });
      parts = parts.filter(p => p.life > 0);
      // player ship
      if (player) {
        ctx.save(); ctx.translate(player.x, player.y);
        if (player.shield > 0) { ctx.strokeStyle = 'rgba(103,232,249,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 26, 0, 7); ctx.stroke(); }
        ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(16, 12); ctx.lineTo(-16, 12); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#60a5fa'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, 7); ctx.fill();
        ctx.fillStyle = '#fb923c'; ctx.beginPath(); ctx.moveTo(-6, 12); ctx.lineTo(0, 12 + rand(6, 14)); ctx.lineTo(6, 12); ctx.fill();
        ctx.restore();
      }

      setHud(api, ['Очки: ' + score, 'Волна: ' + wave, '❤'.repeat(Math.max(0, lives)) || '—', 'Combo ×' + (Math.floor(combo / 5) + 1), 'Рекорд: ' + bestv]);
      if (state === 'start') overlay(ctx, W, H, '🚀 Space Defender', ['Пилот: ' + name, 'Клик / Space — старт', 'Защити планету!']);
      if (state === 'over') overlay(ctx, W, H, 'Игра окончена', ['Очки: ' + score + ' · Рекорд: ' + bestv, 'Клик / Space — заново']);
    });

    const b = gbtn('▶ Старт'); api.on(b, 'click', () => reset());
    api.controls.appendChild(b);
    reset(); state = 'start'; api.start();
    return () => api.destroy();
  };

  /* =========================================================
     2) TURBO RACER — endless lane dodger
     ========================================================= */
  GAMES.racer = function (root, opts) {
    const api = createShell(root, { W: 360, H: 560, maxw: 360, hint: '← → / A-D / свайп — менять полосу · ↑ или тап-удержание — нитро' });
    const { ctx, W, H, canvas } = api;
    const name = (opts && opts.name) || 'Игрок';
    const lanes = [W * 0.28, W * 0.5, W * 0.72];
    let state = 'start', lane, px, dist, coins, speed, nitro, heat, traffic, items, t, bestv = best('bd_racer'), boost;
    const keys = {};
    function reset() { lane = 1; px = lanes[1]; dist = 0; coins = 0; speed = 220; nitro = false; heat = 0; boost = 0; traffic = []; items = []; t = 0; state = 'play'; }
    function setLane(d) { lane = clamp(lane + d, 0, 2); beep(600, .04, 'square', .02); }
    api.on(window, 'keydown', e => {
      keys[e.key] = true;
      if (state === 'play') { if (e.key === 'ArrowLeft' || e.key === 'a') setLane(-1); if (e.key === 'ArrowRight' || e.key === 'd') setLane(1); }
      else if (e.key === ' ' || e.key === 'Enter') reset();
    });
    api.on(window, 'keyup', e => keys[e.key] = false);
    let sx = null;
    api.on(canvas, 'pointerdown', e => { if (state !== 'play') { reset(); return; } sx = pos(canvas, e).x; boost = 1; });
    api.on(window, 'pointerup', () => { sx = null; boost = 0; });
    api.on(window, 'pointermove', e => { if (sx == null || state !== 'play') return; const nx = pos(canvas, e).x; if (nx - sx > 30) { setLane(1); sx = nx; } else if (nx - sx < -30) { setLane(-1); sx = nx; } });

    api.setLoop((dt) => {
      t += dt;
      // sky/road palette by distance (day->night)
      const phase = (dist % 3000) / 3000;
      const dark = Math.abs(phase - 0.5) * 2; // 0 day 1 night-ish
      const sky = `rgb(${Math.round(lerp(150, 20, dark))},${Math.round(lerp(200, 30, dark))},${Math.round(lerp(255, 60, dark))})`;
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H * 0.32);
      ctx.fillStyle = '#3b3f4a'; ctx.fillRect(0, H * 0.32, W, H);
      // perspective road
      ctx.fillStyle = '#52565f';
      ctx.beginPath(); ctx.moveTo(W * 0.38, H * 0.32); ctx.lineTo(W * 0.62, H * 0.32); ctx.lineTo(W * 0.95, H); ctx.lineTo(W * 0.05, H); ctx.closePath(); ctx.fill();
      // lane dashes
      ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3; ctx.setLineDash([18, 22]); ctx.lineDashOffset = -(dist % 40);
      [0.42, 0.58].forEach(f => { ctx.beginPath(); ctx.moveTo(lerp(W * 0.5, W * f, 0) , H * 0.32); });
      ctx.setLineDash([]);

      if (state === 'play') {
        nitro = (keys.ArrowUp || keys.w || boost) && heat < 1;
        if (nitro) { heat = clamp(heat + dt * 0.5, 0, 1); speed = clamp(speed + 260 * dt, 220, 620); }
        else { heat = clamp(heat - dt * 0.35, 0, 1); speed = clamp(speed - 120 * dt, 200 + dist * 0.01, 620); }
        dist += speed * dt;
        px = lerp(px, lanes[lane], clamp(dt * 12, 0, 1));
        // spawn
        if (Math.random() < dt * (1.1 + dist / 8000)) traffic.push({ lane: Math.floor(rand(0, 3)), y: -40, near: false });
        if (Math.random() < dt * 0.6) items.push({ lane: Math.floor(rand(0, 3)), y: -40, kind: Math.random() < .25 ? 'fuel' : 'coin' });
        traffic.forEach(c => c.y += (speed + 120) * dt);
        items.forEach(c => c.y += (speed + 120) * dt);
        // collisions
        const carY = H - 90;
        traffic.forEach(c => {
          const cy = c.y, cx = lanes[c.lane];
          if (c.lane === lane && Math.abs(cy - carY) < 46) { state = 'over'; bestv = best('bd_racer', Math.floor(dist)); beep(90, .3, 'sawtooth', .06); }
          else if (!c.near && Math.abs(cy - carY) < 60 && c.lane !== lane && Math.abs(cx - px) < 70) { c.near = true; coins += 2; }
        });
        items.forEach(c => { if (c.lane === lane && Math.abs(c.y - carY) < 40) { c.dead = true; if (c.kind === 'coin') { coins++; beep(1000, .05, 'sine', .03); } else { heat = clamp(heat - 0.4, 0, 1); beep(1300, .08, 'sine', .03); } } });
        traffic = traffic.filter(c => c.y < H + 60); items = items.filter(c => !c.dead && c.y < H + 60);
      }

      // draw items & traffic (scale with perspective)
      function laneX(l, y) { const f = (y - H * 0.32) / (H - H * 0.32); return lerp(lerp(W * 0.5, lanes[l] < W * 0.5 ? W * 0.42 : (lanes[l] > W * 0.5 ? W * 0.58 : W * 0.5), 0), lanes[l], clamp(f, 0, 1)); }
      items.forEach(c => { const x = laneX(c.lane, c.y), s = lerp(0.4, 1, clamp((c.y - H * 0.32) / (H - H * 0.32), 0, 1)); ctx.font = (22 * s) + 'px Inter'; ctx.textAlign = 'center'; ctx.fillText(c.kind === 'coin' ? '🪙' : '⛽', x, c.y); });
      traffic.forEach(c => { const x = laneX(c.lane, c.y), s = lerp(0.4, 1, clamp((c.y - H * 0.32) / (H - H * 0.32), 0, 1)); drawCar(x, c.y, 34 * s, 56 * s, '#e2e8f0', '#94a3b8'); });
      // player car
      drawCar(px, H - 90, 38, 62, '#fbbf24', '#f59e0b');
      if (nitro) { ctx.fillStyle = '#60a5fa'; ctx.beginPath(); ctx.moveTo(px - 8, H - 60); ctx.lineTo(px, H - 60 + rand(14, 30)); ctx.lineTo(px + 8, H - 60); ctx.fill(); }

      function drawCar(x, y, w, h, body, roof) {
        ctx.save(); ctx.translate(x, y);
        ctx.fillStyle = 'rgba(0,0,0,.25)'; rr(ctx, -w / 2 + 2, -h / 2 + 4, w, h, 8); ctx.fill();
        ctx.fillStyle = body; rr(ctx, -w / 2, -h / 2, w, h, 8); ctx.fill();
        ctx.fillStyle = roof; rr(ctx, -w / 2 + 4, -h / 2 + 10, w - 8, h * 0.4, 5); ctx.fill();
        ctx.fillStyle = '#1f2937'; rr(ctx, -w / 2 + 4, h / 2 - 12, w - 8, 8, 3); ctx.fill();
        ctx.restore();
      }

      setHud(api, ['🏁 ' + Math.floor(dist) + ' м', '🪙 ' + coins, '⚡ ' + Math.round(speed), 'Рекорд: ' + bestv]);
      // heat bar
      ctx.fillStyle = 'rgba(0,0,0,.3)'; rr(ctx, 10, 10, 120, 10, 5); ctx.fill();
      ctx.fillStyle = heat > .8 ? '#ef4444' : '#22d3ee'; rr(ctx, 10, 10, 120 * heat, 10, 5); ctx.fill();

      if (state === 'start') overlay(ctx, W, H, '🏎️ Turbo Racer', ['Гонщик: ' + name, 'Клик / Space — старт', 'Уворачивайся и жми нитро!']);
      if (state === 'over') overlay(ctx, W, H, 'Авария!', [Math.floor(dist) + ' м · 🪙 ' + coins, 'Рекорд: ' + bestv, 'Клик / Space — заново']);
    });
    const b = gbtn('▶ Старт'); api.on(b, 'click', () => reset()); api.controls.appendChild(b);
    reset(); state = 'start'; api.start();
    return () => api.destroy();
  };

  /* =========================================================
     3) PENALTY KING — aim + power football
     ========================================================= */
  GAMES.penalty = function (root, opts) {
    const api = createShell(root, { W: 440, H: 420, maxw: 460, hint: 'Клик 1 — зафиксировать прицел · Клик 2 — зафиксировать силу. Обыграй вратаря!' });
    const { ctx, W, H, canvas } = api;
    const name = (opts && opts.name) || 'Игрок';
    const goal = { x: W * 0.18, y: 60, w: W * 0.64, h: 150 };
    let state = 'start', phase = 'aim', aimX, aimDir = 1, power, powDir = 1, lockX, lockPow;
    let shots, goals, streak, ball, keeper, anim, msg, msgT, bestv = best('bd_penalty');
    function reset() { shots = 0; goals = 0; streak = 0; state = 'play'; nextShot(); }
    function nextShot() { phase = 'aim'; aimX = goal.x + goal.w / 2; aimDir = 1; power = 0.2; powDir = 1; ball = { x: W / 2, y: H - 50, r: 12, fly: false }; keeper = { x: goal.x + goal.w / 2, t: goal.x + goal.w / 2, w: 54 }; anim = 0; }
    function tap() {
      if (state !== 'play') { reset(); return; }
      if (phase === 'aim') { lockX = aimX; phase = 'power'; beep(700, .05, 'square', .03); }
      else if (phase === 'power') { lockPow = power; phase = 'shoot'; shoot(); }
    }
    function shoot() {
      shots++;
      const tx = lockX, ty = lerp(goal.y + goal.h - 14, goal.y + 16, lockPow);
      ball.tx = tx; ball.ty = ty; ball.sx = ball.x; ball.sy = ball.y; ball.fly = true; ball.p = 0;
      const diff = clamp(0.45 - shots * 0.02, 0.12, 0.45);
      const guess = (Math.random() < 0.62) ? tx + rand(-40, 40) : goal.x + rand(0, goal.w);
      keeper.t = clamp(guess, goal.x + keeper.w / 2, goal.x + goal.w - keeper.w / 2);
      keeper.diff = diff;
      beep(500, .08, 'square', .03);
    }
    api.on(canvas, 'pointerdown', tap);
    api.on(window, 'keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); tap(); } });

    api.setLoop((dt) => {
      // pitch
      ctx.fillStyle = '#15803d'; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 10; i++) { ctx.fillStyle = i % 2 ? '#16a34a' : '#15803d'; ctx.fillRect(0, i * H / 10, W, H / 10); }
      // goal
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.strokeRect(goal.x, goal.y, goal.w, goal.h);
      ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 1;
      for (let i = 1; i < 8; i++) { ctx.beginPath(); ctx.moveTo(goal.x + i * goal.w / 8, goal.y); ctx.lineTo(goal.x + i * goal.w / 8, goal.y + goal.h); ctx.stroke(); }
      for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(goal.x, goal.y + i * goal.h / 4); ctx.lineTo(goal.x + goal.w, goal.y + i * goal.h / 4); ctx.stroke(); }

      if (state === 'play') {
        if (phase === 'aim') { aimX += aimDir * 160 * dt; if (aimX > goal.x + goal.w - 16 || aimX < goal.x + 16) aimDir *= -1; }
        else if (phase === 'power') { power += powDir * 1.1 * dt; if (power > 1 || power < 0.1) powDir *= -1; }
        else if (phase === 'shoot' && ball.fly) {
          ball.p += dt * 1.6;
          keeper.x = lerp(keeper.x, keeper.t, clamp(dt * 6, 0, 1));
          if (ball.p >= 1) {
            ball.fly = false;
            const saved = Math.abs(ball.tx - keeper.x) < keeper.w / 2 + ball.r;
            if (saved) { streak = 0; msg = 'СЕЙВ! 🧤'; beep(160, .2, 'sawtooth', .05); }
            else { goals++; streak++; msg = 'ГОЛ! ⚽'; beep(900, .12, 'sine', .04); }
            msgT = 1.2; phase = 'done';
            if (shots >= 5 && goals < 3 || shots >= 8) { /* allow continue */ }
          }
        } else if (phase === 'done') { msgT -= dt; if (msgT <= 0) nextShot(); }
      }
      // keeper
      const kx = keeper ? keeper.x : goal.x + goal.w / 2;
      ctx.fillStyle = '#f59e0b'; rr(ctx, kx - keeper.w / 2, goal.y + goal.h - 56, keeper.w, 56, 8); ctx.fill();
      ctx.fillStyle = '#fde68a'; ctx.beginPath(); ctx.arc(kx, goal.y + goal.h - 64, 12, 0, 7); ctx.fill();
      // aim reticle
      if (phase === 'aim') { ctx.strokeStyle = '#fde047'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(aimX, goal.y + goal.h / 2, 14, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(aimX - 20, goal.y + goal.h / 2); ctx.lineTo(aimX + 20, goal.y + goal.h / 2); ctx.moveTo(aimX, goal.y + goal.h / 2 - 20); ctx.lineTo(aimX, goal.y + goal.h / 2 + 20); ctx.stroke(); }
      if (lockX != null && phase !== 'aim') { ctx.fillStyle = 'rgba(253,224,71,.5)'; ctx.beginPath(); ctx.arc(lockX, lerp(goal.y + goal.h - 14, goal.y + 16, (phase === 'power' ? power : lockPow)), 8, 0, 7); ctx.fill(); }
      // ball
      let bx = ball.x, by = ball.y;
      if (ball.fly) { bx = lerp(ball.sx, ball.tx, ball.p); by = lerp(ball.sy, ball.ty, ball.p) - Math.sin(ball.p * Math.PI) * 40; }
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(bx, by, ball.r, 0, 7); ctx.fill();
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(bx, by, ball.r * 0.4, 0, 7); ctx.fill();
      // power bar
      ctx.fillStyle = 'rgba(0,0,0,.3)'; rr(ctx, W - 30, H - 150, 16, 130, 8); ctx.fill();
      const pv = phase === 'power' ? power : (phase === 'aim' ? 0 : lockPow || 0);
      ctx.fillStyle = pv > .8 ? '#ef4444' : '#22d3ee'; rr(ctx, W - 30, H - 20 - 130 * pv, 16, 130 * pv, 8); ctx.fill();

      setHud(api, ['⚽ Голы: ' + (goals || 0), 'Удары: ' + (shots || 0), '🔥 Серия: ' + (streak || 0), 'Точн.: ' + (shots ? Math.round(goals / shots * 100) : 0) + '%', 'Рекорд: ' + bestv]);
      if (msgT > 0 && msg) { ctx.textAlign = 'center'; ctx.font = '800 34px Inter'; ctx.fillStyle = msg[0] === 'Г' ? '#fde047' : '#fca5a5'; ctx.fillText(msg, W / 2, H / 2); ctx.textAlign = 'left'; bestv = best('bd_penalty', goals); }
      if (state === 'start') overlay(ctx, W, H, '⚽ Penalty King', ['Бомбардир: ' + name, 'Клик / Space — старт', 'Прицел → сила → удар']);
    });
    const b = gbtn('▶ Старт'); api.on(b, 'click', () => reset()); api.controls.appendChild(b);
    state = 'start'; nextShot(); api.start();
    return () => api.destroy();
  };

  /* =========================================================
     4) NINJA RUN — endless runner
     ========================================================= */
  GAMES.runner = function (root, opts) {
    const api = createShell(root, { W: 600, H: 320, maxw: 600, hint: 'Space / ↑ / тап — прыжок (двойной) · ↓ — подкат' });
    const { ctx, W, H, canvas } = api;
    const name = (opts && opts.name) || 'Игрок';
    const ground = H - 50;
    let state = 'start', p, obs, parts, dist, coins, spd, jumps, bestv = best('bd_runner');
    function reset() { p = { x: 80, y: ground, vy: 0, w: 30, h: 44, duck: false }; obs = []; parts = []; dist = 0; coins = 0; spd = 260; jumps = 0; state = 'play'; }
    function jump() { if (state !== 'play') { reset(); return; } if (p.y >= ground - 1) { p.vy = -560; jumps = 1; beep(700, .06, 'square', .03); } else if (jumps < 2) { p.vy = -480; jumps = 2; beep(820, .06, 'square', .03); } }
    api.on(window, 'keydown', e => { if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') { e.preventDefault(); jump(); } if (e.key === 'ArrowDown' || e.key === 's') p.duck = true; });
    api.on(window, 'keyup', e => { if (e.key === 'ArrowDown' || e.key === 's') p && (p.duck = false); });
    api.on(canvas, 'pointerdown', e => { const y = pos(canvas, e).y; if (y > H * 0.6 && state === 'play') p.duck = true; else jump(); });
    api.on(window, 'pointerup', () => { if (p) p.duck = false; });

    api.setLoop((dt) => {
      // sky dusk
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2a2050'); g.addColorStop(1, '#6d3b6b'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      // city silhouette parallax
      ctx.fillStyle = '#1b1430';
      for (let i = 0; i < 12; i++) { const bx = ((i * 90 - (dist * 0.3) % 90) % (W + 90)) - 45; const bh = 60 + (i % 4) * 30; ctx.fillRect(bx, ground - bh, 64, bh); }
      ctx.fillStyle = '#0f0b1f'; ctx.fillRect(0, ground, W, H - ground);
      ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.beginPath(); ctx.moveTo(0, ground); ctx.lineTo(W, ground); ctx.stroke();

      if (state === 'play') {
        spd += dt * 6; dist += spd * dt;
        p.vy += 1700 * dt; p.y += p.vy * dt; if (p.y > ground) { p.y = ground; p.vy = 0; jumps = 0; }
        if (Math.random() < dt * (0.9 + dist / 9000)) { const fly = Math.random() < 0.35; obs.push({ x: W + 30, y: fly ? ground - 70 : ground, w: fly ? 34 : 26, h: fly ? 24 : rand(26, 46), fly, hit: false }); }
        if (Math.random() < dt * 0.7) obs.push({ x: W + 30, y: ground - rand(60, 120), coin: true, w: 18, h: 18 });
        obs.forEach(o => o.x -= spd * dt);
        const ph = p.duck ? p.h * 0.55 : p.h, py = p.y - ph;
        obs.forEach(o => {
          if (o.coin) { if (!o.dead && Math.abs(o.x - p.x) < 24 && Math.abs(o.y - (p.y - ph / 2)) < 30) { o.dead = true; coins++; beep(1000, .05, 'sine', .03); } return; }
          if (!o.hit && o.x < p.x + p.w / 2 && o.x + o.w > p.x - p.w / 2) {
            const oy = o.y - o.h;
            if (py < o.y && py + ph > oy) { o.hit = true; state = 'over'; bestv = best('bd_runner', Math.floor(dist / 10)); beep(110, .25, 'sawtooth', .06); for (let i = 0; i < 14; i++) parts.push({ x: p.x, y: p.y - 20, vx: rand(-150, 150), vy: rand(-200, 0), life: .6 }); }
          }
        });
        obs = obs.filter(o => o.x > -50 && !o.dead);
      }
      // obstacles
      obs.forEach(o => {
        if (o.coin) { ctx.font = '18px Inter'; ctx.textAlign = 'center'; ctx.fillText('🪙', o.x, o.y); return; }
        ctx.fillStyle = o.fly ? '#22d3ee' : '#f43f5e'; rr(ctx, o.x - o.w / 2, o.y - o.h, o.w, o.h, 5); ctx.fill();
        if (o.fly) { ctx.fillStyle = '#a5f3fc'; ctx.fillRect(o.x - o.w / 2, o.y - o.h, o.w, 4); }
      });
      // ninja
      if (p) {
        const ph = p.duck ? p.h * 0.55 : p.h;
        ctx.save(); ctx.translate(p.x, p.y - ph / 2);
        ctx.fillStyle = '#111827'; rr(ctx, -p.w / 2, -ph / 2, p.w, ph, 8); ctx.fill();
        ctx.fillStyle = '#ef4444'; ctx.fillRect(-p.w / 2, -ph / 2 + 8, p.w, 6); // headband
        ctx.fillStyle = '#fff'; ctx.fillRect(-2, -ph / 2 + 9, 8, 4); // eyes
        // scarf trail
        ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-p.w / 2, -ph / 2 + 11); ctx.quadraticCurveTo(-p.w / 2 - 22, -ph / 2 + rand(4, 18), -p.w / 2 - 34, -ph / 2 + 20); ctx.stroke();
        ctx.restore();
      }
      parts.forEach(pp => { pp.x += pp.vx * dt; pp.y += pp.vy * dt; pp.vy += 600 * dt; pp.life -= dt; ctx.globalAlpha = Math.max(0, pp.life); ctx.fillStyle = '#fca5a5'; ctx.fillRect(pp.x, pp.y, 4, 4); ctx.globalAlpha = 1; });
      parts = parts.filter(p => p.life > 0);

      setHud(api, ['🏃 ' + Math.floor(dist / 10) + ' м', '🪙 ' + coins, 'Рекорд: ' + bestv]);
      if (state === 'start') overlay(ctx, W, H, '🥷 Ninja Run', ['Ниндзя: ' + name, 'Клик / Space — старт', 'Прыгай и уворачивайся!']);
      if (state === 'over') overlay(ctx, W, H, 'Попался!', [Math.floor(dist / 10) + ' м · 🪙 ' + coins, 'Рекорд: ' + bestv, 'Клик / Space — заново']);
    });
    const b = gbtn('▶ Старт'); api.on(b, 'click', () => reset()); api.controls.appendChild(b);
    state = 'start'; reset(); state = 'start'; api.start();
    return () => api.destroy();
  };

  /* =========================================================
     5) SNAKE ARENA
     ========================================================= */
  GAMES.snake = function (root, opts) {
    const N = 20, CELL = 21, SZ = N * CELL;
    const api = createShell(root, { W: SZ, H: SZ, maxw: 440, hint: 'Стрелки / WASD / свайп. Края — порталы.' });
    const { ctx, W, H, canvas } = api;
    const name = (opts && opts.name) || 'Игрок';
    let state = 'start', snake, dir, ndir, food, gold, bomb, acc, step, score, bestv = best('bd_snake'), boost;
    function reset() { snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }]; dir = { x: 1, y: 0 }; ndir = dir; acc = 0; step = 0.13; score = 0; boost = 0; place(); state = 'play'; }
    function rc() { return { x: Math.floor(rand(0, N)), y: Math.floor(rand(0, N)) }; }
    function place() { food = rc(); gold = Math.random() < 0.25 ? rc() : null; bomb = Math.random() < 0.3 ? rc() : null; }
    function turn(x, y) { if (x === -dir.x && y === -dir.y) return; ndir = { x, y }; }
    api.on(window, 'keydown', e => {
      const k = e.key;
      if (k === 'ArrowLeft' || k === 'a') turn(-1, 0);
      else if (k === 'ArrowRight' || k === 'd') turn(1, 0);
      else if (k === 'ArrowUp' || k === 'w') turn(0, -1);
      else if (k === 'ArrowDown' || k === 's') turn(0, 1);
      else if (k === ' ') reset();
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(k)) e.preventDefault();
    });
    let sx, sy;
    api.on(canvas, 'pointerdown', e => { if (state !== 'play') { reset(); return; } const p = pos(canvas, e); sx = p.x; sy = p.y; });
    api.on(canvas, 'pointerup', e => { if (sx == null) return; const p = pos(canvas, e); const dx = p.x - sx, dy = p.y - sy; if (Math.abs(dx) > Math.abs(dy)) turn(dx > 0 ? 1 : -1, 0); else turn(0, dy > 0 ? 1 : -1); sx = null; });

    api.setLoop((dt) => {
      ctx.fillStyle = '#0a0f1c'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(255,255,255,.04)';
      for (let i = 0; i <= N; i++) { ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, H); ctx.moveTo(0, i * CELL); ctx.lineTo(W, i * CELL); ctx.stroke(); }

      if (state === 'play') {
        acc += dt; const st = boost > 0 ? step * 0.6 : step;
        if (boost > 0) boost -= dt;
        if (acc >= st) {
          acc = 0; dir = ndir;
          const head = { x: (snake[0].x + dir.x + N) % N, y: (snake[0].y + dir.y + N) % N };
          if (snake.some((s, i) => i > 0 && s.x === head.x && s.y === head.y)) { state = 'over'; bestv = best('bd_snake', score); beep(110, .25, 'sawtooth', .06); }
          else {
            snake.unshift(head);
            if (food && head.x === food.x && head.y === food.y) { score++; step = Math.max(0.07, step - 0.002); beep(800, .05, 'sine', .03); place(); }
            else if (gold && head.x === gold.x && head.y === gold.y) { score += 5; boost = 2.5; beep(1200, .08, 'sine', .04); gold = null; }
            else if (bomb && head.x === bomb.x && head.y === bomb.y) { if (snake.length > 4) { snake.splice(-3, 3); } score = Math.max(0, score - 2); beep(200, .15, 'sawtooth', .04); bomb = null; }
            else snake.pop();
          }
        }
      }
      // food
      function cell(c, emoji, glow) { if (!c) return; ctx.font = (CELL - 2) + 'px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 12; } ctx.fillText(emoji, c.x * CELL + CELL / 2, c.y * CELL + CELL / 2 + 1); ctx.shadowBlur = 0; }
      cell(food, '🍎'); cell(gold, '⭐', '#fbbf24'); cell(bomb, '💣');
      ctx.textBaseline = 'alphabetic';
      // snake
      snake.forEach((s, i) => {
        const t = 1 - i / snake.length;
        ctx.fillStyle = boost > 0 ? `hsl(${(i * 12) % 360},90%,60%)` : `rgb(${Math.round(lerp(34, 16, t))},${Math.round(lerp(197, 240, t))},${Math.round(lerp(94, 180, t))})`;
        if (i === 0) { ctx.shadowColor = '#34d399'; ctx.shadowBlur = 10; }
        rr(ctx, s.x * CELL + 2, s.y * CELL + 2, CELL - 4, CELL - 4, 6); ctx.fill(); ctx.shadowBlur = 0;
        if (i === 0) { ctx.fillStyle = '#06281a'; const ex = dir.x * 3, ey = dir.y * 3; ctx.beginPath(); ctx.arc(s.x * CELL + CELL / 2 - 3 + ex, s.y * CELL + CELL / 2 - 2 + ey, 2, 0, 7); ctx.arc(s.x * CELL + CELL / 2 + 3 + ex, s.y * CELL + CELL / 2 - 2 + ey, 2, 0, 7); ctx.fill(); }
      });
      setHud(api, ['🐍 Длина: ' + (snake ? snake.length : 0), 'Очки: ' + (score || 0), 'Рекорд: ' + bestv]);
      if (state === 'start') overlay(ctx, W, H, '🐍 Snake Arena', ['Игрок: ' + name, 'Клик / Space — старт', 'Собери ⭐ для ускорения']);
      if (state === 'over') overlay(ctx, W, H, 'Конец', ['Очки: ' + score + ' · Рекорд: ' + bestv, 'Клик / Space — заново']);
    });
    const b = gbtn('▶ Старт'); api.on(b, 'click', () => reset()); api.controls.appendChild(b);
    reset(); state = 'start'; api.start();
    return () => api.destroy();
  };

  /* =========================================================
     6) CATCH — meteor / sweet (themed)
     ========================================================= */
  GAMES.catch = function (root, opts) {
    const theme = (opts && opts.theme) || 'meteor';
    const TH = {
      meteor: { bg1: '#0b1230', bg2: '#1e1b4b', good: ['💎', '⭐', '🔷', '🛢️'], bad: '☄️', basket: '🛸', title: '☄️ Meteor Catcher', name: 'Капитан' },
      sweet: { bg1: '#fde7f3', bg2: '#fbcfe8', good: ['🧁', '🍩', '🍬', '❤️', '🍓'], bad: '🌶️', basket: '🧺', title: '🍰 Sweet Catch', name: 'Кондитер' }
    }[theme];
    const api = createShell(root, { W: 400, H: 540, maxw: 400, hint: 'Двигай мышкой / ←→ / пальцем. Лови хорошее, избегай ' + TH.bad });
    const { ctx, W, H, canvas } = api;
    const pname = (opts && opts.name) || 'Игрок';
    let state = 'start', bx, items, score, lives, combo, shield, spawnT, spd, bestv = best('bd_catch_' + theme);
    const keys = {};
    function reset() { bx = W / 2; items = []; score = 0; lives = 3; combo = 0; shield = 0; spawnT = 0; spd = 130; state = 'play'; }
    api.on(window, 'keydown', e => { keys[e.key] = true; if (e.key === ' ' && state !== 'play') reset(); });
    api.on(window, 'keyup', e => keys[e.key] = false);
    const mv = e => { if (state === 'play') bx = clamp(pos(canvas, e).x, 30, W - 30); };
    api.on(canvas, 'pointerdown', e => { if (state !== 'play') { reset(); return; } mv(e); });
    api.on(window, 'pointermove', e => { if (e.buttons || e.pointerType === 'touch') mv(e); });
    api.on(canvas, 'pointermove', mv);

    api.setLoop((dt) => {
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, TH.bg1); g.addColorStop(1, TH.bg2); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      if (theme === 'meteor') for (let i = 0; i < 40; i++) { ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect((i * 53) % W, (i * 97 + (performance.now() * 0.02)) % H, 2, 2); }

      if (state === 'play') {
        let m = 0; if (keys.ArrowLeft || keys.a) m -= 1; if (keys.ArrowRight || keys.d) m += 1; bx = clamp(bx + m * 320 * dt, 30, W - 30);
        spawnT -= dt; spd += dt * 4;
        if (spawnT <= 0) { spawnT = rand(0.4, 0.9); const bad = Math.random() < 0.32; items.push({ x: rand(24, W - 24), y: -24, vy: spd + rand(-20, 40), bad, emoji: bad ? TH.bad : TH.good[Math.floor(rand(0, TH.good.length))], pw: !bad && Math.random() < 0.07 }); }
        items.forEach(it => { it.y += it.vy * dt; if (Math.abs(it.x - bx) < 34 && Math.abs(it.y - (H - 54)) < 30 && !it.got) { it.got = true; if (it.bad) { if (shield > 0) { shield = 0; beep(700, .08, 'sine', .03); } else { lives--; combo = 0; beep(150, .2, 'sawtooth', .05); if (lives <= 0) { state = 'over'; bestv = best('bd_catch_' + theme, score); } } } else { combo++; score += 1 + Math.floor(combo / 5); if (it.pw) shield = 1; beep(900 + combo * 10, .05, 'sine', .03); } } });
        items = items.filter(it => it.y < H + 30 && !it.got);
        if (shield > 0) shield = 1; // persists until used
      }
      // items
      items.forEach(it => { ctx.font = '30px Inter'; ctx.textAlign = 'center'; if (it.pw) { ctx.shadowColor = '#22d3ee'; ctx.shadowBlur = 14; } ctx.fillText(it.emoji, it.x, it.y); ctx.shadowBlur = 0; });
      // basket
      ctx.font = '44px Inter'; ctx.textAlign = 'center';
      if (shield > 0) { ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(bx, H - 48, 30, 0, 7); ctx.stroke(); }
      ctx.fillText(TH.basket, bx, H - 32);

      setHud(api, ['Очки: ' + (score || 0), '❤'.repeat(Math.max(0, lives || 0)) || '—', 'Combo ×' + (Math.floor((combo || 0) / 5) + 1), shield > 0 ? '🛡 щит' : '—', 'Рекорд: ' + bestv]);
      if (state === 'start') overlay(ctx, W, H, TH.title, [TH.name + ': ' + pname, 'Клик / Space — старт', 'Лови хорошее, избегай ' + TH.bad]);
      if (state === 'over') overlay(ctx, W, H, 'Игра окончена', ['Очки: ' + score + ' · Рекорд: ' + bestv, 'Клик / Space — заново']);
    });
    const b = gbtn('▶ Старт'); api.on(b, 'click', () => reset()); api.controls.appendChild(b);
    reset(); state = 'start'; api.start();
    return () => api.destroy();
  };

  /* =========================================================
     7) STYLE STUDIO — outfit/color matching
     ========================================================= */
  GAMES.style = function (root, opts) {
    const api = createShell(root, { W: 440, H: 540, maxw: 440, hint: 'Подбери цвет наряда под бриф клиента и нажми «Показать».' });
    const { ctx, W, H, canvas } = api;
    const name = (opts && opts.name) || 'Дизайнер';
    const palette = [
      { n: 'Розовый', c: '#ec4899' }, { n: 'Сирень', c: '#a78bfa' }, { n: 'Мята', c: '#34d399' },
      { n: 'Небо', c: '#38bdf8' }, { n: 'Солнце', c: '#fbbf24' }, { n: 'Коралл', c: '#fb7185' },
      { n: 'Изумруд', c: '#10b981' }, { n: 'Лаванда', c: '#c084fc' }
    ];
    const vibes = ['милый', 'элегантный', 'спортивный', 'вечеринка'];
    let state = 'start', target, vibe, chosen, score, stars, clients, swatches, hearts;
    function hex(c) { const m = c.replace('#', ''); return [parseInt(m.slice(0, 2), 16), parseInt(m.slice(2, 4), 16), parseInt(m.slice(4, 6), 16)]; }
    function closeness(a, b) { const A = hex(a), B = hex(b); const d = Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); return clamp(1 - d / 300, 0, 1); }
    function newClient() { target = palette[Math.floor(rand(0, palette.length))]; vibe = vibes[Math.floor(rand(0, vibes.length))]; chosen = null; layoutSwatches(); }
    function layoutSwatches() {
      swatches = []; const cols = 4, sw = 64, gap = 14, x0 = (W - (cols * sw + (cols - 1) * gap)) / 2, y0 = H - 156;
      palette.forEach((p, i) => { const r = Math.floor(i / cols), c = i % cols; swatches.push({ ...p, x: x0 + c * (sw + gap), y: y0 + r * (sw + gap), s: sw }); });
    }
    function reset() { score = 0; stars = 0; clients = 0; hearts = []; newClient(); state = 'play'; }
    function submit() {
      if (!chosen) return;
      const m = closeness(chosen.c, target.c);
      const st = m > .92 ? 5 : m > .75 ? 4 : m > .55 ? 3 : m > .35 ? 2 : 1;
      stars += st; score += st * 20; clients++;
      for (let i = 0; i < st * 3; i++) hearts.push({ x: W / 2, y: 200, vx: rand(-80, 80), vy: rand(-160, -60), life: 1 });
      beep(600 + st * 80, .12, 'sine', .04);
      if (clients >= 8) { state = 'over'; best('bd_style', stars); } else newClient();
    }
    api.on(canvas, 'pointerdown', e => {
      if (state !== 'play') { reset(); return; }
      const p = pos(canvas, e);
      swatches.forEach(s => { if (p.x > s.x && p.x < s.x + s.s && p.y > s.y && p.y < s.y + s.s) { chosen = s; beep(500, .04, 'square', .02); } });
    });

    api.setLoop((dt) => {
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#fdf2f8'); g.addColorStop(1, '#ede9fe'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      // brief card
      if (state === 'play') {
        ctx.fillStyle = '#fff'; rr(ctx, 16, 14, W - 32, 64, 14); ctx.fill();
        ctx.fillStyle = '#6b7280'; ctx.font = '600 12px Inter'; ctx.textAlign = 'left'; ctx.fillText('БРИФ КЛИЕНТА', 30, 36);
        ctx.fillStyle = '#111827'; ctx.font = '700 17px Inter'; ctx.fillText('Хочу образ «' + vibe + '»', 30, 58);
        ctx.fillStyle = target.c; rr(ctx, W - 64, 28, 38, 38, 9); ctx.fill();
        // model
        const mx = W / 2, my = 200, dressCol = chosen ? chosen.c : '#e5e7eb';
        ctx.fillStyle = '#fcd9b6'; ctx.beginPath(); ctx.arc(mx, my - 50, 22, 0, 7); ctx.fill(); // head
        ctx.fillStyle = '#3b2f2f'; ctx.beginPath(); ctx.arc(mx, my - 56, 24, Math.PI, 0); ctx.fill(); // hair
        ctx.fillStyle = '#111827'; ctx.beginPath(); ctx.arc(mx - 7, my - 50, 2.4, 0, 7); ctx.arc(mx + 7, my - 50, 2.4, 0, 7); ctx.fill();
        ctx.strokeStyle = '#be185d'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(mx, my - 44, 6, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
        ctx.fillStyle = dressCol; ctx.beginPath(); ctx.moveTo(mx - 12, my - 28); ctx.lineTo(mx + 12, my - 28); ctx.lineTo(mx + 40, my + 80); ctx.lineTo(mx - 40, my + 80); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#fcd9b6'; ctx.fillRect(mx - 30, my - 24, 8, 50); ctx.fillRect(mx + 22, my - 24, 8, 50);
        ctx.fillStyle = '#fcd9b6'; ctx.fillRect(mx - 16, my + 80, 12, 30); ctx.fillRect(mx + 4, my + 80, 12, 30);
        // match meter
        const m = chosen ? closeness(chosen.c, target.c) : 0;
        ctx.fillStyle = '#e5e7eb'; rr(ctx, 30, 300, W - 60, 16, 8); ctx.fill();
        ctx.fillStyle = m > .7 ? '#10b981' : m > .4 ? '#f59e0b' : '#ef4444'; rr(ctx, 30, 300, (W - 60) * m, 16, 8); ctx.fill();
        ctx.fillStyle = '#374151'; ctx.font = '600 13px Inter'; ctx.textAlign = 'center'; ctx.fillText('Совпадение: ' + Math.round(m * 100) + '%', W / 2, 336);
        // swatches
        swatches.forEach(s => { ctx.fillStyle = s.c; rr(ctx, s.x, s.y, s.s, s.s, 12); ctx.fill(); if (chosen === s) { ctx.strokeStyle = '#111827'; ctx.lineWidth = 4; rr(ctx, s.x, s.y, s.s, s.s, 12); ctx.stroke(); } });
        // hearts
        hearts.forEach(h => { h.x += h.vx * dt; h.y += h.vy * dt; h.vy += 120 * dt; h.life -= dt * 0.7; ctx.globalAlpha = Math.max(0, h.life); ctx.font = '20px Inter'; ctx.fillText('💖', h.x, h.y); ctx.globalAlpha = 1; });
        hearts = hearts.filter(h => h.life > 0);
      }
      setHud(api, ['👗 ' + name + ' Studio', '⭐ ' + (stars || 0), 'Клиенты: ' + (clients || 0) + '/8']);
      if (state === 'start') overlay(ctx, W, H, '👗 Style Studio', ['Дизайнер: ' + name, 'Клик — старт', 'Подбери цвет под бриф']);
      if (state === 'over') overlay(ctx, W, H, 'Показ окончен!', ['Звёзд набрано: ' + stars, 'Клик — заново']);
    });
    const sb = gbtn('✨ Показать наряд'); api.on(sb, 'click', () => { if (state === 'play') submit(); else reset(); });
    api.controls.appendChild(sb);
    reset(); state = 'start'; api.start();
    return () => api.destroy();
  };

  /* =========================================================
     8) MY CAFÉ — order serving
     ========================================================= */
  GAMES.cafe = function (root, opts) {
    const api = createShell(root, { W: 440, H: 560, maxw: 440, hint: 'Собери на поднос точно заказ гостя и жми «Подать». Не дай гостю уйти!' });
    const { ctx, W, H, canvas } = api;
    const name = (opts && opts.name) || 'Владелица';
    const MENU = [{ e: '☕', n: 'кофе' }, { e: '🥐', n: 'круассан' }, { e: '🧃', n: 'сок' }, { e: '🍰', n: 'торт' }, { e: '🍪', n: 'печенье' }];
    let state = 'start', guests, tray, money, day, rating, combo, spawnT, btns, serveBtn;
    function reset() { guests = []; tray = []; money = 0; day = 1; rating = 5; combo = 0; spawnT = 0; layout(); state = 'play'; }
    function layout() { btns = []; const cols = 5, bw = 64, gap = 12, x0 = (W - (cols * bw + (cols - 1) * gap)) / 2, y = H - 150; MENU.forEach((m, i) => btns.push({ ...m, x: x0 + i * (bw + gap), y, s: bw })); serveBtn = { x: W / 2 - 70, y: H - 70, w: 140, h: 46 }; }
    function addGuest() { const n = Math.floor(rand(1, 3 + Math.min(2, day))); const order = []; for (let i = 0; i < n; i++) order.push(MENU[Math.floor(rand(0, MENU.length))].e); guests.push({ order, pat: 1, x: 0 }); }
    function serve() {
      if (!guests.length) return;
      const g = guests[0];
      const sortJoin = a => a.slice().sort().join('');
      if (sortJoin(tray) === sortJoin(g.order)) {
        combo++; const tip = 8 + Math.round(g.pat * 10) + combo * 2; money += tip; if (rating < 5) rating = Math.min(5, rating + 0.1);
        guests.shift(); tray = []; beep(900, .1, 'sine', .04);
        if (money > day * 80) day++;
      } else { rating = Math.max(0, rating - 0.4); combo = 0; tray = []; beep(180, .15, 'sawtooth', .04); if (rating <= 0) { state = 'over'; best('bd_cafe', money); } }
    }
    api.on(canvas, 'pointerdown', e => {
      if (state !== 'play') { reset(); return; }
      const p = pos(canvas, e);
      btns.forEach(b => { if (p.x > b.x && p.x < b.x + b.s && p.y > b.y && p.y < b.y + b.s) { if (tray.length < 5) { tray.push(b.e); beep(600, .04, 'square', .02); } } });
      if (p.x > serveBtn.x && p.x < serveBtn.x + serveBtn.w && p.y > serveBtn.y && p.y < serveBtn.y + serveBtn.h) serve();
      // tap tray to clear
      if (p.y > 150 && p.y < 200 && p.x > W / 2 - 120 && p.x < W / 2 + 120) { tray = []; }
    });

    api.setLoop((dt) => {
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#fff7ed'); g.addColorStop(1, '#fef3c7'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#fbbf24'; ctx.fillRect(0, 0, W, 6);
      if (state === 'play') {
        spawnT -= dt; if (spawnT <= 0 && guests.length < 4) { spawnT = rand(2.5, 4.5); addGuest(); }
        guests.forEach((gu, i) => { gu.x = lerp(gu.x, 1, clamp(dt * 4, 0, 1)); if (i === 0) { gu.pat -= dt / (9 + day); if (gu.pat <= 0) { guests.shift(); tray = []; rating = Math.max(0, rating - 0.5); combo = 0; beep(160, .2, 'sawtooth', .05); if (rating <= 0) { state = 'over'; best('bd_cafe', money); } } } });
      }
      // counter
      ctx.fillStyle = '#92400e'; rr(ctx, 0, 210, W, 24, 0); ctx.fill();
      // guests row
      guests.forEach((gu, i) => {
        const gx = 60 + i * 96 * gu.x; if (gx > W) return;
        ctx.font = '40px Inter'; ctx.textAlign = 'center'; ctx.fillText(['🧑', '👩', '🧒', '👨', '👧'][i % 5], gx, 110);
        // order bubble
        ctx.fillStyle = '#fff'; rr(ctx, gx - 40, 24, 80, 50, 12); ctx.fill();
        ctx.font = '22px Inter'; ctx.fillText(gu.order.join(''), gx, 56);
        if (i === 0) { // patience bar
          ctx.fillStyle = '#e5e7eb'; rr(ctx, gx - 30, 124, 60, 8, 4); ctx.fill();
          ctx.fillStyle = gu.pat > .4 ? '#10b981' : '#ef4444'; rr(ctx, gx - 30, 124, 60 * clamp(gu.pat, 0, 1), 8, 4); ctx.fill();
        }
      });
      // tray
      ctx.fillStyle = '#d1d5db'; rr(ctx, W / 2 - 120, 160, 240, 44, 12); ctx.fill();
      ctx.font = '28px Inter'; ctx.textAlign = 'center'; ctx.fillStyle = '#111'; ctx.fillText(tray.join('  ') || 'поднос пуст (тап — очистить)', W / 2, 192);
      if (!tray.length) { ctx.font = '12px Inter'; ctx.fillStyle = '#6b7280'; ctx.fillText('тап по меню — добавить', W / 2, 192); }
      // menu buttons
      btns.forEach(b => { ctx.fillStyle = '#fff'; rr(ctx, b.x, b.y, b.s, b.s, 14); ctx.fill(); ctx.strokeStyle = '#fcd34d'; ctx.lineWidth = 2; rr(ctx, b.x, b.y, b.s, b.s, 14); ctx.stroke(); ctx.font = '30px Inter'; ctx.textAlign = 'center'; ctx.fillText(b.e, b.x + b.s / 2, b.y + b.s / 2 + 11); });
      // serve button
      ctx.fillStyle = '#10b981'; rr(ctx, serveBtn.x, serveBtn.y, serveBtn.w, serveBtn.h, 12); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '700 18px Inter'; ctx.fillText('🍽 Подать', W / 2, serveBtn.y + 30);

      setHud(api, ['💰 ' + (money || 0), 'День: ' + (day || 1), '⭐ ' + (rating || 0).toFixed(1), 'Combo ×' + (combo || 0)]);
      if (state === 'start') overlay(ctx, W, H, '☕ My Café', ['Кафе ' + name, 'Клик — старт', 'Собери заказ и подай!']);
      if (state === 'over') overlay(ctx, W, H, 'Кафе закрылось', ['Заработано: ' + money + '💰', 'Клик — заново']);
    });
    const b = gbtn('▶ Старт'); api.on(b, 'click', () => reset()); api.controls.appendChild(b);
    reset(); state = 'start'; api.start();
    return () => api.destroy();
  };

  /* =========================================================
     9) PET WORLD — care
     ========================================================= */
  GAMES.pet = function (root, opts) {
    const api = createShell(root, { W: 400, H: 520, maxw: 400, hint: 'Следи за полосками. Кнопки: покормить, играть, помыть, спать. Питомец растёт!' });
    const { ctx, W, H, canvas } = api;
    const name = (opts && opts.name) || 'Хозяйка';
    let state = 'start', hunger, happy, energy, hygiene, xp, lvl, coins, mood, bounce, fx, sleeping, actBtns;
    function reset() { hunger = 80; happy = 80; energy = 80; hygiene = 80; xp = 0; lvl = 1; coins = 0; bounce = 0; fx = []; sleeping = false; layout(); state = 'play'; }
    function layout() {
      const labels = [['🍎 Покормить', 'feed'], ['🎾 Играть', 'play'], ['🧼 Помыть', 'wash'], ['😴 Спать', 'sleep']];
      actBtns = []; const bw = (W - 60) / 2, bh = 50;
      labels.forEach((l, i) => { const r = Math.floor(i / 2), c = i % 2; actBtns.push({ label: l[0], act: l[1], x: 20 + c * (bw + 20), y: H - 130 + r * (bh + 12), w: bw, h: bh }); });
    }
    function spark(txt, col) { fx.push({ x: W / 2 + rand(-30, 30), y: 230, vy: -70, life: 1, txt, col }); }
    function act(a) {
      if (a === 'feed') { hunger = clamp(hunger + 28, 0, 100); spark('+🍎', '#10b981'); }
      else if (a === 'play') { happy = clamp(happy + 26, 0, 100); energy = clamp(energy - 8, 0, 100); spark('+💖', '#ec4899'); }
      else if (a === 'wash') { hygiene = clamp(hygiene + 32, 0, 100); spark('+🫧', '#38bdf8'); }
      else if (a === 'sleep') { sleeping = !sleeping; spark(sleeping ? '😴' : '☀️', '#a78bfa'); }
      xp += 6; if (xp >= lvl * 50) { xp = 0; lvl++; coins += 20; spark('LVL ' + lvl + '!', '#fbbf24'); beep(1000, .15, 'sine', .05); }
      beep(700, .06, 'sine', .03);
    }
    api.on(canvas, 'pointerdown', e => {
      if (state !== 'play') { reset(); return; }
      const p = pos(canvas, e);
      actBtns.forEach(b => { if (p.x > b.x && p.x < b.x + b.w && p.y > b.y && p.y < b.y + b.h) act(b.act); });
    });

    api.setLoop((dt) => {
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#ecfeff'); g.addColorStop(1, '#fae8ff'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#ddd6fe'; ctx.fillRect(0, 300, W, H - 300); // floor

      if (state === 'play') {
        const rate = sleeping ? 0.4 : 1;
        hunger = clamp(hunger - dt * 2.2 * rate, 0, 100);
        happy = clamp(happy - dt * 1.8 * rate, 0, 100);
        hygiene = clamp(hygiene - dt * 1.4 * rate, 0, 100);
        if (sleeping) energy = clamp(energy + dt * 8, 0, 100); else energy = clamp(energy - dt * 1.5, 0, 100);
        coins += dt * (hunger + happy + energy + hygiene) / 400; // passive
        bounce += dt;
        mood = (hunger + happy + energy + hygiene) / 4;
        if (mood < 12) { state = 'over'; best('bd_pet', lvl); }
      }
      // pet
      const py = 230 + Math.sin(bounce * 3) * (sleeping ? 1 : 6);
      ctx.save(); ctx.translate(W / 2, py);
      ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.beginPath(); ctx.ellipse(0, 78, 50, 12, 0, 0, 7); ctx.fill();
      const body = mood > 60 ? '#a78bfa' : mood > 30 ? '#c4b5fd' : '#cbd5e1';
      ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(0, 30, 56, 52, 0, 0, 7); ctx.fill();
      // ears
      ctx.beginPath(); ctx.moveTo(-40, -10); ctx.lineTo(-54, -54); ctx.lineTo(-18, -22); ctx.fill();
      ctx.beginPath(); ctx.moveTo(40, -10); ctx.lineTo(54, -54); ctx.lineTo(18, -22); ctx.fill();
      // eyes
      ctx.fillStyle = '#1f2937';
      if (sleeping) { ctx.lineWidth = 3; ctx.strokeStyle = '#1f2937'; ctx.beginPath(); ctx.arc(-18, 22, 7, 0.1 * Math.PI, 0.9 * Math.PI); ctx.arc(18, 22, 7, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke(); }
      else { ctx.beginPath(); ctx.arc(-18, 20, 7, 0, 7); ctx.arc(18, 20, 7, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-16, 18, 2.5, 0, 7); ctx.arc(20, 18, 2.5, 0, 7); ctx.fill(); }
      // mouth
      ctx.strokeStyle = '#6d28d9'; ctx.lineWidth = 3; ctx.beginPath();
      if (mood > 50) ctx.arc(0, 38, 12, 0.1 * Math.PI, 0.9 * Math.PI);
      else ctx.arc(0, 50, 12, 1.1 * Math.PI, 1.9 * Math.PI);
      ctx.stroke();
      // cheeks
      ctx.fillStyle = 'rgba(244,114,182,.5)'; ctx.beginPath(); ctx.arc(-34, 36, 8, 0, 7); ctx.arc(34, 36, 8, 0, 7); ctx.fill();
      ctx.restore();
      if (sleeping) { ctx.font = '20px Inter'; ctx.fillStyle = '#a78bfa'; ctx.textAlign = 'left'; ctx.fillText('z', W / 2 + 50, 180 - (bounce * 10 % 30)); ctx.fillText('Z', W / 2 + 64, 165 - (bounce * 10 % 30)); }
      // fx
      fx.forEach(f => { f.y += f.vy * dt; f.life -= dt; ctx.globalAlpha = Math.max(0, f.life); ctx.fillStyle = f.col; ctx.font = '700 18px Inter'; ctx.textAlign = 'center'; ctx.fillText(f.txt, f.x, f.y); ctx.globalAlpha = 1; });
      fx = fx.filter(f => f.life > 0);
      // bars
      const bars = [['Голод', hunger, '#f59e0b'], ['Радость', happy, '#ec4899'], ['Энергия', energy, '#10b981'], ['Чистота', hygiene, '#38bdf8']];
      bars.forEach((b, i) => {
        const y = 14 + i * 22; ctx.fillStyle = '#374151'; ctx.font = '600 11px Inter'; ctx.textAlign = 'left'; ctx.fillText(b[0], 14, y + 11);
        ctx.fillStyle = '#e5e7eb'; rr(ctx, 80, y, W - 100, 12, 6); ctx.fill();
        ctx.fillStyle = b[2]; rr(ctx, 80, y, (W - 100) * (b[1] / 100), 12, 6); ctx.fill();
      });
      // buttons
      if (state === 'play') actBtns.forEach(b => { ctx.fillStyle = b.act === 'sleep' && sleeping ? '#c4b5fd' : '#fff'; rr(ctx, b.x, b.y, b.w, b.h, 12); ctx.fill(); ctx.strokeStyle = '#d8b4fe'; ctx.lineWidth = 2; rr(ctx, b.x, b.y, b.w, b.h, 12); ctx.stroke(); ctx.fillStyle = '#4c1d95'; ctx.font = '700 15px Inter'; ctx.textAlign = 'center'; ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 5); });

      setHud(api, ['🐾 ' + name, 'Lvl ' + (lvl || 1), '💰 ' + Math.floor(coins || 0), mood > 60 ? '😺 счастлив' : mood > 30 ? '🙂 норм' : '😿 грустит']);
      if (state === 'start') overlay(ctx, W, H, '🐾 Pet World', ['Хозяйка: ' + name, 'Клик — старт', 'Заботься о питомце!']);
      if (state === 'over') overlay(ctx, W, H, 'Питомец заскучал…', ['Достигнут уровень: ' + lvl, 'Клик — заново']);
    });
    const b = gbtn('▶ Старт'); api.on(b, 'click', () => reset()); api.controls.appendChild(b);
    reset(); state = 'start'; api.start();
    return () => api.destroy();
  };

  /* =========================================================
     10) MEMORY MATCH
     ========================================================= */
  GAMES.memory = function (root, opts) {
    const api = createShell(root, { W: 420, H: 480, maxw: 420, hint: 'Открывай по две карточки и находи пары. Меньше ходов — больше звёзд.' });
    const { ctx, W, H, canvas } = api;
    const name = (opts && opts.name) || 'Игрок';
    const POOL = ['🍓', '🍩', '🌸', '⭐', '🦄', '🍀', '🎀', '🍉', '🐱', '🌈', '💎', '🍭'];
    let state = 'start', cards, first, lock, moves, matched, level, t, gridC, gridR, cardW, cardH;
    function build() {
      const pairs = 3 + level; // 4..
      gridC = pairs <= 4 ? 4 : pairs <= 6 ? 4 : 6; gridR = Math.ceil(pairs * 2 / gridC);
      const picks = POOL.slice().sort(() => Math.random() - .5).slice(0, pairs);
      const deck = picks.concat(picks).sort(() => Math.random() - .5);
      const pad = 12, top = 52; cardW = (W - pad * (gridC + 1)) / gridC; cardH = (H - top - pad * (gridR + 1)) / gridR;
      cards = deck.map((e, i) => { const r = Math.floor(i / gridC), c = i % gridC; return { e, x: pad + c * (cardW + pad), y: top + pad + r * (cardH + pad), w: cardW, h: cardH, open: false, done: false, flip: 0 }; });
      first = null; lock = false;
    }
    function reset() { level = 1; moves = 0; matched = 0; t = 0; build(); state = 'play'; }
    api.on(canvas, 'pointerdown', e => {
      if (state !== 'play') { reset(); return; }
      if (lock) return;
      const p = pos(canvas, e);
      for (const card of cards) {
        if (!card.open && !card.done && p.x > card.x && p.x < card.x + card.w && p.y > card.y && p.y < card.y + card.h) {
          card.open = true; beep(600, .04, 'square', .02);
          if (!first) first = card;
          else {
            moves++;
            if (first.e === card.e) { first.done = card.done = true; matched += 2; first = null; beep(900, .08, 'sine', .04); if (matched === cards.length) { setTimeout(() => { if (state === 'play') { level++; build(); } }, 600); } }
            else { lock = true; const a = first, b = card; first = null; setTimeout(() => { a.open = b.open = false; lock = false; }, 650); beep(200, .08, 'sawtooth', .03); }
          }
          break;
        }
      }
    });
    api.setLoop((dt) => {
      if (state === 'play') t += dt;
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#ede9fe'); g.addColorStop(1, '#fce7f3'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      if (cards) cards.forEach(c => {
        const tgt = (c.open || c.done) ? 1 : 0; c.flip = lerp(c.flip, tgt, clamp(dt * 12, 0, 1));
        const sx = Math.abs(Math.cos(c.flip * Math.PI / 2));
        ctx.save(); ctx.translate(c.x + c.w / 2, c.y + c.h / 2); ctx.scale(Math.max(0.02, sx) * (c.flip > .5 ? 1 : 1), 1);
        if (c.flip < .5) { ctx.fillStyle = c.done ? '#ddd6fe' : '#a78bfa'; rr(ctx, -c.w / 2, -c.h / 2, c.w, c.h, 12); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.font = '700 22px Inter'; ctx.textAlign = 'center'; ctx.fillText('?', 0, 8); }
        else { ctx.fillStyle = c.done ? '#bbf7d0' : '#fff'; rr(ctx, -c.w / 2, -c.h / 2, c.w, c.h, 12); ctx.fill(); ctx.font = Math.min(c.w, c.h) * 0.6 + 'px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(c.e, 0, 2); ctx.textBaseline = 'alphabetic'; }
        ctx.restore();
      });
      setHud(api, ['🧠 ' + name, 'Уровень: ' + (level || 1), 'Ходы: ' + (moves || 0), '⏱ ' + Math.floor(t || 0) + 'с']);
      if (state === 'start') overlay(ctx, W, H, '🧠 Memory Match', ['Игрок: ' + name, 'Клик — старт', 'Найди все пары']);
    });
    const b = gbtn('▶ Старт / Заново'); api.on(b, 'click', () => reset()); api.controls.appendChild(b);
    reset(); state = 'start'; api.start();
    return () => api.destroy();
  };

  /* =========================================================
     11) BUBBLE POP
     ========================================================= */
  GAMES.bubble = function (root, opts) {
    const api = createShell(root, { W: 420, H: 540, maxw: 420, hint: 'Тапай пузыри: лопаются все соседние того же цвета. Больше группа — больше очков!' });
    const { ctx, W, H, canvas } = api;
    const name = (opts && opts.name) || 'Игрок';
    const COLORS = ['#f472b6', '#60a5fa', '#34d399', '#fbbf24', '#a78bfa'];
    let state = 'start', bubbles, score, time, combo, level, pops, bestv = best('bd_bubble');
    function reset() { bubbles = []; score = 0; time = 60; combo = 0; level = 1; pops = []; for (let i = 0; i < 26; i++) spawn(); state = 'play'; }
    function spawn() { const r = rand(16, 26); bubbles.push({ x: rand(r, W - r), y: rand(H * 0.5, H + 100), r, vy: rand(-26, -14), col: COLORS[Math.floor(rand(0, COLORS.length))] }); }
    function popAt(p) {
      let hit = null;
      for (const b of bubbles) if (dist(p.x, p.y, b.x, b.y) < b.r) { hit = b; break; }
      if (!hit) return;
      // flood by proximity & color
      const group = []; const stack = [hit]; const seen = new Set([bubbles.indexOf(hit)]);
      while (stack.length) {
        const cur = stack.pop(); group.push(cur);
        bubbles.forEach((b, i) => { if (!seen.has(i) && b.col === cur.col && dist(b.x, b.y, cur.x, cur.y) < b.r + cur.r + 8) { seen.add(i); stack.push(b); } });
      }
      const n = group.length;
      score += n * n; combo = n; time = Math.min(99, time + (n >= 4 ? 2 : 0));
      group.forEach(b => { for (let i = 0; i < 4; i++) pops.push({ x: b.x, y: b.y, vx: rand(-90, 90), vy: rand(-90, 90), life: .5, col: b.col }); });
      bubbles = bubbles.filter(b => !group.includes(b));
      for (let i = 0; i < n; i++) spawn();
      beep(500 + n * 60, .07, 'sine', .03);
      bestv = best('bd_bubble', score);
    }
    api.on(canvas, 'pointerdown', e => { if (state !== 'play') { reset(); return; } popAt(pos(canvas, e)); });
    api.setLoop((dt) => {
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#cffafe'); g.addColorStop(1, '#dbeafe'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      if (state === 'play') { time -= dt; if (time <= 0) { state = 'over'; bestv = best('bd_bubble', score); } bubbles.forEach(b => { b.y += b.vy * dt; if (b.y < -b.r) { b.y = H + b.r; b.x = rand(b.r, W - b.r); } }); }
      bubbles.forEach(b => {
        const grd = ctx.createRadialGradient(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.1, b.x, b.y, b.r);
        grd.addColorStop(0, 'rgba(255,255,255,.9)'); grd.addColorStop(0.25, b.col); grd.addColorStop(1, b.col);
        ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.beginPath(); ctx.arc(b.x - b.r * 0.32, b.y - b.r * 0.32, b.r * 0.18, 0, 7); ctx.fill();
      });
      pops.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; ctx.globalAlpha = Math.max(0, p.life * 2); ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, 7); ctx.fill(); ctx.globalAlpha = 1; });
      pops = pops.filter(p => p.life > 0);
      setHud(api, ['🫧 ' + name, 'Очки: ' + (score || 0), '⏱ ' + Math.max(0, Math.ceil(time || 0)) + 'с', 'Рекорд: ' + bestv]);
      if (state === 'start') overlay(ctx, W, H, '🫧 Bubble Pop', ['Игрок: ' + name, 'Клик — старт', 'Лопай группы пузырей']);
      if (state === 'over') overlay(ctx, W, H, 'Время вышло!', ['Очки: ' + score + ' · Рекорд: ' + bestv, 'Клик — заново']);
    });
    const b = gbtn('▶ Старт'); api.on(b, 'click', () => reset()); api.controls.appendChild(b);
    reset(); state = 'start'; api.start();
    return () => api.destroy();
  };

})();
