import {makeSpec, newState, step, vehiclePerformance, clamp, lerp, KMH100, QUARTER_MILE} from './physics.js';
import {createAudio} from './audio.js';
import * as YT from './youtube.js';
import {loadCarPhoto, cachedPhoto} from './photos.js';
import {drawRace, LANES, pickPaints} from './render.js';

export {vehiclePerformance};

const $ = id => document.getElementById(id);

export function crashMetrics(car, speedKmh, barrier = 'wall') {
  const speed = speedKmh / 3.6;
  const energy = .5 * car.weight * speed * speed / 1000;
  const factor = barrier === 'pole' ? 1.5 : barrier === 'offset' ? 1.22 : 1;
  const deformation = clamp((speedKmh / 200) * 0.95 * factor, .12, .98);
  const crushDistance = .28 + deformation * .72;
  const force = energy * 1000 / crushDistance / 1000;
  return {energy: Math.round(energy), deformation: Math.round(deformation * 100), force: Math.round(force)};
}

export const TEXT = {
  kk: {hp: 'А.К.', kg: 'КГ', z100: '0–100', kmh: 'КМ/САҒ', m: 'М', s: 'С', winner: 'ЖЕҢІМПАЗ', draw: 'ТЕҢ ТҮСТІ', by: 'айырма', et: 'Өту уақыты (ET)', trap: 'Мәредегі жылдамдық', t100: '0–100 км/сағ', rt: 'Реакция', go: 'ЖҮР!', ready: 'ДАЙЫН', finish: 'МӘРЕ!', cta: 'Жазыл — келесі жарыс сенікі!', race: 'жарыс', ytTitle: 'Drag Race'},
  ru: {hp: 'Л.С.', kg: 'КГ', z100: '0–100', kmh: 'КМ/Ч', m: 'М', s: 'С', winner: 'ПОБЕДИТЕЛЬ', draw: 'НИЧЬЯ', by: 'отрыв', et: 'Время заезда (ET)', trap: 'Скорость на финише', t100: '0–100 км/ч', rt: 'Реакция', go: 'ГО!', ready: 'ГОТОВ', finish: 'ФИНИШ!', cta: 'Подпишись — следующая гонка!', race: 'гонка', ytTitle: 'Драг-рейсинг'},
  en: {hp: 'HP', kg: 'KG', z100: '0–100', kmh: 'KM/H', m: 'M', s: 'S', winner: 'WINNER', draw: 'DEAD HEAT', by: 'margin', et: 'Elapsed time (ET)', trap: 'Trap speed', t100: '0–100 km/h', rt: 'Reaction', go: 'GO!', ready: 'READY', finish: 'FINISH!', cta: 'Subscribe for the next race!', race: 'race', ytTitle: 'Drag Race'}
};
const FORMATS = {short1080: [1080, 1920], short720: [720, 1280], wide1080: [1920, 1080]};
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
  let world = null, crash = {progress: 0, impact: false, particles: [], metrics: null}, shake = 0;
  let rec = null; // {canvas, ctx, recorder, chunks, w, h, mime}
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
    const cars = getCars(), specs = [makeSpec(cars.A), makeSpec(cars.B)], D = distance();
    sequenceCar = specs;
    const w = {
      assets, sprites: specs.map(s => spriteFor(s.car)), paints: pickPaints(specs[0].car, specs[1].car), T: lang(), D, hud: showHud, phase: 'idle', phaseT: 0, time: 0, clock: 0, flash: 0, banner: null, count: null,
      lights: {amber: 0, green: false, show: true}, result: null, resultT: 0, marks: [null, null], smoke: [], slow: 1, slowT: -1, firstIdx: -1, done: false,
      photos: [cachedPhoto(cars.A), cachedPhoto(cars.B)],
      cam: {z: -specs[0].len - 14, H: 16, sx: 0, sy: 0, fov: 0, pitch: 0}, carsLabel: `DriveVault · ${Math.round(D)} ${lang().m}`,
      cars: specs.map(spec => ({spec, st: Object.assign(newState(spec), {rpmHold: 0}), rt: .15 + Math.random() * .16, released: false, finished: false, tCross: 0, et: 0, trap: 0, t100: null, tTrap0: null, xOther: 0, smokeAcc: 0}))
    };
    applyPhotos(w, cars);
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
        const f = (w.D - p.x) / (st.x - p.x), o = w.cars[1 - i], po = prev[1 - i];
        car.finished = true; car.tCross = t0 + h * f; car.et = car.tCross - car.rt;
        car.trap = 20 / Math.max(.01, car.tCross - car.tTrap0) * 3.6;
        car.xOther = lerp(po.x, o.st.x, f);
        if (w.firstIdx < 0) { w.firstIdx = i; w.slowT = 0; w.flash = 1; w.banner = {text: w.T.finish, age: 0, life: 1.6, color: '#fff'}; audio.whoosh(.35, .8); }
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
          [-.8, .8].forEach(o => w.smoke.push({X: LANES[i] + o + (Math.random() - .5) * .4, z: axle + Math.random() * .4, Y: .1 + Math.random() * .2, vx: (Math.random() - .5) * 1.2, vz: st.v * .5 + Math.random(), age: 0, life: 1.4 + Math.random() * 1.1, size0: .45, size1: 2 + Math.random() * 1.8, alpha: clamp(.25 + st.slip * .55, 0, .75)}));
        }
      }
    });
    for (const p of w.smoke) { p.age += dt; p.X += p.vx * dt; p.Y += .35 * dt; p.z += p.vz * dt; p.vz *= Math.exp(-2.4 * dt); }
    w.smoke = w.smoke.filter(p => p.age < p.life).slice(-260);
  }

  function updateCamera(dt) {
    const w = world, cam = w.cam, cars = w.cars;
    const rears = cars.map(c => c.st.x - c.spec.len), trailing = Math.min(...rears), gap = Math.abs(rears[0] - rears[1]);
    // 45° жоғарғы камера: екі көлікті де кадрда ұстайды, арақашықтық артқанда биіктейді
    const front = Math.max(...cars.map(c => c.st.x)), span = front - trailing;
    const hm = ($('recFormat')?.value || 'short1080').startsWith('short') ? 1 : 1.4;
    let Ht = Math.max(9.5, span / 4) * hm;
    if (w.phase === 'intro') { const e = 1 - Math.pow(1 - clamp(w.phaseT / 1.6, 0, 1), 3); Ht = lerp(16, 9.5, e) * hm; }
    cam.H = w.phase === 'intro' || !cam.H ? Ht : cam.H + (Ht - cam.H) * (1 - Math.exp(-dt * 2.5));
    const target = trailing + Math.min(span * .5, cam.H * .6) - cam.H;
    cam.z = w.phase === 'intro' ? target : cam.z + (target - cam.z) * (1 - Math.exp(-dt * 9));
    const lead = Math.max(cars[0].st.v, cars[1].st.v), vf = clamp(lead / 90, 0, 1);
    const launchJolt = w.phase === 'race' ? clamp(1 - w.clock / 1.2, 0, 1) : 0;
    const amp = .35 + 2.4 * vf + 5 * launchJolt;
    const t = w.time;
    cam.sx = (Math.sin(t * 43) + Math.sin(t * 27.3)) * .5 * amp;
    cam.sy = (Math.sin(t * 51 + 1) + Math.sin(t * 33)) * .5 * amp * .8;
    cam.fov = vf * .07;
    const acc = (cars[0].st.accel + cars[1].st.accel) / 2;
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
        if (w.cars.every(c => c.finished)) { w.phase = 'finish'; w.phaseT = 0; }
        else if (w.clock > 90) { w.cars.forEach(c => { if (!c.finished) { c.finished = true; c.et = 90; c.tCross = 90; } }); w.phase = 'finish'; w.phaseT = 0; }
      } else if (w.phase === 'finish') {
        if (w.phaseT > 1.5) { w.phase = 'result'; w.phaseT = 0; w.resultT = 0; w.result = buildResult(); showResults(w.result); }
      } else {
        w.resultT += dt; if (w.resultT > 5.4 && !w.done) { w.done = true; finishSequence(); }
      }
    }
    updateCamera(dt);
    if (w.phase !== 'idle') updateAudio();
    updateStatus();
  }

  function buildResult() {
    const w = world, [a, b] = w.cars;
    const dT = a.tCross - b.tCross, winner = Math.abs(dT) < .0005 ? -1 : dT < 0 ? 0 : 1;
    const wc = winner >= 0 ? w.cars[winner] : null;
    return {
      winner, margin: {time: Math.abs(dT), dist: wc ? Math.max(0, w.D - wc.xOther) : 0},
      rows: w.cars.map(c => ({et: c.et, trap: c.trap, t100: c.t100, rt: c.rt}))
    };
  }

  function showResults(R) {
    const w = world, T = w.T;
    const chip = (i, tag) => { const c = w.cars[i], r = R.rows[i], won = R.winner === i; return `<div class="result-chip${won ? ' win' : ''}"><span>${tag} · ${c.spec.car.make} ${c.spec.car.model}${won ? ' 🏆' : ''}</span><strong>${r.et.toFixed(3)} ${T.s.toLowerCase()}</strong><small>${Math.round(r.trap)} ${T.kmh.toLowerCase()} · 0–100 ${r.t100 ? r.t100.toFixed(2) : '—'} · RT ${r.rt.toFixed(3)}</small></div>`; };
    $('gameResults').innerHTML = chip(0, 'A') + chip(1, 'B');
    $('gameStatus').textContent = R.winner < 0 ? T.draw : T.winner;
  }

  function updateStatus() {
    const w = world, el = $('gameStatus'); if (!el) return;
    const map = {idle: w.T.ready, intro: w.T.ready, countdown: '3 · 2 · 1', race: w.cars[0].st.x >= w.cars[1].st.x ? 'A · P1' : 'B · P1'};
    if (map[w.phase]) el.textContent = map[w.phase];
  }

  function updateAudio() {
    const w = world, on = $('soundToggle')?.classList.contains('on') ?? true;
    audio.setSpeakers?.(on);
    w.cars.forEach((car, i) => {
      const d = Math.max(4, car.st.x - car.spec.len - w.cam.z), level = clamp(Math.pow(8 / d, .6), .3, 1);
      audio.update(i, car.spec, car.st, w.phase === 'result' ? level * clamp(1 - w.resultT / 2.5, 0, 1) : level);
    });
  }

  // ---------------------------------------------------------------- басқару
  function reset() {
    token++; cancelAnimationFrame(raf); running = false; cancelRecording(); audio.teardown(); last = 0; acc = 0; shake = 0;
    if (mode === 'race') world = makeWorld();
    else { const cars = getCars(); sequenceCar = [makeSpec(cars.A)]; crash = {progress: 0, impact: false, particles: [], metrics: null}; }
    $('gameCountdown').classList.remove('show'); $('gameCountdown').textContent = '';
    $('gameMessage').classList.remove('show'); $('gameResults').innerHTML = '';
    $('gameStart').disabled = false; if ($('gameRecord')) $('gameRecord').disabled = false;
    setStatus(TEXT[$('raceLang')?.value || 'kk'].ready); draw();
  }

  function setStatus(text) { $('gameStatus').textContent = text; }
  function setMessage(text, delay = 1400) {
    const el = $('gameMessage'); el.textContent = text; el.classList.add('show');
    if (delay) setTimeout(() => el.textContent === text && el.classList.remove('show'), delay);
  }

  function setMode(next) {
    mode = next; shell.classList.toggle('crash-active', mode === 'crash');
    $('raceMode').classList.toggle('active', mode === 'race'); $('crashMode').classList.toggle('active', mode === 'crash');
    $('crashPanel').hidden = mode !== 'crash'; $('raceOptions').hidden = mode !== 'race'; $('controlHelp').hidden = mode !== 'race';
    $('gameRecord').hidden = mode !== 'race'; $('videoOut').hidden = mode !== 'race' || !$('videoOut').dataset.has;
    $('gameStart').innerHTML = mode === 'race' ? 'ЖАРЫСТЫ БАСТАУ <b>▶</b>' : 'КРАШ-ТЕСТТІ БАСТАУ <b>▶</b>';
    reset();
  }

  async function start(record = false) {
    if (running) return;
    reset(); const run = token; $('gameStart').disabled = true; $('gameRecord').disabled = true;
    if (mode === 'crash') return startCrash(run);
    await audio.resume(); audio.setup(world.cars.map(c => c.spec));
    if (record) { const ok = await startRecording(); if (!ok) { $('gameStart').disabled = false; $('gameRecord').disabled = false; return; } }
    if (run !== token) return;
    world.phase = 'intro'; world.phaseT = 0; running = true; last = performance.now(); raf = requestAnimationFrame(loop);
  }

  function loop(now) {
    if (!running) return;
    const dt = Math.min(.05, (now - last) / 1000 || 0); last = now;
    if (mode === 'race') {
      tick(dt); draw(); drawRec();
      if (world.done && now - world.doneAt > 450) { running = false; endSequence(); return; }
    } else { updateCrash(dt); draw(); if (crash.impact === 'done') { running = false; return; } }
    raf = requestAnimationFrame(loop);
  }

  function finishSequence() { world.doneAt = performance.now(); audio.silence(); }
  function endSequence() { $('gameStart').disabled = false; $('gameRecord').disabled = false; if (rec) stopRecording(true); }

  // ---------------------------------------------------------------- видео жазу
  function pickMime() {
    const list = ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4;codecs=avc1', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    return list.find(m => window.MediaRecorder?.isTypeSupported?.(m)) || '';
  }

  async function startRecording() {
    if (!window.MediaRecorder || !canvas.captureStream) { toast('Бұл браузер видео жазуды қолдамайды. Chrome немесе Edge қолданыңыз.'); return false; }
    const [W, H] = FORMATS[$('recFormat')?.value || 'short1080'];
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const rctx = c.getContext('2d');
    const mime = pickMime();
    const vs = c.captureStream(60), tracks = [...vs.getVideoTracks()];
    const as = audio.stream; if (as) tracks.push(...as.getAudioTracks());
    let recorder;
    try { recorder = new MediaRecorder(new MediaStream(tracks), {mimeType: mime || undefined, videoBitsPerSecond: W >= 1080 ? 10e6 : 6e6, audioBitsPerSecond: 160000}); }
    catch (e) { toast('Видео жазуды бастау мүмкін болмады: ' + e.message); return false; }
    const chunks = []; recorder.ondataavailable = e => e.data?.size && chunks.push(e.data);
    rec = {canvas: c, ctx: rctx, recorder, chunks, w: W, h: H, mime: recorder.mimeType || mime || 'video/webm', save: false};
    recorder.onstop = () => { const r = rec; rec = null; setRecIndicator(false); if (r?.save && r.chunks.length) deliver(r); };
    recorder.start(250); setRecIndicator(true);
    drawRec();
    return true;
  }

  function stopRecording(save) {
    if (!rec) return;
    rec.save = save; try { rec.recorder.state !== 'inactive' && rec.recorder.stop(); } catch { rec = null; setRecIndicator(false); }
  }
  function cancelRecording() { if (rec) { const r = rec; r.save = false; try { r.recorder.stop(); } catch {} rec = null; setRecIndicator(false); } }
  function drawRec() { if (rec && world) drawRace(rec.ctx, rec.w, rec.h, world); }
  function setRecIndicator(on) { const el = $('recIndicator'); if (el) el.hidden = !on; }

  let lastIds = null, lastBlob = null;
  function deliver(r) {
    const blob = new Blob(r.chunks, {type: r.mime.split(';')[0]}), url = URL.createObjectURL(blob);
    const ext = r.mime.includes('mp4') ? 'mp4' : 'webm', w = world, A = w.cars[0].spec.car, B = w.cars[1].spec.car;
    lastIds = [A.id, B.id]; lastBlob = blob;
    const name = `drivevault-${A.make}-${A.model}-vs-${B.make}-${B.model}-${Math.round(w.D)}m`.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.' + ext;
    const vid = $('videoPreview'); if (vid.dataset.url) URL.revokeObjectURL(vid.dataset.url);
    vid.src = url; vid.dataset.url = url; $('videoDownload').href = url; $('videoDownload').download = name;
    const R = w.result, win = R.winner >= 0 ? w.cars[R.winner].spec.car : null;
    const title = `${A.make} ${A.model} vs ${B.make} ${B.model} | ${Math.round(w.D)} m Drag Race 🏁 AI Simulation #Shorts`;
    const desc = [
      `${A.make} ${A.model} (${A.hp} hp, ${A.weight} kg) vs ${B.make} ${B.model} (${B.hp} hp, ${B.weight} kg)`,
      win ? `🏆 Winner: ${win.make} ${win.model} by ${R.margin.time.toFixed(3)} s` : '🏁 Dead heat!',
      `ET: ${R.rows[0].et.toFixed(2)} s vs ${R.rows[1].et.toFixed(2)} s · Trap: ${Math.round(R.rows[0].trap)} vs ${Math.round(R.rows[1].trap)} km/h`,
      '', 'AI Simulation: computer-generated physics race based on catalog power, weight and 0–100 data. Not a real race and not real footage.', '#Shorts #DragRace #CarRace #' + A.make.replace(/\W/g, '') + ' #' + B.make.replace(/\W/g, '')
    ].join('\n');
    $('videoMeta').value = `${title}\n\n${desc}`;
    $('videoInfo').textContent = `${r.w}×${r.h} · ${ext.toUpperCase()} · ${(blob.size / 1048576).toFixed(1)} МБ · ${(w.clock + 9).toFixed(0)} с шамасы`;
    $('videoOut').dataset.has = '1'; $('videoOut').hidden = false; $('videoOut').scrollIntoView({behavior: 'smooth', block: 'nearest'});
    document.dispatchEvent(new CustomEvent('dv:recorded', {detail: {ids: [A.id, B.id]}}));
    toast('Видео дайын! Төменнен жүктеп алыңыз.');
  }

  function toast(text) { const el = $('toast'); if (!el) return; el.textContent = text; el.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 3200); }

  // ---------------------------------------------------------------- краш режимі
  async function startCrash(run) {
    const count = ['3', '2', '1', 'IMPACT'];
    for (const word of count) {
      if (run !== token) return;
      const el = $('gameCountdown'); el.textContent = word; el.classList.add('show'); setStatus(word);
      await new Promise(r => setTimeout(r, word === 'IMPACT' ? 480 : 650));
    }
    if (run !== token) return;
    $('gameCountdown').classList.remove('show'); running = true; last = performance.now();
    crash.metrics = crashMetrics(getCars().A, +$('crashSpeed').value, $('barrierType').value);
    raf = requestAnimationFrame(loop);
  }

  function updateCrash(dt) {
    const speed = +$('crashSpeed').value;
    if (!crash.impact) {
      crash.progress += dt * (.23 + speed / 230);
      if (crash.progress >= .72) {
        crash.progress = .72; crash.impact = true; shake = Math.min(20, speed / 7);
        for (let i = 0; i < 44; i++) crash.particles.push({x: 0, y: 0, vx: -30 - Math.random() * 180, vy: -130 + Math.random() * 250, life: .5 + Math.random() * .8, size: 2 + Math.random() * 5});
        setStatus('СОҚТЫҒЫСУ'); setMessage('IMPACT!', 900);
      }
    } else {
      crash.progress = Math.min(1, crash.progress + dt * 1.15); shake *= .9;
      crash.particles.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 170 * dt; p.life -= dt; });
      if (crash.progress >= 1 && crash.particles.every(p => p.life <= 0)) finishCrash();
    }
  }

  function finishCrash() {
    crash.impact = 'done'; $('gameStart').disabled = false; $('gameRecord').disabled = false; setStatus('ТЕСТ АЯҚТАЛДЫ');
    const m = crash.metrics;
    $('gameResults').innerHTML = `<div class="crash-stat"><div><b>${m.energy} кДж</b><span>Кинетикалық энергия</span></div><div><b>${m.deformation}%</b><span>Деформация</span></div><div><b>${m.force} кН</b><span>Орташа күш</span></div></div>`;
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
    if (mode === 'race') {
      world.hud = showHud; world.T = lang();
      drawRace(ctx, w, h, world);
    } else {
      if (shake > .5) ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake * .45);
      drawCrash(w, h);
    }
    ctx.restore();
  }

  function drawCrash(w, h) {
    const car = getCars().A;
    const ground = h * .73; let bg = ctx.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#08111a'); bg.addColorStop(.7, '#283641'); bg.addColorStop(.71, '#171c20'); bg.addColorStop(1, '#090c0f'); ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#33434f'; ctx.lineWidth = 1; for (let x = 0; x < w; x += 55) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ground); ctx.stroke(); } for (let y = 60; y < ground; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    const barrierX = w * .78; drawBarrier(barrierX, ground, $('barrierType').value);
    const impactT = clamp((crash.progress - .72) / .28, 0, 1), x = lerp(w * .1, barrierX - 92, clamp(crash.progress / .72, 0, 1));
    drawSideCrashCar(x, ground - 43, Math.min(62, impactT * crash.metrics?.deformation * .72 || 0));
    if (crash.impact) { ctx.save(); ctx.translate(barrierX - 86, ground - 65); crash.particles.filter(p => p.life > 0).forEach(p => { ctx.globalAlpha = p.life; ctx.fillStyle = Math.random() > .5 ? '#dff5ff' : '#ff9a4d'; ctx.fillRect(p.x, p.y, p.size, p.size); }); ctx.restore(); }
    ctx.fillStyle = '#a8b6c0'; ctx.font = '700 11px Manrope'; ctx.fillText(`${car.make.toUpperCase()} ${car.model.toUpperCase()}`, 20, h - 24);
  }

  function drawBarrier(x, ground, type) {
    if (type === 'pole') { ctx.fillStyle = '#687680'; ctx.fillRect(x - 9, ground - 220, 18, 230); ctx.fillStyle = '#aab4bb'; ctx.fillRect(x - 5, ground - 220, 5, 230); return; }
    ctx.fillStyle = type === 'offset' ? '#d9a124' : '#77858f'; ctx.fillRect(x, ground - 190, type === 'offset' ? 48 : 95, 200); ctx.strokeStyle = '#4a565e'; ctx.lineWidth = 3; for (let y = ground - 180; y < ground; y += 28) { ctx.beginPath(); ctx.moveTo(x + 4, y); ctx.lineTo(x + (type === 'offset' ? 44 : 90), y + 18); ctx.stroke(); }
  }

  function drawSideCrashCar(x, y, deform) {
    ctx.save(); ctx.translate(x, y); ctx.fillStyle = '#0009'; ctx.beginPath(); ctx.ellipse(0, 38, 85, 15, 0, 0, 7); ctx.fill();
    let grad = ctx.createLinearGradient(0, -55, 0, 35); grad.addColorStop(0, '#7fd9ff'); grad.addColorStop(.28, '#087bb4'); grad.addColorStop(1, '#03273a'); ctx.fillStyle = grad; ctx.beginPath(); ctx.moveTo(-83, 22); ctx.lineTo(-72, -18); ctx.lineTo(-35, -30); ctx.lineTo(-10, -58); ctx.lineTo(42 - deform * .45, -54); ctx.lineTo(78 - deform, -20); ctx.lineTo(82 - deform, 24); ctx.quadraticCurveTo(0, 38, -83, 22); ctx.fill();
    ctx.fillStyle = '#09151d'; ctx.beginPath(); ctx.moveTo(-25, -31); ctx.lineTo(-5, -52); ctx.lineTo(20, -50); ctx.lineTo(38 - deform * .4, -31); ctx.fill();
    [-52, 48 - deform].forEach(wx => { ctx.fillStyle = '#05070a'; ctx.beginPath(); ctx.arc(wx, 25, 19, 0, 7); ctx.fill(); ctx.fillStyle = '#52616b'; ctx.beginPath(); ctx.arc(wx, 25, 8, 0, 7); ctx.fill(); }); ctx.fillStyle = '#effcff'; ctx.fillRect(68 - deform, -15, 12, 8); ctx.restore();
  }

  // ---------------------------------------------------------------- оқиғалар
  function applyView() {
    const portrait = ($('recFormat')?.value || 'short1080').startsWith('short');
    shell.classList.toggle('portrait', portrait && mode === 'race');
    setTimeout(resize, 30);
  }

  addEventListener('keydown', e => {
    if (e.repeat) return;
    if (e.code === 'KeyH') $('gameHudToggle').click();
    if (e.code === 'KeyF') $('gameFullscreen').click();
  });
  addEventListener('resize', resize);
  $('raceMode').onclick = () => setMode('race'); $('crashMode').onclick = () => setMode('crash');
  $('gameStart').onclick = () => start(false);
  $('gameRecord').onclick = () => start(true);
  $('gameReset').onclick = reset;
  $('gameHudToggle').onclick = () => { showHud = !showHud; $('gameHudToggle').textContent = showHud ? '🎥 HUD' : 'HUD ҚОСУ'; draw(); };
  $('gameFullscreen').onclick = () => { if (!document.fullscreenElement) shell.requestFullscreen?.(); else document.exitFullscreen?.(); };
  document.addEventListener('fullscreenchange', () => setTimeout(resize, 80));
  $('crashSpeed').oninput = e => $('crashSpeedValue').textContent = e.target.value;
  $('barrierType').onchange = reset;
  ['raceDistance', 'raceLang'].forEach(id => $(id).onchange = reset);
  $('recFormat').onchange = () => { applyView(); };
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
  const refreshClient = () => { if (!YT.getClientId()) ytStatus('Алдымен бір рет «Client ID баптау» түймесін басыңыз (README-де қадамдары бар).'); else if (!$('ytStatus').textContent) ytStatus('Дайын: түймені басып, қажетті Google аккаунтты таңдаңыз.'); };
  $('ytClient').onclick = () => {
    const v = prompt('Google Cloud → Credentials → OAuth client ID (Web application) мәнін қойыңыз. Мысалы: …apps.googleusercontent.com', YT.getClientId());
    if (v === null) return; YT.setClientId(v); $('ytStatus').textContent = ''; refreshClient();
  };
  $('ytAuto').onclick = async () => {
    if (!lastBlob) return ytStatus('Алдымен видео жазыңыз.', true);
    if (!YT.getClientId()) { $('ytClient').click(); if (!YT.getClientId()) return; }
    const btn = $('ytAuto'); btn.disabled = true;
    try {
      ytStatus('Google аккаунт таңдау терезесі ашылды…');
      const tok = await YT.signIn(true), ch = await YT.channelInfo(tok);
      const [title, ...rest] = $('videoMeta').value.split(String.fromCharCode(10)), description = rest.join(String.fromCharCode(10)).trim();
      $('ytBar').hidden = false; $('ytBarFill').style.width = '0%';
      ytStatus(`Арна: «${ch.title}». Жүктеліп жатыр…`);
      const out = await YT.uploadVideo(tok, lastBlob, {title, description, tags: ['Shorts', 'DragRace', 'AI Simulation', 'CarRace'], privacy: $('ytPrivacy').value, onProgress: p => { $('ytBarFill').style.width = (p * 100).toFixed(0) + '%'; }});
      const box = document.createElement('span'); box.append(`✅ «${ch.title}» арнасына жүктелді. `);
      const a1 = Object.assign(document.createElement('a'), {href: out.url, target: '_blank', rel: 'noopener', textContent: 'Видеоны ашу'}), a2 = Object.assign(document.createElement('a'), {href: out.studio, target: '_blank', rel: 'noopener', textContent: 'Studio-да өзгерту'});
      box.append(a1, ' · ', a2); ytStatus(box);
      document.dispatchEvent(new CustomEvent('dv:uploaded', {detail: {ids: lastIds}}));
      toast('Видео YouTube-қа жүктелді!');
    } catch (e) { ytStatus('❌ ' + (e.message || e), true); } finally { btn.disabled = false; }
  };
  refreshClient();
  $('copyMeta').onclick = async () => { try { await navigator.clipboard.writeText($('videoMeta').value); toast('Атау мен сипаттама көшірілді'); } catch { $('videoMeta').select(); document.execCommand?.('copy'); toast('Көшірілді'); } };
  applyView(); resize(); reset();
  return {reset, setMode, get world() { return world; }, tick, audio};
}
