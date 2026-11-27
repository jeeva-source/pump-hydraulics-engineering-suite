'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const HydraulicsV51 = require('../src/hydraulics-v5-1.js');
const Layout3D = require('../app/pipe-layout-3d.js');

test('buildPipeLayout positions pump between suction and discharge and flags reducer & equipment', () => {
  const calc = HydraulicsV51.calculateMultiSegment({
    flow: 60,
    flowUnit: 'm3/h',
    density: 998,
    densityUnit: 'kg/m3',
    viscosity: 1.002,
    viscosityUnit: 'cP',
    segments: [
      {
        name: 'Suction line',
        service: 'suction',
        diameter: 150,
        diameterUnit: 'mm',
        length: 20,
        lengthUnit: 'm',
        roughness: 0.045,
        roughnessUnit: 'mm',
        minorLossK: 1.7,
        equipmentPressureDrop: 0,
        equipmentPressureDropUnit: 'kPa',
        elevationChange: 2,
        elevationChangeUnit: 'm',
      },
      {
        name: 'Discharge line',
        service: 'discharge',
        diameter: 100,
        diameterUnit: 'mm',
        length: 80,
        lengthUnit: 'm',
        roughness: 0.045,
        roughnessUnit: 'mm',
        minorLossK: 3.7,
        equipmentPressureDrop: 15,
        equipmentPressureDropUnit: 'kPa',
        elevationChange: 8,
        elevationChangeUnit: 'm',
      },
    ],
  });

  const layout = Layout3D.buildPipeLayout(calc);
  assert.equal(layout.segments.length, 2);
  assert.equal(layout.pumpAfterIndex, 0);
  assert.equal(layout.segments[0].hasFittingLoss, true);
  assert.equal('hasValve' in layout.segments[0], false, 'aggregate K must not be labelled as a specific valve');
  assert.equal(layout.segments[0].hasEquipment, false);
  assert.equal(layout.segments[1].hasEquipment, true);
  assert.equal(layout.segments[1].hasReducer, true);
  assert.ok(layout.segments[0].visualRadius > layout.segments[1].visualRadius);
  assert.ok(layout.pumpPosition.x > layout.segments[0].end.x);
  assert.ok(layout.pumpPosition.x < layout.segments[1].start.x);
  assert.ok(layout.bounds.span >= 4);
});

test('buildPipeLayout keeps negative elevation lines above floor clearance', () => {
  const calc = HydraulicsV51.calculateMultiSegment({
    flow: 40,
    flowUnit: 'm3/h',
    density: 998,
    densityUnit: 'kg/m3',
    viscosity: 1.002,
    viscosityUnit: 'cP',
    segments: [
      {
        name: 'Downhill run',
        service: 'discharge',
        diameter: 100,
        diameterUnit: 'mm',
        length: 50,
        lengthUnit: 'm',
        roughness: 0.045,
        roughnessUnit: 'mm',
        minorLossK: 1,
        equipmentPressureDrop: 0,
        equipmentPressureDropUnit: 'kPa',
        elevationChange: -10,
        elevationChangeUnit: 'm',
      },
    ],
  });

  const layout = Layout3D.buildPipeLayout(calc);
  assert.ok(layout.segments[0].end.y >= 0.84, 'Lowest pipe point must stay above floor clearance');
  assert.ok(layout.segments[0].start.y > layout.segments[0].end.y, 'Downhill slope must descend');
});
