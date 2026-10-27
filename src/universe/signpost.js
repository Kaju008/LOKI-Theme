import * as THREE from 'three';
import { DECK_Y, FORK_Z } from './bridge.js';

// =====================================================================
//  The signpost at the fork: a tall dark pole with three arrow-shaped
//  name boards pointing down the three roads (like a crossroads sign).
//  Boards are lit from within, glow on hover, and are clickable through
//  invisible DOM buttons that story.js lays over their screen rectangles.
// =====================================================================
const BOARDS = [
  { dir: -1, label: 'The Timekeeper', sub: 'Path I · About me', col: '#45e8b4', glow: [0.27, 0.91, 0.71] },
  { dir: 0, label: 'My Works', sub: 'Path II · Timelines I’ve cut', col: '#e9c46f', glow: [0.91, 0.77, 0.43] },
  { dir: 1, label: 'The Lab', sub: 'Path III · AI tools', col: '#a48cff', glow: [0.64, 0.55, 1.0] },
];

function arrowShape(w, h, tip, dir) {
  // dir -1: points left, 1: points right, 0: points up (straight on)
  const s = new THREE.Shape();
  const hw = w / 2, hh = h / 2;
  if (dir === 0) {
    s.moveTo(-hw, -hh); s.lineTo(hw, -hh); s.lineTo(hw, hh); s.lineTo(0.42, hh); s.lineTo(0, hh + tip * 0.7); s.lineTo(-0.42, hh); s.lineTo(-hw, hh); s.closePath();
  } else {
    const x0 = -hw * dir, x1 = (hw - tip) * dir, xt = hw * dir;
    s.moveTo(x0, -hh); s.lineTo(x1, -hh); s.lineTo(xt, 0); s.lineTo(x1, hh); s.lineTo(x0, hh); s.closePath();
  }
  return s;
}

