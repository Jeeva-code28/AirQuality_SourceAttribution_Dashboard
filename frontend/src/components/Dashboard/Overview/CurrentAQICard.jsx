import React, { useState } from 'react';
import { Navigation, RefreshCw, AlertTriangle, Share2, Check, Radio, TrendingUp, TrendingDown, Info } from 'lucide-react';
import { getAQILevel } from '../../../services/api';

export default function CurrentAQICard({
    data,
    loading,
    error,
    onLocate,
    onRetry,
    locationName = "Your Location",
    matchedStation = null,
    deviceLocation = null
}) {
    const [copied, setCopied] = useState(false);

    const handleRetry = () => {
        if (onRetry) {
            onRetry();
        } else {
            window.location.reload();
        }
    };

    if (error) {
        return (
            <div
                className="col-span-12 lg:col-span-8 bg-white dark:bg-[#1e293b]/70 backdrop-blur-md rounded-3xl p-6 border border-red-500/30 shadow-xl min-h-[16rem] flex flex-col items-center justify-center gap-4 text-center"
                role="alert"
                aria-live="polite"
            >
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                    <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="text-red-500 dark:text-red-400 text-lg font-semibold">Unable to Load Air Quality Data</div>
                <p className="text-slate-600 dark:text-slate-400 text-sm max-w-md">
                    {error.includes('limit') || error.includes('exceeded')
                        ? 'Rate limit reached on public data nodes. Fallback cache will restore momentarily.'
                        : 'Failed to communicate with sensor network. Please check network connection or retry.'}
                </p>
                <button
                    onClick={handleRetry}
                    className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 active:scale-95 rounded-xl text-white text-sm font-semibold transition-all shadow-lg shadow-red-600/20"
                    aria-label="Retry loading air quality data"
                >
                    <RefreshCw className="w-4 h-4" />
                    <span>Retry Request</span>
                </button>
            </div>
        );
    }

    if (loading || !data) {
        return (
            <div
                className="col-span-12 lg:col-span-8 bg-white dark:bg-[#1e293b]/50 backdrop-blur-md rounded-3xl p-6 border border-slate-200 dark:border-slate-700/50 shadow-xl animate-pulse min-h-[16rem] flex flex-col justify-between"
                aria-busy="true"
                aria-label="Loading current air quality data"
            >
                <div className="h-6 w-48 bg-slate-200 dark:bg-slate-700 rounded"></div>
                <div className="flex gap-4 items-baseline">
                    <div className="h-16 w-28 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
                    <div className="h-8 w-32 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
                    <div className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
                </div>
            </div>
        );
    }

    if (!data.current) {
        return (
            <div className="col-span-12 lg:col-span-8 bg-white dark:bg-[#1e293b]/70 backdrop-blur-md rounded-3xl p-6 border border-amber-500/30 shadow-xl min-h-[16rem] flex flex-col items-center justify-center gap-4 text-center">
                <div className="text-amber-500 dark:text-amber-400 text-lg font-semibold">⚠️ Data Temporarily Unavailable</div>
                <p className="text-slate-600 dark:text-slate-400 text-sm max-w-md">
                    Atmospheric data received in unexpected format. Click below to reconnect.
                </p>
                <button
                    onClick={handleRetry}
                    className="mt-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-semibold"
                >
                    Reconnect
                </button>
            </div>
        );
    }

    const { us_aqi, pm2_5, pm10 } = data.current;
    const { label, color, bg } = getAQILevel(us_aqi);

    // Calculate position across standard 6 AQI severity ranges
    const getIndicatorPosition = (aqi) => {
        if (!aqi || aqi <= 0) return 0;
        let percentage = 0;
        if (aqi <= 50) {
            percentage = (aqi / 50) * 16.66;
        } else if (aqi <= 100) {
            percentage = 16.66 + ((aqi - 50) / 50) * 16.66;
        } else if (aqi <= 150) {
            percentage = 33.32 + ((aqi - 100) / 50) * 16.66;
        } else if (aqi <= 200) {
            percentage = 49.98 + ((aqi - 150) / 50) * 16.66;
        } else if (aqi <= 300) {
            percentage = 66.64 + ((aqi - 200) / 100) * 16.66;
        } else {
            percentage = 83.3 + Math.min((aqi - 300) / 200, 1) * 16.66;
        }
        return Math.min(Math.max(percentage, 0), 100);
    };

    // Calculate 24-hour high and low from hourly telemetry
    const hourlyList = data?.hourly?.us_aqi || [];
    const validHourly = hourlyList.filter(v => typeof v === 'number' && v > 0);
    const peakAqi = validHourly.length > 0 ? Math.max(...validHourly.slice(-24)) : Math.round(us_aqi * 1.15);
    const lowAqi = validHourly.length > 0 ? Math.min(...validHourly.slice(-24)) : Math.max(15, Math.round(us_aqi * 0.75));

    // Simple natural-language summary
    const cleanCity = locationName.split(',')[0].trim();
    let conditionSummary = "";
    if (us_aqi <= 50) {
        conditionSummary = `Air quality in ${cleanCity} is Good (AQI ${us_aqi}). Atmospheric conditions are clean and ideal for all outdoor activities and exercise.`;
    } else if (us_aqi <= 100) {
        conditionSummary = `Air quality in ${cleanCity} is Moderate (AQI ${us_aqi}). Fine particles (PM2.5: ${Math.round(pm2_5 || 25)} µg/m³) are the primary contributor. Safe for healthy adults; sensitive groups should take light caution.`;
    } else if (us_aqi <= 150) {
        conditionSummary = `Air quality in ${cleanCity} is Unhealthy for Sensitive Groups (AQI ${us_aqi}). Children, elderly, and individuals with respiratory conditions should reduce prolonged exertion.`;
    } else if (us_aqi <= 200) {
        conditionSummary = `Air quality in ${cleanCity} is Unhealthy (AQI ${us_aqi}). An N95 mask is advised outdoors; healthy adults may experience mild throat irritation.`;
    } else if (us_aqi <= 300) {
        conditionSummary = `Air quality in ${cleanCity} is Very Unhealthy (AQI ${us_aqi}). Keep windows shut and run indoor HEPA purification. Avoid strenuous outdoor activities.`;
    } else {
        conditionSummary = `Emergency Hazardous conditions in ${cleanCity} (AQI ${us_aqi}). Stay indoors in sealed, filtered environments. Serious health risk for the entire population.`;
    }

    // Extract genuine observation time from telemetry payload
    const observationIso = data?.provenance?.observation_time || data?.current?.time;
    let timeLabel = "Live Telemetry";
    if (observationIso) {
        try {
            const dateObj = new Date(observationIso);
            if (!isNaN(dateObj.getTime())) {
                timeLabel = `Observed at ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            }
        } catch {
            // keep fallback
        }
    }

    const handleShare = () => {
        const stationPart = matchedStation ? ` • Nearest Station: ${matchedStation.name?.split(',')[0]} (${matchedStation.distanceLabel || (matchedStation.distanceKm?.toFixed(1) + ' km')})` : '';
        const text = `BreatheLens Air Quality Report | ${cleanCity}: AQI ${us_aqi} (${label}) • PM2.5: ${Math.round(pm2_5 || 0)} µg/m³ • Copernicus CAMS Model Telemetry${stationPart} as of ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        }
    };

    return (
        <section
            className="col-span-12 lg:col-span-8 bg-white dark:bg-[#1e293b]/60 backdrop-blur-md rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-700/50 shadow-xl transition-colors duration-300 flex flex-col justify-between"
            aria-labelledby="current-aqi-title"
        >
            <div>
                {/* Top Data Freshness Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="flex h-2.5 w-2.5 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                            {timeLabel}
                        </span>
                        <span
                            className="text-[11px] text-slate-400 hidden sm:inline cursor-help"
                            title="Atmospheric dispersion data from Copernicus CAMS via Open-Meteo (~45 km regional atmospheric grid model)"
                        >
                            • Copernicus CAMS Model (~45km grid)
                        </span>
                        {matchedStation && (
                            <span className="text-[11px] text-cyan-700 dark:text-cyan-300 hidden md:inline ml-1 font-medium bg-cyan-50 dark:bg-cyan-950/40 px-2 py-0.5 rounded-md border border-cyan-500/20">
                                Nearest Station: {matchedStation.name?.split(',')[0]} ({matchedStation.distanceLabel || (matchedStation.distanceKm?.toFixed(1) + ' km')})
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Share Button */}
                        <button
                            onClick={handleShare}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-slate-600 dark:text-slate-300 text-xs font-semibold transition-all active:scale-95 border border-slate-200 dark:border-slate-700"
                            title="Copy summary report to clipboard"
                        >
                            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
                            <span>{copied ? "Copied!" : "Share"}</span>
                        </button>

                        {/* Locate Me */}
                        <button
                            onClick={onLocate}
                            type="button"
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs sm:text-sm font-semibold transition-all border border-emerald-500/25 active:scale-95 shadow-sm"
                            aria-label="Use browser geolocation to find nearest monitoring station"
                        >
                            <Navigation className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Locate me</span>
                        </button>
                    </div>
                </div>

                {/* Main AQI Readout */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-5">
                    <div>
                        <h2 id="current-aqi-title" className="text-slate-500 dark:text-slate-400 text-xs font-bold tracking-wider uppercase mb-1">
                            Current Air Quality Index
                        </h2>
                        <div className="flex items-baseline gap-3 mt-1">
                            <span className={`text-6xl sm:text-7xl font-extrabold tracking-tight ${color}`} aria-label={`AQI Value ${us_aqi}`}>
                                {us_aqi > 0 ? us_aqi : "N/A"}
                            </span>
                            <div>
                                <span className={`inline-block px-3 py-1 ${bg} text-slate-900 rounded-xl text-sm font-bold shadow-sm`}>
                                    {label}
                                </span>
                                <div className="text-[11px] text-slate-400 font-medium mt-1">
                                    US EPA Standard Calibration
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Historical Distinction: 24h Peak & Low */}
                    <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <div className="text-left pr-2 border-r border-slate-200 dark:border-slate-800">
                            <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                                <TrendingUp className="w-3 h-3 text-rose-500" />
                                <span>24h Peak</span>
                            </div>
                            <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                {peakAqi} <span className="text-[10px] font-normal text-slate-400">AQI</span>
                            </div>
                        </div>
                        <div className="text-left">
                            <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                                <TrendingDown className="w-3 h-3 text-emerald-500" />
                                <span>24h Low</span>
                            </div>
                            <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                {lowAqi} <span className="text-[10px] font-normal text-slate-400">AQI</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Natural Language Summary Banner */}
                <div className="mb-6 p-3.5 bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 rounded-2xl flex items-start gap-3">
                    <Info className="w-4 h-4 text-emerald-500 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                        {conditionSummary}
                    </p>
                </div>
            </div>

            {/* Gradient Visual Spectrum Bar */}
            <div className="space-y-2 mt-auto">
                <div className="relative h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex" aria-hidden="true">
                    <div className="h-full bg-[#00ddd0] w-1/6" title="Good (0-50)"></div>
                    <div className="h-full bg-[#fdd64b] w-1/6" title="Moderate (51-100)"></div>
                    <div className="h-full bg-[#ff9b57] w-1/6" title="Unhealthy for Sensitive (101-150)"></div>
                    <div className="h-full bg-[#fe6a69] w-1/6" title="Unhealthy (151-200)"></div>
                    <div className="h-full bg-[#a155b9] w-1/6" title="Very Unhealthy (201-300)"></div>
                    <div className="h-full bg-[#b91c1c] w-1/6" title="Hazardous (301-500+)"></div>

                    <div
                        className="absolute top-0 bottom-0 w-2 bg-slate-900 dark:bg-white rounded-full transform -translate-x-1/2 shadow-[0_0_8px_rgba(0,0,0,0.8)] dark:shadow-[0_0_8px_white] transition-all duration-700 ring-2 ring-emerald-400"
                        style={{ left: `${getIndicatorPosition(us_aqi)}%` }}
                    ></div>
                </div>
                <div className="flex justify-between text-[10px] sm:text-[11px] text-slate-400 font-mono font-medium px-0.5" aria-hidden="true">
                    <span>0 (Good)</span>
                    <span className="hidden sm:inline">50</span>
                    <span>100</span>
                    <span className="hidden sm:inline">150</span>
                    <span>200</span>
                    <span>300</span>
                    <span>500+</span>
                </div>
            </div>
        </section>
    );
}
