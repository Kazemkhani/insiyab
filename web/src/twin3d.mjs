// web/src/twin3d.mjs
// 3D animated twin for the four Insiyab personas.
// Three.js 0.187.0 · toon-flat (MeshBasicMaterial) · no lights · ink outlines.
//
// Interface:
//   const twin = mountTwin(container, {person, step, bundle, reducedMotion});
//   // → {setStep(newStep), dispose()}
//
// Rules §2 (honesty), §3 (people), §5 (design), §10 (tokens) all apply.
// No face, no real uniform, no real person likeness.
// Measured/simulated distinction is explicit in the overlay.

import * as THREE from 'three';

// ── Design tokens (docs/RULES.md §10) ─────────────────────────────────────
const C = {
  paper: 0xF6F5F1,
  ink:   0x12263A,
  flow:  0x0E5A5A,
  over:  0xB23A2E,
  spare: 0x2F6690,
  simul: 0x8A5A00,
  g1:    0xE6E8EA,
  g2:    0xC3C9CF,
  g3:    0x8C96A0,
  g4:    0x5A6672,
  g5:    0x33404D,
};
const CSS = {
  ink:   '#12263A',
  paper: '#F6F5F1',
  g3:    '#8C96A0',
  simul: '#8A5A00',
  over:  '#B23A2E',
  flow:  '#0E5A5A',
};

// ── Material / geometry helpers ────────────────────────────────────────────
function bmat(color) {
  return new THREE.MeshBasicMaterial({ color });
}
function dmat(color) {
  return new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
}
function lmat(color, linewidth = 1) {
  return new THREE.LineBasicMaterial({ color, linewidth });
}

function outlineGeo(parent, geo, color = C.ink) {
  const e = new THREE.EdgesGeometry(geo, 20);
  parent.add(new THREE.LineSegments(e, lmat(color)));
}

function disposeObj(obj) {
  obj.traverse(n => {
    if (n.geometry) n.geometry.dispose();
    if (n.material) {
      if (Array.isArray(n.material)) n.material.forEach(m => m.dispose());
      else n.material.dispose();
    }
  });
}

// ── Character: capsule body + sphere head, NO face (rule §3.2) ────────────
// item: null | 'hardhat' | 'bag' | (driver/planner use scene context)
function makeChar(color, scale = 1, item = null) {
  const g = new THREE.Group();
  const r = 0.22 * scale;
  const len = 0.6 * scale;
  const halfBody = len / 2 + r;

  // Body (capsule)
  const bodyGeo = new THREE.CapsuleGeometry(r, len, 4, 7);
  g.add(new THREE.Mesh(bodyGeo, bmat(color)));

  // Head (sphere, no features)
  const hr = 0.21 * scale;
  const headGeo = new THREE.SphereGeometry(hr, 8, 6);
  const head = new THREE.Mesh(headGeo, bmat(color));
  head.position.y = halfBody + hr + 0.02 * scale;
  g.add(head);

  // Lift so feet are at y = 0
  g.position.y = halfBody;

  if (item === 'hardhat') {
    // Hard hat: brim + dome
    const brimGeo = new THREE.CylinderGeometry(0.30 * scale, 0.26 * scale, 0.09 * scale, 10);
    const brim = new THREE.Mesh(brimGeo, bmat(C.flow));
    brim.position.y = halfBody + hr * 2.1;
    g.add(brim);
    // Hi-vis vest panel
    const vestGeo = new THREE.BoxGeometry(0.5 * scale, 0.44 * scale, 0.08 * scale);
    const vest = new THREE.Mesh(vestGeo, bmat(C.spare));
    vest.position.set(0.28 * scale, 0.0, 0);
    g.add(vest);
  } else if (item === 'bag') {
    // Shoulder bag
    const bagGeo = new THREE.BoxGeometry(0.28 * scale, 0.33 * scale, 0.14 * scale);
    const bag = new THREE.Mesh(bagGeo, bmat(C.g4));
    bag.position.set(0.38 * scale, -0.08 * scale, 0);
    g.add(bag);
  }

  g.userData.isCharacter = true;
  return g;
}

// ── Ground plane ───────────────────────────────────────────────────────────
function makeGround(w = 22, d = 22, color = C.g1) {
  const geo = new THREE.PlaneGeometry(w, d);
  const mesh = new THREE.Mesh(geo, bmat(color));
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

// ── Bus stop (pole + shelter) ──────────────────────────────────────────────
function makeBusStop() {
  const g = new THREE.Group();
  // Pole
  const pGeo = new THREE.CylinderGeometry(0.055, 0.055, 2.9, 7);
  g.add(new THREE.Mesh(pGeo, bmat(C.ink)));
  const pMesh = g.children[g.children.length - 1];
  pMesh.position.y = 1.45;
  // Sign
  const signGeo = new THREE.BoxGeometry(0.52, 0.36, 0.06);
  const sign = new THREE.Mesh(signGeo, bmat(C.flow));
  sign.position.y = 2.72;
  g.add(sign);
  // Shelter panels
  const SW = 2.4, SH = 2.1, SD = 1.3;
  const sm = dmat(C.g2);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), sm);
  back.position.set(0, SH / 2, 0);
  g.add(back);
  const roof = new THREE.Mesh(new THREE.PlaneGeometry(SW, SD), dmat(C.g1));
  roof.rotation.x = -Math.PI / 2;
  roof.position.set(0, SH, SD / 2);
  g.add(roof);
  const leftP = new THREE.Mesh(new THREE.PlaneGeometry(SD, SH), sm);
  leftP.rotation.y = Math.PI / 2;
  leftP.position.set(-SW / 2, SH / 2, SD / 2);
  g.add(leftP);
  const rightP = new THREE.Mesh(new THREE.PlaneGeometry(SD, SH), sm);
  rightP.rotation.y = -Math.PI / 2;
  rightP.position.set(SW / 2, SH / 2, SD / 2);
  g.add(rightP);
  // Frame outline
  const frameGeo = new THREE.BoxGeometry(SW, SH, SD);
  outlineGeo(g, frameGeo, C.g4);
  frameGeo.dispose();
  return g;
}

