'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
assert.equal(fs.readFileSync(path.join(__dirname,'../src/pipe-system-curve-v5-6.js'),'utf8'),fs.readFileSync(path.join(__dirname,'../app/pipe-system-curve-v5-6.js'),'utf8'),'V5.6 source and browser engine must match');
require('../src/hydraulics-v5');
const { calculatePipeDerivedSystemCurve } = require('../src/pipe-system-curve-v5-6');
const hydraulicInput = {
 density:998,densityUnit:'kg/m3',viscosity:0.001,viscosityUnit:'Pa.s',
 inletDiameter:150,inletDiameterUnit:'mm',
 segments:[
  {name:'Suction',service:'suction',diameter:150,diameterUnit:'mm',length:12,lengthUnit:'m',roughness:0.045,roughnessUnit:'mm',minorLossK:2.5,elevationChange:2,elevationChangeUnit:'m'},
  {name:'Discharge',service:'discharge',diameter:100,diameterUnit:'mm',length:85,lengthUnit:'m',roughness:0.045,roughnessUnit:'mm',minorLossK:8,elevationChange:18,elevationChangeUnit:'m'}
 ]
};
const pumpCurve=[
 {flow_m3_s:0.005,head_m:48,efficiency_pct:45,npshr_m:1.2},
 {flow_m3_s:0.015,head_m:43,efficiency_pct:70,npshr_m:2},
 {flow_m3_s:0.025,head_m:34,efficiency_pct:82,npshr_m:3},
 {flow_m3_s:0.035,head_m:20,efficiency_pct:72,npshr_m:4}
];
const result=calculatePipeDerivedSystemCurve({hydraulicInput,pumpCurve,motorEfficiency_pct:94,npsha_m:5,sampleCount:121});
assert.equal(result.version,'5.6.0');
assert.throws(()=>calculatePipeDerivedSystemCurve({hydraulicInput:{...hydraulicInput,density:'bad'},pumpCurve}),/decimal number/);
assert.equal(result.systemCurvePoints.length,121);
assert.equal(result.staticHead_m,20);
assert.ok(result.operatingPoint.flow_m3_s>0.005 && result.operatingPoint.flow_m3_s<0.035);
assert.ok(result.operatingPoint.head_m>0);
assert.ok(result.operatingPoint.hydraulicPower_kW>0);
assert.ok(result.operatingPoint.motorInputPower_kW>result.operatingPoint.selectedShaftPower_kW);
assert.ok(result.operatingPoint.hydraulicBreakdown.majorLossHead_m>0);
assert.equal(result.operatingPoint.npsha_m,5);
assert.ok(Math.abs(result.operatingPoint.npshr_m-(2+(result.operatingPoint.flow_m3_s-0.015)/0.01))<1e-10);
assert.ok(result.intersectionsFound>=1);
assert.ok(result.systemCurvePoints.at(-1).systemHead_m>result.systemCurvePoints[0].systemHead_m);
assert.throws(()=>calculatePipeDerivedSystemCurve({hydraulicInput:{...hydraulicInput,segments:[]},pumpCurve}),/At least one/);
assert.throws(()=>calculatePipeDerivedSystemCurve({hydraulicInput,pumpCurve,sampleCount:10}),/21 to 501/);
assert.throws(()=>calculatePipeDerivedSystemCurve({hydraulicInput:{...hydraulicInput,segments:[{...hydraulicInput.segments[0],equipmentPressureDrop:10,equipmentPressureDropUnit:'kPa'}]},pumpCurve}),/does not accept fixed equipment pressure drops/);
assert.throws(()=>calculatePipeDerivedSystemCurve({hydraulicInput,pumpCurve:pumpCurve.map(p=>({...p,head_m:p.head_m+100}))}),/No pump\/system intersection/);
assert.throws(()=>calculatePipeDerivedSystemCurve({hydraulicInput,pumpCurve,npsha_m:-1}),/cannot be negative/);
// Tangential intersection regression: a straight pump-curve segment is tangent to
// the convex pipe system curve. There is no sign change, so bracket-only solvers miss it.
const V51 = require('../src/hydraulics-v5-1');
const tangentFlow = 0.02125;
const tangentHydraulic = q => V51.calculateMultiSegment({...hydraulicInput,flow:q,flowUnit:'m3/s'}).total_required_head_m;
const tangentStep = 1e-6;
const tangentHead = tangentHydraulic(tangentFlow);
const tangentSlope = (tangentHydraulic(tangentFlow+tangentStep)-tangentHydraulic(tangentFlow-tangentStep))/(2*tangentStep);
const tangentPump = [0.005,0.035,0.05].map(q=>({flow_m3_s:q,head_m:tangentHead+tangentSlope*(q-tangentFlow),efficiency_pct:70}));
const tangentResult = calculatePipeDerivedSystemCurve({hydraulicInput,pumpCurve:tangentPump,sampleCount:101});
assert.ok(tangentResult.intersections.some(p=>Math.abs(p.flow_m3_s-tangentFlow)<1e-7),'tangential intersection must be detected without a residual sign change');
console.log('V5.6 pipe-derived system curve tests passed');
