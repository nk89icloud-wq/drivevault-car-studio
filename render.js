// Жарыс көрінісі: перспективалық драг-жолақ + телевизиялық HUD.
// Бір функция әрі тікелей экранға (16:9), әрі видеоға (9:16, Shorts) салады.

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const font = (w, px) => `${w} ${px}px Manrope, "Segoe UI", Arial, sans-serif`;

export const LANES = [-1.9, 1.9];
export const ACCENT = ['#ffc21a', '#3db8ff'];
const HAZE = [168, 180, 184];
export const SPRITE_BOX = {
  yellow: {x: 271, y: 110, w: 1273, h: 705},
  silver: {x: 157, y: 141, w: 1222, h: 737}
};
const TYPE_SHAPE = {'SUV': 1.32, 'Пикап': 1.38, 'Седан': 1.12, 'Универсал': 1.16, 'Лифтбек': 1.12, 'Хэтчбек': 1.14, 'Электр': 1.1, 'Купе': 1, 'Спорткар': .96, 'Суперкар': .92, 'Гиперкар': .9, 'Родстер': .94};
const WALL_X = 7.4, ROAD_X = 5.4, LANE_LINE = 3.8;

let skyCache = {key: '', canvas: null};
let vignetteCache = {key: '', gradient: null};

function fog(d, rgb, k = 1) {
  const f = clamp(1 - Math.exp(-d / (230 * k)), 0, .92);
  return rgb.map((c, i) => Math.round(c + (HAZE[i] - c) * f));
}
const css = rgb => `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;

function skyFor(w, hy, track) {
  const key = `${w}x${hy}:${track?.naturalWidth || 0}`;
  if (skyCache.key === key) return skyCache.canvas;
  const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, Math.ceil(hy)) : Object.assign(document.createElement('canvas'), {width: w, height: Math.ceil(hy)});
  const g = c.getContext('2d');
  if (track?.complete && track.naturalWidth) {
    const row = 196, kS = Math.max(w / track.naturalWidth, hy / row);
    const cw = Math.min(track.naturalWidth, w / kS), srcH = hy / kS;
    const sx = (track.naturalWidth - cw) / 2, sy = Math.max(0, row - srcH);
    g.drawImage(track, sx, sy, cw, Math.min(srcH, row), 0, 0, w, hy);
  } else {
    const gr = g.createLinearGradient(0, 0, 0, hy); gr.addColorStop(0, '#6e8aa6'); gr.addColorStop(1, '#c4cfd3');
    g.fillStyle = gr; g.fillRect(0, 0, w, hy);
  }
  const haze = g.createLinearGradient(0, hy - hy * .16, 0, hy);
  haze.addColorStop(0, 'rgba(168,180,184,0)'); haze.addColorStop(1, 'rgba(168,180,184,.95)');
  g.fillStyle = haze; g.fillRect(0, hy - hy * .16, w, hy * .16 + 1);
  skyCache = {key, canvas: c};
  return c;
}

export function makeCamera(w, h, cam = {}) {
  const portrait = h > w * 1.15;
  // Камера жоғарыдан, артынан 45° бұрышпен төмен қарайды
  const q = portrait ? .42 : .27, dNear = 8, H = cam.H || 9.5, th = Math.PI / 4;
  const f = q * w / 2.83 * dNear * (1 + (cam.fov || 0));
  const py = h * (portrait ? .5 : .5) + (cam.pitch || 0);
  const hy = py - f * Math.tan(th); // көкжиек (экраннан тыс болуы мүмкін)
  const z = cam.z || 0;
  return {w, h, portrait, f, py, hy, H, z, zn: z - H * .55, sn: Math.sin(th), cs: Math.cos(th), cx: w / 2 + (cam.sx || 0) * (portrait ? w / 1080 : w / 1600), sy: (cam.sy || 0) * (portrait ? w / 1080 : w / 1600), u: portrait ? w / 1080 : w / 1600};
}

function proj(c, X, z, Y = 0) {
  const dz = z - c.z, dy = c.H - Y, d = dz * c.cs + dy * c.sn; if (d < .25) return null;
  const v = dz * c.sn - dy * c.cs;
  return {x: c.cx + c.f * X / d, y: c.py + c.sy - c.f * v / d, d};
}

function quad(ctx, c, X0, X1, z0, z1, style, Y0 = 0, Y1 = 0) {
  z0 = Math.max(z0, c.zn); if (z1 <= z0) return;
  const a = proj(c, X0, z0, Y0), b = proj(c, X1, z0, Y0), d = proj(c, X1, z1, Y1), e = proj(c, X0, z1, Y1);
  if (!a || !b || !d || !e) return;
  ctx.fillStyle = style; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(d.x, d.y); ctx.lineTo(e.x, e.y); ctx.closePath(); ctx.fill();
}

function drawWorld(ctx, c, W) {
  const {w, h, hy} = c, far = c.z + 420;
  const hz = c.hy + c.sy, top = Math.max(0, hz);
  if (hz > 4) ctx.drawImage(skyFor(w, c.hy, W.assets.track), 0, c.sy, w, c.hy);
  // жер
  const gg = ctx.createLinearGradient(0, top, 0, h);
  gg.addColorStop(0, hz > 0 ? css(HAZE) : '#8b8a63'); gg.addColorStop(.25, '#7c7b58'); gg.addColorStop(1, '#4e4c36');
  ctx.fillStyle = gg; ctx.fillRect(0, top - 1, w, h - top + 1);
  // жол
  const road = ctx.createLinearGradient(0, top, 0, h);
  road.addColorStop(0, hz > 0 ? css(HAZE) : '#7a8084'); road.addColorStop(.12, '#6c7174'); road.addColorStop(.4, '#4a4f53'); road.addColorStop(1, '#2e3236');
  quad(ctx, c, -ROAD_X, ROAD_X, c.zn, far, road);
  // көлденең жік-сызықтар (асфальт секциялары), жылдамдық сезімі үшін
  ctx.save();
  for (let z = Math.ceil(c.zn / 9) * 9; z < c.z + 260; z += 9) {
    const a = proj(c, -ROAD_X, z), b = proj(c, ROAD_X, z); if (!a) continue;
    ctx.strokeStyle = `rgba(10,12,14,${.22 * (1 - a.d / 260)})`; ctx.lineWidth = Math.max(1, c.f * .06 / a.d);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  ctx.restore();
  // резеңке іздері (старт аймағы) және доңғалақ іздері
  quad(ctx, c, LANES[0] - .95, LANES[0] + .95, -10, 70, 'rgba(12,13,15,.11)');
  quad(ctx, c, LANES[1] - .95, LANES[1] + .95, -10, 70, 'rgba(12,13,15,.11)');
  W.marks.forEach((m, i) => {
    if (!m) return;
    [-.8, .8].forEach(o => quad(ctx, c, LANES[i] + o - .13, LANES[i] + o + .13, m.z0, m.z1, 'rgba(6,6,7,.62)'));
  });
  // жол белгілері
  quad(ctx, c, -LANE_LINE - .09, -LANE_LINE + .09, c.zn, far, 'rgba(240,243,244,.95)');
  quad(ctx, c, LANE_LINE - .09, LANE_LINE + .09, c.zn, far, 'rgba(240,243,244,.95)');
  for (let z = Math.floor(c.zn / 12) * 12; z < c.z + 300; z += 12) quad(ctx, c, -.07, .07, z, z + 3, 'rgba(240,243,244,.9)');
  // старт сызықтары
  quad(ctx, c, -LANE_LINE, LANE_LINE, -.25, .12, 'rgba(250,250,250,.95)');
  quad(ctx, c, -LANE_LINE, LANE_LINE, -1.3, -1.05, 'rgba(250,250,250,.5)');
  // 100 м сызықтары
  for (let m = 100; m < W.D; m += 100) quad(ctx, c, -LANE_LINE, LANE_LINE, m, m + .35, 'rgba(255,255,255,.55)');
  // мәре сызығы
  if (W.D < far) {
    for (let r = 0; r < 2; r++) for (let i = 0; i < 16; i++) {
      const X0 = -LANE_LINE + i * (2 * LANE_LINE / 16);
      quad(ctx, c, X0, X0 + 2 * LANE_LINE / 16, W.D + r * .6, W.D + (r + 1) * .6, (i + r) % 2 ? '#111' : '#f4f4f4');
    }
  }
  // қабырғалар
  drawWalls(ctx, c, W, -1); drawWalls(ctx, c, W, 1);
  // белгі тақталары (100/200/300 м)
  for (let m = 100; m < W.D; m += 100) [-1, 1].forEach(s => drawSign(ctx, c, s * (ROAD_X + .9), m, String(m)));
  // мәре қақпасы
  if (W.D - c.z > 3 && W.D < far) drawGantry(ctx, c, W);
}

function drawWalls(ctx, c, W, side) {
  const x = side * WALL_X, hgt = 1.05;
  const start = Math.floor(c.zn / 4) * 4, end = c.z + 380;
  for (let z = end - (end % 4); z >= start; z -= 4) {
    const k = Math.floor(z / 4);
    const near = Math.max(z, c.zn);
    const a = proj(c, x, near, 0), b = proj(c, x, z + 4, 0), at = proj(c, x, near, hgt), bt = proj(c, x, z + 4, hgt);
    if (!a || !b || !at || !bt) continue;
    const base = k % 2 ? [176, 178, 176] : [160, 162, 162];
    const rgb = fog(a.d, base);
    ctx.fillStyle = css(rgb);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(bt.x, bt.y); ctx.lineTo(at.x, at.y); ctx.closePath(); ctx.fill();
    // түсті жолақ
    const s0 = proj(c, x, near, .22), s1 = proj(c, x, z + 4, .22), t0 = proj(c, x, near, .38), t1 = proj(c, x, z + 4, .38);
    if (s0 && s1 && t0 && t1) {
      ctx.fillStyle = css(fog(a.d, k % 8 < 4 ? [200, 40, 40] : [235, 235, 235]));
      ctx.beginPath(); ctx.moveTo(s0.x, s0.y); ctx.lineTo(s1.x, s1.y); ctx.lineTo(t1.x, t1.y); ctx.lineTo(t0.x, t0.y); ctx.closePath(); ctx.fill();
    }
    // қабырға үстіндегі жарық жиек
    ctx.strokeStyle = css(fog(a.d, [205, 207, 206])); ctx.lineWidth = Math.max(1, c.f * .05 / a.d);
    ctx.beginPath(); ctx.moveTo(at.x, at.y); ctx.lineTo(bt.x, bt.y); ctx.stroke();
    // жарнама панельдері
    if (k % 8 === 3 && a.d > 5 && a.d < 150) {
      const [p0, p1] = side < 0 ? [a, b] : [b, a], hA = (a.y - at.y + b.y - bt.y) / 2 * .78;
      ctx.save(); ctx.transform((p1.x - p0.x) / 4, (p1.y - p0.y) / 4, 0, -hA / 1.05, p0.x, p0.y - (a.y - at.y) * .1);
      ctx.fillStyle = css(fog(a.d, k % 16 === 3 ? [20, 28, 38] : [200, 30, 30])); ctx.fillRect(.2, 0, 3.6, 1.05);
      ctx.scale(1, -1); ctx.fillStyle = '#fff'; ctx.font = font(800, .46); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(k % 16 === 3 ? 'DRIVEVAULT' : 'DRAG RACE', 2, -.52);
      ctx.restore();
    }
  }
}

function drawSign(ctx, c, X, z, text) {
  const p = proj(c, X, z, 0); if (!p || p.d > 300 || p.d < 14) return;
  const wpx = c.f * 1.7 / p.d, hpx = c.f * 2.3 / p.d;
  ctx.fillStyle = css(fog(p.d, [60, 64, 70])); ctx.fillRect(p.x - c.f * .05 / p.d, p.y - hpx, c.f * .1 / p.d, hpx);
  ctx.fillStyle = css(fog(p.d, [22, 30, 42])); ctx.fillRect(p.x - wpx / 2, p.y - hpx, wpx, hpx * .55);
  ctx.fillStyle = '#fff'; ctx.font = font(800, Math.max(6, wpx * .5)); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, p.x, p.y - hpx * .72);
  ctx.font = font(700, Math.max(4, wpx * .16)); ctx.fillStyle = '#9fd8ff'; ctx.fillText('M', p.x, p.y - hpx * .6 + wpx * .22);
}

function drawGantry(ctx, c, W) {
  const z = W.D + .6, L = proj(c, -WALL_X + .5, z, 0), R = proj(c, WALL_X - .5, z, 0);
  const Lt = proj(c, -WALL_X + .5, z, 7.2), Rt = proj(c, WALL_X - .5, z, 7.2), Lb = proj(c, -WALL_X + .5, z, 5.9);
  if (!L || !R || !Lt || !Rt) return;
  const pw = Math.max(2, c.f * .45 / L.d);
  ctx.fillStyle = css(fog(L.d, [44, 50, 58]));
  ctx.fillRect(L.x - pw / 2, Lt.y, pw, L.y - Lt.y); ctx.fillRect(R.x - pw / 2, Rt.y, pw, R.y - Rt.y);
  ctx.fillRect(L.x, Lt.y, R.x - L.x, Lb.y - Lt.y);
  // торлы баннер
  const bh = Lb.y - Lt.y, sq = bh / 3;
  for (let r = 0; r < 3; r++) for (let x = L.x, i = 0; x < R.x; x += sq, i++) { ctx.fillStyle = (i + r) % 2 ? '#101214' : '#f2f2f2'; ctx.fillRect(x, Lt.y + r * sq, Math.min(sq, R.x - x), sq); }
  ctx.fillStyle = 'rgba(10,14,20,.78)'; const tw = (R.x - L.x) * .32; ctx.fillRect((L.x + R.x) / 2 - tw / 2, Lt.y, tw, bh);
  ctx.fillStyle = '#fff'; ctx.font = font(800, bh * .55); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('FINISH', (L.x + R.x) / 2, Lt.y + bh / 2);
}

function drawSmoke(ctx, c, W) {
  const list = W.smoke.slice().sort((a, b) => b.z - a.z);
  for (const p of list) {
    const k = p.age / p.life, a = proj(c, p.X, p.z, p.Y); if (!a) continue;
    const r = c.f * (p.size0 + (p.size1 - p.size0) * k) / a.d;
    if (r < 1) continue;
    const g = ctx.createRadialGradient(a.x, a.y, 0, a.x, a.y, r);
    const al = (1 - k) * p.alpha;
    g.addColorStop(0, `rgba(238,238,238,${al})`); g.addColorStop(.55, `rgba(214,214,214,${al * .55})`); g.addColorStop(1, 'rgba(210,210,210,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(a.x, a.y, r, 0, 7); ctx.fill();
  }
}

// ---------- Артынан көрінетін көлік (процедуралық, дәл тік) ----------
const CAR_DIM = {'Спорткар': [1.95, 1.28, 'sport'], 'Суперкар': [2.02, 1.14, 'super'], 'Гиперкар': [2.02, 1.12, 'super'], 'Купе': [1.9, 1.31, 'sport'], 'Седан': [1.9, 1.45, 'sedan'], 'Универсал': [1.9, 1.47, 'wagon'], 'Лифтбек': [1.92, 1.42, 'sedan'], 'Хэтчбек': [1.82, 1.45, 'hatch'], 'Родстер': [1.75, 1.25, 'sport'], 'Электр': [1.95, 1.46, 'ev'], 'SUV': [2.0, 1.76, 'suv'], 'Пикап': [2.1, 1.95, 'truck']};
const GEO = {
  sedan: {deck: .56, bw: .40, tw: .33, tail: 'pair'}, wagon: {deck: .52, bw: .44, tw: .42, tail: 'pair'}, hatch: {deck: .50, bw: .43, tw: .40, tail: 'pair'},
  sport: {deck: .60, bw: .38, tw: .29, tail: 'strip', wing: .035}, super: {deck: .64, bw: .35, tw: .25, tail: 'strip', wing: .05},
  ev: {deck: .56, bw: .41, tw: .33, tail: 'strip'}, suv: {deck: .50, bw: .45, tw: .42, tail: 'tall'}, truck: {deck: .60, bw: .36, tw: .34, tail: 'tall'}
};
const PALETTE = ['#eceeed', '#17191c', '#c4122f', '#1f4fa3', '#9da4aa', '#f2b705', '#ee6a12', '#2f7d4f', '#4b5258'];
const MAKE_PAINT = {Ferrari: 2, McLaren: 6, Lamborghini: 5, Tesla: 0, Porsche: 4, Nissan: 4, Subaru: 3, Mazda: 2, Toyota: 8, BMW: 3, Audi: 8, 'Mercedes-Benz': 1, Honda: 0, Lexus: 1, Kia: 3, Hyundai: 8, Ford: 3, Chevrolet: 5};
export function pickPaints(a, b) {
  const pick = c => { if (MAKE_PAINT[c.make] !== undefined) return MAKE_PAINT[c.make]; let h = 7; for (const ch of c.make + c.model) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h % PALETTE.length; };
  const ia = pick(a); let ib = pick(b); if (ia === ib) ib = (ib + 4) % PALETTE.length;
  return [PALETTE[ia], PALETTE[ib]];
}
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16), ch = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k)));
  return `rgb(${ch[0]},${ch[1]},${ch[2]})`;
}
function rrp(x, y, w, h, r) {
  const p = new Path2D(); r = Math.min(r, w / 2, h / 2);
  p.moveTo(x + r, y); p.arcTo(x + w, y, x + w, y + h, r); p.arcTo(x + w, y + h, x, y + h, r); p.arcTo(x, y + h, x, y, r); p.arcTo(x, y, x + w, y, r); p.closePath();
  return p;
}

// Координата: бастамасы жерде, көліктің ортасында; y жоғары = теріс. w — ені, h — биіктігі (px).
function drawRearCar(ctx, w, h, o) {
  const g = GEO[o.cat], color = o.color, Y = f => -f * h, deck = g.deck, lit = o.braking;
  const paint = (path, y0, y1) => {
    const v = ctx.createLinearGradient(0, Y(y1), 0, Y(y0));
    v.addColorStop(0, shade(color, .3)); v.addColorStop(.4, color); v.addColorStop(1, shade(color, -.5));
    ctx.fillStyle = v; ctx.fill(path);
    const hg = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
    hg.addColorStop(0, 'rgba(0,0,0,.45)'); hg.addColorStop(.2, 'rgba(0,0,0,0)'); hg.addColorStop(.8, 'rgba(0,0,0,0)'); hg.addColorStop(1, 'rgba(0,0,0,.45)');
    ctx.fillStyle = hg; ctx.fill(path);
  };
  const lamp = (path, on) => {
    ctx.fillStyle = '#2a0509'; ctx.fill(path);
    ctx.save(); ctx.clip(path);
    const lg = ctx.createLinearGradient(0, 0, 0, -h * .2);
    lg.addColorStop(0, on ? '#ff6b5e' : '#b3121a'); lg.addColorStop(1, on ? '#ff2a22' : '#7e0a10');
    ctx.fillStyle = lg; ctx.globalAlpha = .92; ctx.fillRect(-w, -h * 2, w * 2, h * 2); ctx.restore();
    ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = Math.max(1, w * .004); ctx.stroke(path);
  };
  // доңғалақтар
  const tw = w * .13;
  for (const s of [-1, 1]) {
    const x0 = s < 0 ? -w / 2 : w / 2 - tw, tg = ctx.createLinearGradient(x0, 0, x0 + tw, 0);
    tg.addColorStop(0, '#050506'); tg.addColorStop(.5, '#1a1b1e'); tg.addColorStop(1, '#050506');
    ctx.fillStyle = tg; ctx.fill(rrp(x0, Y(.34), tw, .34 * h, tw * .3));
  }
  ctx.fillStyle = '#07080a'; ctx.fillRect(-w * .44, Y(.18), w * .88, h * .1);
  // дене
  const body = rrp(-w * .49, Y(deck), w * .98, (deck - .11) * h, w * .07); paint(body, .11, deck);
  ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fill(rrp(-w * .47, Y(.31), w * .94, .2 * h, w * .04));
  ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = Math.max(1, h * .008); ctx.beginPath(); ctx.moveTo(-w * .42, Y(deck - .012)); ctx.lineTo(w * .42, Y(deck - .012)); ctx.stroke();
  // диффузор
  const dw = o.cat === 'ev' || o.cat === 'super' || o.cat === 'sport' ? .66 : .5;
  ctx.fillStyle = '#0d0f12'; ctx.fill(rrp(-w * dw / 2, Y(.215), w * dw, .105 * h, w * .015));
  ctx.strokeStyle = 'rgba(255,255,255,.09)'; ctx.lineWidth = Math.max(1, w * .003);
  for (let i = 1; i < 7; i++) { const x = -w * dw / 2 + w * dw * i / 7; ctx.beginPath(); ctx.moveTo(x, Y(.2)); ctx.lineTo(x, Y(.125)); ctx.stroke(); }
  ctx.fillStyle = '#8a1118'; [-1, 1].forEach(s => ctx.fillRect(s * w * .36 - w * .045, Y(.265), w * .09, h * .022));
  // глушительдер
  if (!o.ev) {
    const n = o.hp > 550 && g.tail === 'strip' ? 4 : 2, xs = n === 4 ? [-.27, -.14, .14, .27] : [-.22, .22], r = w * (n === 4 ? .026 : .034);
    xs.forEach(fx => {
      const cx = fx * w, cy = Y(.16), rg = ctx.createRadialGradient(cx - r * .3, cy - r * .3, r * .1, cx, cy, r);
      rg.addColorStop(0, '#f4f6f7'); rg.addColorStop(.6, '#9aa2a8'); rg.addColorStop(1, '#3a3f44');
      ctx.fillStyle = rg; ctx.beginPath(); ctx.ellipse(cx, cy, r, r * .9, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#030303'; ctx.beginPath(); ctx.ellipse(cx, cy, r * .66, r * .6, 0, 0, 7); ctx.fill();
    });
  }
  // номер белгісі
  const py = g.tail === 'tall' ? .37 : .39;
  ctx.fillStyle = '#f2f1e8'; ctx.fill(rrp(-w * .115, Y(py), w * .23, .075 * h, w * .008));
  ctx.strokeStyle = '#15171a'; ctx.lineWidth = Math.max(1, w * .004); ctx.stroke(rrp(-w * .115, Y(py), w * .23, .075 * h, w * .008));
  ctx.fillStyle = '#15171a'; ctx.font = font(800, h * .048); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(o.plate, 0, Y(py) + .039 * h);
  // артқы шамдар
  const cy = deck - .1;
  if (g.tail === 'strip') {
    lamp(rrp(-w * .43, Y(cy + .03), w * .86, .06 * h, w * .02), lit);
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(-w * .03, Y(cy + .032), w * .06, .064 * h);
  } else if (g.tail === 'pair') {
    [-1, 1].forEach(s => lamp(rrp(s < 0 ? -w * .475 : w * .275, Y(cy + .055), w * .2, .105 * h, w * .03), lit));
  } else {
    [-1, 1].forEach(s => lamp(rrp(s < 0 ? -w * .488 : w * .408, Y(cy + .12), w * .08, .22 * h, w * .02), lit));
  }
  // кабина (жоғарыдан көрініс кезінде 3D көпбұрыштармен бөлек салынады)
  if (o.elev) {
    if (g.wing && o.hp > 380) {
      const wy = deck + (o.cat === 'super' ? .09 : .06);
      ctx.fillStyle = '#0a0b0d'; [-1, 1].forEach(s => ctx.fillRect(s * w * .22 - w * .008, Y(wy), w * .016, h * (wy - deck + .01)));
      ctx.fill(rrp(-w * .43, Y(wy + g.wing), w * .86, g.wing * h, w * .01));
    }
    if (lit) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      (g.tail === 'strip' ? [-.3, 0, .3] : [-.38, .38]).forEach(fx => { const gx = fx * w, gy = Y(cy), gr = w * .17, rg = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr); rg.addColorStop(0, 'rgba(255,60,50,.65)'); rg.addColorStop(1, 'rgba(255,40,30,0)'); ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(gx, gy, gr, 0, 7); ctx.fill(); });
      ctx.restore();
    }
    return;
  }
  const bw = g.bw * w, tw2 = g.tw * w, top = Y(1), base = Y(deck), rad = w * .07;
  const cab = new Path2D(); cab.moveTo(-bw, base); cab.lineTo(-tw2, top + rad); cab.quadraticCurveTo(-tw2, top, -tw2 + rad, top); cab.lineTo(tw2 - rad, top); cab.quadraticCurveTo(tw2, top, tw2, top + rad); cab.lineTo(bw, base); cab.closePath();
  paint(cab, deck, 1);
  const inset = .052 * w, gb = Y(deck + .035), gt = Y(1 - (o.cat === 'suv' || o.cat === 'truck' ? .06 : .075));
  const glass = new Path2D(); glass.moveTo(-bw + inset, gb); glass.lineTo(-tw2 + inset * .8, gt + rad * .6); glass.quadraticCurveTo(-tw2 + inset * .8, gt, -tw2 + inset * .8 + rad * .6, gt); glass.lineTo(tw2 - inset * .8 - rad * .6, gt); glass.quadraticCurveTo(tw2 - inset * .8, gt, tw2 - inset * .8, gt + rad * .6); glass.lineTo(bw - inset, gb); glass.closePath();
  const gg = ctx.createLinearGradient(0, gt, 0, gb); gg.addColorStop(0, '#2a3a4a'); gg.addColorStop(.5, '#0d141b'); gg.addColorStop(1, '#05080b');
  ctx.fillStyle = gg; ctx.fill(glass);
  ctx.save(); ctx.clip(glass); ctx.fillStyle = 'rgba(255,255,255,.11)'; ctx.beginPath(); ctx.moveTo(-w * .5, gb); ctx.lineTo(-w * .12, gb); ctx.lineTo(w * .1, gt); ctx.lineTo(-w * .28, gt); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.beginPath(); ctx.moveTo(w * .08, gb); ctx.lineTo(w * .2, gb); ctx.lineTo(w * .36, gt); ctx.lineTo(w * .24, gt); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = Math.max(1, w * .004); [.3, .5, .7].forEach(f => { const y = gb + (gt - gb) * f; ctx.beginPath(); ctx.moveTo(-w * .5, y); ctx.lineTo(w * .5, y); ctx.stroke(); });
  ctx.restore();
  ctx.fillStyle = lit ? '#ff3a30' : '#a50f16'; ctx.fillRect(-w * .07, gt + .012 * h, w * .14, h * .014);
  // айналар
  [-1, 1].forEach(s => { const x = s < 0 ? -bw - w * .062 : bw - w * .004; paint(rrp(x, Y(deck + .13), w * .066, .05 * h, w * .02), deck + .08, deck + .13); });
  // спойлер
  if (g.wing && o.hp > 380) {
    const wy = deck + (o.cat === 'super' ? .09 : .06);
    ctx.fillStyle = '#0a0b0d'; [-1, 1].forEach(s => ctx.fillRect(s * w * .22 - w * .008, Y(wy), w * .016, h * (wy - deck + .01)));
    ctx.fill(rrp(-w * .43, Y(wy + g.wing), w * .86, g.wing * h, w * .01));
    [-1, 1].forEach(s => ctx.fillRect(s * w * .43 - (s < 0 ? 0 : w * .012), Y(wy + g.wing + .025), w * .012, h * (g.wing + .045)));
    ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.lineWidth = Math.max(1, h * .006); ctx.beginPath(); ctx.moveTo(-w * .4, Y(wy + g.wing)); ctx.lineTo(w * .4, Y(wy + g.wing)); ctx.stroke();
  }
  if (lit) { // тежеу жарығының жарқылы
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const spots = g.tail === 'strip' ? [[-.3, cy], [0, cy], [.3, cy]] : [[-.38, cy], [.38, cy]];
    spots.forEach(([fx, fy]) => { const gx = fx * w, gy = Y(fy), gr = w * .17, rg = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr); rg.addColorStop(0, 'rgba(255,60,50,.65)'); rg.addColorStop(1, 'rgba(255,40,30,0)'); ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(gx, gy, gr, 0, 7); ctx.fill(); });
    ctx.restore();
  }
}

function drawCar(ctx, c, W, i) {
  const car = W.cars[i], spec = car.spec, st = car.st;
  const rear = st.x - spec.len, X = LANES[i];
  const p = proj(c, X, rear, 0); if (!p) return;
  const dim = CAR_DIM[spec.car.type] || [1.9, 1.4, 'sedan'];
  const wpx = c.f * dim[0] / p.d, hpx = c.f * dim[1] * c.cs / p.d;
  const squat = clamp(st.accel / 12, -.3, 1) * .025, jitter = !st.launched ? (Math.sin(W.time * 85 + i) * .5) * c.u * 1.2 * (1 + st.rpm / 6000) : Math.sin(W.time * 120 + i) * .4 * c.u * clamp(st.v / 80, 0, 1);
  const poly = (pts, fill) => { if (pts.some(q => !q)) return false; ctx.fillStyle = fill; ctx.beginPath(); pts.forEach((q, k) => k ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)); ctx.closePath(); ctx.fill(); return true; };
  // көлеңке (жердегі іздің проекциясы)
  const hw = dim[0] / 2 * 1.04;
  ctx.save();
  ctx.filter = 'blur(' + Math.max(1, wpx * .03) + 'px)';
  poly([proj(c, X - hw, rear - .1), proj(c, X + hw, rear - .1), proj(c, X + hw, rear + spec.len + .15), proj(c, X - hw, rear + spec.len + .15)], 'rgba(0,0,0,.5)');
  ctx.filter = 'none'; ctx.restore();
  const sp = W.sprites[i];
  ctx.save();
  if (sp?.img?.complete && sp.img.naturalWidth) { // қолданушы салған жеке сурет (артынан көрінетін PNG)
    const hh = wpx * (sp.box.h / sp.box.w) * c.cs + wpx * .0;
    ctx.translate(p.x, p.y + jitter); ctx.scale(1, 1 - squat);
    ctx.drawImage(sp.img, sp.box.x, sp.box.y, sp.box.w, sp.box.h, -wpx / 2, -hh, wpx, hh);
  } else {
    const g = GEO[dim[2]], col = W.paints[i], hm = dim[1], Yd = g.deck * hm, roof = hm, L = spec.len, bwm = g.bw * dim[0], twm = g.tw * dim[0], ww = dim[0] * .49;
    const S = {sedan: [.07, .25, .5, .68], wagon: [.05, .2, .66, .8], hatch: [.04, .18, .54, .7], sport: [.14, .36, .5, .68], super: [.2, .4, .54, .7], ev: [.1, .32, .52, .7], suv: [.03, .1, .64, .78], truck: [.3, .34, .58, .74]}[dim[2]] || [.07, .27, .58, .78];
    const P = (xm, f, Y) => proj(c, X + xm, rear + L * f, Y);
    const dark = shade(col, -.45), mid = shade(col, -.15), lite = shade(col, .22);
    const wrap = (pts, a, b, ca, cb) => { const g2 = ctx.createLinearGradient(a.x, a.y, b.x, b.y); g2.addColorStop(0, ca); g2.addColorStop(1, cb); poly(pts, g2); };
    // ---- дене: профиль бойынша станциялар (жоспардағы дөңгелектенген силуэт + капот иілуі)
    const sm = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
    const hwAt = f => ww * (f < .1 ? .9 + .1 * sm(f / .1) : f > .8 ? 1 - .26 * sm((f - .8) / .2) - (f > .96 ? .22 * sm((f - .96) / .04) : 0) : 1);
    const yAt = f => Yd * (f < .62 ? 1 : 1 - .1 * sm((f - .62) / .38));
    const N = 24, sgn = X < 0 ? 1 : -1, sx = f => sgn * hwAt(f);
    // қапталы (орталыққа қараған жағы) + арқа
    for (let k = 0; k < N; k++) {
      const f0 = k / N, f1 = (k + 1) / N, q = [P(sx(f0), f0, .2), P(sx(f1), f1, .2), P(sx(f1), f1, yAt(f1) * .97), P(sx(f0), f0, yAt(f0) * .97)];
      if (q.some(v => !v)) continue;
      const g2 = ctx.createLinearGradient(0, q[3].y, 0, q[0].y); g2.addColorStop(0, shade(col, -.25)); g2.addColorStop(.5, shade(col, -.5)); g2.addColorStop(1, shade(col, -.75));
      poly(q, g2); ctx.strokeStyle = g2; ctx.lineWidth = 1; ctx.stroke();
    }
    // доңғалақтар (көрінетін жағы)
    [.16, .8].forEach(fc => {
      const r = .34, f0 = fc - r / L * .9, f1 = fc + r / L * .9, tire = [P(sx(fc), f0, .02), P(sx(fc), f1, .02), P(sx(fc), f1, r * 1.55), P(sx(fc), f0, r * 1.55)];
      poly(tire, '#0b0c0e');
      const rr0 = r * .62, rim = [P(sx(fc), fc - rr0 / L * .9, .1), P(sx(fc), fc + rr0 / L * .9, .1), P(sx(fc), fc + rr0 / L * .9, r * 1.2), P(sx(fc), fc - rr0 / L * .9, r * 1.2)];
      if (rim.every(v => v)) { const g3 = ctx.createLinearGradient(rim[0].x, rim[0].y, rim[2].x, rim[2].y); g3.addColorStop(0, '#d9dee2'); g3.addColorStop(.5, '#7d848a'); g3.addColorStop(1, '#30343a'); poly(rim, g3); }
    });
    // дене үсті: қисық беттің градиенті (жиегі қараңғы, ортасы жарқын)
    for (let k = N - 1; k >= 0; k--) {
      const f0 = k / N, f1 = (k + 1) / N, fm = (f0 + f1) / 2, y0 = yAt(f0), y1 = yAt(f1);
      const q = [P(-hwAt(f0), f0, y0), P(hwAt(f0), f0, y0), P(hwAt(f1), f1, y1), P(-hwAt(f1), f1, y1)];
      if (q.some(v => !v)) continue;
      const mL = P(-hwAt(fm), fm, (y0 + y1) / 2), mR = P(hwAt(fm), fm, (y0 + y1) / 2); if (!mL || !mR) continue;
      const g4 = ctx.createLinearGradient(mL.x, mL.y, mR.x, mR.y);
      g4.addColorStop(0, shade(col, -.4)); g4.addColorStop(.18, shade(col, .12)); g4.addColorStop(.38, shade(col, .3)); g4.addColorStop(.62, col); g4.addColorStop(.88, shade(col, -.22)); g4.addColorStop(1, shade(col, -.5));
      poly(q, g4); ctx.strokeStyle = g4; ctx.lineWidth = 1; ctx.stroke();
      const sky = (fm > .62 && fm < .98) ? .16 * Math.sin((fm - .62) / .36 * Math.PI) : (fm < .1 ? .08 : 0);
      if (sky > 0) { ctx.save(); ctx.globalAlpha = sky; poly(q, '#fff'); ctx.restore(); }
    }
    // капот сызығы + бүйір сызықтары
    ctx.save(); ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.lineWidth = Math.max(1, c.f * .012 / p.d);
    [-1, 1].forEach(s => { ctx.beginPath(); let st0 = false; for (let k = 0; k <= N; k++) { const f = k / N, v = P(s * hwAt(f) * .62, f, yAt(f)); if (!v) continue; st0 ? ctx.lineTo(v.x, v.y) : ctx.moveTo(v.x, v.y); st0 = true; } ctx.stroke(); });
    ctx.restore();
    // алдыңғы ұшы: бампер, торы, фаралар
    poly([P(-hwAt(1) * .92, .975, yAt(1) * .86), P(hwAt(1) * .92, .975, yAt(1) * .86), P(hwAt(1) * .9, 1, yAt(1) * .55), P(-hwAt(1) * .9, 1, yAt(1) * .55)], '#0a0b0d');
    [-1, 1].forEach(s => poly([P(s * hwAt(.95) * .96, .93, yAt(.95) * .97), P(s * hwAt(.95) * .52, .95, yAt(.95) * .97), P(s * hwAt(1) * .5, 1, yAt(1) * .8), P(s * hwAt(1) * .9, 1, yAt(1) * .8)], '#e8eef3'));
    // кабина: бағандар, әйнектер, төбе
    const gl = (ptsA, ptsB) => { const q = [...ptsA, ...ptsB]; const a = q[0], b = q[2]; if (a && b) wrap(q, a, b, '#2d3d4c', '#080c11'); };
    poly([P(-bwm, S[0], Yd), P(-twm, S[1], roof), P(-twm, S[2], roof), P(-bwm, S[3], Yd)], dark);
    poly([P(bwm, S[0], Yd), P(twm, S[1], roof), P(twm, S[2], roof), P(bwm, S[3], Yd)], dark);
    const gi = .9;
    gl([P(-bwm * gi, S[0], Yd), P(bwm * gi, S[0], Yd)], [P(twm * gi, S[1], roof), P(-twm * gi, S[1], roof)]);
    gl([P(-twm * gi, S[2], roof), P(twm * gi, S[2], roof)], [P(bwm * gi, S[3], Yd), P(-bwm * gi, S[3], Yd)]);
    const r0 = P(0, S[1], roof), r1 = P(0, S[2], roof);
    if (r0 && r1) wrap([P(-twm, S[1], roof), P(twm, S[1], roof), P(twm, S[2], roof), P(-twm, S[2], roof)], r0, r1, lite, mid);
    ctx.save(); ctx.globalAlpha = .4; poly([P(-twm * .7, S[1] + .02, roof), P(-twm * .15, S[1] + .02, roof), P(-twm * .15, S[2] - .02, roof), P(-twm * .7, S[2] - .02, roof)], 'rgba(255,255,255,.6)'); ctx.restore();
    // айналар
    [-1, 1].forEach(s => poly([P(s * (bwm + .02), S[3] - .03, Yd + .12), P(s * (bwm + .2), S[3] - .02, Yd + .12), P(s * (bwm + .2), S[3] - .06, Yd + .02), P(s * (bwm + .02), S[3] - .05, Yd + .02)], shade(col, -.3)));
    // артқы жағы
    ctx.translate(p.x, p.y + jitter); ctx.scale(1, 1 - squat);
    drawRearCar(ctx, wpx, hpx, {elev: true, color: col, cat: dim[2], ev: spec.ev, hp: spec.car.hp, braking: st.braking && st.v > 1, plate: spec.car.model.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 7)});
  }
  ctx.restore();
  // шығатын жалын (ауыстыру кезінде)
  if (!spec.ev && st.shifting && spec.car.hp > 450 && st.shiftT > spec.shiftTime * .5) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    [-.22, .22].forEach(o => { const q = proj(c, X + o * (i ? -1 : 1), rear - .1, .35); if (!q) return; const r = c.f * .35 / q.d; const g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, r); g.addColorStop(0, 'rgba(255,200,90,.9)'); g.addColorStop(1, 'rgba(255,90,10,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, 7); ctx.fill(); });
    ctx.restore();
  }
}

function drawFx(ctx, c, W) {
  const lead = W.cars.reduce((m, car) => Math.max(m, car.st.v), 0), vf = clamp(lead / 90, 0, 1);
  const {w, h} = c;
  if (vf > .1) { // жылдамдық сызықтары
    ctx.save(); ctx.strokeStyle = `rgba(235,244,248,${.18 * vf})`;
    for (let i = 0; i < 26; i++) {
      const ang = (i / 26) * Math.PI * 2 + (i * 1.7), r0 = w * (.34 + ((i * 37 + W.time * 4 * (1 + vf)) % 10) / 10 * .5);
      const x0 = c.cx + Math.cos(ang) * r0, y0 = c.py + Math.sin(ang) * r0 * .8;
      const len = (20 + vf * 90) * c.u;
      ctx.lineWidth = Math.max(1, c.u * 1.4);
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + Math.cos(ang) * len, y0 + Math.sin(ang) * len * .8); ctx.stroke();
    }
    ctx.restore();
  }
  const key = `${w}x${h}`;
  if (vignetteCache.key !== key) { const g = ctx.createRadialGradient(w / 2, h * .5, Math.min(w, h) * .35, w / 2, h * .5, Math.max(w, h) * .75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.55)'); vignetteCache = {key, gradient: g}; }
  ctx.fillStyle = vignetteCache.gradient; ctx.fillRect(0, 0, w, h);
  // кино түстері
  ctx.fillStyle = 'rgba(255,150,60,.045)'; ctx.fillRect(0, 0, w, h);
  if (W.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${W.flash * .75})`; ctx.fillRect(0, 0, w, h); }
}

