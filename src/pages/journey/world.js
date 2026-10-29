// =====================================================================
//  The world of the journey: Bengaluru, one company at a time.
//  Themes re-colour (and re-style) the same city after every level-up;
//  the level is laid out chapter by chapter from small patterns.
//  Everything is drawn in "art pixels" on a 216-pixel-tall canvas.
// =====================================================================
export const TILE = 16, VH = 216, GY = 176;   // ground top

// ---------------------------------------------------------------- themes
// sky: 3 stops · walls: building colours · ink: outline colour (drawn styles) · fx: overlay
export const THEMES = {
  namma: { name: 'Namma Bengaluru', sky: ['#5fb6f0', '#a9dcff', '#ffe6c2'], sun: '#fff1a8', cloud: '#ffffff', far: ['#9db6d3', '#b9cde3'], farWin: '#d9e6f3',
    walls: ['#f2d7a7', '#e9b98c', '#cfe3d8', '#f4c6b5', '#d8d3f0', '#f7e7a6'], trim: '#fbf7ee', win: '#4f5f80', winLit: '#ffe28a', tank: '#1f2a2a',
    tree: ['#2f7f3d', '#4fa65a'], trunk: '#6a4a32', stone: ['#dccfb8', '#bfae93', '#a89678'], road: '#5d626c', roadLine: '#e9e4d8', foot: '#c9b89b', kerb: ['#151515', '#f5c400'], metro: '#c8c2b6', ink: null, fx: null },
  press: { name: 'Breaking news', sky: ['#efebe2', '#f6f3ec', '#ffffff'], sun: '#d7262e', cloud: '#ffffff', far: ['#cfc9bd', '#ddd8cd'], farWin: '#bdb6a8',
    walls: ['#f2efe8', '#e4e0d6', '#d6d1c6', '#ece8df'], trim: '#ffffff', win: '#2a2a2a', winLit: '#d7262e', tank: '#2a2a2a',
    tree: ['#3a3a3a', '#6a6a6a'], trunk: '#2a2a2a', stone: ['#ece8df', '#cfc9bd', '#a9a397'], road: '#4a4a4a', roadLine: '#ffffff', foot: '#d6d1c6', kerb: ['#111111', '#d7262e'], metro: '#bcb6aa', ink: '#1a1a1a', fx: 'halftone' },
  rainbow: { name: 'Every colour', sky: ['#8fd0ff', '#d6b6ff', '#ffd3e8'], sun: '#fff07a', cloud: '#ffffff', far: ['#b7a6f0', '#f0b6d8'], farWin: '#fff2fb',
    walls: ['#ff6b6b', '#ffb84d', '#ffe55c', '#5fd68a', '#4dc3ff', '#9a7bff', '#ff7ad1'], trim: '#ffffff', win: '#3a2a6a', winLit: '#ffffff', tank: '#3a2a6a',
    tree: ['#2fae5a', '#7be08a'], trunk: '#7a4a2a', stone: ['#ffffff', '#e9dcff', '#c9b6f6'], road: '#5a5070', roadLine: '#ffffff', foot: '#f6d4ff', kerb: ['#3a2a6a', '#ffe55c'], metro: '#e9dcff', ink: null, fx: 'sparkle' },
  notebook: { name: 'Notebook', sky: ['#fbf8ef', '#fbf8ef', '#fbf8ef'], sun: '#2f5fd0', cloud: '#ffffff', far: ['#e7ecf7', '#eef2fa'], farWin: '#c9d4ee',
    walls: ['#ffffff', '#f6f4ee', '#eef2fa'], trim: '#ffffff', win: '#2f5fd0', winLit: '#e2483a', tank: '#2f5fd0',
    tree: ['#d8e2f6', '#eef2fa'], trunk: '#2f5fd0', stone: ['#ffffff', '#eef2fa', '#d8e2f6'], road: '#eef2fa', roadLine: '#2f5fd0', foot: '#ffffff', kerb: ['#2f5fd0', '#ffffff'], metro: '#ffffff', ink: '#2f5fd0', fx: 'grid' },
  sunset: { name: 'Golden hour', sky: ['#ff7a2f', '#ffa64d', '#ffd99a'], sun: '#fff0c2', cloud: '#ffd0a0', far: ['#d0602a', '#e8803a'], farWin: '#ffc46a',
    walls: ['#b8481e', '#cf5f28', '#a63c1a', '#e07a34'], trim: '#ffcf8a', win: '#5a1e0e', winLit: '#ffd36a', tank: '#4a160a',
    tree: ['#7a2a12', '#a8441c'], trunk: '#4a160a', stone: ['#f0a060', '#d0783e', '#a8542a'], road: '#5a2a1a', roadLine: '#ffcf8a', foot: '#d0783e', kerb: ['#3a1206', '#ffcf3a'], metro: '#c8622e', ink: null, fx: 'haze' },
  clinic: { name: 'Care', sky: ['#bff0e6', '#e2fbf5', '#ffffff'], sun: '#ffffff', cloud: '#ffffff', far: ['#cfe9e4', '#e0f3ef'], farWin: '#ffffff',
    walls: ['#ffffff', '#eafaf6', '#dff3ff', '#f0ecff'], trim: '#12a58c', win: '#7fd4c4', winLit: '#ffffff', tank: '#5fb8a8',
    tree: ['#3fbf9a', '#8fe0c6'], trunk: '#5a8a7a', stone: ['#ffffff', '#e2f4f0', '#c6e6df'], road: '#7a9a96', roadLine: '#ffffff', foot: '#e8f6f2', kerb: ['#12a58c', '#ffffff'], metro: '#ffffff', ink: null, fx: 'bokeh' },
  markets: { name: 'Markets', sky: ['#050a1c', '#0a1640', '#16286a'], sun: '#9fb4ff', cloud: '#22306a', far: ['#0f1a44', '#162456'], farWin: '#3b5bfd',
    walls: ['#101a3c', '#16224c', '#0c1430'], trim: '#3b5bfd', win: '#1a2a66', winLit: '#6ad6ff', tank: '#0a1028',
    tree: ['#0f3a3a', '#1a5a50'], trunk: '#0a1a28', stone: ['#1c2a5c', '#16224c', '#0e1838'], road: '#0a0f24', roadLine: '#3b5bfd', foot: '#16224c', kerb: ['#050a1c', '#18e39a'], metro: '#1c2a5c', ink: null, fx: 'matrix' },
  next: { name: 'Next level', sky: ['#ff9a6a', '#ffc27a', '#fff0c8'], sun: '#ffffff', cloud: '#fff4e0', far: ['#c98a7a', '#e0a68a'], farWin: '#fff0d8',
    walls: ['#f2d7a7', '#ffd0b0', '#f6e2c0'], trim: '#ffffff', win: '#7a4a3a', winLit: '#fff0a0', tank: '#5a3a2a',
    tree: ['#4a8a3a', '#7ab85a'], trunk: '#6a4a32', stone: ['#ffe2c0', '#f0c090', '#d8a070'], road: '#7a6a62', roadLine: '#fff4e0', foot: '#e8c9a0', kerb: ['#3a2a22', '#ffd23f'], metro: '#e8d0b8', ink: null, fx: 'rays' },
};

