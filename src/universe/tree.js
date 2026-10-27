import * as THREE from 'three';
import { HASH } from '../core/glsl.js';

// =====================================================================
//  The Tree of Timelines — exported from the Blender scene as raw GPU
//  data: braided fibres, star nodes, plexus lines and roots. Everything
//  sways in a slow cosmic wind; energy pulses climb the fibres; a click
//  shakes the crown and drops glowing leaves onto the glass bridge.
// =====================================================================
const PAL = /* glsl */ `
vec3 treePal(float t){
  vec3 c0=vec3(0.85,1.0,0.70), c1=vec3(0.15,1.0,0.35), c2=vec3(0.0,0.78,0.38), c3=vec3(1.0,0.72,0.25), c4=vec3(0.95,0.85,0.40), c5=vec3(0.20,0.90,0.45);
  if(t<0.2) return mix(c0,c1,t/0.2);
  if(t<0.42) return mix(c1,c2,(t-0.2)/0.22);
  if(t<0.62) return mix(c2,c3,(t-0.42)/0.2);
  if(t<0.82) return mix(c3,c4,(t-0.62)/0.2);
  return mix(c4,c5,(t-0.82)/0.18);
}`;
// shared wind: heavier at the crown, a sharper shake after a click
const WIND = /* glsl */ `
uniform float uTime, uShake; uniform vec3 uShakeAt;
vec3 wind(vec3 p){
  float h=clamp((p.y-3.0)/28.0,0.0,1.0); float w=h*h*(3.0-2.0*h);
  vec3 o=vec3(sin(uTime*0.42+p.y*0.11+p.x*0.04), 0.0, cos(uTime*0.33+p.y*0.09+p.z*0.06))*0.32*w;
  o+=vec3(sin(uTime*1.3+p.x*0.3+p.y*0.2), sin(uTime*0.9+p.z*0.25)*0.4, cos(uTime*1.1+p.y*0.27))*0.05*w;
  float near=exp(-length(p-uShakeAt)*0.06);
  o+=vec3(sin(uTime*13.0+p.y*0.6), sin(uTime*10.0+p.x*0.5)*0.4, cos(uTime*11.0+p.z*0.6))*uShake*w*(0.35+near)*0.55;
  return o;
}`;

async function getBin(url) { const r = await fetch(url); if (!r.ok) throw new Error(url + ' ' + r.status); return r.arrayBuffer(); }
// Blender (x,y,z) z-up -> three.js (x, z, -y)
function toThree(f32) { for (let i = 0; i < f32.length; i += 3) { const y = f32[i + 1]; f32[i + 1] = f32[i + 2]; f32[i + 2] = -y; } return f32; }
function lines(buf, n, segs) {
  const P = toThree(new Float32Array(buf, 0, n * 3).slice());
  const A = new Uint8Array(buf, n * 12, n * 4).slice();
  const I = new Uint32Array(buf.slice(n * 16, n * 16 + segs * 8));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P, 3));
  g.setAttribute('aA', new THREE.BufferAttribute(A, 4, true));
  g.setIndex(new THREE.BufferAttribute(I, 1));
  g.computeBoundingSphere();
  return g;
}