// ---------- HUD ----------
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }
function glass(ctx, x, y, w, h, r, accent, a = .72) {
  rr(ctx, x, y, w, h, r); ctx.fillStyle = `rgba(6,10,15,${a})`; ctx.fill();
  if (accent) { ctx.lineWidth = Math.max(1, r * .1); ctx.strokeStyle = accent + '99'; ctx.stroke(); }
}
function fit(ctx, text, maxW, size, weight = 800) {
  let s = size; ctx.font = font(weight, s);
  while (ctx.measureText(text).width > maxW && s > size * .45) { s -= 1; ctx.font = font(weight, s); }
  return s;
}
function txt(ctx, t, x, y, size, color = '#fff', align = 'left', weight = 800) {
  ctx.font = font(weight, size); ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.fillText(t, x, y);
}

function drawCard(ctx, c, W, i, x, y, w, h) {
  const car = W.cars[i], u = c.u, k = ACCENT[i], s = car.spec.car;
  glass(ctx, x, y, w, h, 14 * u, k);
  const ph = W.photos?.[i]?.img, photoW = ph ? w * .4 : 0;
  if (ph) {
    ctx.save(); rr(ctx, x, y, w, h, 14 * u); ctx.clip();
    const sc = Math.max(photoW / ph.naturalWidth, h / ph.naturalHeight), dw = ph.naturalWidth * sc, dh = ph.naturalHeight * sc;
    ctx.drawImage(ph, x + w - dw / 2 - photoW / 2, y + (h - dh) / 2, dw, dh);
    const fg = ctx.createLinearGradient(x + w - photoW - 30 * u, 0, x + w - photoW * .55, 0); fg.addColorStop(0, 'rgba(6,10,15,.97)'); fg.addColorStop(1, 'rgba(6,10,15,0)');
    ctx.fillStyle = fg; ctx.fillRect(x, y, w, h); ctx.restore();
    glass(ctx, x, y, w, h, 14 * u, k, 0);
  }
  ctx.fillStyle = k; rr(ctx, x, y, 9 * u, h, 5 * u); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 46 * u, y + 44 * u, 24 * u, 0, 7); ctx.fillStyle = k; ctx.fill();
  txt(ctx, i ? 'B' : 'A', x + 46 * u, y + 54 * u, 28 * u, '#071018', 'center', 900);
  txt(ctx, s.make.toUpperCase(), x + 84 * u, y + 34 * u, 20 * u, '#9fb0bc', 'left', 700);
  const fs = fit(ctx, s.model, w - photoW - 100 * u, 38 * u); txt(ctx, s.model, x + 84 * u, y + 72 * u, fs, '#fff', 'left', 800);
  const cols = [[Math.round(s.hp), W.T.hp], [s.weight, W.T.kg], [s.zero.toFixed(1), W.T.z100]], cw = (w - photoW - 40 * u) / 3;
  cols.forEach(([v, l], n) => { const cx = x + 26 * u + n * cw; txt(ctx, String(v), cx, y + h - 38 * u, 30 * u, '#fff', 'left', 800); txt(ctx, l, cx, y + h - 14 * u, 15 * u, '#8798a6', 'left', 700); });
}

