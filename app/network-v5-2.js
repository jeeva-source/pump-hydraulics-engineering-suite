'use strict';

/**
 * V5.2 preliminary pipe-network solver.
 * Steady incompressible Newtonian liquid; nodal piezometric-head formulation.
 * SI units only. Edge losses: Darcy-Weisbach + Churchill Darcy friction + minor K.
 */
const V5 = typeof module !== 'undefined' && module.exports
  ? require('./hydraulics-v5')
  : (typeof window !== 'undefined' ? window.PumpHydraulicsV5 : null);
if (!V5) throw new Error('V5 hydraulic engine must be loaded before V5.2');
const G = V5.G || 9.80665;

function num(v, name) {
  if (v === null || v === undefined || (typeof v === 'string' && v.trim() === '')) throw new TypeError(name + ' is required');
  if (typeof v === 'string' && !/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(v.trim())) throw new TypeError(name + ' must be a decimal number');
  const n = Number(v);
  if (!Number.isFinite(n)) throw new TypeError(name + ' must be finite');
  return n;
}
function edgeLoss(q, e, rho, mu) {
  const qAbs = Math.abs(q);
  if (qAbs === 0) return 0;
  const area = Math.PI * e.diameter_m ** 2 / 4;
  const velocity = qAbs / area;
  const re = rho * velocity * e.diameter_m / mu;
  const f = V5.churchillDarcy(re, e.roughness_m / e.diameter_m);
  return (f * e.length_m / e.diameter_m + e.K) * velocity ** 2 / (2 * G);
}
function flowForHead(deltaH, e, rho, mu) {
  if (deltaH === 0) return 0;
  const sign = Math.sign(deltaH), target = Math.abs(deltaH);
  let lo = 0, hi = 1e-6;
  for (let i = 0; i < 80 && edgeLoss(hi, e, rho, mu) < target; i++) hi *= 2;
  if (!Number.isFinite(hi) || hi > 1e4) throw new Error('Could not bracket flow for edge ' + e.id);
  for (let i = 0; i < 90; i++) {
    const mid = (lo + hi) / 2;
    if (edgeLoss(mid, e, rho, mu) < target) lo = mid; else hi = mid;
  }
  return sign * (lo + hi) / 2;
}
function solveLinear(A, b) {
  const n = b.length, M = A.map((r, i) => r.slice().concat([b[i]]));
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-12) throw new Error('Network Jacobian is singular; check connectivity and boundary conditions');
    [M[c], M[p]] = [M[p], M[c]];
    const pivot = M[c][c];
    for (let j = c; j <= n; j++) M[c][j] /= pivot;
    for (let r = 0; r < n; r++) if (r !== c) {
      const factor = M[r][c];
      for (let j = c; j <= n; j++) M[r][j] -= factor * M[c][j];
    }
  }
  return M.map(r => r[n]);
}
function calculateNetwork(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Input object is required');
  const rho = num(input.density_kg_m3, 'density_kg_m3');
  const mu = num(input.viscosity_Pa_s, 'viscosity_Pa_s');
  if (!(rho > 0) || !(mu > 0)) throw new RangeError('Density and viscosity must be greater than zero');
  if (!Array.isArray(input.nodes) || input.nodes.length < 2) throw new RangeError('At least two nodes are required');
  if (!Array.isArray(input.edges) || input.edges.length < 1) throw new RangeError('At least one pipe edge is required');
  const nodeMap = new Map();
  const nodes = input.nodes.map((n, i) => {
    if (!n || typeof n !== 'object' || !n.id) throw new TypeError('Each node requires a unique id');
    if (nodeMap.has(n.id)) throw new RangeError('Duplicate node id: ' + n.id);
    const elevation = n.elevation_m === undefined ? 0 : num(n.elevation_m, n.id + ' elevation_m');
    const demand = n.demand_m3_s === undefined ? 0 : num(n.demand_m3_s, n.id + ' demand_m3_s');
    if (demand < 0) throw new RangeError(n.id + ' demand cannot be negative; demands are withdrawals');
    const fixed = n.fixedTotalHead_m === undefined || n.fixedTotalHead_m === null ? null : num(n.fixedTotalHead_m, n.id + ' fixedTotalHead_m');
    const item = { id: n.id, elevation_m: elevation, demand_m3_s: demand, fixedTotalHead_m: fixed, index: i };
    nodeMap.set(n.id, item);
    return item;
  });
  if (!nodes.some(n => n.fixedTotalHead_m !== null)) throw new RangeError('At least one fixedTotalHead_m boundary node is required');
  const edgeIds = new Set();\n  const edges = input.edges.map((e, i) => {
    if (!e || typeof e !== 'object' || !e.id) throw new TypeError('Each edge requires an id');\n    if (edgeIds.has(e.id)) throw new RangeError('Duplicate edge id: ' + e.id);\n    edgeIds.add(e.id);
    if (!nodeMap.has(e.from) || !nodeMap.has(e.to) || e.from === e.to) throw new RangeError('Edge ' + e.id + ' must connect two distinct existing nodes');
    const length = num(e.length_m, e.id + ' length_m');
    const diameter = num(e.diameter_m, e.id + ' diameter_m');
    const roughness = num(e.roughness_m, e.id + ' roughness_m');
    const K = e.K === undefined ? 0 : num(e.K, e.id + ' K');
    if (!(length > 0) || !(diameter > 0) || roughness < 0 || roughness >= diameter || K < 0) throw new RangeError('Edge ' + e.id + ' has invalid geometry or loss coefficient');
    return { id: e.id, from: e.from, to: e.to, length_m: length, diameter_m: diameter, roughness_m: roughness, K };
  });
  const unknown = nodes.filter(n => n.fixedTotalHead_m === null);
  if (unknown.length === 0) throw new RangeError('At least one non-boundary node is required');
  const adjacency = new Map(nodes.map(n => [n.id, []]));
  for (const e of edges) { adjacency.get(e.from).push(e.to); adjacency.get(e.to).push(e.from); }
  const reached = new Set(nodes.filter(n => n.fixedTotalHead_m !== null).map(n => n.id));
  const queue = [...reached];
  while (queue.length) for (const next of adjacency.get(queue.shift())) if (!reached.has(next)) { reached.add(next); queue.push(next); }
  const disconnected = nodes.filter(n => !reached.has(n.id)).map(n => n.id);
  if (disconnected.length) throw new RangeError('Nodes are disconnected from all fixed-head boundaries: ' + disconnected.join(', '));
  const head = new Map(nodes.map(n => [n.id, n.fixedTotalHead_m === null ? (Math.max(...nodes.filter(x => x.fixedTotalHead_m !== null).map(x => x.fixedTotalHead_m)) - 5) : n.fixedTotalHead_m]));
  const edgeFlows = () => edges.map(e => ({ edge: e, q: flowForHead(head.get(e.from) - head.get(e.to), e, rho, mu) }));
  function residuals() {
    const net = new Map(nodes.map(n => [n.id, -n.demand_m3_s]));
    for (const item of edgeFlows()) {
      net.set(item.edge.from, net.get(item.edge.from) - item.q);
      net.set(item.edge.to, net.get(item.edge.to) + item.q);
    }
    return unknown.map(n => net.get(n.id));
  }
  let iterations = 0, norm = Infinity;
  const tolerance = input.flowTolerance_m3_s === undefined ? 1e-9 : num(input.flowTolerance_m3_s, 'flowTolerance_m3_s');
  const maxIterations = input.maxIterations === undefined ? 60 : num(input.maxIterations, 'maxIterations');
  if (!(tolerance > 0) || !(maxIterations >= 1)) throw new RangeError('Solver tolerance and iteration limit must be positive');
  for (; iterations < maxIterations; iterations++) {
    const r = residuals();
    norm = Math.max(...r.map(Math.abs));
    if (norm <= tolerance) break;
    const x = unknown.map(n => head.get(n.id));
    const J = unknown.map(() => unknown.map(() => 0));
    for (let j = 0; j < unknown.length; j++) {
      const step = Math.max(1e-5, Math.abs(x[j]) * 1e-6);
      head.set(unknown[j].id, x[j] + step);
      const shifted = residuals();
      head.set(unknown[j].id, x[j]);
      for (let i = 0; i < unknown.length; i++) J[i][j] = (shifted[i] - r[i]) / step;
    }
    const dx = solveLinear(J, r.map(v => -v));
    let accepted = false, alpha = 1;
    for (let trial = 0; trial < 16; trial++, alpha /= 2) {
      unknown.forEach((n, i) => head.set(n.id, x[i] + alpha * dx[i]));
      const nextNorm = Math.max(...residuals().map(Math.abs));
      if (Number.isFinite(nextNorm) && nextNorm < norm) { accepted = true; break; }
    }
    if (!accepted) {
      unknown.forEach((n, i) => head.set(n.id, x[i]));
      throw new Error('Network solver did not converge; inspect topology, demands and boundary heads');
    }
  }
  if (norm > tolerance) throw new Error('Network solver did not converge within ' + maxIterations + ' iterations; residual=' + norm);
  const flows = edgeFlows().map(({ edge, q }) => {
    const area = Math.PI * edge.diameter_m ** 2 / 4;
    const velocity = q / area;
    const re = Math.abs(q) === 0 ? 0 : rho * Math.abs(velocity) * edge.diameter_m / mu;
    const f = re === 0 ? null : V5.churchillDarcy(re, edge.roughness_m / edge.diameter_m);
    return { ...edge, flow_m3_s: q, flow_m3_h: q * 3600, velocity_m_s: velocity, reynolds: re, darcy_friction_factor: f, friction_and_minor_loss_head_m: edgeLoss(q, edge, rho, mu) * Math.sign(q) };
  });
  const nodeResults = nodes.map(n => {
    let pressureHead = head.get(n.id) - n.elevation_m;
    let inflow = 0, outflow = 0;
    for (const f of flows) {
      if (f.to === n.id) inflow += f.flow_m3_s;
      if (f.from === n.id) outflow += f.flow_m3_s;
      if (f.from === n.id) pressureHead = head.get(n.id) - n.elevation_m;
    }
    const boundary = n.fixedTotalHead_m !== null;
    return { id: n.id, elevation_m: n.elevation_m, totalHead_m: head.get(n.id), pressureHead_m: pressureHead, pressure_kPa_gauge: pressureHead * rho * G / 1000, demand_m3_s: n.demand_m3_s, inflow_m3_s: inflow, outflow_m3_s: outflow, continuityResidual_m3_s: boundary ? null : inflow - outflow - n.demand_m3_s, boundary, boundarySupply_m3_s: boundary ? outflow - inflow + n.demand_m3_s : null };
  });
  const sourceSupply = nodeResults.filter(n => n.boundary).reduce((s, n) => s + n.boundarySupply_m3_s, 0);
  const maxContinuityResidual = Math.max(...nodeResults.filter(n => !n.boundary).map(n => Math.abs(n.continuityResidual_m3_s)));
  const warnings = [];
  if (flows.some(f => f.reynolds >= 2300 && f.reynolds <= 4000)) warnings.push('One or more pipes operate in the transitional Reynolds-number range; verify sensitivity.');
  if (flows.some(f => f.flow_m3_s < -1e-12)) warnings.push('One or more pipe flows are opposite to the entered edge direction; signed flow is reported.');
  if (nodeResults.some(n => n.pressureHead_m < 0)) warnings.push('One or more nodes have negative gauge pressure head; check elevations and boundary heads.');
  return { model: 'Steady incompressible single-phase Newtonian liquid pipe network', basis: 'SI', solver: 'Damped Newton nodal continuity with Darcy-Weisbach edge inversion', iterations, maxContinuityResidual_m3_s: Math.max(...nodeResults.filter(n => !n.boundary).map(n => Math.abs(n.continuityResidual_m3_s))), totalBoundarySupply_m3_s: sourceSupply, nodes: nodeResults, edges: flows, warnings };
}
if (typeof module !== 'undefined' && module.exports) module.exports = { calculateNetwork, edgeLoss, flowForHead };
if (typeof window !== 'undefined') window.PumpHydraulicsV52 = { calculateNetwork };