// ── Bus: open on +X face (cutaway reveals seat grid) ─────────────────────
// cols: columns of seats (2 or 4); seats: total; load: passengers on board
function makeBus(seats, load, kind, cols = 4) {
  const g = new THREE.Group();

  const rows = Math.ceil(seats / cols);
  const BW = 2.8;
  const BH = 2.2;
  // Bus length scaled to seat count
  const BL = Math.max(6.0, Math.min(9.0, rows * 0.52 + 2.4));
  const hx = BW / 2, hy = BH / 2, hz = BL / 2;

  // 5 body faces — +X (cutaway) is OMITTED
  const bodyC = kind === 'simulated' ? C.g4 : C.g5;

  const topMesh = new THREE.Mesh(new THREE.PlaneGeometry(BW, BL), dmat(bodyC));
  topMesh.rotation.x = -Math.PI / 2;
  topMesh.position.y = hy;
  g.add(topMesh);

  const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(BW, BL), dmat(C.g4));
  floorMesh.rotation.x = Math.PI / 2;
  floorMesh.position.y = -hy;
  g.add(floorMesh);

  const backMesh = new THREE.Mesh(new THREE.PlaneGeometry(BW, BH), dmat(bodyC));
  backMesh.position.z = -hz;
  g.add(backMesh);

  const frontMesh = new THREE.Mesh(new THREE.PlaneGeometry(BW, BH), dmat(bodyC));
  frontMesh.rotation.y = Math.PI;
  frontMesh.position.z = hz;
  g.add(frontMesh);

  const leftMesh = new THREE.Mesh(new THREE.PlaneGeometry(BL, BH), dmat(bodyC));
  leftMesh.rotation.y = -Math.PI / 2;
  leftMesh.position.x = -hx;
  g.add(leftMesh);

  // +X face: OMITTED (the cutaway, open toward the camera)

  // Outline — full box so the shape reads as a bus
  const boxG = new THREE.BoxGeometry(BW, BH, BL);
  outlineGeo(g, boxG, kind === 'simulated' ? C.simul : C.ink);
  boxG.dispose();

  // Windows on left side
  const nW = Math.min(5, Math.floor(BL / 1.4));
  for (let i = 0; i < nW; i++) {
    const wz = -hz + 0.7 + i * (BL - 1.4) / Math.max(nW - 1, 1);
    const win = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.72), dmat(C.g2));
    win.rotation.y = -Math.PI / 2;
    win.position.set(-hx - 0.01, 0.38, wz);
    g.add(win);
  }

  // Wheels (4 visible from front/right)
  for (const side of [-1, 1]) {
    for (const end of [-hz + 0.85, hz - 0.85]) {
      const wG = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 8);
      const wheel = new THREE.Mesh(wG, bmat(C.g5));
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(side * (hx + 0.08), -hy + 0.08, end);
      g.add(wheel);
    }
  }

  // ── Seat grid ────────────────────────────────────────────────────────────
  const colXs = [];
  for (let c = 0; c < cols; c++) {
    colXs.push(-(hx - 0.42) + c * (BW - 0.84) / Math.max(cols - 1, 1));
  }

  const usableLen = BL - 1.6;
  const rowSpacing = usableLen / Math.max(rows, 1);
  const seatD = Math.min(rowSpacing * 0.72, 0.48);
  const seatW = (BW - 0.9) / (cols * 1.5);
  const seatH = 0.08;
  const seatY = -hy + seatH / 2 + 0.04;
  const startZ = -hz + 0.8;

  let seatIdx = 0;
  let seatedCount = 0;
  const standingCount = Math.max(0, load - seats);

  for (let row = 0; row < rows; row++) {
    const sz = startZ + row * rowSpacing;
    if (sz > hz - 0.5) break;
    for (let col = 0; col < cols; col++) {
      if (seatIdx >= seats) break;
      const sx = colXs[col];
      const occupied = seatIdx < load;
      const sG = new THREE.BoxGeometry(seatW, seatH, seatD);
      const sm = new THREE.Mesh(sG, bmat(occupied ? C.ink : C.spare));
      sm.position.set(sx, seatY, sz);
      sm.userData.isSeat = true;
      sm.userData.isOccupied = occupied;
      g.add(sm);
      if (occupied) seatedCount++;
      seatIdx++;
    }
  }

  // Standing passengers (load > seats) — shown as small over-coloured figures
  const lastSeatZ = startZ + (rows - 1) * rowSpacing;
  const maxFigs = Math.min(standingCount, 24);
  const aisleXs = [-0.35, 0.35, -0.7, 0.7, 0, -1.0, 1.0];
  for (let i = 0; i < maxFigs; i++) {
    const ax = aisleXs[i % aisleXs.length];
    const az = lastSeatZ + 0.4 + Math.floor(i / aisleXs.length) * 0.38;
    const sg = new THREE.CapsuleGeometry(0.11, 0.26, 3, 5);
    const sm = new THREE.Mesh(sg, bmat(C.over));
    sm.position.set(ax, seatY + 0.28, Math.min(az, hz - 0.35));
    sm.userData.isStanding = true;
    g.add(sm);
  }

  g.userData.busMetrics = { seats, seated: seatedCount, standing: standingCount, BL, BW, BH };
  return g;
}

