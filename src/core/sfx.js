// =====================================================================
//  Sound, synthesised in the browser (no audio files): blade and slice
//  sounds for the training hall, chiptune music and game sounds for the
//  journey. One shared switch, remembered per visitor.
// =====================================================================
let ctx = null, master = null, musicBus = null, sfxBus = null;
const KEY = 'kaju-sound';
let muted = (() => { try { return localStorage.getItem(KEY) === 'off'; } catch (e) { return false; } })();
const subs = new Set();

export const sound = {
  get muted() { return muted; },
  set muted(v) {
    muted = !!v;
    try { localStorage.setItem(KEY, muted ? 'off' : 'on'); } catch (e) { /* private mode */ }
    if (master) master.gain.setTargetAtTime(muted ? 0 : 0.8, ctx.currentTime, 0.03);
    subs.forEach((f) => f(muted));
  },
  toggle() { this.muted = !muted; unlock(); },
  on(f) { subs.add(f); f(muted); return () => subs.delete(f); },
};

// browsers only start audio after a tap/click/key: call this from any gesture
export function unlock() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.8;
    musicBus = ctx.createGain(); musicBus.gain.value = 0.34;
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.7;
    musicBus.connect(master); sfxBus.connect(master); master.connect(comp).connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
const ready = () => ctx && ctx.state === 'running' && !muted;

let noiseBuf = null;
function noise() {
  if (noiseBuf) return noiseBuf;
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
}
const pulse = {};
function wave(type) {
  if (type === 'square' || type === 'sine' || type === 'triangle' || type === 'sawtooth') return type;
  if (pulse[type]) return pulse[type];
  const duty = type === 'pulse25' ? 0.25 : 0.125, n = 64, re = new Float32Array(n), im = new Float32Array(n);
  for (let k = 1; k < n; k++) im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
  return (pulse[type] = ctx.createPeriodicWave(re, im));
}

// one oscillator note with a pitch glide and a quick envelope
function tone({ type = 'square', f0 = 440, f1 = f0, t = 0, dur = 0.12, vol = 0.3, attack = 0.004, bus = sfxBus, curve = 'exp' }) {
  const at = ctx.currentTime + t;
  const o = ctx.createOscillator(), gn = ctx.createGain();
  const w = wave(type); if (typeof w === 'string') o.type = w; else o.setPeriodicWave(w);
  o.frequency.setValueAtTime(f0, at);
  if (f1 !== f0) curve === 'exp' ? o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), at + dur) : o.frequency.linearRampToValueAtTime(f1, at + dur);
  gn.gain.setValueAtTime(0.0001, at); gn.gain.exponentialRampToValueAtTime(vol, at + attack);
  gn.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(gn).connect(bus); o.start(at); o.stop(at + dur + 0.02);
}
function hiss({ t = 0, dur = 0.15, vol = 0.3, type = 'bandpass', f0 = 1200, f1 = f0, q = 1, bus = sfxBus }) {
  const at = ctx.currentTime + t;
  const s = ctx.createBufferSource(); s.buffer = noise(); s.loop = true;
  const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(f0, at); if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, at + dur);
  const gn = ctx.createGain(); gn.gain.setValueAtTime(0.0001, at); gn.gain.exponentialRampToValueAtTime(vol, at + 0.006); gn.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  s.connect(f).connect(gn).connect(bus); s.start(at, Math.random()); s.stop(at + dur + 0.02);
}

const N = (n) => 440 * Math.pow(2, (n - 69) / 12);   // midi note → Hz

