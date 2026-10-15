import * as THREE from 'three';
import { createSky, createNebula, SUN_DIR } from './sky.js';
import { createPlanet, setDragAxes } from './planets.js';
import { loadRockTextures, rockMaterial2 } from './rockmat.js';
import { createIsland } from './islands.js';
import { createAsteroids, createShootingStars, createMotes } from './space.js';
import { createBridge, createStrands } from './timeline.js';
import { createThrone } from './throne.js';
import { createHeroCard } from './figure.js';
import { createBlackHole } from './blackhole.js';
import { createPortal } from './portal.js';
import { HERO } from '../config.js';

export const REG = { hero: 0, about: 160, work: 320, skills: 480, contact: 640 };
// sky yaw per chapter (hero, about, work, skills, contact): each chapter frames a different part of the universe
const YAW = [0, 0.95, 1.85, 3.14, 3.9];

export async function createWorld(renderer, tier) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 6000);
  camera.position.set(0, 14, 420);
  const loader = new THREE.TextureLoader();

  const sky = await createSky(renderer, tier, loader);
  const env = sky.env;
  scene.add(sky.group);
  scene.environment = env;
  scene.environmentIntensity = 0.5;
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.FogExp2(0x03050b, 0.0011);

  // lights — a warm star (matches the planets' terminator), cool rim, faint fill
  scene.add(new THREE.HemisphereLight(0x4a5f8c, 0x07090e, 0.4));
  const key = new THREE.DirectionalLight(0xffe2bf, 2.2);
  key.position.copy(SUN_DIR).multiplyScalar(100);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x6fd8ff, 1.3);
  rim.position.set(60, 40, -90);
  scene.add(rim);

  const updaters = [];
  const islands = [];
  const planets = [];

  // ---------------------------------------------------------- sky furniture (in the sky group, framed per chapter)
  const sfx = tier.mobile ? '-sm' : '';
  const L = (u, srgb = true) => { const t = loader.load(u); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
  const veilTex = L(`assets/space/veil${sfx}.webp`);
  const ringTex = L('assets/space/ring.png');
  const place = (obj, dir, chapter, dist) => {
    const d = new THREE.Vector3(...dir).normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), -YAW[chapter]);
    obj.position.copy(d.multiplyScalar(dist));
    sky.group.add(obj);
  };
  // the Veil nebula — framing the about chapter
  const veil = createNebula(veilTex, { w: 3000, h: 2000, gain: 0.95, rot: 0.2 });
  place(veil, [0.1, 0.18, -1], 1, 3200);
  veil.lookAt(0, 0, 0);
  const veil2 = createNebula(veilTex, { w: 2600, h: 1700, gain: 0.5, rot: -2.4, tint: new THREE.Color(0.7, 0.9, 1.1) });
  place(veil2, [-0.6, 0.35, -1], 4, 3300);
  veil2.lookAt(0, 0, 0);

  const ringed = createPlanet({ map: L('assets/space/jupiter' + (tier.mobile ? '-sm' : '') + '.webp'), radius: 230, atmo: new THREE.Color(0.95, 0.75, 0.5), atmoK: 0.55, ring: { tex: ringTex }, tilt: 0.42, spin: 0.012 });
  place(ringed.group, [-0.56, 0.24, -1], 0, 1900);
  ringed.group.rotation.set(0.15, 0.6, 0);
  planets.push(ringed);
  const moon = createPlanet({ map: L('assets/space/moon.webp'), radius: 40, atmoK: 0, soft: 0.04, gain: 1.25, bump: L('assets/space/moon.webp', false), tilt: 0.1, spin: 0.01, night: 0.015 });
  place(moon.group, [0.62, 0.3, -1], 0, 1500);
  planets.push(moon);
  const ice = createPlanet({ map: L('assets/space/neptune.webp'), radius: 120, atmo: new THREE.Color(0.35, 0.65, 1.0), atmoK: 1.1, tilt: 0.5, spin: 0.01 });
  place(ice.group, [0.75, 0.16, -1], 2, 1700);
  planets.push(ice);
  const giant = createPlanet({ map: L('assets/space/saturn.webp'), radius: 620, atmo: new THREE.Color(1.0, 0.82, 0.55), atmoK: 0.6, tilt: 0.1, spin: 0.004, gain: 0.85 });
  place(giant.group, [0.62, -0.2, -1], 4, 3300);
  planets.push(giant);
  planets.forEach((p) => updaters.push((t, dt) => p.update(t, dt)));

  // ---------------------------------------------------------- shared space dressing
  const T = loadRockTextures(loader, tier);
  const astMat = rockMaterial2(T, { scale: 1.1, moss: 0, envMap: env, envMapIntensity: 0.35 });
  const asteroids = createAsteroids(tier, [-80, REG.contact + 120], astMat);
  scene.add(asteroids.group);
  updaters.push((t, dt) => asteroids.update(t, dt));
  const shooting = createShootingStars(tier.mobile ? 3 : 6);
  scene.add(shooting.group);
  updaters.push((t, dt, cam) => shooting.update(t, dt, cam));
  const motes = createMotes(tier);
  scene.add(motes.object);

  const crystalPal = [0x3ff0b8, 0x5ad8ff, 0x9a86ff, 0x5ad8ff];
  const addIsland = (seed, r, pos, parent = scene) => {
    const mat = rockMaterial2(T, { scale: Math.min(2.2, 0.35 * r), moss: 0.9, envMap: env, envMapIntensity: 0.45 });
    const isl = createIsland({ seed, r, rockMat: mat, crystalColor: crystalPal[seed % 4], crystals: r > 6 ? 9 : 6, detail: tier.mobile ? 110 : r > 7 ? 240 : 180 });
    isl.setBase(new THREE.Vector3(pos[0], pos[1] - parent.position.y, pos[2]));
    parent.add(isl.group);
    updaters.push((t, dt) => isl.update(t, dt));
    islands.push(isl);
    return isl;
  };

  // =================== HERO — the throne on the timeline ===================
  const hero = new THREE.Group(); scene.add(hero);
  const throne = createThrone(env);
  hero.add(throne.group);
  updaters.push((t) => throne.update(t));
  const bridge = createBridge({ width: 16, length: 1500, front: 170, y: 0, playhead: 4.6, env, trails: tier.mobile ? 10 : 14 });
  hero.add(bridge.group);
  const strands = createStrands({ origin: new THREE.Vector3(0, throne.daisTop + 5.2, -2.9), count: tier.mobile ? 10 : 18, sparks: tier.mobile ? 30 : 60, widthK: 2.2 });
  hero.add(strands.group);
  const throneFigure = createHeroCard(HERO.throne, loader, tier, { rim: new THREE.Color(0.45, 1.0, 0.75), rimDir: [0.2, 1], rimK: 0.75, reflect: false, tint: new THREE.Color(0.9, 0.95, 1.04), turn: 0.7 });
  throneFigure.group.position.set(0, throne.daisTop - 0.02, 0.3);
  hero.add(throneFigure.group);
  updaters.push((t, dt, cam) => throneFigure.update(t, cam));
  scene.updateMatrixWorld(true);
  const headPos = throneFigure.head.clone().add(throneFigure.group.position);
  const glowA = new THREE.PointLight(0x48ffc0, 10, 18, 2); glowA.position.set(0, throne.daisTop + 7.5, -5.5); hero.add(glowA);
  const glowB = new THREE.PointLight(0xffc06a, 14, 16, 2); glowB.position.set(3.5, 4, 4); hero.add(glowB);
  [
    [3, 3.2, [-15, 2.5, -8]], [7, 4.4, [17, 4.5, -14]], [12, 6, [-30, 9, -36]], [19, 5.2, [33, -1, -40]],
    [23, 2.4, [11, -5, 20]], [29, 2.2, [-12, -3.5, 26]], [31, 9, [-56, 16, -90]], [37, 10, [64, 22, -105]], [41, 3, [24, 12, 4]],
  ].forEach(([s, r, p]) => addIsland(s, r, p, hero));

  // =================== ABOUT — islands under the Veil ===================
  const about = new THREE.Group(); scene.add(about);
  [
    [51, 7, [-30, REG.about - 6, -30]], [53, 8, [32, REG.about + 4, -38]], [57, 4, [-12, REG.about - 16, -52]],
    [59, 12, [52, REG.about - 16, -90]], [61, 3, [16, REG.about + 13, -14]], [63, 14, [-70, REG.about + 10, -140]],
  ].forEach(([s, r, p]) => addIsland(s, r, p, about));

  // =================== WORK — the watcher on the timeline ===================
  const work = new THREE.Group(); work.position.y = REG.work; scene.add(work);
  const workBridge = createBridge({ width: 12, length: 900, front: 40, y: 0, playhead: -1000, env, trails: tier.mobile ? 8 : 12, hue: 0.12 });
  work.add(workBridge.group);
  const workStrands = createStrands({ origin: new THREE.Vector3(0, 8, -90), count: tier.mobile ? 8 : 14, seed: 5, spread: 1.4, sparks: tier.mobile ? 20 : 40, widthK: 2.2 });
  work.add(workStrands.group);
  const watcher = createHeroCard(HERO.back, loader, tier, { rim: new THREE.Color(0.5, 0.9, 1.0), rimDir: [0, 1], rimK: 0.6, back: 1, turn: 0.4 });
  watcher.group.position.set(0, 0, -5);
  work.add(watcher.group);
  updaters.push((t, dt, cam) => watcher.update(t, cam));
  const workLight = new THREE.PointLight(0x7af0ff, 20, 16, 2); workLight.position.set(0, 5, -10); work.add(workLight);
  [
    [81, 5, [-24, REG.work + 3, -24]], [83, 6, [28, REG.work + 6, -30]], [87, 9, [-50, REG.work + 14, -74]],
    [89, 3, [13, REG.work - 7, -8]], [91, 12, [72, REG.work + 10, -125]],
  ].forEach(([s, r, p]) => addIsland(s, r, p, work));

  // =================== SKILLS — the black hole ===================
  const skills = new THREE.Group(); skills.position.y = REG.skills; scene.add(skills);
  const bh = createBlackHole({ sky, scale: 2.1, steps: tier.bhSteps, tilt: 0.06 });
  bh.group.position.set(0, 0, -62);
  skills.add(bh.group);
  updaters.push((t, dt, cam) => bh.update(t, cam));
  [
    [101, 5, [-46, REG.skills - 10, -40]], [103, 6, [50, REG.skills + 6, -48]], [107, 3, [-26, REG.skills + 16, -10]], [109, 9, [80, REG.skills - 20, -120]],
  ].forEach(([s, r, p]) => addIsland(s, r, p, skills));

  // =================== CONTACT — the long bridge to the portal ===================
  const contact = new THREE.Group(); contact.position.y = REG.contact; scene.add(contact);
  const portal = createPortal({ radius: 62 });
  portal.group.position.set(0, 46, -420);
  contact.add(portal.group);
  updaters.push((t) => portal.update(t));
  const cBridge = createBridge({ width: 9, length: 520, front: 30, y: 0, playhead: -1000, env, trails: tier.mobile ? 8 : 10, hue: 0.05 });
  contact.add(cBridge.group);
  const portalLight = new THREE.PointLight(0xffd59a, 14000, 700, 2); portalLight.position.set(0, 46, -400); contact.add(portalLight);
  const lampMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 1.3, 0.6) });
  const pillarMat = new THREE.MeshPhysicalMaterial({ color: 0x07090d, metalness: 0.5, roughness: 0.3, clearcoat: 0.6, envMap: env });
  const goldMat = new THREE.MeshPhysicalMaterial({ color: 0xc8a050, metalness: 1, roughness: 0.3, envMap: env });
  const pGeo = new THREE.CylinderGeometry(0.32, 0.42, 7, 8), cGeo = new THREE.ConeGeometry(0.42, 0.9, 8), lGeo = new THREE.OctahedronGeometry(0.28);
  for (let i = 0; i < 14; i++) {
    for (const sx of [-1, 1]) {
      const z = 6 - i * 30;
      const p = new THREE.Mesh(pGeo, pillarMat); p.position.set(sx * 5.6, 3.5, z); contact.add(p);
      const c = new THREE.Mesh(cGeo, goldMat); c.position.set(sx * 5.6, 7.45, z); contact.add(c);
      const l = new THREE.Mesh(lGeo, lampMat); l.position.set(sx * 5.6, 8.4, z); contact.add(l);
    }
  }
  const traveller = createHeroCard(HERO.stand, loader, tier, { rim: new THREE.Color(1.0, 0.82, 0.5), rimDir: [0, 1], rimK: 1.25, back: 1, tint: new THREE.Color(0.95, 0.92, 0.9), ambient: new THREE.Color(0.05, 0.04, 0.03), turn: 0.25 });
  traveller.group.position.set(0, 0, -7.5);
  contact.add(traveller.group);
  updaters.push((t, dt, cam) => traveller.update(t, cam));
  const cl = new THREE.PointLight(0xffd8a0, 24, 18, 2); cl.position.set(0, 5, -16); contact.add(cl);
  cBridge.uniforms.uBoost.value = 0.5;
  [
    [121, 8, [-36, REG.contact + 4, -70]], [123, 9, [40, REG.contact + 10, -95]], [127, 4, [-16, REG.contact - 8, -22]],
    [129, 16, [-95, REG.contact + 22, -230]], [131, 14, [110, REG.contact + 14, -260]], [133, 22, [-160, REG.contact + 50, -380]],
  ].forEach(([s, r, p]) => addIsland(s, r, p, contact));

  const chapters = [hero, about, work, skills, contact];

  // =================== interaction: hover, drag islands, spin planets ===================
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(-9, -9);
  let pointerFresh = false, frame = 0, hovered = null, drag = null;
  const tmpV = new THREE.Vector3(), tmpC = new THREE.Vector3(), plane = new THREE.Plane(), hitP = new THREE.Vector3(), camDir = new THREE.Vector3();
  const camUp = new THREE.Vector3(), camRight = new THREE.Vector3();
  const sphereHit = (center, r) => { tmpV.subVectors(center, ray.ray.origin); const tca = tmpV.dot(ray.ray.direction); if (tca < 0) return Infinity; const d2 = tmpV.lengthSq() - tca * tca; return d2 > r * r ? Infinity : tca - Math.sqrt(r * r - d2); };
  function pick() {
    ray.setFromCamera(ndc, camera);
    let best = null, bd = Infinity;
    for (const isl of islands) {
      if (!isl.group.parent.visible) continue;
      isl.group.getWorldPosition(tmpC); tmpC.y -= isl.r * 0.35;
      const d = sphereHit(tmpC, isl.r * 1.05);
      if (d < bd) { bd = d; best = { kind: 'island', o: isl }; }
    }
    for (const p of planets) {
      p.body.getWorldPosition(tmpC);
      const d = sphereHit(tmpC, p.radius);
      if (d < bd) { bd = d; best = { kind: 'planet', o: p }; }
    }
    return best;
  }
  const blocked = (el) => el && el.closest && el.closest('a,button,input,textarea,label,.orb,.tool,.form,.parchment,.player,.menu,.hud,.rail,.gate');
  if (!tier.mobile) {
    addEventListener('pointermove', (e) => {
      ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); pointerFresh = true;
      if (!drag) return;
      ray.setFromCamera(ndc, camera);
      if (drag.kind === 'island') {
        if (ray.ray.intersectPlane(plane, hitP)) {
          const isl = drag.o; isl.state.goal.copy(hitP).sub(drag.grab).sub(isl.state.base);
          isl.state.goal.clampLength(0, isl.r * 4 + 10);
        }
      } else {
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
        const now = performance.now(), dtm = Math.max(1, now - drag.t) / 1000; drag.t = now;
        const k = 0.006;
        drag.o.axis.rotateOnWorldAxis(camUp, dx * k); drag.o.axis.rotateOnWorldAxis(camRight, dy * k);
        drag.o.state.vel.set(dx * k / dtm, dy * k / dtm).clampLength(0, 4);
      }
    }, { passive: true });
    addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || blocked(e.target) || document.body.classList.contains('is-intro')) return;
      ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
      const hit = pick(); if (!hit) return;
      e.preventDefault();
      camera.getWorldDirection(camDir);
      camUp.copy(camera.up).applyQuaternion(camera.quaternion).normalize(); camRight.crossVectors(camDir, camUp).normalize();
      setDragAxes(camUp, camRight);
      if (hit.kind === 'island') {
        const isl = hit.o; isl.group.getWorldPosition(tmpC);
        plane.setFromNormalAndCoplanarPoint(camDir.clone().negate(), tmpC);
        ray.setFromCamera(ndc, camera); ray.ray.intersectPlane(plane, hitP);
        drag = { kind: 'island', o: isl, grab: hitP.clone().sub(isl.state.base).sub(isl.state.off) };
        isl.state.drag = true; isl.state.target = 1;
      } else {
        drag = { kind: 'planet', o: hit.o, x: e.clientX, y: e.clientY, t: performance.now() };
        hit.o.state.drag = true; hit.o.state.vel.set(0, 0); hit.o.state.target = 1;
      }
      document.body.classList.add('dragging');
    });
    addEventListener('pointerup', () => {
      if (!drag) return;
      drag.o.state.drag = false;
      if (drag.kind === 'island') drag.o.state.goal.set(0, 0, 0);
      drag = null; document.body.classList.remove('dragging');
    });
  }
  function hover() {
    if (!pointerFresh || drag || (frame++ % 3)) return;
    const hit = pick();
    const o = hit ? hit.o : null;
    if (o !== hovered) {
      if (hovered) hovered.state.target = 0;
      if (o) o.state.target = 1;
      hovered = o;
      document.body.classList.toggle('hover-island', !!o);
    }
  }

  // =================== frame ===================
  let chapter = 0;
  function update(t, dt, ch = chapter) {
    chapter = ch;
    // sky yaw follows the chapter (smooth between them)
    const i = Math.min(3, Math.floor(ch)), f = ch - i;
    const e = f * f * (3 - 2 * f);
    const yaw = YAW[i] + (YAW[i + 1] - YAW[i]) * e;
    sky.update(t, camera, yaw);
    // only draw chapters near the camera
    chapters.forEach((g, k) => { g.visible = Math.abs(ch - k) < 1.25; });
    bh.group.visible = ch > 2.2 && ch < 4.3;
    motes.uniforms.uTime.value = t; motes.uniforms.uCam.value.copy(camera.position);
    bridge.uniforms.uTime.value = t; workBridge.uniforms.uTime.value = t; cBridge.uniforms.uTime.value = t;
    strands.uniforms.uTime.value = t; workStrands.uniforms.uTime.value = t;
    portal.uniforms.uTime.value = t;
    for (const u of updaters) u(t, dt, camera);
    hover();
  }
  function resize() { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }

  return { scene, camera, update, resize, throne, bridge, portal, strands, REG, headPos, heroCard: true, bh, sky, starsStretch: sky.stars.uniforms.uStretch };
}
