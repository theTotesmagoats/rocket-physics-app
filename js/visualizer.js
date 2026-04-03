// ============================================
// VISUALIZER.JS - Flight Path Visualization
// Draws everything on canvas - can be completely swapped out
// ============================================

/**
 * Initialize the visualization system.
 */
function initializeVisualizer() {
    const canvas = document.getElementById('flight-canvas');
    if (!canvas) {
        console.error('❌ Canvas element not found!');
        return null;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('❌ Canvas context (2d) not available!');
        return null;
    }
    
    const viz = {
        canvas,
        ctx,
        width: canvas.width,
        height: canvas.height
    };
    
    console.log('🎨 Visualizer initialized:', viz);
    
    // Draw initial background
    drawBackground(viz);
    
    return viz;
}

/**
 * Draw the complete flight visualization.
 */
function drawFlightVisualization(viz, simulationResult) {
    if (!viz || !simulationResult) {
        console.error('❌ Visualization failed - missing viz or result');
        return;
    }
    
    const { ctx, width, height } = viz;
    const { trajectory, statistics } = simulationResult;
    
    console.log('📊 Drawing visualization with', trajectory.length, 'trajectory points');
    if (trajectory.length > 0) {
        console.log('   First point:', trajectory[0]);
        console.log('   Last point:', trajectory[trajectory.length - 1]);
    }
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Calculate max values for dynamic scaling
    let maxAltitude = 0;
    let maxHorizontal = 0;
    trajectory.forEach(point => {
        maxAltitude = Math.max(maxAltitude, point.altitude);
        const horizontalDist = Math.sqrt(point.horizontalX**2 + point.horizontalY**2);
        maxHorizontal = Math.max(maxHorizontal, horizontalDist);
    });
    
    // Convert to feet for axis labeling
    const maxAltFeet = maxAltitude / PHYSICS_CONSTANTS.FEET_TO_METERS;
    const maxHorizontalFeet = maxHorizontal / PHYSICS_CONSTANTS.FEET_TO_METERS;
    
    console.log('📏 Max altitude:', maxAltFeet.toFixed(0), 'ft, Max horizontal:', maxHorizontalFeet.toFixed(0), 'ft');
    
    // Draw background with dynamic axes
    drawBackground(viz, maxAltitude, maxHorizontal);
    
    // Calculate scaling
    const scale = calculateScale(trajectory, width, height);
    
    // Draw trajectory
    drawTrajectoryPath(viz, trajectory, scale);
    
    // Draw key points
    drawKeyPoints(viz, trajectory, statistics, scale);
    
    // Draw ground and launch point
    drawGroundElements(viz, scale);
    
    // Draw legend
    drawLegend(viz);
}

/**
 * Helper to calculate appropriate tick interval based on max value.
 */
function getTickInterval(maxValue) {
    if (maxValue <= 100) return 25;
    if (maxValue <= 250) return 50;
    if (maxValue <= 500) return 100;
    if (maxValue <= 1000) return 200;
    if (maxValue <= 2000) return 500;
    return 1000; // For very high flights
}

/**
 * Draw axes with labeled tick marks showing measurements in feet.
 */
