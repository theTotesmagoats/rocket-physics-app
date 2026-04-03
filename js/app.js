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
    
    // Verify all required modules are loaded
    const requiredModules = [
        'PHYSICS_CONSTANTS',
        'DragModule', 'ThrustModule', 'FlightPhases',
        'WindModel', 'ParachutePhysics',
        'TrajectoryEngine', 'Visualizer', 'RocketBuilder'
    ];
    
    console.log('📦 Checking module availability:');
    requiredModules.forEach(moduleName => {
        const exists = typeof window[moduleName] !== 'undefined');
        console.log(`   ${exists ? '✅' : '❌'} ${moduleName}`);
    });
    
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
    if (!visualizer) {
        console.error('❌ Visualizer failed to initialize - canvas not found!');
    }
    
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
    
    // Display statistics (including interactive equation boxes)
    displayStatisticsWithEquations(result.statistics);
    
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
 * Display statistics with interactive equation boxes.
 */
function displayStatisticsWithEquations(stats) {
    const peakAltitude = stats.peakAltitudeFeet || 0;
    const totalTime = stats.totalFlightTime || 0;
    const maxVelocity = stats.maxVelocity || 0;
    const downrange = stats.downrangeFeet || 0;
    
    // Update the statistics display
    document.getElementById('peak-altitude-value').textContent = `${peakAltitude.toFixed(0)} ft`;
    document.getElementById('total-flight-time-value').textContent = `${totalTime.toFixed(1)} s`;
    document.getElementById('max-velocity-value').textContent = `${maxVelocity.toFixed(1)} m/s (${(maxVelocity * 2.237).toFixed(0)} mph)`;
    document.getElementById('downrange-value').textContent = `${downrange.toFixed(0)} ft`;
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
    
    // Clear equation display
    hideEquation();
    
    // Clear canvas
    if (visualizer) {
        visualizer.ctx.clearRect(0, 0, visualizer.width, visualizer.height);
        Visualizer.drawBackground(visualizer);
    }
}

/**
 * Show equation for a given statistic.
 */
