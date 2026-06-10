/* ============================================================
   imagelab.js — «Генерация фото»
   Процедурно рисует милых персонажей на canvas + собирает промпт.
   window.IMAGE_LAB.mount(container, opts) -> destroy()
   ============================================================ */
(function () {
  const SUBJECTS = [
    { id: 'avocado', label: '🥑 Авокадо', en: 'avocado' },
    { id: 'dog', label: '🐶 Собака', en: 'dog' },
    { id: 'cat', label: '🐱 Кот', en: 'cat' },
    { id: 'banana', label: '🍌 Банан', en: 'banana' },
    { id: 'strawberry', label: '🍓 Клубника', en: 'strawberry' },
    { id: 'broccoli', label: '🥦 Брокколи', en: 'broccoli' },
    { id: 'pepper', label: '🌶️ Перчик', en: 'chili pepper' },
    { id: 'robot', label: '🤖 Робот', en: 'friendly robot' }
  ];
  const SCENES = [
    { id: 'space', label: '🌌 Космос', en: 'floating in outer space among stars and planets' },
    { id: 'kitchen', label: '🍳 Кухня', en: 'in a cozy sunny kitchen' },
    { id: 'stage', label: '🎤 Сцена', en: 'on a concert stage under spotlights' },
    { id: 'city', label: '🏙️ Город', en: 'flying over a city skyline' },
    { id: 'beach', label: '🏖️ Пляж', en: 'relaxing on a sunset beach' },
    { id: 'jungle', label: '🌴 Джунгли', en: 'exploring a lush jungle' }
  ];
  const STYLES = [
    { id: 'cartoon', label: 'Мультяшный', en: '3D Pixar-style cartoon render, soft lighting' },
    { id: 'comic', label: 'Комикс', en: 'bold comic-book style, thick outlines, halftone' },
    { id: 'kawaii', label: 'Kawaii', en: 'kawaii sticker style, pastel colors, super cute' }
  ];

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  function rr(ctx, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  /* ----------------------------- scenes ----------------------------- */
  function drawScene(ctx, W, H, scene, t) {
    if (scene === 'space') {
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0b1026'); g.addColorStop(1, '#2a1b4a'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 70; i++) { const x = (i * 71) % W, y = (i * 137) % H; ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t / 600 + i)); ctx.fillStyle = '#fff'; ctx.fillRect(x, y, 2, 2); } ctx.globalAlpha = 1;
      ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(W * 0.82, H * 0.22, 34, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(W * 0.82, H * 0.22, 52, 16, -0.4, 0, 7); ctx.stroke();
      ctx.fillStyle = '#60a5fa'; ctx.beginPath(); ctx.arc(W * 0.16, H * 0.78, 22, 0, 7); ctx.fill();
    } else if (scene === 'kitchen') {
      ctx.fillStyle = '#fde9c8'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#f5d199'; ctx.fillRect(0, H * 0.62, W, H);
      ctx.fillStyle = '#bcdfff'; rr(ctx, W * 0.6, H * 0.12, W * 0.3, H * 0.34, 10); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(W * 0.75, H * 0.12); ctx.lineTo(W * 0.75, H * 0.46); ctx.moveTo(W * 0.6, H * 0.29); ctx.lineTo(W * 0.9, H * 0.29); ctx.stroke();
      ctx.fillStyle = '#c98a4b'; ctx.fillRect(0, H * 0.62, W, 12);
    } else if (scene === 'stage') {
      ctx.fillStyle = '#15102a'; ctx.fillRect(0, 0, W, H);
      [0.3, 0.5, 0.7].forEach((f, i) => { ctx.fillStyle = ['rgba(244,114,182,.25)', 'rgba(96,165,250,.25)', 'rgba(52,211,153,.25)'][i]; ctx.beginPath(); ctx.moveTo(W * f, -10); ctx.lineTo(W * f - 90, H * 0.8); ctx.lineTo(W * f + 90, H * 0.8); ctx.closePath(); ctx.fill(); });
      ctx.fillStyle = '#241a3f'; ctx.fillRect(0, H * 0.78, W, H);
      for (let i = 0; i < 30; i++) { ctx.fillStyle = `hsla(${rand(0, 360)},80%,70%,.8)`; ctx.fillRect(rand(0, W), rand(0, H * 0.7), 3, 3); }
    } else if (scene === 'city') {
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#fbc2eb'); g.addColorStop(1, '#a6c1ee'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(40,40,80,.55)';
      for (let i = 0; i < 14; i++) { const bw = W / 14, bh = 50 + (i * 53 % 120); ctx.fillRect(i * bw, H - bh, bw - 4, bh); }
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(W * 0.2, H * 0.2, 26, 0, 7); ctx.fill();
    } else if (scene === 'beach') {
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#fcae6b'); g.addColorStop(.5, '#ffd9a0'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H * 0.6);
      ctx.fillStyle = '#3aa6d8'; ctx.fillRect(0, H * 0.55, W, H * 0.2);
      ctx.fillStyle = '#f6e0b5'; ctx.fillRect(0, H * 0.73, W, H);
      ctx.fillStyle = '#ffec8b'; ctx.beginPath(); ctx.arc(W * 0.8, H * 0.2, 36, 0, 7); ctx.fill();
    } else if (scene === 'jungle') {
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1b5e20'); g.addColorStop(1, '#0d3b14'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 18; i++) { ctx.fillStyle = `rgba(${rand(20, 60)},${rand(120, 180)},${rand(40, 90)},.6)`; const x = rand(0, W), y = rand(0, H), s = rand(20, 50); ctx.beginPath(); ctx.ellipse(x, y, s, s * 0.5, rand(0, 3), 0, 7); ctx.fill(); }
    }
  }

  /* ----------------------------- face ----------------------------- */
  function face(ctx, cx, cy, spread, blink, mouth) {
    // eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(cx - spread, cy, 11, 0, 7); ctx.arc(cx + spread, cy, 11, 0, 7); ctx.fill();
    ctx.fillStyle = '#1f2937';
    if (blink) { ctx.lineWidth = 3; ctx.strokeStyle = '#1f2937'; ctx.beginPath(); ctx.moveTo(cx - spread - 7, cy); ctx.lineTo(cx - spread + 7, cy); ctx.moveTo(cx + spread - 7, cy); ctx.lineTo(cx + spread + 7, cy); ctx.stroke(); }
    else { ctx.beginPath(); ctx.arc(cx - spread + 2, cy + 1, 5, 0, 7); ctx.arc(cx + spread + 2, cy + 1, 5, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx - spread + 4, cy - 1, 1.8, 0, 7); ctx.arc(cx + spread + 4, cy - 1, 1.8, 0, 7); ctx.fill(); }
    // cheeks
    ctx.fillStyle = 'rgba(244,114,182,.45)'; ctx.beginPath(); ctx.arc(cx - spread - 6, cy + 14, 6, 0, 7); ctx.arc(cx + spread + 6, cy + 14, 6, 0, 7); ctx.fill();
    // mouth
    ctx.strokeStyle = '#7c2d12'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy + 14, mouth || 12, 0.12 * Math.PI, 0.88 * Math.PI); ctx.stroke();
  }
  function arms(ctx, cx, cy, w, wave) {
    ctx.strokeStyle = '#3f3f46'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - w, cy); ctx.quadraticCurveTo(cx - w - 18, cy - 4, cx - w - 22, cy + 14 + wave); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + w, cy); ctx.quadraticCurveTo(cx + w + 18, cy - 12 - wave, cx + w + 24, cy - 24 - wave); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx - w - 22, cy + 14 + wave, 6, 0, 7); ctx.arc(cx + w + 24, cy - 24 - wave, 6, 0, 7); ctx.fill();
  }
  function helmet(ctx, cx, cy, r) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 4;
    ctx.fillStyle = 'rgba(180,220,255,.18)';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(cx - r * 0.4, cy - r * 0.4, r * 0.18, 0, 7); ctx.fill();
    ctx.restore();
  }

  /* ----------------------------- subjects ----------------------------- */
  function drawSubject(ctx, W, H, subj, scene, style, t) {
    const cx = W * 0.42, cy = H * 0.56;
    const bob = Math.sin(t / 500) * 6;
    const blink = (Math.floor(t / 220) % 16) === 0;
    ctx.save(); ctx.translate(0, bob);
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(cx, H * 0.86 - bob, 60, 14, 0, 0, 7); ctx.fill();

    const comic = style === 'comic';
    function outline() { if (comic) { ctx.strokeStyle = '#111'; ctx.lineWidth = 4; ctx.stroke(); } }

    if (subj === 'avocado') {
      ctx.fillStyle = '#3f7d20'; ctx.beginPath(); ctx.moveTo(cx, cy - 70); ctx.bezierCurveTo(cx + 70, cy - 60, cx + 60, cy + 80, cx, cy + 80); ctx.bezierCurveTo(cx - 60, cy + 80, cx - 70, cy - 60, cx, cy - 70); ctx.fill(); outline();
      ctx.fillStyle = '#cde6a5'; ctx.beginPath(); ctx.ellipse(cx, cy + 6, 46, 58, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#7b4a1e'; ctx.beginPath(); ctx.arc(cx, cy + 22, 24, 0, 7); ctx.fill();
      face(ctx, cx, cy - 6, 16, blink, 12); arms(ctx, cx, cy + 8, 52, bob);
    } else if (subj === 'banana') {
      ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.moveTo(cx - 50, cy - 60); ctx.quadraticCurveTo(cx + 80, cy - 40, cx + 40, cy + 70); ctx.quadraticCurveTo(cx + 30, cy + 50, cx - 60, cy - 40); ctx.quadraticCurveTo(cx - 64, cy - 52, cx - 50, cy - 60); ctx.fill(); outline();
      ctx.fillStyle = '#7c5b12'; ctx.beginPath(); ctx.arc(cx - 50, cy - 60, 6, 0, 7); ctx.fill();
      face(ctx, cx, cy - 6, 14, blink, 11); arms(ctx, cx, cy + 8, 44, bob);
    } else if (subj === 'broccoli') {
      ctx.fillStyle = '#86efac'; ctx.fillRect(cx - 14, cy, 28, 70);
      ctx.fillStyle = '#16a34a';
      [[0, -40, 40], [-34, -22, 30], [34, -22, 30], [-22, -54, 26], [22, -54, 26]].forEach(p => { ctx.beginPath(); ctx.arc(cx + p[0], cy + p[1], p[2], 0, 7); ctx.fill(); });
      if (comic) { ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.moveTo(cx - 16, cy + 6); ctx.lineTo(cx - 50, cy + 60); ctx.lineTo(cx + 50, cy + 60); ctx.lineTo(cx + 16, cy + 6); ctx.fill(); }
      face(ctx, cx, cy - 18, 14, blink, 11); arms(ctx, cx, cy + 14, 18, bob);
    } else if (subj === 'strawberry') {
      ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.moveTo(cx, cy - 50); ctx.bezierCurveTo(cx + 64, cy - 50, cx + 56, cy + 40, cx, cy + 80); ctx.bezierCurveTo(cx - 56, cy + 40, cx - 64, cy - 50, cx, cy - 50); ctx.fill(); outline();
      ctx.fillStyle = '#fde68a'; for (let i = 0; i < 14; i++) { const a = rand(0, 7), r = rand(20, 55); ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * r * 0.7, cy + 6 + Math.sin(a) * r * 0.6, 2.5, 4, a, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#16a34a'; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(cx, cy - 56); ctx.lineTo(cx + i * 14, cy - 76); ctx.lineTo(cx + i * 14 + 8, cy - 56); ctx.fill(); }
      face(ctx, cx, cy - 6, 15, blink, 12); arms(ctx, cx, cy + 8, 46, bob);
    } else if (subj === 'pepper') {
      ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.moveTo(cx - 30, cy - 50); ctx.quadraticCurveTo(cx + 60, cy - 40, cx + 30, cy + 70); ctx.quadraticCurveTo(cx + 5, cy + 30, cx - 40, cy - 30); ctx.quadraticCurveTo(cx - 44, cy - 46, cx - 30, cy - 50); ctx.fill(); outline();
      ctx.fillStyle = '#16a34a'; ctx.fillRect(cx - 34, cy - 60, 14, 16);
      face(ctx, cx - 2, cy - 4, 13, blink, 10); arms(ctx, cx, cy + 6, 40, bob);
    } else if (subj === 'robot') {
      ctx.fillStyle = '#94a3b8'; rr(ctx, cx - 40, cy - 50, 80, 70, 14); ctx.fill(); outline();
      ctx.strokeStyle = '#64748b'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx, cy - 50); ctx.lineTo(cx, cy - 70); ctx.stroke(); ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.arc(cx, cy - 72, 6, 0, 7); ctx.fill();
      ctx.fillStyle = '#1e293b'; rr(ctx, cx - 30, cy - 36, 60, 34, 8); ctx.fill();
      ctx.fillStyle = '#38bdf8'; ctx.beginPath(); ctx.arc(cx - 14, cy - 19, 7, 0, 7); ctx.arc(cx + 14, cy - 19, 7, 0, 7); ctx.fill();
      ctx.fillStyle = '#cbd5e1'; rr(ctx, cx - 30, cy + 24, 60, 46, 10); ctx.fill();
      arms(ctx, cx, cy + 30, 32, bob);
    } else { // dog / cat
      const isCat = subj === 'cat';
      ctx.fillStyle = isCat ? '#fbbf24' : '#c79a6b';
      // ears
      ctx.beginPath();
      if (isCat) { ctx.moveTo(cx - 40, cy - 40); ctx.lineTo(cx - 54, cy - 78); ctx.lineTo(cx - 16, cy - 52); ctx.moveTo(cx + 40, cy - 40); ctx.lineTo(cx + 54, cy - 78); ctx.lineTo(cx + 16, cy - 52); ctx.fill(); }
      else { ctx.ellipse(cx - 44, cy - 30, 16, 30, 0.3, 0, 7); ctx.ellipse(cx + 44, cy - 30, 16, 30, -0.3, 0, 7); ctx.fill(); }
      ctx.fillStyle = isCat ? '#fbbf24' : '#c79a6b'; ctx.beginPath(); ctx.arc(cx, cy - 6, 56, 0, 7); ctx.fill(); outline();
      ctx.fillStyle = isCat ? '#fde68a' : '#e6c9a3'; ctx.beginPath(); ctx.ellipse(cx, cy + 14, 30, 24, 0, 0, 7); ctx.fill();
      face(ctx, cx, cy - 12, 16, blink, 10);
      ctx.fillStyle = '#1f2937'; ctx.beginPath(); ctx.arc(cx, cy + 6, 6, 0, 7); ctx.fill();
      if (isCat) { ctx.strokeStyle = '#92400e'; ctx.lineWidth = 1.5; for (const s of [-1, 1]) for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(cx + s * 8, cy + 8 + i * 5); ctx.lineTo(cx + s * 40, cy + 4 + i * 9); ctx.stroke(); } }
      else { ctx.beginPath(); ctx.arc(cx - 20, cy - 6, 8, 0, 7); ctx.fillStyle = '#5b3b1a'; ctx.fill(); } // spot
      arms(ctx, cx, cy + 40, 40, bob);
    }
    // astronaut helmet when in space
    if (scene === 'space') helmet(ctx, cx, cy - 14, 72);
    ctx.restore();

    // signature
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = '600 13px Inter'; ctx.textAlign = 'right';
    ctx.fillText('🍌 AI Trend', W - 14, H - 14);
  }

  /* ----------------------------- prompt text ----------------------------- */
  function buildPrompt(subj, scene, style, name) {
    const s = SUBJECTS.find(x => x.id === subj), sc = SCENES.find(x => x.id === scene), st = STYLES.find(x => x.id === style);
    const astro = scene === 'space' ? ' wearing a cute astronaut helmet and space suit,' : '';
    return `A cute cartoon ${s.en} character with big expressive eyes, a happy smiling face and little waving arms,${astro} ${sc.en}, ${st.en}, vibrant saturated colors, soft studio lighting, clean background, highly detailed, adorable mascot, trending on ArtStation. Personalized art for ${name}.`;
  }

  /* ----------------------------- mount ----------------------------- */
  function mount(container, opts) {
    opts = opts || {};
    const name = opts.name || 'Ученик';
    let subj = opts.subject || 'avocado', scene = opts.scene || 'kitchen', style = opts.style || 'cartoon';
    let raf = null, t0 = performance.now(), loading = false, loadEnd = 0;

    container.innerHTML = '';
    const lab = document.createElement('div'); lab.className = 'lab'; container.appendChild(lab);

    // presets
    const presetRow = document.createElement('div'); presetRow.className = 'lab-presets';
    (window.IMAGE_PRESETS || []).forEach(p => {
      const c = document.createElement('button'); c.className = 'preset-chip'; c.innerHTML = '<span>' + p.emoji + '</span> ' + p.label;
      c.onclick = () => { subj = p.subject; scene = p.scene; style = p.style; syncOpts(); generate(); };
      presetRow.appendChild(c);
    });
    lab.appendChild(presetRow);

    // controls
    const ctrls = document.createElement('div'); ctrls.className = 'lab-controls';
    function group(title, arr, getCur, set) {
      const g = document.createElement('div'); g.className = 'lab-group';
      const lbl = document.createElement('span'); lbl.textContent = title; g.appendChild(lbl);
      const row = document.createElement('div'); row.className = 'opt-row';
      arr.forEach(o => {
        const b = document.createElement('button'); b.className = 'opt'; b.textContent = o.label; b.dataset.id = o.id;
        b.onclick = () => { set(o.id); syncOpts(); generate(); };
        row.appendChild(b);
      });
      g.appendChild(row); g._row = row; g._get = getCur; return g;
    }
    const gSubj = group('Кто', SUBJECTS, () => subj, v => subj = v);
    const gScene = group('Где', SCENES, () => scene, v => scene = v);
    const gStyle = group('Стиль', STYLES, () => style, v => style = v);
    ctrls.append(gSubj, gScene, gStyle); lab.appendChild(ctrls);

    // stage
    const stage = document.createElement('div'); stage.className = 'lab-stage';
    const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 400; canvas.className = 'lab-canvas';
    const load = document.createElement('div'); load.className = 'lab-loading hidden';
    load.innerHTML = '<div class="spinner"></div><div>Генерация…</div>';
    stage.append(canvas, load); lab.appendChild(stage);
    const ctx = canvas.getContext('2d');

    // prompt
    const promptBox = document.createElement('div'); promptBox.className = 'lab-prompt';
    promptBox.innerHTML = '<span class="lbl">Промпт (English)</span><span id="labPromptText"></span>';
    lab.appendChild(promptBox);
    const promptText = promptBox.querySelector('#labPromptText');

    // actions
    const actions = document.createElement('div'); actions.className = 'lab-actions';
    const bGen = document.createElement('button'); bGen.className = 'game-btn'; bGen.textContent = '✨ Сгенерировать';
    const bCopy = document.createElement('button'); bCopy.className = 'game-btn secondary'; bCopy.textContent = '📋 Копировать промпт';
    const bDl = document.createElement('button'); bDl.className = 'game-btn secondary'; bDl.textContent = '⬇ Скачать PNG';
    const bShare = document.createElement('button'); bShare.className = 'game-btn secondary'; bShare.textContent = '↗ Поделиться';
    actions.append(bGen, bCopy, bDl, bShare); lab.appendChild(actions);

    function syncOpts() {
      [[gSubj], [gScene], [gStyle]].forEach(() => {});
      gSubj._row.querySelectorAll('.opt').forEach(b => b.classList.toggle('is-active', b.dataset.id === subj));
      gScene._row.querySelectorAll('.opt').forEach(b => b.classList.toggle('is-active', b.dataset.id === scene));
      gStyle._row.querySelectorAll('.opt').forEach(b => b.classList.toggle('is-active', b.dataset.id === style));
      promptText.textContent = buildPrompt(subj, scene, style, name);
    }
    function generate() { loading = true; loadEnd = performance.now() + 750; load.classList.remove('hidden'); }

    function draw(now) {
      if (loading && now >= loadEnd) { loading = false; load.classList.add('hidden'); if (opts.toast) opts.toast('🎨 Изображение готово!'); }
      drawScene(ctx, canvas.width, canvas.height, scene, now);
      if (!loading) drawSubject(ctx, canvas.width, canvas.height, subj, scene, style, now - t0);
      raf = requestAnimationFrame(draw);
    }

    bGen.onclick = generate;
    bCopy.onclick = () => { const txt = buildPrompt(subj, scene, style, name); (opts.copy ? opts.copy(txt) : navigator.clipboard.writeText(txt)); if (opts.toast) opts.toast('Промпт скопирован!'); };
    bDl.onclick = () => { const a = document.createElement('a'); a.download = subj + '-' + scene + '.png'; a.href = canvas.toDataURL('image/png'); a.click(); if (opts.toast) opts.toast('PNG сохранён!'); };
    bShare.onclick = () => { const txt = buildPrompt(subj, scene, style, name); if (opts.share) opts.share('AI Trend — генерация изображения', txt); };

    syncOpts(); generate(); raf = requestAnimationFrame(draw);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }

  window.IMAGE_LAB = { mount, SUBJECTS, SCENES, STYLES };
})();
