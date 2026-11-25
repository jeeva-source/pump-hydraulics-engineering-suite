'use strict';

/**
 * V5.1 multi-segment liquid hydraulics.
 * Each segment has its own internal diameter, length, roughness, K and elevation change.
 * Common steady incompressible flow and Newtonian fluid properties are assumed.
 */
const V5 = typeof module !== 'undefined' && module.exports
  ? window.PumpHydraulicsV5
  : (typeof window !== 'undefined' ? window.PumpHydraulicsV5 : null);
if (!V5) throw new Error('V5.0 hydraulic engine must be loaded before V5.1');

const { G } = V5;
function num(value, name) {
  const n = Number(value);
  if (!Number.isFinite(n)) throw new TypeError(name + ' must be a finite number');
  return n;
}
function unit(value, quantity, unitName, name) {
  return V5.convert(value, quantity, unitName, 'SI');
}
function pressureToPa(value, unitName, name) {
  const factors = { Pa: 1, kPa: 1000, bar: 100000, psi: 6894.757293 };
  if (!(unitName in factors)) throw new RangeError('Unsupported pressure unit: ' + unitName);
  return num(value, name) * factors[unitName];
}

/**
 * Input:
 * {flow, flowUnit, density, densityUnit, viscosity, viscosityUnit,
 *  inletPressure?, inletPressureUnit?, inletDiameter?, inletDiameterUnit?,
 *  segments:[{name?,diameter,diameterUnit,length,lengthUnit,roughness,
 *  roughnessUnit,minorLossK?,equipmentPressureDrop?,equipmentPressureDropUnit?,
 *  elevationChange?,elevationChangeUnit?}]}
 *
 * Segment pressure drop includes friction, fitting/equipment loss, elevation
 * and change in velocity head. Positive pressure drop means pressure decreases.
 */
