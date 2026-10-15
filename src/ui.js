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
  // energy lines
  const svg = $('#orbit-lines');
  svg.setAttribute('width', trackW); svg.setAttribute('height', H); svg.setAttribute('viewBox', `0 0 ${trackW} ${H}`);
  const smooth = (P) => P.reduce((d, p, i) => {
    if (!i) return `M${p[0]},${p[1]}`;
    const q = P[i - 1], mx = (q[0] + p[0]) / 2;
    return d + ` C${mx},${q[1]} ${mx},${p[1]} ${p[0]},${p[1]}`;
  }, '');
  const ext = [[pts[0][0] - W, pts[0][1] + 40], ...pts, [pts[pts.length - 1][0] + W * 0.6, pts[pts.length - 1][1] - 40]];
  let branches = '';
  for (let i = 0; i < pts.length - 2; i += 2) {
    const a = pts[i], b = pts[i + 2];
    const my = Math.min(a[1], b[1]) - H * (0.16 + (i % 4) * 0.03);
    branches += `<path d="M${a[0]},${a[1]} Q${(a[0] + b[0]) / 2},${my} ${b[0]},${b[1]}" stroke="url(#gb)" opacity=".35"/>`;
  }
  svg.innerHTML = `<defs>
      <linearGradient id="ga" x1="0" x2="1"><stop offset="0" stop-color="#3dffb5"/><stop offset=".35" stop-color="#5adfff"/><stop offset=".65" stop-color="#9d80ff"/><stop offset="1" stop-color="#ff6fd8"/></linearGradient>
      <linearGradient id="gb" x1="0" x2="1"><stop offset="0" stop-color="#9d80ff"/><stop offset="1" stop-color="#3dffb5"/></linearGradient>
      <filter id="gl" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="4"/></filter></defs>
    <path d="${smooth(ext)}" stroke="url(#ga)" stroke-width="6" opacity=".35" filter="url(#gl)"/>
    <path d="${smooth(ext)}" stroke="url(#ga)" opacity=".75"/>
    <path class="flow" d="${smooth(ext)}" stroke="#eafff8" opacity=".9"/>
    ${branches}`;
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
    b.innerHTML = `<span class="orb-ring"></span><span class="orb-glass"><img src="${thumb(w)}" alt="" loading="lazy" decoding="async"></span>
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
function buildSkills() {
  let i = 0;
  const make = (t) => {
    const el = document.createElement('div');
    el.className = 'tool'; el.style.setProperty('--c', t.c); el.style.setProperty('--i', i++);
    const glyph = t.icon ? `<img src="${t.icon}" alt="">` : `<b class="${t.m.length > 2 ? 'long' : ''}">${t.m}</b>`;
    el.innerHTML = `<span class="burst" style="background:${t.c}"></span><span class="tool-orb">${glyph}</span><span>${t.n}</span>`;
    return el;
  };
  TOOLS.craft.forEach((t) => $('#sk-craft').appendChild(make(t)));
  TOOLS.ai.forEach((t) => $('#sk-ai').appendChild(make(t)));
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
