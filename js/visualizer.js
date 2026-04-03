// ============================================
// VISUALIZER.JS - Flight Path Visualization
// Shows the rocket's journey through the sky
// ============================================

let canvas = null;
let ctx = null;

/**
 * Initialize the visualization canvas.
 */
function initializeVisualizer() {
    console.log('🎨 Initializing visualizer...');
    
    // Get canvas element
    const canvasElement = document.getElementById('flight-canvas');
    if (!canvasElement) {
        console.error('❌ Canvas element not found!');
        return null;
    }
    
    canvas = canvasElement;
    ctx = canvas.getContext('2d');
    
    if (!ctx) {
        console.error('❌ Failed to get 2D context from canvas!');
        return null;
    }
    
    // Set canvas dimensions
    const container = canvasElement.parentElement;
    if (container) {
        canvas.width = container.clientWidth || 900;
        canvas.height = container.clientHeight || 600;
    } else {
        canvas.width = 900;
        canvas.height = 600;
    }
    
    // Clear and draw initial state
    drawBackground();
    
    console.log('✅ Visualizer initialized with canvas:', { width: canvas.width, height: canvas.height });
    return { canvas, ctx };
}

/**
 * Draw the background scene.
 */
function drawBackground(viz) {
    const context = viz?.ctx || ctx;
    if (!context || !canvas) return;
    
    // Clear canvas
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // Sky gradient
    const skyGradient = context.createLinearGradient(0, 0, 0, canvas.height);
    skyGradient.addColorStop(0, '#87CEEB');  // Light blue
    skyGradient.addColorStop(1, '#E0F6FF');  // Very light blue
    context.fillStyle = skyGradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Ground line
    context.strokeStyle = '#4CAF50';
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(0, canvas.height - 50);
    context.lineTo(canvas.width, canvas.height - 50);
    context.stroke();
    
    // Launch pad marker
    context.fillStyle = '#795548';
    context.fillRect(canvas.width / 2 - 15, canvas.height - 65, 30, 20);
    context.fillStyle = '#FFFFFF';
    context.font = '10px Arial';
    context.textAlign = 'center';
    context.fillText('🚀', canvas.width / 2, canvas.height - 48);
}

/**
 * Draw flight trajectory on the canvas.
 */
