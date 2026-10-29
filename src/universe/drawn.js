import * as THREE from 'three';
import { DECK_Y, FORK_Z } from './bridge.js';

// =====================================================================
//  The drawn world's own pieces (only visible after the shift):
//  · bubble clouds — clusters of solid spheres, flat-banded lavender/violet,
//    lit on the side facing the bridge, with a riso grain
//  · a pitch-black sky's sparkle stars
//  · planet "skins": banded, semi-vector shading, light falling on one side,
//    a mint rim glow and grain
//  Everything dissolves in grain-by-grain with uShow (0 → 1).
// =====================================================================
const GRAIN = /* glsl */ `
  float gh(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  float gn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(gh(i),gh(i+vec2(1,0)),f.x), mix(gh(i+vec2(0,1)),gh(i+vec2(1,1)),f.x), f.y); }`;

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

export function createDrawn({ tier, planets }) {
  const group = new THREE.Group();
  const U = { uShow: { value: 0 }, uTime: { value: 0 } };
  const mob = tier.mobile;

  // ---------------------------------------------------------------- bubble clouds
  const R = rng(21);
  const puffs = [];       // [x, y, z, r]
  const cluster = (cx, cy, cz, scale) => {
    const n = 5 + Math.floor(R() * 6);
    // a flat bottom row of big puffs, then smaller ones stacked on top
    for (let i = 0; i < n; i++) {
      const a = (i / (n - 1) - 0.5) * 2;
      const r = (0.75 + R() * 0.5) * scale * (1 - Math.abs(a) * 0.35);
      puffs.push([cx + a * scale * 1.15 + (R() - 0.5) * scale * 0.3, cy + (R() - 0.3) * scale * 0.2, cz + (R() - 0.5) * scale * 0.9, r]);
    }
    for (let i = 0; i < Math.ceil(n * 0.6); i++) {
      const a = (R() - 0.5) * 1.6;
      puffs.push([cx + a * scale * 0.85, cy + scale * (0.5 + R() * 0.4), cz + (R() - 0.5) * scale * 0.8, (0.55 + R() * 0.45) * scale]);
    }
  };
  const nC = mob ? 34 : 64;
  for (let i = 0; i < nC; i++) {
    const side = i % 2 ? 1 : -1;
    const z = 300 - (i / nC) * 520 + (R() - 0.5) * 30;
    cluster(side * (26 + R() * 46), DECK_Y - 16 + R() * 14, z, 5 + R() * 6);
  }
  // banks framing the fork, and a few far ones low on the horizon
  for (let i = 0; i < (mob ? 10 : 18); i++) {
    const side = i % 2 ? 1 : -1;
    cluster(side * (30 + R() * 90), DECK_Y - 18 + R() * 10, FORK_Z - 40 - R() * 260, 7 + R() * 9);
  }
  const sphere = new THREE.IcosahedronGeometry(1, 3);
  const cloudMat = new THREE.ShaderMaterial({
    uniforms: U,
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vW; varying vec3 vC;
      void main(){
        vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
        vW = w.xyz; vC = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        vN = normalize(mat3(modelMatrix * instanceMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      ${GRAIN}
      uniform float uShow, uTime; varying vec3 vN; varying vec3 vW; varying vec3 vC;
      void main(){
        float g = gh(gl_FragCoord.xy);
        if (g > uShow * 1.02) discard;                                   // grain-by-grain dissolve
        // light comes from the bridge (the centre of the world) and from above
        vec3 L = normalize(vec3(-sign(vC.x) * 0.75, 0.65, 0.15));
        vec3 N = normalize(vN);
        float d = dot(N, L) * 0.55 + 0.42;
        d += (gn(gl_FragCoord.xy * 0.35) - 0.5) * 0.16 + (g - 0.5) * 0.08;   // riso dither on the band edges
        vec3 c0 = vec3(0.09, 0.07, 0.34), c1 = vec3(0.2, 0.15, 0.62), c2 = vec3(0.36, 0.25, 0.9), c3 = vec3(0.56, 0.44, 1.0);
        vec3 col = d < 0.38 ? c0 : d < 0.58 ? c1 : d < 0.78 ? c2 : c3;
        // a warm magenta bounce under the puffs, a faint mint kiss on the lit tops
        col = mix(col, vec3(0.55, 0.22, 0.75), smoothstep(-0.2, -0.75, N.y) * 0.45);
        col += vec3(0.25, 0.55, 0.45) * smoothstep(0.86, 1.0, d) * 0.25;
        // soft dark ring where the sphere turns away: reads as an ink edge
        vec3 V = normalize(cameraPosition - vW);
        col *= mix(0.55, 1.0, smoothstep(0.0, 0.35, dot(N, V)));
        col *= 0.9 + 0.14 * gn(gl_FragCoord.xy * 0.6 + 3.0);
        gl_FragColor = vec4(pow(max(col, 0.0), vec3(2.2)), 1.0);   // colours are authored as display colours
      }`,
  });
  const clouds = new THREE.InstancedMesh(sphere, cloudMat, puffs.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p3 = new THREE.Vector3();
  puffs.forEach(([x, y, z, r], i) => { m4.compose(p3.set(x, y, z), q, sc.set(r, r * 0.92, r)); clouds.setMatrixAt(i, m4); });
  clouds.frustumCulled = false;
  group.add(clouds);

  // ---------------------------------------------------------------- sparkle stars on a pitch-black sky
  const S = rng(5), NS = mob ? 500 : 1100;
  const sp = new Float32Array(NS * 3), ss = new Float32Array(NS * 2);
  for (let i = 0; i < NS; i++) {
    const u = S() * 2 - 1, th = S() * Math.PI * 2, r = Math.sqrt(1 - u * u);
    sp.set([Math.cos(th) * r * 2400, Math.abs(u) * 2400 * (S() < 0.85 ? 1 : -0.3), Math.sin(th) * r * 2400], i * 3);
    const big = S() < 0.035;
    ss.set([big ? 3 + S() * 3 : 0.6 + Math.pow(S(), 3) * 2.2, S() * 10], i * 2);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  sg.setAttribute('aS', new THREE.BufferAttribute(ss, 2));
  const stars = new THREE.Points(sg, new THREE.ShaderMaterial({
    uniforms: { ...U, uPR: { value: Math.min(devicePixelRatio || 1, 2) } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute vec2 aS; uniform float uTime, uPR; varying float vS; varying float vTw;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vS = aS.x; vTw = 0.55 + 0.45 * sin(uTime * (1.2 + fract(aS.y) * 2.5) + aS.y * 7.0);
        gl_PointSize = (aS.x > 2.5 ? aS.x * 7.0 : aS.x * 2.2) * uPR;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uShow; varying float vS; varying float vTw;
      void main(){
        vec2 p = gl_PointCoord - 0.5; float r = length(p);
        float a;
        if (vS > 2.5) {                                    // four-point sparkle
          float cross = max(exp(-abs(p.x) * 60.0) * exp(-abs(p.y) * 5.0), exp(-abs(p.y) * 60.0) * exp(-abs(p.x) * 5.0));
          a = cross + exp(-r * r * 260.0);
        } else a = smoothstep(0.5, 0.0, r);
        vec3 c = mix(vec3(0.95, 0.9, 1.0), vec3(0.85, 0.75, 1.0), step(2.5, vS));
        gl_FragColor = vec4(c * a * vTw * uShow, 1.0);
      }`,
  }));
  stars.frustumCulled = false;
  group.add(stars);

  // ---------------------------------------------------------------- planet skins
  const skins = [];
  const loader = new THREE.TextureLoader();
  const SUN = new THREE.Vector3(0.77, 0.63, 0.07).normalize();
  planets.forEach((pl, i) => {
    const tex = loader.load(i === 0 ? 'assets/space/saturn.webp' : 'assets/space/moon.webp');
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.ShaderMaterial({
      uniforms: { ...U, map: { value: tex }, uSun: { value: SUN } },
      vertexShader: /* glsl */ `
        varying vec2 vUv; varying vec3 vN; varying vec3 vW;
        void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */ `
        ${GRAIN}
        uniform sampler2D map; uniform vec3 uSun; uniform float uShow, uTime; varying vec2 vUv; varying vec3 vN; varying vec3 vW;
        void main(){
          float g = gh(gl_FragCoord.xy);
          if (g > uShow * 1.02) discard;
          vec3 N = normalize(vN), V = normalize(cameraPosition - vW);
          float tex = dot(texture2D(map, vUv).rgb, vec3(0.333));
          float ndl = dot(N, uSun);
          float d = ndl * 0.5 + 0.44 + (tex - 0.45) * 0.5;                    // craters & bands survive as shapes
          d += (gn(gl_FragCoord.xy * 0.4) - 0.5) * 0.12 + (g - 0.5) * 0.07;
          vec3 c0 = vec3(0.05, 0.04, 0.12), c1 = vec3(0.13, 0.11, 0.27), c2 = vec3(0.24, 0.21, 0.44), c3 = vec3(0.42, 0.38, 0.66), c4 = vec3(0.66, 0.62, 0.86);
          vec3 col = d < 0.36 ? c0 : d < 0.52 ? c1 : d < 0.68 ? c2 : d < 0.84 ? c3 : c4;
          // the shine: a soft highlight where the light falls
          vec3 H = normalize(uSun + V);
          col += vec3(0.75, 0.72, 0.95) * smoothstep(0.9, 0.99, dot(N, H)) * 0.35;
          // mint rim glow from the light behind the world
          float fres = pow(1.0 - max(dot(N, V), 0.0), 2.6);
          col = mix(col, vec3(0.62, 0.95, 0.84), fres * 0.85);
          col *= 0.9 + 0.15 * gn(gl_FragCoord.xy * 0.7 + 9.0);
          gl_FragColor = vec4(pow(max(col, 0.0), vec3(2.2)), 1.0);   // colours are authored as display colours
        }`,
    });
    const skin = new THREE.Mesh(new THREE.SphereGeometry(pl.radius * 1.004, 96, 64), mat);
    pl.axis.add(skin);
    // a soft mint halo behind it
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(pl.radius * 3.4, pl.radius * 3.4), new THREE.ShaderMaterial({
      uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * (modelViewMatrix * vec4(0.0,0.0,0.0,1.0) + vec4(position.xy, 0.0, 0.0)); }`,
      fragmentShader: `uniform float uShow; varying vec2 vUv; void main(){ float r = length(vUv - 0.5) * 2.0; float a = smoothstep(1.0, 0.58, r) * smoothstep(0.52, 0.6, r); gl_FragColor = vec4(vec3(0.45, 0.85, 0.75) * a * 0.55 * uShow, 1.0); }`,
    }));
    halo.renderOrder = -1;
    pl.group.add(halo);
    skins.push(skin, halo);
  });

  group.visible = false; skins.forEach((m) => (m.visible = false));
  return {
    group,
    set(k) {
      U.uShow.value = k;
      const on = k > 0.001;
      group.visible = on; skins.forEach((m) => (m.visible = on));
    },
    update(t, cam) { U.uTime.value = t; stars.position.copy(cam.position); },
  };
}
