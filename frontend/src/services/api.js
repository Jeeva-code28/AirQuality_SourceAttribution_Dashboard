

import { GLOBAL_CITIES } from '../data/cities.js';

const AQ_BASE_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const WEATHER_BASE_URL = 'https://api.open-meteo.com/v1/forecast';
const GEO_BASE_URL = 'https://geocoding-api.open-meteo.com/v1/search';

/**
 * Fetch Air Quality Data from Open-Meteo
 * @param {number} lat 
 * @param {number} lon 
 * @param {boolean} includeHistory - Whether to fetch extra history (handled separately in valid Open-Meteo calls usually)
 * @returns {Promise<Object>}
 */
// --- Centralized Throttling ---
// Open-Meteo free tier limit: ~600 requests/minute (10/sec).
// Burst limit is likely strict.
// STRICT SERIAL MODE: We wait for the previous request to COMPLETELY FINISH before starting the next.
const REQUEST_DELAY_MS = 100; // Reduced from 600ms for faster loading, still safe for Open-Meteo
let lastRequestTime = 0;
let requestQueue = Promise.resolve();

/**
 * Queues a fetch request to ensure sequential execution with delay
 * @param {string} url 
 * @param {Object} options 
 * @returns {Promise<Response>}
 */
async function fetchWithThrottle(url, options = {}) {
    // We want to append this request to the end of the queue
    // and return a promise that resolves when THIS request finishes.

    const processRequest = async () => {
        // 1. Enforce delay since LAST request finished
        const now = Date.now();
        const timeSinceLast = now - lastRequestTime;

        if (timeSinceLast < REQUEST_DELAY_MS) {
            await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY_MS - timeSinceLast));
        }

        // 2. Execute Fetch
        try {
            const response = await fetch(url, options);

            // Check for 429 - if hit, we should pause the queue longer
            if (response.status === 429) {
                console.warn("Global Throttler caught 429. Pausing queue for 5 seconds...");
                lastRequestTime = Date.now() + 5000; // Fake the last time to force a 5s delay for next guy
                // We return response so caller can handle retry or fail
            } else {
                lastRequestTime = Date.now();
            }

            return response;
        } catch (error) {
            lastRequestTime = Date.now(); // Mark finish even on error
            throw error;
        }
    };

    // Append to queue
    // We chain off the current queue promise. 
    // IMPORTANT: We catch errors in the chain so the queue doesn't stick in a rejected state.
    const resultPromise = requestQueue.then(processRequest, processRequest);

    // Update the queue pointer for the next request
    requestQueue = resultPromise.catch(() => { });

    return resultPromise;
}


/**
 * Fetch Air Quality Data from Open-Meteo
 * @param {number} lat 
 * @param {number} lon 
 * @param {boolean} includeHistory - Whether to fetch extra history (handled separately in valid Open-Meteo calls usually)
 * @returns {Promise<Object>}
 */
export async function getAirQuality(lat, lon, includeHistory = false) {
    try {
        const response = await fetchWithThrottle(`${BACKEND_BASE_URL}/current?lat=${lat}&lon=${lon}`);

        if (!response.ok) {
            throw new Error(`Backend API error: ${response.status}`);
        }

        const data = await response.json();

        // Validate AQI Data - Filter out unrealistic values
        if (data && data.current && data.current.us_aqi > 1000) {
            console.warn(`Filtered out unrealistic AQI: ${data.current.us_aqi}`);
            data.current.us_aqi = null; // Set to null effectively marking it as "No Data"
        }

        return data;
    } catch (error) {
        console.error("Error fetching AQI data from backend:", error);
        // Fallback Mock Data so UI renders flawlessly without backend
        return {
            current: { us_aqi: 142, pm2_5: 55, pm10: 98, nitrogen_dioxide: 22, sulphur_dioxide: 15, ozone: 45, carbon_monoxide: 400, time: new Date().toISOString() }
        };
    }
}

/**
 * Fetch Historical AQI Data from Open-Meteo (past 7 days by default, or more)
 */
