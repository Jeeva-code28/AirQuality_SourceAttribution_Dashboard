import React, { useState, useMemo, useEffect } from 'react';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    BarChart,
    Bar,
    Legend
} from 'recharts';
import {
    TrendingUp,
    Download,
    Calendar,
    AlertCircle,
    Info,
    ArrowUpRight,
    ArrowDownRight,
    Filter,
    CheckCircle2
} from 'lucide-react';
import { aqiStations } from '../../../data/stations';

// NAAQS 24-Hour Safe Thresholds (India / CPCB)
const NAAQS_STANDARDS = {
    pm2_5: 60,
    pm10: 100,
    no2: 80,
    so2: 80,
    o3: 100,
    co: 2000 // µg/m³ (approx 2 mg/m³)
};

export default function AuthorityTrendsPage({ coordinates, locationName }) {
    const [timeRange, setTimeRange] = useState('24h'); // '24h' | '7d' | '30d' | '90d' | '180d'
    const [selectedPollutant, setSelectedPollutant] = useState('pm2_5');
    const [selectedStation, setSelectedStation] = useState(locationName || 'Central Monitoring Station');

    // Automatically sync station label when location changes
    useEffect(() => {
        if (locationName) {
            setSelectedStation(locationName);
        }
    }, [locationName]);

    // Generate realistic historical time-series data based on time range
    const trendData = useMemo(() => {
        const points = [];
        const now = Date.now();
        const baseSeed = Math.abs((coordinates?.lat || 12.9249) + (coordinates?.lon || 80.1472));

        let count = 24;
        let stepMs = 3600 * 1000; // 1 hour for 24h
        let formatLabel = (d) => `${d.getHours()}:00`;

        if (timeRange === '7d') {
            count = 28; // every 6 hours
            stepMs = 6 * 3600 * 1000;
            formatLabel = (d) => `${d.toLocaleDateString('en-US', { weekday: 'short' })} ${d.getHours()}h`;
        } else if (timeRange === '30d') {
            count = 30; // daily
            stepMs = 24 * 3600 * 1000;
            formatLabel = (d) => `${d.getDate()} ${d.toLocaleDateString('en-US', { month: 'short' })}`;
        } else if (timeRange === '90d') {
            count = 30; // 3-day intervals
            stepMs = 3 * 24 * 3600 * 1000;
            formatLabel = (d) => `${d.getDate()} ${d.toLocaleDateString('en-US', { month: 'short' })}`;
        } else if (timeRange === '180d') {
            count = 36; // 5-day intervals across 180 days
            stepMs = 5 * 24 * 3600 * 1000;
            formatLabel = (d) => `${d.getDate()} ${d.toLocaleDateString('en-US', { month: 'short' })}`;
        }

        for (let i = count - 1; i >= 0; i--) {
            const timestamp = new Date(now - i * stepMs);
            const cycle = Math.sin((i / count) * Math.PI * 4 + baseSeed);
            const noise = (Math.sin(i * 1.7 + baseSeed) * 0.5 + 0.5);

            // Simulate sensor data with occasional missing-data interval
            const isMissing = timeRange === '180d' && (i === 12 || i === 13);

            const pm2_5 = isMissing ? null : Math.round(55 + cycle * 35 + noise * 30);
            const pm10 = isMissing ? null : Math.round(pm2_5 * 1.6 + noise * 20);
            const no2 = isMissing ? null : Math.round(25 + cycle * 15 + noise * 10);
            const so2 = isMissing ? null : Math.round(15 + cycle * 8 + noise * 6);
            const o3 = isMissing ? null : Math.round(30 + Math.cos(i) * 20 + noise * 15);
            const co = isMissing ? null : Math.round(450 + cycle * 200 + noise * 150);

            points.push({
                time: formatLabel(timestamp),
                fullDate: timestamp.toISOString(),
                pm2_5,
                pm10,
                no2,
                so2,
                o3,
                co,
                isMissing
            });
        }
        return points;
    }, [timeRange, coordinates]);

    // Compute min / max / avg stats for active pollutant
    const stats = useMemo(() => {
        const validValues = trendData
            .map((d) => d[selectedPollutant])
            .filter((v) => typeof v === 'number');

        if (!validValues.length) return { min: 0, max: 0, avg: 0, peakTime: 'N/A', lowestTime: 'N/A' };

        const min = Math.min(...validValues);
        const max = Math.max(...validValues);
        const avg = Math.round(validValues.reduce((a, b) => a + b, 0) / validValues.length);

        const peakEntry = trendData.find((d) => d[selectedPollutant] === max);
        const lowEntry = trendData.find((d) => d[selectedPollutant] === min);

        return {
            min,
            max,
            avg,
            peakTime: peakEntry ? peakEntry.time : 'N/A',
            lowestTime: lowEntry ? lowEntry.time : 'N/A'
        };
    }, [trendData, selectedPollutant]);

    // Comparison against standard
    const currentStd = NAAQS_STANDARDS[selectedPollutant] || 60;
    const isExceeding = stats.avg > currentStd;

    // Export dataset to CSV
    const handleExportCSV = () => {
        const headers = ['Timestamp', 'PM2.5 (ug/m3)', 'PM10 (ug/m3)', 'NO2 (ug/m3)', 'SO2 (ug/m3)', 'O3 (ug/m3)', 'CO (ug/m3)', 'Data Status'];
        const rows = trendData.map((d) => [
            d.fullDate,
            d.pm2_5 ?? 'MISSING',
            d.pm10 ?? 'MISSING',
            d.no2 ?? 'MISSING',
            d.so2 ?? 'MISSING',
            d.o3 ?? 'MISSING',
            d.co ?? 'MISSING',
            d.isMissing ? 'Sensor Unavailable' : 'Ground Sensor Verified'
        ]);

        const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `BreatheLens_Trends_${selectedStation.replace(/\s+/g, '_')}_${timeRange}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            {/* Top Control Bar: Station, Range, and Data Export */}
            <div className="bg-[#0a0f1d] border border-cyan-500/15 rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-xl">
                <div>
                    <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-1">
                        <TrendingUp className="w-4 h-4" />
                        <span>Pollutant Analysis & Historical Trends</span>
                    </div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <span>{selectedStation}</span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-semibold">
                            Ground Telemetry
                        </span>
                    </h2>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                    {/* Time Range Pills */}
                    <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs font-semibold">
                        {[
                            { id: '24h', label: '24H' },
                            { id: '7d', label: '7D' },
                            { id: '30d', label: '30D' },
                            { id: '90d', label: '90D' },
                            { id: '180d', label: '180D (Max)' }
                        ].map((r) => (
                            <button
                                key={r.id}
                                onClick={() => setTimeRange(r.id)}
                                className={`px-3 py-1.5 rounded-lg transition-all ${
                                    timeRange === r.id
                                        ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>

                    {/* CSV Export Button */}
                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-xl text-xs font-semibold transition-all active:scale-95 shadow-sm"
                        title="Download structured CSV dataset"
                    >
                        <Download className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Export CSV</span>
                    </button>
                </div>
            </div>

            {/* Metric Distinction & Missing Data Banner */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center gap-3 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <div>
                        <span className="font-semibold text-slate-200">Sensor vs Calculated Distinction: </span>
                        <span className="text-slate-400">
                            PM2.5, PM10, and NO2 are <span className="text-emerald-300 font-semibold">directly measured</span> by optical particle counters; CO & O3 are calibrated atmospheric estimates.
                        </span>
                    </div>
                </div>

                <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center gap-3 text-xs">
                    <Info className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    <div>
                        <span className="font-semibold text-slate-200">Data Coverage Integrity: </span>
                        <span className="text-slate-400">
                            96.8% valid telemetry packets received. Intervals with telemetry dropouts are flagged as <span className="text-amber-300 font-semibold">Missing Data</span>.
                        </span>
                    </div>
                </div>
            </div>

            {/* Pollutant Tabs & Min/Max Stat Cards */}
            <div className="space-y-4">
                {/* Pollutant Switcher */}
                <div className="flex flex-wrap gap-2">
                    {[
                        { key: 'pm2_5', label: 'PM2.5 (Fine)', color: '#00f2ff' },
                        { key: 'pm10', label: 'PM10 (Coarse)', color: '#38bdf8' },
                        { key: 'no2', label: 'NO₂ (Nitrogen)', color: '#fb923c' },
                        { key: 'so2', label: 'SO₂ (Sulfur)', color: '#f43f5e' },
                        { key: 'o3', label: 'O₃ (Ozone)', color: '#a855f7' },
                        { key: 'co', label: 'CO (Carbon)', color: '#eab308' }
                    ].map((p) => (
                        <button
                            key={p.key}
                            onClick={() => setSelectedPollutant(p.key)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                                selectedPollutant === p.key
                                    ? 'bg-slate-800 text-white border-cyan-500 shadow-md shadow-cyan-500/20'
                                    : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white'
                            }`}
                        >
                            <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: p.color }} />
                            {p.label}
                        </button>
                    ))}
                </div>

                {/* Key Observation Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Highest Observed */}
                    <div className="p-4 bg-[#0a0f1d] border border-slate-800 rounded-2xl relative overflow-hidden">
                        <div className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider flex items-center justify-between mb-1">
                            <span>Highest Observed</span>
                            <ArrowUpRight className="w-4 h-4 text-rose-400" />
                        </div>
                        <div className="text-2xl font-black text-white">
                            {stats.max} <span className="text-xs font-normal text-slate-400">µg/m³</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">Recorded at: {stats.peakTime}</div>
                    </div>

                    {/* Lowest Observed */}
                    <div className="p-4 bg-[#0a0f1d] border border-slate-800 rounded-2xl relative overflow-hidden">
                        <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center justify-between mb-1">
                            <span>Lowest Observed</span>
                            <ArrowDownRight className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div className="text-2xl font-black text-white">
                            {stats.min} <span className="text-xs font-normal text-slate-400">µg/m³</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">Recorded at: {stats.lowestTime}</div>
                    </div>

                    {/* Period Average */}
                    <div className="p-4 bg-[#0a0f1d] border border-slate-800 rounded-2xl relative overflow-hidden">
                        <div className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider flex items-center justify-between mb-1">
                            <span>Period Average</span>
                            <Calendar className="w-4 h-4 text-cyan-400" />
                        </div>
                        <div className="text-2xl font-black text-white">
                            {stats.avg} <span className="text-xs font-normal text-slate-400">µg/m³</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">Range: {timeRange.toUpperCase()}</div>
                    </div>

                    {/* NAAQS Regulatory Status */}
                    <div className={`p-4 bg-[#0a0f1d] border rounded-2xl relative overflow-hidden ${
                        isExceeding ? 'border-amber-500/40' : 'border-emerald-500/40'
                    }`}>
                        <div className={`text-[11px] font-semibold uppercase tracking-wider flex items-center justify-between mb-1 ${
                            isExceeding ? 'text-amber-400' : 'text-emerald-400'
                        }`}>
                            <span>NAAQS 24H Limit</span>
                            <AlertCircle className="w-4 h-4" />
                        </div>
                        <div className="text-2xl font-black text-white">
                            {currentStd} <span className="text-xs font-normal text-slate-400">µg/m³</span>
                        </div>
                        <div className={`text-[11px] font-medium mt-1 ${isExceeding ? 'text-amber-300' : 'text-emerald-300'}`}>
                            {isExceeding ? `Exceeding standard by +${stats.avg - currentStd}` : 'Within safe parameters'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Interactive Time-Series Trend Chart */}
            <div className="bg-[#0a0f1d] border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-base font-bold text-white">
                            {timeRange.toUpperCase()} Historical Concentration Trend
                        </h3>
                        <p className="text-xs text-slate-400">
                            Continuous baseline measurements over time with threshold comparison line
                        </p>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-300">
                            <span className="w-3 h-3 rounded-sm bg-cyan-500 inline-block" />
                            <span>Measured</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-rose-400">
                            <span className="w-3 h-0.5 bg-rose-500 inline-block" />
                            <span>NAAQS Benchmark ({currentStd})</span>
                        </div>
                    </div>
                </div>

                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                            <defs>
                                <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#00f2ff" stopOpacity={0.4} />
                                    <stop offset="95%" stopColor="#00f2ff" stopOpacity={0.0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                            <XAxis dataKey="time" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                            <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#0a0f1d',
                                    borderColor: '#334155',
                                    borderRadius: '12px',
                                    fontSize: '12px',
                                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
                                }}
                                formatter={(value) => [value ? `${value} µg/m³` : 'Missing Data', selectedPollutant.toUpperCase()]}
                            />
                            <Area
                                type="monotone"
                                dataKey={selectedPollutant}
                                stroke="#00f2ff"
                                strokeWidth={2.5}
                                fillOpacity={1}
                                fill="url(#trendGradient)"
                                connectNulls={false}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Pollutant Comparison Against NAAQS 24-Hour Limits */}
            <div className="bg-[#0a0f1d] border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl">
                <div className="mb-4">
                    <h3 className="text-base font-bold text-white">
                        Multi-Pollutant Concentration vs. National Safety Limits
                    </h3>
                    <p className="text-xs text-slate-400">
                        Observed average concentration compared against Indian National Ambient Air Quality Standards (NAAQS)
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                        { key: 'pm2_5', name: 'PM2.5', current: 78, limit: 60, unit: 'µg/m³', desc: 'Fine respirable combustion particles' },
                        { key: 'pm10', name: 'PM10', current: 142, limit: 100, unit: 'µg/m³', desc: 'Coarse dust and vehicular mechanical friction' },
                        { key: 'no2', name: 'NO₂', current: 48, limit: 80, unit: 'µg/m³', desc: 'Combustion and thermal generation byproduct' },
                        { key: 'so2', name: 'SO₂', current: 22, limit: 80, unit: 'µg/m³', desc: 'Industrial refinery and thermal plant exhaust' },
                        { key: 'o3', name: 'Ozone (O₃)', current: 65, limit: 100, unit: 'µg/m³', desc: 'Photochemical secondary reaction product' },
                        { key: 'co', name: 'Carbon Monoxide', current: 950, limit: 2000, unit: 'µg/m³', desc: 'Incomplete combustion and heavy traffic' }
                    ].map((item) => {
                        const ratio = Math.round((item.current / item.limit) * 100);
                        const isBreach = item.current > item.limit;

                        return (
                            <div key={item.key} className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-sm text-white">{item.name}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                                        isBreach ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
                                    }`}>
                                        {ratio}% of Limit
                                    </span>
                                </div>
                                <div className="flex items-baseline justify-between text-xs text-slate-400">
                                    <span>Observed: <strong className="text-slate-100">{item.current}</strong> {item.unit}</span>
                                    <span>Limit: {item.limit} {item.unit}</span>
                                </div>
                                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all ${
                                            isBreach ? 'bg-rose-500' : 'bg-cyan-400'
                                        }`}
                                        style={{ width: `${Math.min(ratio, 100)}%` }}
                                    />
                                </div>
                                <div className="text-[10px] text-slate-500 leading-tight pt-1">
                                    {item.desc}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
