import * as THREE from 'three';
import { createForeground } from './foreground.js';

// =====================================================================
//  The story: one continuous camera, driven by scroll.
//  arrive (top-down drop onto the infinite timeline) → the throne and
//  "Master of Timeline" → up the Tree of Timelines → a 180° turn over the
//  crown → the bridge splits into three paths → three name boards.
// =====================================================================
export const PAGES = [
  { href: 'about.html', label: 'The Timekeeper' },
  { href: 'works.html', label: 'My Works' },
  { href: 'lab.html', label: 'The Lab' },
];
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const win = (p, a, b, c, d) => Math.min(seg(p, a, b), 1 - seg(p, c, d));
const smooth = (x) => x * x * (3 - 2 * x);

// camera keys along the scroll (three.js coords; deck at y = 1.5)
const KEYS = [
  { p: 0.0, pos: V(0, 46, 70), tgt: V(0, 1.5, 38), fov: 50 },       // arrival: a top-down aerial over the timeline field
  { p: 0.07, pos: V(0, 24, 48), tgt: V(0, 3.5, 14), fov: 44 },      // dropping toward the bridge
  { p: 0.12, pos: V(0, 6.4, 31), tgt: V(0, 6.6, 0), fov: 40 },      // low over the glass, gliding toward the throne
  { p: 0.18, pos: V(0, 6.6, 19.5), tgt: V(0, 8.4, 0), fov: 38 },    // the throne — Master of Timeline
  { p: 0.28, pos: V(6.5, 7.2, 10.5), tgt: V(0, 7.5, -2), fov: 38 },  // beside the throne, the tree behind
  { p: 0.39, pos: V(8.2, 12.5, 2.5), tgt: V(0, 14.5, -6.5), fov: 42 },// rising along the trunk
  { p: 0.5, pos: V(5.5, 22.5, -0.5), tgt: V(0, 24, -7), fov: 46 },   // into the crown
  { p: 0.6, pos: V(1.5, 33, -5.5), tgt: V(0, 29, -16), fov: 50 },    // over the top
  { p: 0.71, pos: V(-2.5, 28, -15), tgt: V(0, 10, -42), fov: 48 },   // turning 180°
  { p: 0.84, pos: V(0, 22, -12), tgt: V(0, 3, -58), fov: 50 },       // the road forks in three
  { p: 1.0, pos: V(0, 7.4, -22.5), tgt: V(0, 7.9, -46), fov: 50 },   // the signpost at the fork
];

