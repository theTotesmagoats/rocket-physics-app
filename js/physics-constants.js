// ============================================
// PHYSICS-CONSTANTS.JS - Fundamental Constants
// These don't change - they're laws of nature
// ============================================

const PHYSICS_CONSTANTS = {
    // Gravitational acceleration (m/s²)
    GRAVITY: 9.80665,
    
    // Air properties at sea level, 15°C (ISA standard atmosphere)
    AIR_DENSITY_SEA_LEVEL: 1.225,      // kg/m³
    TEMPERATURE_LAPSE_RATE: -0.0065,   // K/m (temperature decreases with altitude)
    SEA_LEVEL_TEMPERATURE: 288.15,     // K (15°C)
    SEA_LEVEL_PRESSURE: 101325,        // Pa
    
    // Unit conversion factors
    MILES_PER_HOUR_TO_M_S: 0.44704,    // mph → m/s
    FEET_TO_METERS: 0.3048,            // ft → m
    CM_TO_METERS: 0.01,                // cm → m
    GRAMS_TO_KG: 0.001,                // g → kg
    NEWTONS_TO_OUNCES: 3.59694,        // N → oz (for motor thrust)
    
    // Mathematical constants we use often
    PI: Math.PI,
    TWO_PI: 2 * Math.PI,
};

// ============================================
// Atmosphere Model - Air density changes with altitude
// Feynman would say: "The air gets thinner as you go up.
// That's why planes have pressurized cabins and rockets work better in space."
// ============================================

function getAirDensityAtAltitude(altitudeMeters) {
    // International Standard Atmosphere (ISA) model - simplified
    // Valid for troposphere (0-11km)
    
    if (altitudeMeters <= 0) {
        return PHYSICS_CONSTANTS.AIR_DENSITY_SEA_LEVEL;
    }
    
    const T0 = PHYSICS_CONSTANTS.SEA_LEVEL_TEMPERATURE;
    const P0 = PHYSICS_CONSTANTS.SEA_LEVEL_PRESSURE;
    const L = Math.abs(PHYSICS_CONSTANTS.TEMPERATURE_LAPSE_RATE);
    const R = 287.05;  // Gas constant for dry air (J/kg·K)
    
    // Temperature at altitude
    const T = T0 + PHYSICS_CONSTANTS.TEMPERATURE_LAPSE_RATE * altitudeMeters;
    
    // Pressure at altitude (barometric formula)
    const P = P0 * Math.pow(1 - (L * altitudeMeters) / T0, (PHYSICS_CONSTANTS.GRAVITY * R) / L);
    
    // Density from ideal gas law: ρ = P / (R × T)
    const density = P / (R * Math.max(T, 200));  // Floor at 200K to avoid division issues
    
    return Math.max(density, 0.1);  // Minimum density floor
}

// ============================================
// Teaching: Why does air density matter?
// ============================================

function getAirDensityExplanation(altitudeMeters, density) {
    const altitudeFeet = altitudeMeters / PHYSICS_CONSTANTS.FEET_TO_METERS;
    const seaLevelRatio = density / PHYSICS_CONSTANTS.AIR_DENSITY_SEA_LEVEL * 100;
    
    return `
        At ${altitudeFeet.toFixed(0)} feet, air density is ${density.toFixed(3)} kg/m³ (${seaLevelRatio.toFixed(1)}% of sea level).
        
        Why this matters: Drag force is directly proportional to air density.
        Your rocket experiences less drag at altitude - that's why high-altitude launches
        can reach greater heights with the same motor. But your parachute also works
        LESS effectively in thin air, meaning faster descent and more wind drift.
    `;
}

// Export for other modules
if (typeof window !== 'undefined') {
    window.PHYSICS_CONSTANTS = PHYSICS_CONSTANTS;
    window.getAirDensityAtAltitude = getAirDensityAtAltitude;
    window.getAirDensityExplanation = getAirDensityExplanation;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PHYSICS_CONSTANTS, getAirDensityAtAltitude, getAirDensityExplanation };
}