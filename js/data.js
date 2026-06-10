/* ============================================================
   data.js — каталог промптов (игры + генерация изображений)
   Токены {name} и {desc} заменяются на данные ученика.
   ============================================================ */

/* ---- helper: общий «технический» блок для каждого промпта ---- */
const TECH = `ЯЗЫК — ОБЯЗАТЕЛЬНО:
• ВЕСЬ интерфейс и текст игры строго на РУССКОМ языке: меню, кнопки, подсказки, обучение, счёт, уровни, сообщения, экраны старта/победы/проигрыша. Никакого английского в UI.

ГРАФИКА И ВАУ-ЭФФЕКТ (сделай дорого и красиво):
• Современный «сочный» визуал: продуманная цветовая палитра, мягкие градиенты, свечение (glow), неоновые акценты, аккуратные тени и блики.
• Векторная/процедурная графика, нарисованная кодом: чистые формы, скруглённые углы, приятные пропорции, детализированные персонажи и объекты. Не использовать растянутые эмодзи как основную графику.
• Плавные анимации с easing: пружинистые появления, реакция кнопок на наведение/нажатие, переходы между экранами (fade/slide/scale).
• «Juice» — обратная связь на каждое действие: частицы, лёгкий screen shake на ударах, всплывающие очки (+10), вспышки и волны при комбо, трейлы за объектами.
• Живой фон: параллакс-слои, мягкая анимация, частицы/звёзды/боке, виньетка и глубина. Не статичная заливка.

ИНТЕРФЕЙС (проработать детально):
• Аккуратный HUD: скруглённые панели-«пилюли», иконки, крупный читаемый счёт, анимированные прогресс-бары и полоски здоровья.
• Красивые стартовый и финальный экраны: заголовок, краткие правила, крупные кнопки с тенью и hover-анимацией.
• Адаптивная типографика (жирные заголовки, хороший контраст и отступы), приятный ритм композиции.

КОРРЕКТНОСТЬ ИНТЕРФЕЙСА И РАСКЛАДКИ (частые баги — СТРОГО избегать!):
• Кнопки, панели и бары НЕ перекрывают друг друга, персонажа и важный текст. Сначала рассчитай сетку координат раскладки, потом рисуй по ней.
• На КАЖДОЙ кнопке виден её текст: сначала рисуется фон кнопки, ПОТОМ подпись ПОВЕРХ (правильный порядок рисования!), по центру, контрастным цветом, текст помещается внутри кнопки. Пустых кнопок-плашек без подписи быть НЕ должно.
• Каждая полоска/бар подписана (название + значение); цвет текста всегда контрастирует с фоном и не сливается с плашкой.
• Размер элементов адекватен содержимому (кнопка = текст + отступы), без гигантских блоков на пол-экрана.
• Строгий порядок отрисовки: фон → игровое поле → объекты → персонаж → HUD/панели → подписи и иконки ПОВЕРХ → оверлеи (старт/пауза/конец) в самом конце.
• Всё помещается в холст при любом размере, ничего не обрезается и не вылезает за края. Зоны клика точно совпадают с видимыми кнопками.
• Прозрачный оверлей старта/конца НЕ должен оставаться поверх игры во время геймплея — показывай его только в нужном состоянии.

TECH SPEC:
• Один самодостаточный .html файл, без внешних библиотек и CDN.
• HTML5 Canvas, ~60 FPS, requestAnimationFrame с delta-time.
• Десктоп (клавиатура + мышь) И мобайл (тач/свайп). Canvas адаптивно масштабируется, всё помещается в кадр без обрезаний.
• Звук через WebAudio (короткие приятные сигналы, без файлов) + кнопка «Звук вкл/выкл».
• Старт → игра → финальный экран с результатом; лучший результат — в localStorage; кнопка «Играть снова».
• Без багов, без ошибок в консоли, играбельно с первого клика.

САМОПРОВЕРКА перед выдачей кода — мысленно пройди чеклист и исправь найденное:
1) Виден ли текст на ВСЕХ кнопках и панелях? 2) Нет ли наложений/перекрытий элементов? 3) Всё ли в кадре, ничего не обрезано? 4) Совпадают ли зоны клика с кнопками? 5) Нет ли ошибок в консоли? 6) Весь ли UI на русском? 7) Не остаётся ли стартовый оверлей поверх игры во время игры?`;

