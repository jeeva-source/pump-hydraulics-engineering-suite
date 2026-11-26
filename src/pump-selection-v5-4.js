'use strict';

/**
 * V5.4 pump selection and NPSH assessment.
 * SI-only inputs. Uses the V5.3 pump curve/system operating-point engine.
 * Vendor operating limits and project NPSH margin criteria are never inferred.
 */
const V53 = typeof module !== 'undefined' && module.exports
  ? require('./pump-performance-v5-3')
  : (typeof window !== 'undefined' ? window.PumpHydraulicsV53 : null);
if (!V53) throw new Error('V5.3 pump performance engine must be loaded before V5.4');

const G = 9.80665;
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
function optionalFinite(value, name) {
  return value === undefined || value === null || value === '' ? null : finite(value, name);
}

/**
 * Bernoulli from a large source vessel/free surface to the pump suction flange:
 * NPSHa = (Psource_abs - Pvap)/(rho*g) + (zsource - zpump)
 *         + Vsource^2/(2*g) - hL,suction.
 * Pressure is absolute; elevations share one datum; suction losses are total head.
 */
function calculateNpsha(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Suction conditions object is required');
  const rho = finite(input.density_kg_m3, 'density_kg_m3');
  const g = input.gravity_m_s2 === undefined ? G : finite(input.gravity_m_s2, 'gravity_m_s2');
  const pSource = finite(input.sourcePressureAbs_Pa, 'sourcePressureAbs_Pa');
  const pVapour = finite(input.vapourPressure_Pa, 'vapourPressure_Pa');
  const zSource = finite(input.sourceElevation_m, 'sourceElevation_m');
  const zPump = finite(input.pumpCenterlineElevation_m, 'pumpCenterlineElevation_m');
  const suctionLoss = finite(input.suctionLossHead_m, 'suctionLossHead_m');
  const sourceVelocity = input.sourceVelocity_m_s === undefined ? 0 : finite(input.sourceVelocity_m_s, 'sourceVelocity_m_s');
  if (!(rho > 0) || !(g > 0)) throw new RangeError('Density and gravity must be greater than zero');
  if (!(pSource > 0) || pVapour < 0) throw new RangeError('Source absolute pressure must be positive and vapour pressure cannot be negative');
  if (suctionLoss < 0 || sourceVelocity < 0) throw new RangeError('Suction loss and source velocity cannot be negative');
  const pressureHead = (pSource - pVapour) / (rho * g);
  const elevationHead = zSource - zPump;
  const sourceVelocityHead = sourceVelocity ** 2 / (2 * g);
  const npsha = pressureHead + elevationHead + sourceVelocityHead - suctionLoss;
  const warnings = [];
  if (pSource <= pVapour) warnings.push('Source absolute pressure is at or below liquid vapour pressure; the assumed source state is not a valid single-phase liquid condition.');
  if (npsha <= 0) warnings.push('Calculated NPSHa is zero or negative; the suction condition is physically unacceptable for normal pump operation.');
  return {
    npsha_m: npsha,
    components: {
      sourcePressureMinusVapourPressureHead_m: pressureHead,
      elevationContribution_m: elevationHead,
      sourceVelocityHead_m: sourceVelocityHead,
      suctionLossHead_m: suctionLoss
    },
    inputs: { density_kg_m3: rho, gravity_m_s2: g, sourcePressureAbs_Pa: pSource, vapourPressure_Pa: pVapour, sourceElevation_m: zSource, pumpCenterlineElevation_m: zPump, sourceVelocity_m_s: sourceVelocity, suctionLossHead_m: suctionLoss },
    equation: 'NPSHa = (Psource,abs - Pvap)/(rho*g) + (zsource - zpump) + Vsource^2/(2*g) - hL,suction',
    datum: 'Source elevation and pump centreline elevation must use the same datum.',
    warnings
  };
}

