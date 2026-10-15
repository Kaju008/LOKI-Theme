import * as THREE from 'three';
import { gsap } from 'gsap';
import Lenis from 'lenis';
import { detectTier, createRenderer } from './core/renderer.js';
import { createIntro } from './intro/brain.js';
import { createWorld, REG } from './world/world.js';
import { createRig } from './story.js';
import { buildUI, setWorkProgress } from './ui.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const win = (p, a, b, c, d) => Math.min(seg(p, a, b), 1 - seg(p, c, d));
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

const tier = detectTier();
const canvas = $('#gl');
let core;
try { core = createRenderer(canvas, tier); }
catch (e) { document.body.classList.remove('is-intro'); document.body.classList.add('live', 'no-gl'); $('#gate').classList.add('out'); console.error(e); }

const { renderer, composer, renderPass, bloom, final } = core || {};
const intro = createIntro(tier);
let mode = 'intro';
let world = null, rig = null;
const flight = { k: 1 };       // 0 = far away, 1 = on the rig
const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
addEventListener('pointermove', (e) => { mouse.x = e.clientX / innerWidth - 0.5; mouse.y = e.clientY / innerHeight - 0.5; }, { passive: true });

// ------------------------------------------------------------------ world loads in the background
const loadBar = $('#load-bar');
let loaded = 0;
THREE.DefaultLoadingManager.onProgress = (u, l, t) => { loaded = l / t; loadBar.style.transform = `scaleX(${Math.max(loaded, 0.15)})`; };
const worldReady = (async () => {
  await new Promise((r) => setTimeout(r, 60));
  const w = await createWorld(renderer, tier);
  loadBar.style.transform = 'scaleX(1)';
  // pre-compile shaders to avoid hitches on first frame
  renderer.compile(w.scene, w.camera);
  return w;
})();
worldReady.then((w) => { world = w; }).catch((e) => console.error('world', e));

