import * as THREE from 'three';

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
  { p: 0.0, pos: V(0, 9.6, 46), tgt: V(0, 7.6, 0), fov: 40 },       // arrival: the whole universe
  { p: 0.13, pos: V(0, 6.6, 19.5), tgt: V(0, 8.4, 0), fov: 38 },      // the throne — Master of Timeline
  { p: 0.24, pos: V(6.5, 7.2, 10.5), tgt: V(0, 7.5, -2), fov: 38 },   // beside the throne, the tree behind
  { p: 0.36, pos: V(8.2, 12.5, 2.5), tgt: V(0, 14.5, -6.5), fov: 42 },// rising along the trunk
  { p: 0.48, pos: V(5.5, 22.5, -0.5), tgt: V(0, 24, -7), fov: 46 },   // into the crown
  { p: 0.59, pos: V(1.5, 33, -5.5), tgt: V(0, 29, -16), fov: 50 },    // over the top
  { p: 0.7, pos: V(-2.5, 28, -15), tgt: V(0, 10, -42), fov: 48 },     // turning 180°
  { p: 0.83, pos: V(0, 22, -12), tgt: V(0, 3, -58), fov: 50 },     // the road forks in three
  { p: 1.0, pos: V(0, 7.4, -22.5), tgt: V(0, 7.9, -46), fov: 50 },  // the signpost at the fork
];

export function createStory({ uni, lenis, tier, gsap, tunnel, final, bloom, onLanded }) {
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
  const beatP = [0, 0.13, 0.36, 0.83];
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
  const landFrom = { pos: V(0, 260, 430), tgt: V(0, 1.5, 418) }, landMid = { pos: V(0, 64, 150), tgt: V(0, 3, 96) };
  const trans = { active: false, k: 0, path: null };
  const B = uni.bridge.uniforms;
  let lockY = false;

  function land(fast) {
    fly.active = true; fly.k = 0;
    B.uSpeed.value = 26;
    const pathsOnly = sessionStorage.getItem('kaju-paths') === '1';
    sessionStorage.removeItem('kaju-paths');
    gsap.to(fly, { k: 1, duration: fast ? 3.0 : 5.2, ease: 'power2.inOut', onComplete: () => {
      fly.active = false; onLanded();
      if (pathsOnly) requestAnimationFrame(() => { lenis.scrollTo(max(), { immediate: true }); sp = 1; });
    } });
    gsap.to(B.uSpeed, { value: 2.4, duration: fast ? 3.2 : 5.6, ease: 'power3.out' });
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
      fov = 40 + (1 - k) * 18;
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
    const amp = Math.min(0.9, dist * 0.03) * (trans.active ? 0 : 1);
    pos.addScaledVector(right, mouse.sx * amp).addScaledVector(up, -mouse.sy * amp * 0.6);
    pos.y += Math.sin(t * 0.4) * 0.05;
    cam.position.copy(pos); cam.lookAt(tgt);
    if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = fov; cam.updateProjectionMatrix(); }
    dom(sp, t, dt);
  }

  function dom(p, t, dt = 1 / 60) {
    const landed = !fly.active && fly.k >= 1;
    const L = landed && !trans.active ? 1 : 0;
    arrive.style.opacity = (L * (1 - seg(p, 0.01, 0.05))).toFixed(3);
    // Master of Timeline, floating over the throne
    const mv = L * win(p, 0.06, 0.12, 0.19, 0.24);
    const [mx, my] = toScreen(throneTop);
    mot.style.opacity = mv.toFixed(3);
    const ty = Math.max(mot.offsetHeight + innerHeight * 0.07, my - 10);
    mot.style.transform = `translate(${mx.toFixed(1)}px, ${(ty - (1 - mv) * 20).toFixed(1)}px) translate(-50%, -100%)`;
    mot.style.filter = mv < 1 ? `blur(${((1 - mv) * 8).toFixed(1)}px)` : 'none';
    treeLine.style.opacity = (L * win(p, 0.37, 0.43, 0.52, 0.57)).toFixed(3);
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
    railFill.style.transform = `scaleY(${p.toFixed(4)})`;
    const act = p < 0.08 ? 0 : p < 0.3 ? 1 : p < 0.76 ? 2 : 3;
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
        .to(T.uBlur, { value: 1, duration: 1.0, ease: 'power2.in' }, 0.9)
        .add(() => { const c = document.getElementById('cut'); document.getElementById('cut-label').textContent = page.label; c.classList.remove('go'); void c.offsetWidth; c.classList.add('go'); }, 1.5)
        .add(() => { location.href = page.href + '#arrive'; }, 2.75);
    };
    // from anywhere: glide to the paths first, then go
    if (sp < 0.86) { scrollToP(1, 1.6); setTimeout(go, 1700); } else go();
  }

  return { land, update, portal, resize() {}, state: { fly, trans }, get sp() { return sp; }, set sp(v) { sp = v; } };
}
