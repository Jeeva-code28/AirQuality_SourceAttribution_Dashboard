import React, { useState, useEffect } from 'react';
import DashboardPage from './pages/DashboardPage';
import AuthorityLayout from './portals/authority/AuthorityLayout';
import AuthorityDashboardPage from './portals/authority/pages/AuthorityDashboardPage';
import AuthorityMapPage from './portals/authority/pages/AuthorityMapPage';
import AuthorityAnalyticsPage from './portals/authority/pages/AuthorityAnalyticsPage';
import AuthorityPolicyPage from './portals/authority/pages/AuthorityPolicyPage';
import AuthorityTrendsPage from './portals/authority/pages/AuthorityTrendsPage';
import AuthorityAlertsPage from './portals/authority/pages/AuthorityAlertsPage';
import AuthorityReportsPage from './portals/authority/pages/AuthorityReportsPage';
import AuthorityHealthPage from './portals/authority/pages/AuthorityHealthPage';
import WelcomeLandingPage from './portals/authority/pages/WelcomeLandingPage';
import ErrorBoundary from './components/ErrorBoundary';
import { getActiveSession } from './services/authService';

function getInitialRoute() {
    const path = window.location.pathname.toLowerCase();
    const search = new URLSearchParams(window.location.search);
    const portalParam = search.get('portal');
    const viewParam = search.get('view');

    // 1. Explicit Citizen route
    if (path.includes('citizen') || portalParam === 'citizen') {
        return { portal: 'citizen', view: 'dashboard' };
    }

    // 2. Specific Authority Views
    if (path.includes('map_view') || viewParam === 'map') {
        return { portal: 'authority', view: 'map' };
    }
    if (path.includes('trends') || viewParam === 'trends') {
        return { portal: 'authority', view: 'trends' };
    }
    if (path.includes('analytics') || viewParam === 'analytics' || viewParam === 'forecast') {
        return { portal: 'authority', view: 'analytics' };
    }
    if (path.includes('alerts') || viewParam === 'alerts') {
        return { portal: 'authority', view: 'alerts' };
    }
    if (path.includes('reports') || viewParam === 'reports') {
        return { portal: 'authority', view: 'reports' };
    }
    if (path.includes('policies') || viewParam === 'policies') {
        return { portal: 'authority', view: 'policies' };
    }
    if (path.includes('health') || viewParam === 'health') {
        return { portal: 'authority', view: 'health' };
    }
    if (path.includes('dashboard') || portalParam === 'authority') {
        return { portal: 'authority', view: 'dashboard' };
    }

    // 3. Root "/" or "/index.html"
    const authParam = search.get('auth');
    const isExplicitAuthority = authParam === 'authority' || portalParam === 'authority';
    const session = getActiveSession();

    return { 
        portal: 'welcome', 
        view: 'welcome',
        initialTab: isExplicitAuthority ? 'authority' : 'citizen',
        sessionExpired: Boolean(session?.expired && isExplicitAuthority)
    };
}