// ---------------------------------------------------------------- tiny seeded random
export function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

// ---------------------------------------------------------------- the level
// chapter 0 is the start in front of Vidhana Soudha; one chapter per company; then the "next level" plaza
const PLAN = [
  ['arc', 'cone', 'bricks', 'arc', 'pit', 'arc'],
  ['arc', 'cone', 'auto', 'bricks', 'pit', 'arc'],
  ['cow', 'arc', 'stairs', 'pit', 'bug', 'arc'],
  ['bricks', 'auto', 'cones', 'high', 'bug', 'arc'],
  ['pit', 'arc', 'cow', 'auto', 'stairs', 'bugs'],
  ['high', 'cones', 'auto', 'pit', 'bugs', 'arc'],
  ['stairs', 'auto', 'pit', 'high', 'bugs', 'auto'],
];
export function buildLevel(stops) {
  const L = { solids: [], coins: [], cones: [], pits: [], spawns: [], signs: [], chapters: [], boxes: [], w: 0 };
  const T = TILE;
  const brick = (tx, th, extra = {}) => L.solids.push({ x: tx * T, y: GY - th * T, w: T, h: T, kind: 'brick', ...extra });
  const qb = (tx, th, extra = {}) => L.solids.push({ x: tx * T, y: GY - th * T, w: T, h: T, kind: 'q', ...extra });
  const coin = (x, y) => L.coins.push({ x, y, got: false });
  let cur = 0;
  const pattern = (name, d) => {
    const t = cur;
    switch (name) {
      case 'arc': for (let i = 0; i < 5; i++) coin((t + 1 + i) * T + 4, GY - 26 - Math.sin(i / 4 * Math.PI) * 22); return 7;
      case 'cone': L.cones.push({ x: (t + 2) * T + 3, y: GY - 13, w: 10, h: 13 }); coin((t + 2) * T + 4, GY - 46); return 4;
      case 'cones': L.cones.push({ x: (t + 1) * T + 3, y: GY - 13, w: 10, h: 13 }, { x: (t + 4) * T + 3, y: GY - 13, w: 10, h: 13 }); return 6;
      case 'bricks': for (let i = 1; i <= 5; i++) (i === 3 ? qb(t + i, 4, { coin: true }) : brick(t + i, 4)); for (let i = 2; i <= 4; i++) coin((t + i) * T + 4, GY - 5 * T - 10); return 7;
      case 'pit': L.pits.push({ x0: (t + 2) * T, x1: (t + 4) * T }); for (let i = 0; i < 3; i++) coin((t + 2) * T + i * 12 + 2, GY - 52 - (i === 1 ? 8 : 0)); return 6;
      case 'stairs': for (let i = 1; i <= 3; i++) for (let h = 1; h <= i; h++) brick(t + i, h); for (let i = 5; i <= 7; i++) brick(t + i, 4, i === 6 ? { coin: true, kind: 'q' } : {}); coin((t + 3) * T + 4, GY - 4 * T - 12); return 9;
      case 'high': for (let i = 1; i <= 3; i++) brick(t + i, 3); for (let i = 5; i <= 7; i++) brick(t + i, 6); for (let i = 5; i <= 7; i++) coin(i * T + t * T + 4, GY - 7 * T - 10); coin((t + 2) * T + 4, GY - 4 * T - 10); return 9;
      case 'cow': L.boxes.push({ x: (t + 2) * T, y: GY - 18, w: 26, h: 18, kind: 'cow' }); L.solids.push({ x: (t + 2) * T + 3, y: GY - 13, w: 20, h: 13, kind: 'cow' }); coin((t + 3) * T, GY - 44); return 6;
      case 'auto': L.spawns.push({ x: (t + 4) * T, type: 'auto', done: false }); for (let i = 0; i < 3; i++) coin((t + 3 + i) * T + 4, GY - 3 * T); return 8;
      case 'bug': L.spawns.push({ x: (t + 3) * T, type: 'bug', done: false, at: (t + 3) * T }); return 6;
      case 'bugs': L.spawns.push({ x: (t + 2) * T, type: 'bug', done: false, at: (t + 2) * T }, { x: (t + 5) * T, type: 'bug', done: false, at: (t + 5) * T }); return 8;
      default: return 4;
    }
  };
  // chapter 0: the start
  const ch0 = { x0: 0, stop: -1 };
  L.signs.push({ x: 13 * T, kind: 'start', text: 'START', sub: '2017' });
  cur = 16; PLAN[0].forEach((p) => (cur += pattern(p, 0)));
  ch0.x1 = cur * T; L.chapters.push(ch0);
  // one chapter per company
  stops.forEach((s, i) => {
    const c = { x0: cur * T, stop: i };
    L.signs.push({ x: (cur + 2) * T, kind: 'company', text: s.short, sub: (s.years.match(/\d{4}/) || [''])[0], color: s.color });
    brick(cur + 8, 4); qb(cur + 9, 4, { stop: i, color: s.color }); brick(cur + 10, 4);
    coin((cur + 8) * T + 4, GY - 5 * T - 10); coin((cur + 10) * T + 4, GY - 5 * T - 10);
    c.block = { x: (cur + 9) * T };
    cur += 14;
    PLAN[i + 1].forEach((p) => (cur += pattern(p, i + 1)));
    c.x1 = cur * T; L.chapters.push(c);
  });
  // the next level
  const fin = { x0: cur * T, stop: stops.length, final: true };
  L.signs.push({ x: (cur + 3) * T, kind: 'next', text: 'NEXT LEVEL', sub: '20XX' });
  L.solids.push({ x: (cur + 12) * T, y: GY - 5 * T, w: 2 * T, h: 2 * T, kind: 'big' });
  fin.block = { x: (cur + 12) * T };
  for (let i = 0; i < 6; i++) coin((cur + 6 + i) * T + 4, GY - 26 - Math.sin(i / 5 * Math.PI) * 26);
  cur += 30;
  fin.x1 = cur * T; L.chapters.push(fin);
  L.w = cur * T;
  // ground, broken by the potholes
  let gx = 0;
  for (const p of [...L.pits].sort((a, b) => a.x0 - b.x0)) { L.solids.push({ x: gx, y: GY, w: p.x0 - gx, h: VH - GY, kind: 'ground' }); gx = p.x1; }
  L.solids.push({ x: gx, y: GY, w: L.w - gx, h: VH - GY, kind: 'ground' });
  L.solids.push({ x: -T, y: 0, w: T, h: VH, kind: 'wall' }, { x: L.w, y: 0, w: T, h: VH, kind: 'wall' });
  return L;
}