function drawFlightVisualization(viz, simResult, timeRatio, windData) {
    if (!viz?.ctx || !canvas) {
        console.error('❌ Visualizer not initialized!');
        return;
    }
    
    const context = viz.ctx;
    
    // Clear and redraw background
    drawBackground(viz);
    
    // Extract trajectory data
    let trajectory = [];
    let statistics = {};
    
    if (simResult && simResult.trajectory) {
        // Direct trajectory array
        trajectory = simResult.trajectory;
        statistics = simResult.statistics || {};
    } else if (simResult && simResult.data && simResult.data.trajectory) {
        // Wrapped in data object
        trajectory = simResult.data.trajectory;
        statistics = simResult.data.statistics || {};
    } else {
        console.warn('⚠️ No valid trajectory data to draw');
        return;
    }
    
    if (trajectory.length === 0) {
        console.warn('⚠️ Empty trajectory data');
        return;
    }
    
    // Calculate scales
    const maxX = Math.max(...trajectory.map(p => p.x || 0), 100);
    const maxHeight = Math.max(...trajectory.map(p => p.altitude || 0), 100);
    
    const scaleX = (canvas.width - 80) / Math.max(maxX, 100);
    const scaleY = (canvas.height - 70) / Math.max(maxHeight, 100);
    
    // Draw trajectory path
    context.strokeStyle = '#E91E63';
    context.lineWidth = 2;
    context.beginPath();
    
    let firstPoint = true;
    for (const point of trajectory) {
        const x = canvas.width / 2 + (point.x || 0) * scaleX * (timeRatio || 1);
        const y = canvas.height - 60 - (point.altitude || 0) * scaleY * (timeRatio || 1);
        
        if (firstPoint) {
            context.moveTo(x, y);
            firstPoint = false;
        } else {
            context.lineTo(x, y);
        }
    }
    
    // Clip to time ratio
    const maxIndex = Math.floor(trajectory.length * (timeRatio || 0));
    if (maxIndex > 0 && trajectory.length > maxIndex) {
        const lastX = canvas.width / 2 + (trajectory[maxIndex].x || 0) * scaleX;
        const lastY = canvas.height - 60 - (trajectory[maxIndex].altitude || 0) * scaleY;
        
        context.beginPath();
        context.moveTo(canvas.width / 2, canvas.height - 60);
        
        let first = true;
        for (let i = 0; i <= maxIndex; i++) {
            const point = trajectory[i];
            const x = canvas.width / 2 + (point.x || 0) * scaleX;
            const y = canvas.height - 60 - (point.altitude || 0) * scaleY;
            
            if (first) {
                context.lineTo(x, y);
                first = false;
            } else {
                context.lineTo(x, y);
            }
        }
        
        // Draw gradient fill under trajectory
        const gradient = context.createLinearGradient(0, canvas.height - 60, 0, canvas.height);
        gradient.addColorStop(0, 'rgba(233, 30, 99, 0.5)');
        gradient.addColorStop(1, 'rgba(233, 30, 99, 0.1)');
        
        context.strokeStyle = '#E91E63';
        context.lineWidth = 3;
        context.stroke();
    }
    
    // Draw current position indicator
    if (trajectory.length > 0 && timeRatio > 0) {
        const currentIndex = Math.floor(trajectory.length * Math.min(timeRatio, 1));
        const point = trajectory[Math.min(currentIndex, trajectory.length - 1)];
        
        const x = canvas.width / 2 + (point.x || 0) * scaleX;
        const y = canvas.height - 60 - (point.altitude || 0) * scaleY;
        
        context.fillStyle = '#FFD700';
        context.beginPath();
        context.arc(x, y, 8, 0, Math.PI * 2);
        context.fill();
        context.strokeStyle = '#FFFFFF';
        context.lineWidth = 2;
        context.stroke();
    }
    
    // Draw wind drift indicator if available
    if (windData && windData.drift > 10) {
        const driftX = canvas.width / 2 + windData.drift * scaleX;
        
        context.strokeStyle = 'rgba(33, 150, 243, 0.6)';
        context.lineWidth = 2;
        context.setLineDash([5, 5]);
        context.beginPath();
        context.moveTo(canvas.width / 2, canvas.height - 60);
        context.lineTo(driftX, canvas.height - 60);
        context.stroke();
        context.setLineDash([]);
        
        context.fillStyle = '#1976D2';
        context.font = '12px Arial';
        context.textAlign = 'center';
        context.fillText(`💨 ${windData.drift.toFixed(0)}ft drift`, (canvas.width / 2 + driftX) / 2, canvas.height - 45);
    }
    
    // Draw axes
    context.strokeStyle = '#666';
    context.lineWidth = 1;
    
    // Altitude axis
    context.beginPath();
    context.moveTo(canvas.width / 2, canvas.height - 60);
    context.lineTo(canvas.width / 2, 20);
    context.stroke();
    
    // Ground line
    context.beginPath();
    context.moveTo(canvas.width / 2, canvas.height - 60);
    context.lineTo(canvas.width - 20, canvas.height - 60);
    context.stroke();
    
    // Axis labels
    context.fillStyle = '#333';
    context.font = 'bold 14px Arial';
    context.textAlign = 'center';
    context.fillText('Altitude (m)', canvas.width / 2, 35);
    
    context.font = '12px Arial';
    context.fillText('Downrange Distance (m)', canvas.width - 20, canvas.height - 45);
    
    // Legend
    drawLegend(viz);
}

/**
 * Draw visualization legend.
 */
function drawLegend(viz) {
    const context = viz?.ctx || ctx;
    if (!context) return;
    
    const legendY = 30;
    const items = [
        { color: '#E91E63', label: 'Trajectory Path' },
        { color: '#FFD700', label: 'Current Position' },
        { color: 'rgba(33, 150, 243, 0.6)', label: 'Wind Drift' }
    ];
    
    items.forEach((item, i) => {
        const legendX = 20;
        const spacing = 25;
        
        context.fillStyle = item.color;
        context.fillRect(legendX + 10, legendY + i * spacing - 8, 16, 16);
        
        context.strokeStyle = '#333';
        context.lineWidth = 1;
        context.strokeRect(legendX + 10, legendY + i * spacing - 8, 16, 16);
        
        context.fillStyle = '#333';
        context.font = '12px Arial';
        context.textAlign = 'left';
        context.fillText(item.label, legendX + 32, legendY + i * spacing + 4);
    });
}

