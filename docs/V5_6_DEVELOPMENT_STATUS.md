# V5.6 Development Status — 26 November 2026

## Delivery
V5.6.0 pipe-derived system-curve engine and browser module added to the integrated development branch `v5.4-pump-selection-npsh`, PR #5.

## Implemented
- Generates sampled system curves by rerunning V5.1.1 at each flow point.
- Includes major/minor pipe losses, Churchill friction, elevation and pressure-boundary contributions.
- Uses 21–501 points (default 101); no quadratic curve fit.
- Finds pump/system intersections within the supplied manufacturer curve range; refines sign-change roots using bisection against the hydraulic engine.
- Reports operating duty, loss breakdown, hydraulic/shaft/motor power, optional NPSH screening, BEP and warnings.
- Browser page: `app/pipe-system-curve.html`.

## Explicit limitations
- Single serial path only; no V5.2 branched network coupling.
- Fixed equipment pressure drops are rejected because they are not flow-dependent equipment curves.
- Manufacturer pump curve must cover the operating range; no extrapolation.
- Multiple intersections: lowest-flow result is provisional.
- Tangential roots without a sign change may not be detected by the sampled bracket scan; increase sample count and review the plotted curve. A dedicated tangent-root search is a future hardening item.
- NPSHa is optional screening input, not a replacement for V5.4 source/suction calculation.
- No transient, two-phase, compressible or standards-compliance assessment.

## Verification
Pending CI and preview deployment for this commit. Do not mark V5.6 production released until full CI, deployment checks, interactive browser verification and independent engineering review are complete.

## Release state
PR #5 remains open and unmerged. Production main is not changed.
