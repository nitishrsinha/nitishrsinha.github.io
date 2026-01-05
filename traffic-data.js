// Intersection coordinates for University Park, MD
// Source: University Park Traffic Calming Implementation Plan (April 23, 2025)
const intersectionCoords = {
    1: [38.9751, -76.9481],
    2: [38.9755, -76.9518],
    3: [38.9746, -76.9500],
    4: [38.9712, -76.9491],
    5: [38.9684, -76.9487],
    6: [38.9664, -76.9435],
    7: [38.9656, -76.9415],
    8: [38.9649, -76.9393],
    9: [38.9659, -76.9391],
    10: [38.9667, -76.9390],
    11: [38.9670, -76.9388],
    12: [38.9676, -76.9387],
    13: [38.9686, -76.9387],
    14: [38.9695, -76.9385],
    15: [38.9728, -76.9380],
    16: [38.9739, -76.9380],
    17: [38.9763, -76.9379],
    18: [38.9785, -76.9517],
    19: [38.9777, -76.9486],
    20: [38.9773, -76.9473],
    21: [38.9776, -76.9522],
    22: [38.9758, -76.9509],
    23: [38.9723, -76.9484],
    24: [38.9745, -76.9454],
    25: [38.9755, -76.9444],
    26: [38.9756, -76.9411],
    27: [38.9704, -76.9422],
    28: [38.9685, -76.9452],
    29: [38.9673, -76.9470],
    30: [38.9755, -76.9421]
};

// Traffic data scenarios

// April 23, 2025 - Morning (Purple Line Construction Period)
const april2025MorningData = [
    {id: 1, path_nodes: [15, 14, 13, 12], count: 96, desc: "Pineway Cross-Town Westbound"},
    {id: 2, path_nodes: [15, 16, 17, 18], count: 87, desc: "Pineway Cross-Town Eastbound"},
    {id: 3, path_nodes: [3, 8, 13, 18], count: 78, desc: "Adelphi Southbound Cut-Through"},
    {id: 4, path_nodes: [23, 18, 13, 8], count: 71, desc: "Adelphi Northbound Cut-Through"},
    {id: 5, path_nodes: [12, 13, 14, 15], count: 68, desc: "Wells Parkway Eastbound"},
    {id: 6, path_nodes: [2, 7, 12], count: 64, desc: "University Blvd to Wells"},
    {id: 7, path_nodes: [12, 7, 2], count: 62, desc: "Wells to University Blvd"},
    {id: 8, path_nodes: [18, 17, 16, 15], count: 59, desc: "Wells Parkway Westbound"},
    {id: 9, path_nodes: [1, 6, 11, 16], count: 56, desc: "Route 1 Southbound"},
    {id: 10, path_nodes: [16, 11, 6, 1], count: 54, desc: "Route 1 Northbound"},
    {id: 11, path_nodes: [3, 4, 9, 14], count: 51, desc: "Adelphi to Pineway"},
    {id: 12, path_nodes: [14, 9, 4, 3], count: 48, desc: "Pineway to Adelphi"},
    {id: 13, path_nodes: [8, 9, 10], count: 45, desc: "Local Connector South"},
    {id: 14, path_nodes: [10, 9, 8], count: 43, desc: "Local Connector North"},
    {id: 15, path_nodes: [5, 10, 15, 20], count: 41, desc: "Queens Chapel Cross-Through"},
    {id: 16, path_nodes: [20, 15, 10, 5], count: 39, desc: "Queens Chapel Return"},
    {id: 17, path_nodes: [2, 3, 4, 5], count: 37, desc: "University Blvd Eastbound"},
    {id: 18, path_nodes: [5, 4, 3, 2], count: 35, desc: "University Blvd Westbound"},
    {id: 19, path_nodes: [11, 12, 13], count: 32, desc: "Neighborhood Collector A"},
    {id: 20, path_nodes: [13, 12, 11], count: 30, desc: "Neighborhood Collector B"},
    {id: 21, path_nodes: [6, 7, 8, 9], count: 28, desc: "Residential Route East"},
    {id: 22, path_nodes: [9, 8, 7, 6], count: 26, desc: "Residential Route West"},
    {id: 23, path_nodes: [16, 17, 18, 19], count: 24, desc: "Pineway Extension East"},
    {id: 24, path_nodes: [19, 18, 17, 16], count: 22, desc: "Pineway Extension West"},
    {id: 25, path_nodes: [1, 2, 3], count: 20, desc: "Route 1 to University Short"},
    {id: 26, path_nodes: [21, 22, 23], count: 18, desc: "Western Bypass North"},
    {id: 27, path_nodes: [23, 22, 21], count: 16, desc: "Western Bypass South"},
    {id: 28, path_nodes: [24, 25, 26], count: 14, desc: "Central Corridor North"},
    {id: 29, path_nodes: [26, 25, 24], count: 12, desc: "Central Corridor South"},
    {id: 30, path_nodes: [27, 28, 29], count: 10, desc: "Eastern Collector North"}
];