function validateVendorLimits(raw) {
  const x = raw || {};
  if (typeof x !== 'object' || Array.isArray(x)) throw new TypeError('vendorLimits must be an object');
  const out = {};
  for (const key of ['porMinFlow_m3_s', 'porMaxFlow_m3_s', 'aorMinFlow_m3_s', 'aorMaxFlow_m3_s', 'mcsfFlow_m3_s', 'runoutFlow_m3_s']) {
    out[key] = optionalFinite(x[key], 'vendorLimits.' + key);
    if (out[key] !== null && out[key] < 0) throw new RangeError('vendorLimits.' + key + ' cannot be negative');
  }
  if ((out.porMinFlow_m3_s === null) !== (out.porMaxFlow_m3_s === null)) throw new RangeError('Both POR minimum and maximum flows must be supplied together');
  if ((out.aorMinFlow_m3_s === null) !== (out.aorMaxFlow_m3_s === null)) throw new RangeError('Both AOR minimum and maximum flows must be supplied together');
  if (out.porMinFlow_m3_s !== null && !(out.porMinFlow_m3_s < out.porMaxFlow_m3_s)) throw new RangeError('POR minimum flow must be less than POR maximum flow');
  if (out.aorMinFlow_m3_s !== null && !(out.aorMinFlow_m3_s < out.aorMaxFlow_m3_s)) throw new RangeError('AOR minimum flow must be less than AOR maximum flow');
  if (out.porMinFlow_m3_s !== null && out.aorMinFlow_m3_s !== null &&
      (out.porMinFlow_m3_s < out.aorMinFlow_m3_s || out.porMaxFlow_m3_s > out.aorMaxFlow_m3_s)) {
    throw new RangeError('POR must be contained within AOR when both are supplied');
  }
  if (out.mcsfFlow_m3_s !== null && out.runoutFlow_m3_s !== null && out.mcsfFlow_m3_s > out.runoutFlow_m3_s) {
    throw new RangeError('MCSF flow cannot exceed runout flow');
  }
  return out;
}
function rangeStatus(q, min, max) {
  if (min === null || max === null) return 'not_supplied';
  return q >= min && q <= max ? 'within_range' : 'outside_range';
}
function evaluateVendorOperatingLimits(flow, rawLimits) {
  const limits = validateVendorLimits(rawLimits);
  const por = rangeStatus(flow, limits.porMinFlow_m3_s, limits.porMaxFlow_m3_s);
  const aor = rangeStatus(flow, limits.aorMinFlow_m3_s, limits.aorMaxFlow_m3_s);
  const mcsf = limits.mcsfFlow_m3_s === null ? 'not_supplied' : flow >= limits.mcsfFlow_m3_s ? 'at_or_above_mcsf' : 'below_mcsf';
  const runout = limits.runoutFlow_m3_s === null ? 'not_supplied' : flow <= limits.runoutFlow_m3_s ? 'at_or_below_runout' : 'above_runout';
  const warnings = [];
  if (por === 'outside_range') warnings.push('Duty flow is outside the manufacturer preferred operating region (POR).');
  if (aor === 'outside_range') warnings.push('Duty flow is outside the manufacturer allowable operating region (AOR).');
  if (mcsf === 'below_mcsf') warnings.push('Duty flow is below the manufacturer minimum continuous stable flow (MCSF).');
  if (runout === 'above_runout') warnings.push('Duty flow exceeds the manufacturer runout flow limit.');
  return { limits, porStatus: por, aorStatus: aor, mcsfStatus: mcsf, runoutStatus: runout, warnings };
}

