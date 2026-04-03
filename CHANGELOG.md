# Rocket Physics Simulator Changelog

## [Unreleased]

### Fixed - 2026-04-03

#### Physics Engine Fixes
- **Drag Direction**: Use signed drag force during integration instead of magnitude-only. Descent now feels more natural with proper terminal velocity and longer hang time.
- **Wind Direction Mapping**: Fixed conversion for "wind comes FROM" convention. A 0° wind (from North) now correctly blows south; a 90° wind (from East) blows west.
- **Atmosphere Density Exponent**: Corrected barometric exponent from `(G * R) / L` to `G / (R * L)` for accurate air density vs altitude.
- **Initial Mass Tracking**: Now starts with `motor.totalMass` instead of `emptyMass`, ensuring propellant mass is included at launch.

#### Impact
These fixes significantly improve flight realism:
- Descent duration and terminal velocity now match real-world expectations
- Wind drift magnitude increases (especially in long descent phases)
- Drift direction correctly matches compass heading (e.g., 0° → southward, 90° → westward)

---

## [1.0.0] - 2026-04-02

Initial release with modular physics modules:
- Trajectory engine with phase detection
- Wind model with altitude scaling
- Parachute physics with deployment logic
- Drag and thrust modeling
