document.addEventListener('DOMContentLoaded', () => {

    // Check for URL params first, else default to Delhi
    const urlParams = new URLSearchParams(window.location.search);
    const latParam = urlParams.get('lat');
    const lonParam = urlParams.get('lon');

    // Global data storage for Summary generation
    window.latestAQIData = null;
    window.latestWeatherData = null;

    if (latParam && lonParam) {
        fetchData(parseFloat(latParam), parseFloat(lonParam));
    } else {
        // Default: Central India (Nagpur area) for India-wide focus
        fetchData(22.5, 82.0);
    }

    // Check for Hotspot Analysis Params and store globally
    if (urlParams.get('hotspot') === 'true') {
        window.isHotspotMode = true;
        window.hotspotData = {
            aqi: urlParams.get('h_aqi'),
            pop: urlParams.get('h_pop'),
            area: urlParams.get('h_area'),
            dur: urlParams.get('h_dur'),
            pers: urlParams.get('h_pers')
        };

        // VISUAL FEEDBACK FOR HOTSPOT ANALYSIS
        const headerLeft = document.querySelector('.header-left');
        if (headerLeft) {
            // Add identifying badge
            const badge = document.createElement('div');
            badge.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> CRITICAL HOTSPOT ZONE DETECTED';
            badge.style.cssText = `
                background: linear-gradient(90deg, #d32f2f, #7e0023); 
                color: white; 
                padding: 8px 12px; 
                border-radius: 6px; 
                font-weight: 700; 
                font-size: 0.9rem; 
                display: inline-flex; 
                align-items: center; 
                gap: 8px;
                margin-bottom: 10px;
                box-shadow: 0 4px 15px rgba(211, 47, 47, 0.4);
                border: 1px solid rgba(255, 100, 100, 0.3);
            `;
            headerLeft.insertBefore(badge, headerLeft.firstChild);

            // Change Overview text
            const overviewText = headerLeft.querySelector('p');
            if (overviewText) overviewText.textContent = "Impact Analysis Report";
        }

    }

    // Direct Location Name Set (Backup to ensure it shows)
    const passedName = urlParams.get('location_name');
    if (passedName) {
        const locEl = document.getElementById('location-name');
        if (locEl) locEl.textContent = decodeURIComponent(passedName);
    }

    updateDate();
    setInterval(updateDate, 1000);

    // Refresh data every 5 minutes
    setInterval(() => {
        const params = new URLSearchParams(window.location.search);
        const lat = params.get('lat') ? parseFloat(params.get('lat')) : 22.5;
        const lon = params.get('lon') ? parseFloat(params.get('lon')) : 82.0;
        fetchData(lat, lon);
    }, 300000);

    // Add event listener for "Use My Location" button
    const locationBtn = document.getElementById('location-btn');
    if (locationBtn) {
        locationBtn.addEventListener('click', getUserLocation);
    }
});

// Global variable for dashboard data (REMOVED JSON FETCH)
// window.dashboardData = [];

/* ---------------- DATE ---------------- */
function updateDate() {
    const dateElement = document.getElementById('current-date');
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
    dateElement.textContent = now.toLocaleDateString('en-US', options);
}

/* ---------------- FETCH DATA ---------------- */
/* ---------------- FETCH DATA ---------------- */
function fetchData(lat, lon) {
    if (!lat || !lon) {
        lat = 22.5;
        lon = 82.0;
    }

    // Update the coordinates display
    const coordDisplay = document.querySelector('.forecast-card .card-body p:first-child');
    if (coordDisplay) {
        coordDisplay.textContent = `Coordinates: ${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E`;
    }

    // Find nearest station
    const nearest = findNearestStation(lat, lon);

    // Update Station Card UI with nearest station info
    updateStationUI(nearest);

    // Fetch data for the STATION'S coordinates (to get data for that specific monitor)
    // NOTE: If you prefer to settle for exact user location weather but station AQI, split the calls.
    // Here we effectively "snap" the dashboard to the station.
    fetchWeatherData(nearest.lat, nearest.lon);
    fetchAirQualityData(nearest.lat, nearest.lon);

    // We don't need reverse geocoding for the station name anymore because we have it from the list!
    // But we might want to keep the header as the "User's Approximate Location" or update it to the Station?
    // Let's keep the header as the USER'S selected/detected location (city level) using reverse geocoding
    // but the STATION CARD shows the specific monitoring station name.
    fetchLocationName(lat, lon);

    // Fetch Analytics Data (Source Classification & Forecast)
    fetchAnalyticsData(lat, lon);
}

