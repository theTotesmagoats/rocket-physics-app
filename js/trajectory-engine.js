// ============================================
// TRAJECTORY-ENGINE.JS - Main Simulation Loop
// Combines all physics modules to predict flight path
// ============================================

/**
 * Run the complete flight simulation.
 * Returns trajectory data point by point for visualization and analysis.
 */
function simulateFlight(rocketConfig, launchConditions) {
    console.log('🚀 SIMULATION START - Config:', rocketConfig);
    console.log('Weather:', launchConditions);
    
    // Initialize state
    const initialState = createInitialState(rocketConfig, launchConditions);
    console.log('Initial State:', initialState);
    
    const trajectory = [];
    let state = { ...initialState };
    let previousPhase = FlightPhase.LAUNCH;
    const phaseTransitions = [];
    
    let iterationCount = 0;
    const maxIterations = 100; // Log first 100 iterations for debugging
    
    // Main simulation loop
    while (state.time < APP_CONFIG.MAX_SIMULATION_TIME && !state.landed) {
        iterationCount++;
        
        if (iterationCount <= maxIterations || iterationCount % 50 === 0) {
            console.log(`Iter ${iterationCount}: t=${state.time.toFixed(3)}s, alt=${state.altitude.toFixed(2)}m, vel=${state.velocity.toFixed(3)}m/s`);
        }
        
        // Record current state
        trajectory.push(recordState(state));
        
        // Get current phase
        const currentPhase = FlightPhases.getCurrentPhase(state);
        
        // Check for phase transition
        const transition = FlightPhases.detectPhaseTransition(previousPhase, currentPhase);
        if (transition) {
            phaseTransitions.push({
                time: state.time,
                altitude: state.altitude,
                ...transition
            });
            previousPhase = currentPhase;
        }
        
        // Check for parachute deployment
        if (!state.parachuteDeployed && rocketConfig.parachute) {
            if (ParachutePhysics.shouldDeployParachute(state, rocketConfig.parachute)) {
                const deployment = ParachutePhysics.simulateParachuteDeployment(state, rocketConfig.parachute);
                state.velocity = deployment.velocity;
                state.parachuteDeployed = true;
                phaseTransitions.push({
                    time: state.time,
                    altitude: deployment.deploymentAltitude,
                    from: currentPhase,
                    to: 'parachute_deployed',
                    explanation: 'Parachute deployed!'
                });
            }
        }
        
        // Calculate forces and update state
        const deltaTime = APP_CONFIG.TIME_STEP;
        updateState(state, rocketConfig, launchConditions, deltaTime);
        
        // Check for landing (only if not on launch rod)
        if (!state.onLaunchRod && state.altitude <= 0) {
            console.log('LANDING DETECTED at t=' + state.time.toFixed(2) + 's');
            state.altitude = 0;
            state.velocity = 0;
            state.landed = true;
            trajectory.push(recordState(state));
            break;
        }
        
        state.time += deltaTime;
        
        // Safety: stop if simulation runs too long (debugging)
        if (iterationCount > 10000) {
            console.warn('SIMULATION STUCK - stopping at ' + iterationCount + ' iterations');
            break;
        }
    }
    
    console.log('SIMULATION END - trajectory length:', trajectory.length);
    
    // Calculate summary statistics
    const stats = calculateFlightStatistics(trajectory, phaseTransitions, rocketConfig);
    console.log('Final Statistics:', stats);
    
    return {
        trajectory,
        statistics: stats,
        phaseTransitions,
        teachingContent: generateTeachingContent(stats, phaseTransitions, rocketConfig)
    };
}

/**
 * Create initial simulation state.
 */
function createInitialState(rocketConfig, launchConditions) {
    // Calculate total mass
    const rocketMass = rocketConfig.rocket.mass + 
                       rocketConfig.motor.emptyMass + 
                       (rocketConfig.parachute ? rocketConfig.parachute.mass : 0) +
                       rocketConfig.payloadMass;
    
    console.log('Total Mass:', (rocketMass * 1000).toFixed(2), 'g');
    
    return {
        time: 0,
        altitude: launchConditions.altitude * PHYSICS_CONSTANTS.FEET_TO_METERS,
        velocity: 0,
        horizontalX: 0,  // East position
        horizontalY: 0,  // North position
        mass: rocketMass,
        motorBurnTime: rocketConfig.motor.burnTime,
        parachuteDeployed: false,
        maxAltitudeReached: false,
        peakAltitude: 0,
        onLaunchRod: true,
        launchRodExitSpeed: 15,  // m/s - typical exit speed
        landed: false
    };
}

