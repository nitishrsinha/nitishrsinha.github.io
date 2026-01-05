// Intersection coordinates for University Park, MD
const intersectionCoords = {
    1: [38.9895, -76.9422], 2: [38.9882, -76.9468], 3: [38.9857, -76.9512],
    4: [38.9825, -76.9551], 5: [38.9792, -76.9589], 6: [38.9753, -76.9625],
    7: [38.9715, -76.9663], 8: [38.9678, -76.9702], 9: [38.9642, -76.9738],
    10: [38.9610, -76.9775], 11: [38.9895, -76.9355], 12: [38.9882, -76.9398],
    13: [38.9857, -76.9442], 14: [38.9825, -76.9481], 15: [38.9792, -76.9519],
    16: [38.9753, -76.9555], 17: [38.9715, -76.9593], 18: [38.9678, -76.9632],
    19: [38.9642, -76.9668], 20: [38.9610, -76.9705], 21: [38.9895, -76.9288],
    22: [38.9882, -76.9328], 23: [38.9857, -76.9372], 24: [38.9825, -76.9411],
    25: [38.9792, -76.9449], 26: [38.9753, -76.9485], 27: [38.9715, -76.9523],
    28: [38.9678, -76.9562], 29: [38.9642, -76.9598], 30: [38.9610, -76.9635]
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