// ---------------------------------------------------------------- painting helpers
const R = (g, x, y, w, h, c) => { if (w <= 0 || h <= 0) return; g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
function box(g, th, x, y, w, h, c) { R(g, x, y, w, h, c); if (th.ink) { R(g, x, y, w, 1, th.ink); R(g, x, y + h - 1, w, 1, th.ink); R(g, x, y, 1, h, th.ink); R(g, x + w - 1, y, 1, h, th.ink); } }

export function paintSky(g, th, VW, t) {
  const [a, b, c] = th.sky;
  // banded gradient (8 steps) for a pixel-art sky
  for (let i = 0; i < 9; i++) { const k = i / 8; R(g, 0, Math.floor(k * 150), VW, 21, lerpC(k < 0.55 ? a : b, k < 0.55 ? b : c, k < 0.55 ? k / 0.55 : (k - 0.55) / 0.45)); }
  R(g, 0, 150, VW, VH - 150, c);
  // sun
  const sx = VW * 0.78, sy = th.fx === 'matrix' ? 30 : 38, r = 13;
  if (th.fx === 'matrix') { disc(g, sx, sy, r - 2, th.sun); disc(g, sx + 4, sy - 3, r - 3, th.sky[0]); }
  else if (th.fx === 'grid') { ring(g, sx, sy, r, th.sun); }
  else { disc(g, sx, sy, r + 5, withA(th.sun, 0.25)); disc(g, sx, sy, r, th.sun); }
  // clouds drift slowly
  for (let i = 0; i < 5; i++) {
    const cx = ((i * 97 + t * (4 + i)) % (VW + 80)) - 40, cy = 18 + (i * 23) % 60;
    cloud(g, th, cx, cy, 1 + (i % 2));
  }
}
function cloud(g, th, x, y, s) {
  const c = th.cloud;
  R(g, x, y + 4 * s, 22 * s, 4 * s, c); R(g, x + 4 * s, y, 10 * s, 5 * s, c); R(g, x + 12 * s, y + 2 * s, 8 * s, 3 * s, c);
  if (th.ink) { R(g, x, y + 8 * s, 22 * s, 1, th.ink); }
}
function disc(g, cx, cy, r, c) { for (let y = -r; y <= r; y++) { const w = Math.round(Math.sqrt(r * r - y * y)); R(g, cx - w, cy + y, w * 2, 1, c); } }
function ring(g, cx, cy, r, c) { for (let a = 0; a < 64; a++) R(g, cx + Math.cos(a / 64 * 6.283) * r, cy + Math.sin(a / 64 * 6.283) * r, 1, 1, c); }
function lerpC(a, b, k) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16), f = (s) => Math.round(((pa >> s) & 255) * (1 - k) + ((pb >> s) & 255) * k);
  return `rgb(${f(16)},${f(8)},${f(0)})`;
}
function withA(hex, a) { const p = parseInt(hex.slice(1), 16); return `rgba(${(p >> 16) & 255},${(p >> 8) & 255},${p & 255},${a})`; }

