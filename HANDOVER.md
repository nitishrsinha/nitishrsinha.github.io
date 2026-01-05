# Claude Code Handover Document
## Traffic Exhibit Project

**Date:** January 5, 2026
**Branch:** `claude/traffic-debugging-W5cDR`
**Status:** In Progress - Configuration Loading Issues

---

## Project Overview

Creating an interactive traffic visualization exhibit for University Park, Maryland that:
- Shows traffic patterns during Purple Line construction (April 2025) vs. recent dates
- Displays origin-destination traffic data from 30 intersections
- Integrates TomTom Traffic API for real-time data (optional)
- Uses Leaflet.js for map visualization
- Includes animated vehicle simulation based on traffic volumes

## Current Status

### ✅ Completed
1. **Created main exhibit files:**
   - `traffic-exhibit.html` - Main interactive map page
   - `traffic-data.js` - 30 intersection coordinates + 6 historical scenarios
   - `traffic-app.js` - Visualization logic with TomTom API integration
   - Updated `index.html` with navigation links

2. **API Integration:**
   - TomTom Traffic Flow API integration (for real-time data)
   - Config system with `traffic-config.js` (gitignored for security)
   - `traffic-config.example.js` as template
   - `TRAFFIC_API_SETUP.md` documentation

3. **Security measures:**
   - Added `traffic-config.js` to `.gitignore`
   - Removed it from git tracking
   - Created template system for API key management

4. **Debugging tools created:**
   - `traffic-test.html` - Basic diagnostic page
   - `config-test.html` - Config loading test
   - `config-test-v2.html` - Enhanced diagnostic with error capture

### ⚠️ Current Issue

**CRITICAL:** Configuration file not loading in browser

