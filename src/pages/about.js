// The Timekeeper — warrior chapter.
// The page is cut open; Kaju lands mid-strike. Scrolling: he sheathes the sword, the camera
// closes in on him and "The Maker" rises on the left. Then the training hall, where the
// tools fly at him and he cuts them down one by one, the journey panel and the contact form.
import '../pages.js';
import { SITE, ABOUT, TOOLS } from '../config.js';
import { $, $$, initContact } from './common.js';

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

// where he is in the frame, so narrow screens keep him in view (x as a fraction of the frame width)
const focusX = (f) => 0.6 + 0.12 * ease(clamp((f - 60) / 50));
function drawFilm(f, k = 0) {
  const i0 = Math.floor(f), a = near(i0); if (a < 0) return;
  const im = frames[a], iw = im.naturalWidth, ih = im.naturalHeight;
  const zoom = 1.04;                                                     // a little room for the hand-held drift
  // k: on tall screens the shot lifts into the top of the screen so his face stays above The Maker panel
  const cover = Math.max(W / iw, H / ih) * zoom;
  const s = Math.max(W / iw * zoom, cover + ((H * 0.6) / ih - cover) * k), dw = iw * s, dh = ih * s;
  let dx = W / 2 - focusX(f) * dw;
  if (W / H > 1.2) dx = (W - dw) / 2;                                    // wide screens: the full composition
  dx += mouse.sx * -W * 0.012; let dy = (H - dh) / 2 * (1 - k) + mouse.sy * -H * 0.012;
  dx = clamp(dx, W - dw, 0); dy = dh >= H ? clamp(dy, H - dh, 0) : Math.max(0, dy);
  fx.globalAlpha = 1; fx.drawImage(im, dx, dy, dw, dh);
  const t = f - i0;                                                      // blend toward the next frame for a smooth scrub
  if (a === i0 && t > 0.02 && ready[i0 + 1]) { fx.globalAlpha = t; fx.drawImage(frames[i0 + 1], dx, dy, dw, dh); fx.globalAlpha = 1; }
}

