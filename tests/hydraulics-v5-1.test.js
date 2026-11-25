'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
assert.equal(fs.readFileSync(path.join(__dirname, '../src/hydraulics-v5.js'), 'utf8'), fs.readFileSync(path.join(__dirname, '../app/hydraulics-v5.js'), 'utf8'), 'Browser V5 engine must stay synchronized with tested source');
assert.equal(fs.readFileSync(path.join(__dirname, '../src/hydraulics-v5-1.js'), 'utf8'), fs.readFileSync(path.join(__dirname, '../app/hydraulics-v5-1.js'), 'utf8'), 'Browser V5.1 engine must stay synchronized with tested source');
const V5 = require('../src/hydraulics-v5');
const { calculateMultiSegment } = require('../src/hydraulics-v5-1');

const base = {
  flow: 50, flowUnit: 'm3/h', density: 998, densityUnit: 'kg/m3',
  viscosity: 1.002, viscosityUnit: 'cP',
  inletPressure: 5, inletPressureUnit: 'bar',
  inletDiameter: 150, inletDiameterUnit: 'mm',
  segments: [
    { name: 'Suction header', service: 'suction', diameter: 150, diameterUnit: 'mm', length: 20, lengthUnit: 'm', roughness: 0.045, roughnessUnit: 'mm', minorLossK: [0.5, 1.2], elevationChange: 2, elevationChangeUnit: 'm' },
    { name: 'Pump discharge', service: 'discharge', diameter: 100, diameterUnit: 'mm', length: 80, lengthUnit: 'm', roughness: 0.045, roughnessUnit: 'mm', minorLossK: 3.7, equipmentPressureDrop: 15, equipmentPressureDropUnit: 'kPa', elevationChange: 8, elevationChangeUnit: 'm' }
  ]
};
const close = (actual, expected, tolerance, label) => assert.ok(Math.abs(actual - expected) <= tolerance, label + ': expected ' + expected + ' ± ' + tolerance + ', got ' + actual);

// Correlation reference checks: exact laminar solution and independent turbulent benchmark.
close(V5.churchillDarcy(500, 0.0005), 64 / 500, 1e-12, 'Laminar Darcy factor');
close(V5.churchillDarcy(100000, 0.0005), 0.02042, 0.00002, 'Turbulent Churchill benchmark');
assert.ok(V5.churchillDarcy(2300, 0.0001) > 0, 'Transitional correlation returns finite positive value');

const r = calculateMultiSegment(base);
assert.equal(r.segment_count, 2);
assert.ok(r.segments[0].velocity_m_s > 0);
assert.ok(r.segments[1].velocity_m_s > r.segments[0].velocity_m_s);
assert.ok(r.total_major_loss_head_m > 0 && r.total_minor_loss_head_m > 0 && r.total_equipment_loss_head_m > 0);
close(r.total_elevation_change_m, 10, 1e-12, 'Elevation sum');
assert.ok(r.total_required_head_m > 10 && r.hydraulic_power_W > 0);
assert.ok(r.outlet_pressure_Pa < r.inlet_pressure_Pa);
assert.ok(r.warnings.some(w => /pressure boundary is incomplete/.test(w)));
assert.ok(Number.isFinite(r.required_pump_pressure_difference_kPa));
close(r.total_pressure_drop_Pa, r.total_required_head_m * 998 * 9.80665 - (r.pressure_boundary_head_m * 998 * 9.80665), 1e-6, 'Pipe-path pressure drop');

// Pressure boundary condition contributes ΔP/(rho*g) to required pump head.
const boundary = calculateMultiSegment({ ...base, outletPressure: 6, outletPressureUnit: 'bar' });
close(boundary.total_required_head_m - r.total_required_head_m, 100000 / (998 * 9.80665), 1e-10, 'Destination pressure contribution');

// Explicit validation: blanks, missing units, hexadecimal numeric strings and invalid absolute pressure.
assert.throws(() => calculateMultiSegment({ ...base, flow: '' }), /required; blank is not zero/);
assert.throws(() => calculateMultiSegment({ ...base, flow: '0x10' }), /decimal number/);
assert.throws(() => calculateMultiSegment({ ...base, flowUnit: undefined }), /unit is required/);
assert.throws(() => calculateMultiSegment({ ...base, inletPressure: 0 }), /absolute pressure must be greater than zero/);
assert.throws(() => calculateMultiSegment({ ...base, segments: [{ ...base.segments[0], length: '' }] }), /required; blank is not zero/);
assert.throws(() => calculateMultiSegment({ ...base, segments: [{ ...base.segments[0], diameterUnit: undefined }] }), /unit is required/);
assert.throws(() => calculateMultiSegment({ ...base, segments: [{ ...base.segments[0], equipmentPressureDrop: 15 }], flow: 0 }), /cannot be applied at zero flow/);

// Vapour-pressure / absolute-pressure screening.
const vapour = calculateMultiSegment({
  ...base, inletPressure: 1, inletPressureUnit: 'bar', vapourPressure: 0.8, vapourPressureUnit: 'bar',
  inletDiameter: 100, inletDiameterUnit: 'mm',
  segments: [{ ...base.segments[0], diameter: 50, length: 300, elevationChange: 0 }]
});
assert.ok(vapour.warnings.some(w => /below the entered liquid vapour pressure/.test(w)) || vapour.warnings.some(w => /at or below zero/.test(w)));

// Inlet velocity-head omission and separate suction/discharge screening.
const omitted = calculateMultiSegment({ ...base, inletDiameter: undefined, inletDiameterUnit: undefined });
assert.ok(omitted.warnings.some(w => /Inlet reference diameter omitted/.test(w)));
const suctionFast = calculateMultiSegment({
  ...base, flow: 80, flowUnit: 'm3/h',
  segments: [{ ...base.segments[0], diameter: 80, length: 5, minorLossK: 0 }]
});
assert.ok(suctionFast.warnings.some(w => /suction velocity/.test(w)));

// Negative net head must be explicitly identified.
const downhill = calculateMultiSegment({
  ...base, inletPressure: undefined, inletPressureUnit: undefined, inletDiameter: 100, inletDiameterUnit: 'mm',
  segments: [{ ...base.segments[0], elevationChange: -30, minorLossK: 0, length: 1 }]
});
assert.ok(downhill.total_required_head_m < 0);
assert.ok(downhill.warnings.some(w => /negative/.test(w)));

// Zero-flow case: flow-dependent losses vanish; static elevation remains.
const noFlow = calculateMultiSegment({ ...base, flow: 0, segments: base.segments.map(s => ({ ...s, equipmentPressureDrop: 0 })) });
assert.equal(noFlow.total_major_loss_head_m, 0);
assert.equal(noFlow.total_minor_loss_head_m, 0);
assert.equal(noFlow.hydraulic_power_W, 0);

assert.throws(() => calculateMultiSegment({ ...base, segments: [] }), /At least one/);
assert.throws(() => calculateMultiSegment({ ...base, segments: [{ ...base.segments[0], diameter: 0 }] }), /diameter/);
assert.throws(() => calculateMultiSegment({ ...base, segments: [{ ...base.segments[0], minorLossK: -1 }] }), /K values/);
assert.throws(() => calculateMultiSegment({ ...base, segments: [{ ...base.segments[0], equipmentPressureDrop: -2 }] }), /pressure drop/);
assert.throws(() => calculateMultiSegment({ ...base, flow: -1 }), /Flow cannot be negative/);
console.log('V5.1.1 engineering-hardening regression suite: all assertions passed.');
