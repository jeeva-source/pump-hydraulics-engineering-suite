# Changelog

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