/**
 * Update state for one time step.
 */
function updateState(state, rocketConfig, launchConditions, deltaTime) {
    // Get air density at current altitude
    const airDensity = getAirDensityAtAltitude(state.altitude);
    
    // Calculate cross-sectional area
    const isDescent = state.velocity < 0 && state.parachuteDeployed;
    const area = isDescent 
        ? ParachutePhysics.calculateParachuteArea(rocketConfig.parachute.diameter)
        : DragModule.calculateCrossSectionalArea(rocketConfig.rocket.diameter * PHYSICS_CONSTANTS.CM_TO_METERS);
    
    // Get drag coefficient
    let cd;
    if (isDescent) {
        cd = ParachutePhysics.getParachuteDragCoefficient(rocketConfig.parachute.type);
    } else if (state.velocity < 0 && !state.parachuteDeployed) {
        cd = DragModule.getDragCoefficient('rocket_blunt_nose');  // Falling nose-first
    } else {
        cd = DragModule.getDragCoefficient('rocket_with_fins');
    }
    
    // Calculate drag force
    const dragResult = DragModule.calculateDrag(Math.abs(state.velocity), area, cd, airDensity);
    const dragForce = dragResult.value;
    
    // Get thrust (only during powered ascent)
    let thrust = 0;
    if (state.time < state.motorBurnTime && state.velocity >= 0) {
        const thrustResult = ThrustModule.getThrustAtTime(rocketConfig.motor, state.time);
        thrust = thrustResult.value;
    }
    
    // Update mass (propellant burn)
    if (state.time < state.motorBurnTime) {
        state.mass = ThrustModule.getMassAtTime(
            rocketConfig.rocket.mass + rocketConfig.motor.totalMass +
            (rocketConfig.parachute ? rocketConfig.parachute.mass : 0) +
            rocketConfig.payloadMass,
            rocketConfig.motor,
            state.time
        );
    }
    
    // Calculate acceleration
    const accelResult = ThrustModule.calculateAcceleration(thrust, dragForce, state.mass);
    let acceleration = accelResult.value;
    
    console.log(`Forces: thrust=${thrust.toFixed(2)}N, drag=${dragForce.toFixed(4)}N, weight=${state.mass * PHYSICS_CONSTANTS.GRAVITY}N → acc=${acceleration.toFixed(2)}m/s²`);
    
    // Constrain velocity during launch rod phase - rocket cannot fall down the rod
    if (state.onLaunchRod && acceleration < 0) {
        console.log('Constraining negative acceleration on launch rod');
        acceleration = 0;  // Prevent falling while on rod
    }
    
    // Check launch rod exit
    if (state.onLaunchRod && Math.abs(state.velocity) >= state.launchRodExitSpeed) {
        console.log('LAUNCH ROD EXIT at t=' + state.time.toFixed(2) + 's');
        state.onLaunchRod = false;
    }
    
    // Track peak altitude
    if (state.altitude > state.peakAltitude) {
        state.peakAltitude = state.altitude;
    }
    
    // Detect apogee
    if (!state.maxAltitudeReached && state.velocity <= 0 && state.altitude > 1) {
        console.log('APEX REACHED at t=' + state.time.toFixed(2) + 's, alt=' + state.altitude.toFixed(2) + 'm');
        state.maxAltitudeReached = true;
    }
    
    // Update velocity and position
    state.velocity += acceleration * deltaTime;
    state.altitude += state.velocity * deltaTime;
    
    // Calculate wind drift
    const windComponents = WindModel.getWindVelocityComponents(
        launchConditions.windSpeed,
        launchConditions.windDirection
    );
    
    const currentPhase = FlightPhases.getCurrentPhase(state);
    const drift = WindModel.calculateHorizontalDrift(
        windComponents.vx, windComponents.vy, deltaTime, currentPhase, state.parachuteDeployed
    );
    
    state.horizontalX += drift.dx;
    state.horizontalY += drift.dy;
}

