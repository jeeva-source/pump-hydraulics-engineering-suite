import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/**
 * Interactive 3D Multi-Segment Pump & Pipe System Visualizer
 * Studio PBR rendering with RoomEnvironment, procedural CanvasTextures,
 * composite 3-12 part industrial models, instanced bolts/flow tracers,
 * software-WebGL pacing (afterDraw / requestRender), and damped camera presets.
 */

// Pre-allocated scratch objects (zero per-frame GC allocations)
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _quat = new THREE.Quaternion();
const _mat4 = new THREE.Matrix4();
const _scale = new THREE.Vector3(1, 1, 1);
const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

function detectSoftwareGl() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function createFloorTextures(maxAnisotropy) {
  // Albedo: dark industrial concrete deck with subtle expansion joints
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = 512;
  colorCanvas.height = 512;
  const ctx = colorCanvas.getContext('2d');
  ctx.fillStyle = '#142031';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle concrete aggregate grain
  for (let i = 0; i < 4200; i++) {
    const x = (i * 73) % 512;
    const y = ((i * 199) + Math.floor(i / 7) * 13) % 512;
    const shade = 18 + (i % 19);
    ctx.fillStyle = `rgb(${shade}, ${shade + 11}, ${shade + 25})`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Expansion joint grid
  ctx.strokeStyle = 'rgba(77, 163, 255, 0.14)';
  ctx.lineWidth = 2;
  for (let p = 0; p <= 512; p += 128) {
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(512, p);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(8, 14, 24, 0.45)';
  ctx.lineWidth = 1;
  for (let p = 64; p < 512; p += 128) {
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(512, p);
    ctx.stroke();
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(16, 16);
  map.anisotropy = maxAnisotropy;

  // Grayscale bump/roughness map (linear color space)
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = 256;
  bumpCanvas.height = 256;
  const bctx = bumpCanvas.getContext('2d');
  bctx.fillStyle = '#888888';
  bctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 3000; i++) {
    const x = (i * 53) % 256;
    const y = (i * 131) % 256;
    const v = 110 + (i % 45);
    bctx.fillStyle = `rgb(${v},${v},${v})`;
    bctx.fillRect(x, y, 2, 2);
  }
  bctx.strokeStyle = '#303030';
  bctx.lineWidth = 2;
  bctx.strokeRect(1, 1, 254, 254);

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(16, 16);
  bumpMap.anisotropy = maxAnisotropy;

  return { map, bumpMap };
}

function createBrushedMetalMap(maxAnisotropy) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y++) {
    const v = 112 + ((y * 37) % 32);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(0, y, 256, 1);
  }
  for (let i = 0; i < 180; i++) {
    const y = (i * 29) % 256;
    const v = 90 + (i % 65);
    ctx.fillStyle = `rgba(${v},${v},${v},0.45)`;
    ctx.fillRect((i * 41) % 256, y, 64, 1);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 2);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createGaugeDialTexture(maxAnisotropy) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f2f5f8';
  ctx.beginPath();
  ctx.arc(128, 128, 124, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#1f2e40';
  ctx.lineWidth = 8;
  ctx.stroke();

  // Red warning arc
  ctx.strokeStyle = '#d94b4b';
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.arc(128, 128, 96, -0.35, 0.65);
  ctx.stroke();

  // Graduations
  for (let i = 0; i <= 20; i++) {
    const a = (Math.PI * 0.75) + (i / 20) * (Math.PI * 1.5);
    const major = i % 5 === 0;
    const r0 = major ? 80 : 92;
    const r1 = 108;
    ctx.strokeStyle = '#142233';
    ctx.lineWidth = major ? 4 : 2;
    ctx.beginPath();
    ctx.moveTo(128 + Math.cos(a) * r0, 128 + Math.sin(a) * r0);
    ctx.lineTo(128 + Math.cos(a) * r1, 128 + Math.sin(a) * r1);
    ctx.stroke();
  }

  // Label
  ctx.fillStyle = '#1a2c40';
  ctx.font = 'bold 24px Inter, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('BAR', 128, 186);

  // Needle
  ctx.strokeStyle = '#c83434';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(128, 128);
  ctx.lineTo(128 + Math.cos(-0.6) * 86, 128 + Math.sin(-0.6) * 86);
  ctx.stroke();

  ctx.fillStyle = '#1c2b3c';
  ctx.beginPath();
  ctx.arc(128, 128, 12, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createContactShadowTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 62);
  grad.addColorStop(0, 'rgba(3, 8, 16, 0.85)');
  grad.addColorStop(0.55, 'rgba(3, 8, 16, 0.38)');
  grad.addColorStop(1, 'rgba(3, 8, 16, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  return tex;
}

function createBeveledBoxGeometry(width, height, depth, bevel = 0.03) {
  const shape = new THREE.Shape();
  const hw = width / 2 - bevel;
  const hd = depth / 2 - bevel;
  shape.moveTo(-hw, -hd);
  shape.lineTo(hw, -hd);
  shape.lineTo(hw, hd);
  shape.lineTo(-hw, hd);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.02, height - bevel * 2),
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, bevel, 0);
  return geo;
}

function createRaisedFaceFlangeGeometry(pipeRadius) {
  const outer = pipeRadius * 1.62;
  const hub = pipeRadius * 1.18;
  const pts = [
    new THREE.Vector2(pipeRadius * 0.96, -0.09),
    new THREE.Vector2(hub, -0.09),
    new THREE.Vector2(hub, -0.045),
    new THREE.Vector2(outer, -0.045),
    new THREE.Vector2(outer, 0.045),
    new THREE.Vector2(hub, 0.045),
    new THREE.Vector2(hub, 0.09),
    new THREE.Vector2(pipeRadius * 0.96, 0.09),
  ];
  return new THREE.LatheGeometry(pts, 24);
}

function createReducerGeometry(r1, r2, length) {
  const pts = [
    new THREE.Vector2(Math.max(0.05, r1), -length / 2),
    new THREE.Vector2(Math.max(0.05, r2), length / 2),
  ];
  return new THREE.LatheGeometry(pts, 24);
}

