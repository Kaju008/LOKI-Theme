import * as THREE from 'three';

// =====================================================================
//  The two worlds. Every material that changes in the drawn world reads
//  these uniforms and decides per pixel which world it is in, so the
//  wipe sweeps across the real geometry (no screen filter, no smudge).
//  uDFrom/uDTo: 0 = real, 1 = drawn · uDFront: wipe progress 0 → 1.
// =====================================================================
export const STYLE = {
  uDFrom: { value: 0 }, uDTo: { value: 0 }, uDFront: { value: 1 },
  uDRes: { value: new THREE.Vector2(1, 1) }, uDTime: { value: 0 },
  uDCenter: { value: new THREE.Vector2(0.5, 0.5) },
  // the portal is a turbulent sphere in the world: centre, radius, and the camera (to rebuild each pixel's world position)
  uDCW: { value: new THREE.Vector3() }, uDR: { value: 0 },
  uDInvProj: { value: new THREE.Matrix4() }, uDCamW: { value: new THREE.Matrix4() },
};
// radius of the portal for a given progress (0 → 1): slow near the gem, then it races out past the sky (r = 4000)
// the portal's outline on screen this frame (set by the story; read by page layers): centre 0–1 (y up), radius in buffer px
export const SIL = { on: 0, inside: false, x: 0.5, y: 0.5, r: 0, resY: 1 };
export const portalRadius = (f) => 0.02 + 5200 * Math.pow(Math.max(0, f), 4);
export const portalFront = (r) => Math.pow(Math.max(0, r - 0.02) / 5200, 0.25);

export const DRAWN_GLSL = /* glsl */ `
uniform float uDFrom, uDTo, uDFront, uDTime; uniform vec2 uDRes, uDCenter;
float dh_(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float dn_(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(dh_(i),dh_(i+vec2(1,0)),f.x), mix(dh_(i+vec2(0,1)),dh_(i+vec2(1,1)),f.x), f.y); }
uniform vec3 uDCW; uniform float uDR; uniform mat4 uDInvProj, uDCamW;
float dh3_(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
float dn3_(vec3 p){
  vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(dh3_(i), dh3_(i + vec3(1,0,0)), f.x), mix(dh3_(i + vec3(0,1,0)), dh3_(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(dh3_(i + vec3(0,0,1)), dh3_(i + vec3(1,0,1)), f.x), mix(dh3_(i + vec3(0,1,1)), dh3_(i + vec3(1,1,1)), f.x), f.y), f.z);
}
// this pixel's position in the world, rebuilt from its depth
vec3 dWorld(){
  vec4 v = uDInvProj * vec4(gl_FragCoord.xy / uDRes * 2.0 - 1.0, gl_FragCoord.z * 2.0 - 1.0, 1.0);
  return (uDCamW * vec4(v.xyz / v.w, 1.0)).xyz;
}
// the rim scale: wider as the portal grows, so the turbulence reads at every size
float dBand(){ return 0.12 + min(uDR * 0.09, 14.0); }
// Signed distance to the portal, seen from the camera. The portal is a bubble: everything seen THROUGH it is the
// new world (a window), things in front of it stay until they pierce its surface, and once the bubble reaches the
// camera the whole view is inside. Turbulence churns the edge; it is sampled where the ray passes the bubble so the
// edge holds its shape across objects at different depths.
float dPortalRaw(vec3 w, float R){
  vec3 c = uDCamW[3].xyz, v = w - c; float len = length(v); vec3 dir = v / max(len, 1e-4);
  vec3 oc = uDCW - c; float tca = dot(oc, dir), occ = length(oc);
  float perp = sqrt(max(dot(oc, oc) - tca * tca, 0.0));
  if (occ < R) return -(R - occ) - 1.0;
  if (tca < 0.0) return 1e4;
  if (perp >= R) return perp - R;
  float t0 = tca - sqrt(R * R - perp * perp);
  return len >= t0 ? perp - R : t0 - len;
}
float dPortalSD(vec3 w){
  float b = dBand(), t = uDTime;
  vec3 c = uDCamW[3].xyz, dir = normalize(w - c);
  vec3 ps = c + dir * max(dot(uDCW - c, dir), 0.0);
  vec3 q = (ps - uDCW) / max(b * 2.5, 0.3);
  float turb = dn3_(q * 0.9 + vec3(0.0, t * 0.7, t * 0.4)) * 0.65 + dn3_(q * 2.3 - vec3(t * 0.9, 0.0, t * 0.5)) * 0.35;
  return dPortalRaw(w, uDR + (turb - 0.5) * b * 2.2);
}
// which world this pixel is in; along the rim the two worlds break up in splats
float drawnK(){
  if (uDFrom == uDTo) return uDTo;
  vec3 w = dWorld(); float b = dBand(), s0 = dPortalRaw(w, uDR);
  if (s0 > b * 2.2) return uDFrom;               // far from the rim: no noise needed
  if (s0 < -b * 2.2) return uDTo;
  float splat = dn3_(w / (b * 0.35) + 11.0) - 0.5;
  return dPortalSD(w) + splat * b * 0.9 < 0.0 ? uDTo : uDFrom;
}
// the glowing, iridescent rim where the portal cuts through things (added to every changing material)
vec3 dRimGlow(){
  if (uDFrom == uDTo) return vec3(0.0);
  vec3 w = dWorld(); float b = dBand();
  if (abs(dPortalRaw(w, uDR)) > b * 3.2) return vec3(0.0);
  float sd = dPortalSD(w);
  float core = exp(-pow(sd / (b * 0.12), 2.0)), halo = exp(-pow(sd / (b * 0.55), 2.0));
  float hue = dn3_((w - uDCW) / (b * 1.5)) + uDTime * 0.15 + sd / b * 0.25;
  vec3 iri = 0.55 + 0.45 * cos(6.2832 * (hue + vec3(0.0, 0.33, 0.67)));
  float spark = step(0.9, dh3_(floor(w / (b * 0.06)) + floor(uDTime * 14.0))) * exp(-pow(sd / (b * 1.4), 2.0));
  return iri * halo * 0.32 + vec3(1.0, 0.96, 1.0) * (core * 0.55 + spark * 1.6);
}
vec3 dLin(vec3 c){ return pow(c, vec3(2.2)); }
// the drawn palette: ink indigo → violet → lavender, with soft (not posterized) steps
vec3 drawnRamp(float t){
  vec3 c0=dLin(vec3(0.043,0.031,0.133)), c1=dLin(vec3(0.137,0.110,0.361)), c2=dLin(vec3(0.247,0.204,0.588)),
       c3=dLin(vec3(0.427,0.373,0.816)), c4=dLin(vec3(0.702,0.655,0.941));
  t = clamp(t, 0.0, 1.0) * 4.0;
  vec3 c = mix(c0, c1, smoothstep(0.55, 1.0, t));
  c = mix(c, c2, smoothstep(1.55, 2.0, t));
  c = mix(c, c3, smoothstep(2.55, 3.0, t));
  return mix(c, c4, smoothstep(3.55, 4.0, t));
}
// fine print grain, fixed to the screen
float dGrain(){ return dn_(gl_FragCoord.xy * 0.55) * 0.6 + dh_(gl_FragCoord.xy) * 0.4; }`;

