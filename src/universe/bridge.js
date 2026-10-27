import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { HASH } from '../core/glsl.js';

// =====================================================================
//  The Timeline Bridge
//  A glass walkway floating in space. Under the glass runs a living
//  editing timeline (video layers, a timecode ruler, audio tracks with
//  waveforms, level meters, a playhead) that scrolls forever. Behind the
//  tree a round plaza splits the bridge into three paths to infinity.
// =====================================================================
export const DECK_Y = 1.5;
export const WIDTH = 8.6;
export const PLAZA = { c: new THREE.Vector3(0, DECK_Y, -5), r: 12.5 };

// Paths in the XZ plane (y = deck). s grows away from the plaza.
// Behind the tree one road leaves the plaza; at the fork (z = FORK_Z) it splits like a Y into
// three roads: left and right peel off the trunk's edges and curve away, the middle runs straight on.
export const FORK_Z = -34;
function makePaths() {
  const P = (x, z) => new THREE.Vector3(x, DECK_Y, z);
  const F = FORK_Z;
  const front = new THREE.CatmullRomCurve3([P(0, PLAZA.c.z + PLAZA.r - 0.6), P(0, 300), P(0, 1100)]);
  const mid = new THREE.CatmullRomCurve3([P(0, PLAZA.c.z - PLAZA.r + 0.6), P(0, F), P(0, F - 140), P(0, F - 520), P(0, -1100)], false, 'centripetal');
  const side = (e) => new THREE.CatmullRomCurve3([P(0, F + 4), P(0, F), P(e * 2.4, F - 12), P(e * 8.5, F - 24), P(e * 19, F - 38), P(e * 46, F - 74), P(e * 150, F - 230), P(e * 420, F - 760)], false, 'centripetal');
  return { front, left: side(-1), mid, right: side(1) };
}
// metres along `curve` where it has drifted `gap` metres from the middle road (the gore of the fork)
function goreS(curve, gap) {
  const L = curve.getLength(), p = new THREE.Vector3();
  for (let s = 0; s < L; s += 0.5) { curve.getPointAt(s / L, p); if (Math.abs(p.x) >= gap) return s; }
  return L;
}