// far skyline (parallax 0.22), seeded so it never changes, re-coloured by theme
export function paintFar(g, th, cam, VW) {
  const off = cam * 0.22, r = rng(77);
  let x = -((off) % 2000);
  for (let i = 0; i < 60 && x < VW + 40; i++) {
    const w = 18 + Math.floor(r() * 26), h = 26 + Math.floor(r() * 46), gap = 2 + Math.floor(r() * 6);
    const sx = Math.floor(x + (Math.floor(off / 2000) * 0));
    if (sx + w > -10) {
      box(g, th, sx, 150 - h, w, h + 30, i % 2 ? th.far[0] : th.far[1]);
      for (let wy = 150 - h + 4; wy < 146; wy += 6) for (let wx = sx + 3; wx < sx + w - 3; wx += 5) if ((wx * 7 + wy * 3) % 11 < 4) R(g, wx, wy, 2, 2, th.farWin);
    }
    x += w + gap;
  }
}
// candlestick chart in the markets sky
export function paintCandles(g, cam, VW, t) {
  const off = cam * 0.12, r = rng(9);
  let v = 60;
  for (let i = 0; i < 80; i++) {
    const x = Math.round(i * 9 - (off % 720)); const o = v; v += (r() - 0.45) * 12; v = Math.max(30, Math.min(95, v));
    if (x < -10 || x > VW + 10) continue;
    const up = v < o, top = Math.min(o, v), hgt = Math.max(2, Math.abs(v - o));
    R(g, x + 2, top - 4, 1, hgt + 8, up ? '#18e39a' : '#ff4d6a');
    R(g, x, top, 5, hgt, up ? '#18e39a' : '#ff4d6a');
  }
}
// Namma Metro: the elevated line with its pillars, and a purple train now and then
export function paintMetro(g, th, cam, VW, t) {
  const off = cam * 0.38, y = 108;
  R(g, 0, y, VW, 5, th.metro); R(g, 0, y + 5, VW, 1, shade(th.metro, 0.75));
  if (th.ink) { R(g, 0, y, VW, 1, th.ink); R(g, 0, y + 5, VW, 1, th.ink); }
  for (let px = -((off) % 96); px < VW + 10; px += 96) {
    box(g, th, px + 40, y + 6, 6, 70, th.metro); R(g, px + 34, y + 5, 18, 3, shade(th.metro, 0.85));
  }
  // the train crosses every ~22 s
  const cyc = (t % 22) / 22, tx = VW + 40 - cyc * (VW + 360);
  if (cyc < 0.9) {
    for (let k = 0; k < 3; k++) {
      const cx = tx + k * 62;
      box(g, th, cx, y - 14, 58, 14, th.fx === 'press' ? '#bdb6aa' : th.fx === 'markets' ? '#2a3a8a' : '#7b3fa0');
      R(g, cx + 2, y - 4, 54, 2, th.fx === 'press' ? '#d7262e' : '#3fbf6a');
      for (let w = 0; w < 5; w++) R(g, cx + 5 + w * 10, y - 11, 6, 5, th.fx === 'markets' ? '#6ad6ff' : '#cfe6ff');
    }
  }
}
const shade = (hex, k) => { const p = parseInt(hex.slice(1), 16); const f = (s) => Math.round(((p >> s) & 255) * k); return `rgb(${f(16)},${f(8)},${f(0)})`; };

