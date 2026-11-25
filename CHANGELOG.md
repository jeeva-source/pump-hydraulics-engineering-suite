# Changelog

## V4.0.0
- Preserved V3 hydraulic calculator, preliminary selection, report, visualizer, QA and project JSON workflow.
- Added vendor pump curve input (Q-H, efficiency, NPSHr).
- Added piecewise-linear interpolation with no extrapolation beyond entered curve limits.
- Added pump/system intersection solver and operating-point report.
- Added single, identical-pump series and parallel arrangements.
- Added optional VFD affinity-law scaling with explicit limitations.
- Added pump/system SVG plot and operating-point CSV export.
- Added curve-engine smoke tests.

## Reference
The workflow was informed by the public MIT-licensed `aks498-cmyk/pumpsizer` project. No source code or catalogue data from that repository is bundled in V4. See README.md for details and links.


## V5.0.0 — Calculation-engine foundation
- Added an SI-internal single-line hydraulic engine with explicit unit conversions.
- Added Churchill (1977) all-regime Darcy friction-factor calculation.
- Added velocity, Reynolds number, major/minor losses, static head, total head, pressure-drop and hydraulic-power outputs.
- Added input validation and transitional-flow warning.
- Added automated regression checks and calculation-basis documentation.
- The V5.0 engine is not yet integrated into the V4 interface; see README for repository structure status.