function drawSpeedo(ctx, c, W, i, x, y, w, h) {
  const car = W.cars[i], st = car.st, spec = car.spec, u = c.u, k = ACCENT[i];
  glass(ctx, x, y, w, h, 16 * u, k, .78);
  const kmh = Math.round(st.v * 3.6);
  txt(ctx, String(kmh), x + w * .52, y + h * .58, Math.min(h * .52, w * .3), '#fff', 'center', 900);
  txt(ctx, W.T.kmh, x + w * .52, y + h * .58 + 26 * u, 17 * u, '#8798a6', 'center', 700);
  const gear = spec.ev ? 'EV' : (st.v < .5 && !st.launched ? 'N' : String(st.gear + 1));
  ctx.fillStyle = k; rr(ctx, x + 18 * u, y + 18 * u, 56 * u, 56 * u, 10 * u); ctx.fill();
  txt(ctx, gear, x + 46 * u, y + 58 * u, 34 * u, '#071018', 'center', 900);
  txt(ctx, car.finished ? `ET ${car.et.toFixed(2)}` : `${Math.min(Math.round(W.D), Math.max(0, Math.round(st.x)))} ${W.T.m}`, x + w - 20 * u, y + 46 * u, 26 * u, car.finished ? '#ffd24a' : '#e6eef4', 'right', 800);
  txt(ctx, i ? 'B' : 'A', x + w - 20 * u, y + 72 * u, 16 * u, k, 'right', 800);
  // rpm
  const n = 22, bw = (w - 40 * u) / n, rpm01 = clamp((st.rpm - spec.idle) / (spec.redline - spec.idle), 0, 1);
  for (let j = 0; j < n; j++) {
    const on = j / n < rpm01; ctx.fillStyle = on ? (j > n * .82 ? '#ff3b30' : j > n * .62 ? '#ffd000' : k) : 'rgba(255,255,255,.12)';
    ctx.fillRect(x + 20 * u + j * bw, y + h - 30 * u, bw - 3 * u, 12 * u);
  }
  txt(ctx, spec.ev ? 'kW' : 'RPM', x + 20 * u, y + h - 38 * u, 14 * u, '#8798a6', 'left', 700);
  txt(ctx, spec.ev ? `${Math.round(clamp(st.power * st.v / 1000, 0, 9999))}` : `${Math.round(st.rpm / 10) * 10}`, x + w - 20 * u, y + h - 38 * u, 16 * u, '#c6d2db', 'right', 700);
}

