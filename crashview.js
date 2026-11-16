// Краш-тесттің көрінісі: жоғары жылдамдықты камера (бүйірден көрініс), көлік деформациясы, жүргізуші (dummy), airbag, бөлшектер, g-график.
// Физика crashsim.js-тен келеді; мұнда тек уақыт шкаласы (баяу қозғалыс) және сурет салу.
const font = (w, px) => `${w} ${px}px "Segoe UI", system-ui, Arial, sans-serif`;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mulberry = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16), ch = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k)));
  return `rgb(${ch[0]},${ch[1]},${ch[2]})`;
}

export const timeline = S => { const T1 = 3.4, T2 = clamp(S.tEnd * 24, 5, 9), T3 = 4.5; return {T1, T2, T3, total: T1 + T2 + T3}; };

/** Бейне уақытынан (с) физика уақытына және фазаға */
export function phaseAt(S, tv) {
  const {T1, T2, T3} = timeline(S);
  if (tv < T1) return {phase: 1, ts: -S.tPre * (1 - tv / T1), p: tv / T1};
  if (tv < T1 + T2) return {phase: 2, ts: (tv - T1) / T2 * S.tEnd, p: (tv - T1) / T2};
  return {phase: 3, ts: S.tEnd, p: clamp((tv - T1 - T2) / T3, 0, 1), t3: tv - T1 - T2};
}

function at(arr, S, ts) { const f = ts / S.dt, i = Math.floor(f); if (i < 0) return arr[0] ?? 0; if (i >= arr.length - 1) return arr[arr.length - 1] ?? 0; return arr[i] + (arr[i + 1] - arr[i]) * (f - i); }

function densify(pts, step) {
  const out = []; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length], d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(d / step)); for (let k = 0; k < n; k++) out.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]); }
  return out;
}
/** Деформация: алдыңғы аймақ қысылады (c), капот көтеріліп бүгіледі; c > Lc болғанда кабина ішке кіреді (intr) */
const chaikin = (pts, it) => { let p = pts; for (let k = 0; k < it; k++) { const out = []; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; out.push([a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25], [a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75]); } p = out; } return p; };
function deformPt(p, c, intr, xfw, L, Lc) {
  let [x, y] = p; const zone = Math.min(c, Lc), push = Math.max(0, c - Lc);
  if (x > xfw) {
    const t = clamp((x - xfw) / (L - xfw), 0, 1), w = Math.pow(t, .85);
    x -= push + zone * w;
    if (y > .55) y += zone * .5 * Math.sin(Math.PI * clamp(t * 1.05, 0, 1)) * .95 * (1 - t * .15);
    y += Math.sin(t * 20 + zone * 7) * .03 * Math.min(1, zone * 3) * (1 - t * .3);
    if (t > .86) y -= zone * .12;
  } else if (push > 0) {
    const k = Math.exp(-(xfw - x) / .9); x -= push * k; if (y > 1) y -= push * .3 * k * (y / 1.5);
  }
  return [x, y];
}

