// ============================================
// ROCKET-BUILDER.JS - Component Selection Logic
// Lets users build their virtual rocket from parts
// ============================================

/**
 * Load and populate component selection dropdowns.
 */
function initializeBuilder(data) {
    const rocketSelect = document.getElementById('rocket-select');
    const motorSelect = document.getElementById('motor-select');
    const parachuteSelect = document.getElementById('parachute-select');
    
    // Populate rockets
    data.rockets.forEach(rocket => {
        const option = document.createElement('option');
        option.value = rocket.id;
        option.textContent = `${rocket.name} (${rocket.diameter}mm, ${rocket.mass*1000}g)`;
        rocketSelect.appendChild(option);
    });
    
    // Populate motors
    data.motors.forEach(motor => {
        const option = document.createElement('option');
        option.value = motor.id;
        option.textContent = `${motor.name} - ${getMotorClassLabel(motor)} class, ${(motor.averageThrust * PHYSICS_CONSTANTS.NEWTONS_TO_OUNCES).toFixed(0)}oz thrust`;
        motorSelect.appendChild(option);
    });
    
    // Populate parachutes
    data.parachutes.forEach(parachute => {
        const option = document.createElement('option');
        option.value = parachute.id;
        option.textContent = `${parachute.name} - ${parachute.diameter}cm ${parachute.type}`;
        parachuteSelect.appendChild(option);
    });
    
    // Add change listeners
    rocketSelect.addEventListener('change', () => updateComponentDetails('rocket'));
    motorSelect.addEventListener('change', () => updateComponentDetails('motor'));
    parachuteSelect.addEventListener('change', () => updateComponentDetails('parachute'));
}

/**
 * Update component details display when selection changes.
 */
function updateComponentDetails(componentType) {
    const select = document.getElementById(`${componentType}-select`);
    const detailsDiv = document.getElementById(`${componentType}-details`);
    
    if (!select || !detailsDiv) return;
    
    const selectedId = select.value;
    let component = null;
    
    // Find selected component in loaded data
    if (window.ROCKET_DATA) {
        if (componentType === 'rocket') {
            component = window.ROCKET_DATA.rockets.find(r => r.id === selectedId);
        } else if (componentType === 'motor') {
            component = window.ROCKET_DATA.motors.find(m => m.id === selectedId);
        } else if (componentType === 'parachute') {
            component = window.ROCKET_DATA.parachutes.find(p => p.id === selectedId);
        }
    }
    
    if (!component) return;
    
    // Generate details HTML
    let html = '';
    
    if (componentType === 'rocket') {
        html = `
            <p><strong>Mass:</strong> ${(component.mass * 1000).toFixed(0)} grams</p>
            <p><strong>Diameter:</strong> ${component.diameter}mm (${(component.diameter / 25.4).toFixed(2)} inches)</p>
            <p><strong>Length:</strong> ${component.length}mm</p>
            <p><strong>Fins:</strong> ${component.fins} fins</p>
            <small class="feynman-tip">💡 Tip: Heavier rockets need more powerful motors but are less affected by wind.</small>
        `;
    } else if (componentType === 'motor') {
        const totalImpulse = ThrustModule.calculateTotalImpulse(component);
        const motorClass = ThrustModule.getMotorClass(totalImpulse);
        html = `
            <p><strong>Total Impulse:</strong> ${totalImpulse.toFixed(1)} N·s (${motorClass}-class)</p>
            <p><strong>Average Thrust:</strong> ${component.averageThrust.toFixed(1)} N (${(component.averageThrust * PHYSICS_CONSTANTS.NEWTONS_TO_OUNCES).toFixed(0)} oz)</p>
            <p><strong>Burn Time:</strong> ${component.burnTime.toFixed(2)} seconds</p>
            <p><strong>Total Mass:</strong> ${(component.totalMass * 1000).toFixed(0)} grams</p>
            <small class="feynman-tip">💡 Tip: Longer burn time often means higher altitude - less time for drag to slow you down.</small>
        `;
    } else if (componentType === 'parachute') {
        const suitability = ParachutePhysics.checkParachuteSuitability(1, component);  // Rough estimate
        html = `
            <p><strong>Type:</strong> ${component.type}</p>
            <p><strong>Diameter:</strong> ${component.diameter}cm (${(component.diameter * 0.3937).toFixed(1)} inches)</p>
            <p><strong>Mass:</strong> ${(component.mass * 1000).toFixed(0)} grams</p>
            <small class="feynman-tip">💡 Tip: Bigger parachutes mean slower descent but more wind drift. Find your balance.</small>
        `;
    }
    
    detailsDiv.innerHTML = html;
}

