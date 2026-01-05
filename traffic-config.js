// TomTom Traffic API Configuration
// Get your API key from: https://developer.tomtom.com/

const TRAFFIC_CONFIG = {
    // TomTom API Key - IMPORTANT: For production, use environment variables or backend proxy
    // Never commit your actual API key to public repositories
    TOMTOM_API_KEY: 'YOUR_TOMTOM_API_KEY_HERE',

    // API Endpoints
    TOMTOM_TRAFFIC_FLOW_BASE: 'https://api.tomtom.com/traffic/services/4/flowSegmentData',
    TOMTOM_TRAFFIC_STATS_BASE: 'https://api.tomtom.com/traffic/services/1/historicalRoute',

    // University Park, MD bounding box for traffic queries
    AREA_BOUNDS: {
        north: 38.9950,
        south: 38.9550,
        east: -76.9200,
        west: -76.9700
    },

    // Traffic flow update interval (milliseconds)
    REALTIME_UPDATE_INTERVAL: 60000, // 1 minute (TomTom updates every minute)

    // Zoom level for traffic queries
    TRAFFIC_ZOOM_LEVEL: 18,

    // Enable/disable real-time traffic data
    USE_REALTIME_DATA: false, // Set to true after adding your API key

    // Historical data settings
    HISTORICAL_DATA_SOURCE: 'synthetic', // 'synthetic' or 'tomtom' (requires Traffic Stats API subscription)

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

// Instructions for setting up TomTom API:
// 1. Go to https://developer.tomtom.com/
// 2. Sign up for a free account
// 3. Create an API key in the dashboard
// 4. For Traffic Flow API (real-time): Free tier includes 2,500 requests/day
// 5. For Traffic Stats API (historical): Requires separate subscription
// 6. Replace 'YOUR_TOMTOM_API_KEY_HERE' with your actual key
// 7. Set USE_REALTIME_DATA to true to enable real-time traffic

// Security Note:
// For production use, implement one of these approaches:
// - Use a backend proxy to hide your API key
// - Set up environment variables with a build process
// - Implement domain restrictions on your TomTom API key
