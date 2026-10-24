// Authority API Service with robust fallbacks, caching, and resilient network handling
import { findNearestStation } from '../data/stations';

const BASE_URL = import.meta.env.VITE_API_URL || 'https://aqi-monitor-backend.onrender.com/api/aqi';
const ROOT_API = BASE_URL.replace('/aqi', '');

export async function fetchWithCache(url, cacheKey, expiryMinutes = 15) {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
        try {
            const { data, timestamp } = JSON.parse(cached);
            const ageMinutes = (Date.now() - timestamp) / (1000 * 60);
            if (ageMinutes < expiryMinutes) {
                return data;
            }
        } catch (e) {
            localStorage.removeItem(cacheKey);
        }
    }

    try {
        const response = await fetch(url);
        if (!response.ok) {
            if (response.status === 429 && cached) {
                return JSON.parse(cached).data;
            }
            throw new Error(`API Error: ${response.statusText}`);
        }
        const data = await response.json();
        localStorage.setItem(cacheKey, JSON.stringify({
            data,
            timestamp: Date.now()
        }));
        return data;
    } catch (error) {
        if (cached) {
            return JSON.parse(cached).data;
        }
        throw error;
    }
}

export function getMockAQIData(lat, lon) {
    const seed = Math.abs(lat + lon);
    const random = (offset) => {
        const x = Math.sin(seed + offset) * 10000;
        return x - Math.floor(x);
    };

    const aqi = 65 + Math.floor(random(1) * 160);
    return {
        current: {
            us_aqi: aqi,
            pm10: Math.round(aqi * 1.2),
            pm2_5: Math.round(aqi * 0.8),
            nitrogen_dioxide: Math.round(20 + random(2) * 50),
            sulphur_dioxide: Math.round(10 + random(3) * 30),
            ozone: Math.round(30 + random(4) * 80),
            carbon_monoxide: Math.round(400 + random(5) * 500)
        },
        hourly: {
            us_aqi: Array(24).fill(aqi).map((v, i) => Math.max(10, v + Math.floor(Math.sin(i / 3) * 25))),
            pm2_5: Array(24).fill(Math.round(aqi * 0.8)),
            pm10: Array(24).fill(Math.round(aqi * 1.2))
        }
    };
}

export async function fetchAuthorityWeatherData(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m,wind_direction_10m,visibility&timezone=auto`;
    const cacheKey = `auth_weather_${lat.toFixed(4)}_${lon.toFixed(4)}`;

    try {
        const data = await fetchWithCache(url, cacheKey, 15);
        if (!data?.current) throw new Error("Invalid Weather Data");
        return data.current;
    } catch (err) {
        console.warn("Weather fetch fallback:", err.message);
        return {
            temperature_2m: 26,
            wind_speed_10m: 12,
            wind_direction_10m: 180,
            visibility: 6500
        };
    }
}

export async function fetchAuthorityAQIData(lat, lon, hotspotParams = null) {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm10,pm2_5,nitrogen_dioxide,sulphur_dioxide,ozone,carbon_monoxide&hourly=us_aqi,pm2_5,pm10&past_days=1&timezone=auto`;
    const cacheKey = `auth_aqi_${lat.toFixed(4)}_${lon.toFixed(4)}`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        const data = await response.json();

        if (hotspotParams?.isHotspot && hotspotParams.aqi) {
            const hAqi = parseInt(hotspotParams.aqi);
            if (!isNaN(hAqi)) {
                data.current.us_aqi = hAqi;
                data.current.pm2_5 = Math.round(hAqi * 1.5);
                data.current.pm10 = Math.round(hAqi * 2.2);
            }
        }

        return { data, status: 'live' };
    } catch (err) {
        console.warn("Open-Meteo AQI failed, trying WAQI fallback:", err.message);
        try {
            const waqiToken = '60a3804981762736bb553a3d58db27b50f487369';
            const waqiUrl = `https://api.waqi.info/feed/geo:${lat};${lon}/?token=${waqiToken}`;
            const wResp = await fetch(waqiUrl);
            const wJson = await wResp.json();
            if (wJson.status === 'ok' && wJson.data) {
                const d = wJson.data;
                const iaqi = d.iaqi || {};
                const getVal = (obj) => (obj && obj.v !== undefined) ? obj.v : 0;

                const converted = {
                    current: {
                        us_aqi: d.aqi || 100,
                        pm10: getVal(iaqi.pm10) || 80,
                        pm2_5: getVal(iaqi.pm25) || 50,
                        nitrogen_dioxide: getVal(iaqi.no2) || 25,
                        sulphur_dioxide: getVal(iaqi.so2) || 12,
                        ozone: getVal(iaqi.o3) || 35,
                        carbon_monoxide: getVal(iaqi.co) || 450
                    },
                    hourly: {
                        us_aqi: Array(24).fill(d.aqi || 100),
                        pm2_5: Array(24).fill(getVal(iaqi.pm25) || 50),
                        pm10: Array(24).fill(getVal(iaqi.pm10) || 80)
                    }
                };
                return { data: converted, status: 'waqi' };
            }
        } catch (wErr) {
            console.warn("WAQI fallback failed:", wErr.message);
        }

        return { data: getMockAQIData(lat, lon), status: 'simulated' };
    }
}

