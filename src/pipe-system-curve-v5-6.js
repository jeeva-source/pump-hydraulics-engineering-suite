'use strict';

/**
 * V5.6 pipe-derived system curve.
 * Couples the V5.1.1 serial-path hydraulic engine to manufacturer pump data.
 * SI only; steady, incompressible, single-phase Newtonian liquid.
 */
const V51 = typeof module !== 'undefined' && module.exports
  ? require('./hydraulics-v5-1')
  : (typeof window !== 'undefined' ? window.PumpHydraulicsV51 : null);
const V53 = typeof module !== 'undefined' && module.exports
  ? require('./pump-performance-v5-3')
  : (typeof window !== 'undefined' ? window.PumpHydraulicsV53 : null);
if (!V51 || !V53) throw new Error('V5.1 and V5.3 engines must be loaded before V5.6');

function finite(value, name) {
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) throw new TypeError(name + ' is required');
  if (typeof value === 'string' && !/^[+-]?(?:\d+\\.?\d*|\\.\d+)(?:[eE][+-]?\d+)?$/.test(value.trim())) throw new TypeError(name + ' must be a decimal number');
  const n = Number(value);
  if (!Number.isFinite(n)) throw new TypeError(name + ' must be finite');
  return n;
}
function calculatePipeDerivedSystemCurve(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Input object is required');
  const hydraulic = input.hydraulicInput;
  if (!hydraulic || typeof hydraulic !== 'object' || Array.isArray(hydraulic)) throw new TypeError('hydraulicInput is required');
  if (!Array.isArray(hydraulic.segments) || hydraulic.segments.length < 1) throw new RangeError('At least one serial pipe segment is required');
  const rho = finite(hydraulic.density, 'hydraulicInput.density');
  const pump = V53.validateCurve(input.pumpCurve);
  const sampleCount = input.sampleCount === undefined ? 101 : finite(input.sampleCount, 'sampleCount');
  if (!Number.isInteger(sampleCount) || sampleCount < 21 || sampleCount > 501) throw new RangeError('sampleCount must be an integer from 21 to 501');
  if (!(rho > 0)) throw new RangeError('Liquid density must be greater than zero');

  // V5.1 treats equipment pressure drop as a fixed entered value, not a
  // flow-dependent equipment curve. Reject it here rather than silently
  // carrying a constant drop across every generated flow case.
  hydraulic.segments.forEach((segment, i) => {
    const dp = segment && segment.equipmentPressureDrop;
    if (dp !== undefined && dp !== null && finite(dp, 'segment ' + (i + 1) + ' equipmentPressureDrop') !== 0) {
      throw new RangeError('V5.6 does not accept fixed equipment pressure drops. Add a validated flow-dependent equipment model in a future release or omit this fixed drop.');
    }
  });

  const atFlow = q => V51.calculateMultiSegment({ ...hydraulic, flow: q, flowUnit: 'm3/s' });
  const zeroFlow = atFlow(0);
  const staticHead = zeroFlow.total_required_head_m;
  const qMin = pump[0].flow_m3_s, qMax = pump[pump.length - 1].flow_m3_s;
  const points = [];
  for (let i = 0; i < sampleCount; i++) {
    const q = qMax * i / (sampleCount - 1);
    const result = atFlow(q);
    points.push({
      flow_m3_s: q,
      systemHead_m: result.total_required_head_m,
      majorLossHead_m: result.total_major_loss_head_m,
      minorLossHead_m: result.total_minor_loss_head_m,
      elevationHead_m: result.total_elevation_change_m,
      pressureBoundaryHead_m: result.pressure_boundary_head_m,
      hydraulicWarnings: result.warnings
    });
  }

  const qNodes = [...new Set([
    ...points.map(p => p.flow_m3_s),
    ...pump.map(p => p.flow_m3_s)
  ])].sort((a, b) => a - b).filter(q => q >= qMin && q <= qMax);
  const residual = q => V53.interpolate(pump, q, 'head_m') - atFlow(q).total_required_head_m;
  const roots = [];
  const rootTolerance = 1e-10;
  const addRoot = q => {
    if (!roots.some(x => Math.abs(x - q) <= Math.max(1e-10, Math.abs(q) * 1e-8))) roots.push(q);
  };
  for (let i = 0; i < qNodes.length; i++) {
    const qa = qNodes[i], fa = residual(qa);
    if (Math.abs(fa) <= rootTolerance * Math.max(1, Math.abs(fa))) addRoot(qa);
    if (i === qNodes.length - 1) continue;
    const qb = qNodes[i + 1], fb = residual(qb);
    if (fa * fb < 0) {
      let lo = qa, hi = qb, flo = fa;
      for (let j = 0; j < 70; j++) {
        const mid = (lo + hi) / 2, fm = residual(mid);
        if (Math.abs(fm) < 1e-11 || hi - lo < Math.max(1e-12, Math.abs(mid) * 1e-10)) { lo = hi = mid; break; }
        if (flo * fm <= 0) hi = mid;
        else { lo = mid; flo = fm; }
      }
      addRoot((lo + hi) / 2);
    }
  }
  roots.sort((a, b) => a - b);
  if (!roots.length) throw new RangeError('No pump/system intersection exists within the manufacturer curve flow range. Check the pipe data and pump selection; extrapolation is not permitted.');

  const q = roots[0], hydraulicResult = atFlow(q);
  const h = hydraulicResult.total_required_head_m;
  const efficiency = V53.interpolate(pump, q, 'efficiency_pct');
  const npshr = V53.interpolate(pump, q, 'npshr_m');
  const vendorPower = V53.interpolate(pump, q, 'shaft_power_kW');
  const g = hydraulic.gravity === undefined ? 9.80665 : finite(hydraulic.gravity, 'hydraulicInput.gravity');
  const hydraulicPower = rho * g * q * h / 1000;
  const shaftPower = efficiency !== null && efficiency > 0 ? hydraulicPower / (efficiency / 100) : vendorPower;
  const motorEfficiency = input.motorEfficiency_pct === undefined ? null : finite(input.motorEfficiency_pct, 'motorEfficiency_pct');
  if (motorEfficiency !== null && !(motorEfficiency > 0 && motorEfficiency <= 100)) throw new RangeError('motorEfficiency_pct must be greater than 0 and at most 100');
  const motorInput = shaftPower === null || motorEfficiency === null ? null : shaftPower / (motorEfficiency / 100);
  const npsha = input.npsha_m === undefined ? null : finite(input.npsha_m, 'npsha_m');
  if (npsha !== null && npsha < 0) throw new RangeError('npsha_m cannot be negative');
  const bepPoints = pump.filter(p => p.efficiency_pct !== undefined && p.efficiency_pct > 0);
  const bep = bepPoints.length ? bepPoints.reduce((a, b) => b.efficiency_pct > a.efficiency_pct ? b : a) : null;
  const warnings = [...new Set(points.flatMap(p => p.hydraulicWarnings || []))];
  if (roots.length > 1) warnings.push('Multiple pump/system intersections were found; the lowest-flow intersection is displayed provisionally. Review stability and the complete operating envelope.');
  if (npsha !== null && npshr !== null && npsha < npshr) warnings.push('Entered NPSHa is below interpolated manufacturer NPSHr; review NPSH margin.');
  if (npsha !== null && npshr === null) warnings.push('NPSHa was entered but a complete manufacturer NPSHr curve was not supplied.');
  if (efficiency === null && vendorPower === null) warnings.push('Pump efficiency and manufacturer shaft-power data are unavailable at the operating point.');
  if (bep && (q / bep.flow_m3_s < 0.8 || q / bep.flow_m3_s > 1.2)) warnings.push('Operating flow is more than 20% from supplied BEP flow; screening flag only, not a universal acceptance criterion.');
  if (points.some(p => p.systemHead_m < 0)) warnings.push('Generated system curve includes negative required head at one or more flows; confirm datum and pressure boundary sign convention.');
  return {
    version: '5.6.0',
    model: 'V5.1 serial pipe hydraulics sampled into a pipe-derived system curve',
    basis: 'SI',
    systemCurveBasis: 'Each point is recalculated by V5.1.1 using Darcy-Weisbach, Churchill friction, segment K, elevation and supplied absolute pressure boundaries; no quadratic fit is applied.',
    staticHead_m: staticHead,
    flowRange_m3_s: { minimumManufacturerFlow: qMin, maximumManufacturerFlow: qMax },
    systemCurvePoints: points.map(({ hydraulicWarnings, ...p }) => p),
    operatingPoint: {
      flow_m3_s: q, flow_m3_h: q * 3600, head_m: h,
      efficiency_pct: efficiency, hydraulicPower_kW: hydraulicPower,
      estimatedShaftPower_kW: efficiency !== null && efficiency > 0 ? hydraulicPower / (efficiency / 100) : null,
      vendorShaftPower_kW: vendorPower,
      selectedShaftPower_kW: shaftPower, motorInputPower_kW: motorInput,
      npsha_m: npsha, npshr_m: npshr, npshMargin_m: npsha !== null && npshr !== null ? npsha - npshr : null,
      hydraulicBreakdown: {
        majorLossHead_m: hydraulicResult.total_major_loss_head_m,
        minorLossHead_m: hydraulicResult.total_minor_loss_head_m,
        equipmentLossHead_m: hydraulicResult.total_equipment_loss_head_m,
        elevationHead_m: hydraulicResult.total_elevation_change_m,
        pressureBoundaryHead_m: hydraulicResult.pressure_boundary_head_m
      }
    },
    bep: bep ? { flow_m3_s: bep.flow_m3_s, flow_m3_h: bep.flow_m3_s * 3600, head_m: bep.head_m, efficiency_pct: bep.efficiency_pct } : null,
    intersections: roots.map(flow => ({ flow_m3_s: flow, flow_m3_h: flow * 3600, head_m: atFlow(flow).total_required_head_m })),
    intersectionsFound: roots.length,
    selectedIntersectionPolicy: roots.length > 1 ? 'Lowest-flow intersection shown provisionally; engineering review required.' : 'Only intersection found within supplied manufacturer curve range.',
    warnings
  };
}
if (typeof module !== 'undefined' && module.exports) module.exports = { calculatePipeDerivedSystemCurve };
if (typeof window !== 'undefined') window.PumpHydraulicsV56 = { calculatePipeDerivedSystemCurve };
