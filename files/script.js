'use strict';
const $ = s => document.querySelector(s);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const PHONE = '+998 90 123 45 67';
const SLOTS = ['10:00–13:00', '13:00–16:00', '16:00–19:00'];

const art = (a, b, c) => `<svg viewBox="0 0 120 90" role="img" aria-label="Букет"><rect width="120" height="90" fill="${c}"/>
<path d="M60 88V48M60 72q-18-6-24-22M60 66q16-4 22-20" stroke="#3f7a52" stroke-width="3" fill="none" stroke-linecap="round"/>
<circle cx="40" cy="48" r="11" fill="${b}"/><circle cx="82" cy="46" r="12" fill="${b}"/>
<circle cx="60" cy="36" r="15" fill="${a}"/><circle cx="60" cy="36" r="5" fill="#ffffff88"/></svg>`;
const BQ = [
  {n:'Нежность',      p:'250 000', a:'#f08fac', b:'#f8c6d4', c:'#fdeef2'},
  {n:'Алая роза',     p:'320 000', a:'#d6334f', b:'#ee7b8f', c:'#fde6e9'},
  {n:'Весенний луг',  p:'180 000', a:'#f2c230', b:'#fbe58a', c:'#eef6e4'},
  {n:'Белое облако',  p:'290 000', a:'#ffffff', b:'#e4dff3', c:'#e8eff6'},
  {n:'Лавандовый сон',p:'210 000', a:'#8f6fcf', b:'#c4b2e8', c:'#f3eefb'},
  {n:'Солнечный день',p:'230 000', a:'#ff9440', b:'#ffcf86', c:'#fff3df'}
];

let S;

function fresh() { return {n:1000, o:{}, expect:null, gen:0}; }
function fmt(d) { return d.toLocaleDateString('ru-RU', {day:'2-digit', month:'2-digit', year:'numeric'}); }
function today() { const t = new Date(); t.setHours(0,0,0,0); return t; }
function scroll(el) { el.scrollTop = el.scrollHeight; }

function add(who, content) {
  const d = document.createElement('div');
  d.className = 'm ' + who;
  if (typeof content === 'string') d.textContent = content; else d.appendChild(content);
  const t = document.createElement('time');
  t.textContent = new Date().toLocaleTimeString('ru-RU', {hour:'2-digit', minute:'2-digit'});
  d.appendChild(t);
  $('#msgs').appendChild(d);
  scroll($('#msgs'));
  return d;
}
const user = text => add('me', text);

function lockNew() { return {dead:false, els:[]}; }
function btns(items, lock) {
  const w = document.createElement('div');
  w.className = 'btns';
  items.forEach(([label, fn]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.onclick = () => {
      if (lock.dead) return;
      lock.dead = true;
      lock.els.forEach(x => x.disabled = true);
      b.classList.add('picked');
      fn();
    };
    lock.els.push(b);
    w.appendChild(b);
  });
  $('#msgs').appendChild(w);
  scroll($('#msgs'));
}

async function bot(content, items, lock) {
  const g = S.gen;
  const t = document.createElement('div');
  t.className = 'typing';
  t.innerHTML = '<i></i><i></i><i></i>';
  $('#msgs').appendChild(t);
  scroll($('#msgs'));
  await sleep(550);
  t.remove();
  if (g !== S.gen) return new Promise(() => {});
  add('bot', content);
  if (items) btns(items, lock || lockNew());
}

function setExpect(x, placeholder) {
  S.expect = x;
  const i = $('#input');
  i.disabled = !x;
  i.placeholder = x ? (placeholder || 'Сообщение') : 'Выберите вариант выше';
  i.value = '';
  updateCounter();
  if (x) i.focus({preventScroll:true});
}
function setKbd(items) {
  const k = $('#kbd');
  k.innerHTML = '';
  if (!items) return;
  items.forEach(([label, fn]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.onclick = fn;
    k.appendChild(b);
  });
}
function updateCounter() {
  const c = $('#counter');
  if (S.expect !== 'card') { c.textContent = ''; c.className = ''; return; }
  const n = $('#input').value.length;
  c.textContent = n + '/200';
  c.className = n > 200 ? 'over' : '';
}

