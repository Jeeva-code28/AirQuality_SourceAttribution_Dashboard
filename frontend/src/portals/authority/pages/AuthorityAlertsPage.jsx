import React, { useState, useEffect } from 'react';
import {
    AlertTriangle,
    ShieldAlert,
    CheckCircle2,
    Clock,
    MapPin,
    Flame,
    Radio,
    Filter,
    UserCheck,
    Check,
    RotateCcw
} from 'lucide-react';
import { findNearestStation, calculateDistance, aqiStations } from '../../../data/stations';

const INITIAL_ALERTS = [
    {
        id: 'ALT-1092',
        type: 'pollution',
        severity: 'critical',
        location: 'Anand Vihar, Delhi',
        pollutant: 'PM2.5',
        measurement: '284 µg/m³',
        threshold: '60 µg/m³ (NAAQS 24h)',
        ratio: '4.7x Threshold',
        timestamp: '15 mins ago',
        fullTime: '2026-10-24 13:45 UTC+5:30',
        grapStage: 'GRAP Stage IV (Severe+)',
        recommendation: 'Immediate halt of non-essential construction and demolition. Enforce Odd-Even traffic rationing and heavy vehicle entry restrictions.',
        status: 'unresolved', // 'unresolved' | 'acknowledged' | 'resolved'
        assignedOfficer: 'Officer ENV-2041',
        history: ['Telemetry breach detected at 13:45', 'Triggered GRAP IV protocol']
    },
    {
        id: 'ALT-1091',
        type: 'pollution',
        severity: 'critical',
        location: 'Jahangirpuri, Delhi',
        pollutant: 'PM10',
        measurement: '412 µg/m³',
        threshold: '100 µg/m³ (NAAQS 24h)',
        ratio: '4.1x Threshold',
        timestamp: '42 mins ago',
        fullTime: '2026-10-24 13:18 UTC+5:30',
        grapStage: 'GRAP Stage III (Severe)',
        recommendation: 'Deploy mechanical sweepers and anti-smog guns on major arterial corridors. Suspend mining activities and stone crushers.',
        status: 'acknowledged',
        assignedOfficer: 'Officer ENV-2041',
        history: ['Telemetry breach detected at 13:18', 'Acknowledged by ENV-2041 at 13:25']
    },
    {
        id: 'ALT-1088',
        type: 'pollution',
        severity: 'warning',
        location: 'Deonar, Mumbai',
        pollutant: 'SO₂',
        measurement: '118 µg/m³',
        threshold: '80 µg/m³ (NAAQS 24h)',
        ratio: '1.5x Threshold',
        timestamp: '1 hour ago',
        fullTime: '2026-10-24 13:00 UTC+5:30',
        grapStage: 'Industrial Advisory',
        recommendation: 'Inspect refinery and thermal plant scrubber compliance. Shift to low-sulfur heavy fuel oil or gas turbines.',
        status: 'unresolved',
        assignedOfficer: 'Officer ENV-1088',
        history: ['Automated sensor threshold alert at 13:00']
    },
    {
        id: 'ALT-1085',
        type: 'pollution',
        severity: 'warning',
        location: 'Punjabi Bagh, Delhi',
        pollutant: 'NO₂',
        measurement: '94 µg/m³',
        threshold: '80 µg/m³ (NAAQS 24h)',
        ratio: '1.2x Threshold',
        timestamp: '2 hours ago',
        fullTime: '2026-10-24 12:00 UTC+5:30',
        grapStage: 'GRAP Stage II (Very Poor)',
        recommendation: 'Synchronize traffic signals at bottleneck junctions to minimize idling emissions. Boost public bus frequency.',
        status: 'resolved',
        assignedOfficer: 'Officer ENV-2041',
        resolvedAt: '13:10 UTC+5:30',
        history: ['Breach at 12:00', 'Acknowledged at 12:15', 'Resolved after traffic clearance at 13:10']
    },
    {
        id: 'SYS-0412',
        type: 'technical',
        severity: 'warning',
        location: 'Najafgarh Sensor Node #04',
        pollutant: 'Sensor Optical Chamber',
        measurement: 'Zero Response',
        threshold: 'Telemetry Heartbeat < 15m',
        ratio: 'Node Offline',
        timestamp: '28 mins ago',
        fullTime: '2026-10-24 13:32 UTC+5:30',
        grapStage: 'Telemetry System Fault',
        recommendation: 'Check LTE router connectivity at substation. Dispatch field technician if heartbeat does not restore in 30 mins.',
        status: 'unresolved',
        assignedOfficer: 'Telemetry Ops Desk',
        history: ['Heartbeat packet missing since 13:32']
    },
    {
        id: 'SYS-0410',
        type: 'technical',
        severity: 'technical',
        location: 'NASA FIRMS Hotspot Ingestion API',
        pollutant: 'Thermal Telemetry Feed',
        measurement: 'VIIRS Snk Sync 200 OK',
        threshold: 'Sync cycle: 3h',
        ratio: 'Healthy Sync',
        timestamp: '1 hour ago',
        fullTime: '2026-10-24 12:45 UTC+5:30',
        grapStage: 'Routine Telemetry Sync',
        recommendation: 'Satellite orbital path active. Hotspot data synchronized successfully.',
        status: 'resolved',
        assignedOfficer: 'System Automations',
        history: ['Automated fetch completed']
    }
];

