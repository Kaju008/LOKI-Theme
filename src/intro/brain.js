import * as THREE from 'three';
import { NOISE, makeNoise } from '../core/glsl.js';

// ---------------------------------------------------------------------
// Procedural particle brain: folded cortex, cerebellum, stem, dendrites.
// ---------------------------------------------------------------------
function sampleBrain(N) {
  const n = makeNoise(7);
  const rnd = n.rnd;
  const brain = new Float32Array(N * 3);
  const fold = new Float32Array(N);
  let i = 0, guard = 0;
  const v = new THREE.Vector3();

  const put = (x, y, z, f) => { brain[i * 3] = x; brain[i * 3 + 1] = y; brain[i * 3 + 2] = z; fold[i] = f; i++; };

  const nCortex = Math.floor(N * 0.8), nCereb = Math.floor(N * 0.11), nStem = Math.floor(N * 0.03);
  // Cortex
  while (i < nCortex && guard++ < N * 12) {
    v.set(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1);
    if (v.lengthSq() > 1 || v.lengthSq() < 1e-4) continue;
    v.normalize();
    let x = v.x * 0.74, y = v.y * 0.6, z = v.z * 0.98;
    if (y < 0) { y *= 0.72; }                              // flatter base
    const side = Math.sign(x) || 1;
    const fissure = Math.exp(-((x / 0.07) ** 2)) * THREE.MathUtils.smoothstep(y, -0.15, 0.45);
    // temporal lobes
    if (y < 0.05 && Math.abs(z) < 0.55) { x += side * 0.06 * (1 - Math.abs(z) / 0.55); }
    const ridged = 1 - Math.abs(n.fbm(x * 3.4 + 11, y * 3.4, z * 3.4, 3) * 1.8);
    const f = THREE.MathUtils.clamp(ridged, 0, 1);
    const r = 1 + 0.075 * (f * f - 0.45) - 0.16 * fissure;
    x *= r; y *= r; z *= r;
    if (fissure > 0.6) x *= 1 + 0.25 * fissure;          // split hemispheres
    if (rnd() > 0.28 + 0.72 * f * f * f) continue;         // denser on ridges → visible grooves
    const shell = 1 - rnd() * 0.035;
    put(x * shell, y * shell + 0.06, z * shell, f);
  }
  // Cerebellum
  const target2 = i + nCereb;
  while (i < target2 && guard++ < N * 20) {
    v.set(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1);
    if (v.lengthSq() > 1 || v.lengthSq() < 1e-4) continue;
    v.normalize();
    const x = v.x * 0.5, y = v.y * 0.21 - 0.36, z = v.z * 0.3 - 0.58;
    const f = 0.5 + 0.5 * Math.sin(y * 95 + n(x * 6, y * 6, z * 6) * 3);
    if (rnd() > 0.35 + 0.65 * f) continue;
    put(x, y, z, f * 0.9);
  }
  // Stem
  const target3 = i + nStem;
  while (i < target3) {
    const t = rnd(), a = rnd() * Math.PI * 2, rr = 0.09 + 0.03 * (1 - t);
    put(Math.cos(a) * rr, -0.3 - t * 0.62, -0.28 - t * 0.08 + Math.sin(a) * rr, 0.6);
  }
  // Interior glow (sparse volume)
  while (i < N) {
    v.set(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1);
    if (v.lengthSq() > 1) continue;
    put(v.x * 0.62, v.y * 0.48 + 0.04, v.z * 0.85, 0.15);
  }
  return { brain, fold, rnd };
}

