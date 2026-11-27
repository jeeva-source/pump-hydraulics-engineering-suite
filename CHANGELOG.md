# Changelog\n\n## V5.6.0 — Automatic pipe-derived system curve (development)\n- Added sampled system-curve generation by recalculating V5.1.1 serial pipe hydraulics at multiple flow rates.\n- Added manufacturer pump-curve intersection with bisection refinement and no curve extrapolation.\n- Added loss breakdown, operating duty, power, optional NPSH screening and warnings.\n- Rejected fixed equipment pressure drops rather than treating them as flow-dependent; deferred V5.2 network coupling.\n- Added browser module, regression tests and engineering basis/status documentation.\n

## V5.5.0 — Pump configurations and variable-speed cases (development)
- Added identical-pump single/series/parallel curve transformation.
- Added reference-speed to selected-speed curve transformation using affinity-law flow/head relations.
- Added total and per-pump hydraulic/shaft/motor input power reporting.
- Deliberately withheld NPSHr and vendor shaft-power scaling at changed speed; added explicit manufacturer-data warnings.
- Added simplified configuration UI, pump/system curve chart, JSON report export and print/save-PDF.
- Added regression tests, calculation basis, durable project history and open-source reference review.


## V5.4.0 — Pump selection and NPSH assessment (development)
- Added source-to-pump NPSHa calculation with absolute pressure, vapour pressure, elevation, source velocity and suction losses.
- Added manufacturer NPSHr comparison and configurable project-required NPSH margin.
- Added vendor POR/AOR/MCSF/runout operating-limit evaluation; missing limits remain unknown.
- Added multiple candidate pump comparison and approximate speed/impeller affinity-law helpers.
- Added V5.4 browser interface with JSON report export and print/save-PDF workflow.
- Added V5.4 calculation basis and regression tests.


## V5.3.1 — Pump curve solver hardening (development)
- Solve pump/system intersections analytically within each linear vendor-curve interval; detect multiple and tangent intersections within one interval.
- Accept zero-efficiency shutoff data without dividing by zero or treating shutoff as BEP.
- Permit negative net static head with an explicit datum/pressure warning.
- Reject duplicate V5.2 pipe edge identifiers.
- Add numerical regression coverage for hidden/tangent intersections and shutoff data.


## V5.3.0 — Pump performance and operating point (development)
- Added manufacturer pump-curve input with piecewise-linear interpolation and no extrapolation.
- Added quadratic system curve calibrated from static head and a design flow/head point.
- Added pump/system intersection solver, BEP identification, hydraulic power, efficiency-based shaft-power estimate and optional motor input estimate.
- Added optional NPSHa/NPSHr screening and manufacturer curve metadata.
- Added standalone chart-based browser interface and regression tests.
- Explicitly disclose that system curve is not yet auto-generated from V5.1/V5.2 cases.

## V5.2 — Connected pipe network (development)
- Added preliminary steady-state nodal network engine for branches and loops with signed pipe flows and continuity residuals.
- Added fixed-head boundaries, node withdrawals, topology validation, browser interface and regression tests.

## V5.1.0 — Multi-segment pipe hydraulics
- Added serial multi-segment liquid hydraulic engine with segment-specific pipe diameter, length and roughness.
- Added segment-specific minor-loss coefficients, equipment pressure-drop inputs and signed elevation changes.
- Added velocity-head change treatment at diameter transitions and cumulative segment pressure profile.
- Added optional inlet pressure and inlet reference diameter.
- Added responsive web interface with dynamic segment add/remove controls and segment results table.
- Added V5.1 regression tests and calculation-basis documentation.
- Explicitly scoped the model to steady incompressible single-path liquid service.

## V5.0.0 — Calculation-engine foundation
- Added SI-internal single-line hydraulic engine and unit conversions.
- Added Churchill (1977) all-regime Darcy friction-factor calculation.
- Added velocity, Reynolds number, major/minor losses, static head, total head, pressure drop and hydraulic power.
- Added input validation and transitional-flow warning.
- Added automated regression checks and calculation-basis documentation.

## V5.1.1 — Engineering verification and input hardening

- Added source/destination absolute-pressure boundary contribution to required pump head.
- Added optional liquid vapour-pressure screening and warnings for non-positive calculated absolute pressure.
- Reject blank numeric values, non-decimal numeric strings, missing dimensional units and non-positive absolute boundary pressures.
- Added explicit warning when inlet reference diameter is omitted.
- Added separate configurable suction/discharge velocity screening thresholds and negative-head/power warnings.
- Reject fixed equipment pressure drop at zero flow rather than silently applying a flow-independent loss.
- Synchronized tested source engines with browser bundles and strengthened regression tests.
- Corrected engineering notes, roadmap, desktop About version and removed the broken test:curve command.
