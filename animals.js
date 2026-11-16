// DriveVault — иттер мен жануарлар жарысы.
// Жылдамдықтар нақты деректерге сүйенеді (мыс. грейхаунд ~70, гепард ~105 км/сағ); қозғалыс: ең жоғары жылдамдыққа экспоненциалды жеделдеу + төзімділік (шаршау).
// Бейне — компьютерлік анимация (процедуралық сурет), нақты кинокадр емес.
const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), lerp = (a, b, t) => a + (b - a) * t, sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const PI = Math.PI;

const DEF = {L: .8, h: .6, ch: .25, nk: .3, hd: .22, sn: .5, ear: 'drop', tl: .45, tb: .3, col: '#b08a5a', bl: null, pat: null, pc: '#222', leg: null, mane: null, thick: 1, dog: true, tuft: null};
const mk = (id, name, kind, kmh, tau, end, cruise, look) => ({id, name, kind, kmh, tau, end, cruise, look: {...DEF, kind, ...look}});

export const ANIMALS = [
  // ---------- иттер (жылдамдықтар: жалпыға мәлім максимумдар)
  mk('greyhound', 'Greyhound', 'dog', 70, 1.5, 900, 50, {L: .8, h: .72, ch: .32, nk: .34, hd: .27, sn: .58, ear: 'rose', tl: .6, tb: .1, col: '#c9a27a', bl: '#eadbc6', thick: .85}),
  mk('saluki', 'Saluki', 'dog', 68, 1.6, 900, 48, {L: .8, h: .68, ch: .3, nk: .33, hd: .27, sn: .6, ear: 'long', tl: .6, tb: .25, col: '#eadcbc', bl: '#f6efde', thick: .8}),
  mk('afghan', 'Afghan Hound', 'dog', 65, 1.7, 800, 45, {L: .82, h: .7, ch: .32, nk: .34, hd: .28, sn: .58, ear: 'long', tl: .55, tb: .3, col: '#d8a55f', bl: '#e7c58b', thick: .9}),
  mk('vizsla', 'Vizsla', 'dog', 64, 1.6, 800, 46, {L: .74, h: .62, ch: .28, nk: .3, hd: .25, sn: .55, ear: 'drop', tl: .42, tb: .1, col: '#b4562b', bl: '#c46a3a'}),
  mk('dalmatian', 'Dalmatian', 'dog', 59, 1.7, 800, 42, {L: .76, h: .6, ch: .28, nk: .3, hd: .25, sn: .55, ear: 'drop', tl: .5, tb: .1, col: '#f4f1ea', pat: 'spots', pc: '#232323'}),
  mk('borzoi', 'Russian Wolfhound', 'dog', 58, 1.7, 800, 42, {L: .84, h: .74, ch: .33, nk: .36, hd: .3, sn: .62, ear: 'rose', tl: .6, tb: .35, col: '#e1b27a', bl: '#f5ead6', thick: .9}),
  mk('whippet', 'Whippet', 'dog', 56, 1.3, 600, 40, {L: .62, h: .5, ch: .24, nk: .26, hd: .21, sn: .56, ear: 'rose', tl: .45, tb: .08, col: '#c8a27c', bl: '#eadbc6', thick: .8}),
  mk('doberman', 'Doberman', 'dog', 51, 1.7, 700, 38, {L: .76, h: .68, ch: .3, nk: .32, hd: .27, sn: .55, ear: 'point', tl: .18, tb: .1, col: '#1c1c20', bl: '#a45a2a', leg: '#a45a2a'}),
  mk('gsd', 'German Shepherd', 'dog', 48, 1.8, 700, 36, {L: .82, h: .62, ch: .3, nk: .3, hd: .27, sn: .55, ear: 'point', tl: .55, tb: .55, col: '#b46e2e', bl: '#c88a45', pat: 'saddle', pc: '#1d1a17'}),
  mk('collie', 'Border Collie', 'dog', 48, 1.5, 900, 38, {L: .66, h: .52, ch: .26, nk: .26, hd: .22, sn: .5, ear: 'semi', tl: .45, tb: .5, col: '#1d1d20', bl: '#f2f2f2', pat: 'blaze', pc: '#f2f2f2'}),
  mk('husky', 'Siberian Husky', 'dog', 48, 1.8, 3000, 44, {L: .72, h: .56, ch: .28, nk: .27, hd: .24, sn: .5, ear: 'point', tl: .45, tb: .6, col: '#8e959d', bl: '#f1f1f1', pat: 'blaze', pc: '#f1f1f1'}),
  mk('dane', 'Great Dane', 'dog', 45, 2.3, 400, 30, {L: 1.0, h: .85, ch: .4, nk: .4, hd: .33, sn: .55, ear: 'semi', tl: .7, tb: .2, col: '#8f9ba6', bl: '#aab4bd', thick: 1.2}),
  mk('lab', 'Labrador', 'dog', 40, 2.0, 700, 32, {L: .7, h: .58, ch: .3, nk: .27, hd: .25, sn: .48, ear: 'drop', tl: .4, tb: .4, col: '#e0b85a', bl: '#e8c775', thick: 1.1}),
  mk('jrt', 'Jack Russell', 'dog', 38, 1.4, 400, 30, {L: .42, h: .32, ch: .16, nk: .17, hd: .15, sn: .5, ear: 'semi', tl: .22, tb: .1, col: '#f5f1e8', pat: 'patch', pc: '#8a4b22'}),
  mk('corgi', 'Corgi', 'dog', 27, 1.5, 250, 20, {L: .6, h: .3, ch: .2, nk: .15, hd: .17, sn: .5, ear: 'point', tl: .06, tb: .1, col: '#d9893d', bl: '#fff', thick: 1.3}),
  mk('dachshund', 'Dachshund', 'dog', 24, 1.4, 250, 18, {L: .56, h: .22, ch: .15, nk: .12, hd: .15, sn: .55, ear: 'drop', tl: .22, tb: .1, col: '#7a3f1f', thick: 1.2}),
  mk('chihuahua', 'Chihuahua', 'dog', 24, 1.3, 200, 18, {L: .26, h: .2, ch: .1, nk: .1, hd: .11, sn: .3, ear: 'big', tl: .15, tb: .1, col: '#d9b98a', bl: '#f1e0c0', thick: .8}),
  mk('bulldog', 'English Bulldog', 'dog', 24, 2.2, 150, 14, {L: .54, h: .38, ch: .26, nk: .14, hd: .2, sn: .22, ear: 'rose', tl: .08, tb: .1, col: '#d9c4a3', bl: '#f3ebdc', thick: 1.6}),
  mk('pug', 'Pug', 'dog', 19, 2.0, 120, 12, {L: .4, h: .3, ch: .19, nk: .12, hd: .16, sn: .2, ear: 'rose', tl: .1, tb: .1, col: '#d9bf8f', bl: '#e6d1a8', pat: 'mask', pc: '#2b2622', thick: 1.4}),
  // ---------- жабайы жануарлар
  mk('cheetah', 'Cheetah', 'wild', 105, 2.4, 320, 42, {dog: false, L: 1.05, h: .82, ch: .34, nk: .3, hd: .22, sn: .35, ear: 'round', tl: .85, tb: .2, col: '#d9a441', bl: '#f1e2bd', pat: 'rosettes', pc: '#2a1c10', thick: .85}),
  mk('pronghorn', 'Pronghorn', 'wild', 88, 2.5, 5000, 70, {dog: false, L: 1.0, h: .9, ch: .38, nk: .45, hd: .3, sn: .6, ear: 'point', tl: .1, tb: .1, col: '#b56a35', bl: '#f5efe6', thick: .8, up: .3}),
  mk('lion', 'Lion', 'wild', 80, 2.6, 250, 30, {dog: false, L: 1.55, h: 1.12, ch: .52, nk: .4, hd: .38, sn: .4, ear: 'round', tl: .9, tb: .2, col: '#c99a58', bl: '#dcb878', mane: '#6a3e1f', tuft: '#4a2a14', thick: 1.3}),
  mk('horse', 'Racehorse', 'wild', 70, 2.8, 2500, 60, {dog: false, L: 1.55, h: 1.6, ch: .7, nk: .75, hd: .6, sn: .6, ear: 'point', tl: .95, tb: .3, col: '#6b3f26', leg: '#241711', mane: '#241711', tuft: '#241711', thick: .9, up: .4}),
  mk('zebra', 'Zebra', 'wild', 65, 2.7, 2000, 55, {dog: false, L: 1.55, h: 1.3, ch: .6, nk: .6, hd: .5, sn: .6, ear: 'point', tl: .6, tb: .2, col: '#f1f1ee', pat: 'stripes', pc: '#18181a', mane: '#18181a', tuft: '#18181a', thick: .9, up: .35}),
  mk('tiger', 'Tiger', 'wild', 65, 2.5, 200, 25, {dog: false, L: 1.7, h: 1.0, ch: .55, nk: .4, hd: .38, sn: .4, ear: 'round', tl: 1.0, tb: .2, col: '#d97a21', bl: '#f5ecd8', pat: 'stripes', pc: '#1b1208', thick: 1.35}),
  mk('dingo', 'Dingo', 'wild', 60, 2.0, 1200, 45, {dog: false, L: .9, h: .55, ch: .26, nk: .26, hd: .24, sn: .55, ear: 'point', tl: .35, tb: .5, col: '#cf8a4a', bl: '#f0dcc0', thick: .9}),
  mk('jaguar', 'Jaguar', 'wild', 80, 2.5, 250, 30, {dog: false, L: 1.3, h: .75, ch: .42, nk: .3, hd: .3, sn: .38, ear: 'round', tl: .7, tb: .2, col: '#d9a441', bl: '#f1e2bd', pat: 'rosettes', pc: '#2a1c10', thick: 1.3}),
  mk('snowleopard', 'Snow Leopard', 'wild', 56, 2.3, 300, 28, {dog: false, L: 1.1, h: .6, ch: .34, nk: .26, hd: .26, sn: .38, ear: 'round', tl: .95, tb: .5, col: '#d8d6d0', bl: '#f2f0ea', pat: 'rosettes', pc: '#3a3a3e', thick: 1.2}),
  mk('leopard', 'Leopard', 'wild', 58, 2.3, 300, 28, {dog: false, L: 1.1, h: .7, ch: .36, nk: .28, hd: .27, sn: .38, ear: 'round', tl: .85, tb: .2, col: '#d9a441', bl: '#f1e2bd', pat: 'rosettes', pc: '#2a1c10', thick: 1.2}),
  mk('cougar', 'Cougar', 'wild', 64, 2.4, 250, 28, {dog: false, L: 1.2, h: .7, ch: .38, nk: .28, hd: .26, sn: .38, ear: 'round', tl: .8, tb: .25, col: '#c6a06a', bl: '#e6d3b0', thick: 1.2}),
  mk('hyena', 'Spotted Hyena', 'wild', 64, 2.3, 900, 40, {dog: false, L: 1.05, h: .8, ch: .38, nk: .3, hd: .3, sn: .42, ear: 'round', tl: .3, tb: .3, col: '#b89a68', bl: '#d6c08e', pat: 'spots', pc: '#3a2c1c', thick: 1.2}),
  mk('wilddog', 'African Wild Dog', 'wild', 66, 2.0, 1500, 50, {dog: false, L: .9, h: .7, ch: .3, nk: .28, hd: .25, sn: .5, ear: 'huge', tl: .4, tb: .5, col: '#8a6a3a', bl: '#d9b46a', pat: 'patch', pc: '#1c1510', tuft: '#fff', thick: .9}),
  mk('hare', 'Hare', 'wild', 64, 1.5, 450, 35, {dog: false, L: .42, h: .3, ch: .17, nk: .1, hd: .13, sn: .4, ear: 'huge', tl: .05, tb: .2, col: '#a58660', bl: '#e8dcc6', thick: .9}),
  mk('wolf', 'Grey Wolf', 'wild', 60, 2.0, 1200, 45, {dog: false, L: 1.0, h: .8, ch: .38, nk: .34, hd: .3, sn: .6, ear: 'point', tl: .6, tb: .6, col: '#8a8479', bl: '#d6cfc0', thick: 1.0}),
  mk('bear', 'Grizzly Bear', 'wild', 55, 2.6, 300, 28, {dog: false, L: 1.5, h: 1.0, ch: .7, nk: .3, hd: .36, sn: .35, ear: 'round', tl: .07, tb: .2, col: '#5b3d28', bl: '#6b4932', thick: 1.7}),
  mk('fox', 'Red Fox', 'wild', 50, 1.7, 700, 35, {dog: false, L: .62, h: .4, ch: .2, nk: .2, hd: .19, sn: .6, ear: 'point', tl: .45, tb: .75, col: '#cd5f1f', bl: '#f7efe6', leg: '#2a1a12', tuft: '#fff', thick: .8}),
  mk('cat', 'House Cat', 'wild', 48, 1.4, 120, 18, {dog: false, L: .4, h: .26, ch: .14, nk: .1, hd: .12, sn: .3, ear: 'round', tl: .3, tb: .15, col: '#b08a5a', bl: '#e8d9b8', pat: 'stripes', pc: '#4a3320'})
];
export const byId = id => ANIMALS.find(a => a.id === id) || ANIMALS[0];
// Нақты кадрлардан жасалған спрайт-парақтар (assets/animals/<id>.png + index.json)
export const SPR = {};
export function loadSprites(base = 'assets/animals/', onLoad = () => {}) {
  if (typeof fetch === 'undefined' || typeof Image === 'undefined') return Promise.resolve();
  return fetch(base + 'index.json?v=2').then(r => r.ok ? r.json() : {}).then(ix => Promise.all(Object.entries(ix).map(([id, m]) => new Promise(res => {
    const im = new Image(); im.onload = () => { SPR[id] = {...m, im}; onLoad(); res(); }; im.onerror = res; im.src = base + id + '.png?v=2';
  })))).catch(() => {});
}
const legOf = k => k.h - k.ch * .55;
const strideLen = (k, v) => Math.pow(legOf(k) + k.L * .6, .8) * (1.3 + .12 * v);
const COLORS = ['#4cc3ff', '#ff7a59', '#7be37b', '#ffd23f'];