// Flat ribbon along a curve. aUV = (across metres, along metres)
function ribbon(curve, width, step = 2.0, lift = 0) {
  const L = curve.getLength();
  const n = Math.max(2, Math.ceil(L / step));
  const pos = [], uv = [], idx = [];
  const p = new THREE.Vector3(), t = new THREE.Vector3(), side = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    curve.getPointAt(u, p); curve.getTangentAt(u, t);
    side.crossVectors(t, up).normalize();
    for (const e of [-1, 1]) {
      pos.push(p.x + side.x * e * width / 2, p.y + lift, p.z + side.z * e * width / 2);
      uv.push(e * width / 2, u * L);
    }
    if (i < n) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aUV', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

const TIMELINE_FRAG = /* glsl */ `
  ${HASH}
  uniform float uTime, uFlow, uSpeed, uBoost, uW;
  varying vec2 vUV; varying vec3 vW;
  float sdBox(vec2 p, vec2 b, float r){ vec2 q=abs(p)-b+r; return length(max(q,0.0))+min(max(q.x,q.y),0.0)-r; }
  vec3 vidCol(float k){
    k=fract(k);
    vec3 a=vec3(0.26,0.42,1.0), b=vec3(0.58,0.32,1.0), c=vec3(0.10,0.80,0.95), d=vec3(0.95,0.36,0.78);
    return k<0.25?a:k<0.5?b:k<0.75?c:d;
  }
  void main(){
    float x=vUV.x;                       // across, metres (-W/2..W/2)
    float s=vUV.y;                       // along, metres from the plaza
    float sp=s - uTime*uSpeed;           // the timeline flows toward the viewer
    float aa=fwidth(x)*1.2 + 0.002;
    float dist=length(cameraPosition-vW);
    vec3 col=vec3(0.006,0.010,0.020);    // deep panel under the glass
    // fine grid of the editor background
    float gl=1.0-smoothstep(0.0, fwidth(sp*2.0)*1.5, abs(fract(sp*0.5)-0.5)*2.0*0.5);
    col+=vec3(0.02,0.04,0.07)*gl*0.6;
    // ---- track layout (mirror: video layers left, audio right)
    float side=sign(x); float ax=abs(x);
    float row=floor((ax-0.52)/0.74); float rv=(ax-0.52)-row*0.74;      // row index 0..3, local 0..0.74
    bool inRow = ax>0.52 && row>=0.0 && row<4.0 && rv<0.64;
    float vv=rv-0.32;                                                   // -0.32..0.32 across the row
    if(inRow){
      float C=7.0+row*1.7;                                              // cell length per track
      float off=h11(row*7.13+side*3.1)*C;
      float q=(sp+off)/C; float id=floor(q); float f=fract(q)*C;
      float hid=h11(id*1.37+row*11.0+side*5.0);
      float a0=0.15+h11(id*2.11+row)*1.6, a1=C-0.12-h11(id*3.7+row)*2.4;
      float has=step(0.16,hid);
      float mid=(a0+a1)*0.5, hl=(a1-a0)*0.5;
      float d=sdBox(vec2(f-mid, vv), vec2(hl, 0.29), 0.06);
      float body=(1.0-smoothstep(-aa, aa, d))*has;
      float edge=(1.0-smoothstep(0.0, aa*2.0+0.01, abs(d)))*has;
      float lx=f-a0;                                                    // position inside the clip
      if(side<0.0){
        // VIDEO LAYER — coloured clip with filmstrip thumbnails
        vec3 c=vidCol(row*0.25+hid*0.5);
        float fr=fract(lx/1.15); float div=1.0-smoothstep(0.0, aa*3.0, min(fr,1.0-fr)*1.15);
        float img=vfbm(vec2(floor(lx/1.15)*3.1+hid*17.0, vv*4.0)+vec2(0.0,floor(lx/1.15)));
        vec3 thumb=mix(c*0.25, c*0.9+0.08, img)*smoothstep(0.31,0.18,abs(vv+0.03));
        float bar=step(0.20,vv)*step(vv,0.29);                          // label bar
        vec3 fill=mix(thumb, c*1.3, bar);
        fill*=1.0-div*0.6;
        col=mix(col, fill*0.55, body);
        col+=c*edge*1.3;
      } else {
        // AUDIO TRACK — waveform
        vec3 c=mix(vec3(0.15,1.0,0.55), vec3(0.20,0.85,1.0), row/3.0);
        float env=0.35+0.65*smoothstep(0.0,1.2,lx)*smoothstep(0.0,1.2,(a1-a0)-lx);
        float w=vnoise(vec2(sp*3.1+row*9.0, row))*0.6 + vnoise(vec2(sp*11.0, row+3.0))*0.4;
        w=pow(w,1.4)*0.27*env*(0.6+0.4*sin(sp*0.7+row));
        float wave=1.0-smoothstep(w-aa, w+aa, abs(vv));
        float centre=1.0-smoothstep(0.0, aa*2.0, abs(vv));
        col=mix(col, c*0.12, body);
        col+=c*wave*body*0.9 + c*centre*body*0.25;
        col+=c*edge*0.9;
      }
    }
    // ---- timecode ruler down the centre
    if(ax<0.46){
      float t1=1.0-smoothstep(0.0, fwidth(sp)*1.6, abs(fract(sp*2.0)-0.5)*0.5);
      float t2=1.0-smoothstep(0.0, fwidth(sp)*1.6, abs(fract(sp*0.4)-0.5)*2.5);
      float t3=1.0-smoothstep(0.0, fwidth(sp)*2.0, abs(fract(sp*0.1)-0.5)*10.0);
      float k1=step(0.30,ax), k2=step(0.18,ax), k3=1.0;
      vec3 rc=vec3(0.65,0.85,1.0);
      col+=rc*(t1*k1*0.25 + t2*k2*0.45 + t3*k3*0.8)*(1.0-smoothstep(0.40,0.46,ax));
      // keyframe diamonds
      float kq=fract(sp/5.3); float kd=abs(kq-0.5)*5.3;
      float dia=1.0-smoothstep(0.08, 0.08+aa, kd+abs(x)*0.9);
      col+=vec3(1.0,0.75,0.35)*dia*step(0.5,h11(floor(sp/5.3)))*0.9;
    }
    // ---- audio level meters along both edges (LED segments)
    float ex=uW*0.5-ax;
    if(ex>0.12 && ex<0.42){
      float blk=floor((s-uTime*uSpeed*0.0)/15.0);
      float lev=0.35+0.65*pow(vnoise(vec2(blk*1.7+side*4.0, uTime*1.9)),1.2);
      float lp=fract(s/15.0);
      float seg=fract(s/0.36); float segm=step(0.18,seg);
      float lit=step(lp,lev);
      vec3 lc=lp<0.6?vec3(0.15,1.0,0.45):lp<0.85?vec3(1.0,0.82,0.2):vec3(1.0,0.25,0.2);
      col+=lc*segm*(lit*1.1+0.06)*smoothstep(0.12,0.16,ex)*smoothstep(0.42,0.38,ex);
    }
    // ---- playhead by the throne
    float pd=abs(s-2.2);
    float ph=1.0-smoothstep(0.03, 0.03+fwidth(s)*1.5, pd);
    col+=vec3(1.0,0.32,0.22)*(ph*1.6 + exp(-pd*2.5)*0.12);
    // distance fades (the timeline goes on forever)
    float far=smoothstep(900.0, 120.0, dist);
    float lod=mix(0.45,1.0,smoothstep(260.0,30.0,dist));
    col*=uBoost*far*lod;
    gl_FragColor=vec4(col,1.0);
  }`;

const PLAZA_FRAG = /* glsl */ `
  ${HASH}
  uniform float uTime, uBoost, uR; varying vec3 vW;
  void main(){
    vec2 p=vW.xz-vec2(0.0, ${PLAZA.c.z.toFixed(2)});
    float r=length(p); float a=atan(p.x,-p.y);
    float aa=fwidth(r)*1.3+0.002;
    vec3 col=vec3(0.006,0.010,0.020);
    // concentric ruler rings with ticks — a timeline wrapped into a clock
    float ring=1.0-smoothstep(0.0, aa*1.5, abs(fract(r/1.6)-0.5)*1.6-0.76);
    col+=vec3(0.25,0.55,0.9)*ring*0.25*step(2.0,r);
    float tick=1.0-smoothstep(0.0, fwidth(a*30.0)*1.5, abs(fract(a*60.0/6.2831853)-0.5)*1.0-0.46);
    col+=vec3(0.6,0.85,1.0)*tick*step(uR-1.6,r)*step(r,uR-0.9)*0.5;
    // clip arcs orbiting on four rings
    for(int i=0;i<4;i++){
      float fi=float(i); float rr=3.2+fi*1.9;
      float w=1.0-smoothstep(0.26, 0.26+aa, abs(r-rr));
      float ang=fract((a/6.2831853)+uTime*(0.006+fi*0.004)*(mod(fi,2.0)*2.0-1.0));
      float cid=floor(ang*(8.0+fi*3.0)); float cf=fract(ang*(8.0+fi*3.0));
      float on=step(0.25,h11(cid+fi*13.0))*step(0.06,cf)*step(cf,0.86);
      vec3 c=mix(vec3(0.3,0.5,1.0), vec3(0.15,1.0,0.6), fi/3.0);
      col+=c*w*on*0.35;
    }
    // sweeping playhead
    float sw=fract(a/6.2831853 - uTime*0.04);
    col+=vec3(1.0,0.35,0.25)*smoothstep(0.985,1.0,sw)*smoothstep(uR,1.5,r)*0.9;
    col*=smoothstep(uR+0.1, uR-0.3, r)*uBoost;
    gl_FragColor=vec4(col,1.0);
  }`;

export function createTimelineBridge({ tier, env }) {
  const group = new THREE.Group();
  const paths = makePaths();
  const uniforms = { uTime: { value: 0 }, uFlow: { value: 1 }, uSpeed: { value: 2.4 }, uBoost: { value: 1 }, uW: { value: WIDTH }, uR: { value: PLAZA.r } };

  const vert = `attribute vec2 aUV; varying vec2 vUV; varying vec3 vW; void main(){ vUV=aUV; vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;
  const tlMat = new THREE.ShaderMaterial({ uniforms, vertexShader: vert, fragmentShader: TIMELINE_FRAG, extensions: { derivatives: true } });
  const lanes = {};
  const deckGeos = [];
  for (const [k, c] of Object.entries(paths)) {
    const w = WIDTH;
    const g = ribbon(c, w, k === 'front' ? 3 : 2, k === 'left' || k === 'right' ? -0.235 : -0.22);
    const m = new THREE.Mesh(g, tlMat); m.frustumCulled = false; m.renderOrder = k === 'left' || k === 'right' ? 0.9 : 1;
    group.add(m);
    lanes[k] = c;
    deckGeos.push(ribbon(c, w + 0.3, k === 'front' ? 3 : 2, 0));
  }
  // plaza disc
  const plazaGeo = new THREE.CircleGeometry(PLAZA.r, 128); plazaGeo.rotateX(-Math.PI / 2); plazaGeo.translate(PLAZA.c.x, DECK_Y - 0.22, PLAZA.c.z);
  const plaza = new THREE.Mesh(plazaGeo, new THREE.ShaderMaterial({ uniforms, vertexShader: `varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`, fragmentShader: PLAZA_FRAG, extensions: { derivatives: true } }));
  plaza.renderOrder = 1; group.add(plaza);

  // ---- the glass deck: a real planar mirror (desktop) blended with fresnel, panel seams and a cool tint
  const deckFlat = [];
  const flatten = (g) => { const c = g.clone(); c.deleteAttribute('aUV'); c.translate(0, -DECK_Y, 0); c.rotateX(Math.PI / 2); return c; };
  deckGeos.forEach((g) => deckFlat.push(flatten(g)));
  const pg = new THREE.CircleGeometry(PLAZA.r + 0.15, 128); pg.rotateX(-Math.PI / 2); pg.translate(PLAZA.c.x, DECK_Y, PLAZA.c.z); pg.deleteAttribute('uv'); pg.deleteAttribute('normal');
  deckFlat.push(flatten(pg));
  deckFlat.forEach((g) => { if (g.attributes.uv) g.deleteAttribute('uv'); if (g.attributes.normal) g.deleteAttribute('normal'); });
  const merged = mergeFlat(deckFlat);
  const glassShader = {
    uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, uTime: uniforms.uTime, uMirror: { value: tier.mobile ? 0.0 : 1.0 } },
    vertexShader: /* glsl */ `
      uniform mat4 textureMatrix; varying vec4 vUv; varying vec3 vW;
      #include <common>
      #include <logdepthbuf_pars_vertex>
      void main(){ vUv=textureMatrix*vec4(position,1.0); vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w;
        #include <logdepthbuf_vertex>
      }`,
    fragmentShader: /* glsl */ `
      ${HASH}
      uniform sampler2D tDiffuse; uniform float uTime, uMirror; varying vec4 vUv; varying vec3 vW;
      #include <logdepthbuf_pars_fragment>
      void main(){
        #include <logdepthbuf_fragment>
        vec3 V=normalize(cameraPosition-vW);
        float mu=clamp(V.y,0.0,1.0);
        float fres=0.04+0.96*pow(1.0-mu,5.0);
        // faint ripples so the mirror reads as glass, not chrome
        vec2 rp=vec2(vnoise(vW.xz*0.35+uTime*0.02), vnoise(vW.xz*0.35+7.0))-0.5;
        vec4 uv=vUv; uv.xy+=rp*0.35*uv.w*0.04;
        vec3 refl=texture2DProj(tDiffuse, uv).rgb*uMirror;
        // panel seams every 4.3 m and along the centre
        vec2 g=vW.xz/vec2(4.3,4.3); vec2 fg=abs(fract(g)-0.5); vec2 fw=fwidth(g)*1.5;
        float seam=max(1.0-smoothstep(0.0,fw.x,0.5-fg.x), 1.0-smoothstep(0.0,fw.y,0.5-fg.y));
        float dist=length(cameraPosition-vW);
        seam*=smoothstep(140.0,10.0,dist);
        vec3 col=refl*(0.18+fres*0.75) + vec3(0.55,0.8,1.0)*seam*0.06;
        float alpha=clamp(0.12+fres*0.55+seam*0.1, 0.0, 0.92);
        gl_FragColor=vec4(col, alpha);
      }`,
  };
  let glass;
  if (!tier.mobile) {
    glass = new Reflector(merged, { clipBias: 0.003, textureWidth: Math.floor(innerWidth * 0.5), textureHeight: Math.floor(innerHeight * 0.5), shader: glassShader, multisample: 0 });
    glass.material.transparent = true; glass.material.depthWrite = false; glass.material.extensions = { derivatives: true };
  } else {
    const m = new THREE.ShaderMaterial({ ...glassShader, uniforms: { ...glassShader.uniforms, tDiffuse: { value: new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1) }, textureMatrix: { value: new THREE.Matrix4() } }, transparent: true, depthWrite: false, extensions: { derivatives: true } });
    glass = new THREE.Mesh(merged, m);
  }
  glass.rotation.x = -Math.PI / 2; glass.position.y = DECK_Y; glass.renderOrder = 3;
  group.add(glass);
  // an invisible depth deck so particles/roots sit "on" the glass
  const depthDeck = new THREE.Mesh(merged, new THREE.MeshBasicMaterial({ colorWrite: false }));
  depthDeck.rotation.x = -Math.PI / 2; depthDeck.position.y = DECK_Y - 0.25; depthDeck.renderOrder = 0;
  group.add(depthDeck);

  // ---- road arrows: glowing chevrons painted on each road beyond the fork, flowing outward
  const arrowFrag = /* glsl */ `
    uniform float uTime; uniform vec3 uCol; varying vec2 vUV; varying vec3 vW;
    void main(){
      float x=vUV.x, s=vUV.y;
      float k=mod(s-uTime*3.0, 7.0);                      // one chevron every 7 m, travelling away
      float y=k-2.0; float d=abs(y - (1.6-abs(x)*0.9));    // chevron centre-line (points along +s)
      float ch=smoothstep(0.32,0.12,d)*step(abs(x),1.5)*step(0.0,y+0.6)*step(y,2.2);
      float dash=step(abs(x),0.06)*step(fract((s+uTime*3.0)/3.0),0.55)*0.5;    // dashed centre line
      float fade=smoothstep(0.0,6.0,s)*smoothstep(120.0,40.0,s);
      gl_FragColor=vec4(uCol*(ch*1.6+dash*0.6)*fade,1.0);
    }`;
  const ARROW_COL = { left: [0.25, 1.0, 0.75], mid: [1.0, 0.8, 0.35], right: [0.7, 0.5, 1.0] };
  const forkMid = new THREE.CatmullRomCurve3([new THREE.Vector3(0, DECK_Y, FORK_Z - 6), new THREE.Vector3(0, DECK_Y, FORK_Z - 300)]);
  for (const k of ['left', 'mid', 'right']) {
    const c = k === 'mid' ? forkMid : paths[k];
    const L = c.getLength();
    const sub = k === 'mid' ? c : new THREE.CatmullRomCurve3(c.getSpacedPoints(400).filter((q, i, a) => (i / (a.length - 1)) * L > goreS(c, WIDTH * 0.62)), false, 'centripetal');
    const g = ribbon(sub, 3.2, 1.0, 0.012);
    const m = new THREE.Mesh(g, new THREE.ShaderMaterial({ uniforms: { uTime: uniforms.uTime, uCol: { value: new THREE.Vector3(...ARROW_COL[k]) } }, vertexShader: vert, fragmentShader: arrowFrag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.renderOrder = 4; m.frustumCulled = false; group.add(m);
  }

  // ---- rails: posts with amber caps, glass side panels, cyan hand-rail light, violet floor strip
  const rails = createRails(paths, tier, env);
  group.add(rails.group);

  return {
    group, uniforms, paths, glass,
    update(t, dt) { uniforms.uTime.value = t; rails.uniforms.uTime.value = t; },
    resize() { if (glass.getRenderTarget) glass.getRenderTarget().setSize(Math.floor(innerWidth * 0.5), Math.floor(innerHeight * 0.5)); },
  };
}

function mergeFlat(geos) {
  let n = 0, ni = 0;
  for (const g of geos) { n += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
  const pos = new Float32Array(n * 3), idx = new Uint32Array(ni);
  let o = 0, oi = 0;
  for (const g of geos) {
    pos.set(g.attributes.position.array, o * 3);
    if (g.index) { const a = g.index.array; for (let i = 0; i < a.length; i++) idx[oi + i] = a[i] + o; oi += a.length; }
    else { for (let i = 0; i < g.attributes.position.count; i++) idx[oi + i] = o + i; oi += g.attributes.position.count; }
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  out.computeBoundingSphere();
  return out;
}

function createRails(paths, tier, env) {
  const group = new THREE.Group();
  const H = 1.25;
  const posts = [], edges = [];
  const p = new THREE.Vector3(), t = new THREE.Vector3(), sd = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const plazaAngles = [];
  // which paths & sides get rails (skip the inner edges where the three paths meet)
  const trunkL = paths.mid.getLength(), forkS = (PLAZA.c.z - PLAZA.r + 0.6 - FORK_Z);
  const gL = goreS(paths.left, WIDTH + 0.2), gR = goreS(paths.right, WIDTH + 0.2), gM = Math.max(gL, gR) + 18;
  // [side, from s, to s]
  const spec = { front: [[-1, 0, 700], [1, 0, 700]], mid: [[-1, 0, forkS + 4], [1, 0, forkS + 4], [-1, gM, 560], [1, gM, 560]],
    left: [[-1, 4, 520], [1, gL + 4, 520]], right: [[1, 4, 520], [-1, gR + 4, 520]] };
  for (const [k, c] of Object.entries(paths)) {
    const L = c.getLength();
    for (const [e, s0, s1] of spec[k]) {
      const line = [];
      for (let s = s0; s < Math.min(L, s1); s += 1.5) {
        const u = s / L; c.getPointAt(u, p); c.getTangentAt(u, t); sd.crossVectors(t, up).normalize();
        const q = p.clone().addScaledVector(sd, e * (WIDTH / 2 + 0.05));
        line.push(q);
        if (Math.round(s / 1.5) % 2 === 0) posts.push({ q, dir: t.clone() });
      }
      edges.push(line);
    }
  }
  // plaza ring rail with three openings (front + three paths)
  const ring = [];
  const openings = [0, Math.PI];
  const gapA = 0.42;
  let cur = [];
  for (let k = 0; k <= 360; k++) {
    const a = (k / 360) * Math.PI * 2;
    const open = openings.some((o) => Math.abs(Math.atan2(Math.sin(a - o), Math.cos(a - o))) < gapA);
    if (open) { if (cur.length > 1) ring.push(cur); cur = []; continue; }
    const q = new THREE.Vector3(PLAZA.c.x + Math.sin(a) * (PLAZA.r + 0.1), DECK_Y, PLAZA.c.z + Math.cos(a) * (PLAZA.r + 0.1));
    cur.push(q);
    if (k % 4 === 0) posts.push({ q, dir: new THREE.Vector3(Math.cos(a), 0, -Math.sin(a)) });
  }
  if (cur.length > 1) ring.push(cur);
  edges.push(...ring);

  // posts
  const postMat = new THREE.MeshPhysicalMaterial({ color: 0x080a10, metalness: 0.85, roughness: 0.32, clearcoat: 0.5, envMap: env, envMapIntensity: 0.8 });
  const capMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.1, 0.3) });
  const pg = new THREE.BoxGeometry(0.16, H, 0.16); pg.translate(0, H / 2, 0);
  const cg = new THREE.BoxGeometry(0.11, 0.05, 0.36); cg.translate(0, H + 0.09, 0);
  const ip = new THREE.InstancedMesh(pg, postMat, posts.length), ic = new THREE.InstancedMesh(cg, capMat, posts.length);
  const m4 = new THREE.Matrix4(), qq = new THREE.Quaternion();
  posts.forEach((o, i) => { qq.setFromUnitVectors(new THREE.Vector3(0, 0, 1), o.dir.clone().setY(0).normalize()); m4.compose(o.q, qq, new THREE.Vector3(1, 1, 1)); ip.setMatrixAt(i, m4); ic.setMatrixAt(i, m4); });
  ip.frustumCulled = ic.frustumCulled = false;
  group.add(ip, ic);

  // light strips + glass panels built from the edge polylines
  const strip = (line, y0, y1) => {
    const pos = [], vv = [], ss = [], idx = [];
    let acc = 0;
    line.forEach((q, i) => {
      if (i) acc += q.distanceTo(line[i - 1]);
      pos.push(q.x, q.y + y0, q.z, q.x, q.y + y1, q.z); vv.push(0, 1); ss.push(acc, acc);
      if (i < line.length - 1) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aV', new THREE.Float32BufferAttribute(vv, 1));
    g.setAttribute('aS', new THREE.Float32BufferAttribute(ss, 1));
    g.setIndex(idx); g.computeBoundingSphere();
    return g;
  };
  const vS = `attribute float aV,aS; varying float vV,vS; varying vec3 vW; void main(){ vV=aV; vS=aS; vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`;
  const fade = `float dist=length(cameraPosition-vW); float far=smoothstep(700.0,60.0,dist);`;
  const railU = { uTime: { value: 0 } };
  const mkMat = (frag, blend = THREE.AdditiveBlending) => new THREE.ShaderMaterial({ uniforms: railU, vertexShader: vS, fragmentShader: frag, transparent: true, depthWrite: false, blending: blend, side: THREE.DoubleSide });
  const handMat = mkMat(`uniform float uTime; varying float vV,vS; varying vec3 vW; void main(){ ${fade}
      float core=exp(-pow((vV-0.5)*5.0,2.0)); float pulse=pow(fract(vS/38.0-uTime*0.35),14.0);
      vec3 c=vec3(0.2,0.85,1.0)*(core*1.7+pulse*core*3.0); gl_FragColor=vec4(c*far,1.0); }`);
  const floorMat = mkMat(`varying float vV,vS; varying vec3 vW; void main(){ ${fade} float core=exp(-pow((vV-0.5)*4.0,2.0)); gl_FragColor=vec4(vec3(0.6,0.3,1.0)*core*1.1*far,1.0); }`);
  const glassMat = mkMat(`varying float vV,vS; varying vec3 vW; void main(){ ${fade}
      vec3 V=normalize(cameraPosition-vW); float edgeTop=smoothstep(0.88,1.0,vV); float edgeBot=smoothstep(0.1,0.0,vV);
      float panel=abs(fract(vS/3.0)-0.5)*2.0; float div=smoothstep(0.96,1.0,panel);
      float sheen=pow(vnoise(vec2(vS*0.08, vV*2.0)),3.0)*0.25;
      vec3 c=vec3(0.35,0.6,0.9)*(0.018+edgeTop*0.16+edgeBot*0.08+div*0.08+sheen*0.12);
      gl_FragColor=vec4(c*far,1.0); }`.replace('void main', `${HASH}\nvoid main`));
  for (const line of edges) {
    if (line.length < 2) continue;
    group.add(new THREE.Mesh(strip(line, H - 0.03, H + 0.05), handMat));
    group.add(new THREE.Mesh(strip(line, 0.12, H - 0.06), glassMat));
    group.add(new THREE.Mesh(strip(line.map((q) => q), 0.0, 0.05), floorMat));
  }
  group.children.forEach((m) => { if (m.isMesh && !m.isInstancedMesh) m.frustumCulled = false; });
  return { group, uniforms: railU };
}