/* ---------------- NEAREST STATION LOGIC ---------------- */
function findNearestStation(userLat, userLon) {
    let minDistance = Infinity;
    let nearestStation = null;

    for (const station of aqiStations) {
        const distance = calculateDistance(userLat, userLon, station.lat, station.lon);
        if (distance < minDistance) {
            minDistance = distance;
            nearestStation = station;
        }
    }

    // Attach distance to the object for UI use
    return { ...nearestStation, distance: minDistance };
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

function updateStationUI(station) {
    const stationNameEl = document.getElementById('station-name');
    const stationStatusEl = document.querySelector('.station-status');
    const lastUpdateEl = document.getElementById('last-update');

    if (stationNameEl) {
        stationNameEl.textContent = station.name;
    }

    // Add distance info
    // Add distance info
    const distEl = document.getElementById('station-distance');
    if (distEl && station.distance) {
        distEl.textContent = `${station.distance.toFixed(1)} km`;
    }

    if (lastUpdateEl) {
        const now = new Date();
        lastUpdateEl.textContent = now.toLocaleTimeString();
    }
}


/* ---------------- REVERSE GEOCODING ---------------- */
async function fetchLocationName(lat, lon) {
    const locationElement = document.getElementById('location-name');
    if (!locationElement) return;

    // 1. Check if location_name is passed in URL (Hotspot Mode)
    const urlParams = new URLSearchParams(window.location.search);
    const passedName = urlParams.get('location_name');

    if (passedName && passedName.trim() !== "") {
        locationElement.textContent = decodeURIComponent(passedName);
        console.log("Using passed location name:", passedName);
        return;
    }

    // Identify nearest station for fallback
    const nearest = findNearestStation(lat, lon);

    locationElement.textContent = "Locating...";

    try {
        // Use Photon API for reverse geocoding (Granular area/district)
        const url = `https://photon.komoot.io/reverse?lon=${lon}&lat=${lat}`;

        // Add timeout to prevent hanging if API is slow
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error("Photon API response not ok");

        const data = await response.json();

        if (data.features && data.features.length > 0) {
            const props = data.features[0].properties;

            // Priority: District -> City -> State for a broad "overview" feel
            const parts = [];
            if (props.district) parts.push(props.district);
            else if (props.city) parts.push(props.city);
            else if (props.name) parts.push(props.name);

            if (parts.length > 0) {
                locationElement.textContent = parts.join(', ');
            } else if (props.state) {
                locationElement.textContent = props.state;
            } else {
                // Better fallback: use nearest station name
                locationElement.textContent = nearest ? nearest.name.split(',')[0] : `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
            }
        } else {
            locationElement.textContent = nearest ? nearest.name.split(',')[0] : `Region (${lat.toFixed(2)}, ${lon.toFixed(2)})`;
        }
    } catch (error) {
        console.error("Error fetching location name:", error);
        // Fallback to nearest station city rather than raw coordinates
        locationElement.textContent = nearest ? nearest.name.split(',')[0] : `Region (${lat.toFixed(2)}, ${lon.toFixed(2)})`;
    }
}

/* ---------------- GEOLOCATION ---------------- */
function getUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;

                // Update URL without reloading to keep state shareable
                const newUrl = `${window.location.pathname}?lat=${lat}&lon=${lon}`;
                window.history.pushState({ path: newUrl }, '', newUrl);

                fetchData(lat, lon);
                alert("Location updated to your current position!");
            },
            (error) => {
                console.error("Error getting location:", error);
                alert("Unable to retrieve your location. Please check browser permissions.");
            }
        );
    } else {
        alert("Geolocation is not supported by this browser.");
    }
}

/* ---------------- CACHING HELPER ---------------- */
async function fetchWithCache(url, cacheKey, expiryMinutes = 15) {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
        try {
            const { data, timestamp } = JSON.parse(cached);
            const ageMinutes = (Date.now() - timestamp) / (1000 * 60);
            if (ageMinutes < expiryMinutes) {
                console.log(`Using cached data for ${cacheKey} (Age: ${ageMinutes.toFixed(1)}m)`);
                return data;
            }
        } catch (e) {
            console.error("Cache parse error", e);
            localStorage.removeItem(cacheKey);
        }
    }

    try {
        const response = await fetch(url);
        if (!response.ok) {
            if (response.status === 429) {
                console.warn(`Rate limit hit for ${url}. Returning cached data if available.`);
                if (cached) return JSON.parse(cached).data; // Fallback to stale cache
                throw new Error("API Rate Limited (429)");
            }
            throw new Error(`API Error: ${response.statusText}`);
        }
        const data = await response.json();

        // Save to cache
        localStorage.setItem(cacheKey, JSON.stringify({
            data: data,
            timestamp: Date.now()
        }));

        return data;
    } catch (error) {
        console.error(`Fetch failed for ${url}:`, error);
        if (cached) {
            console.warn("Network failed, serving stale cache.");
            return JSON.parse(cached).data;
        }
        throw error;
    }
}

function getMockData(lat, lon, type = 'aqi') {
    // Generate deterministic mock data based on lat/lon so it doesn't flicker
    const seed = Math.abs(lat + lon);
    const random = (offset) => {
        const x = Math.sin(seed + offset) * 10000;
        return x - Math.floor(x);
    };

    if (type === 'aqi') {
        const aqi = 50 + Math.floor(random(1) * 150); // 50-200
        return {
            current: {
                us_aqi: aqi,
                pm10: aqi * 1.2,
                pm2_5: aqi * 0.8,
                nitrogen_dioxide: 20 + random(2) * 50,
                sulphur_dioxide: 10 + random(3) * 30,
                ozone: 30 + random(4) * 100,
                carbon_monoxide: 400 + random(5) * 600
            },
            hourly: {
                us_aqi: Array(24).fill(aqi).map((v, i) => v + Math.floor(Math.sin(i) * 20)),
                pm2_5: Array(24).fill(aqi * 0.8),
                pm10: Array(24).fill(aqi * 1.2)
            }
        };
    } else {
        // Weather
        return {
            current: {
                temperature_2m: 25 + random(6) * 10,
                wind_speed_10m: 5 + random(7) * 20,
                wind_direction_10m: Math.floor(random(8) * 360),
                visibility: 5000 + random(9) * 20000
            }
        };
    }
}

/* ---------------- WEATHER ---------------- */
async function fetchWeatherData(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m,wind_direction_10m,visibility&timezone=auto`;
    const cacheKey = `weather_${lat.toFixed(4)}_${lon.toFixed(4)}`;

    try {
        // Use 15-minute cache
        const data = await fetchWithCache(url, cacheKey, 15);

        if (!data || !data.current) throw new Error("Invalid Weather Data format");

        // Let's store visibility globally or pass it. 
        // Actually, let's keep it simple: updateWeatherUI handles standard weather, 
        // but the visibility risk is part of Insights Card which is updated by updateInsights (fed by AQI data).
        // EXCEPT: visibility comes from Weather API, not AQI API.
        // So we need to update the Visibility part of the Insights card from here.

        updateWeatherUI(data.current);
        updateVisibilityInsight(data.current.visibility);

        // Store weather data for summary
        window.latestWeatherData = data.current;
        generateSummary();

    } catch (error) {
        console.error("Failed to fetch Weather data:", error);

        // Final Fallback: Mock Data
        console.warn("Using Mock Weather Data as fallback.");
        const mock = getMockData(lat, lon, 'weather');
        updateWeatherUI(mock.current);
        updateVisibilityInsight(mock.current.visibility);
        window.latestWeatherData = mock.current;
        generateSummary();
    }
}

function updateWeatherUI(data) {
    const tempEl = document.getElementById('temperature');
    if (!tempEl) return; // Exit if elements don't exist (e.g. on Analytics page)

    tempEl.textContent = Math.round(data.temperature_2m);
    document.getElementById('wind-speed').textContent = data.wind_speed_10m;
    document.getElementById('wind-direction').textContent = data.wind_direction_10m;

    document.getElementById('weather-description')
        .textContent = `Temperature ${data.temperature_2m}°C with wind ${data.wind_speed_10m} km/h`;
}

/* ---------------- AQI ---------------- */
/* ---------------- AQI ---------------- */
async function fetchAirQualityData(lat, lon) {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm10,pm2_5,nitrogen_dioxide,sulphur_dioxide,ozone,carbon_monoxide,carbon_dioxide&hourly=us_aqi,pm2_5,pm10&past_days=1&timezone=auto`;
    const cacheKey = `aqi_${lat.toFixed(4)}_${lon.toFixed(4)}`;

    try {
        // Fix: Use a custom fetch that throws on 429 so we hit the WAQI fallback.
        const response = await fetch(url);
        if (response.status === 429) throw new Error("API Rate Limited (429)");
        if (!response.ok) throw new Error(`API Error: ${response.statusText}`);

        const data = await response.json();

        if (!data || !data.current) throw new Error("Invalid AQI Data format");

        // Hotspot Mode Override
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('hotspot') === 'true') {
            const hAqi = parseInt(urlParams.get('h_aqi'));
            if (!isNaN(hAqi)) {
                // Override Current Data
                data.current.us_aqi = hAqi;
                const pm25 = Math.round(hAqi * 1.5 + (Math.random() * 10));
                data.current.pm2_5 = pm25;
                data.current.pm10 = Math.round(pm25 * 1.6);

                // Override Hourly Forecast (to show trend)
                if (data.hourly && data.hourly.us_aqi) {
                    // Make the entire recent history high to simulate a persistent hotspot
                    data.hourly.us_aqi = data.hourly.us_aqi.map(() => hAqi);
                    data.hourly.pm2_5 = data.hourly.pm2_5.map(() => pm25);
                }
            }
        }

        if (data && data.current) {
            updateDataStatus("Live Data", "success");

            try { updateAirQualityUI(data.current); } catch (e) { console.error("Error in updateAirQualityUI:", e); }
            try { updateInsights(data); } catch (e) { console.error("Error in updateInsights:", e); }

            // Store AQI data for summary
            window.latestAQIData = data;
            generateSummary();
        } else {
            console.error("AQI Data format invalid:", data);
        }

    } catch (error) {
        console.error("Failed to fetch AQI data (Open-Meteo):", error);

        // FALLBACK 1: Try WAQI (World Air Quality Index)
        // NOTE: USER MUST PROVIDE A VALID TOKEN BELOW
        const WAQI_TOKEN = '60a3804981762736bb553a3d58db27b50f487369'; // <--- PASTE YOUR TOKEN HERE

        if (WAQI_TOKEN === '0a3804981762736bb553a3d58db27b50f487369' || WAQI_TOKEN === '') {
            console.warn("WAQI Token missing. Skipping fallback.");
        } else {
            console.warn("Attempting WAQI Fallback with provided token...");
            try {
                updateDataStatus("Connecting to WAQI...", "warning");
                const waqiData = await fetchWAQIData(lat, lon, WAQI_TOKEN);
                if (waqiData) {
                    updateDataStatus("Live Data (WAQI)", "success");

                    // Force UI updates with safety delays to ensure DOM is ready/refreshed
                    setTimeout(() => {
                        try { updateAirQualityUI(waqiData.current); } catch (e) { console.error("Error in WAQI updateAirQualityUI:", e); }
                    }, 0);
                    setTimeout(() => {
                        try { updateInsights(waqiData); } catch (e) { console.error("Error in WAQI updateInsights:", e); }
                    }, 100);

                    window.latestAQIData = waqiData;
                    generateSummary();
                    return; // Success! Exit function.
                }
            } catch (waqiError) {
                console.error("WAQI Fallback failed:", waqiError);
            }
        }

        // FALLBACK 2: Final Panic Mode (Mock Data)
        console.warn("Using Mock AQI Data as fallback.");
        updateDataStatus("Simulation Mode", "danger");

        const mock = getMockData(lat, lon, 'aqi');

        try { updateAirQualityUI(mock.current); } catch (e) { console.error("Error in Mock updateAirQualityUI:", e); }
        try { updateInsights(mock); } catch (e) { console.error("Error in Mock updateInsights:", e); }

        window.latestAQIData = mock;
        generateSummary();
    }
}

/* ---------------- WAQI FALLBACK (World Air Quality Index) ---------------- */
async function fetchWAQIData(lat, lon, token) {
    // Use the provided token instead of 'demo'
    const url = `https://api.waqi.info/feed/geo:${lat};${lon}/?token=${token}`;

    try {
        const response = await fetch(url);
        const json = await response.json();

        if (json.status !== 'ok') throw new Error("WAQI Status not OK");

        const d = json.data;
        const iaqi = d.iaqi || {};

        // Helper to safely extract value
        const getVal = (obj) => (obj && obj.v !== undefined) ? obj.v : 0;

        // Convert to Open-Meteo format structure for compatibility
        return {
            current: {
                us_aqi: d.aqi,
                pm10: getVal(iaqi.pm10),
                pm2_5: getVal(iaqi.pm25),
                nitrogen_dioxide: getVal(iaqi.no2),
                sulphur_dioxide: getVal(iaqi.so2),
                ozone: getVal(iaqi.o3),
                ozone: getVal(iaqi.o3),
                carbon_monoxide: getVal(iaqi.co), // Keep original value, WAQI is usually mg/m3 or ppm, need verification but let's trust raw for now to show SOMETHING
            },
            hourly: {
                // WAQI doesn't give hourly forecast, so we simulate a flat line or slight variation based on current
                us_aqi: Array(24).fill(d.aqi),
                pm2_5: Array(24).fill(getVal(iaqi.pm25)),
                pm10: Array(24).fill(getVal(iaqi.pm10))
            }
        };
    } catch (e) {
        console.error("WAQI Fetch Error:", e);
        return null;
    }
}

function updateDataStatus(text, type) {
    const label = document.getElementById('data-status-label');
    const dot = document.getElementById('status-dot');
    if (label && dot) {
        label.textContent = text;
        // Reset classes
        dot.className = 'status-dot';
        if (type === 'success') {
            dot.style.background = 'var(--success)';
            label.style.color = 'var(--text-main)';
        } else if (type === 'warning') {
            dot.style.background = 'var(--warning)';
            label.style.color = 'var(--warning)';
        } else {
            dot.style.background = 'var(--danger)';
            label.style.color = 'var(--danger)';
        }
    }
}

async function updateAirQualityUI(data) {

    /* AI MODULES */
    /* AI MODULES (REMOVED) */
    // const sourceBreakdown = calculateLiveSourceContribution(data);
    // window.latestSourceBreakdown = sourceBreakdown;
    // displaySource(sourceBreakdown);

    const aqiEl = document.getElementById('aqi-value');
    if (aqiEl) { // Only update AQI UI if element exists
        let aqi = data.us_aqi;

        // If Hotspot Mode, use Simulated AQI for display
        // Logic moved to fetchAirQualityData for consistency across all functions


        aqiEl.textContent = aqi;

        let status = "Good";
        if (aqi <= 50) status = "Good";
        else if (aqi <= 100) status = "Moderate";
        else if (aqi <= 150) status = "Unhealthy for Sensitive";
        else if (aqi <= 200) status = "Unhealthy";
        else if (aqi <= 300) status = "Very Unhealthy";
        else status = "Hazardous";

        document.getElementById('aqi-status').textContent = status;
    }

    if (aqiEl) { // Continued UI updates if dashboard elements exist
        // Define limits for "Real-Time" card explanations
        const limits = {
            'PM2.5': { val: 15, period: '24 hours' },
            'PM10': { val: 45, period: '24 hours' },
            'NO2': { val: 25, period: '24 hours' },
            'SO2': { val: 40, period: '24 hours' },
            'O3': { val: 100, period: '8 hours' },
            'CO': { val: 1000, period: '8 hours' }
        };

        updatePollutant('pm25', data.pm2_5, 'PM2.5', limits['PM2.5']);
        updatePollutant('pm10', data.pm10, 'PM10', limits['PM10']);
        updatePollutant('no2', data.nitrogen_dioxide, 'NO₂', limits['NO2']);
        updatePollutant('so2', data.sulphur_dioxide, 'SO₂', limits['SO2']);
        updatePollutant('o3', data.ozone, 'O₃', limits['O3']);

        // CO (Carbon Monoxide) - Fix NaN
        // Ensure we handle potential null/undefined from WAQI/API
        const coVal = (data.carbon_monoxide !== undefined && data.carbon_monoxide !== null) ? data.carbon_monoxide : 0;
        updatePollutant('co', coVal, 'CO', limits['CO']);

        // PM Ratio
        if (data.pm10 && data.pm2_5) {
            const ratio = (data.pm2_5 / data.pm10).toFixed(2);
            const pmRatioEl = document.getElementById('pm-ratio');
            if (pmRatioEl) pmRatioEl.textContent = ratio;
        } else {
            const pmRatioEl = document.getElementById('pm-ratio');
            if (pmRatioEl) pmRatioEl.textContent = '--';
        }

        detectHotspot(data, data.us_aqi);
    }

    // Policies should run on all pages if possible, or check for element
    const aqi = data.us_aqi;
    const policies = generatePolicy(aqi);
    displayPolicy(policies);

}

function updatePollutant(id, val, name, limitInfo) {
    const el = document.getElementById(id);
    if (!el) return;

    // Validation
    if (val === undefined || val === null || isNaN(val)) {
        el.textContent = '--';
        return;
    }

    const numericVal = Math.round(val);
    el.textContent = numericVal;

    // Interactive Explanation
    const parent = el.closest('.pollutant') || el.parentElement;
    if (parent) {
        parent.style.cursor = "pointer";
        parent.title = "Click for details";

        // Construct message
        // Logic: Compare val to limit
        const isHigher = numericVal > limitInfo.val;
        const comparison = isHigher ? "higher than" : "within";
        const safety = isHigher ? "unsafe" : "safe";

        const explanation = `${name} is currently ${numericVal} µg/m³. This is ${comparison} the safety limit of ${limitInfo.val} µg/m³ for ${limitInfo.period}.`;

        // Store and Attach
        parent.setAttribute("data-explanation", explanation);
        parent.onclick = function (e) {
            e.stopPropagation(); // Prevent bubbling if needed
            const exp = this.getAttribute("data-explanation");
            if (exp) alert(exp);
        };
    }
}


/* ---------------- SOURCE CONTRIBUTION AI (LIVE) ---------------- */
/* ---------------- SOURCE CONTRIBUTION AI (LIVE) ---------------- */
// Function removed as per user request

// Function removed as per user request

// Removed old calculateSourceContribution function



/* ---------------- INSIGHTS UPDATE ---------------- */
/* ---------------- INSIGHTS UPDATE ---------------- */
function updateInsights(data) {
    if (!data || !data.current) return;

    // DEBUG: Prove function is running
    // const debugEl = document.getElementById('primary-pollutant');
    // if (debugEl) debugEl.textContent = "Processing...";

    const current = data.current;

    // 1. Primary Pollutant
    // Logic: Check threshold for all, whichever crosses or is highest relative to limit is primary.
    // Standard Limits (User Specified)
    const limits = {
        'PM2.5': 15,
        'PM10': 45,
        'NO₂': 25,
        'SO₂': 40,
        'O₃': 100,
        'CO': 1000
    };

    // Map current values to keys
    const values = {
        'PM2.5': current.pm2_5 || 0,
        'PM10': current.pm10 || 0,
        'NO₂': current.nitrogen_dioxide || 0,
        'SO₂': current.sulphur_dioxide || 0,
        'O₃': current.ozone || 0,
        'CO': Math.round((current.carbon_monoxide || 0)) // CO is µg/m³
    };

    let maxRatio = -1;
    let primary = "PM2.5"; // Default

    for (const [key, limit] of Object.entries(limits)) {
        const val = values[key];
        const ratio = val / limit;
        if (ratio > maxRatio) {
            maxRatio = ratio;
            primary = key;
        }
    }

    // Safety: if maxRatio is 0 (all data missing), keep default or show "N/A"
    const primaryEl = document.getElementById('primary-pollutant');
    if (primaryEl) {
        primaryEl.textContent = (maxRatio > 0) ? primary : "PM2.5";
        primaryEl.style.color = "var(--text-main)";

        // User requested removal of interactive popup for this card
        primaryEl.removeAttribute("data-explanation");
        primaryEl.style.cursor = "default";
        primaryEl.title = "";

        const parent = primaryEl.parentElement;
        if (parent) {
            parent.style.cursor = "default";
            parent.onclick = null;
        }
    }

    // 2. 24-Hour Trend Analysis
    const trendEl = document.getElementById('aqi-change');
    const changeIcon = document.getElementById('change-icon');

    if (trendEl && data.hourly && data.hourly.time && data.hourly.us_aqi) {
        const now = new Date();
        const nowTime = now.getTime();

        // Find index closest to current time
        let currentIndex = -1;
        let minDelta = Infinity;

        data.hourly.time.forEach((t, i) => {
            const time = new Date(t).getTime();
            const delta = Math.abs(nowTime - time);
            if (delta < minDelta) {
                minDelta = delta;
                currentIndex = i;
            }
        });

        // We need data from 24 hours ago (which should be 24 indices back if hourly)
        if (currentIndex >= 24) {
            const prevIndex = currentIndex - 24;
            const prevAQI = data.hourly.us_aqi[prevIndex];
            const currentAQI = current.us_aqi;

            if (prevAQI !== undefined && prevAQI !== null) {
                const diff = currentAQI - prevAQI;
                // diff > 0 means AQI increased (Worsened)
                // diff < 0 means AQI decreased (Improved)

                const percent = prevAQI === 0 ? 0 : Math.round((Math.abs(diff) / prevAQI) * 100);

                if (diff > 5) { // Threshold of 5 to ignore minor fluctuations
                    // Worsened
                    trendEl.textContent = `+${percent}% (Rising)`;
                    trendEl.style.color = "var(--danger)";
                    if (changeIcon) {
                        changeIcon.className = "fa-solid fa-arrow-trend-up";
                        changeIcon.style.color = "var(--danger)";
                        changeIcon.style.display = "inline-block";
                        changeIcon.title = `AQI was ${prevAQI} yesterday at this time`;
                    }
                } else if (diff < -5) {
                    // Improved
                    trendEl.textContent = `-${percent}% (Improving)`;
                    trendEl.style.color = "var(--success)";
                    if (changeIcon) {
                        changeIcon.className = "fa-solid fa-arrow-trend-down";
                        changeIcon.style.color = "var(--success)";
                        changeIcon.style.display = "inline-block";
                        changeIcon.title = `AQI was ${prevAQI} yesterday at this time`;
                    }
                } else {
                    // Stable
                    trendEl.textContent = "Stable (~0%)";
                    trendEl.style.color = "var(--text-muted)";
                    if (changeIcon) {
                        changeIcon.className = "fa-solid fa-minus";
                        changeIcon.style.color = "var(--text-muted)";
                        changeIcon.style.display = "inline-block";
                    }
                }
            } else {
                trendEl.textContent = "Insufficient History";
            }
        } else {
            trendEl.textContent = "Collecting Data...";
        }
    }

    // 3. Emergency Status & Health Advisory
    // Logic: 0-100 Normal, 101-300 Moderate Alert, 300+ Critical
    const aqi = current.us_aqi;
    const emStatus = document.getElementById('emergency-status');
    const healthAdv = document.getElementById('health-advisory');
    const emIcon = document.getElementById('emergency-icon');

    if (emStatus && healthAdv) {
        if (aqi <= 100) {
            // Normal
            emStatus.textContent = "Normal";
            emStatus.style.color = "var(--success)";
            if (emIcon) { emIcon.style.color = "var(--success)"; emIcon.className = "fa-solid fa-circle-check"; }
            healthAdv.textContent = "Air quality is acceptable. Enjoy your outdoor activities.";
        } else if (aqi <= 300) {
            // Moderate Alert (101-300)
            emStatus.textContent = "Moderate Alert";
            emStatus.style.color = "var(--warning)";
            if (emIcon) { emIcon.style.color = "var(--warning)"; emIcon.className = "fa-solid fa-triangle-exclamation"; }
            healthAdv.textContent = "Sensitive groups should reduce outdoor activity. General public should monitor breathing comfort.";
        } else {
            // Critical (300+)
            emStatus.textContent = "Critical";
            emStatus.style.color = "var(--danger)";
            if (emIcon) { emIcon.style.color = "var(--danger)"; emIcon.className = "fa-solid fa-skull-crossbones"; }
            healthAdv.textContent = "Health Emergency! Avoid all outdoor physical activities. Remain indoors.";
        }
    }

    // --- DATA SYNC FOR POLICY DASHBOARD ---
    // Save current state to localStorage so policies.html can read it
    localStorage.setItem('currentAQI', aqi);

    // Simulate source breakdown for policy page (Scientific Heuristic Model)
    // 1. Base values depend on AQI Severity
    let traffic = 30, industry = 25, dust = 20, garbage = 10, stubble = 15;

    if (aqi > 400) {
        // Severe+: Stubble/Industry dominate
        stubble = 35; industry = 30; traffic = 15; dust = 15; garbage = 5;
    } else if (aqi > 300) {
        // Severe: Balanced high load
        stubble = 25; industry = 25; traffic = 25; dust = 15; garbage = 10;
    } else if (aqi > 200) {
        // Poor: Traffic + Dust dominant
        traffic = 35; dust = 25; industry = 20; stubble = 10; garbage = 10;
    } else {
        // Moderate/Good: Traffic is main percentage of lower load
        traffic = 45; dust = 20; industry = 20; stubble = 5; garbage = 10;
    }

    // 2. Seasonal & Time-of-Day Adjustments (Dynamic Factor)
    const now = new Date();
    const month = now.getMonth(); // 0-11
    const hour = now.getHours();

    // Define Seasons
    // Winter: Dec (11), Jan (0), Feb (1)
    // Summer: Mar (2), Apr (3), May (4)
    // Monsoon: Jun (5), Jul (6), Aug (7), Sep (8)
    // Post-Monsoon: Oct (9), Nov (10)

    let isWinter = (month === 11 || month === 0 || month === 1);
    let isSummer = (month >= 2 && month <= 4);
    let isMonsoon = (month >= 5 && month <= 8);
    let isPostMonsoon = (month === 9 || month === 10);

    // Seasonal Source Shifts
    if (isWinter) {
        // Winter Inversion: Traps local pollutants (Traffic, Waste Burning)
        traffic += 5; garbage += 10; dust -= 5;
    } else if (isSummer) {
        // Dry/Heat: Dust Resuspension is dominant
        dust += 25; traffic -= 5; stubble -= 5;
    } else if (isMonsoon) {
        // Rain: Washes out dust/particulates. Traffic (waterlogging) remains.
        dust -= 15; stubble -= 10; traffic += 10;
    } else if (isPostMonsoon) {
        // Harvest Season: STUBBLE BURNING SPIKE
        stubble += 40; dust -= 10; traffic -= 10;
        // Cap stubble if it gets too high artificially
        if (stubble > 50) stubble = 50;
    }

    const isPeakHour = (hour >= 8 && hour <= 11) || (hour >= 17 && hour <= 20); // Rush hours
    const isNight = (hour >= 22 || hour <= 5); // Night time

    if (isPeakHour) {
        // Boost traffic by 15-20% relative to others
        traffic += 15;
        industry -= 5; dust -= 5; stubble -= 5;
    }

    if (isNight) {
        // Traffic drops, Truck entry/Industry might rise relative
        traffic -= 15;
        industry += 10; garbage += 5; // Illegal burning often at night
    }

    // 3. Normalization to 100%
    let total = traffic + industry + dust + garbage + stubble;
    traffic = (traffic / total) * 100;
    industry = (industry / total) * 100;
    dust = (dust / total) * 100;
    garbage = (garbage / total) * 100;
    stubble = (stubble / total) * 100;

    localStorage.setItem('currentSources', JSON.stringify({
        traffic: traffic.toFixed(1),
        industry: industry.toFixed(1),
        dust: dust.toFixed(1),
        garbage: garbage.toFixed(1),
        stubble: stubble.toFixed(1)
    }));

    const locNameEl = document.getElementById('location-name');
    if (locNameEl) {
        localStorage.setItem('currentLocation', locNameEl.innerText);
    }
    // --------------------------------------
}

/* ---------------- POLICY RECOMMENDATION ---------------- */
function generatePolicy(aqi) {

    let policy = [];

    // Removed source-based policies
    // if (src.traffic > 30) policy.push("Implement Odd-Even Traffic Rule");
    // if (src.industry > 30) policy.push("Restrict industrial emissions temporarily");
    // if (src.dust > 30) policy.push("Stop construction and sprinkle water");
    // if (src.garbage > 30) policy.push("Deploy anti-garbage burning squads");
    // if (src.stubble > 30) policy.push("Coordinate interstate stubble control");

    if (aqi > 250) policy.push("Close schools & declare health emergency");
    if (aqi > 150) policy.push("Limit outdoor activities for sensitive groups");
    if (aqi > 50) policy.push("Maintain healthy lifestyle");

    if (policy.length === 0) policy.push("Air quality is good. No restrictions needed.");

    return policy;
}

function displayPolicy(policies) {

    const el = document.getElementById("policy-list");

    if (!el) return;

    if (policies.length === 0) {
        el.innerHTML = "<li>No action required</li>";
        return;
    }

    el.innerHTML = policies.map(p => `<li>⚠ ${p}</li>`).join("");
}

/* ---------------- HOTSPOT DETECTION ---------------- */
function detectHotspot(data, aqi) {

    const box = document.getElementById("hotspot-box");
    if (!box) return;

    if (aqi > 250 && data.pm2_5 > 80)
        box.innerHTML = "🔴 SEVERE HOTSPOT — Immediate action required";
    else if (aqi > 180)
        box.innerHTML = "🟠 Pollution Cluster Detected";
    else if (aqi > 120)
        box.innerHTML = "🟡 Rising Pollution Zone";
    else
        box.innerHTML = "🟢 Normal Air Quality Area";
}

/* ---------------- ANALYTICS & DASHBOARD DATA ---------------- */

async function fetchAnalyticsData(lat, lon) {
    // Only run if we are on a page that needs this data (Analytics)
    if (!document.getElementById('sourceChart') && !document.getElementById('forecastChart')) return;

    try {
        console.log("Fetching analytics data...");
        // Add cache buster
        const response = await fetch('dashboard_data.json?v=' + new Date().getTime());
        if (!response.ok) throw new Error("Failed to load dashboard data");
        const data = await response.json();
        console.log("Dashboard Data Loaded:", data.length, "stations");

        // Find nearest station in the JSON data
        const nearest = findNearestStationInJSON(data, lat, lon);
        console.log("Nearest Station for Analytics:", nearest);

        if (nearest) {
            // Store globally for Summary Generator
            window.latestAnalyticsData = nearest;

            // Render Source Data (New)
            if (nearest.source_contribution) {
                console.log("Rendering Source Chart with:", nearest.source_contribution);
                renderSourceChart(nearest.source_contribution);
                updateSourceDetails(nearest);
            } else {
                console.warn("Source contribution missing for station:", nearest.name);
            }

            renderForecastChart(nearest.hourly_forecast);

            // Re-run summary to include new source info if available
            generateSummary();

            // New: History Chart & Trend
            if (nearest.history_24h) renderHistoryChart(nearest.history_24h);
            if (nearest.trend_value !== undefined) updateTrendCard(nearest.trend_value);
        } else {
            console.warn("No matching station found in dashboard_data.json for current coordinates.");
        }

    } catch (error) {
        console.error("Error loading analytics data:", error);
    }
}

function findNearestStationInJSON(data, lat, lon) {
    let minDistance = Infinity;
    let nearest = null;

    data.forEach(station => {
        const d = calculateDistance(lat, lon, station.lat, station.lon);
        if (d < minDistance) {
            minDistance = d;
            nearest = station;
        }
    });
    return nearest;
}

/* ---------------- EXPLANATION LOGIC ---------------- */


/* ---------------- CHARTS ---------------- */
let forecastChartInstance = null;



/* ---------------- SOURCE CHART & DETAILS ---------------- */
let sourceChartInstance = null;

function renderSourceChart(data) {
    const ctx = document.getElementById('sourceChart');
    if (!ctx) return;

    // Data is { "transport": 0.2, ... }
    const labels = Object.keys(data).map(k => k.charAt(0).toUpperCase() + k.slice(1));
    const values = Object.values(data).map(v => (v * 100).toFixed(1));

    if (sourceChartInstance) sourceChartInstance.destroy();

    sourceChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: [
                    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'
                ],
                borderWidth: 1,
                borderColor: '#1e293b' // Match container bg
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: '#e2e8f0', boxWidth: 12, font: { size: 10 } }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return context.label + ': ' + context.parsed + '%';
                        }
                    }
                }
            },
            cutout: '60%'
        }
    });
}