// ------------------------------------------------------------------ симуляция
export function makeRace(ids, D = 200) {
  let seed = (Math.random() * 1e9 | 0) + 1; const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
  const list = ids.map(byId);
  const racers = list.map((a, i) => ({a, i, x: 0, v: 0, phi: rnd(), fin: null, rt: .06 + rnd() * .2, luck: 1 + (rnd() - .5) * .03, ph0: rnd() * 6, top: 0, col: COLORS[i], seen: 0}));
  const S = {list, ids, D, racers, phase: 'intro', phaseT: 0, clock: 0, T: 0, camW: 6, camL: -3, result: null, events: [], done: false, cd: -1, lastStep: 0};
  const KM = 3.6;
  const spread = () => { const xs = racers.map(r => r.x); return Math.max(...xs) - Math.min(...xs); };
  S.step = dt => {
    S.T += dt; S.phaseT += dt;
    if (S.phase === 'intro') { if (S.phaseT >= 2.2) { S.phase = 'countdown'; S.phaseT = 0; S.cd = -1; } }
    else if (S.phase === 'countdown') {
      const stage = Math.floor(S.phaseT);
      if (stage !== S.cd && stage <= 3) { S.cd = stage; S.events.push({t: stage < 3 ? 'count' : 'go', n: 3 - stage}); }
      if (S.phaseT >= 3) { S.phase = 'race'; S.phaseT = 0; S.clock = 0; }
    } else if (S.phase === 'race' || S.phase === 'finish') {
      const n = Math.max(1, Math.ceil(dt / (1 / 120))), h = dt / n;
      for (let k = 0; k < n; k++) {
        S.clock += h;
        racers.forEach(r => {
          const a = r.a;
          if (S.clock < r.rt) return;
          const fade = r.x < a.end ? 1 : clamp(1 - (r.x - a.end) / (a.end * .5 + 30), 0, 1);
          let vt = (a.cruise + (a.kmh - a.cruise) * fade) / KM * r.luck * (1 + .012 * Math.sin(S.clock * .9 + r.ph0));
          if (r.fin != null && S.clock - r.fin > .9) vt = 0;
          const tau = vt > r.v ? a.tau : 1.4; r.v += (vt - r.v) / tau * h;
          const px = r.x; r.x += r.v * h; r.phi += r.v / strideLen(a.look, r.v) * h; r.top = Math.max(r.top, r.v * KM);
          if (r.fin == null && r.x >= D) { r.fin = S.clock - (r.x - D) / Math.max(r.v, .1); S.events.push({t: 'fin', i: r.i}); }
        });
      }
      const lead = racers.reduce((m, r) => r.x > m.x ? r : m, racers[0]);
      if (Math.floor(lead.phi * 1) > lead.seen) { lead.seen = Math.floor(lead.phi); S.events.push({t: 'step', v: lead.v}); }
      if (S.phase === 'race') {
        const fins = racers.filter(r => r.fin != null).length, first = Math.min(...racers.map(r => r.fin ?? 1e9));
        if (fins === racers.length || (fins > 0 && S.clock > first + (racers.length === 2 ? 2.6 : 3.6) && fins >= Math.min(racers.length, 2)) || S.clock > 90) { S.phase = 'finish'; S.phaseT = 0; }
      } else if (S.phaseT >= 1.1) { S.phase = 'result'; S.phaseT = 0; S.result = rank(); S.events.push({t: 'result'}); }
    } else if (S.phase === 'result') { if (S.phaseT >= 6) S.done = true; }
    // камера: жеткізушіні қуады, бәрін кадрда ұстайды
    const lead = Math.max(...racers.map(r => r.x)), W = clamp(spread() * 1.55 + 5.5, 5.5, 48), tl = Math.min(lead - W * .72, D - W * .55);
    S.camW += (W - S.camW) * Math.min(1, dt * 2.2); const last = Math.min(...racers.map(r => r.x)), want = Math.min((lead + last) / 2 - S.camW * .42, D - S.camW * .55); S.camL = S.phase === 'intro' || S.phase === 'countdown' ? lerp(S.camL, want, Math.min(1, dt * 3)) : want;
  };
  function rank() {
    const rows = racers.map(r => ({i: r.i, a: r.a, col: r.col, fin: r.fin, gap: r.fin == null ? Math.max(0, D - r.x) : 0, avg: r.fin ? D / r.fin * KM : r.x / Math.max(S.clock, .1) * KM, top: r.top}))
      .sort((p, q) => (p.fin ?? 1e9) - (q.fin ?? 1e9) || p.gap - q.gap);
    const w = rows[0], s = rows[1];
    return {rows, winner: w, margin: w.fin != null && s?.fin != null ? s.fin - w.fin : null, marginM: s && w.fin != null && s.fin == null ? s.gap : null};
  }
  S.order = () => racers.map(r => r).sort((p, q) => (p.fin ?? 1e9) - (q.fin ?? 1e9) || q.x - p.x).map(r => r.i);
  return S;
}

