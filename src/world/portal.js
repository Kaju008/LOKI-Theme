import * as THREE from 'three';
import { NOISE } from '../core/glsl.js';

// Swirling energy orb (contact portal + skills core)
export function createEnergyOrb({ radius = 20, colorA = new THREE.Color(0.25, 1.0, 0.75), colorB = new THREE.Color(0.55, 0.35, 1.0), rings = 2 } = {}) {
  const group = new THREE.Group();
  const u = { uTime: { value: 0 }, uA: { value: colorA }, uB: { value: colorB }, uPulse: { value: 0 } };
  const mat = new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vP;
      void main(){ vP=position; vec4 mv=modelViewMatrix*vec4(position,1.0); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: /* glsl */ `${NOISE}
      uniform float uTime,uPulse; uniform vec3 uA,uB; varying vec3 vN; varying vec3 vV; varying vec3 vP;
      void main(){
        float f = 1.0 - max(dot(vN, vV), 0.0);
        vec2 q = vN.xy; float r = length(q); float a = atan(q.y,q.x);
        float sw = fbm(vec3(cos(a*2.0 + r*6.0 - uTime*0.6)*1.5, sin(a*2.0 + r*6.0 - uTime*0.6)*1.5, r*3.0 + uTime*0.15));
        float spiral = smoothstep(0.0, 0.9, sw*0.9 + 0.35);
        float core = smoothstep(0.75, 0.0, r);
        vec3 col = mix(uB, uA, spiral) * (0.25 + spiral*0.9) * (0.3 + core*0.9);
        col += vec3(0.85,1.0,0.95) * pow(core, 3.0) * 0.6;
        col += mix(uA, vec3(1.0), 0.3) * pow(f, 2.5) * 2.2;            // bright rim
        col *= 1.0 + uPulse*0.8;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(radius, 96, 64), mat);
  group.add(sphere);
  const ringMats = [];
  for (let i = 0; i < rings; i++) {
    const m = new THREE.MeshBasicMaterial({ color: (i % 2 ? colorB : colorA).clone().multiplyScalar(2.2), transparent: true, opacity: 0.85 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * (1.12 + i * 0.12), radius * 0.006, 6, 200), m);
    ring.rotation.set(Math.PI / 2 + (i - 0.5) * 0.5, i * 0.7, 0);
    group.add(ring); ringMats.push(ring);
  }
  // sparks orbiting
  const N = 600, pos = new Float32Array(N * 3), seed = new Float32Array(N);
  for (let i = 0; i < N; i++) { seed[i] = Math.random(); pos.set([0, 0, 0], i * 3); }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  sg.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const sparks = new THREE.Points(sg, new THREE.ShaderMaterial({
    uniforms: { uTime: u.uTime, uR: { value: radius }, uA: u.uA, uB: u.uB }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `uniform float uTime,uR; attribute float aSeed; varying float vS;
      void main(){ vS=aSeed; float a = aSeed*628.0 + uTime*(0.15+aSeed*0.3); float tilt = fract(aSeed*13.7)*3.14;
        float rr = uR*(1.15 + fract(aSeed*7.3)*0.6);
        vec3 p = vec3(cos(a)*rr, sin(a)*rr*sin(tilt)*0.35, sin(a)*rr*cos(tilt));
        vec4 mv = modelViewMatrix*vec4(p,1.0); gl_PointSize = (2.0+fract(aSeed*31.0)*4.0)*(60.0/max(-mv.z,1.0)); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 uA,uB; varying float vS; void main(){ float d=length(gl_PointCoord-0.5); float a=smoothstep(0.5,0.0,d); gl_FragColor=vec4(mix(uA,uB,vS)*a*a*2.0,1.0);} `,
  }));
  sparks.frustumCulled = false;
  group.add(sparks);
  return {
    group, uniforms: u,
    update(t) { u.uTime.value = t; ringMats.forEach((r, i) => (r.rotation.z = t * (0.1 + i * 0.07) * (i % 2 ? -1 : 1))); },
  };
}
