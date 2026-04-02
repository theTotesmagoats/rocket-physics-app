// ============================================
// DRAG-MODULE.JS - Aerodynamic Drag Calculation
// The most important equation for landing prediction
// ============================================

/**
 * Calculate aerodynamic drag force using the drag equation.
 * 
 * Feynman's insight: "The math is easy. The hard part is knowing when the math stops working."
 * This equation works great at subsonic speeds. At supersonic? You need shock wave physics.
 * Lucky for us, model rockets stay subsonic (mostly).
 */
function calculateDrag(velocity, crossSectionalArea, dragCoefficient, airDensity) {
    // The Drag Equation: F_d = ½ × ρ × v² × C_d × A
    // 
    // Why velocity is SQUARED: This is the key insight.
    // Double your speed → quadruple the drag. That's why rockets have pointed noses.
    // That's why parachutes work (big area, high drag coefficient).
    
    const dragForce = 0.5 * airDensity * velocity * velocity * dragCoefficient * crossSectionalArea;
    
    return {
        value: Math.abs(dragForce),  // Always positive magnitude
        direction: -Math.sign(velocity),  // Opposes motion
        explanation: getDragExplanation(velocity, crossSectionalArea, dragCoefficient, airDensity, dragForce)
    };
}

/**
 * Calculate the cross-sectional area of a cylinder (rocket body tube).
 */
function calculateCrossSectionalArea(diameterMeters) {
    // Area = π × r² = π × (d/2)² = π × d² / 4
    const radius = diameterMeters / 2;
    return Math.PI * radius * radius;
}

/**
 * Get drag coefficient based on shape and configuration.
 * These are approximate values from aerodynamics literature.
 */
function getDragCoefficient(configuration) {
    const DRAG_COEFFICIENTS = {
        // Rocket configurations (nose cone + body tube)
        'rocket_ogive_nose': 0.35,      // Ideal ogive nose cone
        'rocket_parabolic_nose': 0.40,   // Parabolic nose cone
        'rocket_conical_nose': 0.50,     // Simple conical nose
        'rocket_blunt_nose': 0.75,       // Flat/blunt nose (poor aerodynamics)
        
        // With fins adds some drag but improves stability
        'rocket_with_fins': 0.45,
        'rocket_with_fins_draggy': 0.65,
        
        // Parachute configurations
        'parachute_round': 1.5,          // Round parachute (most common)
        'parachute_parawing': 2.0,       // Parafoil/elliptical (glides!)
        'parachute_streamer': 0.8,       // Streamer (minimal drag, fast descent)
        
        // Reference shapes for comparison
        'sphere': 0.47,
        'flat_plate_perpendicular': 1.28,
        'flat_plate_parallel': 0.001,
        'streamlined_body': 0.04
    };
    
    return DRAG_COEFFICIENTS[configuration] || 0.75;  // Default to blunt rocket
}

/**
 * Generate Feynman-style explanation for drag calculation.
 */
function getDragExplanation(velocity, area, cd, density, force) {
    const velocityMph = velocity / PHYSICS_CONSTANTS.MILES_PER_HOUR_TO_M_S;
    
    let explanation = `
        At ${velocity.toFixed(1)} m/s (${velocityMph.toFixed(0)} mph), drag force is ${force.toFixed(2)} N.
        
        The key insight: Drag scales with VELOCITY SQUARED. 
        `;
    
    // Add comparative examples
    if (velocity > 0) {
        const halfVelocity = velocity / 2;
        const halfDrag = 0.5 * density * halfVelocity * halfVelocity * cd * area;
        explanation += `
        At half this speed (${halfVelocity.toFixed(1)} m/s), drag would be ${halfDrag.toFixed(2)} N - only 25% of current drag.
        `;
    }
    
    // Add shape comparison
    explanation += `
        Your rocket's drag coefficient (C_d = ${cd}) means:
        `;
    
    if (cd < 0.4) {
        explanation += "Excellent aerodynamics! You have a well-shaped nose cone.";
    } else if (cd < 0.6) {
        explanation += "Decent aerodynamics - typical for hobby rockets.";
    } else {
        explanation += "Draggy shape - consider a pointed nose cone to reduce drag.";
    }
    
    return explanation.trim();
}

/**
 * Calculate terminal velocity - when drag equals weight.
 * Critical for parachute descent prediction!
 */
function calculateTerminalVelocity(massKg, crossSectionalArea, dragCoefficient, airDensity) {
    // At terminal velocity: Drag Force = Weight
    // ½ × ρ × v² × C_d × A = m × g
    // Solving for v: v = √(2mg / ρC_dA)
    
    const weight = massKg * PHYSICS_CONSTANTS.GRAVITY;
    const terminalVelocity = Math.sqrt((2 * weight) / (airDensity * dragCoefficient * crossSectionalArea));
    
    return {
        value: terminalVelocity,
        explanation: `
            Terminal velocity is ${terminalVelocity.toFixed(1)} m/s (${(terminalVelocity * 3.6).toFixed(1)} km/h).
            
            This is where drag force exactly equals weight - the rocket/parachute can't fall faster.
            Bigger parachute = more area = lower terminal velocity = slower, safer landing.
        `
    };
}

// Export to global window object for browser use
if (typeof window !== 'undefined') {
    window.DragModule = {
        calculateDrag,
        calculateCrossSectionalArea,
        getDragCoefficient,
        calculateTerminalVelocity,
        getDragExplanation
    };
}

// Also export for Node.js/module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.DragModule || {
        calculateDrag,
        calculateCrossSectionalArea,
        getDragCoefficient,
        calculateTerminalVelocity,
        getDragExplanation
    };
}