function evaluatePumpSelection(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Pump selection input object is required');
  const density = finite(input.density_kg_m3, 'density_kg_m3');
  if (!(density > 0)) throw new RangeError('Density must be greater than zero');
  const operating = V53.calculatePumpOperatingPoint({
    density_kg_m3: density,
    gravity_m_s2: input.gravity_m_s2,
    pumpCurve: input.pumpCurve,
    systemCurve: input.systemCurve,
    pumpMetadata: input.pumpMetadata,
    motorEfficiency_pct: input.motorEfficiency_pct
  });
  const suction = input.suctionConditions ? calculateNpsha({ ...input.suctionConditions, density_kg_m3: density, gravity_m_s2: input.gravity_m_s2 }) : null;
  const npsha = suction ? suction.npsha_m : null;
  const npshr = operating.operatingPoint.npshr_m;
  const npshMargin = npsha !== null && npshr !== null ? npsha - npshr : null;
  const requiredMargin = input.projectCriteria ? optionalFinite(input.projectCriteria.requiredNpshMargin_m, 'projectCriteria.requiredNpshMargin_m') : null;
  if (requiredMargin !== null && requiredMargin < 0) throw new RangeError('Required NPSH margin cannot be negative');
  let npshStatus = 'not_evaluated';
  if (npsha !== null && npshr !== null) {
    if (npshMargin < 0) npshStatus = 'npsha_below_npshr';
    else if (requiredMargin !== null && npshMargin < requiredMargin) npshStatus = 'below_project_margin';
    else if (requiredMargin !== null) npshStatus = 'meets_project_margin';
    else npshStatus = 'npsha_at_or_above_npshr_project_margin_not_set';
  }
  const limits = evaluateVendorOperatingLimits(operating.operatingPoint.flow_m3_s, input.vendorLimits);
  const warnings = [...operating.warnings, ...(suction ? suction.warnings : []), ...limits.warnings];
  if (npsha !== null && npshr === null) warnings.push('NPSHa was calculated but no complete manufacturer NPSHr curve was supplied; NPSH margin cannot be evaluated.');
  if (npsha === null) warnings.push('Suction conditions were not supplied; NPSHa has not been calculated.');
  if (npshStatus === 'npsha_below_npshr') warnings.push('Calculated NPSHa is below manufacturer NPSHr.');
  if (npshStatus === 'below_project_margin') warnings.push('NPSH margin is below the user-specified project criterion.');
  const failed = [];
  const unknown = [];
  if (npshStatus === 'npsha_below_npshr' || npshStatus === 'below_project_margin') failed.push('NPSH');
  else if (npshStatus === 'not_evaluated' || npshStatus === 'npsha_at_or_above_npshr_project_margin_not_set') unknown.push('NPSH project margin / vendor curve completeness');
  if (limits.aorStatus === 'outside_range' || limits.mcsfStatus === 'below_mcsf' || limits.runoutStatus === 'above_runout') failed.push('Vendor operating limits');
  if (limits.aorStatus === 'not_supplied' || limits.mcsfStatus === 'not_supplied' || limits.runoutStatus === 'not_supplied') unknown.push('Vendor operating limits');
  if (limits.porStatus === 'not_supplied') unknown.push('Preferred operating region');
  const assessment = {
    status: failed.length ? 'does_not_meet_supplied_criteria' : unknown.length ? 'incomplete_data_or_criteria' : 'meets_supplied_criteria',
    failedChecks: failed,
    incompleteChecks: unknown,
    note: 'This assessment only evaluates supplied manufacturer limits and project criteria. It is not a universal pump acceptance or code-compliance determination.'
  };
  return {
    model: 'Steady-state centrifugal pump selection and suction NPSH screening',
    basis: 'SI',
    pumpMetadata: operating.pumpMetadata,
    operatingPoint: operating.operatingPoint,
    bep: operating.bep,
    pumpCurve: operating.pumpCurve,
    systemCurve: operating.systemCurve,
    intersections: operating.intersections,
    npsh: { available: suction, required_m: npshr, margin_m: npshMargin, requiredProjectMargin_m: requiredMargin, status: npshStatus },
    vendorOperatingLimits: limits,
    assessment,
    warnings,
    assumptions: [
      'Pump curve values are manufacturer/test data supplied by the user.',
      'System curve is the V5.3 quadratic approximation calibrated from a user-supplied design point.',
      'NPSHa uses source absolute pressure, source vapour pressure, common elevation datum, source velocity head and total suction-side head loss.',
      'NPSHr is interpolated from the supplied manufacturer curve; it is not estimated.',
      'POR, AOR, MCSF and runout limits are used only when supplied by the manufacturer.',
      'Required NPSH margin is a user/project criterion; no universal margin is assumed.',
      'Affinity corrections are approximate and are not applied automatically.'
    ]
  };
}