export async function getHistoricalAirQuality(lat, lon) {
    try {
        const response = await fetchWithThrottle(`${BACKEND_BASE_URL}/history?lat=${lat}&lon=${lon}`);

        if (!response.ok) {
            throw new Error(`Backend History API error: ${response.status}`);
        }

        const data = await response.json();

        // Process into daily data for heatmaps/trends if data exists
        if (data && data.hourly) {
            processHistoryData(data);
        }

        return data;
    } catch (error) {
        console.error("Error fetching history from backend:", error);
        // Fallback Mock History Data
        const times = Array.from({ length: 24 }, (_, i) => {
            const d = new Date();
            d.setHours(d.getHours() - (23 - i));
            return d.toISOString();
        });
        const dailyTimes = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return d.toISOString().split('T')[0];
        });
        return {
            hourly: { time: times, us_aqi: Array(24).fill(142).map((v, i) => v + Math.sin(i) * 20), pm2_5: Array(24).fill(55), pm10: Array(24).fill(98) },
            daily: { time: dailyTimes, us_aqi_max: Array(7).fill(160).map((v, i) => v - (i * 5)) }
        };
    }
}


// Helper to process daily stats from hourly
function processHistoryData(data) {
    if (data.hourly && data.hourly.time && data.hourly.us_aqi) {
        const dailyStats = {};
        data.hourly.time.forEach((timeStr, index) => {
            const date = timeStr.split('T')[0];
            if (!dailyStats[date]) dailyStats[date] = [];
            const aqi = data.hourly.us_aqi[index];
            if (aqi !== null && aqi !== undefined) dailyStats[date].push(aqi);
        });

        const dailyTime = Object.keys(dailyStats).sort();
        const dailyMaxAQI = dailyTime.map(date => {
            const values = dailyStats[date];
            return values.length > 0 ? Math.max(...values) : 0;
        });

        data.daily = {
            time: dailyTime,
            us_aqi_max: dailyMaxAQI
        };
    }
}

/**
 * Fetch Weather Data (Existing Open-Meteo implementation)
 * @param {number} lat 
 * @param {number} lon 
 * @returns {Promise<Object>}
 */
export async function getWeather(lat, lon) {
    try {
        const response = await fetchWithThrottle(
            `${WEATHER_BASE_URL}?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,visibility&timezone=auto`
        );
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        return data; // Existing component likely expects raw Open-Meteo structure or specific fields
    } catch (error) {
        console.error("Error fetching Weather data:", error);
        return {
            current: { temperature_2m: 29, relative_humidity_2m: 60, wind_speed_10m: 10, visibility: 12000, time: new Date().toISOString() }
        };
    }
}

/**
 * Fetch AQI for multiple major cities to create a ranking
 * Uses Open-Meteo Bulk/Multiple Coordinate system
 * @returns {Promise<Array>}
 */
export async function getCityRankings() {
    // Updated list to match new street-level names or partial matches
    const metroCityKeywords = [
        'Delhi', 'Mumbai', 'Kolkata', 'Chennai', 'Bangalore', 'Bengaluru',
        'Hyderabad', 'Ahmedabad', 'Pune', 'Lucknow', 'Patna'
    ];

    try {
        // Reuse the global station fetch logic (it hits local DB, so it's fast)
        const allStations = await getGlobalStations();

        // Group by keyword to ensure uniqueness (take MAX AQI for the city)
        const uniqueMetroCities = [];

        metroCityKeywords.forEach(keyword => {
            // Find all stations matching this city keyword
            const matches = allStations.filter(station =>
                station.station.name.toLowerCase().includes(keyword.toLowerCase())
            );

            if (matches.length > 0) {
                // Find the one with highest AQI to represent the city (worst-case scenario)
                const maxAqiStation = matches.reduce((prev, current) =>
                    (prev.aqi > current.aqi) ? prev : current
                );

                uniqueMetroCities.push({
                    name: keyword, // Use the proper City Name (e.g. "Delhi") instead of station name
                    stationName: maxAqiStation.station.name, // Keep ref to specific station
                    state: maxAqiStation.station.country,
                    aqi: maxAqiStation.aqi || 0,
                    displayAqi: maxAqiStation.aqi || 0,
                    status: getAQILevel(maxAqiStation.aqi).label,
                    color: getAQILevel(maxAqiStation.aqi).color,
                    bg: getAQILevel(maxAqiStation.aqi).bg
                });
            }
        });

        // Deduplicate aliases (e.g. Bangalore/Bengaluru) - simple check
        // If both present, take the one with higher AQI or just unique name? 
        // For now, keywords are distinct enough or we just display what matches.
        // Actually, let's just sort.

        return uniqueMetroCities.sort((a, b) => b.aqi - a.aqi);

    } catch (error) {
        console.error("Error fetching city rankings:", error);
        return [];
    }
}

/**
 * Fetch Top 10 Most Polluted Cities (Global)
 */
