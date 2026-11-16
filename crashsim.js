// Краш-тест физикасы (1D lumped-parameter): көліктің алдыңғы деформация аймағы — пластикалық серіппе (күш–деформация қисығы),
// екі көлік болса екі серіппе тізбектей, ал қабырғада бір серіппе. Жүргізуші — белдік + airbag + дашбордпен модельденеді.
// Мақсат — ресми Euro NCAP/IIHS рейтингі емес, физикалық тұрғыдан дұрыс бағалау (импульс пен энергия сақталады).

const G = 9.81;
const KIND = {'Седан': 'sedan', 'Хэтчбек': 'hatch', 'Лифтбек': 'hatch', 'Универсал': 'wagon', 'SUV': 'suv', 'Пикап': 'truck', 'Купе': 'coupe', 'Спорткар': 'sport', 'Родстер': 'sport', 'Суперкар': 'super', 'Гиперкар': 'super', 'Электр': 'ev'};
// L — ұзындығы (м), H — биіктігі (м), Lc — алдыңғы деформация аймағының ұзындығы (м), g — пластикалық күштің деңгейі (көліктің салмағының еселігімен)
const SPEC = {
  sedan: {L: 4.85, H: 1.45, Lc: 0.72, g: 17, r: .33, glass: [3, 8], ol: [[0, .36], [0, .72], [.03, .96], [.2, 1.0], [.32, 1.40], [.38, 1.46], [.54, 1.46], [.6, 1.40], [.68, 1.0], [.96, .88], [1, .76], [1, .5], [.98, .36]]},
  hatch: {L: 4.2, H: 1.48, Lc: 0.62, g: 17, r: .32, glass: [2, 7], ol: [[0, .38], [0, .82], [.02, 1.05], [.12, 1.4], [.2, 1.47], [.52, 1.47], [.58, 1.4], [.68, 1.0], [.95, .86], [1, .72], [1, .5], [.98, .38]]},
  wagon: {L: 4.85, H: 1.5, Lc: 0.7, g: 16.5, r: .33, glass: [2, 7], ol: [[0, .38], [0, .85], [.02, 1.1], [.04, 1.45], [.1, 1.5], [.5, 1.5], [.57, 1.43], [.67, 1.0], [.96, .88], [1, .76], [1, .5], [.98, .38]]},
  suv: {L: 4.75, H: 1.72, Lc: 0.78, g: 15, r: .37, glass: [2, 7], ol: [[0, .45], [0, .95], [.03, 1.2], [.05, 1.6], [.12, 1.72], [.55, 1.72], [.62, 1.6], [.7, 1.12], [.96, 1.0], [1, .92], [1, .6], [.98, .45]]},
  truck: {L: 5.5, H: 1.9, Lc: 0.8, g: 13.5, r: .39, glass: [4, 8], ol: [[0, .5], [0, 1.12], [.31, 1.12], [.31, 1.35], [.34, 1.5], [.37, 1.88], [.58, 1.9], [.65, 1.8], [.72, 1.2], [.97, 1.15], [1, 1.05], [1, .6], [.98, .5]]},
  coupe: {L: 4.6, H: 1.33, Lc: 0.66, g: 17.5, r: .33, glass: [3, 8], ol: [[0, .4], [0, .75], [.04, .92], [.2, .98], [.34, 1.28], [.42, 1.33], [.55, 1.33], [.64, 1.15], [.72, .97], [.97, .8], [1, .66], [1, .42], [.98, .38]]},
  sport: {L: 4.5, H: 1.3, Lc: 0.62, g: 18, r: .33, glass: [3, 8], ol: [[0, .4], [0, .74], [.04, .92], [.2, .98], [.34, 1.26], [.42, 1.3], [.55, 1.3], [.64, 1.12], [.72, .95], [.97, .78], [1, .64], [1, .42], [.98, .38]]},
  super: {L: 4.5, H: 1.15, Lc: 0.56, g: 19, r: .34, glass: [3, 8], ol: [[0, .34], [0, .65], [.05, .9], [.2, .95], [.34, 1.1], [.46, 1.15], [.56, 1.15], [.66, 1.0], [.74, .82], [.97, .62], [1, .5], [1, .36], [.98, .3]]},
  ev: {L: 4.75, H: 1.5, Lc: 0.8, g: 16, r: .35, glass: [3, 8], ol: [[0, .38], [0, .74], [.03, .98], [.2, 1.02], [.32, 1.42], [.38, 1.49], [.54, 1.49], [.6, 1.42], [.68, 1.02], [.96, .9], [1, .78], [1, .5], [.98, .38]]}
};
export const SCENARIOS = {
  wall: {label: 'Қатты қабырға (100% ені)', kf: 1, wall: true},
  offset: {label: 'Offset 40% (Euro NCAP)', kf: .95, wall: true},
  pole: {label: 'Бағанаға (тар кедергі)', kf: .36, wall: true},
  head: {label: 'Екі көлік бетпе-бет', kf: 1, wall: false},
  headoff: {label: 'Бетпе-бет, 40% offset', kf: .95, wall: false}
};