// ------------------------------------------------------------------ сурет
const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16), c = k => clamp(Math.round(((n >> k) & 255) * (1 + f)), 0, 255); return `rgb(${c(16)},${c(8)},${c(0)})`; };
function smooth(ctx, pts) {
  const n = pts.length; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 0; i < n; i++) { const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n]; ctx.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]); }
  ctx.closePath();
}
function ik(ax, ay, bx, by, l1, l2, sg) {
  const dx = bx - ax, dy = by - ay; let d = Math.hypot(dx, dy) || 1e-6; d = Math.min(d, l1 + l2 - 1e-4); const ux = dx / Math.hypot(dx, dy), uy = dy / Math.hypot(dx, dy);
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), hh = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const mx = ax + ux * a + sg * hh * -uy, my = ay + uy * a + sg * hh * ux; return [mx, my, ax + ux * d, ay + uy * d];
}
function rng(seed) { let s = seed | 0 || 1; return () => (s = s * 16807 % 2147483647) / 2147483647; }

// Бір жануарды метрмен (y жоғары) салады: ctx орнатылған — бастапқы нүкте: дене ортасы астындағы жер
export function drawAnimal(ctx, a, r, t) {
  const k = a.look, L = k.L, h = k.h, ch = k.ch, v = r?.v || 0, phi = r?.phi || 0, g = sm(2.2, 5.5, v), vk = sm(3, 14, v) , tw = t;
  const leg = legOf(k), hipH = h * .97, hl = hipH - ch * .3, Ls = strideLen(k, v), lt = (.04 + h * .05) * k.thick;
  const bob = (.034 * h * Math.cos(2 * PI * phi + .6)) * g + .006 * h * Math.sin(tw * 3.1) * (1 - g), pitch = .075 * Math.sin(2 * PI * phi + .9) * g + .01 * Math.sin(tw * 2) * (1 - g);
  const cx0 = 0, cy0 = h * .78, cs = Math.cos(pitch), sn = Math.sin(pitch);
  const bp = ([x, y]) => [cx0 + (x - cx0) * cs - (y - cy0) * sn, cy0 + (x - cx0) * sn + (y - cy0) * cs + bob];
  const dark = shade(k.leg || k.col, -.32), legCol = k.leg || k.col;
  // аяқ іздері
  const foot = (p, jx, ll) => {
    const R = Math.min(1.5 * ll, Ls * .5) * clamp(v / 2.2, 0, 1), ds = clamp(R / Ls, .12, .5), q = ((p % 1) + 1) % 1, lift = (.18 + .22 * g) * ll;
    if (R < .02) return [jx, 0];
    if (q < ds) return [jx + R / 2 - R * (q / ds), 0];
    const u = (q - ds) / (1 - ds), e = u * u * (3 - 2 * u); return [jx - R / 2 + R * e, lift * Math.pow(Math.sin(PI * u), .75)];
  };
  const off = g2 => ({hn: 0, hf: lerp(.5, .1, g2), ff: lerp(0, .5, g2), fn: lerp(.5, .62, g2)});
  const o = off(g), fj = [L / 2 - .06 * L, h - ch * .5], hj = [-L / 2 + .1 * L, hipH - ch * .25];
  const limb = (front, ph, far) => {
    const J = bp(front ? fj : hj), ll = front ? leg : hl, l3 = ll * (front ? .17 : .27), f = foot(phi + ph, front ? fj[0] : hj[0], ll);
    const tgt = front ? [f[0] + .02, f[1] + l3] : [f[0] - .3 * l3, f[1] + .94 * l3];
    const [mx, my, ex, ey] = front ? ik(J[0], J[1], tgt[0], tgt[1], ll * .42, ll * .42, -1) : ik(J[0], J[1], tgt[0], tgt[1], ll * .4, ll * .4, 1);
    const col = far ? dark : legCol, w1 = lt * (front ? 1.25 : 1.9), w2 = lt * .8, w3 = lt * .6;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = col;
    ctx.lineWidth = w1; ctx.beginPath(); ctx.moveTo(J[0], J[1]); ctx.lineTo(mx, my); ctx.stroke();
    ctx.lineWidth = w2; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.lineWidth = w3; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(f[0], f[1] + .01); ctx.stroke();
    ctx.fillStyle = k.kind === 'wild' && k.h > 1.2 ? '#1a1410' : shade(k.leg || k.col, -.12); ctx.beginPath(); ctx.ellipse(f[0] + w3 * .55, f[1] + w3 * .35, w3 * .95, w3 * .6, 0, 0, 7); ctx.fill();
  };
  // көлеңке
  ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(0, -.01, L * .75 * (1 - .12 * g), .05 + h * .04, 0, 0, 7); ctx.fill();
  // шалғай аяқтар
  limb(false, o.hf, true); limb(true, o.ff, true);
  // құйрық
  { const base = bp([-L / 2 - .02 * L, hipH + .02]), wave = Math.sin(2 * PI * phi * 2 + 1) * .12 * g + Math.sin(tw * 4) * .05, an = .3 + .2 * g * Math.sin(2 * PI * phi + 2) + wave - .25 * g;
    const tl = k.tl, ex = base[0] - tl * Math.cos(an * (k.dog ? 1 : .6)), ey = base[1] + tl * Math.sin(an) * (k.dog ? 1 : .5) - (k.dog ? 0 : tl * .35 * (1 - g));
    ctx.strokeStyle = shade(k.col, -.05); ctx.lineCap = 'round';
    const tw0 = .022 + k.tb * .06 * (k.tl > .3 ? 1 : .6); ctx.lineWidth = tw0; ctx.beginPath(); ctx.moveTo(base[0], base[1]); ctx.quadraticCurveTo((base[0] + ex) / 2, (base[1] + ey) / 2 + tl * .22, ex, ey); ctx.stroke();
    if (k.tuft || k.tb > .45) { ctx.strokeStyle = k.tuft || shade(k.col, .1); ctx.lineWidth = tw0 * 1.1; ctx.beginPath(); ctx.moveTo((base[0] * .25 + ex * .75), (base[1] * .25 + ey * .75) + tl * .08); ctx.lineTo(ex, ey); ctx.stroke(); } }
  // дене
  const arch = .03 * h * Math.sin(2 * PI * phi + 2.2) * g, tuck = ch * (.1 + .1 * g);
  const body = [[-L / 2 - .05 * L, hipH + .03], [-L * .3, hipH + .05 * h], [0, h * .99 + arch], [L * .36, h * 1.02], [L / 2 + .02, h * .99], [L / 2 + .1 * h + ch * .12, h - ch * .45], [L / 2 - .06 * L, h - ch * 1.0], [L * .05, h - ch * .9 + tuck], [-L * .27, h - ch * .66], [-L / 2 - .01, hipH - ch * .5]].map(bp);
  smooth(ctx, body); ctx.fillStyle = k.col; ctx.fill();
  ctx.save(); smooth(ctx, body); ctx.clip();
  if (k.bl) { ctx.fillStyle = k.bl; ctx.beginPath(); ctx.ellipse(L * .1, bp([0, h - ch])[1] - ch * .12, L * .52, ch * .42, 0, 0, 7); ctx.fill(); }
  pattern(ctx, k, bp, L, h, ch, hipH);
  ctx.restore();
  { const hq = bp([-L * .3, hipH - ch * .3]), sq = bp([L * .3, h - ch * .5]); ctx.fillStyle = k.col; ctx.beginPath(); ctx.ellipse(hq[0], hq[1], L * .19, ch * .6, pitch - .5, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(sq[0], sq[1], L * .12, ch * .48, pitch + .5, 0, 7); ctx.fill(); }
  // мойын + жал
  const thN = lerp(k.dog ? .62 : .8, k.dog ? .22 : .35, vk) + (k.up || 0) * (1 - .35 * vk) + Math.sin(2 * PI * phi + .3) * .06 * g, nt = bp([L / 2 - .02, h + .02]), nb = bp([L / 2 + .02, h - ch * .75]);
  const HB = [nt[0] + k.nk * Math.cos(thN), nt[1] + k.nk * Math.sin(thN)], thH = thN - lerp(.6, .3, vk) - .08, dx = Math.cos(thH), dy = Math.sin(thH), px = -dy, py = dx, nw = k.hd * .36;
  if (k.mane && k.kind === 'wild' && !k.tuft?.startsWith('#4')) { // жал (ат/зебра)
    ctx.fillStyle = k.mane; smooth(ctx, [[nt[0] - .08 * L, nt[1] + .02], [(nt[0] + HB[0]) / 2 - .05, (nt[1] + HB[1]) / 2 + k.hd * .3], [HB[0] - .06, HB[1] + k.hd * .3], [HB[0] + .04, HB[1] + .06], [(nt[0] + HB[0]) / 2, (nt[1] + HB[1]) / 2], [nt[0], nt[1] - .06]]); ctx.fill();
  }
  smooth(ctx, [nt, [(nt[0] + HB[0]) / 2 + px * nw * .5, (nt[1] + HB[1]) / 2 + py * nw * .5 + .01], [HB[0] + px * nw * .55, HB[1] + py * nw * .55], [HB[0] - px * nw * .6, HB[1] - py * nw * .6], [(nb[0] + HB[0]) / 2, (nb[1] + HB[1]) / 2 - nw * .55], nb]); ctx.fillStyle = k.col; ctx.fill();
  if (k.mane && k.tuft?.startsWith('#4')) { ctx.fillStyle = k.mane; ctx.beginPath(); ctx.ellipse(HB[0] - .04, HB[1] - .03, k.hd * .72, k.hd * .78, 0, 0, 7); ctx.fill(); } // арыстан жалы
  // бас
  const Hp = (x, y) => { const s = x < .45 ? x : .45 + (x - .45) * (k.sn / .5); return [HB[0] + dx * k.hd * s + px * k.hd * y, HB[1] + dy * k.hd * s + py * k.hd * y]; };
  const open = .1 + .12 * g * (k.dog ? 1 : .6);
  if (k.kind === 'dog' || k.sn < .45 || true) { // төменгі жақ
    ctx.fillStyle = shade(k.bl || k.col, -.1); smooth(ctx, [Hp(.3, -.16), Hp(.82, -.1 - open), Hp(.98, -.08 - open * .9), Hp(.7, -.2 - open * 1.3), Hp(.4, -.28)]); ctx.fill();
    if (k.dog && g > .3) { ctx.fillStyle = '#e7788f'; const fl = Math.sin(tw * 22) * .02; ctx.beginPath(); ctx.ellipse(...Hp(.6, -.2 - open * 1.5 - fl), k.hd * .09, k.hd * .16, thH - .2, 0, 7); ctx.fill(); }
  }
  smooth(ctx, [Hp(-.02, 0), Hp(.14, .3), Hp(.45, .27), Hp(.82, .15), Hp(1.03, .09), Hp(1.05, -.02), Hp(.95, -.1), Hp(.72, -.09), Hp(.4, -.16), Hp(.1, -.28), Hp(-.04, -.15)]);
  ctx.fillStyle = k.pat === 'mask' ? k.pc : (k.dog ? k.col : k.col); ctx.fill();
  if (k.bl && k.dog && k.pat !== 'mask') { ctx.save(); ctx.clip(); ctx.fillStyle = k.pat === 'blaze' ? k.pc : shade(k.bl, 0); ctx.globalAlpha = k.pat === 'blaze' ? .9 : .5; ctx.beginPath(); ctx.ellipse(...Hp(.75, -.1), k.hd * .45, k.hd * .12, thH, 0, 0, 7); ctx.fill(); ctx.restore(); }
  if (k.pat === 'spots') { ctx.fillStyle = k.pc; [[.3, .1, .05], [.55, .15, .04], [.2, -.1, .045]].forEach(([x, y, rr]) => { ctx.beginPath(); ctx.arc(...Hp(x, y), k.hd * rr, 0, 7); ctx.fill(); }); }
  if (k.pat === 'stripes' && !k.dog) { ctx.strokeStyle = k.pc; ctx.lineWidth = k.hd * .05; [[.2, .3, .3, -.25], [.4, .27, .45, -.15], [.1, .25, .12, -.2]].forEach(([x1, y1, x2, y2]) => { ctx.beginPath(); ctx.moveTo(...Hp(x1, y1)); ctx.lineTo(...Hp(x2, y2)); ctx.stroke(); }); }
  if (k.pat === 'rosettes') { ctx.fillStyle = k.pc; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(...Hp(.1 + i * .08, .12 - (i % 2) * .15), k.hd * .018, 0, 7); ctx.fill(); } ctx.strokeStyle = k.pc; ctx.lineWidth = k.hd * .035; ctx.beginPath(); ctx.moveTo(...Hp(.4, .02)); ctx.quadraticCurveTo(...Hp(.4, -.12), ...Hp(.55, -.22)); ctx.stroke(); } // гепардтың «көз жасы» сызығы
  ctx.fillStyle = '#15110f'; ctx.beginPath(); ctx.ellipse(...Hp(1.03, .03), k.hd * .06, k.hd * .055, 0, 0, 7); ctx.fill(); // мұрын
  ctx.strokeStyle = '#2a1a1a'; ctx.lineWidth = k.hd * .018; ctx.beginPath(); ctx.moveTo(...Hp(.95, -.08)); ctx.lineTo(...Hp(.5, -.06 - open * .5)); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(...Hp(.42, .11), k.hd * .05, k.hd * .04, thH, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#120d0a'; ctx.beginPath(); ctx.arc(...Hp(.44, .11), k.hd * .035, 0, 7); ctx.fill();
  // құлақ
  const fl = Math.sin(2 * PI * phi * 2 + .7) * .22 * g, e0 = Hp(.2, .27), ec = shade(k.col, k.col === '#f4f1ea' || k.col === '#f5f1e8' ? -.35 : -.15);
  ctx.fillStyle = ec; ctx.save(); ctx.translate(e0[0], e0[1]); ctx.rotate(thH);
  const E = k.ear, hd = k.hd;
  if (E === 'point' || E === 'big' || E === 'huge') { const hh = hd * (E === 'huge' ? 1.6 : E === 'big' ? .75 : .52), ww = hd * (E === 'big' ? .3 : .17); ctx.rotate(-.15 - (E === 'huge' ? .5 - fl : 0)); smooth(ctx, [[-ww, 0], [0, hh], [ww, 0], [0, -hd * .04]]); ctx.fill(); }
  else if (E === 'round') { ctx.beginPath(); ctx.ellipse(.02 * hd, hd * .1, hd * .1, hd * .12, 0, 0, 7); ctx.fill(); }
  else if (E === 'rose') { ctx.rotate(-.5 - fl); smooth(ctx, [[0, 0], [-hd * .3, hd * .06], [-hd * .15, hd * .2], [hd * .02, hd * .12]]); ctx.fill(); }
  else if (E === 'long') { ctx.rotate(-.1 - fl * 1.3); smooth(ctx, [[0, hd * .08], [-hd * .75, -hd * .08], [-hd * .85, -hd * .3], [-hd * .2, -hd * .3], [hd * .08, -hd * .05]]); ctx.fill(); }
  else { ctx.rotate(-.2 - fl * 1.2 - .3 * g); smooth(ctx, [[0, hd * .1], [-hd * .42, -hd * .02], [-hd * .34, -hd * .3], [-hd * .02, -hd * .22]]); ctx.fill(); }
  ctx.restore();
  // жақын аяқтар
  limb(false, o.hn, false); limb(true, o.fn, false);
}
function pattern(ctx, k, bp, L, h, ch, hipH) {
  if (!k.pat || k.pat === 'mask' || k.pat === 'blaze' && false) return;
  const R = rng(k.id ? k.id.length * 7 + 3 : 5), p = (x, y) => bp([x, y]);
  if (k.pat === 'spots' || k.pat === 'rosettes') { const n = k.pat === 'spots' ? 38 : 70, rr = k.pat === 'spots' ? .035 + .006 * h : .016 + .012 * h; ctx.fillStyle = k.pc; for (let i = 0; i < n; i++) { const x = (R() - .5) * L * 1.05, y = hipH - ch * .95 + R() * (ch * 1.05), q = p(x, y); ctx.beginPath(); ctx.arc(q[0], q[1], rr * (.6 + R() * .8), 0, 7); ctx.fill(); } }
  else if (k.pat === 'stripes') { ctx.strokeStyle = k.pc; ctx.lineWidth = h * (k.kind === 'wild' && k.h > 1.2 ? .05 : .035); for (let x = -L / 2; x < L / 2 + .05; x += h * (k.h > 1.2 ? .11 : .09)) { const a = p(x, h * 1.05), b = p(x - .06 - ch * .2, h - ch * 1.05); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); } }
  else if (k.pat === 'saddle') { ctx.fillStyle = k.pc; smooth(ctx, [p(-L * .52, hipH + .06), p(-L * .1, h * 1.06), p(L * .42, h * 1.06), p(L * .35, h - ch * .35), p(L * .05, h - ch * .55), p(-L * .3, h - ch * .35), p(-L * .5, hipH - ch * .3)]); ctx.fill(); }
  else if (k.pat === 'patch') { ctx.fillStyle = k.pc; [[-.2, 0, .1], [.2, -.05, .09]].forEach(([x, y, rr]) => { const q = p(x * L, h - ch * .45 + y); ctx.beginPath(); ctx.ellipse(q[0], q[1], rr * L * 1.2, ch * .3, 0, 0, 7); ctx.fill(); }); }
  else if (k.pat === 'blaze') { ctx.fillStyle = k.pc; smooth(ctx, [p(L / 2 + .3, h - ch * .2), p(L * .32, h - ch * .35), p(L * .2, h - ch * 1.1), p(L / 2 + .3, h - ch * 1.1)]); ctx.fill(); }
}

