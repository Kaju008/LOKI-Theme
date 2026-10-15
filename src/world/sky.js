import * as THREE from 'three';
import { NOISE } from '../core/glsl.js';

export const SUN_DIR = new THREE.Vector3(-0.55, 0.32, -1).normalize();

// Nebula painted once into a cube map (cheap at runtime, also used for reflections)
export function bakeNebula(renderer, tier) {
  const size = tier.mobile ? 512 : 1024;
  const scene = new THREE.Scene();
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { uSun: { value: SUN_DIR } },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      ${NOISE}
      uniform vec3 uSun; varying vec3 vDir;
      void main(){
        vec3 d = normalize(vDir);
        vec3 q = vec3(fbm(d*1.6), fbm(d*1.6+vec3(5.2,1.3,2.8)), fbm(d*1.6+vec3(1.7,9.2,4.1)));
        float n1 = fbm(d*2.3 + q*1.6);
        float n2 = fbm(d*3.1 - q*1.2 + 7.0);
        float n3 = fbm(d*5.0 + q*2.0 + 3.0);
        // galactic band
        vec3 bn = normalize(vec3(0.25, 1.0, 0.35));
        float band = exp(-pow(dot(d, bn)/0.28, 2.0));
        vec3 col = vec3(0.004,0.006,0.016);
        vec3 teal = vec3(0.02,0.30,0.34), violet = vec3(0.26,0.07,0.48), green = vec3(0.03,0.32,0.14), magenta = vec3(0.42,0.05,0.30), amber = vec3(0.55,0.26,0.06);
        col += teal   * smoothstep(-0.05, 0.75, n1) * 0.85;
        col += violet * smoothstep( 0.05, 0.80, n2) * 0.9;
        col += green  * smoothstep( 0.25, 0.90, n1*n2*2.5+0.2) * 0.8;
        col += magenta* smoothstep( 0.45, 0.95, n3) * 0.35 * band;
        // bright dusty core with dark lanes along band
        float lanes = smoothstep(-0.1, 0.5, n3);
        col += mix(vec3(0.20,0.24,0.36), vec3(0.45,0.36,0.30), smoothstep(0.3,0.9,n2)) * band * (0.25+0.75*lanes) * smoothstep(-0.2,0.6,n1+0.3) * 0.9;
        // sun glow
        float s = max(dot(d, uSun), 0.0);
        col += amber * pow(s, 24.0) * 1.0 + vec3(1.0,0.85,0.7) * pow(s, 400.0) * 3.0 + vec3(0.25,0.3,0.5)*pow(s,6.0)*0.1;
        col *= 0.62;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(10, 64, 32), mat));
  const rt = new THREE.WebGLCubeRenderTarget(size, { type: THREE.HalfFloatType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
  const cubeCam = new THREE.CubeCamera(0.1, 100, rt);
  cubeCam.update(renderer, scene);
  mat.dispose();
  const pmrem = new THREE.PMREMGenerator(renderer);
  // brighter, softer env for PBR reflections
  const envScene = new THREE.Scene();
  envScene.background = rt.texture;
  const sunBlob = new THREE.Mesh(new THREE.SphereGeometry(1.4, 16, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.1, 1.8) }));
  sunBlob.position.copy(SUN_DIR).multiplyScalar(30);
  const fillA = new THREE.Mesh(new THREE.SphereGeometry(3, 16, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.1, 0.7, 0.6) }));
  fillA.position.set(20, -10, 25);
  const fillB = new THREE.Mesh(new THREE.SphereGeometry(4, 16, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.45, 0.2, 0.8) }));
  fillB.position.set(-25, 5, 15);
  envScene.add(sunBlob, fillA, fillB);
  const env = pmrem.fromScene(envScene, 0.02).texture;
  pmrem.dispose();
  return { background: rt.texture, env };
}

