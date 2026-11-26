# V5.6 Development Status — 26 November 2026

## Delivery
V5.6.0 pipe-derived system-curve engine and browser module added to the integrated development branch `v5.4-pump-selection-npsh`, PR #5.

## Implemented
- Generates sampled system curves by rerunning V5.1.1 at each flow point.
- Includes major/minor pipe losses, Churchill friction, elevation and pressure-boundary contributions.
- Uses 21–501 points (default 101); no quadratic curve fit.
- Finds pump/system intersections within the supplied manufacturer curve range; refines sign-change roots using bisection against the hydraulic engine.
- Adds bounded golden-section minimisation of absolute head residual in each sampled interval to detect tangential contacts without sign changes, with a strict head-residual acceptance tolerance.
- Reports operating duty, loss breakdown, hydraulic/shaft/motor power, optional NPSH screening, BEP and warnings.
- Browser page: `app/pipe-system-curve.html`.

## Explicit limitations
- Single serial path only; no V5.2 branched network coupling.
- Fixed equipment pressure drops are rejected because they are not flow-dependent equipment curves.
- Manufacturer pump curve must cover the operating range; no extrapolation.
- Multiple intersections: lowest-flow result is provisional.
- Tangential-contact detection is numerical and interval-local; closely spaced or highly oscillatory intersections may still require a denser flow grid and manual curve review.
- NPSHa is optional screening input, not a replacement for V5.4 source/suction calculation.
- No transient, two-phase, compressible or standards-compliance assessment.

## Verification
- GitHub Actions workflow run #107 passed the complete `npm test` suite on branch head `259b5aaf60f507ba1b2450b57a7cef82473ba1cf`: https://github.com/jeeva-source/pump-hydraulics-engineering-suite/actions/runs/45759916446
- Source/browser V5.6 engine files match byte-for-byte (asserted by the V5.6 regression test).
- Vercel preview deployment `dpl_26RkYqfa45YpoTVnprWBHjgLJbWs` was READY. The V5.6 page and engine bundle, plus V5.0/V5.1/V5.3 dependencies, returned HTTP 200: https://pump-hydraulics-engineering-suite-4fk01i15f-jee-8996.vercel.app/pipe-system-curve.html
- Preview deployment record: `dpl_26RkYqfa45YpoTVnprWBHjgLJbWs`, READY, URL https://pump-hydraulics-engineering-suite-4fk01i15f-jee-8996.vercel.app. Its recorded commit is `3425b3364cdc68a0dba0dded12dd57eb59e72018`; the V5.6 runtime files and page were included and returned HTTP 200. Later branch changes were tests/docs/main-page metadata only.
- A fresh deployment from the final branch head was attempted but Vercel rejected it with the team Hobby 24-hour deployment API quota (`api-deployments-young-hobby-team-24h`, retry after 86400 seconds). No production promotion or setting change was attempted.
- Interactive browser input-to-result automation and independent engineering review have not been completed. The new tangency regression is a synthetic numerical test, not an independent pump test certificate.

## Release state
PR #5 remains open and unmerged. Production main is not changed.