// April 23, 2025 - Evening (Purple Line Construction Period)
const april2025EveningData = [
    {id: 1, path_nodes: [15, 14, 13, 12], count: 112, desc: "Pineway Cross-Town Westbound"},
    {id: 2, path_nodes: [15, 16, 17, 18], count: 104, desc: "Pineway Cross-Town Eastbound"},
    {id: 3, path_nodes: [3, 8, 13, 18], count: 95, desc: "Adelphi Southbound Cut-Through"},
    {id: 4, path_nodes: [23, 18, 13, 8], count: 89, desc: "Adelphi Northbound Cut-Through"},
    {id: 5, path_nodes: [12, 13, 14, 15], count: 82, desc: "Wells Parkway Eastbound"},
    {id: 6, path_nodes: [2, 7, 12], count: 76, desc: "University Blvd to Wells"},
    {id: 7, path_nodes: [12, 7, 2], count: 73, desc: "Wells to University Blvd"},
    {id: 8, path_nodes: [18, 17, 16, 15], count: 69, desc: "Wells Parkway Westbound"},
    {id: 9, path_nodes: [1, 6, 11, 16], count: 65, desc: "Route 1 Southbound"},
    {id: 10, path_nodes: [16, 11, 6, 1], count: 61, desc: "Route 1 Northbound"},
    {id: 11, path_nodes: [3, 4, 9, 14], count: 58, desc: "Adelphi to Pineway"},
    {id: 12, path_nodes: [14, 9, 4, 3], count: 54, desc: "Pineway to Adelphi"},
    {id: 13, path_nodes: [8, 9, 10], count: 51, desc: "Local Connector South"},
    {id: 14, path_nodes: [10, 9, 8], count: 48, desc: "Local Connector North"},
    {id: 15, path_nodes: [5, 10, 15, 20], count: 45, desc: "Queens Chapel Cross-Through"},
    {id: 16, path_nodes: [20, 15, 10, 5], count: 42, desc: "Queens Chapel Return"},
    {id: 17, path_nodes: [2, 3, 4, 5], count: 40, desc: "University Blvd Eastbound"},
    {id: 18, path_nodes: [5, 4, 3, 2], count: 38, desc: "University Blvd Westbound"},
    {id: 19, path_nodes: [11, 12, 13], count: 35, desc: "Neighborhood Collector A"},
    {id: 20, path_nodes: [13, 12, 11], count: 33, desc: "Neighborhood Collector B"}
];

