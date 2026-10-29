// =====================================================================
//  The flash cut: one white-hot streak of light, a white-out, and the
//  frame cut open along the streak. Drawn on a 2D canvas with additive
//  light (tapered core, gold/teal fringes, a travelling head flare with
//  an anamorphic streak, sparks), so it reads like light, not a line.
//  Shared by the universe (streak → white-out) and the About page
//  (white-out → cut → open).
// =====================================================================
import { arcPoints } from './arc.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const BLUR = (() => { try { const c = document.createElement('canvas').getContext('2d'); c.filter = 'blur(2px)'; return c.filter === 'blur(2px)'; } catch (e) { return false; } })();

export function createFlash(canvas) {
  const g = canvas.getContext('2d');
  let W = 0, H = 0, D = 1;
  const sparks = [];
  function resize() {
    D = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    canvas.width = Math.round(W * D); canvas.height = Math.round(H * D);
    g.setTransform(D, 0, 0, D, 0, 0);
  }
  resize();

  // polyline helpers
  const lerpPts = (a, b, e) => a.map((p, k) => [p[0] + (b[k][0] - p[0]) * e, p[1] + (b[k][1] - p[1]) * e]);
  const dense = (ctrl) => arcPoints(ctrl, 40);
  const lengths = (pts) => { const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return L; };
  function at(pts, L, s) {   // point + tangent at arc length s
    const tot = L[L.length - 1]; s = clamp(s, 0, tot);
    let i = 1; while (i < L.length - 1 && L[i] < s) i++;
    const a = pts[i - 1], b = pts[i], f = (s - L[i - 1]) / ((L[i] - L[i - 1]) || 1);
    const dx = b[0] - a[0], dy = b[1] - a[1], dl = Math.hypot(dx, dy) || 1;
    return { x: a[0] + dx * f, y: a[1] + dy * f, tx: dx / dl, ty: dy / dl };
  }

  // one pass of the streak between u0..u1 (0..1 along it): a filled ribbon, tapered (thin tail, full body, fine tip)
  function pass(pts, L, u0, u1, width, color, alpha, ox = 0, oy = 0) {
    const tot = L[L.length - 1], n = 140, l = [], r = [];
    for (let i = 0; i <= n; i++) {
      const v = i / n, p = at(pts, L, (u0 + (u1 - u0) * v) * tot);
      const taper = Math.pow(Math.sin(Math.PI * (v * 0.96 + 0.02)), 0.5) * (0.3 + 0.7 * v);
      const hw = Math.max(0.35, width * taper * 0.5);
      l.push([p.x - p.ty * hw + ox, p.y + p.tx * hw + oy]); r.push([p.x + p.ty * hw + ox, p.y - p.tx * hw + oy]);
    }
    g.globalAlpha = alpha; g.fillStyle = color;
    g.beginPath(); g.moveTo(l[0][0], l[0][1]);
    for (let i = 1; i < l.length; i++) g.lineTo(l[i][0], l[i][1]);
    for (let i = r.length - 1; i >= 0; i--) g.lineTo(r[i][0], r[i][1]);
    g.closePath(); g.fill();
  }

  function flare(x, y, s, a) {
    if (a <= 0.001) return;
    // round bloom
    let r = g.createRadialGradient(x, y, 0, x, y, 140 * s);
    r.addColorStop(0, `rgba(255,255,255,${a})`); r.addColorStop(0.18, `rgba(255,236,200,${0.55 * a})`); r.addColorStop(0.5, `rgba(255,170,90,${0.16 * a})`); r.addColorStop(1, 'rgba(255,140,60,0)');
    g.globalAlpha = 1; g.fillStyle = r; g.beginPath(); g.arc(x, y, 140 * s, 0, 7); g.fill();
    // anamorphic streak (a stretched ellipse of light across the frame)
    g.save(); g.translate(x, y); g.scale(1, 0.035);
    r = g.createRadialGradient(0, 0, 0, 0, 0, W * 0.6 * s);
    r.addColorStop(0, `rgba(235,245,255,${0.9 * a})`); r.addColorStop(0.25, `rgba(150,210,255,${0.35 * a})`); r.addColorStop(1, 'rgba(120,190,255,0)');
    g.fillStyle = r; g.beginPath(); g.arc(0, 0, W * 0.6 * s, 0, 7); g.fill(); g.restore();
    // a small four-point star
    g.globalAlpha = a; g.strokeStyle = '#fff'; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(x - 40 * s, y); g.lineTo(x + 40 * s, y); g.moveTo(x, y - 26 * s); g.lineTo(x, y + 26 * s); g.stroke();
  }

  function emit(x, y, tx, ty, n, speed, life = 0.7) {
    for (let i = 0; i < n; i++) {
      const side = Math.random() < 0.5 ? -1 : 1, nx = -ty * side, ny = tx * side;
      const sp = speed * (0.3 + Math.random());
      sparks.push({ x, y, vx: nx * sp + tx * sp * (Math.random() - 0.3) * 0.8, vy: ny * sp + ty * sp * (Math.random() - 0.3) * 0.8, life: life * (0.5 + Math.random() * 0.8), age: 0, w: 1 + Math.random() * 1.8 });
    }
  }
  function drawSparks(dt) {
    g.lineCap = 'round';
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i]; s.age += dt;
      if (s.age > s.life) { sparks.splice(i, 1); continue; }
      s.vx *= 1 - dt * 1.6; s.vy = s.vy * (1 - dt * 1.6) + 240 * dt;
      const x0 = s.x, y0 = s.y; s.x += s.vx * dt; s.y += s.vy * dt;
      const f = 1 - s.age / s.life, tx = x0 - s.vx * 0.07, ty = y0 - s.vy * 0.07;
      g.globalAlpha = f * 0.35; g.strokeStyle = '#ff9a3c'; g.lineWidth = s.w * 4;
      g.beginPath(); g.moveTo(tx, ty); g.lineTo(s.x, s.y); g.stroke();
      g.globalAlpha = f; g.strokeStyle = f > 0.5 ? '#fffaf0' : '#ffd08a'; g.lineWidth = s.w;
      g.beginPath(); g.moveTo(tx, ty); g.lineTo(s.x, s.y); g.stroke();
    }
  }

  // white halves either side of the streak, parting by `open` (0 shut → 1 gone)
  function halves(pts, open, alpha) {
    if (alpha <= 0.001) return;
    const a = pts[0], z = pts[pts.length - 1];
    const ext = (p, q, y) => { const t = (y - p[1]) / ((q[1] - p[1]) || 1e-6); return [p[0] + (q[0] - p[0]) * t, y]; };
    const bottom = ext(pts[3], a, H + 60), top = ext(pts[pts.length - 4], z, -60);
    const line = [bottom, ...pts, top];
    const push = W * 0.55 * open;
    const sides = [[-1, [[-80, H + 80], ...line, [-80, -80]]], [1, [...line, [W + 80, -80], [W + 80, H + 80]]]];
    for (const [s, poly] of sides) {
      g.save(); g.translate(s * push, s * push * 0.12);
      const grd = g.createLinearGradient(0, 0, W, H);
      grd.addColorStop(0, '#fff9ef'); grd.addColorStop(0.5, '#ffffff'); grd.addColorStop(1, '#fff3df');
      g.globalAlpha = alpha; g.fillStyle = grd;
      if (BLUR) g.filter = `blur(${(2 + open * 22).toFixed(1)}px)`;   // light, not paper: the parting white softens as it goes
      g.beginPath(); poly.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill();
      g.filter = 'none';
      // the hot cut edge of each half
      g.globalCompositeOperation = 'lighter';
      for (const [w, c, al] of [[26, '#ffb35a', 0.22], [9, '#ffe3b0', 0.5], [2.5, '#ffffff', 1]]) {
        g.globalAlpha = alpha * al; g.strokeStyle = c; g.lineWidth = w; g.lineJoin = 'round';
        g.beginPath(); line.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
      }
      g.globalCompositeOperation = 'source-over';
      g.restore();
    }
  }

  let last = performance.now();
  // state: { from, to (7-point control polylines), bend, head, tail, heat, white, open, halfAlpha, flareA, spark }
  function render(st) {
    const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
    g.setTransform(D, 0, 0, D, 0, 0);
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    g.clearRect(0, 0, W, H);
    const ctrl = st.from ? lerpPts(st.from, st.to, st.bend ?? 1) : st.to;
    const pts = dense(ctrl), L = lengths(pts), tot = L[L.length - 1];
    if (st.open != null) halves(pts, st.open, st.halfAlpha ?? 1);
    g.globalCompositeOperation = 'lighter';
    const head = st.head ?? 1, tail = st.tail ?? 0, heat = st.heat ?? 1;
    if (heat > 0.001 && head > tail) {
      const flick = 0.93 + Math.random() * 0.07;
      // bloom: a wide, blurred body of warm light around the streak (blur where the browser supports canvas filters)
      const hk = Math.min(1, heat);
      if (BLUR) {
        g.filter = 'blur(26px)'; pass(pts, L, tail, head, 120 * heat, '#ff8a3a', 0.55 * hk);
        g.filter = 'blur(10px)'; pass(pts, L, tail, head, 42 * heat, '#ffc27a', 0.75 * hk);
        g.filter = 'blur(3px)'; pass(pts, L, tail, head, 16 * heat, '#fff0d8', 0.9 * hk);
        g.filter = 'none';
      } else {
        for (const [w, c, al] of [[200, '#ff6a1a', 0.07], [130, '#ff8a3a', 0.1], [80, '#ffa552', 0.14], [46, '#ffc27a', 0.22], [26, '#ffdcaa', 0.34], [14, '#fff0d8', 0.55]]) pass(pts, L, tail, head, w * heat, c, al * hk * flick);
      }
      pass(pts, L, tail, head, 11 * heat, '#ff4a3a', 0.2 * Math.min(1, heat), 2.4, 0.6);   // chromatic fringes
      pass(pts, L, tail, head, 11 * heat, '#3ad0ff', 0.2 * Math.min(1, heat), -2.4, -0.6);
      pass(pts, L, tail, head, 9 * heat, '#ffffff', 0.9);
      pass(pts, L, tail, head, 4 * heat, '#ffffff', 1);
      const hp = at(pts, L, head * tot);
      flare(hp.x, hp.y, 0.6 + heat * 0.9, (st.flareA ?? 1) * clamp(heat * 1.2));
      if (st.spark) emit(hp.x, hp.y, hp.tx, hp.ty, Math.round(st.spark * 3), 520);
      if (st.burst) { for (let i = 0; i < st.burst; i++) { const q = at(pts, L, Math.random() * tot); emit(q.x, q.y, q.tx, q.ty, 1, 700, 0.9); } }
    }
    drawSparks(dt);
    // white-out: the light swallowing the frame
    if (st.white > 0.001) {
      g.globalCompositeOperation = 'source-over';
      const c = at(pts, L, tot * 0.55);
      const r = g.createRadialGradient(c.x, c.y, 0, c.x, c.y, Math.hypot(W, H));
      r.addColorStop(0, '#ffffff'); r.addColorStop(0.5, '#fffaf2'); r.addColorStop(1, '#fff0da');
      g.globalAlpha = clamp(st.white); g.fillStyle = r; g.fillRect(0, 0, W, H);
    }
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  }
  return { render, resize, get sparks() { return sparks.length; } };
}