/* ---------- Сценарий покупателя ---------- */
async function start() {
  user('/start');
  await bot('Здравствуйте! Это цветочный магазин. Чем помочь?',
    [['Заказать букет', showCatalog], ['Связаться с флористом', contact]]);
}
async function contact() {
  await bot('Номер магазина: +998 71 200 00 00', [['Заказать букет', showCatalog]]);
}

async function showCatalog() {
  S.o = {};
  const lock = lockNew();
  for (const b of BQ) {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = art(b.a, b.b, b.c) + `<b>${esc(b.n)}</b><span>${esc(b.p)} сум</span>`;
    await bot(card, [['Выбрать', () => pick(b)]], lock);
  }
  await bot('Свой букет', [['Свой букет', ownBouquet]], lock);
}
function pick(b) { S.o.bouquet = `${b.n}, ${b.p} сум`; askReceive(); }
async function ownBouquet() {
  await bot('Напишите ваш бюджет');
  setExpect('budget', 'Например, 300 000 сум');
}

async function askReceive() {
  await bot('Как получить букет?', [
    ['Самовывоз', () => { S.o.delivery = false; askDate(); }],
    ['Доставка', async () => {
      S.o.delivery = true;
      await bot('Напишите адрес по городу');
      setExpect('address', 'Улица, дом, квартира');
    }]
  ]);
}

async function askDate() {
  await bot('На какую дату?', [
    ['Завтра', () => { const d = today(); d.setDate(d.getDate() + 1); setDate(d); }],
    ['Другая дата', askPicker]
  ]);
}
async function askPicker() {
  const w = document.createElement('div');
  w.className = 'pick';
  const i = document.createElement('input');
  i.type = 'date';
  i.setAttribute('aria-label', 'Дата');
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = 'Выбрать';
  b.onclick = async () => {
    if (!i.value) return;
    const d = new Date(i.value + 'T00:00');
    if (d <= today()) { await bot('Выберите дату не раньше завтрашнего дня'); return; }
    i.disabled = b.disabled = true;
    setDate(d);
  };
  w.append(i, b);
  await bot(w);
}
function setDate(d) { S.o.date = fmt(d); askTime(); }

async function askTime() {
  await bot('Выберите время', SLOTS.map(s => [s, () => { S.o.time = s; askCard(); }]));
}
async function askCard() {
  await bot('Добавить открытку?', [
    ['Да', async () => {
      await bot('Напишите текст открытки (до 200 знаков)');
      setExpect('card', 'Текст открытки');
    }],
    ['Нет', () => { S.o.card = null; askName(); }]
  ]);
}
async function askName() {
  await bot('Ваше имя?');
  setExpect('name', 'Ваше имя');
}
async function askPhone() {
  await bot('Поделитесь вашим номером телефона');
  setKbd([['Поделиться номером', onShare]]);
  setExpect('phone', 'Или напишите номер текстом');
}
async function onShare() {
  if (S.expect !== 'phone') return;
  setKbd(null);
  setExpect(null);
  S.o.phone = PHONE;
  user('📱 ' + PHONE);
  S.o.delivery ? askRName() : summary();
}
async function askRName() { await bot('Имя получателя?'); setExpect('rname', 'Имя получателя'); }
async function askRPhone() { await bot('Телефон получателя?'); setExpect('rphone', 'Телефон получателя'); }

function summaryText() {
  const o = S.o;
  const l = [
    'Ваш заказ:',
    'Букет: ' + o.bouquet,
    'Получение: ' + (o.delivery ? 'Доставка, ' + o.address : 'Самовывоз'),
    'Дата и время: ' + o.date + ', ' + o.time,
    'Открытка: ' + (o.card || 'нет'),
    'Заказчик: ' + o.name + ', ' + o.phone
  ];
  if (o.delivery) l.push('Получатель: ' + o.rname + ', ' + o.rphone);
  return l.join('\n');
}
async function summary() {
  await bot(summaryText(), [
    ['Подтвердить', confirmOrder],
    ['Изменить', async () => { await bot('Давайте изменим заказ.'); showCatalog(); }]
  ]);
}