/**
 * Composite 11-part Centrifugal Pump & TEFC Electric Motor Skid (bottom-center pivot y = 0).
 */
function buildCentrifugalPumpSkid(pipeY, materials, shadowMat) {
  const group = new THREE.Group();
  group.name = 'CentrifugalPumpSkid';

  // 1. Soft radial contact shadow disc at y = 0.015
  const shadowPlane = new THREE.Mesh(new THREE.CircleGeometry(1.65, 32), shadowMat);
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.set(0, 0.015, 0.25);
  shadowPlane.scale.set(1.05, 1.35, 1);
  group.add(shadowPlane);

  // 2. Rubber vibration-isolation mounting feet (4x)
  const footGeo = new THREE.CylinderGeometry(0.11, 0.13, 0.09, 16);
  const footOffsets = [
    [-0.95, 0.045, -0.45],
    [0.95, 0.045, -0.45],
    [-0.95, 0.045, 0.95],
    [0.95, 0.045, 0.95],
  ];
  for (const [fx, fy, fz] of footOffsets) {
    const foot = new THREE.Mesh(footGeo, materials.rubber);
    foot.position.set(fx, fy, fz);
    foot.castShadow = true;
    foot.receiveShadow = true;
    group.add(foot);
  }

  // 3. Beveled cast-iron structural skid baseplate
  const skidGeo = createBeveledBoxGeometry(2.25, 0.16, 1.75, 0.03);
  const skid = new THREE.Mesh(skidGeo, materials.skidIron);
  skid.position.set(0, 0.09, 0.25);
  skid.castShadow = true;
  skid.receiveShadow = true;
  group.add(skid);

  // Compute volute height anchored to pipe centerline (with vertical pedestal if elevated)
  const voluteY = Math.max(0.72, pipeY);

  // 4. Sculpted dual cast-iron pedestals (volute cradle + motor frame support)
  const volutePedH = Math.max(0.24, voluteY - 0.56);
  const volutePed = new THREE.Mesh(
    createBeveledBoxGeometry(0.68, volutePedH, 0.52, 0.025),
    materials.steelDark,
  );
  volutePed.position.set(0, 0.25, -0.02);
  volutePed.castShadow = true;
  volutePed.receiveShadow = true;
  group.add(volutePed);

  const motorPedH = Math.max(0.2, voluteY - 0.52);
  const motorPed = new THREE.Mesh(
    createBeveledBoxGeometry(0.76, motorPedH, 0.78, 0.025),
    materials.steelDark,
  );
  motorPed.position.set(0, 0.25, 1.22);
  motorPed.castShadow = true;
  motorPed.receiveShadow = true;
  group.add(motorPed);

  // 5. Centrifugal pump volute spiral casing (LatheGeometry profile)
  const volutePts = [
    new THREE.Vector2(0.08, -0.26),
    new THREE.Vector2(0.28, -0.26),
    new THREE.Vector2(0.46, -0.18),
    new THREE.Vector2(0.52, -0.05),
    new THREE.Vector2(0.52, 0.09),
    new THREE.Vector2(0.44, 0.22),
    new THREE.Vector2(0.24, 0.25),
    new THREE.Vector2(0.08, 0.25),
  ];
  const voluteGeo = new THREE.LatheGeometry(volutePts, 28);
  voluteGeo.rotateX(Math.PI / 2);
  const volute = new THREE.Mesh(voluteGeo, materials.pumpBlue);
  volute.position.set(0, voluteY, -0.02);
  volute.castShadow = true;
  volute.receiveShadow = true;
  group.add(volute);

  // 6. Suction & Discharge inlet/outlet nozzle spools + ANSI flanges aligned along X
  const nozzleGeo = new THREE.CylinderGeometry(0.24, 0.24, 2.4, 24);
  nozzleGeo.rotateZ(Math.PI / 2);
  const nozzleSpool = new THREE.Mesh(nozzleGeo, materials.pumpBlue);
  nozzleSpool.position.set(0, voluteY, 0);
  nozzleSpool.castShadow = true;
  group.add(nozzleSpool);

  const flangeGeo = createRaisedFaceFlangeGeometry(0.24);
  flangeGeo.rotateZ(Math.PI / 2);
  for (const side of [-1.15, 1.15]) {
    const fl = new THREE.Mesh(flangeGeo, materials.flangeSteel);
    fl.position.set(side, voluteY, 0);
    fl.castShadow = true;
    group.add(fl);
  }

  // 7. Bearing housing & safety-yellow shaft coupling guard (extending toward +Z motor)
  const bearingGeo = new THREE.CylinderGeometry(0.2, 0.24, 0.42, 20);
  bearingGeo.rotateX(Math.PI / 2);
  const bearing = new THREE.Mesh(bearingGeo, materials.steelDark);
  bearing.position.set(0, voluteY, 0.36);
  bearing.castShadow = true;
  group.add(bearing);

  const guardGeo = new THREE.CylinderGeometry(0.19, 0.19, 0.28, 20);
  guardGeo.rotateX(Math.PI / 2);
  const couplingGuard = new THREE.Mesh(guardGeo, materials.safetyYellow);
  couplingGuard.position.set(0, voluteY, 0.66);
  couplingGuard.castShadow = true;
  group.add(couplingGuard);

  // 8. TEFC Electric Drive Motor housing (aligned along +Z)
  const motorBodyGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.92, 24);
  motorBodyGeo.rotateX(Math.PI / 2);
  const motorBody = new THREE.Mesh(motorBodyGeo, materials.motorSlate);
  motorBody.position.set(0, voluteY, 1.24);
  motorBody.castShadow = true;
  motorBody.receiveShadow = true;
  group.add(motorBody);

  // 9. Radial cooling fins around TEFC motor (InstancedMesh, 24 fins)
  const finCount = 24;
  const finGeo = new THREE.BoxGeometry(0.025, 0.08, 0.78);
  const finsMesh = new THREE.InstancedMesh(finGeo, materials.motorFin, finCount);
  for (let i = 0; i < finCount; i++) {
    const angle = (i / finCount) * Math.PI * 2;
    const r = 0.385;
    _dummy.position.set(Math.cos(angle) * r, voluteY + Math.sin(angle) * r, 1.24);
    _dummy.rotation.set(0, 0, angle - Math.PI / 2);
    _dummy.scale.set(1, 1, 1);
    _dummy.updateMatrix();
    finsMesh.setMatrixAt(i, _dummy.matrix);
  }
  finsMesh.instanceMatrix.needsUpdate = true;
  finsMesh.computeBoundingSphere();
  group.add(finsMesh);

  // 10. Motor top terminal junction box & rear fan cowl
  const termBoxGeo = createBeveledBoxGeometry(0.3, 0.22, 0.34, 0.02);
  const termBox = new THREE.Mesh(termBoxGeo, materials.steelDark);
  termBox.position.set(0, voluteY + 0.36, 1.15);
  termBox.castShadow = true;
  group.add(termBox);

  const cowlPts = [
    new THREE.Vector2(0.01, 0.22),
    new THREE.Vector2(0.28, 0.21),
    new THREE.Vector2(0.37, 0.12),
    new THREE.Vector2(0.37, -0.05),
  ];
  const cowlGeo = new THREE.LatheGeometry(cowlPts, 24);
  cowlGeo.rotateX(Math.PI / 2);
  const cowl = new THREE.Mesh(cowlGeo, materials.pumpBlue);
  cowl.position.set(0, voluteY, 1.72);
  cowl.castShadow = true;
  group.add(cowl);

  // 11. Discharge pressure gauge (stem + machined bezel + procedural dial face)
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.32, 12), materials.brass);
  stem.position.set(0.45, voluteY + 0.48, 0);
  group.add(stem);

  const bezel = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.07, 24), materials.flangeSteel);
  bezel.rotation.x = Math.PI / 2;
  bezel.position.set(0.45, voluteY + 0.72, 0);
  bezel.castShadow = true;
  group.add(bezel);

  const dial = new THREE.Mesh(new THREE.CircleGeometry(0.128, 24), materials.gaugeDial);
  dial.position.set(0.45, voluteY + 0.72, 0.038);
  group.add(dial);

  return group;
}

