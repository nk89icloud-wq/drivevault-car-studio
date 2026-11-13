// Web Audio: қозғалтқыш дыбысы (rpm бойынша), электромобиль ызыңы, светофор дыбыстары.
// Шығыс бір мезгілде динамикке және видео жазуға (MediaStream) беріледі.

export function createAudio() {
  let ctx = null, master, spk, dest, voices = [], enabled = true, noiseBuf;

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = .9;
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
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = .8;
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
    voices.forEach(v => { try { v.o.forEach(([osc]) => osc.stop()); v.out.disconnect(); v.ex.g.disconnect(); v.ex.src.stop(); } catch {} });
    voices = [];
  }

  /** i: көлік индексі; spec: физикалық профиль; s: күй; distScale: 0..1 қашықтыққа байланысты көлем */
  function update(i, spec, s, level) {
    const v = voices[i]; if (!v || !ctx) return;
    const t = ctx.currentTime, rpm = Math.max(spec.idle, s.rpm), load = s.throttle;
    if (v.ev) {
      const f = 260 + (s.v / spec.vTop) * 2600 + load * 120;
      v.o.forEach(([osc, m]) => osc.frequency.setTargetAtTime(f * m, t, .03));
      v.lp.frequency.setTargetAtTime(1800 + load * 3500, t, .05);
      v.out.gain.setTargetAtTime(level * (.06 + .16 * (load ? 1 : .5)), t, .05);
      v.ex.g.gain.setTargetAtTime(level * .02 * Math.min(1, s.v / 40), t, .1);
    } else {
      const f = rpm / 60 * (spec.cyl / 2);
      v.o.forEach(([osc, m]) => osc.frequency.setTargetAtTime(f * m, t, .015));
      v.lp.frequency.setTargetAtTime(500 + 2800 * (rpm / spec.redline) * (.55 + .45 * load), t, .03);
      v.out.gain.setTargetAtTime(level * (.1 + .17 * load + .05 * (rpm / spec.redline)), t, .03);
      v.ex.g.gain.setTargetAtTime(level * (load ? .06 : .01) + (s.shifting ? level * .05 : 0), t, .03);
      v.ex.bp.frequency.setTargetAtTime(300 + 900 * (rpm / spec.redline), t, .05);
    }
    if (s.slip > .05) v.out.gain.setTargetAtTime(level * .3, t, .02);
  }

  function silence() { voices.forEach(v => { if (!ctx) return; v.out.gain.setTargetAtTime(0, ctx.currentTime, .1); v.ex.g.gain.setTargetAtTime(0, ctx.currentTime, .1); }); }

  function beep(freq, dur = .22, vol = .35, type = 'square') {
    if (!ensure()) return;
    const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
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

  return {
    resume: () => { ensure(); return ctx?.resume?.(); },
    setup, update, silence, beep, whoosh, teardown,
    setEnabled(on) { enabled = on; if (spk) spk.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, .05); },
    setSpeakers(on) { if (on !== enabled) this.setEnabled(on); },
    get enabled() { return enabled; },
    get stream() { ensure(); return dest?.stream || null; }
  };
}
