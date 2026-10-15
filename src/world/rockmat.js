import * as THREE from 'three';

// ---------------------------------------------------------------------
// Photoscanned rock (Poly Haven, CC0) applied with object-space triplanar
// mapping + whiteout normal blending, with moss on upward faces.
// Object space keeps the texture glued to the rock while it is dragged.
// ---------------------------------------------------------------------
let TEX = null;
export function loadRockTextures(loader, tier) {
  if (TEX) return TEX;
  const sfx = tier.mobile ? '-sm' : '';
  const L = (n, srgb) => { const t = loader.load(`assets/tex/${n}${sfx}.webp`); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
  TEX = { rd: L('rock_diff', true), rn: L('rock_nor'), ra: L('rock_arm'), md: L('moss_diff', true), mn: L('moss_nor') };
  return TEX;
}

export function rockMaterial2(T, { scale = 0.35, moss = 0.8, tint = new THREE.Color(1, 1, 1), envMap = null, envMapIntensity = 0.5, mossColor = new THREE.Color(0.75, 0.95, 0.85) } = {}) {
  const m = new THREE.MeshStandardMaterial({ color: tint, roughness: 1, metalness: 0, envMap, envMapIntensity });
  const u = { tRD: { value: T.rd }, tRN: { value: T.rn }, tRA: { value: T.ra }, tMD: { value: T.md }, tMN: { value: T.mn }, uScale: { value: scale }, uMoss: { value: moss }, uMossCol: { value: mossColor }, uGlow: { value: 0 }, uGlowCol: { value: new THREE.Color(0.2, 1, 0.7) } };
  m.userData.u = u;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vOP; varying vec3 vON; varying vec3 vAX; varying vec3 vAY; varying vec3 vAZ;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vOP = position; vON = normal;
        #ifdef USE_INSTANCING
          mat3 nmX = normalMatrix * mat3(instanceMatrix);
        #else
          mat3 nmX = normalMatrix;
        #endif
        vAX = nmX[0]; vAY = nmX[1]; vAZ = nmX[2];`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vOP; varying vec3 vON; varying vec3 vAX; varying vec3 vAY; varying vec3 vAZ;
        uniform sampler2D tRD,tRN,tRA,tMD,tMN; uniform float uScale,uMoss,uGlow; uniform vec3 uMossCol,uGlowCol;
        vec3 triW(vec3 n){ vec3 w=pow(abs(n),vec3(6.0)); return w/(w.x+w.y+w.z); }
        vec4 tri(sampler2D t, vec3 p, vec3 w){ return texture2D(t,p.zy)*w.x + texture2D(t,p.xz)*w.y + texture2D(t,p.xy)*w.z; }
        vec3 triN(sampler2D t, vec3 p, vec3 n, vec3 w){
          vec3 tx=texture2D(t,p.zy).xyz*2.0-1.0, ty=texture2D(t,p.xz).xyz*2.0-1.0, tz=texture2D(t,p.xy).xyz*2.0-1.0;
          tx=vec3(tx.xy+n.zy, abs(tx.z)*n.x); ty=vec3(ty.xy+n.xz, abs(ty.z)*n.y); tz=vec3(tz.xy+n.xy, abs(tz.z)*n.z);
          return normalize(tx.zyx*w.x + ty.xzy*w.y + tz.xyz*w.z);
        }
        float mossMask=0.0; vec3 triP; vec3 triWt; vec3 objN; vec4 armS;`)
      .replace('#include <map_fragment>', `
        objN = normalize(vON);
        triP = vOP*uScale;
        triWt = triW(objN);
        vec3 rc = tri(tRD, triP, triWt).rgb;
        vec3 mc = tri(tMD, triP*1.3, triWt).rgb;
        armS = tri(tRA, triP, triWt);
        float up = smoothstep(0.35, 0.85, objN.y);
        float breakup = tri(tMD, triP*0.37+0.3, triWt).g;
        mossMask = clamp(up*uMoss*smoothstep(0.15,0.55,breakup+up*0.35), 0.0, 1.0);
        vec3 rg = mix(rc, vec3(dot(rc, vec3(0.3,0.59,0.11))), 0.55)*vec3(0.78,0.84,0.95);
        vec3 albedo = mix(rg, mc*uMossCol, mossMask);
        albedo *= mix(0.55, 1.0, armS.r);
        diffuseColor.rgb *= albedo;`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = mix(clamp(armS.g*1.05,0.45,1.0), 0.95, mossMask);')
      .replace('#include <normal_fragment_maps>', `
        vec3 nR = triN(tRN, triP, objN, triWt);
        vec3 nM = triN(tMN, triP*1.3, objN, triWt);
        normal = normalize(mat3(vAX,vAY,vAZ) * normalize(mix(nR, nM, mossMask)));`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += uGlowCol * uGlow * (0.15 + 0.85*pow(1.0-abs(dot(normal, normalize(vViewPosition))),3.0));`);
  };
  m.customProgramCacheKey = () => 'rock2';
  return m;
}
