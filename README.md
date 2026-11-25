# Pump Hydraulics Engineering Suite

Engineering calculation workspace with V5.0 single-line hydraulics, V5.1.1 hardened multi-segment hydraulics and the V5.2 connected pipe-network calculation engine.

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

## V5.2 — Connected pipe-network engine (development branch)\n- Branches, junctions and closed loops using a nodal piezometric-head formulation.\n- Fixed total-head boundary nodes and specified nodal withdrawal demands.\n- Darcy–Weisbach edge losses with Churchill (1977) friction and aggregate minor-loss K.\n- Signed edge flows, nodal pressure head, continuity residuals and solver diagnostics.\n- SI-only inputs; see [V5.2 calculation basis](docs/V5_2_NETWORK_SOLVER_BASIS.md).\n\n## V5.0 foundation
- SI-internal unit conversion and input validation.
- Velocity, Reynolds number, Churchill (1977) Darcy friction factor.
- Darcy-Weisbach major losses, minor losses, static head, TDH and hydraulic power.

## Run and test
Requirements: Node.js 20+.

```bash
npm test
```

The V5.1.1 multi-segment engine is available as `src/hydraulics-v5-1.js`; the V5.2 network engine is `src/network-v5-2.js` with browser bundle `app/network-v5-2.js`. The current static UI is `app/index.html`; the V5.2 network UI is not yet integrated.

## Vercel deployment
Import this repository into Vercel. Select Framework Preset **Other**, leave the build command blank, and set Output Directory to `app`.

## Release status
See [V5.1.1 release status and remaining gates](docs/V5_1_1_RELEASE_STATUS.md).

## Engineering basis
See [V5.0 calculation basis](docs/V5_CALCULATION_BASIS.md) and [V5.1 multi-segment calculation basis](docs/V5_1_MULTI_SEGMENT_BASIS.md).

## Important limitations
This is a preliminary engineering aid, not certified engineering software or a code-compliance package. V5.1 remains a single serial path. The V5.2 engine adds a separate preliminary steady network solver, but its UI integration and independent engineering validation remain outstanding. No pump curve, control-valve characteristic, transient surge, two-phase flow, NPSH or certified code-compliance assessment is included. Independently validate all calculations and project-specific design criteria before engineering release.
