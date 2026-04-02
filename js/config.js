// ============================================
// CONFIG.JS - User-Configurable Constants
// Change these first when testing or tweaking behavior
// ============================================

const APP_CONFIG = {
    // Simulation settings
    TIME_STEP: 0.01,              // Seconds per simulation step (smaller = more accurate but slower)
    MAX_SIMULATION_TIME: 60,      // Maximum seconds to simulate
    
    // Visualization settings
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 500,
    SCALE_PIXELS_PER_METER: 0.1,  // Zoom level for flight path visualization
    
    // Teaching mode settings
    SHOW_FORCE_VECTORS: true,     // Show thrust, drag, gravity arrows during simulation
    SHOW_TEACHING_TIPS: true,     // Enable Feynman-style explanations
    
    // Default values for form inputs
    DEFAULT_WIND_SPEED: 5,        // mph
    DEFAULT_WIND_DIRECTION: 90,   // degrees (East)
    DEFAULT_ALTITUDE: 0,          // feet
    DEFAULT_PAYLOAD_WEIGHT: 0,    // grams
    
    // Parachute deployment settings
    PARACHUTE_DEPLOY_ALTITUDE_RATIO: 0.85,  // Deploy at 85% of max altitude (prevents too-early deploy)
    MIN_PARACHUTE_DEPLOY_ALTITUDE: 15,      // Minimum altitude for safe deployment (meters)
    
    // Safety limits
    MAX_ROCKET_DIAMETER_CM: 20,
    MAX_MOTOR_IMPULSE_N_S: 320,   // Approximately E-class motor limit
};

// Export for other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APP_CONFIG;
}