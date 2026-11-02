import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { islandGeometry } from '../world/islands.js';
import { loadRockTextures, rockMaterial2 } from '../world/rockmat.js';
import { makeNoise } from '../core/glsl.js';
import { DECK_Y, WIDTH, PLAZA } from './bridge.js';

// =====================================================================
//  The realm under the bridge (blue hour, like the reference):
//  · the bridge gets a thick stone body — slab fascia with glowing edge
//    lines, a chamfered underside, and arches on piers falling into mist
//  · floating islands: photoscanned rock with moss, trees, waterfalls
//  · far islands crowned with Asgard-like citadels: gold organ-pipe
//    spires, towers, domes and warm windows
//  · a sea of mist below and a warm glow on the horizon
//  Everything fades into a blue atmospheric haze that warms toward the
//  low sun behind the far end of the bridge.
// =====================================================================
const SUN = new THREE.Vector3(-0.08, 0.16, -1).normalize();       // low, behind the far end of the bridge
const HAZE = { col: new THREE.Color(0.028, 0.05, 0.095), warm: new THREE.Color(0.42, 0.24, 0.13) };

// aerial perspective for standard materials: blue haze with distance, warmer toward the sun, thicker low down
const HZ_U = { uHzCol: { value: HAZE.col }, uHzWarm: { value: HAZE.warm }, uHzSun: { value: SUN } };
export function hazeify(mat, { k = 0.0016, start = 30 } = {}) {
  const prev = mat.onBeforeCompile;
  mat.fog = false;
  mat.onBeforeCompile = (sh, r) => {
    if (prev) prev(sh, r);
    Object.assign(sh.uniforms, HZ_U, { uHzK: { value: k }, uHzStart: { value: start } });
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vHzW;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        { vec4 hw = vec4(transformed, 1.0);
          #ifdef USE_INSTANCING
            hw = instanceMatrix * hw;
          #endif
          vHzW = (modelMatrix * hw).xyz; }`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vHzW; uniform vec3 uHzCol, uHzWarm, uHzSun; uniform float uHzK, uHzStart;')
      .replace('#include <fog_fragment>', `#include <fog_fragment>
        { vec3 vd = vHzW - cameraPosition; float dist = length(vd); vd /= max(dist, 1e-3);
          float hz = 1.0 - exp(-max(0.0, dist - uHzStart) * uHzK);
          hz = clamp(hz + smoothstep(-25.0, -95.0, vHzW.y) * 0.55, 0.0, 1.0);
          float sunf = pow(max(dot(vd, uHzSun), 0.0), 5.0);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, mix(uHzCol, uHzWarm, sunf * 0.6), hz); }`);
  };
  const fam = mat.userData && mat.userData.u ? 'rock' : mat.type;   // different shader code → different program
  const key = (mat.customProgramCacheKey ? mat.customProgramCacheKey() : '') + `|hz${k}|${start}|${fam}`;
  mat.customProgramCacheKey = () => key;
  mat.needsUpdate = true;
  return mat;
}

export function createRealm({ tier, env, paths, loader }) {
  const group = new THREE.Group();
  const stdMats = [], shaderMats = [];
  const R = makeNoise(31).rnd;
  const T = loadRockTextures(loader, tier);
  const mobile = tier.mobile;

  // ================================================================ the bridge body
  const stone = hazeify(rockMaterial2(T, { scale: 0.42, moss: 0.0, tint: new THREE.Color(0.5, 0.55, 0.63), envMap: env, envMapIntensity: 0.55 }));
  stone.roughness = 0.7;
  stdMats.push(stone);
  const hw = WIDTH / 2 + 0.38;
  // cross-section (across, down): slab fascia, then a chamfered girder underneath
  const PROF = [[-hw, -0.27], [-hw, -1.0], [-hw * 0.8, -1.45], [-hw * 0.52, -2.1], [hw * 0.52, -2.1], [hw * 0.8, -1.45], [hw, -1.0], [hw, -0.27]];
  function sweep(curve, len, step) {
    const n = Math.max(2, Math.ceil(len / step)), L = curve.getLength(), pos = [], idx = [];
    const p = new THREE.Vector3(), t = new THREE.Vector3(), sd = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i <= n; i++) {
      const u = Math.min(1, (i / n) * (len / L));
      curve.getPointAt(u, p); curve.getTangentAt(u, t); sd.crossVectors(t, up).normalize();
      for (const [a, y] of PROF) pos.push(p.x + sd.x * a, DECK_Y + y, p.z + sd.z * a);
      if (i < n) for (let k = 0; k < PROF.length - 1; k++) { const a = i * PROF.length + k, b = a + PROF.length; idx.push(a, b, a + 1, a + 1, b, b + 1); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
    return g.toNonIndexed();
  }
  const slabs = [];
  for (const [k, c] of Object.entries(paths)) slabs.push(sweep(c, Math.min(c.getLength(), k === 'front' || k === 'mid' ? 1100 : 900), k === 'front' ? 3 : 2));
  // the plaza: fascia, chamfer and taper as rings under the disc
  const Rp = PLAZA.r + 0.38;
  for (const [r0, r1, y0, y1, open] of [[Rp, Rp, -0.27, -1.0, true], [Rp, Rp * 0.9, -1.0, -1.45, true], [Rp * 0.9, Rp * 0.55, -1.45, -2.1, false]]) {
    const g = new THREE.CylinderGeometry(r0, r1, y0 - y1, 128, 1, open);
    g.translate(PLAZA.c.x, DECK_Y + (y0 + y1) / 2, PLAZA.c.z);
    slabs.push(g.toNonIndexed());
  }
  for (const g of slabs) { g.deleteAttribute('uv'); g.deleteAttribute('normal'); g.computeVertexNormals(); }
  const body = new THREE.Mesh(mergeGeometries(slabs), stone);
  body.frustumCulled = false;
  group.add(body);

  // glowing edge lines along the fascia, with light pulses running along them
  const glowU = { uTime: { value: 0 } };
  const glowMat = new THREE.ShaderMaterial({
    uniforms: glowU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: `attribute float aS; attribute float aK; varying float vS; varying float vK; varying vec3 vW; void main(){ vS = aS; vK = aK; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `uniform float uTime; varying float vS; varying float vK; varying vec3 vW;
      void main(){
        float d = length(vW - cameraPosition);
        float pulse = pow(0.5 + 0.5 * sin(vS * 0.08 - uTime * 2.2), 8.0);
        vec3 c = mix(vec3(0.22, 1.0, 0.68), vec3(0.45, 0.85, 1.0), vK) * (0.55 + pulse * 1.4);
        float fade = exp(-d * 0.004) * (vK > 0.5 ? 0.45 : 1.0);
        gl_FragColor = vec4(c * fade, 1.0);
      }`,
  });
  shaderMats.push(glowMat);
  const strips = [];
  for (const [k, c] of Object.entries(paths)) {
    const len = Math.min(c.getLength(), 900), n = Math.ceil(len / 2), L = c.getLength();
    for (const [e, y0, y1, kind] of [[-1, -0.34, -0.42, 0], [1, -0.34, -0.42, 0], [-1, -0.94, -0.98, 1], [1, -0.94, -0.98, 1]]) {
      const pos = [], aS = [], aK = [], idx = [], p = new THREE.Vector3(), t = new THREE.Vector3(), sd = new THREE.Vector3();
      for (let i = 0; i <= n; i++) {
        const u = (i / n) * (len / L); c.getPointAt(u, p); c.getTangentAt(u, t); sd.crossVectors(t, new THREE.Vector3(0, 1, 0)).normalize();
        const x = p.x + sd.x * e * (hw + 0.012), z = p.z + sd.z * e * (hw + 0.012);
        pos.push(x, DECK_Y + y0, z, x, DECK_Y + y1, z); aS.push(u * L, u * L); aK.push(kind, kind);
        if (i < n) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aS', new THREE.Float32BufferAttribute(aS, 1)); g.setAttribute('aK', new THREE.Float32BufferAttribute(aK, 1)); g.setIndex(idx);
      strips.push(g);
    }
  }
  const ring = (r, y0, y1, kind) => { const pos = [], aS = [], aK = [], idx = []; for (let i = 0; i <= 192; i++) { const a = i / 192 * Math.PI * 2, x = PLAZA.c.x + Math.cos(a) * r, z = PLAZA.c.z + Math.sin(a) * r; pos.push(x, DECK_Y + y0, z, x, DECK_Y + y1, z); aS.push(a * r, a * r); aK.push(kind, kind); if (i < 192) { const b = i * 2; idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); } } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aS', new THREE.Float32BufferAttribute(aS, 1)); g.setAttribute('aK', new THREE.Float32BufferAttribute(aK, 1)); g.setIndex(idx); return g; };
  strips.push(ring(PLAZA.r + 0.012, -0.34, -0.42, 0), ring(PLAZA.r + 0.012, -0.94, -0.98, 1));
  const glow = new THREE.Mesh(mergeGeometries(strips), glowMat); glow.frustumCulled = false; glow.renderOrder = 2;
  group.add(glow);

  // arches on piers under the straight roads, dropping into the mist
  const archGeos = [];
  const archAt = (curve, s0, s1, spanLen) => {
    const L = curve.getLength(), p = new THREE.Vector3(), t = new THREE.Vector3();
    for (let s = s0; s < s1; s += spanLen) {
      curve.getPointAt(Math.min(1, (s + spanLen / 2) / L), p); curve.getTangentAt(Math.min(1, (s + spanLen / 2) / L), t);
      const half = spanLen / 2, H = 11, ri = half - 2.2;
      const shape = new THREE.Shape();
      shape.moveTo(-half, 0); shape.lineTo(half, 0); shape.lineTo(half, -H - 70); shape.lineTo(half - 3.4, -H - 70); shape.lineTo(half - 3.4, -H + 1);
      shape.absarc(0, -H + 1, ri - 1.2, 0, Math.PI, false);
      shape.lineTo(-half + 3.4, -H - 70); shape.lineTo(-half, -H - 70); shape.lineTo(-half, 0);
      const g = new THREE.ExtrudeGeometry(shape, { depth: hw * 1.04, bevelEnabled: false, curveSegments: 24 });
      g.translate(0, 0, -hw * 0.52);
      g.rotateY(Math.atan2(t.x, t.z) - Math.PI / 2);
      g.translate(p.x, DECK_Y - 2.05, p.z);
      g.deleteAttribute('uv');
      archGeos.push(g.toNonIndexed());
    }
  };
  archAt(paths.front, 18, 300, 46);
  archAt(paths.mid, 40, mobile ? 260 : 420, 52);
  for (const g of archGeos) { g.deleteAttribute('normal'); g.computeVertexNormals(); }
  const arches = new THREE.Mesh(mergeGeometries(archGeos), stone); arches.frustumCulled = false;
  group.add(arches);

  // ================================================================ floating islands (dense, mossy, forested)
  const mossMats = new Map();
  const mossMat = (r) => {
    const k = Math.round(Math.log2(r) * 2);
    if (mossMats.has(k)) return mossMats.get(k);
    const m = hazeify(rockMaterial2(T, { scale: Math.max(0.45, r * 0.24), moss: 1.0, tint: new THREE.Color(0.8, 0.84, 0.9), mossColor: new THREE.Color(0.36, 0.66, 0.28), envMap: env, envMapIntensity: 0.5 }));
    mossMats.set(k, m); stdMats.push(m); return m;
  };
  // foliage from Kaju's tree model: the whole tree pre-rendered from four sides (impostors), and its oak-leaf branch card
  const texL = (u) => { const t = loader.load(u); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.generateMipmaps = true; return t; };
  const treeTex = texL(mobile ? 'assets/universe/realm/trees-sm.webp' : 'assets/universe/realm/trees.webp');
  const leafTex = texL('assets/universe/realm/leaves.webp');
  // crossed cards; normals bend out from the crown so light wraps the foliage like a volume
  function cards(n, w, h, base, crownY) {
    const geos = [];
    for (let i = 0; i < n; i++) { const g = new THREE.PlaneGeometry(w, h, 2, 3); g.translate(0, h / 2 + base, 0); g.rotateY((i / n) * Math.PI); geos.push(g); }
    const g = mergeGeometries(geos), P = g.attributes.position, N = g.attributes.normal, v = new THREE.Vector3();
    for (let i = 0; i < P.count; i++) { v.set(P.getX(i), P.getY(i) - crownY, P.getZ(i)).normalize(); v.y = v.y * 0.6 + 0.4; v.normalize(); N.setXYZ(i, v.x, v.y, v.z); }
    return g;
  }
  const treeGeo = (() => {   // three side cards + a canopy card seen from above (so trees read from the aerial view too)
    const side = cards(3, 1, 1, -0.019, 0.55); side.setAttribute('aTop', new THREE.Float32BufferAttribute(new Float32Array(side.attributes.position.count), 1));
    const top = new THREE.PlaneGeometry(0.85, 0.85, 1, 1); top.rotateX(-Math.PI / 2); top.translate(0, 0.66, 0);
    top.setAttribute('aTop', new THREE.Float32BufferAttribute(new Float32Array(top.attributes.position.count).fill(1), 1));
    return mergeGeometries([side, top]);
  })();
  const bushGeo = cards(2, 1, 1, -0.08, 0.35); bushGeo.setAttribute('aTop', new THREE.Float32BufferAttribute(new Float32Array(bushGeo.attributes.position.count), 1));
  const vineGeo = (() => { const g = new THREE.PlaneGeometry(1, 1, 1, 3); g.translate(0, -0.5, 0); return g; })();
  const foliage = (map, { cell = false, flip = false } = {}) => {
    const m = new THREE.MeshStandardMaterial({ map, alphaTest: 0.42, side: THREE.DoubleSide, roughness: 0.85, metalness: 0, envMap: env, envMapIntensity: 0.35 });
    m.alphaToCoverage = !!tier.msaa;
    if (cell || flip) {
      const prev = m.onBeforeCompile;
      m.onBeforeCompile = (sh, r) => {
        if (prev) prev(sh, r);
        sh.vertexShader = sh.vertexShader
          .replace('#include <common>', '#include <common>\nattribute float aCell;\nattribute float aTop;')
          .replace('#include <uv_vertex>', `#include <uv_vertex>
            ${cell ? 'vMapUv.x = (vMapUv.x + (aTop > 0.5 ? 4.0 : aCell)) * 0.2;' : ''}
            ${flip ? 'vMapUv.y = 1.0 - vMapUv.y;' : ''}`);
      };
      m.customProgramCacheKey = () => `foliage|${cell}|${flip}`;
    }
    hazeify(m); stdMats.push(m); return m;
  };
  const treeMat = foliage(treeTex, { cell: true }), bushMat = foliage(leafTex, { flip: true }), vineMat = foliage(leafTex);
  const spots = { tree: [], bush: [], vine: [] };

  const waterfalls = [];
  const islands = [];
  function island({ x, y, z, r, seed = 1, trees = 1, falls = 0, flat = 0.85, detail = 96 }) {
    const geo = islandGeometry(seed % 5, detail);
    const m = new THREE.Mesh(geo, mossMat(r));
    m.scale.set(r, r * flat, r); m.position.set(x, y, z); m.rotation.y = R() * 6.28;
    m.updateMatrixWorld(true);
    group.add(m); islands.push(m);
    const P = geo.attributes.position, N = geo.attributes.normal, v = new THREE.Vector3(), nv = new THREE.Vector3();
    const tops = [], rims = [];
    for (let i = 0; i < P.count; i++) {
      const ny = N.getY(i), py = P.getY(i);
      if (ny > 0.72 && py > 0.1) tops.push(i);
      else if (py > -0.25 && py < 0.22 && ny < 0.45 && ny > -0.3) rims.push(i);
    }
    const dens = trees * (mobile ? 0.45 : 1);
    const scaleK = Math.min(1.7, Math.max(0.8, r / 12));
    // a forest on top, thickest away from the edge
    const nt = Math.round(r * r * 1.5 * dens);
    for (let k = 0; k < nt; k++) {
      v.fromBufferAttribute(P, tops[Math.floor(R() * tops.length)]);
      const edge = Math.hypot(v.x, v.z); if (edge > 0.9 && R() < 0.6) continue;
      v.applyMatrix4(m.matrixWorld);
      spots.tree.push([v.x, v.y - 0.15, v.z, (2.4 + R() * 3.2) * scaleK, R()]);
    }
    // undergrowth: leafy bushes everywhere on top
    const nb = Math.round(r * r * 2.6 * dens);
    for (let k = 0; k < nb; k++) { v.fromBufferAttribute(P, tops[Math.floor(R() * tops.length)]).applyMatrix4(m.matrixWorld); spots.bush.push([v.x, v.y - 0.05, v.z, (0.7 + R() * 1.3) * scaleK, R()]); }
    // moss and vines hanging off the cliffs
    const nv2 = Math.round(r * 6 * dens);
    for (let k = 0; k < nv2 && rims.length; k++) {
      const i = rims[Math.floor(R() * rims.length)];
      v.fromBufferAttribute(P, i).applyMatrix4(m.matrixWorld);
      nv.set(P.getX(i), 0, P.getZ(i)).normalize().applyQuaternion(m.quaternion);
      spots.vine.push([v.x + nv.x * 0.15, v.y + 0.3, v.z + nv.z * 0.15, (1.6 + R() * 2.4) * scaleK, Math.atan2(nv.x, nv.z)]);
    }
    // waterfalls pour off the rim on the side facing the bridge
    for (let f = 0; f < falls && rims.length; f++) {
      let best = null, bd = -1e9;
      for (let k = 0; k < 40; k++) {
        const i = rims[Math.floor(R() * rims.length)]; v.fromBufferAttribute(P, i); if (v.y < 0.05) continue; v.applyMatrix4(m.matrixWorld);
        const sc = -Math.abs(v.x) + R() * 6 - (best ? v.distanceTo(best.v) < r * 0.6 ? 1e3 : 0 : 0);
        if (sc > bd) { bd = sc; best = { v: v.clone() }; }
      }
      if (best) waterfalls.push({ at: best.v, out: new THREE.Vector3(best.v.x - x, 0, best.v.z - z).normalize(), w: r * (0.22 + R() * 0.14), h: r * (2.4 + R() * 1.2) });
    }
    return m;
  }
  // near: around and below the bridge (some with waterfalls)
  const NEAR = [
    { x: -36, y: -16, z: 14, r: 9, seed: 1, falls: 1 }, { x: 40, y: -20, z: -10, r: 11, seed: 2, falls: 2 },
    { x: -58, y: -30, z: -66, r: 14, seed: 3, falls: 1 }, { x: 66, y: -27, z: -98, r: 12, seed: 4, falls: 1 },
    { x: -30, y: -42, z: 64, r: 10, seed: 5, falls: 1 }, { x: 34, y: -38, z: 98, r: 9, seed: 6 },
    { x: 4, y: -62, z: -54, r: 19, seed: 7, falls: 2 }, { x: -22, y: -26, z: -150, r: 10, seed: 8, falls: 1 },
    { x: 26, y: -32, z: -205, r: 13, seed: 9, falls: 1 }, { x: -46, y: -48, z: 150, r: 12, seed: 10 },
  ];
  // middle distance
  const MID = [
    { x: -120, y: -22, z: -180, r: 25, seed: 11, falls: 2 }, { x: 150, y: -12, z: -230, r: 28, seed: 12, falls: 2 },
    { x: -185, y: -40, z: -55, r: 20, seed: 13, falls: 1 }, { x: 195, y: -34, z: 25, r: 22, seed: 14, falls: 1 },
    { x: -150, y: -55, z: 120, r: 18, seed: 15 }, { x: 120, y: -60, z: 150, r: 20, seed: 16 },
    { x: -60, y: -30, z: -330, r: 22, seed: 17, falls: 1 }, { x: 80, y: -45, z: -420, r: 26, seed: 18 },
  ];
  NEAR.forEach((o) => island({ ...o, detail: mobile ? 110 : 200 }));
  MID.forEach((o) => island({ ...o, detail: mobile ? 80 : 150, trees: 0.7 }));

  // ================================================================ Asgard citadels on the far islands
  const gold = hazeify(new THREE.MeshStandardMaterial({ color: 0xd8ad55, metalness: 1, roughness: 0.26, envMap: env, envMapIntensity: 1.3 }), { k: 0.0011, start: 120 });
  const pale = hazeify(new THREE.MeshStandardMaterial({ color: 0x8d96a6, metalness: 0.15, roughness: 0.75, envMap: env, envMapIntensity: 0.5 }), { k: 0.0011, start: 120 });
  const lamps = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 1.15, 0.55), fog: false });
  stdMats.push(gold, pale);
  function citadel(cx, cy, cz, S, seed) {
    const rnd = makeNoise(seed).rnd, G = [], P = [], W = [];
    const add = (arr, g, x, y, z, ry = 0) => { g.rotateY(ry); g.translate(cx + x * S, cy + y * S, cz + z * S); if (g.attributes.uv) g.deleteAttribute('uv'); arr.push(g.index ? g.toNonIndexed() : g); };
    // stepped stone terraces
    for (let i = 0; i < 3; i++) add(P, new THREE.CylinderGeometry((0.62 - i * 0.14) * S, (0.66 - i * 0.14) * S, 0.06 * S, 40), 0, 0.03 + i * 0.06, 0);
    // the palace: gold organ-pipe spires in a peaked arc
    const n = 26;
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1) - 0.5, h = (0.25 + (1 - Math.pow(Math.abs(u) * 2, 1.6)) * 0.85) * (0.85 + rnd() * 0.3), w = 0.022 + rnd() * 0.01;
      const a = u * 2.4, rr = 0.22;
      add(G, new THREE.CylinderGeometry(w * 0.55 * S, w * S, h * S, 6), Math.sin(a) * rr, 0.2 + h / 2, -Math.cos(a) * rr * 0.6);
      add(G, new THREE.ConeGeometry(w * 0.55 * S, h * 0.12 * S, 6), Math.sin(a) * rr, 0.2 + h + h * 0.06, -Math.cos(a) * rr * 0.6);
      if (i % 3 === 0) add(W, new THREE.BoxGeometry(0.012 * S, 0.05 * S, 0.012 * S), Math.sin(a) * rr, 0.24 + h * 0.4, -Math.cos(a) * rr * 0.6 + 0.02);
    }
    // the great hall below the spires, with a golden dome
    add(P, new THREE.BoxGeometry(0.42 * S, 0.14 * S, 0.22 * S), 0, 0.27, 0.05);
    add(G, new THREE.SphereGeometry(0.1 * S, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), 0, 0.34, 0.05);
    for (let i = 0; i < 9; i++) add(W, new THREE.BoxGeometry(0.018 * S, 0.05 * S, 0.004 * S), -0.16 + i * 0.04, 0.26, 0.161);
    // outer towers with pointed gold caps
    const nt = 7 + Math.floor(rnd() * 5);
    for (let i = 0; i < nt; i++) {
      const a = rnd() * Math.PI * 2, d = 0.3 + rnd() * 0.25, h = 0.18 + rnd() * 0.32, w = 0.025 + rnd() * 0.02;
      const x = Math.cos(a) * d, z = Math.sin(a) * d * 0.8;
      add(P, new THREE.CylinderGeometry(w * S, w * 1.15 * S, h * S, 10), x, 0.18 + h / 2, z);
      add(G, new THREE.ConeGeometry(w * 1.25 * S, h * 0.45 * S, 10), x, 0.18 + h + h * 0.22, z);
      add(G, new THREE.TorusGeometry(w * 1.08 * S, 0.004 * S, 4, 16).rotateX(Math.PI / 2), x, 0.18 + h * 0.8, z);
      for (let k = 0; k < 3; k++) add(W, new THREE.BoxGeometry(0.008 * S, 0.02 * S, 0.008 * S), x + Math.cos(a) * w * 0.9, 0.2 + h * (0.3 + k * 0.2), z + Math.sin(a) * w * 0.9);
    }
    // arched bridges reaching off the edge
    for (let i = 0; i < 2; i++) { const a = rnd() * 6.28; add(P, new THREE.TorusGeometry(0.22 * S, 0.012 * S, 6, 24, Math.PI), Math.cos(a) * 0.7, 0.04, Math.sin(a) * 0.7, a); }
    const mk = (arr, mat) => { const g = mergeGeometries(arr.map((q) => { if (q.attributes.normal) q.deleteAttribute('normal'); return q; })); g.computeVertexNormals(); const m = new THREE.Mesh(g, mat); m.frustumCulled = false; group.add(m); };
    mk(G, gold); mk(P, pale); mk(W, lamps);
  }
  const FAR = [
    { x: -390, y: -10, z: -720, r: 70, seed: 21 }, { x: 430, y: 6, z: -840, r: 84, seed: 22 },
    { x: -660, y: -30, z: -420, r: 58, seed: 23 }, { x: 700, y: -40, z: -360, r: 60, seed: 24 },
    { x: 60, y: 20, z: -1250, r: 95, seed: 25 },
  ];
  FAR.forEach((o) => {
    const m = island({ ...o, detail: 72, trees: 0.08, flat: 0.7 });
    const top = o.y + o.r * 0.7 * 0.22;
    citadel(o.x, top, o.z, o.r * 0.95, o.seed);
  });

  // build the foliage (instanced): trees, bushes, hanging greenery — tinted per instance for natural variation
  const plant = (geo, mat, list, mk) => {
    if (!list.length) return;
    const im = new THREE.InstancedMesh(geo, mat, list.length), mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color(), e = new THREE.Euler();
    const cell = new Float32Array(list.length);
    list.forEach((it, i) => { const [pos, rot, sc, c, k] = mk(it); q.setFromEuler(e.set(rot[0], rot[1], rot[2])); mtx.compose(pos, q, sc); im.setMatrixAt(i, mtx); im.setColorAt(i, c); cell[i] = k; });
    geo.setAttribute('aCell', new THREE.InstancedBufferAttribute(cell, 1));
    im.frustumCulled = false; group.add(im);
  };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  plant(treeGeo, treeMat, spots.tree, ([x, y, z, s, h]) => [V(x, y, z), [0, h * 6.28, 0], V(s * (0.85 + h * 0.3), s, s * (0.85 + h * 0.3)), new THREE.Color().setHSL(0.24 + h * 0.08, 0.35 + h * 0.2, 0.42 + h * 0.18), Math.floor(h * 4) % 4]);
  plant(bushGeo, bushMat, spots.bush, ([x, y, z, s, h]) => [V(x, y, z), [0, h * 6.28, 0], V(s, s * 0.8, s), new THREE.Color().setHSL(0.23 + h * 0.07, 0.4, 0.4 + h * 0.2), 0]);
  plant(vineGeo, vineMat, spots.vine, ([x, y, z, s, a]) => [V(x, y, z), [0, a, 0], V(s * 0.8, s * 1.6, s), new THREE.Color().setHSL(0.25, 0.35, 0.38), 0]);

  // ================================================================ waterfalls
  const fallU = { uTime: { value: 0 } };
  const fallMat = new THREE.ShaderMaterial({
    uniforms: fallU, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: `varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `uniform float uTime; varying vec2 vUv; varying vec3 vW;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      void main(){
        float x = vUv.x, y = vUv.y;                       // y: 1 at the lip, 0 at the bottom
        float streak = n(vec2(x * 14.0, y * 2.0 + uTime * 1.8)) * 0.55 + n(vec2(x * 40.0, y * 6.0 + uTime * 3.0)) * 0.45;
        float sheet = smoothstep(0.0, 0.3, x) * smoothstep(1.0, 0.7, x);                     // soft, uneven edges
        sheet *= 0.6 + 0.4 * n(vec2(x * 5.0, uTime * 0.5));
        float spread = mix(1.0, 0.5, 1.0 - y);                                                   // breaks up as it falls
        float a = sheet * (0.25 + streak * 0.75) * smoothstep(0.0, 0.6, y) * spread;
        float d = length(vW - cameraPosition);
        vec3 c = mix(vec3(0.42, 0.55, 0.68), vec3(0.86, 0.92, 0.98), streak);
        gl_FragColor = vec4(c, a * 0.55 * (0.35 + 0.65 * exp(-d * 0.003)));
      }`,
  });
  shaderMats.push(fallMat);
  const mistTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,.9)'); r.addColorStop(0.4, 'rgba(220,235,255,.35)'); r.addColorStop(1, 'rgba(200,220,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); return t; })();
  const mistMat = new THREE.SpriteMaterial({ map: mistTex, color: 0xa9bed6, transparent: true, depthWrite: false, opacity: 0.32, fog: false });
  for (const f of waterfalls) {
    const g = new THREE.PlaneGeometry(f.w, f.h, 1, 1); g.translate(0, -f.h / 2, 0);
    const m = new THREE.Mesh(g, fallMat);
    m.position.copy(f.at).addScaledVector(f.out, 0.3);
    m.lookAt(m.position.clone().add(f.out)); m.rotateY(0);
    m.renderOrder = 5; group.add(m);
    for (const [dy, s] of [[-f.h * 0.98, f.w * 4], [-0.2, f.w * 1.6]]) { const sp = new THREE.Sprite(mistMat); sp.position.copy(m.position).add(new THREE.Vector3(0, dy, 0)); sp.scale.set(s, s * 0.6, 1); sp.renderOrder = 6; group.add(sp); }
  }

  // ================================================================ the sea of mist below, and the warm horizon
  const seaU = { uTime: { value: 0 }, uSun: { value: SUN }, uCol: { value: HAZE.col }, uWarm: { value: HAZE.warm } };
  const seaMat = new THREE.ShaderMaterial({
    uniforms: seaU, transparent: true, depthWrite: false,
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `uniform float uTime; uniform vec3 uSun, uCol, uWarm; varying vec3 vW;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += n(p) * a; p *= 2.03; a *= 0.5; } return s; }
      void main(){
        vec2 p = vW.xz * 0.012 + vec2(uTime * 0.01, uTime * 0.006);
        float c = fbm(p) * 0.7 + fbm(p * 2.7 - uTime * 0.02) * 0.3;
        vec3 vd = normalize(vW - cameraPosition);
        float sunf = pow(max(dot(vd, uSun), 0.0), 4.0);
        vec3 col = mix(uCol * 1.6, uWarm * 0.9, sunf * 0.7) * (0.5 + c * 0.9);
        float d = length(vW - cameraPosition);
        // soft cloud banks only: fade with distance and at grazing angles so there is no hard horizon
        float fadeD = 1.0 - smoothstep(220.0, 1300.0, d);
        float graze = smoothstep(0.03, 0.3, abs(vd.y));
        float a = smoothstep(0.38, 0.82, c) * 0.7 * fadeD * graze;
        gl_FragColor = vec4(col, clamp(a, 0.0, 0.8));
      }`,
  });
  shaderMats.push(seaMat);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(7000, 7000, 1, 1).rotateX(-Math.PI / 2), seaMat);
  sea.position.y = -105; sea.renderOrder = -1; sea.frustumCulled = false;
  group.add(sea);
  const glowTex = (() => {   // a soft elliptical glow that fades to nothing at every edge
    const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d');
    g.save(); g.translate(256, 150); g.scale(1, 0.42);
    const r = g.createRadialGradient(0, 0, 0, 0, 0, 250);
    r.addColorStop(0, 'rgba(255,214,150,1)'); r.addColorStop(0.22, 'rgba(255,170,110,.5)'); r.addColorStop(0.55, 'rgba(120,150,220,.14)'); r.addColorStop(1, 'rgba(60,90,160,0)');
    g.fillStyle = r; g.beginPath(); g.arc(0, 0, 250, 0, 7); g.fill(); g.restore();
    return new THREE.CanvasTexture(c);
  })();
  const horizon = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.85, fog: false }));
  horizon.position.copy(SUN).multiplyScalar(2600).setY(-60); horizon.scale.set(4200, 1500, 1); horizon.renderOrder = -2;
  group.add(horizon);

  // ================================================================ light for this realm
  const sun = new THREE.DirectionalLight(0xffb27a, 2.3); sun.position.copy(SUN).multiplyScalar(100);   // from the low sun behind the far end: rim light
  const sky = new THREE.HemisphereLight(0x5b7cb4, 0x0b1424, 0.65);
  group.add(sun, sky);

  return {
    group, stdMats, shaderMats, sun, sky, horizon,
    update(t) { glowU.uTime.value = t; fallU.uTime.value = t; seaU.uTime.value = t; },
  };
}
