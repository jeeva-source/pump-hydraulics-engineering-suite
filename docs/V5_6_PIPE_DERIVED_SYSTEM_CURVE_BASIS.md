# V5.6.0 — Automatic pipe-derived system curve

## Scope
V5.6 generates a system curve by recalculating the existing V5.1.1 serial multi-segment liquid hydraulics at multiple flow rates. It then finds intersections against supplied manufacturer pump-curve data. No quadratic system-curve fit is used.

## Calculation method
1. Validate the manufacturer curve using the V5.3 curve validator.
2. Evaluate the V5.1.1 serial path at zero flow to establish the static/boundary head contribution.
3. Evaluate the same path at 101 (configurable 21–501) flow samples from zero to the maximum manufacturer flow.
4. Preserve Darcy–Weisbach major loss, Churchill Darcy friction factor, segment-specific minor K, signed elevation and optional absolute pressure-boundary contributions from V5.1.1.
5. Search the overlapping manufacturer flow range using manufacturer curve knots plus generated flow samples. Sign-changing roots are refined against the hydraulic engine by bisection; a bounded golden-section minimisation of the absolute head residual in each interval also screens for tangential contacts without a sign change.
6. Report the lowest-flow intersection provisionally if multiple intersections exist, with an explicit warning.

## Input contract
- `hydraulicInput`: V5.1.1 input except `flow`; density, viscosity and all segment geometry/roughness values retain explicit V5.1 units.
- `pumpCurve`: at least three ascending manufacturer points in SI: `flow_m3_s`, `head_m`, optional complete efficiency/NPSHr/shaft-power fields.
- `sampleCount`: integer 21–501, default 101.
- Optional `motorEfficiency_pct` and `npsha_m`.

## Important exclusions
- One serial path only; no branches or withdrawals.
- Fixed equipment pressure drops are rejected. V5.1 represents them as constant user-entered drops, not flow-dependent equipment curves. Applying a constant value to every flow sample would distort the curve. A later module should add validated equipment/valve performance functions.
- If no inlet reference diameter is supplied, V5.1 assumes the first-segment velocity-head change is zero and warns.
- Pump curve extrapolation is prohibited.
- Multiple roots are reported; lowest flow is provisional, not a stability determination. Tangential-contact detection uses a bounded numerical minimum of absolute head residual within each sampled interval and a strict residual tolerance; it is a numerical screen, not a formal proof of all possible roots.
- NPSHa is accepted as a screening input only; V5.6 does not replace V5.4 source/suction NPSHa calculation.
- No automatic V5.2 branched-network coupling. A network pump boundary formulation requires separate engineering validation.
- No transient, two-phase, compressible, non-Newtonian or certified API/ANSI-HI/ISO assessment.

## Verification
See `docs/V5_6_DEVELOPMENT_STATUS.md`. Software regression tests do not replace independent engineering verification with project-specific benchmarks and manufacturer data.
