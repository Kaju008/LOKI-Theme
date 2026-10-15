import * as THREE from 'three';
import { makeNoise } from '../core/glsl.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Rock geometry: noise-displaced icosphere with baked vertex colour variation
export function rockGeometry(seed = 1, detail = 3, rough = 0.35, stretch = [1, 1, 1]) {
  const n = makeNoise(seed);
  let g = new THREE.IcosahedronGeometry(1, detail);
  g.deleteAttribute('normal'); g.deleteAttribute('uv');
  g = mergeVertices(g, 1e-4);
  const p = g.attributes.position, col = new Float32Array(p.count * 3), v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const ridge = 1 - Math.abs(n(v.x * 3.1 + 7, v.y * 3.1, v.z * 3.1));
    const d = 1 + n.fbm(v.x * 1.4 + seed, v.y * 1.4, v.z * 1.4, 6) * rough + ridge * ridge * 0.07 + Math.abs(n(v.x * 9, v.y * 9, v.z * 9)) * -0.035;
    v.multiplyScalar(d);
    v.set(v.x * stretch[0], v.y * stretch[1], v.z * stretch[2]);
    p.setXYZ(i, v.x, v.y, v.z);
    const c = 0.55 + n(v.x * 3 + 9, v.y * 3, v.z * 3) * 0.35;
    col.set([c * 0.92, c * 0.95, c], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

export const rockMaterial = (opts = {}) => new THREE.MeshStandardMaterial({
  color: opts.color ?? 0x3a3f4a, roughness: 0.92, metalness: 0.08, vertexColors: true, envMapIntensity: 0.6, ...opts,
});

export function createAsteroids(tier, yRange = [-60, 700], mat = null) {
  const N = tier.asteroids;
  const d = tier.mobile ? 4 : 5;
  const geos = [rockGeometry(3, d, 0.42), rockGeometry(11, d, 0.55, [1.4, 0.8, 1]), rockGeometry(23, d, 0.38, [1, 1.3, 0.9])];
  mat = mat || rockMaterial({ color: 0x4a4f5c });
  const group = new THREE.Group();
  const data = [];
  const dummy = new THREE.Object3D();
  geos.forEach((g, gi) => {
    const count = Math.ceil(N / 3);
    const inst = new THREE.InstancedMesh(g, mat, count);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 60 + Math.pow(Math.random(), 0.7) * 280;
      const d = {
        inst, i,
        p: new THREE.Vector3(Math.cos(a) * r, THREE.MathUtils.lerp(yRange[0], yRange[1], Math.random()), Math.sin(a) * r - 80),
        s: Math.pow(Math.random(), 3) * 6 + 0.35,
        r: new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6),
        w: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(0.3),
        drift: new THREE.Vector3((Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.12, (Math.random() - 0.5) * 0.4),
      };
      data.push(d);
    }
    group.add(inst);
  });
  const tmp = new THREE.Vector3();
  function update(t, dt) {
    for (const d of data) {
      tmp.copy(d.p).addScaledVector(d.drift, t);
      dummy.position.copy(tmp);
      dummy.rotation.set(d.r.x + d.w.x * t, d.r.y + d.w.y * t, d.r.z + d.w.z * t);
      dummy.scale.setScalar(d.s);
      dummy.updateMatrix();
      d.inst.setMatrixAt(d.i, dummy.matrix);
    }
    group.children.forEach((c) => (c.instanceMatrix.needsUpdate = true));
  }
  return { group, update };
}

// Fast tiny asteroids streaking like shooting stars
export function createShootingStars(count = 14) {
  const group = new THREE.Group();
  const geo = new THREE.PlaneGeometry(1, 1);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uC: { value: new THREE.Color(1, 1, 1) } },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
    fragmentShader: `varying vec2 vUv; void main(){ float head = smoothstep(0.0,1.0,vUv.x); float w = smoothstep(0.5,0.0,abs(vUv.y-0.5));
      float a = pow(head,2.2)*w*w; vec3 c = mix(vec3(0.4,0.7,1.0), vec3(1.0,0.95,0.85), pow(head,6.0)); gl_FragColor=vec4(c*a*2.2,1.0);} `,
  });
  const stars = [];
  for (let i = 0; i < count; i++) {
    const m = new THREE.Mesh(geo, mat);
    m.frustumCulled = false;
    group.add(m);
    stars.push({ m, life: Math.random() * 6, dur: 1, from: new THREE.Vector3(), dir: new THREE.Vector3(), len: 1 });
  }
  const look = new THREE.Vector3();
  function spawn(s, cam) {
    const base = cam.position;
    s.from.set(base.x + (Math.random() - 0.5) * 500, base.y + 40 + Math.random() * 160, base.z - 150 - Math.random() * 450);
    s.dir.set(Math.random() < 0.5 ? -1 : 1, -0.35 - Math.random() * 0.4, (Math.random() - 0.5) * 0.4).normalize();
    s.speed = 160 + Math.random() * 240; s.len = 18 + Math.random() * 36; s.dur = 0.8 + Math.random() * 1.4; s.life = 0;
    s.wait = Math.random() * 5;
  }
  function update(t, dt, cam) {
    for (const s of stars) {
      if (s.wait > 0) { s.wait -= dt; s.m.visible = false; continue; }
      s.life += dt;
      if (s.life > s.dur || !s.speed) { spawn(s, cam); continue; }
      s.m.visible = true;
      const p = s.from.clone().addScaledVector(s.dir, s.speed * s.life);
      s.m.position.copy(p);
      // orient plane along direction, facing camera
      look.copy(cam.position).sub(p).normalize();
      const x = s.dir.clone(), z = look.clone().sub(x.clone().multiplyScalar(look.dot(x))).normalize(), y = z.clone().cross(x);
      s.m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
      const fade = Math.sin(Math.min(1, s.life / s.dur) * Math.PI);
      s.m.scale.set(s.len * fade + 0.01, 0.55, 1);
    }
  }
  return { group, update };
}

