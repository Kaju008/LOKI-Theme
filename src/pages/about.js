// The Timekeeper — warrior chapter.
// The page is cut open; Kaju lands mid-strike. Scrolling: he sheathes the sword, the camera
// closes in on him and "The Maker" rises on the left. Then the training hall, where the
// tools fly at him and he cuts them down one by one, the journey panel and the contact form.
import '../pages.js';
import { SITE, ABOUT } from '../config.js';
import { $, $$, initContact } from './common.js';
import { filmRect, arcOnScreen } from '../core/arc.js';
import { createFlash } from '../core/flash.js';
import { initArena } from './arena.js';
import { initJourney } from './journey/game.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const ease = (x) => x * x * (3 - 2 * x);

// ---------------------------------------------------------------- content
$('#about-body').innerHTML = ABOUT.body.map((p) => `<p>${p}</p>`).join('');
$('#about-stats').innerHTML = ABOUT.stats.map(([v, l]) => `<div><dd>${v}</dd><dt>${l}</dt></div>`).join('');
$('#resume-btn').href = SITE.resume;
initContact();

// ---------------------------------------------------------------- the film: Kaju's own shot, scrubbed by the scroll
// 120 frames (12 fps, 10 s): the blade's cut → he rises → sheathes the sword → the camera closes in on him.
// The first 1.6 s play by themselves as the page is cut open; after that the scroll is the playhead.
const FILM = { n: 120, hold: 19, set: innerWidth < 900 || (devicePixelRatio || 1) < 1.5 && innerWidth < 1100 ? 'm' : 'd' };
const film = $('#wr-film'), fx = film.getContext('2d');
const frames = new Array(FILM.n), ready = new Uint8Array(FILM.n);
const src = (i) => `assets/warrior/film/${FILM.set}/f${String(i + 1).padStart(3, '0')}.webp`;
const order = [];
for (let i = 0; i <= FILM.hold; i++) order.push(i);                       // the opening first
for (const step of [12, 6, 3, 1]) for (let i = 0; i < FILM.n; i += step) if (!order.includes(i)) order.push(i);   // then coarse → fine
let loading = 0;
function pump() {
  while (loading < 6 && order.length) {
    const i = order.shift(), im = new Image();
    loading++; im.decoding = 'async';
    im.onload = () => { frames[i] = im; ready[i] = 1; loading--; dirty = true; pump(); };
    im.onerror = () => { loading--; pump(); };
    im.src = src(i);
  }
}
pump();
const near = (i) => { for (let d = 0; d < FILM.n; d++) { if (ready[i - d]) return i - d; if (ready[i + d]) return i + d; } return -1; };

let W = 0, H = 0, dirty = true;
function sizeFilm() {
  const d = Math.min(devicePixelRatio || 1, 2);
  W = innerWidth; H = innerHeight; film.width = Math.round(W * d); film.height = Math.round(H * d);
  fx.setTransform(d, 0, 0, d, 0, 0); fx.imageSmoothingQuality = 'high'; dirty = true;
}
sizeFilm(); addEventListener('resize', sizeFilm);

function drawFilm(f, k = 0) {
  const i0 = Math.floor(f), a = near(i0); if (a < 0) return;
  // the same placement the universe used for the ray, plus a little hand-held drift
  const { dx, dy, dw, dh } = filmRect(W, H, f, k, mouse.sx * -W * 0.012, mouse.sy * -H * 0.012);
  fx.globalAlpha = 1; fx.drawImage(frames[a], dx, dy, dw, dh);
  const t = f - i0;                                                      // blend toward the next frame for a smooth scrub
  if (a === i0 && t > 0.02 && ready[i0 + 1]) { fx.globalAlpha = t; fx.drawImage(frames[i0 + 1], dx, dy, dw, dh); fx.globalAlpha = 1; }
}

