// ============================================
// PARACHUTE-PHYSICS.JS - Parachute Deployment and Descent
// The difference between finding your rocket and losing it forever
// ============================================

/**
 * Determine if parachute should deploy.
 * Deploys when:
 * 1. Rocket has passed apogee (velocity negative)
 * 2. Altitude is below deployment threshold
 * 3. Minimum safe altitude is maintained
 */
function shouldDeployParachute(state, parachute) {
    const { altitude, velocity, maxAltitudeReached, parachuteDeployed } = state;
    
    // Already deployed or no parachute
    if (parachuteDeployed || !parachute) return false;
    
    // Must have passed apogee
    if (!maxAltitudeReached) return false;
    
    // Calculate deployment altitude
    const deployAltitude = Math.max(
        APP_CONFIG.MIN_PARACHUTE_DEPLOY_ALTITUDE,
        state.peakAltitude * APP_CONFIG.PARACHUTE_DEPLOY_ALTITUDE_RATIO
    );
    
    // Deploy when falling below threshold
    return velocity < 0 && altitude <= deployAltitude;
}

/**
 * Calculate parachute cross-sectional area.
 */
function calculateParachuteArea(diameterCm) {
    const diameterM = diameterCm * PHYSICS_CONSTANTS.CM_TO_METERS;
    return Math.PI * (diameterM / 2) ** 2;
}

/**
 * Get drag coefficient for parachute type.
 */
function getParachuteDragCoefficient(type) {
    const coefficients = {
        'round': 1.5,           // Standard round canopy
        'elliptical': 1.8,      // Elliptical/parafoil (glides slightly)
        'square': 1.6,          // Square canopy
        'hexagonal': 1.7,       // Hexagonal canopy
        'streamer': 0.8         // Streamer - minimal drag, fast descent
    };
    return coefficients[type] || 1.5;
}

/**
 * Calculate terminal velocity with parachute deployed.
 * This determines descent rate and thus wind drift!
 */
function calculateParachuteTerminalVelocity(massKg, parachute, airDensity) {
    const area = calculateParachuteArea(parachute.diameter);
    const cd = getParachuteDragCoefficient(parachute.type);
    
    // Terminal velocity: v_t = √(2mg / ρC_dA)
    const weight = massKg * PHYSICS_CONSTANTS.GRAVITY;
    const terminalVelocity = Math.sqrt((2 * weight) / (airDensity * cd * area));
    
    return {
        value: terminalVelocity,
        area: area,
        dragCoefficient: cd,
        explanation: getParachuteExplanation(massKg, parachute, terminalVelocity, area, cd)
    };
}

/**
 * Generate Feynman-style explanation for parachute performance.
 */
function getParachuteExplanation(massKg, parachute, terminalVelocity, area, cd) {
    const descentTimePer100m = 100 / terminalVelocity;
    
    return `
        Parachute ${parachute.name} (${parachute.diameter}cm ${parachute.type}):\n\n
        • Terminal velocity: ${terminalVelocity.toFixed(1)} m/s (${(terminalVelocity * 3.6).toFixed(1)} km/h)\n\n
          This is your descent rate - how fast you fall with chute deployed.\n\n
        • Descent time: ${descentTimePer100m.toFixed(1)} seconds per 100 meters\n\n
        • Effective area: ${area.toFixed(2)} m²\n\n
        The key insight: Terminal velocity scales with √(mass/area).\n        Double the parachute diameter → quadruple the area → halve the descent rate.\n        That's why bigger parachutes mean slower, safer landings (and more wind drift!).
    `;
}

/**
 * Check if parachute is appropriately sized for rocket mass.
 */
function checkParachuteSuitability(massKg, parachute) {
    const area = calculateParachuteArea(parachute.diameter);
    
    // Rule of thumb: grams per cm² of canopy
    const gramsPerCm2 = massKg * 1000 / (parachute.diameter ** 2);
    
    let suitability;
    let explanation;
    
    if (gramsPerCm2 > 0.8) {
        suitability = 'undersized';
        explanation = "Parachute is small for this mass - expect fast descent, harder landing.";
    } else if (gramsPerCm2 > 0.5) {
        suitability = 'adequate';
        explanation = "Parachute size is reasonable for this rocket mass.";
    } else if (gramsPerCm2 > 0.3) {
        suitability = 'optimal';
        explanation = "Good parachute-to-mass ratio - should land gently.";
    } else {
        suitability = 'oversized';
        explanation = "Large parachute - very slow descent, maximum wind drift.";
    }
    
    return { suitability, gramsPerCm2, explanation };
}

/**
 * Model parachute deployment dynamics (simplified).
 * In reality, deployment takes time and creates a shock load.
 */
function simulateParachuteDeployment(state, parachute) {
    // Simplified: instant deployment with velocity limit
    const terminalVel = calculateParachuteTerminalVelocity(
        state.mass,
        parachute,
        getAirDensityAtAltitude(state.altitude)
    ).value;
    
    // Cap velocity at terminal (parachute slows you down)
    const newVelocity = Math.max(state.velocity, -terminalVel);
    
    return {
        velocity: newVelocity,
        deployed: true,
        deploymentAltitude: state.altitude,
        velocityReduced: Math.abs(state.velocity) > terminalVel
    };
}

// Export to global window object for browser use
if (typeof window !== 'undefined') {
    window.ParachutePhysics = {
        shouldDeployParachute,
        calculateParachuteArea,
        getParachuteDragCoefficient,
        calculateParachuteTerminalVelocity,
        checkParachuteSuitability,
        simulateParachuteDeployment,
        getParachuteExplanation
    };
}

// Also export for Node.js/module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.ParachutePhysics || {
        shouldDeployParachute,
        calculateParachuteArea,
        getParachuteDragCoefficient,
        calculateParachuteTerminalVelocity,
        checkParachuteSuitability,
        simulateParachuteDeployment,
        getParachuteExplanation
    };
}