// ── Steering wheel (torus) ─────────────────────────────────────────────────
function makeWheel() {
  const g = new THREE.Group();
  const tGeo = new THREE.TorusGeometry(0.38, 0.045, 8, 20);
  g.add(new THREE.Mesh(tGeo, bmat(C.ink)));
  // Spokes
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2;
    const spokeGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.72, 5);
    const spoke = new THREE.Mesh(spokeGeo, bmat(C.g4));
    spoke.rotation.z = angle;
    spoke.position.set(Math.cos(angle) * 0.18, Math.sin(angle) * 0.18, 0);
    g.add(spoke);
  }
  // Hub
  const hubGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.07, 7);
  g.add(new THREE.Mesh(hubGeo, bmat(C.g4)));
  return g;
}

// ── Road strip ────────────────────────────────────────────────────────────
function makeRoad(length = 40) {
  const g = new THREE.Group();
  const roadGeo = new THREE.PlaneGeometry(5.5, length);
  const road = new THREE.Mesh(roadGeo, bmat(C.g3));
  road.rotation.x = -Math.PI / 2;
  g.add(road);
  // Centre dashes
  const dashCount = Math.floor(length / 2.5);
  for (let i = 0; i < dashCount; i++) {
    const dGeo = new THREE.PlaneGeometry(0.12, 1.1);
    const dash = new THREE.Mesh(dGeo, bmat(C.g2));
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(0, 0.01, -length / 2 + 1 + i * 2.5);
    g.add(dash);
  }
  return g;
}

// ── Stop pole (for road-side) ─────────────────────────────────────────────
function makeStopPole(poleColor = C.ink) {
  const g = new THREE.Group();
  const pGeo = new THREE.CylinderGeometry(0.07, 0.07, 2.4, 6);
  g.add(new THREE.Mesh(pGeo, bmat(poleColor)));
  g.children[0].position.y = 1.2;
  const tGeo = new THREE.BoxGeometry(0.42, 0.28, 0.06);
  const tabColor = poleColor === C.flow ? C.simul : C.flow;
  const tab = new THREE.Mesh(tGeo, bmat(tabColor));
  tab.position.y = 2.52;
  g.add(tab);
  return g;
}

