import * as THREE from 'three';
import { STYLE, DRAWN_GLSL } from './style.js';

// =====================================================================
//  The drawn world's own pieces (shown pixel-by-pixel behind the wipe):
//  · sparkle stars on the pitch-black sky
//  · planet skins: deep indigo, soft cloud bands, light falling from one
//    side, a crisp night side and a thin lit limb (no glow halo)
//  · Saturn's rings as layered lavender bands with a Cassini gap and the
//    planet's shadow across them
// =====================================================================
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const SUN = new THREE.Vector3(0.77, 0.63, 0.07).normalize();

export function createDrawn({ tier, planets }) {
  const group = new THREE.Group();
  const U = { ...STYLE };

  // ---------------------------------------------------------------- stars
  const S = rng(5), NS = tier.mobile ? 700 : 1500;
  const sp = new Float32Array(NS * 3), ss = new Float32Array(NS * 2);
  for (let i = 0; i < NS; i++) {
    const u = S() * 2 - 1, th = S() * Math.PI * 2, r = Math.sqrt(1 - u * u);
    sp.set([Math.cos(th) * r * 2400, u * 2400, Math.sin(th) * r * 2400], i * 3);
    const big = S() < 0.025;
    ss.set([big ? 3 + S() * 3 : 0.5 + Math.pow(S(), 4) * 2.2, S() * 10], i * 2);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  sg.setAttribute('aS', new THREE.BufferAttribute(ss, 2));
  const stars = new THREE.Points(sg, new THREE.ShaderMaterial({
    uniforms: { ...U, uPR: { value: Math.min(devicePixelRatio || 1, 2) } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute vec2 aS; uniform float uDTime, uPR; varying float vS; varying float vTw;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vS = aS.x; vTw = 0.6 + 0.4 * sin(uDTime * (1.0 + fract(aS.y) * 2.2) + aS.y * 7.0);
        gl_PointSize = (aS.x > 2.5 ? aS.x * 7.0 : aS.x * 2.0) * uPR;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `${DRAWN_GLSL}
      varying float vS; varying float vTw;
      void main(){
        float k = drawnK(); if (k < 0.5) discard;
        vec2 p = gl_PointCoord - 0.5; float r = length(p); float a;
        if (vS > 2.5) a = max(exp(-abs(p.x) * 70.0) * exp(-abs(p.y) * 5.0), exp(-abs(p.y) * 70.0) * exp(-abs(p.x) * 5.0)) + exp(-r * r * 300.0);
        else a = smoothstep(0.5, 0.05, r);
        gl_FragColor = vec4(vec3(0.95, 0.92, 1.0) * a * vTw, 1.0);
      }`,
  }));
  stars.frustumCulled = false; stars.renderOrder = -10;
  group.add(stars);

  // ---------------------------------------------------------------- planet skins + Saturn's drawn rings
  const extras = [];
  const loader = new THREE.TextureLoader();
  planets.forEach((pl, i) => {
    const isSat = i === 0;
    const tex = loader.load(isSat ? 'assets/space/saturn.webp' : 'assets/space/moon.webp');
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.ShaderMaterial({
      uniforms: { ...U, map: { value: tex }, uSun: { value: SUN }, uSat: { value: isSat ? 1 : 0 } },
      vertexShader: /* glsl */ `
        varying vec2 vUv; varying vec3 vN; varying vec3 vW;
        void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */ `${DRAWN_GLSL}
        uniform sampler2D map; uniform vec3 uSun; uniform float uSat; varying vec2 vUv; varying vec3 vN; varying vec3 vW;
        void main(){
          if (drawnK() < 0.5) discard;
          vec3 N = normalize(vN), V = normalize(cameraPosition - vW);
          float tex = dot(texture2D(map, vUv).rgb, vec3(0.333));
          float ndl = dot(N, uSun);
          // light falls from the sun's side: a smooth indigo gradient, then a crisp night side
          float t = smoothstep(-0.25, 0.95, ndl);
          vec3 lit = mix(dLin(vec3(0.12,0.094,0.36)), dLin(vec3(0.40,0.35,0.74)), t);
          lit = mix(dLin(vec3(0.055,0.035,0.2)), lit, smoothstep(-0.12, 0.3, ndl));
          vec3 col = mix(dLin(vec3(0.012,0.008,0.07)), lit, smoothstep(-0.28, 0.02, ndl));
          if (uSat > 0.5) {
            // soft cloud bands from the planet's own texture
            float b = smoothstep(0.25, 0.75, tex);
            col *= 0.82 + 0.36 * b;
            col = mix(col, col * dLin(vec3(0.95, 0.9, 1.1)), smoothstep(0.6, 0.9, tex));
          } else {
            // craters: darker pits, lighter rims, all in the same light
            col *= 0.5 + 0.6 * smoothstep(0.15, 0.7, tex);
          }
          // a soft sheen where the light falls, and a thin lit limb on the sun side only
          col += dLin(vec3(0.85,0.82,1.0)) * pow(max(dot(N, normalize(uSun + V)), 0.0), 40.0) * 0.18;
          float fres = pow(1.0 - max(dot(N, V), 0.0), 4.0);
          col += dLin(vec3(0.85,0.82,1.0)) * fres * smoothstep(0.0, 0.5, ndl) * 0.3;
          col *= 0.93 + 0.12 * dGrain();
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    const skin = new THREE.Mesh(new THREE.SphereGeometry(pl.radius * 1.004, 128, 80), mat);
    skin.renderOrder = 1;
    pl.body.add(skin);                      // turns with the planet
    extras.push(skin);

    if (isSat && pl.ringMesh) {
      // layered rings: (radius fraction across the ring, width, colour, opacity) — Cassini gap at ~0.55
      const ringMat = new THREE.ShaderMaterial({
        uniforms: { ...U, uSun: { value: SUN }, uC: { value: new THREE.Vector3() }, uR: { value: pl.radius }, uR0: { value: pl.radius * 1.24 }, uR1: { value: pl.radius * 2.27 } },
        transparent: true, depthWrite: false, side: THREE.DoubleSide,
        vertexShader: `varying vec3 vW; varying vec3 vL; void main(){ vL = position; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
        fragmentShader: /* glsl */ `${DRAWN_GLSL}
          uniform vec3 uSun, uC; uniform float uR, uR0, uR1; varying vec3 vW; varying vec3 vL;
          float band(float x, float c, float w){ return smoothstep(w, w * 0.6, abs(x - c)); }
          void main(){
            if (drawnK() < 0.5) discard;
            float x = (length(vL.xy) - uR0) / (uR1 - uR0);
            vec3 c = vec3(0.0); float a = 0.0;
            #define B(cx, w, col, op) { float m = band(x, cx, w); c = mix(c, dLin(col), m); a = max(a, m * op); }
            B(0.03, 0.03, vec3(0.35,0.33,0.53), 0.35)
            B(0.12, 0.05, vec3(0.54,0.52,0.72), 0.55)
            B(0.27, 0.08, vec3(0.84,0.86,0.94), 0.92)
            B(0.42, 0.05, vec3(0.73,0.77,0.89), 0.86)
            B(0.66, 0.07, vec3(0.66,0.65,0.82), 0.86)
            B(0.80, 0.03, vec3(0.56,0.55,0.75), 0.7)
            B(0.94, 0.03, vec3(0.80,0.91,0.89), 0.45)
            a *= 1.0 - band(x, 0.53, 0.035);                     // Cassini division
            a *= 1.0 - band(x, 0.73, 0.012) * 0.8;
            // the planet's shadow falling across the rings
            vec3 d = vW - uC; float along = dot(d, uSun);
            float perp = length(d - uSun * along);
            float sh = step(along, 0.0) * smoothstep(uR * 1.02, uR * 0.96, perp);
            c *= 1.0 - sh * 0.88;
            // a fine bright streak catching the light
            c += dLin(vec3(1.0)) * band(x, 0.31, 0.006) * 0.5;
            c *= 0.8 * (0.94 + 0.1 * dGrain());
            if (a < 0.01) discard;
            gl_FragColor = vec4(c, a);
          }`,
      });
      const ring = new THREE.Mesh(pl.ringMesh.geometry, ringMat);
      ring.rotation.copy(pl.ringMesh.rotation); ring.position.copy(pl.ringMesh.position); ring.scale.copy(pl.ringMesh.scale);
      ring.renderOrder = 2;
      pl.axis.add(ring);
      extras.push(ring);
      ring.userData.update = () => pl.group.getWorldPosition(ringMat.uniforms.uC.value);
    }
  });

  let on = false;
  const set = (v) => { on = v; group.visible = v; extras.forEach((m) => (m.visible = v)); };
  set(false);
  return {
    group,
    set(k) { set(k > 0.001); },
    update(t, cam) {
      if (!on) return;
      stars.position.copy(cam.position);
      extras.forEach((m) => m.userData.update && m.userData.update());
    },
  };
}
