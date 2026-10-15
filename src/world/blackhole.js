import * as THREE from 'three';
import { HASH } from '../core/glsl.js';
import { EQUIRECT } from './sky.js';

// ---------------------------------------------------------------------
// A Gargantua-style black hole. Each pixel's ray is bent around a
// Schwarzschild mass (units of the Schwarzschild radius), picking up a thin
// accretion disk with Doppler beaming wherever it crosses the disk plane,
// then samples the same Milky Way panorama the sky uses (plus procedural
// stars) in the bent direction. Outside the lensing zone the billboard fades
// out so it blends seamlessly with the real sky behind it.
// ---------------------------------------------------------------------
export function createBlackHole({ sky, scale = 2.2, tilt = 0.16, steps = 110, influence = 34 } = {}) {
  const group = new THREE.Group();
  const u = {
    uTime: { value: 0 }, tSky: { value: sky.tex }, uSkyM: { value: new THREE.Matrix3() }, uSkyGain: { value: sky.skyU.uGain.value },
    uCenter: { value: new THREE.Vector3() }, uScale: { value: scale }, uRot: { value: new THREE.Matrix3() }, uR: { value: influence }, uVis: { value: 1 },
  };
  const rot = new THREE.Matrix4().makeRotationX(tilt).multiply(new THREE.Matrix4().makeRotationZ(-0.08));
  u.uRot.value.setFromMatrix4(rot).invert();                       // world -> disk space
  const mat = new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false,
    vertexShader: `varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: /* glsl */ `
      ${HASH}
      ${EQUIRECT}
      uniform sampler2D tSky; uniform mat3 uSkyM,uRot; uniform vec3 uCenter; uniform float uTime,uScale,uR,uSkyGain,uVis; varying vec3 vW;
      vec3 skyCol(vec3 d){
        vec3 c=texture2D(tSky, eqUV(uSkyM*d)).rgb*uSkyGain*0.85; c=mix(c, c*vec3(0.92,0.98,1.08), 0.5);
        // crisp procedural stars, lensed with the rest of the sky
        vec3 q=d*220.0; vec3 id=floor(q); float h=h21(id.xy+id.z*17.13);
        if(h>0.985){ vec3 f=fract(q)-0.5; float s=exp(-dot(f,f)*90.0)*pow((h-0.985)/0.015,3.0)*3.0; c+=mix(vec3(0.7,0.8,1.0),vec3(1.0,0.85,0.7),h21(id.zy))*s; }
        return c;
      }
      vec3 diskCol(vec3 hp, vec3 rd){
        float r=length(hp.xz);
        float ang=atan(hp.z,hp.x);
        float omega=1.0/pow(r,1.5);
        float n1=vfbm(vec2(r*2.6, ang*5.0/6.2831853*6.0 + uTime*omega*3.0));
        float n2=vnoise(vec2(r*14.0, ang*3.0 + uTime*omega*5.0));
        float dens=smoothstep(2.5,3.1,r)*smoothstep(11.5,4.5,r);
        dens*=0.35+n1*1.1+n2*0.3;
        dens=pow(dens,1.4);
        // temperature falls with radius: white-gold inside, deep amber outside
        float T=pow(3.0/r, 0.9);
        vec3 c=mix(vec3(1.0,0.38,0.10), vec3(1.0,0.82,0.55), clamp(T,0.0,1.0));
        c=mix(c, vec3(1.0,0.97,0.9), smoothstep(0.9,1.4,T));
        // Doppler beaming: material orbits counter-clockwise
        vec3 vel=normalize(vec3(-hp.z,0.0,hp.x))*sqrt(0.5/r);
        float b=length(vel); float g=1.0/sqrt(1.0-b*b);
        float D=1.0/(g*(1.0-dot(vel, -rd)));
        float beam=clamp(pow(D,3.0),0.25,3.2);
        return c*dens*beam*1.9*T;
      }
      void main(){
        vec3 roW=cameraPosition; vec3 rdW=normalize(vW-cameraPosition);
        vec3 ro=uRot*((roW-uCenter)/uScale); vec3 rd=normalize(uRot*rdW);
        // impact parameter relative to the hole
        float b=length(cross(ro,rd));
        float edge=1.0-smoothstep(uR*0.55, uR*0.95, b);
        if(edge<=0.001){ discard; }
        // advance to the influence sphere
        float tc=-dot(ro,rd); float h2=uR*uR-(dot(ro,ro)-tc*tc);
        vec3 p=ro+rd*max(0.0, tc-sqrt(max(h2,0.0)));
        vec3 v=rd;
        vec3 L=cross(p,v); float hh=dot(L,L);
        vec3 col=vec3(0.0); float trans=1.0; bool hole=false;
        for(int i=0;i<${steps};i++){
          float r2=dot(p,p); float r=sqrt(r2);
          if(r<1.0){ hole=true; break; }
          float dt=clamp(0.06*r*r/(1.0+r*0.4), 0.025, 2.2);
          vec3 acc=-1.5*hh*p/(r2*r2*r);
          vec3 v2=normalize(v+acc*dt);
          vec3 p2=p+v2*dt;
          if(p.y*p2.y<0.0){
            vec3 hp=mix(p,p2,p.y/(p.y-p2.y));
            float rr=length(hp.xz);
            if(rr>2.3 && rr<13.5){
              vec3 dc=diskCol(hp,v2);
              float a=clamp(dot(dc,vec3(0.3))*0.9,0.0,0.92);
              col+=dc*trans; trans*=1.0-a;
            }
          }
          p=p2; v=v2;
          if(r>uR && dot(p,v)>0.0) break;
          if(trans<0.02) break;
        }
        if(!hole){ col+=skyCol(normalize(transpose(uRot)*v))*trans; }
        gl_FragColor=vec4(col, edge*uVis);
      }`,
  });
  const size = influence * scale * 2.2;
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
  plane.frustumCulled = false;
  plane.renderOrder = 2;
  group.add(plane);
  const tmp = new THREE.Vector3();
  return {
    group, uniforms: u,
    update(t, cam) {
      u.uTime.value = t;
      group.getWorldPosition(tmp); u.uCenter.value.copy(tmp);
      plane.quaternion.copy(cam.quaternion);
      u.uSkyM.value.copy(sky.invMatrix());
      u.uSkyGain.value = sky.skyU.uGain.value;
    },
  };
}
