import * as THREE from 'three';
import { DECK_Y, FORK_Z } from './bridge.js';

// =====================================================================
//  Atmosphere: banks of cosmic cloud along both sides of the bridge, a
//  sea of mist far below the glass, and a low haze that drifts under
//  the deck. Soft billboards with procedural noise, so it's all depth
//  and no textures to download.
// =====================================================================
const NOISE = /* glsl */ `
  float hh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
    return mix(mix(hh(i),hh(i+vec2(1,0)),f.x), mix(hh(i+vec2(0,1)),hh(i+vec2(1,1)),f.x), f.y); }
  float fbm(vec2 p){ float a=0.5, s=0.0; for(int i=0;i<5;i++){ s+=a*vn(p); p=p*2.03+vec2(1.7,9.2); a*=0.5; } return s; }`;

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

export function createAtmosphere(tier) {
  const group = new THREE.Group();
  const R = rng(7);
  const items = [];   // [x, y, z, size, seed, tintIndex, alpha]
  const push = (x, y, z, s, tint, a) => items.push([x, y, z, s, R() * 100, tint, a]);
  const mob = tier.mobile;
  const n = (k) => Math.round(k * (mob ? 0.45 : 1));

  // 1) cloud banks hugging both sides of the bridge, all the way along
  for (let i = 0; i < n(150); i++) {
    const side = R() < 0.5 ? -1 : 1;
    const z = 420 - R() * 820;
    const x = side * (20 + Math.pow(R(), 1.6) * 85);
    const y = DECK_Y - 20 + R() * 40;
    push(x, y, z, 24 + R() * 44, R() < 0.55 ? 0 : R() < 0.6 ? 1 : 2, 0.65 + R() * 0.35);
  }
  // 2) the sea of cloud far below the glass
  for (let i = 0; i < n(90); i++) {
    push((R() - 0.5) * 260, DECK_Y - 34 - R() * 26, 360 - R() * 760, 50 + R() * 60, R() < 0.7 ? 0 : 1, 0.35 + R() * 0.3);
  }
  // 3) around the fork and between the three roads
  for (let i = 0; i < n(50); i++) {
    const a = (R() - 0.5) * Math.PI * 0.9, d = 30 + R() * 160;
    const x = Math.sin(a) * d, z = FORK_Z - 20 - Math.cos(a) * d;
    if (Math.abs(x) < 9 && z > FORK_Z - 60) continue;
    push(x, DECK_Y - 22 + R() * 26, z, 24 + R() * 40, R() < 0.5 ? 2 : 0, 0.5 + R() * 0.35);
  }

  const N = items.length;
  const quad = new THREE.PlaneGeometry(1, 1);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = quad.index; geo.setAttribute('position', quad.attributes.position); geo.setAttribute('uv', quad.attributes.uv);
  const aP = new Float32Array(N * 3), aS = new Float32Array(N * 4);
  items.forEach((it, i) => { aP.set(it.slice(0, 3), i * 3); aS.set([it[3], it[4], it[5], it[6]], i * 4); });
  geo.setAttribute('aP', new THREE.InstancedBufferAttribute(aP, 3));
  geo.setAttribute('aS', new THREE.InstancedBufferAttribute(aS, 4));
  geo.instanceCount = N;

  const uniforms = { uTime: { value: 0 }, uGain: { value: 1 } };
  const mat = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false,
    vertexShader: /* glsl */ `
      attribute vec3 aP; attribute vec4 aS; uniform float uTime;
      varying vec2 vUv; varying vec4 vS; varying float vFade; varying vec3 vW;
      void main(){
        vUv=uv; vS=aS;
        vec3 c=aP + vec3(sin(uTime*0.02+aS.y)*6.0, sin(uTime*0.05+aS.y*2.0)*1.2, cos(uTime*0.015+aS.y)*4.0);   // slow drift
        vec4 mv=viewMatrix*vec4(c,1.0);
        float rot=aS.y + uTime*0.004*(fract(aS.y)-0.5);
        vec2 q=mat2(cos(rot),-sin(rot),sin(rot),cos(rot))*position.xy;
        mv.xy+=q*aS.x;
        float d=-mv.z;
        vFade=smoothstep(aS.x*0.35, aS.x*1.3, d) * smoothstep(1500.0, 500.0, d);   // fade near the lens and far away
        vW=c;
        gl_Position=projectionMatrix*mv;
      }`,
    fragmentShader: /* glsl */ `
      ${NOISE}
      uniform float uTime, uGain; varying vec2 vUv; varying vec4 vS; varying float vFade; varying vec3 vW;
      void main(){
        vec2 p=vUv-0.5; float r=length(p)*2.0;
        vec2 q=p*2.6+vS.y;
        float n=fbm(q + vec2(uTime*0.006, -uTime*0.004));
        float n2=fbm(q*1.9 - n*1.3 + 4.0);
        float blob=smoothstep(1.0, 0.15, r + (n-0.5)*0.9);
        float dens=blob*smoothstep(0.32, 0.75, n*0.6+n2*0.55);
        if(dens<0.004) discard;
        // dark dusty bodies with a faint coloured rim of light
        vec3 tint = vS.z<0.5 ? vec3(0.16,0.42,0.62) : vS.z<1.5 ? vec3(0.30,0.24,0.58) : vec3(0.14,0.50,0.40);
        float lit=smoothstep(0.45,0.95,n2) * (0.6+0.4*(1.0-r));
        vec3 col=vec3(0.012,0.016,0.03) + tint*lit*0.42;
        float a=dens*vS.w*vFade*uGain*0.62;
        gl_FragColor=vec4(col, a);
      }`,
  });
  const clouds = new THREE.Mesh(geo, mat);
  clouds.frustumCulled = false; clouds.renderOrder = 2;
  group.add(clouds);

  // a low glowing haze drifting just under the glass, so the bridge floats in mist
  const hazeMat = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */ `
      ${NOISE}
      uniform float uTime, uGain; varying vec3 vW;
      void main(){
        vec2 p=vW.xz*0.018 + vW.y*0.37;
        float n=fbm(p + vec2(uTime*0.01, uTime*0.006));
        float m=fbm(p*2.2 - n + vec2(-uTime*0.012, 3.0));
        float d=length(cameraPosition-vW);
        float fade=smoothstep(900.0, 120.0, d) * smoothstep(8.0, 40.0, d);
        float k=smoothstep(0.55, 0.95, n*0.55+m*0.6);
        vec3 c=mix(vec3(0.05,0.16,0.22), vec3(0.16,0.10,0.28), m) * k;
        gl_FragColor=vec4(c*fade*uGain*0.32, 1.0);
      }`,
  });
  for (const [y, s] of [[DECK_Y - 9, 1], [DECK_Y - 22, 1.7]]) {
    const g = new THREE.PlaneGeometry(1800, 1800, 1, 1); g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, hazeMat); m.position.y = y; m.scale.setScalar(s); m.renderOrder = 1.5; m.frustumCulled = false;
    group.add(m);
  }

  return { group, uniforms, update(t) { uniforms.uTime.value = t; } };
}
