import * as THREE from 'three';
import { gsap } from 'gsap';
import Lenis from 'lenis';
import { detectTier, createRenderer } from './core/renderer.js';
import { createIntro } from './intro/brain.js';
import { createUniverse } from './universe/universe.js';
import { createStory, PAGES } from './universe/story.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

const tier = detectTier();
const canvas = $('#gl');
let core;
try { core = createRenderer(canvas, tier); }
catch (e) { document.body.classList.remove('is-intro'); document.body.classList.add('live', 'no-gl'); $('#gate').classList.add('out'); console.error(e); }

const { renderer, composer, renderPass, bloom, final, tunnel } = core || {};
const intro = createIntro(tier);
// the brain floats in the upper half, the words sit below it (portrait screens pull back a little)
const liftFor = () => { const tall = innerHeight / innerWidth > 1.2; intro.state.dist = tall ? 6.4 : 5.6; return tall ? 1.45 : 1.25; };
intro.state.lift = liftFor();
let mode = 'intro';
let uni = null, story = null, lenis = null;
const tun = { speed: 0 };

// the brain condenses out of the dust as the page opens
if (core && !reduce) gsap.to(intro.uniforms.uForm, { value: 1, duration: 3.6, delay: 0.15, ease: 'power2.inOut' });
else intro.uniforms.uForm.value = 1;

// ------------------------------------------------------------------ the universe loads behind the intro
const loadBar = $('#load-bar');
THREE.DefaultLoadingManager.onProgress = (u, l, t) => { loadBar.style.transform = `scaleX(${Math.max(l / t, 0.12)})`; };
const ready = (async () => { await wait(60); const u = await createUniverse(renderer, tier); loadBar.style.transform = 'scaleX(1)'; return u; })();
ready.then((u) => { uni = u; }).catch((e) => console.error('universe', e));

async function prewarm(w) {
  const vis = []; w.scene.traverse((o) => { if (!o.visible) { vis.push(o); o.visible = true; } });
  try { await (renderer.compileAsync ? renderer.compileAsync(w.scene, w.camera) : renderer.compile(w.scene, w.camera)); } catch (e) { /* noop */ }
  vis.forEach((o) => (o.visible = false));
}

// ------------------------------------------------------------------ GATE: the thin light-sweep slider
const slider = $('#slider');
let v = 0, dragging = false, started = false;
const setV = (x) => { v = clamp(x); slider.style.setProperty('--v', v.toFixed(4)); slider.setAttribute('aria-valuenow', Math.round(v * 100)); };
setV(0);
slider.classList.add('ready');
const posToV = (cx) => { const r = slider.getBoundingClientRect(); return (cx - r.left - 23) / (r.width - 46); };
let downX = 0, moved = false, auto = false;
// finish the slide by itself (a tap, a click on the words, the keyboard, or a slide that's most of the way)
const finish = (dur = 0.9) => {
  if (started || auto) return; auto = true; dragging = false; slider.classList.remove('grab');
  gsap.to({ x: v }, { x: 1, duration: dur * (1 - v) + 0.15, ease: 'power2.inOut', onUpdate() { setV(this.targets()[0].x); }, onComplete: begin });
};
slider.addEventListener('pointerdown', (e) => {
  if (started || auto) return;
  dragging = true; moved = false; downX = e.clientX;
  try { slider.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
  slider.classList.add('grab');
});
slider.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  if (Math.abs(e.clientX - downX) > 6) moved = true;
  if (moved) { setV(posToV(e.clientX)); if (v >= 0.985) finish(0.2); }
});
const release = () => {
  if (!dragging) return; dragging = false; slider.classList.remove('grab');
  if (!moved || v > 0.6) finish(0.6);                                   // a tap anywhere on the slider unleashes it
  else gsap.to({ x: v }, { x: 0, duration: 0.7, ease: 'elastic.out(1,0.6)', onUpdate() { setV(this.targets()[0].x); } });
};
addEventListener('pointerup', release);
slider.addEventListener('pointercancel', () => { if (dragging && moved && v > 0.6) finish(0.4); else { dragging = false; slider.classList.remove('grab'); } });
slider.addEventListener('keydown', (e) => { if (['Enter', ' ', 'ArrowRight'].includes(e.key)) { e.preventDefault(); finish(0.6); } });
$('#skip').addEventListener('click', () => begin(true));
$('#replay').addEventListener('click', () => { sessionStorage.removeItem('kaju-skip'); scrollTo(0, 0); location.reload(); });
const burger = $('#burger'), menu = $('#menu');
burger.addEventListener('click', () => { const o = menu.hidden; menu.hidden = !o; burger.setAttribute('aria-expanded', String(o)); });

function failed(e) {
  console.error('universe failed to load', e);
  const cap = $('#intro-caption');
  cap.innerHTML = '<span>The universe could not open in this browser.</span><b><a href="classic.html" style="text-decoration:underline">Enter the classic site →</a></b>';
  cap.classList.add('on'); cap.style.pointerEvents = 'auto';
}

