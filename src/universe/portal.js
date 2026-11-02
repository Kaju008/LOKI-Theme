import * as THREE from 'three';
import { STYLE } from './style.js';

// =====================================================================
//  The portal's floating particles: glittering, rainbow-tinted points
//  that hang on the turbulent shell of the portal, drift along it and
//  flicker, growing with it. Plus the portal's outline on screen, for
//  the rim pass (centre + radius of the sphere's silhouette).
// =====================================================================
export function createPortalFx({ tier }) {
  const N = tier.mobile ? 1400 : 3200;
  const dir = new Float32Array(N * 3), seed = new Float32Array(N * 2);
  for (let i = 0; i < N; i++) {
    const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u);
    dir.set([Math.cos(th) * r, u, Math.sin(th) * r], i * 3);
    seed.set([Math.random(), Math.random()], i * 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(dir, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 2));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uC: STYLE.uDCW, uR: STYLE.uDR, uT: STYLE.uDTime, uA: { value: 0 }, uPR: { value: Math.min(devicePixelRatio || 1, 2) } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute vec2 aSeed; uniform vec3 uC; uniform float uR, uT, uPR; varying vec3 vCol; varying float vTw;
      void main(){
        float b = 0.12 + min(uR * 0.09, 14.0);
        // drift around the shell, breathing in and out of it
        float a = uT * (0.15 + aSeed.x * 0.35) + aSeed.y * 6.2832;
        vec3 d = normalize(position + 0.25 * vec3(sin(a), cos(a * 1.3), sin(a * 0.7 + 1.0)));
        float off = (fract(aSeed.x * 7.3 + uT * (0.2 + aSeed.y * 0.3)) - 0.5) * b * 2.6;
        vec3 p = uC + d * max(0.0, uR + off);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float hue = aSeed.y + uT * 0.2;
        vCol = 0.6 + 0.4 * cos(6.2832 * (hue + vec3(0.0, 0.33, 0.67)));
        vTw = 0.4 + 0.6 * abs(sin(uT * (3.0 + aSeed.x * 6.0) + aSeed.y * 20.0));
        gl_PointSize = clamp((0.6 + aSeed.x * 2.4) * b * 60.0 / max(0.5, -mv.z), 1.5, 10.0) * uPR;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uA; varying vec3 vCol; varying float vTw;
      void main(){
        vec2 p = gl_PointCoord - 0.5; float r = length(p);
        float a = smoothstep(0.5, 0.0, r); a *= a;
        float star = max(exp(-abs(p.x) * 40.0) * exp(-abs(p.y) * 6.0), exp(-abs(p.y) * 40.0) * exp(-abs(p.x) * 6.0));
        gl_FragColor = vec4(mix(vCol, vec3(1.0), 0.45) * (a + star * 0.8) * vTw * uA, 1.0);
      }`,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false; points.renderOrder = 20; points.visible = false;

  const tmp = new THREE.Vector3(), ndc = new THREE.Vector3(), fwd = new THREE.Vector3();
  return {
    points,
    update(cam) {
      const active = STYLE.uDFrom.value !== STYLE.uDTo.value && STYLE.uDR.value > 0.03;
      const target = active ? 1 : 0;
      mat.uniforms.uA.value += (target - mat.uniforms.uA.value) * 0.15;
      points.visible = mat.uniforms.uA.value > 0.01;
    },
    // the portal's silhouette on screen (for the rim pass): centre in 0–1 (y up), radius in pixels; on = 0 when the camera is inside
    silhouette(cam, W, H) {
      const C = STYLE.uDCW.value, R = STYLE.uDR.value, d = cam.position.distanceTo(C);
      if (d <= R * 1.02 || R < 0.01) return { on: 0, inside: d <= R * 1.02 && R >= 0.01, x: 0.5, y: 0.5, r: 0 };
      ndc.copy(C).project(cam);
      tmp.copy(C).sub(cam.position);
      const ahead = tmp.dot(cam.getWorldDirection(fwd)) > 0;
      if (!ahead) return { on: 0, inside: false, x: 0.5, y: 0.5, r: 0 };
      const ang = Math.asin(Math.min(1, R / d));
      const r = Math.tan(ang) / Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2) * (H / 2);
      return { on: 1, inside: false, x: ndc.x * 0.5 + 0.5, y: ndc.y * 0.5 + 0.5, r };
    },
  };
}