export async function createTree({ tier, base = 'assets/universe/' }) {
  const meta = await (await fetch(base + 'meta.json')).json();
  const M = meta.meta;
  const [fb, rb, pb, nb] = await Promise.all(['tree_fibres.bin', 'tree_roots.bin', 'tree_plexus.bin', 'tree_nodes.bin'].map((f) => getBin(base + f)));
  const group = new THREE.Group();
  const U = { uTime: { value: 0 }, uShake: { value: 0 }, uShakeAt: { value: new THREE.Vector3(0, 20, -6) }, uGlow: { value: 1 }, uPR: { value: tier.dpr } };

  // ---------------- fibres (trunk, limbs, branches)
  const fg = lines(fb, M.fibres.points, M.fibres.segs);
  const lod = tier.mobile ? M.fibres.lod[0] : tier.low ? M.fibres.lod[1] : M.fibres.lod[2];
  fg.setDrawRange(0, lod * 2);
  const fibreMat = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `${WIND}
      attribute vec4 aA; uniform float uGlow; varying vec3 vC; varying float vA;
      ${PAL}
      void main(){
        vec3 p=position+wind(position);
        vec4 mv=modelViewMatrix*vec4(p,1.0);
        float along=aA.z, tint=aA.x, br=aA.y*3.0;
        float pulse=pow(fract(along*1.7-uTime*0.21+tint*7.31),14.0);
        float base=0.26+br*0.16;
        vec3 c=treePal(tint);
        vC=c*(base+pulse*2.0)*uGlow + vec3(1.0,0.96,0.8)*pulse*0.35*uGlow;
        float d=-mv.z; vA=smoothstep(0.4,3.0,d)*mix(1.0,0.55,smoothstep(40.0,160.0,d));
        gl_Position=projectionMatrix*mv;
      }`,
    fragmentShader: `varying vec3 vC; varying float vA; void main(){ gl_FragColor=vec4(vC*vA*0.24,1.0); }`,
  });
  const fibres = new THREE.LineSegments(fg, fibreMat); fibres.frustumCulled = false; group.add(fibres);

  // ---------------- roots pouring onto the glass (take the floor's colours)
  const rg = lines(rb, M.roots.points, M.roots.segs);
  const rootMat = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `${WIND}
      attribute vec4 aA; uniform float uGlow; varying vec3 vC; varying float vA;
      ${PAL}
      vec3 floorPal(float x){ x=clamp(x*0.5+0.5,0.0,1.0); vec3 a=vec3(0.0,0.8,1.0), b=vec3(0.55,0.25,1.0), c=vec3(1.0,0.6,0.15);
        return x<0.5? mix(a,b,x*2.0) : mix(b,c,(x-0.5)*2.0); }
      void main(){
        vec4 mv=modelViewMatrix*vec4(position,1.0);
        float along=aA.z;
        float pulse=pow(fract(along*2.2+uTime*0.3+aA.x*5.0),12.0);   // light flows INTO the tree
        vec3 c=mix(treePal(aA.x), floorPal(position.x/4.3), aA.w);
        vC=c*(0.22+pulse*1.6)*uGlow; vA=smoothstep(0.4,3.0,-mv.z)*(1.0-along*0.5);
        gl_Position=projectionMatrix*mv;
      }`,
    fragmentShader: `varying vec3 vC; varying float vA; void main(){ gl_FragColor=vec4(vC*vA*0.6,1.0); }`,
  });
  const roots = new THREE.LineSegments(rg, rootMat); roots.frustumCulled = false; group.add(roots);

  // ---------------- plexus constellation lines in the crown
  const pg = lines(pb, M.plexus.points, M.plexus.segs);
  const plexMat = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `${WIND} attribute vec4 aA; uniform float uGlow; varying vec3 vC; varying float vA; ${PAL}
      void main(){ vec3 p=position+wind(position); vec4 mv=modelViewMatrix*vec4(p,1.0);
        float tw=0.6+0.4*sin(uTime*0.8+aA.x*40.0);
        vC=treePal(aA.x)*0.22*tw*uGlow; vA=smoothstep(0.5,4.0,-mv.z); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `varying vec3 vC; varying float vA; void main(){ gl_FragColor=vec4(vC*vA,1.0); }`,
  });
  const plexus = new THREE.LineSegments(pg, plexMat); plexus.frustumCulled = false; group.add(plexus);

  // ---------------- star nodes (the leaves, dissolved into particles)
  const nN = M.nodes.points;
  const NP = toThree(new Float32Array(nb, 0, nN * 3).slice());
  const NA = new Uint8Array(nb, nN * 12, nN * 4).slice();
  const ng = new THREE.BufferGeometry();
  ng.setAttribute('position', new THREE.BufferAttribute(NP, 3));
  ng.setAttribute('aA', new THREE.BufferAttribute(NA, 4, true));
  if (tier.mobile) ng.setDrawRange(0, Math.floor(nN * 0.55));
  const nodeMat = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `${WIND} attribute vec4 aA; uniform float uGlow,uPR; varying vec3 vC; varying float vA; ${PAL}
      void main(){ vec3 p=position+wind(position); vec4 mv=modelViewMatrix*vec4(p,1.0);
        float big=aA.z; float tw=0.55+0.45*sin(uTime*(1.2+aA.w*2.5)+aA.w*60.0);
        vec3 c=mix(treePal(aA.x), vec3(1.0,0.95,0.8), step(0.93,aA.w)*0.6);
        vC=c*(0.35+aA.y*1.1)*tw*uGlow;
        float d=-mv.z; vA=smoothstep(0.3,2.5,d);
        gl_PointSize=clamp(uPR*(1.2+big*6.0)*(22.0/max(d,1.0)), 1.0, 26.0);
        gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `varying vec3 vC; varying float vA; void main(){ vec2 c=gl_PointCoord-0.5; float d=length(c); float a=exp(-d*d*22.0);
      float x=exp(-abs(c.x)*40.0)*exp(-abs(c.y)*6.0)+exp(-abs(c.y)*40.0)*exp(-abs(c.x)*6.0);
      gl_FragColor=vec4(vC*(a+x*0.35)*vA,1.0); }`,
  });
  const nodes = new THREE.Points(ng, nodeMat); nodes.frustumCulled = false; group.add(nodes);

  // crown anchor points for leaves (upper nodes)
  const crown = [];
  for (let i = 0; i < nN; i++) if (NP[i * 3 + 1] > 14) crown.push(i);

  // ---------------- fireflies: a few tiny motes drifting slowly round the tree
  const FF = tier.mobile ? 140 : 320;
  const fp = new Float32Array(FF * 3), fs = new Float32Array(FF * 4);
  for (let i = 0; i < FF; i++) {
    const r = Math.random();
    let x, y, z;
    if (r < 0.55) { const a = Math.random() * 6.283, rr = Math.sqrt(Math.random()); x = Math.cos(a) * rr * 22; z = -6 + Math.sin(a) * rr * 9; y = 12 + Math.random() * 20; }
    else { x = (Math.random() - 0.5) * 18; z = -12 + Math.random() * 30; y = 2.2 + Math.random() * 9; }
    fp.set([x, y, z], i * 3); fs.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
  }
  const ffg = new THREE.BufferGeometry();
  ffg.setAttribute('position', new THREE.BufferAttribute(fp, 3)); ffg.setAttribute('aS', new THREE.BufferAttribute(fs, 4));
  const ffMat = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `uniform float uTime,uPR; attribute vec4 aS; varying vec3 vC; varying float vA;
      void main(){ float t=uTime*(0.08+aS.x*0.12);
        vec3 p=position+vec3(sin(t*2.1+aS.y*30.0)*2.6+sin(t*5.3+aS.z*9.0)*0.6, sin(t*1.7+aS.z*20.0)*1.4, cos(t*1.9+aS.x*25.0)*2.2);
        vec4 mv=modelViewMatrix*vec4(p,1.0);
        float blink=smoothstep(0.2,1.0,sin(uTime*(0.7+aS.w*1.6)+aS.y*40.0)*0.5+0.5);
        vC=mix(vec3(0.75,1.0,0.28), vec3(1.0,0.82,0.35), aS.w)*blink*1.7;
        float d=-mv.z; vA=smoothstep(0.5,3.0,d);
        gl_PointSize=clamp(uPR*(1.6+aS.x*1.6)*(14.0/max(d,1.0)), 1.0, 9.0);
        gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `varying vec3 vC; varying float vA; void main(){ float d=length(gl_PointCoord-0.5); float a=exp(-d*d*26.0); gl_FragColor=vec4(vC*a*vA,1.0); }`,
  });
  const fireflies = new THREE.Points(ffg, ffMat); fireflies.frustumCulled = false; group.add(fireflies);

  // ---------------- falling leaves (pooled GPU particles)
  const LN = 700;
  const lp = new Float32Array(LN * 3), lb = new Float32Array(LN).fill(-999), ls = new Float32Array(LN * 4);
  for (let i = 0; i < LN; i++) ls.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.BufferAttribute(lp, 3));
  lg.setAttribute('aBirth', new THREE.BufferAttribute(lb, 1));
  lg.setAttribute('aS', new THREE.BufferAttribute(ls, 4));
  const leafMat = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `${PAL} uniform float uTime,uPR; attribute float aBirth; attribute vec4 aS; varying vec3 vC; varying float vA; varying float vRot;
      void main(){
        float age=uTime-aBirth; float vf=0.9+aS.x*1.1;
        float fall=age*vf - min(age,0.6)*vf*0.3;
        float deck=1.55;
        vec3 p=position;
        p.y=max(deck, p.y-fall);
        float air=step(deck+0.01, position.y-fall);
        float fl=age*(1.4+aS.y*1.6);
        p.x+=(sin(fl+aS.z*20.0)*0.9+age*(aS.w-0.5)*0.9)*(0.4+0.6*air)+ (1.0-air)*0.0;
        p.z+=(cos(fl*0.8+aS.w*15.0)*0.7+age*0.25)*(0.4+0.6*air);
        float tland=(position.y-deck)/vf; float after=max(0.0, age-tland);
        vA=(age>0.0 ? 1.0:0.0)*smoothstep(0.0,0.35,age)*(1.0-smoothstep(1.2,3.2,after));
        vC=treePal(aS.x)*(1.3+0.7*sin(fl*3.0));
        vRot=fl;
        vec4 mv=modelViewMatrix*vec4(p,1.0); float d=-mv.z;
        gl_PointSize=clamp(uPR*(2.6+aS.y*2.0)*(18.0/max(d,1.0)), 1.0, 22.0);
        gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `varying vec3 vC; varying float vA; varying float vRot;
      void main(){ vec2 c=gl_PointCoord-0.5; float s=sin(vRot), co=cos(vRot); c=mat2(co,-s,s,co)*c;
        float leaf=exp(-(c.x*c.x*60.0+c.y*c.y*14.0)); if(vA<=0.001) discard; gl_FragColor=vec4(vC*leaf*vA,1.0); }`,
  });
  const leaves = new THREE.Points(lg, leafMat); leaves.frustumCulled = false; group.add(leaves);
  let li = 0;
  const hitV = new THREE.Vector3();
  function shake(at) {
    U.uShake.value = Math.min(1.6, U.uShake.value + 1.0);
    if (at) U.uShakeAt.value.copy(at);
    const n = 45 + Math.floor(Math.random() * 25);
    const t = U.uTime.value;
    let lo = li, cnt = 0;
    for (let k = 0; k < n; k++) {
      const ni = crown[Math.floor(Math.random() * crown.length)];
      lp[li * 3] = NP[ni * 3]; lp[li * 3 + 1] = NP[ni * 3 + 1]; lp[li * 3 + 2] = NP[ni * 3 + 2];
      lb[li] = t + Math.random() * 0.8;
      li = (li + 1) % LN; cnt++;
    }
    lg.attributes.position.needsUpdate = true; lg.attributes.aBirth.needsUpdate = true;
  }

  // picking: crown ellipsoid + trunk cylinder
  const crownC = new THREE.Vector3(0, 21, -6.5), crownR = new THREE.Vector3(23, 10, 8);
  function hit(ray) {
    const o = ray.origin.clone().sub(crownC).divide(crownR), d = ray.direction.clone().divide(crownR);
    const a = d.dot(d), b = 2 * o.dot(d), c = o.dot(o) - 1, D = b * b - 4 * a * c;
    let best = Infinity;
    if (D > 0) { const t = (-b - Math.sqrt(D)) / (2 * a); if (t > 0) best = t; }
    // trunk
    for (let t = 2; t < 120; t += 0.5) {
      ray.at(t, hitV);
      if (hitV.y > 1.5 && hitV.y < 14 && Math.hypot(hitV.x, (hitV.z + 6.5) * 1.6) < 3.2) { best = Math.min(best, t); break; }
    }
    return best;
  }

  return {
    group, uniforms: U, shake, hit,
    update(t, dt) {
      U.uTime.value = t;
      U.uShake.value *= Math.pow(0.18, dt);
    },
  };
}
