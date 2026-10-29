// The sword's arc of light in the first frame of the Timekeeper film, and how that frame sits on screen.
// Shared by the universe (where the timeline becomes this ray) and the About page (where the ray opens the page),
// so the ray lands exactly on the arc in the shot.
export const FILM_AR = 1280 / 720;
export const FILM_ZOOM = 1.04;
export const FILM_HOLD = 19;
// two cubic segments in frame space (0..1), from the ground end of the streak up to the arc's tip
export const ARC = [[0.74, 0.972], [0.62, 0.925], [0.53, 0.875], [0.455, 0.822], [0.33, 0.74], [0.25, 0.38], [0.365, 0.1]];

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const ease = (x) => x * x * (3 - 2 * x);
// where the camera looks across the frame on narrow screens: first the arc, then him
export const filmFocus = (f) => (f <= FILM_HOLD ? 0.36 + 0.24 * ease(clamp(f / FILM_HOLD, 0, 1)) : 0.6 + 0.12 * ease(clamp((f - 60) / 50, 0, 1)));

// the frame's rectangle on a W×H screen (k lifts it to the top on tall screens)
export function filmRect(W, H, f = 0, k = 0, ox = 0, oy = 0) {
  const iw = FILM_AR, ih = 1;
  const cover = Math.max(W / iw, H / ih) * FILM_ZOOM;
  const s = Math.max((W / iw) * FILM_ZOOM, cover + ((H * 0.6) / ih - cover) * k);
  const dw = iw * s, dh = ih * s;
  let dx = W / H > 1.2 ? (W - dw) / 2 : W / 2 - filmFocus(f) * dw;
  let dy = ((H - dh) / 2) * (1 - k);
  dx = clamp(dx + ox, W - dw, 0);
  dy = dh >= H ? clamp(dy + oy, H - dh, 0) : Math.max(0, dy + oy);
  return { dx, dy, dw, dh };
}

export function arcOnScreen(W, H) {
  const r = filmRect(W, H, 0);
  return ARC.map(([u, v]) => [r.dx + u * r.dw, r.dy + v * r.dh]);
}
const f1 = (n) => n.toFixed(1);
export const arcPath = (P) => `M${f1(P[0][0])} ${f1(P[0][1])} C${P.slice(1, 4).map((p) => `${f1(p[0])} ${f1(p[1])}`).join(' ')} C${P.slice(4, 7).map((p) => `${f1(p[0])} ${f1(p[1])}`).join(' ')}`;

// sample the curve (for the clip that splits the page along it)
export function arcPoints(P, n = 24) {
  const out = [];
  const seg = (a, b, c, d) => { for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; out.push([u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0], u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1]]); } };
  seg(P[0], P[1], P[2], P[3]); seg(P[3], P[4], P[5], P[6]);
  return out;
}

// the two halves of the screen either side of the arc (arc extended to the top and bottom edges)
export function arcHalves(W, H, P) {
  const pts = arcPoints(P);
  const a = pts[0], a2 = pts[2], z = pts[pts.length - 1], z2 = pts[pts.length - 3];
  const ext = (p, q, y) => { const t = (y - p[1]) / ((q[1] - p[1]) || 1e-6); return [p[0] + (q[0] - p[0]) * t, y]; };
  const bottom = ext(a2, a, H + 40), top = ext(z2, z, -40);
  const line = [bottom, ...pts, top];                                    // bottom edge → up the arc → top edge
  const px = (p) => `${p[0].toFixed(1)}px ${p[1].toFixed(1)}px`;
  const left = [[-40, H + 40], ...line, [-40, -40]];
  const right = [...line, [W + 40, -40], [W + 40, H + 40]];
  return { left: `polygon(${left.map(px).join(',')})`, right: `polygon(${right.map(px).join(',')})` };
}