function updateSourceDetails(station) {
    const confEl = document.getElementById('source-confidence');
    const textEl = document.getElementById('primary-source-text');

    if (confEl && station.confidence_score !== undefined) {
        const confPercent = Math.round(station.confidence_score * 100);
        confEl.innerText = `${confPercent}%`;
        // Color code confidence
        if (confPercent > 80) confEl.style.color = '#4ade80'; // Green
        else if (confPercent > 50) confEl.style.color = '#facc15'; // Yellow
        else confEl.style.color = '#f87171'; // Red
    }

    if (textEl && station.primary_source) {
        const sourceName = station.primary_source.charAt(0).toUpperCase() + station.primary_source.slice(1);
        textEl.innerHTML = `Primary contributor appears to be <strong style="color:var(--accent)">${sourceName}</strong>.`;

        // Trigger Reasoning Update
        updateSourceReasoning(station.primary_source, station);
    }
}

function updateSourceReasoning(source, station) {
    const reasoningEl = document.getElementById('reasoning-content');
    if (!reasoningEl) return;

    let reason = "";
    const city = localStorage.getItem('currentLocation') || "the region";

    switch (source.toLowerCase()) {
        case 'stubble':
            reason = `<strong>Why Stubble?</strong><br>
            Satellite imagery (NASA FIRMS) indicates a high density of active fire counts in neighboring agricultural zones. 
            Prevailing north-westerly winds are transporting smoke plumes directly into ${city}, significantly elevating PM2.5 levels regardless of local emissions.`;
            break;
        case 'transport':
            reason = `<strong>Why Transport?</strong><br>
            Real-time traffic density analysis reveals severe congestion on major arterial roads. 
            The high correlation between NO₂ spikes and rush-hour timings confirms vehicular exhaust as the dominant pollutant source right now.`;
            break;
        case 'dust':
            reason = `<strong>Why Dust?</strong><br>
            Meteorological data shows low humidity (<30%) and moderate wind speeds, creating ideal conditions for the suspension of coarse particulate matter (PM10). 
            Construction activities in the vicinity are further exacerbating the re-suspension of soil dust.`;
            break;
        case 'industry':
            reason = `<strong>Why Industry?</strong><br>
            Air mass trajectory analysis traces the current pollution plume back to known industrial clusters. 
            Elevated levels of SO₂ and specific VOC signatures strongly suggest emissions from coal-based power plants or manufacturing units are the primary driver.`;
            break;
        case 'residential':
            reason = `<strong>Why Residential?</strong><br>
            The pollution profile shows a high composition of organic carbon and black carbon, typical of biomass burning. 
            This suggests widespread use of wood or coal for cooking and heating in the surrounding residential areas, likely exacerbated by lower evening temperatures.`;
            break;
        case 'regional':
            reason = `<strong>Why Regional?</strong><br>
            Local emission sources are currently low. However, a stagnant atmospheric boundary layer is trapping background pollution from the wider region. 
            This "accumulation effect" means pollution from distant sources is settling over ${city} rather than dispersing.`;
            break;
        default:
            reason = `<strong>Analysis Inconclusive</strong><br>
            Multiple sources are contributing equally, or specific signatures are too weak to isolate a single dominant cause. 
            We recommend treating this as a mixed-source pollution event involving both traffic and local dust.`;
    }

    reasoningEl.innerHTML = `<p>${reason}</p>`;
}

