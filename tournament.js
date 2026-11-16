// Ұзақ видео: 8 көліктік турнир (чвертьфинал → жартылай финал → финал), бір видеоға жазылады, YouTube-қа ашық жүктеледі.
// Әр көліктің өз «ерекшелігі» бар (ең күшті, ең жеңіл, электр момент...), карточкалар ағылшынша (АҚШ аудиториясы үшін).
import {CARS, fullName, atYear, estimateQuarterMile} from './catalog.js?v=27';
import {drivetrainOf, isEV} from './physics.js?v=27';
import {loadCarPhoto, cachedPhoto} from './photos.js?v=27';
import {outroCard} from './outro.js?v=27';

// Фото: уақыт машинасында «(2026)» жұрнағын алып тастаймыз
const photoKey = c => ({...c, model: String(c.model).replace(/ \(\d{4}\)$/, '')});
const photoOf = c => cachedPhoto(photoKey(c))?.img || null;
const loadPhoto = (c, ms = 4500) => Promise.race([loadCarPhoto(photoKey(c)).catch(() => null), new Promise(r => setTimeout(() => r(null), ms))]);
function drawPhoto(ctx, img, x, y, w, h, r = 28) {
  if (!img) return false;
  ctx.save(); ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); ctx.clip();
  const sc = Math.max(w / img.naturalWidth, h / img.naturalHeight), dw = img.naturalWidth * sc, dh = img.naturalHeight * sc;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh); ctx.restore();
  ctx.save(); ctx.lineWidth = 6; ctx.strokeStyle = '#ffffff55'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); ctx.stroke(); ctx.restore(); return true;
}

const $ = id => document.getElementById(id);
const COLORS = ['#ff4d4d', '#ffb020', '#37d67a', '#2bb6ff', '#a66bff', '#ff6bd6', '#00e0c6', '#c9f03c'];
const USED_KEY = 'drivevault-tourn-used';
const MAKES = {
  cn: ['AITO', 'BAIC', 'BYD', 'Changan', 'Chery', 'DongFeng', 'EXEED', 'FAW', 'Foton', 'GAC', 'Geely', 'Geely Galaxy', 'Great Wall', 'Haval', 'Hongqi', 'JAC', 'Jaecoo', 'Jetour', 'Kaiyi', 'Li', 'Lifan', 'Lynk & Co', 'MG', 'OMODA', 'Tank', 'Voyah', 'Wuling', 'Zeekr', 'Deepal', 'Rox', 'Soueast', 'Avatr', 'Xiaomi', 'Xpeng', 'BAW', 'Denza', 'Leapmotor', 'DFSK', 'Wey', 'Roewe', 'HiPhi', 'Maextro', 'Jiyue', 'Radar', 'Ora', 'Hanteng', 'Zotye', 'Brilliance', 'Hozon (Neta)'],
  jp: ['Toyota', 'Nissan', 'Honda', 'Mazda', 'Subaru', 'Mitsubishi', 'Lexus', 'Infiniti', 'Suzuki', 'Daihatsu', 'Acura', 'Isuzu', 'Scion'],
  de: ['BMW', 'Mercedes-Benz', 'Audi', 'Porsche', 'Volkswagen', 'Opel', 'Mercedes-Maybach', 'Alpina', 'Mini'],
  us: ['Ford', 'Chevrolet', 'Dodge', 'Tesla', 'Cadillac', 'Jeep', 'Chrysler', 'Lincoln', 'RAM', 'GMC', 'Hummer', 'Rivian', 'Buick', 'Pontiac', 'Saturn', 'Mercury'],
  kr: ['Hyundai', 'Kia', 'Genesis', 'SsangYong', 'Daewoo'],
  eu: ['Ferrari', 'Lamborghini', 'McLaren', 'Maserati', 'Bentley', 'Rolls-Royce', 'Aston Martin', 'Lotus', 'Jaguar', 'Land Rover', 'Alfa Romeo', 'Peugeot', 'Renault', 'Citroen', 'Volvo', 'Skoda', 'SEAT', 'Fiat'],
  ru: ['ВАЗ (Lada)', 'ГАЗ', 'ЗАЗ', 'ИЖ', 'Москвич', 'УАЗ', 'Aurus', 'ВИС', 'ЗИЛ', 'ТагАЗ']
};
export const THEMES = {
  mix: {label: 'Аралас (кез келген)', title: '8 Random Cars', pool: () => CARS},
  cn: {label: 'Қытай көліктері', title: '8 Chinese Cars', pool: () => CARS.filter(c => MAKES.cn.includes(c.make))},
  cnev: {label: 'Қытай электрлері', title: '8 Chinese EVs', pool: () => CARS.filter(c => MAKES.cn.includes(c.make) && c.type === 'Электр')},
  jp: {label: 'Жапония', title: '8 Japanese Cars', pool: () => CARS.filter(c => MAKES.jp.includes(c.make))},
  de: {label: 'Германия', title: '8 German Cars', pool: () => CARS.filter(c => MAKES.de.includes(c.make))},
  us: {label: 'Америка', title: '8 American Cars', pool: () => CARS.filter(c => MAKES.us.includes(c.make))},
  kr: {label: 'Корея', title: '8 Korean Cars', pool: () => CARS.filter(c => MAKES.kr.includes(c.make))},
  eu: {label: 'Еуропа (Италия, Англия, Франция...)', title: '8 European Cars', pool: () => CARS.filter(c => MAKES.eu.includes(c.make))},
  ru: {label: 'КСРО / Ресей (Lada, УАЗ...)', title: '8 Soviet & Russian Cars', pool: () => CARS.filter(c => MAKES.ru.includes(c.make))},
  ev: {label: 'Барлық электрлер', title: '8 Electric Cars', pool: () => CARS.filter(c => c.type === 'Электр')},
  sport: {label: '🏎 Спорткарлар (спорткар, купе, родстер)', title: '8 Sports Cars', pool: () => CARS.filter(c => ['Спорткар', 'Купе', 'Родстер'].includes(c.type))},
  super: {label: 'Суперкарлар / гиперкарлар', title: '8 Supercars', pool: () => CARS.filter(c => ['Суперкар', 'Гиперкар'].includes(c.type) || (c.type === 'Спорткар' && c.hp >= 600))},
  sameclass: {label: '🎯 Бірдей класс (кездейсоқ класс таңдалады)', title: '8 Cars of the Same Class', pool: () => { const by = {}; CARS.forEach(c => { (by[c.type] ||= []).push(c); }); const ok = Object.values(by).filter(l => l.length >= 12); return ok[Math.floor(Math.random() * ok.length)]; }},
  sedan: {label: 'Седандар', title: '8 Sedans', pool: () => CARS.filter(c => c.type === 'Седан')},
  hatch: {label: 'Хэтчбектер', title: '8 Hatchbacks', pool: () => CARS.filter(c => c.type === 'Хэтчбек')},
  coupe: {label: 'Купелер', title: '8 Coupes', pool: () => CARS.filter(c => c.type === 'Купе')},
  pickup: {label: 'Пикаптар', title: '8 Pickup Trucks', pool: () => CARS.filter(c => c.type === 'Пикап')},
  wagon: {label: 'Универсал / лифтбектер', title: '8 Wagons & Liftbacks', pool: () => CARS.filter(c => ['Универсал', 'Лифтбек'].includes(c.type))},
  suv: {label: 'SUV / джиптер', title: '8 SUVs', pool: () => CARS.filter(c => c.type === 'SUV')},
  budget: {label: 'Қарапайым көліктер (әлсіз қуат)', title: '8 Everyday Cars', pool: () => CARS.filter(c => c.hp <= 200)}
};