function showEquation(statType) {
    const equationDisplay = document.getElementById('equation-display');
    if (!equationDisplay) return;
    
    // Hide all stat boxes' highlighting first
    document.querySelectorAll('.stat-box').forEach(box => {
        box.style.border = '';
        box.style.boxShadow = '';
    });
    
    // Highlight the clicked stat box
    const clickedBox = event.currentTarget;
    if (clickedBox) {
        clickedBox.style.border = '2px solid #ffd700';
        clickedBox.style.boxShadow = '0 0 15px rgba(255, 215, 0, 0.6)';
    }
    
    let title, content;
    
    switch (statType) {
        case 'peak-altitude':
            title = 'Peak Altitude Calculation';
            content = `
                <div class="equation-display">
                    <strong>Physics Principle:</strong> Conservation of Energy<br>
                    Initial kinetic energy converts to gravitational potential energy
                </div>
                
                <h4>The Equation:</h4>
                <div class="equation-display">h_max = h₀ + ∫v(t)dt from 0 to t_apogee</div>
                
                <h4>How It's Solved (Step by Step):</h4>
                
                <div class="equation-step highlight">
                    <strong>Step 1: Numerical Integration</strong><br>
                    The rocket's velocity changes continuously due to thrust, drag, and gravity.<br>
                    We use Forward Euler integration:<br>
                    v_{n+1} = v_n + a_n × Δt
                </div>
                
                <div class="equation-step">
                    <strong>Step 2: Altitude Update</strong><br>
                    As velocity changes, we update altitude:<br>
                    h_{n+1} = h_n + v_{n+1} × Δt
                </div>
                
                <div class="equation-step">
                    <strong>Step 3: Find Apogee</strong><br>
                    Peak altitude occurs when velocity crosses zero (v = 0).<br>
                    We track the maximum height reached during the flight.
                </div>
                
                <h4>Key Variables:</h4>
                <div class="variable-definition">
                    • h_max: Maximum altitude above launch point<br>
                    • v(t): Velocity as a function of time<br>
                    • t_apogee: Time when vertical velocity = 0<br>
                    • Δt: Time step (typically 0.01-0.1 seconds)
                </div>
            `;
            break;
            
        case 'flight-time':
            title = 'Total Flight Time Calculation';
            content = `
                <div class="equation-display">
                    <strong>Physics Principle:</strong> Time Integration of Motion
                </div>
                
                <h4>The Equation:</h4>
                <div class="equation-display">t_total = t_ascent + t_descent</div>
                
                <h4>How It's Solved (Step by Step):</h4>
                
                <div class="equation-step highlight">
                    <strong>Step 1: Powered Ascent Phase</strong><br>
                    Motor provides thrust for burn_time seconds.<br>
                    Acceleration: a = (T - D - mg) / m
                </div>
                
                <div class="equation-step">
                    <strong>Step 2: Coasting Ascent</strong><br>
                    After burnout, rocket continues upward on momentum.<br>
                    Deceleration: a = (-D - mg) / m
                </div>
                
                <div class="equation-step highlight">
                    <strong>Step 3: Descent Phase</strong><br>
                    Parachute deploys at apogee.<br>
                    Terminal velocity reached when drag = weight:<br>
                    ½ρv²C_dA = mg → v_terminal = √(2mg / ρC_dA)
                </div>
                
                <h4>Key Variables:</h4>
                <div class="variable-definition">
                    • t_ascent: Time from launch to apogee<br>
                    • t_descent: Time from apogee to landing<br>
                    • T: Thrust force, D: Drag force<br>
                    • m: Rocket mass, g: Gravity (9.81 m/s²)
                </div>
            `;
            break;
            
        case 'max-velocity':
            title = 'Maximum Velocity Calculation';
            content = `
                <div class="equation-display">
                    <strong>Physics Principle:</strong> Newton's Second Law
                </div>
                
                <h4>The Equation:</h4>
                <div class="equation-display">v_max = max(v(t)) during flight</div>
                
                <h4>How It's Solved (Step by Step):</h4>
                
                <div class="equation-step highlight">
                    <strong>Step 1: Calculate Net Force</strong><br>
                    During powered ascent:<br>
                    F_net = Thrust - Drag - Weight
                </div>
                
                <div class="equation-step">
                    <strong>Step 2: Calculate Acceleration</strong><br>
                    a = F_net / m (Newton's Second Law)<br>
                    Note: Mass decreases as fuel burns!
                </div>
                
                <div class="equation-step highlight">
                    <strong>Step 3: Update Velocity</strong><br>
                    Using Forward Euler:<br>
                    v_{n+1} = v_n + a_n × Δt
                </div>
                
                <div class="equation-step">
                    <strong>Step 4: Track Maximum</strong><br>
                    Continue updating until velocity starts decreasing.<br>
                    The highest value reached is v_max.
                </div>
                
                <h4>Key Variables:</h4>
                <div class="variable-definition">
                    • v_max: Peak velocity (usually during powered ascent)<br>
                    • T: Thrust from motor<br>
                    • D = ½ρv²C_dA: Drag force<br>
                    • m(t): Time-varying mass
                </div>
                
                <div class="equation-step highlight">
                    <strong>Why It Matters:</strong><br>
                    Maximum velocity determines the dynamic pressure on your rocket.<br>
                    This is critical for structural integrity!
                </div>
            `;
            break;
            
        case 'downrange':
            title = 'Downrange Distance Calculation';
            content = `
                <div class="equation-display">
                    <strong>Physics Principle:</strong> Wind Drift Integration
                </div>
                
                <h4>The Equation:</h4>
                <div class="equation-display">D_downrange = ∫v_wind(h(t)) × dt</div>
                
                <h4>How It's Solved (Step by Step):</h4>
                
                <div class="equation-step highlight">
                    <strong>Step 1: Wind Model</strong><br>
                    Get wind speed at each altitude:<br>
                    v_wind(h) = wind_speed × f(height)
                </div>
                
                <div class="equation-step">
                    <strong>Step 2: Time Spent at Each Altitude</strong><br>
                    During ascent/descent, calculate time spent<br>
                    at each altitude slice: Δt = Δh / |v_z|
                </div>
                
                <div class="equation-step highlight">
                    <strong>Step 3: Horizontal Drift Integration</strong><br>
                    For each time step:<br>
                    Δx = v_wind × cos(direction) × Δt<br>
                    Δy = v_wind × sin(direction) × Δt
                </div>
                
                <div class="equation-step">
                    <strong>Step 4: Total Drift</strong><br>
                    Sum all horizontal displacements:<br>
                    D_total = √(ΣΔx)² + (ΣΔy)²
                </div>
                
                <h4>Key Variables:</h4>
                <div class="variable-definition">
                    • v_wind: Wind velocity vector<br>
                    • h(t): Altitude as function of time<br>
                    • direction: Wind direction in radians<br>
                    • Δt: Time step size
                </div>
                
                <div class="equation-step highlight">
                    <strong>Feynman's Insight:</strong><br>
                    "Wind doesn't push your rocket horizontally—it pushes while the rocket is aloft.<br>
                    The longer it stays up, the more it drifts!"
                </div>
            `;
            break;
            
        default:
            return;
    }
    
    // Update the equation display
    document.getElementById('equation-title').textContent = title;
    document.getElementById('equation-content').innerHTML = content;
    equationDisplay.style.display = 'block';
}

/**
 * Hide the equation display.
 */
function hideEquation() {
    const equationDisplay = document.getElementById('equation-display');
    if (equationDisplay) {
        equationDisplay.style.display = 'none';
    }
    
    // Clear all stat box highlighting
    document.querySelectorAll('.stat-box').forEach(box => {
        box.style.border = '';
        box.style.boxShadow = '';
    });
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
        loadComponentData,
        showEquation,
        hideEquation,
        displayStatisticsWithEquations
    };
}