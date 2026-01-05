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
let realtimeUpdateInterval = null;
let tomtomTrafficLayer = null;

// ===== TomTom Traffic API Integration =====

// Fetch real-time traffic flow data from TomTom API
async function fetchTomTomTrafficFlow() {
    if (!TRAFFIC_CONFIG.USE_REALTIME_DATA || TRAFFIC_CONFIG.TOMTOM_API_KEY === 'YOUR_TOMTOM_API_KEY_HERE') {
        console.log('TomTom real-time data disabled. Using synthetic data.');
        return null;
    }

    try {
        const { north, south, east, west } = TRAFFIC_CONFIG.AREA_BOUNDS;
        const routes = [];

        // Query traffic flow for each route segment
        for (const route of realtimeData) {
            const startNode = route.path_nodes[0];
            const endNode = route.path_nodes[route.path_nodes.length - 1];

            const startCoord = intersectionCoords[startNode];
            const endCoord = intersectionCoords[endNode];

            // Get midpoint for the query
            const lat = (startCoord[0] + endCoord[0]) / 2;
            const lng = (startCoord[1] + endCoord[1]) / 2;

            const url = `${TRAFFIC_CONFIG.TOMTOM_TRAFFIC_FLOW_BASE}/absolute/${TRAFFIC_CONFIG.TRAFFIC_ZOOM_LEVEL}/json` +
                       `?point=${lat},${lng}&key=${TRAFFIC_CONFIG.TOMTOM_API_KEY}`;

            try {
                const response = await fetch(url);
                if (!response.ok) {
                    console.warn(`TomTom API error for route ${route.id}: ${response.status}`);
                    continue;
                }

                const data = await response.json();

                if (data.flowSegmentData) {
                    const flowData = data.flowSegmentData;

                    // Convert TomTom data to our format
                    // currentSpeed vs freeFlowSpeed gives us congestion level
                    const congestionRatio = flowData.currentSpeed / flowData.freeFlowSpeed;

                    // Estimate traffic volume based on congestion
                    // Lower ratio = more congestion = higher volume
                    let estimatedVolume;
                    if (congestionRatio > 0.85) {
                        estimatedVolume = Math.floor(Math.random() * 20 + 10); // Light traffic
                    } else if (congestionRatio > 0.65) {
                        estimatedVolume = Math.floor(Math.random() * 30 + 20); // Medium traffic
                    } else if (congestionRatio > 0.45) {
                        estimatedVolume = Math.floor(Math.random() * 30 + 50); // Heavy traffic
                    } else {
                        estimatedVolume = Math.floor(Math.random() * 40 + 80); // Very heavy traffic
                    }

                    routes.push({
                        ...route,
                        count: estimatedVolume,
                        currentSpeed: flowData.currentSpeed,
                        freeFlowSpeed: flowData.freeFlowSpeed,
                        confidence: flowData.confidence,
                        roadClosure: flowData.roadClosure || false
                    });
                } else {
                    // Use synthetic data as fallback
                    routes.push(route);
                }

                // Rate limiting - wait 100ms between requests
                await new Promise(resolve => setTimeout(resolve, 100));

            } catch (error) {
                console.error(`Error fetching traffic for route ${route.id}:`, error);
                routes.push(route); // Use synthetic data as fallback
            }
        }

        return routes.length > 0 ? routes : null;
    } catch (error) {
        console.error('Error fetching TomTom traffic data:', error);
        return null;
    }
}

// Fetch historical traffic data from TomTom Traffic Stats API
async function fetchTomTomHistoricalData(scenarioId) {
    if (TRAFFIC_CONFIG.HISTORICAL_DATA_SOURCE !== 'tomtom' ||
        TRAFFIC_CONFIG.TOMTOM_API_KEY === 'YOUR_TOMTOM_API_KEY_HERE') {
        return null;
    }

    try {
        const period = TRAFFIC_CONFIG.HISTORICAL_PERIODS[scenarioId];
        if (!period) return null;

        // Note: TomTom Traffic Stats API requires a separate subscription
        // This is a placeholder for the implementation
        console.log('TomTom historical data fetch would happen here');
        console.log('Period:', period);

        // For now, return null to use synthetic data
        return null;
    } catch (error) {
        console.error('Error fetching TomTom historical data:', error);
        return null;
    }
}

// Update traffic data from TomTom (called periodically for real-time mode)
async function updateRealtimeTraffic() {
    if (currentScenario !== 'realtime') return;

    const tomtomData = await fetchTomTomTrafficFlow();

    if (tomtomData && tomtomData.length > 0) {
        trafficData = tomtomData;

        // Redraw routes with updated data
        clearRoutes();
        drawRoutes();
        updateTopRoutes();

        // Update UI to show data source
        const banner = document.getElementById('scenario-info');
        const now = new Date().toLocaleTimeString();
        document.getElementById('scenario-description').innerHTML =
            `Live traffic from TomTom API <small>(Updated: ${now})</small>`;
    }
}

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
async function loadScenario(scenarioId) {
    const scenario = scenarios[scenarioId];
    if (!scenario) return;

    currentScenario = scenarioId;

    // Clear any existing realtime update interval
    if (realtimeUpdateInterval) {
        clearInterval(realtimeUpdateInterval);
        realtimeUpdateInterval = null;
    }

    // Try to fetch real-time or historical data from TomTom
    if (scenario.isRealtime && TRAFFIC_CONFIG.USE_REALTIME_DATA) {
        const tomtomData = await fetchTomTomTrafficFlow();
        trafficData = tomtomData || scenario.data;

        // Set up periodic updates for real-time data
        if (tomtomData) {
            realtimeUpdateInterval = setInterval(
                updateRealtimeTraffic,
                TRAFFIC_CONFIG.REALTIME_UPDATE_INTERVAL
            );
        }
    } else {
        // Use synthetic data for historical scenarios
        trafficData = scenario.data;
    }

    // Update UI
    document.getElementById('scenario-description').textContent = scenario.description;
    const modeIndicator = document.getElementById('mode-indicator');
    if (scenario.isRealtime) {
        modeIndicator.textContent = TRAFFIC_CONFIG.USE_REALTIME_DATA ? 'LIVE' : 'SIMULATED';
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

        // Enhanced tooltip with TomTom data if available
        let tooltipContent = `<strong>${route.desc}</strong><br>Volume: ${route.count} vehicles`;

        if (route.currentSpeed !== undefined) {
            tooltipContent += `<br>Speed: ${Math.round(route.currentSpeed)} mph`;
            tooltipContent += `<br>Free Flow: ${Math.round(route.freeFlowSpeed)} mph`;

            const congestion = Math.round((1 - route.currentSpeed / route.freeFlowSpeed) * 100);
            tooltipContent += `<br>Congestion: ${congestion}%`;
        }

        if (route.roadClosure) {
            tooltipContent += `<br><span style="color: red; font-weight: bold;">⚠ Road Closure</span>`;
        }

        line.bindTooltip(tooltipContent, { sticky: true });

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
    // Show setup notice if TomTom API is not configured
    if (!TRAFFIC_CONFIG.USE_REALTIME_DATA || TRAFFIC_CONFIG.TOMTOM_API_KEY === 'YOUR_TOMTOM_API_KEY_HERE') {
        const notice = document.getElementById('api-setup-notice');
        if (notice) {
            notice.style.display = 'block';
        }
    }

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

// Add some variance to synthetic real-time data periodically (only if TomTom is disabled)
if (scenarios.realtime.isRealtime && !TRAFFIC_CONFIG.USE_REALTIME_DATA) {
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