export function profileOf(car) {
  const kind = KIND[car.type] || 'sedan', s0 = SPEC[kind], year = +(String(car.model).match(/\((\d{4})\)/)?.[1] || String(car.model).match(/\b(19[5-9]\d|20[0-2]\d)\b/)?.[1] || 2024);
  const mass = car.weight + 100, age = year < 2000 ? .8 : year < 2010 ? .92 : 1; // ескі көліктердің құрылымы жұмсақ, кабинасы әлсіз
  // өлшемдер салмаққа қарай шамалы өзгереді (ауыр көлік ұзынырақ және биігірек)
  const med = {sedan: 1600, hatch: 1300, wagon: 1700, suv: 2100, truck: 2500, coupe: 1600, sport: 1600, super: 1600, ev: 2100}[kind], k = Math.max(.88, Math.min(1.15, Math.pow(car.weight / med, .22))), hs = Math.sqrt(k);
  const s = {...s0, L: s0.L * k, H: s0.H * hs, Lc: s0.Lc * Math.min(1.1, k), ol: s0.ol.map(([fx, y]) => [fx, y * hs])};
  const Fp = mass * G * s.g * age;
  return {kind, L: s.L, H: s.H, ol: s.ol, glass: s.glass, r: s.r, Lc: s.Lc, mass, Fp, cab: 5 * age, Kb: 22 * Fp / s.Lc, year};
}

// күш–деформация қисығы (жүктеу): плато → кабинаға жеткенде күрт қатаю → кабина жібергенде жаңа плато
function Fload(p, kf, c) {
  if (c <= 0) return 0;
  const base = kf * p.Fp, F1 = base * 1.5;
  if (c <= p.Lc) return base * (1 - Math.exp(-c / .05)) * (1 + .5 * c / p.Lc);
  return Math.min(F1 + kf * p.Kb * (c - p.Lc), base * p.cab);
}
function table(p, kf) {
  const n = 3000, cs = new Float64Array(n), Fs = new Float64Array(n), cmax = 3;
  for (let i = 0; i < n; i++) { cs[i] = cmax * i / (n - 1); Fs[i] = Fload(p, kf, cs[i]); }
  return {cs, Fs, cap: p.Fp * kf * p.cab};
}
function inv(tb, F) { // F → c (монотонды, плато кезінде кішкене қадам)
  const {cs, Fs} = tb; if (F <= 0) return 0;
  let lo = 0, hi = cs.length - 1; if (F >= Fs[hi]) return cs[hi];
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (Fs[mid] <= F) lo = mid; else hi = mid; }
  const f = (F - Fs[lo]) / Math.max(1e-9, Fs[hi] - Fs[lo]); return cs[lo] + f * (cs[hi] - cs[lo]);
}

