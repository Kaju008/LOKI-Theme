import * as THREE from 'three';
import { gsap } from 'gsap';
import Lenis from 'lenis';
import { detectTier, createRenderer } from '../core/renderer.js';
import { createIntro } from '../intro/brain.js';
import { createWorld, REG } from '../world/world.js';
import { createRig } from '../story.js';
import { buildUI, setWorkProgress, layoutSkills } from '../ui.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const win = (p, a, b, c, d) => Math.min(seg(p, a, b), 1 - seg(p, c, d));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

const tier = detectTier();
const canvas = $('#gl');
let core;
try { core = createRenderer(canvas, tier); }
catch (e) { document.body.classList.remove('is-intro'); document.body.classList.add('live', 'no-gl'); $('#gate').classList.add('out'); console.error(e); }

const { renderer, composer, renderPass, bloom, final, tunnel } = core || {};
const intro = createIntro(tier);
let mode = 'intro';
let world = null, rig = null;
const flight = { k: 1 };       // 0 = far away, 1 = on the rig
const tun = { speed: 0 };
const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
addEventListener('pointermove', (e) => { mouse.x = e.clientX / innerWidth - 0.5; mouse.y = e.clientY / innerHeight - 0.5; }, { passive: true });

// the brain is already alive behind the headline: it condenses out of the dust as the page opens
if (core && !reduce) gsap.to(intro.uniforms.uForm, { value: 1, duration: 3.6, delay: 0.15, ease: 'power2.inOut' });
else intro.uniforms.uForm.value = 1;

// ------------------------------------------------------------------ world loads in the background
const loadBar = $('#load-bar');
THREE.DefaultLoadingManager.onProgress = (u, l, t) => { loadBar.style.transform = `scaleX(${Math.max(l / t, 0.12)})`; };
const worldReady = (async () => {
  await new Promise((r) => setTimeout(r, 60));
  const w = await createWorld(renderer, tier);
  loadBar.style.transform = 'scaleX(1)';
  return w;
})();
worldReady.then((w) => { world = w; }).catch((e) => console.error('world', e));

// compile every shader and upload every texture while the tunnel hides the swap
async function prewarm(w) {
  const vis = []; w.scene.traverse((o) => { if (!o.visible) { vis.push(o); o.visible = true; } });
  try { await (renderer.compileAsync ? renderer.compileAsync(w.scene, w.camera) : renderer.compile(w.scene, w.camera)); } catch (e) { /* noop */ }
  const seen = new Set();
  w.scene.traverse((o) => {
    if (!o.material) return;
    for (const m of [].concat(o.material)) {
      for (const k of ['map', 'normalMap', 'envMap', 'bumpMap']) if (m[k] && !seen.has(m[k])) seen.add(m[k]);
      if (m.uniforms) for (const v of Object.values(m.uniforms)) if (v && v.value && v.value.isTexture) seen.add(v.value);
      if (m.userData && m.userData.u) for (const v of Object.values(m.userData.u)) if (v && v.value && v.value.isTexture) seen.add(v.value);
    }
  });
  seen.forEach((t) => { try { if (t.image) renderer.initTexture(t); } catch (e) { /* noop */ } });
  vis.forEach((o) => (o.visible = false));
}