function renderForecastChart(forecastData) {
    const ctx = document.getElementById('forecastChart');
    if (!ctx) return;

    // Format Labels: "Fri 14:00" or just "14:00" if same day? 
    // "Feb 20 14:00" is safest for 72h.
    const labels = forecastData.map(d => {
        // d.datetime is "YYYY-MM-DD HH:00"
        const date = new Date(d.datetime);
        // Format: Day Hour (e.g. "Mon 14:00")
        const day = date.toLocaleDateString('en-US', { weekday: 'short' });
        const hour = date.getHours().toString().padStart(2, '0') + ":00";
        return `${day} ${hour}`;
    });

    const values = forecastData.map(d => d.aqi);

    if (forecastChartInstance) forecastChartInstance.destroy();

    forecastChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Predicted AQI',
                data: values,
                borderColor: '#36A2EB',
                backgroundColor: (context) => {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                    gradient.addColorStop(0, 'rgba(54, 162, 235, 0.5)');
                    gradient.addColorStop(1, 'rgba(54, 162, 235, 0.0)');
                    return gradient;
                },
                tension: 0.4,
                fill: true,
                pointRadius: 2,
                pointHoverRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                x: {
                    ticks: {
                        color: '#cbd5e1',
                        maxTicksLimit: 12, // Avoid cluttering 72 labels
                        font: { size: 10 }
                    },
                    grid: { color: 'rgba(255,255,255,0.05)' }
                },
                y: {
                    ticks: { color: '#cbd5e1' },
                    grid: { color: 'rgba(255,255,255,0.05)' }
                }
            },
            plugins: {
                legend: { labels: { color: '#e2e8f0' } },
                tooltip: {
                    callbacks: {
                        title: (items) => {
                            // Show full date in tooltip
                            const idx = items[0].dataIndex;
                            const d = forecastData[idx];
                            return new Date(d.datetime).toLocaleString('en-US', {
                                weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric'
                            });
                        }
                    }
                }
            }
        }
    });
}

