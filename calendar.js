// Контент-күнтізбе: күніне бір жұп, бірде-бір көлік қайталанбайды.
// Күнді басу — сол жұпты автоматты таңдайды. Видео жазылса — сары, YouTube-қа жүктелсе — жасыл.
import {CARS, fullName} from './catalog.js';

const KEY = 'drivevault-calendar-v1';
const MONTHS = ['Қаңтар', 'Ақпан', 'Наурыз', 'Сәуір', 'Мамыр', 'Маусым', 'Шілде', 'Тамыз', 'Қыркүйек', 'Қазан', 'Қараша', 'Желтоқсан'];
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fromIso = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };

/** Жоспар: hp бойынша сұрыптап, 8-дік топ ішінде араластырып, көршілерін жұптайды (әділ бәсеке, бірақ әр күн басқа). */
export function buildPlan() {
  let seed = 20260101; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const sorted = [...CARS].sort((a, b) => a.hp - b.hp || a.id - b.id), plan = [];
  for (let i = 0; i < sorted.length; i += 8) {
    const g = sorted.slice(i, i + 8);
    for (let k = g.length - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [g[k], g[j]] = [g[j], g[k]]; }
    for (let k = 0; k + 1 < g.length; k += 2) plan.push([g[k].id, g[k + 1].id]);
  }
  // жоспарды hp бойынша емес, араласқан күйде көрсету (бірінші күн әлсіз, соңғы күн күшті болмасын)
  for (let k = plan.length - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [plan[k], plan[j]] = [plan[j], plan[k]]; }
  return plan;
}

function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } }
function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* жад өшірулі */ } }

export function initCalendar({select, byId}) {
  const root = document.getElementById('calendarGrid'); if (!root) return;
  const plan = buildPlan(), st = load();
  st.start = st.start || iso(new Date()); st.status = st.status || {};
  const startEl = document.getElementById('calStart'), stats = document.getElementById('calStats');
  startEl.value = st.start;

  const dayOf = k => { const d = fromIso(st.start); d.setDate(d.getDate() + k); return d; };
  const find = (a, b) => plan.findIndex(p => (p[0] === a && p[1] === b) || (p[0] === b && p[1] === a));

  function render() {
    const first = fromIso(st.start), last = dayOf(plan.length - 1), today = iso(new Date());
    let html = '';
    for (let y = first.getFullYear(), m = first.getMonth(); y < last.getFullYear() || (y === last.getFullYear() && m <= last.getMonth()); m++) {
      if (m > 11) { m = 0; y++; }
      const lead = (new Date(y, m, 1).getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate();
      html += `<div class="cal-month"><h3>${MONTHS[m]} ${y}</h3><div class="cal-week">${['Дс', 'Сс', 'Ср', 'Бс', 'Жм', 'Сб', 'Жк'].map(w => `<span>${w}</span>`).join('')}</div><div class="cal-days">`;
      html += '<i></i>'.repeat(lead);
      for (let d = 1; d <= days; d++) {
        const dt = new Date(y, m, d), k = Math.round((dt - first) / 864e5);
        if (k < 0 || k >= plan.length) { html += `<div class="cal-day off"><b>${d}</b></div>`; continue; }
        const [a, b] = plan[k].map(byId), s = st.status[k] || 'plan';
        html += `<button class="cal-day ${s}${iso(dt) === today ? ' today' : ''}" data-k="${k}" title="${fullName(a)} vs ${fullName(b)}"><b>${d}</b><span>${a.make} ${a.model}</span><em>vs</em><span>${b.make} ${b.model}</span>${s === 'up' ? '<u>✓</u>' : s === 'rec' ? '<u>●</u>' : ''}</button>`;
      }
      html += '</div></div>';
    }
    root.innerHTML = html;
    const up = Object.values(st.status).filter(v => v === 'up').length, rec = Object.values(st.status).filter(v => v === 'rec').length;
    stats.textContent = `Жасыл (жүктелген): ${up} · Сары (жазылған): ${rec} · Қалғаны: ${plan.length - up - rec} · Барлығы ${plan.length} жұп, ${plan.length * 2} көлік қайталанбайды`;
  }

  root.onclick = e => {
    const b = e.target.closest('[data-k]'); if (!b) return;
    const [a, c] = plan[+b.dataset.k]; st.current = +b.dataset.k; save(st);
    select(a, c, +b.dataset.k + 1);
  };
  startEl.onchange = () => { if (startEl.value) { st.start = startEl.value; save(st); render(); } };
  document.getElementById('calNext').onclick = () => {
    const k = plan.findIndex((_, i) => st.status[i] !== 'up' && st.status[i] !== 'rec'); const t = k < 0 ? plan.findIndex((_, i) => st.status[i] !== 'up') : k;
    if (t < 0) return; st.current = t; save(st); select(...plan[t], t + 1);
  };
  document.getElementById('calReset').onclick = () => { if (confirm('Күнтізбедегі барлық белгілерді тазарту керек пе?')) { st.status = {}; save(st); render(); } };

  const mark = (status, ids) => {
    let k = ids ? find(ids[0], ids[1]) : -1; if (k < 0) k = st.current ?? -1; if (k < 0) return;
    if (st.status[k] === 'up' && status === 'rec') return; // жасылды төмендетпейміз
    st.status[k] = status; save(st); render();
  };
  document.addEventListener('dv:recorded', e => mark('rec', e.detail?.ids));
  document.addEventListener('dv:uploaded', e => mark('up', e.detail?.ids));
  render();
}
