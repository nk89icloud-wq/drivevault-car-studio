import {CARS, MAKES, fullName, findCar} from './catalog.js';
import {initGame} from './game.js';
import {loadCarPhoto} from './photos.js';
import {initCalendar} from './calendar.js';

const $ = id => document.getElementById(id);
const TYPES = [...new Set(CARS.map(c => c.type))].sort();
const defaults = {A: 0, B: 16};
let selected = {...defaults};
let toastTimer;
let gameController;

function options(el, values, label) {
  el.innerHTML = label ? `<option value="">${label}</option>` : '';
  values.forEach(v => el.insertAdjacentHTML('beforeend', `<option value="${v}">${v}</option>`));
}

function modelsFor(make) { return CARS.filter(c => c.make === make); }

function setupSelector(side) {
  const make = $(`make${side}`), model = $(`model${side}`), year = $(`year${side}`);
  options(make, MAKES);
  options(year, Array.from({length: 12}, (_, i) => 2026 - i));
  const initial = findCar(selected[side]);
  make.value = initial.make;
  fillModels(side, initial.id);
  year.value = 2026;
  make.addEventListener('change', () => { fillModels(side); selectCar(side, Number(model.value)); });
  model.addEventListener('change', () => selectCar(side, Number(model.value)));
}

function fillModels(side, preferred) {
  const make = $(`make${side}`).value;
  const cars = modelsFor(make);
  const model = $(`model${side}`);
  model.innerHTML = cars.map(c => `<option value="${c.id}">${c.model}</option>`).join('');
  model.value = preferred != null && cars.some(c => c.id === preferred) ? preferred : cars[0].id;
}

function selectCar(side, id, save = true) {
  const car = findCar(id);
  if (!car) return;
  selected[side] = car.id;
  $(`make${side}`).value = car.make;
  fillModels(side, car.id);
  $(`model${side}`).value = car.id;
  renderSelected(side);
  if (save) addHistory(side, car);
  resetRace();
}

function renderSelected(side) {
  const car = findCar(selected[side]);
  $(`visual${side}`).textContent = fullName(car).toUpperCase();
  showPhoto(side, car);
  $(`spec${side}`).innerHTML = [
    [`${car.hp}`, 'АТ КҮШІ'], [`${car.torque}`, 'Н·М'], [`${car.zero} сек`, '0–100'], [`${car.weight}`, 'КГ']
  ].map(([v,l]) => `<div><b>${v}</b><span>${l}</span></div>`).join('');
}

const photoToken = {A: 0, B: 0};
async function showPhoto(side, car) {
  const token = ++photoToken[side], visual = $(`visual${side}`).parentElement, img = $(`photo${side}`), credit = $(`credit${side}`), state = $(`state${side}`);
  visual.classList.remove('has-photo'); visual.classList.add('loading'); img.hidden = true; credit.hidden = true; state.textContent = 'Фото ізделуде…';
  const ph = await loadCarPhoto(car);
  if (token !== photoToken[side]) return;
  visual.classList.remove('loading');
  if (!ph) { state.textContent = 'Фото табылмады'; return; }
  state.textContent = ''; img.src = ph.img.src; img.alt = fullName(car); img.hidden = false; visual.classList.add('has-photo');
  credit.textContent = `Фото: Wikipedia · ${ph.title}`; credit.href = ph.page; credit.hidden = false;
}

function showToast(text) {
  const el = $('toast'); el.textContent = text; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2300);
}

function getHistory() {
  try { return JSON.parse(localStorage.getItem('drivevault-history')) || []; } catch { return []; }
}

function addHistory(side, car) {
  const history = getHistory();
  history.unshift({key: `${Date.now()}-${Math.random()}`, carId: car.id, side, year: Number($(`year${side}`).value || 2026), time: new Date().toISOString()});
  localStorage.setItem('drivevault-history', JSON.stringify(history.slice(0, 30)));
  renderHistory();
  showToast(`${fullName(car)} — ${side} орнына таңдалды`);
}

