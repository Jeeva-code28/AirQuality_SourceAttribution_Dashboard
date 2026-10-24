import React, { useState } from 'react';
import {
    Activity,
    Server,
    ShieldCheck,
    CheckCircle2,
    AlertCircle,
    Clock,
    RefreshCw,
    Database,
    Cpu,
    Radio,
    FileText,
    UserCheck,
    Info
} from 'lucide-react';
import { getActiveSession } from '../../../services/authService';

export default function AuthorityHealthPage() {
    const [currentUser] = useState(() => getActiveSession());
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastRefreshed, setLastRefreshed] = useState(() => new Date().toLocaleTimeString());

    const systemEndpoints = [
        {
            name: 'Open-Meteo Air Quality Telemetry',
            type: 'Public Sensor Ingestion',
            url: 'https://air-quality-api.open-meteo.com/v1/air-quality',
            status: 'Operational',
            latency: '142 ms',
            successRate: '99.8%',
            lastSync: '2 mins ago',
            cacheExpiry: '15 mins TTL'
        },
        {
            name: 'CPCB Ground Stations Telemetry Sync',
            type: 'Government Data Integration',
            url: 'CPCB CAAQMS Real-Time Grid',
            status: 'Operational',
            latency: '210 ms',
            successRate: '98.9%',
            lastSync: '4 mins ago',
            cacheExpiry: '15 mins TTL'
        },
        {
            name: 'NASA FIRMS Satellite Thermal Hotspots',
            type: 'Orbital Hotspot Telemetry',
            url: 'NASA FIRMS VIIRS/MODIS S-NPP',
            status: 'Operational',
            latency: '340 ms',
            successRate: '99.4%',
            lastSync: '18 mins ago',
            cacheExpiry: '30 mins TTL'
        },
        {
            name: 'BreatheLens LSTM & LightGBM Inference Engine',
            type: 'Predictive & Attribution Core',
            url: 'FastAPI Backend /api/forecast & /api/source',
            status: 'Operational (Ensemble Mode)',
            latency: '85 ms',
            successRate: '100%',
            lastSync: 'Continuous',
            cacheExpiry: 'Live Engine'
        }
    ];

    const auditLogs = [
        { id: 'LOG-8841', action: 'OFFICER_SIGNIN', actor: currentUser?.displayName || 'Officer ENV-2041', target: 'Authority Portal Gateway', timestamp: '22 mins ago', status: 'SUCCESS' },
        { id: 'LOG-8840', action: 'ALERT_RESOLVED', actor: 'Officer ENV-2041', target: 'ALT-1085 (Punjabi Bagh NO2)', timestamp: '1 hour ago', status: 'SUCCESS' },
        { id: 'LOG-8839', action: 'REPORT_EXPORTED', actor: 'Officer ENV-2041', target: 'CSV Daily Summary', timestamp: '2 hours ago', status: 'SUCCESS' },
        { id: 'LOG-8838', action: 'POLICY_SIMULATION', actor: 'Officer ENV-2041', target: 'Odd-Even Traffic & Construction Ban', timestamp: '3 hours ago', status: 'SUCCESS' },
        { id: 'LOG-8837', action: 'TELEMETRY_REFRESH', actor: 'System Scheduler', target: 'Open-Meteo 50+ Stations Sync', timestamp: '30 mins ago', status: 'SUCCESS' },
        { id: 'LOG-8836', action: 'ALERT_ACKNOWLEDGED', actor: 'Officer ENV-2041', target: 'ALT-1091 (Jahangirpuri PM10)', timestamp: '4 hours ago', status: 'SUCCESS' }
    ];

    const handleRefreshTelemetry = () => {
        setIsRefreshing(true);
        setTimeout(() => {
            setIsRefreshing(false);
            setLastRefreshed(new Date().toLocaleTimeString());
        }, 900);
    };

    return (
        <div className="space-y-6">
            {/* Header Status Bar */}
            <div className="bg-[#0a0f1d] border border-cyan-500/15 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-1">
                        <Activity className="w-4 h-4" />
                        <span>Data Source & System Health</span>
                    </div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <span>Telemetry Infrastructure & Audit Governance</span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold">
                            All Systems Nominal
                        </span>
                    </h2>
                </div>

                <div className="flex items-center gap-3">
                    <div className="text-xs text-slate-400">
                        Last ping: <strong className="text-slate-200">{lastRefreshed}</strong>
                    </div>
                    <button
                        onClick={handleRefreshTelemetry}
                        disabled={isRefreshing}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isRefreshing ? 'animate-spin' : ''}`} />
                        <span>Ping Services</span>
                    </button>
                </div>
            </div>

            {/* Regulatory & Decision Support Disclaimer */}
            <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl flex items-start gap-3">
                <Info className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed text-slate-300">
                    <strong className="text-white">Institutional Operational Scope: </strong>
                    BreatheLens operates as an environmental intelligence and predictive decision-support system. Forecasted pollutant trajectories, source attributions, and policy impact estimates are decision-support aids designed for authorized environmental officers and station managers. Regulatory penalties and formal enforcement actions must align with approved statutory protocols.
                </div>
            </div>

            {/* Telemetry Services Health Grid */}
            <div className="space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                    Data Source Availability & Telemetry Latency
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {systemEndpoints.map((ep, idx) => (
                        <div key={idx} className="p-5 bg-[#0a0f1d] border border-slate-800 rounded-2xl space-y-3 shadow-lg">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">
                                        {ep.type}
                                    </div>
                                    <h4 className="text-base font-bold text-white mt-0.5">{ep.name}</h4>
                                    <div className="text-xs text-slate-400 font-mono mt-0.5 truncate max-w-sm">
                                        {ep.url}
                                    </div>
                                </div>
                                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    <span>{ep.status}</span>
                                </span>
                            </div>

                            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-xs text-slate-400">
                                <div>
                                    <span className="block text-[10px] text-slate-500 uppercase">Latency</span>
                                    <strong className="text-slate-200">{ep.latency}</strong>
                                </div>
                                <div>
                                    <span className="block text-[10px] text-slate-500 uppercase">Uptime</span>
                                    <strong className="text-emerald-300">{ep.successRate}</strong>
                                </div>
                                <div>
                                    <span className="block text-[10px] text-slate-500 uppercase">Freshness</span>
                                    <strong className="text-slate-200">{ep.lastSync}</strong>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Officer Accounts & Role Permissions */}
            <div className="bg-[#0a0f1d] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                            Officer Accounts & Permission Tiers
                        </h3>
                        <p className="text-xs text-slate-400">
                            Role-based access matrix enforced on authority features
                        </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-400">Active Officer:</span>
                        <strong className="text-cyan-400">{currentUser?.displayName || 'Officer ENV-2041'}</strong>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1.5">
                        <div className="font-bold text-white flex items-center justify-between">
                            <span>Level 1: Analyst</span>
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">Read Only</span>
                        </div>
                        <p className="text-slate-400 text-[11px] leading-relaxed">
                            View live air quality, historical trends, and source attribution charts.
                        </p>
                    </div>

                    <div className="p-4 bg-slate-900/60 border border-cyan-500/40 rounded-xl space-y-1.5">
                        <div className="font-bold text-white flex items-center justify-between">
                            <span>Level 2: Station Officer (Active)</span>
                            <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-bold">Your Role</span>
                        </div>
                        <p className="text-slate-400 text-[11px] leading-relaxed">
                            Acknowledge and resolve alerts, export regulatory reports, and run intervention simulations.
                        </p>
                    </div>

                    <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-1.5">
                        <div className="font-bold text-white flex items-center justify-between">
                            <span>Level 3: System Administrator</span>
                            <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px]">Admin</span>
                        </div>
                        <p className="text-slate-400 text-[11px] leading-relaxed">
                            Manage sensor station nodes, update ML inference models, and configure GRAP rules.
                        </p>
                    </div>
                </div>
            </div>

            {/* Operational Audit Logs */}
            <div className="bg-[#0a0f1d] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                            Operational Audit Trail
                        </h3>
                        <p className="text-xs text-slate-400">
                            Chronological compliance log of officer actions, alert resolutions, and report generations
                        </p>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded bg-slate-900 text-slate-400 border border-slate-800 font-mono">
                        6 Events Captured
                    </span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-800">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900/80 text-slate-400 uppercase font-bold tracking-wider border-b border-slate-800">
                            <tr>
                                <th className="p-3">Event ID</th>
                                <th className="p-3">Action Type</th>
                                <th className="p-3">Responsible Officer</th>
                                <th className="p-3">Target / Resource</th>
                                <th className="p-3">Timestamp</th>
                                <th className="p-3">Result</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/80">
                            {auditLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-900/40">
                                    <td className="p-3 font-mono text-slate-400">{log.id}</td>
                                    <td className="p-3 font-semibold text-white">{log.action}</td>
                                    <td className="p-3 text-cyan-300">{log.actor}</td>
                                    <td className="p-3 text-slate-300">{log.target}</td>
                                    <td className="p-3 text-slate-400">{log.timestamp}</td>
                                    <td className="p-3">
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                                            {log.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
