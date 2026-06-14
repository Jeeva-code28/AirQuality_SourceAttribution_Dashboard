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
import { getAirQuality, getWeather, getCityRankings } from '../services/api';

import SafeRouteMap from '../components/Dashboard/Map/SafeRouteMap';

export default function DashboardPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [aqiData, setAqiData] = useState(null);
    const [weatherData, setWeatherData] = useState(null);
    const [cityRankings, setCityRankings] = useState([]);
    const [mostPolluted, setMostPolluted] = useState([]);
    const [mapView, setMapView] = useState('live'); // 'live' or 'route'

    // Load initial state from localStorage or default to Delhi
    const [coordinates, setCoordinates] = useState(() => {
        try {
            const saved = localStorage.getItem('aqi_coords');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed && typeof parsed.lat === 'number' && typeof parsed.lon === 'number') {
                    return parsed;
                }
            }
        } catch (e) {
            console.error("Error parsing saved coordinates:", e);
        }
        return { lat: 28.61, lon: 77.21 };
    });

    const [locationName, setLocationName] = useState(() => {
        return localStorage.getItem('aqi_location_name') || "New Delhi, India";
    });

    // Save to localStorage whenever location changes
    useEffect(() => {
        if (coordinates && typeof coordinates.lat === 'number' && typeof coordinates.lon === 'number') {
            localStorage.setItem('aqi_coords', JSON.stringify(coordinates));
        }
        localStorage.setItem('aqi_location_name', locationName);
    }, [coordinates, locationName]);

    useEffect(() => {
        const fetchData = async (isBackground = false) => {
            // VALIDATION: Prevent API calls if coordinates are invalid
            if (!coordinates || typeof coordinates.lat !== 'number' || typeof coordinates.lon !== 'number') {
                console.error("Invalid coordinates for fetch:", coordinates);
                setError("Invalid location data");
                setLoading(false);
                return;
            }

            // IMMEDIATE: Clear old data if this is a location change (foreground)
            if (!isBackground) {
                setLoading(true);
                setAqiData(null);
                setWeatherData(null);
            }

            try {
                // STAGE 1: Fetch CRITICAL FAST data (Current AQI + Weather)
                // We explicitly set includeHistory = false

                // Helper timeout to prevent infinite loading
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

                // Unblock UI immediately after current data is ready
                if (!isBackground) setLoading(false);

                // STAGE 2: Fetch HEAVY data (History)
                // Import the new function dynamically to be safe or assuming it's imported
                const { getHistoricalAirQuality } = await import('../services/api');
                const historyData = await getHistoricalAirQuality(coordinates.lat, coordinates.lon);

                if (historyData && aqiCurrent) {
                    // Merge history into existing AQI data
                    setAqiData(prev => ({
                        ...prev,
                        hourly: historyData.hourly,
                        daily: historyData.daily
                    }));
                }

                // STAGE 3: Fetch SECONDARY data (City Rankings)
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

        // Initial fetch (Foreground)
        fetchData(false);

        // Auto-refresh every 5 minutes (Background - silent)
        const interval = setInterval(() => fetchData(true), 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [coordinates]);

    const handleLocationSelect = (selectedLocation) => {
        console.log("Dashboard received location update:", selectedLocation);
        if (selectedLocation && typeof selectedLocation.lat === 'number') {
            setCoordinates({ lat: selectedLocation.lat, lon: selectedLocation.lon });
            setLocationName(`${selectedLocation.name}, ${selectedLocation.country || ''}`);
        } else {
            console.error("Invalid location selected:", selectedLocation);
        }
    };

    const handleLocateMe = () => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser");
            return;
        }

        console.log("Locating from Dashboard Card...");
        setLocationName("Locating..."); // Immediate feedback to user

        // Use lower accuracy for speed and accept cached positions
        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            setCoordinates({ lat: latitude, lon: longitude });

            try {
                const { reverseGeocode } = await import('../services/api');
                const locationInfo = await reverseGeocode(latitude, longitude);
                setLocationName(`${locationInfo.name}, ${locationInfo.country}`);
            } catch (e) {
                console.error("Reverse geocode failed", e);
                setLocationName("My Location");
            }
        }, (error) => {
            console.error("Location error", error);
            let msg = "Location access denied";
            if (error.code === 2) msg = "Location unavailable";
            if (error.code === 3) msg = "Location request timed out";

            setLocationName(msg);
            // Fallback to New Delhi if we were locating
            setCoordinates({ lat: 28.61, lon: 77.21 });
        }, {
            enableHighAccuracy: false, // Use low accuracy for speed/reliability
            timeout: 15000,
            maximumAge: 300000 // Accept positions up to 5 mins old
        });
    };

    const handleStationSelect = React.useCallback((station) => {
        console.log("Station selected from Map:", station);
        setCoordinates({ lat: station.lat, lon: station.lon });
        setLocationName(`${station.station.name}, ${station.station.country || ''}`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    return (
        <MainLayout onLocationSelect={handleLocationSelect}>
            <LocationHeader location={locationName} />

            <div className="grid grid-cols-12 gap-8">
                {/* Row 1: AQI Card & Weather */}
                <CurrentAQICard data={aqiData} loading={loading} error={error} onLocate={handleLocateMe} />
                <div id="weather-card" className="col-span-12 lg:col-span-4 h-full">
                    <WeatherCard data={weatherData} loading={loading} />
                </div>

                {/* Row 2: Pollutants */}
                <div className="col-span-12">
                    <PollutantGrid data={aqiData} loading={loading} />
                </div>

                {/* Row 3: Historical Chart */}
                <div id="historical-chart" className="col-span-12">
                    <HistoricalAQIChart data={aqiData} loading={loading} />
                </div>

                {/* Row 4: Annual Trend & Calendar */}
                <AnnualTrendChart data={aqiData} loading={loading} />
                <CalendarHeatmap data={aqiData} loading={loading} />

                {/* Row 5: Metro Cities */}
                <div className="col-span-12">
                    <MetroCityGrid cities={cityRankings} loading={loading} />
                </div>

                {/* Row 6: Most Polluted Table */}
                <div id="rankings-table" className="col-span-12">
                    <MostPollutedTable cities={mostPolluted} loading={loading} />
                </div>

                {/* Row 7: Map Section with Toggle */}
                <div id="aqi-map" className="col-span-12 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold dark:text-white">Mapping Tools</h3>
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                            <button
                                onClick={() => setMapView('live')}
                                className={`px-4 py-2 text-sm font-semibold rounded-md transition-all ${mapView === 'live'
                                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow'
                                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                                    }`}
                            >
                                Live AQI Map
                            </button>
                            <button
                                onClick={() => setMapView('route')}
                                className={`px-4 py-2 text-sm font-semibold rounded-md transition-all ${mapView === 'route'
                                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow'
                                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                                    }`}
                            >
                                Safe Route Finder
                            </button>
                        </div>
                    </div>

                    {mapView === 'live' ? (
                        <AQIMap
                            center={coordinates}
                            zoom={5}
                            onStationSelect={handleStationSelect}
                        />
                    ) : (
                        <SafeRouteMap />
                    )}
                </div>

                {/* Row 8: Health Advisory */}
                <div id="health-advisory" className="col-span-12">
                    <HealthAdvisory data={aqiData} loading={loading} />
                </div>
            </div>
        </MainLayout>
    );
}
