// =====================================================================
//  Pixel art for the journey. Kaju is drawn from pixel maps (one letter
//  per pixel) and gains gear with every level: headphones → sash →
//  backpack → the dark jacket → gold wristbands → the katana on his back,
//  the warrior from the top of the page. Props are drawn in code.
// =====================================================================
export const PAL = {
  K: '#1a1114', H: '#231a1e', h: '#4a3a42', S: '#c98b5f', s: '#a66d47', E: '#120c0e', W: '#ffffff', B: '#7d5238',
  M: '#6e2a26', T: '#ffffff', O: '#f4f1ea', o: '#cfc8bb', R: '#d63a3f', r: '#9e2228', P: '#2c2f3d', p: '#1f212c',
  N: '#e23b40', n: '#fbfbfb', k: '#3b2a2a', G: '#2b2b33', g: '#d63a3f', J: '#2b2520', j: '#1a1612', Y: '#e9b65e',
  X: '#7a1a1e', Z: '#dfe6ee', z: '#9aa6b4', L: '#5a3d2b',
};

// ---------------------------------------------------------------- Kaju, 14 × 20, facing right
const HEAD = {
  normal: [
    '...H.HH.HH....',
    '..HHHHHHHHHH..',
    '.HHHHHHHHHHHH.',
    '.HHhHHHHHhHHH.',
    '.HHHHSSHHSSSH.',
    '.HHSSSSSSSSSS.',
    '.HSSSSWESSWES.',
    '..SSSSSSSSSSs.',
    '..sSBSSSSMMSs.',
    '...sBBBBBBBs..',
  ],
};
HEAD.blink = HEAD.normal.map((r, i) => (i === 6 ? '.HSSSSEESSEES.' : r));
HEAD.happy = HEAD.normal.map((r, i) => (i === 6 ? '.HSSSSEESSEES.' : i === 5 ? '.HHSSSSSSSSSS.' : i === 8 ? '..sSBSSSMTTMs.' : r));
HEAD.talk = HEAD.normal.map((r, i) => (i === 8 ? '..sSBSSSSMMSs.' : i === 9 ? '...sBBBBMMBs..' : r));
HEAD.ouch = HEAD.normal.map((r, i) => (i === 6 ? '.HSSSSEWSSEWS.' : i === 8 ? '..sSBSSSSSMSs.' : i === 9 ? '...sBBBBBMBs..' : r));
HEAD.smile = HEAD.normal.map((r, i) => (i === 8 ? '..sSBSSSMTTMs.' : r));

const TORSO = {
  idle: [
    '...oOOOOOOo...',
    '..OOOOROROOO..',
    '.oOOOOROROOOo.',
    '.oOOOOOOOOOOo.',
    '.SoOOOOOOOOoS.',
    '...oOOOOOOo...',
  ],
  runA: [
    '...oOOOOOOo...',
    '..OOOOROROOOO.',
    '.oOOOOROROOOOS',
    'oOOOOOOOOOOO..',
    'S.OOOOOOOOOo..',
    '...oOOOOOOo...',
  ],
  runB: [
    '...oOOOOOOo...',
    '.OOOOOROROOO..',
    'SOOOOOROROOOo.',
    '..OOOOOOOOOOOo',
    '..oOOOOOOOOo.S',
    '...oOOOOOOo...',
  ],
  wave: [
    '...oOOOOOOo...',
    '..OOOOROROOO..',
    '.oOOOOROROOO..',
    '.oOOOOOOOOOO..',
    '.SoOOOOOOOOo..',
    '...oOOOOOOo...',
  ],
  jump: [
    '...oOOOOOOo..S',
    '..OOOOROROOOOo',
    '.oOOOOROROOO..',
    'SOOOOOOOOOOO..',
    '..OOOOOOOOOo..',
    '...oOOOOOOo...',
  ],
};
const LEGS = {
  idle: ['...PPPPPPPP...', '...PPPp.PPPp..', '...PPPp.PPPp..', '..NNNnk.NNNnk.'],
  run1: ['...PPPPPPPP...', '..PPPp...PPPp.', '.PPPp.....PPP.', 'NNNn......NNNn'],
  run2: ['...PPPPPPPP...', '....PPPPPPp...', '....PPp.PPp...', '...NNNnNNNn...'],
  jump: ['...PPPPPPPP...', '..PPPp..PPPP..', '..PPp...PPNNn.', '.NNNn.........'],
  crouch: ['..PPPPPPPPPP..', '..NNNnk.NNNnk.'],
};
// the raised arm for waving (two frames), drawn over the head/torso: [x, y, colour]
const WAVE_ARM = [
  [[12, 10, 'O'], [12, 9, 'O'], [13, 8, 'O'], [13, 7, 'S'], [13, 6, 'S']],
  [[12, 10, 'O'], [13, 9, 'O'], [13, 8, 'O'], [14, 7, 'S'], [14, 6, 'S']],
];