/**
 * Composite 6-part Industrial Gate Valve assembly mounted on a pipe segment.
 */
function buildGateValve(pipeRadius, materials) {
  const valve = new THREE.Group();

  // 1. Cast valve body collar
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(pipeRadius * 1.38, pipeRadius * 1.38, pipeRadius * 1.45, 20),
    materials.valveBody,
  );
  body.rotation.z = Math.PI / 2;
  body.castShadow = true;
  valve.add(body);

  // 2. Vertical bonnet housing
  const bonnet = new THREE.Mesh(
    new THREE.CylinderGeometry(pipeRadius * 0.62, pipeRadius * 0.85, pipeRadius * 1.8, 16),
    materials.valveBody,
  );
  bonnet.position.y = pipeRadius * 1.25;
  bonnet.castShadow = true;
  valve.add(bonnet);

  // 3. Bonnet bolted flange ring
  const bonnetFlange = new THREE.Mesh(
    new THREE.CylinderGeometry(pipeRadius * 1.02, pipeRadius * 1.02, pipeRadius * 0.24, 16),
    materials.flangeSteel,
  );
  bonnetFlange.position.y = pipeRadius * 1.05;
  valve.add(bonnetFlange);

  // 4. Stainless rising stem
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(pipeRadius * 0.14, pipeRadius * 0.14, pipeRadius * 1.45, 12),
    materials.flangeSteel,
  );
  stem.position.y = pipeRadius * 2.55;
  valve.add(stem);

  // 5. Cast-iron safety-red handwheel rim
  const wheelY = pipeRadius * 2.95;
  const wheelR = Math.max(0.24, pipeRadius * 1.35);
  const wheelRim = new THREE.Mesh(
    new THREE.TorusGeometry(wheelR, Math.max(0.025, pipeRadius * 0.14), 12, 24),
    materials.valveRed,
  );
  wheelRim.rotation.x = Math.PI / 2;
  wheelRim.position.y = wheelY;
  wheelRim.castShadow = true;
  valve.add(wheelRim);

  // 6. Cross spokes
  const spokeGeo = new THREE.CylinderGeometry(0.018, 0.018, wheelR * 1.9, 8);
  const spoke1 = new THREE.Mesh(spokeGeo, materials.valveRed);
  spoke1.rotation.z = Math.PI / 2;
  spoke1.position.y = wheelY;
  valve.add(spoke1);

  const spoke2 = new THREE.Mesh(spokeGeo, materials.valveRed);
  spoke2.rotation.x = Math.PI / 2;
  spoke2.position.y = wheelY;
  valve.add(spoke2);

  return valve;
}

/**
 * Composite 7-part Inline Process Equipment Vessel (Filter / Heat Exchanger)
 * grounded flush at y = 0 with domed LatheGeometry heads and contact shadow.
 */
