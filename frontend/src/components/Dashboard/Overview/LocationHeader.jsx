import React, { useState, useEffect } from 'react';
import { ChevronRight, MapPin, Bookmark, Plus, Check, Star, Navigation } from 'lucide-react';

const DEFAULT_FAVORITES = [
    { id: 'fav-west-tambaram', label: 'West Tambaram', name: 'West Tambaram, Chennai', lat: 12.9230, lon: 80.1180, icon: '📍' },
    { id: 'fav-home', label: 'Tambaram', name: 'Tambaram, Chennai', lat: 12.9249, lon: 80.1472, icon: '🏠' },
    { id: 'fav-work', label: 'Alandur', name: 'Alandur, Chennai', lat: 12.9975, lon: 80.2006, icon: '💼' },
    { id: 'fav-campus', label: 'Campus', name: 'IIT Madras, Chennai', lat: 12.9915, lon: 80.2337, icon: '🎓' },
    { id: 'fav-perungudi', label: 'Perungudi', name: 'Zone 14 Perungudi, Chennai', lat: 12.9553, lon: 80.2455, icon: '🏙️' },
    { id: 'fav-velachery', label: 'Velachery', name: 'Velachery, Chennai', lat: 12.9754, lon: 80.2206, icon: '🏙️' }
];

