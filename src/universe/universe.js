import * as THREE from 'three';
import { createSky } from '../world/sky.js';
import { createPlanet, setDragAxes } from '../world/planets.js';
import { createMotes, createShootingStars } from '../world/space.js';
import { createTimelineBridge, DECK_Y, PLAZA } from './bridge.js';
import { createTree } from './tree.js';
import { createThrone, createRocks } from './props.js';
import { createSignpost } from './signpost.js';
import { createAtmosphere } from './atmos.js';

// =====================================================================
//  The Universe — the Blender scene rebuilt live for the web.
//  Throne on a glass timeline bridge, the Tree of Timelines behind it,
//  Saturn and its moon, glowing asteroids. Everything is interactive.
// =====================================================================
export async function createUniverse(renderer, tier) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 6000);
  camera.position.set(0, 9.5, 46);
  const loader = new THREE.TextureLoader();

  const sky = await createSky(renderer, tier, loader);
  const env = sky.env;
  scene.add(sky.group);
  scene.environment = env; scene.environmentIntensity = 0.45;
  scene.background = new THREE.Color(0x000000);
  // depth: distant objects sink into a deep blue haze
  scene.fog = new THREE.FogExp2(0x03060c, 0.0052);

  // ---- light: soft warm key on the throne, subtle teal rim, the tree's own green-gold glow
  scene.add(new THREE.HemisphereLight(0x2c3a5c, 0x05060a, 0.55));
  const key = new THREE.DirectionalLight(0xffd2a8, 2.1); key.position.set(-14, 22, 26); scene.add(key);
  const rim = new THREE.DirectionalLight(0x5fe8d8, 1.5); rim.position.set(10, 14, -30); scene.add(rim);
  const rim2 = new THREE.DirectionalLight(0x6aa8ff, 0.7); rim2.position.set(-18, 8, -20); scene.add(rim2);
  const treeGlow = new THREE.PointLight(0x9dffb0, 60, 26, 2); treeGlow.position.set(0, 9, -5); scene.add(treeGlow);
  const amber = new THREE.PointLight(0xffb060, 10, 14, 2); amber.position.set(0, 3.2, 6); scene.add(amber);

  const updaters = [];
  const sfx = tier.mobile ? '-sm' : '';
  const L = (u, srgb = true) => { const t = loader.load(u); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };

  // ---- bridge + timeline
  const bridge = createTimelineBridge({ tier, env });
  scene.add(bridge.group);
  updaters.push((t, dt) => bridge.update(t, dt));

  // ---- throne, tree, rocks (exported from Blender)
  const [throne, tree, rocks, sign] = await Promise.all([createThrone({ env, tier }), createTree({ tier }), createRocks({ env, tier }), createSignpost({ env })]);
  scene.add(throne.group, tree.group, rocks.group, sign.group, sign.lamp);
  updaters.push((t, dt) => sign.update(t, dt));
  updaters.push((t, dt) => tree.update(t, dt), (t, dt) => rocks.update(t, dt));

  // ---- planets: Saturn behind-right, its moon on the left
  const SAT_N = new THREE.Vector3(-0.2, 0.93, 0.31).normalize();
  const SAT_SUN = new THREE.Vector3(0.77, 0.63, 0.07).normalize();
  const saturn = createPlanet({ map: L('assets/space/saturn.webp'), radius: 177, atmo: new THREE.Color(0.55, 0.75, 1.0), atmoK: 0.9, ring: { tex: L('assets/space/ring.png') }, spin: 0.01, gain: 1.05, soft: 0.16, night: 0.012 });
  saturn.group.position.set(274, 187, -1113);
  saturn.axis.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), SAT_N);
  saturn.axis.traverse((o) => { if (o.material && o.material.uniforms && o.material.uniforms.uSun) o.material.uniforms.uSun.value = SAT_SUN; });
  const moon = createPlanet({ map: L('assets/space/moon.webp'), radius: 21.8, atmo: new THREE.Color(0.5, 0.65, 1.0), atmoK: 0.35, soft: 0.12, gain: 1.2, bump: L('assets/space/moon.webp', false), spin: 0.02, night: 0.03 });
  moon.group.position.set(-140, 66, -387);
  moon.axis.traverse((o) => { if (o.material && o.material.uniforms && o.material.uniforms.uSun) o.material.uniforms.uSun.value = SAT_SUN; });
  const planets = [saturn, moon];
  planets.forEach((p) => { scene.add(p.group); p.home = p.group.position.clone(); updaters.push((t, dt) => p.update(t, dt)); });

  // ---- clouds, mist and haze
  const atmos = createAtmosphere(tier); scene.add(atmos.group);
  updaters.push((t) => atmos.update(t));

  // ---- dust + shooting stars
  const motes = createMotes(tier); scene.add(motes.object);
  const shooting = createShootingStars(tier.mobile ? 3 : 6); scene.add(shooting.group);
  updaters.push((t, dt, cam) => shooting.update(t, dt, cam));

  // =================== interaction ===================
  // drag/throw asteroids · drag planets (and spin them) · click the tree to shake it
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(-9, -9);
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), plane = new THREE.Plane(), hitP = new THREE.Vector3();
  const camDir = new THREE.Vector3(), camUp = new THREE.Vector3(), camRight = new THREE.Vector3();
  let drag = null, hovered = null, enabled = false, down = null;
  const sphereHit = (c, r) => { tmp.subVectors(c, ray.ray.origin); const tca = tmp.dot(ray.ray.direction); if (tca < 0) return Infinity; const d2 = tmp.lengthSq() - tca * tca; return d2 > r * r ? Infinity : tca - Math.sqrt(r * r - d2); };
  function pick() {
    ray.setFromCamera(ndc, camera);
    let best = null, bd = Infinity;
    for (const r of rocks.rocks) { const d = sphereHit(r.mesh.position, r.r * 1.1); if (d < bd) { bd = d; best = { kind: 'rock', o: r }; } }
    for (const p of planets) { p.group.getWorldPosition(tmp2); const d = sphereHit(tmp2, p.radius); if (d < bd) { bd = d; best = { kind: 'planet', o: p }; } }
    const dt = tree.hit(ray.ray); if (dt < bd) { bd = dt; best = { kind: 'tree', d: dt }; }
    return best;
  }
  const blocked = (el) => el && el.closest && el.closest('a,button,input,textarea,label,.hud,.gate,.board,.menu,.overlay');
  addEventListener('pointermove', (e) => {
    ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    if (!drag) return;
    ray.setFromCamera(ndc, camera);
    if (!ray.ray.intersectPlane(plane, hitP)) return;
    const now = performance.now(), dtm = Math.max(8, now - drag.t) / 1000; drag.t = now;
    if (drag.kind === 'rock') {
      const r = drag.o; tmp.copy(hitP).sub(drag.grab);
      r.vel.subVectors(tmp, r.mesh.position).divideScalar(dtm).clampLength(0, 60);
      r.mesh.position.copy(tmp);
    } else if (drag.kind === 'planet') {
      const p = drag.o; tmp.copy(hitP).sub(drag.grab);
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
      p.group.position.copy(tmp);
      p.state.vel.set(dx * 0.004 / dtm, dy * 0.004 / dtm).clampLength(0, 4);
      p.axis.rotateOnWorldAxis(camUp, dx * 0.003); p.axis.rotateOnWorldAxis(camRight, dy * 0.003);
    }
    if (down) down.moved += Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0);
  }, { passive: true });
  addEventListener('pointerdown', (e) => {
    if (!enabled || e.button !== 0 || blocked(e.target)) return;
    ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    const h = pick(); if (!h) return;
    down = { h, moved: 0, x: e.clientX, y: e.clientY };
    if (h.kind === 'tree') return;
    camera.getWorldDirection(camDir);
    camUp.copy(camera.up).applyQuaternion(camera.quaternion).normalize(); camRight.crossVectors(camDir, camUp).normalize();
    setDragAxes(camUp, camRight);
    const c = h.kind === 'rock' ? h.o.mesh.position : h.o.group.position;
    plane.setFromNormalAndCoplanarPoint(camDir.clone().negate(), c);
    ray.setFromCamera(ndc, camera); ray.ray.intersectPlane(plane, hitP);
    drag = { kind: h.kind, o: h.o, grab: hitP.clone().sub(c), t: performance.now(), x: e.clientX, y: e.clientY };
    if (h.kind === 'rock') { h.o.drag = true; h.o.vel.set(0, 0, 0); h.o.spin.multiplyScalar(0.3); }
    else { h.o.state.drag = true; h.o.state.target = 1; }
    document.body.classList.add('dragging');
    e.preventDefault();
  });
  addEventListener('pointerup', (e) => {
    if (down && down.h.kind === 'tree' && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 8) {
      ray.setFromCamera(ndc, camera); tree.shake(ray.ray.at(down.h.d, new THREE.Vector3()));
    }
    down = null;
    if (!drag) return;
    if (drag.kind === 'rock') { drag.o.drag = false; drag.o.idle = 0; drag.o.spin.set((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2).multiplyScalar(drag.o.vel.length() * 0.05 + 0.2); }
    else { drag.o.state.drag = false; drag.o.state.target = 0; }
    drag = null; document.body.classList.remove('dragging');
  });
  let frame = 0;
  function hover() {
    if (drag || (frame++ % 3)) return;
    const h = enabled ? pick() : null;
    const k = h ? h.kind : null;
    if (k !== hovered) { hovered = k; document.body.dataset.hover = k || ''; }
  }

  // =================== frame ===================
  function update(t, dt) {
    sky.update(t, camera, 0);
    motes.uniforms.uTime.value = t; motes.uniforms.uCam.value.copy(camera.position);
    for (const u of updaters) u(t, dt, camera);
    hover();
  }
  function resize() { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); bridge.resize(); }

  return {
    scene, camera, update, resize, bridge, tree, throne, rocks, planets, sky, sign, atmos, DECK_Y, PLAZA,
    setInteractive(v) { enabled = v; if (!v) document.body.dataset.hover = ''; },
    paths: bridge.paths,
  };
}