// ------------------------------------------------------------------ UI + scrolling
const ui = buildUI({ onPlayerOpen: () => lenis && lenis.stop(), onPlayerClose: () => lenis && lenis.start() });
let lenis = null;
const secs = ['hero', 'about', 'work', 'skills', 'contact'].map((id) => ({ id, el: document.getElementById(id), top: 0, h: 1, full: 1 }));
function measure() {
  secs.forEach((s) => { s.top = s.el.offsetTop; s.full = s.el.offsetHeight; s.h = Math.max(1, s.el.offsetHeight - innerHeight); });
  rig && rig.refresh();
}
function goTo(id) {
  const s = secs.find((x) => x.id === id); if (!s) return;
  const f = { hero: 0.22, about: 0.5, work: 0.06, skills: 0.45, contact: 0.6 }[id] ?? 0;
  const y = s.top + s.h * f;
  lenis ? lenis.scrollTo(y, { duration: 2.2, easing: (t) => 1 - Math.pow(1 - t, 4) }) : scrollTo(0, y);
}
$$('[data-go]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); goTo(a.dataset.go); }));

// ------------------------------------------------------------------ GATE: the liquid slider
const slider = $('#slider');
let v = 0, dragging = false, started = false;
const setV = (x) => { v = clamp(x); slider.style.setProperty('--v', v.toFixed(4)); slider.setAttribute('aria-valuenow', Math.round(v * 100)); };
setV(0);
slider.classList.add('ready');
const posToV = (cx) => { const r = slider.getBoundingClientRect(); return (cx - r.left - 38) / (r.width - 76); };
slider.addEventListener('pointerdown', (e) => { if (started) return; dragging = true; slider.setPointerCapture(e.pointerId); slider.classList.add('grab'); setV(posToV(e.clientX)); });
slider.addEventListener('pointermove', (e) => { if (dragging) { setV(posToV(e.clientX)); if (v >= 0.985) { dragging = false; begin(); } } });
const release = () => {
  if (!dragging) return; dragging = false; slider.classList.remove('grab');
  if (v > 0.8) { gsap.to({ x: v }, { x: 1, duration: 0.25, onUpdate() { setV(this.targets()[0].x); }, onComplete: begin }); }
  else gsap.to({ x: v }, { x: 0, duration: 0.6, ease: 'elastic.out(1,0.6)', onUpdate() { setV(this.targets()[0].x); } });
};
addEventListener('pointerup', release);
slider.addEventListener('pointerup', release); slider.addEventListener('pointercancel', release);
slider.addEventListener('keydown', (e) => { if (['Enter', ' ', 'ArrowRight'].includes(e.key)) { e.preventDefault(); gsap.to({ x: v }, { x: 1, duration: 0.5, onUpdate() { setV(this.targets()[0].x); }, onComplete: begin }); } });
slider.addEventListener('click', () => { if (!started && v < 0.05 && !dragging) gsap.to({ x: 0 }, { x: 1, duration: 0.9, ease: 'power2.inOut', onUpdate() { setV(this.targets()[0].x); }, onComplete: begin }); });
$('#skip').addEventListener('click', () => begin(true));
$('#replay').addEventListener('click', () => { scrollTo(0, 0); location.reload(); });

// One continuous shot: spin → burst toward the lens → into the time tunnel → land by the bridge.
async function begin(skip = false) {
  if (started) return; started = true;
  $('#gate').classList.add('out');
  if (skip || reduce || !core) {
    final.uniforms.uFade.value = 1;
    const w = await worldReady; await prewarm(w);
    toWorld(true);
    return;
  }
  const U = intro.uniforms, S = intro.state, T = tunnel.uniforms, cap = $('#intro-caption');
  gsap.to(U.uForm, { value: 1, duration: 0.8, ease: 'power2.out' });
  const tl = gsap.timeline();
  tl.to(S, { orbit: 0, duration: 1.4, ease: 'power2.inOut' }, 0)
    .to(S, { spin: 16, duration: 2.2, ease: 'power2.in' }, 0)
    .to(U.uBurst, { value: 1, duration: 2.5, ease: 'power2.in' }, 1.1)
    .to(S, { dist: 0.4, duration: 2.8, ease: 'power3.in' }, 0.9)
    .to(intro.camera, { fov: 82, duration: 2.6, ease: 'power2.in', onUpdate: () => intro.camera.updateProjectionMatrix() }, 1.1)
    .to(intro.warp.uWarp, { value: 1, duration: 1.6, ease: 'power2.in' }, 1.7)
    .add(() => { tunnel.enabled = true; }, 2.1)
    .to(T.uIn, { value: 1, duration: 1.4, ease: 'power2.in' }, 2.1)
    .to(T.uBlur, { value: 1, duration: 1.4, ease: 'power2.in' }, 2.1)
    .to(tun, { speed: 1, duration: 1.8, ease: 'power2.in' }, 1.9)
    .to(final.uniforms.uCA, { value: 0.008, duration: 1.4 }, 2.1)
    .add(() => cap.classList.add('on'), 3.0);
  await tl.then();
  // fully inside the tunnel — swap the universe in underneath
  const w = await worldReady;
  await Promise.all([prewarm(w), wait(700)]);
  toWorld(false);
  const ex = gsap.timeline();
  ex.add(() => cap.classList.remove('on'), 0.5)
    .to(T.uOpen, { value: 1, duration: 2.6, ease: 'power2.inOut' }, 0.3)
    .to(T.uBlur, { value: 0, duration: 2.4, ease: 'power2.out' }, 0.5)
    .to(tun, { speed: 0.15, duration: 2.6, ease: 'power2.out' }, 0.2)
    .to(final.uniforms.uCA, { value: 0.0012, duration: 2.0 }, 0.6);
  await ex.then();
  tunnel.enabled = false;
}

function toWorld(fast) {
  mode = 'world';
  document.body.classList.remove('is-intro');
  document.body.classList.add('live');
  scrollTo(0, 0);
  intro.dispose();
  bloom.strength = 0.85; bloom.radius = 0.35; bloom.threshold = 1.15;
  rig = createRig(world.camera, REG, world.headPos, { card: true });
  lenis = new Lenis({ duration: 1.35, smoothWheel: true, wheelMultiplier: 0.9, touchMultiplier: 1.4 });
  measure();
  flight.k = 0;
  gsap.to(flight, { k: 1, duration: fast ? 2.6 : 4.4, ease: fast ? 'power2.out' : 'power3.out' });
  if (fast) gsap.to(final.uniforms.uFade, { value: 0, duration: 1.4, ease: 'power2.out' });
  setTimeout(() => $('#gate') && $('#gate').remove(), 1500);
}

addEventListener('resize', () => {
  if (!core) return;
  core.resize(); intro.resize(); world && world.resize();
  ui.relayout(); measure();
});

// ------------------------------------------------------------------ frame loop
const clock = new THREE.Clock();
let sp = 0;                            // smoothed scroll progress
const farPos = new THREE.Vector3(0, 30, 440), camPos = new THREE.Vector3(), camTgt = new THREE.Vector3(), right = new THREE.Vector3(), upv = new THREE.Vector3(), tmp = new THREE.Vector3();
const heroTitle = $('#hero-title'), heroQuote = $('#hero-quote'), cue = $('#scroll-cue'), hint = $('#hero-hint');
const scrollEl = $('#scroll'), railFill = $('#rail-fill'), railLinks = $$('.rail a'), navLinks = $$('.nav a'), skillsEl = $('#skills-grid');
const veil = $('#veil');
// per-chapter atmosphere: [darkness, blur px]
const VEIL = [[0, 0], [0.42, 5], [0.16, 0], [0.04, 0], [0.24, 0]];

function chapterOf(y) {
  let c = 0;
  for (let i = 0; i < secs.length; i++) if (y >= secs[i].top) c = i + clamp((y - secs[i].top) / secs[i].full);
  return Math.min(4.999, c);
}

function updateDOM(y, ch) {
  const L = {};
  secs.forEach((s) => (L[s.id] = clamp((y - s.top) / s.h)));
  // hero
  const h = L.hero;
  const tv = win(h, 0.12, 0.22, 0.5, 0.6);
  heroTitle.style.opacity = tv;
  heroTitle.style.transform = `translateY(${(1 - seg(h, 0.12, 0.24)) * 30 - seg(h, 0.5, 0.6) * 24}px)`;
  heroTitle.style.filter = tv < 1 ? `blur(${(1 - tv) * 8}px)` : 'none';
  const qv = win(h, 0.72, 0.8, 0.92, 0.98);
  heroQuote.style.opacity = qv; heroQuote.style.filter = qv < 1 ? `blur(${(1 - qv) * 8}px)` : 'none';
  heroQuote.style.setProperty('--q', qv.toFixed(3));
  cue.style.opacity = 1 - seg(h, 0.02, 0.08);
  hint.style.opacity = win(h, 0.3, 0.36, 0.66, 0.72);
  // about
  const a = L.about;
  scrollEl.style.setProperty('--vis', win(a, -0.02, 0.1, 0.9, 1).toFixed(3));
  scrollEl.style.setProperty('--open', seg(a, 0.08, 0.42).toFixed(3));
  scrollEl.style.setProperty('--show', seg(a, 0.34, 0.48).toFixed(3));
  // work
  setWorkProgress(seg(L.work, 0.05, 0.95));
  // skills — tools emerge from the black hole and fly out to their orbits
  if (world && Math.abs(ch - 3.5) < 1.2) {
    world.bh.group.getWorldPosition(tmp).project(world.camera);
    layoutSkills((tmp.x * 0.5 + 0.5) * innerWidth, (-tmp.y * 0.5 + 0.5) * innerHeight, seg(L.skills, 0.0, 0.42), clock.elapsedTime);
  }
  skillsEl.classList.toggle('on', L.skills > 0.02);
  // portal pulse near contact
  if (world) world.portal.uniforms.uPulse.value = seg(L.contact, 0, 0.6) * 0.25;
  // chapter veil: each section gets its own atmosphere, with a soft dip between chapters
  const i = Math.min(3, Math.floor(ch)), f = ch - i;
  const e = clamp((f - 0.82) / 0.18);
  const base = VEIL[i], next = VEIL[i + 1];
  const dk = base[0] + (next[0] - base[0]) * e, bl = base[1] + (next[1] - base[1]) * e;
  const dip = Math.sin(e * Math.PI) * 0.35;
  veil.style.setProperty('--dk', (dk + dip).toFixed(3));
  veil.style.setProperty('--bl', bl.toFixed(2) + 'px');
  // rail / nav
  const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
  railFill.style.transform = `scaleY(${clamp(y / max)})`;
  const act = Math.min(4, Math.floor(ch + 0.15));
  railLinks.forEach((l, k) => l.classList.toggle('on', k === act));
  navLinks.forEach((l) => l.classList.toggle('on', l.dataset.go === secs[act].id));
  document.body.dataset.chapter = secs[act].id;
}

function frame(now) {
  requestAnimationFrame(frame);
  if (!core) return;
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  tunnel.uniforms.uTime.value = t;
  tunnel.uniforms.uTravel.value += dt * tun.speed * 9;
  if (mode === 'intro') {
    intro.update(t, dt);
    renderPass.scene = intro.scene; renderPass.camera = intro.camera;
  } else if (world) {
    lenis.raf(now);
    const y = lenis.scroll;
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const p = clamp(y / max);
    sp += (p - sp) * Math.min(1, dt * 4.5); if (window.__snap) sp = p;
    const s = rig.sample(sp);
    camTgt.copy(s.tgt);
    camPos.copy(s.pos);
    // gentle hand-held parallax from the pointer
    mouse.sx += (mouse.x - mouse.sx) * Math.min(1, dt * 2.5); mouse.sy += (mouse.y - mouse.sy) * Math.min(1, dt * 2.5);
    const cam = world.camera;
    const dist = camPos.distanceTo(camTgt);
    right.subVectors(camTgt, camPos).cross(cam.up).normalize();
    upv.copy(cam.up);
    const amp = Math.min(1.2, dist * 0.05);
    camPos.addScaledVector(right, mouse.sx * amp).addScaledVector(upv, -mouse.sy * amp * 0.6);
    camPos.y += Math.sin(t * 0.4) * 0.04 * Math.min(1, dist / 4);
    if (flight.k < 1) { const k = flight.k; camPos.lerpVectors(farPos, camPos, k); }
    cam.position.copy(camPos);
    cam.lookAt(camTgt);
    if (Math.abs(cam.fov - s.fov) > 0.01) { cam.fov = s.fov; cam.updateProjectionMatrix(); }
    const ch = chapterOf(sp * max);
    // bloom per chapter (the contact portal is a huge light source — keep its glow from veiling Kaju)
    if (flight.k >= 1) { const B = [0.85, 0.75, 0.8, 0.9, 0.45]; const i = Math.min(3, Math.floor(ch)), f = ch - i; bloom.strength = B[i] + (B[i + 1] - B[i]) * f; }
    world.update(t, dt, ch);
    renderPass.scene = world.scene; renderPass.camera = cam;
    updateDOM(y, ch);
  }
  final.uniforms.uTime.value = t;
  composer.render(dt);
}
requestAnimationFrame(frame);

// debug hooks (used by automated checks)
window.__kaju = { THREE, core, flight, tun, finishFlight() { gsap.killTweensOf(flight); flight.k = 1; final.uniforms.uFade.value = 0; }, get lenis() { return lenis; }, measure, begin, goTo, get world() { return world; }, get mode() { return mode; }, intro, tier, gsap };