// ------------------------------------------------------------------ сахна
function txt(ctx, s, x, y, sz, o = {}) {
  ctx.save(); ctx.font = `${o.w || 800} ${sz}px "Segoe UI", system-ui, Arial, sans-serif`; ctx.textAlign = o.a || 'left'; ctx.textBaseline = 'middle';
  if (o.max) while (ctx.measureText(s).width > o.max && sz > 10) { sz -= 2; ctx.font = `${o.w || 800} ${sz}px "Segoe UI", system-ui, Arial, sans-serif`; }
  if (o.stroke) { ctx.lineJoin = 'round'; ctx.lineWidth = sz * .16; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.strokeText(s, x, y); }
  ctx.fillStyle = o.c || '#fff'; ctx.fillText(s, x, y); ctx.restore();
}
const rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); };
const noise = x => Math.sin(x * 1.0) * .5 + Math.sin(x * 2.3 + 1.7) * .3 + Math.sin(x * 5.1 + .4) * .15 + Math.sin(x * 11.7) * .05;
function ridge(ctx, w, yb, amp, par, camX, f, c1, c2) {
  const g = ctx.createLinearGradient(0, yb - amp, 0, yb); g.addColorStop(0, c1); g.addColorStop(1, c2); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, yb);
  for (let x = 0; x <= w + 8; x += 8) ctx.lineTo(x, yb - amp * (.5 + .5 * Math.abs(noise((x + camX * par) * f))) - amp * .12);
  ctx.lineTo(w, yb); ctx.closePath(); ctx.fill();
}

