import React, { useState, useEffect } from 'react';
import MainLayout from '../components/Layout/MainLayout';
import LocationHeader from '../components/Dashboard/Overview/LocationHeader';
import CurrentAQICard from '../components/Dashboard/Overview/CurrentAQICard';
import WeatherCard from '../components/Dashboard/Overview/WeatherCard';
import PollutantGrid from '../components/Dashboard/Pollutants/PollutantGrid';
import HistoricalAQIChart from '../components/Dashboard/Charts/HistoricalAQIChart';
import AnnualTrendChart from '../components/Dashboard/Charts/AnnualTrendChart';
import CalendarHeatmap from '../components/Dashboard/Charts/CalendarHeatmap';
import MetroCityGrid from '../components/Dashboard/Cities/MetroCityGrid';
import MostPollutedTable from '../components/Dashboard/Cities/MostPollutedTable';
import AQIMap from '../components/Dashboard/Map/AQIMap';
import HealthAdvisory from '../components/Dashboard/Advisory/HealthAdvisory';
import LocationComparison from '../components/Dashboard/Map/LocationComparison';
import SafeRouteMap from '../components/Dashboard/Map/SafeRouteMap';
import { getAirQuality, getWeather, getCityRankings, getNearestStationInfo } from '../services/api';
import { Compass, Map, Route, TrendingUp, HeartPulse, AlertCircle, X, ShieldAlert, ArrowRight, Navigation, MapPin } from 'lucide-react';

const TABS = [
    { id: 'home', label: 'Home / Air Quality', badge: 'Core', icon: Compass, desc: 'Current AQI, local conditions and daily guidance.' },
    { id: 'map', label: 'Explore Map', icon: Map, desc: 'Nearby readings and available monitoring locations.' },
    { id: 'routes', label: 'Route Planner', icon: Route, desc: 'Compare journey options and estimated exposure.' },
    { id: 'trends', label: 'Trends & Forecasts', icon: TrendingUp, desc: 'Historical data and validated predictions.' },
    { id: 'health', label: 'Health & Learn', icon: HeartPulse, desc: 'Pollution explanations and precautionary guidance.' }
];

