import * as THREE from 'three';

// ---------------------------------------------------------------------
// The throne monument. The photoreal render of Kaju on his throne sits on
// a stepped obsidian dais; behind it rises a towering horned crest (Loki's
// crown made architecture) in polished obsidian, gold trim and emerald
// inlay — so the throne in the render becomes part of a monument.
// ---------------------------------------------------------------------
function taperedHorn(curve, r0, segs = 64, rad = 14) {
  const geo = new THREE.TubeGeometry(curve, segs, r0, rad, false);
  const pa = geo.attributes.position, uv = geo.attributes.uv, c = new THREE.Vector3(), q = new THREE.Vector3();
  for (let i = 0; i < pa.count; i++) {
    const t = uv.getX(i);
    curve.getPointAt(Math.min(t, 1), c);
    q.fromBufferAttribute(pa, i).sub(c).multiplyScalar(Math.pow(1 - t, 0.85) * 0.97 + 0.03).add(c);
    pa.setXYZ(i, q.x, q.y, q.z);
  }
  geo.computeVertexNormals();
  return geo;
}

export function createThrone(env) {
  const g = new THREE.Group();
  const obsidian = new THREE.MeshPhysicalMaterial({ color: 0x06080c, metalness: 0.1, roughness: 0.38, clearcoat: 0.45, clearcoatRoughness: 0.3, envMap: env, envMapIntensity: 0.32 });
  const gold = new THREE.MeshPhysicalMaterial({ color: 0xc8a050, metalness: 1, roughness: 0.26, envMap: env, envMapIntensity: 1.4 });
  const inlay = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 1.15, 0.7) });
  const inlayGold = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.9, 1.3, 0.5) });

  // ---- dais: three octagonal steps with gold lips and light seams
  const steps = [[4.4, 0.34], [3.6, 0.34], [2.85, 0.3]];
  let y = 0;
  steps.forEach(([r, h], i) => {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(r, r + 0.1, h, 8, 1), obsidian);
    s.position.y = y + h / 2; s.rotation.y = Math.PI / 8; g.add(s);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(r + 0.012, 0.03, 6, 8), gold);
    lip.rotation.x = Math.PI / 2; lip.rotation.z = Math.PI / 8; lip.position.y = y + h; g.add(lip);
    const seam = new THREE.Mesh(new THREE.TorusGeometry(r + 0.06, 0.012, 4, 8), i === 2 ? inlayGold : inlay);
    seam.rotation.x = Math.PI / 2; seam.rotation.z = Math.PI / 8; seam.position.y = y + h * 0.35; g.add(seam);
    y += h;
  });
  const daisTop = y;

  // ---- the crest: a tall pointed arch slab
  const crest = new THREE.Group();
  crest.position.set(0, daisTop, -2.6);
  g.add(crest);
  const W = 2.1, H = 6.6;
  const outline = [[-W, 0], [-W, H * 0.5], [-W * 0.92, H * 0.66], [-W * 0.55, H * 0.82], [-W * 0.18, H * 0.93], [0, H * 1.08], [W * 0.18, H * 0.93], [W * 0.55, H * 0.82], [W * 0.92, H * 0.66], [W, H * 0.5], [W, 0]];
  const shape = new THREE.Shape(); shape.moveTo(...outline[0]); outline.slice(1).forEach((p) => shape.lineTo(...p)); shape.lineTo(...outline[0]);
  const slab = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.55, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 3 }), obsidian);
  slab.position.z = -0.55; crest.add(slab);
  // gold frame tracing the outline
  const framePts = outline.slice(0, -1).map(([x, yy]) => new THREE.Vector3(x * 1.03, yy * 1.01, 0.1)).concat([new THREE.Vector3(W * 1.03, 0, 0.1)]);
  const frame = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(framePts, false, 'catmullrom', 0.05), 220, 0.075, 8, false), gold);
  crest.add(frame);
  // emerald inlay: nested pointed arches
  [0.82, 0.64].forEach((k, i) => {
    const pts = outline.map(([x, yy]) => new THREE.Vector3(x * k, 0.3 + yy * k * 0.97, 0.06));
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.05), 200, i ? 0.018 : 0.03, 5, false), i ? inlayGold : inlay);
    crest.add(m);
  });
  // vertical channels of light
  for (const x of [-1.25, 1.25]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.035, H * 0.42, 0.03), inlay);
    m.position.set(x, H * 0.27, 0.06); crest.add(m);
  }
  // emblem: an hourglass of two gold pyramids with a glowing core
  const emb = new THREE.Group(); emb.position.set(0, H * 0.84, 0.15); crest.add(emb);
  const pyr = new THREE.ConeGeometry(0.34, 0.6, 4);
  const top = new THREE.Mesh(pyr, gold); top.rotation.z = Math.PI; top.position.y = 0.32; emb.add(top);
  const bot = new THREE.Mesh(pyr, gold); bot.position.y = -0.32; emb.add(bot);
  const coreGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.13), inlay); emb.add(coreGem);

  // ---- horns: two great gold horns sweeping up and out, plus two smaller inner tines
  const horn = (sx, a, b, r0) => {
    const c = new THREE.CatmullRomCurve3([
      new THREE.Vector3(sx * a[0], a[1], 0.0),
      new THREE.Vector3(sx * (a[0] + 1.6 * b), a[1] + 1.4 * b, -0.2),
      new THREE.Vector3(sx * (a[0] + 2.4 * b), a[1] + 3.6 * b, -0.45),
      new THREE.Vector3(sx * (a[0] + 1.7 * b), a[1] + 6.4 * b, -0.7),
      new THREE.Vector3(sx * (a[0] + 0.6 * b), a[1] + 8.0 * b, -0.8),
    ]);
    return new THREE.Mesh(taperedHorn(c, r0), gold);
  };
  for (const sx of [-1, 1]) {
    crest.add(horn(sx, [W * 0.62, H * 0.78], 1.0, 0.42));
    crest.add(horn(sx, [W * 0.28, H * 0.92], 0.55, 0.2));
    // flanking pillars
    const pil = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, H * 0.62, 8), obsidian);
    pil.position.set(sx * (W + 0.55), H * 0.31, -0.2); crest.add(pil);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.1, 8), gold);
    cap.position.set(sx * (W + 0.55), H * 0.62 + 0.55, -0.2); crest.add(cap);
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.12), inlay);
    gem.position.set(sx * (W + 0.55), H * 0.62 + 1.25, -0.2); crest.add(gem);
  }

  // ---- a thin clock ring behind the head (time-door motif)
  const ringG = new THREE.Group(); ringG.position.set(0, daisTop + 2.35, -1.6); g.add(ringG);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.85, 0.012, 6, 200), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.25, 0.6), transparent: true, opacity: 0.35 }));
  ringG.add(ring);
  const tickG = new THREE.BufferGeometry();
  const tp = [];
  for (let i = 0; i < 60; i++) { const a = (i / 60) * Math.PI * 2, l = i % 5 ? 0.06 : 0.16; tp.push(Math.cos(a) * 1.92, Math.sin(a) * 1.92, 0, Math.cos(a) * (1.92 + l), Math.sin(a) * (1.92 + l), 0); }
  tickG.setAttribute('position', new THREE.Float32BufferAttribute(tp, 3));
  const ticks = new THREE.LineSegments(tickG, new THREE.LineBasicMaterial({ color: new THREE.Color(1.3, 1.05, 0.55), transparent: true, opacity: 0.22 }));
  ringG.add(ticks);

  // ---- contact shadow on the dais (grounds the render)
  const shTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
    const gr = x.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, 'rgba(0,0,0,0.85)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
  })();
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 2.6), new THREE.MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.set(0, daisTop + 0.005, 0.15); g.add(shadow);

  g.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  return {
    group: g, daisTop, seatY: daisTop + 0.48, crest,
    update(t) { ringG.rotation.z = t * 0.05; ticks.rotation.z = -t * 0.02; coreGem.rotation.y = t * 0.6; },
  };
}
