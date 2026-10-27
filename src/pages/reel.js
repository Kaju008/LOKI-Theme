// The Reel — curved panels gliding right → left over a live editing timeline.
// The frame at the centre (under the playhead) is lit; the rest are faded. Each time a new
// video reaches the playhead it snaps in with a glitch. Drag to scrub, click to play.
import '../pages.js';
import { WORKS, REEL } from '../config.js';
import { $, thumb, CAT_COL, buildPlayer } from './common.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const player = buildPlayer();
const N = WORKS.length;
const TAU = Math.PI * 2;
const wrap = (x, n) => ((x % n) + n) % n;

$('#reel-kicker').textContent = REEL.kicker;
$('#reel-title').innerHTML = REEL.title.replace(/(\S+)$/, '<em>$1</em>');
$('#reel-sub').textContent = REEL.sub;

// ---------------------------------------------------------------- background video (when provided)
const bgv = $('#bgv');
const src = innerWidth < 700 && REEL.bg.mobileVideo ? REEL.bg.mobileVideo : REEL.bg.video;
if (REEL.bg.poster) { bgv.poster = REEL.bg.poster; document.body.classList.add('has-bg'); }
if (src) {
  bgv.muted = true; bgv.defaultMuted = true; bgv.playsInline = true;
  bgv.src = src; document.body.classList.add('has-bg');
  bgv.play().catch(() => addEventListener('pointerdown', () => bgv.play(), { once: true }));
}

// ---------------------------------------------------------------- the curved panels
const arc = $('#arc');
const imgs = [];
const panels = WORKS.map((w, i) => {
  const [c1, c2] = CAT_COL[w.cat] || ['#3dffb5', '#9d80ff'];
  const el = document.createElement('button');
  el.type = 'button'; el.className = 'pn'; el.dataset.i = i;
  el.style.setProperty('--c1', c1); el.style.setProperty('--c2', c2);
  el.setAttribute('aria-label', `Play: ${w.t}`);
  const u = thumb(w);
  el.style.setProperty('--img', `url("${u}")`);
  el.innerHTML = `<span class="pn-in"><img src="${u}" alt="" draggable="false" decoding="async">
    <i class="g r"></i><i class="g c"></i><i class="scan"></i>
    <span class="pn-meta"><small>${w.cat}</small><b>${w.t}</b></span><span class="pn-play" aria-hidden="true"></span></span>`;
  const img = el.querySelector('img');
  img.onerror = () => { el.classList.add('noimg'); el.querySelector('.pn-in').insertAdjacentHTML('afterbegin', `<span class="pn-ph">${w.t}</span>`); };
  arc.appendChild(el);
  const im = new Image(); im.src = u; imgs.push(im);            // for the timeline filmstrip
  return { el, w, last: -9 };
});

let geo = {};
function layout() {
  const W = innerWidth, mob = W < 700;
  const pw = mob ? Math.min(150, W * 0.36) : Math.min(250, Math.max(170, W * 0.14));
  const ph = pw * 1.42;
  const gap = mob ? 14 : 22;
  const R = mob ? W * 0.95 : Math.max(640, W * 0.52);   // smaller radius = a deeper curve
  geo = { pw, ph, gap, R, step: (pw + gap) / R, persp: mob ? 700 : 1100 };
  arc.style.setProperty('--pw', pw + 'px'); arc.style.setProperty('--ph', ph + 'px');
  arc.style.perspective = geo.persp + 'px';
  resizeTl();
  aura.width = Math.round(innerWidth * dpr); aura.height = Math.round(innerHeight * dpr);
}

// ---------------------------------------------------------------- timeline (2D canvas)
const tl = $('#tl'), g = tl.getContext('2d');
let TW = 0, TH = 0, dpr = 1;
function resizeTl() {
  dpr = Math.min(devicePixelRatio || 1, 2);
  const r = tl.getBoundingClientRect();
  TW = r.width; TH = r.height;
  tl.width = Math.round(TW * dpr); tl.height = Math.round(TH * dpr);
}
const FPS = 25, SEC_PER_CLIP = 6;                      // the timecode pretends each clip is ~6 s
const tc = (sec) => { const f = Math.floor(wrap(sec, 3600) * FPS); const ff = f % FPS, s = Math.floor(f / FPS) % 60, m = Math.floor(f / FPS / 60) % 60; return `01:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(ff).padStart(2, '0')}`; };
const hsh = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const rr = (x, y, w, h, r) => { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); };

