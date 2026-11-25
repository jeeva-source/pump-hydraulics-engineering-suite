'use strict';
const assert = require('node:assert/strict');
const { convert, churchillDarcy, calculateLine } = require('../src/hydraulics-v5');

assert.ok(Math.abs(convert(3600, 'flow', 'm3/h', 'm3/s') - 1) < 1e-12);
assert.ok(Math.abs(convert(1, 'length', 'ft', 'm') - 0.3048) < 1e-12);
assert.ok(Math.abs(convert(1, 'pressure', 'bar', 'kPa') - 100) < 1e-12);
assert.ok(Math.abs(convert(1, 'viscosity', 'cP', 'Pa.s') - 0.001) < 1e-12);

assert.ok(Math.abs(churchillDarcy(1000, 0.0001) - 0.064) < 0.002);
const turbulentF = churchillDarcy(100000, 0.0001);
assert.ok(turbulentF > 0.015 && turbulentF < 0.03);

const base = {
  flow: 50, flowUnit: 'm3/h',
  diameter: 100, diameterUnit: 'mm',
  length: 100, lengthUnit: 'm',
  roughness: 0.045, roughnessUnit: 'mm',
  density: 998, densityUnit: 'kg/m3',
  viscosity: 1.002, viscosityUnit: 'cP',
  minorLossK: [0.5, 1.2, 2.0],
  staticHead: 12, staticHeadUnit: 'm'
};
const result = calculateLine(base);
assert.ok(result.velocity_m_s > 1 && result.velocity_m_s < 2);
assert.ok(result.reynolds > 1e5);
assert.equal(result.regime, 'Turbulent');
assert.ok(result.darcy_friction_factor > 0);
assert.ok(result.major_loss_head_m > 0);
assert.ok(result.minor_loss_head_m > 0);
assert.ok(result.total_dynamic_head_m > 12);
assert.ok(result.hydraulic_power_W > 0);
assert.equal(result.minor_loss_K_total, 3.7);

const noFlow = calculateLine({ ...base, flow: 0 });
assert.equal(noFlow.velocity_m_s, 0);
assert.equal(noFlow.darcy_friction_factor, null);
assert.equal(noFlow.total_friction_and_minor_loss_m, 0);

assert.throws(() => calculateLine({ ...base, diameter: 0 }), /diameter/);
assert.throws(() => calculateLine({ ...base, flow: -1 }), /negative/);
assert.throws(() => calculateLine({ ...base, viscosity: 0 }), /viscosity/);
assert.throws(() => calculateLine({ ...base, minorLossK: [-1] }), /negative/);
assert.throws(() => convert(1, 'length', 'yard', 'm'), /Unsupported/);

console.log('V5.0 hydraulic engine: all regression assertions passed.');
