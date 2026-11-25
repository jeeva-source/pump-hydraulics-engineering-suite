'use strict';

/**
 * V5.0 preliminary single-line hydraulic engine.
 * SI internally; all public inputs require explicit units where applicable.
 * Darcy friction factor uses Churchill (1977), a continuous all-regime correlation.
 */
const G = 9.80665;
const UNIT = {
  flow: { 'm3/h': 1/3600, 'L/s': 1e-3, 'm3/s': 1, 'US gpm': 6.30901964e-5 },
  length: { m: 1, mm: 1e-3, cm: 1e-2, ft: 0.3048, in: 0.0254 },
  roughness: { mm: 1e-3, m: 1, micron: 1e-6, in: 0.0254 },
  pressure: { Pa: 1, kPa: 1e3, bar: 1e5, psi: 6894.757293 },
  density: { 'kg/m3': 1, 'g/cm3': 1000 },
  viscosity: { 'Pa.s': 1, 'mPa.s': 1e-3, cP: 1e-3 },
};

function finite(value, name) {
  const n = Number(value);
  if (!Number.isFinite(n)) throw new TypeError(name + ' must be a finite number');
  return n;
}
function convert(value, quantity, from, to) {
  const table = UNIT[quantity];
  if (!table || !(from in table) || !(to in table)) {
    throw new RangeError('Unsupported ' + quantity + ' unit conversion: ' + from + ' to ' + to);
  }
  return finite(value, 'value') * table[from] / table[to];
}
function toSI(value, quantity, unit, name) {
  const table = UNIT[quantity];
  if (!table || !(unit in table)) throw new RangeError('Unsupported ' + quantity + ' unit: ' + unit);
  return finite(value, name) * table[unit];
}
function churchillDarcy(Re, relativeRoughness) {
  if (!(Re > 0)) return null;
  if (!(relativeRoughness >= 0)) throw new RangeError('Relative roughness cannot be negative');
  const term = Math.pow(7 / Re, 0.9) + 0.27 * relativeRoughness;
  const logArg = 1 / term;
  const A = Math.pow(2.457 * Math.log(logArg), 16);
  const B = Math.pow(37530 / Re, 16);
  return 8 * Math.pow(Math.pow(8 / Re, 12) + 1 / Math.pow(A + B, 1.5), 1/12);
}

/**
 * Required inputs:
 * flow, flowUnit, diameter, diameterUnit, length, lengthUnit,
 * roughness, roughnessUnit, density, densityUnit, viscosity, viscosityUnit.
 * Optional: minorLossK (number or array of K values), staticHead, staticHeadUnit.
 */
function calculateLine(input) {
  if (!input || typeof input !== 'object') throw new TypeError('Input object is required');
  const Q = toSI(input.flow, 'flow', input.flowUnit, 'flow');
  const D = toSI(input.diameter, 'length', input.diameterUnit, 'diameter');
  const L = toSI(input.length, 'length', input.lengthUnit, 'length');
  const eps = toSI(input.roughness, 'roughness', input.roughnessUnit, 'roughness');
  const rho = toSI(input.density, 'density', input.densityUnit, 'density');
  const mu = toSI(input.viscosity, 'viscosity', input.viscosityUnit, 'viscosity');
  const staticHead = input.staticHead === undefined ? 0 :
    toSI(input.staticHead, 'length', input.staticHeadUnit || 'm', 'staticHead');

  if (Q < 0) throw new RangeError('Flow cannot be negative');
  if (!(D > 0)) throw new RangeError('Pipe internal diameter must be greater than zero');
  if (L < 0 || eps < 0) throw new RangeError('Pipe length and roughness cannot be negative');
  if (!(rho > 0)) throw new RangeError('Density must be greater than zero');
  if (!(mu > 0)) throw new RangeError('Dynamic viscosity must be greater than zero');
  if (eps >= D) throw new RangeError('Absolute roughness must be smaller than pipe internal diameter');

  const Kvalues = input.minorLossK === undefined ? [] :
    (Array.isArray(input.minorLossK) ? input.minorLossK : [input.minorLossK]);
  const Ktotal = Kvalues.reduce((sum, value, i) => {
    const k = finite(value, 'minorLossK[' + i + ']');
    if (k < 0) throw new RangeError('Minor-loss K values cannot be negative');
    return sum + k;
  }, 0);

  const area = Math.PI * D * D / 4;
  const velocity = Q / area;
  const Re = velocity === 0 ? 0 : rho * velocity * D / mu;
  const f = Re === 0 ? null : churchillDarcy(Re, eps / D);
  const velocityHead = velocity * velocity / (2 * G);
  const majorHead = f === null ? 0 : f * (L / D) * velocityHead;
  const minorHead = Ktotal * velocityHead;
  const totalLossHead = majorHead + minorHead;
  const totalHead = staticHead + totalLossHead;
  const dynamicPressureDrop = rho * G * totalLossHead;

  return {
    basis: 'SI',
    flow_m3_s: Q,
    diameter_m: D,
    area_m2: area,
    velocity_m_s: velocity,
    reynolds: Re,
    relative_roughness: eps / D,
    darcy_friction_factor: f,
    regime: Re === 0 ? 'No flow' : Re < 2300 ? 'Laminar' : Re <= 4000 ? 'Transitional' : 'Turbulent',
    minor_loss_K_total: Ktotal,
    static_head_m: staticHead,
    major_loss_head_m: majorHead,
    minor_loss_head_m: minorHead,
    total_friction_and_minor_loss_m: totalLossHead,
    total_dynamic_head_m: totalHead,
    dynamic_pressure_drop_Pa: dynamicPressureDrop,
    hydraulic_power_W: rho * G * Q * totalHead,
    warnings: Re > 2300 && Re <= 4000
      ? ['Flow is in the transitional Reynolds-number range; verify sensitivity and operating cases.']
      : [],
    method: 'Darcy-Weisbach with Churchill (1977) Darcy friction factor',
  };
}

const api = { G, UNIT, convert, churchillDarcy, calculateLine };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
else if (typeof window !== 'undefined') window.PumpHydraulicsV5 = api;
