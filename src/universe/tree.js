import * as THREE from 'three';

// =====================================================================
//  The Tree of Timelines — an EZ-Tree oak turned into light: 90k fibres
//  that follow the bark (energy pulses climbing the wood), sparkle points
//  where the leaves were, a faint plexus web between them, a few fireflies.
//  It sways in a slow wind; a click shakes it and drops glowing leaves.
// =====================================================================
const PAL = /* glsl */ `
vec3 treePal(float h){ vec3 a=vec3(0.95,0.78,0.36), b=vec3(0.55,1.0,0.55), c=vec3(0.45,1.0,0.86);
  return h<0.45 ? mix(a,b,h/0.45) : mix(b,c,(h-0.45)/0.55); }`;
const WIND = /* glsl */ `
uniform float uTime, uShake; uniform vec3 uShakeAt;
vec3 wind(vec3 p){
  float h=clamp((p.y-6.0)/26.0,0.0,1.0); float w=h*h*(3.0-2.0*h);
  vec3 o=vec3(sin(uTime*0.42+p.y*0.11+p.x*0.04), 0.0, cos(uTime*0.33+p.y*0.09+p.z*0.06))*0.34*w;
  o+=vec3(sin(uTime*1.3+p.x*0.3+p.y*0.2), sin(uTime*0.9+p.z*0.25)*0.4, cos(uTime*1.1+p.y*0.27))*0.05*w;
  float near=exp(-length(p-uShakeAt)*0.06);
  o+=vec3(sin(uTime*13.0+p.y*0.6), sin(uTime*10.0+p.x*0.5)*0.4, cos(uTime*11.0+p.z*0.6))*uShake*w*(0.35+near)*0.55;
  return o;
}`;

// where the tree stands (behind the throne) and how big it is
const AT = new THREE.Vector3(0, 0.55, -8.0), SXZ = 1.3, SY = 1.16;

async function bin(url, T) { const r = await fetch(url); if (!r.ok) throw new Error(url + ' ' + r.status); return new T(await r.arrayBuffer()); }
function place(P) { for (let i = 0; i < P.length; i += 3) { P[i] = P[i] * SXZ + AT.x; P[i + 1] = P[i + 1] * SY + AT.y; P[i + 2] = P[i + 2] * SXZ + AT.z; } return P; }