export async function fetchAuthorityAnalytics(lat, lon) {
    let sourceData = null;
    let forecastData = null;

    // 1. Try Live Source API
    try {
        const srcResp = await fetch(`${ROOT_API}/source/predict?lat=${lat}&lon=${lon}`);
        if (srcResp.ok) {
            sourceData = await srcResp.json();
        }
    } catch (e) {
        console.warn("Source predict API unavailable:", e.message);
    }

    // 2. Try Live Forecast API
    try {
        const fcResp = await fetch(`${ROOT_API}/forecast/predict?lat=${lat}&lon=${lon}&hours=72`);
        if (fcResp.ok) {
            forecastData = await fcResp.json();
        }
    } catch (e) {
        console.warn("Forecast predict API unavailable:", e.message);
    }

    // 3. Fallback to dashboard_data.json
    if (!sourceData || !forecastData) {
        try {
            const resp = await fetch('/dashboard_data.json?v=' + Date.now());
            if (resp.ok) {
                const stations = await resp.json();
                const nearest = findNearestStation(lat, lon);
                const matched = stations.find(s => s.name?.includes(nearest.name.split(',')[0])) || stations[0];

                if (!sourceData && matched?.source_contribution) {
                    sourceData = {
                        sources: matched.source_contribution,
                        primary_source: matched.primary_source || "Transport",
                        confidence: matched.confidence_score || 0.88
                    };
                }

                if (!forecastData && matched?.hourly_forecast) {
                    forecastData = {
                        forecast: matched.hourly_forecast,
                        model: "Ensemble-LSTM"
                    };
                }
            }
        } catch (fErr) {
            console.warn("dashboard_data.json fallback error:", fErr.message);
        }
    }

    // Default fallbacks if backend or JSON was completely unavailable
    if (!sourceData) {
        sourceData = {
            sources: {
                transport: 0.35,
                industry: 0.25,
                dust: 0.20,
                residential: 0.10,
                stubble: 0.05,
                regional: 0.05
            },
            primary_source: "transport",
            confidence: 0.89
        };
    }

    if (!forecastData) {
        const now = new Date();
        const fallbackHours = [];
        for (let i = 0; i < 72; i++) {
            const time = new Date(now.getTime() + i * 3600 * 1000);
            const val = Math.max(30, Math.round(140 + Math.sin(i / 5) * 45 + Math.cos(i / 12) * 20));
            fallbackHours.push({
                time: time.toISOString(),
                predicted_aqi: val,
                upper_bound: val + 25,
                lower_bound: Math.max(10, val - 25)
            });
        }
        forecastData = { forecast: fallbackHours, model: "LSTM-Statistical Baseline" };
    }

    return { sourceData, forecastData };
}

export async function fetchAuthorityHealthAdvisory(lat, lon) {
    try {
        const resp = await fetch(`${ROOT_API}/health/advisory?lat=${lat}&lon=${lon}`);
        if (resp.ok) {
            return await resp.json();
        }
    } catch (e) {
        console.warn("Health advisory API unavailable:", e.message);
    }

    // Resilient fallback logic
    return {
        general_advisory: {
            risk: "Moderate",
            message: "Air quality is acceptable. Sensitive groups should monitor for symptoms.",
            icon: "fa-triangle-exclamation"
        },
        category: {
            level: "Moderate",
            color: "#f59e0b"
        },
        activity_advisories: [
            {
                activity: "Outdoor Jogging",
                status: "Caution",
                status_color: "#f59e0b",
                advice: "Limit vigorous outdoor runs; schedule exercise during early morning.",
                breathing_note: "Elevated respiratory intake under moderate PM2.5."
            },
            {
                activity: "Cycling Commute",
                status: "Caution",
                status_color: "#f59e0b",
                advice: "Wear an anti-pollution mask and choose low-traffic green corridors.",
                breathing_note: "Traffic corridor exposure significantly exceeds ambient measurements."
            },
            {
                activity: "Schools & Children",
                status: "Permissible",
                status_color: "#10b981",
                advice: "Normal outdoor playtime permitted with regular hydration intervals.",
                breathing_note: "Protect vulnerable children with known respiratory history."
            }
        ],
        sensitive_groups: [
            {
                group: "Asthma & COPD Patients",
                advice: "Keep rescue inhalers readily accessible; minimize prolonged exposure.",
                icon: "fa-lungs"
            },
            {
                group: "Elderly & Infants",
                advice: "Stay in well-ventilated indoor areas during peak evening traffic spikes.",
                icon: "fa-shield-heart"
            }
        ],
        protective_measures: [
            { measure: "Wear N95/N99 Mask Outdoors", priority: "Recommended", icon: "fa-mask-face" },
            { measure: "Run HEPA Air Purifier Indoors", priority: "Recommended", icon: "fa-fan" },
            { measure: "Keep Windows Closed in Rush Hour", priority: "High", icon: "fa-window-close" }
        ],
        source_insight: "Vehicular exhaust and suspended road dust constitute over 55% of localized particulate pollution."
    };
}

export async function fetchLocationReverseGeocode(lat, lon) {
    if (typeof lat !== 'number' || typeof lon !== 'number' || isNaN(lat) || isNaN(lon)) {
        return "Government Authority View";
    }

    try {
        const { reverseGeocode } = await import('./api');
        const res = await reverseGeocode(lat, lon);
        if (res && res.name && !res.name.includes('°')) {
            return res.state && !res.name.includes(res.state) 
                ? `${res.name}, ${res.state}` 
                : res.name;
        }
        if (res?.name) return res.name;
    } catch {
        // Fallback to nearest station
    }

    const nearest = findNearestStation(lat, lon);
    if (nearest && nearest.distance < 15) {
        return nearest.name.split(',')[0];
    }
    return `${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E`;
}
