// =====================================================================
//  The training hall — Skills & Tools as a slicing arena.
//  Glossy tool tokens are tossed up in arcs; swipe (or flick the mouse)
//  to cut them. Each cut splits the token along the blade, sprays its
//  colour, stains the wall, and opens that tool's card. Combos for fast
//  hands; a ghost blade shows the move to anyone who hasn't tried yet.
// =====================================================================
import { TOOLS } from '../config.js';
import { sfx, sound, unlock } from '../core/sfx.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const rnd = (a, b) => a + Math.random() * (b - a);

export function initArena(root) {
  const cv = root.querySelector('#ar-canvas'), g = cv.getContext('2d');
  const wall = document.createElement('canvas'), wg = wall.getContext('2d');
  const card = root.querySelector('#ar-card'), tray = root.querySelector('#ar-tray');
  const hint = root.querySelector('#ar-hint'), countEl = root.querySelector('#ar-count'), bestEl = root.querySelector('#ar-best');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ALL = [...TOOLS.craft.map((t) => ({ ...t, set: 'craft' })), ...TOOLS.ai.map((t) => ({ ...t, set: 'ai' }))];
  let W = 0, H = 0, D = 1, S = 1;               // S: scale relative to an 800px-tall arena

  function size() {
    const r = cv.getBoundingClientRect();
    D = Math.min(devicePixelRatio || 1, 2); W = r.width; H = r.height; S = clamp(H / 800, 0.6, 1.2) * (W < 700 ? 0.86 : 1);
    for (const c of [cv, wall]) { c.width = Math.round(W * D); c.height = Math.round(H * D); }
    g.setTransform(D, 0, 0, D, 0, 0); wg.setTransform(D, 0, 0, D, 0, 0);
  }

  // ---------------------------------------------------------------- token art (pre-rendered once per tool)
  const SP = 220;
  function squircle(c, x, y, s, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + s, y, x + s, y + s, r); c.arcTo(x + s, y + s, x, y + s, r); c.arcTo(x, y + s, x, y, r); c.arcTo(x, y, x + s, y, r); c.closePath(); }
  function art(t, icon) {
    const c = document.createElement('canvas'); c.width = c.height = SP; const x = c.getContext('2d');
    const p = 18, s = SP - p * 2, r = s * 0.27;
    // body
    squircle(x, p, p, s, r);
    const bg = x.createLinearGradient(0, p, 0, p + s); bg.addColorStop(0, mix(t.bg, '#ffffff', 0.16)); bg.addColorStop(1, t.bg);
    x.fillStyle = bg; x.fill();
    // inner keyline
    squircle(x, p + 10, p + 10, s - 20, r * 0.8); x.lineWidth = 4; x.strokeStyle = t.fg; x.globalAlpha = 0.85; x.stroke(); x.globalAlpha = 1;
    // the mark
    if (icon) {
      const ic = document.createElement('canvas'); ic.width = ic.height = SP; const ix = ic.getContext('2d');
      const is = s * 0.46; ix.drawImage(icon, (SP - is) / 2, (SP - is) / 2, is, is);
      ix.globalCompositeOperation = 'source-in'; ix.fillStyle = t.fg; ix.fillRect(0, 0, SP, SP);
      x.shadowColor = t.fg; x.shadowBlur = 18; x.drawImage(ic, 0, 0); x.shadowBlur = 0;
    } else {
      const mark = t.m || t.n.slice(0, 2);
      const fs = mark.length > 2 ? s * 0.27 : s * 0.36;
      x.font = `700 ${fs}px Unbounded, system-ui, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillStyle = t.fg; x.shadowColor = t.fg; x.shadowBlur = 16; x.fillText(mark, SP / 2, SP / 2 + fs * 0.04); x.shadowBlur = 0;
    }
    // gloss + rim
    x.save(); squircle(x, p, p, s, r); x.clip();
    const gl = x.createLinearGradient(0, p, 0, p + s * 0.55); gl.addColorStop(0, 'rgba(255,255,255,.26)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gl; x.fillRect(p, p, s, s * 0.55);
    x.restore();
    squircle(x, p + 1, p + 1, s - 2, r); x.lineWidth = 2; x.strokeStyle = 'rgba(255,255,255,.22)'; x.stroke();
    return c;
  }
  function mix(a, b, k) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const ch = (sh) => Math.round(((pa >> sh) & 255) * (1 - k) + ((pb >> sh) & 255) * k);
    return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
  }
  ALL.forEach((t) => {
    t.spr = art(t, null);
    if (t.icon) { const im = new Image(); im.onload = () => { t.spr = art(t, im); }; im.src = t.icon; }
  });
  document.fonts?.ready.then(() => ALL.forEach((t) => { if (!t.icon) t.spr = art(t, null); }));

  // ---------------------------------------------------------------- the card + the collection tray
  const got = new Set();
  tray.innerHTML = ALL.map((t, i) => `<button type="button" data-i="${i}" style="--c:${t.fg}" aria-label="Toss ${t.n}"><i></i><span>${t.n}</span></button>`).join('') + '<b class="ar-got" id="ar-got"></b>';
  const chips = [...tray.querySelectorAll('button')], gotEl = tray.querySelector('#ar-got');
  chips.forEach((b) => b.addEventListener('click', () => { unlock(); toss(ALL[+b.dataset.i], true); }));
  const updGot = () => { gotEl.textContent = `${got.size} / ${ALL.length} in the kit`; };
  updGot();
  function showCard(t) {
    card.style.setProperty('--c', t.fg);
    card.querySelector('[data-k=set]').textContent = t.set === 'craft' ? 'Craft' : 'AI workshop';
    card.querySelector('[data-k=name]').textContent = t.n;
    card.querySelector('[data-k=say]').textContent = t.say;
    card.querySelector('[data-k=lv]').innerHTML = Array.from({ length: 5 }, (_, k) => `<i class="${k < t.lv ? 'on' : ''}"></i>`).join('') + `<em>${['', 'Learning', 'Working', 'Solid', 'Advanced', 'Mastery'][t.lv]}</em>`;
    card.querySelector('[data-k=use]').innerHTML = t.use.map((u) => `<li>${u}</li>`).join('');
    card.classList.remove('pop'); void card.offsetWidth; card.classList.add('pop', 'on');
  }

  // ---------------------------------------------------------------- the world
  let pool = ALL, filter = 'all';
  root.querySelectorAll('.ar-tabs button').forEach((b) => b.addEventListener('click', () => {
    filter = b.dataset.set; pool = filter === 'all' ? ALL : ALL.filter((t) => t.set === filter);
    root.querySelectorAll('.ar-tabs button').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', String(x === b)); });
    chips.forEach((c) => c.classList.toggle('dim', filter !== 'all' && ALL[+c.dataset.i].set !== filter));
    nextWave = 0;
  }));
  const tokens = [], halves = [], drops = [], cuts = [], pops = [];
  const G = () => 1500 * S;
  let deck = [], nextWave = 0.6;
  const draw = () => { if (!deck.length) deck = [...pool].sort(() => Math.random() - 0.5); return deck.pop(); };
  function toss(t, fromTray = false) {
    const r = 68 * S, side = W > 900 ? 0.62 : 1;                       // keep clear of the card on wide screens
    const x = fromTray ? W * side * 0.5 : rnd(W * 0.1, W * side * 0.92);
    const peak = rnd(H * 0.2, H * 0.5);
    const vy = -Math.sqrt(2 * G() * (H + r - peak));
    const tx = W * side * 0.5 + rnd(-W * 0.12, W * 0.12);
    const T = -vy / G();                                              // time to the top
    tokens.push({ t, x, y: H + r, vx: (tx - x) / (T * 1.6), vy, rot: rnd(-0.4, 0.4), vr: rnd(-1.6, 1.6), r, born: now });
  }

  // ---------------------------------------------------------------- the blade
  const trail = [];
  let down = false, lastUser = -99, lastWhoosh = 0, ghost = null;
  const pt = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  cv.addEventListener('pointerdown', (e) => { down = true; unlock(); lastUser = now; const [x, y] = pt(e); trail.length = 0; trail.push({ x, y, t: now }); hint.classList.add('gone'); });
  addEventListener('pointerup', () => { down = false; });
  cv.addEventListener('pointerleave', () => { if (!down) trail.length = 0; });
  cv.addEventListener('pointermove', (e) => {
    const [x, y] = pt(e), p = trail[trail.length - 1];
    const sp = p ? Math.hypot(x - p.x, y - p.y) / Math.max(0.001, now - p.t) : 0;
    // mouse: a fast flick cuts even without a click; touch/pen: drag
    if (down || (e.pointerType === 'mouse' && sp > 900)) {
      lastUser = now; hint.classList.add('gone');
      trail.push({ x, y, t: now });
      if (sp > 1400 && now - lastWhoosh > 0.22) { sfx.whoosh(clamp(sp / 3000, 0.4, 1)); lastWhoosh = now; }
      if (p) cutAlong(p.x, p.y, x, y);
    } else if (p && now - p.t > 0.05) trail.length = 0;
    if (!down && e.pointerType === 'mouse' && !trail.length) trail.push({ x, y, t: now, idle: true });
  });

  function cutAlong(x0, y0, x1, y1) {
    const dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy; if (L2 < 4) return;
    for (const k of tokens) {
      if (k.dead) continue;
      const u = clamp(((k.x - x0) * dx + (k.y - y0) * dy) / L2), cx = x0 + dx * u, cy = y0 + dy * u;
      if (Math.hypot(k.x - cx, k.y - cy) < k.r * 0.86) slice(k, Math.atan2(dy, dx));
    }
  }

  let combo = [], sliced = 0, best = 0, shake = 0;
  function slice(k, ang) {
    k.dead = true;
    const nx = -Math.sin(ang), ny = Math.cos(ang), push = 230 * S;
    for (const s of [-1, 1]) halves.push({ t: k.t, x: k.x + nx * s * 3, y: k.y + ny * s * 3, vx: k.vx + nx * s * push + Math.cos(ang) * 90 * S, vy: k.vy * 0.4 + ny * s * push - 120 * S, rot: k.rot, vr: k.vr + s * rnd(3, 6), cl: ang - k.rot, side: s, r: k.r, age: 0 });
    for (let i = 0; i < 26; i++) {
      const a = ang + Math.PI / 2 * (Math.random() < 0.5 ? 1 : -1) + rnd(-0.9, 0.9), v = rnd(180, 620) * S;
      drops.push({ x: k.x, y: k.y, vx: Math.cos(a) * v + k.vx * 0.3, vy: Math.sin(a) * v, r: rnd(1.5, 4.5) * S, c: Math.random() < 0.75 ? k.t.fg : '#ffffff', age: 0, life: rnd(0.5, 1.1) });
    }
    stain(k.x, k.y, k.t.fg, ang);
    cuts.push({ x: k.x, y: k.y, ang, r: k.r, age: 0 });
    sfx.slice(); sfx.splat();
    navigator.vibrate?.(12);
    shake = 0.14;
    sliced++; countEl.textContent = String(sliced).padStart(2, '0');
    combo = combo.filter((c) => now - c < 0.55); combo.push(now);
    if (combo.length >= 2) {
      pops.push({ text: `Combo ×${combo.length}`, big: true, x: clamp(k.x, 140, W - 140), y: Math.max(H * 0.34, k.y - k.r * 1.8), age: 0, c: '#ffd27a' });
      sfx.combo(combo.length);
      if (combo.length > best) { best = combo.length; bestEl.textContent = `×${best}`; }
    }
    pops.push({ text: k.t.n, x: clamp(k.x, 90, W - 90), y: Math.max(H * 0.3, k.y - k.r * 0.4), age: 0, c: k.t.fg });
    if (!got.has(k.t.n)) { got.add(k.t.n); chips.find((c) => ALL[+c.dataset.i] === k.t)?.classList.add('got'); updGot(); }
    showCard(k.t);
  }

  // colour stains on the wall that fade slowly
  function stain(x, y, c, ang) {
    // a thin ink splash along the cut, with flecks thrown off to the sides
    wg.save(); wg.fillStyle = c; wg.strokeStyle = c; wg.lineCap = 'round';
    wg.globalAlpha = 0.1; wg.lineWidth = 3 * S;
    wg.beginPath(); wg.moveTo(x - Math.cos(ang) * 90 * S, y - Math.sin(ang) * 90 * S); wg.lineTo(x + Math.cos(ang) * 90 * S, y + Math.sin(ang) * 90 * S); wg.stroke();
    for (let i = 0; i < 16; i++) {
      const a = ang + Math.PI / 2 * (i % 2 ? 1 : -1) + rnd(-0.8, 0.8), d = rnd(20, 120) * S;
      wg.globalAlpha = rnd(0.08, 0.2); wg.beginPath(); wg.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, rnd(1, 3.6) * S, 0, 7); wg.fill();
    }
    wg.restore();
  }

  // ---------------------------------------------------------------- drawing
  function drawToken(spr, x, y, r, rot, cl = null, side = 0) {
    const s = r * 2 * (SP / (SP - 36));
    g.save(); g.translate(x, y); g.rotate(rot);
    if (cl != null) {                // keep one side of the cut, which turns with the half
      g.rotate(cl); g.beginPath(); g.rect(-s, side < 0 ? -s : 0, s * 2, s); g.clip(); g.rotate(-cl);
    }
    g.drawImage(spr, -s / 2, -s / 2, s, s);
    g.restore();
  }
  function shadow(x, y, r) {
    g.save(); g.globalAlpha = 0.35; g.fillStyle = '#000';
    g.beginPath(); g.ellipse(x + r * 0.15, y + r * 1.05, r * 0.8, r * 0.18, 0, 0, 7); g.fill(); g.restore();
  }
  function drawTrail() {
    const live = trail.filter((p) => now - p.t < 0.13 && !p.idle);
    trail.splice(0, trail.length - Math.max(live.length, 1));
    if (live.length < 2) return;
    g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.lineJoin = 'round';
    for (const [w, c, a] of [[22, '#ff9a3c', 0.18], [10, '#ffd08a', 0.45], [3.5, '#ffffff', 1]]) {
      for (let i = 1; i < live.length; i++) {
        const f = i / (live.length - 1);
        g.globalAlpha = a * f; g.strokeStyle = c; g.lineWidth = w * S * (0.25 + 0.75 * f);
        g.beginPath(); g.moveTo(live[i - 1].x, live[i - 1].y); g.lineTo(live[i].x, live[i].y); g.stroke();
      }
    }
    g.restore();
  }

  // ---------------------------------------------------------------- the loop
  let now = 0, last = performance.now(), visible = false, raf = 0, wallFade = 0;
  function frame(ms) {
    raf = visible ? requestAnimationFrame(frame) : 0;
    const dt = Math.min(0.033, (ms - last) / 1000); last = ms; now += dt;
    // waves
    nextWave -= dt;
    if (nextWave <= 0 && !reduce) {
      const n = W < 700 ? (Math.random() < 0.7 ? 1 : 2) : (Math.random() < 0.45 ? 1 : Math.random() < 0.7 ? 2 : 3);
      for (let i = 0; i < n; i++) setTimeout(() => toss(draw()), i * 140);
      nextWave = rnd(1.1, 1.6) + (n - 1) * 0.3;
    }
    // ghost blade: show the move to anyone who hasn't swiped yet
    if (now - lastUser > 5 && !ghost) {
      const k = tokens.find((q) => !q.dead && q.vy > -120 && q.vy < 140 && q.y < H * 0.7);
      if (k) { const a = rnd(-0.5, 0.5) + (Math.random() < 0.5 ? 0 : Math.PI); ghost = { k, a, u: 0 }; }
    }
    if (ghost) {
      ghost.u += dt / 0.16;
      const { k, a } = ghost, L = k.r * 3.2, u = Math.min(1, ghost.u);
      const x = k.x - Math.cos(a) * L / 2 + Math.cos(a) * L * u, y = k.y - Math.sin(a) * L / 2 + Math.sin(a) * L * u;
      const p = trail[trail.length - 1];
      trail.push({ x, y, t: now }); if (p && !p.idle) cutAlong(p.x, p.y, x, y);
      if (ghost.u >= 1.4) { ghost = null; lastUser = now - 2.2; }
    }
    // physics
    const gv = G();
    for (const k of tokens) { k.vy += gv * dt; k.x += k.vx * dt; k.y += k.vy * dt; k.rot += k.vr * dt; }
    for (const h of halves) { h.vy += gv * dt; h.x += h.vx * dt; h.y += h.vy * dt; h.rot += h.vr * dt; h.age += dt; }
    for (const d of drops) { d.vy += gv * 0.8 * dt; d.vx *= 1 - dt * 1.2; d.x += d.vx * dt; d.y += d.vy * dt; d.age += dt; }
    for (const c of cuts) c.age += dt;
    for (const p of pops) { p.age += dt; p.y -= 40 * dt * S; }
    prune(tokens, (k) => k.dead || k.y > H + k.r * 2 + 40 && k.vy > 0);
    prune(halves, (h) => h.y > H + h.r * 2 || h.age > 2.2);
    prune(drops, (d) => d.age > d.life);
    prune(cuts, (c) => c.age > 0.22);
    prune(pops, (p) => p.age > (p.big ? 1.1 : 0.9));
    // render
    g.setTransform(D, 0, 0, D, 0, 0); g.clearRect(0, 0, W, H);
    if (shake > 0) { shake -= dt; g.translate(rnd(-1, 1) * 6 * S * shake / 0.14, rnd(-1, 1) * 6 * S * shake / 0.14); }
    wallFade += dt; if (wallFade > 0.1) { wallFade = 0; wg.save(); wg.setTransform(1, 0, 0, 1, 0, 0); wg.globalCompositeOperation = 'destination-out'; wg.globalAlpha = 0.018; wg.fillRect(0, 0, wall.width, wall.height); wg.restore(); }
    g.drawImage(wall, 0, 0, W, H);
    for (const k of tokens) shadow(k.x, k.y, k.r);
    for (const k of tokens) drawToken(k.t.spr, k.x, k.y, k.r, k.rot);
    for (const h of halves) { g.globalAlpha = clamp(1.6 - h.age); drawToken(h.t.spr, h.x, h.y, h.r, h.rot, h.cl, h.side); g.globalAlpha = 1; }
    g.save(); g.globalCompositeOperation = 'lighter';
    g.lineCap = 'round';
    for (const d of drops) {   // droplets as bright motion streaks
      const f = 1 - d.age / d.life;
      g.globalAlpha = f; g.strokeStyle = d.c; g.lineWidth = d.r * (0.5 + 0.5 * f);
      g.beginPath(); g.moveTo(d.x - d.vx * 0.035, d.y - d.vy * 0.035); g.lineTo(d.x, d.y); g.stroke();
    }
    for (const c of cuts) {
      const f = 1 - c.age / 0.22, L = c.r * 2.6 * (0.6 + 0.4 * (1 - f));
      g.save(); g.translate(c.x, c.y); g.rotate(c.ang);
      g.globalAlpha = f; g.fillStyle = '#fff';
      g.beginPath(); g.ellipse(0, 0, L, 3.2 * S * f + 0.6, 0, 0, 7); g.fill();
      g.globalAlpha = f * 0.5; g.fillStyle = '#ffd08a'; g.beginPath(); g.ellipse(0, 0, L * 1.1, 12 * S * f, 0, 0, 7); g.fill();
      g.restore();
    }
    g.restore();
    drawTrail();
    for (const p of pops) {
      const f = p.age / (p.big ? 1.1 : 0.9), a = f < 0.15 ? f / 0.15 : 1 - Math.max(0, (f - 0.6) / 0.4);
      const sc = p.big ? 1 + 0.25 * Math.max(0, 1 - f * 5) : 1;
      g.save(); g.translate(p.x, p.y); g.scale(sc, sc); g.globalAlpha = a; g.textAlign = 'center';
      g.font = p.big ? `800 ${Math.round(30 * S)}px Unbounded, sans-serif` : `600 ${Math.round(13 * S)}px Unbounded, sans-serif`;
      g.lineWidth = p.big ? 6 : 4; g.strokeStyle = 'rgba(5,7,11,.85)'; g.strokeText(p.big ? p.text.toUpperCase() : p.text.toUpperCase(), 0, 0);
      g.fillStyle = p.c; g.fillText(p.text.toUpperCase(), 0, 0); g.restore();
    }
  }
  const prune = (arr, f) => { for (let i = arr.length - 1; i >= 0; i--) if (f(arr[i])) arr.splice(i, 1); };

  size(); addEventListener('resize', size);
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
  }, { threshold: 0.1 }).observe(cv);
  // sound switch
  const sb = root.querySelector('#ar-sound');
  sound.on((m) => { sb.classList.toggle('off', m); sb.querySelector('span').textContent = m ? 'Sound off' : 'Sound on'; });
  sb.addEventListener('click', () => sound.toggle());
  showCard(ALL[0]); card.classList.remove('on');
}