// ---------------------------------------------------------------- the cut-open entrance
// The page arrives burnt out to white, exactly as the universe left it. The streak flares along the sword's arc,
// the white is cut in two and parts along it, the exposure settles, and the arc in the shot takes over.
const slash = $('#slash-in'), filmEl = $('#wr-film');
const STILL = new URLSearchParams(location.search).get('still');     // ?still=0.3 freezes the entrance at 0.3 s (for checking)
let auto = reduce ? FILM.hold : 0, autoOn = false;
const open = () => { document.body.classList.add('opened'); autoOn = true; };
if (reduce) { slash.style.display = 'none'; document.body.classList.add('opened'); }
else {
  const fl = createFlash($('canvas', slash));
  const to = arcOnScreen(innerWidth, innerHeight);
  const eo = (x) => 1 - Math.pow(1 - clamp(x), 3), ei = (x) => clamp(x) * clamp(x);
  const t0 = performance.now(); let opened = false, burst = 14;
  const step = () => {
    const t = STILL != null ? +STILL : (performance.now() - t0) / 1000;
    const o = eo((t - 0.1) / 0.75);                                  // the halves part
    fl.render({
      to, head: 1, tail: ei((t - 0.3) / 0.6), heat: 1.25 * (1 - ei((t - 0.25) / 0.65)),
      white: 1 - clamp((t - 0.06) / 0.06), open: o, halfAlpha: 1 - ei((t - 0.18) / 0.62),
      flareA: 1 - clamp((t - 0.15) / 0.4), burst: t > 0.1 && burst > 0 ? burst-- : 0,
    });
    if (t > 0.02) slash.classList.add('live');
    const ex = 1 - eo((t - 0.12) / 0.9);                             // the shot is overexposed by the flash, then settles
    filmEl.style.filter = ex > 0.002 ? `brightness(${(1 + ex * 2.2).toFixed(3)}) saturate(${(1 - ex * 0.5).toFixed(3)})` : '';
    if (!opened && t > 0.12) { opened = true; if (STILL == null) open(); else document.body.classList.add('opened'); }
    if (STILL != null) { if (t < 99) requestAnimationFrame(step); return; }
    if (t < 1.25) requestAnimationFrame(step); else { slash.style.display = 'none'; filmEl.style.filter = ''; }
  };
  requestAnimationFrame(step);
}
if (location.hash === '#slash' || location.hash === '#arrive') history.replaceState(null, '', location.pathname);

// ---------------------------------------------------------------- the stage: scroll drives the film
const stage = $('#wr-stage'), intro = $('#wr-intro'), maker = $('#maker'), cue = $('#wr-scroll');
const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
addEventListener('pointermove', (e) => { mouse.x = e.clientX / innerWidth - 0.5; mouse.y = e.clientY / innerHeight - 0.5; }, { passive: true });
$('[data-maker]').addEventListener('click', (e) => { e.preventDefault(); scrollTo({ top: stage.offsetTop + (stage.offsetHeight - innerHeight) * 0.8, behavior: 'smooth' }); });

let cur = 0;
function stageFrame(dt) {
  const r = stage.getBoundingClientRect();
  const p = clamp(-r.top / (r.height - innerHeight));
  const mob = innerWidth < 860;
  const mx = mouse.sx, my = mouse.sy;
  mouse.sx += (mouse.x - mouse.sx) * 0.06; mouse.sy += (mouse.y - mouse.sy) * 0.06;
  // the playhead: the opening plays itself, then the scroll takes over
  if (autoOn && auto < FILM.hold) auto = Math.min(FILM.hold, auto + dt * 12);
  const scrollF = FILM.hold + seg(p, 0.02, 0.9) * (FILM.n - 1 - FILM.hold);
  const target = auto < FILM.hold ? auto : scrollF;
  cur += (target - cur) * (auto < FILM.hold ? 1 : Math.min(1, dt * 9));
  if (Math.abs(target - cur) < 0.002) cur = target;
  const lift = innerWidth / innerHeight < 0.8 ? ease(seg(p, 0.5, 0.62)) : 0;
  if (r.bottom > 0 && (dirty || cur !== stageFrame.last || lift !== stageFrame.lift || Math.abs(mx - mouse.sx) > 1e-4 || Math.abs(my - mouse.sy) > 1e-4)) { drawFilm(cur, lift); dirty = false; stageFrame.last = cur; stageFrame.lift = lift; }
  // the intro lines leave as he rises
  const iv = 1 - seg(p, 0.04, 0.14);
  intro.style.opacity = iv.toFixed(3);
  intro.style.transform = mob ? `translateY(${(-(1 - iv) * 40).toFixed(1)}px)` : `translateY(calc(-46% - ${((1 - iv) * 40).toFixed(1)}px))`;
  intro.style.visibility = iv < 0.01 ? 'hidden' : 'visible';
  cue.style.opacity = (1 - seg(p, 0.02, 0.06)).toFixed(3);
  // once the camera has closed in on him, the maker rises on the left
  const mv = seg(p, 0.56, 0.64);
  maker.style.opacity = mv > 0 ? '1' : '0';
  maker.style.visibility = mv > 0 ? 'visible' : 'hidden';
  maker.classList.toggle('in', mv > 0.2);
}

// ---------------------------------------------------------------- the training hall
initArena($('#arena'));
initJourney($('#journey'));

// ---------------------------------------------------------------- frame loop
let last = performance.now();
(function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  stageFrame(dt);
})(last);
