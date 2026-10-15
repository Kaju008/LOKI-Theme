import * as THREE from 'three';
import { SUN_DIR } from './sky.js';

// ---------------------------------------------------------------------
// Planets with real surface maps (Solar System Scope, CC BY 4.0), a soft
// physically-motivated terminator, limb darkening, rim scattering and —
// for the ringed giant — ring shadows cast both ways.
// ---------------------------------------------------------------------
const VERT = `varying vec3 vN; varying vec3 vW; varying vec2 vUv;
  void main(){ vUv=uv; vN=normalize(mat3(modelMatrix)*normal); vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;

export function createPlanet({ map, radius = 100, atmo = new THREE.Color(0.3, 0.6, 1), atmoK = 1, soft = 0.12, gain = 1.15, ring = null, tilt = 0.4, spin = 0.004, bump = null, night = 0.0 }) {
  const group = new THREE.Group();          // placed in the sky
  const axis = new THREE.Group();           // axial tilt + user drag rotation
  axis.rotation.z = tilt;
  group.add(axis);

  const u = {
    map: { value: map }, uSun: { value: SUN_DIR }, uAtmo: { value: atmo }, uAtmoK: { value: atmoK }, uSoft: { value: soft }, uGain: { value: gain }, uNight: { value: night },
    uHasRing: { value: ring ? 1 : 0 }, tRing: { value: ring ? ring.tex : null }, uRingN: { value: new THREE.Vector3(0, 1, 0) }, uRingC: { value: new THREE.Vector3() },
    uRingR: { value: new THREE.Vector2(radius * 1.24, radius * 2.27) }, uHover: { value: 0 },
    bumpMap: { value: bump }, uHasBump: { value: bump ? 1 : 0 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: u, vertexShader: VERT,
    fragmentShader: /* glsl */ `
      uniform sampler2D map, tRing, bumpMap; uniform vec3 uSun,uAtmo,uRingN,uRingC; uniform float uAtmoK,uSoft,uGain,uHasRing,uNight,uHover,uHasBump; uniform vec2 uRingR;
      varying vec3 vN; varying vec3 vW; varying vec2 vUv;
      void main(){
        vec3 albedo=texture2D(map,vUv).rgb;
        vec3 N=normalize(vN);
        if(uHasBump>0.5){ // cheap derivative bump for the moon
          float h=texture2D(bumpMap,vUv).r; vec3 dpx=dFdx(vW), dpy=dFdy(vW); float dhx=dFdx(h), dhy=dFdy(h);
          vec3 r1=cross(dpy,N), r2=cross(N,dpx); float det=dot(dpx,r1);
          N=normalize(abs(det)*N - sign(det)*(dhx*r1+dhy*r2)*2.5);
        }
        vec3 V=normalize(cameraPosition-vW);
        float ndl=dot(N,uSun);
        float lit=smoothstep(-uSoft, uSoft*2.0, ndl)*max(ndl+uSoft,0.0)/(1.0+uSoft);
        // ring shadow on the planet
        if(uHasRing>0.5){
          float dn=dot(uSun,uRingN);
          if(abs(dn)>1e-3){ float t=dot(uRingC-vW,uRingN)/dn; if(t>0.0){ vec3 hp=vW+uSun*t; float rr=length(hp-uRingC);
            float k=(rr-uRingR.x)/(uRingR.y-uRingR.x); if(k>0.0&&k<1.0){ float a=texture2D(tRing,vec2(k,0.5)).a; lit*=1.0-a*0.85; } } }
        }
        float mu=max(dot(N,V),0.0);
        vec3 col=albedo*uGain*lit*mix(0.55,1.0,pow(mu,0.4));          // limb darkening
        col+=albedo*uNight*(1.0-smoothstep(-0.1,0.2,ndl));                 // faint earthshine on the dark side
        float fres=pow(1.0-mu,3.5);
        col+=uAtmo*fres*smoothstep(-0.25,0.45,ndl)*uAtmoK;                 // scattering at the limb, lit side only
        col+=uAtmo*uHover*fres*0.6;
        gl_FragColor=vec4(col,1.0);
      }`,
  });
  const body = new THREE.Mesh(new THREE.SphereGeometry(radius, 128, 64), mat);
  axis.add(body);

  // outer glow just beyond the limb
  if (atmoK > 0) {
    const shell = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.035, 96, 48), new THREE.ShaderMaterial({
      uniforms: { uSun: { value: SUN_DIR }, uAtmo: { value: atmo }, uK: { value: atmoK } }, transparent: true, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false,
      vertexShader: VERT,
      fragmentShader: `uniform vec3 uSun,uAtmo; uniform float uK; varying vec3 vN; varying vec3 vW;
        void main(){ vec3 V=normalize(cameraPosition-vW); float f=pow(max(0.0,1.0-abs(dot(normalize(vN),V))),1.6)*smoothstep(0.0,0.35,abs(dot(normalize(vN),V)));
          float l=smoothstep(-0.35,0.5,dot(normalize(vN),uSun)); gl_FragColor=vec4(uAtmo*f*l*uK*0.9,1.0); }`,
    }));
    axis.add(shell);
  }

  let ringMesh = null;
  if (ring) {
    const r0 = u.uRingR.value.x, r1 = u.uRingR.value.y;
    const g = new THREE.RingGeometry(r0, r1, 256, 1);
    const pa = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < pa.count; i++) { const r = Math.hypot(pa.getX(i), pa.getY(i)); uv.setXY(i, (r - r0) / (r1 - r0), 0.5); }
    const ru = { tRing: { value: ring.tex }, uSun: { value: SUN_DIR }, uC: { value: new THREE.Vector3() }, uR: { value: radius }, uN: u.uRingN };
    ringMesh = new THREE.Mesh(g, new THREE.ShaderMaterial({
      uniforms: ru, transparent: true, side: THREE.DoubleSide, depthWrite: false,
      vertexShader: VERT,
      fragmentShader: `uniform sampler2D tRing; uniform vec3 uSun,uC,uN; uniform float uR; varying vec3 vW; varying vec2 vUv;
        void main(){ vec4 t=texture2D(tRing,vec2(vUv.x,0.5));
          // planet shadow on the rings
          vec3 toC=uC-vW; float b=dot(toC,uSun); float sh=1.0;
          if(b>0.0){ float d2=dot(toC,toC)-b*b; sh=smoothstep(uR*uR*0.92, uR*uR*1.04, d2); }
          vec3 V=normalize(cameraPosition-vW);
          float sameSide=step(0.0, dot(uN,uSun)*dot(uN,V));
          float l=mix(0.28, 1.0, sameSide);                                         // forward-scatter when seen from the dark side
          gl_FragColor=vec4(t.rgb*1.15*l*sh, t.a*0.92); }`,
    }));
    ringMesh.rotation.x = -Math.PI / 2;
    axis.add(ringMesh);
    ringMesh.userData.u = ru;
  }

  const state = { spin, hover: 0, target: 0, vel: new THREE.Vector2(), drag: false };
  const tmpN = new THREE.Vector3(), tmpC = new THREE.Vector3(), q = new THREE.Quaternion();
  return {
    group, axis, body, mat, state, radius,
    update(t, dt) {
      body.rotation.y += state.spin * dt;
      if (!state.drag && state.vel.lengthSq() > 1e-8) {
        // inertia after a drag
        axis.rotateOnWorldAxis(_up, state.vel.x * dt);
        axis.rotateOnWorldAxis(_right, state.vel.y * dt);
        state.vel.multiplyScalar(Math.pow(0.08, dt));
      }
      state.hover += (state.target - state.hover) * Math.min(1, dt * 4);
      u.uHover.value = state.hover;
      if (ringMesh) {
        ringMesh.getWorldPosition(tmpC); ringMesh.getWorldQuaternion(q); tmpN.set(0, 0, 1).applyQuaternion(q).normalize();
        u.uRingC.value.copy(tmpC); u.uRingN.value.copy(tmpN); ringMesh.userData.u.uC.value.copy(tmpC);
      }
    },
  };
}
const _up = new THREE.Vector3(0, 1, 0), _right = new THREE.Vector3(1, 0, 0);
export function setDragAxes(up, right) { _up.copy(up); _right.copy(right); }
