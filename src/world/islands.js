import * as THREE from 'three';
import { makeNoise } from '../core/glsl.js';

const crystalGeo = new THREE.OctahedronGeometry(1, 0);
const pillarGeo = new THREE.CylinderGeometry(0.22, 0.28, 1, 8);

function islandGeometry(seed, r) {
  const n = makeNoise(seed);
  const g = new THREE.IcosahedronGeometry(1, 5);
  const p = g.attributes.position, col = new Float32Array(p.count * 3), v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const nn = n.fbm(v.x * 1.6 + seed, v.y * 1.6, v.z * 1.6, 5);
    let x = v.x, y = v.y, z = v.z;
    const ridge = 1 - Math.abs(n(v.x * 3 + 4, v.y * 5, v.z * 3));
    if (y > 0) { // flat-ish top with a little terrain
      y = 0.12 + nn * 0.12 + ridge * 0.05;
      const k = 1 + nn * 0.18; x *= k; z *= k;
    } else {     // tapered rocky underside, stalactite tip
      const t = -y;
      const taper = Math.pow(1 - t, 1.25) * 0.95 + 0.05;
      x *= taper * (1 + nn * 0.35); z *= taper * (1 + nn * 0.35);
      y = -t * (1.7 + ridge * 0.6) + nn * 0.25;
    }
    p.setXYZ(i, x * r, y * r, z * r);
    const top = v.y > 0.05 ? 1 : 0;
    const c = 0.45 + nn * 0.4;
    // mossy teal top, stone below with strata
    const strata = 0.5 + 0.5 * Math.sin(y * 9 + nn * 3);
    if (top) col.set([0.12 + c * 0.1, 0.28 + c * 0.25, 0.26 + c * 0.2], i * 3);
    else col.set([c * (0.78 + strata * 0.15), c * (0.8 + strata * 0.12), c * 0.88], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

export function createIsland({ seed = 1, r = 4, env, crystalColor = 0x39ffb0, pillars = 0, crystals = 5 } = {}) {
  const group = new THREE.Group();
  const rand = makeNoise(seed).rnd;
  const rock = new THREE.Mesh(islandGeometry(seed, r), new THREE.MeshStandardMaterial({ vertexColors: true, color: 0x8a94a6, roughness: 0.9, metalness: 0.05, envMap: env, envMapIntensity: 0.5 }));
  group.add(rock);
  const cMat = new THREE.MeshPhysicalMaterial({ color: crystalColor, emissive: crystalColor, emissiveIntensity: 1.1, roughness: 0.12, metalness: 0.1, transmission: 0, clearcoat: 1, envMap: env });
  const glowables = [cMat];
  for (let i = 0; i < crystals; i++) {
    const c = new THREE.Mesh(crystalGeo, cMat);
    const a = rand() * Math.PI * 2, d = rand() * r * 0.65;
    const h = 0.4 + rand() * 1.4;
    c.scale.set(0.18 + rand() * 0.18, h, 0.18 + rand() * 0.18);
    c.position.set(Math.cos(a) * d, 0.18 * r + h * 0.5, Math.sin(a) * d);
    c.rotation.set((rand() - 0.5) * 0.6, rand() * 3, (rand() - 0.5) * 0.6);
    group.add(c);
  }
  // hanging crystal under the island
  const under = new THREE.Mesh(crystalGeo, cMat);
  under.scale.set(0.35, 1.4, 0.35); under.position.y = -r * 2.1;
  group.add(under);
  const pMat = new THREE.MeshStandardMaterial({ color: 0x1a1d26, roughness: 0.5, metalness: 0.6, envMap: env, emissive: 0x0c3a2c, emissiveIntensity: 0.4 });
  for (let i = 0; i < pillars; i++) {
    const pl = new THREE.Mesh(pillarGeo, pMat);
    const a = (i / pillars) * Math.PI * 2 + rand(), d = r * (0.5 + rand() * 0.25), h = 1.2 + rand() * 2.8;
    pl.scale.set(1, h, 1); pl.position.set(Math.cos(a) * d, 0.18 * r + h / 2, Math.sin(a) * d);
    pl.rotation.z = (rand() - 0.5) * 0.25;
    group.add(pl);
  }
  // halo light under the island (shows on hover)
  const light = new THREE.PointLight(crystalColor, 0, r * 6, 2);
  light.position.y = 0.6 * r;
  group.add(light);

  const state = { hover: 0, target: 0, base: group.position.clone(), ph: rand() * 6, bob: 0.4 + rand() * 0.6, spin: (rand() - 0.5) * 0.03 };
  return {
    group, rock, state,
    setBase(v) { state.base.copy(v); group.position.copy(v); },
    update(t, dt) {
      state.hover += (state.target - state.hover) * Math.min(1, dt * 5);
      group.position.y = state.base.y + Math.sin(t * 0.5 + state.ph) * state.bob;
      group.rotation.y += state.spin * dt;
      const s = 1 + state.hover * 0.08;
      group.scale.setScalar(s);
      for (const m of glowables) m.emissiveIntensity = 1.1 + state.hover * 3.5;
      light.intensity = state.hover * 60;
    },
  };
}