function drawTimeline(off, t, hit) {
  const W = TW, H = TH, mob = W < 700;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, W, H);
  const L = mob ? 150 : Math.max(220, W * 0.16);        // pixels per clip on the timeline
  const head = mob ? 0 : 64;                             // track header column
  const cx = head + (W - head) / 2;                      // playhead x
  const xOf = (pos) => cx + (pos - off) * L;             // pos in clip units
  const rows = mob ? [['RUL', 16], ['V2', 16], ['V1', 46], ['A1', 24], ['A2', 20]] : [['RUL', 20], ['V2', 20], ['V1', 64], ['A1', 30], ['A2', 26]];
  let y = 4; const Y = {};
  for (const [k, h] of rows) { Y[k] = [y, h]; y += h + 5; }
  const x0 = head, x1 = W;
  const v0 = Math.floor(off - (cx - x0) / L) - 1, v1 = Math.ceil(off + (x1 - cx) / L) + 1;
  g.save(); g.beginPath(); g.rect(x0, 0, x1 - x0, H); g.clip();
  // ruler
  const [ry, rh] = Y.RUL;
  g.font = `500 ${mob ? 8 : 9}px ui-monospace, Menlo, monospace`; g.textBaseline = 'top';
  for (let p = Math.floor(v0 * 8) / 8; p < v1; p += 1 / 8) {
    const x = xOf(p), major = Math.abs(p - Math.round(p)) < 1e-6, half = Math.abs(p * 2 - Math.round(p * 2)) < 1e-6;
    g.fillStyle = major ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.22)';
    g.fillRect(Math.round(x), ry + rh - (major ? rh * 0.7 : half ? rh * 0.45 : rh * 0.25), 1, major ? rh * 0.7 : half ? rh * 0.45 : rh * 0.25);
    if (major || (!mob && half)) { g.fillStyle = 'rgba(255,255,255,.45)'; g.fillText(tc(p * SEC_PER_CLIP).slice(3), x + 4, ry + 1); }
  }
  // tracks
  for (const k of ['V2', 'V1', 'A1', 'A2']) { const [ty, th] = Y[k]; g.fillStyle = 'rgba(255,255,255,.025)'; g.fillRect(x0, ty, x1 - x0, th); }
  for (let i = v0; i <= v1; i++) {
    const wi = wrap(i, N), w = WORKS[wi];
    const [c1, c2] = CAT_COL[w.cat] || ['#3dffb5', '#9d80ff'];
    const a = xOf(i - 0.5) + 2, b = xOf(i + 0.5) - 2, cw = b - a;
    const on = wrap(Math.round(off), N) === wi && Math.round(off) === i;
    const k = on ? 1 : 0.42;
    const jit = on && hit > 0 ? (hsh(t * 60) - 0.5) * 10 * hit : 0;
    // V1: the video clip with a filmstrip of its thumbnail
    let [vy, vh] = Y.V1;
    g.save(); rr(a + jit, vy, cw, vh, 4); g.clip();
    g.fillStyle = '#0b1220'; g.fillRect(a, vy, cw, vh);
    const im = imgs[wi];
    if (im.complete && im.naturalWidth) {
      const tw = vh * 0.62, n = Math.ceil(cw / tw);
      g.globalAlpha = on ? 0.95 : 0.4;
      for (let f = 0; f < n; f++) {
        const sw = im.naturalWidth, sh = im.naturalHeight, ar = tw / vh;
        const sx = Math.max(0, (sw - sh * ar) / 2) + (f % 3) * 0.04 * sw * (sw > sh ? 1 : 0);
        g.drawImage(im, sx, 0, Math.min(sw, sh * ar), sh, a + jit + f * tw, vy, tw - 1, vh);
      }
      g.globalAlpha = 1;
    }
    const gr = g.createLinearGradient(a, 0, b, 0); gr.addColorStop(0, c1); gr.addColorStop(1, c2);
    g.fillStyle = gr; g.globalAlpha = on ? 0.28 : 0.18; g.fillRect(a, vy, cw, vh); g.globalAlpha = 1;
    g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(a, vy, cw, mob ? 13 : 16);
    g.fillStyle = on ? '#fff' : 'rgba(255,255,255,.6)'; g.font = `600 ${mob ? 8.5 : 10}px Manrope, system-ui, sans-serif`; g.textBaseline = 'middle';
    g.fillText(w.t.length > 34 ? w.t.slice(0, 33) + '…' : w.t, a + 8 + jit, vy + (mob ? 7 : 8.5));
    g.restore();
    g.lineWidth = on ? 1.5 : 1; g.strokeStyle = on ? c1 : 'rgba(255,255,255,.14)'; rr(a + jit, vy, cw, vh, 4); g.stroke();
    if (on && hit > 0) { g.fillStyle = `rgba(255,255,255,${(hit * 0.35).toFixed(3)})`; rr(a, vy, cw, vh, 4); g.fill(); }
    // V2: a title / graphics clip over part of it
    const [ty, th] = Y.V2;
    const s0 = a + cw * (0.08 + hsh(wi) * 0.3), s1 = s0 + cw * (0.25 + hsh(wi + 7) * 0.3);
    g.fillStyle = on ? 'rgba(157,128,255,.75)' : 'rgba(157,128,255,.3)'; rr(s0, ty, s1 - s0, th, 3); g.fill();
    g.fillStyle = 'rgba(255,255,255,.75)'; g.font = `500 ${mob ? 7.5 : 8.5}px Manrope, sans-serif`; g.fillText(w.cat.toUpperCase(), s0 + 6, ty + th / 2);
    // A1: dialogue waveform
    const [ay, ah] = Y.A1;
    g.fillStyle = on ? 'rgba(61,255,181,.16)' : 'rgba(61,255,181,.07)'; rr(a, ay, cw, ah, 3); g.fill();
    g.fillStyle = on ? 'rgba(61,255,181,.9)' : 'rgba(61,255,181,.35)';
    for (let x = a + 2; x < b - 2; x += 2.5) {
      const q = (x - xOf(i - 0.5)) / L;
      const v = Math.abs(Math.sin(q * 41 + wi) * 0.5 + Math.sin(q * 97 + wi * 3) * 0.3 + (hsh(Math.floor(q * 60) + wi * 100) - 0.5) * 0.6) * k;
      const hh = Math.max(1, v * ah * 0.8); g.fillRect(x, ay + ah / 2 - hh / 2, 1.5, hh);
    }
    // A2: music bed (longer, overlapping clips)
    const [my, mh] = Y.A2;
    if (i % 2 === 0) {
      const m0 = xOf(i - 0.5) + 2, m1 = xOf(i + 1.5) - 2;
      g.fillStyle = 'rgba(255,198,90,.08)'; rr(m0, my, m1 - m0, mh, 3); g.fill();
      g.fillStyle = 'rgba(255,198,90,.45)';
      for (let x = m0 + 2; x < m1 - 2; x += 3) { const q = (x - m0) / L; const v = 0.35 + 0.65 * Math.abs(Math.sin(q * 6.3 + i) * Math.sin(q * 23 + i * 2)); const hh = Math.max(1, v * mh * 0.7); g.fillRect(x, my + mh / 2 - hh / 2, 1.5, hh); }
    }
  }
  // fade the edges into the dark
  const fd = g.createLinearGradient(x0, 0, x1, 0);
  fd.addColorStop(0, 'rgba(2,3,8,.95)'); fd.addColorStop(0.16, 'rgba(2,3,8,0)'); fd.addColorStop(0.84, 'rgba(2,3,8,0)'); fd.addColorStop(1, 'rgba(2,3,8,.95)');
  g.fillStyle = fd; g.fillRect(x0, 0, x1 - x0, H);
  g.restore();
  // track headers + level meters
  if (!mob) {
    g.font = '600 9px Unbounded, system-ui, sans-serif'; g.textBaseline = 'middle';
    for (const k of ['V2', 'V1', 'A1', 'A2']) {
      const [ty, th] = Y[k];
      g.fillStyle = 'rgba(255,255,255,.04)'; rr(4, ty, head - 10, th, 4); g.fill();
      g.fillStyle = k[0] === 'V' ? 'rgba(157,128,255,.9)' : 'rgba(61,255,181,.9)'; g.fillText(k, 12, ty + th / 2);
      if (k[0] === 'A') {                                  // bouncing LED meter
        const lv = 0.45 + 0.4 * Math.abs(Math.sin(t * (k === 'A1' ? 7.3 : 5.1)) * Math.sin(t * 2.3 + (k === 'A1' ? 0 : 1)));
        for (let s = 0; s < 8; s++) { g.fillStyle = s / 8 < lv ? (s > 5 ? '#ff6a6a' : s > 3 ? '#ffc65a' : '#3dffb5') : 'rgba(255,255,255,.08)'; g.fillRect(34 + s * 3, ty + th / 2 - 4, 2, 8); }
      }
    }
  }
  // the playhead
  g.fillStyle = '#ffd27a'; g.shadowColor = 'rgba(255,200,110,.9)'; g.shadowBlur = 12;
  g.fillRect(Math.round(cx) - 1, 2, 2, H - 4);
  g.beginPath(); g.moveTo(cx - 7, 0); g.lineTo(cx + 7, 0); g.lineTo(cx + 7, 7); g.lineTo(cx, 13); g.lineTo(cx - 7, 7); g.closePath(); g.fill();
  g.shadowBlur = 0;
}

