// Traffic Visualization Application
let map;
let routeLines = [];
let vehicles = [];
let intersectionMarkers = [];
let simulationSpeed = 1;
let isPlaying = true;
let currentScenario = 'realtime';
let trafficData = [];
let simulationTime;
let animationFrameId;

// Initialize the map
function initMap() {
    map = L.map('map').setView([38.975, -76.944], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);

    // Add intersection markers
    Object.keys(intersectionCoords).forEach(nodeId => {
        const coords = intersectionCoords[nodeId];
        const marker = L.circleMarker(coords, {
            radius: 8,
            fillColor: '#1976d2',
            fillOpacity: 0.6,
            color: 'white',
            weight: 2
        }).addTo(map);

        marker.bindTooltip(`Intersection ${nodeId}`, {
            permanent: false,
            direction: 'top'
        });

        intersectionMarkers.push(marker);
    });

    loadScenario('realtime');
}

// Load a scenario
function loadScenario(scenarioId) {
    const scenario = scenarios[scenarioId];
    if (!scenario) return;

    currentScenario = scenarioId;
    trafficData = scenario.data;

    // Update UI
    document.getElementById('scenario-description').textContent = scenario.description;
    const modeIndicator = document.getElementById('mode-indicator');
    if (scenario.isRealtime) {
        modeIndicator.textContent = 'LIVE';
        modeIndicator.className = 'mode-indicator';
    } else {
        modeIndicator.textContent = 'HISTORICAL';
        modeIndicator.className = 'mode-indicator historical';
    }

    // Update scenario buttons
    document.querySelectorAll('.scenario-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.scenario === scenarioId) {
            btn.classList.add('active');
        }
    });

    // Initialize simulation time
    if (scenario.startTime) {
        simulationTime = new Date(scenario.startTime);
    } else {
        simulationTime = new Date();
        const hours = simulationTime.getHours();
        // Snap to either morning (6 AM) or evening (3 PM) period
        if (hours < 10) {
            simulationTime.setHours(6, 0, 0, 0);
        } else {
            simulationTime.setHours(15, 0, 0, 0);
        }
    }

    // Clear existing routes and vehicles
    clearRoutes();
    clearVehicles();

    // Draw new routes
    drawRoutes();

    // Update top routes list
    updateTopRoutes();

    // Update clock
    updateClock();
}

// Clear all route lines from map
function clearRoutes() {
    routeLines.forEach(line => map.removeLayer(line));
    routeLines = [];
}

// Clear all vehicles from map
function clearVehicles() {
    vehicles.forEach(vehicle => {
        if (vehicle.marker) {
            map.removeLayer(vehicle.marker);
        }
    });
    vehicles = [];
}

// Draw routes on map
function drawRoutes() {
    trafficData.forEach(route => {
        const coords = route.path_nodes.map(nodeId => intersectionCoords[nodeId]);

        const color = getColorForCount(route.count);
        const weight = Math.max(2, Math.min(8, route.count / 10));

        const line = L.polyline(coords, {
            color: color,
            weight: weight,
            opacity: 0.7
        }).addTo(map);

        line.bindTooltip(
            `<strong>${route.desc}</strong><br>Volume: ${route.count} vehicles`,
            { sticky: true }
        );

        routeLines.push(line);
    });
}

// Get color based on traffic count
function getColorForCount(count) {
    if (count > 50) return '#bd0026';
    if (count > 20) return '#f03b20';
    if (count > 10) return '#fd8d3c';
    return '#feb24c';
}

// Update top routes list
function updateTopRoutes() {
    const sortedRoutes = [...trafficData]
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    const routeList = document.getElementById('route-list');
    routeList.innerHTML = sortedRoutes.map(route => `
        <div class="route-item">
            <div class="route-name">${route.desc}</div>
            <div class="route-count">${route.count} vehicles</div>
        </div>
    `).join('');
}

// Create a vehicle on a route
function createVehicle(route) {
    const vehicle = {
        route: route,
        progress: 0,
        marker: L.circleMarker(intersectionCoords[route.path_nodes[0]], {
            radius: 4,
            fillColor: '#ff0000',
            fillOpacity: 0.8,
            color: 'white',
            weight: 1
        }).addTo(map)
    };

    vehicles.push(vehicle);
    return vehicle;
}