// the mid layer: Bengaluru low-rises, water tanks, coconut and rain trees, and each chapter's landmark
export function paintMid(g, th, cam, VW, L, t) {
  const P = 0.55, off = cam * P, base = GY + 2;
  // buildings: seeded per 220-px block of mid space
  const b0 = Math.floor(off / 220) - 1, b1 = Math.floor((off + VW) / 220) + 1;
  for (let b = b0; b <= b1; b++) {
    const r = rng(b * 31 + 7), bx = b * 220 - off;
    let x = bx;
    for (let k = 0; k < 4; k++) {
      const w = 34 + Math.floor(r() * 26), fl = 2 + Math.floor(r() * 3), h = fl * 15 + 6, c = th.walls[Math.floor(r() * th.walls.length)];
      if (!landmarkCovers(L, b * 220 + (x - bx), w)) building(g, th, x, base - h, w, h, c, r, t);
      x += w + 6 + Math.floor(r() * 8);
      if (r() < 0.5) { tree(g, th, x - 4, base, r() < 0.5 ? 'palm' : 'rain', r); }
    }
  }
  // landmarks (mid-space x)
  for (const m of landmarks(L)) { const sx = m.x - off; if (sx > -260 && sx < VW + 40) LANDMARK[m.kind](g, th, sx, base, t); }
}
function landmarks(L) {
  if (L._lm) return L._lm;
  const P = 0.55, kinds = ['vidhana', 'studio', 'glasshouse', 'library', 'tower', 'clinic', 'ubcity', 'nandi'];
  L._lm = L.chapters.map((c, i) => ({ x: i === 0 ? 70 : c.x0 * P + 120, kind: kinds[Math.min(i, kinds.length - 1)], w: i === 0 ? 230 : 150 }));
  return L._lm;
}
function landmarkCovers(L, mx, w) { return landmarks(L).some((m) => mx + w > m.x - 10 && mx < m.x + m.w + 10); }

function building(g, th, x, y, w, h, c, r, t) {
  box(g, th, x, y, w, h, c);
  R(g, x, y, w, 2, th.trim);                                     // parapet
  const fl = Math.floor((h - 6) / 15);
  for (let f = 0; f < fl; f++) {
    const fy = y + 5 + f * 15;
    for (let wx = x + 4; wx < x + w - 8; wx += 11) {
      const lit = th.fx === 'matrix' ? ((wx + fy + Math.floor(t)) % 7 < 3) : ((wx * 3 + fy) % 13 < 3);
      box(g, th, wx, fy, 7, 8, lit ? th.winLit : th.win);
      R(g, wx - 1, fy + 8, 9, 1, th.trim);                       // sill
      if (f === 0 && (wx % 3 === 0)) for (let gx = wx; gx < wx + 7; gx += 2) R(g, gx, fy + 9, 1, 3, shade(c, 0.6));   // balcony grill
    }
  }
  if (r() < 0.7) { box(g, th, x + w - 14, y - 9, 10, 9, th.tank); R(g, x + w - 13, y - 9, 8, 2, shade(th.tank, 1.6)); }   // the black water tank
  if (r() < 0.6) { const sw = Math.min(w - 8, 26); box(g, th, x + 4, y + h - 13, sw, 5, th.walls[(Math.floor(r() * 9)) % th.walls.length]); R(g, x + 6, y + h - 11, sw - 4, 1, th.ink || shade(c, 0.5)); }   // a shop board
}
function tree(g, th, x, base, kind, r) {
  if (kind === 'palm') {
    for (let i = 0; i < 48; i += 2) R(g, x + Math.round(Math.sin(i / 16) * 3), base - i, 2, 2, th.trunk);
    const tx = x + Math.round(Math.sin(3) * 3), ty = base - 48;
    for (const [dx, dy] of [[-10, 2], [-6, -2], [0, -4], [6, -2], [10, 2], [-12, 5], [12, 5]]) { R(g, tx + dx * 0.5 - 2, ty + dy * 0.5, 5, 2, th.tree[0]); R(g, tx + dx, ty + dy, 4, 2, th.tree[1]); }
    R(g, tx - 1, ty + 1, 3, 3, '#7a5a2a');
  } else {
    R(g, x, base - 26, 3, 26, th.trunk); R(g, x - 4, base - 30, 3, 6, th.trunk); R(g, x + 4, base - 32, 3, 8, th.trunk);
    for (const [dx, dy, w] of [[-16, -44, 36], [-20, -38, 44], [-14, -50, 28], [-18, -34, 40]]) box(g, th, x + dx, base + dy, w, 8, th.tree[0]);
    for (const [dx, dy, w] of [[-12, -48, 22], [-6, -52, 14], [-16, -42, 18]]) R(g, x + dx, base + dy, w, 4, th.tree[1]);
  }
}