function drawDynamicAxes(viz, scale, maxAltFeet, maxHorizontalFeet) {
    const { ctx, width, height } = viz;
    
    // Constants for axis drawing
    const axisLabelOffset = 20;
    const tickLength = 8;
    const padding = 50;
    
    // Y-axis (altitude)
    const yAxisX = padding; // Left side
    const yAxisBottom = height - padding;
    const yAxisTop = padding;
    
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px Arial';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    
    // Draw Y-axis line
    ctx.beginPath();
    ctx.moveTo(yAxisX, yAxisTop);
    ctx.lineTo(yAxisX, yAxisBottom);
    ctx.stroke();
    
    // Calculate tick interval for altitude
    const altTickInterval = getTickInterval(maxAltFeet);
    const numAltTicks = Math.ceil(maxAltFeet / altTickInterval);
    
    // Draw Y-axis ticks and labels (feet)
    for (let i = 0; i <= numAltTicks; i++) {
        const feetValue = i * altTickInterval;
        // Convert feet to meters then apply scale
        const metersValue = feetValue * PHYSICS_CONSTANTS.FEET_TO_METERS;
        const yPos = scale.offsetY - metersValue * scale.y;
        
        if (yPos >= yAxisTop) {
            // Draw tick mark
            ctx.beginPath();
            ctx.moveTo(yAxisX, yPos);
            ctx.lineTo(yAxisX + tickLength, yPos);
            ctx.stroke();
            
            // Draw label
            ctx.fillText(feetValue.toFixed(0), yAxisX - 5, yPos);
        }
    }
    
    // Y-axis title
    ctx.save();
    ctx.translate(yAxisX - 30, (yAxisTop + yAxisBottom) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('Altitude (ft)', 0, 0);
    ctx.restore();
    
    // X-axis (horizontal distance)
    const xAxisY = height - padding; // Bottom
    const xAxisLeft = padding;
    const xAxisRight = width - padding;
    
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    // Draw X-axis line
    ctx.beginPath();
    ctx.moveTo(xAxisLeft, xAxisY);
    ctx.lineTo(xAxisRight, xAxisY);
    ctx.stroke();
    
    // Calculate tick interval for horizontal distance
    const horizTickInterval = getTickInterval(maxHorizontalFeet);
    const numHorizTicks = Math.ceil(maxHorizontalFeet / horizTickInterval);
    
    // Draw X-axis ticks and labels (feet)
    for (let i = 0; i <= numHorizTicks; i++) {
        const feetValue = i * horizTickInterval;
        // Convert feet to meters then apply scale
        const metersValue = feetValue * PHYSICS_CONSTANTS.FEET_TO_METERS;
        const xPos = scale.offsetX + metersValue * scale.x;
        
        if (xPos <= xAxisRight) {
            // Draw tick mark
            ctx.beginPath();
            ctx.moveTo(xPos, xAxisY);
            ctx.lineTo(xPos, xAxisY - tickLength);
            ctx.stroke();
            
            // Draw label
            ctx.fillText(feetValue.toFixed(0), xPos, xAxisY + 5);
        }
    }
    
    // X-axis title
    ctx.textAlign = 'center';
    ctx.fillText('Distance from Launch (ft)', (xAxisLeft + xAxisRight) / 2, xAxisY + 30);
}

/**
 * Draw the complete flight visualization.
 */
function drawBackground(viz, maxAltitudeMeters = null, maxHorizontalMeters = null) {
    const { ctx, width, height } = viz;
    
    // Sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#0a0a1a');
    gradient.addColorStop(0.5, '#1a1a3e');
    gradient.addColorStop(1, '#2d4a3e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines (altitude) - every 100 pixels for visual reference
    for (let y = 0; y < height; y += 100) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
    
    // Vertical grid lines - every 100 pixels for visual reference
    for (let x = 0; x < width; x += 100) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }
    
    // Draw dynamic axes with labeled tick marks in feet
    if (maxAltitudeMeters !== null && maxHorizontalMeters !== null) {
        const maxAltFeet = maxAltitudeMeters / PHYSICS_CONSTANTS.FEET_TO_METERS;
        const maxHorizontalFeet = maxHorizontalMeters / PHYSICS_CONSTANTS.FEET_TO_METERS;
        
        drawDynamicAxes(viz, { x: 1, y: 1, offsetX: 50, offsetY: height - 50 }, maxAltFeet, maxHorizontalFeet);
    }
}

/**
 * Calculate appropriate scaling for the visualization.
 */
function calculateScale(trajectory, width, height) {
    if (trajectory.length === 0) {
        console.warn('⚠️ Empty trajectory - no data to scale');
        return { x: 1, y: 1, offsetX: 0, offsetY: 0 };
    }
    
    // Find bounds
    let maxAltitude = 0;
    let minX = 0, maxX = 0;
    let minY = 0, maxY = 0;
    
    trajectory.forEach(point => {
        maxAltitude = Math.max(maxAltitude, point.altitude);
        minX = Math.min(minX, point.horizontalX);
        maxX = Math.max(maxX, point.horizontalX);
        minY = Math.min(minY, point.horizontalY);
        maxY = Math.max(maxY, point.horizontalY);
    });
    
    console.log('📏 Scale bounds - altitude:', maxAltitude.toFixed(2), 'm');
    
    // Add padding
    const padding = 50;
    const usableWidth = width - 2 * padding;
    const usableHeight = height - 2 * padding;
    
    // Calculate scales (use different scale for altitude vs horizontal)
    const yScale = usableHeight / Math.max(maxAltitude, 1);
    const xRange = maxX - minX;
    const yRange = maxY - minY;
    const maxHorizontal = Math.max(xRange, yRange, 1);
    const xScale = usableWidth / (maxHorizontal * 2);  // Horizontal compressed
    
    return {
        x: xScale,
        y: yScale,
        offsetX: padding - minX * xScale,
        offsetY: height - padding
    };
}

/**
 * Draw the flight path.
 */
function drawTrajectoryPath(viz, trajectory, scale) {
    const { ctx } = viz;
    
    if (trajectory.length < 2) {
        console.warn('⚠️ Trajectory too short to draw:', trajectory.length);
        return;
    }
    
    // Find apogee index
    let apogeeIndex = 0;
    trajectory.forEach((point, idx) => {
        if (point.altitude > trajectory[apogeeIndex].altitude) {
            apogeeIndex = idx;
        }
    });
    
    console.log('📈 Apogee at index', apogeeIndex, 'time:', trajectory[apogeeIndex]?.time.toFixed(2));
    
    // Draw ascent path (green)
    ctx.beginPath();
    ctx.strokeStyle = '#4ecdc4';
    ctx.lineWidth = 3;
    
    for (let i = 0; i <= apogeeIndex; i++) {
        const point = trajectory[i];
        const x = scale.offsetX + point.horizontalX * scale.x;
        const y = scale.offsetY - point.altitude * scale.y;
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.stroke();
    
    // Draw descent path (orange)
    ctx.beginPath();
    ctx.strokeStyle = '#ffc107';
    ctx.lineWidth = 3;
    
    for (let i = apogeeIndex; i < trajectory.length; i++) {
        const point = trajectory[i];
        const x = scale.offsetX + point.horizontalX * scale.x;
        const y = scale.offsetY - point.altitude * scale.y;
        
        if (i === apogeeIndex) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.stroke();
}

/**
 * Draw key points on the trajectory.
 */
function drawKeyPoints(viz, trajectory, statistics, scale) {
    const { ctx } = viz;
    
    // Find apogee point
    let apogeePoint = trajectory[0];
    trajectory.forEach(point => {
        if (point.altitude > apogeePoint.altitude) {
            apogeePoint = point;
        }
    });
    
    const landingPoint = trajectory[trajectory.length - 1];
    
    // Draw launch point
    drawPoint(viz, scale.offsetX, scale.offsetY, '#ff6b6b', '🚀');
    
    // Draw apogee
    const apogeeX = scale.offsetX + apogeePoint.horizontalX * scale.x;
    const apogeeY = scale.offsetY - apogeePoint.altitude * scale.y;
    drawPoint(viz, apogeeX, apogeeY, '#ffc107', '⛰️');
    
    // Draw landing point
    const landingX = scale.offsetX + landingPoint.horizontalX * scale.x;
    const landingY = scale.offsetY - landingPoint.altitude * scale.y;
    drawPoint(viz, landingX, landingY, '#4ecdc4', '🪂');
}

/**
 * Draw a labeled point.
 */
function drawPoint(viz, x, y, color, icon) {
    const { ctx } = viz;
    
    // Draw circle
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw icon
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(icon, x, y - 10);
}

/**
 * Draw ground elements.
 */
function drawGroundElements(viz, scale) {
    const { ctx, width, height } = viz;
    
    // Ground line
    ctx.beginPath();
    ctx.moveTo(0, scale.offsetY);
    ctx.lineTo(width, scale.offsetY);
    ctx.strokeStyle = '#4a7c4a';
    ctx.lineWidth = 3;
    ctx.stroke();
}

/**
 * Draw legend.
 */
function drawLegend(viz) {
    const { ctx } = viz;
    
    const legendY = 20;
    const legendX = viz.width - 150;
    
    // Legend background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(legendX - 10, legendY - 10, 140, 80);
    
    // Legend items
    const legends = [
        { color: '#ff6b6b', text: 'Launch' },
        { color: '#ffc107', text: 'Apogee' },
        { color: '#4ecdc4', text: 'Landing' }
    ];
    
    legends.forEach((item, idx) => {
        ctx.beginPath();
        ctx.arc(legendX, legendY + idx * 20, 5, 0, Math.PI * 2);
        ctx.fillStyle = item.color;
        ctx.fill();
        
        ctx.fillStyle = '#fff';
        ctx.font = '11px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(item.text, legendX + 10, legendY + idx * 20 + 4);
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
        { label: 'Peak Altitude', value: `${statistics.peakAltitudeFeet.toFixed(0)} ft`, icon: '⛰️' },
        { label: 'Flight Time', value: `${statistics.totalFlightTime.toFixed(1)}s`, icon: '⏱️' },
        { label: 'Max Velocity', value: `${statistics.maxVelocity.toFixed(1)} m/s`, icon: '📈' },
        { label: 'Downrange', value: `${statistics.downrangeFeet.toFixed(0)} ft`, icon: '📏' }
    ];
    
    statsDiv.innerHTML = stats.map(stat => `
        <div class="stat-item">
            <div class="stat-label">${stat.icon} ${stat.label}</div>
            <div class="stat-value">${stat.value}</div>
        </div>
    `).join('');
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

// Export to global window object for browser use
if (typeof window !== 'undefined') {
    window.Visualizer = {
        initializeVisualizer,
        drawFlightVisualization,
        displayStatistics,
        displayTeachingContent,
        drawBackground,
        getTickInterval,
        drawDynamicAxes
    };
}

// Also export for Node.js/module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.Visualizer || {
        initializeVisualizer,
        drawFlightVisualization,
        displayStatistics,
        displayTeachingContent,
        drawBackground,
        getTickInterval,
        drawDynamicAxes
    };
}
