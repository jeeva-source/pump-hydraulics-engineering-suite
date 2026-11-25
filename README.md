# Pump Hydraulics Engineering Suite

Engineering calculation workspace with V5.0 single-line hydraulics and V5.1.1 hardened multi-segment pipe hydraulics.

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

## V5.0 foundation
- SI-internal unit conversion and input validation.
- Velocity, Reynolds number, Churchill (1977) Darcy friction factor.
- Darcy-Weisbach major losses, minor losses, static head, TDH and hydraulic power.

## Run and test
Requirements: Node.js 20+.

```bash
npm test
```

The V5.1.1 multi-segment engine is available as `src/hydraulics-v5-1.js`; the static browser bundle is `app/hydraulics-v5-1.js`. The web UI is `app/index.html`.

## Vercel deployment
Import this repository into Vercel. Select Framework Preset **Other**, leave the build command blank, and set Output Directory to `app`.

## Release status
See [V5.1.1 release status and remaining gates](docs/V5_1_1_RELEASE_STATUS.md).

## Engineering basis
See [V5.0 calculation basis](docs/V5_CALCULATION_BASIS.md) and [V5.1 multi-segment calculation basis](docs/V5_1_MULTI_SEGMENT_BASIS.md).

## Important limitations
This is a preliminary engineering aid, not certified engineering software or a code-compliance package. V5.1 is a single serial path, not a branched network solver. Fluid properties are constant; equipment pressure drop is a fixed user input; no pump curve, control-valve characteristic, transient surge, two-phase flow or network balancing is included. Independently validate all calculations and project-specific design criteria before engineering release.
