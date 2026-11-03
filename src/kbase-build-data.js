const fs = require('fs');
const path = require('path');

const chars = require('./geroi.js');
const cards = require('./cards.json');
const contextBlocks = require('./kbase-context.js');

// --- normalize cards ---
const cardsNorm = cards.map(c => {
  const id = c.title.match(/С-\d+/)[0];
  const themeMatch = c.theme.match(/^(.+?)(?: \(доп\.:\s*(.+)\))?$/);
  return {
    id,
    title: c.title.replace(/^С-\d+\.\s*/, ""),
    where: c.where,
    themeMain: (themeMatch ? themeMatch[1] : c.theme).trim(),
    themeExtra: themeMatch && themeMatch[2] ? themeMatch[2].split(',').map(s => s.trim()) : [],
    what: c.what.replace(/\s+/g, ' ').trim(),
    quote: c.quote.replace(/\s+/g, ' ').trim(),
    lesson: c.lesson.replace(/\s+/g, ' ').trim(),
    question: c.question.replace(/\s+/g, ' ').trim(),
  };
});
const byId = {};
cardsNorm.forEach(c => byId[c.id] = c);

// --- normalize characters ---
const charsNorm = chars.map(ch => {
  const cases = ch.cases.filter(id => byId[id]).map(id => {
    const c = byId[id];
    return { id, title: c.title, themeMain: c.themeMain };
  });
  return {
    id: slug(ch.name),
    num: ch.num,
    name: ch.name,
    role: ch.role,
    tagline: ch.tagline,
    appearance: ch.appearance,
    demo: ch.demo,
    position: ch.position,
    education: ch.education,
    powers: ch.powers,
    strong: ch.strong,
    weak: ch.weak,
    relations: ch.relations,
    cases,
    personal: ch.personal,
    quote: ch.quote,
    profile: ch.profile,
    unknown: ch.unknown,
  };
});
const charByName = {};
charsNorm.forEach(ch => charByName[ch.name] = ch);

// --- normalize context ---
const ctxNorm = contextBlocks.map(b => ({
  ...b,
  caseRefs: b.cases.filter(id => byId[id]).map(id => ({
    id,
    title: byId[id].title,
    themeMain: byId[id].themeMain,
  })),
}));

// check for missing case refs
const missing = [];
contextBlocks.forEach(b => b.cases.forEach(id => { if (!byId[id]) missing.push(`ctx ${b.id}: ${id}`); }));
chars.forEach(ch => ch.cases.forEach(id => { if (!byId[id]) missing.push(`char ${ch.name}: ${id}`); }));
console.log('cards:', cardsNorm.length, 'chars:', charsNorm.length, 'ctx:', ctxNorm.length);
console.log('missing refs:', missing.length ? missing.join('; ') : 'none');

fs.writeFileSync(path.join(__dirname, 'kbase-data.json'), JSON.stringify({
  cards: cardsNorm,
  characters: charsNorm,
  context: ctxNorm,
}, null, 1), 'utf8');
console.log('wrote kbase-data.json', fs.statSync(path.join(__dirname, 'kbase-data.json')).size, 'bytes');

function slug(s) {
  const map = {
    'Мел Бейкерсфелд': 'mel-bakersfeld',
    'Таня Ливингстон': 'tanya-livingston',
    'Вернон Димирест': 'demerest',
    'Джо Патрони': 'patroni',
    'Кит Бейкерсфелд': 'keith-bakersfeld',
    'Гвен Мейген': 'gwen-meighen',
    'Синди Бейкерсфелд': 'cindy-bakersfeld',
    'Дэнни Фэрроу': 'danny-farrow',
    'Ингрем': 'ingram',
    'Лейтенант Нед Ордвей': 'ned-ordway',
    'Д. О. Герреро': 'guerrero',
    'Инес Герреро': 'inez-guerrero',
    'Ада Квонсетт': 'ada-quonsett',
    'Маркус Расбоун': 'marcus-rathbone',
    'Эллиот Фримантл': 'elliot-fremantle',
    'Пэтси Смит': 'patsy-smith',
    'Уилл': 'will',
    'Пресса и телевидение': 'press-tv'
  };
  return map[s] || s.toLowerCase()
    .replace(/[^a-z0-9\s-]/gi, '')
    .trim()
    .replace(/\s+/g, '-')
    || 'hero';
}