import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

// Obsidian throne with gold trim, horned crest and glowing inlay, on an octagonal dais.
export function createThrone(env) {
  const g = new THREE.Group();
  const obsidian = new THREE.MeshPhysicalMaterial({ color: 0x06080c, metalness: 0.45, roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.25, envMap: env, envMapIntensity: 0.55 });
  const gold = new THREE.MeshPhysicalMaterial({ color: 0xc9a14a, metalness: 1, roughness: 0.28, envMap: env, envMapIntensity: 1.6, emissive: 0x2a1a05, emissiveIntensity: 0.4 });
  const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 2.0, 1.2) });
  const glowGold = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.5, 0.5) });

  // Dais — three octagonal steps with light seams
  const steps = [[3.6, 0.32], [2.9, 0.32], [2.25, 0.3]];
  let y = 0;
  steps.forEach(([r, h], i) => {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(r, r + 0.08, h, 8, 1), obsidian);
    s.position.y = y + h / 2; s.rotation.y = Math.PI / 8;
    g.add(s);
    const seam = new THREE.Mesh(new THREE.TorusGeometry(r + 0.01, 0.018, 4, 8), i === 2 ? glowGold : glow);
    seam.rotation.x = Math.PI / 2; seam.rotation.z = Math.PI / 8; seam.position.y = y + h + 0.002;
    g.add(seam);
    y += h;
  });
  const daisTop = y; // ≈0.94
  g.userData.daisTop = daisTop;

  // Seat
  const seatY = daisTop + 0.48;
  const seat = new THREE.Mesh(new RoundedBoxGeometry(1.16, 0.5, 1.1, 4, 0.06), obsidian);
  seat.position.set(0, daisTop + 0.25, 0.05);
  g.add(seat);
  const cushion = new THREE.Mesh(new RoundedBoxGeometry(0.98, 0.1, 0.92, 4, 0.04), new THREE.MeshPhysicalMaterial({ color: 0x0d3a2c, roughness: 0.6, sheen: 1, sheenColor: new THREE.Color(0x2affb0), sheenRoughness: 0.4 }));
  cushion.position.set(0, seatY + 0.03, 0.08);
  g.add(cushion);
  // Armrests
  for (const sx of [-1, 1]) {
    const arm = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.14, 1.1, 3, 0.05), gold);
    arm.position.set(sx * 0.64, seatY + 0.4, 0.05);
    g.add(arm);
    const post = new THREE.Mesh(new RoundedBoxGeometry(0.18, 0.5, 0.18, 3, 0.04), obsidian);
    post.position.set(sx * 0.64, seatY + 0.16, 0.5);
    g.add(post);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 12), glow);
    orb.position.set(sx * 0.64, seatY + 0.52, 0.58);
    g.add(orb);
  }

  // Back — tall pointed arch with Loki-style horned crest
  const W = 0.7, H = 3.3;
  const s = new THREE.Shape();
  s.moveTo(-W, 0);
  s.lineTo(-W, H * 0.62);
  s.quadraticCurveTo(-W * 1.05, H * 0.8, -W * 0.35, H * 0.9);
  s.lineTo(0, H * 1.12);
  s.lineTo(W * 0.35, H * 0.9);
  s.quadraticCurveTo(W * 1.05, H * 0.8, W, H * 0.62);
  s.lineTo(W, 0);
  s.lineTo(-W, 0);
  const back = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.28, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 3, curveSegments: 24 }), obsidian);
  back.position.set(0, seatY, -0.6);
  g.add(back);

  // Glowing inlay ring on the back's front face
  const inlay = new THREE.Shape();
  const k = 0.84, k2 = 0.8;
  const path = (sh, f, rev) => {
    const pts = [[-W, 0.12], [-W, H * 0.62], [-W * 0.35, H * 0.9], [0, H * 1.12], [W * 0.35, H * 0.9], [W, H * 0.62], [W, 0.12]];
    const P = pts.map(([x, yy]) => [x * f, 0.12 + (yy - 0.12) * f]);
    if (rev) P.reverse();
    sh.moveTo(...P[0]); for (let i = 1; i < P.length; i++) sh.lineTo(...P[i]); sh.lineTo(...P[0]);
  };
  path(inlay, k, false);
  const hole = new THREE.Path(); path(hole, k2, true); inlay.holes.push(hole);
  const inlayMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(inlay, { depth: 0.02, bevelEnabled: false }), glow);
  inlayMesh.position.set(0, seatY + 0.05, -0.6 + 0.28 + 0.06);
  g.add(inlayMesh);
  // central emblem (hourglass / playhead)
  const emb = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), glowGold);
  emb.scale.set(0.8, 1.6, 0.4);
  emb.position.set(0, seatY + H * 0.78, -0.25);
  g.add(emb);

  // Horns — gold, sweeping up and outward
  for (const sx of [-1, 1]) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(sx * 0.42, seatY + H * 0.9, -0.42),
      new THREE.Vector3(sx * 0.95, seatY + H * 1.05, -0.45),
      new THREE.Vector3(sx * 1.25, seatY + H * 1.35, -0.5),
      new THREE.Vector3(sx * 1.05, seatY + H * 1.75, -0.55),
    ]);
    const geo = new THREE.TubeGeometry(curve, 48, 0.12, 12, false);
    // taper tube toward tip
    const pa = geo.attributes.position, uv = geo.attributes.uv, c = new THREE.Vector3(), q = new THREE.Vector3();
    for (let i = 0; i < pa.count; i++) {
      const t = uv.getX(i);
      curve.getPointAt(Math.min(t, 1), c);
      q.fromBufferAttribute(pa, i).sub(c).multiplyScalar(1 - t * 0.88).add(c);
      pa.setXYZ(i, q.x, q.y, q.z);
    }
    geo.computeVertexNormals();
    g.add(new THREE.Mesh(geo, gold));
  }
  // side spires
  for (const sx of [-1, 1]) {
    const sp = new THREE.Mesh(new THREE.ConeGeometry(0.12, 1.6, 6), obsidian);
    sp.position.set(sx * 1.0, seatY + H * 0.72, -0.48);
    sp.rotation.z = -sx * 0.12;
    g.add(sp);
    const tip = new THREE.Mesh(new THREE.OctahedronGeometry(0.06), glow);
    tip.position.set(sx * 1.08, seatY + H * 0.72 + 0.82, -0.48);
    g.add(tip);
  }

  // halo ring behind the throne
  const halo = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.025, 8, 160), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.6, 1.8, 1.4), transparent: true, opacity: 0.85 }));
  halo.position.set(0, seatY + 2.4, -1.1);
  g.add(halo);
  const halo2 = new THREE.Mesh(new THREE.TorusGeometry(2.75, 0.01, 6, 160), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.2, 0.5) }));
  halo2.position.copy(halo.position);
  g.add(halo2);

  g.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  return { group: g, seatY, daisTop, halo, halo2, update(t) { halo.rotation.z = t * 0.1; halo2.rotation.z = -t * 0.06; halo2.scale.setScalar(1 + Math.sin(t * 0.8) * 0.01); } };
}
