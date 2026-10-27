import * as THREE from 'three';

export const SUN_DIR = new THREE.Vector3(-0.45, 0.32, 0.83).normalize();

// direction -> equirect uv (shared with the black hole lensing shader)
export const EQUIRECT = /* glsl */ `
vec2 eqUV(vec3 d){ return vec2(atan(d.x,-d.z)/6.2831853+0.5, asin(clamp(d.y,-1.0,1.0))/3.14159265+0.5); }
`;

// ---------------------------------------------------------------------
// Photographic sky: ESO/S. Brunier Milky Way panorama (CC BY 4.0) on a
// sphere that travels with the camera. The whole sky (panorama, nebula,
// planets) yaws a little per section so each chapter frames a different
// part of the universe.
// ---------------------------------------------------------------------
export async function createSky(renderer, tier, loader) {
  const sfx = tier.mobile ? '-sm' : '';
  const tex = await loader.loadAsync(`assets/space/milkyway${sfx}.webp`);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;
  tex.wrapS = THREE.RepeatWrapping;

  const group = new THREE.Group();            // follows the camera, yaws per section
  const tilt = new THREE.Group();             // fixed tilt of the galactic band
  tilt.rotation.set(0.08, 0, 0.42);
  group.add(tilt);

  const skyU = { uSky: { value: tex }, uGain: { value: 0.5 }, uLift: { value: 0.0 } };
  const skyMat = new THREE.ShaderMaterial({
    uniforms: skyU, side: THREE.BackSide, depthWrite: false, depthTest: false,
    vertexShader: `varying vec3 vDir; void main(){ vDir=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_Position.z=gl_Position.w; }`,
    fragmentShader: /* glsl */ `${EQUIRECT}
      uniform sampler2D uSky; uniform float uGain,uLift; varying vec3 vDir;
      void main(){ vec3 d=normalize(vDir); vec3 c=texture2D(uSky, eqUV(d)).rgb;
        c = c*uGain;
        c = mix(c, c*vec3(0.92,0.98,1.08), 0.5);                  // a touch cooler
        gl_FragColor=vec4(c + uLift*vec3(0.004,0.006,0.012),1.0); }`,
  });
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(4000, 64, 32), skyMat);
  sphere.renderOrder = -20; sphere.frustumCulled = false;
  tilt.add(sphere);

  // --- crisp stars on top (the panorama is soft when magnified)
  const stars = createStars(tier);
  group.add(stars.object);

  // --- environment for PBR reflections: the same sky, brightened, plus soft coloured fills
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const envSky = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.ShaderMaterial({
    uniforms: { uSky: { value: tex } }, side: THREE.BackSide,
    vertexShader: `varying vec3 vDir; void main(){ vDir=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `${EQUIRECT} uniform sampler2D uSky; varying vec3 vDir; void main(){ gl_FragColor=vec4(texture2D(uSky, eqUV(normalize(vDir))).rgb*3.0 + vec3(0.02,0.03,0.05),1.0); }`,
  }));
  envSky.rotation.copy(tilt.rotation);
  envScene.add(envSky);
  const blob = (c, p, r) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 8), new THREE.MeshBasicMaterial({ color: c })); m.position.copy(p); envScene.add(m); };
  blob(new THREE.Color(3.2, 2.7, 2.2), SUN_DIR.clone().multiplyScalar(30), 2.2);
  blob(new THREE.Color(0.05, 0.55, 0.42), new THREE.Vector3(18, -12, -24), 6);
  blob(new THREE.Color(0.32, 0.16, 0.62), new THREE.Vector3(-26, 8, -14), 7);
  blob(new THREE.Color(0.5, 0.36, 0.12), new THREE.Vector3(0, -30, 10), 8);
  const env = pmrem.fromScene(envScene, 0.03).texture;
  pmrem.dispose();

  const inv = new THREE.Matrix3();
  const m4 = new THREE.Matrix4();
  return {
    group, tilt, tex, env, stars, skyU,
    // matrix that maps a world direction into panorama space (for lensing)
    invMatrix() { tilt.updateWorldMatrix(true, false); m4.copy(tilt.matrixWorld).invert(); inv.setFromMatrix4(m4); return inv; },
    update(t, cam, yaw) {
      group.position.copy(cam.position);
      group.rotation.y = yaw;
      stars.uniforms.uTime.value = t;
    },
  };
}

export function createStars(tier) {
  const N = tier.stars;
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), sz = new Float32Array(N);
  const v = new THREE.Vector3(), c = new THREE.Color();
  // stellar colours (rough black-body samples, O→M)
  const temps = [[0.62, 0.72, 1.0], [0.78, 0.85, 1.0], [1.0, 1.0, 1.0], [1.0, 0.95, 0.85], [1.0, 0.84, 0.62], [1.0, 0.7, 0.5]];
  for (let i = 0; i < N; i++) {
    v.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
    if (v.lengthSq() > 1 || v.lengthSq() < 0.01) { i--; continue; }
    v.normalize().multiplyScalar(3000);
    pos.set([v.x, v.y, v.z], i * 3);
    const t = temps[Math.min(5, Math.floor(Math.pow(Math.random(), 0.8) * 6))];
    c.setRGB(t[0], t[1], t[2]);
    col.set([c.r, c.g, c.b], i * 3);
    sz[i] = Math.pow(Math.random(), 9) * 3.2 + 0.55;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(sz, 1));
  const u = { uTime: { value: 0 }, uPR: { value: tier.dpr }, uStretch: { value: 0 } };
  const m = new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `uniform float uTime,uPR; attribute float aSize; attribute vec3 color; varying vec3 vC; varying float vS;
      void main(){ vC=color; vS=aSize; vec4 mv = modelViewMatrix*vec4(position,1.0);
        float tw = 0.9+0.1*sin(uTime*(0.6+aSize*0.3)+position.x*0.01);
        vC*=tw; gl_PointSize = max(1.0, aSize*uPR*1.15); gl_Position = projectionMatrix*mv; gl_Position.z=gl_Position.w*0.9999; }`,
    fragmentShader: `varying vec3 vC; varying float vS; void main(){ vec2 c=gl_PointCoord-0.5; float d=length(c);
      float a=exp(-d*d*28.0);
      float spike = (vS>2.0) ? (exp(-abs(c.x)*60.0)*exp(-abs(c.y)*5.0) + exp(-abs(c.y)*60.0)*exp(-abs(c.x)*5.0))*0.5 : 0.0;
      gl_FragColor = vec4(vC*(a+spike)*(0.55+vS*0.35), 1.0); }`,
  });
  const pts = new THREE.Points(g, m);
  pts.frustumCulled = false;
  pts.renderOrder = -10;
  return { object: pts, uniforms: u };
}

// A photographic nebula (Hubble, Veil Nebula — CC BY 4.0) as a distant
// additive layer: the black background is keyed out and edges dissolve.
export function createNebula(tex, { w = 2400, h = 1600, rot = 0, gain = 1.0, tint = new THREE.Color(1, 1, 1) } = {}) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { map: { value: tex }, uGain: { value: gain }, uTint: { value: tint }, uRot: { value: rot } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_Position.z=gl_Position.w*0.9998; }`,
    fragmentShader: `uniform sampler2D map; uniform float uGain; uniform vec3 uTint; varying vec2 vUv;
      void main(){ vec3 c=texture2D(map,vUv).rgb;
        float l=dot(c,vec3(0.3,0.55,0.15));
        float key=smoothstep(0.015,0.12,l);
        vec2 q=(vUv-0.5)*2.0; float edge=smoothstep(1.0,0.45,length(q*vec2(0.9,1.05)));
        gl_FragColor=vec4(c*uTint*uGain*key*edge,1.0); }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.rotation.z = rot;
  mesh.renderOrder = -15;
  mesh.frustumCulled = false;
  const holder = new THREE.Group(); holder.add(mesh);
  return holder;
}
