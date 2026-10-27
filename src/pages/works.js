// My Works — a slowly turning sphere of frames.
// Drag empty space to spin it (with inertia). Grab a frame to pull it off the sphere;
// drop it on another frame to swap them, or let go and it springs home. Click to play.
import '../pages.js';
import * as THREE from 'three';
import { WORKS } from '../config.js';
import { $, thumb, CAT_COL, buildPlayer } from './common.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = matchMedia('(pointer: coarse)').matches || innerWidth < 700;
const player = buildPlayer();
const canvas = $('#sphere');
const tip = $('#orb-tip');

let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); }
catch (e) { location.replace('works-grid.html'); throw e; }
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
const R = 5;
const sphere = new THREE.Group();
scene.add(sphere);

// ---------------------------------------------------------------- textures (one per video)
const loader = new THREE.TextureLoader(); loader.setCrossOrigin('anonymous');
function fallbackCard(w) {
  const [c1, c2] = CAT_COL[w.cat] || ['#3dffb5', '#9d80ff'];
  const c = document.createElement('canvas'); c.width = 360; c.height = 560;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 360, 560); gr.addColorStop(0, c1); gr.addColorStop(1, c2);
  g.fillStyle = '#05070d'; g.fillRect(0, 0, 360, 560);
  g.globalAlpha = 0.45; g.fillStyle = gr; g.fillRect(0, 0, 360, 560); g.globalAlpha = 1;
  g.fillStyle = '#fff'; g.font = '600 30px Cinzel, serif'; g.textAlign = 'center';
  const words = w.t.toUpperCase().split(' '); let line = '', y = 250;
  for (const wd of words) { if (g.measureText(line + wd).width > 300) { g.fillText(line.trim(), 180, y); line = ''; y += 40; } line += wd + ' '; }
  g.fillText(line.trim(), 180, y);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const texCache = new Map();
function texFor(w) {
  if (texCache.has(w.id)) return texCache.get(w.id);
  const holder = { tex: fallbackCard(w), aspect: 360 / 560, users: [] };
  texCache.set(w.id, holder);
  loader.load(thumb(w), (t) => {
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    holder.tex = t; holder.aspect = t.image.width / t.image.height;
    holder.users.forEach((m) => { m.uniforms.map.value = t; m.uniforms.uImgAspect.value = holder.aspect; });
  }, undefined, () => { /* keep the designed fallback card */ });
  return holder;
}

// ---------------------------------------------------------------- the frames
const PW = 1.85, PH = 2.75;                       // panel size (portrait, like the reels)
const VERT = /* glsl */ `
  varying vec2 vUv; varying vec3 vN; varying vec3 vV;
  void main(){
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normalize(position));
    vV = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }`;
const FRAG = /* glsl */ `
  uniform sampler2D map; uniform float uImgAspect, uPanelAspect, uHover, uLift, uIntro;
  uniform vec3 uTint;
  varying vec2 vUv; varying vec3 vN; varying vec3 vV;
  float rbox(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
  void main(){
    vec2 p = (vUv - 0.5) * vec2(uPanelAspect, 1.0);
    float d = rbox(p, vec2(uPanelAspect, 1.0) * 0.5, 0.035);
    if (d > 0.0) discard;
    // cover-fit the thumbnail into the frame
    vec2 uv = vUv;
    if (!gl_FrontFacing) uv.x = 1.0 - uv.x;
    float k = uPanelAspect / uImgAspect;
    if (k < 1.0) uv.x = 0.5 + (uv.x - 0.5) * k; else uv.y = 0.5 + (uv.y - 0.5) / k;
    vec3 col = texture2D(map, uv).rgb;
    // depth: frames facing you are lit, frames curving away and the far side fall into shadow
    float f = dot(normalize(vN), normalize(vV));
    float lit = gl_FrontFacing ? mix(0.28, 1.0, smoothstep(-0.05, 0.75, f)) : 0.16;
    lit = mix(lit, 1.0, uLift);
    col *= lit * (1.0 + uHover * 0.18);
    // a soft inner vignette and a hairline border that lights up on hover
    float vig = smoothstep(-0.18, -0.0, d);
    col *= 1.0 - vig * 0.35;
    float edge = smoothstep(-0.012, -0.002, d);
    col = mix(col, uTint, edge * (0.12 + uHover * 0.7));
    gl_FragColor = vec4(col * uIntro, 1.0);
  }`;

