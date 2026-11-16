import {makeSpec, newState, step, vehiclePerformance, clamp, lerp, KMH100, QUARTER_MILE} from './physics.js?v=28';
import {createAudio} from './audio.js?v=28';
import * as YT from './youtube.js?v=28';
import {saveTrack, loadTrack, clearTrack} from './music.js?v=28';
import {outroCard} from './outro.js?v=28';
import {makeRace, drawAnimalRace, ANIMALS, SPR, loadSprites} from './animals.js?v=28';
import {loadCarPhoto, cachedPhoto} from './photos.js?v=28';
import {drawRace, LANES, pickPaints} from './render.js?v=28';
import {simulate, crashSummary, SCENARIOS} from './crashsim.js?v=28';
import {drawCrash, timeline} from './crashview.js?v=28';

export {vehiclePerformance};

const $ = id => document.getElementById(id);

export function crashMetrics(car, speedKmh, barrier = 'wall') {
  const r = crashSummary(car, speedKmh, barrier); return {energy: r.energy, deformation: r.deformation, force: r.force};
}

export const TEXT = {
  kk: {fin: 'Финиш уақыты', hp: 'А.К.', kg: 'КГ', z100: '0–100', kmh: 'КМ/САҒ', m: 'М', s: 'С', winner: 'ЖЕҢІМПАЗ', draw: 'ТЕҢ ТҮСТІ', by: 'айырма', et: 'Өту уақыты (ET)', trap: 'Мәредегі жылдамдық', t100: '0–100 км/сағ', rt: 'Реакция', go: 'ЖҮР!', ready: 'ДАЙЫН', finish: 'МӘРЕ!', cta: 'Жазыл — келесі жарыс сенікі!', race: 'жарыс', ytTitle: 'Drag Race'},
  ru: {fin: 'Время финиша', hp: 'Л.С.', kg: 'КГ', z100: '0–100', kmh: 'КМ/Ч', m: 'М', s: 'С', winner: 'ПОБЕДИТЕЛЬ', draw: 'НИЧЬЯ', by: 'отрыв', et: 'Время заезда (ET)', trap: 'Скорость на финише', t100: '0–100 км/ч', rt: 'Реакция', go: 'ГО!', ready: 'ГОТОВ', finish: 'ФИНИШ!', cta: 'Подпишись — следующая гонка!', race: 'гонка', ytTitle: 'Драг-рейсинг'},
  en: {fin: 'Finish time', hp: 'HP', kg: 'KG', z100: '0–100', kmh: 'KM/H', m: 'M', s: 'S', winner: 'WINNER', draw: 'DEAD HEAT', by: 'margin', et: 'Elapsed time (ET)', trap: 'Trap speed', t100: '0–100 km/h', rt: 'Reaction', go: 'GO!', ready: 'READY', finish: 'FINISH!', cta: 'Subscribe for the next race!', race: 'race', ytTitle: 'Drag Race'}
};
const FORMATS = {short1080: [1080, 1920], short720: [720, 1280], wide1080: [1920, 1080], wide720: [1280, 720]};
const STEP = 1 / 240;

