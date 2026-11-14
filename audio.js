// Web Audio: қозғалтқыш дыбысы (rpm бойынша), электромобиль ызыңы, светофор дыбыстары.
// Шығыс бір мезгілде динамикке және видео жазуға (MediaStream) беріледі.

export function createAudio() {
  let ctx = null, master, spk, dest, voices = [], enabled = true, noiseBuf;

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = .85;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 5;
    master.connect(comp);
    spk = ctx.createGain(); spk.gain.value = enabled ? 1 : 0;
    comp.connect(spk); spk.connect(ctx.destination);
    dest = ctx.createMediaStreamDestination();
    comp.connect(dest);
    const len = ctx.sampleRate * 2; noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }

  function shaper(amount) {
    const n = 1024, curve = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = i * 2 / n - 1; curve[i] = Math.tanh(x * amount); }
    const s = ctx.createWaveShaper(); s.curve = curve; return s;
  }

  function noise(freq, q) {
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = q;
    const g = ctx.createGain(); g.gain.value = 0;
    src.connect(bp); bp.connect(g); src.start();
    return {g, bp, src};
  }

  function makeVoice(pan, ev) {
    const out = ctx.createGain(); out.gain.value = 0;
    const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
    if (panner.pan) panner.pan.value = pan;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700; lp.Q.value = .5;
    const o = [];
    if (ev) {
      const a = ctx.createOscillator(); a.type = 'sine';
      const b = ctx.createOscillator(); b.type = 'triangle';
      const c = ctx.createOscillator(); c.type = 'sawtooth';
      const gb = ctx.createGain(); gb.gain.value = .25; const gc = ctx.createGain(); gc.gain.value = .06;
      a.connect(lp); b.connect(gb); gb.connect(lp); c.connect(gc); gc.connect(lp);
      o.push([a, 1], [b, 2], [c, 3]);
      lp.connect(out);
    } else {
      const a = ctx.createOscillator(); a.type = 'sawtooth';
      const b = ctx.createOscillator(); b.type = 'sawtooth';
      const c = ctx.createOscillator(); c.type = 'square';
      const ga = ctx.createGain(); ga.gain.value = .55; const gb = ctx.createGain(); gb.gain.value = .4; const gc = ctx.createGain(); gc.gain.value = .22;
      a.connect(ga); b.connect(gb); c.connect(gc);
      const sh = shaper(2.4); ga.connect(sh); gb.connect(sh); gc.connect(sh); sh.connect(lp);
      o.push([a, 1], [b, .5], [c, 2]);
      lp.connect(out);
    }
    o.forEach(([osc]) => osc.start());
    const ex = noise(ev ? 3000 : 700, .7);
    ex.g.connect(panner);
    out.connect(panner); panner.connect(master);
    return {out, lp, o, ex, ev};
  }

  function setup(specs) {
    if (!ensure()) return;
    teardown();
    voices = specs.map((s, i) => makeVoice(i === 0 ? -.55 : .55, s.ev));
  }

  function teardown() {
    stopMusic(.3);
    voices.forEach(v => { try { v.o.forEach(([osc]) => osc.stop()); v.out.disconnect(); v.ex.g.disconnect(); v.ex.src.stop(); } catch {} });
    voices = [];
  }

  /** i: көлік индексі; spec: физикалық профиль; s: күй; distScale: 0..1 қашықтыққа байланысты көлем */
  function update(i, spec, s, level) {
    const v = voices[i]; if (!v || !ctx) return;
    const t = ctx.currentTime, rpm = Math.max(spec.idle, s.rpm), load = s.throttle;
    if (v.ev) {
      const f = 180 + (s.v / spec.vTop) * 900 + load * 40;
      v.o.forEach(([osc, m]) => osc.frequency.setTargetAtTime(f * m, t, .03));
      v.lp.frequency.setTargetAtTime(900 + load * 700, t, .05);
      v.out.gain.setTargetAtTime(level * (.01 + .022 * (load ? 1 : .5)), t, .05);
      v.ex.g.gain.setTargetAtTime(level * .006 * Math.min(1, s.v / 40), t, .1);
    } else {
      const f = rpm / 60 * (spec.cyl / 2);
      v.o.forEach(([osc, m]) => osc.frequency.setTargetAtTime(f * m, t, .015));
      v.lp.frequency.setTargetAtTime(380 + 950 * (rpm / spec.redline) * (.55 + .45 * load), t, .03);
      v.out.gain.setTargetAtTime(level * (.017 + .022 * load + .005 * (rpm / spec.redline)), t, .03);
      v.ex.g.gain.setTargetAtTime(level * (load ? .006 : .0015) + (s.shifting ? level * .002 : 0), t, .08);
      v.ex.bp.frequency.setTargetAtTime(250 + 450 * (rpm / spec.redline), t, .1);
    }
    if (s.slip > .05) v.out.gain.setTargetAtTime(level * .035, t, .05);
  }

  function silence() { voices.forEach(v => { if (!ctx) return; v.out.gain.setTargetAtTime(0, ctx.currentTime, .1); v.ex.g.gain.setTargetAtTime(0, ctx.currentTime, .1); }); }

  function beep(freq, dur = .22, vol = .35, type = 'square') {
    if (!ensure()) return;
    const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime; vol *= .55;
    o.type = type; o.frequency.value = freq; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + .02);
  }

  function whoosh(vol = .3, dur = .7) {
    if (!ensure()) return;
    const n = noise(900, .5), t = ctx.currentTime; n.g.connect(master);
    n.bp.frequency.setValueAtTime(400, t); n.bp.frequency.exponentialRampToValueAtTime(3000, t + dur * .5); n.bp.frequency.exponentialRampToValueAtTime(600, t + dur);
    n.g.gain.setValueAtTime(0, t); n.g.gain.linearRampToValueAtTime(vol, t + dur * .4); n.g.gain.linearRampToValueAtTime(0, t + dur);
    setTimeout(() => { try { n.g.disconnect(); n.src.stop(); } catch {} }, dur * 1000 + 100);
  }

  // ---------------------------------------------------------------- фондық музыка (өзіміз синтездейміз, phonk стилі, авторлық құқық жоқ)
  let music = null;
  const CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], BASS = [33, 29, 36, 31]; // Am F C G
  const hz = n => 440 * Math.pow(2, (n - 69) / 12);
  let musicBuf = null, musicOffset = 0, musicGain = 1;
  async function setMusicFile(arrayBuffer, offset = 0) {
    if (!arrayBuffer) { musicBuf = null; return false; }
    if (!ensure()) return false;
    musicBuf = await ctx.decodeAudioData(arrayBuffer.slice(0)); musicOffset = Math.max(0, +offset || 0);
    const d = musicBuf.getChannelData(0), from = Math.min(d.length - 1, Math.floor(musicOffset * musicBuf.sampleRate));
    let sum = 0, n = 0; for (let i = from; i < Math.min(d.length, from + musicBuf.sampleRate * 30); i += 7) { sum += d[i] * d[i]; n++; }
    musicGain = Math.min(3, Math.max(.1, .07 / Math.max(.005, Math.sqrt(sum / Math.max(1, n))))); // ұқсас қатты емес деңгейге теңестіру
    return true;
  }
  function startMusic() {
    if (!ensure() || music) return;
    if (musicBuf) {
      const bus = ctx.createGain(); bus.gain.value = 0; bus.gain.linearRampToValueAtTime(musicGain, ctx.currentTime + 1.5); bus.connect(master);
      const src = ctx.createBufferSource(); src.buffer = musicBuf; src.loop = true; src.connect(bus);
      src.start(0, Math.min(musicOffset, Math.max(0, musicBuf.duration - 1)));
      music = {bus, src, timer: null}; return;
    }
    const bus = ctx.createGain(); bus.gain.value = 0; bus.gain.linearRampToValueAtTime(.5, ctx.currentTime + 2.5);
    const delay = ctx.createDelay(1); delay.delayTime.value = .34; const fb = ctx.createGain(); fb.gain.value = .3; const wet = ctx.createGain(); wet.gain.value = .35;
    delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(bus); bus.connect(master);
    const BPM = 132, beat = 60 / BPM, step = beat / 4; let n = 0, next = ctx.currentTime + .1; // 16-лық қадам, 1 такт = 16 қадам
    const tone = (type, f, t, dur, vol, cutoff, toDelay) => {
      const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter(); o.type = type; o.frequency.value = f; lp.type = 'lowpass'; lp.frequency.value = cutoff;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0008, t + dur);
      o.connect(lp); lp.connect(g); g.connect(bus); if (toDelay) g.connect(delay); o.start(t); o.stop(t + dur + .05);
    };
    const hit = (t, freq, dur, vol) => { const s = ctx.createBufferSource(); s.buffer = noiseBuf; const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = freq; const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0008, t + dur); s.connect(f); f.connect(g); g.connect(bus); s.start(t); s.stop(t + dur + .02); };
    const kick = t => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + .12); g.gain.setValueAtTime(.5, t); g.gain.exponentialRampToValueAtTime(.001, t + .22); o.connect(g); g.connect(bus); o.start(t); o.stop(t + .26); };
    // 808 бас: төмен сурылатын синусоида + жоғарғы гармоника (телефонда да естілу үшін)
    const bass808 = (t, midi, dur, glideTo) => {
      const f = hz(midi), o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), sh = ctx.createWaveShaper();
      const c = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 128 - 1; c[i] = Math.tanh(x * 2.2); } sh.curve = c;
      o.type = 'sine'; o2.type = 'triangle'; o.frequency.setValueAtTime(f, t); o2.frequency.setValueAtTime(f * 2, t);
      if (glideTo) { o.frequency.exponentialRampToValueAtTime(hz(glideTo), t + dur * .8); o2.frequency.exponentialRampToValueAtTime(hz(glideTo) * 2, t + dur * .8); }
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.34, t + .008); g.gain.exponentialRampToValueAtTime(.001, t + dur);
      o.connect(sh); o2.connect(sh); sh.connect(g); g.connect(bus); o.start(t); o2.start(t); o.stop(t + dur + .05); o2.stop(t + dur + .05);
    };
    // ковбелл (phonk-тың басты белгісі): екі шаршы толқын + bandpass
    const cowbell = (t, midi, vol) => {
      const g = ctx.createGain(), bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 1.2;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0008, t + .22);
      [1, 1.504].forEach(m => { const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = hz(midi) * m; o.connect(bp); o.start(t); o.stop(t + .26); });
      bp.connect(g); g.connect(bus); g.connect(delay);
    };
    // F minor: Fm – Db – Eb – C (түбір, ковбелл мелодиясы 16 қадамға)
    const ROOT = [29, 25, 32, 24], GL = [null, null, 30, null];
    const MEL = [
      [77, 0, 0, 77, 0, 80, 0, 0, 77, 0, 75, 0, 72, 0, 0, 0],
      [73, 0, 0, 73, 0, 77, 0, 0, 73, 0, 72, 0, 68, 0, 0, 0],
      [75, 0, 0, 75, 0, 79, 0, 0, 75, 0, 72, 0, 70, 0, 0, 0],
      [72, 0, 0, 72, 0, 75, 0, 0, 72, 0, 70, 0, 67, 0, 68, 0]
    ];
    const PAD = [[53, 56, 60], [49, 53, 56], [51, 55, 58], [48, 51, 55]];
    const schedule = () => {
      while (next < ctx.currentTime + 1.5) {
        const bar = Math.floor(n / 16), s = n % 16, ch = bar % 4, t = next;
        if (s === 0 || s === 6 || s === 10) kick(t);
        if (s === 4 || s === 12) { hit(t, 1500, .14, .2); tone('triangle', 200, t, .1, .1, 1400); }
        if (s % 2 === 0 || (bar % 4 === 3 && s >= 12)) hit(t, 8000, .04, .06); // хэт, соңғы тактта жылдам
        if (s === 0) bass808(t, ROOT[ch], beat * 2.6, GL[ch]); if (s === 10) bass808(t, ROOT[ch] + 12, beat * 1.2);
        const m = MEL[ch][s]; if (m) cowbell(t, m, .09);
        if (s === 0) PAD[ch].forEach(k => tone('sawtooth', hz(k), t, beat * 3.8, .028, 800));
        n++; next += step;
      }
    };
    schedule(); music = {bus, timer: setInterval(schedule, 120)};
  }
  function stopMusic(fade = 1.2) {
    if (!music || !ctx) return; const m = music; music = null; if (m.timer) clearInterval(m.timer);
    m.bus.gain.cancelScheduledValues(ctx.currentTime); m.bus.gain.setTargetAtTime(0, ctx.currentTime, fade / 3);
    setTimeout(() => { try { m.src?.stop(); m.bus.disconnect(); } catch {} }, fade * 1000 + 600);
  }

  return {
    startMusic, stopMusic, setMusicFile, get hasMusicFile() { return !!musicBuf; },
    resume: () => { ensure(); return ctx?.resume?.(); },
    setup, update, silence, beep, whoosh, teardown,
    setEnabled(on) { enabled = on; if (spk) spk.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, .05); },
    setSpeakers(on) { if (on !== enabled) this.setEnabled(on); },
    get enabled() { return enabled; },
    get stream() { ensure(); return dest?.stream || null; }
  };
}
