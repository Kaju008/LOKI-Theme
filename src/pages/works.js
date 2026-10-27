// My Works — a sphere of frames built in CSS 3D.
// The cards sit on a Fibonacci sphere around one 0×0 point; the title lives at that same
// point inside the 3D world and counter-rotates so it always faces you. Drag to rotate
// (with momentum), it drifts slowly on its own, and a click plays the video.
import '../pages.js';
import { WORKS } from '../config.js';
import { $, $$, thumb, buildPlayer } from './common.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;
const player = buildPlayer();
const stage = $('#stage'), world = $('#world'), orb = $('#orb'), headline = $('#headline'), tip = $('#orb-tip');
const D2R = Math.PI / 180;

// ---------------------------------------------------------------- cards on a Fibonacci sphere
const N = WORKS.length, GA = Math.PI * (3 - Math.sqrt(5));
const cards = WORKS.map((w, i) => {
  const y = 1 - (i / (N - 1)) * 2, rad = Math.sqrt(Math.max(0, 1 - y * y)), th = i * GA;
  const x = Math.cos(th) * rad, z = Math.sin(th) * rad;
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'fc' + (w.p === 'yt' ? ' wide' : '');
  el.dataset.idx = i;
  el.setAttribute('aria-label', `Play: ${w.t}`);
  el.innerHTML = `<figure><img alt="" draggable="false" decoding="async"><span class="play" aria-hidden="true"></span></figure>`;
  const img = el.querySelector('img');
  img.onload = () => img.classList.add('in');
  img.onerror = () => { el.classList.add('noimg'); el.querySelector('figure').insertAdjacentHTML('beforeend', `<span class="ph">${w.t}</span>`); };
  img.src = thumb(w);
  orb.appendChild(el);
  return { el, w, x, y, z, lat: Math.asin(y) / D2R, lon: Math.atan2(x, z) / D2R, d: -1, o: -1 };
});

// ---------------------------------------------------------------- layout (radius, card size, perspective)
let R = 300, lastW = 0, lastH = 0, persp = 1150;
function layout(force) {
  const W = innerWidth, H = innerHeight;
  if (!force && Math.abs(W - lastW) < 20 && Math.abs(H - lastH) < 20) return;
  lastW = W; lastH = H;
  const hr = W <= 380 ? 0.38 : W <= 640 ? 0.42 : 0.46;
  const wr = W <= 380 ? 0.48 : W <= 640 ? 0.52 : 0.58;
  const floor = W <= 380 ? 108 : W <= 640 ? 120 : 155;
  R = Math.max(floor, Math.min(480, H * hr, W * wr));
  const sc = W <= 380 ? 0.44 : W <= 640 ? 0.46 : 0.47;
  const cw = Math.round(Math.max(72, R * sc));
  document.documentElement.style.setProperty('--cw', cw + 'px');
  persp = W <= 380 ? 620 : W <= 640 ? 760 : W <= 900 ? 920 : 1150;
  document.documentElement.style.setProperty('--persp', persp + 'px');
  for (const c of cards) {
    c.el.style.transform = `translate3d(${(c.x * R).toFixed(2)}px, ${(-c.y * R).toFixed(2)}px, ${(c.z * R).toFixed(2)}px) rotateY(${c.lon.toFixed(3)}deg) rotateX(${c.lat.toFixed(3)}deg)`;
  }
}
layout(true);
addEventListener('resize', () => layout(false));
addEventListener('orientationchange', () => setTimeout(() => layout(true), 220));
if (window.visualViewport) visualViewport.addEventListener('resize', () => layout(false));

