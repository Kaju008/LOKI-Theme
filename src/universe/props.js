import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

const draco = new DRACOLoader().setDecoderPath('js/draco/');
const gltf = new GLTFLoader().setDRACOLoader(draco);

// ---------------------------------------------------------------------
// The throne — decimated from the Blender sculpt, with its stone, the
// knotwork carving and KAJU baked into a projection atlas (colour +
// object-space normals).
// ---------------------------------------------------------------------
export async function createThrone({ env, tier, base = 'assets/universe/' }) {
  const [g, nrm] = await Promise.all([gltf.loadAsync(base + 'throne.glb'), new THREE.TextureLoader().loadAsync(base + 'throne_nrm.webp')]);
  const mesh = g.scene.getObjectByProperty('isMesh', true);
  nrm.flipY = false; nrm.colorSpace = THREE.NoColorSpace; nrm.anisotropy = 8;
  const old = mesh.material;
  if (old.map) { old.map.anisotropy = 8; old.map.colorSpace = THREE.SRGBColorSpace; }
  mesh.material = new THREE.MeshStandardMaterial({
    map: old.map, normalMap: nrm, normalMapType: THREE.ObjectSpaceNormalMap,
    roughness: 0.82, metalness: 0.0, envMap: env, envMapIntensity: 0.55, color: new THREE.Color(1.08, 1.04, 1.0),
  });
  mesh.castShadow = false; mesh.receiveShadow = false;
  const group = new THREE.Group(); group.add(g.scene);
  const box = new THREE.Box3().setFromObject(g.scene);
  return { group, mesh, box, top: box.max.y };
}

// ---------------------------------------------------------------------
// Asteroids — real Poly Haven rock scans with faint glowing mineral
// pockets. Draggable and throwable; they drift home when left alone.
// ---------------------------------------------------------------------
const POCKETS = /* glsl */ `
float h3(vec3 p){ p=fract(p*0.3183099+0.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float n3(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z); }`;

export async function createRocks({ env, tier, base = 'assets/universe/' }) {
  const g = await gltf.loadAsync(base + 'rocks.glb');
  const src = [];
  g.scene.traverse((o) => { if (o.isMesh) src.push(o); });
  const group = new THREE.Group();
  const rocks = [];
  const glowU = { uTime: { value: 0 } };
  const mk = (s, seed, glow, amber) => {
    const m = s.material.clone();
    m.envMap = env; m.envMapIntensity = 0.35; m.roughness = 0.9;
    if (m.map) m.map.colorSpace = THREE.SRGBColorSpace;
    m.color = new THREE.Color(0.62, 0.66, 0.74);
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = glowU.uTime; sh.uniforms.uSeed = { value: seed }; sh.uniforms.uGlowK = { value: glow }; sh.uniforms.uAmber = { value: amber };
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vOP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvOP=position;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vOP; uniform float uTime,uSeed,uGlowK,uAmber;\n${POCKETS}`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          { vec3 q=vOP*2.2+uSeed*13.0; float big=n3(q*0.7); float vein=1.0-abs(n3(q*2.1)*2.0-1.0);
            float m=smoothstep(0.62,0.82,big)*pow(vein,6.0);
            float fine=smoothstep(0.86,0.97,n3(q*4.3+3.0));
            vec3 c=mix(vec3(0.0,1.0,0.72), vec3(0.0,0.75,1.0), n3(q*0.5));
            c=mix(c, vec3(1.0,0.78,0.2), uAmber*smoothstep(0.55,0.7,n3(q*1.3+9.0)));
            float pulse=0.8+0.2*sin(uTime*1.3+uSeed*20.0);
            totalEmissiveRadiance += c*(m*2.4+fine*m*3.0+fine*0.25)*uGlowK*pulse; }`);
    };
    return m;
  };
  // layout around the throne & tree (three.js coords)
  const L = [
    [0, [-13, 9.5, -14], 1.3, 1.0, 0], [1, [-9.5, 5.6, -4], 0.75, 0.9, 0], [2, [-19, 13, -26], 1.9, 1.0, 0.3], [3, [-6.8, 3.4, 9], 0.32, 0.3, 0],
    [1, [12.5, 6.4, -6], 1.15, 1.0, 0.6], [3, [8, 8.8, -12], 0.42, 0.6, 1], [0, [18, 10.5, -22], 1.6, 1.0, 0.4], [2, [24, 3, -8], 0.9, 0.7, 0],
    [3, [-26, 2, 2], 0.7, 0.5, 0], [1, [30, 15, -40], 2.6, 0.8, 0.3], [2, [-38, 18, -48], 3.2, 0.8, 0], [0, [-4, 14, 14], 0.22, 0.0, 0],
    [3, [5.5, 12.5, 6], 0.18, 0.0, 0], [1, [-15, 22, -2], 0.45, 0.4, 0],
  ];
  // a wider field drifting beside the bridge, around the fork and down into the clouds
  // (kept clear of the camera's flight path along the middle)
  let sd = 11; const R = () => ((sd = (sd * 1664525 + 1013904223) >>> 0) / 4294967296);
  const extra = tier.mobile ? 14 : 28;
  for (let i = 0, tries = 0; i < extra && tries < 400; tries++) {
    const side = R() < 0.5 ? -1 : 1;
    const x = side * (16 + R() * 60), y = -14 + R() * 44, z = 70 - R() * 190;
    if (Math.abs(x) < 20 && y > -2 && z > -60 && z < 50) continue;     // stay out of the story camera's way
    const far = Math.abs(x) > 40 || y < -4;
    L.push([i % 4, [x, y, z], far ? 1.4 + R() * 3.2 : 0.35 + R() * 1.4, R() < 0.55 ? 0.5 + R() * 0.5 : 0.1, R() < 0.3 ? 0.6 : 0]);
    i++;
  }
  L.forEach(([k, p, s, glow, amber], i) => {
    const sm = src[k % src.length];
    const mesh = new THREE.Mesh(sm.geometry, mk(sm, i * 0.37 + 0.1, glow, amber));
    mesh.scale.setScalar(s);
    mesh.position.set(...p);
    mesh.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    group.add(mesh);
    sm.geometry.computeBoundingSphere();
    rocks.push({
      mesh, r: sm.geometry.boundingSphere.radius * s, home: mesh.position.clone(), vel: new THREE.Vector3(), spin: new THREE.Vector3((Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.25, (Math.random() - 0.5) * 0.2),
      drag: false, idle: 99, ph: Math.random() * 6.28, hover: 0,
    });
  });
  const tmp = new THREE.Vector3();
  return {
    group, rocks,
    update(t, dt) {
      glowU.uTime.value = t;
      for (const r of rocks) {
        const m = r.mesh;
        if (!r.drag) {
          r.idle += dt;
          m.position.addScaledVector(r.vel, dt);
          r.vel.multiplyScalar(Math.pow(0.45, dt));
          if (r.idle > 3.5) { tmp.subVectors(r.home, m.position); r.vel.addScaledVector(tmp, dt * 0.35); }
          m.position.y += Math.sin(t * 0.5 + r.ph) * 0.0025;
        }
        m.rotation.x += r.spin.x * dt; m.rotation.y += r.spin.y * dt; m.rotation.z += r.spin.z * dt;
        r.spin.multiplyScalar(Math.pow(0.97, dt));
        if (r.spin.length() < 0.08) r.spin.multiplyScalar(1.02);
      }
    },
  };
}
