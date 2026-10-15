import * as THREE from 'three';
import { NOISE, HASH } from '../core/glsl.js';

// ---------------------------------------------------------------------
// The portal at the end of the bridge: a colossal ring gate of gold light
// around a slowly turning vortex that recedes into depth, with sparks
// spiralling inward. It is the key light for the contact scene.
// ---------------------------------------------------------------------
export function createPortal({ radius = 60 } = {}) {
  const group = new THREE.Group();
  const u = { uTime: { value: 0 }, uPulse: { value: 0 } };

  // vortex disc
  const vortex = new THREE.Mesh(new THREE.CircleGeometry(radius * 1.02, 160), new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
    fragmentShader: /* glsl */ `${NOISE}
      uniform float uTime,uPulse; varying vec2 vUv;
      void main(){
        vec2 p=(vUv-0.5)*2.0; float r=length(p); float a=atan(p.y,p.x);
        float z=0.35/max(r,0.03);                                   // depth into the tunnel
        float sw=a+z*0.9-uTime*0.18;
        float n=fbm(vec3(cos(sw)*1.4, sin(sw)*1.4, z*0.55-uTime*0.35))*0.5+0.5;
        float arms=pow(0.5+0.5*sin(sw*3.0+n*4.0), 3.0);
        vec3 deep=vec3(0.05,0.12,0.22), mid=vec3(0.15,0.85,0.75), hot=vec3(1.0,0.85,0.55);
        vec3 col=mix(deep, mid, n)*(0.35+arms*0.9);
        col+=hot*pow(n,4.0)*arms*1.4;
        col+=vec3(0.85,1.0,0.95)*smoothstep(0.3,0.0,r)*0.55;          // light at the end
        col*=smoothstep(1.0,0.86,r)*(0.55+0.45*smoothstep(0.0,0.6,r));
        col*=1.0+uPulse;
        gl_FragColor=vec4(col*0.42,1.0);
      }`,
  }));
  group.add(vortex);

  // ring of light: a thick gold-white band with flowing energy
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, radius * 0.035, 24, 260), new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv=uv; vec4 mv=modelViewMatrix*vec4(position,1.0); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv;} `,
    fragmentShader: /* glsl */ `${HASH}
      uniform float uTime,uPulse; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){
        float f=pow(max(dot(vN,vV),0.0),1.5);
        float flow=vfbm(vec2(vUv.x*60.0-uTime*1.5, vUv.y*4.0));
        float pulse=pow(fract(vUv.x*6.0-uTime*0.25),12.0);
        vec3 c=mix(vec3(1.0,0.72,0.32), vec3(1.0,0.95,0.85), f);
        gl_FragColor=vec4(c*(0.55+flow*0.9+pulse*1.6)*(0.45+f)*(1.0+uPulse),1.0);
      }`,
  }));
  group.add(ring);
  // outer halo
  const halo = new THREE.Mesh(new THREE.RingGeometry(radius * 1.02, radius * 1.6, 160), new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
    fragmentShader: `uniform float uTime; varying vec2 vUv; void main(){ float r=length(vUv-0.5)*2.0; float k=(r-0.63)/0.37; float a=exp(-k*k*0.0)*pow(1.0-clamp(k,0.0,1.0),4.0);
      gl_FragColor=vec4(vec3(0.35,0.9,0.75)*a*0.16+vec3(1.0,0.7,0.35)*pow(1.0-clamp(k,0.0,1.0),12.0)*0.3,1.0); }`,
  }));
  group.add(halo);
  // segmented outer frame (gate architecture)
  const segMat = new THREE.MeshPhysicalMaterial({ color: 0x07090d, metalness: 0.6, roughness: 0.35, emissive: 0x1a1206, emissiveIntensity: 0.6 });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const m = new THREE.Mesh(new THREE.BoxGeometry(radius * 0.09, radius * 0.22, radius * 0.08), segMat);
    m.position.set(Math.cos(a) * radius * 1.09, Math.sin(a) * radius * 1.09, -radius * 0.02);
    m.rotation.z = a; group.add(m);
  }

  // sparks spiralling in
  const N = 900, pos = new Float32Array(N * 3), seed = new Float32Array(N);
  for (let i = 0; i < N; i++) seed[i] = Math.random();
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  sg.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const sparks = new THREE.Points(sg, new THREE.ShaderMaterial({
    uniforms: { uTime: u.uTime, uR: { value: radius } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `uniform float uTime,uR; attribute float aSeed; varying float vA;
      void main(){ float t=fract(aSeed*7.13+uTime*(0.03+aSeed*0.04)); float r=uR*mix(1.7,0.15,t); float a=aSeed*628.0+t*9.0;
        vec3 p=vec3(cos(a)*r, sin(a)*r, -t*uR*0.4 + (fract(aSeed*91.0)-0.5)*uR*0.2);
        vA=smoothstep(0.0,0.15,t)*smoothstep(1.0,0.7,t);
        vec4 mv=modelViewMatrix*vec4(p,1.0); gl_PointSize=clamp((2.0+fract(aSeed*31.0)*4.0)*(200.0/max(-mv.z,1.0)),1.0,8.0); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `varying float vA; void main(){ float d=length(gl_PointCoord-0.5); float a=exp(-d*d*24.0); gl_FragColor=vec4(vec3(1.0,0.85,0.6)*a*vA*1.5,1.0);} `,
  }));
  sparks.frustumCulled = false;
  group.add(sparks);

  return { group, uniforms: u, update(t) { u.uTime.value = t; ring.rotation.z = t * 0.02; } };
}
