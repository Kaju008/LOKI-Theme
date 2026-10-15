import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

// ---------------------------------------------------------------------
// The Timekeeper — placeholder 3D figure (black techwear suit with white
// piping + cape). Swappable for a photoreal render via HERO in config.js.
// ---------------------------------------------------------------------
const D = THREE.MathUtils.degToRad;

// Poses are authored as bone directions in figure space (figure faces +Z,
// "Left" bones live on +X; mirrored automatically for the right side).
export const POSES = {
  seated: [
    ['Spine', 'Spine1', [0, 1, -0.1]],
    ['LeftUpLeg', 'LeftLeg', [0.1, -0.04, 1]],
    ['LeftLeg', 'LeftFoot', [0.03, -1, 0.1]],
    ['LeftFoot', 'LeftToeBase', [0.05, -0.35, 1]],
    ['LeftArm', 'LeftForeArm', [0.3, -1, -0.18]],
    ['LeftForeArm', 'LeftHand', [0.05, -0.02, 1]],
    ['LeftHand', 'LeftHandMiddle1', [0.02, -0.25, 1]],
    ['Neck', 'Head', [0, 1, 0.05]],
  ],
  standing: [
    ['Spine', 'Spine1', [0, 1, 0.02]],
    ['LeftUpLeg', 'LeftLeg', [0.07, -1, 0.01]],
    ['LeftLeg', 'LeftFoot', [0.02, -1, -0.03]],
    ['LeftArm', 'LeftForeArm', [0.24, -1, 0.02]],
    ['LeftForeArm', 'LeftHand', [0.1, -1, 0.14]],
    ['Neck', 'Head', [0, 1, 0.12]],
  ],
};
let cached = null;
export function loadFigureSource() {
  if (!cached) cached = new GLTFLoader().loadAsync('assets/models/figure.glb');
  return cached;
}

