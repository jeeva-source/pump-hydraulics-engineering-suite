# Open-source pump-engineering reference review

**Review date:** 26 November 2026  
**Project:** Pump Hydraulics Engineering Suite  
**Purpose:** Reuse sound, understandable engineering ideas while keeping the suite's existing SI-first calculation engine, validation style, and traceable outputs.

## Primary reference adopted

### hermes98761234/pump-system-curve

- Repository: https://github.com/hermes98761234/pump-system-curve
- License: MIT (confirmed from the repository's `LICENSE` file).
- Scope: browser-based pump/system curves, pipe friction, operating point, NPSH, identical pumps in series/parallel, speed affinity laws, motor sizing, CSV/JSON/SVG export.
- Useful design ideas reviewed:
  - Keep manufacturer pump data as a discrete flow/head/efficiency/NPSHr table.
  - Combine identical pumps using the standard head/flow relationships.
  - Apply speed affinity relationships to a reference curve.
  - Calculate the operating point from the intersection of the combined pump curve and system curve.
  - Show NPSH and power outputs alongside the operating point.
  - Keep the application browser-based and easy to deploy.

### What we adopted in V5.5

V5.5 implements a small configuration layer in the suite's existing architecture:
- It reuses our V5.3 manufacturer-curve interpolation and exact interval-wise pump/system intersection solver.
- It transforms identical-pump curves for single, series and parallel arrangements.
- It applies the speed relationships (Q_2/Q_1=N_2/N_1) and (H_2/H_1=(N_2/N_1)^2).
- It reports total station duty and per-pump power.
- It explicitly warns about equal-flow/equal-load assumptions and missing vendor data at changed speed.

**No source-code files or code blocks were copied from the reference repository into this project for V5.5.** The equations and feature concepts were independently implemented in `src/pump-configurations-v5-5.js`, using our existing V5.3 engine as the calculation dependency. The reference is credited here for traceability and future maintainers.

## Engineering differences and safeguards

| Reference implementation characteristic | Our implementation decision |
|---|---|
| Fits a quadratic polynomial to pump-curve points | Retain piecewise-linear interpolation of supplied manufacturer points |
| Basic bisection operating-point search | Reuse our interval-wise analytical intersection solver, which detects multiple and tangent roots |
| Browser model primarily assumes water | Keep SI fluid density input for pump power; NPSH remains in the V5.4 explicit suction-data module |
| Speed affinity curve transformation | Apply Q and H scaling; hold efficiency only as a screening approximation |
| Affinity scaling may suggest NPSHr/power changes | Do not scale NPSHr or vendor shaft-power data at changed speed; require manufacturer curves at selected speed |
| Identical series/parallel units | Support identical units only and expose equal-load assumptions |
| System curve from suction/discharge pipe inputs | V5.5 currently consumes the V5.3 quadratic system-curve basis; automatic V5.1/V5.2 hydraulic-to-system-curve coupling remains future work |

The reference is useful software, not an authoritative design standard. Its own README identifies assumptions and limitations. Its output must not be treated as certified pump-selection or code-compliance evidence.

## Other repositories reviewed

### Cheito91/pump-calculator
- Repository: https://github.com/Cheito91/pump-calculator
- License: MIT (repository includes a LICENSE file).
- Scope: Python/Streamlit pipe hydraulics, pump power, NPSH, specific speed, affinity laws, curves and PDF reports.
- Reason not selected as the primary code reference: the README labels it an early alpha and explicitly says its calculations require thorough validation. It also lists many standards; those claims are not evidence of certified compliance.

### lucascerriku/pipe-flow-pump-sizing-calculator
- Repository: https://github.com/lucascerriku/pipe-flow-pump-sizing-calculator
- README identifies the project as MIT licensed.
- Scope: Darcy–Weisbach/Colebrook single-line pressure drop, minor losses, elevation, pump power, hand calculation and automated tests.
- Useful as a supplementary worked-example/benchmark reference for pipe sizing, not a full pump-curve selection suite.

### GreekDevFillip/centrifugal-pump-simulator
- Repository: https://github.com/GreekDevFillip/centrifugal-pump-simulator
- Scope: small C++ hydraulic/shaft-power calculator.
- Not adopted: limited feature scope; no pump curve/system intersection, vendor operating region or NPSH selection workflow.

## Licensing and attribution

The primary reference is distributed under the MIT License. V5.5 does not copy its source code; therefore no upstream source file is incorporated. The repository URL and license are recorded here for transparent engineering provenance. If future work copies or adapts any source code from that project, retain the upstream copyright and MIT permission notice in the distributed source and update this notice to identify the exact files and modifications.

## Engineering rule

Open-source software is a reference and implementation aid, not a replacement for:
- manufacturer-certified pump curves and datasheets;
- project-specific hydraulic design basis;
- applicable standards in their licensed, current editions;
- independently checked calculation benchmarks;
- qualified engineering review.

Do not claim API 610, ANSI/HI or ISO compliance merely because a feature or standard name appears in an open-source repository.
