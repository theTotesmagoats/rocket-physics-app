// ============================================
// VISUALIZER.JS - Flight Path Visualization
// Draws everything on canvas - can be completely swapped out
// Modern scene-based rendering with animation support
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
    
    // Get actual display dimensions
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width || 900;
    canvas.height = rect.height || 600;
    
    const viz = {
        canvas,
        ctx,
        width: canvas.width,
        height: canvas.height,
        animationId: null,
        isPlaying: false,
        currentTime: 0,
        totalTime: 100, // Default total time for scrubbing
        simulationResult: null,
        windData: null,
        particles: [], // For wind visualization
        lastTime: 0
    };
    
    console.log('🎨 Visualizer initialized:', viz);
    
    // Initialize particles for wind visualization
    initParticles(viz);
    
    return viz;
}

/**
 * Initialize wind particles for visualization.
 */
function initParticles(viz) {
    viz.particles = [];
    const numParticles = 20;
    
    for (let i = 0; i < numParticles; i++) {
        viz.particles.push({
            x: Math.random() * viz.width,
            y: Math.random() * (viz.height - 150), // Keep above ground
            z: Math.random(), // "Altitude" layer for parallax
            speed: 0.5 + Math.random() * 1.5,
            length: 20 + Math.random() * 40,
            alpha: 0.3 + Math.random() * 0.4
        });
    }
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
 * Helper to estimate max pixels for Y-axis based on altitude in feet.
 */
function maxAltitudePixels(maxAltFeet, yScale) {
    const meters = maxAltFeet * PHYSICS_CONSTANTS.FEET_TO_METERS;
    return meters * yScale;
}

/**
 * Helper to estimate max pixels for X-axis based on distance in feet.
 */
function maxHorizontalPixels(maxHorizFeet, xScale) {
    const meters = maxHorizFeet * PHYSICS_CONSTANTS.FEET_TO_METERS;
    return meters * xScale;
}

/**
 * Draw the complete flight visualization with animation support.
 */
function drawFlightVisualization(viz, simulationResult, timeRatio = 1.0, windData = null) {
    if (!viz || !simulationResult) {
        console.error('❌ Visualization failed - missing viz or result');
        return;
    }
    
    const { ctx, width, height } = viz;
    const { trajectory, statistics } = simulationResult;
    
    // Store current state
    viz.simulationResult = simulationResult;
    viz.windData = windData || {};
    
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
    
    // Calculate scaling first
    const scale = calculateScale(trajectory, width, height);
    
    // Store scale for later use in animation
    viz.scale = scale;
    
    // Draw sky background with gradient
    drawSkyBackground(viz);
    
    // Draw clouds (parallax effect)
    drawClouds(viz);
    
    // Draw terrain silhouette
    drawTerrainSilhouette(viz, width, height);
    
    // Draw launch rail/pad
    drawLaunchStructure(viz, scale);
    
    // Draw ground line with elevation
    drawGroundLine(viz, scale, maxAltFeet);
    
    // Calculate current trajectory point based on time ratio
    let currentIndex = Math.min(Math.floor(trajectory.length * timeRatio), trajectory.length - 1);
    viz.currentPointIndex = currentIndex;
    
    // Draw partial or full trajectory based on time
    drawTrajectoryPath(viz, trajectory, scale, currentIndex);
    
    // Draw key points (launch, apogee, landing)
    drawKeyPoints(viz, trajectory, statistics, scale);
    
    // Draw current rocket position if we have one
    if (currentIndex >= 0 && currentIndex < trajectory.length) {
        const point = trajectory[currentIndex];
        drawRocketSprite(viz, point, scale, viz.windData);
    }
    
    // Draw wind visualization
    drawWindVisualization(viz, scale, viz.windData);
    
    // Draw uncertainty ellipse for landing prediction
    if (viz.windData && viz.windData.uncertainty) {
        drawLandingUncertainty(viz, trajectory[trajectory.length - 1], viz.windData.uncertainty, scale);
    }
    
    // Draw scale markers and labels
    drawScaleMarkers(viz, scale, maxAltFeet, maxHorizontalFeet);
    
    // Draw flight event markers
    drawFlightEvents(viz, trajectory, scale);
}

/**
 * Draw sky background with gradient.
 */
function drawSkyBackground(viz) {
    const { ctx, width, height } = viz;
    
    // Sky gradient - educational aesthetic (dawn/dusk colors)
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#87CEEB');   // Sky blue
    gradient.addColorStop(0.4, '#E0F7FA'); // Light cyan
    gradient.addColorStop(1, '#B0E0E6');   // Powder blue
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Add subtle atmospheric haze at horizon
    const horizonGradient = ctx.createLinearGradient(0, height * 0.3, 0, height * 0.4);
    horizonGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
    horizonGradient.addColorStop(1, 'rgba(255, 255, 255, 0.3)');
    
    ctx.fillStyle = horizonGradient;
    ctx.fillRect(0, height * 0.3, width, height * 0.1);
}

/**
 * Draw clouds with parallax effect.
 */
function drawClouds(viz) {
    const { ctx } = viz;
    
    // Update particle positions for animation
    if (viz.isPlaying && viz.particles) {
        const now = Date.now();
        const deltaTime = (now - (viz.lastTime || now)) / 1000;
        viz.lastTime = now;
        
        viz.particles.forEach((particle, i) => {
            // Move particles based on wind speed and parallax effect
            particle.x += particle.speed * (0.5 + particle.z * 0.5);
            
            if (particle.x > viz.width + 50) {
                particle.x = -50;
                particle.y = Math.random() * (viz.height - 150);
                particle.z = Math.random();
            }
        });
    } else if (viz.particles) {
        // Just draw current positions
    }
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    
    viz.particles.forEach((particle, i) => {
        const cloudSize = 30 + particle.z * 40;
        
        // Draw simple cloud shape using circles
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, cloudSize * 0.6, 0, Math.PI * 2);
        ctx.arc(particle.x + cloudSize * 0.5, particle.y - cloudSize * 0.3, cloudSize * 0.7, 0, Math.PI * 2);
        ctx.arc(particle.x + cloudSize * 1.0, particle.y, cloudSize * 0.6, 0, Math.PI * 2);
        ctx.fill();
    });
}