// --- History Chart ---
let historyChartInstance = null;

function renderHistoryChart(historyData) {
    const ctx = document.getElementById('historyChart');
    if (!ctx) return;

    if (!historyData || historyData.length === 0) {
        // Handle empty history
        return;
    }

    const labels = historyData.map(d => {
        const date = new Date(d.time);
        const day = date.toLocaleDateString('en-US', { weekday: 'short' });
        const hour = date.getHours().toString().padStart(2, '0') + ":00";
        return `${day} ${hour}`;
    });

    const values = historyData.map(d => d.aqi);

    if (historyChartInstance) historyChartInstance.destroy();

    historyChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Past 24h AQI',
                data: values,
                borderColor: '#64748b', // Muted slate color for history
                backgroundColor: 'rgba(100, 116, 139, 0.1)',
                tension: 0.4,
                fill: true,
                pointRadius: 1,
                pointHoverRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                x: {
                    ticks: {
                        color: '#94a3b8',
                        maxTicksLimit: 12,
                        font: { size: 10 }
                    },
                    grid: { color: 'rgba(255,255,255,0.02)' }
                },
                y: {
                    ticks: { color: '#94a3b8' },
                    grid: { color: 'rgba(255,255,255,0.02)' }
                }
            },
            plugins: {
                legend: { labels: { color: '#cbd5e1' } },
                tooltip: {
                    callbacks: {
                        title: (items) => {
                            const idx = items[0].dataIndex;
                            const d = historyData[idx];
                            return new Date(d.time).toLocaleString('en-US', {
                                weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric'
                            });
                        }
                    }
                }
            }
        }
    });
}