function usedLoad() { try { return JSON.parse(localStorage.getItem(USED_KEY)) || []; } catch { return []; } }
function usedSave(ids) { try { localStorage.setItem(USED_KEY, JSON.stringify(ids.slice(-400))); } catch { /* жад жоқ */ } }

/** 8 көлікті таңдау: қуаты жақын (әділ), бір маркадан көп емес, бұрын қолданылмаған. */
export function pickEight(theme, n = 8) {
  const all = THEMES[theme].pool(), used = new Set(usedLoad());
  let pool = all.filter(c => !used.has(c.id)); if (pool.length < n) pool = all;
  if (pool.length < n) pool = CARS;
  const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  for (let spread = 1.7; spread < 8; spread *= 1.35) {
    for (let tries = 0; tries < 40; tries++) {
      const anchor = shuffle(pool)[0], near = shuffle(pool.filter(c => c.hp >= anchor.hp / spread && c.hp <= anchor.hp * spread && c.id !== anchor.id));
      const pick = [anchor], perMake = {[anchor.make]: 1};
      for (const c of near) { if ((perMake[c.make] || 0) >= 2) continue; pick.push(c); perMake[c.make] = (perMake[c.make] || 0) + 1; if (pick.length === n) break; }
      if (pick.length === n) return shuffle(pick);
    }
  }
  return shuffle(pool).slice(0, n);
}

/** Әр көлікке бірегей «ерекшелік» (шатаспау үшін): суперлатив немесе жетек/кузов ерекшелігі. */
export function buildTraits(cars) {
  const m = cars.map(c => ({c, ratio: c.hp / c.weight * 1000, ev: isEV(c), drive: drivetrainOf(c)}));
  const left = new Set(m.map((_, i) => i)), out = new Array(cars.length);
  const give = (title, fn, desc) => {
    let best = -1; for (const i of left) if (fn(m[i]) !== null && (best < 0 || fn(m[i]) > fn(m[best]))) best = i;
    if (best >= 0) { out[best] = {title, desc}; left.delete(best); }
  };
  give('MOST POWERFUL', x => x.c.hp, 'Highest horsepower in the field');
  give('QUICKEST LAUNCH', x => -x.c.zero, 'Fastest 0–100 km/h of all eight');
  give('POWER-TO-WEIGHT KING', x => x.ratio, 'Most horsepower per ton');
  give('FEATHERWEIGHT', x => -x.c.weight, 'Lightest car in the bracket');
  give('HEAVYWEIGHT', x => x.c.weight, 'Heaviest car in the bracket');
  give('INSTANT TORQUE', x => (x.ev ? x.c.torque : null), 'Electric motors: full torque from zero rpm');
  give('THE UNDERDOG', x => -x.c.hp, 'Least power, but never count it out');
  for (const i of left) {
    const x = m[i];
    out[i] = x.ev ? {title: 'SILENT & SAVAGE', desc: 'Electric launch, no gears to shift'}
      : x.drive === 'AWD' ? {title: 'ALL-WHEEL GRIP', desc: 'Four driven wheels bite the launch'}
      : x.drive === 'RWD' ? {title: 'REAR-DRIVE CLASSIC', desc: 'Pure drag-strip layout'}
      : x.drive === 'MR' ? {title: 'MID-ENGINE BALANCE', desc: 'Engine behind the driver for traction'}
      : x.c.type === 'SUV' ? {title: 'BIG & TALL', desc: 'A lot of metal to push down the strip'}
      : {title: 'FRONT-DRIVE FIGHTER', desc: 'Tricky launch, steady top end'};
  }
  return out.map((t, i) => ({...t, drive: m[i].drive, ratio: m[i].ratio, ev: m[i].ev, color: COLORS[i]}));
}

// ------------------------------------------------------------------ карточкалар (1920×1080 виртуал кеңістік)
const F = (sz, wt = 700) => `${wt} ${sz}px "Segoe UI", system-ui, Arial, sans-serif`;
function text(ctx, s, x, y, sz, o = {}) {
  ctx.save(); ctx.font = F(sz, o.w || 700); ctx.fillStyle = o.c || '#fff'; ctx.textAlign = o.a || 'left'; ctx.textBaseline = 'middle'; ctx.globalAlpha *= o.al ?? 1;
  if (o.max) { while (ctx.measureText(s).width > o.max && sz > 12) { sz -= 2; ctx.font = F(sz, o.w || 700); } }
  ctx.fillText(s, x, y); ctx.restore();
}
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }
function fill(ctx, x, y, w, h, r, color, al = 1) { ctx.save(); ctx.globalAlpha *= al; ctx.fillStyle = color; rr(ctx, x, y, w, h, r); ctx.fill(); ctx.restore(); }
function badge(ctx, s, x, y, color, sz = 34) {
  ctx.save(); ctx.font = F(sz, 800); const w = ctx.measureText(s).width + 44; ctx.restore();
  fill(ctx, x, y - sz * .8, w, sz * 1.6, sz * .8, color); text(ctx, s, x + 22, y + 1, sz, {c: '#10131a', w: 800}); return w;
}
function frame(ctx, w, h, t, draw, dur) {
  const k = Math.min(w / 1920, h / 1080);
  const g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#0b0f1a'); g.addColorStop(1, '#171a2b'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.save(); ctx.translate((w - 1920 * k) / 2, (h - 1080 * k) / 2); ctx.scale(k, k);
  ctx.save(); ctx.globalAlpha = .07; ctx.fillStyle = '#fff'; for (let i = -2; i < 14; i++) { ctx.save(); ctx.translate(((i * 220 + t * 90) % 3200) - 400, 0); ctx.transform(1, 0, -.5, 1, 0, 0); ctx.fillRect(0, 0, 70, 1080); ctx.restore(); } ctx.restore();
  ctx.globalAlpha = Math.min(1, t / .35) * Math.min(1, Math.max(0, (dur - t) / .35));
  draw(ctx, t); ctx.restore();
}
function makeCard(dur, draw) {
  let t0 = 0; return (ctx, w, h) => { if (!t0) t0 = performance.now(); frame(ctx, w, h, (performance.now() - t0) / 1000, draw, dur); };
}
const bar = (ctx, x, y, w, v, max, color) => { fill(ctx, x, y, w, 16, 8, '#ffffff22'); fill(ctx, x, y, Math.max(10, w * v / max), 16, 8, color); };

