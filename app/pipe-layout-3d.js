(function () {
'use strict';

/**
 * Pure 3D hydraulic layout solver for the Pump Hydraulics Three.js viewport.
 * Converts calculated multi-segment hydraulic results into normalized 3D
 * world coordinates (meters in studio scale), pipe outer radii, pump skid
 * insertion position, elevation profile, and hydraulic color normalization.
 */

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

/**
 * Compute normalized 3D layout data for an array of calculated segments.
 * Each segment produces start/end 3D points, a visual outer radius, valve/equipment flags,
 * reducer flag (when diameter changes from previous segment), and normalized color metrics.
 */
function buildPipeLayout(result) {
  const segments = (result && Array.isArray(result.segments)) ? result.segments : [];
  if (segments.length === 0) {
    return {
      segments: [],
      pumpIndex: 0,
      pumpPosition: { x: 0, y: 0, z: 0 },
      bounds: { minX: -2, maxX: 2, minY: 0, maxY: 2.5, centerX: 0, centerY: 1.2, span: 4 },
      flowVelocityMax: 0,
      pressureDropMax: 0,
    };
  }

  // Determine pump placement: right after the last suction segment (or before segment 0 if none)
  let lastSuctionIdx = -1;
  for (let i = 0; i < segments.length; i++) {
    if (segments[i].service === 'suction') lastSuctionIdx = i;
  }
  // Pump sits between lastSuctionIdx and lastSuctionIdx + 1 (or at start if no suction)
  const pumpAfterIndex = lastSuctionIdx;

  // Normalize total horizontal run so scenes stay nicely framed (~12-18 studio units wide)
  const rawLengths = segments.map((s) => Math.max(1, Number(s.length_m) || 1));
  const totalRawLength = rawLengths.reduce((acc, v) => acc + v, 0);
  const targetTotalRun = clamp(8 + segments.length * 2.4, 10, 20);
  const lengthScale = targetTotalRun / Math.max(1, totalRawLength);

  // Normalize vertical elevation deltas so climbs/drops are legible without leaving frame
  const maxAbsDz = segments.reduce((m, s) => Math.max(m, Math.abs(Number(s.elevation_change_m) || 0)), 0);
  const elevScale = maxAbsDz > 0 ? clamp(3.2 / Math.max(maxAbsDz, 3.2), 0.08, 0.45) : 0.25;

  const flowVelocityMax = segments.reduce((m, s) => Math.max(m, Number(s.velocity_m_s) || 0), 0.001);
  const pressureDropMax = segments.reduce((m, s) => Math.max(m, Math.abs(Number(s.pressure_drop_Pa) || 0)), 1);

  const pumpGap = 2.4; // horizontal space reserved for centrifugal pump + motor skid
  let cursorX = 0;
  let cursorY = 1.15; // centerline height at inlet

  // First pass to compute relative heights so nothing dips below floor y = 0.65
  let minY = cursorY;
  let testY = cursorY;
  for (let i = 0; i < segments.length; i++) {
    testY += (Number(segments[i].elevation_change_m) || 0) * elevScale;
    if (testY < minY) minY = testY;
  }
  const baseElevationOffset = minY < 0.85 ? (0.85 - minY) : 0;
  cursorY += baseElevationOffset;

  let pumpPosition = { x: 0, y: 0, z: 0 };
  let pumpPipeY = cursorY;
  const laidOut = [];

  if (pumpAfterIndex === -1) {
    pumpPosition = { x: cursorX + pumpGap * 0.5, y: 0, z: 0 };
    pumpPipeY = cursorY;
    cursorX += pumpGap;
  }

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const diamMm = Math.max(15, (Number(seg.diameter_m) || 0.1) * 1000);
    // Logarithmic/power diameter mapping so DN50..DN400 differences are clearly readable
    const visualRadius = clamp(0.11 + Math.pow(diamMm / 100, 0.52) * 0.12, 0.12, 0.44);
    const runX = clamp(rawLengths[i] * lengthScale, 2.2, 8.5);
    const deltaY = (Number(seg.elevation_change_m) || 0) * elevScale;

    const start = { x: cursorX, y: cursorY, z: 0 };
    const end = { x: cursorX + runX, y: cursorY + deltaY, z: 0 };

    const prevSeg = i > 0 ? laidOut[i - 1] : null;
    const hasReducer = prevSeg !== null && Math.abs(prevSeg.visualRadius - visualRadius) > 0.015;

    laidOut.push({
      index: i,
      name: seg.name || ('Segment ' + (i + 1)),
      service: seg.service === 'suction' ? 'suction' : 'discharge',
      diameterMm: diamMm,
      lengthM: Number(seg.length_m) || 0,
      velocityMs: Number(seg.velocity_m_s) || 0,
      reynolds: Number(seg.reynolds) || 0,
      pressureDropKPa: (Number(seg.pressure_drop_Pa) || 0) / 1000,
      majorLossM: Number(seg.major_loss_head_m) || 0,
      minorLossM: Number(seg.minor_loss_head_m) || 0,
      equipmentLossM: Number(seg.equipment_loss_head_m) || 0,
      elevationChangeM: Number(seg.elevation_change_m) || 0,
      minorLossK: Number(seg.minor_loss_K_total) || 0,
      regime: seg.regime || 'Turbulent',
      outletPressureBar: seg.outlet_pressure_Pa === null || seg.outlet_pressure_Pa === undefined
        ? null
        : seg.outlet_pressure_Pa / 1e5,
      visualRadius,
      prevVisualRadius: prevSeg ? prevSeg.visualRadius : visualRadius,
      hasReducer,
      hasFittingLoss: (Number(seg.minor_loss_K_total) || 0) > 0.01,
      hasEquipment: (Number(seg.equipment_loss_head_m) || 0) > 0.001,
      velocityNorm: clamp((Number(seg.velocity_m_s) || 0) / flowVelocityMax, 0, 1),
      pressureDropNorm: clamp(Math.abs(Number(seg.pressure_drop_Pa) || 0) / pressureDropMax, 0, 1),
      start,
      end,
    });

    cursorX = end.x;
    cursorY = end.y;

    if (i === pumpAfterIndex) {
      pumpPosition = { x: cursorX + pumpGap * 0.5, y: 0, z: 0 };
      pumpPipeY = cursorY;
      cursorX += pumpGap;
    }
  }

  // Center entire assembly along X around origin for balanced studio framing
  const totalWidth = cursorX;
  const shiftX = -totalWidth * 0.5;
  pumpPosition.x += shiftX;

  let bMinX = Infinity, bMaxX = -Infinity, bMinY = 0, bMaxY = 2.0;
  for (const s of laidOut) {
    s.start.x += shiftX;
    s.end.x += shiftX;
    bMinX = Math.min(bMinX, s.start.x, s.end.x);
    bMaxX = Math.max(bMaxX, s.start.x, s.end.x);
    bMaxY = Math.max(bMaxY, s.start.y + s.visualRadius + 0.8, s.end.y + s.visualRadius + 0.8);
  }
  bMinX = Math.min(bMinX, pumpPosition.x - 1.2);
  bMaxX = Math.max(bMaxX, pumpPosition.x + 1.2);

  const spanX = Math.max(4, bMaxX - bMinX);
  const spanY = Math.max(2.5, bMaxY - bMinY);

  return {
    segments: laidOut,
    pumpAfterIndex,
    pumpPosition,
    pumpPipeY,
    bounds: {
      minX: bMinX,
      maxX: bMaxX,
      minY: bMinY,
      maxY: bMaxY,
      centerX: (bMinX + bMaxX) * 0.5,
      centerY: (bMinY + bMaxY) * 0.48,
      span: Math.max(spanX, spanY * 1.4),
    },
    flowVelocityMax,
    pressureDropMax,
  };
}

const api = { buildPipeLayout };

if (typeof module !== 'undefined' && module.exports) module.exports = api;
else if (typeof window !== 'undefined') window.PumpHydraulicsLayout3D = api;
})();