// The thought spins up, bursts into particles, the camera dives into a wormhole…
async function begin(skip = false) {
  if (started) return; started = true;
  $('#gate').classList.add('out');
  if (skip || reduce || !core) {
    if (final) final.uniforms.uFade.value = 1;
    let w;
    try { w = await ready; } catch (e) { return failed(e); }
    await prewarm(w);
    enterUniverse(true);
    return;
  }
  const U = intro.uniforms, S = intro.state, T = tunnel.uniforms, cap = $('#intro-caption');
  gsap.to(U.uForm, { value: 1, duration: 0.8, ease: 'power2.out' });
  const tl = gsap.timeline();
  tl.to(S, { orbit: 0, duration: 1.2, ease: 'power2.inOut' }, 0)
    .to(S, { lift: 0, duration: 1.6, ease: 'power2.inOut' }, 0)
    .to(S, { spin: 26, duration: 2.0, ease: 'power3.in' }, 0)                     // spins faster and faster
    .to(U.uBurst, { value: 1, duration: 2.3, ease: 'power2.in' }, 1.35)           // …and bursts into millions of particles
    .to(S, { dist: 0.35, duration: 2.6, ease: 'power3.in' }, 1.1)                 // the camera dives into the particles
    .to(intro.camera, { fov: 84, duration: 2.4, ease: 'power2.in', onUpdate: () => intro.camera.updateProjectionMatrix() }, 1.3)
    .to(intro.warp.uWarp, { value: 1, duration: 1.5, ease: 'power2.in' }, 1.9)
    .add(() => { tunnel.enabled = true; }, 2.3)
    .to(T.uIn, { value: 1, duration: 1.3, ease: 'power2.in' }, 2.3)               // into the wormhole
    .to(T.uBlur, { value: 1, duration: 1.3, ease: 'power2.in' }, 2.3)
    .to(tun, { speed: 1.4, duration: 2.2, ease: 'power2.in' }, 2.0)
    .to(final.uniforms.uCA, { value: 0.009, duration: 1.4 }, 2.3)
    .add(() => cap.classList.add('on'), 3.1);
  await tl.then();
  let w;
  try { w = await ready; } catch (e) { return failed(e); }
  await Promise.all([prewarm(w), wait(1500)]);                                       // …deep through the galaxies
  enterUniverse(false);
  const ex = gsap.timeline();
  ex.add(() => cap.classList.remove('on'), 0.4)
    .to(T.uOpen, { value: 1, duration: 2.4, ease: 'power2.inOut' }, 0.2)
    .to(T.uBlur, { value: 0, duration: 2.2, ease: 'power2.out' }, 0.4)
    .to(tun, { speed: 0.12, duration: 2.4, ease: 'power2.out' }, 0.1)
    .to(final.uniforms.uCA, { value: 0.0012, duration: 2.0 }, 0.5);
  await ex.then();
  tunnel.enabled = false;
}

function enterUniverse(fast) {
  mode = 'uni';
  document.body.classList.remove('is-intro');
  document.body.classList.add('live');
  scrollTo(0, 0);
  intro.dispose();
  bloom.strength = 0.62; bloom.radius = 0.4; bloom.threshold = 1.0;
  lenis = new Lenis({ duration: 1.4, smoothWheel: true, wheelMultiplier: 0.85, touchMultiplier: 1.3 });
  lenis.stop();
  story = createStory({ uni, lenis, tier, gsap, tunnel, final, bloom, onLanded: () => { lenis.start(); uni.setInteractive(true); } });
  story.land(fast);
  if (fast) gsap.to(final.uniforms.uFade, { value: 0, duration: 1.4, ease: 'power2.out' });
  setTimeout(() => $('#gate') && $('#gate').remove(), 1500);
  $$('[data-portal]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); menu.hidden = true; story.portal(+a.dataset.portal); }));
}

addEventListener('resize', () => { if (!core) return; core.resize(); intro.resize(); if (!started) intro.state.lift = liftFor(); uni && uni.resize(); story && story.resize(); });

// ------------------------------------------------------------------ frame loop
const clock = new THREE.Clock();
function frame(now) {
  requestAnimationFrame(frame);
  if (!core) return;
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  tunnel.uniforms.uTime.value = t;
  tunnel.uniforms.uTravel.value += dt * tun.speed * 9;
  if (mode === 'intro') {
    intro.update(t, dt);
    renderPass.scene = intro.scene; renderPass.camera = intro.camera;
  } else if (uni && story) {
    lenis.raf(now);
    story.update(t, dt);
    uni.update(t, dt);
    renderPass.scene = uni.scene; renderPass.camera = uni.camera;
  }
  final.uniforms.uTime.value = t;
  composer.render(dt);
}
requestAnimationFrame(frame);

// arriving back from a page: skip straight to the paths
if (location.hash === '#paths') { sessionStorage.setItem('kaju-paths', '1'); begin(true); }

window.__kaju = { THREE, core, get uni() { return uni; }, get story() { return story; }, get lenis() { return lenis; }, begin, intro, tier, gsap, PAGES };