function drawProgress(ctx, c, W, x, y, w) {
  const u = c.u, h = 14 * u;
  glass(ctx, x - 18 * u, y - 54 * u, w + 36 * u, 110 * u, 14 * u, null, .66);
  ctx.fillStyle = 'rgba(255,255,255,.14)'; rr(ctx, x, y, w, h, h / 2); ctx.fill();
  [0, .25, .5, .75, 1].forEach(t => { ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(x + w * t - 1 * u, y - 6 * u, 2 * u, h + 12 * u); });
  W.cars.forEach((car, i) => {
    const t = clamp(car.st.x / W.D, 0, 1), px = x + w * t, py = y + h / 2 + (i ? 14 : -14) * u;
    ctx.fillStyle = ACCENT[i]; rr(ctx, x, y + (i ? h * .5 : 0), w * t, h / 2, 4 * u); ctx.fill();
    ctx.beginPath(); ctx.arc(px, py, 13 * u, 0, 7); ctx.fill();
    txt(ctx, i ? 'B' : 'A', px, py + 6 * u, 17 * u, '#071018', 'center', 900);
  });
  txt(ctx, '🏁', x + w + 4 * u, y + 40 * u, 26 * u, '#fff', 'right');
  txt(ctx, `${Math.round(W.D)} ${W.T.m}`, x + w, y + 46 * u, 16 * u, '#9fb0bc', 'right', 700);
}

