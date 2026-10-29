// Runs before the About page first paints: put the ray and the split exactly where the universe left them.
import { arcOnScreen, arcPath, arcHalves } from '../core/arc.js';
const W = innerWidth, H = innerHeight, P = arcOnScreen(W, H), d = arcPath(P), h = arcHalves(W, H, P);
const el = document.getElementById('slash-in');
if (el) {
  el.querySelector('svg').setAttribute('viewBox', `0 0 ${W} ${H}`);
  el.querySelectorAll('path').forEach((p) => p.setAttribute('d', d));
  el.querySelector('.half.a').style.clipPath = h.left;
  el.querySelector('.half.b').style.clipPath = h.right;
}
