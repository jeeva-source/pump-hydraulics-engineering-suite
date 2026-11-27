'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const three = fs.readFileSync(path.join(__dirname, '../app/hydraulics-3d.js'), 'utf8');
const workspace = fs.readFileSync(path.join(__dirname, '../app/index.html'), 'utf8');
const layout = fs.readFileSync(path.join(__dirname, '../app/pipe-layout-3d.js'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));

assert.match(three, /catch \(error\) \{[\s\S]*?this\.renderer\?\.dispose\?\.\(\)/,
  '3D constructor must clean up partial renderer resources after initialisation failure');
assert.match(three, /buildFittingLossMarker/,
  'aggregate K must be represented by a neutral marker, not an invented valve type');
assert.doesNotMatch(three, /buildGateValve|hasValve/,
  'the 3D scene must not infer a gate valve from aggregate minor-loss K');
assert.match(layout, /hasFittingLoss:/,
  'layout data must expose the generic fitting-loss flag');
assert.match(three, /show3DFallback/,
  '3D module must expose a user-facing fallback renderer');
assert.match(three, /return null;/,
  '3D factory must fail closed instead of throwing into the calculator page');
assert.match(workspace, /onerror="window\.dispatchEvent\(new Event\('hydraulics3d:loaderror'\)\)"/,
  'workspace must detect a failed Three.js module request');
assert.match(workspace, /hydraulics3d:loaderror/,
  'workspace must render a fallback when the module cannot be fetched');
assert.match(workspace, /hydraulic calculations remain active/,
  'fallback must make it clear that calculation functions remain available');
assert.ok(pkg.scripts.test.includes('npm run test:3d-integration'),
  '3D integration regression test must be part of the full test suite');

console.log('3D integration fallback regression tests passed');