// ------------------------------------------------------------------ UI + scrolling
const ui = buildUI({ onPlayerOpen: () => lenis && lenis.stop(), onPlayerClose: () => lenis && lenis.start() });
let lenis = null;
const secs = ['hero', 'about', 'work', 'skills', 'contact'].map((id) => ({ id, el: document.getElementById(id), top: 0, h: 1 }));
function measure() {
  secs.forEach((s) => { s.top = s.el.offsetTop; s.h = Math.max(1, s.el.offsetHeight - innerHeight); });
  rig && rig.refresh();
}
function goTo(id) {
  const s = secs.find((x) => x.id === id); if (!s) return;
  const f = { hero: 0.22, about: 0.5, work: 0.06, skills: 0.35, contact: 0.6 }[id] ?? 0;
  const y = s.top + s.h * f;
  lenis ? lenis.scrollTo(y, { duration: 2.2, easing: (t) => 1 - Math.pow(1 - t, 4) }) : scrollTo(0, y);
}
$$('[data-go]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); goTo(a.dataset.go); }));

// ------------------------------------------------------------------ GATE: the Before / After slider
const slider = $('#slider'), knob = $('#slider-knob');
let v = 0, dragging = false, started = false;
const setV = (x) => { v = clamp(x); slider.style.setProperty('--v', v); slider.setAttribute('aria-valuenow', Math.round(v * 100)); $('#mode-a').classList.toggle('on', v < 0.5); $('#mode-b').classList.toggle('on', v >= 0.5); };
setV(0);
slider.classList.add('ready');
const posToV = (cx) => { const r = slider.getBoundingClientRect(); return (cx - r.left - 38) / (r.width - 76); };
slider.addEventListener('pointerdown', (e) => { if (started) return; dragging = true; slider.setPointerCapture(e.pointerId); slider.style.cursor = 'grabbing'; setV(posToV(e.clientX)); });
slider.addEventListener('pointermove', (e) => { if (dragging) { setV(posToV(e.clientX)); if (v >= 0.985) { dragging = false; begin(); } } });
addEventListener('pointerup', () => release());
const release = () => {
  if (!dragging) return; dragging = false; slider.style.cursor = '';
  if (v > 0.8) { gsap.to({ x: v }, { x: 1, duration: 0.25, onUpdate() { setV(this.targets()[0].x); }, onComplete: begin }); }
  else gsap.to({ x: v }, { x: 0, duration: 0.6, ease: 'elastic.out(1,0.6)', onUpdate() { setV(this.targets()[0].x); } });
};
slider.addEventListener('pointerup', release); slider.addEventListener('pointercancel', release);
slider.addEventListener('keydown', (e) => { if (['Enter', ' ', 'ArrowRight'].includes(e.key)) { e.preventDefault(); gsap.to({ x: v }, { x: 1, duration: 0.5, onUpdate() { setV(this.targets()[0].x); }, onComplete: begin }); } });
// tap on mobile = auto-slide
slider.addEventListener('click', () => { if (!started && v < 0.05 && !dragging) gsap.to({ x: 0 }, { x: 1, duration: 0.9, ease: 'power2.inOut', onUpdate() { setV(this.targets()[0].x); }, onComplete: begin }); });
$('#skip').addEventListener('click', () => begin(true));
$('#replay').addEventListener('click', () => { scrollTo(0, 0); location.reload(); });

async function begin(skip = false) {
  if (started) return; started = true;
  $('#gate').classList.add('out');
  const U = intro.uniforms;
  if (skip || reduce || !core) {
    $('#flash').style.opacity = 1;
    await worldReady;
    toWorld(true);
    return;
  }
  const cap = $('#intro-caption');
  const tl = gsap.timeline();
  tl.to(U.uForm, { value: 1, duration: 3.8, ease: 'power2.inOut' }, 0)
    .to(intro.camera.position, { z: 4.4, y: 0.1, duration: 4.2, ease: 'power2.inOut' }, 0)
    .add(() => cap.classList.add('on'), 3.6);
  await tl.then();
  await Promise.all([worldReady, new Promise((r) => setTimeout(r, 2600))]);
  cap.classList.remove('on');
  const b = gsap.timeline();
  b.to(intro.state, { spin: 4, duration: 1.2, ease: 'power2.in' }, 0)
    .to(U.uBurst, { value: 1, duration: 2.8, ease: 'power2.in' }, 0.5)
    .to(intro.camera.position, { z: -1.5, duration: 3.0, ease: 'power3.in' }, 0.6)
    .to(intro.warp.uWarp, { value: 1, duration: 1.8, ease: 'power2.in' }, 1.4)
    .to(intro.camera, { fov: 95, duration: 2.2, ease: 'power3.in', onUpdate: () => intro.camera.updateProjectionMatrix() }, 1.4)
    .to(final.uniforms.uCA, { value: 0.02, duration: 2, ease: 'power2.in' }, 1.4)
    .to(bloom, { strength: 1.8, duration: 2, ease: 'power2.in' }, 1.4)
    .to('#flash', { opacity: 1, duration: 0.45, ease: 'power2.in' }, 3.1);
  await b.then();
  toWorld(false);
}

function toWorld(fast) {
  mode = 'world';
  document.body.classList.remove('is-intro');
  document.body.classList.add('live');
  scrollTo(0, 0);
  intro.dispose();
  final.uniforms.uCA.value = 0.0015; bloom.strength = 0.9; bloom.threshold = 1.25;
  rig = createRig(world.camera, REG, world.headPos, { card: !!world.heroCard });
  lenis = new Lenis({ duration: 1.35, smoothWheel: true, wheelMultiplier: 0.9, touchMultiplier: 1.4 });
  measure();
  flight.k = 0;
  gsap.to(flight, { k: 1, duration: fast ? 2.2 : 3.8, ease: 'power3.out' });
  gsap.to('#flash', { opacity: 0, duration: fast ? 1.0 : 1.6, ease: 'power2.out', delay: 0.05 });
  setTimeout(() => $('#gate').remove(), 1500);
}

addEventListener('resize', () => {
  if (!core) return;
  core.resize(); intro.resize(); world && world.resize();
  ui.relayout(); measure();
});

// ------------------------------------------------------------------ frame loop
const clock = new THREE.Clock();
let sp = 0;                            // smoothed scroll progress
const farPos = new THREE.Vector3(0, 40, 980), camPos = new THREE.Vector3(), camTgt = new THREE.Vector3(), right = new THREE.Vector3(), upv = new THREE.Vector3();
const heroTitle = $('#hero-title'), heroQuote = $('#hero-quote'), cue = $('#scroll-cue'), hint = $('#hero-hint');
const scrollEl = $('#scroll'), railFill = $('#rail-fill'), railLinks = $$('.rail a'), navLinks = $$('.nav a'), skillsGrid = $('#skills-grid');

function updateDOM(y) {
  const L = {};
  secs.forEach((s) => (L[s.id] = clamp((y - s.top) / s.h)));
  // hero
  const h = L.hero;
  const tv = win(h, 0.14, 0.24, 0.5, 0.6);
  heroTitle.style.opacity = tv;
  heroTitle.style.transform = `translateY(${(1 - seg(h, 0.14, 0.26)) * 40 - seg(h, 0.5, 0.6) * 30}px) scale(${1 - seg(h, 0.5, 0.6) * 0.05})`;
  heroTitle.style.filter = `blur(${(1 - tv) * 10}px)`;
  const qv = win(h, 0.74, 0.8, 0.9, 0.97);
  heroQuote.style.opacity = qv; heroQuote.style.filter = `blur(${(1 - qv) * 8}px)`;
  cue.style.opacity = 1 - seg(h, 0.02, 0.08);
  hint.style.opacity = win(h, 0.3, 0.36, 0.66, 0.72);
  // about
  const a = L.about;
  scrollEl.style.setProperty('--vis', win(a, -0.02, 0.1, 0.9, 1).toFixed(3));
  scrollEl.style.setProperty('--open', seg(a, 0.08, 0.42).toFixed(3));
  scrollEl.style.setProperty('--show', seg(a, 0.34, 0.48).toFixed(3));
  // work
  setWorkProgress(seg(L.work, 0.05, 0.95));
  // skills
  if (L.skills > 0.08) skillsGrid.classList.add('on');
  // portal pulse near contact
  if (world) world.portal.uniforms.uPulse.value = seg(L.contact, 0, 0.6) * 0.4;
  // rail / nav
  const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
  railFill.style.transform = `scaleY(${clamp(y / max)})`;
  let act = 0; secs.forEach((s, i) => { if (y >= s.top - innerHeight * 0.5) act = i; });
  railLinks.forEach((l, i) => l.classList.toggle('on', i === act));
  navLinks.forEach((l) => l.classList.toggle('on', l.dataset.go === secs[act].id));
}

function frame(now) {
  requestAnimationFrame(frame);
  if (!core) return;
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
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
    world.update(t, dt);
    world.starsStretch && (world.starsStretch.value = 1 - flight.k);
    renderPass.scene = world.scene; renderPass.camera = cam;
    updateDOM(y);
  }
  final.uniforms.uTime.value = t;
  composer.render(dt);
}
requestAnimationFrame(frame);

// debug hooks (used by automated checks)
window.__kaju = { THREE, core, flight, finishFlight() { gsap.killTweensOf(flight); flight.k = 1; gsap.killTweensOf('#flash'); $('#flash').style.opacity = 0; }, get lenis() { return lenis; }, measure, begin, goTo, get world() { return world; }, get mode() { return mode; }, intro, tier };
