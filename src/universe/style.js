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
};

export const DRAWN_GLSL = /* glsl */ `
uniform float uDFrom, uDTo, uDFront, uDTime; uniform vec2 uDRes;
float dh_(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float dn_(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(dh_(i),dh_(i+vec2(1,0)),f.x), mix(dh_(i+vec2(0,1)),dh_(i+vec2(1,1)),f.x), f.y); }
// which world this pixel is in (matches the wipe line drawn by the post pass)
float drawnK(){
  if (uDFrom == uDTo) return uDTo;
  vec2 q = gl_FragCoord.xy / uDRes;
  float s = q.x * 0.82 + (1.0 - q.y) * 0.18 + (dh_(vec2(floor(q.y * 64.0), 3.0)) - 0.5) * 0.035;
  return mix(uDFrom, uDTo, step(s, uDFront * 1.12 - 0.06));
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
    '\nvoid main(){ main_real(); gl_FragColor *= 1.0 - drawnK(); }';
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
          } }`);
  };
  const key = `drawn|${rim}|${lift}|${keepEmissive}|${prev ? prev.toString().length : 0}`;
  mat.customProgramCacheKey = () => key;
  mat.needsUpdate = true;
  return mat;
}
