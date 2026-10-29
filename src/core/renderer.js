import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { NOISE, HASH } from './glsl.js';

export function detectTier() {
  const coarse = matchMedia('(pointer: coarse)').matches;
  const small = Math.min(innerWidth, innerHeight) < 700;
  const cores = navigator.hardwareConcurrency || 4;
  const mobile = coarse || small;
  const low = mobile || cores <= 4;
  return {
    mobile,
    low,
    dpr: Math.min(devicePixelRatio || 1, mobile ? 1.5 : 1.75),
    msaa: mobile ? 0 : 4,
    brain: mobile ? 42000 : low ? 80000 : 120000,
    stars: mobile ? 2600 : 7000,
    asteroids: mobile ? 40 : 110,
    bloomScale: mobile ? 0.5 : 0.75,
    bhSteps: mobile ? 48 : 110,
  };
}

// ---------------------------------------------------------------------
// The time tunnel: a full-screen wormhole that can cover the frame
// completely (so the intro scene and the world can swap underneath it
// without a visible cut) and then open from the centre like an exit.
// ---------------------------------------------------------------------
const TunnelShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 }, uTravel: { value: 0 }, uIn: { value: 0 }, uOpen: { value: 0 },
    uBlur: { value: 0 }, uAspect: { value: 1 }, uTwist: { value: 0.6 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
    ${NOISE}
    ${HASH}
    uniform sampler2D tDiffuse; uniform float uTime,uTravel,uIn,uOpen,uBlur,uAspect,uTwist; varying vec2 vUv;
    vec3 pal(float t){
      vec3 e=vec3(0.10,1.00,0.62), c=vec3(0.20,0.78,1.00), v=vec3(0.55,0.36,1.00), g=vec3(1.00,0.72,0.30);
      t=fract(t); return t<0.33? mix(e,c,t/0.33) : t<0.66? mix(c,v,(t-0.33)/0.33) : mix(v,g,(t-0.66)/0.34);
    }
    void main(){
      vec2 p=(vUv-0.5)*vec2(uAspect,1.0);
      float r=length(p);
      // zoom blur of the scene (sells speed while entering / leaving)
      vec3 scene=vec3(0.0);
      vec2 dir=(vUv-0.5);
      for(int i=0;i<8;i++){ float k=float(i)/7.0; scene+=texture2D(tDiffuse, vUv - dir*k*uBlur*0.22).rgb; }
      scene/=8.0;
      if(uIn<=0.001){ gl_FragColor=vec4(scene,1.0); return; }
      float a=atan(p.y,p.x);
      float z=0.32/max(r,0.012);                   // depth along the tunnel
      float s=z + uTravel;
      float ta=a + z*uTwist*0.08;                   // gentle spiral
      vec3 q=vec3(cos(ta)*1.6, sin(ta)*1.6, s*0.45);
      // nebulous walls
      float neb=fbm(q*vec3(1.0,1.0,0.6))*0.5+0.5;
      float neb2=fbm(q*vec3(2.2,2.2,0.25)+7.0)*0.5+0.5;
      // light streaks: angular bins, each a thin line with travelling dashes
      float bins=72.0; float u=(ta/6.2831853+0.5)*bins; float bi=floor(u); float bf=fract(u);
      float rnd=h11(bi*1.37);
      float w=0.06+0.10*rnd;
      float line=smoothstep(w,0.0,abs(bf-0.5));
      float dash=pow(fract(s*(0.15+rnd*0.35)+rnd*7.0), 6.0+rnd*10.0);
      float streak=line*dash*step(0.35,h11(bi*3.1+floor(s*0.05)));
      vec3 col=pal(rnd*0.9+s*0.004)*streak*(2.6+rnd*2.0);
      col+=mix(vec3(0.02,0.10,0.10),vec3(0.10,0.05,0.22),neb2)*pow(neb,2.0)*1.6;
      col+=pal(neb*0.7+0.1)*pow(neb2,5.0)*0.9;
      // depth fade: far centre glows softly, near edges dimmer
      float depthFade=smoothstep(0.0,0.6,r);
      col*=mix(0.6,1.0,depthFade);
      col+=vec3(0.75,0.95,1.0)*smoothstep(0.2,0.0,r)*0.32;            // vanishing point
      col*=smoothstep(0.0,0.05,r+0.02);
      // aperture: walls close in from the edges (uOpen 1 -> 0) and open from the centre on exit
      float Re=uIn*1.7; float inner=1.0-smoothstep(Re-0.3, Re, r);       // walls grow out from the vanishing point
      float E=-0.3+uOpen*1.9; float hole=smoothstep(E, E+0.32, r);          // the exit opens from the centre
      float m=inner*hole;
      gl_FragColor=vec4(mix(scene, col, m) + col*0.15*m, 1.0);
    }`,
};

const FinalShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uVignette: { value: 0.9 },
    uGrain: { value: 0.035 },
    uCA: { value: 0.0008 },
    uFade: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float uTime,uVignette,uGrain,uCA,uFade; uniform vec2 uRes; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
    void main(){
      vec2 c=vUv-0.5; float d=length(c*vec2(uRes.x/uRes.y,1.0)*0.85);
      vec2 off=c*uCA*(1.0+d*2.0);
      vec3 col=vec3(texture2D(tDiffuse,vUv+off).r, texture2D(tDiffuse,vUv).g, texture2D(tDiffuse,vUv-off).b);
      col*=mix(1.0, smoothstep(1.05,0.25,d), uVignette*0.8);
      float g=h(vUv*uRes+fract(uTime*7.0)*100.0)-0.5; col+=g*uGrain*(0.4+0.6*(1.0-dot(col,vec3(0.33))));
      col=mix(col, vec3(0.0), uFade);
      gl_FragColor=vec4(col,1.0);
    }`,
};


