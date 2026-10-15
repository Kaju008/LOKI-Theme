import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

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
    brain: mobile ? 42000 : low ? 80000 : 130000,
    stars: mobile ? 3500 : 9000,
    asteroids: mobile ? 70 : 180,
    bloomScale: mobile ? 0.5 : 0.75,
  };
}

const FinalShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uVignette: { value: 0.95 },
    uGrain: { value: 0.045 },
    uCA: { value: 0.0015 },
    uFlash: { value: 0 },
    uFade: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float uTime,uVignette,uGrain,uCA,uFlash,uFade; uniform vec2 uRes; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
    void main(){
      vec2 c=vUv-0.5; float d=length(c);
      vec2 off=c*uCA*(1.0+d*2.0);
      vec3 col=vec3(texture2D(tDiffuse,vUv+off).r, texture2D(tDiffuse,vUv).g, texture2D(tDiffuse,vUv-off).b);
      col*=mix(1.0, smoothstep(0.95,0.18,d), uVignette*0.85);
      float g=h(vUv*uRes+fract(uTime*7.0)*100.0)-0.5; col+=g*uGrain;
      col=mix(col, vec3(1.0,0.98,0.95), uFlash);
      col=mix(col, vec3(0.0), uFade);
      gl_FragColor=vec4(col,1.0);
    }`,
};

export function createRenderer(canvas, tier) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', alpha: false, stencil: false });
  renderer.setPixelRatio(tier.dpr);
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x020308, 1);

  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(tier.dpr);
  const renderPass = new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera());
  composer.addPass(renderPass);
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth * tier.bloomScale, innerHeight * tier.bloomScale), 0.9, 0.3, 1.25);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const final = new ShaderPass(FinalShader);
  composer.addPass(final);

  function resize() {
    renderer.setSize(innerWidth, innerHeight);
    composer.setSize(innerWidth, innerHeight);
    bloom.setSize(innerWidth * tier.bloomScale, innerHeight * tier.bloomScale);
    final.uniforms.uRes.value.set(innerWidth, innerHeight);
  }
  resize();
  return { renderer, composer, renderPass, bloom, final, resize };
}