/**
 * Record state for trajectory array.
 */
function recordState(state) {
    return {
        time: state.time,
        altitude: state.altitude,
        velocity: state.velocity,
        horizontalX: state.horizontalX,
        horizontalY: state.horizontalY,
        mass: state.mass,
        phase: FlightPhases.getCurrentPhase(state)
    };
}

/**
 * Calculate flight statistics from trajectory.
 */
function calculateFlightStatistics(trajectory, phaseTransitions, rocketConfig) {
    if (trajectory.length === 0) return {};
    
    const peakIndex = trajectory.reduce((maxIdx, point, idx, arr) => 
        point.altitude > arr[maxIdx].altitude ? idx : maxIdx, 0);
    
    const peakPoint = trajectory[peakIndex];
    const landingPoint = trajectory[trajectory.length - 1];
    
    // Find motor burnout point
    const burnoutTime = rocketConfig?.motor?.burnTime || 2.0;  // Default to 2 seconds if not specified
    const burnoutIndex = trajectory.findIndex(p => p.time >= burnoutTime);
    
    return {
        peakAltitude: peakPoint.altitude,
        peakAltitudeFeet: peakPoint.altitude / PHYSICS_CONSTANTS.FEET_TO_METERS,
        timeToApogee: peakPoint.time,
        totalFlightTime: landingPoint.time,
        descentTime: landingPoint.time - peakPoint.time,
        maxVelocity: Math.max(...trajectory.map(p => Math.abs(p.velocity))),
        landingX: landingPoint.horizontalX,
        landingY: landingPoint.horizontalY,
        downrangeDistance: Math.sqrt(landingPoint.horizontalX**2 + landingPoint.horizontalY**2),
        downrangeFeet: Math.sqrt(landingPoint.horizontalX**2 + landingPoint.horizontalY**2) / PHYSICS_CONSTANTS.FEET_TO_METERS
    };
}

/**
 * Generate teaching content for the flight.
 */
function generateTeachingContent(stats, phaseTransitions, rocketConfig) {
    const content = [];
    
    // Powered ascent explanation
    content.push({
        title: '🚀 Powered Ascent',
        text: `During the first ${rocketConfig.motor.burnTime.toFixed(2)} seconds, your motor pushed with an average of ${rocketConfig.motor.averageThrust.toFixed(1)} N. The rocket accelerated upward, fighting both gravity and drag.`
    });
    
    // Coasting explanation
    const coastTime = stats.timeToApogee - rocketConfig.motor.burnTime;
    if (coastTime > 0) {
        content.push({
            title: '📈 Coasting to Apogee',
            text: `After burnout, the rocket continued rising for ${coastTime.toFixed(1)} more seconds on momentum alone. Gravity and drag slowly bled away the velocity until reaching peak altitude.`
        });
    }
    
    // Peak altitude
    content.push({
        title: '🏔️ Peak Altitude',
        text: `Maximum height: ${stats.peakAltitudeFeet.toFixed(0)} feet (${stats.peakAltitude.toFixed(1)} meters). This is where all upward kinetic energy converted to gravitational potential energy.`
    });
    
    // Descent and landing
    content.push({
        title: '🪂 Descent & Landing',
        text: `Descent took ${stats.descentTime.toFixed(1)} seconds. Wind drifted the rocket ${stats.downrangeFeet.toFixed(0)} feet from launch point. The parachute's terminal velocity determined both descent time and wind drift.`
    });
    
    return content;
}

// Export to global window object for browser use
if (typeof window !== 'undefined') {
    window.TrajectoryEngine = {
        simulateFlight,
        createInitialState,
        updateState,
        calculateFlightStatistics,
        generateTeachingContent
    };
}

// Also export for Node.js/module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.TrajectoryEngine || {
        simulateFlight,
        createInitialState,
        updateState,
        calculateFlightStatistics,
        generateTeachingContent
    };
}