function renderHistory() {
  const history = getHistory(), el = $('historyList');
  if (!history.length) { el.innerHTML = '<div class="empty">Таңдау тарихы әзірше бос. Каталогтан көлік таңдап көр.</div>'; return; }
  el.innerHTML = history.map(h => {
    const car = findCar(h.carId); if (!car) return '';
    const time = new Intl.DateTimeFormat('kk-KZ',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(h.time));
    return `<article class="history-item"><span class="history-badge">${h.side}</span><div><h3>${fullName(car)}</h3><p>${h.year} · ${car.hp} а.к. · ${car.type}</p></div><time>${time}</time><button data-restore="${car.id}" data-side="${h.side}">Қайта таңдау</button></article>`;
  }).join('');
}

function renderCatalog() {
  const q = $('search').value.trim().toLocaleLowerCase('kk');
  const make = $('makeFilter').value, type = $('typeFilter').value;
  const filtered = CARS.filter(c => (!q || fullName(c).toLocaleLowerCase('kk').includes(q)) && (!make || c.make === make) && (!type || c.type === type));
  $('catalogCount').textContent = `${filtered.length} модель көрсетілді`;
  $('catalogGrid').innerHTML = filtered.map(c => `<article class="catalog-card"><span class="type">${c.type}</span><h3>${c.make}<br>${c.model}</h3><div class="mini-specs"><span><b>${c.hp}</b>а.к.</span><span><b>${c.zero} с</b>0–100</span><span><b>${c.weight}</b>кг</span></div><div class="choose-row"><button data-choose="${c.id}" data-side="A">A орнына</button><button data-choose="${c.id}" data-side="B">B орнына</button></div></article>`).join('') || '<div class="empty">Сұраныс бойынша көлік табылмады.</div>';
}

function resetRace() {
  gameController?.reset();
}

function init() {
  setupSelector('A'); setupSelector('B'); renderSelected('A'); renderSelected('B');
  options($('makeFilter'), MAKES, 'Барлық марка'); options($('typeFilter'), TYPES, 'Барлық кузов');
  renderCatalog(); renderHistory();
  ['search','makeFilter','typeFilter'].forEach(id => $(id).addEventListener(id === 'search' ? 'input' : 'change', renderCatalog));
  $('clearFilters').onclick = () => { $('search').value=''; $('makeFilter').value=''; $('typeFilter').value=''; renderCatalog(); };
  $('catalogGrid').onclick = e => { const b=e.target.closest('[data-choose]'); if(b){ selectCar(b.dataset.side, Number(b.dataset.choose)); document.querySelector('#studio').scrollIntoView(); } };
  $('historyList').onclick = e => { const b=e.target.closest('[data-restore]'); if(b){ selectCar(b.dataset.side, Number(b.dataset.restore)); document.querySelector('#studio').scrollIntoView(); } };
  $('clearHistory').onclick = () => { localStorage.removeItem('drivevault-history'); renderHistory(); showToast('Таңдау тарихы тазартылды'); };
  $('swap').onclick = () => { const a=selected.A,b=selected.B; selectCar('A',b,false); selectCar('B',a,false); showToast('Көліктердің орны ауыстырылды'); };
  gameController = initGame(() => ({A: findCar(selected.A), B: findCar(selected.B)}));
  window.__dv = gameController;
  initCalendar({byId: findCar, select: (a, b, n) => { selectCar('A', a, false); selectCar('B', b, false); showToast(`${n}-күн: ${fullName(findCar(a))} vs ${fullName(findCar(b))}`); document.querySelector('#studio').scrollIntoView({behavior: 'smooth'}); }});
  document.querySelectorAll('.open-catalog').forEach(b => b.onclick = () => { document.querySelector('#catalog').scrollIntoView(); showToast(`${b.dataset.target} орнына көлік таңдаңыз`); });
  $('soundToggle').onclick = e => { e.currentTarget.classList.toggle('on'); showToast(e.currentTarget.classList.contains('on') ? 'Дыбыс қосылды' : 'Дыбыс өшірілді'); };
  document.querySelectorAll('[id^=year]').forEach(el => el.onchange = () => addHistory(el.id.slice(-1), findCar(selected[el.id.slice(-1)])));
}

init();
