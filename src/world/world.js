import * as THREE from 'three';
import { bakeNebula, createStars, createFar, SUN_DIR } from './sky.js';
import { createAsteroids, createShootingStars, createMotes, createFogCards, makeFogTexture, rockGeometry, rockMaterial } from './space.js';
import { createBridge, createStrands } from './timeline.js';
import { createIsland } from './islands.js';
import { createThrone } from './throne.js';
import { createFigure, createHeroCard } from './figure.js';
import { createEnergyOrb } from './portal.js';
import { HERO } from '../config.js';

export const REG = { hero: 0, about: 160, work: 320, skills: 480, contact: 640 };

export async function createWorld(renderer, tier) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 5000);
  camera.position.set(0, 8, 900);
  const loader = new THREE.TextureLoader();

  const { background, env } = bakeNebula(renderer, tier);
  scene.background = background;
  scene.environment = env;
  scene.environmentIntensity = 0.4;
  scene.fog = new THREE.FogExp2(0x05070f, 0.0016);

  // lights
  scene.add(new THREE.HemisphereLight(0x5a76b8, 0x0a0d14, 0.35));
  const key = new THREE.DirectionalLight(0xffd7a8, 1.2);
  key.position.copy(SUN_DIR).multiplyScalar(100);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x5ffff0, 2.0);
  rim.position.set(60, 40, -90);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0x8a7dff, 0.55);
  fill.position.set(-30, 10, 80);
  scene.add(fill);

  const updaters = [];
  const hoverables = [];

  // --- sky
  const stars = createStars(tier);
  scene.add(stars.object);
  const far = createFar(tier, loader);
  scene.add(far.group);
  updaters.push((t) => far.update(t));
  const asteroids = createAsteroids(tier, [-80, REG.contact + 120]);
  scene.add(asteroids.group);
  updaters.push((t, dt) => asteroids.update(t, dt));
  const shooting = createShootingStars(tier.mobile ? 6 : 14);
  scene.add(shooting.group);
  updaters.push((t, dt, cam) => shooting.update(t, dt, cam));
  const motes = createMotes(tier);
  scene.add(motes.object);
  const fogTex = makeFogTexture();

  const addIsland = (o, pos) => { const isl = createIsland({ env, ...o }); isl.setBase(new THREE.Vector3(...pos)); scene.add(isl.group); updaters.push((t, dt) => isl.update(t, dt)); hoverables.push(isl); return isl; };

  // =================== HERO — the throne on the timeline ===================
  const hero = new THREE.Group();
  scene.add(hero);
  const throne = createThrone(env, { chairless: !!HERO.throne });
  hero.add(throne.group);
  updaters.push((t) => throne.update(t));
  const bridge = createBridge({ width: 16, length: 1500, front: 170, y: 0, playhead: 0, env });
  hero.add(bridge.group);
  const strands = createStrands({ origin: new THREE.Vector3(0, throne.seatY + 2.0, -1.6), count: tier.mobile ? 16 : 30 });
  hero.add(strands.group);
  let throneFigure;
  if (HERO.throne) { throneFigure = createHeroCard(HERO.throne, loader, tier); throneFigure.group.position.set(0, throne.daisTop - 0.04, 0.2); }
  else {
    throneFigure = await createFigure({ pose: 'seated', env, cape: true });
    throneFigure.seatOn(throne.seatY);
  }
  hero.add(throneFigure.group);
  updaters.push((t, dt, cam) => throneFigure.update(t, cam));
  const headPos = new THREE.Vector3(0, throne.daisTop + 2.3, 0.15);
  scene.updateMatrixWorld(true);
  if (throneFigure.isCard) headPos.copy(throneFigure.head).add(throneFigure.group.position);
  else if (throneFigure.bones && throneFigure.bones['mixamorigHead']) { throneFigure.bones['mixamorigHead'].getWorldPosition(headPos); headPos.y += 0.1; headPos.z += 0.05; }

  const glowA = new THREE.PointLight(0x37ffb0, 6, 16, 2); glowA.position.set(2.5, 4.5, 6); hero.add(glowA);
  const glowB = new THREE.PointLight(0x7a5cff, 8, 18, 2); glowB.position.set(-4, 5, -3); hero.add(glowB);
  

  [
    [{ seed: 3, r: 3.2, pillars: 2, crystalColor: 0x39ffb0 }, [-15, 2.5, -8]],
    [{ seed: 7, r: 4.4, pillars: 3, crystalColor: 0x5ad8ff }, [17, 4.5, -14]],
    [{ seed: 12, r: 6, pillars: 4, crystalColor: 0xb18cff }, [-30, 9, -36]],
    [{ seed: 19, r: 5.2, pillars: 0, crystalColor: 0x39ffb0 }, [33, -1, -40]],
    [{ seed: 23, r: 2.4, pillars: 1, crystalColor: 0xffc65a }, [11, -5, 20]],
    [{ seed: 29, r: 2.2, pillars: 0, crystalColor: 0x5ad8ff }, [-12, -3.5, 26]],
    [{ seed: 31, r: 9, pillars: 5, crystalColor: 0x39ffb0 }, [-52, 16, -85]],
    [{ seed: 37, r: 10, pillars: 3, crystalColor: 0xb18cff }, [62, 22, -100]],
    [{ seed: 41, r: 3, pillars: 0, crystalColor: 0xff7ad9 }, [24, 12, 4]],
  ].forEach(([o, p]) => addIsland(o, p));

  const heroFog = createFogCards(fogTex, [
    { p: [-22, 1, -20], s: 60, o: 0.10, color: 0x2bd6a6 }, { p: [26, 0, -30], s: 70, o: 0.09, color: 0x6a5cff },
    { p: [0, -6, -60], s: 140, o: 0.08, color: 0x3a7cff }, { p: [-40, 4, -110], s: 160, o: 0.07, color: 0x2bd6a6 },
    { p: [30, -10, 30], s: 90, o: 0.06, color: 0x6a5cff },
  ]);
  hero.add(heroFog.group);
  updaters.push((t) => heroFog.update(t));

  // =================== ABOUT — the sky citadel ===================
  const about = new THREE.Group(); about.position.y = REG.about; scene.add(about);
  [
    [{ seed: 51, r: 7, pillars: 4, crystalColor: 0x39ffb0 }, [-26, REG.about - 5, -26]],
    [{ seed: 53, r: 8, pillars: 5, crystalColor: 0xb18cff }, [28, REG.about + 4, -34]],
    [{ seed: 57, r: 4, pillars: 0, crystalColor: 0x5ad8ff }, [-12, REG.about - 15, -50]],
    [{ seed: 59, r: 11, pillars: 6, crystalColor: 0xffc65a }, [46, REG.about - 14, -80]],
    [{ seed: 61, r: 3, pillars: 1, crystalColor: 0x39ffb0 }, [14, REG.about + 12, -12]],
  ].forEach(([o, p]) => addIsland(o, p));
  // distant citadel of spires
  const spireMat = new THREE.MeshPhysicalMaterial({ color: 0x0b0e16, metalness: 0.7, roughness: 0.3, envMap: env, emissive: 0x08261d, emissiveIntensity: 0.6 });
  for (let i = 0; i < 26; i++) {
    const h = 10 + Math.random() * 48;
    const sp = new THREE.Mesh(new THREE.ConeGeometry(1 + Math.random() * 2.2, h, 6), spireMat);
    sp.position.set((Math.random() - 0.5) * 70, -20 + h / 2 + Math.random() * 6, -130 - Math.random() * 40);
    about.add(sp);
  }
  const citRock = new THREE.Mesh(rockGeometry(71, 4, 0.4, [2.4, 0.6, 1.2]), rockMaterial({ envMap: env }));
  citRock.scale.setScalar(26); citRock.position.set(0, -26, -140); about.add(citRock);
  const aboutFog = createFogCards(fogTex, [
    { p: [0, -10, -40], s: 160, o: 0.09, color: 0x3a7cff }, { p: [-30, 0, -20], s: 70, o: 0.08, color: 0x2bd6a6 }, { p: [35, 6, -30], s: 80, o: 0.07, color: 0x8a5cff },
  ]);
  about.add(aboutFog.group); updaters.push((t) => aboutFog.update(t));

  // =================== WORK — the watcher on the timeline ===================
  const work = new THREE.Group(); work.position.y = REG.work; scene.add(work);
  const workBridge = createBridge({ width: 12, length: 900, front: 40, y: 0, playhead: -1000, lanes: 18, env });
  work.add(workBridge.group);
  const workStrands = createStrands({ origin: new THREE.Vector3(0, 6, -80), count: tier.mobile ? 12 : 22, seed: 5, spread: 1.4 });
  work.add(workStrands.group);
  let watcher;
  if (HERO.back) { watcher = createHeroCard(HERO.back, loader, tier); }
  else { watcher = await createFigure({ pose: 'standing', env, cape: true }); watcher.group.rotation.y = Math.PI; }
  watcher.group.position.set(0, 0, -5);
  work.add(watcher.group);
  updaters.push((t, dt, cam) => watcher.update(t, cam));
  const workLight = new THREE.PointLight(0x7af0ff, 20, 16, 2); workLight.position.set(0, 5, -10); work.add(workLight);
  [
    [{ seed: 81, r: 5, pillars: 2, crystalColor: 0x5ad8ff }, [-22, REG.work + 3, -20]],
    [{ seed: 83, r: 6, pillars: 3, crystalColor: 0x39ffb0 }, [26, REG.work + 6, -28]],
    [{ seed: 87, r: 9, pillars: 4, crystalColor: 0xb18cff }, [-48, REG.work + 14, -70]],
    [{ seed: 89, r: 3, pillars: 0, crystalColor: 0xffc65a }, [12, REG.work - 6, -6]],
    [{ seed: 91, r: 12, pillars: 6, crystalColor: 0x39ffb0 }, [70, REG.work + 10, -120]],
  ].forEach(([o, p]) => addIsland(o, p));
  const workFog = createFogCards(fogTex, [
    { p: [0, -4, -30], s: 120, o: 0.1, color: 0x2bd6a6 }, { p: [-30, 6, -60], s: 140, o: 0.08, color: 0x6a5cff }, { p: [40, 2, -50], s: 120, o: 0.08, color: 0x3a7cff },
  ]);
  work.add(workFog.group); updaters.push((t) => workFog.update(t));

  // =================== SKILLS — the energy core ===================
  const skills = new THREE.Group(); skills.position.y = REG.skills; scene.add(skills);
  const core = createEnergyOrb({ radius: 7, rings: 3 });
  core.group.position.set(0, 0, -40);
  skills.add(core.group);
  updaters.push((t) => core.update(t));
  [
    [{ seed: 101, r: 5, pillars: 2, crystalColor: 0x39ffb0 }, [-30, REG.skills - 6, -30]],
    [{ seed: 103, r: 6, pillars: 3, crystalColor: 0xb18cff }, [32, REG.skills + 2, -36]],
    [{ seed: 107, r: 3, pillars: 0, crystalColor: 0x5ad8ff }, [-14, REG.skills + 12, -16]],
  ].forEach(([o, p]) => addIsland(o, p));

  // =================== CONTACT — the portal at the end of the bridge ===================
  const contact = new THREE.Group(); contact.position.y = REG.contact; scene.add(contact);
  const portal = createEnergyOrb({ radius: 26, rings: 2, colorA: new THREE.Color(0.3, 1, 0.8), colorB: new THREE.Color(0.45, 0.4, 1) });
  portal.group.position.set(0, 24, -170);
  contact.add(portal.group);
  updaters.push((t) => portal.update(t));
  const cBridge = createBridge({ width: 9, length: 260, front: 40, y: 0, playhead: -1000, lanes: 14, env });
  contact.add(cBridge.group);
  const lampMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 2.2, 1.5) });
  const pillarMat = new THREE.MeshPhysicalMaterial({ color: 0x0a0c12, metalness: 0.8, roughness: 0.25, envMap: env });
  for (let i = 0; i < 9; i++) {
    for (const sx of [-1, 1]) {
      const z = 10 - i * 22;
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 6, 8), pillarMat); p.position.set(sx * 6.2, 3, z); contact.add(p);
      const l = new THREE.Mesh(new THREE.OctahedronGeometry(0.35), lampMat); l.position.set(sx * 6.2, 6.6, z); contact.add(l);
    }
  }
  let traveller;
  if (HERO.stand) { traveller = createHeroCard(HERO.stand, loader, tier); }
  else { traveller = await createFigure({ pose: 'standing', env, cape: true }); traveller.group.rotation.y = Math.PI; }
  traveller.group.position.set(0, 0, -28);
  contact.add(traveller.group);
  updaters.push((t, dt, cam) => traveller.update(t, cam));
  const cl = new THREE.PointLight(0x7affd0, 20, 20, 2); cl.position.set(0, 4, -24); contact.add(cl);
  [
    [{ seed: 121, r: 7, pillars: 3, crystalColor: 0x39ffb0 }, [-30, REG.contact + 4, -60]],
    [{ seed: 123, r: 8, pillars: 4, crystalColor: 0xb18cff }, [34, REG.contact + 8, -80]],
    [{ seed: 127, r: 4, pillars: 1, crystalColor: 0x5ad8ff }, [-18, REG.contact - 8, -18]],
    [{ seed: 129, r: 12, pillars: 5, crystalColor: 0xffc65a }, [-70, REG.contact + 16, -150]],
    [{ seed: 131, r: 10, pillars: 3, crystalColor: 0x39ffb0 }, [80, REG.contact + 10, -160]],
  ].forEach(([o, p]) => addIsland(o, p));
  const cFog = createFogCards(fogTex, [{ p: [0, -2, -60], s: 140, o: 0.09, color: 0x2bd6a6 }, { p: [0, 10, -150], s: 200, o: 0.07, color: 0x6a5cff }]);
  contact.add(cFog.group); updaters.push((t) => cFog.update(t));

  // =================== hover ===================
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(-9, -9);
  let pointerFresh = false, frame = 0;
  if (!tier.mobile) addEventListener('pointermove', (e) => { ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); pointerFresh = true; }, { passive: true });
  const rocks = hoverables.map((h) => h.rock);
  let hovered = null;
  function hover() {
    if (!pointerFresh || (frame++ % 3)) return;
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(rocks, false)[0];
    const isl = hit ? hoverables[rocks.indexOf(hit.object)] : null;
    if (isl !== hovered) {
      if (hovered) hovered.state.target = 0;
      if (isl) isl.state.target = 1;
      hovered = isl;
      document.body.classList.toggle('hover-island', !!isl);
    }
  }

  const farOffset = new THREE.Vector3();
  function update(t, dt) {
    stars.uniforms.uTime.value = t;
    stars.object.position.copy(camera.position);
    farOffset.copy(camera.position).multiplyScalar(0.92);
    far.group.position.set(farOffset.x, farOffset.y, 0);
    motes.uniforms.uTime.value = t; motes.uniforms.uCam.value.copy(camera.position);
    bridge.uniforms.uTime.value = t; workBridge.uniforms.uTime.value = t; cBridge.uniforms.uTime.value = t;
    strands.uniforms.uTime.value = t; workStrands.uniforms.uTime.value = t;
    for (const u of updaters) u(t, dt, camera);
    hover();
  }
  function resize() { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }

  return { scene, camera, update, resize, throne, bridge, portal, core, strands, REG, headPos, heroCard: !!throneFigure.isCard };
}
