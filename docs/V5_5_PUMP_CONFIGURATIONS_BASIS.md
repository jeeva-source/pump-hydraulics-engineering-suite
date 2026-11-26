# V5.5 Pump Configurations — Calculation Basis

## Scope

V5.5 evaluates identical centrifugal pumps in single-pump service, series arrangement, parallel arrangement and changed-speed operation using an entered speed ratio. The engine reuses the V5.3 manufacturer-curve interpolation and exact pump/system intersection solver. Inputs are SI.

## Curve transformations

Let r = N2 / N1, where N2 is selected speed and N1 is reference curve speed.

Approximate affinity relations:
- Q2 = r x Q1
- H2 = r^2 x H1
- P2 is approximately r^3 x P1

For n identical pumps:
- Single: total flow = one-pump flow; total head = one-pump head.
- Series: total flow = one-pump flow; total head = n x one-pump head.
- Parallel: total flow = n x one-pump flow; total head = one-pump head.

V5.5 transforms each reference curve point by speed ratio first, then by arrangement. It uses the transformed total-station curve to find the intersection with the system curve.

## Power

Total hydraulic power in kW:

P_hyd,total = rho x g x Q_total x H_total / 1000

Where a complete efficiency curve is supplied, V5.3 estimates total shaft power from total hydraulic power and interpolated efficiency. Per-pump shaft power is total shaft power divided by pump count under the equal-duty assumption.

When motor efficiency is supplied:

P_motor_input,total = P_shaft,total / motor_efficiency_fraction

Per-pump motor input is the total divided by pump count.

Vendor shaft power is retained only for a single pump at reference speed. For combined arrangements or changed speed, V5.5 avoids multiplying/scaling vendor shaft-power data without a manufacturer curve basis; power is estimated from hydraulic power and supplied efficiency when possible.

## NPSH and vendor data

- At reference speed, manufacturer NPSHr data may be carried through to the equivalent curve.
- At changed speed, V5.5 deliberately omits NPSHr rather than applying an unverified scaling correction. Obtain manufacturer NPSHr curves at the selected speed.
- V5.5 does not compute suction-network NPSHa. Use the V5.4 suction assessment with explicit source conditions.
- Series-pump interstage NPSHa is not calculated.

## Assumptions and warnings

- All pumps are identical and operate at the same speed.
- Parallel pumps share total flow equally.
- Series pumps carry the same flow and their heads add.
- Header/manifold losses, check-valve losses, isolation-valve effects, unequal branch resistance, pump mismatch and control logic are not modelled in this module.
- Efficiency is held constant across speed transformation as a screening approximation.
- Speed ratio must be greater than zero and no more than 2.0. The upper bound is a software input guardrail, not a manufacturer operating limit.
- Pump count must be an integer from 1 to 12.
- Manufacturer curve data are not extrapolated.
- The system curve is the V5.3 quadratic system curve, not an automatically generated V5.1/V5.2 hydraulic network curve.

## Limitations

V5.5 is a preliminary engineering tool. It is not a certified pump-selection package and does not claim API 610, ANSI/HI or ISO compliance. Confirm final duty, motor selection, NPSH margin, POR/AOR, MCSF and runout with manufacturer data and project requirements.