// ---------------------------------------------------------------- the aura ring behind the title (placeholder & accent)
const aura = $('#aura'), ag = aura.getContext('2d');
const motes = Array.from({ length: innerWidth < 700 ? 260 : 620 }, () => ({ a: Math.random() * TAU, r: 0.75 + Math.random() * 0.5, s: 0.4 + Math.random() * 1.6, sp: 0.04 + Math.random() * 0.1, hue: Math.random() }));
function drawAura(t) {
  if (!REEL.ring) return;
  const W = aura.width, H = aura.height;
  ag.setTransform(1, 0, 0, 1, 0, 0); ag.clearRect(0, 0, W, H);
  const cx = W / 2, cy = H * (innerWidth < 700 ? 0.3 : 0.34), rx = Math.min(W * 0.36, H * 0.62), ry = rx * 0.22;
  ag.globalCompositeOperation = 'lighter';
  for (const m of motes) {
    const a = m.a + t * m.sp * (reduce ? 0.2 : 1);
    const x = cx + Math.cos(a) * rx * m.r, y = cy + Math.sin(a) * ry * m.r - Math.cos(a) * ry * 0.35;
    const front = Math.sin(a) > 0 ? 1 : 0.45;
    const tw = 0.5 + 0.5 * Math.sin(t * 3 + m.a * 9);
    const c = m.hue < 0.55 ? '120,200,255' : m.hue < 0.85 ? '170,150,255' : '255,214,150';
    ag.fillStyle = `rgba(${c},${(0.55 * tw * front).toFixed(3)})`;
    const s = m.s * dpr * front;
    ag.beginPath(); ag.arc(x, y, s, 0, TAU); ag.fill();
  }
  // a soft glowing band along the ring
  ag.globalCompositeOperation = 'lighter';
  ag.strokeStyle = 'rgba(110,180,255,.08)'; ag.lineWidth = 18 * dpr; ag.beginPath(); ag.ellipse(cx, cy, rx, ry, -0.06, 0, TAU); ag.stroke();
  ag.globalCompositeOperation = 'source-over';
}