function buildEquipmentVessel(pipeY, pipeRadius, materials, shadowMat) {
  const vessel = new THREE.Group();
  const radius = Math.max(0.42, pipeRadius * 2.1);
  const bottomY = Math.max(0.45, pipeY - 0.65);
  const topY = Math.max(pipeY + 0.85, bottomY + 1.45);
  const shellH = topY - bottomY;

  // 1. Contact shadow
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(radius * 1.5, 24), shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.015;
  vessel.add(shadow);

  // 2. Three grounded steel support legs with floor pads
  const legH = bottomY + 0.12;
  const legGeo = new THREE.CylinderGeometry(0.055, 0.065, legH, 10);
  const padGeo = new THREE.CylinderGeometry(0.11, 0.12, 0.04, 12);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
    const lx = Math.cos(a) * (radius * 0.78);
    const lz = Math.sin(a) * (radius * 0.78);
    const leg = new THREE.Mesh(legGeo, materials.steelDark);
    leg.position.set(lx, legH / 2, lz);
    leg.castShadow = true;
    vessel.add(leg);

    const pad = new THREE.Mesh(padGeo, materials.skidIron);
    pad.position.set(lx, 0.02, lz);
    vessel.add(pad);
  }

  // 3. LatheGeometry pressure vessel shell with elliptical domed top/bottom heads
  const pts = [];
  const steps = 10;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * (Math.PI / 2);
    pts.push(new THREE.Vector2(Math.sin(t) * radius, bottomY - Math.cos(t) * (radius * 0.45)));
  }
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * (Math.PI / 2);
    pts.push(new THREE.Vector2(Math.cos(t) * radius, topY + Math.sin(t) * (radius * 0.45)));
  }
  const shell = new THREE.Mesh(new THREE.LatheGeometry(pts, 28), materials.vesselAmber);
  shell.castShadow = true;
  shell.receiveShadow = true;
  vessel.add(shell);

  // 4. Upper & lower stiffening girth rings
  const ringGeo = new THREE.TorusGeometry(radius * 1.02, 0.032, 10, 28);
  for (const ry of [bottomY + shellH * 0.18, topY - shellH * 0.18]) {
    const ring = new THREE.Mesh(ringGeo, materials.flangeSteel);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = ry;
    vessel.add(ring);
  }

  // 5. Top bolted manway / relief nozzle
  const topFlange = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.36, radius * 0.36, 0.09, 18), materials.flangeSteel);
  topFlange.position.y = topY + radius * 0.45 + 0.08;
  vessel.add(topFlange);

  // 6. Brass ASME nameplate on front face
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.03), materials.brass);
  plate.position.set(0, bottomY + shellH * 0.55, radius + 0.01);
  vessel.add(plate);

  // 7. Side nozzle reinforcement collars aligned with pipe height
  const collarGeo = new THREE.CylinderGeometry(pipeRadius * 1.32, pipeRadius * 1.32, radius * 2.15, 20);
  collarGeo.rotateZ(Math.PI / 2);
  const collar = new THREE.Mesh(collarGeo, materials.flangeSteel);
  collar.position.set(0, pipeY, 0);
  vessel.add(collar);

  return vessel;
}

/**
 * Grounded 4-part Steel Pipe Stanchion Support (y = 0 up to exact pipe underside).
 */
function buildPipeSupport(x, pipeY, pipeRadius, materials, shadowMat) {
  const support = new THREE.Group();
  support.position.set(x, 0, 0);

  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.38, 16), shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.015;
  support.add(shadow);

  const baseplate = new THREE.Mesh(createBeveledBoxGeometry(0.46, 0.055, 0.46, 0.01), materials.skidIron);
  baseplate.castShadow = true;
  baseplate.receiveShadow = true;
  support.add(baseplate);

  const colHeight = Math.max(0.18, pipeY - pipeRadius - 0.055);
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.078, colHeight, 12), materials.steelDark);
  col.position.y = 0.055 + colHeight / 2;
  col.castShadow = true;
  support.add(col);

  const cradle = new THREE.Mesh(
    new THREE.TorusGeometry(pipeRadius * 1.08, 0.038, 10, 16, Math.PI),
    materials.flangeSteel,
  );
  cradle.rotation.z = Math.PI;
  cradle.rotation.y = Math.PI / 2;
  cradle.position.y = pipeY;
  support.add(cradle);

  return support;
}

function getSegmentColor(seg, mode, targetColor) {
  if (mode === 'velocity') {
    // Cool teal (low velocity) -> bright cyan -> amber -> coral red (high velocity)
    const t = Math.max(0, Math.min(1, seg.velocityNorm));
    if (t < 0.5) {
      targetColor.set('#2aa9c9').lerp(_color.set('#f0b75b'), t * 2);
    } else {
      targetColor.set('#f0b75b').lerp(_color.set('#e85c5c'), (t - 0.5) * 2);
    }
    return targetColor;
  }
  if (mode === 'pressure') {
    const t = Math.max(0, Math.min(1, seg.pressureDropNorm));
    targetColor.set('#3a8de0').lerp(_color.set('#e8685a'), t);
    return targetColor;
  }
  // Service mode: cool marine teal for suction, machined industrial steel-blue for discharge
  return targetColor.set(seg.service === 'suction' ? '#2c9fb5' : '#4a89c7');
}

function disposeObjectTree(root) {
  root.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
      else if (!obj.material.userData?.shared) obj.material.dispose();
    }
  });
}

class HydraulicsScene3D {
  constructor(mountEl, options = {}) {
    this.mountEl = mountEl;
    this.onSelectSegment = options.onSelectSegment || null;
    this.isSoftwareGl = detectSoftwareGl();

    this.colorMode = 'service'; // 'service' | 'velocity' | 'pressure'
    this.explodeTarget = 0;
    this.explodeCurrent = 0;
    this.flowPlaying = true;
    this.selectedIndex = -1;
    this.hoveredIndex = -1;
    this.currentLayout = null;
    this.currentResult = null;

    this.segmentEntries = []; // { mesh, group, baseOffset, mat, data }
    this.interactables = [];
    this.flowCurves = []; // { curve, velocity }
    this.flowBeadsMesh = null;
    this.flowBeadOffsets = [];
    this.flowBeadCount = 0;

    // Camera transition targets (exponentially damped, cancelled on user drag)
    this.camTransition = null;

    this.frameId = 0;
    this.renderBusy = false;
    this.renderDirty = false;
    this.disposed = false;
    this.lastTickMs = performance.now();

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.lastHoverCheck = 0;

    try {
      this._initRendererAndScene();
      this._bindEvents();
    } catch (error) {
      // A failed WebGL/PMREM/controls initialisation must not break the hydraulic calculator.
      this.controls?.dispose?.();
      this.envRT?.dispose?.();
      this.renderer?.dispose?.();
      this.renderer?.domElement?.remove?.();
      throw error;
    }
  }

  _initRendererAndScene() {
    const width = Math.max(320, this.mountEl.clientWidth || 640);
    const height = Math.max(240, this.mountEl.clientHeight || 360);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0b1422');
    this.scene.fog = new THREE.FogExp2('#0b1422', 0.02);

    this.camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 160);
    this.camera.position.set(11, 7.2, 13.5);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(width, height, false);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.display = 'block';
    this.mountEl.appendChild(this.renderer.domElement);

    // Mandatory studio environment reflection (RoomEnvironment + PMREMGenerator)
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = this.envRT.texture;
    pmrem.dispose();

