// ============================================
// LANDING-PREDICTOR.JS - Landing Position Prediction
// The most useful feature for actual rocketry enthusiasts
// ============================================

/**
 * Quick landing prediction without full simulation.
 * Useful for pre-flight planning and "what if" scenarios.
 */
function predictLanding(rocketConfig, launchConditions) {
    // Estimate peak altitude using energy methods
    const estimatedAltitude = estimatePeakAltitude(rocketConfig);
    
    // Calculate descent parameters
    const descentParams = calculateDescentParameters(rocketConfig, estimatedAltitude);
    
    // Predict landing position
    const landingPosition = calculateLandingPosition(
        estimatedAltitude,
        descentParams.descentRate,
        launchConditions.windSpeed,
        launchConditions.windDirection
    );
    
    return {
        estimatedPeakAltitude: estimatedAltitude,
        estimatedDescentTime: descentParams.descentTime,
        landingPosition: landingPosition,
        confidence: calculateConfidence(rocketConfig, launchConditions),
        explanation: generatePredictionExplanation(
            estimatedAltitude, descentParams, landingPosition
        )
    };
}

/**
 * Estimate peak altitude using simplified energy analysis.
 * This avoids full simulation for quick predictions.
 */
function estimatePeakAltitude(rocketConfig) {
    // Simplified model:
    // 1. Calculate velocity at burnout
    // 2. Calculate coasting distance from that velocity
    
    const totalMass = rocketConfig.rocket.mass + 
                      rocketConfig.motor.totalMass +
                      (rocketConfig.parachute ? rocketConfig.parachute.mass : 0) +
                      rocketConfig.payloadMass;
    
    // Average net acceleration during burn
    const weight = totalMass * PHYSICS_CONSTANTS.GRAVITY;
    const avgNetThrust = rocketConfig.motor.averageThrust - weight;
    const avgAcceleration = avgNetThrust / totalMass;
    
    // Velocity at burnout (ignoring drag for simplicity)
    const burnoutVelocity = avgAcceleration * rocketConfig.motor.burnTime;
    
    // Altitude gained during powered flight
    const poweredAltitude = 0.5 * avgAcceleration * rocketConfig.motor.burnTime ** 2;
    
    // Coasting altitude (v² = 2gh → h = v²/2g)
    const coastingAltitude = (burnoutVelocity ** 2) / (2 * PHYSICS_CONSTANTS.GRAVITY);
    
    // Apply drag reduction factor (empirical, ~30-50% loss to drag)
    const dragFactor = 0.6;
    
    return (poweredAltitude + coastingAltitude) * dragFactor;
}

/**
 * Calculate descent parameters.
 */
function calculateDescentParameters(rocketConfig, altitude) {
    if (!rocketConfig.parachute) {
        // No parachute - free fall estimate
        return {
            descentRate: 30,  // m/s - rough estimate for rocket falling
            descentTime: altitude / 30
        };
    }
    
    // Calculate terminal velocity with parachute
    const totalMass = rocketConfig.rocket.mass +
                      rocketConfig.motor.emptyMass +
                      rocketConfig.parachute.mass +
                      rocketConfig.payloadMass;
    
    const terminalVelResult = ParachutePhysics.calculateParachuteTerminalVelocity(
        totalMass,
        rocketConfig.parachute,
        PHYSICS_CONSTANTS.AIR_DENSITY_SEA_LEVEL
    );
    
    return {
        descentRate: terminalVelResult.value,
        descentTime: altitude / terminalVelResult.value
    };
}

/**
 * Calculate landing position from descent parameters.
 */
