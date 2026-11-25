# V5.1 Multi-Segment Pipe Hydraulics — Calculation Basis

## Scope
V5.1 models one steady-state liquid flow path composed of serial pipe segments. Each segment can have an independent internal diameter, length, absolute roughness, fitting/valve K total, equipment pressure drop and signed elevation change. The same volumetric flow and fluid properties apply to every segment.

## Segment equations
For each segment i:
- Area: A_i = πD_i²/4
- Velocity: v_i = Q/A_i
- Reynolds number: Re_i = ρv_iD_i/μ
- Darcy major loss: h_f,i = f_i(L_i/D_i)(v_i²/2g)
- Minor loss: h_m,i = ΣK_i(v_i²/2g)
- Equipment loss head: h_e,i = ΔP_equipment,i/(ρg)
- Velocity-head change: Δh_v,i = (v_i²-v_(i-1)²)/(2g)
- Segment required head: H_i = h_f,i + h_m,i + h_e,i + Δz_i + Δh_v,i
- Segment pressure drop: ΔP_i = ρgH_i

Darcy friction factor uses the V5.0 Churchill (1977) all-regime correlation. For the first segment, the velocity-head change is assumed zero only when no inlet reference diameter is supplied; the application emits a warning in that case. Supply the actual inlet reference diameter to calculate the inlet-to-first-segment velocity-head change.

## Boundary pressure and overall outputs
When both source and destination absolute pressures are supplied, the required pump head includes the boundary pressure contribution (P_destination − P_source)/(ρg). A destination pressure alone is not sufficient; source absolute pressure is mandatory. The reported segment pressure profile is the pressure profile from the entered inlet pressure after the modeled segment pressure changes; it does not assume a pump location within the path. The pipe-path pressure drop remains separately reported.

The total required head is the sum of segment required heads plus the pressure-boundary contribution. The pipe-path pressure drop includes friction, fittings, equipment, elevation and net velocity-head change. The required pump pressure difference additionally includes the source-to-destination absolute-pressure boundary contribution when both are provided. Hydraulic power is ρgQH_total. If inlet pressure is supplied, the app reports a calculated pressure profile by subtracting cumulative segment pressure drop.

## Assumptions and limitations
- Steady-state, incompressible, single-phase Newtonian liquid.
- One serial path with constant flow through all segments; no branches, withdrawals, leaks or network balancing.
- Fluid density and viscosity are constant across the model.
- Each segment's K values are based on that segment's mean velocity.
- Equipment pressure drop is a user-entered fixed value; it is not automatically corrected with flow.
- No pump curve, control-valve characteristic, compressibility, two-phase flow, transient surge/water hammer, thermal property variation or network solver is included.
- Pressure results are only as reliable as the entered boundary pressure, elevations, geometry, fitting coefficients and equipment data.
- Suction and discharge velocity screening limits are separately configurable; the defaults (1.5 and 3.0 m/s) are screening assumptions only, not universal design limits.
- Optional vapour-pressure screening compares calculated absolute pressure against the user-entered vapour pressure at operating temperature. It is not a detailed cavitation model.
- Absolute pressures must be positive. Blank numeric inputs and omitted units are rejected; explicit units are required for all dimensional inputs.
- Fixed equipment pressure drops are rejected at zero flow because the model has no flow-dependent equipment characteristic.
- Transitional flow is flagged for engineering review.

This is a preliminary engineering aid, not certified software or a code-compliance package. Independently verify calculations and project criteria before design, procurement, construction or operation.
