'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
assert.equal(fs.readFileSync(path.join(__dirname, '../src/network-v5-2.js'), 'utf8'), fs.readFileSync(path.join(__dirname, '../app/network-v5-2.js'), 'utf8'), 'Browser V5.2 engine must match tested source');
const { calculateNetwork } = require('../src/network-v5-2');
const close = (a,b,t,label) => assert.ok(Math.abs(a-b)<=t, label+': expected '+b+' ± '+t+', got '+a);
const parallel = calculateNetwork({
 density_kg_m3: 998, viscosity_Pa_s: 0.001002,
 nodes: [
  {id:'source', fixedTotalHead_m:50, elevation_m:0},
  {id:'junction', elevation_m:0},
  {id:'tank', elevation_m:0, demand_m3_s:0.01}
 ],
 edges: [
  {id:'branch-A',from:'source',to:'junction',length_m:100,diameter_m:0.15,roughness_m:0.000045,K:2},
  {id:'branch-B',from:'junction',to:'tank',length_m:100,diameter_m:0.15,roughness_m:0.000045,K:2}
 ]
});
close(parallel.nodes.find(n=>n.id==='tank').continuityResidual_m3_s,0,1e-9,'Terminal continuity');
close(parallel.totalBoundarySupply_m3_s,0.01,1e-8,'Boundary supply');
assert.ok(parallel.edges.every(e=>e.flow_m3_s>0));
const loop = calculateNetwork({
 density_kg_m3:998, viscosity_Pa_s:0.001002,
 nodes:[
  {id:'reservoir',fixedTotalHead_m:40},
  {id:'A'}, {id:'B'}, {id:'outlet',demand_m3_s:0.02}
 ],
 edges:[
  {id:'R-A',from:'reservoir',to:'A',length_m:80,diameter_m:0.2,roughness_m:0.000045,K:1},
  {id:'A-out',from:'A',to:'outlet',length_m:100,diameter_m:0.15,roughness_m:0.000045,K:2},
  {id:'R-B',from:'reservoir',to:'B',length_m:100,diameter_m:0.15,roughness_m:0.000045,K:2},
  {id:'B-out',from:'B',to:'outlet',length_m:80,diameter_m:0.2,roughness_m:0.000045,K:1},
  {id:'A-B',from:'A',to:'B',length_m:50,diameter_m:0.1,roughness_m:0.000045,K:1}
 ]
});
close(loop.totalBoundarySupply_m3_s,0.02,1e-8,'Loop network supply');
assert.ok(loop.iterations>0 && loop.iterations<60);
assert.ok(loop.maxContinuityResidual_m3_s<1e-9);
assert.equal(loop.nodes.find(n=>n.id==='reservoir').continuityResidual_m3_s,null);
assert.throws(()=>calculateNetwork({density_kg_m3:998,viscosity_Pa_s:0.001,nodes:[{id:'a'},{id:'b'}],edges:[{id:'p',from:'a',to:'b',length_m:1,diameter_m:0.1,roughness_m:0}]}),/fixedTotalHead/);
assert.throws(()=>calculateNetwork({density_kg_m3:998,viscosity_Pa_s:0.001,nodes:[{id:'a',fixedTotalHead_m:10},{id:'b',demand_m3_s:-1}],edges:[{id:'p',from:'a',to:'b',length_m:1,diameter_m:0.1,roughness_m:0}]}),/demand cannot be negative/);
assert.throws(()=>calculateNetwork({density_kg_m3:998,viscosity_Pa_s:0.001,nodes:[{id:'a',fixedTotalHead_m:10},{id:'b'},{id:'isolated'}],edges:[{id:'p',from:'a',to:'b',length_m:1,diameter_m:0.1,roughness_m:0}]}),/disconnected/);
console.log('V5.2 network solver tests passed');