    // 3-Point Studio Lighting with warm/cool temperature contrast
    const hemi = new THREE.HemisphereLight(0xa4ccff, 0x162231, 0.85);
    this.scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff1dc, 2.25);
    keyLight.position.set(11, 16, 10);
    keyLight.castShadow = !this.isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 48;
    keyLight.shadow.camera.left = -16;
    keyLight.shadow.camera.right = 16;
    keyLight.shadow.camera.top = 14;
    keyLight.shadow.camera.bottom = -14;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x6db7ff, 0.95);
    rimLight.position.set(-12, 9, -11);
    this.scene.add(rimLight);

    // OrbitControls (damping enabled on GPU, disabled on software WebGL per skill)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = !this.isSoftwareGl;
    this.controls.dampingFactor = 0.07;
    this.controls.autoRotate = false;
    this.controls.maxPolarAngle = Math.PI * 0.485;
    this.controls.minDistance = 3.2;
    this.controls.maxDistance = 42;
    this.controls.target.set(0, 1.4, 0);
    this.controls.update();

    // Shared procedural textures & PBR materials
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    const floorTex = createFloorTextures(maxAniso);
    const brushedTex = createBrushedMetalMap(maxAniso);
    const dialTex = createGaugeDialTexture(maxAniso);
    const shadowTex = createContactShadowTexture();

    this.textures = [floorTex.map, floorTex.bumpMap, brushedTex, dialTex, shadowTex];
    this.brushedTex = brushedTex;

    const tagShared = (mat) => {
      mat.userData.shared = true;
      return mat;
    };

    this.materials = {
      floor: tagShared(new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: floorTex.map,
        bumpMap: floorTex.bumpMap,
        bumpScale: 0.015,
        roughness: 0.86,
        metalness: 0.12,
      })),
      shadow: tagShared(new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        opacity: 0.44,
        depthWrite: false,
      })),
      skidIron: tagShared(new THREE.MeshStandardMaterial({
        color: 0x202b38,
        roughness: 0.78,
        metalness: 0.35,
        bumpMap: brushedTex,
        bumpScale: 0.008,
      })),
      steelDark: tagShared(new THREE.MeshStandardMaterial({
        color: 0x354659,
        roughness: 0.62,
        metalness: 0.55,
      })),
      flangeSteel: tagShared(new THREE.MeshStandardMaterial({
        color: 0xb5c5d6,
        roughness: 0.24,
        metalness: 0.88,
        bumpMap: brushedTex,
        bumpScale: 0.006,
      })),
      pumpBlue: tagShared(new THREE.MeshStandardMaterial({
        color: 0x1e6eb3,
        roughness: 0.32,
        metalness: 0.42,
      })),
      motorSlate: tagShared(new THREE.MeshStandardMaterial({
        color: 0x2f435a,
        roughness: 0.54,
        metalness: 0.52,
      })),
      motorFin: tagShared(new THREE.MeshStandardMaterial({
        color: 0x243447,
        roughness: 0.65,
        metalness: 0.45,
      })),
      safetyYellow: tagShared(new THREE.MeshStandardMaterial({
        color: 0xe3a832,
        roughness: 0.38,
        metalness: 0.18,
      })),
      rubber: tagShared(new THREE.MeshStandardMaterial({
        color: 0x151a20,
        roughness: 0.92,
        metalness: 0.04,
      })),
      brass: tagShared(new THREE.MeshStandardMaterial({
        color: 0xc9a354,
        roughness: 0.28,
        metalness: 0.86,
      })),
      gaugeDial: tagShared(new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: dialTex,
        roughness: 0.3,
        metalness: 0.05,
      })),
      valveBody: tagShared(new THREE.MeshStandardMaterial({
        color: 0x314b66,
        roughness: 0.52,
        metalness: 0.62,
      })),
      valveRed: tagShared(new THREE.MeshStandardMaterial({
        color: 0xc9423a,
        roughness: 0.35,
        metalness: 0.22,
      })),
      vesselAmber: tagShared(new THREE.MeshStandardMaterial({
        color: 0xc98b3e,
        roughness: 0.36,
        metalness: 0.58,
        bumpMap: brushedTex,
        bumpScale: 0.007,
      })),
      flowBead: tagShared(new THREE.MeshStandardMaterial({
        color: 0x8ef0ff,
        emissive: 0x26b7e6,
        emissiveIntensity: 0.65,
        roughness: 0.18,
        metalness: 0.1,
      })),
    };

    // Industrial studio ground deck (y = 0)
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), this.materials.floor);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Subtle elevation datum reference grid offset slightly above floor with polygonOffset
    const grid = new THREE.GridHelper(48, 48, 0x2c4b6e, 0x1a2f47);
    grid.position.y = 0.006;
    if (grid.material) {
      grid.material.polygonOffset = true;
      grid.material.polygonOffsetFactor = -1;
      grid.material.polygonOffsetUnits = -1;
      grid.material.transparent = true;
      grid.material.opacity = 0.38;
    }
    this.scene.add(grid);

    // Dynamic system assembly group
    this.assemblyGroup = new THREE.Group();
    this.scene.add(this.assemblyGroup);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.mountEl.dataset.sceneReady = 'true';
    this.mountEl.dataset.softwareGl = String(this.isSoftwareGl);
  }

  _bindEvents() {
    this.controls.addEventListener('start', () => {
      this.camTransition = null;
    });
    this.controls.addEventListener('change', () => {
      this.requestRender();
    });

    const dom = this.renderer.domElement;
    dom.addEventListener('pointermove', (e) => this._onPointerMove(e));
    dom.addEventListener('click', (e) => this._onClick(e));

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.mountEl);
  }

  resize() {
    if (this.disposed) return;
    const width = Math.max(240, this.mountEl.clientWidth);
    const height = Math.max(200, this.mountEl.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.requestRender();
  }

  updateSystem(result) {
    if (!result || !window.PumpHydraulicsLayout3D) return;
    this.currentResult = result;
    const layout = window.PumpHydraulicsLayout3D.buildPipeLayout(result);
    this.currentLayout = layout;
    this.selectedIndex = -1;
    this.hoveredIndex = -1;

    // Cleanly dispose previous dynamic assembly
    disposeObjectTree(this.assemblyGroup);
    this.assemblyGroup.clear();
    this.segmentEntries = [];
    this.interactables = [];
    this.flowCurves = [];
    this.flowBeadsMesh = null;
    this.flowBeadOffsets = [];

    if (layout.segments.length === 0) {
      this.mountEl.dataset.segmentCount = '0';
      this.requestRender();
      return;
    }

    // 1. Add composite Centrifugal Pump + Motor Skid
    const pumpSkid = buildCentrifugalPumpSkid(layout.pumpPipeY, this.materials, this.materials.shadow);
    pumpSkid.position.set(layout.pumpPosition.x, 0, layout.pumpPosition.z);
    this.assemblyGroup.add(pumpSkid);

    // 2. Collect flange bolt transforms for a single InstancedMesh
    const boltPositions = [];
    const boltGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.14, 6);
    boltGeo.rotateZ(Math.PI / 2);

    // 3. Build each pipe segment group
    layout.segments.forEach((seg, idx) => {
      const segGroup = new THREE.Group();
      segGroup.name = `Segment_${idx + 1}`;
      const baseX = (idx - (layout.segments.length - 1) * 0.5);

      // Construct smooth elbowed S-curve when elevation changes, or straight horizontal run
      const dx = seg.end.x - seg.start.x;
      const dy = seg.end.y - seg.start.y;
      let curve;
      if (Math.abs(dy) > 0.05) {
        const p0 = new THREE.Vector3(seg.start.x, seg.start.y, 0);
        const p1 = new THREE.Vector3(seg.start.x + dx * 0.28, seg.start.y, 0);
        const p2 = new THREE.Vector3(seg.start.x + dx * 0.5, seg.start.y + dy * 0.5, 0);
        const p3 = new THREE.Vector3(seg.start.x + dx * 0.72, seg.end.y, 0);
        const p4 = new THREE.Vector3(seg.end.x, seg.end.y, 0);
        curve = new THREE.CatmullRomCurve3([p0, p1, p2, p3, p4], false, 'catmullrom', 0.32);
      } else {
        curve = new THREE.LineCurve3(
          new THREE.Vector3(seg.start.x, seg.start.y, 0),
          new THREE.Vector3(seg.end.x, seg.end.y, 0),
        );
      }

      const pipeColor = new THREE.Color();
      getSegmentColor(seg, this.colorMode, pipeColor);
      const pipeMat = new THREE.MeshStandardMaterial({
        color: pipeColor,
        roughness: 0.34,
        metalness: 0.62,
        bumpMap: this.brushedTex,
        bumpScale: 0.008,
      });

      const tubeGeo = new THREE.TubeGeometry(curve, Math.abs(dy) > 0.05 ? 36 : 16, seg.visualRadius, 22, false);
      const pipeMesh = new THREE.Mesh(tubeGeo, pipeMat);
      pipeMesh.castShadow = true;
      pipeMesh.receiveShadow = true;
      pipeMesh.userData.segmentIndex = idx;
      segGroup.add(pipeMesh);
      this.interactables.push(pipeMesh);

      // End flanges + bolt ring coordinates
      const flangeGeo = createRaisedFaceFlangeGeometry(seg.visualRadius);
      flangeGeo.rotateZ(Math.PI / 2);

      const startFlange = new THREE.Mesh(flangeGeo, this.materials.flangeSteel);
      startFlange.position.set(seg.start.x + 0.06, seg.start.y, 0);
      startFlange.castShadow = true;
      segGroup.add(startFlange);

      const endFlange = new THREE.Mesh(flangeGeo, this.materials.flangeSteel);
      endFlange.position.set(seg.end.x - 0.06, seg.end.y, 0);
      endFlange.castShadow = true;
      segGroup.add(endFlange);

      const boltRingR = seg.visualRadius * 1.42;
      const boltsPerFlange = 8;
      for (const fx of [seg.start.x + 0.06, seg.end.x - 0.06]) {
        const fy = fx === seg.start.x + 0.06 ? seg.start.y : seg.end.y;
        for (let b = 0; b < boltsPerFlange; b++) {
          const a = (b / boltsPerFlange) * Math.PI * 2;
          boltPositions.push({
            x: fx,
            y: fy + Math.sin(a) * boltRingR,
            z: Math.cos(a) * boltRingR,
            segIndex: idx,
          });
        }
      }

      // Concentric tapered reducer cone when diameter shifts from previous segment
      if (seg.hasReducer) {
        const redLen = 0.38;
        const redGeo = createReducerGeometry(seg.prevVisualRadius, seg.visualRadius, redLen);
        redGeo.rotateZ(-Math.PI / 2);
        const reducer = new THREE.Mesh(redGeo, this.materials.flangeSteel);
        reducer.position.set(seg.start.x - redLen * 0.35, seg.start.y, 0);
        reducer.castShadow = true;
        segGroup.add(reducer);
      }

      // Grounded pipe stanchion supports near start/end flat spans
      const sup1 = buildPipeSupport(seg.start.x + dx * 0.18, seg.start.y, seg.visualRadius, this.materials, this.materials.shadow);
      segGroup.add(sup1);
      if (dx > 3.2) {
        const sup2 = buildPipeSupport(seg.end.x - dx * 0.18, seg.end.y, seg.visualRadius, this.materials, this.materials.shadow);
        segGroup.add(sup2);
      }

      // Inline Gate Valve if minorLossK > 0
      if (seg.hasValve) {
        const vt = seg.hasEquipment ? 0.24 : 0.34;
        const vp = curve.getPointAt(vt);
        const valve = buildGateValve(seg.visualRadius, this.materials);
        valve.position.copy(vp);
        segGroup.add(valve);
      }

      // Inline Process Equipment Vessel if equipmentPressureDrop > 0
      if (seg.hasEquipment) {
        const et = 0.72;
        const ep = curve.getPointAt(et);
        const vessel = buildEquipmentVessel(ep.y, seg.visualRadius, this.materials, this.materials.shadow);
        vessel.position.set(ep.x, 0, 0);
        segGroup.add(vessel);
      }

      this.assemblyGroup.add(segGroup);
      this.segmentEntries.push({
        index: idx,
        group: segGroup,
        mesh: pipeMesh,
        material: pipeMat,
        explodeAxis: baseX,
        data: seg,
      });

      this.flowCurves.push({
        curve,
        velocity: Math.max(0, seg.velocityMs),
        radius: seg.visualRadius,
        segIndex: idx,
      });
    });

    // 4. InstancedMesh for all flange bolts (> 20 instances batched in 1 draw call)
    if (boltPositions.length > 0) {
      this.boltsMesh = new THREE.InstancedMesh(boltGeo, this.materials.steelDark, boltPositions.length);
      this.boltData = boltPositions;
      this._updateBoltMatrices();
      this.assemblyGroup.add(this.boltsMesh);
    }

    // 5. InstancedMesh for animated flow tracer beads gliding along pipe centerlines
    const beadsPerSegment = 10;
    this.flowBeadCount = this.flowCurves.length * beadsPerSegment;
    if (this.flowBeadCount > 0) {
      const beadGeo = new THREE.CapsuleGeometry(0.042, 0.16, 4, 8);
      beadGeo.rotateZ(Math.PI / 2);
      this.flowBeadsMesh = new THREE.InstancedMesh(beadGeo, this.materials.flowBead, this.flowBeadCount);
      this.flowBeadsMesh.frustumCulled = false;
      this.flowBeadOffsets = [];
      for (let c = 0; c < this.flowCurves.length; c++) {
        for (let b = 0; b < beadsPerSegment; b++) {
          this.flowBeadOffsets.push({
            curveIdx: c,
            t: b / beadsPerSegment,
          });
        }
      }
      this.assemblyGroup.add(this.flowBeadsMesh);
      this._advanceFlowBeads(0);
    }

    this.mountEl.dataset.segmentCount = String(layout.segments.length);
    this.setCameraPreset('iso', false);
    this._startOrScheduleLoop();
  }

  _updateBoltMatrices() {
    if (!this.boltsMesh || !this.boltData) return;
    const explodeOffset = this.explodeCurrent * 1.15;
    for (let i = 0; i < this.boltData.length; i++) {
      const b = this.boltData[i];
      const entry = this.segmentEntries[b.segIndex];
      const shiftX = entry ? entry.explodeAxis * explodeOffset : 0;
      _dummy.position.set(b.x + shiftX, b.y, b.z);
      _dummy.rotation.set(0, 0, 0);
      _dummy.scale.set(1, 1, 1);
      _dummy.updateMatrix();
      this.boltsMesh.setMatrixAt(i, _dummy.matrix);
    }
    this.boltsMesh.instanceMatrix.needsUpdate = true;
    this.boltsMesh.computeBoundingSphere();
  }

  _advanceFlowBeads(dt) {
    if (!this.flowBeadsMesh || this.flowBeadCount === 0) return;
    const explodeOffset = this.explodeCurrent * 1.15;
    const hasFlow = this.currentResult && this.currentResult.flow_m3_s > 0;
    this.flowBeadsMesh.visible = Boolean(hasFlow);
    if (!hasFlow) return;

    for (let i = 0; i < this.flowBeadOffsets.length; i++) {
      const item = this.flowBeadOffsets[i];
      const fc = this.flowCurves[item.curveIdx];
      if (!fc) continue;
      if (this.flowPlaying && dt > 0) {
        const speed = 0.18 + Math.min(2.2, fc.velocity * 0.24);
        item.t = (item.t + speed * dt) % 1;
      }
      fc.curve.getPointAt(item.t, _v1);
      fc.curve.getTangentAt(item.t, _v2).normalize();
      const entry = this.segmentEntries[fc.segIndex];
      const shiftX = entry ? entry.explodeAxis * explodeOffset : 0;
      // Offset beads along the front outer-side stream guideline so they remain cleanly visible
      _v1.x += shiftX;
      _v1.z += fc.radius + 0.085;
      _quat.setFromUnitVectors(_v3.set(1, 0, 0), _v2);
      _mat4.compose(_v1, _quat, _scale);
      this.flowBeadsMesh.setMatrixAt(i, _mat4);
    }
    this.flowBeadsMesh.instanceMatrix.needsUpdate = true;
  }

  setColorMode(mode) {
    this.colorMode = mode;
    for (const entry of this.segmentEntries) {
      getSegmentColor(entry.data, this.colorMode, entry.material.color);
      entry.material.needsUpdate = true;
    }
    this._applySelectionHighlights();
    this.requestRender();
  }

  setExplode(value) {
    this.explodeTarget = Math.max(0, Math.min(1, Number(value) || 0));
    this.requestRender();
  }

  setFlowPlaying(playing) {
    this.flowPlaying = Boolean(playing);
    this._startOrScheduleLoop();
  }

  setCameraPreset(preset, animate = true) {
    if (!this.currentLayout) return;
    const b = this.currentLayout.bounds;
    const dist = Math.max(11.5, b.span * 1.18);
    // Slight downward target bias keeps the assembly framed cleanly above the bottom dock
    const target = new THREE.Vector3(b.centerX, Math.max(0.6, b.centerY - 0.35), 0);
    const pos = new THREE.Vector3();

    if (preset === 'side') {
      pos.set(b.centerX, b.centerY + 1.0, dist * 1.24);
    } else if (preset === 'pump') {
      const px = this.currentLayout.pumpPosition.x;
      const py = Math.max(0.95, this.currentLayout.pumpPipeY);
      target.set(px, py * 0.8, 0.45);
      pos.set(px + 3.4, py + 1.9, 4.4);
    } else {
      // Isometric engineering 3/4 view with generous left/right margin
      pos.set(b.centerX + dist * 0.5, b.centerY + dist * 0.4, dist * 0.9);
    }

    this.mountEl.dataset.cameraPreset = preset;

    if (!animate || this.isSoftwareGl) {
      this.camTransition = null;
      this.camera.position.copy(pos);
      this.controls.target.copy(target);
      this.controls.update();
      this.requestRender();
    } else {
      this.camTransition = { pos, target };
      this.requestRender();
    }
  }

  selectSegment(index) {
    this.selectedIndex = index;
    this._applySelectionHighlights();
    this.requestRender();
  }

  _applySelectionHighlights() {
    for (const entry of this.segmentEntries) {
      if (entry.index === this.selectedIndex) {
        entry.material.emissive.setHex(0x285a8f);
        entry.material.emissiveIntensity = 0.75;
      } else if (entry.index === this.hoveredIndex) {
        entry.material.emissive.setHex(0x1a3f66);
        entry.material.emissiveIntensity = 0.45;
      } else {
        entry.material.emissive.setHex(0x000000);
        entry.material.emissiveIntensity = 0;
      }
    }
  }

  _raycast(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.interactables, false);
    return hits.length > 0 ? hits[0].object.userData.segmentIndex : -1;
  }

  _onPointerMove(event) {
    const now = performance.now();
    if (now - this.lastHoverCheck < 65) return;
    this.lastHoverCheck = now;
    const idx = this._raycast(event);
    if (idx !== this.hoveredIndex) {
      this.hoveredIndex = idx;
      this.renderer.domElement.style.cursor = idx >= 0 ? 'pointer' : 'grab';
      this._applySelectionHighlights();
      this.requestRender();
    }
  }

  _onClick(event) {
    const idx = this._raycast(event);
    if (idx >= 0) {
      this.selectedIndex = idx;
      this._applySelectionHighlights();
      this.requestRender();
      if (this.onSelectSegment) this.onSelectSegment(idx, this.segmentEntries[idx]?.data || null);
    }
  }

  _afterDraw(cb) {
    const gl = this.renderer.getContext();
    if (typeof gl.fenceSync === 'function') {
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (this.disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          this.frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          this.frameId = window.setTimeout(cb, 80);
        }
      };
      this.frameId = window.setTimeout(poll, 5);
    } else {
      this.frameId = window.setTimeout(cb, 80);
    }
  }

  _needsContinuousAnimation() {
    const hasFlow = this.flowPlaying && this.currentResult && this.currentResult.flow_m3_s > 0;
    const exploding = Math.abs(this.explodeCurrent - this.explodeTarget) > 0.002;
    const movingCam = this.camTransition !== null;
    return Boolean(hasFlow || exploding || movingCam);
  }

  _stepAndRender() {
    if (this.disposed) return;
    const now = performance.now();
    const dt = Math.min(0.1, Math.max(0.001, (now - this.lastTickMs) / 1000));
    this.lastTickMs = now;

    // Smooth exponential damping for exploded flange separation
    if (Math.abs(this.explodeCurrent - this.explodeTarget) > 0.001) {
      const alpha = this.isSoftwareGl ? 1 : (1 - Math.exp(-8 * dt));
      this.explodeCurrent += (this.explodeTarget - this.explodeCurrent) * alpha;
      const offset = this.explodeCurrent * 1.15;
      for (const entry of this.segmentEntries) {
        entry.group.position.x = entry.explodeAxis * offset;
      }
      this._updateBoltMatrices();
    }

    // Smooth exponential damping for camera presets
    if (this.camTransition) {
      const alpha = 1 - Math.exp(-6.5 * dt);
      this.camera.position.lerp(this.camTransition.pos, alpha);
      this.controls.target.lerp(this.camTransition.target, alpha);
      if (
        this.camera.position.distanceTo(this.camTransition.pos) < 0.03 &&
        this.controls.target.distanceTo(this.camTransition.target) < 0.03
      ) {
        this.camera.position.copy(this.camTransition.pos);
        this.controls.target.copy(this.camTransition.target);
        this.camTransition = null;
      }
    }

    this._advanceFlowBeads(dt);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  requestRender() {
    if (this.disposed) return;
    if (this.renderBusy) {
      this.renderDirty = true;
      return;
    }
    this.renderBusy = true;
    this.frameId = requestAnimationFrame(() => {
      if (this.disposed) return;
      this.renderDirty = false;
      this._stepAndRender();
      const done = () => {
        if (this.disposed) return;
        this.renderBusy = false;
        if (this.renderDirty || this._needsContinuousAnimation()) {
          this.requestRender();
        }
      };
      if (this.isSoftwareGl) this._afterDraw(done);
      else done();
    });
  }

  _startOrScheduleLoop() {
    this.lastTickMs = performance.now();
    this.requestRender();
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    if (this.resizeObserver) this.resizeObserver.disconnect();
    this.controls.dispose();
    disposeObjectTree(this.assemblyGroup);
    for (const key of Object.keys(this.materials)) {
      this.materials[key].dispose();
    }
    for (const tex of this.textures) tex.dispose();
    if (this.envRT) this.envRT.dispose();
    this.renderer.dispose();
  }
}

