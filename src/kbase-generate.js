const fs = require('fs');
const path = require('path');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'kbase-data.json'), 'utf8'));
const STYLE = fs.readFileSync(path.join(__dirname, 'styles.css'), 'utf8').replace(/^\uFEFF/, '');

// portraits for hero dossier cards (base64, optional)
const imgDir = path.join(__dirname, 'assets', 'heroes');
const HERO_IMG = {};
if (fs.existsSync(imgDir)) {
  fs.readdirSync(imgDir).filter(f => /\.(jpe?g|png)$/i.test(f)).forEach(f => {
    const key = f.replace(/\.(jpe?g|png)$/i, '');
    const mime = /\.png$/i.test(f) ? 'image/png' : 'image/jpeg';
    HERO_IMG[key] = 'data:' + mime + ';base64,' + fs.readFileSync(path.join(imgDir, f)).toString('base64');
  });
}
console.log('portraits:', Object.keys(HERO_IMG).length, 'total kbytes:', Math.round(Object.values(HERO_IMG).reduce((a, s) => a + s.length, 0) / 1024));

// cover art for the home page
const coverFile = path.join(__dirname, 'assets', 'cover-airport-70s.jpg');
const COVER = fs.existsSync(coverFile) ? 'data:image/jpeg;base64,' + fs.readFileSync(coverFile).toString('base64') : '';

// ---- helpers for classification ----
const themesMain = ['Управление конфликтами','Лидерство','Корпоративная культура','Эффективные коммуникации','Клиентский сервис','Управление бизнес-процессами','Проектное управление','Обучение персонала','Делегирование','Оперативный штаб','Командообразование','Сотрудники и команда','Принятие решений','Ответственность','Риск и прибыль'];

const themeIcons = {
  'Управление конфликтами': '⚔',
  'Лидерство': '★',
  'Корпоративная культура': '♪',
  'Эффективные коммуникации': '✉',
  'Клиентский сервис': '✆',
  'Управление бизнес-процессами': '⚙',
  'Проектное управление': '△',
  'Обучение персонала': '✎',
  'Делегирование': '↦',
  'Оперативный штаб': '◉',
  'Командообразование': '◈',
  'Сотрудники и команда': '☺',
  'Принятие решений': '◆',
  'Ответственность': '⚑',
  'Риск и прибыль': '₽',
};

// counts
const themeCount = {};
data.cards.forEach(c => { themeCount[c.themeMain] = (themeCount[c.themeMain] || 0) + 1; });

// add hero names per case (links)
const caseHeroes = {};
data.characters.forEach(ch => {
  ch.cases.forEach(c => {
    if (!caseHeroes[c.id]) caseHeroes[c.id] = [];
    caseHeroes[c.id].push({ id: ch.id, name: ch.name });
  });
});
const heroByName = {};
data.characters.forEach(ch => heroByName[ch.name] = ch);

// context links: which cases belong to which context blocks; also character links per context (any case of char in ctx cases)
data.context.forEach(ctx => {
  ctx.heroRefs = [];
  data.characters.forEach(ch => {
    const overlap = ch.cases.filter(c => ctx.cases.includes(c.id));
    if (overlap.length) ctx.heroRefs.push({ id: ch.id, name: ch.name, n: overlap.length });
  });
});

// estimated reading time per case (what+lesson+question)
const rt = t => Math.max(1, Math.round(t.length / 900));

const json = JSON.stringify(data).replace(/<\/script/gi, '<\\/script');

