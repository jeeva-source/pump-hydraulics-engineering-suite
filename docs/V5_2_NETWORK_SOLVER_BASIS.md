# V5.2 Network Solver — Calculation Basis

## Scope
V5.2 adds a steady, incompressible, single-phase Newtonian-liquid pipe-network solver. It supports connected networks containing one or more fixed total-head boundary nodes, withdrawal demands at nodes, and pipe edges. Edges may form branches and closed loops.

## Equations
Each pipe edge uses Darcy–Weisbach friction and a user-entered aggregate minor-loss coefficient:

\[
h_L=\left(f\frac{L}{D}+K\right)\frac{v|v|}{2g}
\]

The Darcy friction factor uses the V5 Churchill (1977) all-regime correlation. The signed edge flow is obtained by inverting the monotonic head-loss relation for the total-head difference between the connected nodes.

At each non-boundary node, continuity is enforced:

\[
\sum Q_{in}-\sum Q_{out}-Q_{demand}=0
\]

Unknown nodal total heads are solved using a damped Newton method with a finite-difference Jacobian. The result reports iteration count and maximum continuity residual over unknown (non-boundary) nodes. Fixed-head boundary nodes exchange whatever source/sink flow is required and are reported with a null continuity residual; their boundary supply is reported separately.

## Input basis
- Density: kg/m³
- Dynamic viscosity: Pa·s
- Node elevation: m
- Fixed boundary total head: m
- Node withdrawal demand: m³/s (non-negative)
- Pipe length and internal diameter: m
- Absolute roughness: m
- Aggregate fitting / valve loss coefficient K: dimensionless

Node total head is treated as piezometric head (pressure head + elevation). The solver does not separately model velocity-head changes at junctions, pumps, control valves, reservoirs with momentum effects, or equipment characteristics.

## Sign convention
Positive edge flow follows the entered `from` to `to` direction. Negative flow means the solved direction is opposite. Demands are withdrawals. Fixed-head nodes act as hydraulic boundaries. Positive boundary supply means injection into the model; negative supply means absorption by the boundary.

## Limitations and engineering cautions
This is a preliminary steady-state network solver, not a transient solver or certified network package. It does not model water hammer, two-phase flow, non-Newtonian fluids, pump curves, control-valve characteristics, cavitation, NPSH, leakage, pressure-dependent demand, or detailed junction losses. A pipe network must be connected to a valid fixed-head boundary and satisfy continuity. Verify topology, units, pipe IDs, roughness, K values, fluid properties, and boundary heads independently. Negative gauge pressure and reverse edge flows are reported as warnings, not automatically deemed unacceptable.