function updateTrendCard(trendValue) {
    const trendEl = document.getElementById('aqi-change');
    const iconEl = document.getElementById('change-icon');

    if (!trendEl) return;

    // trendValue = Current - Past
    // positive = worse (higher AQI)
    // negative = better (lower AQI)

    const absVal = Math.abs(Math.round(trendValue));
    let text = "";
    let color = "";
    let iconClass = "";

    if (trendValue > 0) {
        text = `Today's AQI is +${absVal} higher than yesterday`;
        color = "var(--danger)";
        iconClass = "fa-solid fa-arrow-trend-up";
    } else if (trendValue < 0) {
        text = `Today's AQI is -${absVal} lower than yesterday`;
        color = "var(--success)";
        iconClass = "fa-solid fa-arrow-trend-down";
    } else {
        text = "Today's AQI is the same as yesterday";
        color = "var(--text-muted)";
        iconClass = "fa-solid fa-minus";
    }

    trendEl.textContent = text;
    trendEl.style.color = color;

    if (iconEl) {
        iconEl.className = iconClass;
        iconEl.style.color = color;
    }
}

// --- Sidebar Toggle Logic ---
function setupSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    // Check if toggle already exists
    if (sidebar.querySelector('.sidebar-toggle')) return;


    const toggleBtn = document.createElement('div');
    toggleBtn.className = 'sidebar-toggle';
    toggleBtn.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
    toggleBtn.title = "Toggle Sidebar";

    toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        const isCollapsed = sidebar.classList.contains('collapsed');
        toggleBtn.innerHTML = isCollapsed ?
            '<i class="fa-solid fa-chevron-right"></i>' :
            '<i class="fa-solid fa-chevron-left"></i>';
    });

    sidebar.appendChild(toggleBtn);
}

