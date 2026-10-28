// The About hero: three worlds (Editor · Motion · Filmmaker). One is featured full-bleed —
// a slowly turning planet on the horizon with me standing in front of it — and the other
// two wait as small planets at the screen edges. Click one to make it the featured world.
import { ABOUT } from '../config.js';

const $ = (s, r = document) => r.querySelector(s);
const W = ABOUT.worlds;
const abs = (u) => new URL(u, location.href).href;   // url() inside a CSS variable resolves against the stylesheet, so pass absolute URLs
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initAboutHero() {
  const hero = $('#ah'); if (!hero) return;
  const sky = $('#ah-sky'), nameEl = $('#ah-name'), lede = $('#ah-lede');
  const slots = { l: $('.ah-planet-l'), r: $('.ah-planet-r') };
  const labels = { l: $('.ah-label-l'), r: $('.ah-label-r') };

  // one full-bleed layer per world, built once (switching only toggles a class)
  const layers = W.map((w) => {
    const el = document.createElement('div');
    el.className = 'ah-w'; el.dataset.k = w.key;
    el.style.setProperty('--glow', w.glow);
    el.innerHTML = `<div class="ah-globe" style="--tex:url('${abs(w.planet)}');--tint:${w.tint}"><i></i></div>
      <img class="ah-fig" src="${w.img}" alt="" decoding="async">`;
    if (w.video) {
      const v = document.createElement('video');
      Object.assign(v, { muted: true, loop: true, playsInline: true, preload: 'none' });
      v.dataset.src = w.video; v.setAttribute('aria-hidden', 'true');
      el.appendChild(v); el.classList.add('has-video');
    }
    sky.appendChild(el);
    return el;
  });
  sky.insertAdjacentHTML('beforeend', '<div class="ah-shade"></div>');

  // each side slot holds all three small planets as siblings; switching only shows one
  for (const k of ['l', 'r']) {
    slots[k].innerHTML = W.map((w) => `<span class="ahp" data-k="${w.key}" style="--tex:url('${abs(w.planet)}');--tint:${w.tint};--glow:${w.glow}"><i></i></span>`).join('');
  }

  // place the planet horizon and my figure for this screen
  function layout() {
    const vw = innerWidth, vh = innerHeight, mob = vw < 700;
    const D = Math.max(vw * (mob ? 2.6 : 1.7), vh * 1.3);
    const horizon = vh * (mob ? 0.8 : 0.74);
    hero.style.setProperty('--gd', D + 'px');
    hero.style.setProperty('--gx', (vw / 2 - D / 2) + 'px');
    hero.style.setProperty('--gy', horizon + 'px');
    layers.forEach((el, i) => {
      const w = W[i], img = el.querySelector('.ah-fig');
      const place = () => {
        const ar = (img.naturalWidth || 2) / (img.naturalHeight || 3);
        const h = vh * w.size * (mob ? 0.72 : 0.9), wd = h * ar;
        const faceY = vh * (mob ? 0.73 : 0.705);
        img.style.height = h + 'px';
        img.style.left = (vw / 2 - w.head[0] * wd) + 'px';
        img.style.top = (faceY - w.head[1] * h) + 'px';
      };
      if (img.complete) place(); else img.onload = place;
    });
  }
  layout();
  addEventListener('resize', layout);

  let cur = null;
  function show(key) {
    const i = W.findIndex((w) => w.key === key);
    if (i < 0 || key === cur) return;
    const w = W[i];
    layers.forEach((el, k) => {
      const on = k === i;
      el.classList.toggle('on', on);
      const v = el.querySelector('video');
      if (v) {
        if (on && !v.src && v.dataset.src) v.src = v.dataset.src;
        if (on && !reduce) v.play().catch(() => {}); else v.pause();
      }
    });
    hero.style.setProperty('--glow', w.glow);
    nameEl.textContent = w.name;
    lede.textContent = w.lede;
    const rest = W.filter((x) => x.key !== key);
    [['l', rest[0]], ['r', rest[1]]].forEach(([s, r]) => {
      slots[s].querySelectorAll('.ahp').forEach((o) => o.classList.toggle('is-shown', o.dataset.k === r.key));
      slots[s].dataset.k = r.key;
      slots[s].setAttribute('aria-label', `Show ${r.name}`);
      labels[s].textContent = r.name;
    });
    if (cur !== null) { hero.classList.remove('swap'); void hero.offsetWidth; hero.classList.add('swap'); }
    cur = key;
  }
  for (const s of ['l', 'r']) slots[s].addEventListener('click', () => show(slots[s].dataset.k));
  $('.ah-scroll').addEventListener('click', () => $('#story').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }));
  show(W[0].key);

  // entrance: runs once, then removes itself
  const root = document.documentElement;
  if (root.classList.contains('anim')) {
    const go = () => requestAnimationFrame(() => requestAnimationFrame(() => {
      root.classList.add('play');
      setTimeout(() => root.classList.remove('anim', 'play'), 2150);
    }));
    Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise((r) => setTimeout(r, 500))]).then(go);
  }
}