// ---------------------------------------------------------------- motion: auto roll, drag to scrub
const st = { off: 0, vel: 0, hold: false, slow: 0 };
const auto = () => (REEL.speed || 2) * (Math.PI / 180) / geo.step;   // clips per second (speed = degrees of arc per second)
let drag = null;
const area = $('.arc-wrap'), tlSec = $('.tl');
for (const zone of [area, tlSec]) {
  zone.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, lx: e.clientX, t: performance.now(), moved: 0, el: e.target.closest('.pn'), px: zone === tlSec ? (innerWidth < 700 ? 150 : Math.max(220, innerWidth * 0.16)) : geo.pw + geo.gap };
    zone.setPointerCapture(e.pointerId);
    st.hold = true; document.body.classList.add('scrubbing');
  });
  zone.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.lx, now = performance.now(), dt = Math.max(8, now - drag.t) / 1000;
    drag.lx = e.clientX; drag.t = now; drag.moved += Math.abs(dx);
    st.off -= dx / drag.px; st.vel = (-dx / drag.px) / dt;
  });
  const end = () => {
    if (!drag) return;
    if (drag.moved < 6 && drag.el) player.open(+drag.el.dataset.i, drag.el);
    drag = null; st.hold = false; document.body.classList.remove('scrubbing');
  };
  zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end);
}
area.addEventListener('pointerover', (e) => { st.slow = e.target.closest('.pn') ? 1 : 0; });
area.addEventListener('pointerleave', () => { st.slow = 0; });
addEventListener('keydown', (e) => {
  if (!$('#player').hidden) return;
  if (e.key === 'ArrowRight') st.vel += 3; if (e.key === 'ArrowLeft') st.vel -= 3;
});