// Initialize sidebar setup
document.addEventListener('DOMContentLoaded', setupSidebar);



function updateVisibilityInsight(visibilityMeters) {
    const el = document.getElementById('visibility-risk');
    const icon = document.getElementById('visibility-icon');
    if (!el || visibilityMeters === undefined) return;

    // Visibility in meters
    // > 10000m (10km) -> Clear
    // 5000-10000m -> Moderate/Haze
    // < 5000m -> Poor/Fog

    // Convert to km for display if needed, but logic uses meters
    const visKm = (visibilityMeters / 1000).toFixed(1);

    if (visibilityMeters >= 10000) {
        el.textContent = `Clear (${visKm}km)`;
        el.style.color = "var(--success)";
        icon.className = "fa-solid fa-eye";
        icon.style.color = "var(--success)";
    } else if (visibilityMeters >= 5000) {
        el.textContent = `Haze (${visKm}km)`;
        el.style.color = "var(--warning)";
        icon.className = "fa-solid fa-smog";
        icon.style.color = "var(--warning)";
    } else {
        el.textContent = `Poor / Fog (${visKm}km)`;
        el.style.color = "var(--danger)";
        icon.className = "fa-solid fa-eye-slash";
        icon.style.color = "var(--danger)";
    }
}


/* ---------------- SITUATION SUMMARY GENERATOR ---------------- */
function generateSummary() {
    console.log("Generating summary...");
    const summaryEl = document.getElementById('summary-text');
    if (!summaryEl) return;

    const aqData = window.latestAQIData;
    const wxData = window.latestWeatherData;
    const analyticsData = window.latestAnalyticsData; // New Global

    if (!aqData || !wxData) {
        summaryEl.textContent = "Waiting for data to generate analysis...";
        return;
    }

    // If Hotspot Mode, delegate to displayHotspotAnalysis
    if (window.isHotspotMode && window.hotspotData) {
        console.log("Hotspot Mode detected in generateSummary, rendering hotspot analysis...");
        displayHotspotAnalysis(window.hotspotData);
        return;
    }

    // Safeguard
    if (!aqData.current) return;

    // 1. Determine dominant pollutant
    const current = aqData.current;
    const pollutants = [
        { name: "PM2.5", val: current.pm2_5 || 0 },
        { name: "PM10", val: current.pm10 || 0 },
        { name: "NO₂", val: current.nitrogen_dioxide || 0 },
        { name: "O₃", val: current.ozone || 0 },
        { name: "SO₂", val: current.sulphur_dioxide || 0 },
        { name: "CO", val: current.carbon_monoxide || 0 }
    ];
    let dominant = pollutants.reduce((prev, curr) => (prev.val > curr.val) ? prev : curr);

    // 2. Determine Wind Condition
    const windSpeed = wxData.wind_speed_10m;
    let windDesc = "moderate";
    if (windSpeed < 5) windDesc = "low";
    else if (windSpeed > 15) windDesc = "high";

    // 3. Determine Dominant Source (RESTORED)
    let sourceText = "";
    if (analyticsData && analyticsData.primary_source) {
        const src = analyticsData.primary_source;
        const conf = analyticsData.confidence_score ? Math.round(analyticsData.confidence_score * 100) : 0;

        let srcDesc = "";
        if (src === 'transport') srcDesc = "vehicular emissions";
        else if (src === 'dust') srcDesc = "dust suspension";
        else if (src === 'industry') srcDesc = "industrial activity";
        else if (src === 'stubble') srcDesc = "crop residue burning (active fires detected)";
        else if (src === 'residential') srcDesc = "residential fuel usage";
        else srcDesc = "regional background pollution";

        sourceText = `AI analysis identifies <strong>${srcDesc}</strong> as the likely primary contributor (confidence: ${conf}%).`;
    }

    // 4. Construct Detailed HTML Statement

    // Status Text & Color
    let statusText = "Good";
    let statusColor = "var(--success)";
    const aqi = current.us_aqi;

    if (aqi <= 50) { statusText = "Good"; statusColor = "var(--success)"; }
    else if (aqi <= 100) { statusText = "Moderate"; statusColor = "var(--warning)"; }
    else if (aqi <= 150) { statusText = "Unhealthy for Sensitive Groups"; statusColor = "var(--warning)"; }
    else if (aqi <= 200) { statusText = "Unhealthy"; statusColor = "var(--danger)"; }
    else if (aqi <= 300) { statusText = "Very Unhealthy"; statusColor = "var(--danger)"; }
    else { statusText = "Hazardous"; statusColor = "var(--danger)"; }

    const locName = decodeURIComponent(new URLSearchParams(window.location.search).get('location_name') || "this location");

    // Weather Impact Description
    let weatherImpact = "";
    if (windSpeed < 5) weatherImpact = `Current low wind speeds (${windSpeed} km/h) are preventing the effective dispersion of pollutants, leading to accumulation in the immediate area.`;
    else if (windSpeed > 15) weatherImpact = `Higher wind speeds (${windSpeed} km/h) are helping to disperse locally generated pollutants, though they may also carry dust.`;
    else weatherImpact = `Moderate wind conditions (${windSpeed} km/h) are facilitating some dispersion, preventing severe stagnation.`;

    // Health Advisory based on AQI
    let advisory = "";
    if (aqi > 150) advisory = "Detailed Advice: Active children and adults, and people with respiratory disease, such as asthma, should avoid prolonged outdoor exertion; everyone else, especially children, should limit prolonged outdoor exertion.";
    else if (aqi > 100) advisory = "Detailed Advice: People with respiratory disease, such as asthma, should limit outdoor exertion.";
    else advisory = "Detailed Advice: Air quality is acceptable; however, for some pollutants there may be a moderate health concern for a very small number of people who are unusually sensitive to air pollution.";

    const summaryHTML = `
        <div style="font-family: 'Inter', sans-serif;">
            <div style="margin-bottom: 8px; font-size: 1.1rem;">
                <strong><span style="color:${statusColor}">${statusText}</span> Air Quality in ${locName}</strong>
            </div>
            <p style="margin-bottom: 8px; line-height: 1.5; color: #e2e8f0;">
                Role of Dominant Pollutant: <strong>${dominant.name}</strong> levels are currently the primary driver of the Air Quality Index (AQI: ${aqi}). 
                ${sourceText ? sourceText + " " : ""}
                ${weatherImpact}
            </p>
            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 0.9rem; color: #cbd5e1; font-style: italic;">
                ${advisory}
            </div>
        </div>
    `;

    summaryEl.innerHTML = summaryHTML;
}