export async function createTree({ tier, base = 'assets/universe/tree/' }) {
  const [fp, fa, lp0, la, pp] = await Promise.all([
    bin(base + 'fib_pos.bin', Float32Array), bin(base + 'fib_att.bin', Uint8Array),
    bin(base + 'leaf_pos.bin', Float32Array), bin(base + 'leaf_att.bin', Uint8Array), bin(base + 'plex_pos.bin', Float32Array)]);
  place(fp); place(lp0); place(pp);
  const group = new THREE.Group();
  const U = { uTime: { value: 0 }, uShake: { value: 0 }, uShakeAt: { value: new THREE.Vector3(0, 20, -6) }, uGlow: { value: 1 }, uPR: { value: tier.dpr } };
  const add = (o) => { o.frustumCulled = false; group.add(o); return o; };

  // ---------------- bark fibres (sampled in random order, so the draw range doubles as a level of detail)
  const fg = new THREE.BufferGeometry();
  fg.setAttribute('position', new THREE.BufferAttribute(fp, 3));
  fg.setAttribute('aA', new THREE.BufferAttribute(fa, 4, true));
  const nF = fp.length / 3;
  fg.setDrawRange(0, Math.floor(nF * (tier.mobile ? 0.45 : tier.low ? 0.7 : 1) / 2) * 2);
  add(new THREE.LineSegments(fg, new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `${WIND} ${PAL} attribute vec4 aA; uniform float uGlow; varying vec3 vC; varying float vA;
      void main(){
        vec3 p=position+wind(position); vec4 mv=modelViewMatrix*vec4(p,1.0);
        float h=aA.x; float pulse=pow(fract(h*3.0-uTime*0.35+aA.w*0.15),18.0);
        vC=treePal(h)*(0.006+aA.z*0.008+pulse*0.08)*uGlow;
        float d=-mv.z; vA=smoothstep(0.4,3.0,d)*mix(1.0,0.6,smoothstep(40.0,160.0,d));
        gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `varying vec3 vC; varying float vA; void main(){ gl_FragColor=vec4(vC*vA*${tier.mobile ? '2.0' : '1.0'},1.0); }`,
  })));

  // ---------------- plexus web between the leaves
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
  add(new THREE.LineSegments(pg, new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `${WIND} uniform float uGlow; varying float vA;
      void main(){ vec3 p=position+wind(position); vec4 mv=modelViewMatrix*vec4(p,1.0); vA=smoothstep(0.5,4.0,-mv.z)*uGlow*(0.75+0.25*sin(uTime*0.8+position.x)); gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `varying float vA; void main(){ gl_FragColor=vec4(vec3(0.25,0.75,0.6)*0.05*vA,1.0); }`,
  })));

  // ---------------- leaf sparkles
  const lg0 = new THREE.BufferGeometry();
  lg0.setAttribute('position', new THREE.BufferAttribute(lp0, 3));
  lg0.setAttribute('aA', new THREE.BufferAttribute(la, 4, true));
  if (tier.mobile) lg0.setDrawRange(0, Math.floor(lp0.length / 3 * 0.6));
  add(new THREE.Points(lg0, new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `${WIND} ${PAL} attribute vec4 aA; uniform float uGlow,uPR; varying vec3 vC; varying float vS; varying float vA;
      void main(){ vec3 p=position+wind(position); vec4 mv=modelViewMatrix*vec4(p,1.0);
        float tw=0.6+0.4*sin(uTime*(1.0+aA.w*2.0)+aA.y*40.0);
        vS=aA.z; vC=treePal(0.55+aA.y*0.45)*(0.035+pow(aA.w,3.0)*0.32)*tw*uGlow;
        float d=-mv.z; vA=smoothstep(0.3,2.5,d);
        gl_PointSize=clamp(uPR*(1.2+pow(aA.z,6.0)*5.0)*(60.0/max(d,1.0)), 1.0, 30.0);
        gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `varying vec3 vC; varying float vS; varying float vA;
      void main(){ vec2 p=gl_PointCoord-0.5; float r=length(p); float a=smoothstep(0.5,0.0,r);
        if (vS>0.97) a+=exp(-abs(p.x)*40.0)*exp(-abs(p.y)*6.0)+exp(-abs(p.y)*40.0)*exp(-abs(p.x)*6.0);
        gl_FragColor=vec4(vC*a*vA,1.0); }`,
  })));

  // crown anchors for falling leaves + bounds for picking
  const crown = []; const bb = new THREE.Box3();
  for (let i = 0; i < lp0.length / 3; i++) { bb.expandByPoint(new THREE.Vector3(lp0[i * 3], lp0[i * 3 + 1], lp0[i * 3 + 2])); if (lp0[i * 3 + 1] > 15) crown.push(i); }

  // ---------------- a few fireflies drifting round the tree
  const FF = tier.mobile ? 30 : 60;
  const ffp = new Float32Array(FF * 3), ffs = new Float32Array(FF * 4);
  for (let i = 0; i < FF; i++) {
    const a = Math.random() * 6.283, rr = 5 + Math.random() * 16;
    ffp.set([AT.x + Math.cos(a) * rr, 4 + Math.random() * 26, AT.z + Math.sin(a) * rr * 0.7], i * 3);
    ffs.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
  }
  const ffg = new THREE.BufferGeometry();
  ffg.setAttribute('position', new THREE.BufferAttribute(ffp, 3)); ffg.setAttribute('aS', new THREE.BufferAttribute(ffs, 4));
  add(new THREE.Points(ffg, new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `uniform float uTime,uPR; attribute vec4 aS; varying vec3 vC; varying float vA;
      void main(){ float t=uTime*(0.08+aS.x*0.12);
        vec3 p=position+vec3(sin(t*2.1+aS.y*30.0)*2.6+sin(t*5.3+aS.z*9.0)*0.6, sin(t*1.7+aS.z*20.0)*1.4, cos(t*1.9+aS.x*25.0)*2.2);
        vec4 mv=modelViewMatrix*vec4(p,1.0);
        float blink=smoothstep(0.2,1.0,sin(uTime*(0.7+aS.w*1.6)+aS.y*40.0)*0.5+0.5);
        vC=mix(vec3(0.95,0.9,0.45), vec3(1.0,0.8,0.4), aS.w)*blink*1.3;
        float d=-mv.z; vA=smoothstep(0.5,3.0,d);
        gl_PointSize=clamp(uPR*(1.6+aS.x*1.6)*(14.0/max(d,1.0)), 1.0, 9.0);
        gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `varying vec3 vC; varying float vA; void main(){ float d=length(gl_PointCoord-0.5); gl_FragColor=vec4(vC*exp(-d*d*26.0)*vA,1.0); }`,
  })));

  // ---------------- falling leaves (pooled GPU particles)
  const LN = 700;
  const lp = new Float32Array(LN * 3), lb = new Float32Array(LN).fill(-999), ls = new Float32Array(LN * 4);
  for (let i = 0; i < LN; i++) ls.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.BufferAttribute(lp, 3));
  lg.setAttribute('aBirth', new THREE.BufferAttribute(lb, 1));
  lg.setAttribute('aS', new THREE.BufferAttribute(ls, 4));
  add(new THREE.Points(lg, new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `${PAL} uniform float uTime,uPR; attribute float aBirth; attribute vec4 aS; varying vec3 vC; varying float vA; varying float vRot;
      void main(){
        float age=uTime-aBirth; float vf=0.9+aS.x*1.1;
        float fall=age*vf - min(age,0.6)*vf*0.3; float deck=1.55;
        vec3 p=position; p.y=max(deck, p.y-fall);
        float air=step(deck+0.01, position.y-fall); float fl=age*(1.4+aS.y*1.6);
        p.x+=(sin(fl+aS.z*20.0)*0.9+age*(aS.w-0.5)*0.9)*(0.4+0.6*air);
        p.z+=(cos(fl*0.8+aS.w*15.0)*0.7+age*0.25)*(0.4+0.6*air);
        float tland=(position.y-deck)/vf; float after=max(0.0, age-tland);
        vA=(age>0.0 ? 1.0:0.0)*smoothstep(0.0,0.35,age)*(1.0-smoothstep(1.2,3.2,after));
        vC=treePal(0.5+aS.x*0.5)*(0.9+0.5*sin(fl*3.0)); vRot=fl;
        vec4 mv=modelViewMatrix*vec4(p,1.0); float d=-mv.z;
        gl_PointSize=clamp(uPR*(2.6+aS.y*2.0)*(18.0/max(d,1.0)), 1.0, 22.0);
        gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `varying vec3 vC; varying float vA; varying float vRot;
      void main(){ vec2 c=gl_PointCoord-0.5; float s=sin(vRot), co=cos(vRot); c=mat2(co,-s,s,co)*c;
        float leaf=exp(-(c.x*c.x*60.0+c.y*c.y*14.0)); if(vA<=0.001) discard; gl_FragColor=vec4(vC*leaf*vA,1.0); }`,
  })));
  let li = 0;
  function shake(at) {
    U.uShake.value = Math.min(1.6, U.uShake.value + 1.0);
    if (at) U.uShakeAt.value.copy(at);
    const n = 45 + Math.floor(Math.random() * 25), t = U.uTime.value;
    for (let k = 0; k < n; k++) {
      const ni = crown[Math.floor(Math.random() * crown.length)];
      lp[li * 3] = lp0[ni * 3]; lp[li * 3 + 1] = lp0[ni * 3 + 1]; lp[li * 3 + 2] = lp0[ni * 3 + 2];
      lb[li] = t + Math.random() * 0.8; li = (li + 1) % LN;
    }
    lg.attributes.position.needsUpdate = true; lg.attributes.aBirth.needsUpdate = true;
  }

  // picking: the crown's ellipsoid + the trunk
  const crownC = new THREE.Vector3(), crownR = new THREE.Vector3();
  bb.getCenter(crownC); bb.getSize(crownR).multiplyScalar(0.5);
  const hitV = new THREE.Vector3();
  function hit(ray) {
    const o = ray.origin.clone().sub(crownC).divide(crownR), d = ray.direction.clone().divide(crownR);
    const a = d.dot(d), b = 2 * o.dot(d), c = o.dot(o) - 1, D = b * b - 4 * a * c;
    let best = Infinity;
    if (D > 0) { const t = (-b - Math.sqrt(D)) / (2 * a); if (t > 0) best = t; }
    for (let t = 2; t < 120; t += 0.5) {
      ray.at(t, hitV);
      if (hitV.y > 1.5 && hitV.y < 15 && Math.hypot(hitV.x - AT.x, hitV.z - AT.z) < 3.6) { best = Math.min(best, t); break; }
    }
    return best;
  }

  return {
    group, uniforms: U, shake, hit,
    update(t, dt) { U.uTime.value = t; U.uShake.value *= Math.pow(0.18, dt); },
  };
}
