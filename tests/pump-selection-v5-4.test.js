'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
assert.equal(fs.readFileSync(path.join(__dirname, '../src/pump-selection-v5-4.js'), 'utf8'), fs.readFileSync(path.join(__dirname, '../app/pump-selection-v5-4.js'), 'utf8'), 'V5.4 browser engine must match tested source');
const { calculateNpsha, evaluatePumpSelection, comparePumpCandidates, correctForSpeed, correctForImpellerDiameter } = require('../src/pump-selection-v5-4');

const npsh = calculateNpsha({
 density_kg_m3:1000, sourcePressureAbs_Pa:200000, vapourPressure_Pa:3000,
 sourceElevation_m:5, pumpCenterlineElevation_m:2, suctionLossHead_m:1.5
});
assert.ok(Math.abs(npsh.npsha_m-21.588409395665188)<1e-10);
assert.ok(Math.abs(npsh.components.sourcePressureMinusVapourPressureHead_m-197000/(1000*9.80665))<1e-12);

const base = {
 density_kg_m3:998,
 systemCurve:{staticHead_m:10,designFlow_m3_s:0.03,designHead_m:30},
 pumpCurve:[
  {flow_m3_s:0.01,head_m:50,efficiency_pct:55,npshr_m:1.5,shaft_power_kW:8},
  {flow_m3_s:0.02,head_m:45,efficiency_pct:75,npshr_m:2,shaft_power_kW:10},
  {flow_m3_s:0.03,head_m:36,efficiency_pct:82,npshr_m:3,shaft_power_kW:12},
  {flow_m3_s:0.04,head_m:24,efficiency_pct:70,npshr_m:4,shaft_power_kW:13}
 ],
 suctionConditions:{
  sourcePressureAbs_Pa:200000,vapourPressure_Pa:3000,
  sourceElevation_m:5,pumpCenterlineElevation_m:2,suctionLossHead_m:1.5
 },
 projectCriteria:{requiredNpshMargin_m:1.0},
 vendorLimits:{
  porMinFlow_m3_s:0.025,porMaxFlow_m3_s:0.04,
  aorMinFlow_m3_s:0.02,aorMaxFlow_m3_s:0.045,
  mcsfFlow_m3_s:0.015,runoutFlow_m3_s:0.045
 }
};
const selected=evaluatePumpSelection(base);
assert.ok(selected.operatingPoint.flow_m3_s>0.03 && selected.operatingPoint.flow_m3_s<0.04);
assert.ok(selected.npsh.available.npsha_m>selected.npsh.required_m);
assert.equal(selected.npsh.status,'meets_project_margin');
assert.equal(selected.vendorOperatingLimits.porStatus,'within_range');
assert.equal(selected.vendorOperatingLimits.aorStatus,'within_range');
assert.equal(selected.vendorOperatingLimits.mcsfStatus,'at_or_above_mcsf');
assert.equal(selected.vendorOperatingLimits.runoutStatus,'at_or_below_runout');
assert.equal(selected.assessment.status,'meets_supplied_criteria');

const lowNpsh=evaluatePumpSelection({...base,suctionConditions:{...base.suctionConditions,sourcePressureAbs_Pa:50000}});
assert.ok(lowNpsh.npsh.margin_m<0);
assert.equal(lowNpsh.npsh.status,'npsha_below_npshr');
assert.equal(lowNpsh.assessment.status,'does_not_meet_supplied_criteria');

const belowProjectMargin=evaluatePumpSelection({...base,projectCriteria:{requiredNpshMargin_m:30}});
assert.equal(belowProjectMargin.npsh.status,'below_project_margin');

const noVendorLimits=evaluatePumpSelection({...base,vendorLimits:undefined,projectCriteria:undefined});
assert.equal(noVendorLimits.vendorOperatingLimits.porStatus,'not_supplied');
assert.equal(noVendorLimits.assessment.status,'incomplete_data_or_criteria');
assert.ok(noVendorLimits.warnings.some(w=>w.includes('NPSHa'))===false);

const compared=comparePumpCandidates({
 ...base,
 candidates:[
  {manufacturer:'OEM A',model:'Pump A',pumpCurve:base.pumpCurve},
  {manufacturer:'OEM B',model:'Pump B',pumpCurve:base.pumpCurve.map(p=>({...p,head_m:p.head_m+100}))}
 ]
});
assert.equal(compared.candidates.length,2);
assert.equal(compared.candidates[0].assessment.status,'meets_supplied_criteria');
assert.equal(compared.candidates[1].status,'calculation_error');
assert.equal(compared.ranking,null);

const speed=correctForSpeed({referenceFlow_m3_s:0.02,referenceHead_m:40,referenceSpeed_rpm:2950,newSpeed_rpm:1475,referenceShaftPower_kW:10});
assert.equal(speed.flow_m3_s,0.01);
assert.equal(speed.head_m,10);
assert.equal(speed.shaftPower_kW,1.25);
const trim=correctForImpellerDiameter({referenceFlow_m3_s:0.02,referenceHead_m:40,referenceImpellerDiameter_mm:200,newImpellerDiameter_mm:180,referenceShaftPower_kW:10});
assert.ok(Math.abs(trim.flow_m3_s-0.018)<1e-12);
assert.ok(Math.abs(trim.head_m-32.4)<1e-12);
assert.ok(Math.abs(trim.shaftPower_kW-7.29)<1e-12);

assert.throws(()=>calculateNpsha({...base.suctionConditions,density_kg_m3:0}),/Density and gravity/);
assert.throws(()=>calculateNpsha({...base.suctionConditions,sourcePressureAbs_Pa:0}),/Source absolute pressure/);
assert.throws(()=>evaluatePumpSelection({...base,vendorLimits:{porMinFlow_m3_s:0.03}}),/supplied together/);
assert.throws(()=>evaluatePumpSelection({...base,vendorLimits:{porMinFlow_m3_s:0.04,porMaxFlow_m3_s:0.03}}),/less than/);
assert.throws(()=>correctForSpeed({referenceFlow_m3_s:0.02,referenceHead_m:40,referenceSpeed_rpm:0,newSpeed_rpm:1500}),/speeds must be positive/);
assert.throws(()=>correctForImpellerDiameter({referenceFlow_m3_s:0.02,referenceHead_m:40,referenceImpellerDiameter_mm:200,newImpellerDiameter_mm:0}),/diameters must be positive/);

console.log('V5.4 pump selection and NPSH tests passed');