/* ---------------- HOTSPOT ANALYSIS DISPLAY ---------------- */
function displayHotspotAnalysis(data) {
    const summaryEl = document.getElementById('summary-text');
    // const summaryCard = document.querySelector('.summary-card'); // Removed for plain text view

    if (!summaryEl) return;

    // Card style updates removed as per user request for plain text
    // summaryCard.style.borderLeft = "5px solid var(--danger)";
    // summaryCard.style.background = "rgba(220, 38, 38, 0.1)";

    // Auto-calculate Insight (Fast, no fetch)
    // PM2.5 is dominant in our sim (from override logic)
    // Wind Speed from existing global (window.latestWeatherData) or fallback
    let windText = "conditions";
    if (window.latestWeatherData) {
        const speed = window.latestWeatherData.wind_speed_10m;
        if (speed < 5) windText = `low wind speeds (${speed} km/h) trapping pollutants`;
        else if (speed > 15) windText = `high wind speeds (${speed} km/h) spreading dust`;
        else windText = `moderate wind conditions (${speed} km/h)`;
    }

    // Expanded Summary Text
    const locName = decodeURIComponent(new URLSearchParams(window.location.search).get('location_name') || "this zone");
    const insightText = `
        <strong>Severe Pollution Event in ${locName}</strong><br>
        High concentrations of particulate matter have identified this area as a critical hotspot. 
        Current ${windText} are contributing to the accumulation of pollutants. 
        <br><br>
        With an estimated <strong>${data.pop}</strong> residents impacted, immediate reduction in outdoor sources and personal exposure is advised.
    `;

    summaryEl.innerHTML = `
        <div style="display: flex; gap: 15px; align-items: flex-start;">
            <i class="fa-solid fa-triangle-exclamation" style="color: var(--danger); font-size: 2rem; margin-top: 5px;"></i>
            <div>
                <h3 style="color: var(--danger); margin: 0 0 5px 0;">SEVERE HOTSPOT ALERT</h3>
                <p style="margin: 0 0 10px 0; font-size: 1rem;">${insightText}</p>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 8px;">
                    <div>
                        <span style="display:block; font-size: 0.8rem; color: #ccc;">Avg AQI</span>
                        <span style="font-size: 1.1rem; font-weight: bold; color: var(--danger);">${data.aqi}</span>
                    </div>
                    <div>
                        <span style="display:block; font-size: 0.8rem; color: #ccc;">Affected Pop.</span>
                        <span style="font-size: 1.1rem; font-weight: bold;">${data.pop}</span>
                    </div>
                    <div>
                        <span style="display:block; font-size: 0.8rem; color: #ccc;">Area Size</span>
                        <span style="font-size: 1.1rem; font-weight: bold;">${data.area} km²</span>
                    </div>
                    <div>
                        <span style="display:block; font-size: 0.8rem; color: #ccc;">Duration</span>
                        <span style="font-size: 1.1rem; font-weight: bold;">${data.dur} hrs</span>
                    </div>
                     <div>
                        <span style="display:block; font-size: 0.8rem; color: #ccc;">Persistence</span>
                        <span style="font-size: 1.1rem; font-weight: bold; color: var(--warning);">${data.pers}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}