export default function DashboardPage({ onSwitchPortal }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const [aqiData, setAqiData] = useState(null);
    const [weatherData, setWeatherData] = useState(null);
    const [cityRankings, setCityRankings] = useState([]);
    const [mostPolluted, setMostPolluted] = useState([]);
    const [geoNotice, setGeoNotice] = useState(null);
    const [matchedStation, setMatchedStation] = useState(null);
    const [deviceLocation, setDeviceLocation] = useState(() => {
        try {
            const saved = localStorage.getItem('aqi_device_loc');
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    });

    // Active Navigation Tab (matches Screenshot 5)
    const [activeTab, setActiveTab] = useState(() => {
        const hash = window.location.hash.replace('#', '');
        return TABS.some(t => t.id === hash) ? hash : 'home';
    });

    // Sync hash changes with activeTab
    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash.replace('#', '');
            if (TABS.some(t => t.id === hash)) {
                setActiveTab(hash);
            }
        };
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    const handleSelectTab = (tabId) => {
        setActiveTab(tabId);
        window.location.hash = tabId;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Load initial state from localStorage or default to Tambaram, Chennai
    const [coordinates, setCoordinates] = useState(() => {
        try {
            const saved = localStorage.getItem('aqi_coords');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed && typeof parsed.lat === 'number' && typeof parsed.lon === 'number') {
                    if (Math.abs(parsed.lat - 10.6652) < 0.005 && Math.abs(parsed.lon - 79.4441) < 0.005) {
                        return { lat: 12.9249, lon: 80.1472 };
                    }
                    return parsed;
                }
            }
        } catch (e) {
            console.error("Error parsing saved coordinates:", e);
        }
        return { lat: 12.9249, lon: 80.1472 }; // Verified Tambaram, Chennai
    });

    const [locationName, setLocationName] = useState(() => {
        const savedName = localStorage.getItem('aqi_location_name');
        if (savedName && (savedName.includes("Kasangulam") || savedName.includes("Mannargudi"))) {
            return "Tambaram, Chennai, Tamil Nadu";
        }
        return savedName || "Tambaram, Chennai, Tamil Nadu";
    });

    // Save to localStorage whenever location changes
    useEffect(() => {
        if (coordinates && typeof coordinates.lat === 'number' && typeof coordinates.lon === 'number') {
            localStorage.setItem('aqi_coords', JSON.stringify(coordinates));
        }
        localStorage.setItem('aqi_location_name', locationName);
    }, [coordinates, locationName]);

    // Dynamically calculate and match nearest monitoring station whenever coordinates change
    useEffect(() => {
        let active = true;
        if (coordinates && typeof coordinates.lat === 'number' && typeof coordinates.lon === 'number') {
            getNearestStationInfo(coordinates.lat, coordinates.lon).then((st) => {
                if (active && st) {
                    setMatchedStation(st);
                }
            });
        }
        return () => { active = false; };
    }, [coordinates]);

    useEffect(() => {
        const fetchData = async (isBackground = false) => {
            if (!coordinates || typeof coordinates.lat !== 'number' || typeof coordinates.lon !== 'number') {
                console.error("Invalid coordinates for fetch:", coordinates);
                setError("Invalid location data");
                setLoading(false);
                return;
            }

            if (!isBackground) {
                setLoading(true);
                setAqiData(null);
                setWeatherData(null);
            }

            try {
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Initial fetch timed out")), 15000)
                );

                const fetchPromise = Promise.all([
                    getAirQuality(coordinates.lat, coordinates.lon, false),
                    getWeather(coordinates.lat, coordinates.lon)
                ]);

                const [aqiCurrent, weather] = await Promise.race([fetchPromise, timeoutPromise]);

                if (aqiCurrent) setAqiData(aqiCurrent);
                if (weather) setWeatherData(weather);

                if (!isBackground) setLoading(false);

                // Fetch heavy historical data
                const { getHistoricalAirQuality } = await import('../services/api');
                const historyData = await getHistoricalAirQuality(coordinates.lat, coordinates.lon);

                if (historyData && aqiCurrent) {
                    setAqiData(prev => ({
                        ...prev,
                        hourly: historyData.hourly,
                        daily: historyData.daily
                    }));
                }

                // Fetch metro and city rankings
                const { getCityRankings, getMostPollutedCities } = await import('../services/api');
                const [metroData, pollutedData] = await Promise.all([
                    getCityRankings(),
                    getMostPollutedCities()
                ]);

                if (metroData) setCityRankings(metroData);
                if (pollutedData) setMostPolluted(pollutedData);

            } catch (err) {
                console.error("Failed to fetch dashboard data", err);
                if (!isBackground && !aqiData) setError("Failed to load data");
                if (!isBackground) setLoading(false);
            }
        };

        fetchData(false);
        const interval = setInterval(() => fetchData(true), 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [coordinates, retryCount]);

    const handleLocationSelect = (selectedLocation) => {
        console.log("Dashboard received location update:", selectedLocation);
        setGeoNotice(null);
        if (selectedLocation && typeof selectedLocation.lat === 'number') {
            setCoordinates({ lat: selectedLocation.lat, lon: selectedLocation.lon });
            setLocationName(`${selectedLocation.name}, ${selectedLocation.country || ''}`);
            setDeviceLocation(prev => ({
                ...(prev || {}),
                lat: selectedLocation.lat,
                lon: selectedLocation.lon,
                method: 'manual',
                isApproximate: false
            }));
        } else {
            console.error("Invalid location selected:", selectedLocation);
        }
    };

    const handleLocateMe = () => {
        if (!navigator.geolocation) {
            setGeoNotice("Geolocation is not supported by your browser. You can select your location or search above.");
            return;
        }

        console.log("Locating from Dashboard...");
        setLocationName("Locating live coordinates...");

        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude, accuracy } = position.coords;
            const isDesktop = !/Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            const isApprox = (typeof accuracy === 'number' && accuracy > 500) || isDesktop;

            const devLoc = {
                lat: latitude,
                lon: longitude,
                accuracy: accuracy || (isDesktop ? 2500 : 20),
                method: isApprox ? 'network_ip' : 'gps',
                isApproximate: isApprox,
                timestamp: Date.now()
            };
            setDeviceLocation(devLoc);
            try {
                localStorage.setItem('aqi_device_loc', JSON.stringify(devLoc));
            } catch (e) {
                // ignore
            }

            const { calibrateLiveCoordinates, reverseGeocode, getNearestStationInfo } = await import('../services/api');
            const calibrated = calibrateLiveCoordinates(latitude, longitude);

            const targetLat = calibrated.lat;
            const targetLon = calibrated.lon;
            setCoordinates({ lat: targetLat, lon: targetLon });

            // Dynamically resolve nearest station
            const station = await getNearestStationInfo(targetLat, targetLon);
            if (station) setMatchedStation(station);

            let resolvedName = "";
            if (calibrated.name) {
                resolvedName = calibrated.name;
                setLocationName(calibrated.name);
            } else {
                try {
                    const locationInfo = await reverseGeocode(targetLat, targetLon);
                    resolvedName = locationInfo.name ? `${locationInfo.name}, ${locationInfo.country || 'India'}` : "Tambaram, Chennai, Tamil Nadu";
                    setLocationName(resolvedName);
                } catch (e) {
                    console.error("Reverse geocode failed", e);
                    setLocationName("Tambaram, Chennai, Tamil Nadu");
                }
            }

            // If desktop detected approximate ISP location (e.g. Zone 14 Perungudi)
            if (isApprox) {
                setGeoNotice(
                    `Desktop browser approximate network location detected: ${resolvedName.split(',')[0]} (±${Math.round(accuracy || 2500)}m). On desktop without hardware GPS, browsers resolve through ISP gateways. If your physical position is West Tambaram, click below to calibrate.`
                );
            } else {
                setGeoNotice(null);
            }
        }, (error) => {
            console.warn("Location error:", error);
            setGeoNotice("GPS permission was denied or unavailable. You can search any locality or pick from saved favorites.");
        }, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        });
    };

    const handleStationSelect = React.useCallback((station) => {
        console.log("Station selected from Map:", station);
        setCoordinates({ lat: station.lat, lon: station.lon });
        setLocationName(`${station.station.name}, ${station.station.country || ''}`);
        handleSelectTab('home');
    }, []);

    return (
        <MainLayout
            onLocationSelect={handleLocationSelect}
            onSwitchPortal={onSwitchPortal}
            activeTab={activeTab}
            onSelectTab={handleSelectTab}
        >
            {/* Top Location Breadcrumbs, Matched Station & Favorite Switcher */}
            <LocationHeader
                location={locationName}
                coordinates={coordinates}
                onSelectLocation={handleLocationSelect}
                matchedStation={matchedStation}
                deviceLocation={deviceLocation}
            />

            {/* Geolocation Accuracy & Calibration Notice */}
            {geoNotice && (
                <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs text-amber-800 dark:text-amber-200 animate-fade-in shadow-sm">
                    <div className="flex items-center gap-2.5 flex-1 min-w-[280px]">
                        <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span className="leading-relaxed">{geoNotice}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={() => handleLocationSelect({
                                name: "West Tambaram, Chennai",
                                lat: 12.9230,
                                lon: 80.1180,
                                country: "India"
                            })}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
                        >
                            <MapPin className="w-3.5 h-3.5" />
                            <span>Switch to West Tambaram</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setGeoNotice(null)}
                            className="p-1 rounded-lg text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
                            aria-label="Dismiss notice"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* In-Page Navigation Bar (Screenshot 5 Citizen Portal Navigation) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 border-b border-slate-200 dark:border-slate-800 no-scrollbar">
                {TABS.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => handleSelectTab(tab.id)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                                isActive
                                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25'
                                    : 'bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-emerald-500/40'
                            }`}
                        >
                            <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                            <span>{tab.label}</span>
                            {tab.badge && (
                                <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-extrabold ${
                                    isActive ? 'bg-white/20 text-white' : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                }`}>
                                    {tab.badge}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* TAB 1: HOME / AIR QUALITY [CORE] */}
            {activeTab === 'home' && (
                <div className="space-y-8 animate-fade-in">
                    {/* Row 1: AQI Card & Weather */}
                    <div className="grid grid-cols-12 gap-6 lg:gap-8">
                        <CurrentAQICard
                            data={aqiData}
                            loading={loading}
                            error={error}
                            onLocate={handleLocateMe}
                            onRetry={() => setRetryCount(c => c + 1)}
                            locationName={locationName}
                            matchedStation={matchedStation}
                            deviceLocation={deviceLocation}
                        />
                        <div id="weather-card" className="col-span-12 lg:col-span-4 h-full">
                            <WeatherCard data={weatherData} loading={loading} />
                        </div>
                    </div>

                    {/* Row 2: Major Pollutants */}
                    <PollutantGrid data={aqiData} loading={loading} />

                    {/* Quick Citizen Action Cards (Phase 1 & 2 bridges) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Health Quick Summary Card */}
                        <div className="p-6 bg-gradient-to-br from-white to-emerald-50/50 dark:from-[#1e293b]/70 dark:to-emerald-950/20 rounded-3xl border border-slate-200 dark:border-slate-700/60 shadow-lg flex flex-col justify-between">
                            <div>
                                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider mb-2">
                                    <HeartPulse className="w-4 h-4" />
                                    <span>Today&apos;s Health Guidance Snapshot</span>
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1.5">
                                    {aqiData?.current?.us_aqi <= 50 ? "Air Quality is Favorable for Outdoor Activities" :
                                     aqiData?.current?.us_aqi <= 100 ? "Acceptable Air Quality • Moderate Exercise Caution" :
                                     "Elevated Air Quality Risk • Limit Strenuous Outdoor Activity"}
                                </h3>
                                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                                    {aqiData?.current?.us_aqi <= 100
                                        ? "Sensitive individuals (asthma, cardiovascular conditions, children) should monitor exertion. Outdoor exercise is generally safe."
                                        : "Sensitive groups should wear certified N95 masks outdoors and keep windows closed during peak commute hours."}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleSelectTab('health')}
                                className="inline-flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                            >
                                <span>View Full Evidence-Based Health & Exercise Guidance</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Route & Map Quick Card */}
                        <div className="p-6 bg-gradient-to-br from-white to-cyan-50/50 dark:from-[#1e293b]/70 dark:to-cyan-950/20 rounded-3xl border border-slate-200 dark:border-slate-700/60 shadow-lg flex flex-col justify-between">
                            <div>
                                <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 font-bold text-xs uppercase tracking-wider mb-2">
                                    <Route className="w-4 h-4" />
                                    <span>Pollution-Aware Commute Planning</span>
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1.5">
                                    Compare Travel Routes & Minimize Inhaled Smoke
                                </h3>
                                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                                    BreatheLens uses OSRM routing and ambient pollutant grids to calculate trade-offs between travel time, distance, and cumulative inhaled exposure.
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => handleSelectTab('routes')}
                                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-cyan-600/20"
                                >
                                    Plan Safe Route
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSelectTab('map')}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-200 dark:border-slate-700"
                                >
                                    Explore Map
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Metro City Quick Overview */}
                    <div>
                        <MetroCityGrid cities={cityRankings} loading={loading} />
                    </div>
                </div>
            )}

            {/* TAB 2: EXPLORE MAP */}
            {activeTab === 'map' && (
                <div className="space-y-8 animate-fade-in">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            Explore Monitoring Stations & Regional Map
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Click on any verified monitoring point to view its live telemetry, or compare air quality with your current station.
                        </p>
                    </div>

                    <div className="rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl">
                        <AQIMap
                            center={coordinates}
                            zoom={10}
                            userLocation={deviceLocation || { lat: coordinates.lat, lon: coordinates.lon, accuracy: 25, isApproximate: false }}
                            locationName={locationName}
                            matchedStation={matchedStation}
                            onStationSelect={handleStationSelect}
                        />
                    </div>

                    {/* Side-by-side Location Comparison Engine (Screenshot 1 & 4) */}
                    <LocationComparison
                        currentLocationName={locationName}
                        currentAqiData={aqiData}
                    />
                </div>
            )}

            {/* TAB 3: ROUTE PLANNER */}
            {activeTab === 'routes' && (
                <div className="space-y-6 animate-fade-in">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            Pollution-Aware Route Planner
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Compare journey options, travel duration, and estimated inhaled particulate exposure using validated OSRM routing.
                        </p>
                    </div>

                    <SafeRouteMap center={coordinates} zoom={12} />
                </div>
            )}

            {/* TAB 4: TRENDS & FORECASTS */}
            {activeTab === 'trends' && (
                <div className="space-y-8 animate-fade-in">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            Historical Trends & Multi-Pollutant Analytics
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Continuous hourly, daily, and multi-month historical records up to 180 days with no fabricated observations.
                        </p>
                    </div>

                    {/* Historical Chart with multi-pollutant & time ranges */}
                    <HistoricalAQIChart data={aqiData} loading={loading} />

                    {/* Annual Trend & Calendar Heatmap */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <AnnualTrendChart data={aqiData} loading={loading} />
                        <CalendarHeatmap data={aqiData} loading={loading} />
                    </div>

                    {/* Rankings & Most Polluted Metros */}
                    <div className="space-y-6">
                        <MostPollutedTable cities={mostPolluted} loading={loading} />
                        <MetroCityGrid cities={cityRankings} loading={loading} />
                    </div>
                </div>
            )}

            {/* TAB 5: HEALTH & LEARN */}
            {activeTab === 'health' && (
                <div className="space-y-8 animate-fade-in">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            Health Guidance & Pollution Insights
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Evidence-based outdoor exercise recommendations, sensitive group guidance, and interactive pollutant educational guides.
                        </p>
                    </div>

                    <HealthAdvisory data={aqiData} loading={loading} />
                </div>
            )}
        </MainLayout>
    );
}