// ---------------------------------------------------------------- frame loop
let last = performance.now(), cur = -1, hitT = -9, tSec = 0;
const nowCat = $('#now-cat'), nowTitle = $('#now-title'), tcEl = $('#tl-tc');
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (document.hidden) return;
  const open = !$('#player').hidden;
  tSec += dt;
  if (!st.hold && !open) {
    const target = auto() * (1 - st.slow * 0.8) * (reduce ? 0.35 : 1);
    st.vel += (target - st.vel) * Math.min(1, dt * 1.6);
    st.off += st.vel * dt;
  }
  // panels on the inside of a cylinder: the centre one faces you, the sides curve toward you
  const { R, step } = geo;
  const c = Math.round(st.off), ci = wrap(c, N);
  for (let k = 0; k < N; k++) {
    const p = panels[k];
    let d = wrap(k - st.off + N / 2, N) - N / 2;            // signed distance in clips, wrapped
    const th = -d * step;                                    // right of centre = positive d → enters from the right
    const vis = Math.abs(th) < 1.05;
    p.el.style.visibility = vis ? 'visible' : 'hidden';
    if (!vis) continue;
    const z = R * (1 - Math.cos(th));
    const focus = Math.max(0, 1 - Math.abs(d) * 1.6);
    p.el.style.transform = `translate3d(${(-R * Math.sin(th)).toFixed(1)}px, ${(-focus * 14).toFixed(1)}px, ${(z - R * 0.02).toFixed(1)}px) rotateY(${(th * 180 / Math.PI).toFixed(2)}deg) scale(${(1 + focus * 0.08).toFixed(3)})`;
    p.el.style.setProperty('--f', focus.toFixed(3));
    p.el.style.zIndex = String(100 - Math.round(Math.abs(d) * 10));
  }
  if (ci !== cur) {
    if (cur !== -1) {
      const el = panels[ci].el;
      el.classList.remove('glitch'); void el.offsetWidth; el.classList.add('glitch');
      hitT = tSec;
    }
    panels.forEach((p, k) => p.el.classList.toggle('on', k === ci));
    cur = ci;
    const w = WORKS[ci];
    nowCat.textContent = w.cat; nowTitle.textContent = w.t;
    nowTitle.parentElement.classList.remove('flash'); void nowTitle.offsetWidth; nowTitle.parentElement.classList.add('flash');
  }
  const hit = Math.max(0, 1 - (tSec - hitT) / 0.45);
  drawTimeline(st.off, tSec, hit);
  tcEl.textContent = tc(st.off * SEC_PER_CLIP);
  drawAura(tSec);
}
layout();
addEventListener('resize', layout);
requestAnimationFrame(frame);
requestAnimationFrame(() => document.body.classList.add('revealed'));
