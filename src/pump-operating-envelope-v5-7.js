'use strict';

/**
 * V5.7 multi-case pump operating envelope.
 * Runs each defined plant case against one supplied manufacturer pump curve
 * and the V5.6 pipe-derived hydraulic system curve. SI units only.
 *
 * Each case must provide its own complete V5.1 hydraulicInput. NPSHa,
 * project margin and vendor operating limits are case-specific optional data.
 * No missing vendor limits or suction data are inferred.
 */
const V56 = typeof module !== 'undefined' && module.exports
  ? require('./pipe-system-curve-v5-6')
  : (typeof window !== 'undefined' ? window.PumpHydraulicsV56 : null);
const V54 = typeof module !== 'undefined' && module.exports
  ? require('./pump-selection-v5-4')
  : (typeof window !== 'undefined' ? window.PumpHydraulicsV54 : null);
if (!V56 || !V54) throw new Error('V5.4 and V5.6 engines must be loaded before V5.7');

function finite(value, name) {
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
    throw new TypeError(name + ' is required');
  }
  if (typeof value === 'string' && !/^[+-]?(?:\\d+\\.?\\d*|\\.\\d+)(?:[eE][+-]?\\d+)?$/.test(value.trim())) {
    throw new TypeError(name + ' must be a decimal number');
  }
  const n = Number(value);
  if (!Number.isFinite(n)) throw new TypeError(name + ' must be finite');
  return n;
}

function assessCase(caseInput, pumpCurve, index, defaults) {
  const caseId = caseInput.id === undefined || caseInput.id === null || String(caseInput.id).trim() === ''
    ? 'case-' + (index + 1) : String(caseInput.id).trim();
  const name = caseInput.name === undefined || String(caseInput.name).trim() === ''
    ? 'Operating case ' + (index + 1) : String(caseInput.name).trim();
  try {
    const npsha = caseInput.npsha_m === undefined || caseInput.npsha_m === null || caseInput.npsha_m === ''
      ? undefined : finite(caseInput.npsha_m, caseId + '.npsha_m');
    if (npsha !== undefined && npsha < 0) throw new RangeError(caseId + '.npsha_m cannot be negative');
    const requiredMargin = caseInput.requiredNpshMargin_m === undefined || caseInput.requiredNpshMargin_m === null || caseInput.requiredNpshMargin_m === ''
      ? null : finite(caseInput.requiredNpshMargin_m, caseId + '.requiredNpshMargin_m');
    if (requiredMargin !== null && requiredMargin < 0) throw new RangeError(caseId + '.requiredNpshMargin_m cannot be negative');
    const vendorLimits = caseInput.vendorLimits === undefined ? defaults.vendorLimits : caseInput.vendorLimits;
    const result = V56.calculatePipeDerivedSystemCurve({
      hydraulicInput: caseInput.hydraulicInput,
      pumpCurve,
      npsha_m: npsha,
      motorEfficiency_pct: caseInput.motorEfficiency_pct === undefined ? defaults.motorEfficiency_pct : caseInput.motorEfficiency_pct,
      sampleCount: caseInput.sampleCount === undefined ? defaults.sampleCount : caseInput.sampleCount
    });
    const q = result.operatingPoint.flow_m3_s;
    const vendor = V54.evaluateVendorOperatingLimits(q, vendorLimits);
    const npshr = result.operatingPoint.npshr_m;
    const npshMargin = npsha !== undefined && npshr !== null ? npsha - npshr : null;
    let npshStatus = 'incomplete_data';
    if (npsha !== undefined && npshr !== null) {
      if (npshMargin < 0) npshStatus = 'below_npshr';
      else if (requiredMargin !== null && npshMargin < requiredMargin) npshStatus = 'below_project_margin';
      else if (requiredMargin !== null) npshStatus = 'meets_project_margin';
      else npshStatus = 'meets_npshr_project_margin_not_set';
    }
    const failedChecks = [];
    const incompleteChecks = [];
    if (npshStatus === 'below_npshr' || npshStatus === 'below_project_margin') failedChecks.push('NPSH');
    else if (npshStatus !== 'meets_project_margin') incompleteChecks.push('NPSH / project margin');
    if (vendor.aorStatus === 'outside_range' || vendor.mcsfStatus === 'below_mcsf' || vendor.runoutStatus === 'above_runout') {
      failedChecks.push('Manufacturer operating limit');
    }
    if (vendor.aorStatus === 'not_supplied' || vendor.mcsfStatus === 'not_supplied' || vendor.runoutStatus === 'not_supplied') {
      incompleteChecks.push('AOR / MCSF / runout limits');
    }
    if (vendor.porStatus === 'not_supplied') incompleteChecks.push('POR');
    const status = failedChecks.length ? 'does_not_meet_supplied_criteria'
      : incompleteChecks.length ? 'incomplete_data_or_criteria' : 'meets_supplied_criteria';
    const warnings = [...result.warnings, ...vendor.warnings];
    if (npsha === undefined) warnings.push('NPSHa was not supplied for this case; NPSH margin has not been assessed.');
    else if (npshr === null) warnings.push('NPSHa was supplied but manufacturer NPSHr is unavailable at the operating point.');
    if (requiredMargin === null && npsha !== undefined && npshr !== null) warnings.push('No project-required NPSH margin was supplied; only NPSHa versus NPSHr is compared.');
    return {
      id: caseId, name, status, failedChecks, incompleteChecks,
      operatingPoint: result.operatingPoint,
      bep: result.bep,
      npsh: {
        available_m: npsha === undefined ? null : npsha,
        required_m: npshr,
        margin_m: npshMargin,
        requiredProjectMargin_m: requiredMargin,
        status: npshStatus
      },
      vendorOperatingLimits: vendor,
      intersectionsFound: result.intersectionsFound,
      selectedIntersectionPolicy: result.selectedIntersectionPolicy,
      warnings: [...new Set(warnings)]
    };
  } catch (error) {
    return {
      id: caseId, name, status: 'calculation_error',
      failedChecks: [], incompleteChecks: [],
      operatingPoint: null, bep: null, npsh: null, vendorOperatingLimits: null,
      intersectionsFound: 0, selectedIntersectionPolicy: null,
      warnings: [], error: error && error.message ? error.message : String(error)
    };
  }
}