export function drawAnimalRace(ctx, w, h, S, o = {}) {
  const tall = h > w * 1.1, u = tall ? w / 1080 : h / 1080, N = S.racers.length, D = S.D;
  const ys = tall ? 400 * u : 120 * u, sh = tall ? Math.min(1180 * u, h - ys - (150 * N + 140) * u) : h - ys - 215 * u;
  const hz = sh * (tall ? .3 : .33), laneTop = ys + hz, lh = (sh - hz) / N, W = S.camW, camL = S.camL;
  ctx.fillStyle = '#0c1118'; ctx.fillRect(0, 0, w, h);
  // аспан + таулар
  ctx.save(); ctx.beginPath(); ctx.rect(0, ys, w, sh); ctx.clip();
  const sky = ctx.createLinearGradient(0, ys, 0, laneTop); sky.addColorStop(0, '#6fb2ee'); sky.addColorStop(1, '#dcecf8'); ctx.fillStyle = sky; ctx.fillRect(0, ys, w, hz + 2);
  ctx.fillStyle = 'rgba(255,255,255,.75)'; [[.15, .25, 90], [.55, .15, 120], [.85, .32, 80]].forEach(([fx, fy, rw], i) => { const cx = ((fx * w - camL * 3 * u * (1 + i * .3)) % (w + 300) + w + 300) % (w + 300) - 150; ctx.beginPath(); ctx.ellipse(cx, ys + hz * fy, rw * u * 1.4, rw * u * .32, 0, 0, 7); ctx.ellipse(cx + rw * u * .6, ys + hz * fy - 12 * u, rw * u * .8, rw * u * .3, 0, 0, 7); ctx.fill(); });
  ridge(ctx, w, laneTop - 24 * u, hz * .72, 6 * u, camL, .0075, '#e8eef7', '#6d86a6');
  ridge(ctx, w, laneTop - 24 * u, hz * .46, 16 * u, camL, .012, '#7a9a78', '#3f6a48');
  ridge(ctx, w, laneTop - 22 * u, hz * .22, 40 * u, camL, .02, '#2e5a38', '#1f4129');
  // қоршау
  const wy = laneTop - 26 * u, wh = 40 * u; ctx.fillStyle = '#d6dadd'; ctx.fillRect(0, wy, w, wh); ctx.fillStyle = '#b6bcc1'; ctx.fillRect(0, wy + wh - 6 * u, w, 6 * u);
  const s0 = w / W, mk = D > 250 ? 100 : 50;
  ctx.restore();
  const kmax = Math.max(...S.list.map(a => a.look.h + a.look.nk * .8 + a.look.hd * .4)), sA = Math.min(lh * .86 / kmax, 330 * u);
  // жолақтар
  ctx.save(); ctx.beginPath(); ctx.rect(0, laneTop, w, sh - hz); ctx.clip();
  for (let i = 0; i < N; i++) {
    ctx.fillStyle = i % 2 ? '#b4573d' : '#bf6347'; ctx.fillRect(0, laneTop + i * lh, w, lh + 1);
    { const per = 1.6 * sA, off = S.racers[i].x * sA; ctx.fillStyle = 'rgba(0,0,0,.055)'; for (let px = -(off % (2 * per)) - 2 * per; px < w; px += 2 * per) ctx.fillRect(px, laneTop + i * lh, per, lh); }
    if (i) { ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(0, laneTop + i * lh - 3 * u, w, 6 * u); }
  }
  ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(0, laneTop, w, 5 * u);
  // старт / финиш
  const sx = m => (m - camL) * s0;
  if (sx(0) > -60 && sx(0) < w + 60) { ctx.fillStyle = '#fff'; ctx.fillRect(sx(0) - 8 * u, laneTop, 16 * u, sh - hz); }
  const fx = sx(D), cw = Math.max(18 * u, .5 * s0), ck = (sh - hz) / Math.round((sh - hz) / (cw / 2));
  if (fx > -cw && fx < w + cw) for (let r = 0, y = laneTop; y < laneTop + sh - hz; r++, y += ck) for (let c = 0; c < 2; c++) { ctx.fillStyle = (r + c) % 2 ? '#111' : '#fff'; ctx.fillRect(fx + (c - 1) * cw / 2, y, cw / 2, ck); }
  ctx.restore();
  // қоршаудағы қашықтық тақталары
  for (let m = mk; m < D; m += mk) { const x = sx(m); if (x < -80 * u || x > w + 80 * u) continue; ctx.fillStyle = '#1b2733'; rr(ctx, x - 52 * u, wy - 4 * u, 104 * u, 34 * u, 6 * u); ctx.fill(); txt(ctx, m + ' m', x, wy + 13 * u, 26 * u, {a: 'center', c: '#fff'}); }
  if (fx > -200 * u && fx < w + 200 * u) { ctx.fillStyle = '#e9344a'; rr(ctx, fx - 100 * u, ys + hz * .05, 200 * u, 56 * u, 10 * u); ctx.fill(); txt(ctx, 'FINISH', fx, ys + hz * .05 + 28 * u, 36 * u, {a: 'center'}); ctx.fillStyle = '#2a2f36'; ctx.fillRect(fx - 4 * u, ys + hz * .05 + 56 * u, 8 * u, wy - (ys + hz * .05 + 56 * u)); }
  // жануарлар
  const order = [...S.racers].sort((p, q) => p.i - q.i);
  order.forEach(r => {
    const a = r.a, k = a.look, gy = laneTop + (r.i + 1) * lh - lh * .1, bx = sx(r.x) - (k.L / 2 + .15) * sA;
    // шаң
    if (r.v > 6) for (let j = 0; j < 5; j++) { const age = (S.T * 2.4 + j * .2) % 1; ctx.fillStyle = `rgba(220,190,150,${(1 - age) * .3 * clamp(r.v / 14, 0, 1)})`; ctx.beginPath(); ctx.arc(bx - (k.L / 2 + age * 1.6) * sA, gy - age * .35 * sA - .05 * sA, (.06 + age * .22) * k.h * sA * 1.4, 0, 7); ctx.fill(); }
    const sp = SPR[a.id]; let spH = 0;
    if (sp) { // нақты кадрлар
      const wpx = (k.L + k.nk * .8 + k.hd * .5 + k.tl * .9) * 1.08 * sA, hpx = wpx * sp.fh / sp.fw, fi = r.v < .3 ? 0 : Math.floor(((r.phi % 1) + 1) % 1 * sp.n) % sp.n; spH = hpx;
      ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(bx, gy, wpx * .42, hpx * .05 + 4 * u, 0, 0, 7); ctx.fill();
      ctx.drawImage(sp.im, fi * sp.fw, 0, sp.fw, sp.fh, bx - wpx / 2, gy - hpx + hpx * .02, wpx, hpx);
    } else { ctx.save(); ctx.translate(bx, gy); ctx.scale(sA, -sA); drawAnimal(ctx, a, r, S.T); ctx.restore(); }
    // жазу: аты + жылдамдық
    const tx = clamp(bx, 90 * u, w - 90 * u), ty = gy - (spH || (k.h + k.nk * .8 + k.hd * .3) * sA) - 20 * u;
    ctx.fillStyle = 'rgba(8,12,18,.72)'; rr(ctx, tx - 100 * u, ty - 17 * u, 200 * u, 34 * u, 17 * u); ctx.fill(); ctx.fillStyle = r.col; ctx.beginPath(); ctx.arc(tx - 82 * u, ty, 8 * u, 0, 7); ctx.fill();
    txt(ctx, a.name, tx - 66 * u, ty + 1, 19 * u, {max: 150 * u});
    if (sx(r.x) < 40 * u) txt(ctx, `◀ ${Math.max(0, Math.max(...S.racers.map(q => q.x)) - r.x).toFixed(0)} m`, 30 * u, gy - lh * .4, 26 * u, {c: r.col, stroke: 1});
  });
  hud(ctx, w, h, S, {tall, u, ys, sh, N});
  if (S.phase === 'result' && S.result) resultPanel(ctx, w, h, S, {tall, u});
}