/**
 * Get current rocket configuration from UI.
 */
function getRocketConfiguration() {
    const rocketSelect = document.getElementById('rocket-select');
    const motorSelect = document.getElementById('motor-select');
    const parachuteSelect = document.getElementById('parachute-select');
    const payloadInput = document.getElementById('payload-weight');
    
    if (!window.ROCKET_DATA) {
        console.error('Rocket data not loaded');
        return null;
    }
    
    const rocket = window.ROCKET_DATA.rockets.find(r => r.id === rocketSelect.value);
    const motor = window.ROCKET_DATA.motors.find(m => m.id === motorSelect.value);
    const parachute = window.ROCKET_DATA.parachutes.find(p => p.id === parachuteSelect.value);
    const payloadMass = parseFloat(payloadInput.value) || 0;
    
    return {
        rocket,
        motor,
        parachute,
        payloadMass: payloadMass * PHYSICS_CONSTANTS.GRAMS_TO_KG
    };
}

/**
 * Get current launch conditions from UI.
 */
function getLaunchConditions() {
    const windSpeedInput = document.getElementById('wind-speed');
    const windDirectionInput = document.getElementById('wind-direction');
    const altitudeInput = document.getElementById('altitude');
    
    return {
        windSpeed: parseFloat(windSpeedInput.value) || APP_CONFIG.DEFAULT_WIND_SPEED,
        windDirection: parseFloat(windDirectionInput.value) || APP_CONFIG.DEFAULT_WIND_DIRECTION,
        altitude: parseFloat(altitudeInput.value) || APP_CONFIG.DEFAULT_ALTITUDE
    };
}

/**
 * Get motor class label for display.
 */
function getMotorClassLabel(motor) {
    const totalImpulse = ThrustModule.calculateTotalImpulse(motor);
    return ThrustModule.getMotorClass(totalImpulse);
}

/**
 * Validate rocket configuration.
 */
function validateConfiguration(config) {
    const warnings = [];
    
    if (!config.rocket || !config.motor) {
        return { valid: false, errors: ['Please select a rocket and motor'] };
    }
    
    // Check motor suitability
    const totalMass = config.rocket.mass + config.motor.totalMass +
                      (config.parachute ? config.parachute.mass : 0) +
                      config.payloadMass;
    
    const motorSuitability = ThrustModule.checkMotorSuitability(config.motor, totalMass);
    if (motorSuitability.suitability === 'underpowered') {
        warnings.push(motorSuitability.explanation);
    }
    
    // Check parachute suitability
    if (config.parachute) {
        const chuteSuitability = ParachutePhysics.checkParachuteSuitability(totalMass, config.parachute);
        if (chuteSuitability.suitability === 'undersized') {
            warnings.push(chuteSuitability.explanation);
        }
    } else {
        warnings.push('No parachute selected - rocket will crash!');
    }
    
    return { valid: true, warnings };
}

// Module exports
const RocketBuilder = {
    initializeBuilder,
    updateComponentDetails,
    getRocketConfiguration,
    getLaunchConditions,
    validateConfiguration,
    getMotorClassLabel
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = RocketBuilder;
}