const DEVCARD = `КАРТОЧКА РАЗРАБОТЧИКА (нарисуй стильной скруглённой карточкой на стартовом и финальном экранах):
   ┌────────────────────────────┐
   │  🍌 AI Trend Studio         │
   │  Разработчик: {name}        │
   │  {desc}                     │
   │  Версия: v1.0 · 2026        │
   └────────────────────────────┘`;

/* ============================================================
   ИГРЫ
   ============================================================ */
const GAME_DATA = [
  /* ---------------- МАЛЬЧИКИ ---------------- */
  {
    id: 'space', cat: 'boys', emoji: '🚀', gameKey: 'space',
    iconBg: 'linear-gradient(135deg,#dbeafe,#ede9fe)',
    rating: '4.9', badges: [{t:'ТОП',c:'top'},{t:'ARCADE',c:'tag'}],
    title: 'Space Defender', tagline: 'Оборона орбиты · волны врагов · апгрейды · боссы',
    role: 'Пилот: <b>{name}</b> · позывной «Banana-1»',
    prompt:
`Create a browser game in a single HTML file using HTML5 Canvas — space shooter "SPACE DEFENDER".

PLAYER: Commander = {name} · Ship = "Banana-1" · Permanent badge: "AI Pilot · {name}"
PERSONALITY: {desc} — reflect it in the start-screen greeting and victory taunts.

GOAL: Survive endless waves of alien ships, protect the planet at the bottom of the screen.

CORE MECHANICS:
• Player ship at the bottom; move with ←/→ or A/D or by dragging finger; auto-fire + Space for a focused burst.
• Enemies fly in formation patterns (sine waves, dives, V-formations) and shoot back.
• Every 5th wave spawns a BOSS with a health bar and a multi-phase attack.
• Power-ups drop from killed enemies: triple-shot, shield bubble, slow-mo, +1 life.
• Combo meter: chained kills without taking damage multiply the score.

CONTROLS: keyboard arrows + space, OR mouse aim, OR touch drag to move & tap to shoot.
UI: top HUD shows score, wave, lives (heart icons), combo multiplier, boss health.
PROGRESSION: enemies get faster & denser each wave; difficulty curve is smooth.
ART: neon starfield parallax background, glowing lasers, particle explosions, screen shake on hits.

${TECH}

${DEVCARD}`
  },
  {
    id: 'racer', cat: 'boys', emoji: '🏎️', gameKey: 'racer',
    iconBg: 'linear-gradient(135deg,#fee2e2,#fef3c7)',
    rating: '4.8', badges: [{t:'3 мин',c:'time'},{t:'RACING',c:'tag'}],
    title: 'Turbo Racer', tagline: 'Бесконечная трасса · дрифт · нитро · рекорды',
    role: 'Гонщик: <b>{name}</b> на болиде «{name} GT»',
    prompt:
`Create a browser game in a single HTML file using HTML5 Canvas — endless racer "TURBO RACER".

PLAYER: Driver = {name} · Car = "{name} GT" · Permanent badge: "AI Racer · {name}"
PERSONALITY: {desc}.

GOAL: Drive as far as possible on a busy highway without crashing; beat your best distance.

CORE MECHANICS:
• 3–4 lane road scrolling toward the player, pseudo-3D perspective (road narrows to a horizon).
• Switch lanes with ←/→ / A-D / swipe; hold ↑ for nitro (overheats — manage a boost bar).
• Avoid traffic cars and oil slicks; collect coins and fuel cans.
• Speed steadily increases; near-misses give a "CLOSE!" bonus and a short slow-motion frame.
• Day → sunset → night cycle every 1000m with changing palette.

CONTROLS: arrows / A-D / swipe to steer, up-arrow or tap-hold for nitro.
UI: speedometer, distance (m), coins, nitro/heat bar, best distance.
ART: parallax roadside (trees, signs, city), motion blur lines, sparks on near-miss, particle smoke.

${TECH}

${DEVCARD}`
  },
  {
    id: 'penalty', cat: 'boys', emoji: '⚽', gameKey: 'penalty',
    iconBg: 'linear-gradient(135deg,#dcfce7,#d1fae5)',
    rating: '4.9', badges: [{t:'3 мин',c:'time'},{t:'SPORT',c:'tag'}],
    title: 'Penalty King', tagline: 'Серия пенальти · аим + сила · вратарь-AI · рейтинг',
    role: 'Бомбардир: <b>{name}</b> · клуб «{name} FC»',
    prompt:
`Create a browser game in a single HTML file using HTML5 Canvas — football game "PENALTY KING".

PLAYER: Striker = {name} · Club = "{name} FC" · Permanent badge: "AI Striker · {name}"
PERSONALITY: {desc}.

GOAL: Score as many penalties as possible in a 5-shot round, then sudden-death.

CORE MECHANICS:
• Aim: a moving target reticle inside the goal (or drag to aim on touch).
• Power: a rising/falling power bar — click/tap at the right moment to set shot strength.
• Curve: a third quick swipe/tap sets curve (ball bends in flight).
• Goalkeeper AI dives smartly; harder rounds = better keeper reading your aim.
• Ball physics with gravity, spin and a satisfying net bulge on a goal.

CONTROLS: move reticle (mouse/touch), click to lock aim → click to lock power → flick for curve.
UI: shots taken, goals, streak, accuracy %, keeper difficulty.
ART: stadium with crowd, stripes on the pitch, confetti on a goal, slow-mo replay arc.

${TECH}

${DEVCARD}`
  },
  {
    id: 'ninja', cat: 'boys', emoji: '🥷', gameKey: 'runner',
    iconBg: 'linear-gradient(135deg,#e0e7ff,#cffafe)',
    rating: '4.7', badges: [{t:'RUNNER',c:'tag'}],
    title: 'Ninja Run', tagline: 'Бесконечный раннер · прыжки · подкаты · комбо',
    role: 'Ниндзя: <b>{name}</b>',
    theme: 'ninja',
    prompt:
`Create a browser game in a single HTML file using HTML5 Canvas — endless runner "NINJA RUN".

PLAYER: Ninja = {name} · Permanent badge: "AI Ninja · {name}"
PERSONALITY: {desc}.

GOAL: Run as far as possible across rooftops, dodging obstacles and slicing coins.

CORE MECHANICS:
• Auto-run to the right; Space/↑/tap to jump (hold for higher), ↓/swipe-down to slide.
• Double-jump unlocked; wall-slide on tall obstacles.
• Obstacles: gaps, spikes, low beams (slide), flying drones (jump).
• Collect coins and shuriken; shuriken let you slice one obstacle.
• Distance-based speed ramp with parallax city at dusk.

CONTROLS: Space/↑/tap = jump, ↓/swipe-down = slide.
UI: distance, coins, multiplier, best run.
ART: silhouette ninja with a trailing scarf, glowing neon city skyline, dust particles on landing.

${TECH}

${DEVCARD}`
  },
  {
    id: 'snake', cat: 'boys', emoji: '🐍', gameKey: 'snake',
    iconBg: 'linear-gradient(135deg,#dcfce7,#ecfccb)',
    rating: '4.8', badges: [{t:'CLASSIC',c:'tag'}],
    title: 'Snake Arena', tagline: 'Неоновая змейка · ускорения · бонусы · стены-порталы',
    role: 'Игрок: <b>{name}</b>',
    prompt:
`Create a browser game in a single HTML file using HTML5 Canvas — modern snake "SNAKE ARENA".

PLAYER: Player = {name} · Permanent badge: "AI Snake Master · {name}"
PERSONALITY: {desc}.

GOAL: Grow the longest snake without hitting yourself; chase a high score.

CORE MECHANICS:
• Smooth grid movement with rounded, glowing snake body and animated head.
• Eat fruit to grow +1; golden fruit = +5 and brief speed-boost; bomb fruit = shrink, avoid.
• Edges are portals (wrap around). Optional walls toggle on the start screen.
• Speed gently increases with length; combo bonus for eating quickly.

CONTROLS: arrows / WASD / swipe on touch.
UI: score, length, speed, best score.
ART: dark neon arena, particle pop when eating, subtle grid glow, trail fade.

${TECH}

${DEVCARD}`
  },
  {
    id: 'meteor', cat: 'boys', emoji: '☄️', gameKey: 'catch',
    iconBg: 'linear-gradient(135deg,#ede9fe,#fae8ff)',
    rating: '4.7', badges: [{t:'ARCADE',c:'tag'}],
    title: 'Meteor Catcher', tagline: 'Лови ресурсы · уворачивайся от метеоров · щит',
    role: 'Капитан: <b>{name}</b>',
    theme: 'meteor',
    prompt:
`Create a browser game in a single HTML file using HTML5 Canvas — catch-and-dodge game "METEOR CATCHER".

PLAYER: Captain = {name} · Permanent badge: "AI Captain · {name}"
PERSONALITY: {desc}.

GOAL: Catch falling crystals with your collector while dodging dangerous meteors.

CORE MECHANICS:
• Move the collector left/right (mouse / arrows / drag) along the bottom.
• Good drops (crystals, stars, fuel) = points; bad drops (red meteors) = lose a life.
• Combo for catching several good items in a row; a shield power-up blocks one meteor.
• Fall speed and density increase over time; occasional "crystal rain" bonus burst.

CONTROLS: move horizontally with mouse / ←→ / touch-drag.
UI: score, lives, combo, shield status, best score.
ART: deep-space gradient, twinkling stars, glowing crystals, fiery meteor trails, catch sparkle.

${TECH}

${DEVCARD}`
  },

  /* ---------------- ДЕВОЧКИ ---------------- */
  {
    id: 'style', cat: 'girls', emoji: '👗', gameKey: 'style',
    iconBg: 'linear-gradient(135deg,#fce7f3,#ede9fe)',
    rating: '4.9', badges: [{t:'ТОП',c:'top'},{t:'FASHION',c:'tag'}],
    title: 'Style Studio', tagline: 'Свой бренд одежды · подбор образов · показ · продажи',
    role: 'Дизайнер: <b>{name}</b> Studio',
    prompt:
`Create a browser game in a single HTML file using HTML5 Canvas — fashion brand simulator "STYLE STUDIO".

PLAYER: Designer = {name} · Brand = "{name} Studio" · Permanent badge: "AI Designer · {name}"
PERSONALITY: {desc} — let it shape the client compliments.

GOAL: Read each client's request and dress the runway model to match the brief; earn stars and grow the brand.

CORE MECHANICS:
• A client appears with a brief: target color palette, vibe (cute / elegant / sporty / party) and a key item.
• Pick top, bottom, shoes and an accessory from a wardrobe; the look updates live on the model.
• A live "match score" rises as your picks fit the brief; submit the look for a star rating (1–5).
• Earn coins → unlock new clothing packs and patterns; reputation bar fills toward a runway show.
• Timed "trend rush" rounds for bonus coins.

CONTROLS: click/tap wardrobe items; buttons to rotate the model and submit.
UI: brief card, match meter, stars, coins, reputation, collection unlocks.
ART: cute flat-style model, pastel boutique, sparkle on a 5-star look, confetti on the show.

${TECH}

${DEVCARD}`
  },
  {
    id: 'cafe', cat: 'girls', emoji: '☕', gameKey: 'cafe',
    iconBg: 'linear-gradient(135deg,#fef3c7,#fde68a)',
    rating: '4.8', badges: [{t:'3 мин',c:'time'},{t:'SIM',c:'tag'}],
    title: 'My Café', tagline: 'Своё кафе · гости · рецепты · чаевые · рейтинг',
    role: 'Владелица: Кафе <b>{name}</b>',
    prompt:
`Create a browser game in a single HTML file using HTML5 Canvas — café manager "MY CAFÉ".

PLAYER: Owner = {name} · Café = "Café {name}" · Permanent badge: "AI Entrepreneur · {name}"
PERSONALITY: {desc}.

GOAL: Serve each guest the right order before their patience runs out; keep the rating 5★.

CORE MECHANICS:
• Guests arrive with a speech bubble order (e.g. latte + croissant) and a patience timer.
• Tap ingredients/items to assemble the order on a tray, then serve the matching guest.
• Correct & fast = big tip + happy face; wrong or slow = lost tip + angry face.
• Earn money → buy new menu items, decor and faster equipment (upgrades shop between days).
• Days have a rush hour with more guests for combo tips.

CONTROLS: tap to build orders and serve; drag optional.
UI: money, day, café rating (stars), tip combo, guests waiting.
ART: cozy café, steam off drinks, hearts when a guest is happy, gentle day/night light.

${TECH}

${DEVCARD}`
  },
  {
    id: 'pet', cat: 'girls', emoji: '🐾', gameKey: 'pet',
    iconBg: 'linear-gradient(135deg,#dcfce7,#d1fae5)',
    rating: '4.9', badges: [{t:'3 мин',c:'time'},{t:'CARE',c:'tag'}],
    title: 'Pet World', tagline: 'Виртуальный питомец · уход · мини-игры · настроение',
    role: 'Хозяйка: <b>{name}</b>',
    prompt:
`Create a browser game in a single HTML file using HTML5 Canvas — virtual pet "PET WORLD".

PLAYER: Owner = {name} · Permanent badge: "AI Pet Trainer · {name}"
Pet name asked via a text input on the start screen.
PERSONALITY: {desc}.

GOAL: Keep your pet happy, fed, clean and rested; level it up through care and play.

CORE MECHANICS:
• Four needs bars: Hunger, Happiness, Energy, Hygiene — they slowly drop in real time.
• Actions: Feed, Play (a quick mini-game), Wash, Sleep — each refills the matching bar.
• The pet reacts with cute animated faces & sounds; neglect makes it sad.
• XP from good care levels the pet up and unlocks accessories and new mini-games.
• A day/night cycle: pet wants to sleep at night.

CONTROLS: tap the action buttons; the play mini-game uses tap timing.
UI: four need bars, level + XP, coins, mood emoji.
ART: adorable blob/cat pet with blinking eyes, bouncy idle animation, hearts & sparkles, soft room background.

${TECH}

${DEVCARD}`
  },
  {
    id: 'memory', cat: 'girls', emoji: '🧠', gameKey: 'memory',
    iconBg: 'linear-gradient(135deg,#ede9fe,#fce7f3)',
    rating: '4.8', badges: [{t:'PUZZLE',c:'tag'}],
    title: 'Memory Match', tagline: 'Парные карточки · уровни · таймер · звёзды',
    role: 'Игрок: <b>{name}</b>',
    prompt:
`Create a browser game in a single HTML file using HTML5 Canvas — memory game "MEMORY MATCH".

PLAYER: Player = {name} · Permanent badge: "AI Memory Star · {name}"
PERSONALITY: {desc}.

GOAL: Find all matching pairs in as few moves as possible across rising levels.

CORE MECHANICS:
• Grid of face-down cards with cute emoji/icons; flip two, keep matches, flip mismatches back.
• Levels grow the grid (4→6→8 pairs); each level has a move & time target for 1–3 stars.
• Combo bonus for consecutive matches; gentle shuffle animation between levels.
• Best moves/time saved to localStorage.

CONTROLS: click/tap a card to flip.
UI: moves, time, pairs left, level, stars earned.
ART: glossy flip animation, soft pastel cards, sparkle on a match, victory confetti.

${TECH}

${DEVCARD}`
  },
  {
    id: 'bubble', cat: 'girls', emoji: '🫧', gameKey: 'bubble',
    iconBg: 'linear-gradient(135deg,#cffafe,#dbeafe)',
    rating: '4.7', badges: [{t:'CASUAL',c:'tag'}],
    title: 'Bubble Pop', tagline: 'Лопай пузыри · цепочки · бонусы · комбо-эффекты',
    role: 'Игрок: <b>{name}</b>',
    prompt:
`Create a browser game in a single HTML file using HTML5 Canvas — bubble popper "BUBBLE POP".

PLAYER: Player = {name} · Permanent badge: "AI Bubble Queen · {name}"
PERSONALITY: {desc}.

GOAL: Pop groups of same-colored bubbles to score; clear the board before time runs out.

CORE MECHANICS:
• Floating bubbles drift up the screen; tap a bubble to pop it and all same-color neighbors (flood fill).
• Bigger groups = exponential score and a satisfying combo flash.
• Special bubbles: rainbow (pops any color nearby), bomb (clears a radius), star (slow-mo).
• New bubbles keep spawning; a level meter fills as you score.

CONTROLS: click/tap bubbles.
UI: score, time, combo, level, best score.
ART: glossy translucent bubbles with highlights, splash particles on pop, soft gradient sky.

${TECH}

${DEVCARD}`
  },
  {
    id: 'sweet', cat: 'girls', emoji: '🍰', gameKey: 'catch',
    iconBg: 'linear-gradient(135deg,#fce7f3,#fee2e2)',
    rating: '4.8', badges: [{t:'ARCADE',c:'tag'}],
    title: 'Sweet Catch', tagline: 'Лови сладости · избегай перчинок · комбо-десерты',
    role: 'Кондитер: <b>{name}</b>',
    theme: 'sweet',
    prompt:
`Create a browser game in a single HTML file using HTML5 Canvas — catch game "SWEET CATCH".

PLAYER: Confectioner = {name} · Permanent badge: "AI Pastry Chef · {name}"
PERSONALITY: {desc}.

GOAL: Catch falling sweets in your basket while dodging hot chili peppers.

CORE MECHANICS:
• Move the basket left/right (mouse / arrows / drag).
• Good drops (cupcakes, donuts, candy, hearts) = points; bad drops (chili) = lose a life.
• Combo for catching several sweets in a row; a "sugar rush" power-up doubles points briefly.
• Fall speed & density rise over time; occasional candy-rain bonus burst.

CONTROLS: move horizontally with mouse / ←→ / touch-drag.
UI: score, lives, combo, power-up status, best score.
ART: pastel candy-land, bouncing sweets, sparkle on catch, cute basket, confetti on combo.

${TECH}

${DEVCARD}`
  }
];