export function initGame(getCars) {
  const canvas = $('gameCanvas'), ctx = canvas.getContext('2d');
  const shell = $('gameShell');
  const audio = createAudio();
  const assets = {track: new Image(), yellow: new Image(), silver: new Image()};
  assets.track.src = 'assets/race-track-straight.png';
  assets.yellow.src = 'assets/race-car-yellow.png';
  assets.silver.src = 'assets/race-car-silver.png';
  Object.values(assets).forEach(image => image.addEventListener('load', () => { if (mode === 'race' && !running) draw(); }));

  let mode = 'race', token = 0, raf = 0, last = 0, running = false, acc = 0, showHud = true;
  let world = null, crash = {sim: null, tv: 0, done: false, hit: false}, shake = 0, an = {S: null};
  let rec = null; // {canvas, ctx, recorder, chunks, w, h, mime}
  let forced = null, keepMusic = false, card = null, cardLoopOn = false, overlay = null, matchDone = null, resultHold = 5.4, sessionOn = false, lastTags = null;
  const customSprites = {};
  const slug = car => `${car.make}-${car.model}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const spriteFor = car => customSprites[slug(car)] || null;
  function alphaBox(img) {
    try {
      const s = Math.min(1, 600 / img.naturalWidth), c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
      const g = c.getContext('2d'); g.drawImage(img, 0, 0, c.width, c.height);
      const d = g.getImageData(0, 0, c.width, c.height).data; let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0;
      for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 128) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      return {x: x0 / s, y: y0 / s, w: (x1 - x0 + 1) / s, h: (y1 - y0 + 1) / s};
    } catch { return {x: 0, y: 0, w: img.naturalWidth, h: img.naturalHeight}; }
  }
  // assets/cars/index.json ішінде тізімделген модельдердің жеке суреттері (мыс. "porsche-911-turbo-s") автоматты қолданылады
  fetch('assets/cars/index.json').then(r => r.ok ? r.json() : []).then(list => list.forEach(name => {
    const img = new Image(); img.onload = () => { customSprites[name] = {img, box: alphaBox(img)}; if (mode === 'race' && !running) reset(); }; img.src = `assets/cars/${name}.png`;
  })).catch(() => {});
  let sequenceCar = null;

  // ---------------------------------------------------------------- жарыс әлемі
  const lang = () => TEXT[$('raceLang')?.value] || TEXT.kk;
  const distance = () => +($('raceDistance')?.value || QUARTER_MILE);

  function makeWorld() {
    const cars = forced || getCars(), list = forced?.list || [cars.A, cars.B], n = list.length, specs = list.map(makeSpec), D = forced?.dist || distance();
    const lanes = n > 2 ? list.map((_, i) => (i - (n - 1) / 2) * 2.7) : null, half = n > 2 ? n * 2.7 / 2 : 0;
    sequenceCar = specs;
    const w = {
      assets, sprites: specs.map(s => spriteFor(s.car)), paints: n > 2 ? forced.colors : pickPaints(specs[0].car, specs[1].car), colors: n > 2 ? forced.colors : null, lanes, geo: n > 2 ? {lineX: half, roadX: half + 1.6, wallX: half + 3.4} : null, placed: 0, T: lang(), D, hud: showHud, phase: 'idle', phaseT: 0, time: 0, clock: 0, flash: 0, banner: null, count: null,
      lights: {amber: 0, green: false, show: true}, result: null, resultT: 0, marks: list.map(() => null), smoke: [], slow: 1, slowT: -1, firstIdx: -1, done: false,
      photos: n > 2 ? list.map(() => null) : [cachedPhoto(cars.A), cachedPhoto(cars.B)],
      cam: {z: -specs[0].len - 14, H: 16, sx: 0, sy: 0, fov: 0, pitch: 0}, carsLabel: `DriveVault · ${Math.round(D)} ${lang().m}`,
      cars: specs.map((spec, i) => ({spec, st: Object.assign(newState(spec), {rpmHold: 0}), rt: .14 + Math.random() * .07, released: false, finished: false, tCross: 0, et: 0, trap: 0, t100: null, tTrap0: null, xOther: 0, smokeAcc: 0}))
    };
    if (n === 2) applyPhotos(w, cars);
    return w;
  }

  function applyPhotos(w, cars) {
    const apply = (ph, i) => { if (!ph) return; w.photos[i] = ph; if (ph.color) w.paints[i] = ph.color; const neutral = ['#eceeed', '#17191c', '#4b5258', '#9da4aa']; if (w.paints[0] === w.paints[1] || (neutral.includes(w.paints[0]) && neutral.includes(w.paints[1]))) { const alt = ['#c4122f', '#1f4fa3', '#ee6a12', '#2f7d4f', '#f2b705']; w.paints[1] = alt[(cars.B.id || 0) % alt.length]; } };
    [cars.A, cars.B].forEach((car, i) => {
      const cached = cachedPhoto(car); if (cached) apply(cached, i);
      else loadCarPhoto(car).then(ph => { if (world !== w || !ph) return; apply(ph, i); if (!running) draw(); });
    });
  }

  // ---------------------------------------------------------------- физика қадамы
  function stepWorld(h) {
    const w = world, t0 = w.clock; w.clock += h;
    const prev = w.cars.map(c => ({x: c.st.x, v: c.st.v}));
    w.cars.forEach(car => {
      if (!car.released && w.clock >= car.rt) car.released = true;
      step(car.spec, car.st, h, {launch: car.released, brake: car.finished && car.st.x > w.D + 12});
    });
    w.cars.forEach((car, i) => {
      if (car.finished) return;
      const st = car.st, p = prev[i];
      if (car.tTrap0 === null && st.x >= w.D - 20) car.tTrap0 = t0 + h * (w.D - 20 - p.x) / (st.x - p.x);
      if (car.t100 === null && p.v < KMH100 && st.v >= KMH100) car.t100 = t0 + h * (KMH100 - p.v) / (st.v - p.v) - car.rt;
      if (st.x >= w.D) {
        const f = (w.D - p.x) / (st.x - p.x), n = w.cars.length, o = w.cars[n > 2 ? i : 1 - i], po = prev[n > 2 ? i : 1 - i];
        car.finished = true; car.tCross = t0 + h * f; car.et = car.tCross - car.rt;
        car.trap = 20 / Math.max(.01, car.tCross - car.tTrap0) * 3.6;
        car.xOther = lerp(po.x, o.st.x, f); car.place = ++w.placed;
        if (w.firstIdx < 0) { w.firstIdx = i; w.flash = 1; w.banner = {text: w.T.finish, age: 0, life: 1.6, color: '#fff'}; audio.whoosh(.35, .8); }
      }
    });
  }

  function spawnEffects(dt) {
    const w = world;
    w.cars.forEach((car, i) => {
      const st = car.st, axle = st.x - car.spec.len * .8;
      if (st.launched && st.slip > .06 && st.v < 36) {
        const m = w.marks[i] || (w.marks[i] = {z0: axle, z1: axle});
        m.z1 = axle;
        car.smokeAcc += dt * (40 + 140 * st.slip);
        while (car.smokeAcc >= 1) {
          car.smokeAcc -= 1;
          [-.8, .8].forEach(o => w.smoke.push({X: (w.lanes || LANES)[i] + o + (Math.random() - .5) * .4, z: axle + Math.random() * .4, Y: .1 + Math.random() * .2, vx: (Math.random() - .5) * 1.2, vz: st.v * .5 + Math.random(), age: 0, life: 1.4 + Math.random() * 1.1, size0: .45, size1: 2 + Math.random() * 1.8, alpha: clamp(.25 + st.slip * .55, 0, .75)}));
        }
      }
    });
    for (const p of w.smoke) { p.age += dt; p.X += p.vx * dt; p.Y += .35 * dt; p.z += p.vz * dt; p.vz *= Math.exp(-2.4 * dt); }
    w.smoke = w.smoke.filter(p => p.age < p.life).slice(-260);
  }

  function updateCamera(dt) {
    const w = world, cam = w.cam, cars = w.cars;
    const rears = cars.map(c => c.st.x - c.spec.len), trailing = Math.min(...rears), wide = cars.length > 2 ? 1 + (cars.length - 2) * .2 : 1;
    // 45° жоғарғы камера: екі көлікті де кадрда ұстайды, арақашықтық артқанда биіктейді
    const front = Math.max(...cars.map(c => c.st.x)), span = front - trailing;
    const hm = ($('recFormat')?.value || 'short1080').startsWith('short') ? 1 : 1.4;
    let Ht = Math.max(9.5 * wide, span / 4) * hm;
    if (w.phase === 'intro') { const e = 1 - Math.pow(1 - clamp(w.phaseT / 1.6, 0, 1), 3); Ht = lerp(16 * wide, 9.5 * wide, e) * hm; }
    cam.H = w.phase === 'intro' || !cam.H ? Ht : cam.H + (Ht - cam.H) * (1 - Math.exp(-dt * 2.5));
    const target = trailing + Math.min(span * .5, cam.H * .6) - cam.H;
    cam.z = w.phase === 'intro' ? target : cam.z + (target - cam.z) * (1 - Math.exp(-dt * 9));
    const lead = Math.max(...cars.map(c => c.st.v)), vf = clamp(lead / 90, 0, 1);
    const launchJolt = w.phase === 'race' ? clamp(1 - w.clock / 1.2, 0, 1) : 0;
    const amp = .35 + 2.4 * vf + 5 * launchJolt;
    const t = w.time;
    cam.sx = (Math.sin(t * 43) + Math.sin(t * 27.3)) * .5 * amp;
    cam.sy = (Math.sin(t * 51 + 1) + Math.sin(t * 33)) * .5 * amp * .8;
    cam.fov = vf * .07;
    const acc = cars.reduce((s, c) => s + c.st.accel, 0) / cars.length;
    cam.pitch = clamp(acc, -8, 12) * 1.0;
  }

  // ---------------------------------------------------------------- уақыт желісі
  function setCount(text, go = false) { world.count = {text, age: 0, go}; }

  function tick(dt) {
    const w = world; w.time += dt; w.flash = Math.max(0, w.flash - dt * 2.2);
    if (w.banner) { w.banner.age += dt; if (w.banner.age > w.banner.life) w.banner = null; }
    if (w.count) w.count.age += dt;
    if (w.slowT >= 0) { w.slowT += dt; const k = clamp((w.slowT - .45) / .9, 0, 1); w.slow = lerp(.3, 1, k * k * (3 - 2 * k)); }
    let sim = dt * w.slow;
    w.phaseT += dt;
    const revCars = () => w.cars.forEach((car, i) => { // старт алдында двигатель айдауы
      const st = car.st, target = w.phase === 'countdown' ? (.28 + .22 * Math.min(1, w.phaseT / 2.7)) * (car.spec.redline - car.spec.idle) : (.04 * (car.spec.redline - car.spec.idle));
      const bounce = w.phase === 'countdown' ? (Math.sin(w.time * 14 + i * 2) * .03) * (car.spec.redline - car.spec.idle) : 0;
      st.rpmHold += ((car.spec.ev ? 0 : target + bounce) - st.rpmHold) * (1 - Math.exp(-dt * 7));
      st.throttle = w.phase === 'countdown' && !car.spec.ev ? .55 : 0;
    });

    if (w.phase === 'intro') {
      revCars(); w.cars.forEach(c => step(c.spec, c.st, STEP, {launch: false}));
      if (w.phaseT >= 1.6) { w.phase = 'countdown'; w.phaseT = 0; w.cd = -1; }
    } else if (w.phase === 'countdown') {
      revCars(); w.cars.forEach(c => step(c.spec, c.st, STEP, {launch: false}));
      const stage = Math.min(3, Math.floor(w.phaseT / .9));
      if (stage !== w.cd) {
        w.cd = stage;
        if (stage < 3) { w.lights.amber = stage + 1; setCount(String(3 - stage)); audio.beep(520, .22, .4); }
        else { w.lights.green = true; w.lights.amber = 0; setCount(w.T.go, true); audio.beep(1040, .6, .45); w.phase = 'race'; w.phaseT = 0; w.clock = 0; acc = 0; }
      }
    } else if (w.phase === 'race' || w.phase === 'finish' || w.phase === 'result') {
      acc += sim; let n = 0;
      while (acc >= STEP && n++ < 600) { acc -= STEP; stepWorld(STEP); }
      spawnEffects(sim);
      if (w.phase === 'race') {
        if (w.lights.show && w.clock > 2.2) w.lights.show = false;
        if (w.cars.every(c => c.finished)) { w.phase = 'finish'; w.phaseT = 0; if (!keepMusic) audio.stopMusic(1); }
        else if (w.clock > 90) { w.cars.forEach(c => { if (!c.finished) { c.finished = true; c.et = 90; c.tCross = 90; } }); w.phase = 'finish'; w.phaseT = 0; if (!keepMusic) audio.stopMusic(1); }
      } else if (w.phase === 'finish') {
        if (w.phaseT > 1.5) { w.phase = 'result'; w.phaseT = 0; w.resultT = 0; w.result = buildResult(); showResults(w.result); }
      } else {
        w.resultT += dt; if (w.resultT > resultHold && !w.done) { w.done = true; finishSequence(); }
      }
    }
    updateCamera(dt);
    if (w.phase !== 'idle') updateAudio();
    updateStatus();
  }

  function buildResult() {
    const w = world, [a, b] = w.cars;
    if (w.cars.length > 2) {
      const order = w.cars.map((_, i) => i).sort((p, q) => w.cars[p].tCross - w.cars[q].tCross);
      return {winner: order[0], order, margin: {time: w.cars[order[1]].tCross - w.cars[order[0]].tCross, dist: 0}, rows: w.cars.map(c => ({fin: c.tCross, et: c.et, trap: c.trap, t100: c.t100, rt: c.rt}))};
    }
    const dT = a.tCross - b.tCross, winner = Math.abs(dT) < .0005 ? -1 : dT < 0 ? 0 : 1;
    const wc = winner >= 0 ? w.cars[winner] : null;
    return {
      winner, margin: {time: Math.abs(dT), dist: wc ? Math.max(0, w.D - wc.xOther) : 0},
      rows: w.cars.map(c => ({fin: c.tCross, et: c.et, trap: c.trap, t100: c.t100, rt: c.rt}))
    };
  }

  function showResults(R) {
    const w = world, T = w.T;
    if (R.order) { $('gameResults').innerHTML = R.order.map((i, r) => `<div class="result-chip${r === 0 ? ' win' : ''}"><span>${r + 1}. ${w.cars[i].spec.car.make} ${w.cars[i].spec.car.model}${r === 0 ? ' 🏆' : ''}</span><strong>${R.rows[i].fin.toFixed(3)} ${T.s.toLowerCase()}</strong></div>`).join(''); $('gameStatus').textContent = T.winner; return; }
    const chip = (i, tag) => { const c = w.cars[i], r = R.rows[i], won = R.winner === i; return `<div class="result-chip${won ? ' win' : ''}"><span>${tag} · ${c.spec.car.make} ${c.spec.car.model}${won ? ' 🏆' : ''}</span><strong>${r.fin.toFixed(3)} ${T.s.toLowerCase()}</strong><small>ET ${r.et.toFixed(3)} · ${Math.round(r.trap)} ${T.kmh.toLowerCase()} · 0–100 ${r.t100 ? r.t100.toFixed(2) : '—'} · RT ${r.rt.toFixed(3)}</small></div>`; };
    $('gameResults').innerHTML = chip(0, 'A') + chip(1, 'B');
    $('gameStatus').textContent = R.winner < 0 ? T.draw : T.winner;
  }

  function updateStatus() {
    const w = world, el = $('gameStatus'); if (!el) return;
    const map = {idle: w.T.ready, intro: w.T.ready, countdown: '3 · 2 · 1', race: w.cars.length > 2 ? 'P1 · ' + (w.cars.reduce((m, c, i) => c.st.x > w.cars[m].st.x ? i : m, 0) + 1) : (w.cars[0].st.x >= w.cars[1].st.x ? 'A · P1' : 'B · P1')};
    if (map[w.phase]) el.textContent = map[w.phase];
  }

  function updateAudio() {
    const w = world, on = $('soundToggle')?.classList.contains('on') ?? true;
    audio.setSpeakers?.(on);
    w.cars.forEach((car, i) => {
      const d = Math.max(4, car.st.x - car.spec.len - w.cam.z), level = clamp(Math.pow(8 / d, .6), .3, 1) * (w.cars.length > 2 ? 2.2 / Math.sqrt(w.cars.length) : 1);
      audio.update(i, car.spec, car.st, w.phase === 'result' ? level * clamp(1 - w.resultT / 2.5, 0, 1) : level);
    });
  }

  // ---------------------------------------------------------------- басқару
  function reset() {
    token++; frameId++; cancelAnimationFrame(raf); running = false; if (!sessionOn) { cancelRecording(); card = null; } audio.teardown(keepMusic); last = 0; acc = 0; shake = 0;
    if (mode === 'race') world = makeWorld();
    else if (mode === 'animal') buildAnimal();
    else { const cars = getCars(); crash = {sim: null, tv: 0, done: false, hit: false}; }
    $('gameCountdown').classList.remove('show'); $('gameCountdown').textContent = '';
    $('gameMessage').classList.remove('show'); $('gameResults').innerHTML = '';
    $('gameStart').disabled = false; if ($('gameRecord')) $('gameRecord').disabled = false; if (mode === 'crash') $('crashPanel').hidden = false;
    setStatus(TEXT[$('raceLang')?.value || 'kk'].ready); draw();
  }

  function setStatus(text) { $('gameStatus').textContent = text; }
  function setMessage(text, delay = 1400) {
    const el = $('gameMessage'); el.textContent = text; el.classList.add('show');
    if (delay) setTimeout(() => el.textContent === text && el.classList.remove('show'), delay);
  }

  function setMode(next) {
    mode = next; shell.classList.toggle('crash-active', mode === 'crash');
    $('raceMode').classList.toggle('active', mode === 'race'); $('crashMode').classList.toggle('active', mode === 'crash'); $('animalMode').classList.toggle('active', mode === 'animal'); $('anOptions').hidden = mode !== 'animal';
    $('crashPanel').hidden = mode !== 'crash'; $('raceOptions').hidden = mode !== 'race'; $('controlHelp').hidden = mode !== 'race';
    $('gameRecord').hidden = false; $('videoOut').hidden = !$('videoOut').dataset.has;
    $('gameStart').innerHTML = mode === 'race' ? 'ЖАРЫСТЫ БАСТАУ <b>▶</b>' : mode === 'animal' ? 'ЖАНУАР ЖАРЫСЫН БАСТАУ <b>▶</b>' : 'КРАШ-ТЕСТТІ БАСТАУ <b>▶</b>'; $('gameRecord').innerHTML = mode === 'crash' ? '🎬 КРАШ-ТЕСТ + ВИДЕО ЖАЗУ' : '🎬 ЖАРЫС + ВИДЕО ЖАЗУ';
    reset();
  }

  async function start(record = false) {
    if (running) return;
    reset(); const run = token; $('gameStart').disabled = true; $('gameRecord').disabled = true;
    if (mode === 'crash') return startCrash(run, record);
    if (mode === 'animal') return startAnimal(run, record);
    await audio.resume(); audio.setup(world.cars.map(c => c.spec)); audio.startMusic();
    if (record) { const ok = await startRecording(); if (!ok) { $('gameStart').disabled = false; $('gameRecord').disabled = false; return; } }
    if (run !== token) return;
    world.phase = 'intro'; world.phaseT = 0; running = true; last = performance.now(); raf = nextFrame();
  }

  // Қойынды артқа кеткенде rAF тоқтайды: сондықтан Worker таймері қатар жүреді (кім бұрын шықса, сол жүреді)
  let frameId = 0, tickWorker = null;
  function wTimeout(fn, ms) {
    try {
      if (!tickWorker) { tickWorker = new Worker(URL.createObjectURL(new Blob(['onmessage=e=>setTimeout(()=>postMessage(e.data),e.data.ms)'], {type: 'text/javascript'}))); tickWorker.fns = new Map(); tickWorker.n = 0; tickWorker.onmessage = e => { const f = tickWorker.fns.get(e.data.k); tickWorker.fns.delete(e.data.k); f && f(); }; }
      const k = ++tickWorker.n; tickWorker.fns.set(k, fn); tickWorker.postMessage({k, ms});
    } catch { setTimeout(fn, ms); }
  }
  function nextFrame() {
    const id = ++frameId, fire = now => { if (id !== frameId) return; frameId++; loop(typeof now === 'number' ? now : performance.now()); };
    wTimeout(() => fire(), 30);
    return requestAnimationFrame(fire);
  }
  function loop(now) {
    if (!running) return;
    const dt = Math.min(.05, (now - last) / 1000 || 0); last = now;
    if (mode === 'race') {
      tick(dt); draw(); drawRec(); recProgress(now);
      if (world.done && now - world.doneAt > 450) { running = false; endSequence(); return; }
    } else if (mode === 'animal') {
      updateAnimal(dt); draw(); drawRec(); if (an.S.done) { running = false; endSequence(); return; }
    } else { updateCrash(dt); draw(); drawRec(); if (crash.done) { running = false; finishCrash(); endSequence(); return; } }
    raf = nextFrame();
  }

  function finishSequence() { world.doneAt = performance.now(); audio.silence(); if (!keepMusic) audio.stopMusic(2.5); }
  function endSequence() { if (matchDone) { const f = matchDone; matchDone = null; f(world.result); return; } $('gameStart').disabled = false; $('gameRecord').disabled = false;
    if (rec && !sessionOn) { // Shorts соңы: жазылу / коментке көлік атын жазу / келесі видео — 6 секунд
      const r = rec, c = outroCard(6, mode === 'animal' ? 'animals' : 'cars'); card = c; tournament.setCard(c);
      wTimeout(() => { if (rec === r && card === c) { card = null; stopRecording(true); } }, 6100);
    } else if (rec) stopRecording(true);
  }

  // ---------------------------------------------------------------- видео жазу
  function pickMime() {
    const list = ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4;codecs=avc1', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    return list.find(m => window.MediaRecorder?.isTypeSupported?.(m)) || '';
  }

  async function startRecording(fmt, bps) {
    if (!window.MediaRecorder || !canvas.captureStream) { toast('Бұл браузер видео жазуды қолдамайды. Chrome немесе Edge қолданыңыз.'); return false; }
    const [W, H] = FORMATS[fmt || $('recFormat')?.value || 'short1080'];
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const rctx = c.getContext('2d');
    const mime = pickMime();
    const vs = c.captureStream(60), tracks = [...vs.getVideoTracks()];
    const as = audio.stream; if (as) tracks.push(...as.getAudioTracks());
    let recorder;
    try { recorder = new MediaRecorder(new MediaStream(tracks), {mimeType: mime || undefined, videoBitsPerSecond: bps || (W >= 1080 ? 10e6 : 6e6), audioBitsPerSecond: 160000}); }
    catch (e) { toast('Видео жазуды бастау мүмкін болмады: ' + e.message); return false; }
    const chunks = []; recorder.ondataavailable = e => e.data?.size && chunks.push(e.data);
    rec = {t0: performance.now(), canvas: c, ctx: rctx, recorder, chunks, w: W, h: H, mime: recorder.mimeType || mime || 'video/webm', save: false};
    recorder.onstop = () => { const r = rec; rec = null; setRecIndicator(false); if (r?.save && r.chunks.length) (r.deliver || deliver)(r); };
    recorder.start(250); setRecIndicator(true);
    drawRec();
    return true;
  }

  function stopRecording(save) {
    if (!rec) return;
    rec.save = save; try { rec.recorder.state !== 'inactive' && rec.recorder.stop(); } catch { rec = null; setRecIndicator(false); }
  }
  function cancelRecording() { if (rec) { const r = rec; r.save = false; try { r.recorder.stop(); } catch {} rec = null; setRecIndicator(false); } }
  function hookOverlay(c, w, h) { // Shorts-тың алғашқы секундтары: көрерменді сұрақпен ұстап алу
    if (!world || mode !== 'race' || sessionOn || (world.phase !== 'intro' && !(world.phase === 'countdown' && world.phaseT < 1.2))) return;
    const A = world.cars[0].spec.car, B = world.cars[1]?.spec.car; if (!B) return;
    const u = Math.min(w / 1080, h / 1920 * 1.1), a = Math.min(1, (world.phase === 'intro' ? world.phaseT : 0) / .3 + (world.phase === 'countdown' ? 1 - world.phaseT / 1.2 : 0));
    c.save(); c.globalAlpha = Math.max(0, Math.min(1, a)); c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
    const line = (t, y, sz, col) => { c.font = `900 ${sz}px "Segoe UI", system-ui, Arial, sans-serif`; while (c.measureText(t).width > w * .92 && sz > 16) { sz -= 2; c.font = `900 ${sz}px "Segoe UI", system-ui, Arial, sans-serif`; } c.lineWidth = sz * .16; c.strokeStyle = 'rgba(0,0,0,.75)'; c.strokeText(t, w / 2, y); c.fillStyle = col; c.fillText(t, w / 2, y); };
    line('WHO WINS? 🏁', h * .335, 92 * u, '#ffffff'); line(`${A.make} ${A.model} or ${B.make} ${B.model}`.replace(/\s*\(\d{4}\)/g, ''), h * .375, 38 * u, '#ffe08a'); line('Comment your pick 👇', h * .41, 44 * u, '#7fd6ff');
    c.restore();
  }
  function drawRec() { if (!rec) return; if (card) card(rec.ctx, rec.w, rec.h); else if (rec.animal) drawAnimalRace(rec.ctx, rec.w, rec.h, an.S, {}); else if (rec.crash) drawCrash(rec.ctx, rec.w, rec.h, rec.crash, crash.tv, crashOpts()); else if (world) { drawRace(rec.ctx, rec.w, rec.h, world); overlay?.(rec.ctx, rec.w, rec.h); hookOverlay(rec.ctx, rec.w, rec.h); } }
  function setRecIndicator(on) { const el = $('recIndicator'); if (el) el.hidden = !on; if (!on && !sessionOn) { const b = $('trProg'); if (b) b.hidden = true; } }
  // Жеке жарыс жазылып жатқанда: пайыз және қалған уақыт (турнирде оны tournament.js көрсетеді)
  let progAt = 0;
  function recProgress(now) {
    if (sessionOn || !rec || !world || now - progAt < 250) return; progAt = now;
    const w = world, D = w.D, lead = Math.max(...w.cars.map(c => c.st.x)), frac = clamp(lead / D, 0, 1), est0 = 14 * Math.pow(D / 402.34, .75), rh = resultHold, el = (now - rec.t0) / 1000;
    const raceRemain = w.phase === 'race' ? Math.max(0, (frac > .12 ? w.clock / frac * .85 : est0) - w.clock) : est0;
    const remain = w.phase === 'intro' ? Math.max(0, 1.6 - w.phaseT) + 2.7 + est0 + 1.5 + rh
      : w.phase === 'countdown' ? Math.max(0, 2.7 - w.phaseT) + est0 + 1.5 + rh
      : w.phase === 'race' ? raceRemain + 1.5 + rh
      : w.phase === 'finish' ? Math.max(0, 1.5 - w.phaseT) + rh : Math.max(0, rh - w.resultT) + .45;
    const pct = Math.min(99, Math.round(el / (el + remain) * 100)), box = $('trProg');
    if (!box) return; box.hidden = false; $('trProgFill').style.width = pct + '%';
    $('trProgText').textContent = `Жазылуда: ${pct}% · қалды ~${Math.floor(remain / 60)}:${String(Math.floor(remain % 60)).padStart(2, '0')}`;
  }

  let lastIds = null, lastBlob = null, autoUploadHook = () => {};
  function deliver(r) {
    if (r.animal) return deliverAnimal(r);
    if (r.crash) return deliverCrash(r);
    const blob = new Blob(r.chunks, {type: r.mime.split(';')[0]}), url = URL.createObjectURL(blob);
    const ext = r.mime.includes('mp4') ? 'mp4' : 'webm', w = world, A = w.cars[0].spec.car, B = w.cars[1].spec.car;
    lastIds = [A.id, B.id]; lastBlob = blob; lastTags = null;
    const name = `drivevault-${A.make}-${A.model}-vs-${B.make}-${B.model}-${Math.round(w.D)}m`.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.' + ext;
    const vid = $('videoPreview'); if (vid.dataset.url) URL.revokeObjectURL(vid.dataset.url);
    vid.src = url; vid.dataset.url = url; $('videoDownload').href = url; $('videoDownload').download = name;
    const R = w.result, win = R.winner >= 0 ? w.cars[R.winner].spec.car : null;
    const title = `${A.make} ${A.model} vs ${B.make} ${B.model} 🏁 Who Wins the ${Math.round(w.D)} m Drag Race? | AI Simulation #Shorts`;
    const desc = [
      `${A.make} ${A.model} (${A.hp} hp, ${A.weight} kg) vs ${B.make} ${B.model} (${B.hp} hp, ${B.weight} kg)`,
      win ? `🏆 Winner: ${win.make} ${win.model} by ${R.margin.time.toFixed(3)} s` : '🏁 Dead heat!',
      `Time: ${R.rows[0].fin.toFixed(2)} s vs ${R.rows[1].fin.toFixed(2)} s (ET ${R.rows[0].et.toFixed(2)} / ${R.rows[1].et.toFixed(2)}) · Trap: ${Math.round(R.rows[0].trap)} vs ${Math.round(R.rows[1].trap)} km/h`,
      '', '🔔 Subscribe so you do not miss the next videos! / Подпишись, чтобы не пропустить другие видео!', '💬 Want other cars to race? Write the names in the comments! / Хотите другие машины? Напишите названия в комментариях!', '❓ Which cars in the NEXT video? / Какие машины в следующем видео?',
      '', 'AI Simulation: computer-generated physics race based on catalog power, weight and 0–100 data. Not a real race and not real footage.', '#Shorts #DragRace #CarRace #' + A.make.replace(/\W/g, '') + ' #' + B.make.replace(/\W/g, '')
    ].join('\n');
    $('videoMeta').value = `${title}\n\n${desc}`;
    $('videoInfo').textContent = `${r.w}×${r.h} · ${ext.toUpperCase()} · ${(blob.size / 1048576).toFixed(1)} МБ · ${(w.clock + 9).toFixed(0)} с шамасы`;
    $('videoOut').dataset.has = '1'; $('videoOut').hidden = false; $('videoOut').scrollIntoView({behavior: 'smooth', block: 'nearest'});
    document.dispatchEvent(new CustomEvent('dv:recorded', {detail: {ids: [A.id, B.id]}}));
    toast('Видео дайын!'); autoUploadHook();
  }

  function deliverCrash(r) {
    const S = r.crash, A = S.A, B = S.B, blob = new Blob(r.chunks, {type: r.mime.split(';')[0]}), url = URL.createObjectURL(blob), ext = r.mime.includes('mp4') ? 'mp4' : 'webm';
    const nm = c => `${c.make} ${c.model}`.replace(/\s*\(\d{4}\)$/, ''), v = Math.round(S.speedA), mA = S.sumA, mB = S.sumB;
    const title = S.head ? `${nm(A)} vs ${nm(B)} HEAD-ON at ${v}+${v} km/h 💥 Who Survives? | Crash Test Simulation #Shorts`
      : `${nm(A)} crash test at ${v} km/h 💥 ${S.scenario === 'pole' ? 'into a pole' : S.scenario === 'offset' ? '40% offset' : 'into a wall'} | Crash Test Simulation #Shorts`;
    const line = (c, m) => `${nm(c)} (${c.hp} hp, ${c.weight} kg): ${m.stars}/5 stars, score ${m.score}/100 · ΔV ${m.dV.toFixed(0)} km/h · peak ${m.peak.toFixed(0)} g · front crush ${(m.crush * 100).toFixed(0)} cm · cabin intrusion ${(m.intrusion * 100).toFixed(0)} cm · ${m.verdict}`;
    const desc = [S.head ? `Head-on collision at ${v} km/h each: ${nm(A)} vs ${nm(B)}.` : `${nm(A)} hits ${S.scenario === 'pole' ? 'a narrow pole' : S.scenario === 'offset' ? 'a 40% offset barrier' : 'a rigid barrier'} at ${v} km/h.`, '', line(A, mA), ...(mB ? [line(B, mB)] : []), '',
      '🔔 Subscribe so you do not miss the next crash tests! / Подпишись, чтобы не пропустить другие краш-тесты!', '💬 Which car should we crash next? Write the name in the comments! / Какую машину разбить следующей? Напишите в комментариях!', '',
      'Physics-based AI simulation (momentum and energy conserved, crush zone + restraint model). Not real footage and not an official Euro NCAP / IIHS rating.', '#Shorts #CrashTest #CarCrash #' + A.make.replace(/\W/g, '')].join('\n');
    lastIds = 'skip'; lastBlob = blob; lastTags = ['Crash Test', 'Car Crash', 'Crash Simulation', 'AI Simulation', 'Shorts', A.make, A.model, ...(B ? [B.make, B.model] : [])].slice(0, 15);
    const vid = $('videoPreview'); if (vid.dataset.url) URL.revokeObjectURL(vid.dataset.url);
    vid.src = url; vid.dataset.url = url; $('videoDownload').href = url; $('videoDownload').download = ('drivevault-crash-' + nm(A) + '-' + v).toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.' + ext;
    $('videoMeta').value = `${title}\n\n${desc}`; $('videoInfo').textContent = `${r.w}×${r.h} · ${ext.toUpperCase()} · ${(blob.size / 1048576).toFixed(1)} МБ · краш-тест`;
    $('videoOut').dataset.has = '1'; $('videoOut').hidden = false; $('videoOut').scrollIntoView({behavior: 'smooth', block: 'nearest'});
    toast('Краш-тест видеосы дайын!'); autoUploadHook();
  }

  // ---------------------------------------------------------------- иттер / жануарлар жарысы
  const AN_IDS = ['anA', 'anB', 'anC', 'anD'];
  const availAnimals = () => { const l = ANIMALS.filter(a => SPR[a.id]); return l.length >= 2 ? l : ANIMALS; }; // тек нақты видеодан алынған жануарлар
  function fillAnimals(keep) {
    const cat = $('anCat').value, list = availAnimals().filter(a => cat === 'all' || a.kind === cat), def = {all: ['greyhound', 'cheetah', 'whippet', 'wolf'], dog: ['greyhound', 'whippet', 'doberman', 'dalmatian'], wild: ['cheetah', 'jaguar', 'leopard', 'wolf']}[cat].filter(id => list.some(a => a.id === id)); while (def.length < 4) def.push(list[def.length % list.length].id);
    AN_IDS.forEach((id, i) => { const el = $(id), cur = keep ? el.value : null;
      el.innerHTML = (cat === 'all' ? ['dog', 'wild'] : [cat]).map(kd => `<optgroup label="${kd === 'dog' ? '🐕 Иттер' : '🐆 Жануарлар'}">` + list.filter(a => a.kind === kd).map(a => `<option value="${a.id}">${a.name} · ${a.kmh} км/сағ</option>`).join('') + '</optgroup>').join('');
      el.value = list.some(a => a.id === cur) ? cur : def[i]; });
  }
  function syncAnimalCount() { const n = +$('anCount').value; $('anLC').hidden = n < 3; $('anLD').hidden = n < 4; }
  function animalIds() { return AN_IDS.slice(0, +$('anCount').value).map(id => $(id).value); }
  function buildAnimal() { an.S = makeRace(animalIds(), +$('anDist').value); }
  fillAnimals(false); syncAnimalCount();
  loadSprites('assets/animals/', () => { if (mode === 'animal' && !running) draw(); }).then(() => { fillAnimals(false); if (mode === 'animal' && !running) reset(); });
  $('anCat').onchange = () => { fillAnimals(false); if (!running) reset(); };
  $('anCount').onchange = () => { syncAnimalCount(); if (!running) reset(); };
  [...AN_IDS, 'anDist'].forEach(id => $(id).onchange = () => { if (!running) reset(); });
  $('anShuffle').onclick = () => {
    const cat = $('anCat').value, pool = availAnimals().filter(a => cat === 'all' || a.kind === cat).sort(() => Math.random() - .5);
    AN_IDS.forEach((id, i) => { $(id).value = pool[i % pool.length].id; }); if (!running) reset();
  };
  async function startAnimal(run, record) {
    await audio.resume();
    if (record) { const ok = await startRecording(); if (!ok) { $('gameStart').disabled = false; $('gameRecord').disabled = false; return; } rec.animal = an.S; }
    if (run !== token) return;
    setStatus('RACE'); running = true; last = performance.now(); raf = nextFrame();
  }
  function updateAnimal(dt) {
    const S = an.S; S.step(dt);
    while (S.events.length) {
      const e = S.events.shift();
      if (e.t === 'count') audio.beep(520, .22, .4);
      else if (e.t === 'go') { audio.beep(1040, .6, .45); audio.bark(1, .6); }
      else if (e.t === 'fin') audio.bark(.9 + Math.random() * .3, .45);
      else if (e.t === 'step') audio.thud(.05 + .07 * Math.min(1, e.v / 25), 80 + e.v * 2);
    }
  }
  function deliverAnimal(r) {
    const S = r.animal, R = S.result, blob = new Blob(r.chunks, {type: r.mime.split(';')[0]}), url = URL.createObjectURL(blob), ext = r.mime.includes('mp4') ? 'mp4' : 'webm';
    const names = S.list.map(a => a.name), emo = S.list.some(a => a.kind === 'dog') ? '🐕' : '🐆', D = Math.round(S.D);
    lastIds = 'skip'; lastBlob = blob; lastTags = ['Dog Race', 'Animal Race', 'Fastest Animals', 'Speed Comparison', 'Simulation', 'Shorts', ...names].slice(0, 15);
    const title = `${names.join(' vs ')} ${emo} Who Wins the ${D} m Race? | Real Speed Data #Shorts`.slice(0, 100);
    const rows = R.rows.map((x, i) => `${i + 1}. ${x.a.name} — ${x.fin != null ? x.fin.toFixed(2) + ' s' : '-' + x.gap.toFixed(0) + ' m'} (avg ${x.avg.toFixed(0)} km/h, peak ${x.top.toFixed(0)} km/h, real top speed ≈ ${x.a.kmh} km/h)`);
    const desc = [`${names.join(' vs ')} — ${D} m sprint.`, `🏆 Winner: ${R.winner.a.name}${R.margin != null ? ' by ' + R.margin.toFixed(2) + ' s' : ''}`, '', ...rows, '',
      '🔔 Subscribe so you do not miss the next races! / Подпишись, чтобы не пропустить новые забеги!', '💬 Which animals or dog breeds should race next? Write them in the comments! / Какие породы или животные бегут следующими? Пишите в комментариях!', '',
      'Computer-generated animation based on real top-speed data (acceleration and endurance are modelled). Not real footage.', '#Shorts #DogRace #AnimalRace #Cheetah #Greyhound'].join('\n');
    const vid = $('videoPreview'); if (vid.dataset.url) URL.revokeObjectURL(vid.dataset.url);
    vid.src = url; vid.dataset.url = url; $('videoDownload').href = url; $('videoDownload').download = ('drivevault-' + names.join('-vs-') + '-' + D + 'm').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.' + ext;
    $('videoMeta').value = `${title}\n\n${desc}`; $('videoInfo').textContent = `${r.w}×${r.h} · ${ext.toUpperCase()} · ${(blob.size / 1048576).toFixed(1)} МБ · жануарлар жарысы`;
    $('videoOut').dataset.has = '1'; $('videoOut').hidden = false; $('videoOut').scrollIntoView({behavior: 'smooth', block: 'nearest'});
    toast('Жарыс видеосы дайын!'); autoUploadHook();
  }

  function toast(text) { const el = $('toast'); if (!el) return; el.textContent = text; el.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 3200); }

  // ---------------------------------------------------------------- краш режимі
  const CRASH_HOOKS = ['Can it survive? 👇 Comment a car to crash next', 'Would YOU survive this? 😱', 'Watch the front crumple — frame by frame'];
  function crashCars() { const c = getCars(), sc = $('barrierType').value, head = !SCENARIOS[sc]?.wall; return {A: c.A, B: head ? c.B : null, sc, head, speed: +$('crashSpeed').value}; }
  function buildCrash() {
    const k = crashCars(), key = [k.A.id, k.A.model, k.B?.id, k.B?.model, k.sc, k.speed].join('|');
    if (crash.sim && crash.key === key) return crash.sim;
    crash.key = key; crash.sim = simulate({A: k.A, B: k.B, speedA: k.speed, speedB: k.speed, scenario: k.sc}); return crash.sim;
  }
  function crashOpts() {
    const k = crashCars(), pa = cachedPhoto(k.A), pb = k.B ? cachedPhoto(k.B) : null, pal = k.B ? [pa?.color || '#2f8fe0', pb?.color || '#e0463a'] : [pa?.color || pickPaints(k.A, k.A)[0]];
    if (k.B && pal[0] === pal[1]) pal[1] = '#e0463a';
    [k.A, k.B].forEach(c => { if (c && !cachedPhoto(c) && !crash.loading?.has(c.id)) { (crash.loading ||= new Set()).add(c.id); loadCarPhoto(c).then(() => { crash.loading.delete(c.id); if (!running) draw(); }); } });
    return {photos: [pa?.img || null, pb?.img || null], colors: pal, hook: CRASH_HOOKS[(k.speed + (k.A.id | 0)) % CRASH_HOOKS.length]};
  }
  async function startCrash(run, record = false) {
    await audio.resume(); buildCrash();
    if (record) { const ok = await startRecording(); if (!ok) { $('gameStart').disabled = false; $('gameRecord').disabled = false; return; } rec.crash = crash.sim; }
    if (run !== token) return;
    $('crashPanel').hidden = true; crash.tv = 0; crash.done = false; crash.hit = false; crash.whoosh = false; setStatus('CRASH TEST'); running = true; last = performance.now(); raf = nextFrame();
  }

  function updateCrash(dt) {
    const S = buildCrash(), tl = timeline(S);
    if (!crash.whoosh) { crash.whoosh = true; audio.whoosh?.(.35, 1.3); }
    crash.tv += dt;
    if (!crash.hit && crash.tv >= tl.T1) { crash.hit = true; audio.crashHit?.(Math.min(1, Math.max(S.speedA, S.speedB) / 120)); setStatus('IMPACT'); }
    if (crash.tv >= tl.total) { crash.tv = tl.total; crash.done = true; }
  }

  function finishCrash() {
    $('gameStart').disabled = false; $('gameRecord').disabled = false; setStatus('ТЕСТ АЯҚТАЛДЫ');
    const S = crash.sim, m = S.sumA;
    $('gameResults').innerHTML = `<div class="crash-stat"><div><b>${m.stars}★ · ${m.score}/100</b><span>Қауіпсіздік бағасы</span></div><div><b>${(m.crush * 100).toFixed(0)} см</b><span>Алдыңғы деформация</span></div><div><b>${m.peak.toFixed(0)} g</b><span>Ең үлкен тежелу</span></div><div><b>${m.dV.toFixed(0)} км/сағ</b><span>Жылдамдық өзгерісі (ΔV)</span></div></div>`;
  }

  // ---------------------------------------------------------------- сурет салу
  function resize() {
    const rect = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr); canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); draw();
  }

  function draw() {
    if (!canvas.width || (mode === 'race' && !world)) return;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    ctx.save(); ctx.clearRect(0, 0, w, h);
    if (card) { card(ctx, w, h); ctx.restore(); return; }
    if (mode === 'race') {
      world.hud = showHud; world.T = lang();
      drawRace(ctx, w, h, world); overlay?.(ctx, w, h);
    } else if (mode === 'animal') { if (an.S) drawAnimalRace(ctx, w, h, an.S, {}); }
    else drawCrash(ctx, w, h, buildCrash(), crash.tv, crashOpts());
    ctx.restore();
  }

  // ---------------------------------------------------------------- оқиғалар
  function applyView() {
    const portrait = ($('recFormat')?.value || 'short1080').startsWith('short');
    shell.classList.toggle('portrait', portrait);
    setTimeout(resize, 30);
  }

  addEventListener('keydown', e => {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target; if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return; // жазып жатқанда H/F іске қосылмасын
    if (e.code === 'KeyH') $('gameHudToggle').click();
    if (e.code === 'KeyF') $('gameFullscreen').click();
  });
  addEventListener('resize', resize);
  $('raceMode').onclick = () => setMode('race'); $('crashMode').onclick = () => setMode('crash'); $('animalMode').onclick = () => setMode('animal');
  $('gameStart').onclick = () => start(false);
  $('gameRecord').onclick = () => start(true);
  $('gameReset').onclick = reset;
  $('gameHudToggle').onclick = () => { showHud = !showHud; $('gameHudToggle').textContent = showHud ? '🎥 HUD' : 'HUD ҚОСУ'; draw(); };
  $('gameFullscreen').onclick = () => { if (!document.fullscreenElement) shell.requestFullscreen?.(); else document.exitFullscreen?.(); };
  document.addEventListener('fullscreenchange', () => setTimeout(resize, 80));
  $('crashSpeed').oninput = e => { $('crashSpeedValue').textContent = e.target.value; if (!running) reset(); };
  $('barrierType').onchange = reset;
  ['raceDistance', 'raceLang'].forEach(id => $(id).onchange = reset);
  $('recFormat').onchange = () => { applyView(); };
  // ---- Өз музыка файлым (барлық жарыста қолданылады)
  const DEF_NAME = 'Өз Phonk музыкамыз (ішкі, авторлық құқықсыз)';
  const showMusic = name => { $('musicName').textContent = `🎵 ${name || DEF_NAME}`; $('musicClear').hidden = !name; };
  const useDefault = async () => { await audio.setMusicFile(null); showMusic(null); };
  loadTrack().then(async rec => { if (rec?.name && /fassounds|sue-phonk/i.test(rec.name)) { await clearTrack(); rec = null; } if (!rec?.data) return useDefault(); try { await audio.setMusicFile(await rec.data.arrayBuffer()); showMusic(rec.name); } catch { useDefault(); } }, useDefault);
  $('musicOn').checked = audio.musicEnabled; $('musicOn').onchange = e => audio.setMusicEnabled(e.target.checked);
  $('musicBtn').onclick = () => $('musicFile').click();
  $('musicFile').onchange = async () => {
    const f = $('musicFile').files[0]; if (!f) return;
    try { await audio.setMusicFile(await f.arrayBuffer()); await saveTrack(f); showMusic(f.name); toast('Музыка қойылды: барлық жарыстарда ойнайды'); }
    catch { showMusic(null); toast('Бұл файлды ашу мүмкін болмады (mp3/wav/m4a қолданыңыз)'); }
    $('musicFile').value = '';
  };
  $('musicClear').onclick = async () => { await clearTrack(); await useDefault(); toast('Ішкі Phonk музыкаға оралдық'); };
  // ---- YouTube аккаунттары (бірнеше аккаунт): тізім браузерде сақталады
  const YT_KEY = 'drivevault-yt-accounts';
  const ytLoad = () => { try { return JSON.parse(localStorage.getItem(YT_KEY)) || {list: [], sel: 0}; } catch { return {list: [], sel: 0}; } };
  const ytSave = d => { try { localStorage.setItem(YT_KEY, JSON.stringify(d)); } catch {} };
  const ytUrl = a => !a ? 'https://www.youtube.com/upload'
    : /^UC[\w-]{20,}$/.test(a.ref) ? `https://studio.youtube.com/channel/${a.ref}/videos/upload?d=ud`
    : `https://www.youtube.com/upload?authuser=${encodeURIComponent(a.ref)}`;
  function ytRender() {
    const d = ytLoad(), s = $('ytAccount'); if (!s) return;
    s.innerHTML = d.list.length ? d.list.map((a, i) => `<option value="${i}">${a.name.replace(/</g, '&lt;')}</option>`).join('') : '<option value="-1">Аккаунт қосылмаған (әдепкі)</option>';
    s.value = String(d.list.length ? Math.min(d.sel, d.list.length - 1) : -1);
  }
  $('ytAccount').onchange = () => { const d = ytLoad(); d.sel = +$('ytAccount').value; ytSave(d); };
  $('ytAdd').onclick = () => {
    const name = prompt('Аккаунт атауы (өзіңізге түсінікті, мыс. «Негізгі арна»):'); if (!name) return;
    const ref = prompt('Аккаунт email-і НЕМЕСЕ арна ID (UC... деп басталады) НЕМЕСЕ Google аккаунт нөмірі (0, 1, 2...):'); if (!ref) return;
    const d = ytLoad(); d.list.push({name: name.trim(), ref: ref.trim()}); d.sel = d.list.length - 1; ytSave(d); ytRender();
  };
  $('ytDel').onclick = () => { const d = ytLoad(); if (!d.list.length) return; d.list.splice(Math.min(d.sel, d.list.length - 1), 1); d.sel = 0; ytSave(d); ytRender(); };
  $('ytUpload').onclick = async () => {
    const d = ytLoad(), a = d.list[Math.min(d.sel, d.list.length - 1)];
    $('videoDownload').click();
    try { await navigator.clipboard.writeText($('videoMeta').value); } catch {}
    window.open(ytUrl(a), '_blank', 'noopener');
    document.dispatchEvent(new CustomEvent('dv:uploaded', {detail: {ids: lastIds}}));
    toast(a ? `«${a.name}» аккаунтының жүктеу беті ашылды. Файлды сүйреп тастаңыз, атауын қойыңыз.` : 'YouTube жүктеу беті ашылды');
  };
  ytRender();
  // ---- Тікелей жүктеу (YouTube Data API)
  const ytStatus = (m, err) => { const el = $('ytStatus'); el.textContent = ''; el.classList.toggle('err', !!err); if (m instanceof Node) el.appendChild(m); else el.textContent = m; };
  const refreshClient = () => { if (!YT.getClientId()) ytStatus(`Алдымен бір рет «Client ID баптау» түймесін басыңыз. Google Cloud → Authorized JavaScript origins ішіне осы адрес қосылуы керек: ${location.origin}`); else if (!$('ytStatus').textContent) ytStatus('Дайын: түймені басып, қажетті Google аккаунтты таңдаңыз.'); };
  $('ytClient').onclick = () => {
    const v = prompt('Google Cloud → Credentials → OAuth client ID (Web application) мәнін қойыңыз. Authorized origins ішінде болуы керек адрес: ' + location.origin, YT.getClientId());
    if (v === null) return; YT.setClientId(v); $('ytStatus').textContent = ''; refreshClient();
  };
  async function doUpload(interactive) {
    if (!lastBlob || uploading) return;
    if (!YT.getClientId()) { if (!interactive) return; $('ytClient').click(); if (!YT.getClientId()) return; }
    if (!interactive && !YT.hasToken() && !YT.rememberedAccount()) return ytStatus('Бірінші рет «Google аккаунт таңдап жүктеу» түймесін басыңыз. Бір рет растасаңыз, келесі видеолар сұраусыз жүктеледі.');
    const btn = $('ytAuto'); btn.disabled = true; uploading = true;
    try {
      if (!YT.hasToken()) ytStatus(YT.rememberedAccount() ? 'Сақталған аккаунтпен кіру…' : 'Google аккаунт таңдау терезесі ашылды…');
      const tok = await YT.signIn(false), ch = await YT.channelInfo(tok);
      const [title, ...rest] = $('videoMeta').value.split(String.fromCharCode(10)), description = rest.join(String.fromCharCode(10)).trim();
      $('ytBar').hidden = false; $('ytBarFill').style.width = '0%';
      ytStatus(`Арна: «${ch.title}». Жүктеліп жатыр…`);
      const out = await YT.uploadVideo(tok, lastBlob, {title, description, tags: lastTags || ['Shorts', 'DragRace', 'AI Simulation', 'CarRace'], privacy: $('ytPrivacy').value, onProgress: p => { $('ytBarFill').style.width = (p * 100).toFixed(0) + '%'; }});
      const box = document.createElement('span'); box.append(`✅ «${ch.title}» арнасына жүктелді. `);
      box.append(Object.assign(document.createElement('a'), {href: out.url, target: '_blank', rel: 'noopener', textContent: 'Видеоны ашу'}), ' · ', Object.assign(document.createElement('a'), {href: out.studio, target: '_blank', rel: 'noopener', textContent: 'Studio-да өзгерту'}));
      ytStatus(box);
      document.dispatchEvent(new CustomEvent('dv:uploaded', {detail: {ids: lastIds}}));
      // жадты босату: видео тек YouTube-та қалады
      const vid = $('videoPreview'); if (vid.dataset.url) URL.revokeObjectURL(vid.dataset.url); vid.removeAttribute('src'); vid.load(); vid.dataset.url = ''; $('videoDownload').removeAttribute('href'); lastBlob = null;
      toast('Видео YouTube-қа жүктелді, компьютерде сақталмады.');
    } catch (e) { ytStatus('❌ ' + (e.message || e) + ' (видео жадта тұр; «Google аккаунт таңдап жүктеу» түймесін бір рет басыңыз)', true); document.dispatchEvent(new CustomEvent('dv:uploadfail', {detail: {error: String(e.message || e)}})); } finally { btn.disabled = false; uploading = false; }
  }
  let uploading = false;
  $('ytAuto').onclick = () => doUpload(true);
  $('ytForget')?.addEventListener('click', () => { YT.forgetAccount(); ytStatus('Сақталған аккаунт ұмытылды. Келесі жүктеуде аккаунт қайта таңдалады.'); });
  try { $('ytAutoUp').checked = localStorage.getItem('drivevault-yt-autoup') !== '0'; } catch {}
  $('ytAutoUp').onchange = () => { try { localStorage.setItem('drivevault-yt-autoup', $('ytAutoUp').checked ? '1' : '0'); } catch {} };
  autoUploadHook = () => { if ($('ytAutoUp').checked) doUpload(false); };
  refreshClient();
  $('copyMeta').onclick = async () => { try { await navigator.clipboard.writeText($('videoMeta').value); toast('Атау мен сипаттама көшірілді'); } catch { $('videoMeta').select(); document.execCommand?.('copy'); toast('Көшірілді'); } };
  applyView(); resize(); reset();

  // ---------------------------------------------------------------- турнир API (tournament.js қолданады)
  const tournament = {
    get alive() { return sessionOn; },
    get recTime() { return rec ? (performance.now() - rec.t0) / 1000 : 0; },
    wait: ms => new Promise(r => wTimeout(r, ms)),
    setCard(fn) { card = fn; if (fn && !cardLoopOn) { cardLoopOn = true; const lp = () => { if (!card) { cardLoopOn = false; return; } draw(); drawRec(); wTimeout(lp, 33); }; lp(); } },
    setOverlay(fn) { overlay = fn; },
    async begin(fmt, bps) {
      setMode('race'); await audio.resume(); sessionOn = true; keepMusic = true; resultHold = 2.4;
      const ok = await startRecording(fmt, bps);
      if (!ok) { this.finish(); return false; }
      rec.t0 = performance.now(); audio.startMusic(); $('gameStart').disabled = true; $('gameRecord').disabled = true;
      return true;
    },
    async playMatch(a, b) {
      forced = {A: a, B: b}; reset(); await audio.resume(); audio.setup(world.cars.map(c => c.spec), true); audio.startMusic();
      world.phase = 'intro'; world.phaseT = 0; running = true; last = performance.now(); raf = nextFrame();
      return new Promise(res => { matchDone = res; });
    },
    /** n көлік бір уақытта: list — көліктер, colors — әр көліктің түсі, dist — қашықтық (м). */
    async playGrid(list, colors, dist) {
      forced = list.length === 2 ? {A: list[0], B: list[1], dist} : {list, colors, dist}; reset(); await audio.resume(); audio.setup(world.cars.map(c => c.spec), true); audio.startMusic();
      world.phase = 'intro'; world.phaseT = 0; running = true; last = performance.now(); raf = nextFrame();
      return new Promise(res => { matchDone = res; });
    },
    /** Жазуды тоқтатып, видеоны deliverFn арқылы өңдейді. Promise видео дайын болғанда аяқталады. */
    end(deliverFn) {
      return new Promise(res => {
        if (!rec) { res(false); return; }
        rec.deliver = r => { deliverFn(r); res(true); };
        card = null; overlay = null; stopRecording(true);
      });
    },
    finish() {
      if (matchDone) { const f = matchDone; matchDone = null; f(null); }
      card = null; overlay = null; sessionOn = false; keepMusic = false; resultHold = 5.4; forced = null; audio.stopMusic(1.2);
      setTimeout(() => reset(), 100);
    },
    deliver(r, meta) {
      const blob = new Blob(r.chunks, {type: r.mime.split(';')[0]}), url = URL.createObjectURL(blob), ext = r.mime.includes('mp4') ? 'mp4' : 'webm';
      lastIds = 'skip'; lastBlob = blob; lastTags = meta.tags;
      const vid = $('videoPreview'); if (vid.dataset.url) URL.revokeObjectURL(vid.dataset.url);
      vid.src = url; vid.dataset.url = url; $('videoDownload').href = url; $('videoDownload').download = 'drivevault-tournament.' + ext;
      $('videoMeta').value = `${meta.title}\n\n${meta.description}`;
      $('videoInfo').textContent = `${r.w}×${r.h} · ${ext.toUpperCase()} · ${(blob.size / 1048576).toFixed(0)} МБ · ${Math.round(meta.seconds)} с (турнир)`;
      $('videoOut').dataset.has = '1'; $('videoOut').hidden = false;
      toast('Турнир видеосы дайын!'); autoUploadHook();
    }
  };
  return {reset, setMode, get world() { return world; }, tick, audio, tournament};
}