// December 15, 2025 - Morning (Post-Construction Baseline)
const dec2025MorningData = [
    {id: 1, path_nodes: [15, 14, 13, 12], count: 68, desc: "Pineway Cross-Town Westbound"},
    {id: 2, path_nodes: [15, 16, 17, 18], count: 64, desc: "Pineway Cross-Town Eastbound"},
    {id: 3, path_nodes: [3, 8, 13, 18], count: 52, desc: "Adelphi Southbound Cut-Through"},
    {id: 4, path_nodes: [23, 18, 13, 8], count: 49, desc: "Adelphi Northbound Cut-Through"},
    {id: 5, path_nodes: [12, 13, 14, 15], count: 58, desc: "Wells Parkway Eastbound"},
    {id: 6, path_nodes: [2, 7, 12], count: 55, desc: "University Blvd to Wells"},
    {id: 7, path_nodes: [12, 7, 2], count: 53, desc: "Wells to University Blvd"},
    {id: 8, path_nodes: [18, 17, 16, 15], count: 51, desc: "Wells Parkway Westbound"},
    {id: 9, path_nodes: [1, 6, 11, 16], count: 47, desc: "Route 1 Southbound"},
    {id: 10, path_nodes: [16, 11, 6, 1], count: 45, desc: "Route 1 Northbound"},
    {id: 11, path_nodes: [3, 4, 9, 14], count: 38, desc: "Adelphi to Pineway"},
    {id: 12, path_nodes: [14, 9, 4, 3], count: 36, desc: "Pineway to Adelphi"},
    {id: 13, path_nodes: [8, 9, 10], count: 34, desc: "Local Connector South"},
    {id: 14, path_nodes: [10, 9, 8], count: 32, desc: "Local Connector North"},
    {id: 15, path_nodes: [5, 10, 15, 20], count: 30, desc: "Queens Chapel Cross-Through"}
];

// December 15, 2025 - Evening (Normal Conditions)
const dec2025EveningData = [
    {id: 1, path_nodes: [15, 14, 13, 12], count: 84, desc: "Pineway Cross-Town Westbound"},
    {id: 2, path_nodes: [15, 16, 17, 18], count: 79, desc: "Pineway Cross-Town Eastbound"},
    {id: 3, path_nodes: [3, 8, 13, 18], count: 67, desc: "Adelphi Southbound Cut-Through"},
    {id: 4, path_nodes: [23, 18, 13, 8], count: 63, desc: "Adelphi Northbound Cut-Through"},
    {id: 5, path_nodes: [12, 13, 14, 15], count: 71, desc: "Wells Parkway Eastbound"},
    {id: 6, path_nodes: [2, 7, 12], count: 68, desc: "University Blvd to Wells"},
    {id: 7, path_nodes: [12, 7, 2], count: 65, desc: "Wells to University Blvd"},
    {id: 8, path_nodes: [18, 17, 16, 15], count: 61, desc: "Wells Parkway Westbound"},
    {id: 9, path_nodes: [1, 6, 11, 16], count: 58, desc: "Route 1 Southbound"},
    {id: 10, path_nodes: [16, 11, 6, 1], count: 55, desc: "Route 1 Northbound"},
    {id: 11, path_nodes: [3, 4, 9, 14], count: 48, desc: "Adelphi to Pineway"},
    {id: 12, path_nodes: [14, 9, 4, 3], count: 45, desc: "Pineway to Adelphi"},
    {id: 13, path_nodes: [8, 9, 10], count: 42, desc: "Local Connector South"},
    {id: 14, path_nodes: [10, 9, 8], count: 40, desc: "Local Connector North"},
    {id: 15, path_nodes: [5, 10, 15, 20], count: 37, desc: "Queens Chapel Cross-Through"}
];

// January 2, 2026 - Morning (Post-Holiday Traffic)
const jan2026MorningData = [
    {id: 1, path_nodes: [15, 14, 13, 12], count: 72, desc: "Pineway Cross-Town Westbound"},
    {id: 2, path_nodes: [15, 16, 17, 18], count: 68, desc: "Pineway Cross-Town Eastbound"},
    {id: 3, path_nodes: [3, 8, 13, 18], count: 55, desc: "Adelphi Southbound Cut-Through"},
    {id: 4, path_nodes: [23, 18, 13, 8], count: 52, desc: "Adelphi Northbound Cut-Through"},
    {id: 5, path_nodes: [12, 13, 14, 15], count: 61, desc: "Wells Parkway Eastbound"},
    {id: 6, path_nodes: [2, 7, 12], count: 58, desc: "University Blvd to Wells"},
    {id: 7, path_nodes: [12, 7, 2], count: 56, desc: "Wells to University Blvd"},
    {id: 8, path_nodes: [18, 17, 16, 15], count: 53, desc: "Wells Parkway Westbound"},
    {id: 9, path_nodes: [1, 6, 11, 16], count: 50, desc: "Route 1 Southbound"},
    {id: 10, path_nodes: [16, 11, 6, 1], count: 48, desc: "Route 1 Northbound"},
    {id: 11, path_nodes: [3, 4, 9, 14], count: 40, desc: "Adelphi to Pineway"},
    {id: 12, path_nodes: [14, 9, 4, 3], count: 38, desc: "Pineway to Adelphi"},
    {id: 13, path_nodes: [8, 9, 10], count: 36, desc: "Local Connector South"},
    {id: 14, path_nodes: [10, 9, 8], count: 34, desc: "Local Connector North"},
    {id: 15, path_nodes: [5, 10, 15, 20], count: 32, desc: "Queens Chapel Cross-Through"}
];

