import '../pages.js';
import { WORKS } from '../config.js';
import { $, $$, thumb, CAT_COL, buildPlayer, rise } from './common.js';

const player = buildPlayer();
const grid = $('#works'), filters = $('#filters');
const cats = ['All', ...new Set(WORKS.map((w) => w.cat))];
filters.innerHTML = cats.map((c, i) => `<button role="tab" class="flt${i ? '' : ' on'}" aria-selected="${!i}" data-cat="${c}">${c}<sup>${i ? WORKS.filter((w) => w.cat === c).length : WORKS.length}</sup></button>`).join('');

// each card is a little clip on a timeline: a thumb, a filmstrip edge and a scrubbing playhead
const clips = (seed) => Array.from({ length: 5 }, (_, k) => `<i style="flex:${(1 + ((seed * 7 + k * 13) % 5)).toFixed(0)}"></i>`).join('');
grid.innerHTML = WORKS.map((w, i) => {
  const [c1, c2] = CAT_COL[w.cat] || ['#3dffb5', '#9d80ff'];
  return `<button class="wk" style="--c1:${c1};--c2:${c2};--i:${i % 8}" data-i="${i}" data-cat="${w.cat}" aria-label="Play: ${w.t}">
    <span class="wk-media"><img src="${thumb(w)}" alt="" onerror="this.remove()" loading="${i < 8 ? 'eager' : 'lazy'}" decoding="async"><span class="wk-ph" aria-hidden="true">${w.t}</span><span class="wk-play"></span><span class="wk-tc">${String(i + 1).padStart(2, '0')}:00:00</span></span>
    <span class="wk-track" aria-hidden="true">${clips(i)}<b></b></span>
    <span class="wk-meta"><span class="wk-cat">${w.cat}</span><span class="wk-t">${w.t}</span></span>
  </button>`;
}).join('');

let visible = WORKS.map((_, i) => i);
$$('.wk', grid).forEach((b) => b.addEventListener('click', () => {
  const list = visible.map((i) => WORKS[i]);
  player.open(visible.indexOf(+b.dataset.i), b, list);
}));
filters.addEventListener('click', (e) => {
  const f = e.target.closest('.flt'); if (!f) return;
  $$('.flt', filters).forEach((x) => { x.classList.toggle('on', x === f); x.setAttribute('aria-selected', String(x === f)); });
  const c = f.dataset.cat;
  visible = [];
  $$('.wk', grid).forEach((b) => { const on = c === 'All' || b.dataset.cat === c; b.hidden = !on; if (on) visible.push(+b.dataset.i); });
  grid.classList.remove('shuffle'); void grid.offsetWidth; grid.classList.add('shuffle');
});

// tilt toward the pointer
$$('.wk', grid).forEach((b) => {
  b.addEventListener('pointermove', (e) => {
    const r = b.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    b.style.setProperty('--rx', `${(-y * 8).toFixed(2)}deg`); b.style.setProperty('--ry', `${(x * 10).toFixed(2)}deg`);
  });
  b.addEventListener('pointerleave', () => { b.style.setProperty('--rx', '0deg'); b.style.setProperty('--ry', '0deg'); });
});
rise();
