// Бейне өзгерту (Remix): пайдаланушы салған бейнені (өзінің / CC лицензиялы / рұқсаты бар) өңдеп, Shorts жасайды.
// Екі нұсқа: A — түсініктемелі Shorts (хук + субтитр + дереккөз), B — факт-карточкалар + баяу қайталау (slow-mo replay).
// Мақсат: түпнұсқаны жасыру емес, шынымен өзгертілген (transformative) жұмыс + дереккөзді көрсету.

export const MAX_TOTAL = 59, OUTRO = 6, SLOW = 0.5;

/** "0:03 мәтін" / "3 мәтін" / жай жол → [{t, text}] (уақыты жоқ жолдар клипке тең бөлінеді) */
export function parseCaptions(raw, dur) {
  const rows = String(raw || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean).slice(0, 12);
  const out = rows.map(s => {
    const m = /^(?:(\d{1,2}):)?(\d{1,2}(?:[.,]\d+)?)\s*(?:[|\-–—]\s*|\s+)(.+)$/.exec(s);
    if (!m) return {t: null, text: s};
    const sec = (m[1] ? +m[1] * 60 : 0) + parseFloat(m[2].replace(',', '.'));
    return Number.isFinite(sec) && sec < 600 ? {t: sec, text: m[3].trim()} : {t: null, text: s};
  });
  const un = out.filter(x => x.t == null);
  if (un.length === out.length) out.forEach((x, i) => { x.t = i * dur / out.length; });
  else { let k = 0; out.forEach(x => { if (x.t == null) x.t = Math.min(dur - .5, (k++ + .5) * dur / (un.length + 1)); }); }
  out.sort((a, b) => a.t - b.t);
  out.forEach((x, i) => { x.end = i + 1 < out.length ? out[i + 1].t : dur; });
  return out;
}

/** Уақыт жоспары: клип ұзындығын 59 с лимитке сыйдырады */
export function plan(variant, {clip, replayLen}) {
  const rl = variant === 'B' ? Math.max(2, Math.min(8, replayLen || 4)) : 0, slow = rl / SLOW;
  const maxClip = Math.max(5, MAX_TOTAL - OUTRO - slow - (variant === 'B' ? .8 : 0));
  const D = Math.min(clip, maxClip);
  return {D, rl, slow, total: D + (variant === 'B' ? slow + .8 : 0) + OUTRO};
}

/** Құқық / сапа тексеру тізімі (YouTube "reused content" және авторлық құқық саясатына сай) */
export function preflight({rights, credit, hook, caps, variant, dur, srcDur}) {
  const items = [];
  const own = rights === 'own';
  items.push([!!rights, 'Бейненің құқығы көрсетілген (өзімдікі / CC / жазбаша рұқсат)']);
  items.push([own || (credit && credit.trim().length >= 3), 'Дереккөз / автор көрсетілген (сипаттама мен бейнеде шығады)']);
  items.push([!!(hook && hook.trim().length >= 4), 'Өз тақырыбың / хук мәтіні бар']);
  items.push([caps >= 3, 'Кемінде 3 жол өз түсініктемең бар (түпнұсқаға қосқан жаңа мазмұн)']);
  items.push([!srcDur || dur <= srcDur * 0.8 || srcDur <= 30, 'Бейненің бір бөлігі ғана алынған (толық көшірме емес)']);
  if (variant === 'B') items.push([true, 'Баяу қайталау + факт-карточкалар: өз талдауың қосылады']);
  return {items, ok: items.slice(0, 4).every(x => x[0])};
}

// ------------------------------------------------------------------ суреттеу
const FONT = '"Segoe UI", system-ui, Arial, sans-serif';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const back = t => { t = clamp(t, 0, 1); const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }
function text(ctx, s, x, y, size, o = {}) {
  ctx.save(); ctx.font = `${o.w || 900} ${size}px ${FONT}`; ctx.textAlign = o.a || 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  while (o.max && ctx.measureText(s).width > o.max && size > 14) { size -= 2; ctx.font = `${o.w || 900} ${size}px ${FONT}`; }
  if (o.stroke !== 0) { ctx.lineWidth = size * (o.stroke || .16); ctx.strokeStyle = o.sc || 'rgba(0,0,0,.8)'; ctx.strokeText(s, x, y); }
  ctx.fillStyle = o.c || '#fff'; ctx.fillText(s, x, y); ctx.restore();
}
function wrap(ctx, s, size, maxW, w = 900) {
  ctx.save(); ctx.font = `${w} ${size}px ${FONT}`; const words = s.split(/\s+/), lines = []; let cur = '';
  for (const x of words) { const t = cur ? cur + ' ' + x : x; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = x; } else cur = t; }
  if (cur) lines.push(cur); ctx.restore(); return lines.slice(0, 3);
}

let tiny = null;
function blurBg(ctx, W, H, video, t) {
  tiny ||= Object.assign(document.createElement('canvas'), {width: 36, height: 64});
  const g = tiny.getContext('2d'); try { g.drawImage(video, 0, 0, tiny.width, tiny.height); } catch { /* кадр жоқ */ }
  ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.globalAlpha = 1;
  const z = 1.06 + .03 * Math.sin(t * .6); ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.drawImage(tiny, -W / 2, -H / 2, W, H); ctx.restore();
  ctx.fillStyle = 'rgba(6,9,14,.55)'; ctx.fillRect(0, 0, W, H);
  const v = ctx.createRadialGradient(W / 2, H / 2, H * .25, W / 2, H / 2, H * .75); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.55)'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
}

