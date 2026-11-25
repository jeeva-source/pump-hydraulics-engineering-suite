'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
assert.equal(fs.readFileSync(path.join(__dirname, '../src/pump-performance-v5-3.js'), 'utf8'), fs.readFileSync(path.join(__dirname, '../app/pump-performance-v5-3.js'), 'utf8'), 'Browser and source engines must match');
const { calculatePumpOperatingPoint } = require('../src/pump-performance-v5-3');
const input = {
 density_kg_m3: 998, motorEfficiency_pct: 94, npsha_m: 3.5,
 systemCurve: { staticHead_m: 10, designFlow_m3_s: 0.03, designHead_m: 30 },
 pumpCurve: [
  {flow_m3_s:0.01,head_m:50,efficiency_pct:55,npshr_m:1.5,shaft_power_kW:8},
  {flow_m3_s:0.02,head_m:45,efficiency_pct:75,npshr_m:2,shaft_power_kW:10},
  {flow_m3_s:0.03,head_m:36,efficiency_pct:82,npshr_m:3,shaft_power_kW:12},
  {flow_m3_s:0.04,head_m:24,efficiency_pct:70,npshr_m:4,shaft_power_kW:13}
 ]
};
const r=calculatePumpOperatingPoint({...input,pumpMetadata:{manufacturer:'Example OEM',model:'Illustrative 100-65',ratedSpeed_rpm:2950,impellerDiameter_mm:210,curveRevision:'A',fluidBasis:'Water at 20 C'}});
assert.equal(r.pumpMetadata.manufacturer,'Example OEM');
assert.equal(r.pumpMetadata.ratedSpeed_rpm,2950);
assert.ok(r.operatingPoint.flow_m3_s>0.03 && r.operatingPoint.flow_m3_s<0.04);
assert.ok(r.operatingPoint.head_m>30 && r.operatingPoint.head_m<45);
assert.equal(r.bep.flow_m3_s,0.03);
assert.ok(Math.abs(r.operatingPoint.npshMargin_m - (3.5-r.operatingPoint.npshr_m))<1e-12);
assert.ok(r.operatingPoint.hydraulicPower_kW>0 && r.operatingPoint.estimatedShaftPower_kW>r.operatingPoint.hydraulicPower_kW);
assert.ok(r.operatingPoint.motorInputPower_kW>r.operatingPoint.estimatedShaftPower_kW);
assert.ok(r.systemCurvePoints.length===21);
assert.throws(()=>calculatePumpOperatingPoint({...input,pumpCurve:input.pumpCurve.slice(0,2)}),/at least three/);
assert.throws(()=>calculatePumpOperatingPoint({...input,pumpCurve:[...input.pumpCurve].reverse()}),/strictly increasing/);
assert.throws(()=>calculatePumpOperatingPoint({...input,systemCurve:{staticHead_m:30,designFlow_m3_s:0.03,designHead_m:10}}),/design head > static head/);
assert.throws(()=>calculatePumpOperatingPoint({...input,pumpCurve:input.pumpCurve.map(p=>({...p,head_m:p.head_m+100}))}),/No pump\/system intersection/);
assert.throws(()=>calculatePumpOperatingPoint({...input,npsha_m:-1}),/NPSHa cannot be negative/);
assert.throws(()=>calculatePumpOperatingPoint({...input,pumpMetadata:{ratedSpeed_rpm:0}}),/Rated speed must be greater than zero/);
const noPower=calculatePumpOperatingPoint({density_kg_m3:1000,systemCurve:input.systemCurve,pumpCurve:input.pumpCurve.map(({flow_m3_s,head_m})=>({flow_m3_s,head_m}))});
assert.equal(noPower.operatingPoint.estimatedShaftPower_kW,null);
const vendorOnly=calculatePumpOperatingPoint({density_kg_m3:998,motorEfficiency_pct:90,systemCurve:input.systemCurve,pumpCurve:input.pumpCurve.map(({flow_m3_s,head_m,shaft_power_kW})=>({flow_m3_s,head_m,shaft_power_kW}))});
assert.equal(vendorOnly.operatingPoint.estimatedShaftPower_kW,null);
assert.ok(vendorOnly.operatingPoint.vendorShaftPower_kW>0);
assert.ok(Math.abs(vendorOnly.operatingPoint.motorInputPower_kW-vendorOnly.operatingPoint.vendorShaftPower_kW/0.9)<1e-12);
assert.equal(vendorOnly.operatingPoint.motorInputPowerBasis,'calculated from manufacturer shaft-power curve');
// A non-monotonic manufacturer curve can create multiple system intersections.
const multi=calculatePumpOperatingPoint({density_kg_m3:998,systemCurve:{staticHead_m:10,designFlow_m3_s:0.03,designHead_m:20},pumpCurve:[{flow_m3_s:0.01,head_m:30},{flow_m3_s:0.02,head_m:10},{flow_m3_s:0.03,head_m:35},{flow_m3_s:0.04,head_m:15},{flow_m3_s:0.05,head_m:5}]});
assert.equal(multi.intersectionsFound,3);
assert.equal(multi.intersections.length,3);
assert.match(multi.selectedIntersectionPolicy,/Lowest-flow/);
assert.ok(multi.warnings.some(w=>w.includes('Multiple pump/system intersections')));
console.log('V5.3 pump performance tests passed');
