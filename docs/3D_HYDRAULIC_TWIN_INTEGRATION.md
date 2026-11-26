# 3D Hydraulic Twin Integration

**Status:** Integration branch; not production-released.  
**Source project:** `jeeva-source/pump-sizing-` (companion repository).  
**Target project:** `jeeva-source/pump-hydraulics-engineering-suite`.

## Components integrated

- `app/hydraulics-3d.js`: Three.js interactive scene with pump/motor skid, pipe segments, flanges, reducers, valve/equipment representations, supports and flow tracer animation.
- `app/pipe-layout-3d.js`: converts V5.1 multi-segment calculation results into normalized visual geometry and colour metrics.
- `app/storage-config.js`: browser-side configuration persistence and restore.
- Controls: isometric/elevation/pump camera presets, service/velocity/pressure colour modes, exploded pipe assembly, flow pause/resume, fullscreen and segment selection linked to the hydraulic profile.

## Deployment decision

The companion repository's original import map referenced `/vendor/three`, served by its Express server. The target project is deployed as a static Vercel `app` output, so that route is unavailable. The integrated import map pins Three.js and its addons to jsDelivr `0.187.0`. This is a runtime CDN dependency; an offline/self-hosted distribution should vendor or bundle the exact dependency in a later build step.

## Engineering boundaries

- The 3D scene visualizes the V5.1 serial multi-segment result; it is not a CAD model or mechanical design deliverable.
- Visual dimensions, pump geometry, supports, valves and equipment are illustrative and must not be used for fabrication, stress analysis, nozzle-load assessment or construction.
- The visualization does not alter V5.1–V5.6 hydraulic calculations.
- Branched/looped network visualization, pump curves in the 3D scene, and multi-case envelope visualization are not included.
- Browser/WebGL performance varies by GPU and browser. Node tests do not prove WebGL rendering or interaction.

## Validation required before release

1. Run the complete `npm test` suite including layout and storage tests.
2. Verify Vercel preview loads Three.js and addons without 404/CORS errors.
3. In a real browser, calculate the default example and verify the pump/pipe assembly appears.
4. Verify segment click ↔ table row selection, camera presets, colour modes, explode slider, flow pause/resume and fullscreen/escape.
5. Save, reload and restore a configuration; confirm no silent data loss.
6. Confirm all existing V5.2–V5.6 module links and calculation pages remain operational.
