import React, { useState, useEffect, useRef } from 'react';
import {
    Wind,
    LayoutGrid,
    Radar,
    TrendingUp,
    Sparkles,
    AlertTriangle,
    FileText,
    Shield,
    Activity,
    Settings,
    LogOut,
    ChevronDown,
    Menu,
    X,
    Navigation,
    Check,
    Search,
    MapPin
} from 'lucide-react';
import { getActiveSession, terminateSession } from '../../services/authService';

export default function AuthorityLayout({
    children,
    currentView = 'dashboard',
    onNavigate,
    onSwitchPortal,
    locationName = "Tambaram, Chennai",
    coordinates = { lat: 12.9249, lon: 80.1472 },
    onSelectLocation,
    onLocate,
    isHotspot = false,
    hotspotData = null
}) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [currentTime, setCurrentTime] = useState('');
    const [currentUser] = useState(() => getActiveSession());
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchOpen, setSearchOpen] = useState(false);
    const searchDropdownRef = useRef(null);

    const featuredStations = [
        { name: "Tambaram, Chennai", lat: 12.9249, lon: 80.1472, tag: "Live Location" },
        { name: "Tambaram Sanatorium, Chennai", lat: 12.9460, lon: 80.1380, tag: "Suburban" },
        { name: "Alandur, Chennai", lat: 12.9975, lon: 80.2006, tag: "Continuous CPCB" },
        { name: "Velachery, Chennai", lat: 12.9754, lon: 80.2206, tag: "Urban Basin" },
        { name: "Manali, Chennai", lat: 13.1645, lon: 80.2625, tag: "Industrial Hub" },
        { name: "IIT Madras, Chennai", lat: 12.9915, lon: 80.2337, tag: "Institutional" },
        { name: "Connaught Place, Delhi", lat: 28.6327, lon: 77.2197, tag: "National Capital" },
        { name: "Bandra, Mumbai", lat: 19.0544, lon: 72.8402, tag: "Western Hub" }
    ];

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (searchDropdownRef.current && !searchDropdownRef.current.contains(e.target)) {
                setSearchOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSearchInput = async (e) => {
        const val = e.target.value;
        setSearchQuery(val);
        if (val.trim().length >= 2) {
            try {
                const { searchLocation } = await import('../../services/api');
                const list = await searchLocation(val);
                setSearchResults(list || []);
                setSearchOpen(true);
            } catch (err) {
                console.warn("Search location error:", err);
                setSearchResults([]);
            }
        } else {
            setSearchResults([]);
        }
    };

    const handleSelectJurisdiction = (loc) => {
        if (onSelectLocation) {
            onSelectLocation({
                lat: loc.lat,
                lon: loc.lon,
                name: loc.name
            });
        }
        setSearchQuery('');
        setSearchResults([]);
        setSearchOpen(false);
    };

    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            setCurrentTime(now.toLocaleDateString('en-US', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            }));
        };
        updateTime();
        const timer = setInterval(updateTime, 1000);
        return () => clearInterval(timer);
    }, []);

    const navItems = [
        {
            id: 'dashboard',
            label: 'Overview',
            sub: 'AQI, critical metrics and situation summary',
            icon: LayoutGrid,
            url: '/dashboard.html'
        },
        {
            id: 'map',
            label: 'Live Monitoring & Hotspots',
            sub: 'Geographic monitoring and hotspot investigation',
            icon: Radar,
            url: '/map_view.html'
        },
        {
            id: 'trends',
            label: 'Pollutant Analytics',
            sub: 'Pollutant comparisons and historical trends',
            icon: TrendingUp,
            url: '/trends.html'
        },
        {
            id: 'analytics',
            label: 'Forecasts & Source Attribution',
            sub: 'Predictive modeling and source contribution',
            icon: Sparkles,
            url: '/analytics.html'
        },
        {
            id: 'alerts',
            label: 'Alerts & Advisory',
            sub: 'Actionable warnings, GRAP rules & resolution',
            icon: AlertTriangle,
            url: '/alerts.html'
        },
        {
            id: 'reports',
            label: 'Reports & Decision Support',
            sub: 'Executive summaries, CSV export & print briefs',
            icon: FileText,
            url: '/reports.html'
        },
        {
            id: 'policies',
            label: 'Policy Simulator',
            sub: 'Intervention modeling & policy trade-offs',
            icon: Shield,
            url: '/policies.html'
        },
        {
            id: 'health',
            label: 'System Health & Audit',
            sub: 'Telemetry uptime, API status & audit logs',
            icon: Activity,
            url: '/health.html'
        }
    ];

    const handleItemClick = (id) => {
        if (onNavigate) {
            onNavigate(id);
        } else {
            const item = navItems.find(n => n.id === id);
            if (item) window.location.href = item.url;
        }
        setSidebarOpen(false);
    };

    const handleLogout = () => {
        terminateSession();
        if (onNavigate) {
            onNavigate('welcome');
        } else {
            window.location.href = '/index.html';
        }
    };

    return (
        <div className="min-h-screen bg-[#040712] text-slate-100 font-sans flex antialiased selection:bg-cyan-500/30">
            {/* Sidebar Desktop */}
            <aside className="w-72 bg-[#0a0f1d]/95 backdrop-blur-xl border-r border-cyan-500/15 hidden lg:flex flex-col justify-between p-4.5 z-40 sticky top-0 h-screen select-none">
                <div className="flex flex-col min-h-0">
                    {/* Brand */}
                    <div className="flex items-center gap-3 px-2 py-2.5 mb-5 cursor-pointer" onClick={() => handleItemClick('dashboard')}>
                        <div className="w-10 h-10 rounded-xl bg-cyan-600 flex items-center justify-center shadow-md shadow-cyan-600/30 flex-shrink-0">
                            <Wind className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <div className="text-xl font-bold tracking-tight text-white leading-tight">
                                BreatheLens
                            </div>
                            <div className="text-[10px] tracking-wider uppercase font-semibold text-cyan-400 mt-0.5">
                                AUTHORITY PORTAL
                            </div>
                        </div>
                    </div>

                    {/* Scrollable Navigation List */}
                    <nav className="space-y-1 overflow-y-auto max-h-[calc(100vh-260px)] pr-1" aria-label="Authority navigation">
                        {navItems.map((item) => {
                            const isActive = currentView === item.id;
                            const Icon = item.icon;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => handleItemClick(item.id)}
                                    className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                                        isActive
                                            ? 'bg-slate-800/80 border border-slate-700/80 shadow-md shadow-black/40'
                                            : 'hover:bg-slate-800/40 border border-transparent'
                                    }`}
                                >
                                    <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                                    <div className="min-w-0 flex-1">
                                        <div className={`text-sm font-bold leading-tight ${isActive ? 'text-white' : 'text-slate-300'}`}>
                                            {item.label}
                                        </div>
                                        <div className="text-[11px] text-slate-400 font-normal leading-tight mt-0.5 truncate">
                                            {item.sub}
                                        </div>
                                    </div>
                                    {isActive && (
                                        <Check className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0 ml-1" />
                                    )}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* Settings & User info */}
                <div className="border-t border-slate-800/80 pt-3">
                    <button
                        onClick={() => setSettingsOpen(!settingsOpen)}
                        className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 rounded-xl transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <Settings className="w-3.5 h-3.5" />
                            <span>Officer Settings</span>
                        </div>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${settingsOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {settingsOpen && (
                        <div className="mt-1.5 space-y-1 pl-1">
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                                <LogOut className="w-3.5 h-3.5" />
                                <span>Sign Out</span>
                            </button>
                        </div>
                    )}

                    <div className="mt-3 px-3 py-2 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-xs font-bold flex-shrink-0">
                            {(currentUser?.displayName?.[0] || 'O').toUpperCase()}
                        </div>
                        <div className="truncate text-xs">
                            <div className="font-semibold text-slate-200 truncate" title={currentUser?.displayName || currentUser?.officerId || 'Station Officer'}>
                                {currentUser?.displayName || currentUser?.officerId || 'Station Officer'}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                                {currentUser?.role || 'Authorized Session'}
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Mobile Drawer */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-50 lg:hidden flex">
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSidebarOpen(false)}></div>
                    <div className="relative w-80 bg-[#0a0f1d] border-r border-cyan-500/20 p-5 flex flex-col justify-between z-10 overflow-y-auto">
                        <div>
                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-cyan-600 flex items-center justify-center text-white">
                                        <Wind className="w-4 h-4 text-white" />
                                    </div>
                                    <div>
                                        <span className="font-bold text-base text-white block leading-tight">BreatheLens</span>
                                        <span className="text-[9px] uppercase font-bold text-cyan-400 tracking-wider">AUTHORITY PORTAL</span>
                                    </div>
                                </div>
                                <button onClick={() => setSidebarOpen(false)} className="p-1 text-slate-400 hover:text-white">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <nav className="space-y-1">
                                {navItems.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => handleItemClick(item.id)}
                                        className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-semibold ${
                                            currentView === item.id ? 'bg-slate-800 border border-slate-700 text-white' : 'text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        <item.icon className="w-4 h-4 mt-0.5 flex-shrink-0 text-cyan-400" />
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-white text-sm">{item.label}</div>
                                            <div className="text-[11px] text-slate-400 font-normal truncate">{item.sub}</div>
                                        </div>
                                        {currentView === item.id && <Check className="w-4 h-4 text-cyan-400 mt-0.5 ml-1" />}
                                    </button>
                                ))}
                            </nav>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2 py-2.5 text-xs font-semibold text-red-400 hover:bg-red-500/10 rounded-lg justify-center border border-red-500/20"
                        >
                            <LogOut className="w-4 h-4" />
                            <span>Log Out</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Main Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <header className="sticky top-0 z-30 bg-[#0a0f1d]/90 backdrop-blur-md border-b border-cyan-500/15 px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="p-2 lg:hidden text-slate-400 hover:text-white rounded-lg bg-slate-900 border border-slate-800"
                            aria-label="Open navigation menu"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <div className="min-w-0">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-400/90 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                <span>{isHotspot ? "Impact Analysis Report" : "Active Jurisdiction"}</span>
                            </div>
                            <h1 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2 truncate">
                                <span className="truncate">{locationName}</span>
                                {coordinates?.lat && coordinates?.lon && (
                                    <span className="hidden xl:inline text-[11px] font-mono font-normal text-slate-400 bg-slate-900/90 px-2 py-0.5 rounded border border-slate-800">
                                        {coordinates.lat.toFixed(4)}°N, {coordinates.lon.toFixed(4)}°E
                                    </span>
                                )}
                            </h1>
                        </div>
                    </div>

                    {/* Central Jurisdiction & Station Search */}
                    <div className="flex-1 max-w-sm sm:max-w-md mx-2 relative hidden md:block" ref={searchDropdownRef}>
                        <div className="relative group">
                            <Search className="w-4 h-4 text-cyan-400/70 group-focus-within:text-cyan-300 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none transition-colors" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={handleSearchInput}
                                onFocus={() => setSearchOpen(true)}
                                placeholder="Search station or jurisdiction (e.g. Tambaram)..."
                                className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-900/90 border border-cyan-500/25 hover:border-cyan-500/40 focus:border-cyan-400 rounded-xl text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/30 transition-all font-medium shadow-inner"
                                spellCheck={false}
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Dropdown Menu */}
                        {searchOpen && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-[#0a0f1d] border border-cyan-500/30 rounded-xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto z-50 divide-y divide-slate-800/60">
                                <div className="px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-950/70 flex items-center justify-between">
                                    <span>{searchQuery.trim().length >= 2 ? "Search Results" : "Continuous Monitoring Stations"}</span>
                                    <span className="text-cyan-400/80 font-normal">Click to switch</span>
                                </div>
                                <div className="divide-y divide-slate-800/50">
                                    {(searchQuery.trim().length >= 2 ? searchResults : featuredStations).map((loc, idx) => (
                                        <button
                                            key={loc.id || `${loc.name}-${idx}`}
                                            onClick={() => handleSelectJurisdiction(loc)}
                                            className="w-full text-left px-3.5 py-2.5 hover:bg-cyan-950/40 transition-colors flex items-center justify-between gap-2.5 group"
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="p-1.5 rounded-lg bg-cyan-950/60 border border-cyan-500/20 text-cyan-400 group-hover:text-cyan-300 group-hover:border-cyan-400/40 transition-colors">
                                                    <MapPin className="w-3.5 h-3.5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-xs font-semibold text-slate-100 group-hover:text-cyan-200 transition-colors truncate">
                                                        {loc.name}
                                                    </div>
                                                    <div className="text-[10px] font-mono text-slate-400">
                                                        {loc.lat?.toFixed(4)}°N, {loc.lon?.toFixed(4)}°E
                                                    </div>
                                                </div>
                                            </div>
                                            {loc.tag && (
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                                                    loc.tag === 'Live Location'
                                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                                        : 'bg-slate-800 text-slate-300'
                                                }`}>
                                                    {loc.tag}
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                    {searchQuery.trim().length >= 2 && searchResults.length === 0 && (
                                        <div className="px-4 py-3 text-xs text-slate-400 text-center">
                                            No matching stations found for &quot;{searchQuery}&quot;.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right: Quick Actions & Locate */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Quick Tambaram Switcher if not currently Tambaram */}
                        {!locationName.toLowerCase().includes('tambaram') && onSelectLocation && (
                            <button
                                onClick={() => handleSelectJurisdiction({ lat: 12.9249, lon: 80.1472, name: "Tambaram, Chennai" })}
                                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-semibold transition-all active:scale-95 shadow-sm"
                                title="Switch directly to Live Location: Tambaram, Chennai"
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                                <span>Tambaram</span>
                            </button>
                        )}

                        {/* Live Clock */}
                        <div className="hidden lg:block text-xs text-slate-400 font-mono bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
                            {currentTime || "Synchronizing..."}
                        </div>

                        {/* Locate Me */}
                        {onLocate && (
                            <button
                                onClick={onLocate}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-xl text-xs sm:text-sm font-semibold transition-all active:scale-95 shadow-[0_0_10px_rgba(0,242,255,0.1)]"
                                title="Locate current GPS position"
                            >
                                <Navigation className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Locate</span>
                            </button>
                        )}
                    </div>
                </header>

                {/* Hotspot Alert Banner if hotspot mode */}
                {isHotspot && (
                    <div className="bg-gradient-to-r from-red-950 via-rose-900 to-red-950 border-b border-red-500/40 px-4 sm:px-8 py-2.5 flex items-center justify-between text-xs sm:text-sm font-bold text-white shadow-lg">
                        <div className="flex items-center gap-2.5">
                            <AlertTriangle className="w-4 h-4 text-amber-300 animate-pulse" />
                            <span>CRITICAL HOTSPOT ZONE DETECTED</span>
                            {hotspotData?.aqi && (
                                <span className="ml-2 px-2 py-0.5 bg-black/40 rounded text-amber-200">
                                    Simulated AQI: {hotspotData.aqi}
                                </span>
                            )}
                        </div>
                        <span className="text-[11px] text-red-200 hidden md:inline">
                            Priority Emergency Resource Allocation Active
                        </span>
                    </div>
                )}

                {/* Content Container */}
                <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1700px] w-full mx-auto space-y-6">
                    {children}
                </main>

                {/* Footer */}
                <footer className="border-t border-slate-900 py-4 px-6 text-center text-xs text-slate-500">
                    BreatheLens v2.0 • Data telemetry by Open-Meteo, CPCB & NASA FIRMS Engine
                </footer>
            </div>
        </div>
    );
}
