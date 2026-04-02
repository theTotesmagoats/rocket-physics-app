// ============================================
// APP.JS - Main Application Entry Point
// Ties all modules together and handles user interaction
// ============================================

// Global data storage
window.ROCKET_DATA = null;
let visualizer = null;

/**
 * Initialize the application.
 */
async function initializeApp() {
    console.log('🚀 Initializing Rocket Physics Simulator...');
    
    // Load component data
    await loadComponentData();
    
    // Initialize builder UI
    if (window.ROCKET_DATA) {
        RocketBuilder.initializeBuilder(window.ROCKET_DATA);
    }
    
    // Initialize visualizer
    visualizer = Visualizer.initializeVisualizer();
    
    // Set up event listeners
    setupEventListeners();
    
    console.log('✅ Application ready!');
}

/**
 * Load all component data from JSON files.
 */
async function loadComponentData() {
    try {
        const [rocketsRes, motorsRes, parachutesRes] = await Promise.all([
            fetch('data/rockets.json'),
            fetch('data/motors.json'),
            fetch('data/parachutes.json')
        ]);
        
        const rockets = await rocketsRes.json();
        const motors = await motorsRes.json();
        const parachutes = await parachutesRes.json();
        
        window.ROCKET_DATA = { rockets, motors, parachutes };
        console.log('📦 Loaded', rockets.length, 'rockets,', motors.length, 'motors,', parachutes.length, 'parachutes');
    } catch (error) {
        console.error('❌ Failed to load component data:', error);
        // Use fallback data
        window.ROCKET_DATA = getFallbackData();
        console.log('🔄 Using fallback data');
    }
}

/**
 * Set up all event listeners.
 */
function setupEventListeners() {
    const simulateBtn = document.getElementById('simulate-btn');
    const resetBtn = document.getElementById('reset-btn');
    
    if (simulateBtn) {
        simulateBtn.addEventListener('click', handleSimulate);
    }
    
    if (resetBtn) {
        resetBtn.addEventListener('click', handleReset);
    }
}

/**
 * Handle simulate button click.
 */
async function handleSimulate() {
    const config = RocketBuilder.getRocketConfiguration();
    const launchConditions = RocketBuilder.getLaunchConditions();
    
    if (!config || !config.rocket || !config.motor) {
        alert('Please select a rocket and motor first!');
        return;
    }
    
    // Validate configuration
    const validation = RocketBuilder.validateConfiguration(config);
    if (!validation.valid) {
        alert(validation.errors.join('\n'));
        return;
    }
    
    if (validation.warnings && validation.warnings.length > 0) {
        console.warn('⚠️ Configuration warnings:', validation.warnings);
    }
    
    // Run simulation
    console.log('🎯 Running simulation...');
    const result = TrajectoryEngine.simulateFlight(config, launchConditions);
    
    // Display results
    displayResults(result);
}

/**
 * Display simulation results.
 */
function displayResults(result) {
    const resultsSection = document.getElementById('results');
    if (!resultsSection) return;
    
    // Show results section
    resultsSection.style.display = 'block';
    
    // Display statistics
    Visualizer.displayStatistics(result.statistics);
    
    // Display teaching content
    Visualizer.displayTeachingContent(result.teachingContent);
    
    // Draw visualization
    if (visualizer) {
        Visualizer.drawFlightVisualization(visualizer, result);
    }
    
    // Scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Handle reset button click.
 */
function handleReset() {
    // Reset form inputs to defaults
    document.getElementById('wind-speed').value = APP_CONFIG.DEFAULT_WIND_SPEED;
    document.getElementById('wind-direction').value = APP_CONFIG.DEFAULT_WIND_DIRECTION;
    document.getElementById('altitude').value = APP_CONFIG.DEFAULT_ALTITUDE;
    document.getElementById('payload-weight').value = APP_CONFIG.DEFAULT_PAYLOAD_WEIGHT;
    
    // Hide results
    const resultsSection = document.getElementById('results');
    if (resultsSection) {
        resultsSection.style.display = 'none';
    }
    
    // Clear canvas
    if (visualizer) {
        visualizer.ctx.clearRect(0, 0, visualizer.width, visualizer.height);
        Visualizer.drawBackground(visualizer);
    }
}

/**
 * Fallback data if JSON files fail to load.
 */
function getFallbackData() {
    return {
        rockets: [
            {
                id: 'estex_29',
                name: 'Estes 29mm Body Tube',
                diameter: 29,
                length: 305,
                mass: 0.045,
                fins: 3
            },
            {
                id: 'estex_18',
                name: 'Estes 18mm Body Tube',
                diameter: 18,
                length: 203,
                mass: 0.025,
                fins: 3
            }
        ],
        motors: [
            {
                id: 'estes_a8_3',
                name: 'Estes A8-3',
                averageThrust: 4.6,
                burnTime: 0.75,
                totalMass: 0.019,
                emptyMass: 0.012,
                propellantMass: 0.007
            },
            {
                id: 'estes_b4_4',
                name: 'Estes B4-4',
                averageThrust: 6.7,
                burnTime: 1.25,
                totalMass: 0.031,
                emptyMass: 0.018,
                propellantMass: 0.013
            },
            {
                id: 'estes_c6_5',
                name: 'Estes C6-5',
                averageThrust: 7.4,
                burnTime: 2.0,
                totalMass: 0.048,
                emptyMass: 0.025,
                propellantMass: 0.023
            }
        ],
        parachutes: [
            {
                id: 'para_12_round',
                name: '12" Round Parachute',
                diameter: 30,
                type: 'round',
                mass: 0.008
            },
            {
                id: 'para_18_round',
                name: '18" Round Parachute',
                diameter: 46,
                type: 'round',
                mass: 0.015
            }
        ]
    };
}

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);

// Export for debugging
if (typeof window !== 'undefined') {
    window.RocketPhysicsApp = {
        initializeApp,
        handleSimulate,
        getFallbackData
    };
}