function panelGeometry() {
  const g = new THREE.PlaneGeometry(PW, PH, 14, 20);
  const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.set(p.getX(i), p.getY(i), R).normalize().multiplyScalar(R); p.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals(); g.computeBoundingSphere();
  return g;
}
const GEO = panelGeometry();
const COUNT = mobile ? 28 : 36;
const Z = new THREE.Vector3(0, 0, 1);
const slots = [];
const golden = Math.PI * (3 - Math.sqrt(5));
let seed = 5; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
for (let i = 0; i < COUNT; i++) {
  const y = 1 - ((i + 0.5) / COUNT) * 2, r = Math.sqrt(1 - y * y), th = i * golden;
  const d = new THREE.Vector3(Math.cos(th) * r, y * 0.96, Math.sin(th) * r).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(Z, d);
  q.multiply(new THREE.Quaternion().setFromAxisAngle(Z, (rnd() - 0.5) * 0.5));   // a little tilt each, like scattered prints
  slots.push(q);
}
const panels = [];
for (let i = 0; i < COUNT; i++) {
  const wi = (i * 7) % WORKS.length;          // spread repeats around the sphere
  const w = WORKS[wi];
  const h = texFor(w);
  const [c1] = CAT_COL[w.cat] || ['#3dffb5'];
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, side: THREE.DoubleSide,
    uniforms: { map: { value: h.tex }, uImgAspect: { value: h.aspect }, uPanelAspect: { value: PW / PH }, uHover: { value: 0 }, uLift: { value: 0 }, uIntro: { value: 0 }, uTint: { value: new THREE.Color(c1) } },
  });
  h.users.push(mat);
  const mesh = new THREE.Mesh(GEO, mat);
  mesh.quaternion.copy(slots[i]);
  mesh.userData.i = i;
  sphere.add(mesh);
  panels.push({ mesh, mat, wi, slot: i, hover: 0, lift: 0, off: new THREE.Vector3(), vel: new THREE.Vector3(), intro: 0, delay: rnd() * 0.9, pulse: 0 });
}

// ---------------------------------------------------------------- layout
function resize() {
  const W = innerWidth, H = innerHeight;
  renderer.setSize(W, H, false);
  camera.aspect = W / H;
  // fit the sphere: a little bigger than the screen's short side, like looking into it
  const vf = THREE.MathUtils.degToRad(camera.fov) / 2;
  const hf = Math.atan(Math.tan(vf) * camera.aspect);
  const fit = Math.min(vf, hf);
  camera.position.set(0, 0, (R * (W < 700 ? 0.82 : 0.9)) / Math.sin(fit));   // the sphere spills past the edges, like looking into it
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
}
resize(); addEventListener('resize', resize);

// ---------------------------------------------------------------- interaction
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(), hit = new THREE.Vector3();
const spin = new THREE.Vector3(0, reduce ? 0.03 : 0.085, 0);          // angular velocity (world axes), rad/s
const AUTO = spin.clone();
let mode = null, down = null, hovered = null, dragPanel = null;
const setNdc = (e) => ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
function pick() {
  ray.setFromCamera(ndc, camera);
  const h = ray.intersectObjects(panels.map((p) => p.mesh), false)[0];
  return h ? panels[h.object.userData.i] : null;
}
const worldCenter = (p, out) => { const d = new THREE.Vector3(0, 0, R).applyQuaternion(p.mesh.quaternion).add(p.mesh.position); return sphere.localToWorld(out.copy(d)); };
const screenOf = (v) => { const s = v.clone().project(camera); return [(s.x * 0.5 + 0.5) * innerWidth, (-s.y * 0.5 + 0.5) * innerHeight, s.z]; };

canvas.addEventListener('pointerdown', (e) => {
  setNdc(e);
  canvas.setPointerCapture(e.pointerId);
  const p = pick();
  down = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, t: performance.now(), p, moved: 0 };
  mode = p ? 'press' : 'rotate';
  document.body.classList.add('grabbing');
});
canvas.addEventListener('pointermove', (e) => {
  setNdc(e);
  if (!down) {
    const p = pick();
    if (p !== hovered) { hovered = p; canvas.style.cursor = p ? 'pointer' : 'grab'; }
    moveTip(e);
    return;
  }
  const dx = e.clientX - down.lx, dy = e.clientY - down.ly;
  const now = performance.now(), dt = Math.max(8, now - down.t) / 1000;
  down.lx = e.clientX; down.ly = e.clientY; down.t = now;
  down.moved += Math.abs(dx) + Math.abs(dy);
  if (mode === 'press' && down.moved > 7) {
    // pull the frame off the sphere
    mode = 'panel'; dragPanel = down.p; hovered = dragPanel;
    const c = worldCenter(dragPanel, new THREE.Vector3());
    const n = camera.position.clone().sub(c).normalize();
    plane.setFromNormalAndCoplanarPoint(n, c.addScaledVector(n, 1.2));
    spin.multiplyScalar(0.2);
  }
  if (mode === 'rotate') {
    const k = 0.0052;
    spin.set(dy * k / dt * 0.6, dx * k / dt * 0.6, 0).clampLength(0, 5);
    applySpin(dy * k, dx * k);
  } else if (mode === 'panel') {
    ray.setFromCamera(ndc, camera);
    if (ray.ray.intersectPlane(plane, hit)) {
      const local = sphere.worldToLocal(hit.clone());
      const home = new THREE.Vector3(0, 0, R).applyQuaternion(dragPanel.mesh.quaternion);
      dragPanel.off.copy(local.sub(home));
    }
    const over = dropTarget(e.clientX, e.clientY);
    panels.forEach((p) => (p.drop = p === over));
  }
  moveTip(e);
});
const end = (e) => {
  if (!down) return;
  if (mode === 'press' && down.p) {
    const p = down.p; p.pulse = 1;
    player.open(p.wi, { getBoundingClientRect: () => ({ left: down.x, top: down.y, width: 0, height: 0 }) });
  } else if (mode === 'panel' && dragPanel) {
    const target = dropTarget(e.clientX, e.clientY);
    if (target) {
      // swap the two frames' places on the sphere
      const a = dragPanel.slot; dragPanel.slot = target.slot; target.slot = a;
      target.pulse = 1;
    }
    dragPanel.vel.set(0, 0, 0);
    panels.forEach((p) => (p.drop = false));
  }
  down = null; mode = null; dragPanel = null;
  document.body.classList.remove('grabbing');
  tip.classList.remove('on'); hovered = null;
};
canvas.addEventListener('pointerup', end);
canvas.addEventListener('pointercancel', end);
canvas.addEventListener('pointerleave', () => { if (!down) { hovered = null; tip.classList.remove('on'); } });

