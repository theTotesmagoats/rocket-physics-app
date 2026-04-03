// ============================================
// WIND-MODEL.JS - Wind Effects on Horizontal Position
// Where most rocket simulators fail - and where landing prediction lives
// ============================================

/** 
 * Convert wind direction from compass degrees to radians.
 * Aviation convention: 0° = North, 90° = East (clockwise)
 */
function windDirectionToRadians(windDegrees) {
    // Keep original convention for clarity; vector conversion handles direction flip
    return windDegrees * Math.PI / 180;
}

/**
 * Calculate horizontal wind velocity components.
 * Returns {vx, vy} in m/s where:
 * - vx: East-West component (positive = eastward)
 * - vy: North-South component (positive = northward)
 *
 * FIX: Wind direction is where the wind comes FROM.
 * So a 0° wind (from North) should blow south (negative vy).
 * A 90° wind (from East) should blow west (negative vx).
 */
function getWindVelocityComponents(windSpeedMph, windDirectionDegrees) {
    const windSpeedMs = windSpeedMph * PHYSICS_CONSTANTS.MILES_PER_HOUR_TO_M_S;
    const rad = windDirectionToRadians(windDirectionDegrees);
    
    // Wind comes FROM direction, so vector points opposite to compass heading
    return {
        vx: -windSpeedMs * Math.sin(rad),  // East component (0° → sin(0)=0, negative)
        vy: -windSpeedMs * Math.cos(rad)   // North component (0° → cos(0)=1, negative)
    };
}

/**
 * Calculate horizontal drift during a time step.
 * 
 * Feynman insight: "Wind doesn't push your rocket sideways during powered flight
 * (it's too fast and pointed up). But during parachute descent? Wind dominates everything."
 */
function calculateHorizontalDrift(windVx, windVy, deltaTime, phase, parachuteDeployed) {
    let driftX = 0;
    let driftY = 0;
    
    if (phase === 'descent') {
        // During descent, rocket moves with the air
        // Parachute makes it follow wind almost perfectly
        const windCoupling = parachuteDeployed ? 0.95 : 0.3;  // How much wind affects rocket
        
        driftX = windVx * deltaTime * windCoupling;
        driftY = windVy * deltaTime * windCoupling;
    } else if (phase === 'powered_ascent' || phase === 'coasting_ascent') {
        // Minimal horizontal effect during ascent - rocket is mostly vertical
        // But there's a tiny effect we can model
        const windCoupling = 0.05;  // Very small effect
        driftX = windVx * deltaTime * windCoupling;
        driftY = windVy * deltaTime * windCoupling;
    }
    
    return { dx: driftX, dy: driftY };
}

/**
 * Calculate total wind drift from trajectory data.
 */
function calculateTotalWindDrift(windSpeedMph, windDirectionDegrees, trajectory, maxAltitude, descentTime) {
    // Calculate horizontal displacement at each step
    let totalDrift = 0;
    
    if (trajectory.length > 1) {
        const initialX = trajectory[0].horizontalX;
        const finalX = trajectory[trajectory.length - 1].horizontalX;
        const initialY = trajectory[0].horizontalY;
        const finalY = trajectory[trajectory.length - 1].horizontalY;
        
        totalDrift = Math.sqrt(
            (finalX - initialX)**2 + 
            (finalY - initialY)**2
        );
    }
    
    return {
        meters: totalDrift,
        feet: totalDrift / PHYSICS_CONSTANTS.FEET_TO_METERS,
        direction: windDirectionDegrees
    };
}

/**
 * Estimate total downrange distance based on flight parameters.
 * This is a predictive calculation before full simulation.
 */
function estimateDownrangeDistance(maxAltitudeMeters, descentRateMs, windSpeedMph) {
    // Time to fall = altitude / descent rate
    const descentTime = maxAltitudeMeters / descentRateMs;
    
    // Horizontal drift = wind speed × descent time
    const windSpeedMs = windSpeedMph * PHYSICS_CONSTANTS.MILES_PER_HOUR_TO_M_S;
    const downrangeMeters = windSpeedMs * descentTime;
    
    return {
        meters: downrangeMeters,
        feet: downrangeMeters / PHYSICS_CONSTANTS.FEET_TO_METERS,
        explanation: getDownrangeExplanation(maxAltitudeMeters, descentRateMs, windSpeedMph, downrangeMeters, descentTime)
    };
}

/**
 * Generate Feynman-style explanation for wind effects.
 */
function getDownrangeExplanation(altitude, descentRate, windSpeed, downrange, descentTime) {
    return `
        Downrange estimate: ${downrange.toFixed(0)} meters (${(downrange / PHYSICS_CONSTANTS.FEET_TO_METERS).toFixed(0)} feet)
        
        Here's the math:
        • Descent time = Altitude ÷ Descent rate = ${altitude.toFixed(0)}m ÷ ${descentRate.toFixed(1)}m/s = ${descentTime.toFixed(1)} seconds
        • Wind drift = Wind speed × Time = ${(windSpeed * PHYSICS_CONSTANTS.MILES_PER_HOUR_TO_M_S).toFixed(1)}m/s × ${descentTime.toFixed(1)}s
        
        Why this matters: A 5 mph wind with a slow parachute descent can drift your rocket
        hundreds of feet. That's why you launch into the wind when possible - it keeps
        everything closer to home.
    `;
}

/**
 * Get wind direction as a readable string.
 */
function getWindDirectionString(degrees) {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
}

/**
 * Calculate effective wind during descent (accounts for altitude variation).
 * Wind typically increases with altitude.
 */
function getWindSpeedAtAltitude(groundWindSpeedMph, altitudeMeters) {
    // Simplified model: wind increases ~10% per 100m of altitude
    const increaseFactor = 1 + (altitudeMeters / 100) * 0.1;
    return groundWindSpeedMph * Math.min(increaseFactor, 2);  // Cap at 2x ground speed
}

/**
 * Calculate wind uncertainty ellipse for landing prediction.
 */
function calculateWindUncertainty(windSpeedMph, descentTimeSeconds) {
    // Simplified model: uncertainty grows with wind speed and time aloft
    const baseDrift = windSpeedMph * PHYSICS_CONSTANTS.MILES_PER_HOUR_TO_M_S * descentTimeSeconds;
    
    // Add ~20% uncertainty due to gusts and variable conditions
    const uncertaintyFactor = 1.2;
    
    return {
        dx: baseDrift * uncertaintyFactor,
        dy: baseDrift * 0.8,  // Typically less uncertainty in crosswind direction
        explanation: `Wind uncertainty adds ~${(baseDrift * (uncertaintyFactor - 1) / PHYSICS_CONSTANTS.FEET_TO_METERS).toFixed(0)} feet to landing prediction`
    };
}

// Export to global window object for browser use
if (typeof window !== 'undefined') {
    window.WindModel = {
        windDirectionToRadians,
        getWindVelocityComponents,
        calculateHorizontalDrift,
        calculateTotalWindDrift,
        estimateDownrangeDistance,
        getDownrangeExplanation,
        getWindDirectionString,
        getWindSpeedAtAltitude,
        calculateWindUncertainty
    };
}

// Also export for Node.js/module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.WindModel || {
        windDirectionToRadians,
        getWindVelocityComponents,
        calculateHorizontalDrift,
        calculateTotalWindDrift,
        estimateDownrangeDistance,
        getDownrangeExplanation,
        getWindDirectionString,
        getWindSpeedAtAltitude,
        calculateWindUncertainty
    };
}
