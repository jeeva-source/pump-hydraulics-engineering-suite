'use strict';

/**
 * V5.1.1 multi-segment liquid hydraulics.
 * Series-path, steady, incompressible, single-phase Newtonian liquid model.
 * All dimensional inputs require explicit units. Internal calculations use SI.
 */
const V5 = typeof module !== 'undefined' && module.exports
  ? require('./hydraulics-v5')
  : (typeof window !== 'undefined' ? window.PumpHydraulicsV5 : null);
if (!V5) throw new Error('V5.0 hydraulic engine must be loaded before V5.1.1');
const { G } = V5;
const PRESSURE = { Pa: 1, kPa: 1e3, bar: 1e5, psi: 6894.75729316836 };

function numeric(value, name) {
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
    throw new TypeError(name + ' is required; blank is not zero');
  }
  if (typeof value === 'string' && !/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(value.trim())) {
    throw new TypeError(name + ' must be a decimal number');
  }
  const n = Number(value);
  if (!Number.isFinite(n)) throw new TypeError(name + ' must be a finite number');
  return n;
}
function convertRequired(value, quantity, unitName, name) {
  if (!unitName) throw new TypeError(name + ' unit is required');
  const baseUnit = { flow: 'm3/s', density: 'kg/m3', viscosity: 'Pa.s', length: 'm', roughness: 'm' }[quantity];\n  if (!baseUnit) throw new RangeError('Unsupported quantity: ' + quantity);\n  return V5.convert(numeric(value, name), quantity, unitName, baseUnit);
}
function pressureRequired(value, unitName, name) {
  if (!unitName || !(unitName in PRESSURE)) throw new RangeError(name + ' requires a supported explicit pressure unit');
  return numeric(value, name) * PRESSURE[unitName];
}
function optionalPressure(value, unitName, name) {
  return value === undefined || value === null ? null : pressureRequired(value, unitName, name);
}
function optionalLength(value, unitName, name) {
  return value === undefined || value === null ? null : convertRequired(value, 'length', unitName, name);
}

/**
 * Required common inputs: flow/flowUnit, density/densityUnit,
 * viscosity/viscosityUnit, segments[].diameter/diameterUnit,
 * length/lengthUnit, roughness/roughnessUnit.
 * Optional boundary inputs: inletPressure (absolute), outletPressure (absolute),
 * vapourPressure (absolute), inletDiameter; all require explicit units.
 * Optional velocity limits: suctionVelocityLimit, dischargeVelocityLimit (m/s).
 * Segments may set service:'suction'|'discharge' for separate velocity screening.
 */