async function confirmOrder() {
  const num = ++S.n;
  const order = {num, ...S.o, by:null};
  postOrder(order);
  const work = $('#timeMode').value === 'work';
  await bot(work
    ? `Заказ № ${num} принят. Флорист свяжется с вами в течение 30 минут`
    : `Заказ № ${num} принят. Флорист свяжется с вами завтра с 9:00`);
  await bot('Оплата: при получении или переводом после звонка флориста.');
}

/* ---------- Ввод текста ---------- */
$('#input').addEventListener('input', updateCounter);
$('#form').addEventListener('submit', async e => {
  e.preventDefault();
  const v = $('#input').value.trim();
  const x = S.expect;
  if (!v || !x) return;
  user(v);
  setExpect(null);
  const o = S.o;
  if (x === 'budget') { o.bouquet = 'Свой букет, бюджет: ' + v; askReceive(); }
  else if (x === 'address') { o.address = v; askDate(); }
  else if (x === 'card') {
    if (v.length > 200) { await bot('Сократите текст до 200 знаков'); setExpect('card', 'Текст открытки'); return; }
    o.card = v; askName();
  }
  else if (x === 'name') { o.name = v; askPhone(); }
  else if (x === 'phone') {
    await bot('Поделитесь номером телефона кнопкой «Поделиться номером». Без него оформить заказ нельзя');
    setExpect('phone', 'Или напишите номер текстом');
  }
  else if (x === 'rname') { o.rname = v; askRPhone(); }
  else if (x === 'rphone') { o.rphone = v; summary(); }
});

/* ---------- Группа флористов ---------- */
function toast(text) {
  const t = $('#toast');
  t.textContent = text;
  t.classList.add('show');
  clearTimeout(toast.id);
  toast.id = setTimeout(() => t.classList.remove('show'), 2600);
}
function postOrder(ord) {
  const box = $('#orders');
  const empty = box.querySelector('.empty');
  if (empty) empty.remove();
  const na = 'не требуется';
  const rows = [
    ['Букет / бюджет', ord.bouquet],
    ['Получение', ord.delivery ? 'Доставка' : 'Самовывоз'],
    ['Адрес', ord.delivery ? ord.address : na],
    ['Дата и интервал', ord.date + ', ' + ord.time],
    ['Открытка', ord.card || 'нет'],
    ['Заказчик', ord.name + ', ' + ord.phone],
    ['Получатель', ord.delivery ? ord.rname + ', ' + ord.rphone : na]
  ];
  const card = document.createElement('div');
  card.className = 'order';
  card.innerHTML = `<h3>Заказ № ${ord.num}</h3><dl>` +
    rows.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('') + '</dl>';
  const take = document.createElement('button');
  take.type = 'button';
  take.className = 'take';
  take.textContent = 'Беру';
  take.onclick = () => {
    const name = $('#florist').value;
    ord.by = name;
    take.remove();
    const st = document.createElement('div');
    st.className = 'taken';
    st.textContent = 'Заказ взял флорист ' + name;
    const demo = document.createElement('button');
    demo.type = 'button';
    demo.className = 'demo-btn';
    demo.textContent = 'Демо: нажать «Беру» за другого флориста';
    demo.onclick = () => toast('Заказ уже взят другим флористом');
    card.append(st, demo);
    add('bot', `Ваш заказ взял флорист ${name}`);
  };
  card.appendChild(take);
  box.appendChild(card);
  scroll(box);
}

/* ---------- Запуск и интерфейс ---------- */
function reset() {
  const gen = (S ? S.gen : 0) + 1;
  S = fresh();
  S.gen = gen;
  $('#msgs').innerHTML = '';
  $('#orders').innerHTML = '<p class="empty">Заявок пока нет</p>';
  setKbd(null);
  setExpect(null);
  start();
}
$('#reset').onclick = reset;
document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => {
  document.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('active', x === b));
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === b.dataset.tab));
});
reset();