/** Негізгі кадр. S: {variant, phase:'clip'|'replay'|'outro', tc (клип уақыты), pt (фаза уақыты), D, caps, hook, credit, license, replayAt, replayLen, zoomFocus, video} */
export function drawRemix(ctx, W, H, S) {
  const u = W / 1080, v = S.video, vw = v.videoWidth || 16, vh = v.videoHeight || 9, ar = vw / vh;
  if (S.phase === 'outro') return drawOutro(ctx, W, H, S);
  if (W > H * 1.2) return drawWide(ctx, W, H, S);
  const t = S.phase === 'clip' ? S.tc : S.pt;
  ctx.fillStyle = '#05080c'; ctx.fillRect(0, 0, W, H);
  blurBg(ctx, W, H, v, t);
  // --- негізгі кадр (рамка ішінде)
  const maxW = W - 80 * u, maxH = H * (S.variant === 'B' ? .5 : .54);
  let fw = maxW, fh = fw / ar; if (fh > maxH) { fh = maxH; fw = fh * ar; }
  const fx = (W - fw) / 2, fy = S.variant === 'B' ? Math.max(H * .2, Math.min(H * .27, (H - fh) / 2 - 330 * u)) : Math.max(H * .2, (H - fh) / 2 - 110 * u);
  const replay = S.phase === 'replay', zoom = replay ? 1 + .22 * ease(S.pt / Math.max(1, S.rlWall)) : 1;
  ctx.save(); ctx.shadowColor = replay ? 'rgba(255,184,0,.6)' : 'rgba(0,168,255,.45)'; ctx.shadowBlur = 40 * u; ctx.fillStyle = '#000'; rr(ctx, fx - 6 * u, fy - 6 * u, fw + 12 * u, fh + 12 * u, 26 * u); ctx.fill(); ctx.restore();
  ctx.save(); rr(ctx, fx, fy, fw, fh, 20 * u); ctx.clip();
  if (zoom !== 1) { const cx = fx + fw * (S.focusX ?? .5), cy = fy + fh * (S.focusY ?? .5); ctx.translate(cx, cy); ctx.scale(zoom, zoom); ctx.translate(-cx, -cy); }
  try { ctx.drawImage(v, fx, fy, fw, fh); } catch { /* кадр әлі жоқ */ }
  ctx.restore();
  ctx.save(); ctx.lineWidth = 4 * u; ctx.strokeStyle = replay ? '#ffb800' : '#00a8ff'; rr(ctx, fx, fy, fw, fh, 20 * u); ctx.stroke(); ctx.restore();
  // --- прогресс сызығы
  const prog = S.phase === 'clip' ? S.tc / S.D : 1; ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(0, 0, W, 8 * u); ctx.fillStyle = replay ? '#ffb800' : '#00a8ff'; ctx.fillRect(0, 0, W * prog, 8 * u);
  // --- хук (жоғарғы тақырып)
  const hookIn = back(t / .45), hy = H * (S.variant === 'B' ? .075 : .09);
  if (S.hook) {
    const size = 74 * u, lines = wrap(ctx, S.hook.toUpperCase(), size, W * .9);
    ctx.save(); ctx.translate(W / 2, hy); const sc = .6 + .4 * hookIn; ctx.scale(sc, sc); ctx.globalAlpha = clamp(t / .25, 0, 1);
    lines.forEach((l, i) => text(ctx, l, 0, (i - (lines.length - 1) / 2) * size * 1.12, size, {c: i === 0 ? '#ffe45c' : '#fff', max: W * .92}));
    ctx.restore();
  }
  if (S.variant === 'A') drawCaptionsA(ctx, W, H, S, u, fy + fh);
  else drawFactsB(ctx, W, H, S, u, fy + fh);
  // --- slow-mo белгісі
  if (replay) {
    const a = .75 + .25 * Math.sin(S.pt * 8);
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#ffb800'; rr(ctx, fx + 14 * u, fy + 14 * u, 300 * u, 66 * u, 14 * u); ctx.fill(); ctx.restore();
    text(ctx, '⏪ REPLAY 0.5×', fx + 164 * u, fy + 48 * u, 36 * u, {c: '#111', stroke: 0});
    if (S.pt < .35) { ctx.fillStyle = `rgba(255,255,255,${(1 - S.pt / .35) * .7})`; ctx.fillRect(0, 0, W, H); }
  }
  // --- дереккөз (төменгі жол): міндетті атрибуция
  const src = S.credit ? `Source: ${S.credit}${S.license ? ' · ' + S.license : ''}` : S.license || '';
  if (src) text(ctx, src, W / 2, H * .955, 26 * u, {w: 700, c: 'rgba(255,255,255,.85)', max: W * .9, stroke: .12});
  text(ctx, 'DRIVEVAULT', W - 30 * u, H * .02 + 24 * u, 22 * u, {a: 'right', w: 800, c: 'rgba(255,255,255,.55)', stroke: .1});
  drawLogo(ctx, S.logo, 30 * u, 22 * u, 200 * u, 66 * u, false);
}

function drawCaptionsA(ctx, W, H, S, u, y0) {
  const c = S.caps.find(x => S.tc >= x.t && S.tc < x.end) || (S.tc >= (S.caps.at(-1)?.t ?? 1e9) ? S.caps.at(-1) : null);
  if (!c) return;
  const k = back((S.tc - c.t) / .35), size = 60 * u, lines = wrap(ctx, c.text, size, W * .86);
  const cy = Math.min(y0 + 130 * u, H * .9 - size);
  ctx.save(); ctx.translate(W / 2, cy); const sc = .75 + .25 * k; ctx.scale(sc, sc); ctx.globalAlpha = clamp((S.tc - c.t) / .15, 0, 1);
  const bh = lines.length * size * 1.18 + 40 * u; ctx.fillStyle = 'rgba(0,0,0,.55)'; rr(ctx, -W * .46, -bh / 2, W * .92, bh, 26 * u); ctx.fill();
  lines.forEach((l, i) => text(ctx, l, 0, (i - (lines.length - 1) / 2) * size * 1.18, size, {max: W * .86, c: '#fff'}));
  ctx.restore();
}

function drawFactsB(ctx, W, H, S, u, y0) {
  // жаңа факт кезек-кезек төмендегі карточкада шығады; ескілері кішірейіп жоғарыда қалады
  const shown = S.phase === 'replay' ? S.caps : S.caps.filter(x => S.tc >= x.t), last = shown.at(-1);
  const pad = 40 * u, top = y0 + 26 * u, bottom = H * .93, avail = bottom - top, n = Math.max(1, Math.min(3, shown.length)), ch = Math.min(170 * u, avail / n - 14 * u);
  shown.slice(-3).forEach((c, i, arr) => {
    const isLast = c === last, age = S.phase === 'replay' ? 9 : S.tc - c.t, k = back(age / .4), y = top + i * (ch + 14 * u);
    ctx.save(); ctx.globalAlpha = clamp(age / .15, 0, 1) * (isLast ? 1 : .85); ctx.translate((1 - Math.min(1, k)) * -W * .6, 0);
    const g = ctx.createLinearGradient(pad, 0, W - pad, 0); g.addColorStop(0, isLast ? '#0a84ff' : '#1c2a3a'); g.addColorStop(1, isLast ? '#00c2ff' : '#243447'); ctx.fillStyle = g; rr(ctx, pad, y, W - 2 * pad, ch, 24 * u); ctx.fill();
    const idx = shown.indexOf(c) + 1; ctx.fillStyle = '#ffb800'; rr(ctx, pad + 16 * u, y + 16 * u, 74 * u, ch - 32 * u, 16 * u); ctx.fill();
    text(ctx, String(idx), pad + 53 * u, y + ch / 2, 46 * u, {c: '#111', stroke: 0});
    const lines = wrap(ctx, c.text, 40 * u, W - 2 * pad - 140 * u);
    lines.forEach((l, j) => text(ctx, l, pad + 112 * u, y + ch / 2 + (j - (lines.length - 1) / 2) * 46 * u, 40 * u, {a: 'left', max: W - 2 * pad - 140 * u, stroke: .08}));
    ctx.restore();
  });
}