const LANDMARK = {
  // Vidhana Soudha: the grand steps, the colonnade, the central dome with its flag, and the corner domes
  vidhana(g, th, x, base, t) {
    const [s1, s2, s3] = th.stone, ink = th.ink;
    box(g, th, x, base - 40, 230, 40, s2);                                   // the long body
    for (let i = 0; i < 10; i++) R(g, x + 6 + i * 22, base - 34, 10, 22, s3);  // window bays
    box(g, th, x + 60, base - 58, 110, 58, s1);                              // central block
    box(g, th, x + 72, base - 64, 86, 6, s2);                                // entablature
    R(g, x + 66, base - 70, 98, 6, s1); R(g, x + 66, base - 70, 98, 1, th.trim);
    for (let i = 0; i < 12; i++) { R(g, x + 74 + i * 7, base - 58, 3, 40, s3); R(g, x + 73 + i * 7, base - 58, 5, 2, s2); }   // the colonnade
    for (let i = 0; i < 6; i++) R(g, x + 60 - i * 3, base - 18 + i * 3, 110 + i * 6, 3, i % 2 ? s2 : s1);   // grand steps
    // central dome
    R(g, x + 100, base - 84, 30, 14, s1); disc(g, x + 115, base - 88, 14, s1); R(g, x + 101, base - 88, 28, 4, s2);
    R(g, x + 114, base - 108, 2, 8, s3); disc(g, x + 115, base - 101, 3, s2);
    // the flag
    R(g, x + 115, base - 124, 1, 18, ink || '#5a4a3a'); const wv = Math.floor(t * 4) % 2;
    R(g, x + 116, base - 124 + wv, 9, 2, '#ff9933'); R(g, x + 116, base - 122 + wv, 9, 2, '#ffffff'); R(g, x + 116, base - 120 + wv, 9, 2, '#138808'); R(g, x + 120, base - 122 + wv, 1, 1, '#000080');
    // corner domes
    for (const cx of [x + 14, x + 216, x + 66, x + 164]) { R(g, cx - 7, base - 50, 14, 10, s1); disc(g, cx, base - 52, 7, s1); R(g, cx, base - 62, 1, 4, s3); }
    if (ink) { R(g, x, base - 40, 230, 1, ink); R(g, x + 60, base - 58, 110, 1, ink); }
  },
  studio(g, th, x, base) {
    box(g, th, x, base - 64, 120, 64, th.walls[0]); R(g, x, base - 64, 120, 3, th.trim);
    box(g, th, x + 10, base - 50, 100, 22, '#14161c'); R(g, x + 14, base - 46, 30, 3, '#d7262e'); R(g, x + 14, base - 40, 70, 2, '#ffffff'); R(g, x + 14, base - 35, 52, 2, '#9a9a9a');
    box(g, th, x + 84, base - 47, 20, 14, '#d7262e'); R(g, x + 88, base - 42, 12, 4, '#ffffff');   // LIVE
    R(g, x + 30, base - 96, 2, 32, th.ink || '#5a5a5a'); disc(g, x + 31, base - 100, 9, th.walls[1]); R(g, x + 30, base - 104, 3, 3, '#d7262e');   // the dish
    for (let i = 0; i < 5; i++) R(g, x + 70 + i * 8, base - 20, 5, 20, th.walls[2]);
  },
  glasshouse(g, th, x, base) {
    R(g, x + 10, base - 26, 130, 26, '#e8f7ff'); for (let i = 0; i < 14; i++) R(g, x + 12 + i * 9, base - 26, 1, 26, '#ffffff');
    for (let k = 0; k < 3; k++) { const cx = x + 40 + k * 35, rr = k === 1 ? 30 : 20; for (let y = 0; y < rr; y++) { const w = Math.round(Math.sqrt(rr * rr - y * y)); R(g, cx - w, base - 26 - y, w * 2, 1, ['#ff9aa8', '#ffd27a', '#9ae6b4', '#8fd0ff', '#c6a8ff'][(y >> 2) % 5]); } R(g, cx, base - 26 - rr - 6, 1, 6, '#ffffff'); }
  },
  library(g, th, x, base) {
    box(g, th, x, base - 58, 130, 58, th.walls[0]); R(g, x, base - 58, 130, 3, th.trim);
    box(g, th, x + 10, base - 48, 70, 26, '#2a4a3a'); R(g, x + 16, base - 42, 26, 1, '#ffffff'); R(g, x + 16, base - 38, 40, 1, '#ffffff'); R(g, x + 16, base - 34, 18, 1, '#ffffff');   // chalkboard
    for (let i = 0; i < 6; i++) box(g, th, x + 88 + i * 6, base - 46 + (i % 2) * 2, 5, 24 - (i % 2) * 2, ['#e2483a', '#2f5fd0', '#f5c400', '#2fae5a'][i % 4]);   // books
  },
  tower(g, th, x, base) {
    for (const [dx, w, h] of [[0, 40, 96], [44, 36, 120], [84, 44, 84]]) {
      box(g, th, x + dx, base - h, w, h, th.walls[dx % 3]);
      for (let y = base - h + 6; y < base - 6; y += 8) R(g, x + dx + 4, y, w - 8, 3, th.win);
    }
    box(g, th, x + 18, base - 130, 70, 22, '#ffffff'); R(g, x + 22, base - 126, 22, 14, '#f47c20');
    R(g, x + 48, base - 125, 36, 4, '#2a2a2a'); R(g, x + 48, base - 118, 28, 3, '#f47c20');   // 1M+ billboard
  },
  clinic(g, th, x, base) {
    box(g, th, x, base - 60, 120, 60, '#ffffff'); R(g, x, base - 60, 120, 3, th.trim);
    for (let y = base - 52; y < base - 14; y += 12) for (let wx = x + 8; wx < x + 110; wx += 14) box(g, th, wx, y, 9, 7, th.win);
    R(g, x + 52, base - 84, 16, 20, '#12a58c'); R(g, x + 56, base - 80, 8, 12, '#ffffff'); R(g, x + 54, base - 76, 12, 4, '#ffffff');
  },
  ubcity(g, th, x, base, t) {
    for (const [dx, w, h] of [[0, 34, 110], [38, 30, 150], [72, 34, 124], [110, 26, 90]]) {
      box(g, th, x + dx, base - h, w, h, th.walls[dx % 3]);
      for (let y = base - h + 6; y < base - 6; y += 6) for (let wx = x + dx + 3; wx < x + dx + w - 3; wx += 5) if ((wx + y + Math.floor(t * 2)) % 5 < 2) R(g, wx, y, 3, 2, th.winLit);
      R(g, x + dx, base - h, w, 1, th.trim);
    }
    R(g, x + 52, base - 176, 2, 26, th.trim); R(g, x + 51, base - 178, 4, 3, '#6ad6ff');   // the spire
    box(g, th, x + 4, base - 40, 80, 14, '#050a1c'); R(g, x + 8 - (Math.floor(t * 20) % 80), base - 35, 200, 3, '#18e39a');   // ticker
  },
  nandi(g, th, x, base) {
    for (let i = 0; i < 300; i++) { const h = Math.round(40 + Math.sin(i / 60) * 30 + Math.sin(i / 17) * 6); R(g, x - 80 + i, base - h, 1, h, th.far[0]); }
  },
};