export const sfx = {
  // ---- the training hall
  whoosh(k = 1) { if (!ready()) return; hiss({ dur: 0.2, vol: 0.16 * k, f0: 500, f1: 2600, q: 0.9 }); },
  slice() {
    if (!ready()) return;
    hiss({ dur: 0.09, vol: 0.32, type: 'highpass', f0: 3000, q: 0.7 });
    tone({ type: 'sine', f0: 2350, f1: 2200, dur: 0.42, vol: 0.09 });
    tone({ type: 'sine', f0: 3520, f1: 3400, dur: 0.3, vol: 0.05 });
    tone({ type: 'triangle', f0: 180, f1: 70, dur: 0.14, vol: 0.22 });
  },
  splat() { if (!ready()) return; hiss({ dur: 0.16, vol: 0.22, type: 'lowpass', f0: 1400, f1: 300, q: 0.6, t: 0.01 }); },
  combo(n) { if (!ready()) return; for (let i = 0; i < Math.min(n, 5); i++) tone({ type: 'pulse25', f0: N(76 + i * 4), dur: 0.12, vol: 0.12, t: i * 0.055 }); },
  // ---- the journey
  jump() { if (!ready()) return; tone({ type: 'pulse25', f0: 330, f1: 760, dur: 0.16, vol: 0.16 }); },
  coin() { if (!ready()) return; tone({ type: 'square', f0: N(83), dur: 0.07, vol: 0.12 }); tone({ type: 'square', f0: N(88), dur: 0.32, vol: 0.12, t: 0.07 }); },
  bump() { if (!ready()) return; tone({ type: 'square', f0: 140, f1: 70, dur: 0.1, vol: 0.2 }); hiss({ dur: 0.06, vol: 0.12, type: 'lowpass', f0: 800 }); },
  brick() { if (!ready()) return; hiss({ dur: 0.22, vol: 0.25, type: 'lowpass', f0: 2200, f1: 400 }); tone({ type: 'square', f0: 220, f1: 90, dur: 0.12, vol: 0.12 }); },
  appear() { if (!ready()) return; [60, 64, 67, 72, 76, 79].forEach((n, i) => tone({ type: 'triangle', f0: N(n), dur: 0.09, vol: 0.18, t: i * 0.05 })); },
  levelUp() {
    if (!ready()) return;
    const mel = [[72, 0], [76, 0.1], [79, 0.2], [84, 0.3], [79, 0.45], [84, 0.55]];
    mel.forEach(([n, t]) => { tone({ type: 'pulse25', f0: N(n), dur: 0.16, vol: 0.14, t }); tone({ type: 'triangle', f0: N(n - 24), dur: 0.16, vol: 0.2, t }); });
    tone({ type: 'pulse25', f0: N(88), dur: 0.6, vol: 0.13, t: 0.68 });
  },
  stomp() { if (!ready()) return; tone({ type: 'square', f0: 500, f1: 120, dur: 0.12, vol: 0.18 }); hiss({ dur: 0.08, vol: 0.15, type: 'lowpass', f0: 1200 }); },
  hurt() { if (!ready()) return; tone({ type: 'square', f0: 520, f1: 110, dur: 0.38, vol: 0.16, curve: 'lin' }); },
  honk() { if (!ready()) return; [0, 0.16].forEach((t) => { tone({ type: 'square', f0: 515, dur: 0.11, vol: 0.09, t }); tone({ type: 'square', f0: 523, dur: 0.11, vol: 0.07, t }); }); },
  moo() { if (!ready()) return; tone({ type: 'sawtooth', f0: 150, f1: 112, dur: 0.75, vol: 0.09, attack: 0.08, curve: 'lin' }); },
  splash() { if (!ready()) return; hiss({ dur: 0.3, vol: 0.25, type: 'lowpass', f0: 2600, f1: 300 }); },
  blip() { if (!ready()) return; tone({ type: 'pulse12', f0: 1046 + Math.random() * 60, dur: 0.03, vol: 0.05 }); },
  start() { if (!ready()) return; [[67, 0], [72, 0.1], [76, 0.2], [79, 0.3], [84, 0.42]].forEach(([n, t]) => tone({ type: 'pulse25', f0: N(n), dur: 0.14, vol: 0.13, t })); },
  win() {
    if (!ready()) return;
    [[72, 0], [74, 0.12], [76, 0.24], [79, 0.36], [77, 0.52], [79, 0.64], [84, 0.8]].forEach(([n, t]) => { tone({ type: 'pulse25', f0: N(n), dur: 0.2, vol: 0.13, t }); tone({ type: 'triangle', f0: N(n - 12), dur: 0.2, vol: 0.16, t }); });
    tone({ type: 'pulse25', f0: N(88), dur: 0.9, vol: 0.12, t: 1.0 });
  },
};

// ---------------------------------------------------------------- music: an original chiptune loop
// 8 bars at 140 bpm, 8th-note grid: lead (pulse), bass (triangle), arpeggio, drums. `mood` re-voices it per world.
const LEAD = [
  76, 0, 79, 0, 84, 0, 79, 76, 74, 0, 77, 0, 81, 0, 77, 74,
  76, 0, 79, 0, 84, 0, 88, 86, 84, 0, 79, 0, 76, 0, 0, 0,
  81, 0, 81, 79, 77, 0, 76, 0, 74, 0, 76, 77, 79, 0, 0, 0,
  81, 0, 84, 0, 83, 0, 79, 0, 84, 0, 0, 0, 79, 76, 72, 0,
];
const ROOTS = [48, 50, 48, 43, 41, 43, 45, 48];   // C Dm C G F G Am C
const CHORD = { 48: [0, 4, 7], 50: [0, 3, 7], 43: [0, 4, 7], 41: [0, 4, 7], 45: [0, 3, 7] };
let seq = null;
export const music = {
  playing: false, mood: 0,
  start() {
    if (!unlock() || this.playing) return;
    this.playing = true;
    const spb = 60 / 140 / 2; let step = 0, next = ctx.currentTime + 0.08;
    seq = setInterval(() => {
      while (next < ctx.currentTime + 0.12) {
        const t = next - ctx.currentTime, bar = Math.floor(step / 8) % 8, i = step % 64, m = this.mood;
        const tr = [0, 0, 2, -3, 5, 3, 7, 0][m] || 0;
        const n = LEAD[i];
        if (n) tone({ type: m === 6 ? 'pulse12' : 'pulse25', f0: N(n + tr), dur: spb * 0.92, vol: 0.11, bus: musicBus, t: Math.max(0, t) });
        const r = ROOTS[bar] + tr;
        if (step % 2 === 0) tone({ type: 'triangle', f0: N(r - (step % 4 === 0 ? 12 : 0)), dur: spb * 1.7, vol: 0.2, bus: musicBus, t: Math.max(0, t) });
        const ch = CHORD[ROOTS[bar]] || [0, 4, 7];
        tone({ type: 'pulse12', f0: N(r + 24 + ch[step % 3]), dur: spb * 0.5, vol: 0.035, bus: musicBus, t: Math.max(0, t) });
        if (step % 4 === 0) tone({ type: 'sine', f0: 150, f1: 45, dur: 0.12, vol: 0.32, bus: musicBus, t: Math.max(0, t) });
        if (step % 4 === 2) hiss({ dur: 0.1, vol: 0.12, type: 'bandpass', f0: 1800, q: 0.8, bus: musicBus, t: Math.max(0, t) });
        hiss({ dur: 0.03, vol: step % 2 ? 0.035 : 0.055, type: 'highpass', f0: 7000, bus: musicBus, t: Math.max(0, t) });
        next += spb; step++;
      }
    }, 25);
  },
  stop() { clearInterval(seq); seq = null; this.playing = false; },
  duck(sec = 1) { if (!musicBus) return; const n = ctx.currentTime; musicBus.gain.cancelScheduledValues(n); musicBus.gain.setValueAtTime(0.06, n); musicBus.gain.linearRampToValueAtTime(0.34, n + sec); },
};
