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

/** Сипаттама (EN + RU) — шынайы: өңделген материал екені және дереккөз көрсетіледі */
export function buildMeta({variant, hook, caps, credit, license, rights, url, tag}) {
  const title = `${hook.trim()} ${variant === 'B' ? '🔁' : '🎬'} #Shorts`.replace(/\s+/g, ' ').slice(0, 100);
  const lic = {own: 'Original footage by the channel owner.', cc: 'Licensed under Creative Commons (CC BY). ', perm: 'Used with the written permission of the author. '}[rights] || '';
  const src = rights === 'own' ? '' : `Source / Credit: ${credit}${url ? ' — ' + url : ''}\n`;
  const desc = [
    ...caps.map((c, i) => `${i + 1}. ${c.text}`), '',
    `${lic}${src}Edited with original commentary, captions and analysis by DriveVault.`.trim(),
    license ? `License: ${license}` : '', '',
    '🔔 Subscribe so you do not miss the next videos! / Подпишись, чтобы не пропустить новые видео!',
    '💬 What do you think? Write in the comments! / А вы как думаете? Пишите в комментариях!', '',
    `#Shorts #${(tag || 'Cars').replace(/\W/g, '')} #Commentary`
  ].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n');
  return `${title}\n\n${desc}`;
}

// ------------------------------------------------------------------ интерфейс
export function initRemix({YT}) {
  const $ = id => document.getElementById(id); if (!$('rmFile')) return;
  const video = Object.assign(document.createElement('video'), {playsInline: true, preload: 'auto', crossOrigin: 'anonymous'}); video.setAttribute('playsinline', '');
  const cv = $('rmCanvas'), ctx = cv.getContext('2d');
  let ac = null, gain = null, dest = null, srcNode = null, blobUrl = '', busy = false, outBlob = null, uploading = false, outTags = ['Shorts', 'Commentary', 'Cars'];
  const state = () => ({
    variant: document.querySelector('input[name=rmVar]:checked')?.value || 'A', hook: $('rmHook').value.trim(), credit: $('rmCredit').value.trim(), url: $('rmUrl').value.trim(),
    rights: $('rmRights').value, start: Math.max(0, +$('rmStart').value || 0), clip: clamp(+$('rmLen').value || 20, 3, 55), replayAt: Math.max(0, +$('rmReplayAt').value || 0), replayLen: +$('rmReplayLen').value || 4,
    license: {own: '', cc: 'CC BY 4.0', perm: 'used with permission'}[$('rmRights').value] || '', fmt: $('rmFmt').value
  });
  const FMT = {'1080': [1080, 1920, 4e6], '720': [720, 1280, 2.4e6]};
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const status = (m, err) => { const el = $('rmStatus'); el.textContent = m; el.classList.toggle('err', !!err); };
  const ytStatus = (m, err) => { const el = $('rmYtStatus'); el.textContent = ''; el.classList.toggle('err', !!err); if (m instanceof Node) el.appendChild(m); else el.textContent = m; };

  function audioGraph() {
    if (ac) return; ac = new (window.AudioContext || window.webkitAudioContext)(); gain = ac.createGain(); dest = ac.createMediaStreamDestination();
    srcNode = ac.createMediaElementSource(video); srcNode.connect(gain); gain.connect(dest);
  }
  const seek = t => new Promise(res => { if (Math.abs(video.currentTime - t) < .02) return res(); const f = () => { video.removeEventListener('seeked', f); res(); }; video.addEventListener('seeked', f); video.currentTime = t; setTimeout(f, 3000); });
  const monitor = on => { try { gain.disconnect(); gain.connect(dest); if (on) gain.connect(ac.destination); } catch { /* */ } };

  function refresh() {
    const s = state(), P = plan(s.variant, {clip: s.clip, replayLen: s.replayLen}), caps = parseCaptions($('rmCaps').value, P.D), srcDur = video.duration || 0;
    $('rmVarB').hidden = s.variant !== 'B'; $('rmLenInfo').textContent = `Жалпы ұзақтығы ≈ ${P.total.toFixed(0)} с (клип ${P.D.toFixed(0)} с${s.variant === 'B' ? ` + баяу қайталау ${P.slow.toFixed(0)} с` : ''} + финал ${OUTRO} с)`;
    const pf = preflight({rights: s.rights, credit: s.credit, hook: s.hook, caps: caps.length, variant: s.variant, dur: P.D, srcDur});
    $('rmCheck').innerHTML = pf.items.map(([ok, t]) => `<li class="${ok ? 'ok' : 'no'}">${ok ? '✅' : '⚠️'} ${t}</li>`).join('');
    const ready = !!video.src && pf.ok && !busy;
    $('rmRec').disabled = !ready; $('rmPreview').disabled = !video.src || busy;
    return {s, P, caps, pf};
  }
  const S0 = (s, P, caps) => ({variant: s.variant, phase: 'clip', tc: 0, pt: 0, D: P.D, caps, hook: s.hook, credit: s.credit, license: s.license, video, rlWall: P.slow});

  async function still() { if (!video.src) return; const {s, P, caps} = refresh(); cv.width = 360; cv.height = 640; await seek(Math.min(s.start + 1, (video.duration || 1) - .1)); drawRemix(ctx, 360, 640, S0(s, P, caps)); }

  // Қайталанатын жұмыс: record=true болса MediaRecorder жазады
  async function run(record) {
    if (busy) return; const {s, P, caps, pf} = refresh(); if (!video.src) return; if (record && !pf.ok) { status('Алдымен ⚠️ белгілерін түзетіңіз (құқық, дереккөз, хук, 3 жол түсініктеме)', true); return; }
    busy = true; refresh(); audioGraph(); await ac.resume(); monitor(!record); gain.gain.value = clamp(+$('rmVol').value / 100, 0, 1);
    const [W, H, bps] = FMT[s.fmt] || FMT['1080']; let c = cv, g = ctx, recorder = null, chunks = [];
    if (record) { c = document.createElement('canvas'); g = c.getContext('2d'); } c.width = record ? W : 360; c.height = record ? H : 640; const cw = c.width, ch = c.height;
    if (record) {
      const mimes = ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4;codecs=avc1', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'], mime = mimes.find(m => window.MediaRecorder?.isTypeSupported?.(m)) || '';
      if (!window.MediaRecorder || !c.captureStream) { status('Бұл браузер видео жазуды қолдамайды. Chrome немесе Edge қолданыңыз.', true); busy = false; refresh(); return; }
      const tracks = [...c.captureStream(30).getVideoTracks(), ...dest.stream.getAudioTracks()];
      recorder = new MediaRecorder(new MediaStream(tracks), {mimeType: mime || undefined, videoBitsPerSecond: bps, audioBitsPerSecond: 96000});
      recorder.ondataavailable = e => e.data?.size && chunks.push(e.data); recorder.mime = recorder.mimeType || mime || 'video/webm'; recorder.start(250);
    }
    status(record ? '🔴 Жазылуда… қойынды жаппаңыз' : '▶ Алдын ала қарау…');
    const t0 = performance.now(), S = S0(s, P, caps), draw = () => { g.save(); drawRemix(g, cw, ch, S); g.restore(); };
    let stop = false; const tick = () => new Promise(r => { let done = false; const f = () => { if (!done) { done = true; r(); } }; setTimeout(f, 33); requestAnimationFrame(f); });
    try {
      video.playbackRate = 1; await seek(s.start); await video.play();
      while (!stop && video.currentTime - s.start < P.D && !video.ended) { S.tc = Math.max(0, video.currentTime - s.start); S.pt = S.tc; draw(); if (record) status(`🔴 Жазылуда: ${Math.round((performance.now() - t0) / 1000)} / ${P.total.toFixed(0)} с`); await tick(); if (!busy) stop = true; }
      video.pause();
      if (s.variant === 'B' && !stop) {
        gain.gain.value = 0; await seek(Math.min(s.replayAt || s.start, (video.duration || 1) - P.rl)); video.playbackRate = SLOW; await video.play(); S.phase = 'replay'; const r0 = performance.now(); S.focusX = .5; S.focusY = .55; S.rlWall = P.slow;
        while (performance.now() - r0 < P.slow * 1000 && !video.ended) { S.pt = (performance.now() - r0) / 1000; S.tc = P.D; draw(); await tick(); }
        video.pause(); video.playbackRate = 1;
      }
      S.phase = 'outro'; const o0 = performance.now(); while (performance.now() - o0 < OUTRO * 1000) { S.pt = (performance.now() - o0) / 1000; draw(); await tick(); }
    } catch (e) { status('Қате: ' + (e.message || e), true); stop = true; }
    video.pause(); video.playbackRate = 1; monitor(false);
    if (record && recorder) {
      await new Promise(res => { recorder.onstop = res; try { recorder.state !== 'inactive' ? recorder.stop() : res(); } catch { res(); } });
      busy = false; deliver(chunks, recorder.mime, W, H, s, caps, P);
    } else { busy = false; status('Алдын ала қарау аяқталды.'); still(); }
    refresh();
  }

  function deliver(chunks, mime, W, H, s, caps, P) {
    if (!chunks.length) { status('Видео жазылмады', true); return; }
    const ext = mime.includes('mp4') ? 'mp4' : 'webm'; outBlob = new Blob(chunks, {type: mime.split(';')[0]}); const url = URL.createObjectURL(outBlob), vid = $('rmOut');
    if (vid.dataset.url) URL.revokeObjectURL(vid.dataset.url); vid.src = url; vid.dataset.url = url; $('rmDl').href = url; $('rmDl').download = 'drivevault-remix.' + ext;
    $('rmMeta').value = buildMeta({variant: s.variant, hook: s.hook, caps, credit: s.credit, license: s.license, rights: s.rights, url: s.url, tag: 'Cars'});
    outTags = ['Shorts', 'Commentary', 'Cars', 'Highlights', ...(s.hook.split(/\s+/).filter(w => w.length > 3).slice(0, 6))].slice(0, 15);
    $('rmInfo').textContent = `${W}×${H} · ${ext.toUpperCase()} · ${(outBlob.size / 1048576).toFixed(1)} МБ · ${P.total.toFixed(0)} с · нұсқа ${s.variant}`;
    $('rmResult').hidden = false; $('rmResult').scrollIntoView({behavior: 'smooth', block: 'nearest'}); status('✅ Видео дайын.');
    if ($('rmAuto').checked) upload(false);
  }

  async function upload(interactive) {
    if (!outBlob || uploading) return;
    if (!YT.getClientId()) { if (!interactive) return ytStatus('Алдымен «Client ID баптау» түймесін басыңыз (жарыс бөліміндегімен бірдей Client ID).', true); $('rmClient').click(); if (!YT.getClientId()) return; }
    if (!interactive && !YT.hasToken() && !YT.rememberedAccount()) return ytStatus('Бірінші рет «Google аккаунт таңдап жүктеу» түймесін басыңыз; кейін автоматты жүктеледі.');
    uploading = true; $('rmYt').disabled = true;
    try {
      const tok = await YT.signIn(false), ch = await YT.channelInfo(tok), [title, ...rest] = $('rmMeta').value.split('\n'), description = rest.join('\n').trim();
      $('rmBar').hidden = false; $('rmBarFill').style.width = '0%'; ytStatus(`Арна: «${ch.title}». Жүктеліп жатыр…`);
      const out = await YT.uploadVideo(tok, outBlob, {title, description, tags: outTags, privacy: $('rmPrivacy').value, onProgress: p => { $('rmBarFill').style.width = (p * 100).toFixed(0) + '%'; }});
      const box = document.createElement('span'); box.append(`✅ «${ch.title}» арнасына жүктелді. `, Object.assign(document.createElement('a'), {href: out.url, target: '_blank', rel: 'noopener', textContent: 'Видеоны ашу'}), ' · ', Object.assign(document.createElement('a'), {href: out.studio, target: '_blank', rel: 'noopener', textContent: 'Studio: авторлық құқық тексеруі'}));
      ytStatus(box); outBlob = null;
    } catch (e) { ytStatus('❌ ' + (e.message || e) + ' (видео жадта тұр, түймені қайта басыңыз)', true); } finally { uploading = false; $('rmYt').disabled = false; }
  }

  $('rmFile').onchange = async () => {
    const f = $('rmFile').files[0]; if (!f) return; if (blobUrl) URL.revokeObjectURL(blobUrl); blobUrl = URL.createObjectURL(f); video.src = blobUrl; video.load();
    await new Promise(res => { video.onloadedmetadata = res; video.onerror = res; setTimeout(res, 8000); });
    if (!video.duration) { status('Бұл файлды ашу мүмкін болмады (MP4 / WebM қолданыңыз)', true); return; }
    $('rmName').textContent = `${f.name} · ${video.videoWidth}×${video.videoHeight} · ${video.duration.toFixed(0)} с`; $('rmLen').value = Math.min(25, Math.floor(video.duration)); $('rmStart').value = 0; $('rmReplayAt').value = 0;
    status('Бейне жүктелді. Құқықты көрсетіп, мәтіндерді жазыңыз.'); await still();
  };
  ['rmHook', 'rmCaps', 'rmCredit', 'rmUrl', 'rmRights', 'rmStart', 'rmLen', 'rmReplayAt', 'rmReplayLen', 'rmFmt'].forEach(id => $(id).addEventListener('input', () => { refresh(); }));
  ['rmStart', 'rmRights'].forEach(id => $(id).addEventListener('change', () => { still(); }));
  document.querySelectorAll('input[name=rmVar]').forEach(r => r.addEventListener('change', () => { refresh(); still(); }));
  $('rmPreview').onclick = () => run(false);
  $('rmRec').onclick = () => run(true);
  $('rmStop').onclick = () => { busy = false; video.pause(); };
  $('rmTemplate').onclick = () => { $('rmHook').value ||= 'You will not believe this'; $('rmCaps').value = ['0 This is the moment everything changes', '4 Watch the details: the speed is real', '9 Here is why it happens', '14 And this is the result'].join('\n'); refresh(); still(); };
  $('rmYt').onclick = () => upload(true);
  $('rmClient').onclick = () => { const v = prompt('Google Cloud → OAuth client ID (Web application). Authorized origin: ' + location.origin, YT.getClientId()); if (v !== null) YT.setClientId(v); };
  $('rmForget').onclick = () => { YT.forgetAccount(); ytStatus('Сақталған аккаунт ұмытылды.'); };
  $('rmCopy').onclick = async () => { try { await navigator.clipboard.writeText($('rmMeta').value); } catch { $('rmMeta').select(); document.execCommand?.('copy'); } };
  try { $('rmAuto').checked = localStorage.getItem('drivevault-rm-auto') !== '0'; } catch { /* */ }
  $('rmAuto').onchange = () => { try { localStorage.setItem('drivevault-rm-auto', $('rmAuto').checked ? '1' : '0'); } catch { /* */ } };
  cv.width = 360; cv.height = 640; refresh();
}