function calculateLandingPosition(altitude, descentRate, windSpeedMph, windDirection) {
    // Descent time
    const descentTime = altitude / descentRate;
    
    // Wind speed in m/s
    const windSpeedMs = windSpeedMph * PHYSICS_CONSTANTS.MILES_PER_HOUR_TO_M_S;
    
    // Horizontal drift distance
    const driftDistance = windSpeedMs * descentTime;
    
    // Convert to x, y coordinates
    const angleRad = WindModel.windDirectionToRadians(windDirection) + Math.PI;
    
    return {
        x: driftDistance * Math.sin(angleRad),
        y: driftDistance * Math.cos(angleRad),
        distanceMeters: driftDistance,
        distanceFeet: driftDistance / PHYSICS_CONSTANTS.FEET_TO_METERS,
        bearing: (windDirection + 180) % 360  // Wind goes TO opposite direction
    };
}

/**
 * Calculate prediction confidence level.
 */
function calculateConfidence(rocketConfig, launchConditions) {
    let confidence = 0.8;  // Start at 80%
    
    // Reduce confidence for high winds (more variable)
    if (launchConditions.windSpeed > 15) confidence -= 0.1;
    if (launchConditions.windSpeed > 25) confidence -= 0.1;
    
    // Reduce confidence for very high flights (more time for errors)
    const estimatedAltitude = estimatePeakAltitude(rocketConfig);
    if (estimatedAltitude > 300) confidence -= 0.05;
    if (estimatedAltitude > 600) confidence -= 0.1;
    
    // Reduce for no parachute
    if (!rocketConfig.parachute) confidence -= 0.2;
    
    return Math.max(0.3, Math.min(0.95, confidence));
}

/**
 * Generate explanation for prediction.
 */
function generatePredictionExplanation(altitude, descentParams, landingPosition) {
    return `
        📍 Landing Prediction\n\n
        Estimated peak altitude: ${altitude.toFixed(0)} meters (${(altitude / PHYSICS_CONSTANTS.FEET_TO_METERS).toFixed(0)} feet)\n\n
        Descent analysis:\n• Terminal velocity: ${descentParams.descentRate.toFixed(1)} m/s\n• Descent time: ${descentParams.descentTime.toFixed(1)} seconds\n\n
        Landing position:\n• Distance from launch: ${landingPosition.distanceFeet.toFixed(0)} feet (${landingPosition.distanceMeters.toFixed(0)} meters)\n• Bearing: ${Math.round(landingPosition.bearing)}° (${WindModel.getWindDirectionString(landingPosition.bearing)})\n\n
        ⚠️ This is an estimate. Actual landing may vary due to:\n• Wind shear (wind changes with altitude)\n• Parachute oscillation\n• Launch angle imperfections\n• Thermal updrafts/downdrafts
    `;
}

/**
 * Get recovery recommendations based on predicted conditions.
 */
function getRecoveryRecommendations(prediction, launchConditions) {
    const recommendations = [];
    
    // Wind-based recommendations
    if (launchConditions.windSpeed > 20) {
        recommendations.push({
            level: 'warning',
            text: 'High winds predicted. Consider using a larger parachute for slower descent, or postpone launch.'
        });
    }
    
    // Distance-based recommendations
    if (prediction.landingPosition.distanceFeet > 500) {
        recommendations.push({
            level: 'info',
            text: `Expected downrange distance (${prediction.landingPosition.distanceFeet.toFixed(0)} ft) is significant. Scout the recovery area beforehand.`
        });
    }
    
    // Altitude-based
    if (prediction.estimatedPeakAltitude > 300) {
        recommendations.push({
            level: 'info',
            text: 'High altitude flight. Consider altimeter-triggered ejection for reliable parachute deployment.'
        });
    }
    
    return recommendations;
}

// Export to global window object for browser use
if (typeof window !== 'undefined') {
    window.LandingPredictor = {
        predictLanding,
        estimatePeakAltitude,
        calculateDescentParameters,
        calculateLandingPosition,
        getRecoveryRecommendations,
        generatePredictionExplanation
    };
}

// Also export for Node.js/module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.LandingPredictor || {
        predictLanding,
        estimatePeakAltitude,
        calculateDescentParameters,
        calculateLandingPosition,
        getRecoveryRecommendations,
        generatePredictionExplanation
    };
}
