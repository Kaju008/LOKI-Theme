import * as THREE from 'three';
import { HASH } from '../core/glsl.js';

// ---------------------------------------------------------------------
// The Timeline Bridge — a Bifrost of light trails.
// Weaving ribbons of light race along a dark glass deck; a faint
// triangulated energy lattice crackles where the trails pass. Every
// line is anti-aliased with screen-space derivatives so it stays crisp.
// ---------------------------------------------------------------------
const PAL = /* glsl */ `
vec3 pal(float t){
  t=fract(t);
  vec3 a=vec3(0.20,0.95,0.70), b=vec3(0.30,0.80,1.00), c=vec3(0.52,0.42,1.00), d=vec3(0.95,0.42,0.80), e=vec3(1.00,0.76,0.38);
  if(t<0.25) return mix(a,b,t/0.25);
  if(t<0.5) return mix(b,c,(t-0.25)/0.25);
  if(t<0.75) return mix(c,d,(t-0.5)/0.25);
  return mix(d,mix(e,a,0.15),(t-0.75)/0.25);
}`;

export function createBridge({ width = 16, length = 1400, front = 160, y = 0, playhead = 0, trails = 14, env, hue = 0 } = {}) {
  const group = new THREE.Group();
  const zc = front - length / 2;

  // dark glass deck
  const deckMat = new THREE.MeshPhysicalMaterial({ color: 0x020307, metalness: 0.0, roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.22, envMap: env, envMapIntensity: 0.22, reflectivity: 0.4 });
  const slab = new THREE.Mesh(new THREE.BoxGeometry(width + 0.4, 0.6, length), deckMat);
  slab.position.set(0, y - 0.3, zc);
  group.add(slab);

  const uniforms = {
    uTime: { value: 0 }, uLen: { value: length }, uWidth: { value: width }, uFront: { value: front },
    uPlayhead: { value: playhead }, uBoost: { value: 1 }, uFlow: { value: 1 }, uHue: { value: hue },
  };
  const N = trails;
  const mat = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    extensions: { derivatives: true },
    vertexShader: `varying vec2 vUv; varying vec3 vW; void main(){ vUv=uv; vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */ `
      ${HASH}
      ${PAL}
      uniform float uTime,uLen,uWidth,uFront,uPlayhead,uBoost,uFlow,uHue; varying vec2 vUv; varying vec3 vW;
      void main(){
        float x=(vUv.x-0.5)*uWidth;
        float z=vW.z;
        float dist=length(cameraPosition-vW);
        float ax=fwidth(x);
        vec3 col=vec3(0.0);
        float near=0.0;
        // --- light trails
        for(int i=0;i<${N};i++){
          float fi=float(i);
          float r=h11(fi*3.71+1.3), r2=h11(fi*9.13+2.7), r3=h11(fi*5.31+0.4);
          float lane=(fi+0.5)/${N}.0;
          float amp=0.35+r*0.9;
          float xc=(lane-0.5)*uWidth*0.86
                   + sin(z*(0.010+r*0.018)+fi*1.7+uTime*(0.15+r*0.25))*amp
                   + sin(z*(0.041+r2*0.03)+r*9.0-uTime*0.4)*0.22;
          float d=abs(x-xc);
          float w=0.018+r2*0.05;
          float aa=ax*1.25+dist*0.00035;
          float core=1.0-smoothstep(w, w+aa, d);
          float halo=exp(-d*d/(0.03+r*0.10));
          // pulses racing toward the viewer, each with a long fading tail
          float sp=(26.0+r*80.0)*uFlow;
          float L=55.0+r2*150.0;
          float ph=fract((z-uTime*sp)/L + r3*7.0);
          float head=1.0-smoothstep(0.985,1.0,ph);
          float trail=pow(ph,2.5+r*7.0)*head;
          float inten=0.10+trail*3.2;
          vec3 c=pal(lane*0.9+uHue+0.03*sin(uTime*0.07+fi));
          c=mix(c, vec3(1.0), trail*trail*0.35);                       // white-hot heads
          col+=c*(core*inten*1.25 + halo*inten*0.16);
          near=max(near, halo*(0.25+trail));
        }
        // --- energy lattice (triangulated), lit where trails pass
        vec2 g=vec2(x*1.25, z*0.62);
        vec2 s=vec2(g.x+g.y*0.5, g.y);
        vec2 id=floor(s); vec2 f=fract(s);
        float tri=step(f.x,f.y);
        float de=min(min(min(f.x,f.y),min(1.0-f.x,1.0-f.y)), abs(f.x-f.y)*0.7071);
        float lw=fwidth(de);
        float grid=1.0-smoothstep(0.0, lw*1.4, de);
        float cr=h21(id+tri*17.3);
        float flick=step(0.965, h21(id*1.7+tri*5.1+floor(uTime*7.0+cr*40.0)));
        // electric veins crawling between the lanes
        float vn=vnoise(vec2(x*0.9, z*0.11-uTime*2.2)+vec2(uTime*0.3,0.0));
        float vein=pow(1.0-abs(vn*2.0-1.0), 26.0);
        vec3 ec=mix(vec3(0.35,0.95,1.0), vec3(0.6,0.5,1.0), cr);
        col+=ec*(grid*(0.018+near*0.22) + flick*near*0.5 + vein*(0.12+near*0.9));
        // --- rails
        float ex=abs(x)-uWidth*0.5;
        float rail=1.0-smoothstep(0.0, ax*1.5+0.02, abs(ex+0.06));
        float rp=pow(fract((z-uTime*60.0)/40.0),6.0);
        col+=vec3(0.65,1.0,0.95)*rail*(0.55+rp*2.0);
        col+=vec3(0.3,0.8,1.0)*exp(-abs(ex)*3.0)*0.05;
        // --- playhead (subtle accent at the throne)
        float pd=abs(z-uPlayhead);
        float ph2=(1.0-smoothstep(0.03, 0.03+fwidth(z)*1.5, pd))*0.9 + exp(-pd*1.2)*0.05;
        float kf=step(0.5, fract(x*0.5+0.25));
        col+=vec3(1.0,0.9,0.7)*ph2*(0.6+0.4*sin(uTime*2.0));
        // fade far + near
        float fade=smoothstep(uFront, uFront-30.0, z)*smoothstep(uFront-uLen, uFront-uLen+380.0, z);
        float lod=smoothstep(520.0, 40.0, dist);
        float nearK=mix(0.28,1.0,smoothstep(2.0,22.0,dist));          // no glare at grazing angles right under the lens
        col*=fade*mix(0.4,1.0,lod)*nearK*uBoost;
        gl_FragColor=vec4(col,1.0);
      }`,
  });
  const top = new THREE.Mesh(new THREE.PlaneGeometry(width, length, 1, 1), mat);
  top.rotation.x = -Math.PI / 2;
  top.position.set(0, y + 0.012, zc);
  group.add(top);

  // under-glow so the bridge reads as a beam of light from below
  const under = new THREE.Mesh(new THREE.PlaneGeometry(width * 3.2, length), new THREE.ShaderMaterial({
    uniforms: { uFront: uniforms.uFront, uLen: uniforms.uLen, uTime: uniforms.uTime }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: `varying vec2 vUv; varying vec3 vW; void main(){ vUv=uv; vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform float uFront,uLen,uTime; varying vec2 vUv; varying vec3 vW;
      void main(){ float x=abs(vUv.x-0.5)*2.0; float a=exp(-x*x*9.0);
        float fade=smoothstep(uFront, uFront-40.0, vW.z)*smoothstep(uFront-uLen, uFront-uLen+300.0, vW.z);
        gl_FragColor=vec4(vec3(0.10,0.42,0.62)*a*fade*0.16,1.0); }`,
  }));
  under.rotation.x = -Math.PI / 2;
  under.position.set(0, y - 1.4, zc);
  group.add(under);
  return { group, uniforms };
}

// ---------------------------------------------------------------------
// Timeline strands — thick volumetric plasma ribbons fanning out behind
// the throne (Loki's branching timelines), with sparks travelling along
// them. Ribbons are camera-facing strips, so they read as volumes from
// any angle; sparks sample the curves from a texture on the GPU.
// ---------------------------------------------------------------------
const SAMPLES = 256;
export function createStrands({ origin = new THREE.Vector3(0, 3.5, -1.5), count = 18, spread = 1, seed = 2, branches = true, sparks = 60, reach = 1, widthK = 1 } = {}) {
  const group = new THREE.Group();
  const uniforms = { uTime: { value: 0 }, uAlpha: { value: 1 } };
  let s = seed * 9301 + 49297;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const palette = [new THREE.Color(0.22, 1.0, 0.62), new THREE.Color(0.25, 0.85, 1.0), new THREE.Color(1.0, 0.72, 0.30), new THREE.Color(0.55, 0.42, 1.0), new THREE.Color(0.3, 1.0, 0.85)];

  const curves = [];
  for (let i = 0; i < count; i++) {
    const side = i % 2 ? 1 : -1;
    const a = (0.15 + rnd() * 0.85) * side;
    const lift = rnd();
    const p0 = origin.clone().add(new THREE.Vector3(a * 0.6, rnd() * 1.6, -rnd() * 0.4));
    const p1 = new THREE.Vector3(a * (4 + rnd() * 10) * spread, origin.y + 3 + lift * 8, origin.z - 6 - rnd() * 14);
    const p2 = new THREE.Vector3(a * (20 + rnd() * 50) * spread, origin.y + 10 + lift * 45, origin.z - 50 - rnd() * 110);
    const p3 = new THREE.Vector3(a * (60 + rnd() * 140) * spread, origin.y + 20 + lift * 130, origin.z - 170 - rnd() * 300 * reach);
    const col = palette[i % 5 === 0 ? 2 : i % 7 === 3 ? 3 : i % 3 === 0 ? 4 : i % 2];
    const w = (0.10 + rnd() * 0.22) * widthK;
    curves.push({ curve: new THREE.CatmullRomCurve3([p0, p1, p2, p3]), col, w, from: 0 });
    if (branches && rnd() > 0.35) {
      // a thinner branch splitting off and diverging
      const c = curves[curves.length - 1].curve;
      const t0 = 0.25 + rnd() * 0.3;
      const b0 = c.getPointAt(t0);
      const dir = c.getTangentAt(t0);
      const off = new THREE.Vector3((rnd() - 0.5) * 2, 0.6 + rnd(), (rnd() - 0.5)).multiplyScalar(30 + rnd() * 60);
      const b1 = b0.clone().addScaledVector(dir, 25).add(off.clone().multiplyScalar(0.35));
      const b2 = b0.clone().addScaledVector(dir, 120 * reach).add(off.clone().multiplyScalar(1.6));
      const bc = palette[Math.floor(rnd() * 5)];
      curves.push({ curve: new THREE.CatmullRomCurve3([b0, b1, b2]), col: bc, w: w * 0.55, from: 0.0 });
    }
  }

  // ---- ribbons
  const SEG = 160;
  const ribbonMat = (col, seedV, sp, w) => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uTime: uniforms.uTime, uAlpha: uniforms.uAlpha, uC: { value: col }, uSeed: { value: seedV }, uSp: { value: sp }, uW: { value: w } },
    vertexShader: /* glsl */ `
      uniform float uTime,uW,uSeed; attribute float aT; attribute float aSide; attribute vec3 aTan;
      varying float vT; varying float vS; varying float vDepth;
      void main(){
        vT=aT; vS=aSide;
        vec4 mv=modelViewMatrix*vec4(position,1.0);
        vec3 tv=normalize((modelViewMatrix*vec4(aTan,0.0)).xyz);
        vec3 side=normalize(cross(tv, normalize(-mv.xyz)));
        float breathe=0.8+0.2*sin(uTime*1.3+aT*18.0+uSeed*20.0);
        float w=uW*(0.45+aT*aT*14.0)*breathe;                      // thicker as it reaches into space
        w=max(w, -mv.z*0.0028);                                      // never thinner than ~1.5px
        mv.xyz+=side*aSide*w;
        vDepth=-mv.z;
        gl_Position=projectionMatrix*mv;
      }`,
    fragmentShader: /* glsl */ `
      ${HASH}
      uniform float uTime,uAlpha,uSeed,uSp; uniform vec3 uC; varying float vT; varying float vS; varying float vDepth;
      void main(){
        float v=vS;                                              // -1..1 across
        float core=exp(-v*v*22.0);
        float body=exp(-v*v*3.2);
        // plasma flowing outward along the strand
        float flow=vfbm(vec2(vT*38.0-uTime*uSp*9.0, v*1.6+uSeed*10.0));
        float fil=pow(1.0-abs(vnoise(vec2(vT*90.0-uTime*uSp*20.0, v*3.0+uSeed*7.0))*2.0-1.0), 10.0);
        float pulse=pow(fract(vT*2.2-uTime*uSp*1.6+uSeed), 8.0);
        float a=body*(0.16+flow*0.38) + core*(0.55+flow*0.9+pulse*2.2) + fil*body*0.6;
        a*=smoothstep(0.0,0.04,vT)*smoothstep(1.0,0.6,vT)*uAlpha;
        vec3 c=mix(uC, vec3(1.0), core*0.22+pulse*core*0.3);
        gl_FragColor=vec4(c*a,1.0);
      }`,
  });

  curves.forEach((cv, k) => {
    const pts = cv.curve.getSpacedPoints(SEG);
    const pos = new Float32Array((SEG + 1) * 2 * 3), tan = new Float32Array((SEG + 1) * 2 * 3), at = new Float32Array((SEG + 1) * 2), sd = new Float32Array((SEG + 1) * 2);
    for (let i = 0; i <= SEG; i++) {
      const t = i / SEG, p = pts[i], tg = cv.curve.getTangentAt(t);
      for (let e = 0; e < 2; e++) {
        const j = i * 2 + e;
        pos.set([p.x, p.y, p.z], j * 3); tan.set([tg.x, tg.y, tg.z], j * 3); at[j] = t; sd[j] = e ? 1 : -1;
      }
    }
    const idx = [];
    for (let i = 0; i < SEG; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aTan', new THREE.BufferAttribute(tan, 3));
    g.setAttribute('aT', new THREE.BufferAttribute(at, 1));
    g.setAttribute('aSide', new THREE.BufferAttribute(sd, 1));
    g.setIndex(idx);
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, ribbonMat(cv.col, rnd(), 0.05 + rnd() * 0.08, cv.w));
    m.frustumCulled = false;
    group.add(m);
  });

  // ---- sparks travelling along the curves (positions sampled from a texture)
  const C = curves.length;
  const data = new Float32Array(SAMPLES * C * 4);
  curves.forEach((cv, r) => {
    const pts = cv.curve.getSpacedPoints(SAMPLES - 1);
    pts.forEach((p, i) => data.set([p.x, p.y, p.z, 1], (r * SAMPLES + i) * 4));
  });
  const tex = new THREE.DataTexture(data, SAMPLES, C, THREE.RGBAFormat, THREE.FloatType);
  tex.minFilter = tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  const NP = C * sparks;
  const sPos = new Float32Array(NP * 3), sA = new Float32Array(NP * 4), sCol = new Float32Array(NP * 3);
  for (let i = 0; i < NP; i++) {
    const r = Math.floor(i / sparks);
    sA.set([r, rnd(), 0.015 + rnd() * 0.05, rnd()], i * 4);
    const c = curves[r].col; sCol.set([c.r, c.g, c.b], i * 3);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  sg.setAttribute('aS', new THREE.BufferAttribute(sA, 4));
  sg.setAttribute('aCol', new THREE.BufferAttribute(sCol, 3));
  const sm = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: uniforms.uTime, uAlpha: uniforms.uAlpha, tC: { value: tex }, uRows: { value: C }, uPR: { value: Math.min(devicePixelRatio || 1, 1.75) } },
    vertexShader: /* glsl */ `
      uniform float uTime,uRows,uPR; uniform sampler2D tC; attribute vec4 aS; attribute vec3 aCol; varying vec3 vC; varying float vA;
      vec3 at(float t){ float x=t*${SAMPLES - 1}.0; float i0=floor(x); float f=x-i0; float row=(aS.x+0.5)/uRows;
        vec3 a=texture2D(tC, vec2((i0+0.5)/${SAMPLES}.0,row)).xyz; vec3 b=texture2D(tC, vec2((min(i0+1.0,${SAMPLES - 1}.0)+0.5)/${SAMPLES}.0,row)).xyz; return mix(a,b,f); }
      void main(){
        float t=fract(aS.y+uTime*aS.z);
        vec3 p=at(t);
        p+=vec3(sin(uTime*1.7+aS.w*40.0), cos(uTime*1.3+aS.w*30.0), sin(uTime*1.1+aS.w*20.0))*(0.05+t*t*3.5);
        vec4 mv=modelViewMatrix*vec4(p,1.0);
        vC=mix(aCol, vec3(1.0), 0.5);
        vA=smoothstep(0.0,0.05,t)*smoothstep(1.0,0.7,t);
        gl_PointSize=uPR*(1.5+aS.w*3.0)*(40.0/max(-mv.z,1.0))*(1.0+t*6.0);
        gl_PointSize=clamp(gl_PointSize,1.0,18.0);
        gl_Position=projectionMatrix*mv;
      }`,
    fragmentShader: `uniform float uAlpha; varying vec3 vC; varying float vA; void main(){ float d=length(gl_PointCoord-0.5); float a=exp(-d*d*28.0); gl_FragColor=vec4(vC*a*vA*uAlpha*1.6,1.0); }`,
  });
  const sp = new THREE.Points(sg, sm);
  sp.frustumCulled = false;
  group.add(sp);

  return { group, uniforms, curves };
}