/**
 * Display flight statistics in the UI.
 */
function displayStatistics(statistics) {
    const statsDiv = document.getElementById('flight-stats');
    if (!statsDiv) {
        console.error('❌ Stats div not found!');
        return;
    }
    
    if (Object.keys(statistics).length === 0) {
        console.warn('⚠️ No statistics to display');
        statsDiv.innerHTML = '<p>No flight data available</p>';
        return;
    }
    
    const stats = [
        { label: 'Peak Altitude', value: `${statistics.peakAltitudeFeet?.toFixed(0) || 0} ft`, icon: '⛰️' },
        { label: 'Flight Time', value: `${statistics.totalFlightTime?.toFixed(1) || 0}s`, icon: '⏱️' },
        { label: 'Max Velocity', value: `${statistics.maxVelocity?.toFixed(1) || 0} m/s`, icon: '📈' },
        { label: 'Downrange', value: `${statistics.downrangeFeet?.toFixed(0) || 0} ft`, icon: '🧭' }
    ];
    
    statsDiv.innerHTML = stats.map(stat => `
        <div class="stat-box" data-stat="${stat.label.toLowerCase().replace(/\s+/g, '-')}">
            <h4>${stat.icon} ${stat.label}</h4>
            <span>${stat.value}</span>
            <small>Click to see the equation</small>
        </div>
    `).join('');
    
    // Add click handlers for equations
    statsDiv.querySelectorAll('.stat-box').forEach(box => {
        box.addEventListener('click', () => {
            const statType = box.dataset.stat;
            showEquation(statType);
        });
    });
}

/**
 * Display flight events in the UI.
 */
function displayFlightEvents(trajectory, windData) {
    const eventsList = document.getElementById('flight-events-list');
    if (!eventsList || !trajectory) return;
    
    let html = '';
    
    // Find key events
    let apogeeIndex = 0;
    trajectory.forEach((point, idx) => {
        if (point.altitude > trajectory[apogeeIndex]?.altitude) {
            apogeeIndex = idx;
        }
    });
    
    const burnoutTime = trajectory.find(p => p.thrust <= 0.1)?.time || 0;
    const apogeeTime = trajectory[apogeeIndex]?.time || 0;
    const chuteDeployTime = Math.min(apogeeTime + 2, trajectory[trajectory.length - 1].time) || 0;
    
    // Launch
    html += `<li>🚀 <strong>Liftoff:</strong> ${trajectory[0]?.time?.toFixed(1) || 0}s</li>`;
    
    // Burnout
    if (burnoutTime > 0) {
        html += `<li>🔥 <strong>Burnout:</strong> ${burnoutTime.toFixed(1)}s (${((burnoutTime / trajectory[trajectory.length-1]?.time) * 100).toFixed(0)}% of flight)</li>`;
    }
    
    // Apogee
    if (apogeeTime > 0) {
        html += `<li>⛰️ <strong>Apogee:</strong> ${apogeeTime.toFixed(1)}s at ${trajectory[apogeeIndex]?.altitude?.toFixed(0) || 0}m</li>`;
    }
    
    // Chute Deploy
    if (chuteDeployTime > 0) {
        html += `<li>🪂 <strong>Chute Deploy:</strong> ${chuteDeployTime.toFixed(1)}s</li>`;
    }
    
    // Landing
    const totalTime = trajectory[trajectory.length - 1]?.time || 0;
    if (totalTime > 0) {
        html += `<li>📍 <strong>Landing:</strong> ${totalTime.toFixed(1)}s</li>`;
    }
    
    // Wind effect
    if (windData && windData.speed > 2) {
        html += `<li>💨 <strong>Wind Effect:</strong> +${windData.drift?.toFixed(0) || 'N/A'}ft drift</li>`;
    }
    
    eventsList.innerHTML = html;
}

/**
 * Display teaching content.
 */
function displayTeachingContent(teachingContent) {
    const contentDiv = document.getElementById('teaching-content');
    if (!contentDiv || !teachingContent) return;
    
    contentDiv.innerHTML = teachingContent.map(item => `
        <div class="phase-explanation">
            <h4>${item.title}</h4>
            <p>${item.text}</p>
        </div>
    `).join('');
}

