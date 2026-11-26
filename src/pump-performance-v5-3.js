'use strict';

/**
 * V5.3 pump/system operating point engine.
 * SI units: m3/s, m, kW. Pump curves must be manufacturer/test data.
 * System curve: Hstatic + Ksys*Q^2, calibrated from one design point.
 */
function finite(v, name) {
  if (v === null || v === undefined || (typeof v === 'string' && v.trim() === '')) throw new TypeError(name + ' is required');
  if (typeof v === 'string' && !/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(v.trim())) throw new TypeError(name + ' must be a decimal number');
  const n = Number(v);
  if (!Number.isFinite(n)) throw new TypeError(name + ' must be finite');
  return n;
}
function interpolate(points, q, field) {
  if (q < points[0].flow_m3_s - 1e-12 || q > points[points.length - 1].flow_m3_s + 1e-12) return null;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1];
    if (q <= b.flow_m3_s + 1e-12) {
      if (a[field] === undefined || b[field] === undefined || a[field] === null || b[field] === null) return null;
      const f = (q - a.flow_m3_s) / (b.flow_m3_s - a.flow_m3_s);
      return a[field] + f * (b[field] - a[field]);
    }
  }
  return points[points.length - 1][field] ?? null;
}
function systemHead(q, system) { return system.staticHead_m + system.resistance_m_per_m6 * q * q; }
function validateCurve(raw) {
  if (!Array.isArray(raw) || raw.length < 3) throw new RangeError('pumpCurve requires at least three manufacturer data points');
  const points = raw.map((p, i) => {
    if (!p || typeof p !== 'object') throw new TypeError('Pump curve point ' + i + ' must be an object');
    const q = finite(p.flow_m3_s, 'pumpCurve[' + i + '].flow_m3_s');
    const h = finite(p.head_m, 'pumpCurve[' + i + '].head_m');
    if (q < 0 || h <= 0) throw new RangeError('Pump curve flow must be non-negative and head must be positive');
    const point = { flow_m3_s: q, head_m: h };
    for (const field of ['efficiency_pct', 'npshr_m', 'shaft_power_kW']) {
      if (p[field] !== undefined && p[field] !== null) point[field] = finite(p[field], 'pumpCurve[' + i + '].' + field);
    }
    if (point.efficiency_pct !== undefined && !(point.efficiency_pct >= 0 && point.efficiency_pct <= 100)) throw new RangeError('Pump efficiency must be between 0 and 100 percent');
    if (point.npshr_m !== undefined && point.npshr_m < 0) throw new RangeError('NPSHr cannot be negative');
    if (point.shaft_power_kW !== undefined && point.shaft_power_kW < 0) throw new RangeError('Shaft power cannot be negative');
    return point;
  });
  for (let i = 1; i < points.length; i++) {
    if (!(points[i].flow_m3_s > points[i - 1].flow_m3_s)) throw new RangeError('Pump curve flow values must be strictly increasing');
  }
  for (const field of ['efficiency_pct', 'npshr_m', 'shaft_power_kW']) {
    const count = points.filter(p => p[field] !== undefined).length;
    if (count !== 0 && count !== points.length) throw new RangeError('If supplied, ' + field + ' must be present at every pump curve point');
  }
  return points;
}
function calculatePumpOperatingPoint(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Input object is required');
  const rho = finite(input.density_kg_m3, 'density_kg_m3');
  const g = input.gravity_m_s2 === undefined ? 9.80665 : finite(input.gravity_m_s2, 'gravity_m_s2');
  if (!(rho > 0) || !(g > 0)) throw new RangeError('Density and gravity must be greater than zero');
  const points = validateCurve(input.pumpCurve);
  const metadata = input.pumpMetadata === undefined ? {} : input.pumpMetadata;
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) throw new TypeError('pumpMetadata must be an object');
  const pumpMetadata = { manufacturer: metadata.manufacturer == null ? null : String(metadata.manufacturer).trim(), model: metadata.model == null ? null : String(metadata.model).trim(), curveRevision: metadata.curveRevision == null ? null : String(metadata.curveRevision).trim(), fluidBasis: metadata.fluidBasis == null ? null : String(metadata.fluidBasis).trim(), ratedSpeed_rpm: metadata.ratedSpeed_rpm == null || metadata.ratedSpeed_rpm === '' ? null : finite(metadata.ratedSpeed_rpm, 'pumpMetadata.ratedSpeed_rpm'), impellerDiameter_mm: metadata.impellerDiameter_mm == null || metadata.impellerDiameter_mm === '' ? null : finite(metadata.impellerDiameter_mm, 'pumpMetadata.impellerDiameter_mm') };
  if (pumpMetadata.ratedSpeed_rpm !== null && !(pumpMetadata.ratedSpeed_rpm > 0)) throw new RangeError('Rated speed must be greater than zero');
  if (pumpMetadata.impellerDiameter_mm !== null && !(pumpMetadata.impellerDiameter_mm > 0)) throw new RangeError('Impeller diameter must be greater than zero');
  const staticHead = finite(input.systemCurve?.staticHead_m, 'systemCurve.staticHead_m');
  const designFlow = finite(input.systemCurve?.designFlow_m3_s, 'systemCurve.designFlow_m3_s');
  const designHead = finite(input.systemCurve?.designHead_m, 'systemCurve.designHead_m');
  if (!(designFlow > 0) || !(designHead > staticHead)) throw new RangeError('System curve requires design flow > 0 and design head > static head');
  const system = { staticHead_m: staticHead, designFlow_m3_s: designFlow, designHead_m: designHead, resistance_m_per_m6: (designHead - staticHead) / (designFlow * designFlow) };
  const minQ = points[0].flow_m3_s, maxQ = points[points.length - 1].flow_m3_s;
  const diff = q => interpolate(points, q, 'head_m') - systemHead(q, system);
  const roots = [];
  // Within each interval the supplied pump head is linear in Q and the
  // system head is quadratic. Solve that quadratic exactly so two crossings
  // or a tangent crossing inside one vendor interval cannot be missed.
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i], p1 = points[i + 1];
    const q0 = p0.flow_m3_s, q1 = p1.flow_m3_s;
    const slope = (p1.head_m - p0.head_m) / (q1 - q0);
    const intercept = p0.head_m - slope * q0;
    const A = -system.resistance_m_per_m6;
    const B = slope;
    const C = intercept - system.staticHead_m;
    const discriminant = B * B - 4 * A * C;
    const discriminantTolerance = 1e-12 * Math.max(1, B * B, Math.abs(4 * A * C));
    if (discriminant < -discriminantTolerance) continue;
    const rootTerm = Math.sqrt(Math.max(0, discriminant));
    const candidates = rootTerm <= Math.sqrt(discriminantTolerance)
      ? [-B / (2 * A)]
      : [(-B - rootTerm) / (2 * A), (-B + rootTerm) / (2 * A)];
    for (const candidate of candidates) {
      const flowTolerance = Math.max(1e-10, Math.max(Math.abs(q0), Math.abs(q1)) * 1e-9);
      if (candidate < q0 - flowTolerance || candidate > q1 + flowTolerance) continue;
      const bounded = Math.min(q1, Math.max(q0, candidate));
      const residual = diff(bounded);
      const headScale = Math.max(1, Math.abs(interpolate(points, bounded, 'head_m')), Math.abs(systemHead(bounded, system)));
      if (Math.abs(residual) <= 1e-8 * headScale) roots.push(bounded);
    }
  }
  const uniqueRoots = roots.filter((q, i) => roots.findIndex(x => Math.abs(x - q) <= Math.max(1e-10, Math.max(Math.abs(x), Math.abs(q)) * 1e-9)) === i)
    .sort((a, b) => a - b);
  if (!uniqueRoots.length) throw new RangeError('No pump/system intersection exists within the supplied manufacturer pump-curve flow range; do not extrapolate the curve');
  const q = uniqueRoots[0], h = systemHead(q, system);
  const efficiency = interpolate(points, q, 'efficiency_pct');
  const npshr = interpolate(points, q, 'npshr_m');
  const vendorPower = interpolate(points, q, 'shaft_power_kW');
  const hydraulicPower_kW = rho * g * q * h / 1000;
  const estimatedShaftPower_kW = efficiency === null || efficiency <= 0 ? null : hydraulicPower_kW / (efficiency / 100);
  const motorEfficiency = input.motorEfficiency_pct === undefined ? null : finite(input.motorEfficiency_pct, 'motorEfficiency_pct');
  if (motorEfficiency !== null && !(motorEfficiency > 0 && motorEfficiency <= 100)) throw new RangeError('Motor efficiency must be greater than 0 and at most 100 percent');
  const motorPowerBasis = estimatedShaftPower_kW !== null ? 'calculated from interpolated pump efficiency' : vendorPower !== null ? 'calculated from manufacturer shaft-power curve' : null;
  const shaftPowerForMotor_kW = estimatedShaftPower_kW !== null ? estimatedShaftPower_kW : vendorPower;
  const motorInputPower_kW = shaftPowerForMotor_kW === null || motorEfficiency === null ? null : shaftPowerForMotor_kW / (motorEfficiency / 100);
  const efficiencyPoints = points.filter(p => p.efficiency_pct !== undefined && p.efficiency_pct > 0);\n  const bep = efficiencyPoints.length ? efficiencyPoints.reduce((best, p) => p.efficiency_pct > best.efficiency_pct ? p : best) : null;
  const npsha = input.npsha_m === undefined ? null : finite(input.npsha_m, 'npsha_m');
  if (npsha !== null && npsha < 0) throw new RangeError('NPSHa cannot be negative');
  const warnings = [];
  if (staticHead < 0) warnings.push('System static head is negative; confirm the source/destination pressure and elevation datum. The static contribution assists flow.');\n  if (efficiency !== null && efficiency <= 0) warnings.push('Pump efficiency is zero at the operating point; efficiency-based shaft power is undefined. Use manufacturer shaft-power data.');\n  if (points.some(p => p.efficiency_pct !== undefined) && !bep) warnings.push('No positive efficiency values were supplied; BEP cannot be identified.');\n  if (uniqueRoots.length > 1) warnings.push('Multiple pump/system intersections were found; review the full pump curve and system configuration.');
  if (q < minQ || q > maxQ) warnings.push('Operating point is outside manufacturer curve data; extrapolation is not permitted.');
  if (bep) {
    const ratio = q / bep.flow_m3_s;
    if (ratio < 0.8 || ratio > 1.2) warnings.push('Operating flow is more than 20% away from the supplied BEP flow; check manufacturer preferred/allowable operating regions. The 20% value is a screening flag, not a universal acceptance criterion.');
  }
  if (npsha !== null && npshr !== null && npsha < npshr) warnings.push('NPSHa is below interpolated NPSHr; inadequate NPSH margin / cavitation risk requires review.');
  if (npsha !== null && npshr === null) warnings.push('NPSHa was entered but no complete NPSHr curve was supplied; NPSH margin cannot be evaluated.');
  if (efficiency === null && vendorPower === null) warnings.push('No complete pump efficiency or shaft-power curve was supplied; shaft and motor power cannot be determined.');
  if (vendorPower !== null && estimatedShaftPower_kW !== null && Math.abs(vendorPower - estimatedShaftPower_kW) / Math.max(vendorPower, 1e-9) > 0.1) warnings.push('Interpolated vendor shaft power differs from power estimated using hydraulic power and pump efficiency by more than 10%; reconcile manufacturer data.');
  const systemCurve = Array.from({ length: 21 }, (_, i) => {
    const flow = maxQ * i / 20;
    return { flow_m3_s: flow, systemHead_m: systemHead(flow, system), pumpHead_m: flow < minQ ? null : interpolate(points, flow, 'head_m') };
  });
  return {
    model: 'Centrifugal pump curve and quadratic system curve operating-point analysis',
    basis: 'SI', pumpMetadata, interpolation: 'Piecewise linear manufacturer curve; system curve H = Hstatic + Ksys Q²',
    systemCurve: system, operatingPoint: {
      flow_m3_s: q, flow_m3_h: q * 3600, head_m: h, differentialPressure_kPa: rho * g * h / 1000,
      efficiency_pct: efficiency, hydraulicPower_kW, estimatedShaftPower_kW,
      vendorShaftPower_kW: vendorPower, motorInputPower_kW, motorInputPowerBasis: motorPowerBasis, npsha_m: npsha, npshr_m: npshr,
      npshMargin_m: npsha !== null && npshr !== null ? npsha - npshr : null
    },
    bep: bep ? { flow_m3_s: bep.flow_m3_s, flow_m3_h: bep.flow_m3_s * 3600, head_m: bep.head_m, efficiency_pct: bep.efficiency_pct } : null,
    intersections: uniqueRoots.map(flow => ({ flow_m3_s: flow, flow_m3_h: flow * 3600, head_m: systemHead(flow, system) })),
    selectedIntersectionPolicy: uniqueRoots.length > 1 ? 'Lowest-flow intersection shown provisionally; engineering review required.' : 'Only intersection within supplied curve range.',
    pumpCurve: points, systemCurvePoints: systemCurve, intersectionsFound: uniqueRoots.length, warnings
  };
}
if (typeof module !== 'undefined' && module.exports) module.exports = { calculatePumpOperatingPoint, validateCurve, interpolate };
if (typeof window !== 'undefined') window.PumpHydraulicsV53 = { calculatePumpOperatingPoint };