// the road: footpath with the black-and-yellow kerb, the road, and the potholes
export function paintGround(g, th, cam, VW, L, t) {
  const y = GY;
  R(g, 0, y, VW, 8, th.foot); R(g, 0, y, VW, 1, shade(th.foot, 1.1));
  for (let px = -Math.floor(cam % 12); px < VW; px += 12) R(g, px, y + 3, 1, 5, shade(th.foot, 0.85));            // paving
  for (let px = -Math.floor(cam % 16); px < VW; px += 16) { R(g, px, y + 8, 8, 4, th.kerb[0]); R(g, px + 8, y + 8, 8, 4, th.kerb[1]); }   // the kerb
  R(g, 0, y + 12, VW, VH - y - 12, th.road);
  for (let px = -Math.floor(cam % 40); px < VW; px += 40) R(g, px, y + 26, 20, 2, th.roadLine);
  if (th.ink) { R(g, 0, y, VW, 1, th.ink); R(g, 0, y + 12, VW, 1, th.ink); }
  // potholes: the ground is open; draw a puddle in the pit
  for (const p of L.pits) {
    const sx = p.x0 - cam; if (sx > VW || sx + (p.x1 - p.x0) < 0) continue;
    R(g, sx, y, p.x1 - p.x0, VH - y, '#1a1410');
    R(g, sx + 2, y + 18, p.x1 - p.x0 - 4, VH - y - 18, th.fx === 'markets' ? '#0a2a6a' : '#3a6a8a');
    R(g, sx + 4 + Math.floor(t * 3) % 6, y + 20, 6, 1, '#9fd3ff');
  }
}

