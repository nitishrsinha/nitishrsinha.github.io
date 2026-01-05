# TomTom Traffic API Setup Guide

This guide explains how to integrate real-time traffic data from TomTom into the University Park Traffic Study exhibit.

## Why TomTom?

TomTom offers both **real-time traffic flow** data and **historical traffic data** through separate APIs:

- **Traffic Flow API**: Real-time traffic speeds, congestion, and road conditions
- **Traffic Stats API**: Historical traffic patterns for comparative analysis

Unlike Google Maps, TomTom allows you to use historical data for comparisons and research purposes.

## Getting Started with TomTom API

### 1. Create a TomTom Developer Account

1. Visit [TomTom Developer Portal](https://developer.tomtom.com/)
2. Click "Sign Up" and create a free account
3. Verify your email address

### 2. Generate an API Key

1. Log in to your [TomTom Developer Dashboard](https://developer.tomtom.com/user/me/apps)
2. Click "Create API Key" or go to "My API Keys"
3. Give your key a descriptive name (e.g., "University Park Traffic Study")
4. Select the following products:
   - **Traffic API** (for real-time data)
   - **Traffic Stats API** (optional, for historical data - requires separate subscription)
5. Copy your API key

### 3. Configure the Exhibit

1. Open `traffic-config.js` in your project
2. Replace `'YOUR_TOMTOM_API_KEY_HERE'` with your actual API key:

```javascript
TOMTOM_API_KEY: 'your-actual-api-key-here',
```

3. Enable real-time data:

```javascript
USE_REALTIME_DATA: true,
```

4. Save the file

### 4. Security Best Practices

**⚠️ IMPORTANT**: Never commit your API key to public repositories!

For production deployment, use one of these approaches:

#### Option A: Backend Proxy (Recommended)
Create a backend service that proxies TomTom API requests:

```javascript
// Frontend calls your backend
const response = await fetch('/api/traffic/flow?lat=38.975&lng=-76.944');

// Backend proxies to TomTom with your API key
// This keeps your key secure on the server
```

#### Option B: Environment Variables (Build-time)
Use a build process to inject the API key:

```javascript
TOMTOM_API_KEY: process.env.TOMTOM_API_KEY,
```

#### Option C: Domain Restrictions
In your TomTom Developer Dashboard:
1. Go to your API key settings
2. Add domain restrictions (e.g., `nitishrsinha.github.io`)
3. This limits usage to your specific domain

### 5. API Usage Limits

**Free Tier Limits:**
- **Traffic Flow API**: 2,500 requests per day
- Updates every minute
- Each route segment requires one API call

**Cost Optimization Tips:**
- The exhibit queries ~15 route segments
- At 1-minute update intervals: ~21,600 requests/day
- **Recommendation**: Increase update interval to 2-5 minutes for free tier

To adjust update frequency, modify `traffic-config.js`:

```javascript
REALTIME_UPDATE_INTERVAL: 120000, // 2 minutes (in milliseconds)
```

## Historical Data Setup (Optional)

### TomTom Traffic Stats API

For historical traffic comparisons:

1. **Subscribe** to Traffic Stats API (requires paid subscription)
2. Update `traffic-config.js`:

```javascript
HISTORICAL_DATA_SOURCE: 'tomtom', // Change from 'synthetic'
```

3. The exhibit will fetch historical data for:
   - April 23, 2025 (Purple Line construction)
   - December 15, 2025 (Post-construction baseline)
   - January 2, 2026 (Recent data)

**Note**: Without a Traffic Stats subscription, the exhibit uses synthetic historical data based on the original traffic study.

## API Endpoints Used

### Traffic Flow API
```
GET https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/{zoom}/json
  ?point={lat},{lng}
  &key={apiKey}
```

**Response includes:**
- `currentSpeed`: Current traffic speed (mph)
- `freeFlowSpeed`: Speed under ideal conditions
- `confidence`: Data confidence level
- `roadClosure`: Boolean indicating road closures

### Traffic Stats API (Optional)
```
GET https://api.tomtom.com/traffic/services/1/historicalRoute
  ?route={coordinates}
  &startDate={timestamp}
  &endDate={timestamp}
  &key={apiKey}
```

## Features Enabled with TomTom Integration

Once configured, the exhibit will:

✅ Show **live traffic conditions** in real-time mode
✅ Display **actual speeds** and congestion levels
✅ Highlight **road closures** and incidents
✅ Update automatically every 1-60 minutes (configurable)
✅ Show **data source and update time** in the UI
✅ Fall back to synthetic data if API is unavailable

## Troubleshooting

### "TomTom real-time data disabled. Using synthetic data."
- Check that `USE_REALTIME_DATA: true` in `traffic-config.js`
- Verify your API key is not `'YOUR_TOMTOM_API_KEY_HERE'`

### API Error 403 (Forbidden)
- Your API key may be invalid or expired
- Check domain restrictions in TomTom dashboard
- Verify API key has Traffic API enabled

### API Error 429 (Too Many Requests)
- You've exceeded the free tier limit (2,500 requests/day)
- Increase `REALTIME_UPDATE_INTERVAL` to reduce request frequency
- Consider upgrading to a paid plan

### No data showing on map
- Open browser console (F12) to check for errors
- Verify intersection coordinates are correct
- Check network tab for failed API requests

## Documentation

- [TomTom Traffic API Docs](https://developer.tomtom.com/traffic-api/documentation/product-information/introduction)
- [Traffic Flow Service](https://developer.tomtom.com/traffic-api/documentation/traffic-flow/traffic-flow-service)
- [Traffic Stats API](https://developer.tomtom.com/traffic-stats/documentation/product-information/introduction)
- [JavaScript Tutorial](https://developer.tomtom.com/maps-sdk-web-js/tutorials/use-cases/traffic-tutorial)

## Support

For TomTom API issues:
- [TomTom Developer Forum](https://developer.tomtom.com/forum)
- [TomTom Support](https://developer.tomtom.com/support)

For exhibit-specific issues:
- Check browser console for errors
- Review `traffic-app.js` integration code
- Ensure all JavaScript files load in correct order