export function createStory({ uni, lenis, tier, gsap, tunnel, final, bloom, toon, onLanded }) {
  const cam = uni.camera;
  const posC = new THREE.CatmullRomCurve3(KEYS.map((k) => k.pos), false, 'centripetal');
  const tgtC = new THREE.CatmullRomCurve3(KEYS.map((k) => k.tgt), false, 'centripetal');
  const n = KEYS.length - 1;
  const pos = new THREE.Vector3(), tgt = new THREE.Vector3(), tmp = new THREE.Vector3();
  function sample(p, outP, outT) {
    let i = 0; while (i < n - 1 && p > KEYS[i + 1].p) i++;
    const a = KEYS[i], b = KEYS[i + 1];
    const k = smooth(clamp((p - a.p) / (b.p - a.p)));
    const u = (i + k) / n;
    posC.getPoint(u, outP); tgtC.getPoint(u, outT);
    return a.fov + (b.fov - a.fov) * k;
  }

  // ---------------- DOM
  const $ = (s) => document.querySelector(s);
  const arrive = $('#arrive'), mot = $('#mot'), treeLine = $('#tree-line'), quote = $('#split-quote');
  const boards = [...document.querySelectorAll('.board')];
  const railFill = $('#rail-fill'), railLinks = [...document.querySelectorAll('.beats-rail a')];
  const beats = ['b-arrive', 'b-throne', 'b-tree', 'b-paths'].map((id) => document.getElementById(id));
  const beatP = [0, 0.18, 0.39, 0.84];
  railLinks.forEach((a, k) => a.addEventListener('click', () => scrollToP(beatP[k])));
  boards.forEach((b) => {
    b.addEventListener('click', () => portal(+b.dataset.portal));
    b.addEventListener('pointerenter', () => uni.sign.setHover(+b.dataset.portal));
    b.addEventListener('focus', () => uni.sign.setHover(+b.dataset.portal));
    b.addEventListener('pointerleave', () => uni.sign.setHover(-1));
    b.addEventListener('blur', () => uni.sign.setHover(-1));
  });

  // board anchors on each path (left, mid, right)
  const anchor = (curve, s, h) => { const L = curve.getLength(); const p = curve.getPointAt(Math.min(1, s / L)); p.y += h; return p; };
  const P = uni.paths;
  const throneTop = new THREE.Vector3(0, uni.throne.top + 0.9, 0);

  const max = () => Math.max(1, document.documentElement.scrollHeight - innerHeight);
  function scrollToP(p, d = 2.4) { lenis.scrollTo(p * max(), { duration: d, easing: (t) => 1 - Math.pow(1 - t, 4) }); }

  // ---------------- state
  let sp = 0;                     // smoothed scroll progress
  const fly = { k: 1, active: false };
  const landFrom = { pos: V(0, 260, 430), tgt: V(0, 1.5, 418) }, landMid = { pos: V(0, 120, 190), tgt: V(0, 1.5, 120) };
  const trans = { active: false, k: 0, path: null };
  const B = uni.bridge.uniforms;
  let lockY = false;

  // ---------------- the shift: real world ⇄ drawn world
  // Hold a gem beside the throne for 3 s → glitch, the camera spins around the throne on a light
  // rail, rises up the tree while a wipe redraws the world, then glides down to the signpost.
  const TU = toon.uniforms;
  const fg = createForeground();
  const world = { drawn: false, busy: false };
  const shift = { active: false, k: 0, from: null, tfrom: null, a0: 0 };
  const BLOOM_REAL = bloom.strength, BLOOM_DRAWN = 0.3;
  const C = V(0, 6.2, 0);                                   // the throne
  function applyWorld(k) { uni.setStyle(k); bloom.strength = BLOOM_REAL + (BLOOM_DRAWN - BLOOM_REAL) * k; }
  if (sessionStorage.getItem('kaju-style') === 'drawn') {
    world.drawn = true; TU.uA.value = TU.uB.value = 1; TU.uWipe.value = 1; applyWorld(1);
  }
  // the light rail: two fast loops around the throne, then a spiral up the trunk into the crown
  const railPts = [];
  for (let i = 0; i <= 120; i++) {
    const u = i / 120, a = u * Math.PI * 2 * 3.0;
    const r = u < 0.55 ? 8.6 - u * 2 : 7.5 - (u - 0.55) * 6;
    const y = u < 0.55 ? 3.4 + u * 8 : 7.8 + (u - 0.55) / 0.45 * 26;
    railPts.push(V(Math.sin(a) * r, y, Math.cos(a) * r - (u > 0.55 ? (u - 0.55) * 14 : 0)));
  }
  const railCurve = new THREE.CatmullRomCurve3(railPts);
  const railU = { uHead: { value: 0 }, uAlpha: { value: 0 }, uTime: { value: 0 } };
  const rail = new THREE.Mesh(new THREE.TubeGeometry(railCurve, 600, 0.09, 8, false), new THREE.ShaderMaterial({
    uniforms: railU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform float uHead,uAlpha,uTime; varying vec2 vUv;
      void main(){ float u=vUv.x; float d=uHead-u; if(d<0.0) discard;
        float tail=exp(-d*5.0); float head=exp(-d*120.0); float pulse=0.6+0.4*sin(u*220.0-uTime*30.0);
        vec3 c=mix(vec3(0.35,0.9,1.0), vec3(1.0,0.95,0.8), head)*(tail*pulse*1.6+head*6.0);
        gl_FragColor=vec4(c*uAlpha,1.0); }`,
  }));
  rail.frustumCulled = false; rail.renderOrder = 5; rail.visible = false;
  uni.scene.add(rail);
  // two hold gems, anchored beside the throne's armrests
  const holdAt = [V(-3.9, 4.6, 0.9), V(3.9, 4.6, 0.9)];
  const holds = holdAt.map((_, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'hold ' + (i ? 'hold-r' : 'hold-l');
    b.innerHTML = '<span class="hold-gem"><svg viewBox="0 0 64 64" aria-hidden="true"><circle class="hold-track" cx="32" cy="32" r="28"/><circle class="hold-fill" cx="32" cy="32" r="28"/></svg><i></i></span><span class="hold-txt"><b></b><small>Hold 3 s</small></span>';
    document.body.appendChild(b);
    return b;
  });
  const hold = { on: false, p: 0, last: performance.now() };   // timed by the wall clock, so 3 s is 3 s on any device
  const setHoldText = () => holds.forEach((b) => { b.querySelector('b').textContent = world.drawn ? 'Return to reality' : 'Redraw the world'; b.setAttribute('aria-label', (world.drawn ? 'Hold to return to the real world' : 'Hold to redraw the world') + ' (3 seconds)'); });
  setHoldText();
  holds.forEach((b) => {
    const start = (e) => { if (world.busy) return; e.preventDefault(); hold.on = true; b.classList.add('down'); if (e.pointerId !== undefined) b.setPointerCapture(e.pointerId); if (!toon.enabled) { toon.enabled = true; TU.uA.value = TU.uB.value = world.drawn ? 1 : 0; TU.uWipe.value = 1; } };
    const stop = () => { hold.on = false; b.classList.remove('down'); };
    b.addEventListener('pointerdown', start);
    b.addEventListener('pointerup', stop); b.addEventListener('pointercancel', stop); b.addEventListener('lostpointercapture', stop);
    b.addEventListener('contextmenu', (e) => e.preventDefault());
    b.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) start(e); });
    b.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') stop(); });
  });
  const toggle = document.getElementById('world-toggle');
  const setToggle = () => { if (!toggle) return; toggle.hidden = !(world.drawn || sessionStorage.getItem('kaju-shifted')); toggle.querySelector('span').textContent = world.drawn ? '◐ Real world' : '◑ Drawn world'; };
  if (toggle) { setToggle(); toggle.addEventListener('click', () => wipeTo(!world.drawn, 1.3)); }

  // the wipe that redraws the world (or brings reality back)
  function wipeTo(drawn, dur = 1.5) {
    if (world.busy && !shift.active) return;
    toon.enabled = true;
    TU.uA.value = world.drawn ? 1 : 0; TU.uB.value = drawn ? 1 : 0; TU.uWipe.value = 0;
    const st = { k: world.drawn ? 1 : 0 };
    const tl = gsap.timeline({ onComplete: () => {
      TU.uA.value = TU.uB.value = drawn ? 1 : 0; TU.uWipe.value = 1; TU.uGlitch.value = 0;
      toon.enabled = false;
      world.drawn = drawn; sessionStorage.setItem('kaju-style', drawn ? 'drawn' : 'real'); sessionStorage.setItem('kaju-shifted', '1');
      setHoldText(); setToggle();
    } });
    tl.to(TU.uGlitch, { value: 1, duration: 0.18, ease: 'power2.in' }, 0)
      .to(TU.uGlitch, { value: 0.25, duration: 0.5 }, 0.2)
      .to(TU.uWipe, { value: 1, duration: dur, ease: 'power2.inOut' }, 0.12)
      .to(st, { k: drawn ? 1 : 0, duration: dur, ease: 'power1.inOut', onUpdate: () => applyWorld(st.k) }, 0.12)
      .to(TU.uGlitch, { value: 0, duration: 0.4 }, dur * 0.8);
    return tl;
  }

  function startShift() {
    if (world.busy) return;
    world.busy = true; hold.p = 0; hold.on = false; holds.forEach((b) => b.classList.remove('down'));
    const target = !world.drawn;
    lenis.stop(); uni.setInteractive(false); document.body.classList.add('shifting');
    shift.active = true; shift.k = 0;
    shift.from = cam.position.clone(); shift.tfrom = tgt.clone();
    shift.a0 = Math.atan2(shift.from.x - C.x, shift.from.z - C.z);
    rail.visible = true; railU.uAlpha.value = 1; railU.uHead.value = 0;
    const tl = gsap.timeline({ onComplete: () => {
      shift.active = false; world.busy = false;
      lenis.start(); lenis.scrollTo(max(), { immediate: true, force: true }); sp = 1;
      uni.setInteractive(true); document.body.classList.remove('shifting');
      gsap.to(railU.uAlpha, { value: 0, duration: 1.2, onComplete: () => { rail.visible = false; } });
    } });
    tl.to(shift, { k: 1, duration: 7.2, ease: 'power1.inOut' }, 0)
      .to(B.uSpeed, { value: 40, duration: 1.2, ease: 'power2.in' }, 0)
      .to(B.uSpeed, { value: 2.4, duration: 2.5, ease: 'power2.out' }, 4.4)
      .to(final.uniforms.uCA, { value: 0.008, duration: 0.8 }, 0)
      .to(final.uniforms.uCA, { value: 0.0012, duration: 1.5 }, 3.5)
      .add(() => wipeTo(target, 1.7), 1.15);
  }

  function land(fast) {
    fly.active = true; fly.k = 0;
    B.uSpeed.value = 26;
    const pathsOnly = sessionStorage.getItem('kaju-paths') === '1';
    sessionStorage.removeItem('kaju-paths');
    gsap.to(fly, { k: 1, duration: fast ? 2.2 : 2.6, ease: 'power2.inOut', onComplete: () => {
      fly.active = false; onLanded();
      if (pathsOnly) requestAnimationFrame(() => { lenis.scrollTo(max(), { immediate: true }); sp = 1; });
    } });
    gsap.to(B.uSpeed, { value: 2.4, duration: fast ? 2.6 : 3.0, ease: 'power3.out' });
  }

  const bez = (a, b, c, t, out) => out.set(0, 0, 0).addScaledVector(a, (1 - t) * (1 - t)).addScaledVector(b, 2 * (1 - t) * t).addScaledVector(c, t * t);
  const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  addEventListener('pointermove', (e) => { mouse.x = e.clientX / innerWidth - 0.5; mouse.y = e.clientY / innerHeight - 0.5; }, { passive: true });
  const right = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const projected = new THREE.Vector3();
  const toScreen = (p) => { projected.copy(p).project(cam); return [(projected.x * 0.5 + 0.5) * innerWidth, (-projected.y * 0.5 + 0.5) * innerHeight, projected.z]; };

  function update(t, dt) {
    const y = lenis.scroll;
    const p = clamp(y / max());
    sp += (p - sp) * Math.min(1, dt * 4.2);
    let fov = sample(sp, pos, tgt);
    // landing: from straight above the infinite bridge down to the rest pose
    if (fly.active || fly.k < 1) {
      const k = fly.k;
      const p0 = KEYS[0].pos, t0 = KEYS[0].tgt;
      bez(landFrom.pos, landMid.pos, p0, k, pos); bez(landFrom.tgt, landMid.tgt, t0, k, tgt);
      fov = 46 + (1 - k) * 14;
    }
    // the shift flight: spin around the throne on the rail, rise up the tree, glide down to the signpost
    if (shift.active) {
      const k = shift.k, kA = clamp(k / 0.46), kB = clamp((k - 0.46) / 0.54);
      if (k < 0.46) {
        const e = kA * kA * (3 - 2 * kA);
        const a = shift.a0 + e * Math.PI * 2 * 1.75;
        const r = 10.5 - e * 2.2, yy = shift.from.y + (15 - shift.from.y) * e;
        const helix = V(C.x + Math.sin(a) * r, yy, C.z + Math.cos(a) * r);
        pos.copy(shift.from).lerp(helix, smooth(Math.min(1, kA * 5)));
        tgt.copy(shift.tfrom).lerp(V(0, 7 + e * 6, 0), smooth(Math.min(1, kA * 4)));
        railU.uHead.value = Math.min(0.58, e * 0.58 + 0.06);
      } else {
        if (!shift.up) {
          shift.up = new THREE.CatmullRomCurve3([pos.clone(), V(4, 30, -2), V(1.5, 37, -9), V(0, 24, -18), KEYS[KEYS.length - 1].pos.clone()], false, 'centripetal');
          shift.upT = new THREE.CatmullRomCurve3([tgt.clone(), V(0, 26, -6), V(0, 22, -24), V(0, 8, -40), KEYS[KEYS.length - 1].tgt.clone()], false, 'centripetal');
        }
        const e = kB * kB * (3 - 2 * kB);
        shift.up.getPoint(e, pos); shift.upT.getPoint(e, tgt);
        railU.uHead.value = 0.58 + Math.min(1, kB * 1.6) * 0.42;
      }
      fov = 46 + Math.sin(k * Math.PI) * 18;
      if (k >= 1) { shift.up = null; }
    }
    railU.uTime.value = t;
    // holding a gem charges the shift: a growing glitch and a rush on the timeline
    if (!world.busy) {
      const now = performance.now(), wdt = Math.min(0.25, (now - hold.last) / 1000); hold.last = now;
      hold.p = hold.on ? Math.min(1, hold.p + wdt / 3) : Math.max(0, hold.p - wdt * 1.8);
      if (toon.enabled && TU.uWipe.value >= 1) TU.uGlitch.value = Math.pow(hold.p, 2.2) * 0.55;
      if (hold.p > 0) { B.uSpeed.value = 2.4 + hold.p * hold.p * 30; pos.x += (Math.random() - 0.5) * hold.p * 0.06; pos.y += (Math.random() - 0.5) * hold.p * 0.05; }
      if (hold.p >= 1) startShift();
    }
    // portal flight down a path
    if (trans.active) {
      const c = trans.path, L = c.getLength(), k = trans.k;
      const s0 = 6 + k * 120;
      c.getPointAt(Math.min(0.99, s0 / L), tmp); const a = tmp.clone(); a.y += 3.2 - k * 1.2 + Math.sin(Math.min(1, k * 2.2) * Math.PI) * 9;   // up over the signpost, then down the road
      c.getPointAt(Math.min(1, (s0 + 18) / L), tmp); tmp.y += 2.2;
      pos.lerp(a, smooth(Math.min(1, k * 1.6))); tgt.lerp(tmp, smooth(Math.min(1, k * 1.6)));
      fov += k * 40;
    }
    // portrait screens: open the lens at the fork so all three roads and the signpost fit
    const portrait = clamp((1.2 - cam.aspect) / 0.7);
    fov *= 1 + 0.55 * portrait * seg(sp, 0.78, 0.95);
    // gentle hand-held parallax
    mouse.sx += (mouse.x - mouse.sx) * Math.min(1, dt * 2.5); mouse.sy += (mouse.y - mouse.sy) * Math.min(1, dt * 2.5);
    const dist = pos.distanceTo(tgt);
    right.subVectors(tgt, pos).cross(up).normalize();
    const amp = Math.min(0.9, dist * 0.03) * (trans.active || shift.active ? 0 : 1);
    pos.addScaledVector(right, mouse.sx * amp).addScaledVector(up, -mouse.sy * amp * 0.6);
    pos.y += Math.sin(t * 0.4) * 0.05;
    cam.position.copy(pos); cam.lookAt(tgt);
    if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = fov; cam.updateProjectionMatrix(); }
    dom(sp, t, dt);
  }

  function dom(p, t, dt = 1 / 60) {
    const landed = !fly.active && fly.k >= 1;
    const L = landed && !trans.active && !shift.active ? 1 : 0;
    arrive.style.opacity = (L * (1 - seg(p, 0.01, 0.05))).toFixed(3);
    // Master of Timeline, floating over the throne
    const mv = L * win(p, 0.14, 0.18, 0.25, 0.29);
    const [mx, my] = toScreen(throneTop);
    mot.style.opacity = mv.toFixed(3);
    const ty = Math.max(mot.offsetHeight + innerHeight * 0.07, my - 10);
    mot.style.transform = `translate(${mx.toFixed(1)}px, ${(ty - (1 - mv) * 20).toFixed(1)}px) translate(-50%, -100%)`;
    mot.style.filter = mv < 1 ? `blur(${((1 - mv) * 8).toFixed(1)}px)` : 'none';
    // hold gems beside the throne (same window as the title)
    const hv = L * win(p, 0.15, 0.18, 0.25, 0.29);
    holds.forEach((b, i) => {
      const [x, y, z] = toScreen(holdAt[i]);
      const vis = hv > 0.02 && z < 1;
      b.classList.toggle('on', vis);
      b.style.opacity = hv.toFixed(3);
      b.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;
      b.style.setProperty('--p', hold.p.toFixed(4));
    });
    treeLine.style.opacity = (L * win(p, 0.4, 0.45, 0.53, 0.58)).toFixed(3);
    const qv = L * seg(p, 0.79, 0.88);
    quote.style.opacity = qv.toFixed(3);
    quote.style.filter = qv < 1 ? `blur(${((1 - qv) * 8).toFixed(1)}px)` : 'none';
    // the signpost rises out of the glass; invisible buttons sit over its boards
    const bv = L * seg(p, 0.86, 0.97);
    const sg = uni.sign;
    sg.state.show += ((trans.active ? 1 : bv) - sg.state.show) * Math.min(1, dt * 6);
    sg.update(t, 0);   // apply this frame's scale before measuring the boards
    boards.forEach((b, i) => {
      const on = bv > 0.6 && !trans.active;
      b.classList.toggle('on', on);
      if (!on) return;
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, behind = false;
      for (const c of sg.corners(i)) { const [x, y, z] = toScreen(c); if (z > 1) behind = true; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      if (behind) { b.classList.remove('on'); return; }
      b.style.transform = `translate(${x0.toFixed(1)}px, ${y0.toFixed(1)}px)`;
      b.style.width = `${(x1 - x0).toFixed(1)}px`; b.style.height = `${(y1 - y0).toFixed(1)}px`;
    });
    fg.update(t, dt, L * seg(p, 0.8, 0.94));
    railFill.style.transform = `scaleY(${p.toFixed(4)})`;
    const act = p < 0.12 ? 0 : p < 0.33 ? 1 : p < 0.77 ? 2 : 3;
    railLinks.forEach((a, k) => a.classList.toggle('on', k === act));
  }

  // ---------------- portal transition: race down the path, the timeline rushes, the frame is cut
  function portal(i) {
    if (trans.active) return;
    const page = PAGES[i];
    const go = () => {
      trans.active = true; trans.path = [P.left, P.mid, P.right][i]; trans.k = 0;
      lenis.stop(); uni.setInteractive(false);
      document.body.classList.add('leaving');
      const T = tunnel.uniforms;
      const tl = gsap.timeline();
      tl.to(trans, { k: 1, duration: 2.1, ease: 'power3.in' }, 0)
        .to(B.uSpeed, { value: 90, duration: 1.8, ease: 'power3.in' }, 0)
        .to(final.uniforms.uCA, { value: 0.012, duration: 1.6, ease: 'power2.in' }, 0.3)
        .add(() => { tunnel.enabled = true; T.uOpen.value = 0; T.uIn.value = 0; T.uBlur.value = 0; }, 0.9)
        .to(T.uIn, { value: 1, duration: 1.0, ease: 'power2.in' }, 0.9)
        .to(T.uBlur, { value: 1, duration: 1.0, ease: 'power2.in' }, 0.9);
      if (i === 0) {
        // The Timekeeper: the rushing timeline bends into one curved blade of light and the frame is cut open
        tl.add(() => { const s = document.getElementById('slash-out'); s.classList.remove('go'); void s.offsetWidth; s.classList.add('go'); }, 1.55)
          .add(() => { location.href = page.href + '#slash'; }, 2.35);
        return;
      }
      tl.add(() => { const c = document.getElementById('cut'); document.getElementById('cut-label').textContent = page.label; c.classList.remove('go'); void c.offsetWidth; c.classList.add('go'); }, 1.5)
        .add(() => { location.href = page.href + '#arrive'; }, 2.75);
    };
    // from anywhere: glide to the paths first, then go
    if (sp < 0.86) { scrollToP(1, 1.6); setTimeout(go, 1700); } else go();
  }

  return { land, update, portal, shift: startShift, wipeTo, world, resize() {}, state: { fly, trans, shift, hold }, get sp() { return sp; }, set sp(v) { sp = v; } };
}
