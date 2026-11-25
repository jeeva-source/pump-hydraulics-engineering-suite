# V5.1.1 Release Status

**Release:** V5.1.1 Engineering Verification and Input Hardening  
**Merged:** 25 November 2026  
**Pull request:** #1  
**Merge commit:** d8e4c85d1c93601b04c485d140e8789b50fa136e

## Completed

- Source and destination absolute-pressure boundary contribution is included in required pump head when both boundary pressures are provided.
- Absolute-pressure validity and optional liquid vapour-pressure screening are implemented.
- Blank numeric inputs, non-decimal numeric strings and missing dimensional units are rejected.
- Omitted inlet reference diameter is explicitly warned because the first-segment velocity-head change cannot otherwise be determined.
- Separate configurable suction and discharge velocity screening limits are available.
- Negative net head and negative hydraulic power are flagged.
- Fixed equipment pressure drops are rejected at zero flow.
- Source and browser calculation engines are synchronized and regression-tested for drift.
- Regression coverage includes laminar friction, turbulent Churchill/Colebrook comparison, transitional warning, a two-segment worked example, pressure boundaries and edge-case validation.
- Stale Churchill/Swamee–Jain documentation, V5.0 About label, roadmap scope and broken curve test script were corrected.
- Full `npm test` passed in GitHub Actions run #34 before merge.

## Outstanding release administration

1. **Software license:** No license file has been added. The repository owner must choose the intended license after considering ownership and distribution terms. No license has been selected on the owner's behalf.
2. **Dependency lockfile:** `package-lock.json` is not present. Generate and commit it using the project's chosen Node/npm version before relying on reproducible Electron packaging or `npm ci`.
3. **Deployment smoke test:** Vercel output is configured as `app`, but a live deployment was not independently verified as part of this code change. Confirm the Vercel deployment URL, load the app, and run the default and boundary-pressure cases.
4. **Engineering sign-off:** Validate project-specific velocity criteria, pipe internal diameters, fitting K values, fluid vapour pressure, and equipment pressure-drop data. The application remains a preliminary engineering aid.

## Model limitations

V5.1.1 is a steady, incompressible, single-phase, Newtonian-liquid model for one serial flow path. It is not a branched network solver. Pump curves, pump operating points, NPSHa/NPSHr calculations, detailed cavitation, water hammer, transient analysis and certified API/ANSI-HI compliance are not implemented.

The calculated passive pressure profile does not assume a pump location. The pressure-boundary contribution affects required pump head separately.