function drawCarLocal(ctx, S, which, st) {
  const prof = which ? S.pb : S.pa, {L, H, ol, glass: [ga, gb], r} = prof, color = st.color, c = st.c, Lc = prof.Lc, intr = Math.max(0, c - Lc);
  const xfw = ol[gb][0] * L - .15, def = q => deformPt(q, c, intr, xfw, L, Lc), lw = px => px / st.s;
  // көлеңке
  ctx.save(); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(L / 2 - c * .3, .02, L * .52, .12, 0, 0, 7); ctx.fill(); ctx.restore();
  const body = densify(chaikin(ol.map(([fx, y]) => [fx * L, y]), 2), .08).map(def);
  // доңғалақтар (арнасы + доңғалақ)
  const wheel = (x, y, ang) => {
    ctx.fillStyle = '#050607'; ctx.beginPath(); ctx.arc(x, y, r * 1.13, 0, 7); ctx.fill();
    ctx.fillStyle = '#121316'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    const g = ctx.createRadialGradient(x - r * .15, y + r * .15, r * .1, x, y, r * .66); g.addColorStop(0, '#f1f3f5'); g.addColorStop(.6, '#9aa3ab'); g.addColorStop(1, '#4a5057');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * .64, 0, 7); ctx.fill();
    ctx.strokeStyle = '#2b3036'; ctx.lineWidth = lw(3); for (let k = 0; k < 5; k++) { const a = ang + k * 1.2566; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * r * .6, y + Math.sin(a) * r * .6); ctx.stroke(); }
    ctx.fillStyle = '#20252a'; ctx.beginPath(); ctx.arc(x, y, r * .14, 0, 7); ctx.fill();
    ctx.strokeStyle = '#c4202a'; ctx.lineWidth = lw(5); ctx.beginPath(); ctx.arc(x, y, r * .5, ang + .4, ang + 1.1); ctx.stroke();
  };
  const fwx = .79 * L - (c > .25 ? c * .85 : 0), fwy = r + (c > .5 ? (c - .5) * .15 : 0);
  // дене
  ctx.beginPath(); body.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath();
  const bg = ctx.createLinearGradient(0, H, 0, .3); bg.addColorStop(0, shade(color, .38)); bg.addColorStop(.35, color); bg.addColorStop(1, shade(color, -.55));
  ctx.fillStyle = bg; ctx.fill(); ctx.strokeStyle = shade(color, -.6); ctx.lineWidth = lw(2); ctx.stroke();
  ctx.save(); ctx.clip();
  const sg = ctx.createLinearGradient(0, .8, 0, 1.0); sg.addColorStop(0, 'rgba(255,255,255,.0)'); sg.addColorStop(.5, 'rgba(255,255,255,.28)'); sg.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = sg; ctx.fillRect(-1, .8, L + 2, .2); // бүйір жарқылы
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(-1, 0, L + 2, .38); // босағасы
  if (c > .05) { const dg = ctx.createLinearGradient(xfw - c, 0, L, 0); dg.addColorStop(0, 'rgba(0,0,0,0)'); dg.addColorStop(1, `rgba(0,0,0,${clamp(c / .9, 0, .5)})`); ctx.fillStyle = dg; ctx.fillRect(xfw - 1, 0, L, H + 1); }
  ctx.restore();
  // есік сызықтары
  ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = lw(1.6);
  const bx = ((ol[ga][0] + ol[gb][0]) / 2) * L; [[bx, ol[ga][1] - .05, bx, .42], [bx - .95, .92, bx - .95, .42], [bx + .85, .92, bx + .85, .42]].forEach(([x1, y1, x2, y2]) => { const a = def([x1, y1]), b = def([x2, y2]); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); });
  // кабина ішіндегі жүргізуші (әйнектің астында)
  const gy0 = (ol[ga][1] + ol[gb][1]) / 2, xa = ol[ga][0] * L, xb = ol[gb][0] * L;
  let gl = [[xa + .1 * L * .6, gy0 - .02]]; for (let i = ga + 1; i < gb; i++) gl.push([ol[i][0] * L + (i < (ga + gb) / 2 ? .1 : -.1), ol[i][1] - .08]); gl.push([xb - .05 * L, gy0 - .02]);
  gl = densify(gl, .1).map(def);
  ctx.save(); ctx.beginPath(); gl.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath();
  const gg = ctx.createLinearGradient(0, H, 0, gy0); gg.addColorStop(0, '#2c3b4a'); gg.addColorStop(1, '#0b1118'); ctx.fillStyle = gg; ctx.fill(); ctx.clip();
  drawOccupant(ctx, prof, st, xa, xb, def, lw);
  const cr = st.c > .3 ? clamp((st.c - .3) / .5, 0, 1) : 0;
  ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.beginPath(); ctx.moveTo(xa, gy0); ctx.lineTo(xa + .5, gy0); ctx.lineTo(xa + 1.4, H); ctx.lineTo(xa + .9, H); ctx.fill();
  if (cr > 0) { ctx.strokeStyle = `rgba(230,240,255,${.35 + cr * .5})`; ctx.lineWidth = lw(1.6); const rg = mulberry(7 + which); const cx = xb - .25, cy = H - .35; for (let k = 0; k < 14 * cr + 4; k++) { const a = rg() * 6.28, d = .15 + rg() * .55 * cr; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * d, cy + Math.sin(a) * d); ctx.stroke(); } }
  ctx.restore();
  ctx.strokeStyle = '#0a0d10'; ctx.lineWidth = lw(3); ctx.beginPath(); gl.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath(); ctx.stroke();
  // B бағана
  { const a = def([bx, gy0 - .02]), b = def([bx, H - .1]); ctx.strokeStyle = '#0a0d10'; ctx.lineWidth = lw(5); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
  // шамдар
  const hl = [[L - .3, ol[9][1] - .1], [L - .02, ol[10][1] - .02], [L - .02, ol[10][1] - .12], [L - .32, ol[9][1] - .2]].map(def);
  ctx.fillStyle = c > .22 ? '#3a3f44' : '#fdf6c8'; ctx.beginPath(); hl.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#e0242b'; ctx.fillRect(0, ol[1][1] - .12, .05, .1);
  // нақты көлік бөлшектері: тор, есік тұтқасы, айна, босаға, терезе жиегі
  ctx.fillStyle = '#0a0b0d'; { const gq = [[L - .05, .44], [L, .44], [L, .62], [L - .06, .62]].map(def); ctx.beginPath(); gq.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath(); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,255,255,.55)'; [[bx - .3, .92], [bx + .8, .92]].forEach(([x, y]) => { const a = def([x, y]); ctx.fillRect(a[0], a[1], .16, .035); });
  { const m = [[xb - .22, gy0 + .01], [xb - .02, gy0 + .01], [xb - .04, gy0 + .13], [xb - .2, gy0 + .13]].map(def); ctx.fillStyle = shade(color, -.35); ctx.beginPath(); m.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath(); ctx.fill(); }
  ctx.strokeStyle = 'rgba(210,220,230,.55)'; ctx.lineWidth = lw(1.5); { const a = def([.25 * L, .4]), b = def([.8 * L, .4]); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(200,210,222,.6)'; ctx.lineWidth = lw(2); ctx.beginPath(); gl.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath(); ctx.stroke();
  wheel(.2 * L, r, st.ang);
  wheel(fwx, fwy, st.ang);
}

function drawOccupant(ctx, prof, st, xa, xb, def, lw) {
  const {L, H} = prof, z = st.z || 0, intr = Math.max(0, st.c - prof.Lc), xs = (xa + xb) / 2 - .5, xw = xs + .58 - intr * .5, yh = H - .3;
  const D = q => def(q);
  // орындық
  ctx.fillStyle = '#1a1d22'; ctx.beginPath(); [[xs - .25, .45], [xs - .2, 1.1], [xs - .05, 1.12], [xs + .05, .6], [xs + .35, .5], [xs + .35, .4], [xs - .25, .4]].map(D).forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.fill();
  // дашборд
  ctx.fillStyle = '#262a31'; ctx.beginPath(); [[xw + .12, .98], [xb - .05, 1.0], [xb - .05, .6], [xw + .16, .66]].map(D).forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.fill();
  const hip = D([xs - .05 + .35 * z, .6]), neck = D([xs + .02 + .9 * z, yh - .16]), head = D([xs + .06 + z, yh]), knee = D([xs + .4 + .35 * z, .58]), foot = D([xs + .62, .22]), hand = D([xw - .02, .9]), sh = D([xs + .05 + .85 * z, yh - .22]);
  ctx.lineCap = 'round'; ctx.strokeStyle = '#e9b41a'; ctx.lineWidth = .1;
  ctx.beginPath(); ctx.moveTo(hip[0], hip[1]); ctx.lineTo(knee[0], knee[1]); ctx.lineTo(foot[0], foot[1]); ctx.stroke();
  ctx.lineWidth = .21; ctx.beginPath(); ctx.moveTo(hip[0], hip[1]); ctx.lineTo(neck[0], neck[1] - .05); ctx.stroke();
  ctx.lineWidth = .07; ctx.beginPath(); ctx.moveTo(sh[0], sh[1]); ctx.lineTo((sh[0] + hand[0]) / 2, (sh[1] + hand[1]) / 2 - .06); ctx.lineTo(hand[0], hand[1]); ctx.stroke();
  ctx.fillStyle = '#f2c230'; ctx.beginPath(); ctx.arc(head[0], head[1], .115, 0, 7); ctx.fill();
  ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(head[0], head[1], .115, 0, Math.PI / 2); ctx.lineTo(head[0], head[1]); ctx.fill(); ctx.beginPath(); ctx.arc(head[0], head[1], .115, Math.PI, 1.5 * Math.PI); ctx.lineTo(head[0], head[1]); ctx.fill();
  // белдік
  ctx.strokeStyle = '#d33'; ctx.lineWidth = .035; ctx.beginPath(); ctx.moveTo(sh[0] - .08, sh[1] + .02); ctx.lineTo(hip[0] + .06, hip[1] + .06); ctx.stroke();
  // руль
  const w0 = D([xw - .04, 1.0]), w1 = D([xw + .1, .78]); ctx.strokeStyle = '#0b0c0e'; ctx.lineWidth = .06; ctx.beginPath(); ctx.moveTo(w0[0], w0[1]); ctx.lineTo(w1[0], w1[1]); ctx.stroke();
  // airbag
  if (st.bag > 0) { const ctr = D([xw + .03, .93]), rb = .3 * st.bag, g = ctx.createRadialGradient(ctr[0], ctr[1], .02, ctr[0], ctr[1], rb); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(210,220,230,.85)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ctr[0], ctr[1], rb, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = lw(2); ctx.stroke(); }
}

function particles(S) {
  if (S._parts) return S._parts;
  const rng = mulberry(Math.round(S.speedA * 7 + S.pa.mass)), n = clamp(Math.round(30 + Math.max(S.speedA, S.speedB) * .5), 30, 130), list = [], v = Math.max(S.speedA, S.speedB) / 3.6;
  for (let i = 0; i < n; i++) {
    const kind = rng() < .45 ? 'glass' : rng() < .6 ? 'metal' : 'spark', side = S.head ? (rng() < .5 ? -1 : 1) : -1;
    list.push({kind, x0: (rng() - .5) * .3, y0: .35 + rng() * .8, vx: side * (.5 + rng() * (kind === 'spark' ? 1.3 : .9)) * v * .35 + (rng() - .5) * 2, vy: 1.5 + rng() * (3 + v * .12), size: kind === 'glass' ? .02 + rng() * .035 : .04 + rng() * .07, rot: rng() * 6.28, spin: (rng() - .5) * 20, col: kind === 'metal' ? ['#8d9298', '#5c6168', '#c9ced2'][i % 3] : kind === 'glass' ? '#cfe6f5' : '#ffb347'});
  }
  return S._parts = list;
}

/** Бір кадрды салу. S — simulate() нәтижесі; tv — бейне уақыты (с); o: {colors:[a,b], hook} */
export function drawCrash(ctx, w, h, S, tv, o = {}) {
  const ph = phaseAt(S, tv), ts = ph.ts, portrait = h > w * 1.1, u = portrait ? w / 1080 : h / 1080, head = S.head;
  const zk = ts >= 0 ? 1 : clamp((ts + .3) / .3, 0, 1), spanW = head ? 11 : 8.6, spanN = head ? 6.4 : 5.8, span = spanW + (spanN - spanW) * zk; // соққыға жақындай түседі
  let xmax = head ? span / 2 : 1.2, xmin = xmax - span;
  if (!head && ts < 0) { const f = Math.min(0, S.speedA / 3.6 * ts - (xmin + 2.5)); xmin += f; xmax += f; } // көлікті қуып келеді, соңында қабырғаға тоқтайды
  const s = w * .965 / span, gy = portrait ? h * .4 : h * .74, ox = w * .0175 - xmin * s;
  const X = m => ox + m * s, Y = m => gy - m * s;
  // фон
  const bg = ctx.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#070b12'); bg.addColorStop(.5, '#10182a'); bg.addColorStop(1, '#06080d'); ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  // өлшеу торы (0.5 м) және жер

  const fg = ctx.createLinearGradient(0, gy, 0, gy + 90 * u); fg.addColorStop(0, '#39414c'); fg.addColorStop(1, '#14181e'); ctx.fillStyle = fg; ctx.fillRect(0, gy, w, h - gy);
  // соққы кезіндегі шайқалу
  const sinceC = ts >= 0 ? ts : -1, shake = sinceC >= 0 ? Math.max(0, 1 - sinceC / .08) * Math.min(14, Math.max(S.speedA, S.speedB) / 8) * u : 0;
  ctx.save(); if (shake > .2) ctx.translate((Math.sin(tv * 90) * shake), (Math.cos(tv * 77) * shake * .6));
  // кедергі
  const sc = S.scenario;
  if (!head) {
    if (sc === 'pole') { ctx.fillStyle = '#7d8791'; ctx.fillRect(X(0), Y(3.4), .26 * s, 3.4 * s); ctx.fillStyle = '#c5ced6'; ctx.fillRect(X(0), Y(3.4), .07 * s, 3.4 * s); }
    else {
      const bw = sc === 'offset' ? .55 : 1.6; ctx.fillStyle = '#6a737c'; ctx.fillRect(X(0), Y(2.9), 1.7 * s, 2.9 * s);
      ctx.fillStyle = sc === 'offset' ? '#c78a1d' : '#8b949d'; ctx.fillRect(X(0), Y(2.9), bw * (sc === 'offset' ? 1 : .08) * s, 2.9 * s);
      if (sc === 'offset') { ctx.strokeStyle = '#7d5410'; ctx.lineWidth = 1.5; for (let y = .1; y < 2.9; y += .17) { ctx.beginPath(); ctx.moveTo(X(0), Y(y)); ctx.lineTo(X(.55), Y(y)); ctx.stroke(); } }
      ctx.save(); ctx.beginPath(); ctx.rect(X(.08), Y(2.9), 1.6 * s, 2.9 * s); ctx.clip(); ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 2; for (let k = -10; k < 24; k++) { ctx.beginPath(); ctx.moveTo(X(.08) + k * 28, Y(0)); ctx.lineTo(X(.08) + k * 28 + 120, Y(2.9)); ctx.stroke(); } ctx.restore();
    }
  }
  // көліктер
  const i = Math.max(0, ts / S.dt), car = (which) => {
    const pre = ts < 0, T = S.T, v = which ? S.speedB / 3.6 : S.speedA / 3.6, c = pre ? 0 : at(which ? T.cB : T.cA, S, ts), rr = pre ? v * ts : at(which ? T.rB : T.rA, S, ts);
    const L = (which ? S.pb : S.pa).L, rearLocal = rr - L; // A: артқы шеті (+x алға), B: айнадағы
    const wx = which ? L - rr : rearLocal, dir = which ? -1 : 1;
    const accel = pre ? 0 : at(which ? T.aB : T.aA, S, ts), occ = which ? S.occB : S.occA;
    const z = pre ? 0 : occ ? at(occ.z, S, ts) : 0, tf = occ?.tFire, bag = !pre && tf != null && ts > tf ? clamp((ts - tf) / .025, 0, 1) * (ts < tf + .09 ? 1 : Math.max(0, 1 - (ts - tf - .09) / .05)) : 0;
    return {wx, dir, st: {color: o.colors?.[which] || (which ? '#d63a3a' : '#2b8fd6'), c, z, bag, s, ang: -(rr) / (which ? S.pb.r : S.pa.r) * dir}, accel, L};
  };
  const cars = [car(0)]; if (head) cars.push(car(1));
  cars.forEach((cr, k) => { ctx.save(); ctx.translate(X(cr.wx), gy); ctx.scale(s * cr.dir, -s); drawCarLocal(ctx, S, k, cr.st); ctx.restore(); });
  // бөлшектер, түтін
  if (ts >= 0) {
    const dt = ts; particles(S).forEach(p => {
      const tl = (p.vy + Math.sqrt(p.vy * p.vy + 19.6 * p.y0)) / 9.81, tt = Math.min(dt, tl + .35), xx = p.x0 + p.vx * Math.min(dt, tl + .25), yy = dt >= tl ? 0 : p.y0 + p.vy * dt - 4.905 * dt * dt;
      const life = p.kind === 'spark' ? clamp(1 - dt / .22, 0, 1) : 1; if (life <= 0) return;
      ctx.save(); ctx.translate(X(xx), Y(Math.max(0, yy) + p.size)); ctx.rotate(p.rot + p.spin * tt); ctx.globalAlpha = life;
      if (p.kind === 'spark') { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = p.col; ctx.fillRect(-p.size * s * .8, -1.5, p.size * s * 1.6, 3); } else { ctx.fillStyle = p.col; ctx.fillRect(-p.size * s / 2, -p.size * s / 3, p.size * s, p.size * s * .66); }
      ctx.restore();
    });
    const smoke = clamp((ts - .02) / .1, 0, 1); if (smoke > 0) for (let k = 0; k < 9; k++) {
      const a = k * 1.7, age = (ts - .02 + k * .015), px = (Math.sin(a) * .5) + age * (k % 2 ? 1 : -1) * .4, py = .7 + age * 3.5 + (k % 3) * .1, rad = (.25 + age * 2.2) * s;
      const g = ctx.createRadialGradient(X(px), Y(py), 0, X(px), Y(py), rad); g.addColorStop(0, 'rgba(200,205,210,.28)'); g.addColorStop(1, 'rgba(200,205,210,0)'); ctx.fillStyle = g; ctx.globalAlpha = smoke * clamp(1.2 - age * 3, 0, 1); ctx.beginPath(); ctx.arc(X(px), Y(py), rad, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
    }
    const fl = Math.max(0, 1 - ts / .014) * .55; if (fl > 0) { ctx.fillStyle = `rgba(255,255,255,${fl})`; ctx.fillRect(0, 0, w, h); }
  }
  ctx.restore();
  hud(ctx, w, h, S, tv, ph, cars, u, portrait, gy, o);
}

function T(ctx, str, x, y, size, color = '#fff', align = 'left', weight = 800, stroke = false) {
  ctx.font = font(weight, size); ctx.textAlign = align; ctx.textBaseline = 'middle';
  if (stroke) { ctx.lineWidth = size * .14; ctx.strokeStyle = 'rgba(0,0,0,.65)'; ctx.lineJoin = 'round'; ctx.strokeText(str, x, y); }
  ctx.fillStyle = color; ctx.fillText(str, x, y);
}
function fit(ctx, str, maxW, size, weight = 800) { ctx.font = font(weight, size); while (ctx.measureText(str).width > maxW && size > 14) { size -= 2; ctx.font = font(weight, size); } return size; }
const rrect = (ctx, x, y, w, h, r, fill) => { ctx.fillStyle = fill; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); ctx.fill(); };
const SCN = {wall: 'RIGID BARRIER (full width)', offset: '40% OFFSET BARRIER', pole: 'NARROW POLE', head: 'HEAD-ON COLLISION', headoff: 'HEAD-ON, 40% OFFSET'};

function hud(ctx, w, h, S, tv, ph, cars, u, portrait, gy, o) {
  const A = S.A, B = S.B, pad = 40 * u, cx = w / 2;
  // тақырып
  const t1 = `${A.make} ${A.model}`.replace(/\s*\(\d{4}\)$/, ''), t2 = S.head ? `vs ${B.make} ${B.model}`.replace(/\s*\(\d{4}\)$/, '') : `vs ${SCN[S.scenario]}`;
  const ty = portrait ? 120 * u : 56 * u, sz1 = fit(ctx, t1.toUpperCase(), w - pad * 2, (portrait ? 70 : 54) * u, 900);
  T(ctx, t1.toUpperCase(), cx, ty, sz1, '#fff', 'center', 900, true);
  T(ctx, t2.toUpperCase(), cx, ty + (portrait ? 70 : 52) * u, fit(ctx, t2.toUpperCase(), w - pad * 2, (portrait ? 44 : 34) * u, 800), '#ffb020', 'center', 800, true);
  const spd = S.head ? `${Math.round(S.speedA)} + ${Math.round(S.speedB)} km/h` : `${Math.round(S.speedA)} km/h`;
  // камера белгісі
  ctx.fillStyle = '#ff3b3b'; ctx.beginPath(); ctx.arc(pad + 9 * u, (portrait ? 252 : 120) * u, 9 * u, 0, 7); ctx.fill();
  T(ctx, 'HIGH-SPEED CAM · 5000 fps', pad + 28 * u, (portrait ? 252 : 120) * u, 22 * u, '#c6d2e4', 'left', 700);
  { const pw = (portrait ? 270 : 300) * u, phh = pw * .62, py0 = (portrait ? 290 : 36) * u;
    [[0, pad], [1, w - pad - pw]].forEach(([k, x]) => { const car = k ? B : A, im = car && o.photos?.[k]; if (!im || (k && !S.head)) return;
      ctx.save(); ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, py0, pw, phh, 14 * u) : ctx.rect(x, py0, pw, phh); ctx.clip();
      const sc = Math.max(pw / im.naturalWidth, phh / im.naturalHeight); ctx.drawImage(im, x + (pw - im.naturalWidth * sc) / 2, py0 + (phh - im.naturalHeight * sc) / 2, im.naturalWidth * sc, im.naturalHeight * sc); ctx.restore();
      ctx.strokeStyle = k ? '#ff7a59' : '#4cc3ff'; ctx.lineWidth = 4 * u; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, py0, pw, phh, 14 * u) : ctx.rect(x, py0, pw, phh); ctx.stroke();
      T(ctx, k ? 'CAR B' : 'CAR A', x + 12 * u, py0 + 22 * u, 20 * u, '#fff', 'left', 900, true); });
  }
  const yTop = (portrait ? 330 : 190) * u;
  if (ph.phase === 1) {
    T(ctx, spd, cx, yTop, 92 * u, '#fff', 'center', 900, true); T(ctx, 'IMPACT SPEED', cx, yTop + 66 * u, 28 * u, '#9fb0c8', 'center', 700);
    if (o.hook) T(ctx, o.hook, cx, yTop + 132 * u, fit(ctx, o.hook, w - pad * 2, 42 * u, 900), '#ffe08a', 'center', 900, true);
  } else {
    const ms = Math.max(0, ph.ts * 1000), slow = Math.round(timeline(S).T2 / Math.max(.001, S.tEnd));
    T(ctx, `t = ${String(Math.round(ms)).padStart(3, '0')} ms`, cx, yTop, 74 * u, '#fff', 'center', 900, true);
    T(ctx, `SLOW MOTION ×1/${slow}`, cx, yTop + 58 * u, 28 * u, '#9fb0c8', 'center', 700);
  }
  // тікелей көрсеткіштер + g-график
  if (ph.phase >= 2) {
    const gx = pad, gw = w - pad * 2, gh = (portrait ? 300 : 190) * u, gyy = portrait ? gy + 130 * u : h - gh - 70 * u;
    graph(ctx, S, ph.ts, gx, gyy, gw, gh, u);
    const now = (k, arr) => at(arr, S, ph.ts), live = [['A', now('A', S.T.aA), '#4cc3ff', Math.max(...S.T.aA.slice(0, Math.floor(ph.ts / S.dt) + 1))]]; if (S.head) live.push(['B', now('B', S.T.aB), '#ff7a59', Math.max(...S.T.aB.slice(0, Math.floor(ph.ts / S.dt) + 1))]);
    const ly = gyy - 36 * u; live.forEach(([n, g, col, pk], k) => T(ctx, `${S.head ? n + ' ' : ''}${g.toFixed(0)} g · peak ${pk.toFixed(0)} · ${(at(n === 'A' ? S.T.cA : S.T.cB, S, ph.ts) * 100).toFixed(0)} cm`, S.head ? (k ? w - pad : pad) : pad, ly, (S.head ? 27 : 32) * u, col, S.head && k ? 'right' : 'left', 800, true));
    if (portrait && ph.phase === 2) {
      const ev = events(S, ph.ts), by = gyy + gh + 70 * u;
      T(ctx, ev.text, cx, by, fit(ctx, ev.text, w - pad * 2, 46 * u, 900), ev.color, 'center', 900, true);
      const eAbs = .5 * S.pa.mass * (Math.pow(S.speedA / 3.6, 2) - Math.pow(at(S.T.vA, S, ph.ts), 2)) / 1000, chest = at(S.occA.chest, S, ph.ts);
      const box = (x, label, val, col) => { rrect(ctx, x, by + 60 * u, (w - pad * 2 - 24 * u) / 2, 150 * u, 20 * u, 'rgba(255,255,255,.07)'); T(ctx, val, x + (w - pad * 2 - 24 * u) / 4, by + 120 * u, 52 * u, col, 'center', 900); T(ctx, label, x + (w - pad * 2 - 24 * u) / 4, by + 178 * u, 22 * u, '#9fb0c8', 'center', 700); };
      box(pad, 'ENERGY ABSORBED' + (S.head ? ' (CAR A)' : ''), `${eAbs.toFixed(0)} kJ`, '#ffb020'); box(pad + (w - pad * 2 - 24 * u) / 2 + 24 * u, 'DRIVER CHEST LOAD', `${Math.min(150, chest).toFixed(0)} g`, chest > 45 ? '#ff4d4d' : '#37d67a');
    }
  }
  if (ph.phase === 3) panel(ctx, w, h, S, ph, u, portrait, gy);
  // төменгі жол
  T(ctx, 'AI physics simulation · not real footage · estimate, not an official rating', cx, h - 28 * u, 20 * u, '#7f8da6', 'center', 600);
}