// ---------------------------------------------------------------- drag to rotate (with momentum)
const st = { spin: 0, tilt: -4, dragX: 0, dragY: 0, velX: 0, velY: 0, idle: reduce ? 0 : 3.2 };   // idle: slow drift, deg/s
let ptr = null;
const SLOP = coarse ? 14 : 6, K = 0.13;
stage.addEventListener('pointerdown', (e) => {
  if (!$('#player').hidden) return;
  const card = e.target.closest('.fc');                  // read before capture retargets the event
  ptr = { id: e.pointerId, x0: e.clientX, y0: e.clientY, lx: e.clientX, ly: e.clientY, card, moved: 0, captured: false, type: e.pointerType };
  if (e.pointerType !== 'touch') { stage.setPointerCapture(e.pointerId); ptr.captured = true; }
  document.body.classList.add('grabbing');
});
stage.addEventListener('pointermove', (e) => {
  if (!ptr || e.pointerId !== ptr.id) return;
  const dx = e.clientX - ptr.lx, dy = e.clientY - ptr.ly;
  ptr.lx = e.clientX; ptr.ly = e.clientY;
  ptr.moved = Math.max(ptr.moved, Math.hypot(e.clientX - ptr.x0, e.clientY - ptr.y0));
  if (!ptr.captured && ptr.moved > 10) {
    const ax = Math.abs(e.clientX - ptr.x0), ay = Math.abs(e.clientY - ptr.y0);
    if (ay > ax * 1.15) { ptr = null; document.body.classList.remove('grabbing'); return; }   // vertical swipe: let the page be
    stage.setPointerCapture(e.pointerId); ptr.captured = true;
  }
  if (ptr.moved <= SLOP && !ptr.captured) return;
  st.dragX += dx * K; st.dragY -= dy * K;
  st.velX = dx * K; st.velY = -dy * K;
  clampPitch();
});
const up = (e) => {
  if (!ptr || e.pointerId !== ptr.id) return;
  if (ptr.moved <= SLOP && ptr.card) {
    const i = +ptr.card.dataset.idx;
    st.velX = st.velY = 0;
    player.open(i, ptr.card);
  }
  ptr = null; document.body.classList.remove('grabbing');
};
stage.addEventListener('pointerup', up);
stage.addEventListener('pointercancel', up);
// keyboard: each card is a button
cards.forEach((c, i) => c.el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); player.open(i, c.el); } }));
function clampPitch() { const p = st.tilt + st.dragY; if (p > 32) st.dragY = 32 - st.tilt; if (p < -32) st.dragY = -32 - st.tilt; }

// hover: a small title card follows the cursor
stage.addEventListener('pointerover', (e) => {
  const c = e.target.closest('.fc');
  if (!c || ptr) { tip.classList.remove('on'); return; }
  const w = WORKS[+c.dataset.idx];
  tip.querySelector('small').textContent = w.cat; tip.querySelector('b').textContent = w.t;
  tip.classList.add('on');
});
stage.addEventListener('pointerout', (e) => { if (!e.relatedTarget || !e.relatedTarget.closest || !e.relatedTarget.closest('.fc')) tip.classList.remove('on'); });

// ---------------------------------------------------------------- custom cursor (fine pointers)
const dot = $('#dot');
const cur = { x: innerWidth / 2, y: innerHeight / 2, tx: innerWidth / 2, ty: innerHeight / 2 };
if (!coarse) {
  addEventListener('pointermove', (e) => {
    cur.tx = e.clientX; cur.ty = e.clientY;
    dot.classList.toggle('wide', !!(e.target.closest && e.target.closest('.fc, a, button')));
    tip.style.transform = `translate(${e.clientX + 22}px, ${e.clientY + 22}px)`;
  }, { passive: true });
} else dot.remove();

// ---------------------------------------------------------------- frame loop
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (!coarse) { cur.x += (cur.tx - cur.x) * 0.2; cur.y += (cur.ty - cur.y) * 0.2; dot.style.transform = `translate3d(${cur.x.toFixed(1)}px, ${cur.y.toFixed(1)}px, 0)`; }
  const open = !$('#player').hidden;
  if (!ptr && !open) {
    st.dragX += st.velX; st.dragY += st.velY;
    st.velX *= 0.94; st.velY *= 0.94;
    if (Math.abs(st.velX) < 0.002) st.velX = 0; if (Math.abs(st.velY) < 0.002) st.velY = 0;
    st.spin += st.idle * dt;                                   // slow drift when left alone
    clampPitch();
  }
  const sx = st.tilt + st.dragY, sy = st.spin + st.dragX;
  world.style.transform = `rotateY(${sy.toFixed(3)}deg) rotateX(${sx.toFixed(3)}deg)`;
  headline.style.transform = `rotateX(${(-sx).toFixed(3)}deg) rotateY(${(-sy).toFixed(3)}deg) translateZ(${(R * 0.62).toFixed(1)}px)`;
  // depth: cards on the far side fall into a black wash
  const cx = Math.cos(sx * D2R), sxn = Math.sin(sx * D2R), cy = Math.cos(sy * D2R), syn = Math.sin(sy * D2R);
  const near = persp * 0.66;
  for (const c of cards) {
    // CSS space: (x, -y, z); rotateX(sx) then rotateY(sy)
    const X = c.x, Y = -c.y, Z = c.z;
    const z1 = Y * sxn + Z * cx;
    const zf = -X * syn + z1 * cy;
    const base = 0.14 + 0.86 * Math.pow((zf + 1) / 2, 0.85);
    let dim = 1 - base;
    if (open) dim = Math.min(1, dim + 0.78);
    const az = zf * R;
    const fade = az > near ? Math.max(0, 1 - (az - near) / 190) : 1;
    const d = Math.round(dim * 100) / 100, o = Math.round(fade * 100) / 100;
    if (d !== c.d) { c.el.style.setProperty('--d', d); c.d = d; }
    if (o !== c.o) { c.el.style.opacity = o; c.o = o; }
  }
}
requestAnimationFrame(frame);
requestAnimationFrame(() => document.body.classList.add('revealed'));
