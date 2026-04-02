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
    
    // Ensure DOM elements exist before proceeding
    await ensureDOMReady();
    
    // Load component data (with robust fallback)
    await loadComponentData();
    
    // Verify we have data with correct shape
    if (!window.ROCKET_DATA || !Array.isArray(window.ROCKET_DATA.rockets)) {
        console.error('❌ Invalid rocket data structure! Using emergency fallback.');
        window.ROCKET_DATA = getFallbackData();
    }
    
    console.log('📦 Data loaded:', {
        rockets: window.ROCKET_DATA.rockets?.length,
        motors: window.ROCKET_DATA.motors?.length,
        parachutes: window.ROCKET_DATA.parachutes?.length
    });
    
    // Initialize builder UI
    try {
        RocketBuilder.initializeBuilder(window.ROCKET_DATA);
        console.log('✅ Builder initialized');
    } catch (error) {
        console.error('❌ Failed to initialize builder:', error);
    }
    
    // Initialize visualizer
    visualizer = Visualizer.initializeVisualizer();
    
    // Set up event listeners
    setupEventListeners();
    
    console.log('✅ Application ready!');
}

/**
 * Ensure DOM is fully loaded.
 */
function ensureDOMReady() {
    return new Promise(resolve => {
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            resolve();
        } else {
            document.addEventListener('DOMContentLoaded', resolve);
        }
    });
}

/**
 * Load all component data from JSON files.
 */
async function loadComponentData() {
    // First, always ensure we have fallback data available
    window.ROCKET_DATA = getFallbackData();
    console.log('🔄 Fallback data loaded');
    
    // Try to load external JSON files (will fail on file:// protocol)
    try {
        const [rocketsRes, motorsRes, parachutesRes] = await Promise.all([
            fetch('data/rockets.json'),
            fetch('data/motors.json'),
            fetch('data/parachutes.json')
        ]);
        
        if (rocketsRes.ok && motorsRes.ok && parachutesRes.ok) {
            const rocketsData = await rocketsRes.json();
            const motorsData = await motorsRes.json();
            const parachutesData = await parachutesRes.json();
            
            // UNWRAP the JSON - each file is { "rockets": [...] }, not just [...]
            window.ROCKET_DATA = {
                rockets: rocketsData.rockets ?? rocketsData,
                motors: motorsData.motors ?? motorsData,
                parachutes: parachutesData.parachutes ?? parachutesData
            };
            
            console.log('📦 Loaded external data:', {
                rockets: window.ROCKET_DATA.rockets.length,
                motors: window.ROCKET_DATA.motors.length,
                parachutes: window.ROCKET_DATA.parachutes.length
            });
        } else {
            console.log('⚠️ External files not available, using fallback data');
        }
    } catch (error) {
        console.log('⚠️ Could not load external JSON (expected on file://):', error.message);
        console.log('🔄 Using fallback data instead');
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
        console.log('✅ Simulate button listener attached');
    }
    
    if (resetBtn) {
        resetBtn.addEventListener('click', handleReset);
        console.log('✅ Reset button listener attached');
    }
}

/**
 * Handle simulate button click.
 */
async function handleSimulate() {
    const config = RocketBuilder.getRocketConfiguration();
    const launchConditions = RocketBuilder.getLaunchConditions();
    
    console.log('🎯 Config:', config);
    console.log('🌤️ Launch conditions:', launchConditions);
    
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
    try {
        console.log('🎯 Running simulation...');
        const result = TrajectoryEngine.simulateFlight(config, launchConditions);
        
        console.log('📊 Simulation result:', result);
        console.log('📊 Statistics:', result.statistics);
        
        // Display results
        displayResults(result);
    } catch (error) {
        console.error('❌ SIMULATION ERROR:', error);
        alert('Simulation failed: ' + error.message + '\nCheck console for details');
    }
}

/**
 * Display simulation results.
 */
function displayResults(result) {
    const resultsSection = document.getElementById('results');
    if (!resultsSection) {
        console.error('❌ Results section not found!');
        return;
    }
    
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
    const windSpeedInput = document.getElementById('wind-speed');
    const windDirectionInput = document.getElementById('wind-direction');
    const altitudeInput = document.getElementById('altitude');
    const payloadWeightInput = document.getElementById('payload-weight');
    
    if (windSpeedInput) windSpeedInput.value = APP_CONFIG.DEFAULT_WIND_SPEED;
    if (windDirectionInput) windDirectionInput.value = APP_CONFIG.DEFAULT_WIND_DIRECTION;
    if (altitudeInput) altitudeInput.value = APP_CONFIG.DEFAULT_ALTITUDE;
    if (payloadWeightInput) payloadWeightInput.value = APP_CONFIG.DEFAULT_PAYLOAD_WEIGHT;
    
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
 * Fallback data - embedded so it always works.
 */
function getFallbackData() {
    return {
        rockets: [
            {
                id: 'estes_18_short',
                name: 'Estes 18mm Short',
                diameter: 18,
                length: 203,
                mass: 0.025,
                fins: 3
            },
            {
                id: 'estes_18_long',
                name: 'Estes 18mm Long',
                diameter: 18,
                length: 305,
                mass: 0.035,
                fins: 3
            },
            {
                id: 'estes_29_standard',
                name: 'Estes 29mm Standard',
                diameter: 29,
                length: 305,
                mass: 0.045,
                fins: 4
            },
            {
                id: 'estes_29_tall',
                name: 'Estes 29mm Tall Boy',
                diameter: 29,
                length: 457,
                mass: 0.065,
                fins: 4
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
            },
            {
                id: 'estes_d12_5',
                name: 'Estes D12-5',
                averageThrust: 16.8,
                burnTime: 1.75,
                totalMass: 0.105,
                emptyMass: 0.050,
                propellantMass: 0.055
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
            },
            {
                id: 'streamer_small',
                name: '6" Streamer',
                diameter: 15,
                type: 'streamer',
                mass: 0.002
            }
        ]
    };
}

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM Content Loaded');
    initializeApp();
});

// Export for debugging
if (typeof window !== 'undefined') {
    window.RocketPhysicsApp = {
        initializeApp,
        handleSimulate,
        getFallbackData,
        loadComponentData
    };
}