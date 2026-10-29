import { STYLE } from './style.js';

// =====================================================================
//  The foreground: big out-of-focus asteroids drifting past the lens
//  (push them away with the cursor or a finger) and, in the drawn world,
//  two cloud banks framing the bottom corners. Both worlds' versions sit
//  in their own layer, clipped along the same wipe line as the 3D scene.
// =====================================================================
const ROCKS = [   // home position (fraction of the screen), size (fraction of the short side), blur
  { x: 0.05, y: 0.16, s: 0.30, b: 3.5 }, { x: 0.94, y: 0.30, s: 0.17, b: 2 },
  { x: 0.9, y: 0.82, s: 0.24, b: 3 }, { x: 0.07, y: 0.72, s: 0.18, b: 2.5 },
];
export function createForeground() {
  const root = document.createElement('div'); root.className = 'fg'; root.setAttribute('aria-hidden', 'true');
  const layer = (cls) => { const d = document.createElement('div'); d.className = 'fg-layer ' + cls; root.appendChild(d); return d; };
  const real = layer('fg-real'), drawn = layer('fg-drawn');
  drawn.insertAdjacentHTML('beforeend', '<img class="fg-cloud l" src="assets/universe/fg/cloud_l.svg" alt=""><img class="fg-cloud r" src="assets/universe/fg/cloud_r.svg" alt="">');
  const rocks = ROCKS.map((r, i) => {
    const mk = (parent, src) => { const im = new Image(); im.className = 'fg-rock'; im.src = src; im.alt = ''; im.decoding = 'async'; im.style.filter = `blur(${r.b}px)`; parent.appendChild(im); return im; };
    return { ...r, a: mk(real, `assets/universe/fg/real_${i}.webp`), d: mk(drawn, `assets/universe/fg/drawn_${i}.svg`), ox: 0, oy: 0, vx: 0, vy: 0, rot: i * 47, vr: 0, ph: Math.random() * 6.28 };
  });
  document.body.appendChild(root);

  const ptr = { x: -1e4, y: -1e4, vx: 0, vy: 0, t: 0 };
  const move = (e) => { const now = performance.now(), dt = Math.max(8, now - ptr.t) / 1000; if (ptr.t) { ptr.vx = (e.clientX - ptr.x) / dt; ptr.vy = (e.clientY - ptr.y) / dt; } ptr.x = e.clientX; ptr.y = e.clientY; ptr.t = now; };
  addEventListener('pointermove', move, { passive: true });
  addEventListener('pointerdown', move, { passive: true });

  // the wipe line, in CSS percentages: drawn where x*0.82 + y*0.18 <= f
  const clip = (behind) => {
    const f = STYLE.uDFront.value * 1.12 - 0.06;
    const x0 = (f / 0.82) * 100, x1 = ((f - 0.18) / 0.82) * 100;
    return behind ? `polygon(-5% -5%, ${x0}% -5%, ${x1}% 105%, -5% 105%)` : `polygon(${x0}% -5%, 105% -5%, 105% 105%, ${x1}% 105%)`;
  };
  return {
    update(t, dt, show) {
      root.style.opacity = show.toFixed(3);
      root.style.visibility = show > 0.01 ? 'visible' : 'hidden';
      // which layer is visible where
      const a = STYLE.uDFrom.value, b = STYLE.uDTo.value;
      if (a === b) { drawn.style.clipPath = real.style.clipPath = 'none'; drawn.style.display = b ? '' : 'none'; real.style.display = b ? 'none' : ''; }
      else { drawn.style.display = real.style.display = ''; drawn.style.clipPath = clip(b === 1); real.style.clipPath = clip(b === 0); }
      if (show < 0.01) return;
      const W = innerWidth, H = innerHeight, S = Math.min(W, H);
      for (const r of rocks) {
        const size = r.s * S * (W < 700 ? 1.25 : 1);
        const hx = r.x * W + Math.sin(t * 0.21 + r.ph) * 14, hy = r.y * H + Math.cos(t * 0.17 + r.ph) * 10;
        const cx = hx + r.ox, cy = hy + r.oy;
        // pushed away by the pointer when it passes close
        const dx = cx - ptr.x, dy = cy - ptr.y, d = Math.hypot(dx, dy), reach = size * 0.7;
        if (d < reach && d > 1) {
          const sp = Math.min(2400, Math.hypot(ptr.vx, ptr.vy));
          const k = (1 - d / reach) * (0.9 + sp * 0.0012);
          r.vx += (dx / d) * k * 900 * dt; r.vy += (dy / d) * k * 900 * dt; r.vr += (ptr.vx * dy - ptr.vy * dx) / (d * d + 1) * 0.04;
        }
        // spring home slowly, with drag
        r.vx += -r.ox * 0.9 * dt; r.vy += -r.oy * 0.9 * dt;
        r.vx *= Math.pow(0.35, dt); r.vy *= Math.pow(0.35, dt); r.vr *= Math.pow(0.4, dt);
        r.ox += r.vx * dt; r.oy += r.vy * dt; r.rot += (r.vr + 3) * dt;
        const tf = `translate(${(cx - size / 2).toFixed(1)}px, ${(cy - size / 2).toFixed(1)}px) rotate(${r.rot.toFixed(1)}deg)`;
        for (const im of [r.a, r.d]) { im.style.width = im.style.height = size.toFixed(0) + 'px'; im.style.transform = tf; }
      }
    },
  };
}
