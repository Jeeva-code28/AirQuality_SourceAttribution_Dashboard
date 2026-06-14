import React, { useState, useEffect, useRef } from 'react';
import { Search, Globe, Sun, Moon, User, Menu, Wind, MapPin, LogOut } from 'lucide-react';
import { searchLocation, reverseGeocode } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

export default function Header({ onLocationSelect }) {
    const { theme, toggleTheme } = useTheme();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [showResults, setShowResults] = useState(false);
    const [locating, setLocating] = useState(false);
    const searchRef = useRef(null);

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
            const locations = await searchLocation(value);
            setResults(locations || []);
            setShowResults(true);
        } else {
            setResults([]);
            setShowResults(false);
        }
    };

    const handleLocateMe = () => {
        console.log("Locate Me clicked");
        if (!navigator.geolocation) {
            console.error("Geolocation not supported");
            alert("Geolocation is not supported by your browser");
            return;
        }

        setLocating(true);
        console.log("Requesting current position...");
        navigator.geolocation.getCurrentPosition(async (position) => {
            console.log("Position received:", position.coords);
            const { latitude, longitude } = position.coords;

            let locationName = "My Location";
            let countryName = "";

            try {
                const locationInfo = await reverseGeocode(latitude, longitude);
                console.log("Reverse geocode result:", locationInfo);
                if (locationInfo.name) locationName = locationInfo.name;
                if (locationInfo.country) countryName = locationInfo.country;
            } catch (err) {
                console.error("Reverse geocoding failed, using coordinates:", err);
            } finally {
                // Always trigger update with whatever info we have
                if (onLocationSelect) {
                    console.log("Updating dashboard with:", { latitude, longitude, locationName });
                    onLocationSelect({
                        name: locationName,
                        lat: latitude,
                        lon: longitude,
                        country: countryName
                    });
                }
                setLocating(false);
            }
        }, (error) => {
            console.error("Geolocation error:", error);
            alert(`Unable to retrieve your location: ${error.message}`);
            setLocating(false);
        }, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        });
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

    const scrollToId = (id) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <header className="flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 transition-colors duration-300">
            {/* Left: Logo */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.location.reload()}>
                <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                    <Wind className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
                    AQI Monitor
                </span>
            </div>

            {/* Center: Search */}
            <div className="flex-1 max-w-xl mx-8 hidden md:flex items-center gap-3 relative" ref={searchRef}>
                <div className="relative group flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                    </div>
                    <input
                        type="text"
                        value={query}
                        onChange={handleSearch}
                        onFocus={() => query.length > 2 && setShowResults(true)}
                        className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl leading-5 bg-slate-100 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 sm:text-sm transition-all shadow-inner"
                        placeholder="Search any Location..."
                        spellCheck={false}
                    />
                </div>

                {/* Locate Me button moved to Actions area */}

                {/* Search Results Dropdown */}
                {showResults && results.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden max-h-96 overflow-y-auto w-full z-50">
                        {results.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => handleSelectLocation(item)}
                                className="w-full text-left px-4 py-3 hover:bg-slate-800 transition-colors flex items-center gap-3 border-b border-slate-800/50 last:border-none"
                            >
                                <div className="p-2 bg-slate-800 rounded-lg text-emerald-500">
                                    <MapPin className="w-4 h-4" />
                                </div>
                                <div>
                                    <div className="font-medium text-slate-200">{item.name}</div>
                                    <div className="text-xs text-slate-400">
                                        {[item.admin1, item.country]
                                            .filter(part => part && part !== item.name) // Remove duplicate state if same as city
                                            .join(', ')}
                                    </div>
                                </div>
                                {item.country_code && (
                                    <img
                                        src={`https://hatscripts.github.io/circle-flags/flags/${item.country_code.toLowerCase()}.svg`}
                                        alt={item.country}
                                        className="w-5 h-5 ml-auto opacity-70"
                                    />
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-6">
                {/* Navigation Links */}
                <nav className="hidden lg:flex gap-6 text-sm font-medium text-slate-500 dark:text-slate-400">
                    <button onClick={() => scrollToId('aqi-map')} className="hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">Map</button>
                    <button onClick={() => scrollToId('rankings-table')} className="hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">Ranking</button>
                    <button onClick={() => scrollToId('historical-chart')} className="hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">History</button>
                    <button onClick={() => scrollToId('weather-card')} className="hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">Weather</button>
                    <button onClick={() => scrollToId('health-advisory')} className="hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">Health</button>
                </nav>

                <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden lg:block"></div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3">
                    {/* Locate Me Button */}
                    <button
                        type="button"
                        onClick={handleLocateMe}
                        disabled={locating}
                        className="p-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 dark:text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 hover:border-emerald-500/50 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group relative"
                        title="Use my current location"
                    >
                        <MapPin className={`w-5 h-5 ${locating ? 'animate-spin' : ''}`} />
                        <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-slate-800 text-xs text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-slate-700 shadow-lg z-50">
                            Locate Me
                        </span>
                    </button>

                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        className="p-2 text-slate-500 dark:text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all"
                    >
                        {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </button>

                    {/* Profile & Logout */}
                    <button
                        onClick={() => window.location.href = '/index.html'}
                        className="h-9 px-3 bg-emerald-500 rounded-full flex items-center justify-center gap-2 text-white hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95"
                        title="Logout"
                    >
                        <User className="w-4 h-4" />
                        <span className="text-sm font-semibold">Logout</span>
                        <LogOut className="w-4 h-4 ml-1" />
                    </button>
                </div>
            </div>
        </header>
    );
}
