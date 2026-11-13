// Таңдалған көліктің фотосын Wikipedia-дан автоматты табу (CORS ашық, тіркелусіз).
// Тек көліктің марка/модель атауы жіберіледі. Нәтиже жергілікті жадта сақталады.

const API = 'https://en.wikipedia.org/w/api.php';
const STORE = 'drivevault-photos-v1';
const metaCache = new Map(), photoCache = new Map(), done = new Map();

const keyOf = car => `${car.make} ${car.model}`;
function readStore() { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; } }
function writeStore(k, v) { try { const s = readStore(); s[k] = v; localStorage.setItem(STORE, JSON.stringify(s)); } catch { /* жад толы немесе өшірулі */ } }

async function search(query, make) {
  const u = new URL(API);
  Object.entries({action: 'query', generator: 'search', gsrsearch: query, gsrnamespace: 0, gsrlimit: 6, prop: 'pageimages', piprop: 'thumbnail', pithumbsize: 960, format: 'json', origin: '*'}).forEach(([k, v]) => u.searchParams.set(k, v));
  const r = await fetch(u); if (!r.ok) return null;
  const pages = Object.values((await r.json()).query?.pages || {}).sort((a, b) => a.index - b.index);
  const brand = make.split(/[\s-]/)[0].toLowerCase();
  const hit = pages.find(p => p.thumbnail?.source && !/\.svg/i.test(p.thumbnail.source) && p.title.toLowerCase().includes(brand));
  return hit ? {url: hit.thumbnail.source, title: hit.title, page: `https://en.wikipedia.org/wiki/${encodeURIComponent(hit.title.replace(/ /g, '_'))}`} : null;
}

export function findPhoto(car) {
  const key = keyOf(car);
  if (metaCache.has(key)) return metaCache.get(key);
  const p = (async () => {
    const saved = readStore()[key]; if (saved) return saved;
    for (const q of [key, `${car.make} ${car.model.split(' ')[0]}`]) {
      try { const m = await search(q, car.make); if (m) { writeStore(key, m); return m; } } catch { /* желі қатесі: келесі сұраныс */ }
    }
    return null;
  })();
  metaCache.set(key, p); p.then(m => { if (!m) metaCache.delete(key); });
  return p;
}

function loadImage(url) {
  return new Promise(res => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = () => res(null); i.src = url; });
}

/** Көлік денесінің басым түсі (суреттің ортасынан) — жарыстағы көлікті бояу үшін */
export function dominantColor(img) {
  try {
    const W = 96, H = 60, c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d', {willReadFrequently: true}); g.drawImage(img, 0, 0, W, H);
    const x0 = Math.round(W * .25), x1 = Math.round(W * .75), y0 = Math.round(H * .38), y1 = Math.round(H * .8);
    const d = g.getImageData(x0, y0, x1 - x0, y1 - y0).data, bins = Array.from({length: 24}, () => ({w: 0, r: 0, g: 0, b: 0})), grays = [];
    let n = 0;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i] / 255, gg = d[i + 1] / 255, b = d[i + 2] / 255, mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), l = (mx + mn) / 2, dl = mx - mn;
      n++;
      const s = dl === 0 ? 0 : dl / (1 - Math.abs(2 * l - 1));
      if (s > .4 && l > .18 && l < .8) {
        let h = mx === r ? ((gg - b) / dl) % 6 : mx === gg ? (b - r) / dl + 2 : (r - gg) / dl + 4; h = (h * 60 + 360) % 360;
        const bin = bins[Math.floor(h / 15) % 24]; bin.w += s; bin.r += d[i]; bin.g += d[i + 1]; bin.b += d[i + 2];
      } else if (s < .25) grays.push(l);
    }
    const best = bins.reduce((a, b) => b.w > a.w ? b : a), sat = bins.reduce((a, b) => a + b.w, 0);
    if (best.w > 0 && sat / n > .07) {
      // орташа түс: салмағы бойынша қайта есептеу
      let rr = 0, gg2 = 0, bb = 0, cnt = 0, bi = bins.indexOf(best);
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i] / 255, gg = d[i + 1] / 255, b = d[i + 2] / 255, mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), l = (mx + mn) / 2, dl = mx - mn;
        const s = dl === 0 ? 0 : dl / (1 - Math.abs(2 * l - 1));
        if (s > .4 && l > .18 && l < .8) { let h = mx === r ? ((gg - b) / dl) % 6 : mx === gg ? (b - r) / dl + 2 : (r - gg) / dl + 4; h = (h * 60 + 360) % 360; if (Math.floor(h / 15) % 24 === bi) { rr += d[i]; gg2 += d[i + 1]; bb += d[i + 2]; cnt++; } }
      }
      const hex = v => Math.round(v / cnt).toString(16).padStart(2, '0');
      return `#${hex(rr)}${hex(gg2)}${hex(bb)}`;
    }
    grays.sort((a, b) => a - b); const med = grays[Math.floor(grays.length / 2)] ?? .6;
    return med > .78 ? '#eceeed' : med < .2 ? '#17191c' : med < .4 ? '#4b5258' : '#9da4aa';
  } catch { return null; }
}

/** Фото + мета + түс. Қайта шақырса, жадтан бірден қайтарады. */
export function loadCarPhoto(car) {
  const key = keyOf(car);
  if (done.has(key)) return done.get(key);
  const p = (async () => {
    const meta = await findPhoto(car); if (!meta) return null;
    const img = await loadImage(meta.url); if (!img) return null;
    const out = {...meta, img, color: dominantColor(img)}; photoCache.set(key, out); return out;
  })();
  done.set(key, p); p.then(v => { if (!v) done.delete(key); });
  return p;
}

export const cachedPhoto = car => photoCache.get(keyOf(car)) || null;