function drawTree(ctx, c, W, x, y, size) {
  const u = size, colW = 74 * u;
  glass(ctx, x - colW - 16 * u, y, colW * 2 + 32 * u, 252 * u, 16 * u, '#9aa6ae', .86);
  for (let col = 0; col < 2; col++) {
    const cxx = x + (col ? colW / 2 : -colW / 2);
    for (let r = 0; r < 4; r++) {
      const cy = y + 40 * u + r * 56 * u, isG = r === 3;
      const lit = isG ? W.lights.green : r < W.lights.amber;
      ctx.beginPath(); ctx.arc(cxx, cy, 22 * u, 0, 7);
      ctx.fillStyle = lit ? (isG ? '#25e06b' : '#ffb21e') : (isG ? '#0f2a18' : '#2c2312'); ctx.fill();
      if (lit) { ctx.save(); ctx.shadowColor = isG ? '#25e06b' : '#ffb21e'; ctx.shadowBlur = 30 * u; ctx.fill(); ctx.restore(); }
      ctx.lineWidth = 3 * u; ctx.strokeStyle = '#05080b'; ctx.stroke();
    }
  }
  txt(ctx, 'A', x - colW / 2, y + 244 * u, 14 * u, ACCENT[0], 'center', 800);
  txt(ctx, 'B', x + colW / 2, y + 244 * u, 14 * u, ACCENT[1], 'center', 800);
}