**Problem:** User was testing on GitHub Pages (https://nitishrsinha.github.io) instead of local server. Since `traffic-config.js` is gitignored, it doesn't exist on the deployed site, causing the exhibit to fail with:
- `TRAFFIC_CONFIG is undefined`
- HTTP 404 for `traffic-config.js`

**User Environment:**
- Was using **Claude Code on the web**
- Now switching to **Claude Code CLI on local machine**
- Has local web server running: `python3 -m http.server 8000`

---

## File Structure

```
/home/user/nitishrsinha.github.io/
├── traffic-exhibit.html          # Main exhibit page
├── traffic-app.js                 # Application logic + TomTom integration
├── traffic-data.js                # Intersection coords + 6 scenarios
├── traffic-config.js              # Local config with real API key (GITIGNORED)
├── traffic-config.example.js      # Template with placeholder key (committed)
├── traffic-config-public.js       # Public version for GitHub Pages (just created)
├── TRAFFIC_API_SETUP.md           # API setup documentation
├── traffic-test.html              # Basic diagnostic
├── config-test.html               # Config loading test
├── config-test-v2.html            # Enhanced diagnostic
├── .gitignore                     # Includes traffic-config.js
└── index.html                     # Updated with Traffic Study links
```

## Key Technical Details

### API Key Information
- **TomTom API Key:** `nRn3f38SCUdxWEMStN3vbpacASGthzp6`
- **Location:** Stored in `traffic-config.js` (local only, gitignored)
- **Status:** `USE_REALTIME_DATA: false` (disabled for debugging)

### Configuration System
- Used `window.TRAFFIC_CONFIG` instead of `const TRAFFIC_CONFIG` for global accessibility
- Config includes:
  - API endpoints
  - University Park, MD bounding box
  - Update intervals (180000ms = 3 min for free tier)
  - Historical data periods

### Intersection Data
- 30 intersections with corrected coordinates from original traffic study
- Source: https://github.com/nitishrsinha/up-traffic-study

### Scenarios
1. `realtime` - Current traffic (synthetic or live from TomTom)
2. `april-2025-am` - Purple Line construction, morning rush
3. `april-2025-pm` - Purple Line construction, evening rush
4. `dec-2025-am` - Post-construction baseline, morning
5. `dec-2025-pm` - Post-construction baseline, evening
6. `jan-2026-am` - Recent data, morning

---

## Next Steps (Priority Order)

### 1. **Test on Local Machine** (IMMEDIATE)
Since user is now on CLI with local access:

```bash
# Navigate to project
cd /home/user/nitishrsinha.github.io

# Verify local server is running
python3 -m http.server 8000

# Test in browser at:
http://localhost:8000/traffic-exhibit.html
```

**Expected result:** Should work now since `traffic-config.js` exists locally.

### 2. **Fix GitHub Pages Deployment**
Create a deployment strategy that works without exposing API key:

**Option A: Use synthetic data on GitHub Pages**
- Update HTML files to load `traffic-config.example.js` when on GitHub Pages
- Or create `traffic-config.js` from example on build

**Option B: Add build step**
- Use environment variables
- Inject config at build time
- Or use GitHub Actions to create config file

**Option C: Backend proxy** (recommended for production)
- Create serverless function to proxy TomTom API
- Keeps API key secure server-side

### 3. **Clean Up Debug Files**
Once working, optionally remove:
- `traffic-test.html`
- `config-test.html`
- `config-test-v2.html`
- Or keep for future debugging

### 4. **Enable Real-Time Data** (Optional)
Once everything works with synthetic data:

```javascript
// In traffic-config.js
USE_REALTIME_DATA: true  // Change from false
```

### 5. **Merge to Main**
```bash
git checkout main
git merge claude/traffic-debugging-W5cDR
git push origin main
```

---

## Important Git Notes

### Current Branch
```
claude/traffic-debugging-W5cDR
```

### Recent Commits
```
4f87d28 Add enhanced config test with error capture
0d3776b Add standalone config loading test page
c6a2586 Fix config loading issue - use window.TRAFFIC_CONFIG
e0119c7 (earlier commits...)
```

### Gitignored Files
```
traffic-config.js           # Contains real API key
```

### Branch Rules
- **Cannot push directly to main** - must use feature branches starting with `claude/`
- Branch naming: `claude/*-<sessionId>`
- Current session ID: `W5cDR`

---

## Testing Checklist

When testing on local machine:

- [ ] Verify `traffic-config.js` exists locally
- [ ] Start local server: `python3 -m http.server 8000`
- [ ] Open `http://localhost:8000/traffic-exhibit.html`
- [ ] Check browser console for `[CONFIG] Loading traffic-config.js...`
- [ ] Verify map displays with intersection markers
- [ ] Test scenario switching (buttons in left panel)
- [ ] Verify animated vehicles appear
- [ ] Test with `USE_REALTIME_DATA: true` (optional)

## Known Issues & Quirks

1. **Browser Caching:** Hard refresh (Ctrl+Shift+R / Cmd+Shift+R) may be needed after config changes

2. **GitHub Pages:** Will show "Config loaded: false" because traffic-config.js is gitignored

3. **TomTom API Limits:** Free tier = 2,500 requests/day
   - Current setup: 15 routes × (60000ms / 180000ms) = ~120 req/hour
   - Update interval set to 3 minutes to stay within limits

4. **Console Logging:** Extensive debugging added to traffic-config.js and traffic-app.js

## User's Original Request

> "I want to create an exhibit with real time traffic data on it. I also want to be able to let user choose some dates and times and show what the traffic looked at those times, ideally some during the Purple line related closures and some from more recent dates."

## Questions for User (if needed)

1. Do you want the GitHub Pages deployment to work (requires solving config issue)?
2. Should we enable real-time TomTom data or keep synthetic for now?
3. Do you want to keep the debug test pages or remove them?

---

## Resources

- **Original traffic study:** https://github.com/nitishrsinha/up-traffic-study
- **TomTom Developer Portal:** https://developer.tomtom.com/
- **Leaflet.js Docs:** https://leafletjs.com/
- **Setup Guide:** See `TRAFFIC_API_SETUP.md`

---

## Contact & Handover Notes

**From:** Claude Code (Web)
**To:** Claude Code (CLI)

User switched from web to CLI to access local server directly. The main blocker was that they were testing on GitHub Pages where the config file doesn't exist (gitignored). With local access, the exhibit should work immediately at `http://localhost:8000/traffic-exhibit.html`.

**Primary objective:** Get the traffic exhibit working and viewable, either locally or on GitHub Pages.

**Secondary objective:** Decide on deployment strategy for GitHub Pages that doesn't expose API key.
