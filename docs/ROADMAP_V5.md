# V5 Roadmap — Pump Hydraulics Engineering Suite

## V5 objective

Evolve the current calculator into a traceable pump-system engineering workspace, prioritising calculation integrity, transparent assumptions, and reviewable deliverables over unsupported claims of code compliance.

## Priority 1 — Calculation integrity

- Establish a controlled unit system with explicit input/output units and conversion tests.
- Add fluid-property inputs and clearly identify the temperature and pressure basis.
- Improve validation for missing, negative, non-finite, and physically inconsistent inputs.
- Add benchmark cases for laminar, transitional, and turbulent flow.
- Add regression tests for static head, friction losses, minor losses, power, NPSHa, and curve interpolation.
- Preserve the no-extrapolation rule for vendor pump curves and visibly flag out-of-range conditions.
- Include calculation assumptions, equation references, correlation names, and warnings in results.

**Acceptance:** Benchmark cases reproduce independently checked reference calculations within documented tolerances; invalid inputs fail safely and visibly.

## Priority 2 — System modelling

- Represent suction and discharge segments with individual lengths, diameters, roughness, elevations, and fittings.
- Support equipment pressure-drop elements and explicit boundary conditions.
- Develop a connected network model for branches, junctions, and multiple flow paths.
- Calculate flow distribution and node pressures using a documented numerical method.
- Provide a pressure profile and a clear network schematic.
- Detect disconnected nodes, inconsistent boundaries, and non-converged solutions.

**Acceptance:** Simple series and parallel network benchmarks converge to independently verified results, with solver status and residuals exposed.

## Priority 3 — Pump performance engineering

- Support vendor curve datasets with metadata, speed, impeller diameter, fluid basis, and revision.
- Improve operating-point analysis and clearly distinguish interpolation from solver results.
- Add BEP, preferred operating region, allowable operating region, minimum flow, runout, and shutoff checks when supported by vendor data.
- Expand pump arrangements beyond identical pumps, including dissimilar units where a robust method is validated.
- Improve NPSH reporting, required margin handling, and limiting-case evaluation.
- Add viscosity correction only with a documented method and validated applicability.
- Make VFD and affinity-law assumptions explicit and expose limitations.

**Acceptance:** Pump selection checks are traceable to the supplied vendor curve and project criteria; unavailable vendor limits are reported as unknown, not inferred.

## Priority 4 — Engineering deliverables

- Generate a calculation report containing design basis, input register, assumptions, equations, intermediate results, warnings, and revision details.
- Add a pump datasheet support summary without presenting it as a certified datasheet.
- Support project save/load with versioned JSON and CSV import/export.
- Add a case-comparison matrix for minimum, normal, maximum, start-up, and upset cases.
- Provide an auditable standards/reference register with edition and applicability fields.

**Acceptance:** A reviewer can reproduce a case from the exported inputs and identify every assumption and warning.

## Priority 5 — Quality, deployment, and maintainability

- Add automated unit, integration, and regression tests to CI.
- Add linting and static checks for the calculation engine.
- Separate calculation logic, UI, data validation, and report generation.
- Version the calculation model and export schema.
- Add deployment smoke tests and a documented release procedure.
- Maintain a known-limitations register and change log.

**Acceptance:** Every release passes the automated test suite and deployment smoke test; calculation changes include regression evidence.

## Suggested delivery sequence

1. V5.0: single-line hydraulics foundation.
2. V5.1: serial multi-segment pipe model and pressure profile.
3. V5.1.1: input, boundary-condition, pressure/vapour screening, benchmark-test and documentation hardening.
4. V5.2: connected network solver engine, standalone browser UI and regression tests (development branch; benchmark and CI validation in progress).
5. V5.3: vendor pump curves, operating-point and operating-region checks (planned).
6. V5.4: NPSH analysis, engineering reports, project files and case comparison (planned; not implemented).
7. V5.5: CI hardening, deployment verification and release documentation.

## Deferred specialist scope

Do not include the following in V5 without separate engineering methods, validation datasets, and specialist review:

- Water hammer, surge, transient pressure, and column separation.
- CFD and detailed cavitation modelling.
- Pump mechanical design, rotor dynamics, vibration, seals, and bearing life.
- Motor electrical studies and starting analysis.
- Certified API 610 / ANSI-HI compliance assessment.

## Release principle

The suite is a preliminary engineering and learning tool. It must clearly disclose assumptions and model limits and must not imply that software output alone constitutes an approved engineering design.