function dropTarget(x, y) {
  let best = null, bd = Math.min(innerWidth, innerHeight) * 0.09;
  const c = new THREE.Vector3();
  for (const p of panels) {
    if (p === dragPanel) continue;
    worldCenter(p, c);
    const [sx, sy, sz] = screenOf(c);
    const facing = c.clone().normalize().dot(camera.position.clone().normalize()) > 0.15;
    const d = Math.hypot(sx - x, sy - y);
    if (facing && sz < 1 && d < bd) { bd = d; best = p; }
  }
  return best;
}

const qx = new THREE.Quaternion(), qy = new THREE.Quaternion(), AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0);
function applySpin(ax, ay) {
  qx.setFromAxisAngle(AX, ax); qy.setFromAxisAngle(AY, ay);
  sphere.quaternion.premultiply(qy).premultiply(qx);
}

function moveTip(e) {
  const p = mode === 'panel' ? dragPanel : hovered;
  if (!p) { tip.classList.remove('on'); return; }
  const w = WORKS[p.wi];
  tip.querySelector('small').textContent = mode === 'panel' ? 'Drop on a frame to swap' : w.cat;
  tip.querySelector('b').textContent = w.t;
  tip.style.transform = `translate(${e.clientX + 18}px, ${e.clientY + 18}px)`;
  tip.classList.add('on');
}

// ---------------------------------------------------------------- frame loop
const clock = new THREE.Clock();
const qTmp = new THREE.Quaternion();
const prog = $('#orb-prog');
let angle = 0, t0 = null;
function frame() {
  requestAnimationFrame(frame);
  if (document.hidden || !$('#player').hidden) return;
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  if (t0 === null) t0 = t;
  // spin: drag inertia eases back to the slow auto-rotation
  if (mode === 'rotate') spin.multiplyScalar(Math.pow(0.02, dt));   // holding still kills the fling
  else {
    spin.lerp(mode === 'panel' ? AUTO.clone().multiplyScalar(0.15) : AUTO, Math.min(1, dt * 1.4));
    applySpin(spin.x * dt, spin.y * dt);
  }
  angle += Math.abs(spin.y) * dt;
  prog.style.transform = `scaleX(${((angle / (Math.PI * 2)) % 1).toFixed(3)})`;
  sphere.rotation.z = 0;
  for (const p of panels) {
    const it = Math.min(1, Math.max(0, (t - t0 - 0.2 - p.delay) / 1.4));
    p.intro = 1 - Math.pow(1 - it, 3);
    // glide toward its slot (after a swap) and spring home when let go
    qTmp.copy(slots[p.slot]);
    p.mesh.quaternion.slerp(qTmp, Math.min(1, dt * (p === dragPanel ? 0 : 4.5)));
    if (p !== dragPanel) {
      p.vel.addScaledVector(p.off, -dt * 60).multiplyScalar(Math.pow(0.02, dt));
      p.off.addScaledVector(p.vel, dt);
    }
    const lifted = p === dragPanel ? 1 : 0;
    p.lift += (lifted - p.lift) * Math.min(1, dt * 10);
    const hv = (p === hovered || p.drop) ? 1 : 0;
    p.hover += (hv - p.hover) * Math.min(1, dt * 10);
    p.pulse = Math.max(0, p.pulse - dt * 2.2);
    // hovered frames lean out of the sphere a little
    const out = new THREE.Vector3(0, 0, 1).applyQuaternion(p.mesh.quaternion).multiplyScalar(p.hover * 0.28 + p.lift * 0.6 + Math.sin(p.pulse * Math.PI) * 0.4);
    p.mesh.position.copy(p.off).add(out).multiplyScalar(1);
    const s = (0.25 + 0.75 * p.intro) * (1 + p.lift * 0.14 + p.hover * 0.04);
    p.mesh.scale.setScalar(s);
    p.mat.uniforms.uIntro.value = p.intro;
    p.mat.uniforms.uHover.value = p.hover;
    p.mat.uniforms.uLift.value = p.lift;
    p.mesh.renderOrder = p === dragPanel ? 2 : 0;
  }
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
setTimeout(() => $('#orb-title').classList.add('in'), 600);
window.__orb = { panels, camera, sphere, worldCenter, screenOf };
