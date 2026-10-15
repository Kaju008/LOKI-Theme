import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { makeNoise } from '../core/glsl.js';

// ---------------------------------------------------------------------
// Floating islands: dense displaced geometry (cliffs with vertical
// erosion, terraced tops, a long stalactite underside), photoscanned
// rock + moss, and clusters of hexagonal energy crystals.
// Geometry is generated once per archetype and shared.
// ---------------------------------------------------------------------
const GEO = new Map();
function islandGeometry(seed, detail) {
  const key = seed + ':' + detail;
  if (GEO.has(key)) return GEO.get(key);
  const n = makeNoise(seed);
  let g = new THREE.SphereGeometry(1, detail, Math.round(detail * 0.62));
  const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const a = Math.atan2(v.z, v.x);
    const lobes = 1 + 0.16 * Math.sin(a * 3 + seed) + 0.08 * Math.sin(a * 5 + seed * 2.1);
    const nn = n.fbm(v.x * 1.7 + seed, v.y * 1.7, v.z * 1.7, 6);
    let x = v.x * lobes, y = v.y, z = v.z * lobes;
    if (y > 0.08) {
      // top: gentle terrain with a raised rim and a few rocky outcrops
      const rim = Math.pow(1 - y, 0.5);
      const terr = n.fbm(v.x * 3 + 4, 0, v.z * 3, 5);
      y = 0.18 + terr * 0.12 + Math.max(0, n(v.x * 6, 7, v.z * 6)) * 0.14 * rim;
      const k = 1 + nn * 0.12; x *= k; z *= k;
    } else {
      // underside: taper to a point with vertical erosion grooves (noise stretched in y)
      const t = Math.min(1, (0.08 - y) / 1.08);
      const taper = Math.pow(1 - t, 0.95) * 0.95 + 0.05;
      const grooves = n(a * 7.0, y * 1.2, seed) * 0.5 + n(a * 19.0, y * 2.5, seed + 3) * 0.22;
      const crag = 1 - Math.abs(n(v.x * 3.3 + seed, y * 2.2, v.z * 3.3));
      const chunks = Math.max(0, n(a * 2.0 + seed, y * 1.4, 5.5)) * 0.55;
      const k = taper * (1 + nn * 0.5 + grooves * 0.2 * (1 - t * 0.6) + crag * crag * 0.18 + chunks * t);
      x *= k; z *= k;
      y = 0.08 - t * (1.55 + nn * 0.6 + chunks * 0.8) + n(v.x * 4, y * 4, v.z * 4) * 0.16 * (1 - t);
      // ledge strata
      y += Math.round(y * 6) / 6 * 0.04 - y * 0.04;
    }
    p.setXYZ(i, x, y, z);
  }
  g.deleteAttribute('normal'); g.deleteAttribute('uv');
  g = mergeVertices(g, 1e-5);
  g.computeVertexNormals();
  GEO.set(key, g);
  return g;
}

// hexagonal crystal (prism with a pointed tip), merged into clusters
let CRYSTAL = null;
function crystalGeo() {
  if (CRYSTAL) return CRYSTAL;
  const prism = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true);
  prism.translate(0, 0.5, 0);
  const tip = new THREE.ConeGeometry(1, 0.7, 6, 1);
  tip.translate(0, 1.35, 0);
  const base = new THREE.CircleGeometry(1, 6); base.rotateX(Math.PI / 2);
  CRYSTAL = mergeGeometries([prism.toNonIndexed(), tip.toNonIndexed(), base.toNonIndexed()]);
  CRYSTAL.computeVertexNormals();
  return CRYSTAL;
}

export function createIsland({ seed = 1, r = 4, rockMat, crystalColor = 0x39ffb0, crystals = 6, detail = 220 } = {}) {
  const group = new THREE.Group();
  const body = new THREE.Group();     // drag offset/tilt is applied here
  group.add(body);
  const rand = makeNoise(seed * 13 + 7).rnd;
  const geo = islandGeometry(seed % 5, detail);
  const rock = new THREE.Mesh(geo, rockMat);
  rock.scale.setScalar(r);
  rock.rotation.y = rand() * 6.28;
  body.add(rock);

  const col = new THREE.Color(crystalColor);
  const cMat = new THREE.MeshPhysicalMaterial({ color: col.clone().multiplyScalar(0.25), emissive: col, emissiveIntensity: 0.3, roughness: 0.08, metalness: 0.0, clearcoat: 1, clearcoatRoughness: 0.05, flatShading: true, envMapIntensity: 1.6 });
  const cg = crystalGeo();
  const clusters = Math.max(1, Math.round(crystals / 3));
  for (let c = 0; c < clusters; c++) {
    const a = rand() * Math.PI * 2, d = rand() * r * 0.55;
    const cx = Math.cos(a) * d, cz = Math.sin(a) * d;
    const n = 3 + Math.floor(rand() * 4);
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(cg, cMat);
      const h = (0.3 + rand() * 0.8) * Math.min(1.0, r * 0.13) * (i === 0 ? 1.5 : 1);
      const w = h * (0.13 + rand() * 0.07);
      m.scale.set(w, h, w);
      m.position.set(cx + (rand() - 0.5) * r * 0.12, 0.17 * r, cz + (rand() - 0.5) * r * 0.12);
      m.rotation.set((rand() - 0.5) * 0.9, rand() * 3, (rand() - 0.5) * 0.9);
      body.add(m);
    }
  }
  // hanging crystal under the tip
  const under = new THREE.Mesh(cg, cMat);
  under.scale.set(0.16 * r * 0.4, 0.6 * r * 0.4, 0.16 * r * 0.4);
  under.rotation.x = Math.PI; under.position.y = -r * 2.05;
  body.add(under);

  const light = new THREE.PointLight(crystalColor, 0, r * 7, 2);
  light.position.y = 0.6 * r;
  body.add(light);

  const state = { hover: 0, target: 0, base: new THREE.Vector3(), ph: rand() * 6, bob: 0.3 + rand() * 0.5, spin: (rand() - 0.5) * 0.02,
    off: new THREE.Vector3(), vel: new THREE.Vector3(), goal: new THREE.Vector3(), drag: false, tilt: new THREE.Vector2() };
  return {
    group, rock, state, r,
    setBase(v) { state.base.copy(v); group.position.copy(v); },
    update(t, dt) {
      state.hover += (state.target - state.hover) * Math.min(1, dt * 5);
      // spring toward the drag goal (or home when released) — critically damped feel
      const k = state.drag ? 60 : 4.5, c = state.drag ? 14 : 3.2;
      const ax = (state.goal.x - state.off.x) * k - state.vel.x * c;
      const ay = (state.goal.y - state.off.y) * k - state.vel.y * c;
      const az = (state.goal.z - state.off.z) * k - state.vel.z * c;
      state.vel.x += ax * dt; state.vel.y += ay * dt; state.vel.z += az * dt;
      state.off.addScaledVector(state.vel, dt);
      group.position.set(state.base.x + state.off.x, state.base.y + state.off.y + Math.sin(t * 0.5 + state.ph) * state.bob, state.base.z + state.off.z);
      body.rotation.z += ((-state.vel.x * 0.02) - body.rotation.z) * Math.min(1, dt * 4);
      body.rotation.x += ((state.vel.z * 0.02 + state.vel.y * 0.01) - body.rotation.x) * Math.min(1, dt * 4);
      rock.rotation.y += state.spin * dt;
      const s = 1 + state.hover * 0.05;
      body.scale.setScalar(s);
      cMat.emissiveIntensity = 0.3 + state.hover * 2.4;
      light.intensity = state.hover * 40 * r;
    },
  };
}