// theme blurbs (needed before template build)
const THEME_BLURBS = {
  'Управление конфликтами':'Столкновения интересов до того, как они стали скандалом.',
  'Лидерство':'Влияние без приказа и ответственность за результат.',
  'Корпоративная культура':'Правила, которые действуют на самом деле.',
  'Эффективные коммуникации':'Что и как слышат люди: инструктаж, новости, речь.',
  'Клиентский сервис':'Обслуживание человека в сбое: ожидания и честность.',
  'Управление бизнес-процессами':'Потоки, приоритеты, узкие места и ручное вмешательство.',
  'Проектное управление':'Решения о будущем, которые переживают сегодня.',
  'Обучение персонала':'Как знание появляется до кризиса.',
  'Делегирование':'Где кончается ваша задача и начинается чужая.',
  'Оперативный штаб':'Центр решений в первые часы сбоя.',
  'Командообразование':'Что превращает группу специалистов в команду.',
  'Сотрудники и команда':'Люди как ресурс и как цена: выгорание, доверие.',
  'Принятие решений':'Выбор под неполной информацией и давлением.',
  'Ответственность':'Кто отвечает, когда формально никто не виноват.',
  'Риск и прибыль':'Цена безопасности, скорости и репутации.'
};
function themeBlurb(t){ return THEME_BLURBS[t]||''; }

// precomputed theme options/grid (avoid nested ${} inside template literals)
const escN = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const themeOptions = Object.entries(themeCount).map(([t, c]) =>
  '<option value="#/cases?theme=' + encodeURIComponent(t) + '">' + escN(t) + ' — ' + c + '</option>'
).join('');
const themeGrid = Object.entries(themeCount).map(([t, c]) =>
  `<a class="card" style="cursor:pointer" href="#/cases?theme=${encodeURIComponent(t)}"><div class="ttl">${themeIcons[t]||''} ${escN(t)}</div><div class="meta">${c} эпизод(ов)</div><div class="ex">${themeBlurb(t)}</div></a>`
).join('');

const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="Управленческий детектив по роману «Аэропорт»: вы — инспектор комиссии. 142 эпизода, 18 личных дел и материалы эпохи, чтобы оценить решения и ответственность действующих лиц.">
<meta name="theme-color" content="#17120c">
<title>Артур Хейли · «Аэропорт» — дело № 11-67</title>
<style>
${STYLE}
</style>
</head>
<body>
<header class="topbar">
  <div class="wrap">
    <div class="brand">Артур Хейли · «Аэропорт»<span class="small">Дело № 11-67: Аэропорт Линкольна · комиссия по расследованию происшествия</span></div>
    <nav class="topnav">
      <a href="#/" data-nav="home">Дело</a>
      <a href="#/context" data-nav="context">Контекст</a>
      <a href="#/heroes" data-nav="heroes">Участники</a>
      <a href="#/cases" data-nav="cases">Эпизоды</a>
    </nav>
  </div>
</header>

<div class="ticker" aria-hidden="true"><div class="ticker-track">Ночь пятницы · метель · <b>142 эпизода</b> · 18 личных дел · 9 блоков обстановки · аэропорт Линкольна · дело № 11-67 · ночь пятницы · метель · <b>142 эпизода</b> · 18 личных дел · 9 блоков обстановки · аэропорт Линкольна · дело № 11-67 ·&nbsp;</div></div>

<div id="app"><h1 style="padding:60px 20px;text-align:center;color:#6e6a60">Дело об аэропорте Линкольна</h1><noscript><div class="wrap" style="padding:20px">Для работы с материалами дела включите JavaScript.</div></noscript></div>

<footer class="footer"><div class="wrap">
  <div><b>Дело № 11-67</b> · управленческий детектив книжного клуба</div>
  <div class="next">Дело не закрыто…</div>
  <div class="author">Автор идеи — Чистяков Филипп · @phichi84</div>
</div></footer>

<script>
const DATA = ${json};
window.DATA = DATA;

const HIMG = ${JSON.stringify(HERO_IMG)};
const SHORT = {
  'mel-bakersfeld':['Мел'],
  'tanya-livingston':['Таня'],
  'demerest':['Вернон','Димирест'],
  'patroni':['Патрони','Джо'],
  'keith-bakersfeld':['Кит','Кейз'],
  'gwen-meighen':['Гвен'],
  'cindy-bakersfeld':['Синди'],
  'danny-farrow':['Фэрроу','Дэнни'],
  'ingram':['Ингрем'],
  'ned-ordway':['Ордвей','Нед'],
  'guerrero':['Герреро'],
  'inez-guerrero':['Инес'],
  'ada-quonsett':['Квонсетт','Ада'],
  'marcus-rathbone':['Расбоун','Маркус'],
  'elliot-fremantle':['Фримантл'],
  'patsy-smith':['Пэтси'],
  'will':['Уилл'],
  'press-tv':['Томлинсон','Иден']
};