/**
 * simulate({A, B, speedA, speedB, scenario, gap}) — A: көлік (catalog), B: екінші көлік (бетпе-бет) немесе null (қабырға).
 * Жылдамдықтар км/сағ. Нәтиже: уақыт қатары (0.5 мс) + қорытынды көрсеткіштер.
 */
export function simulate({A, B = null, speedA = 56, speedB = null, scenario = 'wall', gap = null}) {
  const sc = SCENARIOS[scenario] || SCENARIOS.wall, head = !sc.wall && !!B;
  const pa = profileOf(A), pb = head ? profileOf(B) : null, kf = sc.kf;
  const vA0 = speedA / 3.6, vB0 = head ? (speedB ?? speedA) / 3.6 : 0;
  const ta = table(pa, kf), tb = head ? table(pb, kf) : null;
  // біріккен тізбек: берілген F үшін жалпы деформация p = cA + cB
  const nF = 2500, capF = head ? Math.min(ta.cap, tb.cap) : ta.cap, Fg = new Float64Array(nF), Pg = new Float64Array(nF);
  for (let i = 0; i < nF; i++) { Fg[i] = capF * i / (nF - 1); Pg[i] = inv(ta, Fg[i]) + (head ? inv(tb, Fg[i]) : 0); }
  const Fcomb = p => { // p → F (интерполяция), платодан кейін — шектеулі
    if (p <= 0) return 0; if (p >= Pg[nF - 1]) return capF;
    let lo = 0, hi = nF - 1; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (Pg[mid] <= p) lo = mid; else hi = mid; }
    const f = (p - Pg[lo]) / Math.max(1e-12, Pg[hi] - Pg[lo]); return Fg[lo] + f * (Fg[hi] - Fg[lo]);
  };
  const weakA = !head || ta.cap <= tb.cap;
  const split = (p, F) => { // деформацияны бөлу: плато асқанда артығы әлсіз көлікке беріледі
    const Fe = Math.min(F, capF * .999), a = inv(ta, Fe), b = head ? inv(tb, Fe) : 0, res = Math.max(0, p - a - b);
    return weakA ? [a + res, b] : [a, b + res];
  };
  const mA = pa.mass, mB = head ? pb.mass : Infinity;
  const dt = 5e-5, every = 10, SAMPLE = dt * every;
  // --- интегралдау: p — қысылу (контактқа дейін теріс: жалпы саңылау)
  const gapTot = gap ?? (head ? 30 : 26); // қабырғада: A мұрны мен қабырға арасы; бетпе-бет: екі мұрын арасы (алыстан келеді)
  let p = -gapTot, vA = vA0, vB = vB0, pmax = 0, Fmax = 0, tcontact = null, tsep = null, t = 0;
  const T = {t: [], p: [], F: [], aA: [], aB: [], vA: [], vB: [], cA: [], cB: [], rA: [], rB: []};
  let rA = 0, rB = 0, shareA = 0, shareB = 0, absorbed = 0, step = 0, tEnd = null;
  const maxT = 1.2;
  // уақыт 0 = контакт басталған сәт (аналитикалық: тұрақты жылдамдық)
  const tPre = gapTot / (vA0 + vB0), preSamples = Math.ceil(tPre / SAMPLE);
  p = 0; t = 0; // контакттан басталады; контактқа дейінгі қозғалысты көрсету үшін rA/rB-ны кейін есептейміз
  while (t < maxT) {
    let F = 0;
    if (p > pmax) { pmax = p; F = Fcomb(p); Fmax = F; const sp = split(p, F); shareA = sp[0] / p; shareB = sp[1] / p; }
    else if (pmax > 0) { const pp = .96 * pmax; F = p > pp ? Fmax * (p - pp) / (pmax - pp) : 0; }
    if (F > 0 && tcontact === null) tcontact = t;
    if (F === 0 && pmax > 0 && tsep === null && p <= .96 * pmax) tsep = t;
    // жылдамдықтар (қарама-қарсы бағыттағы оң бағыт: екеуі бір-біріне қарай)
    const aa = F / mA, ab = head ? F / mB : 0; // тежелу (оң)
    vA -= aa * dt; if (head) vB -= ab * dt;
    p += (vA + vB) * dt; rA += vA * dt; if (head) rB += vB * dt;
    absorbed += F * (vA + vB) * dt;
    if (step % every === 0) {
      T.t.push(t); T.p.push(p); T.F.push(F); T.aA.push(aa / G); T.aB.push(ab / G); T.vA.push(vA); T.vB.push(vB); T.rA.push(rA); T.rB.push(rB);
      const pv = Math.max(p, .96 * pmax); T.cA.push(shareA * pv); T.cB.push(shareB * pv);
    }
    step++; t += dt;
    if (tsep !== null && t > tsep + .06 && step % every === 0) { tEnd = t; break; }
  }
  if (tEnd === null) tEnd = t;
  const n = T.t.length, tail = vA < 0 ? 'rebound' : 'stop';
  // --- жүргізуші (A және B) және бағалау
  const occ = (acc, intrFn, p0) => occupant(acc, intrFn, T.t, p0);
  const cMaxA = Math.max(...T.cA), cMaxB = head ? Math.max(...T.cB) : 0;
  const intrA = Math.max(0, cMaxA - pa.Lc), intrB = head ? Math.max(0, cMaxB - pb.Lc) : 0;
  const oA = occ(T.aA, intrA), oB = head ? occ(T.aB, intrB) : null;
  const dV = (v0, v1) => (v0 - v1) * 3.6; // км/сағ
  const sumA = rate(pa, A, vA0, vA, T.aA, cMaxA, intrA, oA), sumB = head ? rate(pb, B, vB0, vB, T.aB, cMaxB, intrB, oB) : null;
  const ke0 = .5 * mA * vA0 * vA0 + (head ? .5 * mB * vB0 * vB0 : 0), ke1 = .5 * mA * vA * vA + (head ? .5 * mB * vB * vB : 0);
  return {
    A, B, pa, pb, head, scenario, kf, gap: gapTot, tPre, speedA, speedB: head ? vB0 * 3.6 : 0, dt: SAMPLE, T, n, tEnd, contact: (tsep ?? tEnd) - (tcontact ?? 0),
    occA: oA, occB: oB, sumA, sumB, ke0, ke1, absorbed, momentum0: mA * vA0 - (head ? mB * vB0 : 0), momentum1: mA * vA - (head ? mB * vB : 0), dV, tail, preSamples
  };
}