// style overlays
export function paintFx(g, th, VW, t) {
  switch (th.fx) {
    case 'halftone': {
      g.fillStyle = 'rgba(26,26,26,.09)';
      for (let y = 0; y < 150; y += 4) for (let x = (y % 8) / 2; x < VW; x += 4) if ((x + y) % 3 === 0) g.fillRect(x, y, 1, 1);
      break;
    }
    case 'grid': {
      g.fillStyle = 'rgba(47,95,208,.12)';
      for (let x = 0; x < VW; x += 12) g.fillRect(x, 0, 1, 150);
      for (let y = 6; y < 150; y += 12) g.fillRect(0, y, VW, 1);
      g.fillStyle = 'rgba(226,72,58,.35)'; g.fillRect(14, 0, 1, 150);
      break;
    }
    case 'sparkle': for (let i = 0; i < 14; i++) { const x = (i * 53 + t * 9) % VW, y = (i * 37) % 120 + 6, on = Math.sin(t * 3 + i) > 0.3; if (on) { R(g, x, y, 1, 3, '#ffffff'); R(g, x - 1, y + 1, 3, 1, '#ffffff'); } } break;
    case 'haze': { const gr = g.createLinearGradient(0, 90, 0, 176); gr.addColorStop(0, 'rgba(255,170,80,0)'); gr.addColorStop(1, 'rgba(255,170,80,.25)'); g.fillStyle = gr; g.fillRect(0, 90, VW, 86); break; }
    case 'bokeh': for (let i = 0; i < 8; i++) { const x = (i * 71 + t * 4) % VW, y = (i * 29) % 110 + 10; g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(x, y, 3 + (i % 3) * 2, 0, 7); g.fill(); } break;
    case 'matrix': {
      g.fillStyle = 'rgba(24,227,154,.22)';
      for (let i = 0; i < 26; i++) { const x = (i * 15 + 5) % VW, sp = 20 + (i * 7) % 30, y = (t * sp + i * 40) % 170; for (let k = 0; k < 6; k++) g.fillRect(x, y - k * 4, 2, 2); }
      break;
    }
    case 'rays': {
      g.fillStyle = 'rgba(255,255,255,.12)';
      for (let i = 0; i < 6; i++) { const a = -1.2 + i * 0.35 + Math.sin(t * 0.3) * 0.05; g.beginPath(); g.moveTo(VW * 0.78, 38); g.lineTo(VW * 0.78 + Math.cos(a) * 400, 38 + Math.sin(a) * 400); g.lineTo(VW * 0.78 + Math.cos(a + 0.08) * 400, 38 + Math.sin(a + 0.08) * 400); g.fill(); }
      break;
    }
    default:
  }
}

// signboards standing on the footpath (company names, start, next level)
export function paintSign(g, th, s, cam, t) {
  const x = Math.round(s.x - cam), y = GY;
  const w = Math.max(56, s.text.length * 8 + 16), h = 26;
  R(g, x + 6, y - 40, 2, 40, '#3a3a3a'); R(g, x + w - 8, y - 40, 2, 40, '#3a3a3a');
  const bg = s.kind === 'company' ? s.color : s.kind === 'next' ? '#ffcf3a' : '#2f8f3f';
  R(g, x - 1, y - 51, w + 2, h + 2, '#14100c'); R(g, x, y - 50, w, h, bg); R(g, x + 2, y - 48, w - 4, h - 4, 'rgba(255,255,255,.08)');
  R(g, x, y - 50, w, 1, 'rgba(255,255,255,.5)');
  g.font = '8px "Press Start 2P"'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  const fg = s.kind === 'next' ? '#3a1e08' : '#ffffff';
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillText(s.text, x + w / 2 + 1, y - 36);
  g.fillStyle = fg; g.fillText(s.text, x + w / 2, y - 37);
  g.fillStyle = s.kind === 'next' ? '#7a3a08' : 'rgba(255,255,255,.75)'; g.fillText(s.sub, x + w / 2, y - 27);
}