function introCard(title, cars, traits, info) {
  return makeCard(6.5, (ctx, t) => {
    text(ctx, 'DRAG RACE TOURNAMENT', 960, 150, 58, {a: 'center', c: '#ffb020', w: 800});
    text(ctx, title.toUpperCase(), 960, 260, 118, {a: 'center', w: 900, max: 1700});
    text(ctx, `${cars.length} cars  ·  ${info}  ·  1 champion`, 960, 365, 46, {a: 'center', c: '#cfd6e6', w: 600});
    cars.forEach((c, i) => {
      const row = Math.floor(i / 4), cnt = Math.min(4, cars.length - row * 4), x = (1920 - (cnt * 450 - 30)) / 2 + (i % 4) * 450, y = 450 + row * 230, a = Math.min(1, Math.max(0, t - .6 - i * .25) / .4);
      ctx.save(); ctx.globalAlpha *= a; ctx.translate(0, (1 - a) * 26);
      fill(ctx, x, y, 420, 200, 22, '#ffffff12'); fill(ctx, x, y, 14, 200, 7, traits[i].color);
      text(ctx, c.make, x + 38, y + 52, 30, {c: '#aeb8d0', w: 600, max: 360}); text(ctx, c.model, x + 38, y + 104, 44, {w: 800, max: 360});
      text(ctx, `${c.hp} hp · ${c.weight} kg`, x + 38, y + 160, 28, {c: traits[i].color, w: 700});
      ctx.restore();
    });
    text(ctx, 'AI physics simulation  ·  who takes the crown?', 960, 1010, 34, {a: 'center', c: '#8892ab', w: 600});
  });
}

function spotCard(c, tr, idx, all) {
  const mx = k => Math.max(...all.map(x => x[k])), ratio = c.hp / c.weight * 1000, mxR = Math.max(...all.map(x => x.hp / x.weight * 1000));
  return makeCard(5.6, (ctx, t) => {
    const slide = Math.min(1, t / .5), e = 1 - Math.pow(1 - slide, 3);
    text(ctx, `CONTENDER ${idx + 1} / ${all.length}`, 110, 110, 40, {c: tr.color, w: 800});
    ctx.save(); ctx.translate((1 - e) * -160, 0);
    text(ctx, c.make.toUpperCase(), 110, 235, 64, {c: '#aeb8d0', w: 700, max: 900});
    text(ctx, c.model, 110, 350, 124, {w: 900, max: 1100});
    badge(ctx, tr.title, 110, 470, tr.color, 44);
    text(ctx, tr.desc, 110, 550, 38, {c: '#cfd6e6', w: 600, max: 1000});
    ctx.restore();
    const rows = [['POWER', `${c.hp} hp`, c.hp, mx('hp')], ['TORQUE', `${c.torque} Nm`, c.torque, mx('torque')], ['WEIGHT', `${c.weight} kg`, c.weight, mx('weight')], ['0–100 km/h', `${c.zero.toFixed(1)} s`, 1 / c.zero, Math.max(...all.map(x => 1 / x.zero))], ['HP PER TON', `${Math.round(ratio)}`, ratio, mxR]];
    rows.forEach(([l, v, val, max], i) => {
      const y = 660 + i * 76, a = Math.min(1, Math.max(0, t - .5 - i * .15) / .4);
      ctx.save(); ctx.globalAlpha *= a;
      text(ctx, l, 110, y, 30, {c: '#8892ab', w: 700}); text(ctx, v, 520, y, 38, {w: 800, a: 'right'}); bar(ctx, 570, y - 8, 520, val * a, max, tr.color);
      ctx.restore();
    });
    ctx.save(); ctx.globalAlpha *= .9; fill(ctx, 1260, 170, 560, 700, 30, '#ffffff10'); ctx.restore();
    text(ctx, tr.drive === 'MR' ? 'MID' : tr.drive, 1540, 420, 150, {a: 'center', c: tr.color, w: 900, al: .95});
    text(ctx, 'DRIVETRAIN', 1540, 520, 34, {a: 'center', c: '#8892ab', w: 700});
    text(ctx, c.type === 'Электр' ? 'ELECTRIC' : String(c.type).replace('Седан', 'SEDAN').replace('Хэтчбек', 'HATCH').replace('Универсал', 'WAGON').replace('Лифтбек', 'LIFTBACK').replace('Купе', 'COUPE').replace('Пикап', 'PICKUP').replace('Спорткар', 'SPORTS CAR').replace('Суперкар', 'SUPERCAR').replace('Гиперкар', 'HYPERCAR').replace('Родстер', 'ROADSTER'), 1540, 660, 56, {a: 'center', w: 800, max: 500});
  });
}

function matchCard(stage, a, b, ta, tb, dur = 5) {
  return makeCard(dur, (ctx, t) => {
    text(ctx, stage.toUpperCase(), 960, 110, 64, {a: 'center', c: '#ffb020', w: 900});
    [[a, ta, 90, -1], [b, tb, 1000, 1]].forEach(([c, tr, x, dir]) => {
      const s = Math.min(1, t / .5), e = 1 - Math.pow(1 - s, 3); ctx.save(); ctx.translate(dir * (1 - e) * 300, 0);
      fill(ctx, x, 210, 830, 700, 34, '#ffffff12'); fill(ctx, x, 210, 830, 16, 8, tr.color);
      text(ctx, c.make.toUpperCase(), x + 50, 290, 44, {c: '#aeb8d0', max: 740}); text(ctx, c.model, x + 50, 380, 84, {w: 900, max: 740});
      badge(ctx, tr.title, x + 50, 480, tr.color, 36); text(ctx, tr.desc, x + 50, 545, 30, {c: '#cfd6e6', w: 600, max: 740});
      [[`${c.hp} hp`, 'POWER'], [`${c.weight} kg`, 'WEIGHT'], [`${c.zero.toFixed(1)} s`, '0–100'], [tr.drive === 'MR' ? 'MID' : tr.drive, 'DRIVE']].forEach(([v, l], i) => {
        const px = x + 50 + (i % 2) * 380, py = 650 + Math.floor(i / 2) * 120; text(ctx, v, px, py, 54, {w: 800, c: tr.color}); text(ctx, l, px, py + 46, 26, {c: '#8892ab'});
      });
      ctx.restore();
    });
    const p = 1 + Math.sin(t * 6) * .04; ctx.save(); ctx.translate(960, 560); ctx.scale(p, p); text(ctx, 'VS', 0, 0, 130, {a: 'center', w: 900, c: '#fff'}); ctx.restore();
    text(ctx, 'LEFT LANE', 505, 1000, 30, {a: 'center', c: '#8892ab'}); text(ctx, 'RIGHT LANE', 1415, 1000, 30, {a: 'center', c: '#8892ab'});
  });
}

