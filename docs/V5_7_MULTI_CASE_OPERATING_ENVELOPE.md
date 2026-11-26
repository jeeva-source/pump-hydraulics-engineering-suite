# V5.7 — Multi-Case Pump Operating Envelope

**Date:** 26 November 2026  
**Branch:** `v5.4-pump-selection-npsh`  
**Scope:** Minimum/normal/maximum/upset steady-state cases evaluated against one supplied manufacturer pump curve.

## Calculation method

- Each operating case carries a complete V5.1 serial-path `hydraulicInput` object.
- Each case is independently evaluated by the V5.6 engine; the system curve is recalculated from the actual pipe model at each sampled flow. No generic quadratic curve fit is substituted.
- One common, validated manufacturer pump curve is used for all cases. Interpolation is piecewise linear and extrapolation is prohibited.
- Each case reports operating flow/head, hydraulic/shaft/motor power where data permit, BEP, intersections and hydraulic loss breakdown from V5.6.
- Optional case-specific NPSHa is compared with interpolated manufacturer NPSHr. A project-required margin is checked only when explicitly entered.
- Optional manufacturer POR/AOR/MCSF/runout limits are evaluated using V5.4. Missing vendor limits are surfaced as incomplete data, not inferred.
- Calculation errors are isolated to the affected case so the other cases can still be reviewed.

## Input contract

```js
{
  pumpCurve: [
    { flow_m3_s: 0.01, head_m: 45, efficiency_pct: 70, npshr_m: 2.0, shaft_power_kW: 8 },
    { flow_m3_s: 0.02, head_m: 38, efficiency_pct: 82, npshr_m: 2.8, shaft_power_kW: 10 },
    { flow_m3_s: 0.03, head_m: 25, efficiency_pct: 75, npshr_m: 3.8, shaft_power_kW: 12 }
  ],
  motorEfficiency_pct: 94,
  cases: [
    {
      id: "normal",
      name: "Normal operation",
      hydraulicInput: { /* complete V5.1 serial pipe input */ },
      npsha_m: 5.0,
      requiredNpshMargin_m: 1.0,
      vendorLimits: {
        porMinFlow_m3_s: 0.012, porMaxFlow_m3_s: 0.028,
        aorMinFlow_m3_s: 0.008, aorMaxFlow_m3_s: 0.03,
        mcsfFlow_m3_s: 0.006, runoutFlow_m3_s: 0.032
      }
    }
  ]
}
```

At least two cases are required. Case IDs must be unique. The `hydraulicInput` is the same object contract accepted by V5.6/V5.1.1. All quantities are SI.

## Assessment logic

- AOR, MCSF and runout violations are treated as failed supplied manufacturer limits.
- POR is reported as a preferred-region check and warning; it is not silently treated as a hard trip criterion.
- NPSHa below NPSHr or below the entered project margin is a failed check.
- Missing NPSHa, NPSHr, project margin or vendor limits produces an incomplete assessment.
- Any per-case calculation error is retained in the envelope summary and does not discard valid sibling cases.

## Limitations and engineering boundaries

- Independent serial pipe paths only; branched network/pump coupling is not included.
- All cases use the same pump curve. For VFD or impeller changes, supply a separate validated curve in a future multi-curve extension; this version does not transform the vendor curve.
- NPSHa is entered per case; suction-source conditions are not recalculated here.
- Multiple intersections are reported, with the lowest-flow intersection provisional. No stability determination is made.
- Steady, incompressible, single-phase Newtonian liquid only.
- No transient, water-hammer, two-phase, compressible, CFD or certified API/ANSI-HI/ISO compliance assessment.
- Software tests are not a substitute for independent engineering benchmarks, vendor confirmation or project review.

## Verification

`tests/pump-operating-envelope-v5-7.test.js` covers three cases, common pump-curve use, power, NPSH margins, missing criteria, failed criteria, isolated case errors, duplicate IDs, invalid inputs and source/browser byte parity.