/**
 * Draw terrain silhouette.
 */
function drawTerrainSilhouette(viz, width, height) {
    const { ctx } = viz;
    
    // Create terrain profile
    ctx.fillStyle = '#5D6D7E'; // Slate gray
    
    ctx.beginPath();
    ctx.moveTo(0, height);
    
    // Draw gentle rolling hills
    for (let x = 0; x <= width; x += 20) {
        const y = height - 120 + Math.sin(x * 0.01) * 30 + Math.cos(x * 0.03) * 20;
        ctx.lineTo(x, y);
    }
    
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();
}

/**
 * Draw launch rail/pad structure.
 */
function drawLaunchStructure(viz, scale) {
    const { ctx } = viz;
    
    // Calculate launch position based on scale
    const launchX = scale.offsetX;
    const groundY = scale.offsetY;
    
    // Draw launch rail (angled slightly for visual interest)
    ctx.strokeStyle = '#34495E';
    ctx.lineWidth = 6;
    
    ctx.beginPath();
    ctx.moveTo(launchX - 20, groundY);
    ctx.lineTo(launchX + 10, groundY - 40); // Slight upward angle
    ctx.stroke();
    
    // Draw launch pad base
    ctx.fillStyle = '#7F8C8D';
    ctx.fillRect(launchX - 35, groundY - 10, 70, 20);
    
    // Draw simple rocket stand
    ctx.strokeStyle = '#2C3E50';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(launchX + 10, groundY - 40);
    ctx.lineTo(launchX + 10, groundY - 70); // Stand post
    ctx.stroke();
    
    // Draw "LAUNCH" label
    ctx.fillStyle = '#E74C3C';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('LAUNCH', launchX, groundY + 25);
}

