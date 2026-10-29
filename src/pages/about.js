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

// ---------------------------------------------------------------- the cut-open entrance
const slash = $('#slash-in');
const open = () => document.body.classList.add('opened');
if (reduce) { slash.classList.add('done'); open(); }
else {
  requestAnimationFrame(() => slash.classList.add('go'));
  setTimeout(open, 520);
  setTimeout(() => slash.classList.add('done'), 1600);
}
if (location.hash === '#slash' || location.hash === '#arrive') history.replaceState(null, '', location.pathname);

// ---------------------------------------------------------------- the stage: scroll drives the camera
const stage = $('#wr-stage'), hero = $('#wr-hero'), intro = $('#wr-intro'), maker = $('#maker'), cue = $('#wr-scroll');
const lunge = $('.pose.lunge', hero), stand = $('.pose.stand', hero), trail = $('.trail', hero);
const L = { sky: $('.wl.sky'), far: $('.wl.far'), mid: $('.wl.mid'), front: $('.wl.front') };
const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
addEventListener('pointermove', (e) => { mouse.x = e.clientX / innerWidth - 0.5; mouse.y = e.clientY / innerHeight - 0.5; }, { passive: true });
$('[data-maker]').addEventListener('click', (e) => { e.preventDefault(); scrollTo({ top: stage.offsetTop + (stage.offsetHeight - innerHeight) * 0.78, behavior: 'smooth' }); });

function stageFrame() {
  const r = stage.getBoundingClientRect();
  const p = clamp(-r.top / (r.height - innerHeight));
  const mob = innerWidth < 860;
  mouse.sx += (mouse.x - mouse.sx) * 0.06; mouse.sy += (mouse.y - mouse.sy) * 0.06;
  // 1) the intro lines leave
  const iv = 1 - seg(p, 0.05, 0.18);
  intro.style.opacity = iv.toFixed(3); intro.style.transform = mob ? `translateY(${(-(1 - iv) * 40).toFixed(1)}px)` : `translateY(calc(-46% - ${((1 - iv) * 40).toFixed(1)}px))`;
  intro.style.visibility = iv < 0.01 ? 'hidden' : 'visible';
  cue.style.opacity = (1 - seg(p, 0.02, 0.08)).toFixed(3);
  // 2) he sheathes the sword: the drawn pose sweeps away, the standing pose settles in
  const sh = ease(seg(p, 0.18, 0.33));
  lunge.style.opacity = (1 - sh).toFixed(3);
  lunge.style.filter = sh > 0 && sh < 1 ? `blur(${(sh * 6).toFixed(1)}px) drop-shadow(0 24px 40px rgba(0,0,0,.55))` : '';
  lunge.style.transform = `translateX(${(sh * 6).toFixed(2)}%) rotate(${(sh * 3).toFixed(2)}deg)`;
  const st = ease(seg(p, 0.23, 0.37));
  stand.style.opacity = st.toFixed(3);
  stand.style.filter = st > 0 && st < 1 ? `blur(${((1 - st) * 5).toFixed(1)}px)` : '';
  stand.style.transform = `translateX(${((1 - st) * -4).toFixed(2)}%)`;
  // the blade's light arcs over his shoulder to the scabbard on his back
  const ta = Math.sin(seg(p, 0.2, 0.38) * Math.PI);
  if (document.body.classList.contains('opened') && p > 0.15) { trail.style.animation = 'none'; trail.style.opacity = ta.toFixed(3); trail.style.transform = `rotate(${(-8 - seg(p, 0.2, 0.38) * 70).toFixed(1)}deg) scale(${(1 - seg(p, 0.2, 0.38) * 0.5).toFixed(3)})`; }
  else if (p <= 0.15 && trail.style.animation === 'none') { trail.style.opacity = '0'; }
  // 3) the camera closes in on his upper body and drifts right; the maker rises on the left
  const c = ease(seg(p, 0.42, 0.8));
  const zoom = 1 + c * (mob ? 0.45 : 0.75);
  hero.style.transform = `translate(${(c * (mob ? 4 : 7) + mouse.sx * -1.2).toFixed(2)}vw, ${(c * (mob ? -2 : 26) + mouse.sy * -0.8).toFixed(2)}vh) scale(${zoom.toFixed(3)})`;
  const par = (el, depth, z) => { el.style.transform = `translate(${(mouse.sx * -depth * 2 + c * depth * 1.4).toFixed(2)}%, ${(mouse.sy * -depth + c * depth * 0.8).toFixed(2)}%) scale(${(1 + c * z).toFixed(3)})`; };
  par(L.sky, 0.3, 0.03); par(L.far, 0.6, 0.07); par(L.mid, 1.0, 0.13); par(L.front, 2.2, 0.32);
  const mv = seg(p, 0.55, 0.68);
  maker.style.opacity = mv > 0 ? '1' : '0';
  maker.style.visibility = mv > 0 ? 'visible' : 'hidden';
  maker.classList.toggle('in', mv > 0.2);
}

// ---------------------------------------------------------------- falling maple leaves
const cv = $('#wr-leaves'), g = cv.getContext('2d');
let leaves = [];
function sizeLeaves() {
  const d = Math.min(devicePixelRatio || 1, 2);
  cv.width = innerWidth * d; cv.height = innerHeight * d; g.setTransform(d, 0, 0, d, 0, 0);
  const n = innerWidth < 700 ? 16 : 34;
  leaves = Array.from({ length: n }, () => ({ x: Math.random() * innerWidth, y: Math.random() * innerHeight, s: 5 + Math.random() * 9, r: Math.random() * 6, vr: (Math.random() - 0.5) * 2, vy: 18 + Math.random() * 30, ph: Math.random() * 6, c: ['#a5221c', '#c4321f', '#d94a24', '#e8692b'][Math.floor(Math.random() * 4)] }));
}
function leaf(x, y, s, r, c) {
  g.save(); g.translate(x, y); g.rotate(r); g.fillStyle = c; g.beginPath();
  for (let i = 0; i < 5; i++) {
    const a0 = i / 5 * Math.PI * 2;
    for (const [da, rr] of [[-0.42, 0.42], [-0.2, 0.78], [0, 1], [0.2, 0.78], [0.42, 0.42]]) { const a = a0 + da; g.lineTo(Math.cos(a) * s * rr, Math.sin(a) * s * rr); }
    const a = a0 + 0.628; g.lineTo(Math.cos(a) * s * 0.22, Math.sin(a) * s * 0.22);
  }
  g.closePath(); g.fill(); g.restore();
}
function leavesFrame(t, dt) {
  g.clearRect(0, 0, innerWidth, innerHeight);
  for (const l of leaves) {
    l.y += l.vy * dt; l.x += Math.sin(t * 0.8 + l.ph) * 22 * dt - 10 * dt; l.r += l.vr * dt;
    if (l.y > innerHeight + 20) { l.y = -20; l.x = Math.random() * innerWidth * 1.1; }
    if (l.x < -20) l.x = innerWidth + 20;
    g.globalAlpha = 0.85; leaf(l.x, l.y, l.s, l.r, l.c);
  }
}
sizeLeaves(); addEventListener('resize', sizeLeaves);

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
  stageFrame();
  if (!reduce) leavesFrame(now / 1000, dt);
})(last);