function hud(ctx, w, h, S, {tall, u, ys, sh, N}) {
  const names = S.list.map(a => a.name), D = S.D, order = S.order();
  // тақырып
  const intro = S.phase === 'intro' || S.phase === 'countdown';
  txt(ctx, intro ? 'WHO WINS? 🏁' : `${Math.round(D)} m SPRINT`, w / 2, (tall ? 100 : 36) * u, (tall ? 86 : 52) * u, {a: 'center', stroke: 1, max: w * .94});
  txt(ctx, names.length > 2 ? names.join(' · ') : names.join('  vs  '), w / 2, (tall ? 185 : 82) * u, (tall ? 44 : 30) * u, {a: 'center', c: '#ffe08a', stroke: 1, w: 800, max: w * .94});
  if (tall) txt(ctx, 'Real top-speed data · AI simulation', w / 2, 246 * u, 28 * u, {a: 'center', c: '#cfe3ff', w: 600, stroke: 1});
  // прогресс жолағы
  const bx = (tall ? 70 : 560) * u, bw = w - bx * (tall ? 1 : 1) - (tall ? 70 : 560) * u * (tall ? 1 : 1), by = (tall ? 330 : 100) * u;
  if (tall) {
    ctx.fillStyle = 'rgba(255,255,255,.18)'; rr(ctx, bx, by, w - bx * 2, 18 * u, 9 * u); ctx.fill();
    S.racers.forEach(r => { const px = bx + (w - bx * 2) * clamp(r.x / D, 0, 1); ctx.fillStyle = r.col; ctx.beginPath(); ctx.arc(px, by + 9 * u, 17 * u, 0, 7); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3 * u; ctx.stroke(); txt(ctx, String(r.i + 1), px, by + 10 * u, 20 * u, {a: 'center', c: '#0b1118', w: 900}); });
    txt(ctx, 'START', bx, by + 44 * u, 20 * u, {c: '#fff', stroke: 1}); txt(ctx, `🏁 ${Math.round(D)} m`, w - bx, by + 44 * u, 20 * u, {a: 'right', stroke: 1});
  }
  // карточкалар
  const top = tall ? ys + sh + 22 * u : h - 200 * u, avail = tall ? h - top - 40 * u : 170 * u, ch = tall ? Math.min(150 * u, avail / N - 10 * u) : avail, cwid = tall ? w - 70 * u : (w - 60 * u) / N - 12 * u;
  S.racers.forEach(r => {
    const pos = order.indexOf(r.i) + 1, x = tall ? 35 * u : 30 * u + r.i * (cwid + 12 * u), y = tall ? top + r.i * (ch + 10 * u) : top;
    ctx.fillStyle = 'rgba(10,16,24,.82)'; rr(ctx, x, y, cwid, ch, 20 * u); ctx.fill(); ctx.fillStyle = r.col; rr(ctx, x, y, 12 * u, ch, 6 * u); ctx.fill();
    const lead = Math.min(D, Math.max(...S.racers.map(q => q.x))), gap = lead - Math.min(D, r.x);
    txt(ctx, `P${pos}`, x + 66 * u, y + ch * .5, Math.min(56 * u, ch * .45), {a: 'center', c: pos === 1 ? '#ffd23f' : '#cfd8e3', w: 900});
    txt(ctx, r.a.name, x + 120 * u, y + ch * .33, Math.min(36 * u, ch * .26), {max: cwid * (tall ? .5 : .62) - 120 * u});
    txt(ctx, `top speed ${r.a.kmh} km/h` + (r.a.end < D * 1.2 ? ' · sprinter' : ''), x + 120 * u, y + ch * .72, Math.min(23 * u, ch * .17), {c: '#93a4b8', w: 600, max: cwid * .5 - 120 * u});
    const kmh = r.v * 3.6; txt(ctx, `${kmh.toFixed(0)}`, x + cwid - 150 * u, y + ch * .45, Math.min(64 * u, ch * .5), {a: 'right', w: 900, c: kmh > r.a.kmh * .9 ? '#ff8a5c' : '#fff'}); txt(ctx, 'km/h', x + cwid - 28 * u, y + ch * .5, Math.min(26 * u, ch * .2), {a: 'right', c: '#93a4b8', w: 700});
    if (pos > 1 && r.fin == null && S.phase !== 'intro') txt(ctx, `+${gap.toFixed(1)} m`, x + cwid - 28 * u, y + ch * .8, Math.min(24 * u, ch * .17), {a: 'right', c: '#ff9b9b', w: 800});
    if (r.fin != null) txt(ctx, `${r.fin.toFixed(2)} s ✔`, x + cwid - 28 * u, y + ch * .8, Math.min(24 * u, ch * .17), {a: 'right', c: '#7be37b', w: 800});
  });
  // санау
  if (S.phase === 'countdown') { const st = Math.floor(S.phaseT), f = S.phaseT % 1, s = st < 3 ? String(3 - st) : 'GO!'; ctx.save(); ctx.globalAlpha = 1 - f * .6; txt(ctx, s, w / 2, ys + sh * .52, (st < 3 ? 300 : 230) * u * (1 + (1 - f) * .15), {a: 'center', w: 900, c: st < 3 ? '#fff' : '#7be37b', stroke: 1}); ctx.restore(); }
  if (S.phase === 'race' && S.clock < .9) { ctx.save(); ctx.globalAlpha = 1 - S.clock / .9; txt(ctx, 'GO!', w / 2, ys + sh * .52, 230 * u, {a: 'center', w: 900, c: '#7be37b', stroke: 1}); ctx.restore(); }
  if (S.phase === 'race' || S.phase === 'finish') txt(ctx, `${Math.max(0, S.clock).toFixed(1)} s`, w - 40 * u, ys + 30 * u, 34 * u, {a: 'right', stroke: 1});
}