export function createStars(tier) {
  const N = tier.stars;
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), sz = new Float32Array(N);
  const bn = new THREE.Vector3(0.25, 1, 0.35).normalize();
  const v = new THREE.Vector3(), c = new THREE.Color();
  for (let i = 0; i < N; i++) {
    v.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
    if (v.lengthSq() > 1 || v.lengthSq() < 0.01) { i--; continue; }
    v.normalize();
    // concentrate toward galactic band
    if (Math.random() < 0.45) { v.addScaledVector(bn, -v.dot(bn) * (0.75 + Math.random() * 0.2)).normalize(); }
    v.multiplyScalar(900);
    pos.set([v.x, v.y, v.z], i * 3);
    const t = Math.random();
    c.setHSL(t < 0.7 ? 0.58 + Math.random() * 0.08 : 0.08 + Math.random() * 0.05, 0.5, 0.75 + Math.random() * 0.25);
    col.set([c.r, c.g, c.b], i * 3);
    sz[i] = Math.pow(Math.random(), 6) * 5 + 0.6;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(sz, 1));
  const u = { uTime: { value: 0 }, uPR: { value: tier.dpr }, uStretch: { value: 0 } };
  const m = new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `uniform float uTime,uPR; attribute float aSize; attribute vec3 color; varying vec3 vC; varying float vT;
      void main(){ vC=color; vec4 mv = modelViewMatrix*vec4(position,1.0);
        float tw = 0.65+0.35*sin(uTime*(1.0+aSize)+position.x*0.1+position.y*0.07);
        vT=tw; gl_PointSize = aSize*uPR*1.2; gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `varying vec3 vC; varying float vT; void main(){ vec2 c=gl_PointCoord-0.5; float d=length(c); float a=smoothstep(0.5,0.0,d); a*=a;
      float cross = max(0.0, 1.0-abs(c.x)*14.0)*max(0.0,1.0-abs(c.y)*2.0) + max(0.0, 1.0-abs(c.y)*14.0)*max(0.0,1.0-abs(c.x)*2.0);
      gl_FragColor = vec4(vC*(a+cross*0.35)*vT*1.6, 1.0); }`,
  });
  const pts = new THREE.Points(g, m);
  pts.frustumCulled = false;
  pts.renderOrder = -10;
  return { object: pts, uniforms: u };
}

function gasGiant(r) {
  const u = { uSun: { value: SUN_DIR }, uTime: { value: 0 } };
  const m = new THREE.ShaderMaterial({
    uniforms: u,
    vertexShader: `varying vec3 vN; varying vec3 vP; varying vec3 vW; void main(){ vP=position; vN=normalize(mat3(modelMatrix)*normal); vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */ `${NOISE}
      uniform vec3 uSun; uniform float uTime; varying vec3 vN; varying vec3 vP; varying vec3 vW;
      void main(){
        vec3 p = normalize(vP);
        float lat = p.y;
        float w = fbm(vec3(p.x*2.0+uTime*0.004, lat*1.5, p.z*2.0))*0.35;
        float b = sin((lat+w)*26.0)*0.5+0.5;
        float b2 = fbm(vec3(lat*22.0+w*4.0, p.x*1.2, p.z*1.2));
        vec3 c1 = vec3(0.10,0.20,0.32), c2 = vec3(0.42,0.33,0.30), c3 = vec3(0.07,0.38,0.40), c4=vec3(0.55,0.42,0.30);
        vec3 col = mix(c1, c3, b);
        col = mix(col, c2, smoothstep(0.2,0.8,b2));
        col = mix(col, c4, smoothstep(0.6,0.95,b2)*0.6);
        // storm
        float storm = smoothstep(0.16,0.0,length(vec2(atan(p.z,p.x)-1.0, (lat+0.28)*3.0)));
        col = mix(col, vec3(0.8,0.45,0.3), storm*0.7);
        vec3 V = normalize(cameraPosition - vW);
        float ndl = dot(normalize(vN), uSun);
        float lit = smoothstep(-0.25, 0.6, ndl);
        float fres = pow(1.0 - max(dot(normalize(vN), V), 0.0), 3.0);
        vec3 outCol = col*(lit*0.85 + 0.07) + vec3(0.25,0.6,0.9)*fres*smoothstep(-0.4,0.4,ndl)*1.2;
        gl_FragColor = vec4(outCol, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 96, 64), m);
  // rings
  const rg = new THREE.RingGeometry(r * 1.35, r * 2.35, 160, 1);
  const rm = new THREE.ShaderMaterial({
    uniforms: { uR0: { value: r * 1.35 }, uR1: { value: r * 2.35 }, uSun: { value: SUN_DIR } },
    transparent: true, side: THREE.DoubleSide, depthWrite: false,
    vertexShader: `varying vec3 vP; varying vec3 vW; void main(){ vP=position; vW=(modelMatrix*vec4(position,1.0)).xyz; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
    fragmentShader: `uniform float uR0,uR1; varying vec3 vP;
      float h(float x){ return fract(sin(x*127.1)*43758.5453); }
      void main(){ float r=(length(vP.xy)-uR0)/(uR1-uR0);
        float bands = 0.5+0.5*sin(r*90.0)*sin(r*37.0+1.3);
        float gaps = smoothstep(0.02,0.0,abs(r-0.42)) + smoothstep(0.015,0.0,abs(r-0.7));
        float a = smoothstep(0.0,0.06,r)*smoothstep(1.0,0.85,r)*(0.25+0.6*bands)*(1.0-gaps*0.9);
        vec3 col = mix(vec3(0.55,0.5,0.45), vec3(0.3,0.55,0.65), r);
        gl_FragColor = vec4(col*0.9, a*0.75); }`,
  });
  const ring = new THREE.Mesh(rg, rm);
  ring.rotation.x = -Math.PI / 2 + 0.38;
  ring.rotation.y = 0.25;
  const atm = new THREE.Mesh(new THREE.SphereGeometry(r * 1.06, 64, 32), new THREE.ShaderMaterial({
    uniforms: { uSun: { value: SUN_DIR } }, transparent: true, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false,
    vertexShader: `varying vec3 vN; varying vec3 vW; void main(){ vN=normalize(mat3(modelMatrix)*normal); vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform vec3 uSun; varying vec3 vN; varying vec3 vW; void main(){ vec3 V=normalize(cameraPosition-vW); float f=pow(1.0-abs(dot(normalize(vN),V)),2.5);
      float l=smoothstep(-0.5,0.6,dot(normalize(vN),uSun)); gl_FragColor=vec4(vec3(0.25,0.65,1.0)*f*l*1.3,1.0);} `,
  }));
  const g = new THREE.Group();
  g.add(mesh, ring, atm);
  return { group: g, u };
}

export function createFar(tier, loader) {
  const far = new THREE.Group();
  const giant = gasGiant(150);
  giant.group.position.set(-430, 150, -980);
  giant.group.rotation.z = 0.2;
  far.add(giant.group);

  const moonTex = loader.load('assets/textures/moon.jpg');
  moonTex.colorSpace = THREE.SRGBColorSpace;
  const moon = new THREE.Mesh(new THREE.SphereGeometry(42, 64, 48), new THREE.MeshStandardMaterial({ map: moonTex, color: 0x9fb7c9, roughness: 1, metalness: 0, bumpMap: moonTex, bumpScale: 1.5 }));
  moon.position.set(400, 70, -760);
  far.add(moon);

  const ice = new THREE.Mesh(new THREE.SphereGeometry(22, 48, 32), new THREE.MeshStandardMaterial({ color: 0x3fa7c9, roughness: 0.55, metalness: 0.1, emissive: 0x06202a }));
  ice.position.set(230, 300, -1150);
  far.add(ice);

  return { group: far, update: (t) => { giant.u.uTime.value = t; moon.rotation.y = t * 0.01; giant.group.children[0].rotation.y = t * 0.006; } };
}