function capeMesh(env) {
  const geo = new THREE.PlaneGeometry(1.0, 1.55, 14, 28);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    const t = (0.775 - y) / 1.55;            // 0 top → 1 bottom
    p.setX(i, x * (0.62 + t * 0.75));         // flare
    p.setZ(i, -Math.pow(t, 1.6) * 0.18 - Math.abs(x) * 0.12 * (1 - t));
    p.setY(i, y - 0.775);                     // hang from top edge
  }
  geo.computeVertexNormals();
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0x07080b, roughness: 0.75, metalness: 0.05, side: THREE.DoubleSide, sheen: 1, sheenColor: new THREE.Color(0x3a4d63), sheenRoughness: 0.5, envMap: env, envMapIntensity: 0.6,
  });
  const u = { uTime: { value: 0 }, uWind: { value: 1 } };
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = u.uTime; sh.uniforms.uWind = u.uWind;
    sh.vertexShader = 'uniform float uTime; uniform float uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      float t = clamp(-position.y/1.55, 0.0, 1.0);
      float w = sin(uTime*2.1 + position.x*3.0 + t*5.0)*0.10 + sin(uTime*3.7 + t*9.0)*0.05 + sin(uTime*1.3+position.x*7.0)*0.03;
      transformed.z += -t*t*(0.25 + w*1.4)*uWind;
      transformed.x += sin(uTime*1.7 + t*6.0)*0.06*t*t*uWind;
    `);
  };
  const m = new THREE.Mesh(geo, mat);
  m.userData.u = u;
  return m;
}

export async function createFigure({ pose = 'seated', env, cape = true, height = 2.05 } = {}) {
  const src = await loadFigureSource();
  const root = SkeletonUtils.clone(src.scene);
  const suit = new THREE.MeshPhysicalMaterial({ color: 0x050608, roughness: 0.3, metalness: 0.35, clearcoat: 0.9, clearcoatRoughness: 0.2, envMap: env, envMapIntensity: 1.2 });
  const piping = new THREE.MeshPhysicalMaterial({ color: 0xe9f6ff, emissive: 0xcfeeff, emissiveIntensity: 1.25, roughness: 0.25, metalness: 0.2, envMap: env });
  root.traverse((o) => {
    if (o.isMesh || o.isSkinnedMesh) {
      o.material = /Joints/i.test(o.material.name) ? piping : suit;
      o.frustumCulled = false;
    }
  });
  // normalise height (T-pose)
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const s = height / (box.max.y - box.min.y);
  root.scale.setScalar(s);
  root.position.y = -box.min.y * s;

  const bones = {};
  root.traverse((o) => { if (o.isBone) { bones[o.name] = o; o.userData.bind = o.quaternion.clone(); } });
  const _q = new THREE.Quaternion(), _pq = new THREE.Quaternion(), _wq = new THREE.Quaternion(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _t = new THREE.Vector3();
  function aim(bone, child, dir) {
    root.updateMatrixWorld(true);
    bone.getWorldPosition(_a); child.getWorldPosition(_b);
    const cur = _b.sub(_a).normalize();
    _t.set(...dir).normalize();
    _q.setFromUnitVectors(cur, _t);
    bone.getWorldQuaternion(_wq);
    _wq.premultiply(_q);
    bone.parent.getWorldQuaternion(_pq);
    bone.quaternion.copy(_pq.invert().multiply(_wq));
  }
  function applyPose(name) {
    for (const b of Object.values(bones)) b.quaternion.copy(b.userData.bind);
    for (const [from, to, d] of POSES[name]) {
      for (const side of from.startsWith('Left') ? ['Left', 'Right'] : ['']) {
        const f = side ? from.replace('Left', side) : from, c = side ? to.replace('Left', side) : to;
        const bone = bones['mixamorig' + f], child = bones['mixamorig' + c];
        if (!bone || !child) continue;
        const dir = side === 'Right' ? [-d[0], d[1], d[2]] : d;
        aim(bone, child, dir);
      }
    }
    for (const b of Object.values(bones)) b.userData.posed = b.quaternion.clone();
  }
  applyPose(pose);

  const group = new THREE.Group();
  group.add(root);
  let capeObj = null;
  if (cape && bones['mixamorigSpine2']) {
    capeObj = capeMesh(env);
    // attach in world space after pose
    root.updateMatrixWorld(true);
    const sp = bones['mixamorigSpine2'];
    const wp = new THREE.Vector3(); sp.getWorldPosition(wp);
    const local = group.worldToLocal(wp.clone());
    capeObj.position.set(0, local.y + 0.22, local.z - 0.14);
    if (pose === 'seated') { capeObj.userData.u.uWind.value = 0.25; capeObj.scale.set(1.05, 0.7, 1); }
    group.add(capeObj);
  }
  const breathe = bones['mixamorigSpine1'], head = bones['mixamorigHead'];
  return {
    group, bones, applyPose, hips: bones['mixamorigHips'],
    seatOn(seatY, z = -0.02) { group.position.set(0, 0, 0); group.updateMatrixWorld(true); const h = new THREE.Vector3(); bones['mixamorigHips'].getWorldPosition(h); group.position.set(-h.x, seatY + 0.11 - h.y, z - h.z); },
    update(t) {
      if (capeObj) capeObj.userData.u.uTime.value = t;
      if (breathe) breathe.quaternion.copy(breathe.userData.posed).multiply(_q.setFromEuler(new THREE.Euler(D(Math.sin(t * 1.4) * 1.2), 0, 0)));
      if (head) head.quaternion.copy(head.userData.posed).multiply(_q.setFromEuler(new THREE.Euler(D(Math.sin(t * 0.6) * 1.5), D(Math.sin(t * 0.33) * 4), 0)));
    },
  };
}

// Photoreal render on a camera-facing card (used when HERO images are set)
export function createHeroCard(url, height, loader) {
  const tex = loader.load(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.02, depthWrite: true, toneMapped: true });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  const group = new THREE.Group();
  group.add(mesh);
  tex.onUpdate = null;
  const img = new Image();
  img.onload = () => { const a = img.width / img.height; mesh.scale.set(height * a, height, 1); mesh.position.y = height / 2; };
  img.src = url;
  return {
    group,
    update(t, cam) { // cylindrical billboard
      const p = new THREE.Vector3(); group.getWorldPosition(p);
      group.rotation.y = Math.atan2(cam.position.x - p.x, cam.position.z - p.z) * 0.85;
    },
  };
}