const TICONS = ${JSON.stringify(themeIcons)};

/* ---------- utils ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const heroName = id => (DATA.characters.find(h => h.id === id) || {name:id}).name;
const caseHeroes = {};
DATA.characters.forEach(h => (h.cases||[]).forEach(c => { (caseHeroes[c.id] = caseHeroes[c.id] || []).push({id:h.id,name:h.name}); }));
const heroLink = h => '<a href="#/hero/'+esc(h.id)+'">'+esc(h.name)+'</a>';
const ctxOfCase = cid => DATA.context.filter(x => (x.cases||[]).includes(cid));
const rt = txt => Math.max(1, Math.round((txt||'').length/900));
const themeTag = (t, extra) => {
  const ic = TICONS[t] || '';
  let out = '<span class="tag">'+esc(ic+' '+t)+'</span>';
  (extra||[]).forEach(e => out += '<span class="tag">'+esc(TICONS[e]||'• ')+' '+esc(e)+'</span>');
  return out;
};

/* ---------- views ---------- */
function home(){
  return \`
  <div class="hero"><div class="wrap">
    <div class="cover-top">
      <div class="cover-copy">
        <div class="issue-line"><span class="issue">Дело № 11-67</span><span class="price">Конфиденциально</span><span class="pub">Расследование комиссии совета директоров и городских властей</span></div>
        <h1>Ночь, за которую кто-то должен ответить</h1>
        <p>Пятница, метель, застрявший на полосе «Боинг-707». Комиссия, назначенная советом директоров аэропорта и городскими властями, разбирает, что произошло в аэропорту Линкольна. Вы — инспектор комиссии: вам предстоит оценить качество управленческих решений действующих лиц и меру их ответственности. В деле 142 эпизода, 18 личных дел участников и материалы эпохи.</p>
        <div class="chips">
          <span class="chip"><b>142</b> эпизода</span>
          <span class="chip"><b>18</b> личных дел</span>
          <span class="chip"><b>15</b> направлений проверки</span>
          <span class="chip"><b>9</b> блоков контекста</span>
          <span class="chip"><b>1</b> ночь</span>
        </div>
        <div class="issue-index">
          <div class="ih">В материалах дела</div>
          <a href="#/context">Контекст: 1950–1973</a>
          <a href="#/heroes">18 личных дел: кто принимал решения</a>
          <a href="#/cases">142 эпизода: одна ночь, 15 направлений</a>
        </div>
      </div>
      <div class="cover-art">
        <span class="stamp">Аэропорт Линкольна · 1967</span>
        <img src="${COVER}" alt="Ночной аэропорт в снежную бурю — обложка в стиле комикса">
        <div class="caption">Пятница. Метель. Одна полоса. Восемьдесят тысяч пассажиров. Вопрос один: кто отвечает?</div>
        <div class="burst">142<br>эпизода</div>
      </div>
    </div>
  </div></div>

  <section><div class="wrap">
    <div class="sec-head">
      <h2>Как идёт расследование</h2>
      <div class="sub">Комиссия изучает контекст ситуации, действующих лиц и эпизоды с их участием. Изучите всё в удобном для вас порядке и составьте свои выводы о компетентности лиц, принимавших решения.</div>
    </div>
    <div class="grid">
      <div class="card ctx-card">
        <div class="ttl">Контекст — что было до ночи</div>
        <div class="meta">9 блоков · 1950–1973</div>
        <div class="ex">Авиация росла быстрее инфраструктуры, защиты от угонов ещё не было, на подходе были лайнеры нового класса. Без этого нельзя судить решения той ночи.</div>
        <a class="btn" href="#/context">К контексту</a>
      </div>
      <div class="card char-card">
        <div class="ttl">Участники — кто принимал решения</div>
        <div class="meta">18 личных дел</div>
        <div class="ex">Управляющий, диспетчер, механик, стюардесса, адвокат, безбилетница. Должность, полномочия, компетенции и личные обстоятельства — всё, что объясняет поступки.</div>
        <a class="btn" href="#/heroes">К личным делам</a>
      </div>
      <div class="card case-card">
        <div class="ttl">Эпизоды — что именно произошло</div>
        <div class="meta">142 эпизода · 15 направлений</div>
        <div class="ex">Каждый эпизод — момент выбора: что произошло, дословная цитата, вывод и вопрос комиссии. Эпизоды связаны с лицами и контекстом.</div>
        <a class="btn warm" href="#/cases">К эпизодам</a>
      </div>
    </div>
    <div class="note-call"><b>Материалы связаны между собой:</b> из эпизода можно перейти к его участникам, из личного дела — к эпизодам и контексту. Порядок изучения выбирает инспектор.</div>
  </div></section>

  <section class="alt"><div class="wrap">
    <div class="sec-head"><h2>Почему это детектив, а не учебник</h2></div>
    <div class="grid two">
      <div class="card"><div class="ttl">Решения видны с последствиями</div><div class="ex">В отличие от учебника, здесь результат решения виден через несколько глав — и его нельзя «откатить».</div></div>
      <div class="card"><div class="ttl">Власть без приказа</div><div class="ex">Управляющий аэропортом не командует диспетчерами и авиакомпаниями — только влияет. Это матричная структура в чистом виде.</div></div>
      <div class="card"><div class="ttl">Отрасль на переломе</div><div class="ex">Роман застаёт момент, когда старые терминалы задыхаются, а на подходе — самолёты на 400–1000 мест. Многие эпизоды — о цене отложенных решений.</div></div>
      <div class="card"><div class="ttl">Срез реальных проблем</div><div class="ex">Угоны, бомбы ради страховки, «зайцы», перегрузка диспетчеров — не выдумка, а повестка отрасли 1968 года.</div></div>
    </div>
  </div></section>

  <section><div class="wrap">
    <div class="sec-head"><h2>15 направлений проверки</h2><div class="sub">Каждый эпизод размечен по направлению — так комиссия видит, где именно проседало управление. Переход к отфильтрованным эпизодам проставлен автоматически.</div></div>
    <div class="selects" style="margin-bottom:14px"><select id="homeThemeSel">${themeOptions}</select></div>
    <div class="grid">${themeGrid}</div>
  </div></section>
  \`;
}

function themeBlurb(t){
  const b={
    'Управление конфликтами':'Столкновения интересов до того, как они стали скандалом.',
    'Лидерство':'Влияние без приказа и ответственность за результат.',
    'Корпоративная культура':'Правила, которые действуют на самом деле.',
    'Эффективные коммуникации':'Что и как слышат люди: инструктаж, новости, речь.',
    'Клиентский сервис':'Обслуживание человека в сбое: ожидания и честность.',
    'Управление бизнес-процессами':'Потоки, приоритеты, узкие места и ручное вмешательство.',
    'Проектное управление':'Решения о будущем, которые переживают сегодня.',
    'Обучение персонала':'Как знание появляется до кризиса.',
    'Делегирование':'Где кончается ваша задача и начинается чужая.',
    'Оперативный штаб':'Центр решений в первые часы сбоя.',
    'Командообразование':'Что превращает группу специалистов в команду.',
    'Сотрудники и команда':'Люди как ресурс и как цена: выгорание, доверие.',
    'Принятие решений':'Выбор под неполной информацией и давлением.',
    'Ответственность':'Кто отвечает, когда формально никто не виноват.',
    'Риск и прибыль':'Цена безопасности, скорости и репутации.'
  };
  return b[t]||'';
}

function contextList(){
  const blocks = DATA.context;
  return \`
  <div class="hero hero--blue"><div class="wrap">
    <div class="kicker">Материалы дела · контекст</div>
    <h1>Контекст: 1950–1973</h1>
    <p>Чтобы судить решения той ночи, комиссия изучает условия: авиация росла быстрее инфраструктуры, на подходе были самолёты нового класса, защиты от угонов и взрывов ещё не существовало. Контекст объясняет почти каждый эпизод. Без этого нельзя отличить ошибку от цены системы.</p>
  </div></div>
  <section><div class="wrap">
    <div class="grid">
      \${blocks.map((b,i) => \`
        <div class="card ctx-card">
          <span class="idx">0\${i+1}</span>
          <div class="ttl">\${esc(b.title)}</div>
          <div class="meta">\${esc(b.period)} · \${b.caseRefs.length} эпизод(ов)</div>
          <div class="ex">\${esc(b.lead)}</div>
          <a class="btn" href="#/context/\${esc(b.id)}">Изучить</a>
        </div>
      \`).join('')}
    </div>
  </div></section>
  <section class="alt"><div class="wrap">
    <div class="sec-head"><h2>Как контекст объясняет эпизоды</h2></div>
    <div class="note-call">Пример: эпизод <a href="#/case/С-15">«Аэропорт под самолёт, которого ещё нет»</a> становится понятным только вместе с материалами <a href="#/context/ctx-jumbo">«Джамбо и сверхзвуковые»</a>: пока Мел три года доказывал Совету необходимость новой полосы, Boeing уже заказал лайнеры в 2,5 раза больше 707-го.</div>
  </div></section>
  \`;
}

function contextDetail(id){
  const b = DATA.context.find(x => x.id === id);
  if(!b) return notFound();
  const heroes = b.heroRefs || [];
  return \`
  <div class="wrap" style="padding-top:24px">
    <a class="back" href="#/context">← Весь контекст</a>
    <div class="detail">
      <div class="kicker-plain">\${esc(b.period)}</div>
      <h1>\${esc(b.title)}</h1>
      <p class="lead">\${esc(b.lead)}</p>
      <h2>Ключевые факты</h2>
      <ul>\${b.facts.map(f=>'<li>'+esc(f)+'</li>').join('')}</ul>
      <div class="note-call">\${esc(b.note)}</div>
      <h2>Эпизоды этого контекста</h2>
      <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(260px,1fr))">
        \${b.caseRefs.map(c=>\`<a class="card case-card" href="#/case/\${esc(c.id)}"><span class="case-tag">\${esc(c.id)}</span><div class="ttl">\${esc(c.title)}</div><div class="meta">\${esc(c.themeMain)}</div><div class="ex">\${esc(cut(c.id))}</div></a>\`).join('')}
      </div>
      <h2>Участники, связанные с этим контекстом</h2>
      \${heroes.length ? '<div class="linkrow">'+heroes.map(h=>'<a class="pill" href="#/hero/'+esc(h.id)+'">'+esc(h.name)+' · '+h.n+'</a>').join('')+'</div>' : '<div class="empty">Прямых связей с участниками дела не отмечено.</div>'}
    </div>
  </div>
  \`;
}
function cut(id){ const c = DATA.cards.find(x=>x.id===id); return c ? (c.what.length>110? c.what.slice(0,110)+'…' : c.what) : ''; }

function heroesList(){
  return \`
  <div class="comic-hero"><div class="wrap">
    <div class="kicker">18 личных дел · участники</div>
    <h1>Кто принимал решения в ту ночь</h1>
    <p>Комиссия собрала дела всех, кто был в аэропорту и в рейсе: от управляющего до безбилетницы. В каждом деле — должность, полномочия, компетенции, личные обстоятельства и связи. Читайте как показания: что человек мог, чего хотел и что сделал. Задача инспектора — понять, где граница его ответственности: кто настоящий герой, а кто бесцеремонно превысил свои полномочия.</p>
  </div></div>
  <section><div class="wrap">
    <div class="searchbox">
      <input id="heroSearch" placeholder="Найти участника…" aria-label="Поиск участника" oninput="renderHeroes(this.value)">
    </div>
    <div id="heroGrid" class="covers"></div>
  </div></section>
  \`;
}
function renderHeroes(q=''){
  const qq=q.toLowerCase().trim();
  const list = DATA.characters.filter(h => !qq || (h.name+' '+h.role+' '+h.tagline).toLowerCase().includes(qq));
  $('#heroGrid').innerHTML = list.map(h=>\`
    <a class="cover" href="#/hero/\${esc(h.id)}">
      <div class="shot">\${HIMG[h.id] ? '<img src="'+HIMG[h.id]+'" alt="'+esc(h.name)+' — '+esc(h.role)+'">' : ''}</div>
      \${HIMG[h.id] ? '' : '<div class="plate">'+esc(h.name)+'</div>'}
      <div class="under">
        <div class="n">Дело № \${h.num||''}</div>
        <div class="cnt">\${h.cases.length} эпизод(ов)</div>
      </div>
    </a>
  \`).join('') || '<div class="empty">Никого не нашли. Попробуйте иначе: «диспетчер», «управляющий», «адвокат».</div>';
}

function dbBlock(n, title, body, cls){
  return '<section class="db '+(cls||'')+'"><h3 class="db-h"><span class="db-n">'+n+'</span>'+title+'</h3>'+body+'</section>';
}

function heroDetail(id){
  const h = DATA.characters.find(x=>x.id===id);
  if(!h) return notFound();
  const caseList = h.cases.map(c=>c.id);
  const ctxs = DATA.context.filter(b => b.cases.some(cid => caseList.includes(cid)));
  const rel = DATA.characters.filter(o => o.id!==h.id && (SHORT[o.id]||[]).some(k => h.relations.indexOf(k)>=0));
  const relHtml = '<p>'+esc(h.relations)+'</p>' + (rel.length ? '<div class="linkrow">'+rel.map(o=>'<a class="pill accent" href="#/hero/'+esc(o.id)+'">'+esc(o.name)+'</a>').join('')+'</div>' : '');
  const compHtml = '<div class="comp">'
    + '<div class="comp-box plus"><div class="comp-lbl">Сильные стороны</div><div>'+esc(h.strong)+'</div></div>'
    + '<div class="comp-box minus"><div class="comp-lbl">Слабые стороны</div><div>'+esc(h.weak)+'</div></div>'
    + '</div>';
  return \`
  <div class="wrap" style="padding-top:22px">
    <a class="back" href="#/heroes">← Все участники</a>
  </div>
  <div class="wrap">
    <article class="dossier">
      <div class="dossier-top">
        <figure class="portrait">
          <span class="case-no">№ \${h.num||''}</span>
          <div class="ph">\${HIMG[h.id] ? '<img src="'+HIMG[h.id]+'" alt="'+esc(h.name)+'">' : ''}</div>
          <figcaption class="cap">Фото из дела № 11-67</figcaption>
        </figure>
        <div class="dossier-id">
          <h1 class="dname">\${esc(h.name)}</h1>
          <div class="pfile">Личное дело</div>
          <div class="drole">\${esc(h.role)}</div>
          \${h.tagline ? '<div class="dtag">'+esc(h.tagline)+'</div>' : ''}
          \${h.quote ? '<div class="quote-plate">'+esc(h.quote)+'</div>' : ''}
        </div>
      </div>
      <div class="dossier-body">
        \${dbBlock('01','Должность','<p>'+esc(h.position)+'</p>')}
        \${dbBlock('02','Внешность','<p>'+esc(h.appearance)+'</p><div class="demo">'+esc(h.demo)+'</div>')}
        \${dbBlock('03','Образование','<p>'+esc(h.education||'В тексте не указано.')+'</p>')}
        \${dbBlock('04','Полномочия','<p>'+esc(h.powers)+'</p>')}
        \${dbBlock('05','Компетенции', compHtml)}
        \${dbBlock('06','Личная жизнь','<p>'+esc(h.personal)+'</p>')}
        \${dbBlock('07','Связи с другими героями', relHtml)}
        \${dbBlock('08','Управленческий профиль','<p>'+esc(h.profile)+'</p>')}
        \${dbBlock('09','Чего нет в тексте','<p>'+esc(h.unknown||'—')+'</p>')}
      </div>
    </article>

    <div class="sec-head" style="margin-top:38px">
      <h2>Эпизоды дела (\${h.cases.length})</h2>
      <div class="sub">Моменты, где этот человек принимает решение, ошибается или отвечает за чужое.</div>
    </div>
    <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(270px,1fr))">
      \${h.cases.map(c=>\`<a class="card case-card" href="#/case/\${esc(c.id)}"><span class="case-tag">\${esc(c.id)}</span><div class="ttl">\${esc(c.title)}</div><div class="meta">\${esc(c.themeMain)}</div><div class="ex">\${esc(cut(c.id))}</div></a>\`).join('')}
    </div>
    <h2 style="margin-top:34px">Контекст, в котором принимались решения</h2>
    \${ctxs.length ? '<div class="linkrow">'+ctxs.map(x=>'<a class="pill" href="#/context/'+esc(x.id)+'">'+esc(x.title)+'</a>').join('')+'</div>' : '<div class="empty">Материалов контекста не отмечено.</div>'}
  </div>
  \`;
}

function casesList(params){
  const P = new URLSearchParams(params||'');
  const fTheme = P.get('theme') || '';
  return \`
  <div class="hero hero--warm"><div class="wrap">
    <div class="kicker">Эпизоды дела</div>
    <h1>142 эпизода одной ночи</h1>
    <p>Каждый эпизод — точка, где кто-то делал выбор. В карточке: что произошло, дословная цитата, вывод и вопрос для обсуждения. Задача инспектора — оценить, было ли решение обосновано полномочиями, временем и контекстом. Фильтруйте по направлению проверки, ищите по словам и переходите к участникам и контексту.</p>
  </div></div>
  <section><div class="wrap">
    <div class="searchbox">
      <input id="caseSearch" placeholder="Поиск по эпизодам…" aria-label="Поиск по эпизодам" oninput="renderCases()" value="">
      <div class="selects">
        <select id="themeFilter" aria-label="Направление" onchange="renderCases()">
          <option value="">Все направления</option>
          \${Object.keys(TICONS).map(t=>'<option value="'+esc(t)+'"'+(fTheme===t?' selected':'')+'>'+esc(t)+'</option>').join('')}
        </select>
      </div>
    </div>
    <div id="caseCount" class="gridcount"></div>
    <div id="caseGrid" class="grid"></div>
  </div></section>
  \`;
}
function renderCases(){
  const q = ($('#caseSearch')||{}).value || '';
  const ft = ($('#themeFilter')||{}).value || '';
  const qq = q.toLowerCase().trim();
  const list = DATA.cards.filter(c => {
    if(ft && c.themeMain !== ft) return false;
    if(!qq) return true;
    return (c.id+' '+c.title+' '+c.what+' '+c.lesson+' '+c.question+' '+c.themeMain).toLowerCase().includes(qq);
  });
  if($('#caseCount')) $('#caseCount').textContent = 'Показано: '+list.length+' из '+DATA.cards.length;
  if($('#caseGrid')) $('#caseGrid').innerHTML = list.map(c=>{
    const hs = caseHeroes[c.id] || [];
    return \`
      <a class="card case-card" href="#/case/\${esc(c.id)}">
        <span class="case-tag">\${esc(c.id)}</span>
        <div class="ttl">\${esc(c.title)}</div>
        <div class="meta">\${esc(c.where)}</div>
        \${themeTag(c.themeMain, c.themeExtra)}
        <div class="ex">\${esc(c.lesson)}</div>
        <div class="meta">\${hs.length ? 'Участники: '+hs.map(h=>esc(h.name)).join(', ') : ''}</div>
        <span class="btn warm">Разобрать эпизод</span>
      </a>
    \`;
  }).join('') || '<div class="empty">По такому запросу эпизодов нет. Попробуйте «конфликт», «безбилет», «полоса».</div>';
}

function caseDetail(id){
  const c = DATA.cards.find(x=>x.id===id);
  if(!c) return notFound();
  const hs = caseHeroes[id] || [];
  const ctxs = ctxOfCase(id);
  const len = rt(c.what+c.lesson);
  return \`
  <div class="wrap" style="padding-top:24px">
    <a class="back" href="#/cases">← Все эпизоды</a>
    <div class="detail">
      <div class="kicker-plain" style="color:var(--warm)">Эпизод \${esc(c.id)} · \${esc(c.where)}</div>
      <h1>\${esc(c.title)}</h1>
      <div class="linkrow" style="margin-top:8px">\${themeTag(c.themeMain, c.themeExtra)}<span class="pill">~\${len} мин чтения</span></div>
      <h2>Что произошло</h2>
      <p>\${esc(c.what)}</p>
      <blockquote>\u201C\${esc(c.quote)}\u201D</blockquote>
      <div class="field"><div class="fl">Вывод комиссии</div>\${esc(c.lesson)}</div>
      <div class="field"><div class="fl">Вопрос комиссии</div>\${esc(c.question)}</div>
      <h2>Кто участвовал в эпизоде</h2>
      \${hs.length ? '<div class="linkrow">'+hs.map(h=>'<a class="pill accent" href="#/hero/'+esc(h.id)+'">'+esc(h.name)+'</a>').join('')+'</div>' : '<div class="empty">Прямых участников не проставлено.</div>'}
      <h2>Контекст, который объясняет эпизод</h2>
      \${ctxs.length ? '<div class="linkrow">'+ctxs.map(x=>'<a class="pill" href="#/context/'+esc(x.id)+'">'+esc(x.title)+'</a>').join('')+'</div>' : '<div class="empty">Специальных материалов нет — эпизод объясняется самой сценой.</div>'}
    </div>
  </div>
  \`;
}

function notFound(){
  return '<div class="wrap" style="padding-top:60px"><div class="detail"><h1>Страница не найдена</h1><p>Перейдите на <a href="#/">главную</a> или к <a href="#/cases">эпизодам</a>.</p></div></div>';
}

/* ---------- router ---------- */
function parseHash(){
  const raw = location.hash.replace(/^#/, '') || '/';
  let h;
  try { h = decodeURIComponent(raw); } catch(e) { h = raw; }
  const [pathPart, query] = h.split('?');
  const seg = pathPart.split('/').filter(Boolean);
  return { seg, query: query||'', pathPart };
}
function route(){
  const { seg, query } = parseHash();
  const app = $('#app');
  const nav = ['home','context','heroes','cases'];
  const path = seg.length ? seg[0] : 'home';
  document.querySelectorAll('.topnav a').forEach(a=>a.classList.toggle('active', a.dataset.nav===path));

  let html;
  switch(path){
    case 'home': html = home(); break;
    case 'context':
      html = seg[1] ? contextDetail(seg[1]) : contextList(); break;
    case 'heroes':
      html = seg[1] ? heroDetail(seg[1]) : heroesList(); break;
    case 'cases':
      html = seg[1] ? caseDetail(seg[1]) : casesList(query); break;
    case 'hero': html = heroDetail(seg[1]); break;
    case 'case': html = caseDetail(seg[1]); break;
    default: html = notFound();
  }
  app.innerHTML = html;
  window.scrollTo(0,0);
  if(path==='heroes' && !seg[1]) renderHeroes();
  if(path==='cases' && !seg[1]) renderCases();
  if(path==='home'){
    const sel = $('#homeThemeSel');
    if(sel) sel.onchange = ()=> location.hash = sel.value;
  }
}
window.addEventListener('hashchange', route);
window.addEventListener('DOMContentLoaded', route);
window.route = route;
route();
</script>
</body>
</html>`;

fs.writeFileSync(path.join(__dirname, '..', 'index.html'), html, 'utf8');
console.log('wrote index.html', Buffer.byteLength(html, 'utf8'), 'bytes');