function winnerCard(stage, win, lose, tw, tl, finW, finL, nextLabel, dur = 3.8) {
  return makeCard(dur, (ctx, t) => {
    const wimg = photoOf(win);
    text(ctx, stage.toUpperCase() + '  ·  RESULT', 960, 90, 46, {a: 'center', c: '#ffb020', w: 800});
    if (wimg) drawPhoto(ctx, wimg, 660, 140, 600, 300, 24);
    text(ctx, 'WINNER', 960, wimg ? 480 : 300, wimg ? 44 : 70, {a: 'center', c: '#cfd6e6', w: 700});
    const s = 1 + Math.max(0, .12 - t * .2); ctx.save(); ctx.translate(960, wimg ? 570 : 440); ctx.scale(s, s);
    text(ctx, `${win.make} ${win.model}`, 0, 0, wimg ? 90 : 108, {a: 'center', w: 900, c: tw.color, max: 1700}); ctx.restore();
    text(ctx, `${finW.toFixed(3)} s`, 960, wimg ? 670 : 560, 72, {a: 'center', w: 800});
    text(ctx, `beat ${lose.make} ${lose.model}  (${finL.toFixed(3)} s)  by ${(finL - finW).toFixed(3)} s`, 960, wimg ? 760 : 660, 40, {a: 'center', c: '#cfd6e6', w: 600, max: 1700});
    text(ctx, nextLabel, 960, wimg ? 900 : 830, 46, {a: 'center', c: tw.color, w: 800});
  });
}

function bracketCard(br, headline, dur = 5) {
  const NAMES = {8: 'QUARTER-FINALS', 4: 'SEMI-FINALS', 2: 'FINAL', 1: 'CHAMPION'};
  return makeCard(dur, (ctx, t) => {
    text(ctx, headline, 960, 90, 58, {a: 'center', c: '#ffb020', w: 900});
    const R = br.rounds, nc = R.length, x0 = (1920 - (nc * 470 - 70)) / 2, m0 = R[0].length, gap0 = m0 >= 8 ? 112 : m0 === 4 ? 170 : 260;
    R.forEach((arr, ci) => {
      const x = x0 + ci * 470, gap = gap0 * Math.pow(2, ci), y0 = 600 - (arr.length - 1) * gap / 2;
      text(ctx, NAMES[arr.length] || '', x + 200, 150, 26, {a: 'center', c: '#8892ab', w: 800});
      arr.forEach((e, i) => {
        const y = y0 + i * gap, has = !!e, col = has ? br.colors[e.id] : '#4a5068';
        fill(ctx, x, y - 38, 400, 76, 16, has ? '#ffffff16' : '#ffffff08'); fill(ctx, x, y - 38, 10, 76, 5, col);
        text(ctx, has ? fullName(e) : (ci === 0 ? 'BYE' : '—'), x + 28, y, 30, {w: has ? 700 : 500, c: has ? '#fff' : '#6a728c', max: 350});
      });
    });
  });
}


function roundCard(title, sub) {
  return makeCard(3.2, (ctx, t) => {
    const e = 1 - Math.pow(1 - Math.min(1, t / .6), 3);
    text(ctx, title, 960, 480 + (1 - e) * 60, 130, {a: 'center', w: 900, c: '#ffb020'});
    text(ctx, sub, 960, 620, 52, {a: 'center', c: '#cfd6e6', w: 600});
  });
}

function champCard(win, tr, finalTime, run, label = 'TOURNAMENT CHAMPION') {
  return makeCard(9.5, (ctx, t) => {
    for (let i = 0; i < 70; i++) { const px = (i * 271) % 1920, py = ((t * (120 + (i % 7) * 40) + i * 97) % 1200) - 60; ctx.save(); ctx.fillStyle = COLORS[i % 8]; ctx.globalAlpha *= .85; ctx.translate(px, py); ctx.rotate(t * 3 + i); ctx.fillRect(-9, -5, 18, 10); ctx.restore(); }
    const img = photoOf(win), has = !!img;
    if (has) {
      const k = 1 + Math.min(1, t / 9) * .04; ctx.save(); ctx.translate(960, 330); ctx.scale(k, k); ctx.translate(-960, -330);
      drawPhoto(ctx, img, 500, 120, 920, 420, 30); ctx.restore();
      text(ctx, '🏆', 470, 150, 120, {a: 'center'}); text(ctx, '🏆', 1450, 150, 120, {a: 'center'});
    } else text(ctx, '🏆', 960, 220, 190, {a: 'center'});
    const y0 = has ? 610 : 400;
    text(ctx, label, 960, y0, has ? 56 : 70, {a: 'center', c: '#ffb020', w: 900});
    text(ctx, `${win.make} ${win.model}`, 960, y0 + (has ? 100 : 140), has ? 104 : 124, {a: 'center', w: 900, c: tr.color, max: 1800});
    text(ctx, tr.title + '  ·  ' + tr.desc, 960, y0 + (has ? 190 : 250), has ? 38 : 42, {a: 'center', c: '#cfd6e6', w: 600, max: 1700});
    text(ctx, `${win.hp} hp  ·  ${win.weight} kg  ·  winning run ${finalTime.toFixed(2)} s`, 960, y0 + (has ? 250 : 340), has ? 40 : 44, {a: 'center', w: 700});
    text(ctx, 'Like & subscribe for the next tournament!', 960, has ? 930 : 900, 50, {a: 'center', c: '#fff', w: 800});
    text(ctx, run, 960, has ? 1015 : 990, 28, {a: 'center', c: '#8892ab'});
  });
}

/** Жарыс кезіндегі үстіңгі белдеу: кезең + екі көліктің ерекшелігі. */
function raceOverlay(stage, ta, tb) {
  return (ctx, w, h) => {
    const k = Math.min(w / 1920, h / 1080), bh = Math.max(34, 54 * k * 1.2);
    ctx.save(); ctx.fillStyle = '#06080fcc'; ctx.fillRect(0, h - bh, w, bh);
    const sz = Math.max(13, 28 * k * 1.1);
    ctx.font = F(sz, 800); ctx.textBaseline = 'middle'; const y = h - bh / 2;
    ctx.fillStyle = ta.color; ctx.textAlign = 'left'; ctx.fillText('◀ ' + ta.title, w * .02, y);
    ctx.fillStyle = '#ffb020'; ctx.textAlign = 'center'; ctx.fillText(stage.toUpperCase(), w / 2, y);
    ctx.fillStyle = tb.color; ctx.textAlign = 'right'; ctx.fillText(tb.title + ' ▶', w * .98, y);
    ctx.restore();
  };
}

function gridOverlay(stage, n = 8) {
  return (ctx, w, h) => {
    const k = Math.min(w / 1920, h / 1080), bh = Math.max(34, 54 * k * 1.2), sz = Math.max(13, 28 * k * 1.1);
    ctx.save(); ctx.fillStyle = '#06080fcc'; ctx.fillRect(0, h - bh, w, bh); ctx.font = F(sz, 800); ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    ctx.fillStyle = '#ffb020'; ctx.fillText(stage.toUpperCase() + `  ·  ALL ${n} AT ONCE`, w / 2, h - bh / 2); ctx.restore();
  };
}

