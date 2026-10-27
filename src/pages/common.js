// Shared bits for the path pages (The Timekeeper / My Works / The Lab)
import { SITE, WORKS } from '../config.js';

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const thumb = (w) => (w.p === 'yt' ? `https://i.ytimg.com/vi/${w.id}/hqdefault.jpg` : `assets/thumbs/${w.id}.webp`);
export const CAT_COL = {
  'Explainer': ['#3dffb5', '#5adfff'], 'Brand Series': ['#9d80ff', '#ff6fd8'], 'YouTube': ['#ff6a6a', '#ffc65a'], 'Short': ['#ff6a6a', '#ff6fd8'],
  'Creative Edit': ['#ffc65a', '#ff6fd8'], 'Product Video': ['#5adfff', '#9d80ff'], 'Brand Video': ['#e9c46f', '#3dffb5'],
};

export function toast(msg) {
  const t = $('#toast'); if (!t) return; t.textContent = msg; t.classList.add('on');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('on'), 2200);
}
async function copy(text, label) {
  try { await navigator.clipboard.writeText(text); }
  catch { const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
  toast(`${label} copied ✓`);
}

export function initContact() {
  const form = $('#form'); if (!form) return;
  $('#c-linkedin').href = SITE.linkedin;
  $('#c-resume').href = SITE.resume;
  $('#c-phone').addEventListener('click', () => copy(SITE.phone, 'Phone number'));
  $('#c-email').addEventListener('click', () => copy(SITE.email, 'Email'));
  const msg = $('#form-msg');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.className = 'form-msg';
    const d = Object.fromEntries(new FormData(form));
    if (d.website) return;
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
        location.href = `mailto:${SITE.email}?subject=${encodeURIComponent('Portfolio enquiry from ' + d.name)}&body=${encodeURIComponent(d.message)}`;
      }
    } catch { msg.textContent = 'Could not send — please email me directly.'; msg.classList.add('err'); }
    btn.disabled = false; btn.querySelector('span').textContent = 'Send message';
  });
}

export function buildPlayer(list = WORKS) {
  const P = $('#player'), frame = $('#player-frame');
  let cur = 0, items = list;
  function load(i) {
    cur = (i + items.length) % items.length;
    const w = items[cur];
    const src = w.p === 'yt'
      ? `https://www.youtube-nocookie.com/embed/${w.id}?autoplay=1&rel=0&playsinline=1&modestbranding=1`
      : `https://www.instagram.com/reel/${w.id}/embed/`;
    frame.innerHTML = `<iframe src="${src}" title="${w.t}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
    $('#p-title').textContent = w.t; $('#p-cat').textContent = w.cat;
    $('#p-ext').href = w.p === 'yt' ? `https://www.youtube.com/shorts/${w.id}` : `https://www.instagram.com/reel/${w.id}/`;
  }
  function open(i, el, l) {
    if (l) items = l;
    load(i);
    const burst = $('#player-burst');
    const r = el ? el.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
    burst.style.left = r.left + r.width / 2 + 'px'; burst.style.top = r.top + r.height / 2 + 'px';
    burst.classList.remove('go'); void burst.offsetWidth; burst.classList.add('go');
    P.hidden = false; document.documentElement.style.overflow = 'hidden';
  }
  function close() { P.hidden = true; frame.innerHTML = ''; document.documentElement.style.overflow = ''; }
  $$('[data-close]', P).forEach((b) => b.addEventListener('click', close));
  $('#p-prev').addEventListener('click', () => load(cur - 1));
  $('#p-next').addEventListener('click', () => load(cur + 1));
  addEventListener('keydown', (e) => {
    if (P.hidden) return;
    if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') load(cur + 1); if (e.key === 'ArrowLeft') load(cur - 1);
  });
  return { open, close };
}

// reveal-on-scroll for anything marked [data-rise]
export function rise() {
  const els = $$('[data-rise]');
  if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return; }
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  els.forEach((e) => io.observe(e));
}
