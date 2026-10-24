import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
    Wind,
    Flame,
    Route,
    Layers,
    Search,
    MapPin,
    ExternalLink,
    AlertTriangle,
    Compass,
    Eye
} from 'lucide-react';
import { aqiStations } from '../../../data/stations';

// Fix for default Leaflet marker icons in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapFlyTo({ target }) {
    const map = useMap();
    useEffect(() => {
        if (target) {
            map.flyTo([target.lat, target.lon], 13, { duration: 1.8 });
        }
    }, [target, map]);
    return null;
}

export default function AuthorityMapPage({ coordinates, onSelectLocation, onNavigateDashboard }) {
    const [currentMode, setCurrentMode] = useState(0); // 0: AQI, 1: Wind, 2: Hotspots, 3: Clean Route
    const [basemapStyle, setBasemapStyle] = useState('dark'); // 'dark' | 'satellite' | 'canvas'
    const [showHeatmap, setShowHeatmap] = useState(false);
    const [showLayerMenu, setShowLayerMenu] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searching, setSearching] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [activeTarget, setActiveTarget] = useState(coordinates || { lat: 12.9249, lon: 80.1472 });
    const [stationValues, setStationValues] = useState({});

    const initialCenter = coordinates ? [coordinates.lat, coordinates.lon] : [12.9249, 80.1472];

    // Automatically sync map focus when user clicks "Locate" or selects a new area
    useEffect(() => {
        if (coordinates?.lat && coordinates?.lon) {
            setActiveTarget(coordinates);
        }
    }, [coordinates]);

    // Seed mock/live AQI values for all stations for colorful display
    useEffect(() => {
        const seeded = {};
        aqiStations.forEach((st, idx) => {
            const seed = Math.abs(st.lat + st.lon);
            const val = Math.round(55 + (seed % 280));
            seeded[st.name] = val;
        });
        setStationValues(seeded);
    }, []);

    const getAqiColor = (aqi) => {
        if (aqi <= 50) return '#00ddd0';
        if (aqi <= 100) return '#fdd64b';
        if (aqi <= 150) return '#ff9b57';
        if (aqi <= 200) return '#fe6a69';
        if (aqi <= 300) return '#a155b9';
        return '#ef4444';
    };

    const createStationIcon = (aqi) => {
        const color = getAqiColor(aqi || 100);
        return L.divIcon({
            className: 'custom-station-icon',
            html: `
                <div style="background: ${color}; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #000; font-weight: 800; font-size: 11px; border: 2px solid #ffffff; box-shadow: 0 0 10px ${color};">
                    ${aqi || "--"}
                </div>
            `,
            iconSize: [28, 28],
            iconAnchor: [14, 14]
        });
    };

    // Hotspot zones representing thermal anomalies & heavy industrial plumes across key regions
    const hotspotZones = [
        // North / NCR
        { name: "Anand Vihar Industrial Cluster", lat: 28.6508, lon: 77.3152, aqi: 412, radius: 2500, pop: "185,000", alert: "Severe Biomass & Vehicular Exhaust" },
        { name: "Okhla Phase-2 Industrial Zone", lat: 28.5308, lon: 77.2713, aqi: 368, radius: 2000, pop: "140,000", alert: "Refuse Incineration & Smog" },
        { name: "Jahangirpuri High Density Cluster", lat: 28.7328, lon: 77.1706, aqi: 385, radius: 2200, pop: "210,000", alert: "Landfill Smoldering Telemetry" },
        { name: "Bhiwadi Industrial Belt", lat: 28.2104, lon: 76.8606, aqi: 435, radius: 3500, pop: "95,000", alert: "Chemical & Metal Foundry Output" },
        // South / Tamil Nadu & Karnataka
        { name: "Manali Petrochemical Zone, Chennai", lat: 13.1645, lon: 80.2625, aqi: 342, radius: 2800, pop: "120,000", alert: "Petrochemical Refining & Port Emissions" },
        { name: "Ennore Thermal Power Corridor", lat: 13.2200, lon: 80.3200, aqi: 358, radius: 3200, pop: "85,000", alert: "Thermal Power Coal Ash & SO₂ Plume" },
        { name: "Peenya Industrial Area, Bengaluru", lat: 13.0285, lon: 77.5197, aqi: 315, radius: 2400, pop: "140,000", alert: "Manufacturing & Heavy Freight Transit" },
        // West / Mumbai
        { name: "Deonar Smolder Zone, Mumbai", lat: 19.0534, lon: 72.9149, aqi: 328, radius: 2300, pop: "165,000", alert: "Solid Waste Smolder & Industrial Effluent" }
    ];

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        setSearching(true);
        try {
            const resp = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(searchQuery)}&limit=5&bbox=68.1,6.7,97.4,35.6`);
            if (resp.ok) {
                const data = await resp.json();
                if (data.features && data.features.length > 0) {
                    const first = data.features[0];
                    const lon = first.geometry.coordinates[0];
                    const lat = first.geometry.coordinates[1];
                    const props = first.properties;
                    const name = props.name || props.city || props.district || searchQuery;
                    setActiveTarget({ lat, lon, name });
                    setSearchResults(data.features);
                } else {
                    alert("Location not found within coverage perimeter");
                }
            }
        } catch (err) {
            console.error("Map search error:", err);
        } finally {
            setSearching(false);
        }
    };

    const handleSelectSearchResult = (feature) => {
        const lon = feature.geometry.coordinates[0];
        const lat = feature.geometry.coordinates[1];
        const props = feature.properties;
        const name = props.name || props.city || props.district || "Selected Location";
        setActiveTarget({ lat, lon, name });
        setSearchResults([]);
    };

    const modes = [
        { id: 0, label: "AQI Monitoring", icon: Layers },
        { id: 1, label: "Wind Dynamics", icon: Wind },
        { id: 2, label: "Hotspot Detection", icon: Flame },
    ];

    return (
        <div className="relative w-full h-[calc(100vh-140px)] rounded-3xl overflow-hidden border border-cyan-500/20 shadow-2xl bg-[#040712]">
            {/* Top Floating Bar: Mode Switcher & Search Bar */}
            <div className="absolute top-4 left-4 right-4 z-[1000] flex flex-wrap items-center justify-between gap-3 pointer-events-none">
                {/* Search Bar */}
                <div className="pointer-events-auto flex items-center bg-[#0a0f1d]/90 backdrop-blur-md border border-cyan-500/30 rounded-2xl p-1.5 shadow-2xl w-full max-w-sm sm:max-w-md">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="Search district, hotspot, or station..."
                        className="flex-1 bg-transparent px-3 py-1.5 text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:outline-none"
                    />
                    <button
                        onClick={handleSearch}
                        disabled={searching}
                        className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-md shadow-cyan-500/20"
                    >
                        <Search className={`w-3.5 h-3.5 ${searching ? 'animate-spin' : ''}`} />
                        <span>Search</span>
                    </button>
                </div>

                {/* Right Side: Mode Selector & Basemap Layer Switcher */}
                <div className="flex items-center gap-2 pointer-events-auto">
                    {/* Mode Selector Buttons */}
                    <div className="flex items-center gap-1.5 bg-[#0a0f1d]/90 backdrop-blur-md border border-cyan-500/30 p-1.5 rounded-2xl shadow-2xl">
                        {modes.map((m) => {
                            const Icon = m.icon;
                            const active = currentMode === m.id;
                            return (
                                <button
                                    key={m.id}
                                    onClick={() => setCurrentMode(m.id)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${active
                                        ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                                        }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    <span className="hidden sm:inline">{m.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Basemap & Overlay Dropdown */}
                    {currentMode !== 1 && (
                        <div className="relative">
                            <button
                                onClick={() => setShowLayerMenu(!showLayerMenu)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-2xl border backdrop-blur-md shadow-2xl text-xs sm:text-sm font-semibold transition-all ${showLayerMenu
                                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                                    : 'bg-[#0a0f1d]/90 border-cyan-500/30 hover:border-cyan-400 text-slate-200 hover:text-white'
                                    }`}
                                title="Basemap & Overlay Layers"
                            >
                                <Compass className="w-4 h-4 text-cyan-400" />
                                <span className="hidden md:inline">Layers</span>
                            </button>

                            {showLayerMenu && (
                                <div className="absolute right-0 top-12 w-64 bg-[#0a0f1d]/95 backdrop-blur-xl border border-cyan-500/40 rounded-2xl shadow-2xl p-3 z-[1100] text-xs space-y-3">
                                    <div>
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                                            Basemap Style (Zero Watermark)
                                        </div>
                                        <div className="space-y-1">
                                            <button
                                                onClick={() => { setBasemapStyle('dark'); setShowLayerMenu(false); }}
                                                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors ${basemapStyle === 'dark' ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/40' : 'text-slate-300 hover:bg-slate-800'}`}
                                            >
                                                <span>Tactical Dark (OSM)</span>
                                                {basemapStyle === 'dark' && <span className="w-2 h-2 rounded-full bg-cyan-400"></span>}
                                            </button>
                                            <button
                                                onClick={() => { setBasemapStyle('satellite'); setShowLayerMenu(false); }}
                                                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors ${basemapStyle === 'satellite' ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/40' : 'text-slate-300 hover:bg-slate-800'}`}
                                            >
                                                <span>Satellite Photoreal (Esri)</span>
                                                {basemapStyle === 'satellite' && <span className="w-2 h-2 rounded-full bg-cyan-400"></span>}
                                            </button>
                                            <button
                                                onClick={() => { setBasemapStyle('canvas'); setShowLayerMenu(false); }}
                                                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors ${basemapStyle === 'canvas' ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/40' : 'text-slate-300 hover:bg-slate-800'}`}
                                            >
                                                <span>Dark Gray Canvas (Esri)</span>
                                                {basemapStyle === 'canvas' && <span className="w-2 h-2 rounded-full bg-cyan-400"></span>}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="border-t border-slate-800 pt-2">
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                                            Live Environmental Layer
                                        </div>
                                        <label className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-800 cursor-pointer text-slate-300">
                                            <span>AQI Heatmap Density (WAQI)</span>
                                            <input
                                                type="checkbox"
                                                checked={showHeatmap}
                                                onChange={(e) => setShowHeatmap(e.target.checked)}
                                                className="accent-cyan-400 w-4 h-4 cursor-pointer"
                                            />
                                        </label>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Dropdown Results from Search */}
            {searchResults.length > 0 && (
                <div className="absolute top-20 left-4 z-[1001] w-full max-w-md bg-[#0a0f1d] border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden">
                    {searchResults.map((f, i) => (
                        <button
                            key={i}
                            onClick={() => handleSelectSearchResult(f)}
                            className="w-full text-left px-4 py-2.5 hover:bg-slate-800/80 text-xs text-slate-200 border-b border-slate-800 last:border-none flex items-center justify-between"
                        >
                            <span>{f.properties.name || f.properties.city || f.properties.district}</span>
                            <span className="text-[10px] text-cyan-400 font-mono">
                                {f.geometry.coordinates[1].toFixed(2)}°N, {f.geometry.coordinates[0].toFixed(2)}°E
                            </span>
                        </button>
                    ))}
                </div>
            )}

            {/* View Mode 1: Windy Embed */}
            {currentMode === 1 ? (
                <div className="w-full h-full relative">
                    <iframe
                        src={`https://embed.windy.com/embed2.html?lat=${activeTarget.lat}&lon=${activeTarget.lon}&detailLat=${activeTarget.lat}&detailLon=${activeTarget.lon}&width=650&height=450&zoom=8&level=surface&overlay=wind&product=ecmwf&menu=&message=&marker=&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=default&metricTemp=default&radarRange=-1`}
                        className="w-full h-full border-none"
                        title="Live Atmospheric Wind Animation"
                    />
                </div>
            ) : (
                /* View Modes 0 & 2: Leaflet Map */
                <MapContainer
                    center={initialCenter}
                    zoom={10}
                    zoomControl={false}
                    className="w-full h-full z-0"
                    style={{ background: '#040712' }}
                >
                    <ZoomControl position="bottomleft" />
                    
                    {/* Free Zero-Watermark Basemaps */}
                    {basemapStyle === 'dark' && (
                        <TileLayer
                            key="osm-dark"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            className="dark-tiles"
                            maxZoom={19}
                        />
                    )}
                    {basemapStyle === 'satellite' && (
                        <TileLayer
                            key="esri-satellite"
                            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                            maxZoom={18}
                        />
                    )}
                    {basemapStyle === 'canvas' && (
                        <TileLayer
                            key="esri-canvas"
                            attribution='Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ'
                            url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
                            maxZoom={16}
                        />
                    )}

                    {/* Live WAQI Environmental Heatmap Tiles (No Watermark) */}
                    {showHeatmap && (
                        <TileLayer
                            key="waqi-overlay"
                            attribution='AQI Tiles &copy; <a href="https://waqi.info">waqi.info</a>'
                            url="https://tiles.aqicn.org/tiles/usepa-aqi/{z}/{x}/{y}.png?token=_"
                            opacity={0.65}
                            maxZoom={18}
                        />
                    )}
                    <MapFlyTo target={activeTarget} />

                    {/* Mode 0: AQI Station Markers */}
                    {currentMode === 0 && aqiStations.map((st) => {
                        const val = stationValues[st.name] || 110;
                        return (
                            <Marker
                                key={st.name}
                                position={[st.lat, st.lon]}
                                icon={createStationIcon(val)}
                            >
                                <Popup className="custom-authority-popup">
                                    <div className="p-2 text-slate-900 min-w-[200px]">
                                        <div className="font-bold text-sm mb-1">{st.name}</div>
                                        <div className="flex items-center justify-between my-2">
                                            <span className="text-xs text-slate-500">AQI Index:</span>
                                            <span className="text-base font-extrabold" style={{ color: getAqiColor(val) }}>{val}</span>
                                        </div>
                                        <button
                                            onClick={() => {
                                                if (onSelectLocation) onSelectLocation({ lat: st.lat, lon: st.lon, name: st.name });
                                                if (onNavigateDashboard) onNavigateDashboard();
                                            }}
                                            className="w-full mt-2 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
                                        >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                            <span>View in Dashboard</span>
                                        </button>
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    })}

                    {/* Mode 2: Hotspot Circles with Threat Radii */}
                    {currentMode === 2 && hotspotZones.map((hz) => (
                        <React.Fragment key={hz.name}>
                            <Circle
                                center={[hz.lat, hz.lon]}
                                radius={hz.radius}
                                pathOptions={{
                                    color: '#ef4444',
                                    fillColor: '#dc2626',
                                    fillOpacity: 0.25,
                                    weight: 2,
                                    dashArray: '5, 5'
                                }}
                            >
                                <Popup>
                                    <div className="p-2 text-slate-900 min-w-[240px]">
                                        <div className="flex items-center gap-1.5 text-red-600 font-extrabold text-xs uppercase mb-1">
                                            <Flame className="w-4 h-4" />
                                            <span>Thermal Anomaly Alert</span>
                                        </div>
                                        <div className="font-bold text-sm text-slate-950 mb-1">{hz.name}</div>
                                        <div className="text-xs text-slate-600 mb-2">{hz.alert}</div>
                                        <div className="grid grid-cols-2 gap-2 text-xs bg-slate-100 p-2 rounded-lg mb-2">
                                            <div>
                                                <span className="text-slate-400 block text-[10px]">Peak AQI</span>
                                                <span className="font-extrabold text-red-600 text-sm">{hz.aqi}</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block text-[10px]">At-Risk Population</span>
                                                <span className="font-bold text-slate-800">{hz.pop}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                if (onSelectLocation) {
                                                    onSelectLocation({
                                                        lat: hz.lat,
                                                        lon: hz.lon,
                                                        name: hz.name,
                                                        isHotspot: true,
                                                        hotspotData: { aqi: hz.aqi, pop: hz.pop, area: "Cluster 4" }
                                                    });
                                                }
                                                if (onNavigateDashboard) onNavigateDashboard();
                                            }}
                                            className="w-full py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5"
                                        >
                                            <AlertTriangle className="w-3.5 h-3.5" />
                                            <span>Run Hotspot Analysis</span>
                                        </button>
                                    </div>
                                </Popup>
                            </Circle>
                        </React.Fragment>
                    ))}
                </MapContainer>
            )}

            {/* Bottom Floating Legend */}
            <div className="absolute bottom-6 right-6 z-[1000] bg-[#0a0f1d]/90 backdrop-blur-md border border-cyan-500/20 rounded-2xl p-4 shadow-2xl text-xs space-y-2 pointer-events-auto">
                <div className="font-bold uppercase tracking-wider text-slate-400 text-[10px] mb-2">
                    {currentMode === 2 ? "Hotspot Severity Scale" : "AQI Severity Scale"}
                </div>
                {currentMode === 2 ? (
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-red-600 border border-white"></span>
                            <span className="text-slate-200">Critical Industrial Plume (AQI 400+)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-amber-500 border border-white"></span>
                            <span className="text-slate-200">Thermal Smolder Zone (AQI 300-399)</span>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#00ddd0]"></span>
                            <span className="text-slate-300">Good (0-50)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#fdd64b]"></span>
                            <span className="text-slate-300">Moderate (51-100)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#ff9b57]"></span>
                            <span className="text-slate-300">Sensitive (101-150)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#fe6a69]"></span>
                            <span className="text-slate-300">Unhealthy (151-200)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#a155b9]"></span>
                            <span className="text-slate-300">Severe (201-300)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]"></span>
                            <span className="text-slate-300">Hazardous (300+)</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
