# V5.3 Pump Performance and Operating Point — Calculation Basis

## Scope
V5.3 calculates the intersection of a supplied centrifugal-pump manufacturer curve and a quadratic system curve. It reports the operating flow/head, interpolated pump efficiency, BEP point, hydraulic power, estimated shaft power, optional motor input power, and optional NPSHa/NPSHr screening.

## Required inputs and units
- Liquid density: kg/m³
- Pump manufacturer curve flow: m³/s
- Pump head: m
- Optional pump efficiency: percent (0–100)
- Optional manufacturer NPSHr: m
- Optional manufacturer shaft power: kW
- System static head: m
- System design flow: m³/s
- System head at design flow: m
- Optional motor efficiency: percent (0–100)
- Optional available NPSH (NPSHa): m

Use manufacturer-certified/tested data for the pump curve. The example dataset in the UI is illustrative only and must not be used for equipment selection.

## Pump curve interpolation
Pump head and optional performance quantities are linearly interpolated between adjacent supplied manufacturer data points. Flow points must be strictly increasing. Head values are not forced to be monotonic because some manufacturer curves can have drooping or saddle characteristics; the solver checks every adjacent interval and reports multiple intersections. Optional series must be complete at every point when included. The solver does not extrapolate beyond the supplied flow range.

## System curve
The system curve is represented by:

\[
H_{sys}=H_{static}+K_{sys}Q^2
\]

where:

\[
K_{sys}=\frac{H_{design}-H_{static}}{Q_{design}^2}
\]

This quadratic form is an approximation for a fixed system configuration with predominantly turbulent-flow resistance. The user must obtain static head and the design-point system head from a valid system hydraulic calculation. V5.3 does not yet automatically call the V5.1.1 or V5.2 engines to build this curve.

## Operating point
The intersection is found within each adjacent pump-curve interval using bisection on the difference between interpolated pump head and system head. No extrapolation is performed. Multiple intersections are all returned in the `intersections` array. The lowest-flow intersection is displayed as a provisional point, with an explicit warning and selection-policy note; the engineer must establish the physically stable operating point from the full pump/system behaviour.

## Power
Hydraulic power:

\[
P_h=\rho gQH
\]

Estimated pump shaft power is calculated from hydraulic power and interpolated pump efficiency when a complete efficiency curve is supplied:

\[
P_{shaft}=\frac{P_h}{\eta_{pump}}
\]

Motor electrical input estimate is calculated only when motor efficiency is entered:

\[
P_{motor,in}=\frac{P_{shaft}}{\eta_{motor}}
\]

Manufacturer shaft power is interpolated separately when provided and compared with the efficiency-based estimate. The `estimatedShaftPower_kW` field is populated only when pump efficiency is supplied. If only manufacturer shaft power is available, motor input may be estimated from that curve and the output explicitly identifies the basis. Actual driver sizing must include project-specific service factors and vendor requirements.

## NPSH screening
When NPSHa and a complete NPSHr curve are supplied, the engine reports their difference. This is a screening comparison only. Required margin must be set from the pump manufacturer and applicable project/industry criteria; no universal margin is assumed.

## Limitations
Steady-state single-pump analysis only. No speed/impeller-diameter affinity correction, viscosity correction, parallel/series pump combination, control-valve dynamics, pressure-dependent demand, transient analysis, detailed suction-line NPSHa calculation, or certified API/ANSI-HI compliance. Confirm curve basis, impeller diameter, speed, fluid viscosity, density, temperature, test tolerances and operating limits with the manufacturer. Independently verify all results before design use.