function comparePumpCandidates(input) {
  if (!input || typeof input !== 'object' || !Array.isArray(input.candidates) || input.candidates.length < 1) {
    throw new RangeError('At least one pump candidate is required');
  }
  const candidates = input.candidates.map((candidate, index) => {
    if (!candidate || typeof candidate !== 'object') return { index: index + 1, status: 'invalid_candidate', error: 'Candidate must be an object' };
    try {
      const result = evaluatePumpSelection({
        ...input,
        ...candidate,
        pumpMetadata: candidate.pumpMetadata || { manufacturer: candidate.manufacturer, model: candidate.model }
      });
      return { index: index + 1, manufacturer: result.pumpMetadata.manufacturer, model: result.pumpMetadata.model, assessment: result.assessment, operatingPoint: result.operatingPoint, npsh: result.npsh, vendorOperatingLimits: result.vendorOperatingLimits, warnings: result.warnings };
    } catch (error) {
      return { index: index + 1, manufacturer: candidate.manufacturer || null, model: candidate.model || null, status: 'calculation_error', error: error.message };
    }
  });
  return {
    model: 'Comparative pump selection screening',
    basis: 'SI',
    candidates,
    ranking: null,
    note: 'Candidates are not automatically ranked. Confirm identical duty basis, vendor curve revision, fluid basis and project acceptance criteria before selection.'
  };
}

function correctForSpeed(input) {
  const q1 = finite(input.referenceFlow_m3_s, 'referenceFlow_m3_s');
  const h1 = finite(input.referenceHead_m, 'referenceHead_m');
  const n1 = finite(input.referenceSpeed_rpm, 'referenceSpeed_rpm');
  const n2 = finite(input.newSpeed_rpm, 'newSpeed_rpm');
  const p1 = optionalFinite(input.referenceShaftPower_kW, 'referenceShaftPower_kW');
  if (q1 < 0 || h1 < 0 || !(n1 > 0) || !(n2 > 0) || (p1 !== null && p1 < 0)) throw new RangeError('Flow/head/power cannot be negative and speeds must be positive');
  const ratio = n2 / n1;
  return {
    speedRatio: ratio,
    flow_m3_s: q1 * ratio,
    head_m: h1 * ratio ** 2,
    shaftPower_kW: p1 === null ? null : p1 * ratio ** 3,
    efficiency_pct: null,
    method: 'Affinity laws for the same pump and impeller: Q ∝ N, H ∝ N², P ∝ N³.',
    warnings: ['Approximate similarity-law correction only. Confirm manufacturer limits, Reynolds/viscosity effects, motor loading, NPSHr and operating range at the new speed.']
  };
}
function correctForImpellerDiameter(input) {
  const q1 = finite(input.referenceFlow_m3_s, 'referenceFlow_m3_s');
  const h1 = finite(input.referenceHead_m, 'referenceHead_m');
  const d1 = finite(input.referenceImpellerDiameter_mm, 'referenceImpellerDiameter_mm');
  const d2 = finite(input.newImpellerDiameter_mm, 'newImpellerDiameter_mm');
  const p1 = optionalFinite(input.referenceShaftPower_kW, 'referenceShaftPower_kW');
  if (q1 < 0 || h1 < 0 || !(d1 > 0) || !(d2 > 0) || (p1 !== null && p1 < 0)) throw new RangeError('Flow/head/power cannot be negative and impeller diameters must be positive');
  const ratio = d2 / d1;
  return {
    impellerDiameterRatio: ratio,
    flow_m3_s: q1 * ratio,
    head_m: h1 * ratio ** 2,
    shaftPower_kW: p1 === null ? null : p1 * ratio ** 3,
    efficiency_pct: null,
    method: 'Approximate impeller trim similarity: Q ∝ D, H ∝ D², P ∝ D³.',
    warnings: ['Approximate impeller-diameter affinity only. Manufacturer trim curves or validated correction methods take precedence, especially for substantial diameter changes.']
  };
}

const api = { calculateNpsha, evaluateVendorOperatingLimits, evaluatePumpSelection, comparePumpCandidates, correctForSpeed, correctForImpellerDiameter };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
if (typeof window !== 'undefined') window.PumpHydraulicsV54 = api;
