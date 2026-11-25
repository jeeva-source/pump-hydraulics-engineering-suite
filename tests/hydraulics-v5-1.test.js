'use strict';
const assert = require('node:assert/strict');
const { calculateMultiSegment } = require('../src/hydraulics-v5-1');

const base = {
  flow: 50, flowUnit: 'm3/h',
  density: 998, densityUnit: 'kg/m3',
  viscosity: 1.002, viscosityUnit: 'cP',
  inletPressure: 5, inletPressureUnit: 'bar',
  inletDiameter: 150, inletDiameterUnit: 'mm',
  segments: [
    { name: 'Suction header', diameter: 150, diameterUnit: 'mm', length: 20, lengthUnit: 'm', roughness: 0.045, roughnessUnit: 'mm', minorLossK: [0.5, 1.2], elevationChange: 2 },
    { name: 'Pump discharge', diameter: 100, diameterUnit: 'mm', length: 80, lengthUnit: 'm', roughness: 0.045, roughnessUnit: 'mm', minorLossK: 3.7, equipmentPressureDrop: 15, equipmentPressureDropUnit: 'kPa', elevationChange: 8 }
  ]
};
const r = calculateMultiSegment(base);
assert.equal(r.segment_count, 2);
assert.ok(r.segments[0].velocity_m_s > 0);
assert.ok(r.segments[1].velocity_m_s > r.segments[0].velocity_m_s);
assert.ok(r.total_major_loss_head_m > 0);
assert.ok(r.total_minor_loss_head_m > 0);
assert.ok(r.total_equipment_loss_head_m > 0);
assert.equal(r.total_elevation_change_m, 10);
assert.ok(r.total_required_head_m > 10);
assert.ok(r.hydraulic_power_W > 0);
assert.ok(r.outlet_pressure_Pa < r.inlet_pressure_Pa);
assert.ok(Math.abs(r.total_pressure_drop_Pa - (r.total_required_head_m * 998 * 9.80665)) < 1e-6);

const noFlow = calculateMultiSegment({ ...base, flow: 0 });
assert.equal(noFlow.total_major_loss_head_m, 0);
assert.equal(noFlow.total_minor_loss_head_m, 0);
assert.equal(noFlow.hydraulic_power_W, 0);

assert.throws(() => calculateMultiSegment({ ...base, segments: [] }), /At least one/);
assert.throws(() => calculateMultiSegment({ ...base, segments: [{ ...base.segments[0], diameter: 0 }] }), /diameter/);
assert.throws(() => calculateMultiSegment({ ...base, segments: [{ ...base.segments[0], minorLossK: -1 }] }), /K values/);
assert.throws(() => calculateMultiSegment({ ...base, segments: [{ ...base.segments[0], equipmentPressureDrop: -2 }] }), /pressure drop/);
assert.throws(() => calculateMultiSegment({ ...base, flow: -1 }), /Flow cannot be negative/);

console.log('V5.1 multi-segment hydraulic engine: all regression assertions passed.');
