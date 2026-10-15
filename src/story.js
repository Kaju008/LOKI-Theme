import * as THREE from 'three';

// ---------------------------------------------------------------------
// Scroll-driven camera rig. Keyframes are placed on sections; between
// them we interpolate a target point + spherical offset (radius, azimuth,
// elevation) so moves read as true orbits / dollies, never straight cuts.
// ---------------------------------------------------------------------
const D = THREE.MathUtils.degToRad;
const ease = (x) => x * x * (3 - 2 * x);

export function createRig(camera, REG, heroHead, { card = false } = {}) {
  const H = heroHead; // Vector3 — face of the figure on the throne
  const defs = [
    ['hero', 0.0, { t: [0, 4.2, 0], r: 62, az: 0, el: 5, fov: 42 }],
    ['hero', 0.22, { t: [0, 2.9, 0], r: 14, az: 0, el: 3, fov: 40 }],
    ['hero', 0.42, { t: [0, 2.7, 0], r: 11.5, az: card ? 24 : 40, el: 9, fov: 40 }],
    ['hero', 0.6, { t: [0, 2.7, 0], r: 12, az: card ? -22 : -36, el: 4, fov: 40 }],
    ['hero', 0.78, { t: [H.x, H.y, H.z], r: 3.4, az: 0, el: 3, fov: 32 }],
    ['hero', 0.86, { t: [H.x, H.y, H.z], r: 2.6, az: 0, el: 3, fov: 30 }],
    ['about', 0.0, { t: [0, REG.about + 2, 0], r: 36, az: 0, el: -4, fov: 42 }],
    ['about', 1.0, { t: [0, REG.about + 2, 0], r: 31, az: -10, el: -2, fov: 42 }],
    ['work', 0.0, { t: [0, REG.work + 4, -30], r: 34, az: 0, el: 2.5, fov: 44 }],
    ['work', 1.0, { t: [14, REG.work + 4, -30], r: 34, az: -14, el: 2.5, fov: 44 }],
    ['skills', 0.0, { t: [0, REG.skills, -62], r: 78, az: 0, el: 3, fov: 42 }],
    ['skills', 0.5, { t: [0, REG.skills, -62], r: 66, az: 6, el: 5, fov: 42 }],
    ['skills', 1.0, { t: [0, REG.skills, -62], r: 62, az: 10, el: 4, fov: 42 }],
    ['contact', 0.0, { t: [0, REG.contact + 22, -200], r: 206, az: 0, el: -4.6, fov: 46 }],
    ['contact', 1.0, { t: [0, REG.contact + 26, -220], r: 226, az: -2.5, el: -5, fov: 44 }],
  ];
  let keys = [];
  function refresh() {
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    keys = defs.map(([id, f, k]) => {
      const el = document.getElementById(id);
      const top = el ? el.offsetTop : 0, h = el ? Math.max(1, el.offsetHeight - innerHeight) : 1;
      return { p: Math.min(1, (top + h * f) / max), ...k };
    }).sort((a, b) => a.p - b.p);
  }
  const tgt = new THREE.Vector3(), pos = new THREE.Vector3();
  const out = { pos: new THREE.Vector3(), tgt: new THREE.Vector3(), fov: 42 };
  function sample(p) {
    let i = 0;
    while (i < keys.length - 2 && p > keys[i + 1].p) i++;
    const a = keys[i], b = keys[i + 1] || a;
    const k = ease(THREE.MathUtils.clamp((p - a.p) / Math.max(1e-5, b.p - a.p), 0, 1));
    tgt.set(a.t[0] + (b.t[0] - a.t[0]) * k, a.t[1] + (b.t[1] - a.t[1]) * k, a.t[2] + (b.t[2] - a.t[2]) * k);
    const r = a.r + (b.r - a.r) * k, az = D(a.az + (b.az - a.az) * k), el = D(a.el + (b.el - a.el) * k);
    pos.set(Math.sin(az) * Math.cos(el) * r, Math.sin(el) * r, Math.cos(az) * Math.cos(el) * r).add(tgt);
    out.pos.copy(pos); out.tgt.copy(tgt); out.fov = a.fov + ((b.fov ?? a.fov) - a.fov) * k;
    return out;
  }
  return { refresh, sample };
}