// gear, cumulative by level (0 = the fresher in a hoodie … 6 = the Timekeeper)
function gear(level, px, pose) {
  if (level >= 1) {               // headphones
    [[4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0], [3, 1], [10, 1], [2, 2], [11, 2]].forEach(([x, y]) => px(x, y, 'G'));
    [[1, 4], [1, 5], [1, 6], [0, 5]].forEach(([x, y]) => px(x, y, 'g'));
  }
  if (level >= 2) {               // red sash with a tail
    for (let x = 3; x <= 10; x++) px(x, 15, 'R');
    px(2, 15, 'r'); px(1, 16, 'R'); px(0, 17, 'R'); px(1, 17, 'r');
  }
  if (level >= 3 && level < 6) {  // backpack (the katana replaces it)
    for (let y = 10; y <= 14; y++) { px(0, y, 'L'); px(-1, y, 'L'); }
    px(-1, 10, 'k'); px(2, 10, 'k'); px(2, 11, 'k');
  }
  if (level >= 4) {               // the dark jacket over the hoodie, gold trim
    for (let y = 10; y <= 15; y++) {
      const L = y === 10 ? 3 : y === 15 ? 3 : 1, R = y === 10 ? 10 : y === 15 ? 10 : 12;
      for (let x = L; x <= 4; x++) px(x, y, y === 15 ? 'j' : 'J');
      for (let x = 9; x <= R; x++) px(x, y, y === 15 ? 'j' : 'J');
      if (y > 10 && y < 15) { px(4, y, 'Y'); px(9, y, 'Y'); }
    }
    if (pose !== 'wave') { px(1, 14, 'S'); px(12, 14, 'S'); }
  }
  if (level >= 5) { px(1, 13, 'R'); px(12, 13, 'R'); }   // wristbands
  if (level >= 6) {               // the katana on his back
    [[-1, 5], [0, 6], [1, 7]].forEach(([x, y]) => px(x, y, 'X'));
    px(2, 8, 'Y'); px(1, 9, 'Y');
    [[3, 10], [4, 11], [5, 12], [6, 13], [7, 14], [8, 15], [9, 16]].forEach(([x, y]) => px(x, y, 'K'));
  }
}

const OX = 2, OY = 2, SW = 18, SH = 24;   // sprite canvas with room for gear outside the body
function paint(rows, pose, level, extra, shift = 0) {
  const c = document.createElement('canvas'); c.width = SW; c.height = SH;
  const x = c.getContext('2d');
  const grid = {};
  const px = (cx, cy, k) => { grid[`${cx},${cy}`] = k; };
  rows.forEach((r, y) => [...r].forEach((k, cx) => { if (k !== '.') px(cx, y, k); }));
  gear(level, shift ? (cx, cy, k) => { if (cy <= 14) px(cx, cy + shift, k); } : px, pose);
  if (extra) extra.forEach(([cx, cy, k]) => px(cx, cy, k));
  // 1px dark outline so he reads on any world
  const keys = Object.keys(grid);
  x.fillStyle = '#140c10';
  for (const key of keys) {
    const [cx, cy] = key.split(',').map(Number);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!grid[`${cx + dx},${cy + dy}`]) x.fillRect(cx + dx + OX, cy + dy + OY, 1, 1);
  }
  for (const key of keys) { const [cx, cy] = key.split(',').map(Number); x.fillStyle = PAL[grid[key]]; x.fillRect(cx + OX, cy + OY, 1, 1); }
  return c;
}
function mirror(c) {
  const m = document.createElement('canvas'); m.width = c.width; m.height = c.height;
  const x = m.getContext('2d'); x.translate(c.width, 0); x.scale(-1, 1); x.drawImage(c, 0, 0); return m;
}
export const KAJU = { w: 14, h: 20, ox: OX, oy: OY, sw: SW, sh: SH };
export function buildKaju(level) {
  const f = (head, torso, legs, extra, pose) => paint([...HEAD[head], ...TORSO[torso], ...LEGS[legs]], pose, level, extra);
  const crouch = () => paint(['', '', '', ...HEAD.smile, ...TORSO.idle.slice(0, 5), ...LEGS.crouch].map((r) => r || '..............'), 'crouch', level, null, 3);
  const set = {
    idle: [f('normal', 'idle', 'idle'), f('blink', 'idle', 'idle')],
    smile: [f('smile', 'idle', 'idle')],
    run: [f('normal', 'runA', 'run1'), f('normal', 'idle', 'run2'), f('normal', 'runB', 'run1'), f('normal', 'idle', 'run2')],
    jump: [f('normal', 'jump', 'jump')],
    wave: [f('happy', 'wave', 'idle', WAVE_ARM[0], 'wave'), f('talk', 'wave', 'idle', WAVE_ARM[1], 'wave')],
    talk: [f('talk', 'idle', 'idle'), f('smile', 'idle', 'idle')],
    ouch: [f('ouch', 'jump', 'jump')],
    crouch: [crouch()],
    cheer: [f('happy', 'jump', 'jump', WAVE_ARM[1], 'wave')],
  };
  const out = {};
  for (const k in set) out[k] = { r: set[k], l: set[k].map(mirror) };
  return out;
}