function calculateMultiSegment(input) {
  if (!input || typeof input !== 'object') throw new TypeError('Input object is required');
  if (!Array.isArray(input.segments) || input.segments.length === 0) {
    throw new RangeError('At least one pipe segment is required');
  }
  const Q = V5.convert(input.flow, 'flow', input.flowUnit, 'm3/s');
  const rho = V5.convert(input.density, 'density', input.densityUnit || 'kg/m3', 'kg/m3');
  const mu = V5.convert(input.viscosity, 'viscosity', input.viscosityUnit, 'Pa.s');
  if (Q < 0) throw new RangeError('Flow cannot be negative');
  if (!(rho > 0)) throw new RangeError('Density must be greater than zero');
  if (!(mu > 0)) throw new RangeError('Dynamic viscosity must be greater than zero');

  const inletPressurePa = input.inletPressure === undefined || input.inletPressure === null
    ? null : pressureToPa(input.inletPressure, input.inletPressureUnit || 'kPa', 'inletPressure');
  const inletDiameter = input.inletDiameter === undefined || input.inletDiameter === null
    ? null : V5.convert(input.inletDiameter, 'length', input.inletDiameterUnit || 'mm', 'm');
  if (inletDiameter !== null && !(inletDiameter > 0)) throw new RangeError('Inlet diameter must be greater than zero');

  let previousVelocityHead = inletDiameter === null ? null :
    Math.pow(Q / (Math.PI * inletDiameter * inletDiameter / 4), 2) / (2 * G);
  let cumulativeHead = 0;
  let cumulativePressureDropPa = 0;
  const warnings = [];
  const results = input.segments.map((segment, index) => {
    if (!segment || typeof segment !== 'object') throw new TypeError('Segment ' + (index + 1) + ' must be an object');
    const label = segment.name || ('Segment ' + (index + 1));
    const D = V5.convert(segment.diameter, 'length', segment.diameterUnit || 'mm', 'm');
    const L = V5.convert(segment.length, 'length', segment.lengthUnit || 'm', 'm');
    const eps = V5.convert(segment.roughness, 'roughness', segment.roughnessUnit || 'mm', 'm');
    const dz = segment.elevationChange === undefined ? 0 :
      V5.convert(segment.elevationChange, 'length', segment.elevationChangeUnit || 'm', 'm');
    if (!(D > 0)) throw new RangeError(label + ': diameter must be greater than zero');
    if (L < 0 || eps < 0) throw new RangeError(label + ': length and roughness cannot be negative');
    if (eps >= D) throw new RangeError(label + ': roughness must be smaller than diameter');

    const Kvalues = segment.minorLossK === undefined ? [] :
      (Array.isArray(segment.minorLossK) ? segment.minorLossK : [segment.minorLossK]);
    const K = Kvalues.reduce((sum, value, i) => {
      const k = num(value, label + ' minorLossK[' + i + ']');
      if (k < 0) throw new RangeError(label + ': K values cannot be negative');
      return sum + k;
    }, 0);
    const equipmentDropPa = segment.equipmentPressureDrop === undefined ? 0 :
      pressureToPa(segment.equipmentPressureDrop, segment.equipmentPressureDropUnit || 'kPa', label + ' equipmentPressureDrop');
    if (equipmentDropPa < 0) throw new RangeError(label + ': equipment pressure drop cannot be negative');

    const area = Math.PI * D * D / 4;
    const velocity = Q / area;
    const Re = velocity === 0 ? 0 : rho * velocity * D / mu;
    const f = Re === 0 ? null : V5.churchillDarcy(Re, eps / D);
    const velocityHead = velocity * velocity / (2 * G);
    const velocityHeadChange = previousVelocityHead === null ? 0 : velocityHead - previousVelocityHead;
    const major = f === null ? 0 : f * (L / D) * velocityHead;
    const minor = K * velocityHead;
    const equipmentHead = equipmentDropPa / (rho * G);
    const netHead = major + minor + equipmentHead + dz + velocityHeadChange;
    const pressureDropPa = rho * G * netHead;
    cumulativeHead += netHead;
    cumulativePressureDropPa += pressureDropPa;
    const pressureInPa = inletPressurePa === null ? null : inletPressurePa - (cumulativePressureDropPa - pressureDropPa);
    const pressureOutPa = inletPressurePa === null ? null : inletPressurePa - cumulativePressureDropPa;
    if (Re > 2300 && Re <= 4000) warnings.push(label + ': transitional Reynolds-number range; verify sensitivity.');
    if (Q > 0 && velocity > 3) warnings.push(label + ': velocity exceeds 3 m/s screening threshold; verify project criteria.');
    previousVelocityHead = velocityHead;

    return {
      index: index + 1, name: label, diameter_m: D, length_m: L, roughness_m: eps,
      area_m2: area, velocity_m_s: velocity, reynolds: Re, darcy_friction_factor: f,
      regime: Re === 0 ? 'No flow' : Re < 2300 ? 'Laminar' : Re <= 4000 ? 'Transitional' : 'Turbulent',
      minor_loss_K_total: K, elevation_change_m: dz,
      major_loss_head_m: major, minor_loss_head_m: minor, equipment_loss_head_m: equipmentHead,
      velocity_head_change_m: velocityHeadChange, net_required_head_m: netHead,
      pressure_drop_Pa: pressureDropPa,
      cumulative_required_head_m: cumulativeHead,
      cumulative_pressure_drop_Pa: cumulativePressureDropPa,
      inlet_pressure_Pa: pressureInPa, outlet_pressure_Pa: pressureOutPa
    };
  });

  const first = results[0], last = results[results.length - 1];
  const frictionAndEquipmentHead = results.reduce((s, r) =>
    s + r.major_loss_head_m + r.minor_loss_head_m + r.equipment_loss_head_m, 0);
  const elevationHead = results.reduce((s, r) => s + r.elevation_change_m, 0);
  const velocityHeadChange = results.reduce((s, r) => s + r.velocity_head_change_m, 0);
  return {
    basis: 'SI', model: 'Steady incompressible single-path multi-segment liquid model',
    flow_m3_s: Q, density_kg_m3: rho, viscosity_Pa_s: mu,
    segment_count: results.length, segments: results,
    total_major_loss_head_m: results.reduce((s, r) => s + r.major_loss_head_m, 0),
    total_minor_loss_head_m: results.reduce((s, r) => s + r.minor_loss_head_m, 0),
    total_equipment_loss_head_m: results.reduce((s, r) => s + r.equipment_loss_head_m, 0),
    total_elevation_change_m: elevationHead,
    total_velocity_head_change_m: velocityHeadChange,
    total_required_head_m: cumulativeHead,
    total_pressure_drop_Pa: cumulativePressureDropPa,
    total_pressure_drop_kPa: cumulativePressureDropPa / 1000,
    hydraulic_power_W: rho * G * Q * cumulativeHead,
    inlet_pressure_Pa: inletPressurePa,
    outlet_pressure_Pa: inletPressurePa === null ? null : inletPressurePa - cumulativePressureDropPa,
    warnings,
    assumptions: [
      'Steady-state, incompressible, single-phase Newtonian liquid.',
      'Same volumetric flow through every segment; no branches, leaks or withdrawals.',
      'Segment K values use that segment internal velocity.',
      'Equipment pressure drops are user-supplied fixed values and are not flow-corrected.',
      'First-segment velocity-head change is zero unless inletDiameter is supplied.'
    ]
  };
}

const api = { calculateMultiSegment };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
else if (typeof window !== 'undefined') window.PumpHydraulicsV51 = api;