export async function getMostPollutedCities() {
    try {
        const allStations = await getGlobalStations();

        // Filter out bad data (0 or null)
        const validStations = allStations.filter(s => s.aqi && s.aqi > 0);

        // Sort by AQI descending to process worst first
        validStations.sort((a, b) => b.aqi - a.aqi);

        // Deduplicate cities properties
        const seenCities = new Set();
        const uniqueCities = [];

        for (const station of validStations) {
            if (uniqueCities.length >= 10) break;

            // Heuristic: Extract City from "Locality, City" or "City"
            // If name has a comma, take the last part. Else take the whole name.
            let cityName = station.station.name;
            if (cityName.includes(',')) {
                const parts = cityName.split(',');
                cityName = parts[parts.length - 1].trim();
            }

            // Normalize
            const cityKey = cityName.toLowerCase();

            if (!seenCities.has(cityKey)) {
                seenCities.add(cityKey);

                const aqiLevel = getAQILevel(station.aqi);
                uniqueCities.push({
                    name: cityName, // Use the City name for the list
                    stationName: station.station.name, // Keep original
                    state: station.station.country,
                    aqi: station.aqi,
                    displayAqi: station.aqi,
                    status: aqiLevel.label,
                    color: aqiLevel.color,
                    bg: aqiLevel.bg
                });
            }
        }

        return uniqueCities;

    } catch (error) {
        console.error("Error fetching most polluted cities:", error);
        return [];
    }
}

/**
 * Search for a location
 * @param {string} query 
 * @returns {Promise<Array>}
 */