// ── Monitor (for planner's desk) ─────────────────────────────────────────
function makeMonitor(routes, stepBefore, stepAfter, stepKind) {
  const g = new THREE.Group();
  // Screen body
  const scrGeo = new THREE.BoxGeometry(3.0, 2.0, 0.08);
  g.add(new THREE.Mesh(scrGeo, bmat(C.g5)));
  outlineGeo(g, scrGeo, C.ink);

  // Screen face (draw route lines on a canvas texture)
  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = 341;
  const ctx = cv.getContext('2d');

  // Background — teal-tinted for simulated step so scene differs visually at any scale
  const bgColor = stepKind === 'simulated' ? '#0a2222' : CSS.ink;
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, 512, 341);

  // Project routes if available
  if (routes && routes.length > 0) {
    let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
    for (const r of routes) {
      for (const dir of r.directions) {
        for (const [lon, lat] of dir.shape) {
          if (lon < minLon) minLon = lon;
          if (lon > maxLon) maxLon = lon;
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
        }
      }
    }
    const mx = maxLon - minLon || 1;
    const my = maxLat - minLat || 1;
    const pad = 30;
    function proj(lon, lat) {
      return [
        pad + ((lon - minLon) / mx) * (512 - pad * 2),
        341 - pad - ((lat - minLat) / my) * (341 - pad * 2),
      ];
    }

    // Draw route lines
    ctx.lineWidth = 1.5;
    for (const r of routes) {
      for (const dir of r.directions) {
        ctx.strokeStyle = '#3a5a6a'; // muted flow
        ctx.beginPath();
        const pts = dir.shape;
        if (pts.length > 0) {
          const [x0, y0] = proj(pts[0][0], pts[0][1]);
          ctx.moveTo(x0, y0);
          for (let i = 1; i < pts.length; i++) {
            const [x, y] = proj(pts[i][0], pts[i][1]);
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }
    }

    // Trip markers (trips_over_seats for step 1, clearing for step 2)
    const beforeVal = stepBefore?.trips_over_seats ?? 0;
    const afterVal = stepAfter?.passenger_minutes_over_seats ?? null;
    const isSimul = stepKind === 'simulated';
    const markerColor = isSimul ? '#0E5A5A' : '#B23A2E';
    const nMarkers = isSimul ? 0 : Math.min(beforeVal, 20);

    if (nMarkers > 0) {
      ctx.fillStyle = markerColor;
      // Place markers along the first few routes
      let placed = 0;
      outer: for (const r of routes) {
        for (const dir of r.directions) {
          const pts = dir.shape;
          const step = Math.max(1, Math.floor(pts.length / 4));
          for (let i = step; i < pts.length && placed < nMarkers; i += step) {
            const [x, y] = proj(pts[i][0], pts[i][1]);
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fill();
            placed++;
          }
          if (placed >= nMarkers) break outer;
        }
      }
    }

    // Label
    ctx.fillStyle = isSimul ? '#8A5A00' : '#E6E8EA';
    ctx.font = '11px monospace';
    ctx.fillText(isSimul ? 'simulated' : 'measured', 10, 20);
  } else {
    // Fallback: simple grid pattern
    ctx.strokeStyle = '#1e3a4a';
    ctx.lineWidth = 1;
    for (let x = 40; x < 480; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 20);
      ctx.lineTo(x, 320);
      ctx.stroke();
    }
    for (let y = 40; y < 310; y += 50) {
      ctx.beginPath();
      ctx.moveTo(20, y);
      ctx.lineTo(490, y);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(cv);
  const scrFaceGeo = new THREE.PlaneGeometry(2.88, 1.88);
  const scrFace = new THREE.Mesh(scrFaceGeo, new THREE.MeshBasicMaterial({ map: tex }));
  scrFace.position.z = 0.051;
  g.add(scrFace);

  // Monitor stand
  const standGeo = new THREE.BoxGeometry(0.3, 0.35, 0.3);
  const stand = new THREE.Mesh(standGeo, bmat(C.g4));
  stand.position.y = -1.18;
  g.add(stand);

  g.userData.monitorTex = tex;
  return g;
}

// ── Desk (box) ────────────────────────────────────────────────────────────
function makeDesk() {
  const g = new THREE.Group();
  const topGeo = new THREE.BoxGeometry(3.5, 0.08, 1.6);
  const top = new THREE.Mesh(topGeo, bmat(C.g4));
  top.position.y = 0.78;
  g.add(top);
  outlineGeo(top, topGeo, C.ink);
  // Legs
  for (const [lx, lz] of [[-1.5, -0.65], [1.5, -0.65], [-1.5, 0.65], [1.5, 0.65]]) {
    const legGeo = new THREE.BoxGeometry(0.08, 0.76, 0.08);
    const leg = new THREE.Mesh(legGeo, bmat(C.ink));
    leg.position.set(lx, 0.38, lz);
    g.add(leg);
  }
  return g;
}

// ── Phone (for office_worker step 2) ─────────────────────────────────────
function makePhone(afterLoad, afterSeats, points) {
  const g = new THREE.Group();
  // Phone body
  const bodyGeo = new THREE.BoxGeometry(0.9, 1.65, 0.07);
  g.add(new THREE.Mesh(bodyGeo, bmat(C.g5)));
  outlineGeo(g, bodyGeo, C.ink);

  // Screen with content
  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = 468;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = CSS.ink;
  ctx.fillRect(0, 0, 256, 468);

  // Route bar
  ctx.strokeStyle = '#0E5A5A';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(30, 234);
  ctx.lineTo(226, 234);
  ctx.stroke();

  // Bus with room (spare coloured box)
  ctx.fillStyle = '#2F6690';
  ctx.fillRect(100, 210, 56, 48);
  ctx.strokeStyle = '#F6F5F1';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(100, 210, 56, 48);

  // Stop dots
  for (const sx of [50, 128, 206]) {
    ctx.beginPath();
    ctx.fillStyle = '#8C96A0';
    ctx.arc(sx, 234, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Count text
  ctx.fillStyle = '#F6F5F1';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${afterLoad} on board`, 128, 170);
  ctx.font = '14px sans-serif';
  ctx.fillText(`${afterSeats} seats`, 128, 192);

  // Points badge
  ctx.fillStyle = '#8A5A00';
  ctx.fillRect(78, 290, 100, 38);
  ctx.fillStyle = '#F6F5F1';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(`+${points} Khutwa`, 128, 315);
  ctx.font = '11px sans-serif';
  ctx.fillStyle = '#8A5A00';
  ctx.fillText('simulated', 128, 345);

  const tex = new THREE.CanvasTexture(cv);
  const scrGeo = new THREE.PlaneGeometry(0.84, 1.54);
  const scr = new THREE.Mesh(scrGeo, new THREE.MeshBasicMaterial({ map: tex }));
  scr.position.z = 0.038;
  g.add(scr);

  g.userData.phoneTex = tex;
  return g;
}

// ── Tween helper ──────────────────────────────────────────────────────────
class Tween {
  constructor(target, end, duration, onDone) {
    this.target = target;
    this.start = { ...target };
    this.end = end;
    this.duration = Math.max(duration, 0.001);
    this.elapsed = 0;
    this.done = false;
    this.onDone = onDone;
  }
  update(dt) {
    if (this.done) return true;
    this.elapsed += dt;
    const t = Math.min(this.elapsed / this.duration, 1);
    const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    for (const key of Object.keys(this.end)) {
      this.target[key] = this.start[key] + (this.end[key] - this.start[key]) * ease;
    }
    if (t >= 1) {
      this.done = true;
      this.onDone?.();
    }
    return this.done;
  }
}

// ── Build scene for a given person + step ─────────────────────────────────
function buildScene(person, step, bundle, reduced) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(C.paper);

  const tweens = [];
  let cameraPos = new THREE.Vector3(4, 3.5, 5);
  let cameraTarget = new THREE.Vector3(0.5, 1.2, -1.5);
  let counterTarget = null; // for driver animation
  let counterSpeed = 1;
  let overlayKind = step.kind;

  const pid = person.id;
  const sceneType = pid === 'planner'
    ? 'planner'
    : pid === 'driver'
      ? 'driver'
      : step.scene === 'phone'
        ? 'phone'
        : step.scene === 'bus'
          ? 'bus_passenger'
          : 'stop';

  // ── STOP scene (site_worker step1, office_worker step1) ───────────────
  if (sceneType === 'stop') {
    const load = step.before?.load ?? 0;
    const seats = step.before?.seats ?? 1;
    const kind = step.kind;

    cameraPos.set(4.2, 3.4, 5.2);
    cameraTarget.set(0.4, 1.1, -1.2);

    // Ground
    scene.add(makeGround(24, 24, C.g1));
    // Pavement strip
    const pavGeo = new THREE.PlaneGeometry(5, 24);
    const pav = new THREE.Mesh(pavGeo, bmat(C.g2));
    pav.rotation.x = -Math.PI / 2;
    pav.position.set(2.5, 0.01, 0);
    scene.add(pav);

    // Bus stop shelter at right
    const shelter = makeBusStop();
    shelter.position.set(2.8, 0, -2.4);
    scene.add(shelter);

    // Bus at stop
    const busGroup = makeBus(seats, load, kind);
    const BL = busGroup.userData.busMetrics.BL;
    // Bus door near end is at z = busCenter_z + BL/2
    // We want bus door at z~0 so character waits at door
    busGroup.position.set(-0.2, 1.1, -(BL / 2));
    scene.add(busGroup);

    // Named person (at stop, with identifying item)
    const namedItem = pid === 'site_worker' ? 'hardhat' : 'bag';
    const named = makeChar(C.ink, 1.15, namedItem);
    named.position.set(2.5, 0, -1.0);
    named.rotation.y = -Math.PI / 2 - 0.3; // facing toward bus
    scene.add(named);

    // 2 background people (smaller, grey)
    const bg1 = makeChar(C.g3, 0.9, null);
    bg1.position.set(2.2, 0, -2.8);
    bg1.rotation.y = -Math.PI / 2;
    scene.add(bg1);

    const bg2 = makeChar(C.g3, 0.88, null);
    bg2.position.set(3.0, 0, -4.0);
    bg2.rotation.y = -Math.PI / 2;
    scene.add(bg2);

    // Animate bus arriving (unless reduced motion)
    if (!reduced) {
      const startZ = busGroup.position.z - 12;
      busGroup.position.z = startZ;
      tweens.push(new Tween(busGroup.position, { z: -(BL / 2) }, 2.0));
    }

  // ── BUS PASSENGER scene (site_worker step2 — interior of large bus) ────
  } else if (sceneType === 'bus_passenger') {
    const load = step.after?.load ?? step.before?.load ?? 0;
    const seats = step.after?.seats ?? step.before?.seats ?? 1;
    const kind = step.kind;

    // Camera inside bus, behind seated character, looking forward
    cameraPos.set(1.5, 2.3, 3.5);
    cameraTarget.set(0.0, 1.0, -5.0);

    // Bus INTERIOR: floor, ceiling, side strips (no exterior walls needed)
    const iFloorGeo = new THREE.PlaneGeometry(5.5, 24);
    const iFloor = new THREE.Mesh(iFloorGeo, bmat(C.g4));
    iFloor.rotation.x = -Math.PI / 2;
    iFloor.position.set(0, 0, -8);
    scene.add(iFloor);

    const iCeilGeo = new THREE.PlaneGeometry(5.5, 24);
    const iCeil = new THREE.Mesh(iCeilGeo, bmat(C.g5));
    iCeil.rotation.x = Math.PI / 2;
    iCeil.position.set(0, 2.5, -8);
    scene.add(iCeil);

    // Side-wall strips for context
    for (const sx of [-2.6, 2.6]) {
      const wallGeo = new THREE.PlaneGeometry(24, 2.5);
      const wall = new THREE.Mesh(wallGeo, bmat(C.g5));
      wall.rotation.y = sx < 0 ? Math.PI / 2 : -Math.PI / 2;
      wall.position.set(sx, 1.25, -8);
      scene.add(wall);
    }

    // Seat rows — 4 columns visible from camera's angle
    const cols = 4;
    const rows = Math.ceil(seats / cols);
    const seatSpacing = 0.65;
    const seatD = 0.46;
    const seatW = 0.44;
    const seatH = 0.08;
    const seatY = seatH / 2 + 0.04;
    const colXs = [-1.5, -0.5, 0.5, 1.5];
    const startZ = -0.4;

    let seatIdx = 0;
    for (let row = 0; row < rows; row++) {
      const sz = startZ - row * seatSpacing;
      for (let col = 0; col < cols; col++) {
        if (seatIdx >= seats) break;
        const sx = colXs[col];
        const occupied = seatIdx < load;
        const sG = new THREE.BoxGeometry(seatW, seatH, seatD);
        const sm = new THREE.Mesh(sG, bmat(occupied ? C.ink : C.spare));
        sm.position.set(sx, seatY, sz);
        sm.userData.isSeat = true;
        sm.userData.isOccupied = occupied;
        scene.add(sm);
        seatIdx++;
      }
    }

    // Named person — seated at window seat, foreground
    const named = makeChar(C.ink, 1.1, 'hardhat');
    named.position.set(1.5, 0.0, 1.0);
    named.rotation.y = Math.PI; // facing forward
    scene.add(named);

    // Their seat
    const mySeatGeo = new THREE.BoxGeometry(0.5, 0.1, 0.46);
    const mySeat = new THREE.Mesh(mySeatGeo, bmat(C.ink));
    mySeat.position.set(1.5, 0.08, 1.0);
    scene.add(mySeat);

    if (!reduced) {
      named.scale.set(0.5, 0.5, 0.5);
      tweens.push(new Tween(named.scale, { x: 1, y: 1, z: 1 }, 1.0));
    }

  // ── DRIVER scene ─────────────────────────────────────────────────────────
  } else if (sceneType === 'driver') {
    // Declare before any use (TDZ guard)
    const isStep2 = step.kind === 'simulated';

    cameraPos.set(0.6, 2.4, 4.0);
    cameraTarget.set(0, 0.9, -8.0);

    // Driver bus cab: a simple open interior
    const cabW = 3.0, cabH = 2.4, cabL = 5.0;
    // Floor
    const floorGeo = new THREE.PlaneGeometry(cabW + 4, 30);
    const floorMesh = new THREE.Mesh(floorGeo, bmat(C.g3));
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.set(0, 0, -10);
    scene.add(floorMesh);

    // Road markings (dashes)
    const road = makeRoad(30);
    road.position.set(0, 0.01, -8);
    scene.add(road);

    // Dashboard
    const dashGeo = new THREE.BoxGeometry(cabW, 0.6, 0.5);
    const dash = new THREE.Mesh(dashGeo, bmat(C.g4));
    dash.position.set(0, 0.9, 1.0);
    scene.add(dash);
    outlineGeo(dash, dashGeo, C.ink);

    // Steering wheel
    const wheel = makeWheel();
    wheel.position.set(-0.5, 1.2, 0.5);
    wheel.rotation.x = Math.PI / 5;
    scene.add(wheel);

    // Driver character (behind wheel, with seat)
    const driverSeatGeo = new THREE.BoxGeometry(0.6, 0.15, 0.55);
    const driverSeat = new THREE.Mesh(driverSeatGeo, bmat(C.g4));
    driverSeat.position.set(-0.5, 0.75, 1.5);
    scene.add(driverSeat);

    const driver = makeChar(C.ink, 1.0, null);
    driver.position.set(-0.5, 0.75, 1.5);
    driver.rotation.y = Math.PI;
    scene.add(driver);

    // Windshield frame
    const wsGeo = new THREE.BoxGeometry(cabW, cabH, 0.07);
    const wsFrame = new THREE.Mesh(wsGeo, dmat(C.g5));
    wsFrame.position.set(0, cabH / 2, -1.4);
    scene.add(wsFrame);
    outlineGeo(wsFrame, wsGeo, C.ink);

    // Windshield (glass — slightly tinted)
    const glassGeo = new THREE.PlaneGeometry(cabW - 0.3, cabH - 0.4);
    const glass = new THREE.Mesh(glassGeo, new THREE.MeshBasicMaterial({
      color: C.g2, transparent: true, opacity: 0.18, side: THREE.DoubleSide
    }));
    glass.position.set(0, cabH / 2, -1.37);
    scene.add(glass);

    // Animated stop poles — teal for step 2 (request stops) vs ink for step 1
    const stopPoleColor = isStep2 ? C.flow : C.ink;
    const stopPoles = [];
    for (let i = 0; i < 4; i++) {
      const pole = makeStopPole(stopPoleColor);
      pole.position.set(3.2, 0, -15 + i * 7);
      scene.add(pole);
      stopPoles.push(pole);
    }
    scene.userData.stopPoles = stopPoles;
    scene.userData.isDriver = true;

    // Counter target from step data
    if (!isStep2) {
      counterTarget = step.before?.doors_not_opened
        ?? step.before?.calls_at_a_stop_with_nobody_there
        ?? 0;
      counterSpeed = counterTarget / 4.0;
    } else {
      counterTarget = step.after?.calls_at_a_stop_with_nobody_there ?? 0;
      counterSpeed = 0; // already at the value
    }

  // ── PHONE scene (office_worker step2) ─────────────────────────────────
  } else if (sceneType === 'phone') {
    const afterLoad = step.after?.load ?? 0;
    const afterSeats = step.after?.seats ?? 0;
    const pts = step.after?.points ?? 0;

    // Camera from behind-left shoulder, looking at person + phone at mid-chest
    cameraPos.set(1.0, 2.0, 3.2);
    cameraTarget.set(0, 1.05, -0.4);

    // Ground (bus stop platform)
    scene.add(makeGround(10, 10, C.g1));

    // Named person (office worker with bag) holding phone in front at chest height
    const named = makeChar(C.ink, 1.1, 'bag');
    named.position.set(0, 0, 0);
    scene.add(named);

    // Phone at arm/chest height (~y=1.05), slightly extended forward
    const phone = makePhone(afterLoad, afterSeats, pts);
    phone.position.set(0.15, 1.05, -0.6);
    phone.rotation.x = -Math.PI / 8; // tilted back toward viewer
    scene.add(phone);

    // Simulated label visible on phone
    if (!reduced) {
      phone.scale.set(0.1, 0.1, 0.1);
      tweens.push(new Tween(phone.scale, { x: 1, y: 1, z: 1 }, 1.2));
    }

  // ── PLANNER scene ────────────────────────────────────────────────────────
  } else if (sceneType === 'planner') {
    cameraPos.set(-1.8, 3.6, 4.5);
    cameraTarget.set(0.2, 1.2, -1.0);

    // Ground
    scene.add(makeGround(14, 14, C.g2));

    // Desk
    const desk = makeDesk();
    desk.position.set(0, 0, -1.5);
    scene.add(desk);

    // Monitor on desk
    const routes = bundle?.['network.json']?.routes ?? null;
    const monitor = makeMonitor(
      routes,
      step.before,
      step.after,
      step.kind
    );
    monitor.position.set(0, 1.72, -2.0);
    monitor.rotation.x = -Math.PI / 14;
    scene.add(monitor);

    // Planner character (at desk)
    const planner = makeChar(C.ink, 1.05, null);
    planner.position.set(-0.5, 0, -0.5);
    planner.rotation.y = Math.PI / 8;
    scene.add(planner);

    if (!reduced) {
      monitor.scale.set(0.3, 0.3, 0.3);
      tweens.push(new Tween(monitor.scale, { x: 1, y: 1, z: 1 }, 1.5));
    }
  }

  return { scene, cameraPos, cameraTarget, tweens, counterTarget, counterSpeed, sceneType, overlayKind };
}

// ── Overlay HTML builder ──────────────────────────────────────────────────
function buildOverlay(person, step) {
  const load = step.before?.load ?? null;
  const seats = step.before?.seats ?? null;
  const afterLoad = step.after?.load ?? null;
  const afterSeats = step.after?.seats ?? null;
  const isSimul = step.kind === 'simulated';

  let countText = '';
  const pid = person.id;

  if (pid === 'site_worker' || pid === 'office_worker') {
    const L = isSimul ? (afterLoad ?? load) : load;
    const S = isSimul ? (afterSeats ?? seats) : seats;
    if (L !== null && S !== null) {
      const standing = Math.max(0, L - S);
      const free = Math.max(0, S - L);
      if (standing > 0) {
        countText = `${L} on board, ${S} seats: ${standing} standing`;
      } else if (free > 0) {
        countText = `${L} on board, ${S} seats: ${free} free`;
      } else {
        countText = `${L} on board, ${S} seats: full`;
      }
    }
    if (pid === 'office_worker' && isSimul && step.after?.points) {
      countText += ` · +${step.after.points} Khutwa`;
    }
  } else if (pid === 'driver') {
    if (isSimul) {
      const val = step.after?.calls_at_a_stop_with_nobody_there ?? 0;
      countText = `${val} stops without opening the door`;
    } else {
      countText = '0'; // will be updated by animation
    }
  } else if (pid === 'planner') {
    if (isSimul) {
      const before = step.before?.passenger_minutes_over_seats ?? 0;
      const after = step.after?.passenger_minutes_over_seats ?? 0;
      countText = `${before} → ${after} passenger-minutes without a seat`;
    } else {
      const tos = step.before?.trips_over_seats ?? 0;
      const tuf = step.before?.trips_under_a_third_full ?? 0;
      countText = `${tos} trips over seats · ${tuf} less than ⅓ full`;
    }
  }

  const kindStyle = isSimul
    ? `color:${CSS.simul};font-style:italic;`
    : `color:${CSS.g3};`;

  return {
    roleText: person.title.toUpperCase(),
    countText,
    kindLabel: isSimul ? 'simulated' : 'measured',
    kindStyle,
    isSimul,
    isDriver: pid === 'driver' && !isSimul,
  };
}

// ── Main export ───────────────────────────────────────────────────────────
export function mountTwin(container, { person, step, bundle, reducedMotion }) {
  // ── Container setup ───────────────────────────────────────────────────
  container.style.position = 'relative';
  container.style.overflow = 'hidden';
  container.style.minHeight = '200px';

  // ── Renderer ──────────────────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true, // allows readPixels outside the render callback
  });
  renderer.setPixelRatio(Math.min(typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1, 2));
  const canvas = renderer.domElement;
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  container.appendChild(canvas);

  // ── Camera ────────────────────────────────────────────────────────────
  const w = container.clientWidth || 736;
  const h = container.clientHeight || 445;
  const camera = new THREE.PerspectiveCamera(52, w / h, 0.1, 100);
  renderer.setSize(w, h, false);

  // ── Overlay ───────────────────────────────────────────────────────────
  const overlay = document.createElement('div');
  overlay.style.cssText = [
    'position:absolute',
    'bottom:0',
    'left:0',
    'right:0',
    'pointer-events:none',
    'padding:10px 12px 12px',
    'background:linear-gradient(transparent,rgba(246,245,241,0.90) 40%)',
  ].join(';');
  container.appendChild(overlay);

  const roleEl = document.createElement('p');
  roleEl.style.cssText = `margin:0 0 3px;font:600 10px/1.2 'IBM Plex Sans',system-ui,sans-serif;letter-spacing:0.08em;color:${CSS.g3};`;
  overlay.appendChild(roleEl);

  const countEl = document.createElement('p');
  countEl.style.cssText = `margin:0 0 2px;font:400 13px/1.4 'IBM Plex Sans',system-ui,sans-serif;color:${CSS.ink};`;
  overlay.appendChild(countEl);

  const kindEl = document.createElement('p');
  kindEl.style.cssText = `margin:0;font:400 11px/1.3 'IBM Plex Sans',system-ui,sans-serif;`;
  overlay.appendChild(kindEl);

  // Replay tap
  const replayEl = document.createElement('button');
  replayEl.textContent = 'Replay';
  replayEl.style.cssText = [
    'position:absolute',
    'top:8px',
    'right:8px',
    'pointer-events:all',
    'border:1px solid #C3C9CF',
    'background:#F6F5F1',
    `color:${CSS.ink}`,
    'font:400 11px/1 "IBM Plex Sans",sans-serif',
    'padding:4px 8px',
    'cursor:pointer',
    'border-radius:0',
  ].join(';');
  container.appendChild(replayEl);

  // ── State ─────────────────────────────────────────────────────────────
  let currentScene = null;
  let currentTweens = [];
  let currentCounterValue = 0;
  let currentCounterTarget = 0;
  let currentCounterSpeed = 0;
  let animId = null;
  let lastTime = null;
  let disposed = false;

  // ── Resize observer ───────────────────────────────────────────────────
  const ro = new ResizeObserver(() => {
    const nw = container.clientWidth;
    const nh = container.clientHeight;
    if (!nw || !nh) return;
    renderer.setSize(nw, nh, false);
    camera.aspect = nw / nh;
    camera.fov = nw < 400 ? 60 : 52;
    camera.updateProjectionMatrix();
  });
  ro.observe(container);

  // ── Set data attributes on container ─────────────────────────────────
  function setDataAttrs(s) {
    const isSimul = s.kind === 'simulated';
    const L = isSimul ? (s.after?.load ?? s.before?.load ?? 0) : (s.before?.load ?? 0);
    const S = isSimul ? (s.after?.seats ?? s.before?.seats ?? 0) : (s.before?.seats ?? 0);
    container.dataset.load = L;
    container.dataset.seats = S;
    container.dataset.standing = Math.max(0, L - S);
    container.dataset.kind = s.kind;
    container.dataset.rendered = 'false';
  }

  // ── Render loop ───────────────────────────────────────────────────────
  function loop(ts) {
    if (disposed) return;
    animId = requestAnimationFrame(loop);
    if (!lastTime) lastTime = ts;
    const dt = Math.min((ts - lastTime) / 1000, 0.1);
    lastTime = ts;

    // Update tweens
    currentTweens = currentTweens.filter(t => !t.update(dt));

    // Driver counter animation
    if (currentCounterSpeed > 0 && currentCounterValue < currentCounterTarget) {
      currentCounterValue = Math.min(
        currentCounterValue + currentCounterSpeed * dt,
        currentCounterTarget
      );
      countEl.textContent = `${Math.floor(currentCounterValue).toLocaleString()} stops without opening the door`;
    }

    // Animate stop poles for driver
    if (currentScene?.userData?.isDriver) {
      const poles = currentScene.userData.stopPoles;
      if (poles) {
        for (const pole of poles) {
          pole.position.z += dt * 6.5; // move toward camera
          if (pole.position.z > 5.5) {
            pole.position.z -= 28; // cycle back to distant
          }
        }
      }
    }

    if (currentScene) {
      renderer.render(currentScene, camera);
    }
    container.dataset.rendered = 'true';
  }

  // ── Mount a step ──────────────────────────────────────────────────────
  function mountStep(s, isFirst) {
    // Dispose old scene
    if (currentScene) {
      disposeObj(currentScene);
      currentScene = null;
    }
    currentTweens = [];

    setDataAttrs(s);

    const { scene, cameraPos, cameraTarget, tweens, counterTarget,
            counterSpeed, sceneType, overlayKind } = buildScene(person, s, bundle, reducedMotion);

    camera.position.copy(cameraPos);
    camera.lookAt(cameraTarget);

    if (reducedMotion) {
      // No tweens — already at end state
    } else {
      currentTweens = tweens;
    }

    currentCounterValue = 0;
    currentCounterTarget = counterTarget ?? 0;
    currentCounterSpeed = counterSpeed ?? 0;

    // If driver step 2: set counter immediately to after value
    if (person.id === 'driver' && s.kind === 'simulated') {
      currentCounterValue = currentCounterTarget;
      currentCounterSpeed = 0;
    }

    currentScene = scene;

    // Update overlay
    const ov = buildOverlay(person, s);
    roleEl.textContent = ov.roleText;
    if (!(person.id === 'driver' && s.kind !== 'simulated')) {
      countEl.textContent = ov.countText;
    } else {
      countEl.textContent = '0';
    }
    kindEl.style.cssText = `margin:0;font:400 11px/1.3 'IBM Plex Sans',system-ui,sans-serif;${ov.kindStyle}`;
    kindEl.textContent = ov.kindLabel;

    // Expose internal info for testing
    const L = ov.isSimul
      ? (s.after?.load ?? s.before?.load ?? 0)
      : (s.before?.load ?? 0);
    const S = ov.isSimul
      ? (s.after?.seats ?? s.before?.seats ?? 0)
      : (s.before?.seats ?? 0);
    container._twin3dInfo = {
      load: L,
      seats: S,
      standing: Math.max(0, L - S),
      kind: s.kind,
      sceneType,
    };
  }

  // Initial mount
  mountStep(step, true);
  lastTime = null;
  animId = requestAnimationFrame(loop);

  // Replay button
  replayEl.addEventListener('click', () => {
    mountStep(step, true);
    lastTime = null;
  });

  // ── API ───────────────────────────────────────────────────────────────
  return {
    setStep(newStep) {
      mountStep(newStep, false);
      lastTime = null;
    },
    dispose() {
      disposed = true;
      if (animId !== null) cancelAnimationFrame(animId);
      ro.disconnect();
      if (currentScene) { disposeObj(currentScene); currentScene = null; }
      renderer.dispose();
      canvas.remove();
      overlay.remove();
      replayEl.remove();
    },
  };
}
