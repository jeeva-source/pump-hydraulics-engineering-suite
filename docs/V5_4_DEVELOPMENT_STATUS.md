# V5.4 Development Status — 26 November 2026

## Delivery

V5.4 pump selection and NPSH engineering module is implemented on branch `v5.4-pump-selection-npsh`, stacked on the V5.3 development branch.

## Implemented

- NPSHa from source absolute pressure, liquid vapour pressure, common-datum elevations, source velocity head and total suction loss head.
- Component breakdown and warnings for invalid/negative suction availability.
- NPSHr interpolation from the manufacturer pump curve at the V5.3 operating point.
- NPSH margin and configurable project-required margin evaluation.
- Manufacturer POR/AOR/MCSF/runout checks when vendor limits are supplied.
- Missing vendor limits are explicitly reported as not supplied; no limits are inferred.
- Multiple candidate pump comparisons against a common duty and suction case.
- No automatic ranking; candidate outputs preserve each assessment and its missing data.
- Approximate speed and impeller diameter affinity-law helpers with explicit warnings.
- Browser UI at `app/pump-selection.html` with candidate comparison, JSON report export and print/save-PDF workflow.
- SI-only calculation basis and regression tests.

## Verification performed

- V5.4 engine regression assertions executed in an isolated JavaScript harness: passed.
- V5.4 source/browser bundle byte-for-byte parity: passed.
- Full integrated V5.0–V5.3.1 GitHub Actions run #69 passed before V5.4 was added.
- Full V5.4-inclusive GitHub Actions run #71 passed on branch commit `7945788b182551f66aa3dcde3d67ecded601f608`; all V5.0, V5.1.1, V5.2, V5.3 and V5.4 test suites passed.
- Interactive browser input-to-result testing of the V5.4 page has not yet been performed.
- Vercel preview deployment READY for commit `7945788b182551f66aa3dcde3d67ecded601f608`; main, network, pump-performance and pump-selection pages plus the V5.4 and V5.3 browser engines returned HTTP 200.

## Limitations

NPSHa is based on user-supplied source/suction data. System curve is still the V5.3 quadratic approximation, not automatically generated from V5.1/V5.2. Affinity helpers provide approximate duty-point corrections only; they do not transform full vendor curves or correct efficiency/NPSHr. No certified API/ANSI-HI compliance is claimed.

Use manufacturer-approved curves and project-specific criteria. Independent engineering review is required before design use.