export default function LocationHeader({
    location = "Tambaram, Chennai, Tamil Nadu",
    coordinates,
    onSelectLocation,
    matchedStation = null,
    deviceLocation = null,
    geoStatus = null
}) {
    // Sanitize and filter out any concatenated highway corridors or raw polylines
    const isCorridor = (s) => s.includes(' - ') || s.length > 30 || /highway|expressway|sh-|nh-/i.test(s);
    const rawParts = location.split(',').map(p => p.trim()).filter(Boolean);
    const validParts = rawParts.filter(p => !isCorridor(p));
    const parts = validParts.length > 0 ? validParts : rawParts;

    const city = parts[0] || "Tambaram";
    const country = parts[parts.length - 1] || "India";
    const region = parts.length > 2 ? parts.slice(1, -1).join(', ') : (parts.length === 2 && parts[1] !== country ? parts[1] : "");

    // Saved Favorites state
    const [favorites, setFavorites] = useState(() => {
        try {
            const saved = localStorage.getItem('breathelens_saved_locations');
            return saved ? JSON.parse(saved) : DEFAULT_FAVORITES;
        } catch {
            return DEFAULT_FAVORITES;
        }
    });

    const [isSavedCurrent, setIsSavedCurrent] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [customLabel, setCustomLabel] = useState('');

    useEffect(() => {
        if (!coordinates) return;
        const exists = favorites.some(fav =>
            Math.abs(fav.lat - coordinates.lat) < 0.008 && Math.abs(fav.lon - coordinates.lon) < 0.008
        );
        setIsSavedCurrent(exists);
    }, [coordinates, favorites]);

    const handleSaveCurrent = () => {
        if (!coordinates) return;
        const newFav = {
            id: `fav-${Date.now()}`,
            label: customLabel.trim() || city,
            name: `${city}, ${region ? region + ', ' : ''}${country}`,
            lat: coordinates.lat,
            lon: coordinates.lon,
            icon: '⭐'
        };
        const updated = [...favorites, newFav];
        setFavorites(updated);
        try {
            localStorage.setItem('breathelens_saved_locations', JSON.stringify(updated));
        } catch (e) {
            console.error("Failed to save favorite:", e);
        }
        setShowAddModal(false);
        setCustomLabel('');
    };

    const handleSelectFavorite = (fav) => {
        if (onSelectLocation) {
            onSelectLocation({
                name: fav.name,
                lat: fav.lat,
                lon: fav.lon,
                country: country
            });
        }
    };

    return (
        <div className="mb-6">
            {/* Top Row: Breadcrumbs & Telemetry Status */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <nav className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400" aria-label="Breadcrumb">
                    <span className="hover:text-emerald-500 transition-colors cursor-default">Home</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    <span className="hover:text-emerald-500 transition-colors cursor-default">{country}</span>
                    {region && (
                        <>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                            <span className="hover:text-emerald-500 transition-colors cursor-default">{region}</span>
                        </>
                    )}
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-slate-900 dark:text-slate-100 font-semibold">{city}</span>
                </nav>

                {/* Dynamically matched monitoring station with real calculated distance */}
                <div className="flex items-center gap-2">
                    {matchedStation ? (
                        <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                                matchedStation.isNearby
                                    ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                                    : "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-500/20"
                            }`}
                            title={`Nearest station: ${matchedStation.name} • Coords: ${matchedStation.lat?.toFixed(4)}°N, ${matchedStation.lon?.toFixed(4)}°E • Distance: ${matchedStation.distanceLabel || (matchedStation.distanceKm?.toFixed(1) + ' km')}`}
                        >
                            <span className={`w-1.5 h-1.5 rounded-full ${matchedStation.isNearby ? "bg-emerald-500" : "bg-blue-500"} animate-pulse`}></span>
                            <span>
                                {matchedStation.isNearby ? "Live Station: " : "Regional Station: "}
                                <strong className="font-bold">{matchedStation.name?.split(',')[0]}</strong>
                                <span className="opacity-80 font-normal ml-1">
                                    ({matchedStation.distanceLabel || (matchedStation.distanceKm?.toFixed(1) + ' km')})
                                </span>
                            </span>
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            {geoStatus || "Atmospheric Telemetry Synced"}
                        </span>
                    )}
                </div>
            </div>

            {/* Main City Title, Coordinates, and Accuracy Indicator */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-2xl text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-sm">
                        <MapPin className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                                {city}
                            </h1>
                            {coordinates && (
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                        {coordinates.lat.toFixed(4)}°N, {coordinates.lon.toFixed(4)}°E
                                    </span>
                                    {deviceLocation?.isApproximate ? (
                                        <span
                                            className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-300/40 cursor-help"
                                            title={`Desktop geolocation operates without hardware GPS and estimated this location via ISP network routing (±${Math.round(deviceLocation.accuracy || 2500)}m).`}
                                        >
                                            Approx. Network/ISP Location
                                        </span>
                                    ) : deviceLocation?.method === 'gps' ? (
                                        <span
                                            className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40"
                                            title={`Precise device GPS fix (±${Math.round(deviceLocation.accuracy || 15)}m)`}
                                        >
                                            GPS (±{Math.round(deviceLocation.accuracy || 15)}m)
                                        </span>
                                    ) : null}
                                </div>
                            )}
                        </div>
                        {/* Truthful Data Source Attribution */}
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                            {region && region !== country ? `${region}, ${country}` : country} • Copernicus CAMS & Regional Telemetry
                        </p>
                    </div>
                </div>

                {/* Save to Favorites Button */}
                <div className="flex items-center gap-2">
                    {!isSavedCurrent ? (
                        <button
                            type="button"
                            onClick={() => setShowAddModal(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-sm transition-all active:scale-95"
                            title="Save this location to your quick-access favorites"
                        >
                            <Bookmark className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Save to Favorites</span>
                        </button>
                    ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Saved in Favorites</span>
                        </span>
                    )}
                </div>
            </div>

            {/* Quick Favorites Bar (Screenshot 4 requirement) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0 flex items-center gap-1 mr-1">
                    <Star className="w-3 h-3 text-amber-500" /> Saved:
                </span>
                {favorites.map((fav) => {
                    const isActive = coordinates &&
                        Math.abs(fav.lat - coordinates.lat) < 0.008 &&
                        Math.abs(fav.lon - coordinates.lon) < 0.008;

                    return (
                        <button
                            key={fav.id}
                            type="button"
                            onClick={() => handleSelectFavorite(fav)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium transition-all shrink-0 border ${
                                isActive
                                    ? 'bg-emerald-500 text-white border-emerald-600 shadow-md shadow-emerald-500/25 font-semibold'
                                    : 'bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-emerald-500/40'
                            }`}
                        >
                            <span>{fav.icon || '📍'}</span>
                            <span>{fav.label}</span>
                            {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white ml-0.5 animate-pulse"></span>}
                        </button>
                    );
                })}
            </div>

            {/* Modal to add custom label */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-sm w-full p-5 shadow-2xl">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                            <Bookmark className="w-4 h-4 text-emerald-500" /> Save Favorite Location
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                            Save <strong>{city}</strong> to your quick switcher bar for instant 1-click air quality checks.
                        </p>
                        <input
                            type="text"
                            value={customLabel}
                            onChange={(e) => setCustomLabel(e.target.value)}
                            placeholder={`e.g. My Flat, Office, Gym (Default: ${city})`}
                            className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 mb-4 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            autoFocus
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setShowAddModal(false)}
                                className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveCurrent}
                                className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md"
                            >
                                Save Location
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

