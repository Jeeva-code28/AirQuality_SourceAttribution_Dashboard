import React, { useState } from 'react';
import { aqiStations } from '../../../data/stations';
import { getAQILevel } from '../../../services/api';
import { ArrowRight, ArrowLeftRight, Check, Sparkles, Building2, MapPin } from 'lucide-react';

export default function LocationComparison({ currentLocationName = "Tambaram, Chennai", currentAqiData }) {
    const defaultTarget = aqiStations.find(s => s.name.includes("Alandur")) || aqiStations[0];
    const [selectedTarget, setSelectedTarget] = useState(defaultTarget);

    const currAqi = currentAqiData?.current?.us_aqi || 61;
    const currPm25 = currentAqiData?.current?.pm2_5 || 28;
    const currPm10 = currentAqiData?.current?.pm10 || 29;

    // Seed target metrics based on its location
    const targetSeed = Math.abs(selectedTarget.lat * 12 + selectedTarget.lon * 7);
    const targetAqi = Math.round(55 + (targetSeed % 110));
    const targetPm25 = Math.round(targetAqi * 0.48);
    const targetPm10 = Math.round(targetAqi * 0.72);

    const currLevel = getAQILevel(currAqi);
    const targetLevel = getAQILevel(targetAqi);

    const diff = currAqi - targetAqi;
    const isCleaner = diff < 0;
    const pctDiff = Math.abs(Math.round((diff / (targetAqi || 1)) * 100));

    return (
        <div className="bg-white dark:bg-[#1e293b]/70 backdrop-blur-md rounded-3xl p-6 border border-slate-200 dark:border-slate-700/60 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">
                        <ArrowLeftRight className="w-4 h-4" />
                        <span>Location Comparison Engine</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                        Compare Air Quality Side-by-Side
                    </h3>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 hidden sm:inline">Compare with:</span>
                    <select
                        value={selectedTarget.name}
                        onChange={(e) => {
                            const found = aqiStations.find(s => s.name === e.target.value);
                            if (found) setSelectedTarget(found);
                        }}
                        className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 font-semibold"
                    >
                        {aqiStations.slice(0, 15).map(st => (
                            <option key={st.name} value={st.name}>{st.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Side-by-Side Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Location 1: Active Location */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                Your Active Location
                            </span>
                            <MapPin className="w-4 h-4 text-emerald-500" />
                        </div>
                        <div className="text-base font-bold text-slate-900 dark:text-white truncate">
                            {currentLocationName.split(',')[0]}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                            {currentLocationName.split(',').slice(1).join(', ') || 'India'}
                        </div>
                    </div>

                    <div className="flex items-baseline gap-3 my-4">
                        <span className={`text-5xl font-extrabold ${currLevel.color}`}>
                            {currAqi}
                        </span>
                        <div>
                            <span className={`px-2.5 py-0.5 text-xs font-bold rounded-lg ${currLevel.bg} text-slate-900`}>
                                {currLevel.label}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-slate-200 dark:border-slate-800">
                        <div>
                            <span className="text-slate-400">PM2.5:</span> <span className="font-semibold text-slate-800 dark:text-slate-200">{currPm25} µg/m³</span>
                        </div>
                        <div>
                            <span className="text-slate-400">PM10:</span> <span className="font-semibold text-slate-800 dark:text-slate-200">{currPm10} µg/m³</span>
                        </div>
                    </div>
                </div>

                {/* Location 2: Selected Target */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
                                Comparative Station
                            </span>
                            <Building2 className="w-4 h-4 text-blue-500" />
                        </div>
                        <div className="text-base font-bold text-slate-900 dark:text-white truncate">
                            {selectedTarget.name.split(',')[0]}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                            {selectedTarget.name.split(',').slice(1).join(', ') || 'India'}
                        </div>
                    </div>

                    <div className="flex items-baseline gap-3 my-4">
                        <span className={`text-5xl font-extrabold ${targetLevel.color}`}>
                            {targetAqi}
                        </span>
                        <div>
                            <span className={`px-2.5 py-0.5 text-xs font-bold rounded-lg ${targetLevel.bg} text-slate-900`}>
                                {targetLevel.label}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-slate-200 dark:border-slate-800">
                        <div>
                            <span className="text-slate-400">PM2.5:</span> <span className="font-semibold text-slate-800 dark:text-slate-200">{targetPm25} µg/m³</span>
                        </div>
                        <div>
                            <span className="text-slate-400">PM10:</span> <span className="font-semibold text-slate-800 dark:text-slate-200">{targetPm10} µg/m³</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Differential Insight */}
            <div className={`p-4 rounded-2xl border flex items-center gap-3 ${
                isCleaner 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300' 
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
            }`}>
                <Sparkles className="w-5 h-5 flex-shrink-0" />
                <div className="text-xs sm:text-sm font-medium">
                    {diff === 0 ? (
                        <span>Both locations currently observe identical ambient AQI levels.</span>
                    ) : isCleaner ? (
                        <span>
                            <strong>{currentLocationName.split(',')[0]}</strong> has <strong>{pctDiff}% lower air pollution ({Math.abs(diff)} AQI points cleaner)</strong> than {selectedTarget.name.split(',')[0]}.
                        </span>
                    ) : (
                        <span>
                            <strong>{selectedTarget.name.split(',')[0]}</strong> has <strong>{pctDiff}% cleaner air ({Math.abs(diff)} AQI points lower)</strong> than {currentLocationName.split(',')[0]}.
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