function drawCountdown(ctx, c, W) {
  const cd = W.count; if (!cd || !cd.text) return;
  const u = c.u, k = clamp(cd.age / .9, 0, 1), pop = 1 + .5 * Math.pow(1 - clamp(cd.age / .22, 0, 1), 2), alpha = cd.go ? clamp(1 - Math.max(0, cd.age - .6) / .5, 0, 1) : 1 - k * .35;
  ctx.save(); ctx.globalAlpha = clamp(alpha, 0, 1); ctx.translate(c.w / 2, c.h * (c.portrait ? .49 : .46)); ctx.scale(pop, pop);
  const size = (cd.go ? 250 : 400) * u * (c.portrait ? 1 : .8);
  ctx.font = font(900, size); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round'; ctx.lineWidth = size * .08; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.strokeText(cd.text, 0, 0);
  ctx.shadowColor = cd.go ? '#25e06b' : '#ffb21e'; ctx.shadowBlur = 50 * u; ctx.fillStyle = cd.go ? '#52ff93' : '#fff'; ctx.fillText(cd.text, 0, 0);
  ctx.restore();
}

function drawResult(ctx, c, W) {
  const R = W.result; if (!R) return;
  const u = c.u, a = clamp(W.resultT / .5, 0, 1), cw = c.portrait ? 960 * u : 880 * u, ch = c.portrait ? 880 * u : 560 * u;
  const x = (c.w - cw) / 2, y = c.portrait ? c.h * .22 : (c.h - ch) / 2;
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(0, 0, c.w, c.h);
  ctx.translate(0, (1 - a) * 40 * u);
  glass(ctx, x, y, cw, ch, 28 * u, ACCENT[R.winner < 0 ? 0 : R.winner], .9);
  const T = W.T, wi = R.winner;
  txt(ctx, R.winner < 0 ? T.draw : `🏆 ${T.winner}`, c.w / 2, y + 78 * u, 40 * u, '#ffd24a', 'center', 900);
  if (wi >= 0) {
    const nm = `${W.cars[wi].spec.car.make} ${W.cars[wi].spec.car.model}`;
    const s = fit(ctx, nm, cw - 60 * u, 62 * u, 900); txt(ctx, nm, c.w / 2, y + 150 * u, s, ACCENT[wi], 'center', 900);
    txt(ctx, `${T.by} ${R.margin.time.toFixed(3)} ${T.s}  ·  ${R.margin.dist.toFixed(1)} ${T.m}`, c.w / 2, y + 196 * u, 28 * u, '#e6eef4', 'center', 700);
  }
  const rows = [[T.et, i => R.rows[i].et.toFixed(3) + ' ' + T.s], [T.trap, i => Math.round(R.rows[i].trap) + ' ' + T.kmh], [T.t100, i => R.rows[i].t100 ? R.rows[i].t100.toFixed(2) + ' ' + T.s : '—'], [T.rt, i => R.rows[i].rt.toFixed(3) + ' ' + T.s]];
  const top = y + (c.portrait ? 270 : 250) * u, rowH = (c.portrait ? 120 : 70) * u, colA = x + cw * .56, colB = x + cw * .86;
  txt(ctx, `A · ${W.cars[0].spec.car.model}`, colA, top - 22 * u, 20 * u, ACCENT[0], 'center', 800); txt(ctx, `B · ${W.cars[1].spec.car.model}`, colB, top - 22 * u, 20 * u, ACCENT[1], 'center', 800);
  rows.forEach(([label, f], n) => {
    const ry = top + n * rowH + rowH * .62;
    ctx.fillStyle = n % 2 ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.07)'; ctx.fillRect(x + 20 * u, top + n * rowH, cw - 40 * u, rowH);
    txt(ctx, label, x + 40 * u, ry, 24 * u, '#9fb0bc', 'left', 700);
    [0, 1].forEach(i => txt(ctx, f(i), i ? colB : colA, ry, (c.portrait ? 30 : 28) * u, wi === i && n === 0 ? '#ffd24a' : '#fff', 'center', 800));
  });
  txt(ctx, `${W.carsLabel}`, c.w / 2, y + ch - 24 * u, 18 * u, '#6f808d', 'center', 700);
  ctx.restore();
}

