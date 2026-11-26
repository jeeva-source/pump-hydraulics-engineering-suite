# Pump Hydraulics Engineering Suite — Project History

**Repository:** https://github.com/jeeva-source/pump-hydraulics-engineering-suite  
**Owner:** jeeva-source  
**Project objective:** A practical, traceable pump and piping engineering calculation workspace for process engineers.

This file is the durable project memory and development history. Update it whenever a release, architecture decision, reference, major validation result, or deployment state changes.

## Project principles

1. Keep the calculation engine separate from the browser interface.
2. Use SI internally and state units explicitly.
3. Prefer manufacturer pump-curve points over invented or fitted generic curves.
4. Never extrapolate manufacturer data silently.
5. Show assumptions, warnings, intermediate results and limitations.
6. A passing software test is not proof of engineering validity; use independent benchmarks and manufacturer/project review.
7. Keep the interface simpler than a full commercial simulator: inputs first, calculated duty and checks next, report/export last.
8. Do not claim standards compliance without an applicable, validated assessment method.

## Development timeline

| Stage | Scope | Recorded status |
|---|---|---|
| V4 | Initial pump hydraulics application and repository foundation | Uploaded by repository owner |
| V5.0 | Single-line hydraulics, SI conversions, Churchill friction, Darcy–Weisbach, minor losses, static head, TDH and hydraulic power | Implemented; historical CI passed |
| V5.1 | Serial multi-segment pipe hydraulics with individual diameters, lengths, roughness, K values, elevations and equipment pressure drops | Implemented |
| V5.1.1 | Input/boundary hardening, pressure and vapour screening, regression benchmarks, documentation corrections | Merged to main; CI run #34 passed |
| V5.2 | Connected branched/looped network solver, nodal piezometric heads, fixed-head boundaries, demands and continuity reporting | Implemented on integrated development branch; engineering limitations documented |
| V5.3 | Manufacturer pump curves, system curve, operating point, BEP, efficiency and power | Implemented on integrated development branch |
| V5.3.1 | Exact interval-wise intersection solver; multiple/tangent roots; zero-efficiency shutoff; negative static-head handling; network validation | Implemented on integrated development branch |
| V5.4 | NPSHa from source/suction conditions, NPSHr comparison, project margin, POR/AOR/MCSF/runout, candidate comparison | Implemented on integrated development branch |
| V5.5 | Identical pumps in series/parallel, speed-ratio curve transformation, total/per-pump power and case report | Implemented; CI #88 passed; Vercel preview READY; interactive browser test pending |

## Key repository milestones

- V5.1.1 squash merge commit: `d8e4c85d1c93601b04c485d140e8789b50fa136e`.
- V5.1.1 production deployment was verified READY at: https://pump-hydraulics-engineering-suite.vercel.app
- V5.4 integrated development branch: `v5.4-pump-selection-npsh`.
- Active integrated PR before V5.5 extension: https://github.com/jeeva-source/pump-hydraulics-engineering-suite/pull/5
- PR #5 contains V5.2, V5.3.1 and V5.4 changes; it was open and not merged at the last recorded check.
- V5.4 preview deployment: https://pump-hydraulics-engineering-suite-27b0rr998-jee-8996.vercel.app
- V5.4 preview was READY; production main remained V5.1.1.
- V5.5 integrated preview: https://pump-hydraulics-engineering-suite-gyfi74hlg-jee-8996.vercel.app (READY, branch `v5.4-pump-selection-npsh`, commit `6b9ee9888dcbc4974269dc661487ea3846254290`).
- GitHub Actions run #91 passed the complete V5.0–V5.5 test suite on commit `6b9ee9888dcbc4974269dc661487ea3846254290`.

## Open-source research and provenance

Primary reference reviewed for V5.5:
- `hermes98761234/pump-system-curve`: https://github.com/hermes98761234/pump-system-curve
- MIT License confirmed.
- Its series/parallel pump relationships, affinity-law approach and compact browser workflow informed V5.5.
- V5.5 code was independently implemented in the existing V5.3/V5.4 engine architecture; no upstream source file was copied.

