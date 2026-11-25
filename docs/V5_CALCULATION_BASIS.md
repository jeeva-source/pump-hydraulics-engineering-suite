# V5.0 Calculation Basis — Single-Line Hydraulic Engine

## Scope

V5.0 introduces a standalone, SI-internal calculation module for preliminary single-line liquid hydraulics. It does not yet replace the legacy V4 user interface or claim connected-network capability.

## Equations

- Cross-sectional area: A = πD²/4
- Mean velocity: v = Q/A
- Reynolds number: Re = ρvD/μ
- Velocity head: v²/(2g)
- Darcy–Weisbach major loss: h_f = f(L/D)(v²/2g)
- Minor loss: h_m = ΣK(v²/2g)
- Total dynamic head for this line model: H = H_static + h_f + h_m
- Dynamic pressure drop due to line losses: ΔP = ρg(h_f + h_m)
- Hydraulic power based on total calculated head: P_h = ρgQH

## Friction factor

The module uses the Churchill (1977) explicit all-regime Darcy friction-factor correlation. This avoids switching abruptly between separate laminar and turbulent equations. The result is still a correlation-based estimate; transitional-flow sensitivity must be reviewed. The application reports the conventional Reynolds-number labels (<2300 laminar, 2300–4000 transitional, >4000 turbulent) as guidance, not as a guarantee of stable regime behaviour.

## Unit handling

The public input contract requires explicit units for flow, pipe diameter, pipe length, absolute roughness, and dynamic viscosity. Density defaults to kg/m³ only when its unit is omitted. Calculations are performed in SI. Supported units are declared in the source module and unsupported unit strings are rejected.

## Validation and safeguards

- Rejects non-finite values, negative flow, negative length/roughness, non-positive diameter/density/viscosity, and roughness greater than or equal to diameter.
- Rejects negative minor-loss K values.
- Supports a scalar K or an array of K values.
- Zero flow returns zero velocity and zero flow-dependent losses; friction factor is null.
- Reports warnings for the transitional Reynolds-number range.

## Important interpretation

This is a straight, constant-diameter line model with one representative velocity and one set of fluid properties. Static head is signed; a negative value represents a net elevation decrease in the chosen flow direction. It does not model elevation profiles, multiple pipe segments, fittings with different diameters, pump curves, suction-vessel pressure, NPSHa/NPSHr, compressibility, non-Newtonian fluids, two-phase flow, water hammer, or network balancing. The returned dynamic pressure drop excludes static elevation head. Hydraulic power uses total head including static head.

Use actual pipe internal diameter, fluid properties at operating conditions, and verified fitting/equipment loss data. Independently check results before design or procurement use.
