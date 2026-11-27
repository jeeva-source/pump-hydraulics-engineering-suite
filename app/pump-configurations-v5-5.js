'use strict';

/**
 * V5.5 pump arrangement and speed-case engine.
 * Reuses the V5.3 manufacturer-curve operating-point solver.
 * Identical pumps only; SI units; no curve extrapolation.
 *
 * Reference concepts reviewed: MIT-licensed pump-system-curve project
 * (see docs/OPEN_SOURCE_REFERENCE_REVIEW.md). This engine is an independent
 * implementation in the suite's existing V5.3/V5.4 architecture.
 */
const V53 = typeof module !== 'undefined' && module.exports
  ? require('./pump-performance-v5-3')
  : (typeof window !== 'undefined' ? window.PumpHydraulicsV53 : null);
if (!V53) throw new Error('V5.3 pump performance engine must be loaded before V5.5');

function finite(value, name) {
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
    throw new TypeError(name + ' is required');
  }
  if (typeof value === 'string' && !/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(value.trim())) {
    throw new TypeError(name + ' must be a decimal number');
  }
  const n = Number(value);
  if (!Number.isFinite(n)) throw new TypeError(name + ' must be finite');
  return n;
}

/**
 * Convert one reference-speed vendor curve into the equivalent curve for
 * identical pumps at a common speed:
 * speed: Q' = r Q; H' = r² H
 * series: Qtotal = Qsingle; Htotal = n Hsingle
 * parallel: Qtotal = n Qsingle; Htotal = Hsingle
 *
 * Efficiency is held at the vendor point as a screening approximation.
 * NPSHr and vendor shaft power are retained only at reference speed and
 * for one pump; they are omitted for changed speed/combined duty to avoid
 * presenting unverified scaling as manufacturer data.
 */
function transformPumpCurve(rawCurve, arrangement, count, speedRatio) {
  if (!Array.isArray(rawCurve) || rawCurve.length < 3) {
    throw new RangeError('pumpCurve requires at least three manufacturer data points');
  }
  const points = rawCurve.map((p, i) => {
    if (!p || typeof p !== 'object' || Array.isArray(p)) throw new TypeError('Pump curve point ' + i + ' must be an object');
    const q = finite(p.flow_m3_s, 'pumpCurve[' + i + '].flow_m3_s');
    const h = finite(p.head_m, 'pumpCurve[' + i + '].head_m');
    if (q < 0 || h <= 0) throw new RangeError('Pump curve flow must be non-negative and head must be positive');
    const out = { flow_m3_s: q, head_m: h };
    for (const field of ['efficiency_pct', 'npshr_m', 'shaft_power_kW']) {
      if (p[field] !== undefined && p[field] !== null) out[field] = finite(p[field], 'pumpCurve[' + i + '].' + field);
    }
    if (out.efficiency_pct !== undefined && !(out.efficiency_pct >= 0 && out.efficiency_pct <= 100)) throw new RangeError('Pump efficiency must be between 0 and 100 percent');
    if (out.npshr_m !== undefined && out.npshr_m < 0) throw new RangeError('NPSHr cannot be negative');
    if (out.shaft_power_kW !== undefined && out.shaft_power_kW < 0) throw new RangeError('Shaft power cannot be negative');
    return out;
  });
  for (let i = 1; i < points.length; i++) {
    if (!(points[i].flow_m3_s > points[i - 1].flow_m3_s)) throw new RangeError('Pump curve flow values must be strictly increasing');
  }
  for (const field of ['efficiency_pct', 'npshr_m', 'shaft_power_kW']) {
    const supplied = points.filter(p => p[field] !== undefined).length;
    if (supplied !== 0 && supplied !== points.length) throw new RangeError('If supplied, ' + field + ' must be present at every pump curve point');
  }

  return points.map(p => {
    const perPumpFlow = p.flow_m3_s * speedRatio;
    const perPumpHead = p.head_m * speedRatio * speedRatio;
    const totalFlow = arrangement === 'parallel' ? perPumpFlow * count : perPumpFlow;
    const totalHead = arrangement === 'series' ? perPumpHead * count : perPumpHead;
    const result = { flow_m3_s: totalFlow, head_m: totalHead };
    if (p.efficiency_pct !== undefined) result.efficiency_pct = p.efficiency_pct;
    if (speedRatio === 1 && count === 1) {
      if (p.npshr_m !== undefined) result.npshr_m = p.npshr_m;
      if (p.shaft_power_kW !== undefined) result.shaft_power_kW = p.shaft_power_kW;
    } else if (speedRatio === 1 && p.npshr_m !== undefined) {
      // NPSHr is a per-pump value at branch flow. The transformed curve's
      // flow coordinate already represents total parallel flow.
      result.npshr_m = p.npshr_m;
    }
    return result;
  });
}