function calculatePumpOperatingEnvelope(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Input object is required');
  const pumpCurve = input.pumpCurve;
  // Validate shared manufacturer data once before evaluating individual cases.
  const V53 = typeof module !== 'undefined' && module.exports
    ? require('./pump-performance-v5-3')
    : (typeof window !== 'undefined' ? window.PumpHydraulicsV53 : null);
  if (!V53) throw new Error('V5.3 pump engine must be loaded before V5.7');
  const validatedCurve = V53.validateCurve(pumpCurve);
  if (!Array.isArray(input.cases) || input.cases.length < 2) throw new RangeError('At least two operating cases are required for an operating envelope');
  const ids = new Set();
  input.cases.forEach((c, i) => {
    if (!c || typeof c !== 'object' || Array.isArray(c)) throw new TypeError('Case ' + (i + 1) + ' must be an object');
    if (c.id !== undefined && c.id !== null && String(c.id).trim() !== '') {
      const id = String(c.id).trim();
      if (ids.has(id)) throw new RangeError('Operating case IDs must be unique: ' + id);
      ids.add(id);
    }
    if (!c.hydraulicInput || typeof c.hydraulicInput !== 'object' || Array.isArray(c.hydraulicInput)) {
      throw new TypeError('Case ' + (i + 1) + ' requires a hydraulicInput object');
    }
  });
  const defaults = {
    vendorLimits: input.vendorLimits === undefined ? {} : input.vendorLimits,
    motorEfficiency_pct: input.motorEfficiency_pct,
    sampleCount: input.sampleCount
  };
  // Validate shared defaults even if a case later fails for an unrelated reason.
  if (defaults.motorEfficiency_pct !== undefined && defaults.motorEfficiency_pct !== null) {
    const eta = finite(defaults.motorEfficiency_pct, 'motorEfficiency_pct');
    if (!(eta > 0 && eta <= 100)) throw new RangeError('motorEfficiency_pct must be greater than 0 and at most 100');
  }
  const cases = input.cases.map((c, i) => assessCase(c, validatedCurve, i, defaults));
  const counts = {
    total: cases.length,
    passed: cases.filter(c => c.status === 'meets_supplied_criteria').length,
    failed: cases.filter(c => c.status === 'does_not_meet_supplied_criteria').length,
    incomplete: cases.filter(c => c.status === 'incomplete_data_or_criteria').length,
    calculationErrors: cases.filter(c => c.status === 'calculation_error').length
  };
  const status = counts.calculationErrors ? 'calculation_errors'
    : counts.failed ? 'one_or_more_cases_fail'
    : counts.incomplete ? 'incomplete_data_or_criteria' : 'all_cases_meet_supplied_criteria';
  return {
    version: '5.7.0',
    model: 'Multi-case pump operating envelope using pipe-derived system curves',
    basis: 'SI',
    pumpCurveBasis: 'One common, user-supplied manufacturer/test pump curve is applied to each operating case; no extrapolation is permitted.',
    caseMethod: 'Each case is independently recalculated through the V5.6 V5.1.1 serial-pipe hydraulic engine. Case-specific fluid properties, geometry, elevations and pressure boundaries belong in that case hydraulicInput.',
    summary: { status, counts },
    cases,
    limitations: [
      'This release evaluates independent serial pipe paths; branched network/pump coupling is not included.',
      'All cases use the same supplied pump curve; speed/impeller changes require separately supplied, validated manufacturer curves.',
      'NPSHa is accepted as a case-specific entered value; this module does not derive suction NPSHa from source conditions.',
      'AOR, MCSF, runout, POR and project NPSH margin are evaluated only when supplied; missing limits are reported as incomplete, never inferred.',
      'The lowest-flow intersection is provisional when multiple intersections exist; stability is not determined.',
      'Steady, incompressible, single-phase Newtonian liquid only; no transient, two-phase, compressible, CFD or certified standards assessment.'
    ]
  };
}

if (typeof module !== 'undefined' && module.exports) module.exports = { calculatePumpOperatingEnvelope };
if (typeof window !== 'undefined') window.PumpHydraulicsV57 = { calculatePumpOperatingEnvelope };