const OUTRO_ITEMS = [
  ['🔔', 'SUBSCRIBE TO THE CHANNEL', "Don't miss the next videos!", 'ПОДПИШИСЬ НА КАНАЛ', 'Не пропусти новые видео!', '#ff4d4d'],
  ['💬', 'WHAT DO YOU THINK?', 'Write your opinion in the comments!', 'А ВЫ КАК ДУМАЕТЕ?', 'Пишите своё мнение в комментариях!', '#4cc3ff'],
  ['❓', 'WHAT SHOULD WE COVER NEXT?', 'Tell us - we will make it!', 'ЧТО РАЗБЕРЁМ СЛЕДУЮЩИМ?', 'Подскажите — мы снимем!', '#ffb020']
];
function drawOutro(ctx, W, H, S) {
  if (W > H * 1.2) return drawOutroWide(ctx, W, H, S);
  const t = S.pt, u = W / 1080, g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#0b0f1a'); g.addColorStop(1, '#171a2b'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalAlpha = .07; ctx.fillStyle = '#fff'; for (let i = -2; i < 14; i++) { ctx.save(); ctx.translate(((i * 220 + t * 90) % 3200) * u - 400 * u, 0); ctx.transform(1, 0, -.5, 1, 0, 0); ctx.fillRect(0, 0, 70 * u, H); ctx.restore(); } ctx.restore();
  const fade = Math.min(1, t / .35) * Math.min(1, Math.max(0, (OUTRO - t) / .35)), k = H / 1920 > W / 1080 ? W / 1080 : H / 1920;
  ctx.save(); ctx.globalAlpha = fade; ctx.translate((W - 1080 * k) / 2, (H - 1920 * k) / 2); ctx.scale(k, k);
  OUTRO_ITEMS.forEach(([ic, e1, e2, r1, r2, col], i) => {
    const a = clamp((t - .25 - i * .55) / .45, 0, 1), y = 110 + i * 600; ctx.save(); ctx.globalAlpha *= a; ctx.translate(0, (1 - a) * 70);
    ctx.fillStyle = '#ffffff12'; rr(ctx, 60, y, 960, 560, 36); ctx.fill(); ctx.fillStyle = col; rr(ctx, 60, y, 960, 16, 8); ctx.fill();
    text(ctx, ic, 540, y + 105, 110, {stroke: 0}); text(ctx, e1, 540, y + 215, 50, {c: col, max: 900, stroke: 0}); text(ctx, e2, 540, y + 280, 38, {w: 700, max: 900, stroke: 0});
    text(ctx, r1, 540, y + 380, 46, {c: col, max: 900, stroke: 0}); text(ctx, r2, 540, y + 445, 36, {w: 700, c: '#cfd6e6', max: 900, stroke: 0}); ctx.restore();
  });
  ctx.restore();
}

function drawLogo(ctx, img, x, y, maxW, maxH, right) {
  if (!img || !img.naturalWidth) return; const k = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight), w = img.naturalWidth * k, h = img.naturalHeight * k;
  ctx.save(); ctx.globalAlpha = .92; ctx.drawImage(img, right ? x - w : x, y, w, h); ctx.restore();
}
// ------------------------------------------------------------------ көлденең (толық видео, 16:9)
function drawWide(ctx, W, H, S) {
  const u = H / 1080, v = S.video, replay = S.phase === 'replay', t = replay ? S.pt : S.tc, ar = (v.videoWidth || 16) / (v.videoHeight || 9);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  let fw = W, fh = W / ar; if (fh > H) { fh = H; fw = H * ar; }
  const fx = (W - fw) / 2, fy = (H - fh) / 2; if (fw < W - 2 || fh < H - 2) blurBg(ctx, W, H, v, t);
  const zoom = replay ? 1 + .2 * ease(S.pt / Math.max(1, S.rlWall)) : 1;
  ctx.save(); ctx.beginPath(); ctx.rect(fx, fy, fw, fh); ctx.clip();
  if (zoom !== 1) { const cx = fx + fw / 2, cy = fy + fh * .55; ctx.translate(cx, cy); ctx.scale(zoom, zoom); ctx.translate(-cx, -cy); }
  try { ctx.drawImage(v, fx, fy, fw, fh); } catch { /* кадр жоқ */ }
  ctx.restore();
  const g = ctx.createLinearGradient(0, H * .62, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.72)'); ctx.fillStyle = g; ctx.fillRect(0, H * .62, W, H * .38);
  // прогресс
  const prog = S.phase === 'clip' ? S.tc / S.D : 1; ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fillRect(0, H - 8 * u, W, 8 * u); ctx.fillStyle = replay ? '#ffb800' : '#00a8ff'; ctx.fillRect(0, H - 8 * u, W * prog, 8 * u);
  // тақырып: алғашқы 4 секундта үлкен, кейін шағын
  if (S.hook) {
    const big = t < 4, a = clamp(t / .4, 0, 1), k = big ? back(t / .5) : 1, size = (big ? 74 : 38) * u;
    ctx.save(); ctx.globalAlpha = a; ctx.font = `900 ${size}px ${FONT}`; const lines = wrap(ctx, S.hook.toUpperCase(), size, W * (big ? .8 : .5)), bh = lines.length * size * 1.15 + 26 * u, bw = Math.min(W * .82, Math.max(...lines.map(l => ctx.measureText(l).width)) + 60 * u);
    ctx.translate(48 * u - (1 - Math.min(1, k)) * 300 * u, 48 * u); ctx.fillStyle = 'rgba(0,0,0,.62)'; rr(ctx, 0, 0, bw, bh, 20 * u); ctx.fill(); ctx.fillStyle = '#ffe45c'; ctx.fillRect(0, 12 * u, 8 * u, bh - 24 * u); ctx.restore();
    ctx.save(); ctx.globalAlpha = a; ctx.translate(48 * u - (1 - Math.min(1, k)) * 300 * u, 48 * u); lines.forEach((l, i) => text(ctx, l, 36 * u, 13 * u + size * .58 + i * size * 1.15, size, {a: 'left', c: '#ffe45c', stroke: .08, max: W * .8})); ctx.restore();
  }
  // түсініктеме (төменде, ортада)
  const c = S.phase === 'replay' ? S.caps.at(-1) : (S.caps.find(x => S.tc >= x.t && S.tc < x.end) || null);
  if (c) {
    const age = S.phase === 'replay' ? 9 : S.tc - c.t, size = 54 * u, k = back(age / .35), lines = wrap(ctx, c.text, size, W * .7), cy = H - 150 * u;
    ctx.save(); ctx.translate(W / 2, cy); const sc = .8 + .2 * k; ctx.scale(sc, sc); ctx.globalAlpha = clamp(age / .15, 0, 1);
    const bh = lines.length * size * 1.15 + 30 * u; ctx.fillStyle = 'rgba(0,0,0,.6)'; rr(ctx, -W * .38, -bh / 2, W * .76, bh, 24 * u); ctx.fill();
    lines.forEach((l, i) => text(ctx, l, 0, (i - (lines.length - 1) / 2) * size * 1.15, size, {max: W * .72, stroke: .1})); ctx.restore();
  }
  if (replay) {
    ctx.save(); ctx.globalAlpha = .75 + .25 * Math.sin(S.pt * 8); ctx.fillStyle = '#ffb800'; rr(ctx, W - 340 * u, 130 * u, 300 * u, 66 * u, 14 * u); ctx.fill(); ctx.restore();
    text(ctx, '⏪ REPLAY 0.5×', W - 190 * u, 163 * u, 36 * u, {c: '#111', stroke: 0});
    if (S.pt < .35) { ctx.fillStyle = `rgba(255,255,255,${(1 - S.pt / .35) * .7})`; ctx.fillRect(0, 0, W, H); }
  }
  const src = S.credit ? `Source: ${S.credit}${S.license ? ' · ' + S.license : ''}` : S.license || '';
  if (src) text(ctx, src, 40 * u, H - 40 * u, 24 * u, {a: 'left', w: 700, c: 'rgba(255,255,255,.85)', max: W * .5, stroke: .12});
  text(ctx, 'DRIVEVAULT', W - 40 * u, H - 40 * u, 24 * u, {a: 'right', w: 800, c: 'rgba(255,255,255,.6)', stroke: .1});
  drawLogo(ctx, S.logo, W - 40 * u, 40 * u, 220 * u, 80 * u, true);
}
function drawOutroWide(ctx, W, H, S) {
  const t = S.pt, k = H / 1080, g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#0b0f1a'); g.addColorStop(1, '#171a2b'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const fade = Math.min(1, t / .35) * Math.min(1, Math.max(0, (OUTRO - t) / .35));
  ctx.save(); ctx.globalAlpha = fade; ctx.translate((W - 1920 * k) / 2, 0); ctx.scale(k, k);
  OUTRO_ITEMS.forEach(([ic, e1, e2, r1, r2, col], i) => {
    const a = clamp((t - .25 - i * .55) / .45, 0, 1), x = 70 + i * 610; ctx.save(); ctx.globalAlpha *= a; ctx.translate(0, (1 - a) * 60);
    ctx.fillStyle = '#ffffff12'; rr(ctx, x, 150, 570, 780, 32); ctx.fill(); ctx.fillStyle = col; rr(ctx, x, 150, 570, 14, 7); ctx.fill();
    text(ctx, ic, x + 285, 270, 110, {stroke: 0}); text(ctx, e1, x + 285, 420, 40, {c: col, max: 520, stroke: 0}); text(ctx, e2, x + 285, 485, 32, {w: 700, max: 520, stroke: 0});
    text(ctx, r1, x + 285, 620, 38, {c: col, max: 520, stroke: 0}); text(ctx, r2, x + 285, 685, 30, {w: 700, c: '#cfd6e6', max: 520, stroke: 0}); ctx.restore();
  });
  ctx.restore();
}

