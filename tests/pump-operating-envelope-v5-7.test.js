'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
assert.equal(fs.readFileSync(path.join(__dirname, '../src/pump-operating-envelope-v5-7.js'), 'utf8'), fs.readFileSync(path.join(__dirname, '../app/pump-operating-envelope-v5-7.js'), 'utf8'), 'V5.7 source and browser engine must match');
require('../src/hydraulics-v5');
const { calculatePumpOperatingEnvelope } = require('../src/pump-operating-envelope-v5-7');

const baseHydraulic = {
  density: 998, densityUnit: 'kg/m3', viscosity: 0.001, viscosityUnit: 'Pa.s',
  inletDiameter: 150, inletDiameterUnit: 'mm',
  segments: [
    { name: 'Suction', service: 'suction', diameter: 150, diameterUnit: 'mm', length: 12, lengthUnit: 'm', roughness: 0.045, roughnessUnit: 'mm', minorLossK: 2.5, elevationChange: 2, elevationChangeUnit: 'm' },
    { name: 'Discharge', service: 'discharge', diameter: 100, diameterUnit: 'mm', length: 85, lengthUnit: 'm', roughness: 0.045, roughnessUnit: 'mm', minorLossK: 8, elevationChange: 18, elevationChangeUnit: 'm' }
  ]
};
const pumpCurve = [
  { flow_m3_s: 0.005, head_m: 48, efficiency_pct: 45, npshr_m: 1.2, shaft_power_kW: 5 },
  { flow_m3_s: 0.015, head_m: 43, efficiency_pct: 70, npshr_m: 2, shaft_power_kW: 7 },
  { flow_m3_s: 0.025, head_m: 34, efficiency_pct: 82, npshr_m: 3, shaft_power_kW: 9 },
  { flow_m3_s: 0.035, head_m: 20, efficiency_pct: 72, npshr_m: 4, shaft_power_kW: 11 }
];
const limits = {
  porMinFlow_m3_s: 0.012, porMaxFlow_m3_s: 0.032,
  aorMinFlow_m3_s: 0.008, aorMaxFlow_m3_s: 0.034,
  mcsfFlow_m3_s: 0.006, runoutFlow_m3_s: 0.035
};
const cases = [
  { id: 'min', name: 'Minimum', hydraulicInput: { ...baseHydraulic, segments: baseHydraulic.segments.map(s => ({ ...s, length: s.length * 1.05 })) }, npsha_m: 5, requiredNpshMargin_m: 1, vendorLimits: limits },
  { id: 'normal', name: 'Normal', hydraulicInput: baseHydraulic, npsha_m: 6, requiredNpshMargin_m: 1, vendorLimits: limits },
  { id: 'max', name: 'Maximum', hydraulicInput: { ...baseHydraulic, density: 1000, viscosity: 0.0012, segments: baseHydraulic.segments.map(s => ({ ...s, minorLossK: s.minorLossK * 1.1 })) }, npsha_m: 7, requiredNpshMargin_m: 1, vendorLimits: limits }
];
const result = calculatePumpOperatingEnvelope({ pumpCurve, cases, motorEfficiency_pct: 94, sampleCount: 81 });
assert.equal(result.version, '5.7.0');
assert.equal(result.summary.counts.total, 3);
assert.equal(result.cases.length, 3);
assert.ok(result.cases.every(c => c.operatingPoint && c.operatingPoint.flow_m3_s > 0));
assert.ok(result.cases.every(c => c.operatingPoint.hydraulicPower_kW > 0));
assert.ok(result.cases.every(c => c.npsh.margin_m === c.npsh.available_m - c.npsh.required_m));
assert.ok(result.cases.every(c => c.vendorOperatingLimits.porStatus === 'within_range' || c.vendorOperatingLimits.porStatus === 'outside_range'));
assert.ok(result.cases.every(c => c.operatingPoint.motorInputPower_kW > c.operatingPoint.selectedShaftPower_kW));
assert.ok(['all_cases_meet_supplied_criteria', 'one_or_more_cases_fail', 'incomplete_data_or_criteria'].includes(result.summary.status));

const missing = calculatePumpOperatingEnvelope({
  pumpCurve, cases: cases.map(c => ({ id: c.id, name: c.name, hydraulicInput: c.hydraulicInput }))
});
assert.equal(missing.summary.status, 'incomplete_data_or_criteria');
assert.ok(missing.cases.every(c => c.status === 'incomplete_data_or_criteria'));
assert.ok(missing.cases.every(c => c.npsh.status === 'incomplete_data'));

const failed = calculatePumpOperatingEnvelope({
  pumpCurve,
  cases: cases.map((c, i) => ({ ...c, npsha_m: i === 1 ? 0.1 : c.npsha_m }))
});
assert.ok(failed.summary.counts.failed >= 1);
assert.ok(failed.summary.status === 'one_or_more_cases_fail');

const isolatedError = calculatePumpOperatingEnvelope({
  pumpCurve,
  cases: [cases[0], { ...cases[1], hydraulicInput: { ...baseHydraulic, segments: [] } }, cases[2]]
});
assert.equal(isolatedError.summary.counts.calculationErrors, 1);
assert.equal(isolatedError.cases[1].status, 'calculation_error');
assert.ok(isolatedError.cases[0].operatingPoint && isolatedError.cases[2].operatingPoint);

assert.throws(() => calculatePumpOperatingEnvelope({ pumpCurve, cases: [cases[0]] }), /At least two/);
assert.throws(() => calculatePumpOperatingEnvelope({ pumpCurve, cases: [cases[0], { ...cases[1], id: 'min' }] }), /unique/);
assert.throws(() => calculatePumpOperatingEnvelope({ pumpCurve: pumpCurve.slice(0, 2), cases }), /at least three/);
assert.throws(() => calculatePumpOperatingEnvelope({ pumpCurve, cases: [cases[0], { ...cases[1], hydraulicInput: null }] }), /requires a hydraulicInput/);
assert.throws(() => calculatePumpOperatingEnvelope({ pumpCurve, cases, motorEfficiency_pct: 101 }), /motorEfficiency_pct/);
const invalidMargin = calculatePumpOperatingEnvelope({ pumpCurve, cases: [{ ...cases[0], requiredNpshMargin_m: -1 }, cases[1]] });
assert.equal(invalidMargin.cases[0].status, 'calculation_error');
assert.match(invalidMargin.cases[0].error, /cannot be negative/);
const page = fs.readFileSync(path.join(__dirname, '../app/pump-operating-envelope-v5-7.html'), 'utf8');
assert.ok(page.includes('pump-operating-envelope-v5-7.js'));
const inlineScripts = [...page.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].filter(match => !match[0].startsWith('<script src='));
assert.equal(inlineScripts.length, 1, 'V5.7 workspace should have one inline controller script');
for (const script of inlineScripts) new vm.Script(script[2], { filename: 'pump-operating-envelope-v5-7.html' });
console.log('V5.7 multi-case pump operating envelope tests passed');
