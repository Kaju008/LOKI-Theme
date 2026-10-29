import '../pages.js';
import { SITE, ABOUT, TOOLS } from '../config.js';
import { $, initContact, rise } from './common.js';
import { initAboutHero } from './about-hero.js';

initAboutHero();

$('#about-title').textContent = ABOUT.title;
$('#about-body').innerHTML = ABOUT.body.map((p) => `<p>${p}</p>`).join('');
$('#about-stats').innerHTML = ABOUT.stats.map(([v, l]) => `<div><dd>${v}</dd><dt>${l}</dt></div>`).join('');
$('#resume-btn').href = SITE.resume;

const chip = (t, i) => {
  const glyph = t.icon ? `<img src="${t.icon}" alt="">` : `<b class="${t.m.length > 2 ? 'long' : ''}">${t.m}</b>`;
  return `<div class="chip" style="--c:${t.c};--i:${i}" tabindex="0"><span class="chip-orb">${glyph}</span><span class="chip-t"><span>${t.n}</span>${t.d ? `<small>${t.d}</small>` : ''}</span></div>`;
};
$('#sk-craft').innerHTML = TOOLS.craft.map(chip).join('');
$('#sk-ai').innerHTML = TOOLS.ai.map(chip).join('');

// the portrait leans toward the cursor
const fig = $('.tk-photo');
if (fig && matchMedia('(pointer: fine)').matches) {
  addEventListener('pointermove', (e) => {
    const x = e.clientX / innerWidth - 0.5, y = e.clientY / innerHeight - 0.5;
    fig.style.setProperty('--rx', `${(-y * 6).toFixed(2)}deg`); fig.style.setProperty('--ry', `${(x * 8).toFixed(2)}deg`);
  }, { passive: true });
}
initContact();
rise();