// Update vehicle positions
function updateVehicles() {
    vehicles.forEach((vehicle, index) => {
        vehicle.progress += 0.005 * simulationSpeed;

        if (vehicle.progress >= 1) {
            // Remove vehicle when it reaches the end
            map.removeLayer(vehicle.marker);
            vehicles.splice(index, 1);
            return;
        }

        // Calculate position along route
        const pathNodes = vehicle.route.path_nodes;
        const totalSegments = pathNodes.length - 1;
        const currentSegment = Math.floor(vehicle.progress * totalSegments);
        const segmentProgress = (vehicle.progress * totalSegments) - currentSegment;

        if (currentSegment < totalSegments) {
            const startCoord = intersectionCoords[pathNodes[currentSegment]];
            const endCoord = intersectionCoords[pathNodes[currentSegment + 1]];

            const lat = startCoord[0] + (endCoord[0] - startCoord[0]) * segmentProgress;
            const lng = startCoord[1] + (endCoord[1] - startCoord[1]) * segmentProgress;

            vehicle.marker.setLatLng([lat, lng]);
        }
    });
}

// Spawn new vehicles based on traffic data
function spawnVehicles() {
    trafficData.forEach(route => {
        const spawnProbability = (route.count / 5000) * simulationSpeed;
        if (Math.random() < spawnProbability) {
            createVehicle(route);
        }
    });
}

// Update simulation clock
function updateClock() {
    const hours = simulationTime.getHours();
    const minutes = simulationTime.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;

    document.getElementById('sim-clock').textContent =
        `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}

// Advance simulation time
function advanceTime() {
    // Advance time by 1 minute per ~60 frames (adjust based on speed)
    simulationTime.setSeconds(simulationTime.getSeconds() + simulationSpeed);

    const scenario = scenarios[currentScenario];
    if (!scenario.isRealtime && scenario.startTime) {
        const hours = simulationTime.getHours();

        // Reset when reaching end of study period
        if (scenario.startTime.getHours() === 6 && hours >= 10) {
            // Morning period: reset to 6 AM
            simulationTime = new Date(scenario.startTime);
        } else if (scenario.startTime.getHours() === 15 && hours >= 19) {
            // Evening period: reset to 3 PM
            simulationTime = new Date(scenario.startTime);
        }
    }

    updateClock();
}

// Main animation loop
let frameCount = 0;
function animate() {
    if (!isPlaying) return;

    frameCount++;

    // Update clock every 60 frames
    if (frameCount % 60 === 0) {
        advanceTime();
    }

    spawnVehicles();
    updateVehicles();

    animationFrameId = requestAnimationFrame(animate);
}

// Toggle play/pause
function togglePlayPause() {
    isPlaying = !isPlaying;
    const btn = document.getElementById('play-pause');

    if (isPlaying) {
        btn.textContent = 'Pause';
        animate();
    } else {
        btn.textContent = 'Play';
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
    }
}

// Update simulation speed
function updateSpeed(value) {
    simulationSpeed = parseFloat(value);
    document.getElementById('speed-value').textContent = `${simulationSpeed.toFixed(1)}x`;
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Initialize map
    initMap();

    // Play/pause button
    document.getElementById('play-pause').addEventListener('click', togglePlayPause);

    // Speed slider
    document.getElementById('speed-slider').addEventListener('input', (e) => {
        updateSpeed(e.target.value);
    });

    // Scenario buttons
    document.querySelectorAll('.scenario-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            loadScenario(btn.dataset.scenario);
        });
    });

    // Start animation
    animate();
});

// Add some variance to real-time data periodically
if (scenarios.realtime.isRealtime) {
    setInterval(() => {
        if (currentScenario === 'realtime') {
            // Add slight random variations to simulate real-time changes
            trafficData.forEach(route => {
                const baseCount = realtimeData.find(r => r.id === route.id)?.count || route.count;
                route.count = Math.max(1, baseCount + Math.floor(Math.random() * 10 - 5));
            });

            // Redraw routes with updated counts
            clearRoutes();
            drawRoutes();
            updateTopRoutes();
        }
    }, 10000); // Update every 10 seconds
}