function boardTexture(b, w, h, tip) {
  const W = 1536, H = Math.round(W * (h + (b.dir === 0 ? tip * 0.7 : 0)) / w);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const px = W / w;                                      // pixels per metre
  const topPad = b.dir === 0 ? tip * 0.7 * px : 0;
  // obsidian plank with a faint grain
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#141a26'); bg.addColorStop(0.5, '#0a0e16'); bg.addColorStop(1, '#05070c');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(255,255,255,${(Math.random() * 0.018).toFixed(3)})`; g.fillRect(0, Math.random() * H, W, 1 + Math.random() * 2); }
  // inner border following the arrow
  const sh = arrowShape(w - 0.16, h - 0.16, tip - 0.06, b.dir).getPoints();
  g.beginPath();
  sh.forEach((p, i) => { const x = (p.x + w / 2) * px, y = topPad + (h / 2 - p.y) * px; i ? g.lineTo(x, y) : g.moveTo(x, y); });
  g.closePath(); g.lineWidth = 5; g.strokeStyle = b.col; g.shadowColor = b.col; g.shadowBlur = 24; g.stroke(); g.shadowBlur = 0;
  // text, centred on the plank body (away from the tip)
  const bodyC = b.dir === 0 ? W / 2 : W / 2 - b.dir * tip * px * 0.5;
  const midY = topPad + (h / 2) * px;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#f6efe0'; g.shadowColor = 'rgba(255,240,210,.55)'; g.shadowBlur = 18;
  let fs = Math.round(h * px * 0.36);
  g.font = `600 ${fs}px Cinzel, "Times New Roman", serif`;
  const label = b.label.toUpperCase().split('').join(' ');
  while (g.measureText(label).width > (w - tip - 1.0) * px && fs > 20) { fs -= 4; g.font = `600 ${fs}px Cinzel, "Times New Roman", serif`; }
  g.fillText(label, bodyC, midY - h * px * 0.08);
  g.shadowBlur = 0;
  g.font = `500 ${Math.round(h * px * 0.12)}px Unbounded, system-ui, sans-serif`;
  g.fillStyle = b.col;
  g.fillText(b.sub.toUpperCase().split('').join(' '), bodyC, midY + h * px * 0.25);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

export async function createSignpost({ env }) {
  try { await Promise.all([document.fonts.load('600 40px Cinzel'), document.fonts.load('500 20px Unbounded')]); } catch (e) { /* fallback fonts */ }
  const group = new THREE.Group();
  const base = new THREE.Vector3(0, DECK_Y, FORK_Z - 9);    // stands in the gore, just past the split
  group.position.copy(base);

  const metal = new THREE.MeshPhysicalMaterial({ color: 0x07090e, metalness: 0.9, roughness: 0.35, clearcoat: 0.6, envMap: env, envMapIntensity: 0.9 });
  const POLE_H = 9.2;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.17, POLE_H, 20), metal);
  pole.position.y = POLE_H / 2; group.add(pole);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.24, 20, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.0, 2.0, 0.8) }));
  cap.position.y = POLE_H + 0.1; group.add(cap);
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 0.28, 28), metal); foot.position.y = 0.14; group.add(foot);
  // a glowing ring on the glass around the foot
  const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.15, 0.5), transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.0, 48), ringMat); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02; group.add(ring);

  const W = 5.4, H = 1.12, TIP = 0.62, DEPTH = 0.14;
  const heights = [7.7, 6.25, 4.8];
  const yaws = [0.32, 0, -0.32];                           // left board swings toward the left road, right toward the right
  const boards = BOARDS.map((b, i) => {
    const shape = arrowShape(W, H, TIP, b.dir);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: DEPTH, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 2, curveSegments: 4 });
    geo.translate(0, 0, -DEPTH / 2);
    // remap cap UVs (group 0) onto the board texture
    const uv = geo.attributes.uv, pos = geo.attributes.position;
    const topExtra = b.dir === 0 ? TIP * 0.7 : 0;
    for (let k = 0; k < uv.count; k++) {
      const x = pos.getX(k), y = pos.getY(k), z = pos.getZ(k);
      const front = z > 0;
      uv.setXY(k, front ? (x + W / 2) / W : 1 - (x + W / 2) / W, (y + H / 2) / (H + topExtra));
    }
    const tex = boardTexture(b, W, H, TIP);
    const face = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: new THREE.Color(1, 1, 1), emissiveIntensity: 0.55, roughness: 0.55, metalness: 0.2, envMap: env, envMapIntensity: 0.4 });
    const edge = new THREE.MeshStandardMaterial({ color: new THREE.Color(...b.glow).multiplyScalar(0.25), emissive: new THREE.Color(...b.glow), emissiveIntensity: 0.9, roughness: 0.4, metalness: 0.6 });
    const mesh = new THREE.Mesh(geo, [face, edge]);
    const holder = new THREE.Group();
    holder.position.y = heights[i];
    holder.rotation.y = yaws[i];
    // the plank's tail sits on the pole, its body reaches out toward its road
    mesh.position.x = b.dir === 0 ? 0 : b.dir * (W / 2 - 0.35);
    mesh.position.z = b.dir === 0 ? 0.2 : 0;
    holder.add(mesh);
    // a small bracket where it meets the pole
    const br = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.46, 0.14), metal); br.position.z = -0.16; holder.add(br);
    group.add(holder);
    return { mesh, holder, face, edge, yaw: yaws[i], hover: 0, target: 0, W, H: H + topExtra };
  });

  // a soft halo light so the boards read against space
  // kept outside the (sometimes hidden) group so the scene's light count never changes → no shader recompiles
  const lamp = new THREE.PointLight(0xffe2b0, 0, 18, 2); lamp.position.copy(base).add(new THREE.Vector3(0, 6.6, 3));

  group.scale.set(1, 0.001, 1); group.visible = false;
  const state = { show: 0 };
  const corners = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];

  return {
    group, lamp, boards, state, base,
    setHover(i) { boards.forEach((b, k) => (b.target = k === i ? 1 : 0)); },
    // world-space corners of board i (for the DOM hit areas)
    corners(i) {
      const b = boards[i]; group.updateMatrixWorld(true);
      const hw = b.W / 2, hh = b.H / 2;
      [[-hw, -H / 2], [hw, -H / 2], [hw, b.H - H / 2], [-hw, b.H - H / 2]].forEach(([x, y], k) => corners[k].set(x, y, DEPTH).applyMatrix4(b.mesh.matrixWorld));
      return corners;
    },
    update(t, dt) {
      const s = state.show;
      group.visible = s > 0.002;
      lamp.intensity = 14 * s;
      if (!group.visible) return;
      // rises out of the glass with a little overshoot
      const e = s < 1 ? 1 - Math.pow(1 - s, 3) * Math.cos(s * 4.2) : 1;
      group.scale.set(1, Math.max(0.001, e), 1);
      boards.forEach((b, i) => {
        b.hover += (b.target - b.hover) * Math.min(1, dt * 8);
        b.holder.rotation.y = b.yaw + Math.sin(t * 0.7 + i * 1.7) * 0.025 + b.hover * 0.06 * (BOARDS[i].dir || 1);
        b.holder.rotation.z = Math.sin(t * 0.9 + i) * 0.008;
        b.face.emissiveIntensity = 0.5 + b.hover * 0.6 + Math.sin(t * 2 + i) * 0.04;
        b.edge.emissiveIntensity = 0.8 + b.hover * 2.4;
      });
      ringMat.opacity = 0.5 + Math.sin(t * 2.2) * 0.2;
    },
  };
}
