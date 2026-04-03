# Rocket Physics App

An educational rocket physics simulator that teaches aerodynamics through interactive flight prediction - built in modular pieces for easy iteration and learning.

## Mathematical Foundation

This simulation implements the fundamental equations of rocket trajectory as described in MIT's Unified Engineering course (Fall 2023, Systems Laboratory Notes).

### Core Equations

The simulation solves these ordinary differential equations:

1. **Altitude dynamics**: ḣ = V
2. **Velocity dynamics**: V̇ = F/m  
3. **Mass conservation**:ṁ = -ṁ_fuel

Where the total force F includes:
- Gravity: -mg (always downward)
- Aerodynamic drag: D = ½ρv²C_dA (opposes motion)
- Thrust: T (during motor burn, opposes gravity)

### Numerical Integration

The simulation uses Forward Euler integration with time step Δt:

- h_{i+1} = h_i + V_i × Δt
- V_{i+1} = V_i + (F/m)_i × Δt  
- m_{i+1} = m_i - ṁ_fuel × Δt

### Physics Modules

The simulation is organized into modular components:
- `trajectory-engine.js`: Main simulation loop and state management
- `drag-module.js`: Aerodynamic drag calculations
- `thrust-module.js`: Motor thrust and mass consumption
- `parachute-physics.js`: Parachute deployment and descent physics
- `wind-model.js`: Wind effects on horizontal drift

## Features

- **Realistic Rocket Physics**: Simulates gravity, drag, thrust, and mass reduction during burn
- **Parachute System**: Realistic parachute deployment and descent calculations
- **Wind Effects**: Models wind drift at different altitudes
- **Interactive Visualization**: Animated flight path with detailed telemetry
- **Educational Explanations**: Feynman-style commentary on the physics principles

## Physics Verification

The implementation has been verified against standard rocketry references including:

- MIT Unified Engineering Systems Laboratory Notes (Fall 2023)
- NASA Model Rocketry Manual
- High Power Rocketry Safety Codes

For detailed mathematical verification, see the original analysis comparing this implementation to the MIT formulation.

## Getting Started

1. Open `index.html` in a modern web browser
2. Configure your rocket using the UI controls
3. Set launch conditions (wind, altitude)
4. Click "Simulate Launch" to run the flight simulation
5. Analyze results and teaching content

## Contributing

This project is designed for educational purposes and modularity. Feel free to:

1. Add new physics modules
2. Improve numerical integration methods
3. Enhance visualization features
4. Expand educational content

## License

MIT License - see LICENSE file for details.

## Acknowledgments

- Physics foundation based on MIT Unified Engineering course materials
- Educational approach inspired by Richard Feynman's teaching style