// ------------------------------------------------------------------ авто режим: сілтеме → талдау → мәтін → жазу → жариялау
export function classifyLink(raw) {
  try {
    const x = new URL(String(raw).trim()), h = x.hostname.replace(/^(www|m)\./, '');
    if (h === 'youtu.be') return {kind: 'yt', id: x.pathname.slice(1)};
    if (h === 'youtube.com' || h === 'music.youtube.com') { const id = x.searchParams.get('v') || (/^\/(shorts|embed|live)\/([\w-]{6,})/.exec(x.pathname) || [])[2]; if (id) return {kind: 'yt', id}; }
    if (h === 'commons.wikimedia.org' && /\/wiki\/File:/i.test(x.pathname)) return {kind: 'commons', title: decodeURIComponent(x.pathname.split('/wiki/')[1])};
    if (/\.(mp4|webm|mov|m4v)$/i.test(x.pathname)) return {kind: 'file', url: x.href};
  } catch { return {kind: 'bad'}; }
  return {kind: 'unknown'};
}
export function cleanTitle(s) {
  let t = String(s || '').replace(/\.[a-z0-9]{2,4}$/i, '').replace(/[_]+/g, ' ').replace(/#\S+/g, ' ').replace(/[\[(【][^\])】]*(official|video|hd|4k|1080p|720p|lyrics|clip|shorts)[^\])】]*[\])】]/gi, ' ').replace(/\b(official\s+(music\s+)?(video|clip|trailer)|official|full hd|4k|1080p|720p)\b/gi, ' ').replace(/\s+/g, ' ').trim();
  if (/^(whatsapp|img|vid|video|screen ?record|pxl|mov)\b/i.test(t) || /^[\d\s\-.:at]+$/i.test(t) || t.length < 4) return '';
  if (t.length > 60) { t = t.slice(0, 60); t = t.slice(0, Math.max(20, t.lastIndexOf(' '))).trim(); }
  return t;
}
export const detectLang = s => /[әғқңөұүһі]/i.test(s) ? 'kk' : /[а-яё]/i.test(s) ? 'ru' : 'en';
const HOOKS = {en: 'Watch this till the end 👀', ru: 'Смотри до конца 👀', kk: 'Соңына дейін қара 👀'};
const CAPS = {
  en: ['Watch closely 👀', 'Pay attention to the details…', 'Here it comes 🔥', 'Did you catch that?', 'Comment what you think 👇'],
  ru: ['Смотри внимательно 👀', 'Обрати внимание на детали…', 'Вот он, момент 🔥', 'Ты это заметил?', 'Пиши своё мнение 👇'],
  kk: ['Мұқият қара 👀', 'Бөлшектерге назар аудар…', 'Міне, сол сәт 🔥', 'Байқадың ба?', 'Пікіріңді жаз 👇']
};
export const autoHook = (title, lang) => cleanTitle(title) || HOOKS[lang] || HOOKS.en;
/** Түсініктеме жолдары (клип уақытына қатысты): бейнедегі ең белсенді сәтке (peak) байланған */
export function autoCaps(lang, D, peak) {
  const c = CAPS[lang] || CAPS.en, pk = clamp(peak, D * .3, D * .75), rows = [[0, c[0]]];
  if (pk - 1 >= 4) rows.push([(pk - 1) / 2, c[1]]);
  rows.push([Math.max(1, pk - 1), c[2]], [pk + 1.6, c[3]], [D - 3.5, c[4]]);
  const out = []; for (const [t, text] of rows) if (t < D - 1.2 && (!out.length || t - out.at(-1).t >= 1.8)) out.push({t: Math.max(0, +t.toFixed(1)), text});
  return out.map(x => `${x.t} ${x.text}`).join('\n');
}
/** activity[i] — i*step секундтағы белсенділік. Ең белсенді ұзақтықты (len) және шыңды табады, слоу-мо керек пе — соны шешеді */
export function autoPlan({activity, step, duration, maxLen = 30}) {
  const len = Math.min(duration, maxLen), w = Math.max(1, Math.round(len / step)), n = activity.length;
  const sm = activity.map((_, i) => { let s = 0, c = 0; for (let j = Math.max(0, i - 1); j <= Math.min(n - 1, i + 1); j++) { s += activity[j]; c++; } return s / c; });
  let best = 0, bs = -1; for (let i = 0; i + w <= n || i === 0; i++) { let s = 0; for (let j = i; j < Math.min(n, i + w); j++) s += sm[j]; if (s > bs) { bs = s; best = i; } }
  const start = duration <= len ? 0 : clamp(best * step, 0, duration - len);
  let pk = 0, pv = -1; for (let i = Math.floor(start / step); i < Math.min(n, Math.ceil((start + len) / step)); i++) if (sm[i] > pv) { pv = sm[i]; pk = i; }
  const win = sm.slice(Math.floor(start / step), Math.ceil((start + len) / step)), mean = win.reduce((a, b) => a + b, 0) / Math.max(1, win.length);
  const peakAbs = pk * step, peak = clamp(peakAbs - start, 0, len), rl = 4;
  const replayAt = clamp(peakAbs - rl / 2, start, Math.max(start, start + len - rl - .5));
  return {start: +start.toFixed(1), len: Math.floor(len), peak, replayAt: +replayAt.toFixed(1), replayLen: rl, variant: len >= 10 && mean > 0 && pv / mean >= 1.35 ? 'B' : 'A'};
}

/** Ұзақ бейнеден ең әрекетті N сәтті табады (GTA: жарылыс, ату, қуу = қозғалыс + дыбыс шыңы). Сәттер қиылыспайды, уақыт бойынша сұрыпталады */
export function topMoments({activity, step, duration, n = 5, len = 22}) {
  const L = Math.max(5, Math.min(Math.floor(len), Math.floor(duration))), m = activity.length;
  const sm = activity.map((_, i) => { let s = 0, c = 0; for (let j = Math.max(0, i - 1); j <= Math.min(m - 1, i + 1); j++) { s += activity[j]; c++; } return s / c; });
  const score = sm.map((v, i) => v + .5 * Math.max(0, v - (sm[i - 1] ?? v))); // кенет өсу (жарылыс) қосымша ұпай
  const order = score.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]), picked = [];
  for (const [v, i] of order) {
    if (picked.length >= n || v <= 0) break;
    const t = i * step, start = clamp(t - L * .6, 0, Math.max(0, duration - L));
    if (picked.every(p => Math.abs(p.start - start) >= L)) picked.push({start, score: v});
  }
  return picked.sort((a, b) => a.start - b.start).map(p => {
    const i0 = Math.floor(p.start / step), i1 = Math.min(m, Math.ceil((p.start + L) / step)), q = autoPlan({activity: activity.slice(i0, i1), step, duration: L, maxLen: L});
    return {...q, start: +(p.start + q.start).toFixed(1), replayAt: +(p.start + q.replayAt).toFixed(1), score: p.score};
  });
}