function events(S, ts) {
  const tf = S.occA.tFire, pk = S.T.aA.indexOf(Math.max(...S.T.aA)) * S.dt, over = S.T.cA.findIndex(c => c > S.pa.Lc);
  const list = [[0, 'FIRST CONTACT', '#ffffff']];
  if (tf != null) list.push([tf, `AIRBAG FIRES · ${Math.round(tf * 1000)} ms`, '#4cc3ff']);
  if (over >= 0) list.push([over * S.dt, 'CRUMPLE ZONE USED UP · CABIN PUSHED IN', '#ff4d4d']);
  list.push([pk, `PEAK DECELERATION · ${Math.max(...S.T.aA).toFixed(0)} g`, '#ffb020']);
  list.push([S.contact, 'CAR STOPS · REBOUND', '#9fb0c8']);
  list.sort((a, b) => a[0] - b[0]); let cur = list[0]; for (const e of list) if (ts >= e[0]) cur = e; return {text: cur[1], color: cur[2]};
}

function graph(ctx, S, ts, x, y, w, h, u) {
  rrect(ctx, x, y, w, h, 14 * u, 'rgba(255,255,255,.06)');
  const peak = Math.max(30, ...S.T.aA, ...(S.head ? S.T.aB : [0])) * 1.12, nx = k => x + 14 * u + (w - 28 * u) * k / S.tEnd, ny = g => y + h - 26 * u - (h - 52 * u) * g / peak;
  ctx.strokeStyle = 'rgba(255,255,255,.1)'; ctx.lineWidth = 1; ctx.fillStyle = '#7f8da6'; ctx.font = font(600, 17 * u); ctx.textAlign = 'left';
  for (let g = 0; g <= peak; g += peak > 100 ? 40 : 20) { ctx.beginPath(); ctx.moveTo(x + 10 * u, ny(g)); ctx.lineTo(x + w - 10 * u, ny(g)); ctx.stroke(); ctx.fillText(g + ' g', x + 14 * u, ny(g) - 6 * u); }
  const line = (arr, col) => { const n = Math.min(arr.length - 1, Math.floor(ts / S.dt)); ctx.beginPath(); for (let i = 0; i <= n; i++) i ? ctx.lineTo(nx(S.T.t[i]), ny(arr[i])) : ctx.moveTo(nx(S.T.t[i]), ny(arr[i])); ctx.strokeStyle = col; ctx.lineWidth = 4 * u; ctx.lineJoin = 'round'; ctx.stroke(); };
  line(S.T.aA, '#4cc3ff'); if (S.head) line(S.T.aB, '#ff7a59');
  ctx.fillStyle = '#7f8da6'; ctx.textAlign = 'center'; ctx.fillText('deceleration (g) vs time', x + w / 2, y + h - 8 * u);
}

