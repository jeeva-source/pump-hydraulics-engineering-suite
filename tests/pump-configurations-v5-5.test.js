'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
assert.equal(
 fs.readFileSync(path.join(__dirname,'../src/pump-configurations-v5-5.js'),'utf8'),
 fs.readFileSync(path.join(__dirname,'../app/pump-configurations-v5-5.js'),'utf8'),
 'V5.5 browser engine must match tested source'
);
const { analysePumpConfiguration, transformPumpCurve } = require('../src/pump-configurations-v5-5');
const curve=[
 {flow_m3_s:0.01,head_m:50,efficiency_pct:55,npshr_m:1.5,shaft_power_kW:8},
 {flow_m3_s:0.02,head_m:45,efficiency_pct:75,npshr_m:2,shaft_power_kW:10},
 {flow_m3_s:0.03,head_m:36,efficiency_pct:82,npshr_m:3,shaft_power_kW:12},
 {flow_m3_s:0.04,head_m:24,efficiency_pct:70,npshr_m:4,shaft_power_kW:13}
];
const base={
 density_kg_m3:998,motorEfficiency_pct:94,
 systemCurve:{staticHead_m:10,designFlow_m3_s:0.03,designHead_m:35},
 pumpCurve:curve,
 pumpMetadata:{manufacturer:'Illustrative OEM',model:'Test Pump',ratedSpeed_rpm:2950}
};
const single=analysePumpConfiguration(base);
assert.equal(single.configuration.arrangement,'single');
assert.equal(single.configuration.pumpCount,1);
assert.ok(single.operatingPoint.flow_m3_s>0.03 && single.operatingPoint.flow_m3_s<0.04);
assert.equal(single.operatingPoint.npshr_m,3+(single.operatingPoint.flow_m3_s-0.03)/0.01);
assert.ok(single.operatingPoint.totalShaftPower_kW>single.operatingPoint.hydraulicPower_kW);
assert.ok(single.operatingPoint.perPumpMotorInputPower_kW>single.operatingPoint.perPumpShaftPower_kW);

const series=analysePumpConfiguration({...base,arrangement:'series',pumpCount:2});
const parallel=analysePumpConfiguration({...base,arrangement:'parallel',pumpCount:2});
assert.equal(series.transformedPumpCurve[0].head_m,100);
assert.equal(series.transformedPumpCurve[0].flow_m3_s,0.01);
assert.equal(parallel.transformedPumpCurve[0].head_m,50);
assert.equal(parallel.transformedPumpCurve[0].flow_m3_s,0.02);
assert.ok(series.operatingPoint.head_m>single.operatingPoint.head_m);
assert.ok(parallel.operatingPoint.flow_m3_s>single.operatingPoint.flow_m3_s);
assert.ok(Math.abs(series.operatingPoint.perPumpShaftPower_kW*2-series.operatingPoint.totalShaftPower_kW)<1e-12);
assert.ok(Math.abs(parallel.operatingPoint.perPumpHydraulicPower_kW*2-parallel.operatingPoint.hydraulicPower_kW)<1e-12);
assert.ok(series.warnings.some(w=>w.includes('interstage')));
assert.ok(parallel.warnings.some(w=>w.includes('equal flow split')));

const slow=analysePumpConfiguration({...base,speedRatio:0.8});
assert.equal(slow.transformedPumpCurve[0].flow_m3_s,0.008);
assert.equal(slow.transformedPumpCurve[0].head_m,32);
assert.equal(slow.transformedPumpCurve[0].npshr_m,undefined);
assert.equal(slow.transformedPumpCurve[0].shaft_power_kW,undefined);
assert.ok(slow.warnings.some(w=>w.includes('Manufacturer NPSHr')));

const seriesSlow=analysePumpConfiguration({...base,arrangement:'series',pumpCount:3,speedRatio:0.9});
assert.equal(seriesSlow.transformedPumpCurve[0].head_m,50*0.9*0.9*3);
assert.equal(seriesSlow.transformedPumpCurve[0].flow_m3_s,0.009);

assert.throws(()=>analysePumpConfiguration({...base,arrangement:'unknown'}),/arrangement must be/);
assert.throws(()=>analysePumpConfiguration({...base,arrangement:'single',pumpCount:2}),/requires pumpCount = 1/);
assert.throws(()=>analysePumpConfiguration({...base,pumpCount:1.5}),/integer/);
assert.throws(()=>analysePumpConfiguration({...base,pumpCount:13}),/from 1 to 12/);
assert.throws(()=>analysePumpConfiguration({...base,speedRatio:0}),/greater than zero/);
assert.throws(()=>analysePumpConfiguration({...base,speedRatio:2.1}),/no more than 2.0/);
assert.throws(()=>analysePumpConfiguration({...base,density_kg_m3:0}),/greater than zero/);
assert.throws(()=>analysePumpConfiguration({...base,motorEfficiency_pct:101}),/motorEfficiency_pct/);
assert.throws(()=>transformPumpCurve(curve.slice(0,2),'series',2,1),/at least three/);
console.log('V5.5 pump configuration tests passed');
