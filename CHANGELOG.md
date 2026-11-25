# Changelog

## V5.3.0 — Pump performance and operating point (development)\n- Added manufacturer pump-curve input with piecewise-linear interpolation and no extrapolation.\n- Added quadratic system curve calibrated from static head and a design flow/head point.\n- Added pump/system intersection solver, BEP identification, hydraulic power, efficiency-based shaft-power estimate and optional motor input estimate.\n- Added optional NPSHa/NPSHr screening and manufacturer curve metadata.\n- Added standalone chart-based browser interface and regression tests.\n- Explicitly disclose that system curve is not yet auto-generated from V5.1/V5.2 cases.\n\n## V5.2 — Connected pipe network (development)\n- Added preliminary steady-state nodal network engine for branches and loops with signed pipe flows and continuity residuals.\n- Added fixed-head boundaries, node withdrawals, topology validation, browser interface and regression tests.\n\n## V5.1.0 — Multi-segment pipe hydraulics
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