function analysePumpConfiguration(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Configuration input object is required');
  const arrangement = input.arrangement === undefined ? 'single' : input.arrangement;
  if (!['single', 'series', 'parallel'].includes(arrangement)) throw new RangeError('arrangement must be single, series or parallel');
  const count = input.pumpCount === undefined ? 1 : finite(input.pumpCount, 'pumpCount');
  if (!Number.isInteger(count) || count < 1 || count > 12) throw new RangeError('pumpCount must be an integer from 1 to 12');
  if (arrangement === 'single' && count !== 1) throw new RangeError('Single-pump arrangement requires pumpCount = 1');
  const speedRatio = input.speedRatio === undefined ? 1 : finite(input.speedRatio, 'speedRatio');
  if (!(speedRatio > 0) || speedRatio > 2) throw new RangeError('speedRatio must be greater than zero and no more than 2.0');
  const density = finite(input.density_kg_m3, 'density_kg_m3');
  if (!(density > 0)) throw new RangeError('density_kg_m3 must be greater than zero');
  const systemCurve = input.systemCurve;
  if (!systemCurve || typeof systemCurve !== 'object' || Array.isArray(systemCurve)) throw new TypeError('systemCurve is required');
  const transformedCurve = transformPumpCurve(input.pumpCurve, arrangement, count, speedRatio);
  const motorEfficiency = input.motorEfficiency_pct === undefined || input.motorEfficiency_pct === null || input.motorEfficiency_pct === ''
    ? null : finite(input.motorEfficiency_pct, 'motorEfficiency_pct');
  if (motorEfficiency !== null && !(motorEfficiency > 0 && motorEfficiency <= 100)) throw new RangeError('motorEfficiency_pct must be greater than 0 and at most 100');

  const result = V53.calculatePumpOperatingPoint({
    density_kg_m3: density,
    gravity_m_s2: input.gravity_m_s2,
    motorEfficiency_pct: motorEfficiency === null ? undefined : motorEfficiency,
    systemCurve,
    pumpCurve: transformedCurve,
    pumpMetadata: input.pumpMetadata || {}
  });
  const op = result.operatingPoint;
  const totalShaft = op.estimatedShaftPower_kW !== null ? op.estimatedShaftPower_kW
    : op.vendorShaftPower_kW !== null ? op.vendorShaftPower_kW : null;
  const perPumpShaft = totalShaft === null ? null : totalShaft / count;
  const perPumpMotorInput = perPumpShaft === null || motorEfficiency === null
    ? null : perPumpShaft / (motorEfficiency / 100);
  const warnings = [...result.warnings];
  if (speedRatio !== 1) {
    warnings.push('Speed-adjusted curve uses affinity-law Q and H scaling. Efficiency is held constant as a screening approximation. Manufacturer NPSHr and shaft-power data are not scaled; obtain vendor curves at the selected speed for final verification.');
  }
  if (count > 1) {
    warnings.push('Arrangement assumes identical pumps with equal performance and equal load sharing. Verify manifold/header losses, check valves, isolation, minimum flow and vendor operating limits separately.');
  }
  if (arrangement === 'series' && count > 1) {
    warnings.push('Series arrangement NPSH review must check the first pump suction condition and interstage pressure/temperature; this module does not calculate interstage NPSHa.');
  }
  if (arrangement === 'parallel' && count > 1) {
    warnings.push('Parallel arrangement assumes equal flow split. Real branch resistance and pump mismatch can produce unequal flow; use a connected network model for detailed balancing.');
  }
  return {
    model: 'Identical-pump arrangement using transformed manufacturer curve and V5.3 system intersection solver',
    basis: 'SI',
    configuration: { arrangement, pumpCount: count, speedRatio, speedBasis: input.pumpMetadata?.ratedSpeed_rpm ? 'ratio to manufacturer rated speed' : 'ratio to entered reference curve speed' },
    transformedPumpCurve: transformedCurve,
    operatingPoint: {
      ...op,
      totalShaftPower_kW: totalShaft,
      perPumpShaftPower_kW: perPumpShaft,
      totalMotorInputPower_kW: op.motorInputPower_kW,
      perPumpMotorInputPower_kW: perPumpMotorInput,
      perPumpHydraulicPower_kW: op.hydraulicPower_kW / count
    },
    bep: result.bep,
    intersections: result.intersections,
    intersectionsFound: result.intersectionsFound,
    selectedIntersectionPolicy: result.selectedIntersectionPolicy,
    systemCurve: result.systemCurve,
    warnings
  };
}

if (typeof module !== 'undefined' && module.exports) module.exports = { analysePumpConfiguration, transformPumpCurve };
if (typeof window !== 'undefined') window.PumpHydraulicsV55 = { analysePumpConfiguration };
