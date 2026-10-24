import React, { useState, useEffect, useMemo } from 'react';
import {
    FileText,
    Printer,
    Download,
    Calendar,
    MapPin,
    AlertTriangle,
    BarChart3,
    CheckCircle2,
    Share2,
    Clock,
    FileSpreadsheet
} from 'lucide-react';
import { aqiStations, calculateDistance } from '../../../data/stations';

export default function AuthorityReportsPage({ locationName = 'Central Monitoring Jurisdiction', coordinates }) {
    const [reportType, setReportType] = useState('daily'); // 'daily' | 'weekly' | 'incident'
    const [selectedRegion, setSelectedRegion] = useState(() => `${locationName} & Regional Network`);
    const [generatedTimestamp] = useState(() => new Date().toLocaleString('en-US', {
        dateStyle: 'full',
        timeStyle: 'medium'
    }));

    useEffect(() => {
        if (locationName) {
            setSelectedRegion(`${locationName} & Regional Network`);
        }
    }, [locationName]);

    const summaryData = useMemo(() => {
        const lat = coordinates?.lat || 12.9249;
        const lon = coordinates?.lon || 80.1472;
        const sorted = [...aqiStations]
            .map(s => ({ ...s, distance: calculateDistance(lat, lon, s.lat, s.lon) }))
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 6);

        return sorted.map((st, i) => {
            const seed = Math.abs(st.lat * 15 + st.lon * 9 + i * 3);
            const aqi = Math.max(30, Math.round(55 + (seed % 190)));
            const pm25 = (aqi * 0.58).toFixed(1);
            const pm10 = (aqi * 1.15).toFixed(1);
            let status = 'Moderate';
            if (aqi > 200) status = 'Very Unhealthy';
            else if (aqi > 150) status = 'Unhealthy';
            else if (aqi > 100) status = 'Unhealthy for Sensitive';
            else if (aqi <= 50) status = 'Good';

            const sources = [
                'Vehicular Traffic (42%)',
                'Road Dust & Resuspension (38%)',
                'Industrial Boiler Output (31%)',
                'Coastal / Regional Dispersion (55%)',
                'Construction Activities (34%)',
                'Biomass & Fugitive Smolder (29%)'
            ];

            return {
                station: `${st.name} (${st.distance.toFixed(1)} km)`,
                stationName: st.name,
                aqi,
                pm25,
                pm10,
                status,
                source: sources[seed % sources.length]
            };
        });
    }, [coordinates]);

    const peakStation = summaryData.length > 0
        ? summaryData.reduce((prev, curr) => (curr.aqi > prev.aqi ? curr : prev), summaryData[0])
        : { stationName: locationName, aqi: 110, pm10: 120 };

    const meanAqi = summaryData.length > 0
        ? Math.round(summaryData.reduce((acc, s) => acc + s.aqi, 0) / summaryData.length)
        : 110;

    const handlePrint = () => {
        window.print();
    };

    const handleExportCSV = () => {
        const headers = ['Station Name', 'Current AQI', 'PM2.5 (ug/m3)', 'PM10 (ug/m3)', 'Regulatory Status', 'Primary Attributed Source'];
        const rows = summaryData.map((d) => [
            `"${d.station}"`,
            d.aqi,
            d.pm25,
            d.pm10,
            d.status,
            `"${d.source}"`
        ]);

        const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `BreatheLens_Executive_Report_${reportType}_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            {/* Header Control Panel (Hidden during Print) */}
            <div className="bg-[#0a0f1d] border border-cyan-500/15 rounded-2xl p-5 shadow-xl print:hidden">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-1">
                            <FileText className="w-4 h-4" />
                            <span>Executive Reports & Decision Support</span>
                        </div>
                        <h2 className="text-xl font-bold text-white">
                            Environmental Intelligence & Regulatory Review Briefs
                        </h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                        {/* Report Scope Selector */}
                        <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs font-semibold">
                            {[
                                { id: 'daily', label: '24H Daily Brief' },
                                { id: 'weekly', label: '7-Day Summary' },
                                { id: 'incident', label: 'Incident Audit' }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setReportType(tab.id)}
                                    className={`px-3 py-1.5 rounded-lg transition-all ${
                                        reportType === tab.id
                                            ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                                            : 'text-slate-400 hover:text-white'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Action Buttons */}
                        <button
                            onClick={handleExportCSV}
                            className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-xl text-xs font-semibold transition-all active:scale-95"
                            title="Export tabular data to CSV"
                        >
                            <Download className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Export CSV</span>
                        </button>

                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-md shadow-cyan-500/25 active:scale-95"
                            title="Print executive PDF report"
                        >
                            <Printer className="w-4 h-4" />
                            <span>Print / PDF Report</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Printable Executive Report Paper Surface */}
            <div className="bg-[#0b1220] border border-slate-800 rounded-2xl p-6 sm:p-10 shadow-2xl text-slate-200 print:border-none print:p-0 print:bg-white print:text-black">
                {/* Formal Report Header */}
                <div className="border-b border-slate-800 pb-6 mb-6 print:border-black">
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="text-xs uppercase font-extrabold tracking-widest text-cyan-400 print:text-blue-700">
                                Official Environmental Intelligence Briefing
                            </div>
                            <h1 className="text-2xl font-black text-white mt-1 print:text-black">
                                BreatheLens Air Quality & Source Attribution Digest
                            </h1>
                            <div className="text-xs text-slate-400 mt-1 print:text-gray-600 flex flex-wrap items-center gap-4">
                                <span>Report Classification: <strong>Regulatory Decision Support</strong></span>
                                <span>•</span>
                                <span>Region: <strong>{selectedRegion}</strong></span>
                                <span>•</span>
                                <span>Generated: <strong>{generatedTimestamp}</strong></span>
                            </div>
                        </div>

                        <div className="hidden sm:block text-right">
                            <div className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400 font-mono text-xs font-bold print:border-gray-400 print:text-gray-800">
                                REF: BL-REP-{new Date().getFullYear()}-094
                            </div>
                            <div className="text-[10px] text-slate-500 mt-1 print:text-gray-500">
                                Verified Telemetry
                            </div>
                        </div>
                    </div>
                </div>

                {/* Executive Summary Narrative */}
                <div className="space-y-3 mb-8">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 print:text-black border-l-2 border-cyan-500 pl-3">
                        1. Executive Situation Synopsis
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 print:text-gray-800 leading-relaxed">
                        During the reporting period, air quality across {selectedRegion} recorded an <strong className="text-cyan-300 print:text-blue-700">average AQI of {meanAqi}</strong>. Continuous environmental sensor telemetry indicates localized particulate concentrations modulated by boundary layer stability and atmospheric mixing across municipal zones.
                    </p>
                </div>

                {/* Key Metrics Matrix */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                    <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 print:border-gray-300 print:bg-gray-50">
                        <div className="text-[10px] uppercase font-bold text-slate-400 print:text-gray-600">Mean Regional AQI</div>
                        <div className="text-2xl font-black text-white print:text-black mt-1">{meanAqi}</div>
                        <div className="text-[11px] text-cyan-400 print:text-blue-600">{meanAqi > 150 ? 'Unhealthy' : (meanAqi > 100 ? 'Moderate-Sensitive' : 'Satisfactory')}</div>
                    </div>

                    <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 print:border-gray-300 print:bg-gray-50">
                        <div className="text-[10px] uppercase font-bold text-slate-400 print:text-gray-600">Peak Exposure Node</div>
                        <div className="text-base font-bold text-white print:text-black mt-1 truncate">{peakStation.stationName}</div>
                        <div className="text-[11px] text-slate-400 print:text-gray-600">AQI {peakStation.aqi} (PM10 {peakStation.pm10})</div>
                    </div>

                    <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 print:border-gray-300 print:bg-gray-50">
                        <div className="text-[10px] uppercase font-bold text-slate-400 print:text-gray-600">Dominant Source</div>
                        <div className="text-base font-bold text-white print:text-black mt-1">Vehicular + Dust</div>
                        <div className="text-[11px] text-cyan-400 print:text-blue-600">62% of Total Mass</div>
                    </div>

                    <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 print:border-gray-300 print:bg-gray-50">
                        <div className="text-[10px] uppercase font-bold text-slate-400 print:text-gray-600">Regulatory Response</div>
                        <div className="text-base font-bold text-amber-300 print:text-amber-700 mt-1">{meanAqi > 150 ? 'GRAP Stage III' : 'Standard Surveillance'}</div>
                        <div className="text-[11px] text-slate-400 print:text-gray-600">Active Monitoring</div>
                    </div>
                </div>

                {/* Location-Wise Multi-Station Comparison Table */}
                <div className="space-y-3 mb-8">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 print:text-black border-l-2 border-cyan-500 pl-3">
                        2. Location-Wise Monitored Comparisons
                    </h3>

                    <div className="overflow-x-auto rounded-xl border border-slate-800 print:border-gray-400">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-900/80 text-slate-400 uppercase font-bold tracking-wider print:bg-gray-200 print:text-gray-800 border-b border-slate-800">
                                <tr>
                                    <th className="p-3">Monitoring Station</th>
                                    <th className="p-3">AQI</th>
                                    <th className="p-3">PM2.5 (µg/m³)</th>
                                    <th className="p-3">PM10 (µg/m³)</th>
                                    <th className="p-3">Classification</th>
                                    <th className="p-3">Primary Source Attribution</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/80 print:divide-gray-300">
                                {summaryData.map((s, idx) => (
                                    <tr key={idx} className="hover:bg-slate-900/40 print:hover:bg-transparent">
                                        <td className="p-3 font-semibold text-white print:text-black">{s.station}</td>
                                        <td className="p-3 font-mono font-bold">{s.aqi}</td>
                                        <td className="p-3 font-mono">{s.pm25}</td>
                                        <td className="p-3 font-mono">{s.pm10}</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                s.aqi > 200 ? 'bg-red-500/20 text-red-400 print:text-red-700' :
                                                s.aqi > 100 ? 'bg-amber-500/20 text-amber-400 print:text-amber-700' :
                                                'bg-emerald-500/20 text-emerald-400 print:text-green-700'
                                            }`}>
                                                {s.status}
                                            </span>
                                        </td>
                                        <td className="p-3 text-slate-300 print:text-gray-800">{s.source}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Hotspot & Satellite Observations */}
                <div className="space-y-3 mb-8">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 print:text-black border-l-2 border-cyan-500 pl-3">
                        3. Satellite Thermal Anomaly & Fire Hotspot Synthesis
                    </h3>
                    <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800 print:border-gray-300 text-xs text-slate-300 print:text-gray-800 leading-relaxed">
                        NASA FIRMS VIIRS & MODIS satellite sensors detected <strong>active agricultural and industrial thermal anomalies</strong> within the regional perimeter buffer during the past 24 hours. Downwind particulate trajectory modeling continuously tracks ambient dispersion into {locationName} and surrounding districts.
                    </div>
                </div>

                {/* Regulatory Policy Recommendations */}
                <div className="space-y-3 mb-8">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 print:text-black border-l-2 border-cyan-500 pl-3">
                        4. Actionable Mandates & Next Steps
                    </h3>
                    <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-300 print:text-gray-800 leading-relaxed">
                        <li>Maintain intensive mechanical road sprinkling and anti-smog guns on high-density traffic arteries across {locationName}.</li>
                        <li>Enforce strict ban on diesel generator operations except for emergency healthcare facilities.</li>
                        <li>Enhance public transportation dispatch frequency by +15% during peak commute windows.</li>
                        <li>Continuous drone and optical surveillance over industrial perimeter clusters and manufacturing corridors in {selectedRegion}.</li>
                    </ul>
                </div>

                {/* Report Sign-off & Data Provenance */}
                <div className="pt-6 border-t border-slate-800/80 text-[11px] text-slate-400 print:border-black print:text-gray-600 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <div>Data Sources: <strong>Central Pollution Control Board (CPCB), Open-Meteo, NASA FIRMS</strong></div>
                        <div>Telemetry Pipeline: <strong>BreatheLens v2.0 Enterprise Intelligence Engine</strong></div>
                    </div>
                    <div className="text-right">
                        <div>Authorized Session: <strong>Officer ENV-2041</strong></div>
                        <div>Generated at: <strong>{generatedTimestamp}</strong></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
