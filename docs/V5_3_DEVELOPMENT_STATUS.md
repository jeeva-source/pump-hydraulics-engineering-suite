# V5.3 Development Status — 25 November 2026

## Delivery
V5.3 pump performance and operating-point module is implemented on branch `v5.3-pump-performance`. It is available in a Vercel preview and is proposed for integration through pull request #3.

## Implemented
- Manufacturer pump curve points for flow, head, efficiency, NPSHr and shaft power.
- Optional manufacturer, model, rated speed, impeller diameter, curve revision and fluid-basis metadata.
- Piecewise-linear interpolation between supplied pump curve points.
- No extrapolation beyond the supplied pump curve.
- Quadratic system curve from static head and one design flow/head point.
- Pump/system intersection using interval bracketing and bisection.
- Discrete supplied-data BEP identification.
- Hydraulic power, efficiency-based shaft-power estimate and optional motor input estimate.
- Optional NPSHa/NPSHr screening and manufacturer shaft-power comparison.
- Chart-based UI at `app/pump-performance.html`.
- V5.2 correction: fixed-head boundary flow is separated from internal-node continuity residuals.

## Verification performed
- V5.0, V5.1.1, V5.2 and V5.3 regression test files executed through an isolated JavaScript harness: all assertions passed.
- Source and browser engine bundles for V5.0, V5.1, V5.2 and V5.3 compared byte-for-byte: matched.
- V5.3 inline browser JavaScript syntax compilation: passed.
- Vercel preview deployment: READY.
- HTTP smoke tests returned 200 for the main page, V5.3 pump UI, V5.3 engine bundle, V5.2 network UI and V5.2 engine bundle.
- Full `npm test` through GitHub Actions was not confirmed; do not interpret isolated harness execution as a GitHub Actions run.
- Interactive browser calculation workflow has not been automated end-to-end.

## Preview
`https://pump-hydraulics-engineering-suite-ktrkue1rc-jee-8996.vercel.app/pump-performance.html`

## Pull request
`https://github.com/jeeva-source/pump-hydraulics-engineering-suite/pull/3`

## Engineering basis and limitations
The system curve uses `H = Hstatic + Ksys Q²`, calibrated from one user-supplied design point. V5.3 does not automatically generate the system curve by calling V5.1/V5.2. BEP is the highest-efficiency supplied discrete curve point, not a fitted continuous maximum. The operating-region warning is a 20% deviation screening flag only; it is not a universal acceptance criterion. NPSH margin is reported but no universal margin is imposed.

No speed/impeller affinity correction, viscosity correction, dissimilar/parallel/series pump modelling, vendor POR/AOR/minimum-flow/runout limits, detailed NPSHa derivation, transient analysis, or API/ANSI-HI compliance certification is implemented.

All example pump data is illustrative. Use manufacturer-approved curves and project-specific criteria. Independent engineering review is required before design use or production release.