function calculateMultiSegment(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Input object is required');
  if (!Array.isArray(input.segments) || input.segments.length === 0) throw new RangeError('At least one pipe segment is required');

  const Q = convertRequired(input.flow, 'flow', input.flowUnit, 'flow');
  const rho = convertRequired(input.density, 'density', input.densityUnit, 'density');
  const mu = convertRequired(input.viscosity, 'viscosity', input.viscosityUnit, 'viscosity');
  if (Q < 0) throw new RangeError('Flow cannot be negative');
  if (!(rho > 0)) throw new RangeError('Density must be greater than zero');
  if (!(mu > 0)) throw new RangeError('Dynamic viscosity must be greater than zero');

  const inletPressurePa = optionalPressure(input.inletPressure, input.inletPressureUnit, 'inletPressure');
  const outletPressurePa = optionalPressure(input.outletPressure, input.outletPressureUnit, 'outletPressure');
  const vapourPressurePa = optionalPressure(input.vapourPressure, input.vapourPressureUnit, 'vapourPressure');
  if (inletPressurePa !== null && !(inletPressurePa > 0)) throw new RangeError('Inlet absolute pressure must be greater than zero');
  if (outletPressurePa !== null && !(outletPressurePa > 0)) throw new RangeError('Outlet absolute pressure must be greater than zero');
  if (vapourPressurePa !== null && vapourPressurePa < 0) throw new RangeError('Vapour pressure cannot be negative');
  if ((outletPressurePa !== null || vapourPressurePa !== null) && inletPressurePa === null) {
    throw new RangeError('Inlet absolute pressure is required when outlet pressure or vapour pressure is specified');
  }
  const inletDiameter = optionalLength(input.inletDiameter, input.inletDiameterUnit, 'inletDiameter');
  if (inletDiameter !== null && !(inletDiameter > 0)) throw new RangeError('Inlet diameter must be greater than zero');

  const suctionLimit = input.suctionVelocityLimit === undefined ? 1.5 : numeric(input.suctionVelocityLimit, 'suctionVelocityLimit');
  const dischargeLimit = input.dischargeVelocityLimit === undefined ? 3.0 : numeric(input.dischargeVelocityLimit, 'dischargeVelocityLimit');
  if (!(suctionLimit > 0) || !(dischargeLimit > 0)) throw new RangeError('Velocity screening limits must be greater than zero');

  let previousVelocityHead = inletDiameter === null ? null : Math.pow(Q / (Math.PI * inletDiameter ** 2 / 4), 2) / (2 * G);
  let cumulativeHead = 0, cumulativePressureDropPa = 0;
  const warnings = [];\n  if (inletDiameter === null) warnings.push('Inlet reference diameter omitted: first-segment velocity-head change is assumed zero. Supply an inlet diameter or confirm the source boundary is at rest / same velocity head.');
  const results = input.segments.map((segment, index) => {
    if (!segment || typeof segment !== 'object' || Array.isArray(segment)) throw new TypeError('Segment ' + (index + 1) + ' must be an object');
    const label = segment.name || ('Segment ' + (index + 1));
    const D = convertRequired(segment.diameter, 'length', segment.diameterUnit, label + ' diameter');
    const L = convertRequired(segment.length, 'length', segment.lengthUnit, label + ' length');
    const eps = convertRequired(segment.roughness, 'roughness', segment.roughnessUnit, label + ' roughness');
    const dz = segment.elevationChange === undefined ? 0 :
      convertRequired(segment.elevationChange, 'length', segment.elevationChangeUnit, label + ' elevationChange');
    if (!(D > 0)) throw new RangeError(label + ': diameter must be greater than zero');
    if (L < 0 || eps < 0) throw new RangeError(label + ': length and roughness cannot be negative');
    if (eps >= D) throw new RangeError(label + ': roughness must be smaller than diameter');
    const service = segment.service || 'discharge';
    if (!['suction', 'discharge'].includes(service)) throw new RangeError(label + ': service must be suction or discharge');

    const Kvalues = segment.minorLossK === undefined ? [] : (Array.isArray(segment.minorLossK) ? segment.minorLossK : [segment.minorLossK]);
    const K = Kvalues.reduce((sum, value, i) => {
      const k = numeric(value, label + ' minorLossK[' + i + ']');
      if (k < 0) throw new RangeError(label + ': K values cannot be negative');
      return sum + k;
    }, 0);
    const equipmentDropPa = segment.equipmentPressureDrop === undefined ? 0 :
      pressureRequired(segment.equipmentPressureDrop, segment.equipmentPressureDropUnit, label + ' equipmentPressureDrop');
    if (equipmentDropPa < 0) throw new RangeError(label + ': equipment pressure drop cannot be negative');
    if (Q === 0 && equipmentDropPa > 0) throw new RangeError(label + ': fixed equipment pressure drop cannot be applied at zero flow; provide a zero-flow equipment model or remove the loss');

    const area = Math.PI * D * D / 4, velocity = Q / area;
    const Re = velocity === 0 ? 0 : rho * velocity * D / mu;
    const f = Re === 0 ? null : V5.churchillDarcy(Re, eps / D);
    const velocityHead = velocity ** 2 / (2 * G);
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

    if (Re >= 2300 && Re <= 4000) warnings.push(label + ': transitional Reynolds-number range; verify sensitivity.');
    const velocityLimit = service === 'suction' ? suctionLimit : dischargeLimit;
    if (Q > 0 && velocity > velocityLimit) warnings.push(label + ': ' + service + ' velocity ' + velocity.toFixed(3) + ' m/s exceeds configured screening limit ' + velocityLimit + ' m/s; verify project criteria.');
    if (netHead < 0) warnings.push(label + ': negative segment net head; check elevation, boundary conditions and flow direction.');
    if (pressureOutPa !== null && pressureOutPa <= 0) warnings.push(label + ': calculated absolute pressure is at or below zero; result is physically invalid.');
    else if (pressureOutPa !== null && vapourPressurePa !== null && pressureOutPa < vapourPressurePa) warnings.push(label + ': calculated absolute pressure is below the entered liquid vapour pressure; single-phase model is invalid and flashing/cavitation risk requires review.');

    previousVelocityHead = velocityHead;
    return {
      index: index + 1, name: label, service, diameter_m: D, length_m: L, roughness_m: eps,
      area_m2: area, velocity_m_s: velocity, reynolds: Re, darcy_friction_factor: f,
      regime: Re === 0 ? 'No flow' : Re < 2300 ? 'Laminar' : Re <= 4000 ? 'Transitional' : 'Turbulent',
      minor_loss_K_total: K, elevation_change_m: dz,
      major_loss_head_m: major, minor_loss_head_m: minor, equipment_loss_head_m: equipmentHead,
      velocity_head_change_m: velocityHeadChange, net_required_head_m: netHead,
      pressure_drop_Pa: pressureDropPa, cumulative_required_head_m: cumulativeHead,
      cumulative_pressure_drop_Pa: cumulativePressureDropPa,
      inlet_pressure_Pa: pressureInPa, outlet_pressure_Pa: pressureOutPa
    };
  });

  const pressureBoundaryHead = inletPressurePa !== null && outletPressurePa !== null
    ? (outletPressurePa - inletPressurePa) / (rho * G) : 0;
  if (inletPressurePa !== null && outletPressurePa !== null && outletPressurePa <= 0) {
    throw new RangeError('Outlet absolute pressure must be greater than zero');
  }
  if (inletPressurePa !== null && outletPressurePa !== null && outletPressurePa < (vapourPressurePa || 0)) {
    warnings.push('Specified destination absolute pressure is below the entered vapour pressure; single-phase boundary condition is invalid.');
  }
  const totalRequiredHead = cumulativeHead + pressureBoundaryHead;
  if (totalRequiredHead < 0) warnings.push('Net required system head is negative; verify pressure boundaries, elevation datum and flow direction. A conventional pump may not be required for this direction of flow.');
  if (Q > 0 && totalRequiredHead < 0) warnings.push('Calculated hydraulic power is negative; this represents energy release under the selected sign convention, not positive pump input power.');
  if (inletPressurePa !== null && outletPressurePa === null && results.at(-1).outlet_pressure_Pa !== null &&
      results.at(-1).outlet_pressure_Pa <= 0) warnings.push('Calculated outlet absolute pressure is non-positive; the single-phase calculation is invalid.');

  return {
    basis: 'SI', model: 'Steady incompressible single-path multi-segment liquid model',
    flow_m3_s: Q, density_kg_m3: rho, viscosity_Pa_s: mu, segment_count: results.length, segments: results,
    total_major_loss_head_m: results.reduce((s, r) => s + r.major_loss_head_m, 0),
    total_minor_loss_head_m: results.reduce((s, r) => s + r.minor_loss_head_m, 0),
    total_equipment_loss_head_m: results.reduce((s, r) => s + r.equipment_loss_head_m, 0),
    total_elevation_change_m: results.reduce((s, r) => s + r.elevation_change_m, 0),
    total_velocity_head_change_m: results.reduce((s, r) => s + r.velocity_head_change_m, 0),
    pressure_boundary_head_m: pressureBoundaryHead,
    total_required_head_m: totalRequiredHead,
    total_pressure_drop_Pa: cumulativePressureDropPa,
    total_pressure_drop_kPa: cumulativePressureDropPa / 1000,
    hydraulic_power_W: rho * G * Q * totalRequiredHead,
    inlet_pressure_Pa: inletPressurePa, specified_outlet_pressure_Pa: outletPressurePa,
    calculated_outlet_pressure_Pa: inletPressurePa === null ? null : inletPressurePa - cumulativePressureDropPa,
    vapour_pressure_Pa: vapourPressurePa, warnings,
    assumptions: [
      'Steady-state, incompressible, single-phase Newtonian liquid.',
      'Same volumetric flow through every segment; no branches, leaks or withdrawals.',
      'Segment K values use that segment internal velocity.',
      'Equipment pressure drops are fixed user inputs; they are rejected at zero flow and are not flow-corrected.',
      'First-segment velocity-head change is zero unless an inlet reference diameter is supplied.',
      'Source/destination pressure contribution is included only when both absolute boundary pressures are supplied.',
      'Velocity limits are screening defaults only; project-specific criteria govern.'
    ]
  };
}
const api = { calculateMultiSegment };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
else if (typeof window !== 'undefined') window.PumpHydraulicsV51 = api;