/**
 * Start animation loop.
 */
function startAnimation(viz) {
    if (!viz?.ctx || !canvas) return;
    
    viz.isPlaying = true;
    viz.lastTime = Date.now();
    
    animate(viz);
}

/**
 * Stop animation loop.
 */
function stopAnimation(viz) {
    if (!viz) return;
    
    viz.isPlaying = false;
    if (viz.animationId) {
        cancelAnimationFrame(viz.animationId);
        viz.animationId = null;
    }
}

/**
 * Animation function.
 */
function animate(viz) {
    if (!viz?.ctx || !canvas || !viz.isPlaying) return;
    
    // Update time
    const now = Date.now();
    const deltaTime = (now - viz.lastTime) / 1000; // seconds
    
    viz.currentTime += deltaTime;
    
    // Loop animation
    if (viz.currentTime >= viz.totalTime) {
        viz.currentTime = 0;
    }
    
    viz.lastTime = now;
    
    // Update time scrubber display
    const timeDisplay = document.getElementById('current-time');
    if (timeDisplay) {
        timeDisplay.textContent = `${viz.currentTime.toFixed(1)}s`;
    }
    
    // Redraw with current time ratio
    if (viz.simulationResult && viz.scale) {
        const timeRatio = Math.min(viz.currentTime / viz.totalTime, 1.0);
        drawFlightVisualization(viz, viz.simulationResult, timeRatio, viz.windData);
    }
    
    viz.animationId = requestAnimationFrame(() => animate(viz));
}

/**
 * Play/Pause button handler.
 */
function togglePlayback(viz) {
    if (!viz) return;
    
    const btn = document.getElementById('play-pause-btn');
    if (!btn) return;
    
    if (viz.isPlaying) {
        stopAnimation(viz);
        btn.textContent = '▶️ Play';
    } else {
        startAnimation(viz);
        btn.textContent = '⏸ Pause';
    }
}

/**
 * Reset playback.
 */
function resetPlayback(viz) {
    if (!viz) return;
    
    stopAnimation(viz);
    viz.currentTime = 0;
    
    const btn = document.getElementById('play-pause-btn');
    if (btn) btn.textContent = '▶️ Play';
    
    // Redraw with full trajectory
    if (viz.simulationResult && viz.scale) {
        drawFlightVisualization(viz, viz.simulationResult, 1.0, viz.windData);
    }
}

/**
 * Update playback time from scrubber.
 */
function updateTimeFromScrubber(viz) {
    const scrubber = document.getElementById('time-scrubber');
    if (!scrubber || !viz) return;
    
    const ratio = parseFloat(scrubber.value) / 100;
    
    // Redraw with selected time
    if (viz.simulationResult && viz.scale) {
        drawFlightVisualization(viz, viz.simulationResult, ratio, viz.windData);
        
        // Update time display
        const totalTime = viz.simulationResult.trajectory?.[viz.simulationResult.trajectory.length - 1]?.time || 0;
        viz.currentTime = ratio * totalTime;
        
        const timeDisplay = document.getElementById('current-time');
        if (timeDisplay) {
            timeDisplay.textContent = `${viz.currentTime.toFixed(1)}s`;
        }
    }
}

// Export to global window object for browser use
if (typeof window !== 'undefined') {
    window.Visualizer = {
        initializeVisualizer,
        drawFlightVisualization,
        displayStatistics,
        displayTeachingContent,
        displayFlightEvents,
        togglePlayback,
        resetPlayback,
        updateTimeFromScrubber,
        
        // Backward compatibility
        drawBackground,
        getTickInterval: () => 100,
        maxAltitudePixels: (alt) => alt * 0.1,
        maxHorizontalPixels: (dist) => dist * 0.1
    };
}

// Also export for Node.js/module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.Visualizer || {
        initializeVisualizer,
        drawFlightVisualization,
        displayStatistics,
        displayTeachingContent,
        displayFlightEvents,
        togglePlayback,
        resetPlayback,
        updateTimeFromScrubber,
        
        // Backward compatibility
        drawBackground,
        getTickInterval: () => 100,
        maxAltitudePixels: (alt) => alt * 0.1,
        maxHorizontalPixels: (dist) => dist * 0.1
    };
}