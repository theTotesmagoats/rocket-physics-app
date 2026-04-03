# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- **Interactive Equation Display**: Implemented click-to-show-equations feature for flight statistics. Users can now click on any result box (Peak Altitude, Flight Time, Max Velocity, Downrange Distance) to see the underlying mathematical formulas and step-by-step calculation explanations.
- **Equation Visualization**: Added beautiful gradient-styled equation panels with:
  - Mathematical formulas
  - Step-by-step breakdown of solution methods  
  - Variable definitions and physical principles
  - Feynman-style insights and practical applications

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