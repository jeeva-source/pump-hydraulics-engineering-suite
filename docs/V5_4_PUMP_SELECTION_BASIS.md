# V5.4 Pump Selection and NPSH — Calculation Basis

## Scope

V5.4 adds preliminary pump selection screening around the V5.3 pump/system operating point. It calculates NPSHa from explicit suction-source conditions, compares NPSHa with manufacturer NPSHr, checks supplied manufacturer operating limits and project margin criteria, compares multiple candidate curves, and provides approximate affinity-law helpers.

All engine inputs are SI. The user must provide manufacturer-approved pump curves and limits.

## NPSHa calculation

For a source vessel/free surface and pump suction flange, applying Bernoulli between the source and pump suction flange:

\[
NPSH_a = \frac{P_{source,abs}-P_{vap}}{\rho g}
+ (z_{source}-z_{pump})
+ \frac{V_{source}^2}{2g}
- h_{L,suction}
\]

Inputs:
- Source absolute pressure, Pa.
- Liquid vapour pressure at operating temperature, Pa.
- Source and pump centreline elevations, m, on the same datum.
- Source velocity, m/s (defaults to zero for a large reservoir).
- Total suction-side loss head to the pump suction flange, m.
- Liquid density, kg/m³.

The source pressure must be absolute, not gauge. Suction losses must include all losses between the source reference section and the pump suction flange. Do not double-count suction velocity head or losses. The returned component breakdown is provided for review.

NPSHa is not calculated from pump discharge conditions. A negative or zero NPSHa is returned with a warning rather than hidden by clamping.

## NPSHr and margin

NPSHr is linearly interpolated from the supplied manufacturer pump curve at the V5.3 operating flow. It is never estimated by V5.4.

\[
NPSH\ margin = NPSH_a - NPSH_r
\]

A project-required margin may be entered as `requiredNpshMargin_m`. This is a user/project criterion, not a universal value. If no project margin is supplied, the engine reports NPSHa versus NPSHr but marks the margin acceptance criterion as not set.

## Vendor operating limits

The following limits are evaluated only when supplied:
- POR: preferred operating region minimum and maximum flow.
- AOR: allowable operating region minimum and maximum flow.
- MCSF: minimum continuous stable flow.
- Runout: manufacturer runout flow limit.

POR must be contained within AOR when both are supplied. A missing limit is reported as `not_supplied`; the engine does not infer vendor limits. Outside POR is a review flag; outside AOR, below MCSF or above runout is a failed supplied limit.

## Pump candidate comparison

Each candidate is independently evaluated against the same system curve, suction conditions and project criteria. The engine returns candidate results and calculation errors. It deliberately does not rank candidates automatically: selection weighting and project acceptance rules must be defined by the engineer.

## Affinity-law helpers

For a speed ratio \(r_N=N_2/N_1\), approximate similarity relations are:

\[
Q_2/Q_1 \approx r_N,\quad H_2/H_1 \approx r_N^2,\quad P_2/P_1 \approx r_N^3
\]

For an impeller diameter ratio \(r_D=D_2/D_1\), approximate trim relations are:

\[
Q_2/Q_1 \approx r_D,\quad H_2/H_1 \approx r_D^2,\quad P_2/P_1 \approx r_D^3
\]

These are screening approximations, not replacements for manufacturer curves. Efficiency is not predicted by these helpers. Manufacturer speed/trim curves and limits take precedence, particularly for substantial impeller trims, viscosity changes, Reynolds effects, motor loading and NPSHr.

## Assessment logic

The engine returns:
- `meets_supplied_criteria` when every supplied check passes and the relevant criteria are complete.
- `does_not_meet_supplied_criteria` when at least one supplied criterion fails.
- `incomplete_data_or_criteria` when required vendor limits or project criteria are absent.

This is not a universal pump acceptance decision or code-compliance certification.

## Limitations

- Steady-state, single-pump analysis.
- Uses V5.3 quadratic system curve; it is not automatically generated from V5.1/V5.2 piping cases.
- NPSHa requires user-entered source/suction data; no automatic suction network extraction.
- No transient suction pressure, gas entrainment, two-phase flow, detailed cavitation model or NPSH3 test correction.
- No viscosity correction or automated affinity-law transformation of the entire manufacturer curve.
- No series/parallel pump arrangements.
- No certified API 610 / ANSI-HI compliance assessment.
- Engineering review and manufacturer confirmation remain mandatory before design release.