/**
 * Draw ground line with elevation.
 */
function drawGroundLine(viz, scale, maxAltFeet) {
    const { ctx } = viz;
    
    const groundY = scale.offsetY;
    const width = viz.width;
    
    // Main ground line
    ctx.strokeStyle = '#34495E';
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(width, groundY);
    ctx.stroke();
    
    // Ground elevation markers
    const spacing = 100;
    for (let x = scale.offsetX; x < width; x += spacing) {
        ctx.strokeStyle = '#7F8C8D';
        ctx.lineWidth = 1;
        
        ctx.beginPath();
        ctx.moveTo(x, groundY);
        ctx.lineTo(x, groundY + 5);
        ctx.stroke();
    }
}

/**
 * Draw sky and ground elements.
 */
function drawBackground(viz, maxAltitudeMeters = null, maxHorizontalMeters = null, scale = null) {
    // This is now handled by the new scene-based approach
    // Kept for backward compatibility but not used in modern rendering
    
    const { ctx, width, height } = viz;
    
    // Draw sky gradient (simplified version)
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#B0E0E6');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Draw ground line
    if (scale) {
        ctx.strokeStyle = '#34495E';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.moveTo(0, scale.offsetY);
        ctx.lineTo(width, scale.offsetY);
        ctx.stroke();
    }
}

/**
 * Calculate appropriate scaling for the visualization.
 */
function calculateScale(trajectory, width, height) {
    if (trajectory.length === 0) {
        console.warn('⚠️ Empty trajectory - no data to scale');
        return { x: 1, y: 1, offsetX: 50, offsetY: height - 150 };
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
    const padding = 80;
    const usableWidth = width - 2 * padding;
    const usableHeight = height - 2 * padding - 100; // Extra space for ground
    
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
        offsetY: height - padding - 80
    };
}

/**
 * Draw the flight path with animation support.
 */