// Drifting glowing dust motes around the camera
export function createMotes(tier, texture) {
  const N = tier.mobile ? 300 : 800;
  const pos = new Float32Array(N * 3), seed = new Float32Array(N);
  for (let i = 0; i < N; i++) { pos.set([(Math.random() - 0.5) * 120, (Math.random() - 0.5) * 70, (Math.random() - 0.5) * 120], i * 3); seed[i] = Math.random(); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const u = { uTime: { value: 0 }, uCam: { value: new THREE.Vector3() }, uPR: { value: tier.dpr } };
  const m = new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `uniform float uTime,uPR; uniform vec3 uCam; attribute float aSeed; varying float vA; varying float vS;
      void main(){ vec3 p = position + vec3(sin(uTime*0.1+aSeed*30.0)*2.0, uTime*(0.1+aSeed*0.15), cos(uTime*0.08+aSeed*20.0)*2.0);
        vec3 box = vec3(120.0,70.0,120.0); p = uCam + mod(p - uCam + box*0.5, box) - box*0.5;
        vec4 mv = viewMatrix*vec4(p,1.0); float d=-mv.z; vA = smoothstep(1.0,6.0,d)*smoothstep(60.0,20.0,d); vS=aSeed;
        gl_PointSize = uPR*(1.5+aSeed*3.5)*(28.0/max(d,1.0)); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `varying float vA; varying float vS; void main(){ float d=length(gl_PointCoord-0.5); float a=smoothstep(0.5,0.0,d);
      vec3 c = mix(vec3(0.75,0.85,1.0), vec3(1.0,0.92,0.8), vS); gl_FragColor=vec4(c*a*a*vA*0.35,1.0);} `,
  });
  const pts = new THREE.Points(g, m);
  pts.frustumCulled = false;
  return { object: pts, uniforms: u };
}

// Soft volumetric fog cards
export function createFogCards(texture, spots, tint = 0x5a7fa8) {
  const group = new THREE.Group();
  const mats = [];
  for (const s of spots) {
    const mat = new THREE.SpriteMaterial({ map: texture, color: s.color ?? tint, transparent: true, opacity: (s.o ?? 0.12) * 0.4, depthWrite: false, blending: THREE.AdditiveBlending });
    const sp = new THREE.Sprite(mat);
    sp.position.set(...s.p);
    sp.scale.set(s.s, s.s * (s.h ?? 0.45), 1);
    sp.userData = { base: sp.position.clone(), sp: Math.random() * 0.2 + 0.05, ph: Math.random() * 6 };
    mats.push(mat);
    group.add(sp);
  }
  return {
    group,
    update(t) { for (const c of group.children) { const u = c.userData; c.position.x = u.base.x + Math.sin(t * u.sp + u.ph) * 6; c.material.rotation = Math.sin(t * u.sp * 0.5 + u.ph) * 0.2; } },
  };
}

export function makeFogTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  const n = makeNoise(5);
  const img = g.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const dx = (x - 128) / 128, dy = (y - 128) / 128;
    const r = Math.sqrt(dx * dx + dy * dy);
    const fall = Math.max(0, 1 - r);
    const v = Math.max(0, Math.min(1, (n.fbm(x / 50, y / 50, 0.5, 5) * 0.9 + 0.55))) * fall * fall;
    const i = (y * 256 + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = 255; img.data[i + 3] = v * 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