export function buildMeta({kind = 'short', hook, credit, license, rights, url, lang = 'en'}) {
  const short = kind === 'short', title = `${hook.trim()} ${short ? '🎬 #Shorts' : '🎬'}`.replace(/\s+/g, ' ').slice(0, 100);
  const src = rights === 'own' ? '' : `Source / Credit: ${credit || 'original author'}${url ? ' — ' + url : ''}${license ? ' (' + license + ')' : ''}`;
  const desc = [src, 'Edited with original captions and commentary.', '',
    '🔔 Subscribe so you do not miss the next videos! / Подпишись, чтобы не пропустить новые видео!', '💬 What do you think? Write in the comments! / А вы как думаете? Пишите в комментариях!', '',
    short ? '#Shorts #Highlights #Commentary' : '#Highlights #Commentary'].filter((l, i, a) => l !== '' || (a[i - 1] !== '' && i)).join('\n');
  return `${title}\n\n${desc}`;
}

// ------------------------------------------------------------------ интерфейс
export function initRemix({YT}) {
  const $ = id => document.getElementById(id); if (!$('rmFile')) return;
  const video = Object.assign(document.createElement('video'), {playsInline: true, preload: 'auto', crossOrigin: 'anonymous'}); video.setAttribute('playsinline', '');
  const cv = $('rmCanvas'), ctx = cv.getContext('2d'), dry = new URLSearchParams(location.search).has('dry');
  let logoImg = null, ac = null, gain = null, dest = null, blobUrl = '', srcBlob = null, srcName = '', busy = false, uploading = false, meta = {}, pending = [], links = [];
  const FMT = {short1080: [1080, 1920, 4e6], short720: [720, 1280, 2.4e6], full1080: [1920, 1080, 5e6], full720: [1280, 720, 3e6]};
  const state = () => ({
    variant: document.querySelector('input[name=rmVar]:checked')?.value || 'A', hook: $('rmHook').value.trim(), credit: $('rmCredit').value.trim(), url: $('rmUrl').value.trim(),
    rights: $('rmRights').value, start: Math.max(0, +$('rmStart').value || 0), clip: clamp(+$('rmLen').value || 20, 3, 55), replayAt: Math.max(0, +$('rmReplayAt').value || 0), replayLen: +$('rmReplayLen').value || 4,
    license: $('rmRights').value === 'cc' ? (meta.licenseName || 'CC BY') : ({own: '', perm: 'used with permission', pd: 'public domain'}[$('rmRights').value] ?? ''), q: $('rmFmt').value
  });
  const status = (m, err) => { const el = $('rmStatus'); el.textContent = m; el.classList.toggle('err', !!err); };
  const ytStatus = (m, err) => { const el = $('rmYtStatus'); el.textContent = ''; el.classList.toggle('err', !!err); if (m instanceof Node) el.appendChild(m); else el.textContent = m; };
  const showLinks = () => { const box = document.createElement('span'); links.forEach(l => { box.append(`✅ ${l.kind === 'short' ? 'Shorts' : 'Толық видео'} жарияланды: `, Object.assign(document.createElement('a'), {href: l.out.url, target: '_blank', rel: 'noopener', textContent: 'ашу'}), ' · ', Object.assign(document.createElement('a'), {href: l.out.studio, target: '_blank', rel: 'noopener', textContent: 'Studio'}), document.createElement('br')); }); ytStatus(box); };
  const tick = () => new Promise(r => { let d = false; const f = () => { if (!d) { d = true; r(); } }; setTimeout(f, 33); requestAnimationFrame(f); });
  const seek = t => new Promise(res => { if (Math.abs(video.currentTime - t) < .02) return res(); const f = () => { video.removeEventListener('seeked', f); res(); }; video.addEventListener('seeked', f); video.currentTime = t; setTimeout(f, 3000); });

  function audioGraph() {
    if (ac) return; ac = new (window.AudioContext || window.webkitAudioContext)(); gain = ac.createGain(); dest = ac.createMediaStreamDestination();
    ac.createMediaElementSource(video).connect(gain); gain.connect(dest);
  }
  const monitor = on => { try { gain.disconnect(); gain.connect(dest); if (on) gain.connect(ac.destination); } catch { /* */ } };

  function refresh() {
    const s = state(), P = plan(s.variant, {clip: s.clip, replayLen: s.replayLen}), caps = parseCaptions($('rmCaps').value, P.D), srcDur = video.duration || 0;
    $('rmVarB').hidden = s.variant !== 'B'; $('rmLenInfo').textContent = `Жалпы ұзақтығы ≈ ${P.total.toFixed(0)} с (клип ${P.D.toFixed(0)} с${s.variant === 'B' ? ` + баяу қайталау ${P.slow.toFixed(0)} с` : ''} + финал ${OUTRO} с)`;
    const pf = preflight({rights: s.rights, credit: s.credit, hook: s.hook, caps: caps.length, variant: s.variant, dur: P.D, srcDur});
    $('rmCheck').innerHTML = pf.items.map(([ok, t]) => `<li class="${ok ? 'ok' : 'no'}">${ok ? '✅' : '⚠️'} ${t}</li>`).join('');
    $('rmRec').disabled = !video.src || !pf.ok || busy; $('rmPreview').disabled = !video.src || busy; $('rmAutoGo').disabled = busy; $('rmHiGo').disabled = busy;
    return {s, P, caps, pf};
  }
  const S0 = (s, P, caps) => ({variant: s.variant, phase: 'clip', tc: 0, pt: 0, D: P.D, caps, hook: s.hook, credit: s.credit, license: s.license, video, rlWall: P.slow, logo: logoImg});
  async function still() { if (!video.src) return; const {s, P, caps} = refresh(); cv.width = 360; cv.height = 640; await seek(Math.min(s.start + 1, (video.duration || 1) - .1)); drawRemix(ctx, 360, 640, S0(s, P, caps)); }

  // kind: 'short' (9:16) | 'full' (16:9). record=false → алдын ала қарау
  async function run(record, kind = 'short') {
    const {s, P, caps, pf} = refresh(); if (!video.src) return null; if (record && !pf.ok) { status('Құқық, дереккөз, хук және ≥3 жол түсініктеме керек (қолмен баптау ішінде)', true); return null; }
    busy = true; refresh(); audioGraph(); await ac.resume(); monitor(!record); gain.gain.value = clamp(+$('rmVol').value / 100, 0, 1);
    const key = (kind === 'full' ? 'full' : 'short') + (s.q === '720' ? '720' : '1080'), [W, H, bps] = FMT[key]; let c = cv, g = ctx, recorder = null; const chunks = [];
    if (record) { c = document.createElement('canvas'); g = c.getContext('2d'); }
    c.width = record ? W : 360; c.height = record ? H : 640; const cw = c.width, ch = c.height;
    if (record) {
      const mimes = ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4;codecs=avc1', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'], mime = mimes.find(m => window.MediaRecorder?.isTypeSupported?.(m)) || '';
      if (!window.MediaRecorder || !c.captureStream) { status('Бұл браузер видео жазуды қолдамайды. Chrome немесе Edge қолданыңыз.', true); busy = false; refresh(); return null; }
      recorder = new MediaRecorder(new MediaStream([...c.captureStream(30).getVideoTracks(), ...dest.stream.getAudioTracks()]), {mimeType: mime || undefined, videoBitsPerSecond: bps, audioBitsPerSecond: 96000});
      recorder.ondataavailable = e => e.data?.size && chunks.push(e.data); recorder.mime = recorder.mimeType || mime || 'video/webm'; recorder.start(250);
    }
    const label = kind === 'full' ? 'толық видео' : 'Shorts', t0 = performance.now(), S = S0(s, P, caps), draw = () => { g.save(); drawRemix(g, cw, ch, S); g.restore(); }; let stop = false;
    const say = () => record && status(`🔴 ${label} жазылуда: ${Math.round((performance.now() - t0) / 1000)} / ${P.total.toFixed(0)} с`);
    try {
      video.playbackRate = 1; await seek(s.start); await video.play();
      while (!stop && video.currentTime - s.start < P.D && !video.ended) { S.tc = Math.max(0, video.currentTime - s.start); S.pt = S.tc; draw(); say(); await tick(); if (!busy) stop = true; }
      video.pause();
      if (s.variant === 'B' && !stop) {
        gain.gain.value = 0; await seek(Math.min(s.replayAt || s.start, (video.duration || 1) - P.rl)); video.playbackRate = SLOW; await video.play(); S.phase = 'replay'; const r0 = performance.now(); S.rlWall = P.slow;
        while (performance.now() - r0 < P.slow * 1000 && !video.ended) { S.pt = (performance.now() - r0) / 1000; S.tc = P.D; draw(); say(); await tick(); }
        video.pause(); video.playbackRate = 1; gain.gain.value = clamp(+$('rmVol').value / 100, 0, 1);
      }
      S.phase = 'outro'; const o0 = performance.now(); while (performance.now() - o0 < OUTRO * 1000) { S.pt = (performance.now() - o0) / 1000; draw(); say(); await tick(); }
    } catch (e) { status('Қате: ' + (e.message || e), true); stop = true; }
    video.pause(); video.playbackRate = 1; monitor(false); busy = false;
    if (!record || !recorder) { status('Алдын ала қарау аяқталды.'); still(); refresh(); return null; }
    await new Promise(res => { recorder.onstop = res; try { recorder.state !== 'inactive' ? recorder.stop() : res(); } catch { res(); } });
    refresh(); if (!chunks.length) { status('Видео жазылмады', true); return null; }
    return deliver(chunks, recorder.mime, W, H, s, P, kind);
  }

  async function deliver(chunks, mime, W, H, s, P, kind) {
    const ext = mime.includes('mp4') ? 'mp4' : 'webm', blob = new Blob(chunks, {type: mime.split(';')[0]}), url = URL.createObjectURL(blob), vid = $('rmOut');
    if (vid.dataset.url) URL.revokeObjectURL(vid.dataset.url); vid.src = url; vid.dataset.url = url; vid.classList.toggle('wide', kind === 'full'); $('rmDl').href = url; $('rmDl').download = `drivevault-remix-${kind}.${ext}`;
    const text = buildMeta({kind, hook: s.hook, credit: s.credit, license: s.license, rights: s.rights, url: s.url, lang: detectLang(s.hook)});
    $('rmMeta').value = text; const words = s.hook.split(/\s+/).filter(w => w.length > 3).slice(0, 6);
    const item = {kind, blob, text, tags: (kind === 'short' ? ['Shorts', 'Highlights', 'Commentary', ...words] : ['Highlights', 'Commentary', ...words]).slice(0, 15), done: false};
    pending.push(item);
    $('rmInfo').textContent = `${kind === 'full' ? 'Толық' : 'Shorts'} · ${W}×${H} · ${ext.toUpperCase()} · ${(blob.size / 1048576).toFixed(1)} МБ · ${P.total.toFixed(0)} с · нұсқа ${s.variant}`;
    $('rmResult').hidden = false; status(`✅ ${kind === 'full' ? 'Толық видео' : 'Shorts'} дайын.`);
    if ($('rmAuto').checked && !dry) await upload(item, false);
    return item;
  }

  async function upload(item, interactive) {
    if (!item || item.done || uploading) return;
    if (!YT.getClientId()) { if (!interactive) return ytStatus('Алдымен «Client ID баптау» түймесін басыңыз.', true); $('rmClient').click(); if (!YT.getClientId()) return; }
    if (!interactive && !YT.hasToken() && !YT.rememberedAccount()) return ytStatus('Бірінші рет «ЖҮКТЕУ» түймесін басыңыз; кейін бәрі автоматты.');
    uploading = true; $('rmYt').disabled = true;
    try {
      const tok = await YT.signIn(false), ch = await YT.channelInfo(tok), [title, ...rest] = item.text.split('\n'), description = rest.join('\n').trim();
      $('rmBar').hidden = false; $('rmBarFill').style.width = '0%'; ytStatus(`Арна: «${ch.title}». ${item.kind === 'full' ? 'Толық видео' : 'Shorts'} жүктеліп жатыр…`);
      const out = await YT.uploadVideo(tok, item.blob, {title, description, tags: item.tags, privacy: $('rmPrivacy').value, onProgress: p => { $('rmBarFill').style.width = (p * 100).toFixed(0) + '%'; }});
      item.done = true; item.blob = null; links.push({kind: item.kind, out}); showLinks();
    } catch (e) { ytStatus('❌ ' + (e.message || e) + ' (видео жадта тұр, «ЖҮКТЕУ» түймесін басыңыз)', true); } finally { uploading = false; $('rmYt').disabled = false; }
  }

  // ---- бейнені жүктеу: файл не сілтеме
  async function loadBlob(blob, name) {
    if (blobUrl) URL.revokeObjectURL(blobUrl); blobUrl = URL.createObjectURL(blob); srcBlob = blob; srcName = name; video.src = blobUrl; video.load();
    await new Promise(res => { video.onloadedmetadata = res; video.onerror = res; setTimeout(res, 10000); });
    if (!video.duration) { status('Бұл файлды ашу мүмкін болмады (MP4 / WebM қолданыңыз)', true); return false; }
    $('rmName').textContent = `${name} · ${video.videoWidth}×${video.videoHeight} · ${video.duration.toFixed(0)} с`; return true;
  }
  async function fetchLink(raw) {
    const L = classifyLink(raw); meta = {};
    if (L.kind === 'yt') {
      const canon = `https://www.youtube.com/watch?v=${L.id}`; meta = {title: '', credit: '', url: canon, needFile: true};
      try { const o = await (await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(canon)}&format=json`)).json(); meta.title = o.title || ''; meta.credit = o.author_name || ''; } catch { /* тек сілтеме */ }
      if (YT.hasToken()) { try { // лицензия және иесі: өз арнаң → own, CC → cc
        const tok = await YT.signIn(false), r = await (await fetch(`https://www.googleapis.com/youtube/v3/videos?part=status,snippet&id=${L.id}`, {headers: {Authorization: `Bearer ${tok}`}})).json(), it = r.items?.[0];
        if (it) { const me = await YT.channelInfo(tok); meta.title ||= it.snippet.title; meta.credit ||= it.snippet.channelTitle; meta.rights = it.snippet.channelId === me.id ? 'own' : it.status.license === 'creativeCommon' ? 'cc' : ''; }
      } catch { /* лицензия анықталмады */ } }
      return null;
    }
    if (L.kind === 'commons') {
      const r = await (await fetch(`https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(L.title)}&prop=imageinfo&iiprop=url|mime|extmetadata&format=json&origin=*`)).json(), ii = Object.values(r.query.pages)[0]?.imageinfo?.[0];
      if (!ii) throw new Error('Commons файлы табылмады');
      const em = ii.extmetadata || {}, lic = em.LicenseShortName?.value || '', strip = h => String(h || '').replace(/<[^>]+>/g, '').trim();
      meta = {title: strip(em.ObjectName?.value) || L.title.replace(/^File:/i, ''), credit: strip(em.Artist?.value) || 'Wikimedia Commons', url: raw, rights: /^(CC|public domain|PD)/i.test(lic) ? (/^CC/i.test(lic) ? 'cc' : 'pd') : '', licenseName: lic};
      if (!/video\/(webm|mp4)/.test(ii.mime)) throw new Error('Бұл Commons файлының пішімі (' + ii.mime + ') браузерде ашылмайды');
      return fetchFile(ii.url);
    }
    if (L.kind === 'file') { meta = {title: L.url.split('/').pop(), credit: new URL(L.url).hostname, url: L.url}; return fetchFile(L.url); }
    throw new Error('Сілтеме танылмады. YouTube, Wikimedia Commons не тікелей .mp4/.webm сілтемесін беріңіз');
  }
  async function fetchFile(url) {
    status('⬇ Бейне жүктелуде…'); const res = await fetch(url, {mode: 'cors'}); if (!res.ok) throw new Error('Бейне жүктелмеді (' + res.status + ')');
    return {blob: await res.blob(), name: decodeURIComponent(url.split('/').pop().split('?')[0]) || 'video.mp4'};
  }

  // ---- белсенділікті талдау: қозғалыс + дыбыс қарқыны (слоу-мо сәті мен ең жақсы бөлікті табу үшін)
  async function analyze(fine = false) {
    const dur = video.duration, step = fine ? Math.max(1, dur / 500) : Math.max(.5, dur / 120), n = Math.floor(dur / step), motion = new Array(n).fill(0), audio = new Array(n).fill(0), c = document.createElement('canvas'); c.width = 32; c.height = 18;
    const g = c.getContext('2d', {willReadFrequently: true}); let prev = null;
    for (let i = 0; i < n; i++) {
      await seek(Math.min(dur - .05, i * step)); try { g.drawImage(video, 0, 0, 32, 18); const d = g.getImageData(0, 0, 32, 18).data, cur = new Float32Array(576); for (let k = 0; k < 576; k++) cur[k] = d[k * 4] * .3 + d[k * 4 + 1] * .59 + d[k * 4 + 2] * .11; if (prev) { let s = 0; for (let k = 0; k < 576; k++) s += Math.abs(cur[k] - prev[k]); motion[i] = s / 576; } prev = cur; } catch { /* */ }
      if (i % 10 === 0) status(`🔎 Бейне талдануда… ${Math.round(i / n * 100)}%`);
    }
    try {
      if (srcBlob && srcBlob.size < 200 * 1048576) { const AC = window.OfflineAudioContext || window.webkitOfflineAudioContext, buf = await new AC(1, 44100, 44100).decodeAudioData(await srcBlob.arrayBuffer()), ch0 = buf.getChannelData(0);
        for (let i = 0; i < n; i++) { const a = Math.floor(i * step * buf.sampleRate), b = Math.min(ch0.length, Math.floor((i + 1) * step * buf.sampleRate)); let s = 0, m = Math.max(1, Math.floor((b - a) / 400)), cnt = 0; for (let k = a; k < b; k += m) { s += ch0[k] * ch0[k]; cnt++; } audio[i] = Math.sqrt(s / Math.max(1, cnt)); } }
    } catch { /* дыбыссыз болуы мүмкін */ }
    const mx = Math.max(1e-6, ...motion), ax = Math.max(1e-6, ...audio), hasA = audio.some(x => x > 0);
    return {activity: motion.map((m, i) => hasA ? .6 * m / mx + .4 * audio[i] / ax : m / mx), step, duration: dur};
  }

  const setv = (id, v) => { $(id).value = v; };
  async function auto(opts = {}) {
    if (busy) return; const link = $('rmLink').value.trim();
    if (!$('rmConfirm').checked) return status('Төмендегі белгіні бір рет қойыңыз (бейне өзіңдікі / CC / рұқсатың бар).', true);
    $('rmAuto').checked = true; links = []; pending = []; ytStatus('');
    try {
      if (!dry && !opts.fromFile) { // аккаунтқа кіру пайдаланушы әрекетінің ішінде, бір рет
        if (!YT.getClientId()) { $('rmClient').click(); if (!YT.getClientId()) return status('Client ID керек (бір рет).', true); }
        if (!YT.hasToken() && !YT.rememberedAccount()) await YT.signIn(false);
      }
      if (link && link !== meta.link) { const got = await fetchLink(link); meta.link = link; if (got) await loadBlob(got.blob, got.name); }
      if (!video.src || (meta.needFile && !srcBlob)) return status('YouTube-тан бейнені автоматты жүктеу YouTube шарттарына қайшы. Бейне файлын осы бетке тастаңыз немесе таңдаңыз: қалғанының бәрін өзі жасайды. (Тақырып, автор, лицензия сілтемеден алынды.)', true);
      const lang = detectLang((meta.title || srcName) + ' ' + (meta.credit || '')), AP = autoPlan(await analyze());
      setv('rmHook', $('rmHookOver').value.trim() || autoHook(meta.title || srcName, lang)); setv('rmCaps', autoCaps(lang, AP.len, AP.peak)); setv('rmStart', AP.start); setv('rmLen', AP.len); setv('rmReplayAt', AP.replayAt); setv('rmReplayLen', AP.replayLen);
      document.querySelector(`input[name=rmVar][value=${AP.variant}]`).click();
      setv('rmRights', meta.rights || (meta.credit ? 'perm' : 'own')); setv('rmCredit', meta.credit || ''); setv('rmUrl', meta.url || ''); setv('rmPrivacy', 'public');
      if (meta.licenseName) setv('rmCredit', meta.credit); refresh();
      for (const kind of ['short', 'full']) { const it = await run(true, kind); if (!it) return; }
      status(dry ? '✅ Екі видео дайын (dry: жүктелмейді).' : links.length === 2 ? '✅ Shorts және толық видео жарияланды.' : '✅ Видеолар дайын. Жүктеу күйін төменнен қараңыз.');
    } catch (e) { status('❌ ' + (e.message || e), true); busy = false; refresh(); }
  }

  // ---- «Ең қызық сәттер»: ұзақ бейнеден (мыс. GTA) әрекетті жерлерін ғана кесіп, әрқайсысын Shorts қылып жариялайды
  async function highlights() {
    if (busy) return; const link = $('rmLink').value.trim();
    if (!$('rmConfirm').checked) return status('Төмендегі белгіні бір рет қойыңыз (бейне өзіңдікі / CC / рұқсатың бар).', true);
    $('rmAuto').checked = true; links = []; pending = []; ytStatus('');
    try {
      if (!dry) { if (!YT.getClientId()) { $('rmClient').click(); if (!YT.getClientId()) return status('Client ID керек (бір рет).', true); } if (!YT.hasToken() && !YT.rememberedAccount()) await YT.signIn(false); }
      if (link && link !== meta.link) { const got = await fetchLink(link); meta.link = link; if (got) await loadBlob(got.blob, got.name); }
      if (!video.src || (meta.needFile && !srcBlob)) return status('YouTube-тан бейнені автоматты жүктеу мүмкін емес. Бейне файлын осы бетке тастаңыз: ең қызық сәттерін өзі кесіп алады.', true);
      const lang = detectLang(($('rmHookOver').value || meta.title || srcName) + ' ' + (meta.credit || '')), N = clamp(+$('rmHiN').value || 5, 1, 10), A = await analyze(true);
      const moms = topMoments({...A, n: N, len: 22}); if (!moms.length) return status('Қызық сәттер табылмады.', true);
      const base = $('rmHookOver').value.trim() || autoHook(meta.title || srcName, lang);
      setv('rmRights', meta.rights || (meta.credit ? 'perm' : 'own')); setv('rmCredit', meta.credit || ''); setv('rmUrl', meta.url || ''); setv('rmPrivacy', 'public');
      let k = 0;
      for (const M of moms) {
        k++; status(`🎬 Сәт ${k}/${moms.length}: ${M.start.toFixed(0)} с…`);
        setv('rmHook', moms.length > 1 ? `${base} #${k}`.slice(0, 80) : base); setv('rmCaps', autoCaps(lang, M.len, M.peak)); setv('rmStart', M.start); setv('rmLen', M.len); setv('rmReplayAt', M.replayAt); setv('rmReplayLen', M.replayLen);
        document.querySelector(`input[name=rmVar][value=${M.variant}]`).click(); refresh();
        if (!await run(true, 'short')) return;
      }
      status(dry ? `✅ ${moms.length} Shorts дайын (dry).` : `✅ ${moms.length} қызық сәт кесіліп, жарияланды (${links.length}).`);
    } catch (e) { status('❌ ' + (e.message || e), true); busy = false; refresh(); }
  }

  const take = async f => { if (!f || busy) return; meta = {}; if (await loadBlob(f, f.name)) { setv('rmStart', 0); setv('rmReplayAt', 0); setv('rmLen', Math.min(25, Math.floor(video.duration))); status('Бейне жүктелді.'); await still();
    if (video.duration > 90) status(`Ұзақ бейне (${Math.round(video.duration / 60)} мин). «🎮 ЕҢ ҚЫЗЫҚ СӘТТЕРДІ КЕСУ» түймесін басыңыз: тек әрекетті жерлерін қияды.`);
    else if (!$('rmAdv').open && $('rmConfirm').checked) auto({fromFile: true}); } };
  $('rmFile').onchange = () => take($('rmFile').files[0]);
  const sec = $('remix'); ['dragover', 'dragenter'].forEach(e => sec.addEventListener(e, ev => { ev.preventDefault(); sec.classList.add('drop'); })); ['dragleave', 'drop'].forEach(e => sec.addEventListener(e, () => sec.classList.remove('drop')));
  sec.addEventListener('drop', ev => { ev.preventDefault(); const f = ev.dataTransfer?.files?.[0]; if (f && f.type.startsWith('video/')) take(f); });
  ['rmHook', 'rmCaps', 'rmCredit', 'rmUrl', 'rmRights', 'rmStart', 'rmLen', 'rmReplayAt', 'rmReplayLen', 'rmFmt'].forEach(id => $(id).addEventListener('input', () => { refresh(); }));
  ['rmStart', 'rmRights'].forEach(id => $(id).addEventListener('change', () => { still(); }));
  document.querySelectorAll('input[name=rmVar]').forEach(r => r.addEventListener('change', () => { refresh(); still(); }));
  $('rmLogo').onchange = () => { const f = $('rmLogo').files[0]; if (!f) { logoImg = null; return; } const im = new Image(); im.onload = () => { logoImg = im; still(); }; im.src = URL.createObjectURL(f); };
  $('rmAutoGo').onclick = () => auto();
  $('rmHiGo').onclick = () => highlights();
  $('rmPreview').onclick = () => run(false);
  $('rmRec').onclick = async () => { for (const kind of ['short', 'full']) { if (kind === 'full' && !$('rmBoth').checked) break; if (!await run(true, kind)) break; } };
  $('rmStop').onclick = () => { busy = false; video.pause(); };
  $('rmYt').onclick = async () => { for (const it of pending.filter(x => !x.done)) await upload(it, true); };
  $('rmClient').onclick = () => { const v = prompt('Google Cloud → OAuth client ID (Web application). Authorized origin: ' + location.origin, YT.getClientId()); if (v !== null) YT.setClientId(v); };
  $('rmForget').onclick = () => { YT.forgetAccount(); ytStatus('Сақталған аккаунт ұмытылды.'); };
  $('rmCopy').onclick = async () => { try { await navigator.clipboard.writeText($('rmMeta').value); } catch { $('rmMeta').select(); document.execCommand?.('copy'); } };
  try { $('rmConfirm').checked = localStorage.getItem('drivevault-rm-confirm') === '1'; } catch { /* */ }
  $('rmConfirm').onchange = () => { try { localStorage.setItem('drivevault-rm-confirm', $('rmConfirm').checked ? '1' : '0'); } catch { /* */ } };
  if (dry) window.__rmPending = () => pending;
  cv.width = 360; cv.height = 640; refresh();
}