Other reviewed projects:
- `Cheito91/pump-calculator`: https://github.com/Cheito91/pump-calculator — MIT; early-alpha Streamlit pump/piping calculator, not adopted as a code base.
- `lucascerriku/pipe-flow-pump-sizing-calculator`: https://github.com/lucascerriku/pipe-flow-pump-sizing-calculator — MIT stated in README; useful single-line hydraulic benchmark project.
- `GreekDevFillip/centrifugal-pump-simulator`: https://github.com/GreekDevFillip/centrifugal-pump-simulator — small C++ power calculator, not adopted.

See [Open-source reference review](OPEN_SOURCE_REFERENCE_REVIEW.md) and [V5.5 development status](V5_5_DEVELOPMENT_STATUS.md).

## Current architecture

- `src/hydraulics-v5.js`: V5.0 single-line liquid hydraulics.
- `src/hydraulics-v5-1.js`: V5.1 serial multi-segment pipe hydraulics.
- `src/network-v5-2.js`: V5.2 connected pipe network.
- `src/pump-performance-v5-3.js`: V5.3 pump curve and operating point.
- `src/pump-selection-v5-4.js`: V5.4 NPSH and vendor operating-limit screening.
- `src/pump-configurations-v5-5.js`: V5.5 identical pump arrangements and speed cases.
- Browser engine bundles in `app/` are kept byte-for-byte aligned with their source engines.
- Calculation regression tests are in `tests/`; `npm test` runs the complete versioned suite.

## Current engineering boundaries

- V5.1 is a single serial flow path.
- V5.2 is a preliminary steady, incompressible, single-phase network solver.
- V5.3 system curve is quadratic and calibrated from a static head and design point; it is not yet automatically derived from V5.1/V5.2 pipe/network cases.
- V5.4 NPSHa requires explicit suction-source data. Vendor NPSHr/POR/AOR/MCSF/runout data must be supplied.
- V5.5 supports identical pumps only and assumes equal load sharing. It does not solve unequal parallel branch flow or interstage NPSHa for series pumps.
- At changed speed, V5.5 does not scale vendor NPSHr or vendor shaft power; manufacturer data at the selected speed is required for final selection.
- No water hammer/transient, two-phase, CFD, detailed cavitation or certified API/ANSI-HI compliance assessment is included.

## Next planned development

1. Interactive browser verification of V5.4/V5.5 pages.
2. Link V5.1/V5.2 hydraulic system calculations directly to the V5.3 system-curve builder.
3. Add multi-case operating envelope (minimum/normal/maximum/upset) with saved case inputs.
4. Improve project report with input register, vendor curve revision, assumptions, calculation trace and warnings.
5. Consider non-identical pump arrangements only after a robust network-based method and benchmark set are available.
6. Keep water hammer and transient analysis as a separately validated specialist module.

## Update discipline

At each development session, append:
- date and branch/commit;
- files added or changed;
- calculation scope and assumptions;
- test/CI evidence;
- preview/production deployment evidence;
- known defects and next actions.

Never mark a feature as complete or production released solely because code was written.


## V5.6 development — 26 November 2026

- Added `src/pipe-system-curve-v5-6.js` and matching browser bundle `app/pipe-system-curve-v5-6.js`.
- Added `app/pipe-system-curve.html`: serial pipe inputs, manufacturer curve, sampled system curve, operating point, loss breakdown, warnings, JSON export and print.
- Method: re-evaluate V5.1.1 at each sampled flow; do not fit a quadratic system curve. Refine sign-change intersections against the hydraulic engine by bisection.
- Fixed equipment pressure drops are explicitly rejected because V5.1 models them as constants, not flow-dependent equipment curves.
- Branched network coupling deliberately deferred; pump boundary semantics require separate validation.
- Tests/CI and Vercel preview: pending at the time of this history entry; update after verification.
- PR #5 remains unmerged; production main remains unchanged.
