# V5.5 Development Status — 26 November 2026

## Delivery

V5.5 pump arrangement and variable-speed case module is implemented on branch `v5.4-pump-selection-npsh`, as part of the integrated development PR #5.

## Implemented

- Single-pump case.
- Identical pumps in series: flow is common and heads add.
- Identical pumps in parallel: heads are common and flows add.
- Reference-speed curve transformation using Q2/Q1 = N2/N1 and H2/H1 = (N2/N1)^2.
- Reuse of the V5.3 piecewise-linear vendor curve interpolation and exact interval-wise pump/system intersection solver.
- Total station flow, head, hydraulic power, shaft power and motor input.
- Per-pump hydraulic/shaft/motor input power split under equal-load assumptions.
- No extrapolation beyond transformed manufacturer curve range.
- Changed-speed cases deliberately omit vendor NPSHr and vendor shaft-power points rather than applying unverified scaling.
- Browser UI at `app/pump-configurations.html`, with combined pump/system chart, operating-point marker, warnings, JSON export and print/save-PDF.
- Project history and open-source provenance documents added.

## Open-source reference

The MIT-licensed `hermes98761234/pump-system-curve` project was reviewed for series/parallel relationships, affinity-law workflow and compact browser UX:
https://github.com/hermes98761234/pump-system-curve

No source files or code blocks were copied. V5.5 independently implements these relationships in the suite's existing V5.3/V5.4 architecture. See `docs/OPEN_SOURCE_REFERENCE_REVIEW.md`.

## Verification

- V5.5 isolated JavaScript regression harness passed.
- V5.5 source and browser engine bundles match byte-for-byte.
- V5.5 browser inline JavaScript syntax check passed.
- GitHub Actions run #88 passed the complete `npm test` suite on commit `26b046d69323f33300488d51d34d069fb0f12c1d`.
- Vercel preview deployment READY for the same commit:
  - https://pump-hydraulics-engineering-suite-hrzr7ebov-jee-8996.vercel.app
  - `/`, `/network.html`, `/pump-performance.html`, `/pump-selection.html`, `/pump-configurations.html`, and `/pump-configurations-v5-5.js` returned HTTP 200.
- Interactive browser input-to-result automation has not been performed.

## Limitations

- Identical pumps only; dissimilar pump curves are not combined.
- Parallel flow split is assumed equal; branch/header resistance is not modelled.
- Series interstage NPSHa is not calculated.
- Changed-speed NPSHr and vendor shaft power are not inferred.
- Efficiency is held constant during speed transformation as a screening approximation.
- System curve remains the V5.3 quadratic; automatic coupling to V5.1/V5.2 is not yet implemented.
- No transient analysis or certified API/ANSI-HI/ISO compliance is claimed.

## Release state

PR #5 remains open and unmerged. Production main remains V5.1.1. V5.5 is a development preview, not a production release.
