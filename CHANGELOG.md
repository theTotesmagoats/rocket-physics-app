# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Fixed

- **Mass Calculation Inconsistency**: Fixed critical bug where `createInitialState()` used `rocketConfig.motor.totalMass` instead of `propellantMass` for propellant calculations. This has been corrected to use `rocketConfig.motor.propellantMass` consistently throughout the simulation.
- Added `propellantMass` field to state object for reliable reference during burn calculations
- Updated mass calculation in `updateState()` to use consistent propellant mass reference

### Improved

- **Physics Documentation**: Enhanced comments in drag-module.js to clarify the mathematical formulation of drag calculations
- **Mathematical Verification**: Updated README with detailed documentation of physics equations and references to MIT Unified Engineering notes for verification
- Added comprehensive physics foundation section documenting core equations, numerical integration methods, and module organization

## [1.0.0] - Initial Release

- Implemented complete rocket trajectory simulation
- Added drag, thrust, gravity, and parachute physics modules
- Created interactive UI for rocket configuration and launch simulation
- Added educational explanations using Feynman-style commentary
- Included wind model for horizontal drift calculations