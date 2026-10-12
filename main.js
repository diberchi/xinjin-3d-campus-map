/* 新進國小立體校園地圖 — Three.js r128 */
(() => {
  'use strict';
  const D = window.CAMPUS;
  const $ = s => document.querySelector(s);
  const X = px => (px - 460) / 10;   // 平面圖像素 → 世界座標
  const Z = py => (py - 700) / 10;
  const FH = 1.7;                     // 每層樓高
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- 場景 ----------
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  $('#stage').appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const DAY = { bg: 0xbfe3ef, fog: 0xbfe3ef, hemi: 0.75, sun: 0.95 };
  const NIGHT = { bg: 0x0d1828, fog: 0x0d1828, hemi: 0.28, sun: 0.22 };
  scene.background = new THREE.Color(DAY.bg);
  scene.fog = new THREE.Fog(DAY.fog, 160, 340);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 900);
  const HOME = { pos: new THREE.Vector3(-18, 68, 92), target: new THREE.Vector3(2, 0, -10) };
  camera.position.copy(HOME.pos);
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.target.copy(HOME.target);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI * 0.46;
  controls.minDistance = 10;
  controls.maxDistance = 230;
  controls.screenSpacePanning = false;

  const hemi = new THREE.HemisphereLight(0xffffff, 0x6f8f6a, DAY.hemi);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff3dc, DAY.sun);
  sun.position.set(-50, 90, 40);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -75, right: 75, top: 75, bottom: -75, near: 10, far: 260 });
  sun.shadow.bias = -0.0006;
  scene.add(sun);

  const lam = (c, o = {}) => new THREE.MeshLambertMaterial(Object.assign({ color: c }, o));
  function box(w, h, d, m, x, y, z, cast = true) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z);
    mesh.castShadow = cast; mesh.receiveShadow = true;
    return mesh;
  }
  const rectInfo = r => ({ w: (r[2] - r[0]) / 10, d: (r[3] - r[1]) / 10, x: X((r[0] + r[2]) / 2), z: Z((r[1] + r[3]) / 2) });

  // ---------- 文字貼圖 ----------
  function wrapLines(ctx, text, maxW) {
    const lines = []; let cur = '';
    for (const ch of text) {
      if (ctx.measureText(cur + ch).width > maxW && cur) { lines.push(cur); cur = ch; } else cur += ch;
    }
    if (cur) lines.push(cur);
    return lines;
  }
  function textTexture(text, wUnits, dUnits, bg, fg, opt = {}) {
    const ppu = opt.ppu || 48;
    const W = Math.min(1024, Math.max(64, Math.round(wUnits * ppu)));
    const H = Math.min(1024, Math.max(32, Math.round(dUnits * ppu)));
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, W, H); }
    if (opt.border) { g.strokeStyle = opt.border; g.lineWidth = 4; g.strokeRect(2, 2, W - 4, H - 4); }
    let size = opt.size || Math.min(H * 0.42, 44);
    let lines;
    for (;;) {
      g.font = `700 ${size}px "Noto Sans TC","Microsoft JhengHei",sans-serif`;
      lines = wrapLines(g, text, W * 0.9);
      if (lines.length * size * 1.15 <= H * 0.9 || size < 11) break;
      size -= 2;
    }
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    const top = H / 2 - (lines.length - 1) * size * 0.575;
    lines.forEach((l, i) => g.fillText(l, W / 2, top + i * size * 1.15));
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 4;
    return t;
  }
  function flatText(text, w, d, x, z, y, bg, fg, opt) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d),
      new THREE.MeshBasicMaterial({ map: textTexture(text, w, d, bg, fg, opt), transparent: !bg, depthWrite: !!bg }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    return m;
  }

  // ---------- 地面與道路 ----------
  const world = new THREE.Group(); scene.add(world);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), lam(0x9cc48a));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; world.add(ground);

  const pave = rectInfo([15, 440, 905, 1178]);
  const paveM = new THREE.Mesh(new THREE.PlaneGeometry(pave.w, pave.d), lam(0xd8d3c6));
  paveM.rotation.x = -Math.PI / 2; paveM.position.set(pave.x, 0.03, pave.z); paveM.receiveShadow = true; world.add(paveM);

  const road1 = rectInfo([-45, 60, 12, 1245]);      // 安和街
  const road2 = rectInfo([-45, 1185, 960, 1245]);   // 中正路
  for (const r of [road1, road2]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(r.w, r.d), lam(0x5b6168));
    m.rotation.x = -Math.PI / 2; m.position.set(r.x, 0.04, r.z); m.receiveShadow = true; world.add(m);
  }
  const dashM = lam(0xf2f2f2);
  for (let y = 80; y < 1180; y += 40) world.add(box(0.25, 0.02, 1.8, dashM, road1.x, 0.06, Z(y), false));
  for (let x = 30; x < 950; x += 40) world.add(box(1.8, 0.02, 0.25, dashM, X(x), 0.06, road2.z, false));
  world.add(flatText('安和街', 5, 13, road1.x, Z(330), 0.07, null, '#ffffff', { size: 60 }));
  world.add(flatText('中 正 路', 26, 4.5, X(480), road2.z, 0.07, null, '#ffffff', { size: 60 }));
  // 安和街直書
  (function () {
    const t = flatText('安和街', 4, 12, road1.x, Z(820), 0.07, null, '#ffffff', { size: 60 });
    world.add(t);
  })();
  // 圍牆
  const wallM = lam(0xb9b3a6);
  world.add(box(0.3, 1, pave.d, wallM, X(15), 0.5, pave.z));
  world.add(box(pave.w, 1, 0.3, wallM, pave.x, 0.5, Z(1178)));

  // ---------- 大操場 ----------
  function stadiumPts(r, inset, n = 40) {
    const x0 = X(r[0]) + inset, x1 = X(r[2]) - inset, z0 = Z(r[1]) + inset, z1 = Z(r[3]) - inset;
    const R = (z1 - z0) / 2, zc = (z0 + z1) / 2, cr = x1 - R, cl = x0 + R;
    const pts = [];
    for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + Math.PI * i / n; pts.push([cr + R * Math.cos(a), zc + R * Math.sin(a)]); }
    for (let i = 0; i <= n; i++) { const a = Math.PI / 2 + Math.PI * i / n; pts.push([cl + R * Math.cos(a), zc + R * Math.sin(a)]); }
    return pts;
  }
  const toShape = pts => new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], -p[1])));
  const F = D.field.rect;
  const outer = toShape(stadiumPts(F, 0));
  const innerPts = stadiumPts(F, 3.2);
  outer.holes.push(new THREE.Path(innerPts.map(p => new THREE.Vector2(p[0], -p[1]))));
  const track = new THREE.Mesh(new THREE.ShapeGeometry(outer), lam(0xc8553f));
  track.rotation.x = -Math.PI / 2; track.position.y = 0.06; track.receiveShadow = true; world.add(track);
  const grass = new THREE.Mesh(new THREE.ShapeGeometry(toShape(innerPts)), lam(0x6fb35a));
  grass.rotation.x = -Math.PI / 2; grass.position.y = 0.06; grass.receiveShadow = true; world.add(grass);
  for (const ins of [0.8, 1.6, 2.4]) {
    const p = stadiumPts(F, ins).map(q => new THREE.Vector3(q[0], 0.08, q[1]));
    world.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(p), new THREE.LineBasicMaterial({ color: 0xf6e8e2 })));
  }
  // 草皮條紋
  const fi = rectInfo(F);
  for (let i = 0; i < 9; i++) {
    if (i % 2) continue;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(4.2, fi.d - 8), lam(0x78bd62));
    m.rotation.x = -Math.PI / 2; m.position.set(fi.x - 19 + i * 4.2, 0.07, fi.z - 1.5); world.add(m);
  }
  world.add(flatText('大操場', 14, 4, X(560), Z(225), 0.09, null, 'rgba(255,255,255,.85)', { size: 70 }));

  // ---------- 建築 ----------
  function windowTex(wall, night) {
    const c = document.createElement('canvas'); c.width = 64; c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = wall; g.fillRect(0, 0, 64, 64);
    g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(0, 58, 64, 6);
    g.fillStyle = night ? '#ffd27a' : '#7fb4cf'; g.fillRect(9, 16, 46, 30);
    g.fillStyle = night ? '#ffe7b0' : '#a9d3e6'; g.fillRect(9, 16, 46, 8);
    g.fillStyle = wall; g.fillRect(30, 16, 4, 30);
    return c;
  }
  const texCache = {};
  function sideTex(wall, rep, night) {
    const key = wall + rep.toFixed(2) + night;
    if (!texCache[key]) {
      const t = new THREE.CanvasTexture(windowTex(wall, night));
      t.wrapS = THREE.RepeatWrapping; t.repeat.set(rep, 1); t.anisotropy = 4;
      texCache[key] = t;
    }
    return texCache[key];
  }
  const nightSwap = []; // [material, wall, rep]
  function shellMats(wall, w, d) {
    const top = lam(new THREE.Color(wall).multiplyScalar(0.92));
    const mk = len => {
      const rep = Math.max(1, Math.round(len / 3.2));
      const m = lam(0xffffff, { map: sideTex(wall, rep, false) });
      nightSwap.push([m, wall, rep]);
      return m;
    };
    const mx = mk(d), mz = mk(w);
    return [mx, mx, top, top, mz, mz];
  }
  function roomColor(n) {
    if (/樓梯|廁所|川堂/.test(n)) return '#cfd4d8';
    if (/幼兒園/.test(n)) return '#ffd3e0';
    if (/辦公室|校長|檔案|口力|健康/.test(n)) return '#ffe39a';
    if (/資源|自閉|知動|生命|諮商|忠班/.test(n)) return '#dccdff';
    if (/科任|電腦|視聽|E化|pil|圖書|校史|英村|準備|午餐|儲藏|志工|教具|棒球|體育/.test(n)) return '#c4ebcb';
    return '#c2e2ff';
  }

  const pickables = [];
  const B = {};           // id → {data, group, floors:[{shell, tiles}], roof, top}
  const labels = [];      // {el, pos, kind, id}
  const labelLayer = $('#labels');
  function addLabel(text, pos, kind, onClick) {
    const el = document.createElement('div');
    el.className = 'lbl' + (kind === 'place' ? ' place' : '');
    el.textContent = text;
    if (onClick) el.addEventListener('click', onClick);
    labelLayer.appendChild(el);
    const L = { el, pos, kind };
    labels.push(L);
    return L;
  }

  function buildBuilding(b) {
    const r = rectInfo(b.rect);
    const g = new THREE.Group(); world.add(g);
    const entry = { data: b, group: g, floors: [], r };
    B[b.id] = entry;
    let topY = 0;

    if (b.court) {   // 風雨球場：柱子＋屋頂
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(r.w, r.d), lam(0x3f8f7a));
      floor.rotation.x = -Math.PI / 2; floor.position.set(r.x, 0.08, r.z); floor.receiveShadow = true; g.add(floor);
      const lineM = lam(0xffffff);
      g.add(box(r.w - 3, 0.02, 0.15, lineM, r.x, 0.1, r.z, false));
      const pM = lam(0x8796a0);
      for (const sx of [-1, 1]) for (let i = 0; i <= 4; i++) g.add(box(0.5, 6.2, 0.5, pM, r.x + sx * (r.w / 2 - 0.4), 3.1, r.z - r.d / 2 + 0.4 + i * (r.d - 0.8) / 4));
      const rg = new THREE.CylinderGeometry(r.w * 0.62, r.w * 0.62, r.d, 32, 1, true, Math.PI - 0.85, 1.7);
      rg.rotateX(Math.PI / 2);
      const roof = new THREE.Mesh(rg, lam(b.roof, { side: THREE.DoubleSide }));
      roof.position.set(r.x, 6.2 - r.w * 0.62 * Math.cos(0.85) + 0.3, r.z);
      roof.castShadow = true; g.add(roof); pickRegister(roof, b.id);
      topY = 7.6;
    } else if (b.hall) {   // 活動中心：拱頂
      const hgt = FH * 2.2;
      const body = box(r.w, hgt, r.d, shellMats(b.wall, r.w, r.d), r.x, hgt / 2, r.z);
      g.add(body); pickRegister(body, b.id);
      const rg = new THREE.CylinderGeometry(r.w / 2 + 0.3, r.w / 2 + 0.3, r.d + 0.6, 24, 1, false, Math.PI / 2, Math.PI);
      rg.rotateX(Math.PI / 2);
      const roof = new THREE.Mesh(rg, lam(b.roof));
      roof.scale.set(1, 0.45, 1);
      roof.position.set(r.x, hgt, r.z);
      roof.castShadow = true; g.add(roof); pickRegister(roof, b.id);
      topY = hgt + r.w * 0.25;
    } else if (b.stage) {  // 司令台
      const base = box(r.w, 1.2, r.d, shellMats(b.wall, r.w, r.d), r.x, 0.6, r.z);
      g.add(base); pickRegister(base, b.id);
      const back = box(r.w, 2.6, 0.5, lam(b.wall), r.x, 2.5, r.z + r.d / 2 - 0.3);
      g.add(back); pickRegister(back, b.id);
      const roof = box(r.w + 1, 0.3, r.d * 0.75, lam(b.roof), r.x, 4.0, r.z + r.d * 0.1);
      g.add(roof); pickRegister(roof, b.id);
      for (const sx of [-1, 1]) g.add(box(0.35, 2.8, 0.35, lam(0x8796a0), r.x + sx * (r.w / 2 - 0.3), 2.6, r.z - r.d * 0.2));
      // 旗桿
      g.add(box(0.15, 9, 0.15, lam(0xdfe5e8), X(530), 4.5, Z(450)));
      const flag = box(1.8, 1.1, 0.05, lam(0xd8323a), X(530) + 0.95, 8.3, Z(450), false);
      g.add(flag); entry.flag = flag;
      topY = 4.3;
    } else {
      const nf = b.floors ? b.floors.length : (b.nf || 1);
      const fh = b.low ? 1.4 : FH;
      for (let f = 0; f < nf; f++) {
        const y0 = f * fh;
        const shell = box(r.w, fh - 0.12, r.d, shellMats(b.wall, r.w, r.d), r.x, y0 + fh / 2, r.z);
        g.add(shell); pickRegister(shell, b.id, f);
        const slab = box(r.w + 0.25, 0.14, r.d + 0.25, lam(0xbfb7a8), r.x, y0 + fh - 0.05, r.z);
        g.add(slab);
        const tiles = new THREE.Group(); tiles.visible = false; g.add(tiles);
        const slots = [];
        if (b.floors) for (const [name, a0, a1] of b.floors[f]) {
          let tw, td, tx, tz;
          if (b.axis === 'x') { tw = (a1 - a0) / 10 - 0.18; td = r.d - 0.25; tx = X((a0 + a1) / 2); tz = r.z; }
          else { tw = r.w - 0.25; td = (a1 - a0) / 10 - 0.18; tx = r.x; tz = Z((a0 + a1) / 2); }
          const col = roomColor(name);
          const topM = new THREE.MeshLambertMaterial({ map: textTexture(name, tw, td, col, '#1d2a33', { border: 'rgba(0,0,0,.18)' }) });
          const sideM = lam(new THREE.Color(col).multiplyScalar(0.8));
          const t = box(tw, 0.9, td, [sideM, sideM, topM, sideM, sideM, sideM], tx, y0 + 0.45, tz);
          tiles.add(t); pickRegister(t, b.id, f, name);
          slots.push({ name, mesh: t, pos: new THREE.Vector3(tx, y0 + 0.9, tz), w: tw, d: td });
        }
        const floorBase = box(r.w, 0.12, r.d, lam(0xe9e4da), r.x, y0 + 0.06, r.z, false);
        floorBase.visible = false; g.add(floorBase);
        entry.floors.push({ shell, slab, tiles, slots, floorBase, y0 });
      }
      topY = nf * fh;
      const roof = box(r.w + 0.5, 0.35, r.d + 0.5, lam(b.roof), r.x, topY + 0.17, r.z);
      g.add(roof); entry.roof = roof; pickRegister(roof, b.id);
      // 屋頂小設備
      if (!b.low) { entry.roofExtra = box(Math.min(3, r.w * 0.3), 0.8, Math.min(3, r.d * 0.3), lam(0xcfd3d6), r.x + r.w * 0.2, topY + 0.75, r.z - r.d * 0.2); g.add(entry.roofExtra); }
      topY += 0.4;
    }
    entry.top = new THREE.Vector3(r.x, topY + 0.6, r.z);
    entry.label = addLabel(b.name, entry.top, 'bld', () => selectBuilding(b.id));
  }
  function pickRegister(mesh, bid, floor, room) { mesh.userData = { bid, floor, room }; pickables.push(mesh); }

  D.buildings.forEach(buildBuilding);

  // 小型設施
  for (const p of D.places) {
    const r = rectInfo(p.rect);
    if (p.garden) {
      const m = box(r.w, p.h, r.d, lam(p.color), r.x, p.h / 2, r.z, false); world.add(m);
      for (let i = 0; i < 10; i++) {
        const fx = r.x + (Math.random() - .5) * (r.w - 0.8), fz = r.z + (Math.random() - .5) * (r.d - 0.8);
        world.add(box(0.35, 0.35, 0.35, lam(['#ff8fb1', '#ffe066', '#ffffff', '#c9a0ff'][i % 4]), fx, p.h + 0.2, fz, false));
      }
    } else {
      const m = box(r.w, p.h, r.d, lam(p.color), r.x, p.h / 2, r.z, !p.flat); world.add(m);
      if (!p.flat) world.add(box(r.w + 0.3, 0.15, r.d + 0.3, lam(0x8a8f92), r.x, p.h + 0.07, r.z));
    }
    addLabel(p.name, new THREE.Vector3(r.x, p.h + 0.6, r.z), 'place');
  }

  // ---------- 樹 ----------
  const trunkM = lam(0x7a5a3c), leafMs = [lam(0x3f8f4a), lam(0x4fa056), lam(0x5aa85e)];
  function tree(px, py, s = 1) {
    const g = new THREE.Group();
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * s, 0.25 * s, 1.4 * s, 6), trunkM);
    tr.position.y = 0.7 * s; tr.castShadow = true; g.add(tr);
    const lf = new THREE.Mesh(new THREE.ConeGeometry(1.15 * s, 2.6 * s, 7), leafMs[(px + py) % 3]);
    lf.position.y = 2.4 * s; lf.castShadow = true; g.add(lf);
    g.position.set(X(px), 0, Z(py)); world.add(g);
  }
  for (let x = 60; x <= 760; x += 42) tree(x, 105, 0.9);
  for (let y = 130; y <= 430; y += 42) tree(45, y, 0.9);
  for (let y = 500; y <= 1160; y += 46) tree(915, y, 0.85);
  for (let x = 170; x <= 880; x += 50) tree(x, 1178, 0.6);
  for (let y = 120; y <= 360; y += 48) tree(910, y, 0.85);

  // ---------- 逃生路線 ----------
  const routeGroup = new THREE.Group(); world.add(routeGroup);
  const routeM = new THREE.MeshBasicMaterial({ color: 0xef4b3f, transparent: true, opacity: 0.55, depthWrite: false });
  const arrowM = lam(0xe8382d, { emissive: 0x5a0d08 });
  const arrows = [];
  for (const rt of D.routes) {
    const curve = new THREE.CatmullRomCurve3(rt.pts.map(p => new THREE.Vector3(X(p[0]), 0.35, Z(p[1]))), false, 'catmullrom', 0.2);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 0.22, 6, false), routeM);
    routeGroup.add(tube);
    const len = curve.getLength();
    const n = Math.max(2, Math.round(len / 4.5));
    for (let i = 0; i < n; i++) {
      const a = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.4, 4), arrowM);
      a.castShadow = false;
      routeGroup.add(a);
      arrows.push({ mesh: a, curve, off: i / n });
    }
    // 終點標記
    const end = curve.getPointAt(1);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.95, 20), new THREE.MeshBasicMaterial({ color: 0xef4b3f, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(end.x, 0.12, end.z); routeGroup.add(ring);
  }
  const UP = new THREE.Vector3(0, 1, 0);
  function updateArrows(t) {
    for (const a of arrows) {
      const u = reduceMotion ? a.off : (a.off + t * 0.00006) % 1;
      const p = a.curve.getPointAt(u), tan = a.curve.getTangentAt(u);
      a.mesh.position.set(p.x, 0.45, p.z);
      a.mesh.quaternion.setFromUnitVectors(UP, tan.normalize());
    }
  }

  // ---------- 集合位置 ----------
  const asmGroup = new THREE.Group(); world.add(asmGroup);
  const classSpots = {};  // name → {pos, label, grade}
  const gradeColor = { '一': '#f28b82', '二': '#fbbc04', '三': '#81c995', '四': '#78d9ec', '五': '#aecbfa', '六': '#d7aefb' };
  const A = D.assembly;
  // 黃色集合條
  const strip = rectInfo([A.row.x0, A.row.y - 10, A.row.x1, A.row.y + 10]);
  asmGroup.add(box(strip.w, 0.1, strip.d, lam(0xf6e04a), strip.x, 0.12, strip.z, false));
  const cellW = (A.row.x1 - A.row.x0) / A.row.classes.length;
  function addSpot(name, px, py, side) {
    const pos = new THREE.Vector3(X(px), 0.2, Z(py));
    const g = gradeColor[name[0]] || '#ffd1dc';
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.1, 8), lam(g));
    post.position.set(pos.x, 0.65, pos.z); post.castShadow = true; asmGroup.add(post);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), lam(g));
    head.position.set(pos.x, 1.35, pos.z); asmGroup.add(head);
    pickRegister(post, null); post.userData = { spot: name };
    pickRegister(head, null); head.userData = { spot: name };
    let tex;
    if (side === 'row') tex = flatText(name, 1.8, 1.6, pos.x, pos.z - 2.3, 0.14, g, '#1d2a33', { size: 30 });
    else if (name.length > 3) tex = flatText(name, 7, 1.6, pos.x + (side === 'right' ? 3.2 : -3.2), pos.z + 1.3, 0.14, g, '#1d2a33', { size: 28 });
    else tex = flatText(name, 2.1, 1.3, pos.x + (side === 'right' ? 1.8 : -1.8), pos.z, 0.14, g, '#1d2a33', { size: 30 });
    asmGroup.add(tex);
    classSpots[name] = { pos, color: g, side };
  }
  A.row.classes.forEach((c, i) => addSpot(c, A.row.x0 + cellW * (i + 0.5), A.row.y, 'row'));
  A.left.forEach(([n, x, y]) => addSpot(n, x, y, 'left'));
  A.right.forEach(([n, x, y]) => addSpot(n, x, y, 'right'));
  // 編組
  for (const [name, x0, x1, col] of A.groups) {
    const r = rectInfo([x0, A.groupY[0], x1, A.groupY[1]]);
    const isCmd = name === '指揮中心';
    const m = box(r.w - 0.2, isCmd ? 0.5 : 0.25, r.d - 0.2, lam(col), r.x, isCmd ? 0.25 : 0.13, r.z, false);
    asmGroup.add(m);
    asmGroup.add(flatText(name, r.w - 0.4, r.d - 0.6, r.x, r.z, isCmd ? 0.52 : 0.27, col, '#2a1a10', { size: 40 }));
    classSpots[name] = { pos: new THREE.Vector3(r.x, 0.3, r.z), color: col, group: true };
  }

  // ---------- 標記 ----------
  const pulse = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xf6c445, transparent: true, opacity: 0.45, depthWrite: false }));
  pulse.visible = false; scene.add(pulse);
  const pin = new THREE.Group();
  const pinCone = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.8, 12), lam(0xf6c445, { emissive: 0x6a4c00 }));
  pinCone.rotation.x = Math.PI; pinCone.position.y = 0.9; pin.add(pinCone);
  const pinBall = new THREE.Mesh(new THREE.SphereGeometry(0.75, 14, 10), lam(0xf6c445, { emissive: 0x6a4c00 }));
  pinBall.position.y = 2.1; pin.add(pinBall);
  pin.visible = false; scene.add(pin);
  const selBox = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color: 0x3fb8d9 }));
  selBox.visible = false; scene.add(selBox);

  // ---------- 相機飛行 ----------
  let fly = null;
  function flyTo(target, dist, dir) {
    const d = dir ? dir.clone().normalize() : camera.position.clone().sub(controls.target).normalize();
    if (d.y < 0.45) { d.y = 0.45; d.normalize(); }
    const pos = target.clone().add(d.multiplyScalar(dist));
    if (reduceMotion) { camera.position.copy(pos); controls.target.copy(target); return; }
    fly = { p0: camera.position.clone(), t0: controls.target.clone(), p1: pos, t1: target.clone(), k: 0 };
  }
  const ease = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;

  // ---------- 選取與剖面 ----------
  let selected = null, cutFloor = null;
  function setCutaway(id, f) {
    for (const k in B) {
      const e = B[k];
      e.floors.forEach((fl, i) => {
        const cut = k === id && f != null;
        fl.shell.visible = !cut || i < f;
        fl.slab.visible = !cut || i < f;
        fl.tiles.visible = cut && i === f;
        fl.floorBase.visible = cut && i === f;
      });
      if (e.roof) e.roof.visible = !(k === id && f != null);
      if (e.roofExtra) e.roofExtra.visible = !(k === id && f != null);
    }
    cutFloor = f;
  }
  function selectBuilding(id, opts = {}) {
    const e = B[id]; if (!e) return;
    selected = id;
    pin.visible = false; pulse.visible = false;
    setCutaway(id, opts.floor != null ? opts.floor : null);
    const r = e.r;
    selBox.scale.set(r.w + 0.6, e.top.y + 0.2, r.d + 0.6);
    selBox.position.set(r.x, e.top.y / 2, r.z);
    selBox.visible = true;
    labels.forEach(l => l.el.classList.toggle('sel', l === e.label));
    document.querySelectorAll('#places button').forEach(b => b.classList.toggle('on', b.dataset.id === id));
    if (!opts.noFly) flyTo(new THREE.Vector3(r.x, opts.floor != null ? e.floors[opts.floor].y0 : 2, r.z), Math.max(32, Math.max(r.w, r.d) * 1.35), new THREE.Vector3(-0.55, 0.85, 1));
    renderInfo(e.data, opts.floor, opts.room);
  }
  function selectRoom(id, f, name) {
    const e = B[id];
    selectBuilding(id, { floor: f, room: name, noFly: true });
    const slot = e.floors[f].slots.find(s => s.name === name);
    if (!slot) return;
    pulse.scale.set(slot.w + 0.3, 1.4, slot.d + 0.3);
    pulse.position.set(slot.pos.x, slot.pos.y - 0.2, slot.pos.z);
    pulse.visible = true;
    pin.position.set(slot.pos.x, slot.pos.y + 0.3, slot.pos.z); pin.visible = true;
    flyTo(slot.pos.clone(), 26, new THREE.Vector3(-0.4, 1, 0.9));
  }
  function selectSpot(name) {
    const s = classSpots[name]; if (!s) return;
    if (!$('#tAssembly').classList.contains('on')) asmGroup.visible = toggle('#tAssembly', true);
    selected = null; setCutaway(null, null); selBox.visible = false; pulse.visible = false;
    labels.forEach(l => l.el.classList.remove('sel'));
    pin.position.set(s.pos.x, 1.6, s.pos.z); pin.visible = true;
    document.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c.dataset.spot === name));
    flyTo(s.pos.clone(), 26, new THREE.Vector3(0, 1.1, 1));
    renderSpotInfo(name);
  }
  function clearSelection() {
    selected = null; setCutaway(null, null); selBox.visible = false; pin.visible = false; pulse.visible = false;
    labels.forEach(l => l.el.classList.remove('sel'));
    document.querySelectorAll('#places button.on, .chip.on').forEach(b => b.classList.remove('on'));
    $('#info').hidden = true;
  }

  // ---------- 資訊面板 ----------
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function renderInfo(b, floor, room) {
    let h = `<h2>${esc(b.name)}</h2><div class="en">${esc(b.en)}</div>`;
    h += `<section><h3>建築概要</h3><p>${esc(b.desc)}</p></section>`;
    if (b.floors) {
      h += `<section><h3>樓層與室內配置</h3><div class="floors">`;
      for (let f = b.floors.length - 1; f >= 0; f--) {
        const rooms = b.floors[f].filter(r => !/^(樓梯|廁所)$/.test(r[0]));
        h += `<div class="floor${floor === f ? ' on' : ''}"><button data-floor="${f}"><b>${f + 1}F</b>${esc(rooms.map(r => r[0]).slice(0, 3).join('、'))}${rooms.length > 3 ? '…' : ''}</button><div class="rooms">` +
          rooms.map(r => `<button class="room${room === r[0] ? ' on' : ''}" data-floor="${f}" data-room="${esc(r[0])}">${esc(r[0])}</button>`).join('') + `</div></div>`;
      }
      h += `</div><div class="tip">點樓層會切開大樓看該層平面；點教室名稱會在地圖上標出位置。</div></section>`;
    }
    h += `<section class="evac"><h3>避難方向</h3><p>${esc(b.evac)}</p></section>`;
    $('#infoBody').innerHTML = h;
    $('#info').hidden = false;
    $('#infoBody').querySelectorAll('.floor>button').forEach(btn => btn.onclick = () => {
      const f = +btn.dataset.floor;
      if (cutFloor === f) { selectBuilding(selected); } else selectBuilding(b.id, { floor: f });
    });
    $('#infoBody').querySelectorAll('.room').forEach(btn => btn.onclick = () => selectRoom(b.id, +btn.dataset.floor, btn.dataset.room));
  }
  function renderSpotInfo(name) {
    const s = classSpots[name];
    let where;
    if (s.group) where = '司令台前方的編組區。演練時由該組人員在此待命。';
    else if (s.side === 'row') {
      const i = A.row.classes.indexOf(name) + 1;
      where = `大操場南側、司令台前的黃色集合線上，由西往東第 <b>${i}</b> 個位置（平面圖編號 ${i + 1}）。`;
    } else if (s.side === 'left') where = '大操場西側（靠安和街那一端），直排由南往北排列。';
    else where = '大操場東側（靠風雨球場那一端），直排由南往北排列。';
    $('#infoBody').innerHTML = `<h2>${esc(name)}</h2><div class="en">Assembly Point</div>
      <section><h3>集合位置</h3><div class="big-pos">${esc(name)}</div><p>${where}</p></section>
      <section class="evac"><h3>演練提醒</h3><p>聽到廣播後，依教室所在大樓的避難方向（紅色箭頭）前往大操場，到達後依班級位置排好、導師清點人數回報。</p></section>`;
    $('#info').hidden = false;
  }
  $('#infoClose').onclick = clearSelection;

  // ---------- 側邊清單 ----------
  const placesUl = $('#places');
  for (const b of D.buildings) {
    const li = document.createElement('li');
    const nf = b.floors ? b.floors.length : 0;
    li.innerHTML = `<button data-id="${b.id}"><span class="dot" style="background:${b.color}"></span>${esc(b.name)}${nf > 1 ? `<span class="fl">${nf} 層</span>` : ''}</button>`;
    li.firstChild.onclick = () => selectBuilding(b.id);
    placesUl.appendChild(li);
  }
  {
    const li = document.createElement('li');
    li.innerHTML = `<button data-id="field"><span class="dot" style="background:#6fb35a"></span>大操場（集合區）</button>`;
    li.firstChild.onclick = () => { clearSelection(); flyTo(new THREE.Vector3(X(415), 0, Z(330)), 58, new THREE.Vector3(0, 1.1, 1)); };
    placesUl.appendChild(li);
  }
  const classesDiv = $('#classes');
  const gradeOrder = ['一', '二', '三', '四', '五', '六'];
  let ch = '';
  for (const gName of gradeOrder) {
    const list = Object.keys(classSpots).filter(n => n[0] === gName);
    ch += `<h4>${gName}年級</h4><div class="chips">${list.map(n => `<button class="chip" data-spot="${esc(n)}">${esc(n)}</button>`).join('')}</div>`;
  }
  const others = Object.keys(classSpots).filter(n => !gradeOrder.includes(n[0]) && !classSpots[n].group);
  ch += `<h4>特教班・幼兒園</h4><div class="chips">${others.map(n => `<button class="chip" data-spot="${esc(n)}">${esc(n.replace(/（.*）/, ''))}</button>`).join('')}</div>`;
  ch += `<h4>演練編組</h4><div class="chips">${A.groups.map(g => `<button class="chip" data-spot="${esc(g[0])}">${esc(g[0])}</button>`).join('')}</div>`;
  classesDiv.innerHTML = ch;
  classesDiv.querySelectorAll('.chip').forEach(c => c.onclick = () => selectSpot(c.dataset.spot));

  document.querySelectorAll('.tab').forEach(t => t.onclick = () => {
    document.querySelectorAll('.tab').forEach(x => x.classList.toggle('on', x === t));
    $('#places').hidden = t.dataset.tab !== 'places';
    $('#classes').hidden = t.dataset.tab !== 'classes';
  });
  $('#fold').onclick = () => { const s = $('#side'); s.classList.toggle('folded'); $('#fold').textContent = s.classList.contains('folded') ? '+' : '−'; };

  // 搜尋
  const index = [];
  for (const b of D.buildings) {
    index.push({ text: b.name, sub: '建築', go: () => selectBuilding(b.id) });
    (b.floors || []).forEach((fl, f) => fl.forEach(([n]) => {
      if (/^(樓梯|廁所)$/.test(n)) return;
      index.push({ text: n, sub: `${b.name} ${f + 1}F`, go: () => selectRoom(b.id, f, n) });
    }));
  }
  for (const n of Object.keys(classSpots)) index.push({ text: n, sub: classSpots[n].group ? '演練編組' : '班級集合點', go: () => selectSpot(n) });
  const res = $('#results');
  $('#search').addEventListener('input', e => {
    const q = e.target.value.trim().replace(/\s/g, '');
    if (!q) { res.hidden = true; return; }
    const hits = index.filter(i => i.text.replace(/\s/g, '').includes(q)).slice(0, 12);
    res.innerHTML = hits.length ? '' : '<div class="none">找不到符合的教室或班級</div>';
    hits.forEach(h => {
      const b = document.createElement('button');
      b.innerHTML = `${esc(h.text)}<small>${esc(h.sub)}</small>`;
      b.onclick = () => { h.go(); res.hidden = true; };
      res.appendChild(b);
    });
    res.hidden = false;
  });
  $('#search').addEventListener('keydown', e => { if (e.key === 'Enter') { const b = res.querySelector('button'); if (b) b.click(); } });

  // ---------- 工具列 ----------
  function toggle(sel, force) {
    const b = $(sel);
    const on = force != null ? force : !b.classList.contains('on');
    b.classList.toggle('on', on); b.setAttribute('aria-pressed', on);
    return on;
  }
  $('#tLabels').onclick = () => document.body.classList.toggle('labels-off', !toggle('#tLabels'));
  $('#tRoutes').onclick = () => { routeGroup.visible = toggle('#tRoutes'); };
  $('#tAssembly').onclick = () => { asmGroup.visible = toggle('#tAssembly'); };
  $('#tReset').onclick = () => { stopTour(); clearSelection(); flyTo(HOME.target.clone(), HOME.pos.distanceTo(HOME.target), HOME.pos.clone().sub(HOME.target)); };
  let night = false;
  $('#tNight').onclick = () => {
    night = toggle('#tNight');
    const P = night ? NIGHT : DAY;
    scene.background.set(P.bg); scene.fog.color.set(P.fog);
    hemi.intensity = P.hemi; sun.intensity = P.sun;
    for (const [m, wall, rep] of nightSwap) { m.map = sideTex(wall, rep, night); m.emissive.set(night ? 0x2a2210 : 0x000000); m.needsUpdate = true; }
  };
  let tourTimer = null, tourI = 0;
  function stopTour() { if (tourTimer) { clearInterval(tourTimer); tourTimer = null; toggle('#tTour', false); } }
  $('#tTour').onclick = () => {
    if (tourTimer) { stopTour(); return; }
    toggle('#tTour', true);
    const step = () => { selectBuilding(D.buildings[tourI % D.buildings.length].id); tourI++; };
    step(); tourTimer = setInterval(step, 6000);
  };

  // ---------- 點選 ----------
  const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
  let down = null;
  renderer.domElement.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; stopTour(); });
  renderer.domElement.addEventListener('pointerup', e => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return;
    const rc = renderer.domElement.getBoundingClientRect();
    mouse.set((e.clientX - rc.left) / rc.width * 2 - 1, -(e.clientY - rc.top) / rc.height * 2 + 1);
    ray.setFromCamera(mouse, camera);
    const hit = ray.intersectObjects(pickables.filter(m => isVisible(m)), false)[0];
    if (!hit) return;
    const u = hit.object.userData;
    if (u.spot) selectSpot(u.spot);
    else if (u.room) selectRoom(u.bid, u.floor, u.room);
    else if (u.bid) selectBuilding(u.bid);
  });
  function isVisible(o) { while (o) { if (!o.visible) return false; o = o.parent; } return true; }

  // ---------- 迴圈 ----------
  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize); resize();
  const v = new THREE.Vector3();
  function loop(t) {
    if (fly) {
      fly.k = Math.min(1, fly.k + 0.022);
      const k = ease(fly.k);
      camera.position.lerpVectors(fly.p0, fly.p1, k);
      controls.target.lerpVectors(fly.t0, fly.t1, k);
      if (fly.k >= 1) fly = null;
    }
    controls.update();
    if (routeGroup.visible) updateArrows(t);
    if (pulse.visible) pulse.material.opacity = 0.3 + 0.25 * Math.sin(t / 220);
    if (pin.visible && !reduceMotion) { pinBall.position.y = 2.1 + Math.sin(t / 250) * 0.3; pinCone.position.y = 0.9 + Math.sin(t / 250) * 0.3; }
    if (B.b7 && B.b7.flag && !reduceMotion) B.b7.flag.rotation.y = Math.sin(t / 600) * 0.15;
    renderer.render(scene, camera);
    // 標籤
    const W = innerWidth, H = innerHeight;
    for (const L of labels) {
      v.copy(L.pos).project(camera);
      const off = v.z > 1 || v.x < -1.1 || v.x > 1.1 || v.y < -1.1 || v.y > 1.1;
      if (off) { L.el.style.display = 'none'; continue; }
      L.el.style.display = '';
      L.el.style.left = ((v.x + 1) / 2 * W) + 'px';
      L.el.style.top = ((1 - v.y) / 2 * H) + 'px';
      const dist = camera.position.distanceTo(L.pos);
      L.el.style.opacity = L.kind === 'place' ? (dist > 120 ? 0 : 1) : 1;
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // 深連結：#b1、#四3
  const h = decodeURIComponent(location.hash.slice(1));
  if (h) setTimeout(() => { if (B[h]) selectBuilding(h); else if (classSpots[h]) selectSpot(h); }, 600);
})();