function panel(ctx, w, h, S, ph, u, portrait, gy) {
  const a = clamp(ph.t3 / .5, 0, 1); ctx.save(); ctx.globalAlpha = a;
  const cols = S.head ? 2 : 1, pw = w - 80 * u, ph0 = 0;
  const px = 40 * u, py = portrait ? gy + 470 * u : 90 * u, pH = portrait ? h - py - 70 * u : h - py - 70 * u;
  if (portrait) {
    rrect(ctx, px, py, pw, pH, 24 * u, 'rgba(8,12,20,.9)');
    const sums = [S.sumA, S.sumB].filter(Boolean), names = [S.A, S.B].filter(Boolean);
    sums.forEach((m, k) => { const x0 = px + (pw / cols) * k, cw = pw / cols; one(ctx, m, names[k], x0 + 20 * u, py + 18 * u, cw - 40 * u, pH - 30 * u, u, S.head, k); });
  } else {
    const pw2 = Math.min(w * .5, 900 * u), pxx = w - pw2 - 40 * u; rrect(ctx, pxx, py + 140 * u, pw2, h - py - 210 * u, 24 * u, 'rgba(8,12,20,.9)');
    const sums = [S.sumA, S.sumB].filter(Boolean), names = [S.A, S.B].filter(Boolean);
    sums.forEach((m, k) => one(ctx, m, names[k], pxx + (pw2 / cols) * k + 20 * u, py + 156 * u, pw2 / cols - 40 * u, h - py - 240 * u, u, S.head, k));
  }
  ctx.restore(); void ph0;
}
function one(ctx, m, car, x, y, w, h, u, head, k) {
  const col = m.risk < .06 ? '#37d67a' : m.risk < .3 ? '#ffb020' : '#ff4d4d', fs = head ? .78 : 1;
  const nm = `${car.make} ${car.model}`.replace(/\s*\(\d{4}\)$/, ''); T(ctx, nm.toUpperCase(), x + w / 2, y + 22 * u, fit(ctx, nm.toUpperCase(), w, 34 * u * fs, 900), '#fff', 'center', 900);
  T(ctx, '★'.repeat(m.stars) + '☆'.repeat(5 - m.stars), x + w / 2, y + 76 * u, 58 * u * fs, col, 'center', 900);
  T(ctx, `SAFETY SCORE ${m.score}/100`, x + w / 2, y + 128 * u, 30 * u * fs, col, 'center', 900);
  T(ctx, m.verdict, x + w / 2, y + 166 * u, fit(ctx, m.verdict, w, 26 * u * fs, 800), col, 'center', 800);
  const fr = Math.min(99, Math.round(m.fatality * 100)), rows = [['Fatality risk (estimate)', `${fr >= 95 ? '>95' : fr}%`], ['Speed change (ΔV)', `${m.dV.toFixed(0)} km/h`], ['Peak deceleration', `${m.peak.toFixed(0)} g`], ['Front crush', `${(m.crush * 100).toFixed(0)} cm`], ['Cabin intrusion', m.intrusion > .005 ? `${(m.intrusion * 100).toFixed(0)} cm` : 'none'], ['Chest load (3 ms)', `${m.chest3.toFixed(0)} g`], ['Head injury (HIC15)', `${m.hic.toFixed(0)}`], ['Test mass (car + driver)', `${Math.round(m.mass)} kg`]];
  rows.forEach(([l, v], i) => { const yy = y + 212 * u + i * 46 * u * fs; if (yy > y + h) return; T(ctx, l, x, yy, 24 * u * fs, '#9fb0c8', 'left', 600); T(ctx, v, x + w, yy, 28 * u * fs, i === 0 ? col : '#fff', 'right', 900); });
  void k;
}
