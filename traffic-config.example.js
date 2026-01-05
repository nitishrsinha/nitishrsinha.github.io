// TomTom Traffic API Configuration Template
//
// SETUP INSTRUCTIONS:
// 1. Copy this file to 'traffic-config.js' in the same directory
// 2. Get your API key from: https://developer.tomtom.com/
// 3. Replace 'YOUR_TOMTOM_API_KEY_HERE' with your actual API key
// 4. Set USE_REALTIME_DATA to true to enable real-time traffic
// 5. See TRAFFIC_API_SETUP.md for detailed instructions
//
// SECURITY WARNING:
// - NEVER commit traffic-config.js with your actual API key
// - traffic-config.js is in .gitignore to prevent accidental commits
// - For production, use a backend proxy to hide your API key

const TRAFFIC_CONFIG = {
    // TomTom API Key - Replace with your actual key
    TOMTOM_API_KEY: 'YOUR_TOMTOM_API_KEY_HERE',

    // API Endpoints
    TOMTOM_TRAFFIC_FLOW_BASE: 'https://api.tomtom.com/traffic/services/4/flowSegmentData',
    TOMTOM_TRAFFIC_STATS_BASE: 'https://api.tomtom.com/traffic/services/1/historicalRoute',

    // University Park, MD bounding box for traffic queries
    AREA_BOUNDS: {
        north: 38.9800,
        south: 38.9640,
        east: -76.9370,
        west: -76.9530
    },

    // Traffic flow update interval (milliseconds)
    // Default: 60000 (1 minute) - TomTom updates every minute
    // Recommended for free tier: 180000 (3 minutes) to stay within 2,500 requests/day
    REALTIME_UPDATE_INTERVAL: 180000,

    // Zoom level for traffic queries (higher = more detailed)
    TRAFFIC_ZOOM_LEVEL: 18,

    // Enable/disable real-time traffic data
    // Set to true after adding your API key
    USE_REALTIME_DATA: false,

    // Historical data settings
    // 'synthetic' = use pre-defined data (default)
    // 'tomtom' = fetch from TomTom Traffic Stats API (requires paid subscription)
    HISTORICAL_DATA_SOURCE: 'synthetic',

    // Date ranges for TomTom historical queries
    HISTORICAL_PERIODS: {
        'april-2025': {
            startDate: '2025-04-23T06:00:00',
            endDate: '2025-04-23T19:00:00'
        },
        'dec-2025': {
            startDate: '2025-12-15T06:00:00',
            endDate: '2025-12-15T19:00:00'
        },
        'jan-2026': {
            startDate: '2026-01-02T06:00:00',
            endDate: '2026-01-02T19:00:00'
        }
    }
};

// Quick Setup Guide:
// 1. Copy this file: cp traffic-config.example.js traffic-config.js
// 2. Edit traffic-config.js and add your API key
// 3. Set USE_REALTIME_DATA: true
// 4. Reload the exhibit page