/* ============================================================
   ГЕНЕРАЦИЯ ИЗОБРАЖЕНИЙ — пресеты
   subject + scene + style → процедурная иллюстрация на canvas
   ============================================================ */
const IMAGE_PRESETS = [
  { id:'avocado',  emoji:'🥑', label:'Разговаривающий авокадо', subject:'avocado', scene:'kitchen', style:'cartoon',
    desc:'Милый авокадо с лицом, ручками и улыбкой — рассказывает рецепт.' },
  { id:'dogspace', emoji:'🐶', label:'Собака в скафандре', subject:'dog', scene:'space', style:'cartoon',
    desc:'Пёс-космонавт в скафандре парит среди звёзд и планет.' },
  { id:'banana',   emoji:'🍌', label:'Танцующий банан', subject:'banana', scene:'stage', style:'cartoon',
    desc:'Банан-диджей под софитами на сцене.' },
  { id:'broccoli', emoji:'🥦', label:'Брокколи-супергерой', subject:'broccoli', scene:'city', style:'comic',
    desc:'Брокколи в плаще спасает город.' },
  { id:'catbeach', emoji:'🐱', label:'Кот на пляже', subject:'cat', scene:'beach', style:'cartoon',
    desc:'Кот в очках отдыхает на закатном пляже.' },
  { id:'strawberry', emoji:'🍓', label:'Клубника в космосе', subject:'strawberry', scene:'space', style:'cartoon',
    desc:'Клубника-астронавт среди галактик.' },
  { id:'robotjungle', emoji:'🤖', label:'Робот в джунглях', subject:'robot', scene:'jungle', style:'comic',
    desc:'Дружелюбный робот исследует джунгли.' },
  { id:'pepper', emoji:'🌶️', label:'Острый перчик-рокер', subject:'pepper', scene:'stage', style:'comic',
    desc:'Перчик чили с гитарой жжёт на сцене.' }
];

window.GAME_DATA = GAME_DATA;
window.IMAGE_PRESETS = IMAGE_PRESETS;