// ---------------------------------------------------------------- props (drawn in code, in art pixels)
const R = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };

export function drawCoin(g, x, y, t) {
  const w = [8, 6, 2, 6][Math.floor(t * 8) % 4], ox = (8 - w) / 2;
  R(g, x + ox, y + 1, w, 6, '#c9921a'); R(g, x + ox + (w > 2 ? 1 : 0), y, Math.max(1, w - 2), 8, '#c9921a');
  if (w > 2) { R(g, x + ox + 1, y + 1, w - 2, 6, '#ffd23f'); R(g, x + ox + 1, y + 1, 1, 3, '#fff3b0'); }
}
export function drawBrick(g, x, y, used = false) {
  R(g, x, y, 16, 16, used ? '#6b4a3a' : '#6b2a14');
  const c = used ? '#8a6a55' : '#c25a2c', hi = used ? '#9a7a64' : '#e0773f';
  for (let row = 0; row < 4; row++) {
    const off = row % 2 ? 4 : 0;
    for (let b = -1; b < 3; b++) { const bx = x + b * 8 + off; const x0 = Math.max(x, bx), x1 = Math.min(x + 16, bx + 7); if (x1 > x0) { R(g, x0, y + row * 4, x1 - x0, 3, c); R(g, x0, y + row * 4, x1 - x0, 1, hi); } }
  }
}
export function drawQBlock(g, x, y, t, color = '#ffc23d', used = false, label = '?') {
  if (used) { R(g, x, y, 16, 16, '#3a2a22'); R(g, x + 1, y + 1, 14, 14, '#7a5a44'); R(g, x + 2, y + 2, 12, 12, '#6a4a36'); [[2, 2], [12, 2], [2, 12], [12, 12]].forEach(([a, b]) => R(g, x + a, y + b, 2, 2, '#3a2a22')); return; }
  R(g, x, y, 16, 16, '#3a1e08'); R(g, x + 1, y + 1, 14, 14, color);
  R(g, x + 1, y + 1, 14, 1, '#fff6c8'); R(g, x + 1, y + 1, 1, 14, '#fff6c8');
  R(g, x + 1, y + 14, 14, 1, 'rgba(0,0,0,.25)'); R(g, x + 14, y + 1, 1, 14, 'rgba(0,0,0,.25)');
  [[2, 2], [12, 2], [2, 12], [12, 12]].forEach(([a, b]) => R(g, x + a, y + b, 2, 2, '#3a1e08'));
  const sh = Math.sin(t * 5) > 0.6;
  if (label === '?') {
    const q = ['.XXX.', 'X...X', '...X.', '..X..', '.....', '..X..'];
    q.forEach((r, j) => [...r].forEach((k, i) => { if (k === 'X') { R(g, x + 6 + i + 1, y + 4 + j + 1, 1, 1, '#3a1e08'); R(g, x + 6 + i, y + 4 + j, 1, 1, sh ? '#ffffff' : '#fff3d0'); } }));
  } else {
    g.font = '8px "Press Start 2P"'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#3a1e08'; g.fillText(label, x + 9, y + 9.5); g.fillStyle = sh ? '#ffffff' : '#fff3d0'; g.fillText(label, x + 8, y + 8.5);
  }
}
// filter coffee in a steel tumbler on its dabara — the power-up
export function drawCoffee(g, x, y, t) {
  R(g, x, y + 10, 12, 2, '#8d98a6'); R(g, x + 1, y + 9, 10, 1, '#c3ccd8');               // dabara
  R(g, x + 3, y + 1, 6, 9, '#aeb8c6'); R(g, x + 2, y, 8, 2, '#dfe6ee');                  // tumbler
  R(g, x + 3, y + 1, 1, 8, '#ffffff'); R(g, x + 3, y + 1, 6, 1, '#6b3b22');
  const s = Math.floor(t * 6) % 3;                                                         // steam
  for (let i = 0; i < 3; i++) R(g, x + 4 + ((i + s) % 2) * 2, y - 2 - i * 2, 1, 1, 'rgba(255,255,255,.85)');
}
export function drawCone(g, x, y) {
  R(g, x, y + 11, 10, 2, '#2a2a2a'); R(g, x + 1, y + 9, 8, 2, '#ff6a1a');
  R(g, x + 2, y + 6, 6, 3, '#ffffff'); R(g, x + 3, y + 3, 4, 3, '#ff6a1a'); R(g, x + 4, y, 2, 3, '#ff6a1a'); R(g, x + 4, y + 1, 1, 6, 'rgba(255,255,255,.35)');
}
// the Bengaluru auto: green body, yellow hood, three wheels (faces left)
export function drawAuto(g, x, y, t, tint) {
  const bob = Math.floor(t * 10) % 2;
  const Y = tint?.top || '#f5c400', Gr = tint?.body || '#2f8f3f', g2 = tint?.dark || '#1f6a2b';
  y += bob;
  R(g, x + 5, y, 20, 2, Y); R(g, x + 3, y + 2, 25, 3, Y); R(g, x + 3, y + 4, 25, 1, '#c99a00');   // hood
  R(g, x + 4, y + 5, 1, 8, '#1a1a1a'); R(g, x + 26, y + 5, 1, 8, '#1a1a1a');                    // posts
  R(g, x + 1, y + 6, 4, 7, '#bfe3f2'); R(g, x + 1, y + 6, 4, 1, '#1a1a1a'); R(g, x + 2, y + 7, 1, 4, '#ffffff');   // windscreen
  R(g, x + 8, y + 7, 3, 3, '#a66d47'); R(g, x + 8, y + 6, 3, 1, '#231a1e'); R(g, x + 7, y + 10, 5, 3, '#e8e2d6'); // driver in khaki
  R(g, x + 14, y + 6, 10, 6, '#2a1f1a');                                                          // seat
  R(g, x, y + 13, 30, 6, Gr); R(g, x - 1, y + 14, 3, 4, Gr); R(g, x, y + 16, 30, 1, Y); R(g, x, y + 18, 30, 1, g2);
  R(g, x - 1, y + 14, 1, 2, '#fff6b0'); R(g, x + 12, y + 14, 6, 2, '#ffffff');                     // headlight, plate
  for (const wx of [x + 4, x + 24]) { R(g, wx - 3, y + 18, 7, 5, '#1a1a1a'); R(g, wx - 1, y + 19, 3, 3, '#7a7a7a'); R(g, wx, y + 20, 1, 1, bob ? '#cccccc' : '#555555'); }
}
// a calm Bengaluru cow with painted horns
export function drawCow(g, x, y, t) {
  const sw = Math.floor(t * 3) % 2;
  R(g, x + 5, y + 5, 19, 8, '#efe6d8'); R(g, x + 8, y + 3, 6, 3, '#efe6d8'); R(g, x + 9, y + 2, 4, 1, '#e0d4c0');
  R(g, x + 5, y + 11, 19, 2, '#d9cdb9'); R(g, x + 14, y + 6, 5, 3, '#d9cdb9');
  R(g, x, y + 4, 7, 6, '#efe6d8'); R(g, x, y + 8, 3, 2, '#c7a99a'); R(g, x + 1, y + 6, 1, 1, '#1a1114');
  R(g, x + 1, y + 2, 1, 2, '#e24a3a'); R(g, x + 5, y + 2, 1, 2, '#2f7bd6');                      // painted horns
  R(g, x + 6, y + 9, 2, 4, '#d9cdb9');
  for (const lx of [6, 9, 18, 21]) R(g, x + lx, y + 13, 2, 5, '#d9cdb9');
  for (const lx of [6, 9, 18, 21]) R(g, x + lx, y + 17, 2, 1, '#3a2a22');
  R(g, x + 24, y + 5 + sw, 1, 6, '#d9cdb9'); R(g, x + 24 + sw, y + 11, 2, 2, '#3a2a22');
  R(g, x + 11, y + 8, 3, 2, '#d24a2a'); R(g, x + 12, y + 10, 1, 1, '#f5c400');                  // a garland
}
// a "bug" — the kind every editor has met (red, with a little ! on its back)
export function drawBug(g, x, y, t, squash = 0) {
  if (squash) { R(g, x, y + 6, 12, 2, '#a3202a'); R(g, x + 2, y + 5, 8, 1, '#d6343f'); return; }
  const l = Math.floor(t * 8) % 2;
  R(g, x + 2, y + 1, 8, 6, '#d6343f'); R(g, x + 1, y + 2, 10, 4, '#d6343f'); R(g, x + 5, y + 1, 1, 6, '#7a1218');
  R(g, x + 3, y + 2, 2, 1, '#ff9aa0'); R(g, x + 10, y + 2, 2, 3, '#2a1114'); R(g, x + 11, y + 3, 1, 1, '#ffffff');
  for (let i = 0; i < 3; i++) R(g, x + 2 + i * 3 + (l ? 1 : 0), y + 7, 1, 1, '#2a1114');
}
