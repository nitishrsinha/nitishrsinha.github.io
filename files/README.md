# FCI-G Interactive Calculator

## Overview
Create an interactive JavaScript calculator that allows users to compute their own Financial Conditions Impulse on Growth (FCI-G) index using the complete Federal Reserve methodology. The calculator automatically fetches the latest data from the Federal Reserve and implements the full 84-coefficient matrix for accurate FCI-G calculations.

## About FCI-G
The Financial Conditions Impulse on Growth (FCI-G) index measures how changes in financial conditions affect GDP growth over the next 12 months. It uses a sophisticated methodology that captures the cumulative effects of financial variable changes across multiple quarterly time horizons (up to 15 quarters ahead). Positive values indicate headwinds to growth, negative values indicate tailwinds.

## Requirements

### Data Source
- **Primary data:** Federal Reserve CSV at `https://www.federalreserve.gov/econres/notes/feds-notes/fci_g_public_monthly_3yr.csv`
- **Methodology:** Complete implementation of Federal Reserve research note at `https://www.federalreserve.gov/econres/notes/feds-notes/a-new-index-to-measure-us-financial-conditions-20230630.html`
- **Coefficient matrix:** All 84 coefficients from Table 1 (7 variables × 12 quarterly lags)
- **Data range:** Display data from 2020 onwards (67+ monthly observations, automatically updated)
- **Live updates:** Automatically fetch fresh data on page load with robust fallback system
- **Data validation:** Ensures data integrity and handles network issues gracefully

### Core Functionality

#### 1. Automatic Data Loading System
- **Multi-proxy live data fetching:** Uses 3 different CORS proxy services for maximum reliability
- **Real-time data parsing:** Automatically processes Federal Reserve CSV (9 columns: date, FCI-G Index, FFR, 10Yr Treasury, Mortgage Rate, BBB, Stock Market, House Prices, Dollar)
- **Intelligent fallback:** Seamlessly switches to embedded historical data if live fetch fails
- **Transparent status reporting:** Shows users data freshness with visual indicators (✅ fresh data / ⚠️ cached data)
- **Data validation:** Filters data from 2020 onwards and validates numeric values
- **Error resilience:** Handles network timeouts, malformed data, and proxy failures gracefully

#### 2. Professional Chart Visualization
- **Historical data display:** Real Federal Reserve FCI-G data as solid line chart using Chart.js with date adapter
- **Time series coverage:** Complete data from 2020 to present (automatically includes new releases)
- **Zero-line reference:** Prominent black gridline at y=0 for easy interpretation
- **User calculation display:** Shows calculated FCI-G value as prominent red dot on current date
- **Interactive features:** Hover tooltips, responsive design, professional styling
- **Chart updates:** Real-time chart updates when user calculates new FCI-G values

#### 3. User Input Interface
Create input controls for 7 financial variables:
- **Federal Funds Rate (FFR)** - 3-month change (%)
- **10-Year Treasury Yield** - 3-month change (%)
- **30-Year Fixed Mortgage Rate** - 3-month change (%)
- **BBB Corporate Bond Yield** - 3-month change (%)
- **Stock Market Index** - 3-month change (%)
- **House Price Index** - 3-month change (%)
- **Broad Dollar Index** - 3-month change (%)

#### 4. FCI-G Calculation
Implement Federal Reserve methodology using the complete coefficient matrix from Table 1.
Each variable has 12 quarterly coefficients (β4-β0 through β15-β11) representing cumulative GDP impact:

```javascript
const COEFFICIENTS = {
    ffr: [0.09994, 0.06858, 0.05093, 0.03039, 0.02569, 0.02001, 0.01581, 0.01135, 0.00739, 0.00396, 0.00171, 0.00039],
    treasury: [-0.00815, -0.01400, -0.01839, -0.02152, -0.02322, -0.02437, -0.02522, -0.02591, -0.02640, -0.02670, -0.02012, -0.01345],
    mortgage: [0.21743, 0.14525, 0.11905, 0.07750, 0.06243, 0.04514, 0.03370, 0.02484, 0.01846, 0.01373, 0.00866, 0.00490],
    bbb: [0.07927, 0.09118, 0.09864, 0.10047, 0.10065, 0.09958, 0.09766, 0.09535, 0.09277, 0.09008, 0.06654, 0.04368],
    stock: [-0.02132, -0.02022, -0.01844, -0.01616, -0.01444, -0.01302, -0.01175, -0.01066, -0.00970, -0.00887, -0.00634, -0.00404],
    house: [-0.03223, -0.03127, -0.02970, -0.02676, -0.01978, -0.01342, -0.00605, 0.00077, 0.00424, 0.00667, 0.00786, 0.00886],
    dollar: [0.048, 0.048, 0.045, 0.039, 0.031, 0.023, 0.017, 0.012, 0.008, 0.005, 0.002, 0.000]
};
```

