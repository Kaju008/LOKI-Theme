import * as THREE from 'three';

// ---------------------------------------------------------------------
// The Timeline Bridge — a Bifrost made of editing tracks.
// Multicolour lanes of clips flow along an obsidian bridge; a glowing
// playhead crosses it where the throne stands.
// ---------------------------------------------------------------------
export function createBridge({ width = 16, length = 1400, front = 160, y = 0, playhead = 0, lanes = 22, env } = {}) {
  const group = new THREE.Group();
  const zc = front - length / 2;

  // obsidian glass slab
  const slab = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.6, 0.5, length),
    new THREE.MeshPhysicalMaterial({ color: 0x030408, metalness: 0.35, roughness: 0.6, clearcoat: 0.25, clearcoatRoughness: 0.4, envMap: env, envMapIntensity: 0.35 })
  );
  slab.position.set(0, y - 0.26, zc);
  group.add(slab);

  const uniforms = {
    uTime: { value: 0 }, uLen: { value: length }, uWidth: { value: width }, uFront: { value: front },
    uPlayhead: { value: playhead }, uLanes: { value: lanes }, uBoost: { value: 1 }, uFlow: { value: 1 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec2 vUv; varying vec3 vW; void main(){ vUv=uv; vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */ `
      uniform float uTime,uLen,uWidth,uFront,uPlayhead,uLanes,uBoost,uFlow; varying vec2 vUv; varying vec3 vW;
      float h1(float n){ return fract(sin(n*127.1)*43758.5453); }
      float h2(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      vec3 hue(float h){ return clamp(abs(mod(h*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0,0.0,1.0); }
      void main(){
        float u = vUv.x;                       // across
        float z = vW.z;                        // world along
        float dist = length(cameraPosition - vW);
        float L = uLanes;
        float lane = floor(u*L); float lf = fract(u*L);
        float hs = h1(lane+3.0);
        // palette sweep across lanes (bifrost spectrum, biased to cyan/green/violet)
        float hh = mix(0.42, 1.08, lane/(L-1.0)) + sin(uTime*0.05)*0.03;
        vec3 lc = mix(hue(fract(hh)), vec3(1.0), 0.12);
        float speed = (5.0 + hs*14.0) * uFlow;
        float s = -z + uTime*speed;                       // flows toward the viewer
        float cellLen = 5.0 + h1(lane*7.1)*12.0;
        float cell = floor(s/cellLen); float cf = fract(s/cellLen);
        float on = step(0.32, h2(vec2(cell, lane)));
        float gap = 0.04 + h2(vec2(cell+3.1, lane))*0.12;
        float inClip = on * step(gap, cf) * step(cf, 1.0-gap*0.4);
        float laneEdge = smoothstep(0.16, 0.04, lf) + smoothstep(0.84, 0.96, lf);
        float ends = smoothstep(gap+0.02, gap, cf) + smoothstep(1.0-gap*0.4-0.02, 1.0-gap*0.4, cf);
        float body = 0.05 + 0.05*sin(cf*40.0 + lane)*step(0.5,hs);         // keyframe ticks
        // waveform for audio-like lanes
        float wave = 0.0;
        if (hs > 0.72) { float amp = 0.18 + 0.22*abs(sin(s*1.7+lane)*sin(s*0.37)); wave = smoothstep(0.06,0.0,abs(lf-0.5) - amp*0.5) * 0.5; }
        float clip = inClip * (body + laneEdge*0.3 + ends*0.55 + wave*0.7);
        // fast light streaks (bifrost shimmer)
        float sk = smoothstep(0.985, 1.0, fract(s*0.02 + hs*7.0 - uTime*0.6*(0.5+hs))) * smoothstep(0.5,0.1,abs(lf-0.5));
        // separators + rails
        float sep = smoothstep(0.03, 0.0, min(lf, 1.0-lf)) * 0.12;
        float rail = smoothstep(0.012, 0.0, u) + smoothstep(0.988, 1.0, u);
        float railInner = smoothstep(0.03, 0.0, abs(u-0.02)) + smoothstep(0.03, 0.0, abs(u-0.98));
        // underglow sweep
        vec3 under = hue(fract(u*0.9 + 0.45 - uTime*0.02)) * 0.025;
        vec3 col = under + lc*(clip*0.8 + sk*1.8 + sep*0.6) + vec3(0.6,1.0,0.95)*rail*1.1 + lc*railInner*0.18;
        // playhead across the bridge at the throne
        float pd = abs(z - uPlayhead);
        float ph = smoothstep(0.25, 0.0, pd)*1.1 + exp(-pd*0.8)*0.06;
        col += vec3(0.75,1.0,0.9) * ph * (0.85+0.15*sin(uTime*3.0));
        // fade far/near
        float fade = smoothstep(uFront, uFront-30.0, z) * smoothstep(uFront-uLen, uFront-uLen+380.0, z);
        float lod = smoothstep(420.0, 60.0, dist);
        col *= fade * mix(0.35, 1.0, lod) * uBoost;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const top = new THREE.Mesh(new THREE.PlaneGeometry(width, length, 1, 1), mat);
  top.rotation.x = -Math.PI / 2;
  top.position.set(0, y + 0.01, zc);
  group.add(top);
  return { group, uniforms };
}

// ---------------------------------------------------------------------
// Multiverse strands — timelines fanning out behind the throne (Loki).
// ---------------------------------------------------------------------
export function createStrands({ origin = new THREE.Vector3(0, 3.5, -1.5), count = 26, spread = 1, seed = 2 } = {}) {
  const group = new THREE.Group();
  const uniforms = { uTime: { value: 0 }, uAlpha: { value: 1 } };
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const palette = [new THREE.Color(0.25, 1, 0.55), new THREE.Color(0.2, 0.85, 1), new THREE.Color(1, 0.78, 0.3), new THREE.Color(0.65, 0.4, 1), new THREE.Color(1, 0.35, 0.75)];
  for (let i = 0; i < count; i++) {
    const side = i % 2 ? 1 : -1;
    const a = (rnd() * 0.9 + 0.1) * side;
    const p0 = origin.clone().add(new THREE.Vector3(a * 0.8, rnd() * 2.5, -rnd() * 0.5));
    const p1 = new THREE.Vector3(a * (6 + rnd() * 18) * spread, origin.y + 4 + rnd() * 14, origin.z - 8 - rnd() * 22);
    const p2 = new THREE.Vector3(a * (30 + rnd() * 70) * spread, origin.y + 14 + rnd() * 60, origin.z - 60 - rnd() * 140);
    const p3 = new THREE.Vector3(a * (70 + rnd() * 160) * spread, origin.y + 20 + rnd() * 140, origin.z - 180 - rnd() * 320);
    const curve = new THREE.CatmullRomCurve3([p0, p1, p2, p3]);
    const geo = new THREE.TubeGeometry(curve, 140, 0.03 + rnd() * 0.12, 6, false);
    const col = palette[i % 5 === 0 ? 2 : i % 7 === 0 ? 3 : i % 11 === 0 ? 4 : Math.floor(rnd() * 2)];
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: uniforms.uTime, uAlpha: uniforms.uAlpha, uC: { value: col }, uSeed: { value: rnd() }, uSp: { value: 0.08 + rnd() * 0.15 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
      fragmentShader: `uniform float uTime,uAlpha,uSeed,uSp; uniform vec3 uC; varying vec2 vUv;
        void main(){ float x=vUv.x; float p1 = smoothstep(0.06,0.0,abs(fract(x*3.0 - uTime*uSp*3.0 + uSeed)-0.5)-0.44);
          float p2 = smoothstep(0.02,0.0,abs(fract(x*9.0 - uTime*uSp*7.0 + uSeed*3.0)-0.5)-0.48);
          float base = 0.10 + 0.06*sin(x*40.0+uSeed*10.0);
          float a = (base + p1*1.4 + p2*0.7) * smoothstep(0.0,0.16,x) * smoothstep(1.0,0.55,x) * uAlpha;
          float core = 1.0 - abs(vUv.y-0.5)*2.0;
          gl_FragColor = vec4(mix(uC, vec3(1.0), p1*0.35)*a*(0.6+core*0.6), 1.0); }`,
    });
    group.add(new THREE.Mesh(geo, mat));
  }
  return { group, uniforms };
}