const POINTS = [10, 8, 6, 5, 4, 3, 2, 1];

function standingsCard(title, rows, headline, dur = 6) {
  return makeCard(dur, (ctx, t) => {
    text(ctx, title.toUpperCase(), 960, 90, 62, {a: 'center', c: '#ffb020', w: 900});
    text(ctx, headline, 960, 160, 34, {a: 'center', c: '#cfd6e6', w: 600});
    rows.forEach((r, i) => {
      const y = 250 + i * 98, a = Math.min(1, Math.max(0, t - .3 - i * .1) / .35);
      ctx.save(); ctx.globalAlpha *= a; ctx.translate((1 - a) * 80, 0);
      fill(ctx, 260, y - 40, 1400, 82, 18, '#ffffff12'); fill(ctx, 260, y - 40, 14, 82, 7, r.color);
      text(ctx, String(i + 1), 330, y + 2, 46, {a: 'center', w: 900, c: i === 0 ? '#ffb020' : '#fff'});
      text(ctx, `${r.car.make} ${r.car.model}`, 400, y + 2, 38, {w: 800, max: 800});
      text(ctx, r.last, 1330, y + 2, 30, {a: 'right', c: '#9fb0bc', w: 600});
      text(ctx, `${r.pts} pts`, 1600, y + 2, 44, {a: 'right', w: 900, c: r.color});
      ctx.restore();
    });
  });
}

function podiumCard(top, dur = 6.5) {
  return makeCard(dur, (ctx, t) => {
    text(ctx, 'PODIUM', 960, 120, 90, {a: 'center', c: '#ffb020', w: 900});
    [[top[1], 520, 560, '2ND', 320], [top[0], 960, 430, '1ST', 450], [top[2], 1400, 600, '3RD', 280]].forEach(([e, x, y, lab, hh], i) => {
      if (!e) return; const a = Math.min(1, Math.max(0, t - .3 - i * .35) / .4);
      ctx.save(); ctx.globalAlpha *= a; ctx.translate(0, (1 - a) * 80);
      fill(ctx, x - 190, y + 130, 380, hh, 20, '#ffffff14'); fill(ctx, x - 190, y + 130, 380, 14, 7, e.color);
      drawPhoto(ctx, photoOf(e.car), x - 190, y - 250, 380, 190, 18);
      text(ctx, lab, x, y + 200, 58, {a: 'center', w: 900, c: e.color});
      text(ctx, e.car.make, x, y - 10, 34, {a: 'center', c: '#aeb8d0', max: 360}); text(ctx, e.car.model, x, y + 44, 46, {a: 'center', w: 900, max: 360});
      text(ctx, e.text, x, y + 270, 40, {a: 'center', w: 800});
      ctx.restore();
    });
  });
}

// ------------------------------------------------------------------ формат түрлері
export const FORMATS = {
  knockout: {label: '🏆 Нокаут (жартылай финал / чвертьфинал → финал)', title: () => 'Drag Race Tournament', long: n => `${n} cars, ${n - 1} head-to-head drag races, one champion.`},
  dvg: {label: '🥊 Әлсіздер vs күштілер (нокаут: ең әлсіз ↔ ең күшті)', title: () => 'Underdogs vs Giants Tournament', long: () => 'The weakest car faces the strongest in every first-round matchup. Can the underdogs survive?'},
  gauntlet: {label: '👑 Таудың королі (чемпион қалады, қалғандары қарсылас)', title: () => 'King of the Hill Drag Race', long: n => `One car defends the throne against ${n - 1} challenger${n > 2 ? 's' : ''}. Lose once and you are out.`},
  gp1: {label: '🏁 Бәрі бір уақытта (бір жарыс, подиум)', title: n => `Grand Prix: All ${n} At Once`, long: n => `All ${n} cars launch side by side in a single drag race. Who takes the podium?`},
  gp4: {label: '🏎 Чемпионат: бәрі бір уақытта, 4 жарыс, ұпай', title: () => 'Drag Championship (4 Races)', long: n => `All ${n} cars race together four times over different distances. Points decide the champion.`},
  time: {label: '⏳ Уақыт машинасы: бір көліктің 8 жылғы нұсқасы бір уақытта (4 жарыс, ұпай)', title: () => 'Time Machine: 8 Years of the Same Car', long: () => 'The same model from 8 different years, side by side over four distances. How much did it improve?'}
};
const TIME_YEARS = [2026, 2024, 2022, 2020, 2018, 2016, 2015, 2014];
const timeCars = base => TIME_YEARS.map(y => { const c = atYear(base, y); return {...c, model: `${base.model} (${y})`, year: y}; });

