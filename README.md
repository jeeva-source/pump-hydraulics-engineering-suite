# Pump Hydraulics Engineering Suite

Engineering calculation workspace with V5.0 single-line hydraulics, V5.1.1 hardened multi-segment hydraulics, V5.2 connected pipe networks, V5.3.1 pump performance hardening and V5.4 pump selection/NPSH assessment.

## V5.1.1 — Engineering verification and input hardening
- Serial suction/discharge line made of segments with different internal diameters, lengths and roughness.
- Segment-specific fitting/valve K totals.
- User-entered equipment pressure drops.
- Signed elevation changes and segment velocity-head changes.
- Segment-wise velocity, Reynolds number, Churchill Darcy friction factor, major/minor/equipment losses and pressure profile.
- Optional source and destination absolute-pressure boundaries; boundary pressure contribution included in required head.
- Optional liquid vapour-pressure screening and positive absolute-pressure validation.
- Explicit units and nonblank decimal numeric inputs required by the engine.
- Separate configurable suction and discharge velocity screening limits.
- Omitted inlet reference diameter produces a visible velocity-head assumption warning.
- Fixed equipment pressure drops are rejected at zero flow.
- Hydraulic power and overall required head.
- Dynamic add/remove segment interface for static web deployment.

## V5.2 — Connected pipe-network engine (development branch)
- Branches, junctions and closed loops using a nodal piezometric-head formulation.
- Fixed total-head boundary nodes and specified nodal withdrawal demands.
- Darcy–Weisbach edge losses with Churchill (1977) friction and aggregate minor-loss K.
- Signed edge flows, nodal pressure head, continuity residuals and solver diagnostics.
- SI-only inputs; see [V5.2 calculation basis](docs/V5_2_NETWORK_SOLVER_BASIS.md).

## V5.3.1 — Pump performance and operating point hardening (development branch)
- Manufacturer pump curve input with flow, head and optional efficiency, shaft power and NPSHr data.
- Quadratic system curve calibrated from static head and a system design point.
- Pump/system intersections solved analytically within supplied curve intervals, including multiple/tangent crossings, without extrapolation.
- Zero-efficiency shutoff points and negative net static head are handled explicitly.
- BEP identification, hydraulic power, efficiency-based shaft-power estimate, optional motor input and NPSH screening.
- Standalone chart-based interface at `app/pump-performance.html`.
- See [V5.3 calculation basis](docs/V5_3_PUMP_PERFORMANCE_BASIS.md).

## V5.0 foundation
- SI-internal unit conversion and input validation.
- Velocity, Reynolds number, Churchill (1977) Darcy friction factor.
- Darcy-Weisbach major losses, minor losses, static head, TDH and hydraulic power.

## Run and test
Requirements: Node.js 20+.

```bash
npm test
```

The V5.1.1 multi-segment engine is available as `src/hydraulics-v5-1.js`; the V5.2 network engine is `src/network-v5-2.js` with browser bundle `app/network-v5-2.js`. The current static multi-segment UI is `app/index.html`; the V5.2 network UI is `app/network.html`; the V5.3 pump performance UI is `app/pump-performance.html`; the V5.4 selection UI is `app/pump-selection.html`.

## V5.3 / V5.4 development status
See [V5.3 development status and verification](docs/V5_3_DEVELOPMENT_STATUS.md) and [V5.4 development status](docs/V5_4_DEVELOPMENT_STATUS.md).

## Vercel deployment
Import this repository into Vercel. Select Framework Preset **Other**, leave the build command blank, and set Output Directory to `app`.

## Release status
See [V5.1.1 release status and remaining gates](docs/V5_1_1_RELEASE_STATUS.md).

## Engineering basis
See [V5.0 calculation basis](docs/V5_CALCULATION_BASIS.md) and [V5.1 multi-segment calculation basis](docs/V5_1_MULTI_SEGMENT_BASIS.md).

## Important limitations
This is a preliminary engineering aid, not certified engineering software or a code-compliance package. V5.1 remains a single serial path. The V5.2 engine provides a preliminary steady network solver. V5.3 adds a separate pump/system curve operating-point tool; it does not yet automatically derive the V5.3 system curve from V5.1/V5.2 cases. No transient surge, two-phase flow or certified code-compliance assessment is included. Independently validate all calculations and project-specific design criteria before engineering release.


## V5.4 — Pump selection and NPSH assessment (development branch)
- Calculate NPSHa from source absolute pressure, vapour pressure, elevation, source velocity and suction losses.
- Compare calculated NPSHa with manufacturer NPSHr and a configurable project margin.
- Evaluate manufacturer-supplied POR/AOR/MCSF/runout limits without inferring missing limits.
- Compare multiple candidate pump curves against a common system duty.
- Provide approximate speed and impeller affinity-law helpers with explicit limitations.
- Browser interface: `app/pump-selection.html` with JSON report export and print/save-PDF.
- See [V5.4 calculation basis](docs/V5_4_PUMP_SELECTION_BASIS.md) and [V5.4 development status](docs/V5_4_DEVELOPMENT_STATUS.md).
