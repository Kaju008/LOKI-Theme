// =====================================================================
//  MY JOURNEY — a small platformer through Kaju's career, set in Bengaluru.
//  Start in front of Vidhana Soudha; each company is a ?-block. Hit it from
//  below, drink the filter coffee, level up: Kaju grows, gains gear, and the
//  city changes style. After Angel One, the last block asks for your team.
// =====================================================================
import { buildKaju, KAJU, drawCoin, drawBrick, drawQBlock, drawCoffee, drawCone, drawAuto, drawCow, drawBug } from './sprites.js';
import { TILE, VH, GY, THEMES, buildLevel, paintSky, paintFar, paintCandles, paintMetro, paintMid, paintGround, paintFx, paintSign } from './world.js';
import { JOURNEY, SITE } from '../../config.js';
import { sfx, music, sound, unlock } from '../../core/sfx.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const GRAV = 1150, JV = 420, MAXV = 118, ACC = 900, FRIC = 1100;
const SCALE = [1, 1.25, 1.25, 1.5, 1.5, 1.75, 2];

export function initJourney(root) {
  const $ = (s) => root.querySelector(s);
  const screen = $('.jy-screen'), cv = $('#jy-canvas'), g = cv.getContext('2d');
  const low = document.createElement('canvas'), lg = low.getContext('2d');
  const lowB = document.createElement('canvas'), lbg = lowB.getContext('2d');
  const hud = { level: $('#jy-level'), world: $('#jy-world'), coins: $('#jy-coins'), bar: $('#jy-progress i'), you: $('#jy-progress b') };
  const bubble = $('#jy-bubble'), banner = $('#jy-banner'), modal = document.getElementById('jy-modal');
  const stops = JOURNEY.stops;
  const L = buildLevel(stops);
  let VW = 384, Rz = 3;

  // progress bar: one notch per company
  $('#jy-progress').insertAdjacentHTML('beforeend', L.chapters.filter((c) => c.block).map((c) => `<u style="left:${(c.block.x / L.w * 100).toFixed(2)}%;--c:${c.final ? '#ffcf3a' : stops[c.stop]?.color}"></u>`).join(''));

  function size() {
    const r = screen.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2);
    VW = clamp(Math.round(VH * r.width / r.height), 200, 430);
    Rz = Math.max(1, Math.round(r.height * d / VH));
    cv.width = VW * Rz; cv.height = VH * Rz;
    low.width = lowB.width = VW; low.height = lowB.height = VH;
    g.imageSmoothingEnabled = false;
  }

  // ---------------------------------------------------------------- state
  const P = { x: 3 * TILE, y: GY - 19, w: 10, h: 19, vx: 0, vy: 0, face: 1, ground: true, coy: 0, buf: 0, inv: 0, cut: false, level: 0, safeX: 3 * TILE, t: 0 };
  let sprites = buildKaju(0), scale = SCALE[0];
  const setLevel = (lv) => { P.level = lv; sprites = buildKaju(lv); setScale(SCALE[Math.min(lv, SCALE.length - 1)]); };
  function setScale(s) {
    const q = Math.round(Rz * s) / Rz;           // whole device pixels per art pixel
    const bottom = P.y + P.h; scale = q; P.w = Math.round(10 * q); P.h = Math.round(19 * q); P.y = bottom - P.h;
  }
  let state = 'title', cam = 0, coins = 0, theme = 'namma', wipe = null, time = 0, stateT = 0;
  const items = [], enemies = [], parts = [], pops = [], spills = [];
  const input = { left: false, right: false, up: false, down: false, jumpEdge: false };

  // ---------------------------------------------------------------- input: keyboard + on-screen pad
  let inView = false;
  const KEYS = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', Space: 'up', ArrowDown: 'down', KeyS: 'down' };
  addEventListener('keydown', (e) => {
    if (!inView || modal.classList.contains('on')) return;
    if (e.target.closest && e.target.closest('input,textarea')) return;
    const k = KEYS[e.code];
    if (k) {
      if (state !== 'title' || k === 'up') e.preventDefault();
      if (!input[k] && k === 'up') input.jumpEdge = true;
      input[k] = true; unlock();
      if (state === 'title' && k !== 'down') startGame();
    }
    if (e.code === 'Enter') { e.preventDefault(); press('start'); }
    if (e.code === 'KeyM') sound.toggle();
  });
  addEventListener('keyup', (e) => { const k = KEYS[e.code]; if (k) input[k] = false; });
  root.querySelectorAll('[data-k]').forEach((b) => {
    const k = b.dataset.k;
    const on = (e) => { e.preventDefault(); unlock(); try { b.setPointerCapture(e.pointerId); } catch (_) { /* synthetic or already released */ } b.classList.add('on'); if (k === 'start' || k === 'sound') return press(k); if (!input[k] && k === 'up') input.jumpEdge = true; input[k] = true; if (state === 'title') startGame(); };
    const off = () => { b.classList.remove('on'); if (input[k] !== undefined) input[k] = false; };
    b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('lostpointercapture', off);
    b.addEventListener('contextmenu', (e) => e.preventDefault());
  });
  screen.addEventListener('pointerdown', () => { unlock(); if (state === 'title') startGame(); else if (state === 'levelup' && stateT > 1.2) endLevelUp(); });
  function press(k) {
    if (k === 'sound') return sound.toggle();
    if (state === 'title') startGame();
    else if (state === 'levelup' && stateT > 1.2) endLevelUp();
  }
  sound.on((m) => { root.querySelectorAll('[data-k=sound]').forEach((b) => b.classList.toggle('off', m)); if (m) music.stop(); else if (inView && (state === 'play' || state === 'levelup')) music.start(); });

  // ---------------------------------------------------------------- speech bubble
  let say = null;
  function talk(lines, hold = 2.6) { say = { lines: [].concat(lines), i: 0, ch: 0, t: 0, hold }; bubble.classList.add('on'); }
  function updBubble(dt) {
    if (!say) return;
    const line = say.lines[say.i]; say.t += dt;
    if (say.ch < line.length) { const n = Math.floor(say.t * 38); if (n > say.ch) { say.ch = Math.min(line.length, n); if (say.ch % 2) sfx.blip(); } }
    else if (say.t > line.length / 38 + say.hold) { if (say.i < say.lines.length - 1) { say.i++; say.ch = 0; say.t = 0; } else if (state !== 'title') { say = null; bubble.classList.remove('on'); return; } }
    bubble.querySelector('span').textContent = say.lines[say.i].slice(0, say.ch);
  }

  // ---------------------------------------------------------------- flow
  function startGame() {
    if (state !== 'title') return;
    state = 'play'; stateT = 0; unlock(); sfx.start();
    if (!sound.muted) setTimeout(() => music.start(), 450);
    root.classList.add('playing');
    talk(["Let's go!"], 0.9);
  }
  function hitStop(i) {
    const c = L.chapters.find((q) => q.stop === i);
    const s = L.solids.find((q) => q.stop === i); if (!s || s.used) return;
    s.used = true; s.bump = 0.2; sfx.appear();
    items.push({ kind: 'coffee', stop: i, x: s.x + 2, y: s.y - 2, by: s.y - 14, t: 0, color: stops[i].color });
    burst(s.x + 8, s.y, stops[i].color, 10);
    c.popped = true;
  }
  function levelUp(i) {
    state = 'levelup'; stateT = 0;
    music.duck(3.5); sfx.levelUp();
    const s = stops[i];
    banner.style.setProperty('--c', s.color);
    banner.querySelector('[data-b=lv]').textContent = `LV ${i + 1}`;
    banner.querySelector('[data-b=co]').textContent = s.company;
    banner.querySelector('[data-b=yr]').textContent = s.years;
    banner.querySelector('[data-b=ti]').textContent = s.title;
    banner.querySelector('[data-b=no]').textContent = s.note;
    banner.classList.remove('on'); void banner.offsetWidth;
    levelFx = { from: P.level, to: i + 1, t: 0 };
    for (let k = 0; k < 40; k++) parts.push({ x: P.x + P.w / 2, y: P.y + P.h / 2, vx: (Math.random() - 0.5) * 260, vy: -Math.random() * 260, c: [s.color, '#ffd23f', '#ffffff'][k % 3], life: 1.2, age: 0, g: 400, sz: 2 });
  }
  let levelFx = null;
  function endLevelUp() {
    if (state !== 'levelup') return;
    banner.classList.remove('on');
    const lv = levelFx.to; levelFx = null; setLevel(lv);
    const to = stops[lv - 1].theme;
    wipe = { from: theme, to, k: 0 }; theme = to;
    hud.world.textContent = `1-${lv + 1} ${stops[lv - 1].short}`;
    hud.level.innerHTML = `<b>LV ${lv}</b> ${stops[lv - 1].title}`;
    state = 'play'; stateT = 0;
    talk([['Level up!', 'New gear unlocked.', 'Growing!', 'Getting stronger.', 'Almost there.', 'The Timekeeper.'][Math.min(lv - 1, 5)]], 1);
  }
  function finale() {
    state = 'end'; stateT = 0;
    music.stop(); sfx.win();
    for (let k = 0; k < 90; k++) parts.push({ x: P.x + P.w / 2, y: P.y - 20, vx: (Math.random() - 0.5) * 420, vy: -Math.random() * 380 - 60, c: ['#ffd23f', '#ff6b6b', '#4dc3ff', '#5fd68a', '#ff7ad1', '#ffffff'][k % 6], life: 2.2, age: 0, g: 380, sz: 2 });
    talk(['Your turn!'], 3);
    setTimeout(openModal, 1100);
  }

  // ---------------------------------------------------------------- the "next level" form
  function openModal() {
    modal.classList.add('on'); document.body.classList.add('jy-lock');
    setTimeout(() => modal.querySelector('input')?.focus({ preventScroll: true }), 350);
  }
  function closeModal(go) {
    modal.classList.remove('on'); document.body.classList.remove('jy-lock');
    state = 'free';
    if (go) setTimeout(() => document.getElementById('say-hi')?.scrollIntoView({ behavior: 'smooth' }), 400);
  }
  modal.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => closeModal(b.dataset.close === 'contact')));
  modal.querySelector('#jy-copy').addEventListener('click', async (e) => {
    const b = e.currentTarget, t = b.querySelector('span');
    try { await navigator.clipboard.writeText(SITE.email); t.textContent = 'Email copied ✓'; } catch { t.textContent = SITE.email; }
    setTimeout(() => (t.textContent = 'Copy my email'), 2200);
  });
  const form = modal.querySelector('form'), msg = modal.querySelector('.jy-msg');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form));
    if (d.website) return;
    if (!d.name.trim() || !d.message.trim()) { msg.textContent = 'Add your name and a message, then send.'; msg.className = 'jy-msg err'; return; }
    if (d.email && !/^\S+@\S+\.\S+$/.test(d.email)) { msg.textContent = 'That email doesn’t look right.'; msg.className = 'jy-msg err'; return; }
    const btn = form.querySelector('button[type=submit]'); btn.disabled = true; btn.querySelector('span').textContent = 'Sending…';
    try {
      const body = new URLSearchParams({ name: d.name, email: d.email || '', phone: '', message: `[${d.org || 'No organisation given'}] ${d.message}`, page: location.href + ' (journey game)', ua: navigator.userAgent.slice(0, 180) });
      if (SITE.formEndpoint) await fetch(SITE.formEndpoint, { method: 'POST', mode: 'no-cors', body });
      else location.href = `mailto:${SITE.email}?subject=${encodeURIComponent('Next level — from ' + d.name + (d.org ? ', ' + d.org : ''))}&body=${encodeURIComponent(d.message)}`;
      modal.classList.add('sent'); sfx.coin();
      setTimeout(() => { closeModal(true); modal.classList.remove('sent'); form.reset(); }, 2600);
    } catch { msg.textContent = 'Could not send — please copy my email instead.'; msg.className = 'jy-msg err'; }
    btn.disabled = false; btn.querySelector('span').textContent = 'Send to Kaju';
  });

  // ---------------------------------------------------------------- physics
  const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  function solidsNear(x0, x1) { return L.solids.filter((s) => !s.gone && s.x < x1 && s.x + s.w > x0); }
  function step(dt) {
    // run / jump
    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const crouch = input.down && P.ground;
    if (dir && !crouch) { P.vx += dir * ACC * dt; P.vx = clamp(P.vx, -MAXV, MAXV); P.face = dir; }
    else { const f = FRIC * dt * (crouch ? 1.4 : 1); P.vx = Math.abs(P.vx) <= f ? 0 : P.vx - Math.sign(P.vx) * f; }
    if (input.jumpEdge) { P.buf = 0.12; input.jumpEdge = false; }
    P.buf -= dt; P.coy -= dt; P.inv -= dt;
    if (P.buf > 0 && P.coy > 0) { P.vy = -JV; P.ground = false; P.coy = 0; P.buf = 0; P.cut = false; sfx.jump(); dust(P.x + P.w / 2, P.y + P.h, 4); }
    if (!input.up && P.vy < -140 && !P.cut) { P.vy *= 0.5; P.cut = true; }
    P.vy = Math.min(560, P.vy + GRAV * dt);
    // x
    P.x += P.vx * dt;
    for (const s of solidsNear(P.x - 4, P.x + P.w + 4)) if (overlap(P, s)) { if (P.vx > 0) P.x = s.x - P.w; else if (P.vx < 0) P.x = s.x + s.w; P.vx = 0; }
    // y
    const wasGround = P.ground; P.ground = false;
    P.y += P.vy * dt;
    const near = solidsNear(P.x, P.x + P.w);
    let head = null, headOv = 0;
    for (const s of near) {
      if (!overlap(P, s)) continue;
      if (P.vy > 0) {
        P.y = s.y - P.h; P.vy = 0; P.ground = true; P.coy = 0.09;
        if (!wasGround) { dust(P.x + P.w / 2, P.y + P.h, 3); if (s.kind === 'cow' && time - lastMoo > 2) { sfx.moo(); lastMoo = time; pop('MOO!', s.x + 10, s.y - 6, '#ffffff'); } }
      } else if (P.vy < 0) {
        const ov = Math.min(P.x + P.w, s.x + s.w) - Math.max(P.x, s.x);
        if (ov > headOv) { head = s; headOv = ov; }
      }
    }
    if (head) { P.y = head.y + head.h; P.vy = 30; bonk(head); }
    if (P.ground) { P.coy = 0.09; if (!L.pits.some((p) => P.x + P.w > p.x0 - 20 && P.x < p.x1 + 20)) P.safeX = P.x; }
    // fell in a pothole
    if (P.y > VH + 20) { sfx.splash(); pop('SPLASH!', P.x, GY - 30, '#9fd3ff'); P.x = P.safeX; P.y = GY - P.h - 30; P.vy = 0; P.vx = 0; P.inv = 1.4; }
    P.x = clamp(P.x, 0, L.w - P.w);
  }
  let lastMoo = -9;
  function bonk(s) {
    s.bump = 0.16;
    if (s.kind === 'big' && !s.used) { s.used = true; sfx.brick(); burst(s.x + 16, s.y + 16, '#ffd23f', 24); finale(); return; }
    if (s.kind === 'q' && s.stop != null) { hitStop(s.stop); return; }
    if (s.kind === 'q' && !s.used) { s.used = true; sfx.coin(); coins++; items.push({ kind: 'popcoin', x: s.x + 4, y: s.y - 8, t: 0 }); return; }
    if (s.kind === 'brick' && P.level >= 1) {
      s.gone = true; sfx.brick();
      for (let k = 0; k < 4; k++) parts.push({ x: s.x + 4 + (k % 2) * 8, y: s.y + 4 + (k >> 1) * 8, vx: (k % 2 ? 1 : -1) * (60 + Math.random() * 40), vy: -180 - (k >> 1) * 80, c: '#c25a2c', life: 1.1, age: 0, g: 900, sz: 4 });
      return;
    }
    sfx.bump();
  }
  function hurt(msg) {
    if (P.inv > 0) return;
    P.inv = 1.4; P.vx = -P.face * 150; P.vy = -230; P.ground = false; sfx.hurt();
    pop(msg, P.x, P.y - 8, '#ff6b6b');
    const lose = Math.min(3, coins); coins -= lose;
    for (let k = 0; k < lose; k++) spills.push({ x: P.x + P.w / 2, y: P.y, vx: (k - 1) * 70, vy: -220, t: 0 });
  }
  function dust(x, y, n) { for (let k = 0; k < n; k++) parts.push({ x, y: y - 1, vx: (Math.random() - 0.5) * 60, vy: -Math.random() * 30, c: 'rgba(255,255,255,.7)', life: 0.35, age: 0, g: 0, sz: 1 }); }
  function burst(x, y, c, n) { for (let k = 0; k < n; k++) { const a = Math.random() * 6.28, v = 60 + Math.random() * 140; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, c: k % 3 ? c : '#ffffff', life: 0.7, age: 0, g: 300, sz: 2 }); } }
  function pop(text, x, y, c) { pops.push({ text, x, y, c, t: 0 }); }

  function updateWorld(dt) {
    // spawns
    for (const s of L.spawns) {
      if (s.done || P.x < s.x - VW * 0.6) continue;
      s.done = true;
      if (s.type === 'auto') { enemies.push({ type: 'auto', x: cam + VW + 10, y: GY - 23, w: 30, h: 22, vx: -72, t: 0 }); sfx.honk(); }
      else enemies.push({ type: 'bug', x: s.at, y: GY - 8, w: 12, h: 8, vx: -26, home: s.at, t: 0, dead: 0 });
    }
    for (const e of enemies) {
      e.t += dt;
      if (e.type === 'auto') { e.x += e.vx * dt; if (Math.random() < dt * 0.25) sfx.honk(); }
      else if (!e.dead) { e.x += e.vx * dt; if (Math.abs(e.x - e.home) > 36) e.vx *= -1; }
      else e.dead += dt;
      if (e.dead || state !== 'play') continue;
      const box = e.type === 'auto' ? { x: e.x + 1, y: e.y + 3, w: 28, h: 19 } : e;
      if (overlap(P, box)) {
        if (P.vy > 40 && P.y + P.h - box.y < 10) {
          P.vy = -300; P.cut = true; sfx.stomp();
          if (e.type === 'auto') { sfx.honk(); pop('PEEP PEEP!', e.x, e.y - 10, '#ffd23f'); }
          else { e.dead = 0.01; coins++; sfx.coin(); pop('BUG FIXED!', e.x - 8, e.y - 12, '#5fd68a'); }
        } else hurt(e.type === 'auto' ? 'WATCH THE AUTO!' : 'A BUG!');
      }
    }
    for (let i = enemies.length - 1; i >= 0; i--) { const e = enemies[i]; if (e.x < cam - 80 || e.dead > 0.6) enemies.splice(i, 1); }
    for (const c of L.cones) if (overlap(P, c)) hurt('OOPS, A CONE!');
    // coins
    for (const c of L.coins) if (!c.got && overlap(P, { x: c.x, y: c.y, w: 8, h: 8 })) { c.got = true; coins++; sfx.coin(); burst(c.x + 4, c.y + 4, '#ffd23f', 4); }
    for (let i = spills.length - 1; i >= 0; i--) {
      const c = spills[i]; c.t += dt; c.vy += GRAV * 0.7 * dt; c.x += c.vx * dt; c.y += c.vy * dt;
      if (c.y > GY - 8) { c.y = GY - 8; c.vy *= -0.45; c.vx *= 0.7; }
      if (c.t > 0.6 && overlap(P, { x: c.x, y: c.y, w: 8, h: 8 })) { coins++; sfx.coin(); spills.splice(i, 1); }
      else if (c.t > 6) spills.splice(i, 1);
    }
    // power-ups
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i]; it.t += dt;
      if (it.kind === 'popcoin') { it.y -= 60 * dt; if (it.t > 0.5) items.splice(i, 1); continue; }
      if (it.t < 0.45) { it.y = it.by + 14 * (1 - it.t / 0.45); continue; }         // rising out of the block
      const tx = P.x + P.w / 2 - 6, ty = P.y + P.h / 2 - 6;                         // then it floats to Kaju, faster than he runs
      const dx = tx - it.x, dy = ty - it.y, d = Math.hypot(dx, dy) || 1, sp = Math.min(260, 50 + (it.t - 0.45) * 260);
      it.x += dx / d * Math.min(d, sp * dt); it.y += dy / d * Math.min(d, sp * dt) + Math.sin(it.t * 6) * 0.3;
      if (overlap(P, { x: it.x, y: it.y, w: 12, h: 12 }) && state === 'play') { items.splice(i, 1); sfx.coin(); levelUp(it.stop); }
    }
    // missed a company block? it pops anyway, and the coffee comes to you
    for (const c of L.chapters) if (c.block && !c.final && !c.popped && P.x > c.block.x + 6 * TILE) { hitStop(c.stop); pop('YOUR FILTER COFFEE!', P.x - 30, P.y - 20, '#ffd23f'); }
    // the final plaza turns golden
    const fin = L.chapters[L.chapters.length - 1];
    if (P.x > fin.x0 && theme !== 'next' && state === 'play' && P.level >= stops.length) { wipe = { from: theme, to: 'next', k: 0 }; theme = 'next'; hud.world.textContent = '1-8 NEXT LEVEL'; talk(['One more block…'], 1.6); }
    for (const s of L.solids) if (s.bump > 0) s.bump -= dt;
  }

  // ---------------------------------------------------------------- rendering
  function drawWorld(ctx, th, c) {
    const T = THEMES[th];
    paintSky(ctx, T, VW, time);
    if (T.fx === 'matrix') paintCandles(ctx, c, VW, time);
    paintFar(ctx, T, c, VW);
    paintMetro(ctx, T, c, VW, time);
    paintMid(ctx, T, c, VW, L, time);
    paintFx(ctx, T, VW, time);
    for (const s of L.signs) if (s.x - c > -100 && s.x - c < VW + 20) paintSign(ctx, T, s, c, time);
    paintGround(ctx, T, c, VW, L, time);
  }
  const bigTmp = document.createElement('canvas'); bigTmp.width = bigTmp.height = 16;
  function drawThings(ctx, c) {
    const autoTint = theme === 'press' ? { top: '#e8e4da', body: '#3a3a3a', dark: '#1a1a1a' } : null;
    for (const b of L.boxes) if (b.x - c > -40 && b.x - c < VW + 10) drawCow(ctx, b.x - c, b.y, time);
    for (const s of L.solids) {
      if (s.gone || s.x - c > VW + 16 || s.x + s.w - c < -16) continue;
      const by = s.y - (s.bump > 0 ? Math.sin((0.16 - s.bump) / 0.16 * Math.PI) * 4 : 0);
      if (s.kind === 'brick') drawBrick(ctx, s.x - c, by);
      else if (s.kind === 'q') drawQBlock(ctx, s.x - c, by, time, s.color || '#ffc23d', s.used);
      else if (s.kind === 'big') {
        const bx = bigTmp.getContext('2d'); bx.clearRect(0, 0, 16, 16); drawQBlock(bx, 0, 0, time, '#ffcf3a', s.used);
        ctx.imageSmoothingEnabled = false; ctx.drawImage(bigTmp, Math.round(s.x - c), Math.round(by), 32, 32);
        if (!s.used) { ctx.font = '8px "Press Start 2P"'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffffff'; ctx.fillText('YOU?', s.x - c + 16, by - 6 + Math.sin(time * 3) * 2); }
      }
    }
    for (const k of L.cones) if (k.x - c > -12 && k.x - c < VW) drawCone(ctx, k.x - c, k.y);
    for (const k of L.coins) if (!k.got && k.x - c > -10 && k.x - c < VW) drawCoin(ctx, k.x - c, k.y + Math.sin(time * 3 + k.x) * 1.2, time + k.x * 0.01);
    for (const k of spills) drawCoin(ctx, k.x - c, k.y, time * 2);
    for (const it of items) { if (it.kind === 'coffee') { ctx.fillStyle = 'rgba(255,240,200,.35)'; ctx.beginPath(); ctx.arc(it.x - c + 6, it.y + 6, 10 + Math.sin(time * 8) * 1.5, 0, 7); ctx.fill(); drawCoffee(ctx, it.x - c, it.y, time); } else drawCoin(ctx, it.x - c, it.y, time * 3); }
    for (const e of enemies) { if (e.type === 'auto') drawAuto(ctx, e.x - c, e.y, e.t, autoTint); else drawBug(ctx, e.x - c, e.y, e.t, e.dead ? 1 : 0); }
    for (const p of parts) { ctx.globalAlpha = Math.max(0, 1 - p.age / p.life); ctx.fillStyle = p.c; ctx.fillRect(Math.round(p.x - c), Math.round(p.y), p.sz, p.sz); }
    ctx.globalAlpha = 1;
  }
  function render() {
    const c = Math.round(cam);
    if (wipe) {
      drawWorld(lbg, wipe.from, c); drawThings(lbg, c);
      drawWorld(lg, wipe.to, c); drawThings(lg, c);
      // the new style sweeps in from the left with a bright edge
      const ex = Math.round(wipe.k * (VW + 40));
      lbg.save(); lbg.beginPath(); lbg.moveTo(ex, 0); lbg.lineTo(ex - 30, VH); lbg.lineTo(-10, VH); lbg.lineTo(-10, 0); lbg.closePath(); lbg.clip(); lbg.drawImage(low, 0, 0); lbg.restore();
      lbg.fillStyle = '#ffffff'; lbg.beginPath(); lbg.moveTo(ex, 0); lbg.lineTo(ex + 4, 0); lbg.lineTo(ex - 26, VH); lbg.lineTo(ex - 30, VH); lbg.fill();
      g.drawImage(lowB, 0, 0, VW * Rz, VH * Rz);
    } else {
      drawWorld(lg, theme, c); drawThings(lg, c);
      g.drawImage(low, 0, 0, VW * Rz, VH * Rz);
    }
    // Kaju (drawn at full resolution so he can grow in whole device pixels)
    let s = scale, lvl = P.level;
    if (levelFx && levelFx.t < 1.1) { const flick = Math.floor(levelFx.t / 0.09) % 2; const sc = SCALE[Math.min(levelFx.to, 6)]; if (flick) s = Math.round(Rz * sc) / Rz; }
    const pose = poseNow(), set = sprites[pose], fr = set[P.face > 0 ? 'r' : 'l'][Math.floor(P.t * (pose === 'run' ? 12 : pose === 'wave' ? 4 : 2.2)) % set.r.length];
    const dw = KAJU.sw * s * Rz, dh = KAJU.sh * s * Rz;
    const cx = Math.round((P.x + P.w / 2 - c) * Rz), by = Math.round((P.y + P.h) * Rz);
    const blink = P.inv > 0 && Math.floor(P.inv * 14) % 2;
    // a soft shadow
    g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(cx - 5 * s * Rz, Math.round(GY * Rz) - Rz, 10 * s * Rz, Rz);
    if (lvl >= 6 && state !== 'title') { g.save(); g.globalAlpha = 0.28 + Math.sin(time * 6) * 0.08; g.fillStyle = '#ffd27a'; g.beginPath(); g.ellipse(cx, by - dh * 0.45, dw * 0.5, dh * 0.55, 0, 0, 7); g.fill(); g.restore(); }
    if (!blink) g.drawImage(fr, cx - Math.round(dw / 2) + (P.face > 0 ? Math.round(-1 * s * Rz) : Math.round(1 * s * Rz)), by - Math.round((KAJU.oy + KAJU.h) * s * Rz), dw, dh);
    if (levelFx) { const k = levelFx.t; g.strokeStyle = `rgba(255,255,255,${Math.max(0, 1 - k)})`; g.lineWidth = Rz; g.beginPath(); g.arc(cx, by - dh * 0.4, k * 60 * Rz, 0, 7); g.stroke(); }
    // floating text
    g.textAlign = 'center'; g.font = `${8 * Rz}px "Press Start 2P"`;
    for (const p of pops) {
      const a = p.t < 0.8 ? 1 : 1 - (p.t - 0.8) / 0.4, x = Math.round((p.x - c + 10) * Rz), y = Math.round((p.y - p.t * 18) * Rz);
      g.globalAlpha = Math.max(0, a); g.fillStyle = '#140c10'; g.fillText(p.text, x + Rz, y + Rz); g.fillStyle = p.c; g.fillText(p.text, x, y);
    }
    g.globalAlpha = 1;
    // the speech bubble follows his head
    if (say) {
      const r = screen.getBoundingClientRect(), k = r.width / VW;
      bubble.style.transform = `translate(${((P.x + P.w / 2 - c) * k).toFixed(1)}px, ${((P.y - 6) * (r.height / VH)).toFixed(1)}px) translate(-50%, -100%)`;
    }
  }
  function poseNow() {
    if (state === 'title') return stateT > 0.8 ? 'wave' : 'idle';
    if (state === 'end' || state === 'free') return P.ground ? (Math.abs(P.vx) > 10 ? 'run' : 'cheer') : 'jump';
    if (levelFx) return 'cheer';
    if (P.inv > 1.1) return 'ouch';
    if (!P.ground) return 'jump';
    if (input.down) return 'crouch';
    if (Math.abs(P.vx) > 8) return 'run';
    return 'idle';
  }

  // ---------------------------------------------------------------- loop
  let last = performance.now(), acc = 0, raf = 0;
  function frame(ms) {
    raf = inView ? requestAnimationFrame(frame) : 0;
    const dt = Math.min(0.05, (ms - last) / 1000); last = ms;
    time += dt; stateT += dt; P.t += dt;
    if (state === 'play' || state === 'end' || state === 'free') {
      acc += dt;
      while (acc >= 1 / 120) { step(1 / 120); acc -= 1 / 120; }
      if (state !== 'end') updateWorld(dt);
    } else if (state === 'title') {
      // standing in front of Vidhana Soudha, waving hello
      if (stateT > 0.8 && !say) talk(JOURNEY.hello, 60);
    } else if (state === 'levelup') {
      if (levelFx) levelFx.t += dt;
      if (stateT > 0.95 && !banner.classList.contains('on')) banner.classList.add('on');
      if (stateT > 4.2) endLevelUp();
    }
    for (const p of parts) { p.age += dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    for (let i = parts.length - 1; i >= 0; i--) if (parts[i].age > parts[i].life) parts.splice(i, 1);
    for (const p of pops) p.t += dt;
    for (let i = pops.length - 1; i >= 0; i--) if (pops[i].t > 1.2) pops.splice(i, 1);
    if (wipe) { wipe.k += dt / 0.75; if (wipe.k >= 1) wipe = null; }
    // camera
    const target = state === 'title' ? 0 : P.x + P.w / 2 - VW * 0.42 + P.face * 18;
    cam += (clamp(target, 0, L.w - VW) - cam) * Math.min(1, dt * 4.5);
    updBubble(dt);
    // HUD
    hud.coins.textContent = String(coins).padStart(2, '0');
    const pr = clamp(P.x / (L.w - P.w), 0, 1);
    hud.bar.style.transform = `scaleX(${pr.toFixed(4)})`; hud.you.style.left = `${(pr * 100).toFixed(2)}%`;
    render();
  }

  size();
  addEventListener('resize', () => { size(); setScale(SCALE[Math.min(P.level, 6)]); });
  setLevel(0);
  hud.world.textContent = '1-1 NAMMA BENGALURU';
  hud.level.innerHTML = '<b>LV 0</b> Fresher with a laptop';
  new IntersectionObserver(([e]) => {
    inView = e.isIntersecting && e.intersectionRatio > 0.35;
    if (inView && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); if (!sound.muted && (state === 'play' || state === 'levelup')) music.start(); }
    if (!inView) { music.stop(); Object.keys(input).forEach((k) => (input[k] = false)); }
  }, { threshold: [0, 0.35, 0.6] }).observe(screen);
  document.fonts?.load('8px "Press Start 2P"');
  return { get state() { return state; } };
}
