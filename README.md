# Pump Hydraulics Engineering Suite V4

Desktop engineering workspace based on the user's supplied pump hydraulics calculator and the V3 application. V4 preserves the existing calculator and adds a vendor-curve operating-point module.

## V4 additions

- Vendor pump curve entry by pasted CSV: flow (m³/h), head (m), efficiency (%) and NPSHr (m).
- Piecewise-linear interpolation between entered vendor points. The solver does not extrapolate beyond the supplied curve.
- Numerical pump/system intersection solver using the current process system curve from the calculator.
- Single-pump, identical-pump parallel and series arrangements.
- Optional variable-speed affinity-law scaling (Q ∝ N, H ∝ N², P ∝ N³) with explicit approximation notes.
- Operating-point outputs: flow, head, interpolated efficiency, hydraulic power, estimated shaft power where efficiency is available, NPSHa, NPSHr and NPSH difference.
- Pump/system curve plot and CSV export of the calculated operating point.
- Clearly labelled synthetic example data for interface testing only; it is not manufacturer data.

## Reference research used

The V4 workflow was informed by the public `aks498-cmyk/pumpsizer` project:

- Repository: https://github.com/aks498-cmyk/pumpsizer
- README: https://github.com/aks498-cmyk/pumpsizer/blob/master/README.md
- License: https://github.com/aks498-cmyk/pumpsizer/blob/master/LICENSE (MIT; copyright notice identifies Ashok, 2026)

Useful reference concepts include system characteristics from pipe reaches and minor losses, pump curves from manufacturer points, solving pump/system operating-point intersections, series/parallel combinations, VFD affinity scaling and NPSH review. This V4 implementation is an independent JavaScript implementation of those general engineering workflows; it does not bundle or copy the reference repository's Python source or catalogue data. The reference repository is water-supply oriented and is not treated as a validated process-pump catalogue.

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm install
npm start
```

## Build installers

```bash
npm install
npm run dist
```

Run the build on the target operating system. Windows output is configured for an NSIS x64 installer; macOS for DMG; Linux for AppImage. Installer generation has not been run in this environment because Electron dependencies are not installed here.

## Curve data format

Paste rows in strictly increasing flow order. Header is optional.

```csv
Q_m3h,H_m,eff_pct,NPSHr_m
0,52,,
20,49,55,1.8
40,43,70,2.4
60,34,76,3.2
80,22,68,4.5
```

The numbers above are illustrative only. Replace them with verified points digitised from the selected manufacturer's curve, including impeller diameter, speed, liquid, test standard, revision and source page in the project records. Use consistent units as labelled by the application.

## Engineering basis and assumptions

- Existing V3 calculator remains the source for process system head, line friction and NPSHa.
- Darcy–Weisbach / Colebrook–White and existing minor-loss coefficients remain as in V3; their limitations are unchanged.
- Curve interpolation is piecewise linear between supplied points. No polynomial fit or out-of-range extrapolation is used.
- Parallel pump calculation assumes identical pumps with equal flow sharing. Series calculation assumes identical pumps at common flow.
- VFD affinity scaling is an approximation. Efficiency is interpolated at the corresponding base-curve flow; actual efficiency changes with speed and must be confirmed from vendor data.
- NPSHr speed scaling uses an approximate square-law relationship; use actual vendor NPSHr curves for final checks.
- The operating point is a mathematical intersection, not a guarantee that the pump can operate there continuously. Check BEP, POR, AOR, minimum continuous stable flow, runout, maximum power, motor loading, vibration, seal limits and vendor operating restrictions.
- A positive NPSHa−NPSHr value alone does not establish adequate NPSH margin. Apply the project-adopted ANSI/HI guidance and vendor requirements.
- No complete API 610 audit, ANSI/HI certification, viscosity correction, surge analysis, mechanical design, seal selection or materials verification is implemented.

## Standards register inherited from V3

- ANSI/HI 9.6.1-2024 — NPSH margin guideline.
- ANSI/HI 9.6.3-2024 — operating regions (BEP/POR/AOR); this application compares user-entered vendor data and does not derive limits from the standard.
- ANSI/HI 9.6.7-2021 — viscosity effects; full correction is not implemented.
- ASME B36.10 — steel pipe dimensions; verify the hard-coded data against the licensed edition and project material specification.
- Crane TP-410 — fitting/valve resistance; K values require geometry-specific verification.
- API Standard 610, 12th Edition (January 2021) — only for applicable petroleum/petrochemical/natural-gas services; no full compliance audit is implemented.

## Important limitations

This is an engineering calculation and screening aid, not certified engineering software or a code-compliance package. Independent verification is required before design, procurement, construction or operation. The app has been syntax-checked, but a full Electron launch, installer build and independent validation against a known vendor curve have not been completed in this environment. Confirm all inputs, units, calculations and vendor data independently.


## V5.0 calculation-engine foundation

V5.0 adds a standalone SI-internal single-line hydraulic engine in `src/hydraulics-v5.js`. It provides explicit unit conversion, input validation, velocity, Reynolds number, Churchill (1977) Darcy friction factor, Darcy–Weisbach major loss, minor losses, static head, total head and hydraulic power. Transitional-flow cases are flagged for review.

Run the V5.0 checks with:

```bash
npm test
```

The V5.0 engine is currently a calculation foundation, not yet wired into the legacy V4 interface. The repository currently does not contain the `app/` directory referenced by the desktop packaging configuration; UI integration and deployable-app restoration are separate required tasks. See [V5 calculation basis](docs/V5_CALCULATION_BASIS.md) for equations, units, assumptions and exclusions.


## Vercel deployment

This is a static browser interface. Import the repository into Vercel and set the framework preset to **Other**, build command blank, and output directory to **app**. The browser-compatible engine bundle is included in `app/hydraulics-v5.js`. Electron desktop packaging includes both `app/` and `src/`.