function drawTrajectoryPath(viz, trajectory, scale, maxIndex = null) {
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
    
    // Limit drawing to current time if in animation
    const drawLimit = maxIndex !== null ? Math.min(maxIndex, trajectory.length - 1) : trajectory.length - 1;
    
    // Draw ascent path (soft blue)
    ctx.beginPath();
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    let firstPoint = true;
    for (let i = 0; i <= Math.min(apogeeIndex, drawLimit); i++) {
        const point = trajectory[i];
        const x = scale.offsetX + point.horizontalX * scale.x;
        const y = scale.offsetY - point.altitude * scale.y;
        
        if (firstPoint) {
            ctx.moveTo(x, y);
            firstPoint = false;
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.stroke();
    
    // Draw descent path (soft orange)
    if (drawLimit > apogeeIndex) {
        const startIdx = Math.max(apogeeIndex, maxIndex !== null ? 0 : apogeeIndex);
        
        ctx.beginPath();
        ctx.strokeStyle = '#e67e22';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        for (let i = startIdx; i <= drawLimit; i++) {
            const point = trajectory[i];
            const x = scale.offsetX + point.horizontalX * scale.x;
            const y = scale.offsetY - point.altitude * scale.y;
            
            if (i === startIdx) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
    }
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
    drawMarker(viz, scale.offsetX, scale.offsetY, '#3498db', 'Launch');
    
    // Draw apogee
    const apogeeX = scale.offsetX + apogeePoint.horizontalX * scale.x;
    const apogeeY = scale.offsetY - apogeePoint.altitude * scale.y;
    drawMarker(viz, apogeeX, apogeeY, '#e67e22', 'Apogee');
    
    // Draw landing point
    const landingX = scale.offsetX + landingPoint.horizontalX * scale.x;
    const landingY = scale.offsetY - landingPoint.altitude * scale.y;
    drawMarker(viz, landingX, landingY, '#2ecc71', 'Landing');
}

/**
 * Draw a labeled marker.
 */
function drawMarker(viz, x, y, color, label) {
    const { ctx } = viz;
    
    // Draw circle
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Draw label
    ctx.fillStyle = '#2c3e50';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, y - 15);
}

/**
 * Draw rocket sprite that rotates with velocity vector.
 */
function drawRocketSprite(viz, point, scale, windData) {
    const { ctx } = viz;
    
    // Calculate position
    const x = scale.offsetX + point.horizontalX * scale.x;
    const y = scale.offsetY - point.altitude * scale.y;
    
    // Calculate velocity angle for rotation
    const velocityAngle = Math.atan2(point.verticalVelocity, point.horizontalVelocity || 1);
    
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(velocityAngle + Math.PI / 2); // Adjust for rocket pointing up
    
    // Draw rocket body (modern design)
    ctx.fillStyle = '#ecf0f1';
    ctx.strokeStyle = '#7f8c8d';
    ctx.lineWidth = 2;
    
    // Main body
    ctx.beginPath();
    ctx.moveTo(0, -25);
    ctx.lineTo(6, -10);
    ctx.lineTo(6, 5);
    ctx.lineTo(-6, 5);
    ctx.lineTo(-6, -10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Nose cone
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.moveTo(0, -25);
    ctx.lineTo(5, -32);
    ctx.lineTo(-5, -32);
    ctx.closePath();
    ctx.fill();
    
    // Fins
    ctx.fillStyle = '#3498db';
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 1;
    
    // Left fin
    ctx.beginPath();
    ctx.moveTo(6, -5);
    ctx.lineTo(12, 5);
    ctx.lineTo(6, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Right fin
    ctx.beginPath();
    ctx.moveTo(-6, -5);
    ctx.lineTo(-12, 5);
    ctx.lineTo(-6, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Draw boost plume during powered ascent (if within burn time)
    if (point.burnTimeRemaining > 0 && point.altitude < 50) {
        drawPlume(viz, x, y + 12, velocityAngle);
    }
    
    ctx.restore();
}

/**
 * Draw rocket boost plume.
 */
function drawPlume(viz, x, y, angle) {
    const { ctx } = viz;
    
    // Plume particles
    const numParticles = 5;
    for (let i = 0; i < numParticles; i++) {
        const offset = (i - numParticles / 2) * 3;
        const length = 10 + Math.random() * 15;
        
        ctx.fillStyle = `rgba(243, 156, 18, ${0.8 - i * 0.15})`;
        
        ctx.beginPath();
        ctx.moveTo(x + offset, y);
        ctx.lineTo(x + offset + (Math.random() - 0.5) * 5, y + length);
        ctx.lineTo(x + offset - (Math.random() - 0.5) * 5, y + length);
        ctx.fill();
    }
}

/**
 * Draw parachute during descent.
 */
function drawParachuteSprite(viz, x, y, windSpeed) {
    const { ctx } = viz;
    
    // Chute canopy
    ctx.fillStyle = '#ecf0f1';
    ctx.strokeStyle = '#bdc3c7';
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.arc(x, y - 25, 20, Math.PI, 0);
    ctx.lineTo(x + 18, y - 15);
    ctx.lineTo(x + 10, y);
    ctx.lineTo(x - 10, y);
    ctx.lineTo(x - 18, y - 15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Chute lines
    ctx.strokeStyle = '#95a5a6';
    ctx.lineWidth = 1;
    
    ctx.beginPath();
    ctx.moveTo(x + 20, y - 25);
    ctx.lineTo(x + 8, y);
    ctx.moveTo(x - 20, y - 25);
    ctx.lineTo(x - 8, y);
    ctx.stroke();
    
    // Draw drift particles if wind is present
    if (windSpeed > 1) {
        drawDriftParticles(viz, x, y);
    }
}

/**
 * Draw drift particles for wind visualization.
 */
function drawDriftParticles(viz, x, y) {
    const { ctx } = viz;
    
    // Draw trail behind rocket/parachute
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    
    for (let i = 1; i <= 5; i++) {
        const offset = i * 8;
        const alpha = 1 - i / 6;
        
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(x + offset, y - 10 + Math.sin(i) * 3, 2, 0, Math.PI * 2);
        ctx.fill();
    }
    
    ctx.globalAlpha = 1.0;
}

/**
 * Draw wind visualization.
 */
function drawWindVisualization(viz, scale, windData) {
    const { ctx } = viz;
    
    // Only show wind if enabled
    if (!windData || !windData.enabled) return;
    
    const groundY = scale.offsetY;
    const width = viz.width;
    
    // Draw wind arrows at multiple altitudes
    const numLevels = 5;
    for (let i = 0; i < numLevels; i++) {
        const altitudeRatio = 1 - i / (numLevels * 2); // Top to middle
        const y = groundY - (groundY - 80) * altitudeRatio;
        
        if (y <= 80) continue; // Don't draw too high
        
        // Draw arrow showing wind direction
        drawWindArrow(viz, width - 60, y, windData.speed || 5, windData.direction || 90);
    }
    
    // Draw particles drifting with wind
    if (viz.particles) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        
        viz.particles.forEach((particle, i) => {
            const y = particle.y;
            if (y < groundY - 150) return; // Only below clouds
            
            // Draw simple line to show drift
            ctx.beginPath();
            ctx.moveTo(particle.x, y);
            ctx.lineTo(particle.x + particle.length, y);
            ctx.strokeStyle = `rgba(255, 255, 255, ${particle.alpha})`;
            ctx.lineWidth = 2;
            ctx.stroke();
        });
    }
}

/**
 * Draw a single wind arrow.
 */
function drawWindArrow(viz, x, y, speed, direction) {
    const { ctx } = viz;
    
    // Convert degrees to radians and adjust for canvas coordinates
    const angle = (direction - 90) * Math.PI / 180;
    
    // Arrow length based on wind speed
    const length = Math.min(40 + speed * 3, 70);
    
    // Calculate end point
    const endX = x + Math.cos(angle) * length;
    const endY = y + Math.sin(angle) * length;
    
    // Draw arrow shaft
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    
    // Draw arrowhead
    const headSize = 6;
    const headAngle = Math.PI / 6;
    
    ctx.fillStyle = '#e74c3c';
    
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(
        endX - headSize * Math.cos(angle - headAngle),
        endY - headSize * Math.sin(angle - headAngle)
    );
    ctx.lineTo(
        endX - headSize * Math.cos(angle + headAngle),
        endY - headSize * Math.sin(angle + headAngle)
    );
    ctx.closePath();
    ctx.fill();
}

/**
 * Draw landing uncertainty ellipse.
 */
function drawLandingUncertainty(viz, landingPoint, uncertainty, scale) {
    const { ctx } = viz;
    
    // Calculate landing position
    const x = scale.offsetX + landingPoint.horizontalX * scale.x;
    const y = scale.offsetY - landingPoint.altitude * scale.y;
    
    // Convert uncertainty from meters to pixels
    const uncertaintyX = uncertainty.dx || 10; // meters
    const uncertaintyY = uncertainty.dy || 8;  // meters
    
    const pixelUncertaintyX = uncertaintyX * scale.x;
    const pixelUncertaintyY = uncertaintyY * scale.y;
    
    // Draw ellipse on ground
    ctx.fillStyle = 'rgba(231, 76, 60, 0.3)';
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.ellipse(x, y, pixelUncertaintyX * 2, pixelUncertaintyY * 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Draw center point
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Label
    ctx.fillStyle = '#2c3e50';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('± Uncertainty', x, y + 20);
}

/**
 * Draw scale markers and labels.
 */
function drawScaleMarkers(viz, scale, maxAltFeet, maxHorizontalFeet) {
    const { ctx } = viz;
    
    const groundY = scale.offsetY;
    const width = viz.width;
    
    // Y-axis (altitude) - left side
    const yAxisX = 40;
    
    // Calculate tick interval for altitude
    const altTickInterval = getTickInterval(maxAltFeet);
    const numAltTicks = Math.ceil(maxAltFeet / altTickInterval);
    
    ctx.fillStyle = '#2c3e50';
    ctx.font = '11px Arial';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    
    // Draw Y-axis line
    ctx.strokeStyle = '#7f8c8d';
    ctx.lineWidth = 1;
    
    ctx.beginPath();
    ctx.moveTo(yAxisX, 50);
    ctx.lineTo(yAxisX, groundY);
    ctx.stroke();
    
    // Draw Y-axis ticks and labels (feet)
    for (let i = 0; i <= numAltTicks; i++) {
        const feetValue = i * altTickInterval;
        // Convert feet to meters then apply scale
        const metersValue = feetValue * PHYSICS_CONSTANTS.FEET_TO_METERS;
        const yPos = groundY - metersValue * scale.y;
        
        if (yPos >= 50 && yPos <= groundY) {
            // Draw tick mark
            ctx.beginPath();
            ctx.moveTo(yAxisX, yPos);
            ctx.lineTo(yAxisX + 8, yPos);
            ctx.stroke();
            
            // Draw label
            ctx.fillText(feetValue.toFixed(0), yAxisX - 10, yPos);
        }
    }
    
    // Y-axis title
    ctx.save();
    ctx.translate(25, (50 + groundY) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('Altitude (ft)', 0, 0);
    ctx.restore();
    
    // X-axis (horizontal distance) - bottom
    const xAxisY = groundY;
    const xAxisLeft = scale.offsetX;
    const xAxisRight = width - 60; // Leave room for wind arrows
    
    // Draw X-axis line
    ctx.strokeStyle = '#7f8c8d';
    ctx.lineWidth = 1;
    
    ctx.beginPath();
    ctx.moveTo(xAxisLeft, xAxisY);
    ctx.lineTo(xAxisRight, xAxisY);
    ctx.stroke();
    
    // Calculate tick interval for horizontal distance
    const horizTickInterval = getTickInterval(maxHorizontalFeet);
    const numHorizTicks = Math.ceil(maxHorizontalFeet / horizTickInterval);
    
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    // Draw X-axis ticks and labels (feet)
    for (let i = 0; i <= numHorizTicks; i++) {
        const feetValue = i * horizTickInterval;
        // Convert feet to meters then apply scale
        const metersValue = feetValue * PHYSICS_CONSTANTS.FEET_TO_METERS;
        const xPos = scale.offsetX + metersValue * scale.x;
        
        if (xPos >= xAxisLeft && xPos <= xAxisRight) {
            // Draw tick mark
            ctx.beginPath();
            ctx.moveTo(xPos, xAxisY);
            ctx.lineTo(xPos, xAxisY - 8);
            ctx.stroke();
            
            // Draw label
            ctx.fillText(feetValue.toFixed(0), xPos, xAxisY + 5);
        }
    }
    
    // X-axis title
    ctx.textAlign = 'center';
    ctx.fillText('Distance from Launch (ft)', (xAxisLeft + xAxisRight) / 2, groundY + 30);
}

/**
 * Draw flight event markers.
 */
function drawFlightEvents(viz, trajectory, scale) {
    const { ctx } = viz;
    
    if (!trajectory || trajectory.length < 2) return;
    
    // Find key events
    let apogeeIndex = 0;
    let burnoutIndex = -1;
    
    trajectory.forEach((point, idx) => {
        if (point.altitude > trajectory[apogeeIndex].altitude) {
            apogeeIndex = idx;
        }
        
        // Check for burnout (when thrust becomes zero)
        if (burnoutIndex === -1 && point.thrust <= 0.1) {
            burnoutIndex = idx;
        }
    });
    
    const groundY = scale.offsetY;
    const width = viz.width;
    
    ctx.fillStyle = '#2c3e50';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    
    // Draw apogee marker
    if (apogeeIndex > 0 && apogeeIndex < trajectory.length - 1) {
        const point = trajectory[apogeeIndex];
        const x = scale.offsetX + point.horizontalX * scale.x;
        const y = scale.offsetY - point.altitude * scale.y;
        
        // Vertical line from apogee to ground
        ctx.strokeStyle = 'rgba(230, 126, 34, 0.5)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, groundY);
        ctx.stroke();
        
        ctx.setLineDash([]);
        
        // Apogee label
        ctx.fillStyle = '#e67e22';
        ctx.fillText('Apogee', x, y - 15);
    }
    
    // Draw burnout marker if found
    if (burnoutIndex > 0) {
        const point = trajectory[burnoutIndex];
        const x = scale.offsetX + point.horizontalX * scale.x;
        const y = scale.offsetY - point.altitude * scale.y;
        
        ctx.fillStyle = '#7f8c8d';
        ctx.fillText('Burnout', x, y - 15);
    }
    
    // Draw chute deploy marker (usually near apogee)
    if (apogeeIndex > 0) {
        const deployIndex = Math.min(apogeeIndex + 5, trajectory.length - 1);
        const point = trajectory[deployIndex];
        const x = scale.offsetX + point.horizontalX * scale.x;
        const y = scale.offsetY - point.altitude * scale.y;
        
        ctx.fillStyle = '#27ae60';
        ctx.fillText('Chute', x, y - 15);
    }
}

/**
 * Draw legend.
 */
function drawLegend(viz) {
    const { ctx } = viz;
    
    const legendY = 20;
    const legendX = viz.width - 150;
    
    // Legend background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(legendX - 10, legendY - 10, 140, 80);
    
    // Legend items
    const legends = [
        { color: '#3498db', text: 'Ascent' },
        { color: '#e67e22', text: 'Descent' }
    ];
    
    legends.forEach((item, idx) => {
        ctx.beginPath();
        ctx.arc(legendX, legendY + idx * 20, 5, 0, Math.PI * 2);
        ctx.fillStyle = item.color;
        ctx.fill();
        
        ctx.fillStyle = '#2c3e50';
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
        { label: 'Downrange', value: `${statistics.downrangeFeet.toFixed(0)} ft`, icon: '🧭' }
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
        if (point.altitude > trajectory[apogeeIndex].altitude) {
            apogeeIndex = idx;
        }
    });
    
    const burnoutTime = trajectory.find(p => p.thrust <= 0.1)?.time || 0;
    const apogeeTime = trajectory[apogeeIndex]?.time || 0;
    const chuteDeployTime = Math.min(apogeeTime + 2, trajectory[trajectory.length - 1].time) || 0;
    
    // Launch
    html += `<li>🚀 <strong>Liftoff:</strong> ${trajectory[0]?.time.toFixed(1)}s</li>`;
    
    // Burnout
    if (burnoutTime > 0) {
        html += `<li>🔥 <strong>Burnout:</strong> ${burnoutTime.toFixed(1)}s (${((burnoutTime / trajectory[trajectory.length-1].time) * 100).toFixed(0)}% of flight)</li>`;
    }
    
    // Apogee
    if (apogeeTime > 0) {
        html += `<li>⛰️ <strong>Apogee:</strong> ${apogeeTime.toFixed(1)}s at ${trajectory[apogeeIndex]?.altitude?.toFixed(0)}m</li>`;
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
    if (viz.isPlaying) return;
    
    viz.isPlaying = true;
    viz.lastTime = Date.now();
    
    animate(viz);
}

/**
 * Stop animation loop.
 */
function stopAnimation(viz) {
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
    if (!viz.isPlaying) return;
    
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
        const totalTime = viz.simulationResult.trajectory[viz.simulationResult.trajectory.length - 1]?.time || 0;
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
        getTickInterval,
        maxAltitudePixels,
        maxHorizontalPixels
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
        getTickInterval,
        maxAltitudePixels,
        maxHorizontalPixels
    };
}