// ---------------------------------------------------------------- the cut-open entrance
const slash = $('#slash-in');
let auto = reduce ? FILM.hold : 0, autoOn = false;
const open = () => { document.body.classList.add('opened'); autoOn = true; };
if (reduce) { slash.classList.add('done'); document.body.classList.add('opened'); }
else {
  requestAnimationFrame(() => slash.classList.add('go'));
  setTimeout(open, 420);
  setTimeout(() => slash.classList.add('done'), 1600);
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
const SETS = { craft: TOOLS.craft, ai: TOOLS.ai };
const DESC = {
  'Premiere Pro': 'Edit and storytelling — the blade I reach for first.', 'After Effects': 'Motion design, compositing and the occasional impossible shot.',
  'Photoshop': 'Thumbnails, composites, visual design.', 'Illustrator': 'Vectors, icons and brand systems.', 'Audition': 'Dialogue clean-up and sound design.',
  'Figma': 'Storyboards, UI and visual planning.', 'Blender': '3D scenes — like the universe you just walked through.', 'Element 3D': '3D inside After Effects.',
  'Claude Code': 'Building tools and automations.', 'Google Antigravity': 'Agentic development.', 'Gemini · Nano Banana': 'Image generation and edits.',
  'Veo': 'AI video generation.', 'Higgsfield': 'Cinematic AI motion.', 'Magnific AI': 'Upscaling and detail.', 'ElevenLabs': 'Voice and narration.',
};
let set = 'craft', idx = 0, timer = 0, busy = false;
const ring = $('#arena-ring'), target = $('#arena-target'), slashSvg = $('#arena-slash'), card = $('#arena-card'), strip = $('#arena-strip'), fighter = $('.arena-fighter');
const glyph = (t) => (t.icon ? `<img src="${t.icon}" alt="">` : `<b>${t.m}</b>`);
function buildStrip() {
  strip.innerHTML = SETS[set].map((t, i) => `<button role="listitem" style="--c:${t.c}" data-i="${i}"><i></i>${t.n}</button>`).join('');
  $$('button', strip).forEach((b) => b.addEventListener('click', () => go(+b.dataset.i)));
}
function show(i) {
  const t = SETS[set][i];
  $('#ac-set').textContent = set === 'craft' ? 'Craft' : 'AI workshop';
  $('#ac-name').textContent = t.n;
  $('#ac-desc').textContent = DESC[t.n] || t.d || '';
  $('#ac-count').textContent = `${String(i + 1).padStart(2, '0')} / ${String(SETS[set].length).padStart(2, '0')}`;
  card.classList.remove('pop'); void card.offsetWidth; card.classList.add('pop');
  $$('button', strip).forEach((b, k) => b.classList.toggle('on', k === i));
}
async function strike(i) {
  busy = true;
  const t = SETS[set][i];
  const R = ring.getBoundingClientRect(), mob = innerWidth < 860;
  target.style.setProperty('--c', t.c);
  target.querySelectorAll('.half').forEach((h) => { h.innerHTML = glyph(t); });
  const hitX = R.width * (mob ? 0.55 : 0.5), hitY = R.height * (mob ? 0.3 : 0.42);
  const from = Math.random() < 0.5 ? -1 : 1;
  const sx = from < 0 ? R.width * 0.3 : R.width + 80, sy = R.height + 80;
  const halves = [...target.querySelectorAll('.half')];
  halves.forEach((h) => { h.getAnimations().forEach((a) => a.cancel()); h.style.opacity = 1; h.style.transform = ''; });
  if (reduce) { target.style.transform = `translate(${hitX}px, ${hitY}px)`; show(i); busy = false; return; }
  // it flies in on an arc…
  const fly = target.animate([
    { transform: `translate(${sx}px, ${sy}px) rotate(${from * 60}deg) scale(.6)` },
    { transform: `translate(${(sx + hitX) / 2}px, ${hitY - R.height * 0.28}px) rotate(${from * 20}deg) scale(.95)`, offset: 0.6 },
    { transform: `translate(${hitX}px, ${hitY}px) rotate(0deg) scale(1)` },
  ], { duration: 720, easing: 'cubic-bezier(.3,.6,.4,1)', fill: 'forwards' });
  await fly.finished;
  // …he cuts…
  fighter.classList.remove('strike'); void fighter.offsetWidth; fighter.classList.add('strike');
  slashSvg.classList.remove('go'); void slashSvg.getBoundingClientRect(); slashSvg.classList.add('go');
  await new Promise((r) => setTimeout(r, 160));
  // …and it falls apart in two halves
  halves[0].animate([{ transform: 'none', opacity: 1 }, { transform: 'translate(-70px, 120px) rotate(-38deg)', opacity: 0 }], { duration: 900, easing: 'cubic-bezier(.4,0,.8,.6)', fill: 'forwards', delay: 120 });
  halves[1].animate([{ transform: 'none', opacity: 1 }, { transform: 'translate(80px, 150px) rotate(42deg)', opacity: 0 }], { duration: 900, easing: 'cubic-bezier(.4,0,.8,.6)', fill: 'forwards', delay: 120 });
  show(i);
  busy = false;
}
function go(i) {
  if (busy) return;
  idx = (i + SETS[set].length) % SETS[set].length;
  strike(idx);
  clearTimeout(timer); timer = setTimeout(() => arenaVisible && go(idx + 1), 3400);
}
$('#arena-prev').addEventListener('click', () => go(idx - 1));
$('#arena-next').addEventListener('click', () => go(idx + 1));
$$('.arena-tabs button').forEach((b) => b.addEventListener('click', () => {
  if (b.classList.contains('on')) return;
  $$('.arena-tabs button').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', String(x === b)); });
  set = b.dataset.set; buildStrip(); busy = false; go(0);
}));
buildStrip();
let arenaVisible = false, started = false;
new IntersectionObserver(([e]) => { arenaVisible = e.isIntersecting; if (arenaVisible && !started) { started = true; go(0); } else if (arenaVisible) { clearTimeout(timer); timer = setTimeout(() => go(idx + 1), 1200); } }, { threshold: 0.35 }).observe(ring);
addEventListener('keydown', (e) => { if (!arenaVisible) return; if (e.key === 'ArrowRight') go(idx + 1); if (e.key === 'ArrowLeft') go(idx - 1); });

// ---------------------------------------------------------------- frame loop
let last = performance.now();
(function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  stageFrame(dt);
})(last);