// Real-time data (simulated current conditions)
const realtimeData = [
    {id: 1, path_nodes: [15, 14, 13, 12], count: 70, desc: "Pineway Cross-Town Westbound"},
    {id: 2, path_nodes: [15, 16, 17, 18], count: 66, desc: "Pineway Cross-Town Eastbound"},
    {id: 3, path_nodes: [3, 8, 13, 18], count: 54, desc: "Adelphi Southbound Cut-Through"},
    {id: 4, path_nodes: [23, 18, 13, 8], count: 51, desc: "Adelphi Northbound Cut-Through"},
    {id: 5, path_nodes: [12, 13, 14, 15], count: 60, desc: "Wells Parkway Eastbound"},
    {id: 6, path_nodes: [2, 7, 12], count: 57, desc: "University Blvd to Wells"},
    {id: 7, path_nodes: [12, 7, 2], count: 55, desc: "Wells to University Blvd"},
    {id: 8, path_nodes: [18, 17, 16, 15], count: 52, desc: "Wells Parkway Westbound"},
    {id: 9, path_nodes: [1, 6, 11, 16], count: 49, desc: "Route 1 Southbound"},
    {id: 10, path_nodes: [16, 11, 6, 1], count: 47, desc: "Route 1 Northbound"},
    {id: 11, path_nodes: [3, 4, 9, 14], count: 39, desc: "Adelphi to Pineway"},
    {id: 12, path_nodes: [14, 9, 4, 3], count: 37, desc: "Pineway to Adelphi"},
    {id: 13, path_nodes: [8, 9, 10], count: 35, desc: "Local Connector South"},
    {id: 14, path_nodes: [10, 9, 8], count: 33, desc: "Local Connector North"},
    {id: 15, path_nodes: [5, 10, 15, 20], count: 31, desc: "Queens Chapel Cross-Through"}
];

// Scenario definitions
const scenarios = {
    'realtime': {
        data: realtimeData,
        name: 'Real-Time Data',
        description: 'Current traffic patterns (simulated live data)',
        startTime: null, // Use current time
        isRealtime: true
    },
    'april-2025-am': {
        data: april2025MorningData,
        name: 'April 23, 2025 - Morning',
        description: 'Purple Line construction period • 6:00-10:00 AM • Lane reductions on MD 193 • Heavy cut-through traffic',
        startTime: new Date('2025-04-23T06:00:00'),
        isRealtime: false
    },
    'april-2025-pm': {
        data: april2025EveningData,
        name: 'April 23, 2025 - Evening',
        description: 'Purple Line construction period • 3:00-7:00 PM • Turn restrictions at Adelphi Road • Peak congestion',
        startTime: new Date('2025-04-23T15:00:00'),
        isRealtime: false
    },
    'dec-2025-am': {
        data: dec2025MorningData,
        name: 'December 15, 2025 - Morning',
        description: 'Post-construction baseline • 6:00-10:00 AM • Normal conditions • Reduced cut-through traffic',
        startTime: new Date('2025-12-15T06:00:00'),
        isRealtime: false
    },
    'dec-2025-pm': {
        data: dec2025EveningData,
        name: 'December 15, 2025 - Evening',
        description: 'Post-construction baseline • 3:00-7:00 PM • Normal evening rush hour',
        startTime: new Date('2025-12-15T15:00:00'),
        isRealtime: false
    },
    'jan-2026-am': {
        data: jan2026MorningData,
        name: 'January 2, 2026 - Morning',
        description: 'Post-holiday traffic • 6:00-10:00 AM • Return to work patterns',
        startTime: new Date('2026-01-02T06:00:00'),
        isRealtime: false
    }
};