function drawHud(ctx, c, W) {
  const {w, h, u} = c, T = W.T;
  const clockShown = W.cars.every(x => x.finished) ? Math.max(...W.cars.map(x => x.tCross)) : W.clock;
  if (!W.hud) return;
  const showLive = W.phase !== 'result';
  if (c.portrait) {
    txt(ctx, 'DRIVEVAULT · DRAG RACE', w / 2, 62 * u, 26 * u, '#fff', 'center', 900);
    txt(ctx, `${Math.round(W.D)} ${T.m}`, w / 2, 98 * u, 20 * u, '#ffd24a', 'center', 800);
    drawCard(ctx, c, W, 0, 24 * u, 124 * u, 504 * u, 168 * u); drawCard(ctx, c, W, 1, 552 * u, 124 * u, 504 * u, 168 * u);
    if (W.lights.show) drawTree(ctx, c, W, w / 2, 330 * u, 1.05 * u);
    if (showLive) {
      drawProgress(ctx, c, W, 60 * u, h - 560 * u, w - 140 * u);
      txt(ctx, clockShown > 0 ? clockShown.toFixed(2) : '0.00', w / 2, h - 590 * u - 52 * u, 56 * u, '#fff', 'center', 900);
      drawSpeedo(ctx, c, W, 0, 24 * u, h - 460 * u, 504 * u, 250 * u); drawSpeedo(ctx, c, W, 1, 552 * u, h - 460 * u, 504 * u, 250 * u);
      txt(ctx, `${W.cars[0].spec.drive} · ${W.cars[0].spec.ev ? 'EV' : 'ICE'}`, 40 * u, h - 190 * u, 16 * u, '#9fb0bc', 'left', 700);
      txt(ctx, `${W.cars[1].spec.drive} · ${W.cars[1].spec.ev ? 'EV' : 'ICE'}`, w - 40 * u, h - 190 * u, 16 * u, '#9fb0bc', 'right', 700);
    }
    txt(ctx, T.cta, w / 2, h - 90 * u, 22 * u, 'rgba(255,255,255,.8)', 'center', 800);
    txt(ctx, '#Shorts #DragRace', w / 2, h - 56 * u, 18 * u, '#ffd24a', 'center', 800);
  } else {
    drawCard(ctx, c, W, 0, 24 * u, 22 * u, 480 * u, 150 * u); drawCard(ctx, c, W, 1, w - 504 * u, 22 * u, 480 * u, 150 * u);
    txt(ctx, `${Math.round(W.D)} ${T.m}`, w / 2, 40 * u, 20 * u, '#ffd24a', 'center', 800);
    if (W.lights.show) drawTree(ctx, c, W, w / 2, 56 * u, .72 * u);
    if (showLive) {
      drawSpeedo(ctx, c, W, 0, 24 * u, h - 226 * u, 460 * u, 200 * u); drawSpeedo(ctx, c, W, 1, w - 484 * u, h - 226 * u, 460 * u, 200 * u);
      drawProgress(ctx, c, W, w / 2 - 230 * u, h - 90 * u, 460 * u);
      txt(ctx, clockShown > 0 ? clockShown.toFixed(2) : '0.00', w / 2, h - 130 * u, 44 * u, '#fff', 'center', 900);
    }
  }
  drawCountdown(ctx, c, W);
  if (W.banner) { const b = W.banner, al = clamp(1 - b.age / b.life, 0, 1); ctx.save(); ctx.globalAlpha = Math.min(1, al * 3); txt(ctx, b.text, w / 2, h * (c.portrait ? .36 : .3), 64 * u, b.color || '#fff', 'center', 900); ctx.restore(); }
  drawResult(ctx, c, W);
}

export function drawRace(ctx, w, h, W) {
  const c = makeCamera(w, h, W.cam);
  ctx.save(); ctx.clearRect(0, 0, w, h);
  drawWorld(ctx, c, W);
  const order = [0, 1].sort((a, b) => W.cars[b].st.x - W.cars[a].st.x);
  order.forEach(i => drawCar(ctx, c, W, i));
  drawSmoke(ctx, c, W);
  drawFx(ctx, c, W);
  drawHud(ctx, c, W);
  ctx.restore();
}