function show3DFallback(mountEl, error) {
  if (!mountEl) return;
  mountEl.replaceChildren();
  const message = document.createElement('div');
  message.setAttribute('role', 'status');
  message.style.cssText = [
    'height:100%', 'min-height:180px', 'display:grid', 'place-content:center',
    'gap:8px', 'padding:24px', 'text-align:center', 'color:#c7d7e8',
    'background:#101d2d', 'font:13px/1.5 Inter,Segoe UI,Arial,sans-serif'
  ].join(';');
  const title = document.createElement('strong');
  title.textContent = '3D viewport unavailable';
  const detail = document.createElement('span');
  detail.textContent = 'The hydraulic calculator remains available. Enable WebGL and allow the Three.js module CDN, then reload to restore the 3D view.';
  message.append(title, detail);
  mountEl.appendChild(message);
  mountEl.dataset.threeStatus = 'unavailable';
  if (error) console.warn('Pump Hydraulics 3D initialisation failed:', error);
}

window.PumpHydraulics3D = {
  create(mountEl, options) {
    try {
      const scene = new HydraulicsScene3D(mountEl, options);
      mountEl.dataset.threeStatus = 'ready';
      return scene;
    } catch (error) {
      show3DFallback(mountEl, error);
      return null;
    }
  },
  showFallback: show3DFallback,
};
window.dispatchEvent(new CustomEvent('hydraulics3d:ready'));