function resultPanel(ctx, w, h, S, {tall, u}) {
  const R = S.result, a = Math.min(1, S.phaseT / .4); ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = 'rgba(5,8,12,.82)'; ctx.fillRect(0, 0, w, h);
  const cx = w / 2, W = tall ? w : h * 1.78, k = tall ? 1 : 1; let y = (tall ? 250 : 130) * u;
  txt(ctx, 'WINNER 🏆', cx, y, (tall ? 90 : 70) * u, {a: 'center', c: '#ffd23f', stroke: 1}); y += (tall ? 120 : 90) * u;
  txt(ctx, R.winner.a.name, cx, y, (tall ? 110 : 80) * u, {a: 'center', stroke: 1, max: w * .92}); y += (tall ? 100 : 70) * u;
  txt(ctx, R.margin != null ? `won by ${R.margin.toFixed(2)} s` : R.marginM != null ? `ahead by ${R.marginM.toFixed(0)} m` : 'photo finish!', cx, y, 44 * u, {a: 'center', c: '#9ce0ff', w: 700}); y += (tall ? 110 : 75) * u;
  const rh = Math.min(120 * u, ((tall ? h - 330 * u : h - 40 * u) - y) / R.rows.length - 10 * u), x0 = (tall ? 50 : w * .2) * u / (tall ? 1 : u), cw = tall ? w - 100 * u : w * .6;
  R.rows.forEach((r, i) => { const yy = y + i * (rh + 10 * u); ctx.fillStyle = i ? 'rgba(255,255,255,.07)' : 'rgba(255,210,63,.16)'; rr(ctx, x0, yy, cw, rh, 16 * u); ctx.fill(); ctx.fillStyle = r.col; rr(ctx, x0, yy, 10 * u, rh, 5 * u); ctx.fill();
    txt(ctx, `${i + 1}`, x0 + 50 * u, yy + rh / 2, rh * .5, {a: 'center', c: i ? '#cfd8e3' : '#ffd23f', w: 900}); txt(ctx, r.a.name, x0 + 90 * u, yy + rh * .36, rh * .3, {max: cw * .5}); txt(ctx, `avg ${r.avg.toFixed(0)} km/h · peak ${r.top.toFixed(0)} km/h`, x0 + 90 * u, yy + rh * .72, rh * .2, {c: '#93a4b8', w: 600, max: cw * .56});
    txt(ctx, r.fin != null ? `${r.fin.toFixed(2)} s` : `−${r.gap.toFixed(0)} m`, x0 + cw - 24 * u, yy + rh / 2, rh * .36, {a: 'right', w: 900, c: r.fin != null ? '#fff' : '#ff9b9b'}); });
  txt(ctx, 'Computer simulation based on real top-speed data', cx, h - (tall ? 200 : 20) * u, 24 * u, {a: 'center', c: '#7f8da0', w: 600});
  ctx.restore();
}