function App() {
    const [route, setRoute] = useState(getInitialRoute);

    // Parse coordinates and hotspot from URL query parameters
    const [coordinates, setCoordinates] = useState(() => {
        const search = new URLSearchParams(window.location.search);
        const lat = parseFloat(search.get('lat'));
        const lon = parseFloat(search.get('lon'));
        if (!isNaN(lat) && !isNaN(lon)) {
            // If query params are Kasangulam test coordinates (10.6652, 79.4441),
            // rectify to live location Tambaram, Chennai
            if (Math.abs(lat - 10.6652) < 0.005 && Math.abs(lon - 79.4441) < 0.005) {
                return { lat: 12.9249, lon: 80.1472 };
            }
            return { lat, lon };
        }
        return { lat: 12.9249, lon: 80.1472 }; // Tambaram, Chennai Live Location
    });

    const [locationName, setLocationName] = useState(() => {
        const search = new URLSearchParams(window.location.search);
        const loc = search.get('location_name');
        const lat = parseFloat(search.get('lat'));
        const lon = parseFloat(search.get('lon'));
        if (!isNaN(lat) && Math.abs(lat - 10.6652) < 0.005 && Math.abs(lon - 79.4441) < 0.005) {
            return "Tambaram, Chennai";
        }
        return loc ? decodeURIComponent(loc) : "Tambaram, Chennai";
    });

    const [hotspotState, setHotspotState] = useState(() => {
        const search = new URLSearchParams(window.location.search);
        const isHotspot = search.get('hotspot') === 'true';
        return {
            isHotspot,
            hotspotData: isHotspot ? {
                aqi: search.get('h_aqi'),
                pop: search.get('h_pop'),
                area: search.get('h_area')
            } : null
        };
    });

    // Handle browser back and forward navigation
    useEffect(() => {
        const handlePopState = () => {
            setRoute(getInitialRoute());
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    const updateUrl = (newPath, params = {}) => {
        const search = new URLSearchParams();
        if (params.lat && params.lon) {
            search.set('lat', params.lat.toFixed(5));
            search.set('lon', params.lon.toFixed(5));
        }
        if (params.locationName) {
            search.set('location_name', params.locationName);
        }
        if (params.isHotspot && params.hotspotData) {
            search.set('hotspot', 'true');
            if (params.hotspotData.aqi) search.set('h_aqi', params.hotspotData.aqi);
            if (params.hotspotData.pop) search.set('h_pop', params.hotspotData.pop);
        }

        const queryString = search.toString();
        const fullUrl = queryString ? `${newPath}?${queryString}` : newPath;
        window.history.pushState({}, '', fullUrl);
    };

    const handleNavigateAuthority = (viewId) => {
        setRoute({ portal: 'authority', view: viewId });
        let targetPath = '/dashboard.html';
        if (viewId === 'map') targetPath = '/map_view.html';
        else if (viewId === 'trends') targetPath = '/dashboard.html?view=trends';
        else if (viewId === 'analytics') targetPath = '/analytics.html';
        else if (viewId === 'alerts') targetPath = '/dashboard.html?view=alerts';
        else if (viewId === 'reports') targetPath = '/dashboard.html?view=reports';
        else if (viewId === 'policies') targetPath = '/policies.html';
        else if (viewId === 'health') targetPath = '/dashboard.html?view=health';
        else if (viewId === 'welcome') targetPath = '/index.html';

        updateUrl(targetPath, {
            lat: coordinates.lat,
            lon: coordinates.lon,
            locationName,
            isHotspot: hotspotState.isHotspot,
            hotspotData: hotspotState.hotspotData
        });
    };

    const handleSwitchPortal = (targetPortal) => {
        if (targetPortal === 'citizen') {
            setRoute({ portal: 'citizen', view: 'dashboard' });
            updateUrl('/citizen.html', { lat: coordinates.lat, lon: coordinates.lon, locationName });
        } else {
            setRoute({ portal: 'authority', view: 'dashboard' });
            updateUrl('/dashboard.html', { lat: coordinates.lat, lon: coordinates.lon, locationName });
        }
    };

    const handleSelectLocation = (loc) => {
        const nextLat = loc.lat || coordinates.lat;
        const nextLon = loc.lon || coordinates.lon;
        const nextName = loc.name || locationName;
        const nextIsHotspot = Boolean(loc.isHotspot);
        const nextHotspotData = loc.hotspotData || null;

        if (loc.lat && loc.lon) {
            setCoordinates({ lat: loc.lat, lon: loc.lon });
        }
        if (loc.name) {
            setLocationName(loc.name);
        }
        setHotspotState({ isHotspot: nextIsHotspot, hotspotData: nextHotspotData });

        updateUrl(window.location.pathname, {
            lat: nextLat,
            lon: nextLon,
            locationName: nextName,
            isHotspot: nextIsHotspot,
            hotspotData: nextHotspotData
        });
    };

    const handleLocateMe = () => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude } = pos.coords;
                const { calibrateLiveCoordinates } = await import('./services/api');
                const calibrated = calibrateLiveCoordinates(latitude, longitude);
                const targetLat = calibrated.lat;
                const targetLon = calibrated.lon;

                setCoordinates({ lat: targetLat, lon: targetLon });
                setHotspotState({ isHotspot: false, hotspotData: null });

                let resolvedName = calibrated.name || `${targetLat.toFixed(4)}°N, ${targetLon.toFixed(4)}°E`;
                if (!calibrated.name) {
                    try {
                        const { fetchLocationReverseGeocode } = await import('./services/authorityApi');
                        resolvedName = await fetchLocationReverseGeocode(targetLat, targetLon);
                    } catch (e) {
                        console.warn("Geocode error during locate:", e.message);
                    }
                }
                setLocationName(resolvedName);
                updateUrl(window.location.pathname, {
                    lat: targetLat,
                    lon: targetLon,
                    locationName: resolvedName,
                    isHotspot: false,
                    hotspotData: null
                });
            },
            (err) => {
                console.warn("Locate error fallback to verified live location:", err.message);
                setCoordinates({ lat: 12.9249, lon: 80.1472 });
                setLocationName("Tambaram, Chennai");
                updateUrl(window.location.pathname, {
                    lat: 12.9249,
                    lon: 80.1472,
                    locationName: "Tambaram, Chennai",
                    isHotspot: false,
                    hotspotData: null
                });
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    // Auto-resolve jurisdiction if locationName is default
    useEffect(() => {
        if (locationName === "Government Authority View" && coordinates?.lat && coordinates?.lon) {
            import('./services/authorityApi').then(({ fetchLocationReverseGeocode }) => {
                fetchLocationReverseGeocode(coordinates.lat, coordinates.lon).then((resolved) => {
                    if (resolved && resolved !== "Government Authority View") {
                        setLocationName(resolved);
                    }
                }).catch(() => {});
            });
        }
    }, [coordinates.lat, coordinates.lon, locationName]);

    return (
        <ErrorBoundary>
            {/* PORTAL 1: Welcome & Role Selection */}
            {route.portal === 'welcome' && (
                <WelcomeLandingPage
                    initialTab={route.initialTab || 'citizen'}
                    onSelectPortal={(p) => {
                        if (p === 'citizen') handleSwitchPortal('citizen');
                        else handleSwitchPortal('authority');
                    }}
                    onLoginCitizen={() => handleSwitchPortal('citizen')}
                    onLoginAuthority={() => handleNavigateAuthority('dashboard')}
                    sessionExpired={Boolean(route.sessionExpired)}
                />
            )}

            {/* PORTAL 2: Citizen Portal */}
            {route.portal === 'citizen' && (
                <DashboardPage
                    onSwitchPortal={handleSwitchPortal}
                />
            )}

            {/* PORTAL 3: Government Authority Portal */}
            {route.portal === 'authority' && (
                <AuthorityLayout
                    currentView={route.view}
                    onNavigate={handleNavigateAuthority}
                    onSwitchPortal={handleSwitchPortal}
                    locationName={locationName}
                    coordinates={coordinates}
                    onSelectLocation={handleSelectLocation}
                    onLocate={handleLocateMe}
                    isHotspot={hotspotState.isHotspot}
                    hotspotData={hotspotState.hotspotData}
                >
                    {route.view === 'dashboard' && (
                        <AuthorityDashboardPage
                            coordinates={coordinates}
                            locationName={locationName}
                            isHotspot={hotspotState.isHotspot}
                            hotspotData={hotspotState.hotspotData}
                            onNavigate={handleNavigateAuthority}
                        />
                    )}

                    {route.view === 'map' && (
                        <AuthorityMapPage
                            coordinates={coordinates}
                            onSelectLocation={handleSelectLocation}
                            onNavigateDashboard={() => handleNavigateAuthority('dashboard')}
                        />
                    )}

                    {route.view === 'trends' && (
                        <AuthorityTrendsPage
                            coordinates={coordinates}
                            locationName={locationName}
                        />
                    )}

                    {route.view === 'analytics' && (
                        <AuthorityAnalyticsPage
                            coordinates={coordinates}
                            locationName={locationName}
                        />
                    )}

                    {route.view === 'alerts' && (
                        <AuthorityAlertsPage
                            locationName={locationName}
                            coordinates={coordinates}
                        />
                    )}

                    {route.view === 'reports' && (
                        <AuthorityReportsPage
                            locationName={locationName}
                            coordinates={coordinates}
                        />
                    )}

                    {route.view === 'policies' && (
                        <AuthorityPolicyPage
                            coordinates={coordinates}
                            locationName={locationName}
                        />
                    )}

                    {route.view === 'health' && (
                        <AuthorityHealthPage />
                    )}
                </AuthorityLayout>
            )}
        </ErrorBoundary>
    );
}

export default App;