export async function searchLocation(query) {
    if (!query || query.length < 3) return [];
    try {
        // Prioritize Delhi Region (NCR)
        // Viewbox approx: 76.8, 28.4, 77.5, 28.9 (West, South, East, North)
        const viewbox = "76.8,28.9,77.5,28.4";

        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&viewbox=${viewbox}&bounded=0&addressdetails=1&limit=10&countrycodes=in`
        );

        if (!response.ok) throw new Error("Search failed");

        const data = await response.json();

        return data.map(item => ({
            name: item.display_name,
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon),
            type: item.type,
            importance: item.importance
        }));
    } catch (error) {
        console.error("Error searching location:", error);
        return [];
    }
}


/**
 * Helper to get AQI label and color
 */
export function getAQILevel(aqi) {
    if (aqi === null || aqi === undefined || aqi === '-') return { label: 'No Data', color: 'text-slate-400', bg: 'bg-slate-400' };
    if (aqi <= 50) return { label: 'Good', color: 'text-[#00ddd0]', bg: 'bg-[#00ddd0]' };
    if (aqi <= 100) return { label: 'Moderate', color: 'text-[#fdd64b]', bg: 'bg-[#fdd64b]' };
    if (aqi <= 150) return { label: 'Unhealthy for Sensitive Groups', color: 'text-[#ff9b57]', bg: 'bg-[#ff9b57]' };
    if (aqi <= 200) return { label: 'Unhealthy', color: 'text-[#fe6a69]', bg: 'bg-[#fe6a69]' };
    if (aqi <= 300) return { label: 'Very Unhealthy', color: 'text-[#a155b9]', bg: 'bg-[#a155b9]' };
    return { label: 'Hazardous', color: 'text-[#b91c1c]', bg: 'bg-[#b91c1c]' };
}

/**
 * Fetch AQI stations near a location (using bounds to find center)
 * NOTE: Returns empty array as we are using static list for map
 * @returns {Promise<Array>}
 */
export async function getStationsInBounds(lat1, lon1, lat2, lon2) {
    // Dynamic search disabled
    return [];
}

/**
 * Fetch stations for major GLOBAL cities using Open-Meteo
 * Fetches in batches
 * @returns {Promise<Array>}
 */
/**
 * Fetch stations for major GLOBAL cities using Open-Meteo
 * Fetches in batches
 * @returns {Promise<Array>}
 */
let globalFetchPromise = null;

// --- Spring Boot Backend Integration ---
const BACKEND_BASE_URL = "http://localhost:8080/api/aqi";

export async function getGlobalStations(onProgress = null) {
    // If a fetch is already in progress, return the existing promise
    if (globalFetchPromise) {
        console.log("Reusing existing global fetch promise...");
        const results = await globalFetchPromise;
        // Output incremental progress not really possible with shared promise unless specific handling
        // but for now, just returning the final result is enough.
        return results;
    }

    // Otherwise, start a new fetch
    globalFetchPromise = (async () => {
        try {
            console.log("Fetching Global Stations from Spring Boot Backend...");

            const response = await fetch(`${BACKEND_BASE_URL}/global`);

            if (!response.ok) {
                throw new Error(`Backend error: ${response.status}`);
            }

            const data = await response.json();

            // Transform backend data to frontend model
            const results = data.map(station => ({
                uid: `station-${station.id}`,
                aqi: station.aqi,
                lat: station.lat,
                lon: station.lon,
                station: { name: station.name, country: station.country },
                time: { stime: station.updatedAt }
            })).filter(s => s.aqi !== null && s.aqi !== undefined && s.aqi > 0 && s.aqi <= 1000); // Strict filter

            console.log(`Loaded ${results.length} stations from Database.`);

            // Emit all at once since DB is fast
            if (onProgress && typeof onProgress === 'function') {
                onProgress(results);
            }

            return results;

        } catch (error) {
            console.error("Failed to load from backend:", error);
            // Fallback Global Stations
            const mockStations = [
                { uid: 'station-demo1', aqi: 185, lat: 28.6139, lon: 77.2090, station: { name: "New Delhi Monitoring Station", country: "India" }, time: { stime: new Date().toISOString() } },
                { uid: 'station-demo2', aqi: 142, lat: 19.0760, lon: 72.8777, station: { name: "Mumbai Central", country: "India" }, time: { stime: new Date().toISOString() } },
                { uid: 'station-demo3', aqi: 95, lat: 12.9716, lon: 77.5946, station: { name: "Bangalore Hub", country: "India" }, time: { stime: new Date().toISOString() } },
                { uid: 'station-demo4', aqi: 210, lat: 22.5726, lon: 88.3639, station: { name: "Kolkata North", country: "India" }, time: { stime: new Date().toISOString() } },
                { uid: 'station-demo5', aqi: 65, lat: 13.0827, lon: 80.2707, station: { name: "Chennai Coastal", country: "India" }, time: { stime: new Date().toISOString() } }
            ];
            if (onProgress && typeof onProgress === 'function') {
                onProgress(mockStations);
            }
            return mockStations;
        } finally {
            globalFetchPromise = null; // Reset promise when done
        }
    })();

    return globalFetchPromise;
}

// Trigger backend refresh manually
export async function triggerBackendRefresh() {
    try {
        await fetch(`${BACKEND_BASE_URL}/refresh`, { method: 'POST' });
        console.log("Backend refresh triggered.");
    } catch (e) {
        console.error("Failed to trigger refresh:", e);
    }
}

/**
 * Reverse geocode coordinates to get city name
 * @param {number} lat 
 * @param {number} lon 
 * @returns {Promise<Object>}
 */
export async function reverseGeocode(lat, lon) {
    try {
        // Use OpenStreetMap Nominatim API as it is more reliable and free
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`);

        if (!response.ok) throw new Error("Reverse geocoding failed");

        const data = await response.json();
        const address = data.address || {};

        // Extract precise area (suburb, neighbourhood, road, etc.)
        const area = address.suburb || address.neighbourhood || address.residential || address.road || address.hamlet;

        // Extract city/town level
        const city = address.city || address.town || address.village || address.county || address.state_district;

        let locationName = city || "My Location";

        // Construct cleaner name: "Area, City"
        if (area && city && !city.includes(area) && !area.includes(city)) {
            locationName = `${area}, ${city}`;
        } else if (area) {
            locationName = area;
        }

        return {
            name: locationName,
            country: address.country || "Unknown"
        };
    } catch (error) {
        console.error("Error reversing location:", error);
        return { name: "My Location", country: "" };
    }
}
/**
 * Calculate Safe Route
 * @param {Object} start {lat, lon}
 * @param {Object} end {lat, lon}
 * @param {string} mode "JOGGER", "CYCLIST", "DRIVER"
 * @returns {Promise<Object>}
 */
export async function calculateRoute(start, end, mode = "DRIVER") {
    try {
        const response = await fetch(`${BACKEND_BASE_URL.replace('/aqi', '')}/routes/calculate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                startLat: start.lat,
                startLon: start.lon,
                endLat: end.lat,
                endLon: end.lon,
                mode: mode
            })
        });

        if (!response.ok) throw new Error("Route calculation failed");

        // Return map of routes (green, yellow, red)
        return await response.json();
    } catch (error) {
        console.error("Error calculating route:", error);
        return null;
    }
}