// ---------------------------------------------------------------------
// The drawn world: posterized into a risograph palette (ink black, indigo,
// violet, lavender, mint, cream) with soft ink outlines and print grain.
// uA → uB is the style before/after; uWipe sweeps the change across the
// screen with a glitching digital edge. uGlitch shakes the whole frame.
// ---------------------------------------------------------------------
const ToonShader = {
  uniforms: {
    tDiffuse: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uTime: { value: 0 },
    uA: { value: 0 }, uB: { value: 0 }, uWipe: { value: 1 }, uGlitch: { value: 0 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform vec2 uRes; uniform float uTime, uA, uB, uWipe, uGlitch; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
    float lum(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
    // banded ramp: hard-ish steps with a sliver of softness, like ink layers
    vec3 ramp5(float t, vec3 a, vec3 b, vec3 c, vec3 d, vec3 e){
      t = clamp(t, 0.0, 1.0) * 4.0; float i = floor(t); float f = smoothstep(0.82, 1.0, fract(t));
      vec3 lo = i < 1.0 ? a : i < 2.0 ? b : i < 3.0 ? c : i < 4.0 ? d : e;
      vec3 hi = i < 1.0 ? b : i < 2.0 ? c : i < 3.0 ? d : e;
      return mix(lo, hi, f);
    }
    // Kuwahara (4 quadrants): flattens detail into painted shapes while keeping edges
    vec3 paint(vec2 uv, vec2 px){
      vec3 m[4]; float v[4];
      for (int q = 0; q < 4; q++) {
        vec2 dir = vec2(q == 1 || q == 3 ? 1.0 : -1.0, q >= 2 ? 1.0 : -1.0);
        vec3 sum = vec3(0.0), sq = vec3(0.0);
        for (int j = 0; j < 3; j++) for (int i = 0; i < 3; i++) {
          vec3 c = texture2D(tDiffuse, uv + dir * vec2(float(i), float(j)) * px * 1.15).rgb;
          sum += c; sq += c * c;
        }
        sum /= 9.0; sq = sq / 9.0 - sum * sum;
        m[q] = sum; v[q] = sq.r + sq.g + sq.b;
      }
      vec3 best = m[0]; float bv = v[0];
      for (int q = 1; q < 4; q++) if (v[q] < bv) { bv = v[q]; best = m[q]; }
      return best;
    }
    vec3 toon(vec2 uv){
      vec2 px = 1.0 / uRes;
      vec3 c = paint(uv, px);
      float L = lum(c);
      // soft ink outlines where the painted shapes meet
      float l1 = lum(texture2D(tDiffuse, uv + vec2(px.x * 2.0, 0.0)).rgb), l2 = lum(texture2D(tDiffuse, uv - vec2(px.x * 2.0, 0.0)).rgb);
      float l3 = lum(texture2D(tDiffuse, uv + vec2(0.0, px.y * 2.0)).rgb), l4 = lum(texture2D(tDiffuse, uv - vec2(0.0, px.y * 2.0)).rgb);
      float edge = smoothstep(0.16, 0.42, length(vec2(l1 - l2, l3 - l4)));
      // hue families: greens/teals → mint ramp, everything else → violet ramp, warm highlights → cream
      float mx = max(c.r, max(c.g, c.b)) + 1e-4;
      float green = smoothstep(0.02, 0.14, (c.g - max(c.r, c.b * 0.9)) / mx);
      float warm = smoothstep(0.05, 0.25, (c.r - c.b) / mx) * smoothstep(0.3, 0.65, L);
      float t = pow(L, 0.5) * 1.24;
      float grain = vn(uv * uRes / 2.4) * 0.6 + h(uv * uRes) * 0.4;   // print grain dithers the band edges
      t += (grain - 0.5) * 0.06;
      vec3 vio = ramp5(t, vec3(0.008, 0.006, 0.02), vec3(0.13, 0.09, 0.3), vec3(0.33, 0.24, 0.68), vec3(0.6, 0.5, 0.94), vec3(0.88, 0.86, 1.0));
      vec3 mint = ramp5(t, vec3(0.01, 0.02, 0.03), vec3(0.08, 0.2, 0.2), vec3(0.3, 0.56, 0.52), vec3(0.66, 0.9, 0.82), vec3(0.9, 0.99, 0.94));
      vec3 cream = vec3(0.98, 0.93, 0.82);
      vec3 col = mix(vio, mint, green);
      col = mix(col, cream, warm * 0.5 * step(0.62, t));
      // things already drawn in the style (saturated violets, mint rims) keep their own colour
      float sat = (mx - min(c.r, min(c.g, c.b))) / mx;
      float keep = smoothstep(0.38, 0.72, sat) * smoothstep(0.03, 0.12, L);
      col = mix(col, c * 1.04, keep * 0.85);
      col = mix(col, vec3(0.04, 0.03, 0.09), edge * 0.6);
      col *= 0.94 + 0.08 * vn(uv * uRes / 1.5 + 7.0);
      col += (h(uv * uRes + floor(uTime * 12.0)) - 0.5) * 0.025;
      return col;
    }
    void main(){
      vec2 uv = vUv;
      // whole-frame glitch: row tears and block jumps
      float row = floor(uv.y * 48.0), blk = floor(uv.y * 9.0);
      float tear = (h(vec2(row, floor(uTime * 24.0))) - 0.5) * 0.05 * uGlitch * step(0.72, h(vec2(row * 1.7, floor(uTime * 16.0))));
      tear += (h(vec2(blk, floor(uTime * 9.0))) - 0.5) * 0.02 * uGlitch;
      uv.x += tear;
      // the wipe front: a diagonal sweep with a stepped digital edge
      float s = uv.x * 0.82 + (1.0 - uv.y) * 0.18 + (h(vec2(floor(uv.y * 64.0), 3.0)) - 0.5) * 0.035;
      float f = uWipe * 1.12 - 0.06;
      float behind = step(s, f);
      float amt = mix(uA, uB, behind);
      float band = 1.0 - smoothstep(0.0, 0.035, abs(s - f));
      band *= step(0.001, abs(uB - uA)) * step(0.001, uWipe) * step(uWipe, 0.999);
      // RGB split at the edge and while glitching
      float split = (band * 0.012 + uGlitch * 0.006);
      vec3 real = vec3(texture2D(tDiffuse, uv + vec2(split, 0.0)).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - vec2(split, 0.0)).b);
      vec3 col = real;
      if (amt > 0.001) col = mix(real, toon(uv), amt);
      // a bright mint scan line rides the front
      col += vec3(0.55, 1.0, 0.85) * band * (0.55 + 0.45 * h(vec2(floor(uv.y * 120.0), floor(uTime * 30.0))));
      gl_FragColor = vec4(col, 1.0);
    }`,
};

export function createRenderer(canvas, tier) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', alpha: false, stencil: false });
  renderer.setPixelRatio(tier.dpr);
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x010205, 1);

  const rt = new THREE.WebGLRenderTarget(innerWidth * tier.dpr, innerHeight * tier.dpr, { type: THREE.HalfFloatType, samples: tier.msaa });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(tier.dpr);
  const renderPass = new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera());
  composer.addPass(renderPass);
  const tunnel = new ShaderPass(TunnelShader);
  tunnel.enabled = false;
  composer.addPass(tunnel);
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth * tier.bloomScale, innerHeight * tier.bloomScale), 0.42, 0.22, 0.8);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const toon = new ShaderPass(ToonShader);
  toon.enabled = false;                        // only runs while the drawn world is on (or wiping in)
  composer.addPass(toon);
  const final = new ShaderPass(FinalShader);
  composer.addPass(final);

  function resize() {
    renderer.setSize(innerWidth, innerHeight);
    composer.setSize(innerWidth, innerHeight);
    bloom.setSize(innerWidth * tier.bloomScale, innerHeight * tier.bloomScale);
    final.uniforms.uRes.value.set(innerWidth, innerHeight);
    toon.uniforms.uRes.value.set(innerWidth * tier.dpr, innerHeight * tier.dpr);
    tunnel.uniforms.uAspect.value = innerWidth / innerHeight;
  }
  resize();
  return { renderer, composer, renderPass, bloom, final, tunnel, toon, resize };
}