// ------------------------------------------------------------------ басқару
export function initTournament({game, YT}) {
  const api = game.tournament, themeSel = $('trTheme'), countSel = $('trCount'), fmtSel = $('trFormat'), startBtn = $('trStart'), stopBtn = $('trStop'), status = $('trStatus'), prev = $('trPreview');
  if (!themeSel) return;
  themeSel.innerHTML = Object.entries(THEMES).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('');
  fmtSel.innerHTML = Object.entries(FORMATS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('');
  let running = false, aborted = false, lineup = null, progTimer = 0;
  const say = (m, err) => { status.textContent = m; status.classList.toggle('err', !!err); };
  const chk = () => { if (aborted) throw new Error('Турнир тоқтатылды'); };
  const N = () => fmtSel.value === 'time' ? 8 : Math.max(2, Math.min(8, +countSel.value || 8));
  const byName = q => { q = q.trim().toLocaleLowerCase('kk'); return CARS.find(c => fullName(c).toLocaleLowerCase('kk') === q) || CARS.find(c => fullName(c).toLocaleLowerCase('kk').includes(q)); };

  function traitsOf(cars) {
    if (fmtSel.value === 'time') return cars.map((c, i) => ({title: `${c.year} MODEL`, desc: i === 0 ? 'The newest generation: most power' : `${2026 - c.year} years older: less power, more weight`, drive: drivetrainOf(c), ratio: c.hp / c.weight * 1000, ev: isEV(c), color: COLORS[i]}));
    return buildTraits(cars);
  }
  function showPreview() {
    const tr = traitsOf(lineup), time = fmtSel.value === 'time';
    prev.innerHTML = lineup.map((c, i) => { const off = time && i ? 'disabled' : ''; return `<li style="border-color:${tr[i].color}"><div class="tr-row"><input class="tr-slot" data-i="${i}" list="carNames" value="${fullName(c).replace(/"/g, '&quot;')}" ${off} aria-label="Көлік ${i + 1}" placeholder="Атын жазыңыз"><button class="tr-open" type="button" data-i="${i}" ${off} title="Толық тізімді ашу">▾</button></div><span>${c.hp} а.к. · ${c.weight} кг · ${c.zero} с</span><em>${tr[i].title}</em></li>`; }).join('');
  }
  function fresh() {
    if (fmtSel.value === 'time') {
      const pool = CARS.filter(c => c.hp >= 150 && c.hp <= 800 && c.type !== 'Электр' && (THEMES[themeSel.value].pool().includes(c)));
      const list = pool.length ? pool : CARS.filter(c => c.hp >= 150 && c.hp <= 800 && c.type !== 'Электр');
      lineup = timeCars(list[Math.floor(Math.random() * list.length)]);
    } else lineup = pickEight(themeSel.value, N()).map(c => atYear(c, 2026));
    showPreview();
  }
  function syncCount() {
    countSel.disabled = fmtSel.value === 'time'; countSel.title = countSel.disabled ? 'Уақыт машинасы әрқашан 8 нұсқа' : '';
    if (fmtSel.value === 'time') return;
    const n = N();
    if (lineup.length > n) lineup = lineup.slice(0, n);
    else if (lineup.length < n) { const have = new Set(lineup.map(c => c.id)); lineup = lineup.concat(pickEight(themeSel.value, n + 4).filter(c => !have.has(c.id)).slice(0, n - lineup.length).map(c => atYear(c, 2026))); }
    showPreview();
  }
  function applySlot(i, c, shown) {
    if (!c) { say('Табылмады: ' + shown, true); showPreview(); return; }
    if (fmtSel.value === 'time') { if (i === 0) lineup = timeCars(c); }
    else if (lineup.some((x, k) => k !== i && x.id === c.id)) { say(`${fullName(c)} тізімде бар`, true); showPreview(); return; }
    else lineup[i] = atYear(c, 2026);
    say(''); showPreview();
  }
  // жазғанда: толық атын жазып, Enter/басқа жерге басқанда ғана қабылданады (әр әріпте өзгермейді)
  prev.onchange = e => { const inp = e.target.closest('.tr-slot'); if (inp) applySlot(+inp.dataset.i, byName(inp.value), inp.value); };
  prev.addEventListener('focusin', e => { if (e.target.matches?.('.tr-slot')) e.target.select(); });
  prev.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches?.('.tr-slot')) e.target.blur(); });
  // ▾ түймесі: барлық көліктердің толық тізімі, ағымдағы көлік белгіленіп тұрады, төмен қарай айналдыруға болады
  const ALL = [...CARS].sort((x, y) => fullName(x).localeCompare(fullName(y)));
  prev.addEventListener('click', e => {
    const btn = e.target.closest('.tr-open'); if (!btn || btn.disabled) return;
    const li = btn.closest('li'), old = li.querySelector('.tr-list'); if (old) { old.remove(); return; }
    prev.querySelectorAll('.tr-list').forEach(x => x.remove());
    const i = +btn.dataset.i, sel = document.createElement('select'); sel.className = 'tr-list'; sel.size = 9;
    sel.innerHTML = ALL.map(c => `<option value="${c.id}">${fullName(c)} — ${c.hp} а.к.</option>`).join('');
    sel.value = String(lineup[i].id); li.appendChild(sel); sel.focus();
    const cur = sel.options[sel.selectedIndex]; if (cur) sel.scrollTop = Math.max(0, cur.offsetTop - sel.clientHeight / 2);
    const pick = () => applySlot(i, ALL.find(c => String(c.id) === sel.value), sel.value);
    sel.onchange = pick; sel.onclick = () => { if (sel.value) pick(); }; sel.onkeydown = ev => { if (ev.key === 'Escape') sel.remove(); else if (ev.key === 'Enter') pick(); };
  });
  $('trShuffle').onclick = fresh; themeSel.onchange = fresh; fmtSel.onchange = () => { countSel.disabled = fmtSel.value === 'time'; fresh(); }; countSel.onchange = syncCount; fresh(); countSel.disabled = fmtSel.value === 'time';

  const ts = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  // ---- прогресс: қанша процент бітті және қанша қалды (карточкалар + жарыстар бойынша бағалау, жарыс өткен сайын нақтыланады)
  const prog = {on: false, cardLeft: 0, races: [], k: 1, step0: 0};
  function planFor(fmt, cars, dist, quick) {
    const et = cars.reduce((a, c) => a + estimateQuarterMile(c), 0) / cars.length, raceSec = d => 8.2 + et * Math.pow(d / 402.34, .75) * (fmt === 'knockout' || fmt === 'dvg' || fmt === 'gauntlet' ? 1 : 1.08);
    const n = cars.length, spot = quick ? 0 : (fmt === 'time' ? n * 4.2 : n * 5.6), intro = quick ? 1.5 : 6.5, P = n <= 2 ? 2 : n <= 4 ? 4 : 8, rounds = Math.log2(P);
    let card = intro + spot, races;
    if (fmt === 'knockout' || fmt === 'dvg') { card += rounds * 3.2 + (n - 2) * 8.8 + 10.8 + (rounds - 1) * 4.5 + 9; races = Array(n - 1).fill(raceSec(dist)); }
    else if (fmt === 'gauntlet') { card += 3.4 + (n - 1) * 8.8 + 9; races = Array(n - 1).fill(raceSec(dist)); }
    else if (fmt === 'gp1') { card += 3.4 + 6.5 + 9; races = [raceSec(dist)]; }
    else { card += 4 * 3.4 + 4 * 6 + 9; races = [201.17, 402.34, 603.5, 804.67].map(raceSec); }
    Object.assign(prog, {on: true, cardLeft: card + 8, races, k: 1, step0: 0});
  }
  const stepStart = () => { prog.step0 = api.recTime; };
  function raceDone(actual) { const exp = prog.races.shift(); if (exp) prog.k = .5 * prog.k + .5 * (actual / exp); }
  function updateProg() {
    const box = $('trProg'); if (!box) return;
    if (!prog.on) { box.hidden = true; return; }
    const t = api.recTime, remain = Math.max(0, prog.cardLeft + prog.k * prog.races.reduce((a, b) => a + b, 0) - Math.max(0, t - prog.step0)), pct = Math.min(99, Math.round(t / Math.max(1, t + remain) * 100));
    box.hidden = false; $('trProgFill').style.width = pct + '%'; $('trProgText').textContent = `Жазылуда: ${pct}% · қалды ~${ts(remain)}`;
  }

  async function run(cars, traits, fmt, dist) {
    const colors = cars.map((_, i) => COLORS[i]), chapters = [], ledger = [];
    const mark = label => chapters.push([api.recTime, label]);
    const show = async (cardFn, sec) => { stepStart(); api.setOverlay(null); api.setCard(cardFn); await api.wait(sec * 1000); chk(); api.setCard(null); prog.cardLeft -= sec; };
    const stageOf = (round, i, n) => round === 'qf' ? `Quarter-final ${i + 1}/${n}` : round === 'sf' ? `Semi-final ${i + 1}/${n}` : 'THE FINAL';
    const idxOf = c => cars.findIndex(x => x.id === c.id && x.model === c.model);
    const theme = THEMES[themeSel.value], n = cars.length, title = fmt === 'time' ? `${cars[0].make} ${cars[0].model.replace(/ \(\d+\)$/, '')}` : theme.title.replace(/^8 /, n + ' ');

    const match = async (a, b, stage, nextFn, dur = 5) => {
      const A = {c: a, t: traits[idxOf(a)]}, B = {c: b, t: traits[idxOf(b)]};
      mark(`${stage}: ${fullName(a)} vs ${fullName(b)}`);
      await show(matchCard(stage, a, b, A.t, B.t, dur), dur);
      api.setOverlay(raceOverlay(stage, A.t, B.t));
      say(`${stage}: ${fullName(a)} vs ${fullName(b)} жарысуда…`);
      stepStart(); const t0 = api.recTime;
      const r = await api.playMatch(a, b); chk(); if (!r) throw new Error('Жарыс үзілді'); raceDone(api.recTime - t0);
      let win = r.winner; if (win < 0) win = a.hp >= b.hp ? 0 : 1;
      const [W, L] = win === 0 ? [A, B] : [B, A], [fw, fl] = win === 0 ? [r.rows[0].fin, r.rows[1].fin] : [r.rows[1].fin, r.rows[0].fin];
      ledger.push(`${stage}: ${fullName(W.c)} beat ${fullName(L.c)} (${fw.toFixed(2)} s vs ${fl.toFixed(2)} s)`);
      await show(winnerCard(stage, W.c, L.c, W.t, L.t, fw, fl, nextFn(W.c)), 3.8);
      return {winner: W.c, time: fw};
    };
    const LABEL = {knockout: 'TOURNAMENT CHAMPION', dvg: 'TOURNAMENT CHAMPION', gauntlet: 'KING OF THE HILL', gp1: 'GRAND PRIX WINNER', gp4: 'CHAMPIONSHIP WINNER', time: 'FASTEST VERSION'};
    const champEnd = async (champCar, time) => {
      await loadPhoto(champCar); mark('Champion'); await show(champCard(champCar, traits[idxOf(champCar)], time, 'AI physics simulation · results are computed, not real footage', LABEL[fmt]), 9); mark('Subscribe & next video'); await show(outroCard(8), 8); return champCar;
    };

    const quick = new URLSearchParams(location.search).has('quick'); // тест үшін: таныстыруды өткізіп жіберу
    cars.forEach(c => { loadPhoto(c, 20000); }); // фотоларды алдын ала жүктеу (фонда)
    mark('Intro: meet the field');
    const info = fmt === 'gp1' ? '1 race' : fmt === 'gp4' || fmt === 'time' ? '4 races' : `${n - 1} race${n > 2 ? 's' : ''}`;
    await show(introCard(title, cars, traits, info), quick ? 1.5 : 6.5);
    mark('The contenders');
    for (let i = 0; i < (quick ? 0 : n); i++) { say(`Көлік таныстыру ${i + 1}/${n}`); await show(spotCard(cars[i], traits[i], i, cars), fmt === 'time' ? 4.2 : 5.6); }

    let champ;
    if (fmt === 'knockout' || fmt === 'dvg') {
      const P = n <= 2 ? 2 : n <= 4 ? 4 : 8, byes = P - n, pairs = [];
      if (fmt === 'dvg') {
        const s = [...cars].sort((x, y) => y.hp - x.hp), rest = s.slice(byes), bp = s.slice(0, byes).map(c => [c, null]), np = [];
        for (let i = 0; i < rest.length / 2; i++) np.push([rest[i], rest[rest.length - 1 - i]]);
        while (bp.length || np.length) { if (np.length) pairs.push(np.shift()); if (bp.length) pairs.push(bp.shift()); }
      } else {
        let k = 0; for (let i = 0; i < P / 2; i++) { if (i < byes) pairs.push([cars[k++], null]); else { pairs.push([cars[k], cars[k + 1]]); k += 2; } }
      }
      let cur = pairs.flat();
      const br = {rounds: [cur], colors: {}}; for (let l = P / 2; l >= 1; l /= 2) br.rounds.push(Array(l).fill(null)); cars.forEach((c, i) => { br.colors[c.id] = colors[i]; });
      let ri = 0, fin = null;
      while (cur.length > 1) {
        const len = cur.length, name = len === 8 ? 'QUARTER-FINALS' : len === 4 ? 'SEMI-FINALS' : 'THE FINAL', nm = cur.filter((c, i) => i % 2 === 0 && c && cur[i + 1]).length;
        mark(name); await show(roundCard(name, len === 2 ? 'One race decides the champion' : `${nm} race${nm > 1 ? 's' : ''}  ·  ${cur.filter(Boolean).length} cars  ·  only winners move on`), 3.2);
        const next = []; let k = 0;
        for (let i = 0; i < len; i += 2) {
          const a2 = cur[i], b2 = cur[i + 1]; let w;
          if (a2 && b2) {
            const stage = len === 2 ? 'THE FINAL' : stageOf(len === 8 ? 'qf' : 'sf', k++, nm);
            const r = await match(a2, b2, stage, c => len === 2 ? `${c.make} ${c.model} is the CHAMPION!` : len === 4 ? `${c.make} ${c.model} is in the FINAL` : `${c.make} ${c.model} advances to the next round`, len === 2 ? 7 : 5);
            w = r.winner; if (len === 2) fin = r;
          } else w = a2 || b2;
          next.push(w); br.rounds[ri + 1][i / 2] = w;
        }
        cur = next; ri++;
        if (cur.length > 1) { mark(`Bracket after ${name.toLowerCase()}`); await show(bracketCard(br, cur.length === 2 ? 'THE FINAL IS SET' : 'SEMI-FINALS SET'), 4.5); }
      }
      champ = await champEnd(fin.winner, fin.time);
    } else if (fmt === 'gauntlet') {
      let king = cars[0], streak = 0, last = 0;
      mark('The throne'); await show(roundCard('KING OF THE HILL', `${king.make} ${king.model} defends the throne`), 3.4);
      for (let i = 1; i < n; i++) {
        const stage = i === n - 1 ? 'FINAL CHALLENGER' : `Challenger ${i}/${n - 1}`, holder = king;
        const r = await match(holder, cars[i], stage, c => c === holder ? `${c.make} ${c.model} stays on the throne` : `NEW KING: ${c.make} ${c.model}!`);
        if (r.winner === holder) streak++; else { king = r.winner; streak = 1; }
        last = r.time;
      }
      champ = await champEnd(king, last);
    } else {
      const races = fmt === 'gp4' || fmt === 'time' ? [201.17, 402.34, 603.5, 804.67] : [dist], pts = cars.map(() => 0), lastTxt = cars.map(() => '—'), tot = cars.map(() => 0), lastFin = cars.map(() => 0);
      const standing = () => cars.map((c, i) => ({car: c, color: colors[i], pts: pts[i], last: lastTxt[i], tot: tot[i], fin: lastFin[i]})).sort((a, b) => b.pts - a.pts || a.tot - b.tot);
      for (let r = 0; r < races.length; r++) {
        const stage = races.length > 1 ? `Race ${r + 1}/${races.length} · ${Math.round(races[r])} m` : `Grand Prix · ${Math.round(races[r])} m`;
        mark(stage); await show(roundCard(stage.toUpperCase(), `All ${n} cars launch together`), 3.4);
        api.setOverlay(gridOverlay(stage, n)); say(`${stage} жарысуда…`);
        stepStart(); const t0 = api.recTime;
        let res = await api.playGrid(cars, colors, races[r]); chk(); if (!res) throw new Error('Жарыс үзілді');
        if (!res.order) { let w2 = res.winner; if (w2 < 0) w2 = cars[0].hp >= cars[1].hp ? 0 : 1; res = {order: w2 === 0 ? [0, 1] : [1, 0], rows: res.rows}; } // 2 көлік: қарапайым нәтиже raceDone(api.recTime - t0);
        res.order.forEach((i, rank) => { pts[i] += POINTS[rank]; tot[i] += res.rows[i].fin; lastFin[i] = res.rows[i].fin; lastTxt[i] = `P${rank + 1} · ${res.rows[i].fin.toFixed(2)} s`; });
        ledger.push(`${stage}: 1. ${fullName(cars[res.order[0]])} (${res.rows[res.order[0]].fin.toFixed(2)} s)${res.order.slice(1, 3).map((ci, p) => `, ${p + 2}. ${fullName(cars[ci])}`).join('')}`);
        if (races.length > 1) { mark(`Standings after race ${r + 1}`); await show(standingsCard('Championship standings', standing(), `After race ${r + 1} of ${races.length}`), 6); }
      }
      const st = standing();
      if (races.length === 1) { mark('Podium'); await show(podiumCard(st.slice(0, 3).map(e => ({car: e.car, color: e.color, text: `${e.fin.toFixed(2)} s`}))), 6.5); }
      champ = await champEnd(st[0].car, st[0].fin);
    }
    return {cars, traits, theme, chapters, ledger, champ, fmt, title};
  }

  function metaFor(res, secs) {
    const {cars, traits, chapters, ledger, champ, fmt, title} = res, F0 = FORMATS[fmt];
    const ttl = fmt === 'time' ? `${title}: 8 Years Side by Side 🏁 Drag Race | AI Simulation` : `${title} 🏆 ${F0.title(cars.length)} | AI Simulation`;
    const chap = chapters.map(([t, l], i) => `${ts(i === 0 ? 0 : t)} ${l}`).join('\n');
    const description = [
      `${F0.long(cars.length)} 🏁`, `🏆 Winner: ${champ.make} ${champ.model}`, '',
      'THE CONTENDERS', ...cars.map((c, i) => `• ${c.make} ${c.model} — ${c.hp} hp, ${c.weight} kg, 0–100 ${c.zero} s — ${traits[i].title}`), '',
      '🔔 Subscribe to the channel so you do not miss the next videos! / Подпишись на канал, чтобы не пропустить другие видео!', '💬 Want other cars to race? Write the car names in the comments! / Хотите увидеть другие машины? Напишите названия в комментариях!', '❓ Which cars should be in the NEXT video? Tell us and we will test them! / Какие машины будут в СЛЕДУЮЩЕМ видео? Пишите — проверим!', '',
      'RESULTS', ...ledger, '', 'CHAPTERS', chap, '',
      'AI Simulation: computer-generated physics race based on catalog power, weight and 0–100 data. Not a real race and not real footage.',
      '#DragRace #CarRace #AISimulation'
    ].join('\n');
    return {title: ttl.slice(0, 100), description, tags: ['Drag Race', 'Tournament', 'Car Race', 'AI Simulation', 'Car Comparison', title, champ.make, champ.model].filter(Boolean).slice(0, 15), seconds: secs};
  }

  startBtn.onclick = async () => {
    if (running) return;
    const dry = new URLSearchParams(location.search).has('dry');
    if (!dry && !YT.getClientId()) { $('ytClient').click(); if (!YT.getClientId()) return say('Алдымен Client ID баптаңыз', true); }
    running = true; aborted = false; startBtn.disabled = true; stopBtn.hidden = false; [themeSel, fmtSel, $('trDist'), $('trLang'), countSel].forEach(e => { e.disabled = true; }); prev.querySelectorAll('input').forEach(i => { i.disabled = true; });
    const saved = {lang: $('raceLang').value, dist: $('raceDistance').value, fmt: $('recFormat').value, auto: $('ytAutoUp').checked, priv: $('ytPrivacy').value};
    const setSel = (id, v) => { $(id).value = v; $(id).dispatchEvent(new Event('change')); };
    try {
      say('Google аккаунт таңдау терезесі… (бір рет «Allow» басыңыз)');
      if (!dry) await YT.signIn(false);
      $('ytAutoUp').checked = !dry; $('ytPrivacy').value = 'public';
      const dist = $('trDist').value; setSel('raceLang', $('trLang').value); setSel('raceDistance', dist); setSel('recFormat', 'wide1080');
      document.querySelector('#studio')?.scrollIntoView({behavior: 'smooth'});
      const hd = $('trQuality').value === '1080' ? ['wide1080', 8e6] : ['wide720', 5e6];
      if (!await api.begin(hd[0], hd[1])) throw new Error('Видео жазу басталмады');
      progTimer = setInterval(updateProg, 500);
      const cars = lineup.map(c => ({...c})), traits = traitsOf(cars);
      planFor(fmtSel.value, cars, +dist, new URLSearchParams(location.search).has('quick')); updateProg();
      const res = await run(cars, traits, fmtSel.value, +dist); chk();
      const secs = api.recTime, meta = metaFor(res, secs);
      say('Видео біріктірілуде, YouTube-қа жүктелуге дайындалуда…');
      await api.end(r => api.deliver(r, meta));
      usedSave([...usedLoad(), ...cars.map(c => c.id)]);
      say(`✅ Видео дайын (${ts(secs)}). ${dry ? '(dry режим: жүктелмейді)' : 'Төменде жүктеу барысы көрсетіледі (ашық түрде).'}`);
    } catch (e) { say('❌ ' + (e.message || e), true); }
    finally {
      clearInterval(progTimer); prog.on = false; updateProg(); api.finish(); running = false; startBtn.disabled = false; stopBtn.hidden = true; [themeSel, fmtSel, $('trDist'), $('trLang'), countSel].forEach(e => { e.disabled = false; }); countSel.disabled = fmtSel.value === 'time';
      setSel('raceLang', saved.lang); setSel('raceDistance', saved.dist); setSel('recFormat', saved.fmt); $('ytAutoUp').checked = saved.auto; $('ytPrivacy').value = saved.priv === 'private' ? 'public' : saved.priv;
      fresh();
    }
  };
  stopBtn.onclick = () => { aborted = true; api.finish(); say('Турнир тоқтатылды'); };
}
