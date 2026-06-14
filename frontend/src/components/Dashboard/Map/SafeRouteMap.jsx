
import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Polyline, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { calculateRoute } from '../../../services/api';
import { useTheme } from '../../../context/ThemeContext';

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapUpdater({ center, zoomLevel }) {
    const map = useMap();
    useEffect(() => {
        if (center) map.setView([center.lat, center.lon], zoomLevel);
        map.invalidateSize();
    }, [center, zoomLevel, map]);
    return null;
}

function MapClickHandler({ onMapClick }) {
    useMapEvents({
        click: (e) => onMapClick(e.latlng)
    });
    return null;
}

export default function SafeRouteMap({ center = { lat: 28.6139, lon: 77.2090 }, zoom = 12 }) {
    const { theme } = useTheme();

    // Coordinates
    const [startPoint, setStartPoint] = useState({ lat: 28.6292, lon: 77.2185 }); // Default: Connaught Place
    const [endPoint, setEndPoint] = useState(null);

    // UI State
    const [startLocationName, setStartLocationName] = useState("Connaught Place, New Delhi");

    // Start Point Search
    const [startSearchQuery, setStartSearchQuery] = useState("Connaught Place, New Delhi");
    const [startSearchResults, setStartSearchResults] = useState([]);
    const [isSearchingStart, setIsSearchingStart] = useState(false);
    const userHasInteracted = useRef(false);

    // End Point Search
    const [endSearchQuery, setEndSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    const [commuterMode, setCommuterMode] = useState('JOGGER');
    const [routes, setRoutes] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // ... existing code ...

    // Initial Auto-Location (Optional - removed to respect "Start from Centre")
    // Use manual "Locate Me" button if needed
    useEffect(() => {
        // handleUseCurrentLocation(true);
    }, []);

    // Custom Icons
    const startIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/markers/marker-icon-2x-green.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    const endIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/markers/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    // Map Click Handler (Optional Override)
    const handleMapClick = (latlng) => {
        // If user explicitly clicks map to set end point
        setEndPoint(latlng);
        setEndSearchQuery(`${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)} `);
        setSearchResults([]); // Connect click to search box
    };

    const handleUseCurrentLocation = (isAuto = false) => {
        if (!navigator.geolocation) {
            setStartLocationName("Location Not Supported");
            return;
        }

        // If this is an auto-load but user has already started typing/interacting, ABORT
        if (isAuto && userHasInteracted.current) {
            return;
        }

        setStartLocationName("Locating...");
        // If manual click, we can clear the query or keep it as "Locating..." temp
        if (!isAuto) {
            setStartSearchQuery("Locating...");
            userHasInteracted.current = true; // Manual click counts as interaction
        }

        navigator.geolocation.getCurrentPosition(async (position) => {
            // Race condition check: If user typed while we were waiting for location
            if (isAuto && userHasInteracted.current) return;

            const { latitude, longitude } = position.coords;
            const latlng = { lat: latitude, lon: longitude };
            setStartPoint(latlng);

            try {
                // Import dynamically to avoid circular dependencies if any
                const { reverseGeocode } = await import('../../../services/api');
                const info = await reverseGeocode(latitude, longitude);
                setStartLocationName(info.name);
                setStartSearchQuery(info.name);
            } catch (e) {
                const locStr = `${latitude.toFixed(4)}, ${longitude.toFixed(4)} `;
                setStartLocationName(locStr);
                setStartSearchQuery(locStr);
            }

        }, (err) => {
            console.error(err);
            setStartLocationName("Location Access Denied");
            setError("Unable to retrieve location. Please check permissions.");
        }, { enableHighAccuracy: true, timeout: 5000 });
    };

    // Debounce Search (Start Point)
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            // Only search if query changed and isn't just the current selected name
            if (startSearchQuery.length > 2 && startLocationName !== startSearchQuery) {
                setIsSearchingStart(true);
                try {
                    const { searchLocation } = await import('../../../services/api');
                    const results = await searchLocation(startSearchQuery);
                    setStartSearchResults(results.slice(0, 5));
                } catch (e) {
                    console.error(e);
                } finally {
                    setIsSearchingStart(false);
                }
            } else {
                setStartSearchResults([]);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [startSearchQuery, startLocationName]);

    const selectStartResult = (result) => {
        const lat = parseFloat(result.latitude || result.lat);
        const lon = parseFloat(result.longitude || result.lon);

        setStartPoint({ lat, lon, lng: lon });
        setStartLocationName(result.name);
        setStartSearchQuery(result.name);
        setStartSearchResults([]);
        userHasInteracted.current = true;
    };

    // Debounce Search (End Point)
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (endSearchQuery.length > 2 && !endPoint) { // Only search if not already selected
                setIsSearching(true);
                try {
                    const { searchLocation } = await import('../../../services/api');
                    const results = await searchLocation(endSearchQuery);
                    setSearchResults(results.slice(0, 5));
                } catch (e) {
                    console.error(e);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSearchResults([]);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [endSearchQuery, endPoint]);

    const selectSearchResult = (result) => {
        const lat = parseFloat(result.latitude || result.lat);
        const lon = parseFloat(result.longitude || result.lon);

        setEndPoint({ lat, lon, lng: lon }); // Leaflet uses lng, API uses lon
        setEndSearchQuery(result.name); // Set input to name
        setSearchResults([]); // Clear dropdown
    };

    const fetchRoutes = async () => {
        if (!startPoint || !endPoint) return;
        setLoading(true);
        setError(null);
        try {
            const result = await calculateRoute(startPoint, endPoint, commuterMode);
            if (result) {
                setRoutes(result);
            } else {
                throw new Error("No route found.");
            }
        } catch (err) {
            console.error(err);
            // Check for known 'out of bounds' issue (Now supporting Chennai/TN)
            // Simplified check: Just warn if very far from expected area, or remove check entirely appropriately
            // For now, removing the strict Delhi check to allow testing in new area
            // Check for known 'out of bounds' issue (Supporting Tamil Nadu)
            // Check for known 'out of bounds' or 'restricted access' issue
            if (err.message && err.message.includes("No route found")) {
                if (commuterMode === 'JOGGER' || commuterMode === 'CYCLIST') {
                    setError(`No path found for ${commuterMode}. Highways or bridges might be restricted. Try switching to 'DRIVER' mode.`);
                } else {
                    setError("No route found. Ensure both points are near accessible roads in the map data.");
                }
            } else {
                setError("Routing failed. Please try a different location or mode.");
            }
        } finally {
            setLoading(false);
        }
    };

    const resetRoute = () => {
        setStartPoint(null);
        setEndPoint(null);
        setStartLocationName("Select Start Point");
        setStartSearchQuery("");
        setEndSearchQuery("");
        setRoutes(null);
        setError(null);
        userHasInteracted.current = false;
    };

    return (
        <div className={`${isFullscreen ? 'fixed inset-0 z-[100] h-screen w-screen rounded-none' : 'relative h-[600px] w-full rounded-2xl'} overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl flex bg-white dark:bg-slate-900 transition-all duration-300`}>
            {/* Sidebar Control */}
            <div className="w-96 p-5 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col z-20 shadow-lg">
                <h3 className="font-bold text-xl text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                    <span className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg">🌱</span>
                    Safe Route Finder
                </h3>

                <div className="space-y-5 flex-1">
                    {/* Inputs */}
                    <div className="space-y-4">
                        {/* Start Point */}
                        <div className="relative">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Start Point</label>
                            <div className="relative">
                                <div className="absolute left-3 top-3.5 w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
                                <input
                                    type="text"
                                    value={startSearchQuery}
                                    onChange={(e) => {
                                        setStartSearchQuery(e.target.value);
                                        setStartPoint(null); // Clear start point on edit to force selection
                                        userHasInteracted.current = true;
                                    }}
                                    placeholder="Search start point..."
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-8 pr-12 text-sm font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder:font-normal"
                                />

                                <div className="absolute right-2 top-2">
                                    {isSearchingStart ? (
                                        <div className="animate-spin h-5 w-5 border-2 border-slate-300 border-t-emerald-500 rounded-full m-1.5"></div>
                                    ) : (
                                        <button
                                            onClick={() => handleUseCurrentLocation(false)}
                                            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-emerald-600 transition-colors"
                                            title="Use Current Location"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    )}
                                </div>

                                {/* Start Search Results Dropdown */}
                                {startSearchResults.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden max-h-60 overflow-y-auto">
                                        {startSearchResults.map((result, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => selectStartResult(result)}
                                                className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-100 dark:border-slate-700/50 last:border-0 flex flex-col"
                                            >
                                                <span className="font-bold text-slate-700 dark:text-slate-200">{result.name}</span>
                                                <span className="text-xs text-slate-500 dark:text-slate-400">{result.admin1 || result.country}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* End Point Search */}
                        <div className="relative">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Destination</label>
                            <div className="relative">
                                <div className="absolute left-3 top-3.5 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]"></div>
                                <input
                                    type="text"
                                    value={endSearchQuery}
                                    onChange={(e) => {
                                        setEndSearchQuery(e.target.value);
                                        setEndPoint(null); // Reset selection on edit
                                    }}
                                    placeholder="Search destination..."
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-8 pr-4 text-sm font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder:font-normal"
                                />
                                {isSearching && (
                                    <div className="absolute right-3 top-3">
                                        <div className="animate-spin h-4 w-4 border-2 border-slate-300 border-t-emerald-500 rounded-full"></div>
                                    </div>
                                )}
                            </div>

                            {/* Search Results Dropdown */}
                            {searchResults.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden max-h-60 overflow-y-auto">
                                    {searchResults.map((result, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => selectSearchResult(result)}
                                            className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-100 dark:border-slate-700/50 last:border-0 flex flex-col"
                                        >
                                            <span className="font-bold text-slate-700 dark:text-slate-200">{result.name}</span>
                                            <span className="text-xs text-slate-500 dark:text-slate-400">{result.admin1 || result.country}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Commuter Mode</label>
                        <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                            {['JOGGER', 'CYCLIST', 'DRIVER'].map(m => (
                                <button
                                    key={m}
                                    onClick={() => setCommuterMode(m)}
                                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${commuterMode === m
                                        ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                                        } `}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={fetchRoutes}
                        disabled={!startPoint || !endPoint || loading}
                        className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98] flex justify-center items-center gap-2"
                    >
                        {loading ? 'Calculating Best Route...' : 'Find Safer Route'}
                    </button>

                    <button onClick={resetRoute} className="w-full py-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xs font-semibold transition-colors">
                        Reset All Points
                    </button>

                    {error && (
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl flex gap-3">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <span className="text-red-600 dark:text-red-400 text-xs font-medium leading-relaxed">{error}</span>
                        </div>
                    )}

                    {routes && (
                        <div className="mt-2 space-y-3 animate-fade-in">
                            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">Recommended</span>
                                    <span className="bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full">GREEN</span>
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-bold text-slate-800 dark:text-white">{Math.round(routes.green?.totalExposure || 0)}</span>
                                    <span className="text-xs font-medium text-slate-500">Total Exposure</span>
                                </div>
                                <div className="text-xs text-slate-500 mt-1 font-mono">
                                    {(routes.green?.distance / 1000)?.toFixed(1)} km • ~{Math.round((routes.green?.distance / 1000) * (commuterMode === 'DRIVER' ? 3 : commuterMode === 'CYCLIST' ? 5 : 10))} min
                                </div>
                            </div>

                            {routes.red && (
                                <div className="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl opacity-60 hover:opacity-100 transition-opacity">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-red-500 dark:text-red-400 font-bold text-sm">Shortest Path</span>
                                        {routes.red?.totalExposure > (routes.green?.totalExposure * 1.1) && (
                                            <span className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full">HIGH EXP</span>
                                        )}
                                    </div>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-lg font-bold text-slate-700 dark:text-slate-300">{Math.round(routes.red?.totalExposure || 0)}</span>
                                        <span className="text-xs font-medium text-slate-400">Exposure</span>
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1 font-mono">
                                        {(routes.red?.distance / 1000)?.toFixed(1)} km • ~{Math.round((routes.red?.distance / 1000) * (commuterMode === 'DRIVER' ? 3 : commuterMode === 'CYCLIST' ? 5 : 10))} min
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Map Area */}
            <div className="flex-1 relative h-full">
                <MapContainer
                    center={[center.lat, center.lon]}
                    zoom={zoom}
                    maxZoom={21}
                    zoomControl={false}
                    style={{ height: '100%', width: '100%', background: theme === 'dark' ? '#262626' : '#dddddd' }}
                    className="z-10"
                >
                    <ZoomControl position="bottomright" />

                    {/* Fullscreen Toggle */}
                    <div className="leaflet-top leaflet-right">
                        <div className="leaflet-control leaflet-bar !border-0 !shadow-lg !m-4">
                            <button
                                onClick={() => setIsFullscreen(!isFullscreen)}
                                className="bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 w-10 h-10 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-bold text-lg rounded-lg cursor-pointer"
                                title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                            >
                                {isFullscreen ? '✕' : '⛶'}
                            </button>
                        </div>
                    </div>

                    <MapUpdater center={center} zoomLevel={zoom} />
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        maxNativeZoom={18}
                        maxZoom={21}
                        keepBuffer={10}
                        updateWhenIdle={false}
                    />
                    <MapClickHandler onMapClick={handleMapClick} />

                    {/* Start Marker */}
                    {startPoint && (
                        <Marker position={[startPoint.lat, startPoint.lng || startPoint.lon]} icon={startIcon}>
                            <Popup>Start: {startLocationName}</Popup>
                        </Marker>
                    )}

                    {/* End Marker */}
                    {endPoint && (
                        <Marker position={[endPoint.lat, endPoint.lng || endPoint.lon]} icon={endIcon}>
                            <Popup>Desination</Popup>
                        </Marker>
                    )}

                    {/* Routes Polyline */}
                    {routes?.green && (
                        <Polyline positions={routes.green.points} pathOptions={{ color: '#10b981', weight: 6, opacity: 0.9, lineCap: 'round', lineJoin: 'round' }} />
                    )}
                    {routes?.yellow && (
                        <Polyline positions={routes.yellow.points} pathOptions={{ color: '#f59e0b', weight: 6, opacity: 0.6, dashArray: '10, 10' }} />
                    )}
                    {routes?.red && (
                        <Polyline positions={routes.red.points} pathOptions={{ color: '#ef4444', weight: 6, opacity: 0.6, dashArray: '5, 8' }} />
                    )}
                </MapContainer>
            </div>
        </div>
    );
}