/** Жүргізуші моделі: белдік (жүк шектегіш) + airbag + дашборд. acc — көліктің тежелуі (g) */
function occupant(acc, intr, ts) {
  const mo = 78, dt = 5e-5, N = acc.length, z = new Float64Array(N), chest = new Float64Array(N), head = new Float64Array(N);
  const sample = i => acc[Math.min(N - 1, Math.max(0, i))];
  let zz = 0, zd = 0, tFire = null, trig = 0;
  const zh = Math.max(.16, .55 - .5 * intr), FL = 6500, zs = .03;
  for (let i = 0; i < N; i++) {
    const tNow = ts[i], steps = i === 0 ? 0 : Math.round((ts[i] - ts[i - 1]) / dt);
    for (let s = 0; s < Math.max(1, steps); s++) {
      const a = sample(i) * G, tt = tNow + (s - steps) * dt;
      if (tFire === null) { if (sample(i) > 12) trig += dt; else trig = 0; if (trig > .002) tFire = tt + .008; }
      const zsEff = tt > .012 ? 0 : zs; // претенционер
      let F = 0;
      if (zz > zsEff) F += Math.min(FL, 3e5 * (zz - zsEff)) + 900 * Math.max(0, zd) * (zz > .05 ? 1 : 0);
      if (zz > .04) F += Math.min(2500, 6e4 * (zz - .04)); // тізе бөгеті / орындық
      if (tFire !== null && tt > tFire && zz > .08) { const def = tt < tFire + .09 ? 1 : Math.max(.2, 1 - (tt - tFire - .09) / .05); F += Math.min(8000, 1.2e5 * (zz - .08)) * def; }
      if (zz > zh) F += 4e6 * (zz - zh);
      const rel = a - F / mo; zd += rel * dt; zz += zd * dt;
      if (zz < 0) { zz = 0; zd = Math.max(0, zd); }
      if (s === Math.max(1, steps) - 1) { z[i] = zz; chest[i] = F / mo / G; }
    }
  }
  for (let i = 0; i < N; i++) head[i] = chest[i] * 1.15;
  return {z, chest, head, tFire: tFire ?? null, zh};
}