function generateLocationAlerts(locName, coords) {
    const lat = coords?.lat || 12.9249;
    const lon = coords?.lon || 80.1472;
    const sorted = [...aqiStations]
        .map(s => ({ ...s, distance: calculateDistance(lat, lon, s.lat, s.lon) }))
        .sort((a, b) => a.distance - b.distance);

    const primarySt = sorted[0]?.name || locName;
    const secondarySt = sorted[1]?.name || locName;
    const tertiarySt = sorted[2]?.name || locName;

    return [
        {
            id: 'ALT-1092',
            type: 'pollution',
            severity: 'critical',
            location: `${locName} (Jurisdiction Epicenter)`,
            pollutant: 'PM2.5',
            measurement: '184 µg/m³',
            threshold: '60 µg/m³ (NAAQS 24h)',
            ratio: '3.1x Threshold',
            timestamp: '12 mins ago',
            fullTime: '2026-10-24 13:45 UTC+5:30',
            grapStage: 'GRAP Stage III/IV Trigger',
            recommendation: `Deploy mechanized dust suppression across ${locName}. Enforce heavy vehicle diversion along arterial corridors.`,
            status: 'unresolved',
            assignedOfficer: 'Officer ENV-2041',
            history: ['Breach detected via continuous telemetry', 'Dispatched regional notice']
        },
        {
            id: 'ALT-1091',
            type: 'pollution',
            severity: 'warning',
            location: `${primarySt} (${sorted[0]?.distance.toFixed(1)} km)`,
            pollutant: 'PM10',
            measurement: '228 µg/m³',
            threshold: '100 µg/m³ (NAAQS 24h)',
            ratio: '2.3x Threshold',
            timestamp: '35 mins ago',
            fullTime: '2026-10-24 13:18 UTC+5:30',
            grapStage: 'GRAP Stage II (Elevated)',
            recommendation: 'Increase water sprinkling at active civil projects. Enforce zero waste burning protocols.',
            status: 'acknowledged',
            assignedOfficer: 'Officer ENV-2041',
            history: ['Breach logged at station node', 'Acknowledged by active duty officer']
        },
        {
            id: 'ALT-1088',
            type: 'pollution',
            severity: 'warning',
            location: `${secondarySt} (${sorted[1]?.distance.toFixed(1)} km)`,
            pollutant: 'SO₂',
            measurement: '94 µg/m³',
            threshold: '80 µg/m³ (NAAQS 24h)',
            ratio: '1.2x Threshold',
            timestamp: '1 hour ago',
            fullTime: '2026-10-24 13:00 UTC+5:30',
            grapStage: 'Industrial Advisory',
            recommendation: 'Audit boiler emissions and flue gas desulfurization systems at nearest manufacturing facilities.',
            status: 'unresolved',
            assignedOfficer: 'Regional Duty Inspector',
            history: ['Sensor spike recorded during shift change']
        },
        {
            id: 'SYS-0412',
            type: 'technical',
            severity: 'warning',
            location: `${locName} Sensor Node #02`,
            pollutant: 'Laser Scattering Chamber',
            measurement: 'Intermittent Heartbeat',
            threshold: 'Telemetry Latency < 10s',
            ratio: 'Latency 38s',
            timestamp: '18 mins ago',
            fullTime: '2026-10-24 13:32 UTC+5:30',
            grapStage: 'Telemetry Warning',
            recommendation: 'Check 4G/LTE gateway ping and verify optical chamber cleanliness during scheduled routine maintenance.',
            status: 'unresolved',
            assignedOfficer: 'Field Telemetry Team',
            history: ['Latency threshold breach detected']
        },
        {
            id: 'ALT-1085',
            type: 'pollution',
            severity: 'warning',
            location: `${tertiarySt} (${sorted[2]?.distance.toFixed(1)} km)`,
            pollutant: 'NO₂',
            measurement: '76 µg/m³',
            threshold: '80 µg/m³ (NAAQS 24h)',
            ratio: '0.95x Threshold',
            timestamp: '2 hours ago',
            fullTime: '2026-10-24 12:00 UTC+5:30',
            grapStage: 'Sub-threshold Advisory',
            recommendation: 'Traffic signal synchronization active to minimize intersection vehicle idling.',
            status: 'resolved',
            assignedOfficer: 'Officer ENV-2041',
            resolvedAt: '13:10 UTC+5:30',
            history: ['Elevated NO2 observed at noon', 'Traffic dispersion confirmed at 13:10']
        }
    ];
}

