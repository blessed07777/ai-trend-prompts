/* ============================================================
   app.js — UI: вкладки, персонализация, копирование
   ============================================================ */
(function () {
  const $ = s => document.querySelector(s);
  const GAME_DATA = window.GAME_DATA || [];
  const IMAGE_PRESETS = window.IMAGE_PRESETS || [];

  const SECTIONS = {
    boys:   { kicker: 'РАЗДЕЛ 01', title: 'Игры для мальчиков', sub: 'Мальчики 12–17 любят экшн, скорость, соревнование и прокачку.' },
    girls:  { kicker: 'РАЗДЕЛ 02', title: 'Игры для девочек',  sub: 'Девочки 12–17 ценят эстетику, кастомизацию и социальный нарратив.' },
    images: { kicker: 'РАЗДЕЛ 03', title: 'Генерация фото',     sub: 'Создавай весёлые AI-картинки: говорящий авокадо, собака-космонавт, танцующий банан и многое другое.' }
  };

  let currentTab = 'girls';
  let labDestroy = null;
  const cardRefs = [];

  /* ----------------------- helpers ----------------------- */
  function student() {
    const name = ($('#studentName').value || '').trim() || 'Ученик';
    const desc = ($('#studentDesc').value || '').trim() || 'амбициозный, добрый и весёлый';
    return { name, desc };
  }
  function fill(tpl, s) { return tpl.replace(/\{name\}/g, s.name).replace(/\{desc\}/g, s.desc); }
  function esc(str) { return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function highlight(text, name) {
    const safe = esc(text);
    if (!name) return safe;
    const re = new RegExp('(' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'g');
    return safe.replace(re, '<span class="tok">$1</span>');
  }

  let toastT;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.hidden = false;
    requestAnimationFrame(() => t.classList.add('show'));
    clearTimeout(toastT); toastT = setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.hidden = true, 250); }, 1900);
  }
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch (e) {
      try { const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); return true; } catch (e2) { return false; }
    }
  }
  async function share(title, text) {
    if (navigator.share) { try { await navigator.share({ title, text }); return; } catch (e) { if (e.name === 'AbortError') return; } }
    const ok = await copyText(text); toast(ok ? 'Скопировано — можно отправлять 📤' : 'Не удалось скопировать');
  }

  /* ----------------------- chip ----------------------- */
  function updateChip() {
    const s = student();
    $('#chipName').textContent = s.name;
    $('#chipCount').textContent = GAME_DATA.length + IMAGE_PRESETS.length;
  }

  /* ----------------------- cards ----------------------- */
  function cardEl(g) {
    const s = student();
    const card = document.createElement('article'); card.className = 'card';

    const top = document.createElement('div'); top.className = 'card-top';
    const icon = document.createElement('div'); icon.className = 'card-icon'; icon.style.background = g.iconBg; icon.textContent = g.emoji;
    const meta = document.createElement('div'); meta.className = 'card-meta';
    const badges = document.createElement('div'); badges.className = 'badges';
    badges.innerHTML = '<span class="rating"><span class="star">★</span>' + g.rating + '</span>' +
      g.badges.map(b => '<span class="badge ' + b.c + '">' + b.t + '</span>').join('');
    meta.appendChild(badges);
    top.append(icon, meta);

    const title = document.createElement('h3'); title.className = 'card-title'; title.textContent = g.title;
    const desc = document.createElement('p'); desc.className = 'card-desc'; desc.textContent = g.tagline;
    const role = document.createElement('div'); role.className = 'card-role';

    const prompt = document.createElement('div'); prompt.className = 'prompt-box';

    const actions = document.createElement('div'); actions.className = 'card-actions';
    const bCopy = document.createElement('button'); bCopy.className = 'btn btn-primary'; bCopy.innerHTML = '📋 Скопировать';
    const bShare = document.createElement('button'); bShare.className = 'btn btn-ghost'; bShare.innerHTML = '↗ Поделиться';
    actions.append(bCopy, bShare);

    card.append(top, title, desc, role, prompt, actions);

    const ref = { g, role, prompt };
    function refresh() {
      const st = student();
      ref.role.innerHTML = fill(g.role, st);
      ref.prompt.innerHTML = highlight(fill(g.prompt, st), st.name);
    }
    refresh();
    cardRefs.push({ refresh });

    bCopy.onclick = async () => {
      const ok = await copyText(fill(g.prompt, student()));
      if (ok) { bCopy.classList.add('copied'); bCopy.innerHTML = '✓ Скопировано'; toast('Промпт «' + g.title + '» скопирован!'); setTimeout(() => { bCopy.classList.remove('copied'); bCopy.innerHTML = '📋 Скопировать'; }, 1400); }
    };
    bShare.onclick = () => share('AI Trend — ' + g.title, fill(g.prompt, student()));

    return card;
  }

  /* ----------------------- render ----------------------- */
  function renderSection() {
    const sec = SECTIONS[currentTab];
    $('#sectionKicker').textContent = sec.kicker;
    $('#sectionTitle').textContent = sec.title;
    $('#sectionSub').textContent = sec.sub;

    if (labDestroy) { labDestroy(); labDestroy = null; }
    cardRefs.length = 0;
    const grid = $('#grid'); grid.innerHTML = '';

    if (currentTab === 'images') {
      grid.style.display = 'block';
      const panel = document.createElement('div'); panel.className = 'panel'; panel.style.padding = '22px';
      grid.appendChild(panel);
      labDestroy = window.IMAGE_LAB.mount(panel, { name: student().name, toast, copy: copyText, share });
      return;
    }

    grid.style.display = 'grid';
    GAME_DATA.filter(g => g.cat === currentTab).forEach((g, i) => {
      const c = cardEl(g); c.style.animationDelay = (i * 0.05) + 's'; grid.appendChild(c);
    });
  }

  function refreshAll() { cardRefs.forEach(r => r.refresh()); updateChip(); }

  /* ----------------------- theme ----------------------- */
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    $('#themeToggle').querySelector('.theme-icon').textContent = t === 'dark' ? '☀️' : '🌙';
    localStorage.setItem('aitrend_theme', t);
  }

  /* ----------------------- init ----------------------- */
  function init() {
    applyTheme(localStorage.getItem('aitrend_theme') || 'light');

    document.querySelectorAll('.tab').forEach(tab => {
      tab.onclick = () => {
        if (tab.classList.contains('is-active')) return;
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('is-active'));
        tab.classList.add('is-active');
        currentTab = tab.dataset.tab;
        renderSection();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      };
    });

    $('#studentName').addEventListener('input', refreshAll);
    $('#studentDesc').addEventListener('input', refreshAll);

    $('#themeToggle').onclick = () => applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');

    updateChip();
    renderSection();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
