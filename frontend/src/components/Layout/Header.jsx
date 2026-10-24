import React, { useState, useEffect, useRef } from 'react';
import { Search, Sun, Moon, Wind, MapPin, Menu, X, User, LogOut } from 'lucide-react';
import { searchLocation, reverseGeocode, calibrateLiveCoordinates } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { getActiveCitizenSession, terminateCitizenSession } from '../../services/authService';

export default function Header({ onLocationSelect, activeTab = 'home', onSelectTab }) {
    const { theme, toggleTheme } = useTheme();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [showResults, setShowResults] = useState(false);
    const [locating, setLocating] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [citizenUser, setCitizenUser] = useState(() => getActiveCitizenSession());
    const searchRef = useRef(null);

    const handleSignOutCitizen = () => {
        terminateCitizenSession();
        setCitizenUser(null);
    };

    // Citizen Portal 5 core navigation tabs (Screenshot 5)
    const navItems = [
        { id: 'home', label: 'Home / Air Quality', badge: 'Core', desc: 'Current AQI, local conditions and daily guidance.' },
        { id: 'map', label: 'Explore Map', desc: 'Nearby readings and available monitoring locations.' },
        { id: 'routes', label: 'Route Planner', desc: 'Compare journey options and estimated exposure.' },
        { id: 'trends', label: 'Trends & Forecasts', desc: 'Historical data and validated predictions.' },
        { id: 'health', label: 'Health & Learn', desc: 'Pollution explanations and precautionary guidance.' },
    ];

    const handleTabClick = (tabId) => {
        if (onSelectTab) {
            onSelectTab(tabId);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setMobileMenuOpen(false);
    };

    // Close search results when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowResults(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSearch = async (e) => {
        const value = e.target.value;
        setQuery(value);
        if (value.length > 2) {
            try {
                const locations = await searchLocation(value);
                setResults(locations || []);
                setShowResults(true);
            } catch (err) {
                setResults([]);
            }
        } else {
            setResults([]);
            setShowResults(false);
        }
    };

    const handleLocateMe = () => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser");
            return;
        }

        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                const calibrated = calibrateLiveCoordinates(latitude, longitude);
                const targetLat = calibrated.lat;
                const targetLon = calibrated.lon;

                let locationName = calibrated.name || "Tambaram, Chennai";
                let countryName = "India";

                if (!calibrated.name) {
                    try {
                        const locationInfo = await reverseGeocode(targetLat, targetLon);
                        if (locationInfo.name) locationName = locationInfo.name;
                        if (locationInfo.country) countryName = locationInfo.country;
                    } catch (err) {
                        console.warn("Reverse geocoding fallback to coords:", err);
                    }
                }

                if (onLocationSelect) {
                    onLocationSelect({
                        name: locationName,
                        lat: targetLat,
                        lon: targetLon,
                        country: countryName
                    });
                }
                setLocating(false);
            },
            (error) => {
                console.warn("GPS unavailable, defaulting to verified live location:", error.message);
                const calibrated = calibrateLiveCoordinates(12.9249, 80.1472);
                if (onLocationSelect) {
                    onLocationSelect({
                        name: calibrated.name || "Tambaram, Chennai",
                        lat: calibrated.lat,
                        lon: calibrated.lon,
                        country: "India"
                    });
                }
                setLocating(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    const handleSelectLocation = (location) => {
        if (onLocationSelect) {
            onLocationSelect({
                name: location.name,
                lat: location.lat,
                lon: location.lon,
                country: location.country || location.country_code
            });
        }
        setQuery('');
        setShowResults(false);
    };

    return (
        <header className="sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors duration-300">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
                {/* Brand / Logo (Screenshot 5: BreatheLens - YOUR AIR. YOUR HEALTH.) */}
                <div
                    className="flex items-center gap-3 cursor-pointer select-none"
                    onClick={() => handleTabClick('home')}
                    title="BreatheLens Citizen Dashboard"
                >
                    <div className="w-10 h-10 bg-gradient-to-tr from-emerald-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25 shrink-0">
                        <Wind className="w-6 h-6 text-white" aria-hidden="true" />
                    </div>
                    <div>
                        <div className="text-lg font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 leading-tight">
                            BreatheLens
                        </div>
                        <div className="text-[9.5px] uppercase tracking-wider font-bold text-slate-400 -mt-0.5">
                            YOUR AIR. YOUR HEALTH.
                        </div>
                    </div>
                </div>

                {/* Navigation Tabs - Desktop (Screenshot 5 Recommended Citizen Portal navigation) */}
                <nav className="hidden xl:flex items-center gap-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200/70 dark:border-slate-700/60" aria-label="Citizen portal navigation">
                    {navItems.map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => handleTabClick(tab.id)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                                    isActive
                                        ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-200/60 dark:border-slate-700/80'
                                        : 'text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-white/50 dark:hover:bg-slate-700/50'
                                }`}
                                aria-current={isActive ? 'page' : undefined}
                            >
                                <span>{tab.label}</span>
                                {tab.badge && (
                                    <span className="px-1.5 py-0.2 text-[9px] font-bold rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                        {tab.badge}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </nav>

                {/* Search Bar - Desktop */}
                <div className="flex-1 max-w-xs mx-2 hidden md:flex items-center relative" ref={searchRef}>
                    <div className="relative w-full group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-3.5 w-3.5 text-slate-400 group-hover:text-emerald-500 transition-colors" aria-hidden="true" />
                        </div>
                        <input
                            type="text"
                            value={query}
                            onChange={handleSearch}
                            onFocus={() => setShowResults(true)}
                            className="block w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm border border-slate-200 dark:border-slate-700/80 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all shadow-inner"
                            placeholder="Search city / station..."
                            spellCheck={false}
                            aria-label="Search city or location"
                        />
                    </div>

                    {/* Results / Featured Stations Dropdown */}
                    {showResults && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto w-full z-50">
                            <div className="px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between">
                                <span>{results.length > 0 ? "Search Results" : "Featured Monitoring Stations"}</span>
                                <span className="text-emerald-500 font-normal">Click to switch</span>
                            </div>
                            {(results.length > 0 ? results : [
                                { id: 'pop-1', name: "Tambaram, Chennai", lat: 12.9249, lon: 80.1472, admin1: "Tamil Nadu", country: "India", tag: "Live Location" },
                                { id: 'pop-2', name: "Alandur, Chennai", lat: 12.9975, lon: 80.2006, admin1: "Tamil Nadu", country: "India", tag: "CPCB Station" },
                                { id: 'pop-3', name: "Velachery, Chennai", lat: 12.9754, lon: 80.2206, admin1: "Tamil Nadu", country: "India" },
                                { id: 'pop-4', name: "Connaught Place, Delhi", lat: 28.6327, lon: 77.2197, admin1: "Delhi", country: "India" },
                                { id: 'pop-5', name: "Bandra, Mumbai", lat: 19.0544, lon: 72.8402, admin1: "Maharashtra", country: "India" }
                            ]).map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => handleSelectLocation(item)}
                                    className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/60 last:border-none"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                                            <MapPin className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-semibold text-slate-900 dark:text-slate-200 text-sm truncate">{item.name}</div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                                {[item.admin1, item.country].filter(Boolean).join(', ')}
                                            </div>
                                        </div>
                                    </div>
                                    {item.tag && (
                                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex-shrink-0">
                                            {item.tag}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2.5">
                    {/* Locate Me */}
                    <button
                        type="button"
                        onClick={handleLocateMe}
                        disabled={locating}
                        className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 active:scale-95 disabled:opacity-50 transition-all shadow-sm"
                        title="Use My Current Location"
                        aria-label="Locate me using GPS"
                    >
                        <MapPin className={`w-4 h-4 ${locating ? 'animate-spin text-emerald-500' : ''}`} />
                    </button>

                    {/* Dark/Light Theme Toggle */}
                    <button
                        type="button"
                        onClick={toggleTheme}
                        className="p-2.5 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition-all shadow-sm"
                        title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
                        aria-label={`Toggle theme (currently ${theme})`}
                    >
                        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </button>

                    {/* Citizen Account Badge or Sign In CTA */}
                    {citizenUser ? (
                        <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl px-2.5 py-1.5 text-xs">
                            <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span className="font-semibold text-emerald-800 dark:text-emerald-300 max-w-[100px] truncate hidden sm:inline">
                                {citizenUser.displayName || 'Citizen'}
                            </span>
                            <button
                                type="button"
                                onClick={handleSignOutCitizen}
                                className="text-slate-400 hover:text-red-400 ml-1 p-0.5 rounded transition-colors"
                                title="Sign out"
                                aria-label="Sign out"
                            >
                                <LogOut className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ) : (
                        <a
                            href="/?auth=citizen"
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs sm:text-sm font-semibold transition-all border border-slate-200 dark:border-slate-700"
                            title="Sign in to save favorite locations"
                        >
                            <User className="w-4 h-4 text-emerald-500" />
                            <span className="hidden sm:inline">Sign In</span>
                        </a>
                    )}

                    {/* Mobile Hamburger Menu */}
                    <button
                        type="button"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="p-2 text-slate-600 dark:text-slate-300 xl:hidden rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                        aria-label="Toggle navigation menu"
                    >
                        {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* Mobile Dropdown Menu */}
            {mobileMenuOpen && (
                <div className="xl:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-4 space-y-3">
                    <div className="relative mb-3">
                        <input
                            type="text"
                            value={query}
                            onChange={handleSearch}
                            className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800"
                            placeholder="Search location..."
                        />
                    </div>
                    <div className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                        {citizenUser ? (
                            <div className="flex items-center justify-between py-2 px-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg text-sm text-emerald-700 dark:text-emerald-300">
                                <span className="flex items-center gap-2 font-medium">
                                    <User className="w-4 h-4" /> {citizenUser.displayName || 'Citizen'}
                                </span>
                                <button
                                    type="button"
                                    onClick={handleSignOutCitizen}
                                    className="text-xs text-red-500 font-semibold"
                                >
                                    Sign Out
                                </button>
                            </div>
                        ) : (
                            <a
                                href="/?auth=citizen"
                                className="text-left py-2 px-3 bg-slate-100 dark:bg-slate-800 font-semibold text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center gap-2"
                            >
                                <User className="w-4 h-4" /> Sign In / Create Account
                            </a>
                        )}
                        {navItems.map((tab) => {
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => handleTabClick(tab.id)}
                                    className={`text-left py-2.5 px-3 rounded-xl transition-all flex flex-col gap-0.5 ${
                                        isActive
                                            ? 'bg-emerald-500 text-white font-bold shadow-md'
                                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                                    }`}
                                >
                                    <div className="flex items-center justify-between w-full">
                                        <span className="text-sm font-semibold">{tab.label}</span>
                                        {tab.badge && (
                                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                                isActive ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                            }`}>
                                                {tab.badge}
                                            </span>
                                        )}
                                    </div>
                                    <span className={`text-[11px] ${isActive ? 'text-white/80' : 'text-slate-400'}`}>
                                        {tab.desc}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </header>
    );
}
