// ============================================
// FLIGHT-PHASES.JS - Detecting Flight Phase Transitions
// A rocket's journey has distinct chapters - each with different physics
// ============================================

const FlightPhase = {
    LAUNCH: 'launch',           // On the launch rod, constrained motion
    POWERED_ASCENT: 'powered_ascent',  // Motor burning, going up
    COASTING_ASCENT: 'coasting_ascent', // Motor done, still going up
    APOGEE: 'apogee',           // Peak altitude, velocity = 0
    DESCENT: 'descent',         // Falling with parachute
    LANDING: 'landing'          // Touchdown!
};

/**
 * Determine current flight phase based on state.
 */
function getCurrentPhase(state) {
    const { 
        altitude, velocity, time, motorBurnTime, 
        parachuteDeployed, maxAltitudeReached, onLaunchRod 
    } = state;
    
    // Landing detection
    if (altitude <= 0.1 && Math.abs(velocity) < 1) {
        return FlightPhase.LANDING;
    }
    
    // Apogee detection - velocity crosses zero going negative
    if (!maxAltitudeReached && velocity <= 0 && altitude > 1) {
        return FlightPhase.APOGEE;
    }
    
    // Descent phase
    if (velocity < 0 && altitude > 0.1) {
        return FlightPhase.DESCENT;
    }
    
    // Launch rod phase
    if (onLaunchRod) {
        return FlightPhase.LAUNCH;
    }
    
    // Ascent phases
    if (velocity > 0 && altitude > 0.1) {
        return time < motorBurnTime ? FlightPhase.POWERED_ASCENT : FlightPhase.COASTING_ASCENT;
    }
    
    return FlightPhase.LAUNCH;  // Default
}

/**
 * Check if we've just transitioned to a new phase.
 */
function detectPhaseTransition(previousPhase, currentPhase) {
    if (previousPhase !== currentPhase) {
        return {
            from: previousPhase,
            to: currentPhase,
            explanation: getTransitionExplanation(previousPhase, currentPhase)
        };
    }
    return null;
}

/**
 * Get Feynman-style explanation for phase transitions.
 */
function getTransitionExplanation(fromPhase, toPhase) {
    const explanations = {
        [FlightPhase.LAUNCH + '->' + FlightPhase.POWERED_ASCENT]: `
            Leaving the launch rod!
            
            The rocket has enough speed to be aerodynamically stable on its own.
            Before this point, the rod physically prevents it from tumbling.
            After this? Pure physics takes over.
        `,
        
        [FlightPhase.POWERED_ASCENT + '->' + FlightPhase.COASTING_ASCENT]: `
            Motor burnout!
            
            The propellant is exhausted. From now on, the rocket is a projectile
            - like a ball thrown upward. Gravity and drag are the only forces.
            It will continue rising until those forces stop it.
        `,
        
        [FlightPhase.COASTING_ASCENT + '->' + FlightPhase.APOGEE]: `
            Apogee reached!
            
            For an instant, velocity is zero. The rocket has traded all its
            upward kinetic energy for gravitational potential energy.
            Now the fall begins - and this is where landing prediction matters most.
        `,
        
        [FlightPhase.APOGEE + '->' + FlightPhase.DESCENT]: `
            Beginning descent!
            
            Gravity wins. The rocket falls until the parachute deploys.
            After deployment, terminal velocity takes over - and wind starts
            pushing the rocket sideways toward its final landing spot.
        `,
        
        [FlightPhase.DESCENT + '->' + FlightPhase.LANDING]: `
            Touchdown!
            
            The journey ends. Where you land depends on:
            1. How high you went (more time for wind to drift you)
            2. How fast you fell (parachute size matters)
            3. Wind speed and direction during descent
        `
    };
    
    return explanations[fromPhase + '->' + toPhase] || `Transitioned from ${fromPhase} to ${toPhase}.`;
}

/**
 * Get explanation for current phase.
 */
function getPhaseExplanation(phase, state) {
    const explanations = {
        [FlightPhase.LAUNCH]: `
            On the launch rod.
            
            The rocket is physically constrained - it can only go straight up.
            This is crucial: without the rod, aerodynamic forces would flip
            the rocket over before it reaches stable speed (~40 mph).
        `,
        
        [FlightPhase.POWERED_ASCENT]: `
            Powered ascent!
            
            Three forces at work:
            • Thrust pushing up (from motor)
            • Gravity pulling down (constant)
            • Drag pulling down (increases with speed²)
            
            Net acceleration = (Thrust - Drag - Weight) / Mass
        `,
        
        [FlightPhase.COASTING_ASCENT]: `
            Coasting upward.
            
            Motor is done. The rocket rises only because of momentum gained
            during powered flight. Gravity and drag are slowing it down every instant.
            Think of throwing a ball up - same physics, just faster.
        `,
        
        [FlightPhase.APOGEE]: `
            Peak altitude!
            
            Kinetic energy = 0 (not moving)
            Potential energy = maximum
            
            This is the turning point. All upward motion becomes downward motion.
        `,
        
        [FlightPhase.DESCENT]: `
            Falling back to Earth.
            
            Before parachute: Fast fall, drag minimal
            After parachute: Terminal velocity, wind drift dominates
            
            Landing position is determined almost entirely during this phase.
        `,
        
        [FlightPhase.LANDING]: `
            Safe landing!
            
            The rocket has returned to Earth. Compare predicted vs actual
            landing position to understand your local wind conditions better.
        `
    };
    
    return explanations[phase] || `In phase: ${phase}`;
}

// Export to global window object for browser use
if (typeof window !== 'undefined') {
    window.FlightPhases = {
        FlightPhase,
        getCurrentPhase,
        detectPhaseTransition,
        getTransitionExplanation,
        getPhaseExplanation
    };
    
    // Also export FlightPhase constant directly for easy access
    window.FlightPhase = FlightPhase;
}

// Also export for Node.js/module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.FlightPhases || {
        FlightPhase,
        getCurrentPhase,
        detectPhaseTransition,
        getTransitionExplanation,
        getPhaseExplanation
    };
}