// link a material's uniforms to the shared ones (survives UniformsUtils.clone)
export function linkStyle(mat) {
  for (const k of Object.keys(STYLE)) mat.uniforms[k] = STYLE[k];
  return mat;
}

// ShaderMaterial: fade the real-world output to nothing where the drawn world is showing
export function fadeInDrawn(mat) {
  mat.uniforms = mat.uniforms || {};
  linkStyle(mat);
  mat.fragmentShader = DRAWN_GLSL + '\n' + mat.fragmentShader.replace(/void\s+main\s*\(\s*\)/, 'void main_real()') +
    '\nvoid main(){ main_real(); gl_FragColor *= 1.0 - drawnK(); gl_FragColor.rgb += dRimGlow() * 0.6; }';
  mat.needsUpdate = true;
  return mat;
}

// MeshStandard/Physical: in the drawn world, shade with the drawn palette (soft bands, mint rim, grain);
// emissive accents (asteroid veins, sign edges) keep their colour
export function drawnify(mat, { rim = 0.28, lift = 1.25, keepEmissive = 0.7 } = {}) {
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    if (prev) prev(sh, r);
    Object.assign(sh.uniforms, STYLE);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + DRAWN_GLSL)
      .replace('#include <opaque_fragment>', `#include <opaque_fragment>
        { float k_ = drawnK();
          if (k_ > 0.0) {
            vec3 c_ = gl_FragColor.rgb;
            float L_ = dot(c_, vec3(0.2126, 0.7152, 0.0722)); L_ = L_ / (L_ + 0.3);
            vec3 N_ = normalize(normal), V_ = normalize(vViewPosition);
            float fr_ = pow(1.0 - clamp(dot(N_, V_), 0.0, 1.0), 2.6);
            vec3 d_ = drawnRamp(L_ * ${lift.toFixed(2)} + (dGrain() - 0.5) * 0.05);
            d_ += dLin(vec3(0.62, 0.95, 0.84)) * fr_ * ${rim.toFixed(2)};
            d_ += totalEmissiveRadiance * ${keepEmissive.toFixed(2)};
            gl_FragColor.rgb = mix(c_, d_, k_);
          }
          gl_FragColor.rgb += dRimGlow(); }`);
  };
  const pk = mat.customProgramCacheKey && mat.customProgramCacheKey !== THREE.Material.prototype.customProgramCacheKey ? mat.customProgramCacheKey() : '';
  const key = `drawn|${rim}|${lift}|${keepEmissive}|${prev ? prev.toString().length : 0}|${pk}`;
  mat.customProgramCacheKey = () => key;
  mat.needsUpdate = true;
  return mat;
}

