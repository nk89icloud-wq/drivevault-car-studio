// Видео соңындағы карточка (EN + RU): жазылу, көлік атын коментке жазу, келесі видео сұрағы.
// Көлденең (турнир) және тік (Shorts) кадрға бейімделеді.
const F = (sz, wt = 700) => `${wt} ${sz}px "Segoe UI", system-ui, Arial, sans-serif`;
const ITEMS_AN = [
  ['🔔', 'SUBSCRIBE TO THE CHANNEL', "Don't miss the next races!", 'ПОДПИШИСЬ НА КАНАЛ', 'Не пропусти новые забеги!', '#ff4d4d'],
  ['🐕', 'WANT OTHER ANIMALS TO RACE?', 'Write the animal or dog breed in the comments!', 'ХОТИТЕ ДРУГИХ ЖИВОТНЫХ?', 'Напишите породу или животное в комментариях!', '#4cc3ff'],
  ['❓', 'WHO SHOULD RACE NEXT?', "Tell us - we'll put them to the test!", 'КТО БЕЖИТ СЛЕДУЮЩИМ?', 'Пишите — мы устроим забег!', '#ffb020']
];
const ITEMS_CARS = [
  ['🔔', 'SUBSCRIBE TO THE CHANNEL', "Don't miss the next videos!", 'ПОДПИШИСЬ НА КАНАЛ', 'Не пропусти другие видео!', '#ff4d4d'],
  ['💬', 'WANT OTHER CARS TO RACE?', 'Write the car names in the comments!', 'ХОТИТЕ ДРУГИЕ МАШИНЫ?', 'Напишите названия в комментариях!', '#4cc3ff'],
  ['❓', 'WHICH CARS IN THE NEXT VIDEO?', "Tell us - we'll put them to the test!", 'КАКИЕ МАШИНЫ В СЛЕДУЮЩЕМ ВИДЕО?', 'Пишите — мы проверим их в гонке!', '#ffb020']
];
function txt(ctx, s, x, y, sz, o = {}) {
  ctx.save(); ctx.font = F(sz, o.w || 700); ctx.fillStyle = o.c || '#fff'; ctx.textAlign = o.a || 'left'; ctx.textBaseline = 'middle';
  if (o.max) while (ctx.measureText(s).width > o.max && sz > 12) { sz -= 2; ctx.font = F(sz, o.w || 700); }
  ctx.fillText(s, x, y); ctx.restore();
}
function box(ctx, x, y, w, h, r, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); ctx.fill(); }

export function outroCard(dur = 8, kind = 'cars') {
  let t0 = 0; const ITEMS = kind === 'animals' ? ITEMS_AN : ITEMS_CARS;
  return (ctx, w, h) => {
    if (!t0) t0 = performance.now(); const t = (performance.now() - t0) / 1000, tall = h > w * 1.1, VW = tall ? 1080 : 1920, VH = tall ? 1920 : 1080, k = Math.min(w / VW, h / VH);
    const g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#0b0f1a'); g.addColorStop(1, '#171a2b'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.save(); ctx.translate((w - VW * k) / 2, (h - VH * k) / 2); ctx.scale(k, k);
    ctx.globalAlpha = .07; ctx.fillStyle = '#fff'; for (let i = -2; i < 14; i++) { ctx.save(); ctx.translate(((i * 220 + t * 90) % 3200) - 400, 0); ctx.transform(1, 0, -.5, 1, 0, 0); ctx.fillRect(0, 0, 70, VH); ctx.restore(); }
    ctx.globalAlpha = Math.min(1, t / .35) * Math.min(1, Math.max(0, (dur - t) / .35));
    ITEMS.forEach(([ic, en1, en2, ru1, ru2, col], i) => {
      const a = Math.min(1, Math.max(0, t - .25 - i * .55) / .45); ctx.save(); ctx.globalAlpha *= a;
      if (tall) {
        const y = 110 + i * 600; ctx.translate(0, (1 - a) * 70);
        box(ctx, 60, y, 960, 560, 36, '#ffffff12'); box(ctx, 60, y, 960, 16, 8, col);
        txt(ctx, ic, 540, y + 105, 110, {a: 'center'});
        txt(ctx, en1, 540, y + 215, 50, {a: 'center', w: 900, c: col, max: 900}); txt(ctx, en2, 540, y + 280, 38, {a: 'center', max: 900});
        txt(ctx, ru1, 540, y + 380, 46, {a: 'center', w: 900, c: col, max: 900}); txt(ctx, ru2, 540, y + 445, 36, {a: 'center', c: '#cfd6e6', max: 900});
      } else {
        const y = 90 + i * 330; ctx.translate((1 - a) * 90, 0);
        box(ctx, 130, y, 1660, 290, 28, '#ffffff12'); box(ctx, 130, y, 16, 290, 8, col);
        txt(ctx, ic, 270, y + 150, 120, {a: 'center'});
        txt(ctx, en1, 400, y + 70, 56, {w: 900, c: col, max: 1330}); txt(ctx, en2, 400, y + 132, 42, {max: 1330});
        txt(ctx, ru1, 400, y + 206, 50, {w: 900, c: col, max: 1330}); txt(ctx, ru2, 400, y + 262, 38, {c: '#cfd6e6', max: 1330});
      }
      ctx.restore();
    });
    ctx.restore();
  };
}
