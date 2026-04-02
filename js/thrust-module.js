// ============================================
// THRUST-MODULE.JS - Motor Thrust Calculation
// How rocket motors actually work (and why total impulse matters)
// ============================================

/**
 * Get thrust at a specific time into motor burn.
 * Uses simplified thrust curves based on real motor data.
 */
function getThrustAtTime(motor, elapsedTime) {
    // Motor has burned out
    if (elapsedTime >= motor.burnTime) {
        return { value: 0, phase: 'burnout' };
    }
    
    // Simplified thrust curve model:
    // - Initial spike (ignition)
    // - Sustained burn (main phase)
    // - Taper off
    
    const t = elapsedTime / motor.burnTime;  // Normalized time (0 to 1)
    let thrust;
    let phase;
    
    if (t < 0.1) {
        // Initial spike - ignition transient
        thrust = motor.averageThrust * 1.5 * (t / 0.1);
        phase = 'ignition';
    } else if (t < 0.9) {
        // Sustained burn - relatively flat
        thrust = motor.averageThrust;
        phase = 'sustained';
    } else {
        // Taper off before burnout
        thrust = motor.averageThrust * (1 - (t - 0.9) / 0.2);
        phase = 'taper';
    }
    
    return { value: Math.max(0, thrust), phase };
}

/**
 * Calculate total impulse from motor.
 * Total Impulse = ∫ Thrust dt ≈ Average Thrust × Burn Time
 * 
 * Feynman insight: "Total impulse is the rocket equivalent of 'how hard you push'.
 * A gentle push for a long time can equal a hard push for a short time."
 */
function calculateTotalImpulse(motor) {
    return motor.averageThrust * motor.burnTime;
}

/**
 * Get motor class from total impulse (NASA standard).
 * 
 * Class | Total Impulse (N·s)
 * A     | 1.26 - 2.5
 * B     | 2.51 - 5.0
 * C     | 5.01 - 10.0
 * D     | 10.01 - 20.0
 * E     | 20.01 - 40.0
 */
function getMotorClass(totalImpulse) {
    if (totalImpulse <= 2.5) return 'A';
    if (totalImpulse <= 5.0) return 'B';
    if (totalImpulse <= 10.0) return 'C';
    if (totalImpulse <= 20.0) return 'D';
    if (totalImpulse <= 40.0) return 'E';
    if (totalImpulse <= 80.0) return 'F';
    return 'G+';
}

/**
 * Calculate rocket mass at any time during flight.
 * Mass decreases as propellant burns!
 */
function getMassAtTime(initialMassKg, motor, elapsedTime) {
    if (!motor || elapsedTime >= motor.burnTime) {
        return initialMassKg - (motor?.propellantMass || 0);
    }
    
    // Linear propellant consumption during burn
    const propellantBurned = motor.propellantMass * (elapsedTime / motor.burnTime);
    return initialMassKg - propellantBurned;
}

/**
 * Calculate acceleration at any instant.
 * a = F_net / m = (Thrust - Drag - Weight) / mass
 */
function calculateAcceleration(thrust, dragForce, massKg) {
    // Forces acting on rocket:
    // + Thrust (up)
    // - Drag (down during ascent)
    // - Weight (always down)
    
    const weight = massKg * PHYSICS_CONSTANTS.GRAVITY;
    const netForce = thrust - dragForce - weight;
    
    return {
        value: netForce / massKg,
        netForce: netForce,
        weight: weight
    };
}

/**
 * Generate Feynman-style explanation for motor performance.
 */
function getMotorExplanation(motor) {
    const totalImpulse = calculateTotalImpulse(motor);
    const motorClass = getMotorClass(totalImpulse);
    
    return `
        Motor ${motor.name} (${motorClass}-class):
        
        • Total Impulse: ${totalImpulse.toFixed(1)} N·s
          This is the "oomph" - total push delivered over the entire burn.
          
        • Average Thrust: ${motor.averageThrust.toFixed(1)} N (${(motor.averageThrust * PHYSICS_CONSTANTS.NEWTONS_TO_OUNCES).toFixed(0)} oz)
          How hard it pushes on average.
          
        • Burn Time: ${motor.burnTime.toFixed(2)} seconds
          Longer burn = gentler acceleration, often higher altitude.
          
        The tradeoff: A high-thrust short-burn motor feels powerful but may not reach
        as high as a lower-thrust long-burn motor with the same total impulse.
        Why? Less time for drag to slow you down during the burn.
    `;
}

/**
 * Check if motor is appropriate for rocket mass.
 * Rule of thumb: Motor total impulse should be 1-2x rocket weight (in N·s vs N)
 */
function checkMotorSuitability(motor, rocketMassKg) {
    const totalImpulse = calculateTotalImpulse(motor);
    const weight = rocketMassKg * PHYSICS_CONSTANTS.GRAVITY;
    const ratio = totalImpulse / weight;
    
    let suitability;
    let explanation;
    
    if (ratio < 0.5) {
        suitability = 'underpowered';
        explanation = "Motor is underpowered - rocket may not clear the launch rod safely.";
    } else if (ratio < 1.0) {
        suitability = 'light';
        explanation = "Motor is on the light side but should work for this rocket.";
    } else if (ratio <= 2.5) {
        suitability = 'optimal';
        explanation = "Good motor-to-rocket ratio! Should perform well.";
    } else {
        suitability = 'overpowered';
        explanation = "Motor is powerful - ensure proper launch rod length for stability.";
    }
    
    return { suitability, ratio, explanation };
}

// Export to global window object for browser use
if (typeof window !== 'undefined') {
    window.ThrustModule = {
        getThrustAtTime,
        calculateTotalImpulse,
        getMotorClass,
        getMassAtTime,
        calculateAcceleration,
        getMotorExplanation,
        checkMotorSuitability
    };
}

// Also export for Node.js/module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.ThrustModule || {
        getThrustAtTime,
        calculateTotalImpulse,
        getMotorClass,
        getMassAtTime,
        calculateAcceleration,
        getMotorExplanation,
        checkMotorSuitability
    };
}
