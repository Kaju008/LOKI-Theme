import { SITE, WORKS, ABOUT, TOOLS } from './config.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const CAT_COL = {
  'Explainer': ['#3dffb5', '#5adfff'], 'Brand Series': ['#9d80ff', '#ff6fd8'], 'YouTube': ['#ff6a6a', '#ffc65a'], 'Short': ['#ff6a6a', '#ff6fd8'],
  'Creative Edit': ['#ffc65a', '#ff6fd8'], 'Product Video': ['#5adfff', '#9d80ff'], 'Brand Video': ['#e9c46f', '#3dffb5'],
};
const thumb = (w) => (w.p === 'yt' ? `https://i.ytimg.com/vi/${w.id}/hqdefault.jpg` : `assets/thumbs/${w.id}.webp`);

export function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('on'), 2200);
}
async function copy(text, label) {
  try { await navigator.clipboard.writeText(text); }
  catch { const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
  toast(`${label} copied ✓`);
}

// ------------------------------------------------------------------ ABOUT
function buildAbout() {
  $('#about-kicker').textContent = ABOUT.kicker;
  $('#about-title').textContent = ABOUT.title;
  $('#about-body').innerHTML = ABOUT.body.map((p) => `<p>${p}</p>`).join('');
  $('#about-stats').innerHTML = ABOUT.stats.map(([v, l]) => `<div><dd>${v}</dd><dt>${l}</dt></div>`).join('');
  $('#resume-btn').href = SITE.resume;
}

// ------------------------------------------------------------------ WORK
let orbs = [], track, trackW = 0;
function layoutWork() {
  track = $('#orbit-track');
  const stage = track.closest('.stage');
  const H = stage.clientHeight, W = innerWidth, mob = W < 640;
  const spacing = mob ? 150 : Math.max(200, Math.min(270, W * 0.17));
  const start = mob ? W * 0.5 : W * 0.46;
  const pts = WORKS.map((w, i) => {
    const y = H * (mob ? 0.52 : 0.55) + Math.sin(i * 1.15 + 0.4) * H * (mob ? 0.12 : 0.13) + (i % 2 ? 1 : -1) * H * (mob ? 0.035 : 0.05);
    return [start + i * spacing, y];
  });
  trackW = pts[pts.length - 1][0] + W * (mob ? 0.5 : 0.42);
  track.style.width = trackW + 'px';
  orbs.forEach((o, i) => { o.style.left = pts[i][0] + 'px'; o.style.top = pts[i][1] + 'px'; });
  // energy beams: a soft wide glow, a crisp core and comets of light travelling along it,
  // plus a deeper, dimmer layer of beams behind that moves slower (parallax depth)
  const svg = $('#orbit-lines');
  svg.setAttribute('width', trackW); svg.setAttribute('height', H); svg.setAttribute('viewBox', `0 0 ${trackW} ${H}`);
  const smooth = (P) => P.reduce((d, p, i) => {
    if (!i) return `M${p[0].toFixed(1)},${p[1].toFixed(1)}`;
    const q = P[i - 1], mx = (q[0] + p[0]) / 2;
    return d + ` C${mx.toFixed(1)},${q[1].toFixed(1)} ${mx.toFixed(1)},${p[1].toFixed(1)} ${p[0].toFixed(1)},${p[1].toFixed(1)}`;
  }, '');
  const ext = [[pts[0][0] - W, pts[0][1] + 40], ...pts, [pts[pts.length - 1][0] + W * 0.6, pts[pts.length - 1][1] - 40]];
  const main = smooth(ext);
  let branches = '';
  for (let i = 0; i < pts.length - 2; i += 2) {
    const a = pts[i], b = pts[i + 2];
    const my = Math.min(a[1], b[1]) - H * (0.16 + (i % 4) * 0.03);
    const d = `M${a[0]},${a[1]} Q${(a[0] + b[0]) / 2},${my} ${b[0]},${b[1]}`;
    branches += `<path d="${d}" class="br-core"/><path d="${d}" class="comet slow" style="animation-delay:${(-i * 0.37).toFixed(2)}s"/>`;
  }
  const comets = [0, 1, 2, 3].map((k) => `<path d="${main}" class="comet" style="animation-delay:${(-k * 1.9).toFixed(2)}s;animation-duration:${(7 + k * 1.3).toFixed(1)}s"/>`).join('');
  const nodes = pts.map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="3" class="node"/>`).join('');
  svg.innerHTML = `<defs>
      <linearGradient id="ga" x1="0" x2="1"><stop offset="0" stop-color="#4fe8b8"/><stop offset=".35" stop-color="#66d4ff"/><stop offset=".7" stop-color="#9a86ff"/><stop offset="1" stop-color="#e3b765"/></linearGradient>
      <filter id="gl" x="-10%" y="-60%" width="120%" height="220%"><feGaussianBlur stdDeviation="7"/></filter>
      <filter id="gc" x="-20%" y="-100%" width="140%" height="300%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <path d="${main}" class="beam-glow" stroke="url(#ga)" filter="url(#gl)"/>
    <path d="${main}" class="beam-core" stroke="url(#ga)"/>
    <g filter="url(#gc)">${comets}${branches}</g>${nodes}`;
  // depth layer
  const back = $('#orbit-back');
  const BW = trackW * 0.65 + W;
  back.setAttribute('width', BW); back.setAttribute('height', H); back.setAttribute('viewBox', `0 0 ${BW} ${H}`);
  let bp = '';
  for (let k = 0; k < 3; k++) {
    const P = []; for (let x = -200; x < BW + 200; x += 260) P.push([x, H * (0.3 + k * 0.22) + Math.sin(x * 0.004 + k * 2) * H * 0.08]);
    const d = smooth(P);
    bp += `<path d="${d}" class="deep" style="opacity:${(0.18 - k * 0.04).toFixed(2)}"/><path d="${d}" class="comet deep-c" style="animation-delay:${(-k * 2.3).toFixed(1)}s"/>`;
  }
  back.innerHTML = `<defs><filter id="gd"><feGaussianBlur stdDeviation="3"/></filter></defs><g filter="url(#gd)">${bp}</g>`;
}
function buildWork(openPlayer) {
  track = $('#orbit-track');
  orbs = WORKS.map((w, i) => {
    const [c1, c2] = CAT_COL[w.cat] || ['#3dffb5', '#9d80ff'];
    const b = document.createElement('button');
    b.className = 'orb' + (i % 4 === 0 ? ' big' : i % 3 === 2 ? ' sm' : '');
    b.style.setProperty('--c1', c1); b.style.setProperty('--c2', c2);
    b.style.setProperty('--d', `${-(i * 0.73) % 6}s`); b.style.setProperty('--dur', `${6 + (i % 4)}s`);
    b.setAttribute('aria-label', `Play: ${w.t}`);
    b.innerHTML = `<span class="orb-ring"></span><span class="orb-glass"><img src="${thumb(w)}" alt="" loading="eager" decoding="async"></span>
      <svg class="orb-ph" viewBox="0 0 100 100"><circle cx="50" cy="50" r="49"/></svg><span class="orb-play"></span>
      <span class="orb-meta"><span class="orb-cat">${w.cat}</span><span class="orb-t">${w.t}</span></span>`;
    b.querySelector('.orb-ph circle').style.setProperty('--circ', (Math.PI * 98).toFixed(1));
    b.addEventListener('click', () => openPlayer(i, b));
    track.appendChild(b);
    return b;
  });
  $('#work-total').textContent = String(WORKS.length).padStart(2, '0');
  layoutWork();
}
export function setWorkProgress(p) {
  if (!track) return;
  const max = Math.max(0, trackW - innerWidth);
  track.style.transform = `translate3d(${-p * max}px,0,0)`;
  $('#orbit-back').style.transform = `translate3d(${-p * max * 0.55}px,0,0)`;
  $('#work-bar').style.transform = `scaleX(${p})`;
  const idx = Math.min(WORKS.length, Math.max(1, Math.round(p * (WORKS.length - 1)) + 1));
  $('#work-count').textContent = String(idx).padStart(2, '0');
}

// ------------------------------------------------------------------ PLAYER
function buildPlayer(onOpen, onClose) {
  const P = $('#player'), frame = $('#player-frame');
  let cur = 0;
  function load(i) {
    cur = (i + WORKS.length) % WORKS.length;
    const w = WORKS[cur];
    const src = w.p === 'yt'
      ? `https://www.youtube-nocookie.com/embed/${w.id}?autoplay=1&rel=0&playsinline=1&modestbranding=1`
      : `https://www.instagram.com/reel/${w.id}/embed/`;
    frame.innerHTML = `<iframe src="${src}" title="${w.t}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="eager"></iframe>`;
    $('#p-title').textContent = w.t; $('#p-cat').textContent = w.cat;
    $('#p-ext').href = w.p === 'yt' ? `https://www.youtube.com/shorts/${w.id}` : `https://www.instagram.com/reel/${w.id}/`;
  }
  function open(i, el) {
    load(i);
    const burst = $('#player-burst');
    const r = el ? el.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
    burst.style.left = r.left + r.width / 2 + 'px'; burst.style.top = r.top + r.height / 2 + 'px';
    burst.classList.remove('go'); void burst.offsetWidth; burst.classList.add('go');
    P.hidden = false; document.documentElement.style.overflow = 'hidden'; onOpen && onOpen();
  }
  function close() { P.hidden = true; frame.innerHTML = ''; document.documentElement.style.overflow = ''; onClose && onClose(); }
  $$('[data-close]', P).forEach((b) => b.addEventListener('click', close));
  $('#p-prev').addEventListener('click', () => load(cur - 1));
  $('#p-next').addEventListener('click', () => load(cur + 1));
  addEventListener('keydown', (e) => {
    if (P.hidden) return;
    if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') load(cur + 1); if (e.key === 'ArrowLeft') load(cur - 1);
  });
  return { open, close };
}

// ------------------------------------------------------------------ SKILLS
// Glass medallions that are flung out of the black hole into two orbits —
// Craft on the left arc, AI on the right — as the chapter opens.
let tools = [];
function buildSkills() {
  let i = 0;
  const make = (t, group) => {
    const el = document.createElement('div');
    el.className = 'tool ' + group; el.style.setProperty('--c', t.c); el.style.setProperty('--i', i++);
    el.tabIndex = 0;
    const glyph = t.icon ? `<img src="${t.icon}" alt="">` : `<b class="${t.m.length > 2 ? 'long' : ''}">${t.m}</b>`;
    el.innerHTML = `<span class="tool-orb"><span class="tool-ring"></span>${glyph}</span><span class="tool-txt"><span class="tool-n">${t.n}</span>${t.d ? `<span class="tool-d">${t.d}</span>` : ''}</span>`;
    return el;
  };
  TOOLS.craft.forEach((t) => { const el = make(t, 'craft'); $('#sk-craft').appendChild(el); tools.push({ el, g: 0 }); });
  TOOLS.ai.forEach((t) => { const el = make(t, 'ai'); $('#sk-ai').appendChild(el); tools.push({ el, g: 1 }); });
}
const ez = (x) => 1 - Math.pow(1 - x, 3);
export function layoutSkills(cx, cy, reveal, t) {
  const W = innerWidth, H = innerHeight;
  if (W < 760) { tools.forEach((o, k) => { const r = Math.min(1, Math.max(0, reveal * 2.2 - k * 0.05)); o.el.style.transform = `scale(${0.4 + 0.6 * ez(r)})`; o.el.style.opacity = ez(r); }); return; }
  const rx = Math.min(W * 0.34, 560), ry = Math.min(H * 0.36, 360);
  const oy = cy + H * 0.05;
  const counts = [tools.filter((o) => !o.g).length, tools.filter((o) => o.g).length];
  const idx = [0, 0];
  tools.forEach((o, k) => {
    const n = counts[o.g], j = idx[o.g]++;
    const top = 0.78, bot = -1.15;                                            // arc from upper side to lower side (clear of the heading)
    const f = n > 1 ? j / (n - 1) : 0.5;
    const a = top + (bot - top) * f;
    const th = o.g ? a : Math.PI - a;                                         // AI: right arc, Craft: left arc, both top→bottom
    const sx = cx + Math.cos(th) * rx, sy = oy - Math.sin(th) * ry;
    const r = Math.min(1, Math.max(0, reveal * 1.9 - (o.g ? j + 0.5 : j) * 0.085));
    const e = ez(r);
    const bob = Math.sin(t * 0.9 + k * 1.3) * 6 * e;
    const x = cx + (sx - cx) * e, y = cy + (sy - cy) * e + bob;
    o.el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) translate(${o.g ? '-33px' : 'calc(-100% + 33px)'},-50%) scale(${(0.15 + 0.85 * e).toFixed(3)})`;
    o.el.style.opacity = Math.min(1, e * 1.4).toFixed(3);
    o.el.classList.toggle('in', r >= 1);
  });
}

// ------------------------------------------------------------------ CONTACT
function buildContact() {
  $('#c-linkedin').href = SITE.linkedin;
  $('#c-resume').href = SITE.resume;
  $('#c-phone').addEventListener('click', () => copy(SITE.phone, 'Phone number'));
  $('#c-email').addEventListener('click', () => copy(SITE.email, 'Email'));
  $('#year').textContent = new Date().getFullYear();
  const form = $('#form'), msg = $('#form-msg');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.className = 'form-msg';
    const d = Object.fromEntries(new FormData(form));
    if (d.website) return; // bot
    if (!d.name.trim() || !/^\S+@\S+\.\S+$/.test(d.email) || !d.message.trim()) { msg.textContent = 'Please add your name, a valid email and a message.'; msg.classList.add('err'); return; }
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true; btn.querySelector('span').textContent = 'Sending…';
    try {
      if (SITE.formEndpoint) {
        const body = new URLSearchParams({ name: d.name, email: d.email, phone: d.phone || '', message: d.message, page: location.href, ua: navigator.userAgent.slice(0, 180) });
        await fetch(SITE.formEndpoint, { method: 'POST', mode: 'no-cors', body });
        msg.textContent = 'Message received — I’ll get back to you soon ✦';
        form.reset();
      } else {
        location.href = `mailto:${SITE.email}?subject=${encodeURIComponent('Portfolio enquiry from ' + d.name)}&body=${encodeURIComponent(d.message + '\n\n' + d.name + ' · ' + d.email + (d.phone ? ' · ' + d.phone : ''))}`;
        msg.textContent = 'Opening your mail app…';
      }
    } catch { msg.textContent = 'Could not send — please email me directly.'; msg.classList.add('err'); }
    btn.disabled = false; btn.querySelector('span').textContent = 'Send message';
  });
}

export function buildUI({ onPlayerOpen, onPlayerClose } = {}) {
  buildAbout();
  const player = buildPlayer(onPlayerOpen, onPlayerClose);
  buildWork(player.open);
  buildSkills();
  buildContact();
  // mobile menu
  const burger = $('#burger'), menu = $('#menu');
  burger.addEventListener('click', () => { const o = menu.hidden; menu.hidden = !o; burger.setAttribute('aria-expanded', String(o)); });
  $$('#menu a[data-go]').forEach((a) => a.addEventListener('click', () => { menu.hidden = true; burger.setAttribute('aria-expanded', 'false'); }));
  return { player, relayout: layoutWork };
}
