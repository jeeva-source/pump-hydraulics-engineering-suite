# Engineering Review Notes — Pump Hydraulics Engineering Suite

**Review status:** Engineering-development guidance  
**Scope:** Hydraulic calculation workflow and design-basis controls  
**Important:** This application is a preliminary engineering aid. Its output is not a substitute for project design review, vendor confirmation, or applicable code compliance verification.

## 1. Design-basis requirements

Record and verify, for each operating case:

- Fluid name, composition where relevant, temperature, density, dynamic viscosity, vapour pressure, and solids content.
- Minimum, normal, maximum, start-up, turndown, and credible upset flow rates.
- Suction and discharge source/destination pressures and liquid levels, with gauge or absolute basis clearly identified.
- Pipe material, schedule, nominal size, actual internal diameter, length, elevation profile, and roughness.
- Fittings, valves, strainers, filters, meters, exchangers, and other equipment pressure losses. State the source of each loss coefficient or vendor pressure-drop value.
- Pump curve revision, speed, impeller diameter, test basis, fluid, and units. Confirm the curve is applicable to the selected pump configuration.

Do not silently substitute assumed values for missing project data. Flag missing or estimated inputs in the calculation report.

## 2. Hydraulic calculation checks

### 2.1 Flow and velocity
- Confirm consistent units and distinguish actual volumetric flow from standard or mass flow.
- Check continuity: Q = A × v.
- Report velocity in every evaluated line segment and compare it with project-specific criteria.

### 2.2 Friction and pressure loss
- Calculate Reynolds number using the stated hydraulic diameter and fluid properties.
- Use the laminar Darcy friction factor f = 64/Re where applicable.
- For turbulent flow, document the selected correlation and its valid range. The current V5 implementation uses the Churchill (1977) all-regime Darcy friction-factor correlation. Verify its use and sensitivity against an independent reference for the Reynolds-number and roughness range of each project.
- Separate major pipe friction from minor fitting/equipment losses.
- Confirm elevation and pressure terms are handled with a consistent datum and sign convention.
- Independently benchmark representative laminar, transitional, and turbulent cases.

### 2.3 System curve and pump operating point
- Build the system curve from static head and flow-dependent losses for the defined system configuration.
- Confirm pump and system curves use matching flow, head, speed, and impeller units.
- Interpolate only between supplied vendor-curve points. Do not extrapolate beyond the entered curve.
- Treat a calculated intersection as a mathematical operating point, not proof of acceptable pump operation.
- Review minimum continuous stable flow, preferred/allowable operating regions, runout, shutoff head, motor loading, and control-valve implications against the actual vendor data.

### 2.4 Power
- Distinguish hydraulic power from pump shaft power and motor input power.
- State the efficiency assumptions and ensure density, flow, head, and unit conversions are consistent.
- Do not use estimated efficiency as a substitute for a vendor performance curve.

### 2.5 NPSH
- Calculate NPSHa on an absolute-pressure basis, with vapour pressure at the operating temperature.
- Include suction static head, source pressure, and suction-side losses with a documented datum.
- Compare NPSHa with vendor NPSHr and the applicable project-required margin; NPSHa > NPSHr alone is not a complete acceptance criterion.
- Review transient, start-up, low-level, high-temperature, and fouled-strainer cases where relevant.

## 3. Standards and technical references

Use the current project-adopted editions and verify applicability before design use:

- ANSI/HI 9.6.1 — Rotodynamic Pumps: Guideline for NPSH Margin.
- ANSI/HI 9.6.3 — Rotodynamic Pumps: Guideline for Operating Regions.
- ANSI/HI 9.6.7 — Rotodynamic Pumps: Guideline for Effects of Liquid Viscosity on Performance.
- API 610 — Centrifugal Pumps for Petroleum, Petrochemical and Natural Gas Industries, where specified by the project.
- ASME B36.10M — Welded and Seamless Wrought Steel Pipe dimensions.
- Crane Technical Paper No. 410 — Flow of Fluids through Valves, Fittings, and Pipe.

A reference register is not a compliance check. Confirm contractual code hierarchy, edition, addenda, jurisdictional requirements, and licensed standard text through the project document-control process.

## 4. Known model limitations to disclose

The current calculator provides preliminary single-line and serial multi-segment liquid calculations. V5.1.1 adds source/destination absolute-pressure boundary inputs, optional vapour-pressure screening, strict explicit-unit validation, and separate configurable suction/discharge velocity screening. It remains a series-path model, not a connected network solver. Unless explicitly implemented and validated, do not claim support for:

- Full multi-branch network balancing or pressure-dependent control logic.
- General non-Newtonian rheology or comprehensive viscosity correction.
- Transient surge, water hammer, column separation, or dynamic system response.
- Detailed pump mechanical design, rotor dynamics, seal systems, vibration, or motor starting studies.
- Certified API 610 / ANSI-HI compliance or guaranteed vendor performance.
- CFD, cavitation prediction, two-phase flow, or solids-handling validation.

Affinity-law VFD scaling and identical-pump series/parallel calculations are approximations and require configuration-specific verification.

## 5. Engineering review and release checklist

Before using results in a design deliverable:

1. Confirm the design basis and all units.
2. Identify assumptions, estimates, exclusions, and unresolved inputs.
3. Independently check critical calculations and at least one limiting operating case.
4. Verify the pump curve and NPSHr data against the vendor's certified or approved documentation.
5. Review BEP, preferred/allowable operating region, minimum flow, runout, shutoff, motor power, and NPSH margin.
6. Confirm pipe schedule/internal diameter, fittings, elevations, and equipment losses.
7. Verify the applicable standards and project specifications with document control.
8. Obtain approval from the responsible process and rotating-equipment engineers.

**Engineering hold point:** Do not release a pump datasheet, purchase order, construction package, or operating instruction solely on the basis of this application's output.