function rate(prof, car, v0, v1, acc, cMax, intr, occ) {
  const N = acc.length, ds = 5e-4;
  const mavg = (arr, w) => { let best = 0; for (let i = 0; i + w <= arr.length; i++) { let s = 0; for (let j = 0; j < w; j++) s += arr[i + j]; best = Math.max(best, s / w); } return best; };
  const chest3 = Math.min(150, mavg(occ.chest, 6));
  let hic = 0; const maxW = 30;
  const pre = new Float64Array(N + 1); for (let i = 0; i < N; i++) pre[i + 1] = pre[i] + occ.head[i];
  for (let i = 0; i < N; i++) for (let w = 2; w <= maxW && i + w <= N; w++) { const avg = (pre[i + w] - pre[i]) / w, v = w * ds * Math.pow(avg, 2.5); if (v > hic) hic = v; }
  hic = Math.min(hic, 9999);
  const peak = Math.max(...acc), dV = (v0 - v1) * 3.6;
  // қауіп: ΔV (NHTSA статистикасына жуық: 48 км/сағ ~3%, 64 ~10%, 80 ~30%, 100 ~65%, 120 ~88%), кабина ішке кіруі, кеуде жүктемесі, HIC
  const lg0 = (x, c, k) => 1 / (1 + Math.exp(-(x - c) / k)), lg = (x, c, k) => Math.max(0, (lg0(x, c, k) - lg0(0, c, k)) / (1 - lg0(0, c, k)));
  const pDv = lg(dV, 92, 12), pIntr = lg(intr, .25, .06), pChest = lg(chest3, 100, 18), pHic = lg(hic, 2500, 700);
  const risk = 1 - (1 - pDv) * (1 - pIntr) * (1 - pChest) * (1 - pHic), good = 1 - risk, score = Math.round(good * 100);
  const stars = Math.max(0, Math.min(5, Math.round(good * 5)));
  const verdict = risk >= .8 ? 'LIKELY FATAL' : risk >= .5 ? 'LIFE-THREATENING INJURIES' : risk >= .2 ? 'SEVERE INJURIES LIKELY' : risk >= .06 ? 'MODERATE INJURIES POSSIBLE' : 'MINOR INJURIES LIKELY';
  return {mass: prof.mass, dV, peak, crush: cMax, intrusion: intr, chest3, hic, risk, fatality: risk, score, stars, verdict, v0: v0 * 3.6, v1: v1 * 3.6, lc: prof.Lc};
}

/** Эквивалентті қабылдау: ескі интерфейс (тесттер үшін) */
export function crashSummary(car, speedKmh, scenario = 'wall') {
  const r = simulate({A: car, speedA: speedKmh, scenario}), s = r.sumA;
  return {energy: Math.round(r.ke0 / 1000), deformation: Math.round(s.crush / s.lc * 100), force: Math.round(r.absorbed / Math.max(.01, s.crush) / 1000), sim: r};
}