export default function AuthorityAlertsPage({ locationName = 'Central Monitoring Jurisdiction', coordinates }) {
    const [alerts, setAlerts] = useState(() => generateLocationAlerts(locationName, coordinates));
    const [filterType, setFilterType] = useState('all'); // 'all' | 'pollution' | 'technical'
    const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'unresolved' | 'acknowledged' | 'resolved'
    const [selectedAlert, setSelectedAlert] = useState(null);

    // Refresh alerts whenever location or coordinates change
    useEffect(() => {
        setAlerts(generateLocationAlerts(locationName, coordinates));
    }, [locationName, coordinates?.lat, coordinates?.lon]);

    const filteredAlerts = alerts.filter((a) => {
        if (filterType !== 'all' && a.type !== filterType) return false;
        if (filterStatus !== 'all' && a.status !== filterStatus) return false;
        return true;
    });

    const counts = {
        total: alerts.length,
        unresolved: alerts.filter((a) => a.status === 'unresolved').length,
        critical: alerts.filter((a) => a.severity === 'critical' && a.status !== 'resolved').length,
        technical: alerts.filter((a) => a.type === 'technical').length
    };

    const handleAcknowledge = (id) => {
        setAlerts((prev) =>
            prev.map((a) =>
                a.id === id
                    ? {
                          ...a,
                          status: 'acknowledged',
                          history: [...a.history, `Acknowledged by active officer at ${new Date().toLocaleTimeString()}`]
                      }
                    : a
            )
        );
        if (selectedAlert?.id === id) {
            setSelectedAlert((prev) => ({ ...prev, status: 'acknowledged' }));
        }
    };

    const handleResolve = (id) => {
        setAlerts((prev) =>
            prev.map((a) =>
                a.id === id
                    ? {
                          ...a,
                          status: 'resolved',
                          resolvedAt: new Date().toLocaleTimeString(),
                          history: [...a.history, `Resolved and closed by active officer at ${new Date().toLocaleTimeString()}`]
                      }
                    : a
            )
        );
        if (selectedAlert?.id === id) {
            setSelectedAlert((prev) => ({ ...prev, status: 'resolved' }));
        }
    };

    return (
        <div className="space-y-6">
            {/* Header Controls & Metric Stat Banners */}
            <div className="bg-[#0a0f1d] border border-cyan-500/15 rounded-2xl p-5 shadow-xl">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-1">
                            <ShieldAlert className="w-4 h-4 text-cyan-400" />
                            <span>Advisory & Emergency Incident Management</span>
                        </div>
                        <h2 className="text-xl font-bold text-white">
                            Active Pollution Violations & Telemetry Diagnostics
                        </h2>
                    </div>

                    {/* Filter Pills */}
                    <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs font-semibold">
                        {[
                            { id: 'all', label: 'All Alerts' },
                            { id: 'pollution', label: 'Pollution Thresholds' },
                            { id: 'technical', label: 'Technical / Sensor' }
                        ].map((t) => (
                            <button
                                key={t.id}
                                onClick={() => setFilterType(t.id)}
                                className={`px-3 py-1.5 rounded-lg transition-all ${
                                    filterType === t.id
                                        ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* KPI Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                    <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl">
                        <div className="text-[11px] text-slate-400 uppercase font-semibold">Active Incidents</div>
                        <div className="text-2xl font-bold text-white mt-0.5">{counts.unresolved}</div>
                        <div className="text-[10px] text-amber-400 mt-0.5">Require Officer Action</div>
                    </div>

                    <div className="p-3.5 bg-slate-900/60 border border-red-500/30 rounded-xl">
                        <div className="text-[11px] text-rose-400 uppercase font-semibold">Critical Breaches</div>
                        <div className="text-2xl font-bold text-rose-300 mt-0.5">{counts.critical}</div>
                        <div className="text-[10px] text-rose-400 mt-0.5">GRAP III / IV Rules Active</div>
                    </div>

                    <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl">
                        <div className="text-[11px] text-slate-400 uppercase font-semibold">Technical Health</div>
                        <div className="text-2xl font-bold text-white mt-0.5">{counts.technical}</div>
                        <div className="text-[10px] text-cyan-400 mt-0.5">Telemetry & Node Feeds</div>
                    </div>

                    <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl">
                        <div className="text-[11px] text-slate-400 uppercase font-semibold">Total Logged</div>
                        <div className="text-2xl font-bold text-white mt-0.5">{counts.total}</div>
                        <div className="text-[10px] text-emerald-400 mt-0.5">Audit Tracked</div>
                    </div>
                </div>
            </div>

            {/* Status Filter Tab Bar */}
            <div className="flex items-center gap-2">
                {[
                    { id: 'all', label: 'All Status' },
                    { id: 'unresolved', label: 'Unresolved' },
                    { id: 'acknowledged', label: 'Acknowledged' },
                    { id: 'resolved', label: 'Resolved' }
                ].map((s) => (
                    <button
                        key={s.id}
                        onClick={() => setFilterStatus(s.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            filterStatus === s.id
                                ? 'bg-slate-800 text-white border-cyan-500'
                                : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                    >
                        {s.label}
                    </button>
                ))}
            </div>

            {/* Alerts List */}
            <div className="space-y-3">
                {filteredAlerts.length === 0 ? (
                    <div className="p-12 text-center bg-[#0a0f1d] border border-slate-800 rounded-2xl">
                        <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
                        <h4 className="text-sm font-bold text-white">No alerts matching active criteria</h4>
                        <p className="text-xs text-slate-400 mt-1">All telemetry sensors and air quality limits are within nominal parameters.</p>
                    </div>
                ) : (
                    filteredAlerts.map((alert) => {
                        const isCritical = alert.severity === 'critical';
                        const isTechnical = alert.type === 'technical';

                        return (
                            <div
                                key={alert.id}
                                className={`p-5 bg-[#0a0f1d] border rounded-2xl transition-all ${
                                    isCritical
                                        ? 'border-red-500/40 hover:border-red-500'
                                        : isTechnical
                                        ? 'border-blue-500/30 hover:border-blue-500'
                                        : 'border-amber-500/30 hover:border-amber-500'
                                } shadow-lg`}
                            >
                                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                                    <div className="space-y-1.5 flex-1">
                                        <div className="flex flex-wrap items-center gap-2 text-xs">
                                            <span className="font-mono font-bold text-slate-400">{alert.id}</span>
                                            <span
                                                className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] tracking-wider ${
                                                    isCritical
                                                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                                        : isTechnical
                                                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                                }`}
                                            >
                                                {isCritical ? 'CRITICAL SEVERITY' : isTechnical ? 'TELEMETRY DIAGNOSTIC' : 'WARNING SEVERITY'}
                                            </span>
                                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold text-[10px]">
                                                {alert.grapStage}
                                            </span>
                                            <span className="text-slate-500 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                <span>{alert.timestamp}</span>
                                            </span>
                                        </div>

                                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-cyan-400" />
                                            <span>{alert.location}</span>
                                            <span className="text-xs font-normal text-slate-400">
                                                — {alert.pollutant} breach ({alert.measurement})
                                            </span>
                                        </h3>

                                        {/* Measurement vs Threshold Detail */}
                                        <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800/80 text-xs space-y-1">
                                            <div className="flex flex-wrap items-center justify-between gap-2 text-slate-300">
                                                <span><strong>Observed:</strong> <span className="text-rose-400 font-bold">{alert.measurement}</span></span>
                                                <span><strong>Regulatory Limit:</strong> {alert.threshold}</span>
                                                <span className="text-amber-300 font-bold">{alert.ratio}</span>
                                            </div>
                                            <div className="text-slate-400 pt-1 border-t border-slate-800">
                                                <strong>Mandated Response: </strong>
                                                <span>{alert.recommendation}</span>
                                            </div>
                                        </div>

                                        {/* Audit assignment info */}
                                        <div className="text-[11px] text-slate-500 flex items-center gap-3">
                                            <span>Assigned: <strong className="text-slate-300">{alert.assignedOfficer}</strong></span>
                                            <span>•</span>
                                            <span>Audit trail: {alert.history[alert.history.length - 1]}</span>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex flex-col sm:flex-row items-center gap-2 w-full lg:w-auto self-stretch lg:self-center">
                                        {alert.status === 'unresolved' && (
                                            <button
                                                onClick={() => handleAcknowledge(alert.id)}
                                                className="w-full sm:w-auto px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-semibold transition-all active:scale-95"
                                            >
                                                Acknowledge Incident
                                            </button>
                                        )}

                                        {alert.status !== 'resolved' ? (
                                            <button
                                                onClick={() => handleResolve(alert.id)}
                                                className="w-full sm:w-auto px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-xl text-xs font-semibold transition-all active:scale-95 flex items-center justify-center gap-1.5"
                                            >
                                                <Check className="w-3.5 h-3.5" />
                                                <span>Mark Resolved</span>
                                            </button>
                                        ) : (
                                            <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl font-semibold">
                                                <CheckCircle2 className="w-4 h-4" />
                                                <span>Resolved ({alert.resolvedAt})</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
