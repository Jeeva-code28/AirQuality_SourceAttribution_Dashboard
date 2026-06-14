import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { getAQILevel } from '../../../services/api';
import { useTheme } from '../../../context/ThemeContext';

// Fix for default marker icon in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Memoized Marker Component
const StationMarker = React.memo(({ station, onSelect }) => {
    if (!station || typeof station.lat !== 'number' || typeof station.lon !== 'number') {
        return null;
    }

    // Safe parsing
    const rawAqi = station.aqi;
    let aqi = null;

    if (rawAqi !== null && rawAqi !== undefined && rawAqi !== '-') {
        aqi = parseInt(rawAqi, 10);
    }

    let hexColor = '#94a3b8'; // Default / No Data (Slate 400ish)

    if (aqi !== null && !isNaN(aqi)) {
        if (aqi <= 50) hexColor = '#00ddd0';       // Good
        else if (aqi <= 100) hexColor = '#fdd64b'; // Moderate
        else if (aqi <= 150) hexColor = '#ff9b57'; // Sens.
        else if (aqi <= 200) hexColor = '#fe6a69'; // Unhealthy
        else if (aqi <= 300) hexColor = '#a155b9'; // Very Unh.
        else hexColor = '#b91c1c';                 // Hazardous
    } else {
        hexColor = '#cbd5e1'; // Explicit No Data color
    }

    const aqiValue = (station.aqi !== null && station.aqi !== undefined) ? station.aqi : '?';

    const customIcon = L.divIcon({
        className: 'custom-aqi-marker',
        html: `<div style="
            background-color: ${hexColor};
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            border: 2px solid #ffffff;
            color: #1e293b;
            font-weight: bold;
            font-size: 10px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        ">${aqiValue}</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12]
    });

    return (
        <Marker position={[station.lat, station.lon]} icon={customIcon}>
            <Popup>
                <div className="text-slate-900 font-sans min-w-[150px]">
                    <div className="font-bold text-sm mb-1 border-b border-slate-200 pb-1">{station.station?.name || 'Unknown'}</div>
                    <div className="text-xs space-y-1 mt-1 mb-2">
                        <div className="flex justify-between">
                            <span>AQI:</span>
                            <span className="font-bold" style={{ color: hexColor }}>{aqiValue}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Status:</span>
                            <span className="font-semibold">{getAQILevel(station.aqi).label}</span>
                        </div>
                    </div>
                    {onSelect && (
                        <button
                            onClick={() => onSelect(station)}
                            className="w-full mt-2 bg-slate-800 hover:bg-slate-700 text-white text-xs py-1.5 px-3 rounded transition-colors flex items-center justify-center gap-1 group"
                        >
                            <span>View Dashboard</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        </button>
                    )}
                </div>
            </Popup>
        </Marker>
    );
}, (prevProps, nextProps) => {
    return prevProps.station.uid === nextProps.station.uid &&
        prevProps.station.aqi === nextProps.station.aqi &&
        prevProps.onSelect === nextProps.onSelect;
});

function MapEvents({ onBoundsChange }) {
    const map = useMapEvents({
        moveend: () => onBoundsChange(map.getBounds()),
        zoomend: () => onBoundsChange(map.getBounds())
    });
    useEffect(() => { onBoundsChange(map.getBounds()); }, [map]);
    return null;
}

function MapUpdater({ center, zoomLevel, isExpanded }) {
    const map = useMap();
    useEffect(() => {
        map.invalidateSize();
        const timer = setTimeout(() => map.invalidateSize(), 350);
        return () => clearTimeout(timer);
    }, [isExpanded, map]);

    useEffect(() => {
        if (center) map.flyTo([center.lat, center.lon], zoomLevel, { duration: 2 });
    }, [center, zoomLevel, map]);
    return null;
}

export default function AQIMap({ center = { lat: 20, lon: 0 }, zoom = 5, onStationSelect }) {
    const { theme } = useTheme();
    const [localStations, setLocalStations] = useState([]);
    const [visibleStations, setVisibleStations] = useState([]);
    const [isExpanded, setIsExpanded] = useState(false);

    const mapRef = React.useRef(null);
    const filterTimeoutRef = React.useRef(null);
    const allStations = localStations;

    // Validate center coordinates to prevent map crash
    const validCenter = (center && typeof center.lat === 'number' && typeof center.lon === 'number')
        ? center
        : { lat: 28.61, lon: 77.21 }; // Default to Delhi if invalid

    const updateVisibleStations = (bounds) => {
        if (!bounds) return;
        if (filterTimeoutRef.current) clearTimeout(filterTimeoutRef.current);
        filterTimeoutRef.current = setTimeout(() => {
            const southWest = bounds.getSouthWest();
            const northEast = bounds.getNorthEast();
            const visible = allStations.filter(station => {
                return station.lat >= southWest.lat &&
                    station.lat <= northEast.lat &&
                    station.lon >= southWest.lng &&
                    station.lon <= northEast.lng;
            });
            setVisibleStations(visible.slice(0, 500));
        }, 100);
    };

    useEffect(() => {
        const startMapLoad = async () => {
            console.log("Starting Delayed Global Stations Load...");
            const { getGlobalStations } = await import('../../../services/api');
            try {
                setLocalStations([]);
                await getGlobalStations((newBatch) => {
                    setLocalStations(prev => [...prev, ...newBatch]);
                });
                console.log("Global Stations Fully Loaded");
            } catch (err) {
                console.error("Error loading global stations:", err);
            }
        };
        const timer = setTimeout(startMapLoad, 2500);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (mapRef.current) updateVisibleStations(mapRef.current.getBounds());
    }, [localStations.length]);

    const handleBoundsChange = (bounds) => updateVisibleStations(bounds);
    const toggleFullView = () => {
        setIsExpanded(!isExpanded);
        window.dispatchEvent(new Event('resize'));
    };

    return (
        <div className={`transition-all duration-300 ease-in-out border border-slate-200 dark:border-slate-700/50 shadow-xl mb-8 ${isExpanded ? 'fixed inset-0 z-[9999] bg-white dark:bg-[#1e293b] p-4 m-0 rounded-none w-screen h-screen' : 'bg-white dark:bg-[#1e293b]/50 backdrop-blur-md rounded-3xl p-6 relative'}`}>
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h3 className="text-slate-900 dark:text-slate-100 text-lg font-bold">Real-time Air Quality Map</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Live AQI data from monitoring stations worldwide</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={toggleFullView} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-white text-xs font-semibold rounded-lg transition-colors border border-slate-200 dark:border-slate-600">
                        {isExpanded ? (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3" /><path d="M21 8h-3a2 2 0 0 1-2-2V3" /><path d="M3 21h3a2 2 0 0 1 2-2v-3" /><path d="M16 21v-3a2 2 0 0 1 2-2h3" /></svg>
                                Exit Full View
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6" /><path d="M9 21H3v-6" /><path d="M21 3l-7 7" /><path d="M3 21l7-7" /></svg>
                                Full View
                            </>
                        )}
                    </button>
                </div>
            </div>

            <div className={`relative w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 z-0 ${isExpanded ? 'h-[calc(100vh-100px)]' : 'h-[500px]'}`}>
                <MapContainer
                    center={[validCenter.lat, validCenter.lon]}
                    zoom={5}
                    style={{ height: '100%', width: '100%', background: theme === 'dark' ? '#262626' : '#dddddd' }}
                    scrollWheelZoom={true}
                    preferCanvas={true}
                    whenCreated={mapInstance => { mapRef.current = mapInstance; }}
                >
                    <MapUpdater center={validCenter} zoomLevel={zoom} isExpanded={isExpanded} />
                    <MapEvents onBoundsChange={handleBoundsChange} />
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                        url={theme === 'dark' ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"}
                    />
                    {visibleStations.map((station) => (
                        <StationMarker key={station.uid} station={station} onSelect={onStationSelect} />
                    ))}
                </MapContainer>
            </div>

            <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-400">
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#00ddd0]"></span> Good (0-50)</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#fdd64b]"></span> Moderate (51-100)</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#ff9b57]"></span> Sens. (101-150)</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#fe6a69]"></span> Unhealthy (151-200)</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#a155b9]"></span> Very Unh. (201-300)</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#b91c1c]"></span> Hazardous (300+)</div>
            </div>
        </div>
    );
}