function buildDendrites(brain, count, rnd) {
  // Branching filaments hugging the cortex surface (fractal look)
  const segs = [];
  const tmp = new THREE.Vector3(), dir = new THREE.Vector3(), nrm = new THREE.Vector3();
  const total = brain.length / 3;
  function grow(p, d, len, depth) {
    if (depth > 3) return;
    const q = p.clone().addScaledVector(d, len);
    // pull back onto approx. surface
    nrm.copy(q).normalize();
    const surf = p.length();
    q.setLength(THREE.MathUtils.lerp(q.length(), surf, 0.7));
    segs.push(p.x, p.y, p.z, q.x, q.y, q.z, depth);
    const kids = depth === 0 ? 3 : 2;
    for (let k = 0; k < kids; k++) {
      dir.copy(d).add(tmp.set(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(1.4)).normalize();
      grow(q, dir.clone(), len * (0.6 + rnd() * 0.25), depth + 1);
    }
  }
  for (let s = 0; s < count; s++) {
    const idx = Math.floor(rnd() * total * 0.8);
    const p = new THREE.Vector3(brain[idx * 3], brain[idx * 3 + 1], brain[idx * 3 + 2]);
    nrm.copy(p).normalize();
    dir.set(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).cross(nrm).normalize();
    grow(p, dir.clone(), 0.07 + rnd() * 0.07, 0);
  }
  const n = segs.length / 7;
  const pos = new Float32Array(n * 6), along = new Float32Array(n * 2), seed = new Float32Array(n * 2);
  for (let k = 0; k < n; k++) {
    pos.set(segs.slice(k * 7, k * 7 + 6), k * 6);
    along[k * 2] = segs[k * 7 + 6] / 4; along[k * 2 + 1] = (segs[k * 7 + 6] + 1) / 4;
    seed[k * 2] = seed[k * 2 + 1] = rnd();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aAlong', new THREE.BufferAttribute(along, 1));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  return g;
}

export function createIntro(tier) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x010206);
  const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.01, 200);
  camera.position.set(0, 0.05, 7.5);

  const N = tier.brain;
  const { brain, fold, rnd } = sampleBrain(N);
  const start = new Float32Array(N * 3), burst = new Float32Array(N * 3), rand = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) {
    // start: wide drifting dust cloud
    const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, rr = 2.2 + Math.pow(rnd(), 0.6) * 9;
    const s = Math.sqrt(1 - u * u);
    start[i * 3] = Math.cos(th) * s * rr; start[i * 3 + 1] = u * rr * 0.6; start[i * 3 + 2] = Math.sin(th) * s * rr - 2;
    const bx = brain[i * 3], by = brain[i * 3 + 1], bz = brain[i * 3 + 2];
    const bl = Math.hypot(bx, by, bz) || 1, f = 2.5 + Math.pow(rnd(), 2) * 14;
    burst[i * 3] = (bx / bl) * f + (rnd() - 0.5) * 2; burst[i * 3 + 1] = (by / bl) * f + (rnd() - 0.5) * 2; burst[i * 3 + 2] = (bz / bl) * f + (rnd() - 0.5) * 2 + 3;
    rand[i * 4] = rnd(); rand[i * 4 + 1] = rnd(); rand[i * 4 + 2] = rnd(); rand[i * 4 + 3] = rnd();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(brain, 3));
  geo.setAttribute('aStart', new THREE.BufferAttribute(start, 3));
  geo.setAttribute('aBurst', new THREE.BufferAttribute(burst, 3));
  geo.setAttribute('aRand', new THREE.BufferAttribute(rand, 4));
  geo.setAttribute('aFold', new THREE.BufferAttribute(fold, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 30);

  const uniforms = {
    uTime: { value: 0 }, uForm: { value: 0 }, uBurst: { value: 0 }, uDust: { value: 1 },
    uMouse: { value: new THREE.Vector3(99, 99, 99) }, uMouseF: { value: 0 },
    uSize: { value: tier.mobile ? 1.35 : 1.1 }, uPR: { value: tier.dpr },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      ${NOISE}
      uniform float uTime,uForm,uBurst,uDust,uSize,uPR,uMouseF; uniform vec3 uMouse;
      attribute vec3 aStart,aBurst; attribute vec4 aRand; attribute float aFold;
      varying vec3 vCol; varying float vA;
      void main(){
        float t = clamp(uForm*1.45 - aRand.x*0.45, 0.0, 1.0); t = t*t*(3.0-2.0*t);
        vec3 dust = aStart + vec3(sin(uTime*0.13+aRand.y*6.28), cos(uTime*0.11+aRand.z*6.28), sin(uTime*0.09+aRand.x*6.28))*0.35;
        vec3 b = position;
        vec3 nrm = normalize(b+1e-4);
        b += nrm * snoise(b*2.6 + vec3(uTime*0.35)) * 0.035;           // fractal shimmer
        vec3 p = mix(dust, b, t);
        // swirl while forming
        if (uForm < 0.999) { float sw = (1.0-t)*t*4.0; p += curl(p*0.6 + uTime*0.1) * sw * 0.18; }
        vec4 wp = modelMatrix * vec4(p,1.0);
        // burst
        float bb = pow(uBurst, 1.6);
        vec3 bp = (modelMatrix*vec4(aBurst,0.0)).xyz;
        if (uBurst > 0.0) { wp.xyz += bp * bb * (0.7 + aRand.w) + curl(wp.xyz*0.35 + uTime*0.2) * bb * 1.4; }
        // mouse repel
        vec3 d = wp.xyz - uMouse; float m = smoothstep(0.75, 0.0, length(d)) * uMouseF * (1.0-uBurst);
        wp.xyz += normalize(d+1e-4) * m * 0.42;
        vec4 mv = viewMatrix * wp;
        float sz = uSize * uPR * (0.45 + aRand.z*0.95) * (10.0 / max(0.15,-mv.z));
        gl_PointSize = min(sz * (1.0 + bb*0.6), 48.0);
        gl_Position = projectionMatrix * mv;
        // colour: neon green -> cyan, pulses travelling across the cortex
        vec3 g = vec3(0.10,1.0,0.55), c = vec3(0.12,0.85,1.0), v = vec3(0.62,0.38,1.0), a = vec3(1.0,0.62,0.25);
        vec3 col = mix(g, c, smoothstep(0.2,0.9,aRand.w));
        if (aRand.y > 0.965) col = mix(v, a, step(0.985, aRand.y));
        float wave = smoothstep(0.86, 1.0, sin(dot(position, normalize(vec3(0.3,0.9,0.4)))*7.0 - uTime*2.4 + aRand.x*0.6));
        float lit = (0.28 + 0.95*aFold) * t + 0.4*(1.0-t);
        col = col*lit + vec3(0.75,1.0,0.95)*wave*t*0.9 + vec3(m*1.5);
        col = mix(col, mix(col, vec3(0.6,0.7,1.0), 0.4), bb);
        vCol = col;
        vA = mix(0.55*uDust, 1.0, t) * (1.0 - smoothstep(0.75,1.0,uBurst)*0.6) * smoothstep(0.08, 0.6, -mv.z);
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vCol; varying float vA;
      void main(){ vec2 c=gl_PointCoord-0.5; float d=length(c); if(d>0.5) discard;
        float a = smoothstep(0.5,0.0,d); a = a*a; gl_FragColor = vec4(vCol*a*vA, 1.0); }`,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  const brainGroup = new THREE.Group();
  brainGroup.add(points);
  scene.add(brainGroup);

  // Dendrites (fractal filaments)
  const dGeo = buildDendrites(brain, tier.mobile ? 260 : 520, rnd);
  const dUni = { uTime: uniforms.uTime, uForm: uniforms.uForm, uBurst: uniforms.uBurst };
  const dMat = new THREE.ShaderMaterial({
    uniforms: dUni, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute float aAlong,aSeed; varying float vAlong,vSeed; void main(){ vAlong=aAlong; vSeed=aSeed; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
    fragmentShader: `uniform float uTime,uForm,uBurst; varying float vAlong,vSeed;
      void main(){ float pulse = smoothstep(0.12,0.0,abs(fract(uTime*0.35+vSeed)-vAlong));
        float vis = smoothstep(0.75,1.0,uForm)*(1.0-uBurst);
        vec3 col = mix(vec3(0.1,1.0,0.6), vec3(0.4,0.9,1.0), vSeed);
        gl_FragColor = vec4(col*(0.10+pulse*1.6)*vis, 1.0); }`,
  });
  const dendrites = new THREE.LineSegments(dGeo, dMat);
  brainGroup.add(dendrites);

  // Warp streaks (hyperspace)
  const W = tier.mobile ? 900 : 2200;
  const wPos = new Float32Array(W * 2 * 3), wEnd = new Float32Array(W * 2), wSeed = new Float32Array(W * 2);
  for (let k = 0; k < W; k++) {
    const a = rnd() * Math.PI * 2, r = 0.4 + Math.pow(rnd(), 0.5) * 7, z = -rnd() * 120;
    for (let e = 0; e < 2; e++) {
      wPos.set([Math.cos(a) * r, Math.sin(a) * r, z], (k * 2 + e) * 3);
      wEnd[k * 2 + e] = e; wSeed[k * 2 + e] = rnd();
    }
  }
  const wGeo = new THREE.BufferGeometry();
  wGeo.setAttribute('position', new THREE.BufferAttribute(wPos, 3));
  wGeo.setAttribute('aEnd', new THREE.BufferAttribute(wEnd, 1));
  wGeo.setAttribute('aSeed', new THREE.BufferAttribute(wSeed, 1));
  const wUni = { uWarp: { value: 0 }, uTime: uniforms.uTime, uCamZ: { value: 0 } };
  const wMat = new THREE.ShaderMaterial({
    uniforms: wUni, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `uniform float uWarp,uTime,uCamZ; attribute float aEnd,aSeed; varying float vA; varying float vSeed;
      void main(){ vec3 p=position; float sp = 40.0 + aSeed*80.0;
        p.z = uCamZ - 2.0 - mod(-p.z + uTime*sp*uWarp*1.5, 120.0);
        p.z += aEnd * (0.2 + uWarp*uWarp*(6.0+aSeed*14.0));
        vA = aEnd * smoothstep(-120.0, -20.0, p.z - uCamZ) ; vSeed=aSeed;
        gl_Position = projectionMatrix*viewMatrix*vec4(p,1.0); }`,
    fragmentShader: `uniform float uWarp; varying float vA; varying float vSeed;
      void main(){ vec3 c = mix(vec3(0.45,0.75,1.0), vec3(0.3,1.0,0.7), vSeed); if (vSeed>0.9) c=vec3(0.85,0.6,1.0);
        gl_FragColor = vec4(c*vA*uWarp*1.4, 1.0); }`,
  });
  const warp = new THREE.LineSegments(wGeo, wMat);
  warp.frustumCulled = false;
  scene.add(warp);

  // mouse
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const hit = new THREE.Vector3();
  let mouseActive = false;
  function onMove(e) {
    const pt = e.touches ? e.touches[0] : e;
    ndc.set((pt.clientX / innerWidth) * 2 - 1, -(pt.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    if (ray.ray.intersectPlane(plane, hit)) { uniforms.uMouse.value.copy(hit); mouseActive = true; }
  }
  addEventListener('pointermove', onMove, { passive: true });
  addEventListener('touchmove', onMove, { passive: true });

  const state = { spin: 1 };
  function update(t, dt) {
    uniforms.uTime.value = t;
    uniforms.uMouseF.value += ((mouseActive ? 1 : 0) - uniforms.uMouseF.value) * Math.min(1, dt * 3);
    brainGroup.rotation.y = t * 0.16 * state.spin + Math.sin(t * 0.5) * 0.18;
    brainGroup.rotation.x = 0.12 + Math.sin(t * 0.37) * 0.06;
    brainGroup.rotation.z = Math.sin(t * 0.29) * 0.04;
    brainGroup.position.y = Math.sin(t * 0.8) * 0.04;
    wUni.uCamZ.value = camera.position.z;
  }
  function resize() { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
  function dispose() {
    removeEventListener('pointermove', onMove); removeEventListener('touchmove', onMove);
    geo.dispose(); mat.dispose(); dGeo.dispose(); dMat.dispose(); wGeo.dispose(); wMat.dispose();
  }
  return { scene, camera, uniforms, warp: wUni, update, resize, dispose, state };
}