**Complete Federal Reserve Methodology:**
- **84 total coefficients:** 7 variables × 12 quarterly time horizons (β4-β0 through β15-β11)
- **Quarterly lag structure:** Each coefficient represents cumulative GDP impact at different time horizons
- **Full calculation:** `Your FCI-G = Last Historical FCI-G + Σ(Variable Change × Σ(12 Quarterly Coefficients))`
- **Time horizon:** Captures effects up to 15 quarters (3.75 years) ahead
- **Economic interpretation:** Coefficients derived from FRB/US model impulse response functions
- **Precision:** Matches exact Federal Reserve calculation methodology from Table 1

### Technical Specifications

#### Dependencies
- **Chart.js:** `https://cdn.jsdelivr.net/npm/chart.js`
- **Chart.js Date Adapter:** `https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns/dist/chartjs-adapter-date-fns.bundle.min.js`

#### CORS Proxy Services (try in order)
1. `https://api.allorigins.win/raw?url=${encodeURIComponent(fedUrl)}`
2. `https://cors-anywhere.herokuapp.com/${fedUrl}`
3. `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(fedUrl)}`

#### Browser Compatibility
- Modern browsers with ES6+ support
- Responsive design for mobile/tablet/desktop
- Graceful degradation for network issues

### User Interface Design

#### Layout Structure
```
┌─────────────────────────────────────────┐
│ FCI-G Interactive Calculator            │
│ Financial Conditions Impulse on Growth  │
├─────────────────────────────────────────┤
│ About FCI-G: [explanation]              │
│ Data Status: [✅ Fresh/⚠️ Cached info]   │
│ Research Link: [Federal Reserve paper]  │
├─────────────────────────────────────────┤
│ [Historical Chart - 400px height]      │
├─────────────────────────────────────────┤
│ Input Controls (7 variables in grid)   │
│ [Calculate FCI-G] [Reset All]          │
│ Your FCI-G Value: [result display]     │
└─────────────────────────────────────────┘
```

#### Color Scheme
- Primary: `#3498db` (blue)
- Success: `#27ae60` (green)
- Warning: `#f39c12` (orange)
- Error: `#e74c3c` (red)
- Background: `#f5f5f5` (light gray)
- Cards: `#ffffff` (white)

#### Styling Guidelines
- Clean, professional appearance
- Card-based layout with subtle shadows
- Responsive grid for input controls
- Clear typography hierarchy
- Accessible color contrasts

### Content Requirements

#### Information Panels
1. **About FCI-G:** "The Financial Conditions Impulse on Growth index measures how changes in financial conditions affect GDP growth over the next 12 months. Positive values indicate headwinds to growth, negative values indicate tailwinds."

2. **Calculator Description:** "This calculator automatically loads the latest FCI-G data from the Federal Reserve. Enter your expected 3-month changes in financial variables to calculate your projected FCI-G value."

3. **Data Source Status:** Real-time indicator showing data freshness with observation count and latest data date

4. **Research Attribution:** "See the research note at [Federal Reserve link]" with proper styling and new-tab opening

#### User Feedback
- Loading states during data fetch
- Success/warning indicators for data freshness
- Clear labeling of all input fields
- Immediate visual feedback on calculations

### Error Handling
- Network timeouts and failures
- Malformed CSV data
- Invalid user inputs
- CORS proxy unavailability
- Graceful fallback to embedded data
- User-friendly error messages

### Performance Considerations
- Minimize initial page load time
- Cache embedded fallback data
- Efficient chart rendering
- Debounced input handling for responsive calculations

### Testing Requirements
- Verify live data loading from multiple proxy services
- Test fallback data mechanism
- Validate FCI-G calculations against known values
- Confirm responsive design across devices
- Check accessibility compliance

## Expected Deliverable
A single, production-ready HTML file containing:

### Core Functionality
- **Complete FCI-G calculator** with full 84-coefficient Federal Reserve methodology
- **Automatic data updates** from live Federal Reserve CSV with intelligent fallback
- **Professional chart visualization** showing historical data and user calculations
- **Interactive input system** for all 7 financial variables
- **Real-time calculations** with immediate visual feedback

### Technical Implementation
- **Embedded CSS styling** with responsive design and professional appearance
- **Complete JavaScript functionality** for data loading, parsing, calculation, and visualization
- **Error handling and resilience** for network issues and data problems
- **CORS proxy integration** with multiple fallback services
- **Chart.js integration** with proper date handling and time series display

### User Experience
- **Transparent data status** with live indicators showing data freshness
- **Intuitive interface** with clear labeling and immediate feedback
- **Professional styling** matching Federal Reserve standards
- **Responsive design** working across all devices
- **Accessibility compliance** with proper contrast and navigation

### Accuracy & Reliability
- **Exact Federal Reserve coefficients** from Table 1 (all 84 values)
- **Automatic data synchronization** with new Federal Reserve releases
- **Robust error handling** ensuring the calculator never breaks
- **Data validation** preventing invalid inputs and calculations

The calculator implements the complete, official Federal Reserve FCI-G methodology and stays automatically current with new data releases. No manual updates or additional files required beyond specified CDN resources.