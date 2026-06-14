import React from 'react';
import { Navigation } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAQILevel } from '../../../services/api';

export default function CurrentAQICard({ data, loading, error, onLocate }) {
    if (error) {
        return (
            <div className="col-span-12 lg:col-span-8 bg-[#1e293b]/50 backdrop-blur-md rounded-3xl p-6 border border-red-900/30 shadow-xl h-64 flex flex-col items-center justify-center gap-4">
                <div className="text-red-400 text-xl font-semibold">⚠️ Unable to Load AQI Data</div>
                <p className="text-slate-400 text-center max-w-md">
                    {error.includes('limit') || error.includes('exceeded')
                        ? 'API request limit exceeded. Please try again later.'
                        : 'Failed to fetch air quality data. Please check your connection or try again.'}
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-xl text-white text-sm font-medium transition-colors"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (loading || !data) {
        return (
            <div className="col-span-12 lg:col-span-8 bg-[#1e293b]/50 backdrop-blur-md rounded-3xl p-6 border border-slate-700/50 shadow-xl animate-pulse h-64 flex items-center justify-center">
                <span className="text-slate-400">Loading AQI Data...</span>
            </div>
        );
    }

    // Check if data.current exists, if not show error
    if (!data.current) {
        return (
            <div className="col-span-12 lg:col-span-8 bg-[#1e293b]/50 backdrop-blur-md rounded-3xl p-6 border border-yellow-900/30 shadow-xl h-64 flex flex-col items-center justify-center gap-4">
                <div className="text-yellow-400 text-xl font-semibold">⚠️ Invalid Data Format</div>
                <p className="text-slate-400 text-center max-w-md">
                    The API returned unexpected data. Please try refreshing the page.
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-xl text-white text-sm font-medium transition-colors"
                >
                    Refresh Page
                </button>
            </div>
        );
    }

    const { us_aqi, pm2_5, pm10 } = data.current;
    const { label, color, bg } = getAQILevel(us_aqi);
    const time = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    // Calculate position based on 6 equal visual segments
    const getIndicatorPosition = (aqi) => {
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
            // Cap at 100% for anything above 300 (or up to 500)
            percentage = 83.3 + Math.min((aqi - 300) / 200, 1) * 16.66;
        }
        return Math.min(Math.max(percentage, 0), 100);
    };

    return (
        <div className="col-span-12 lg:col-span-8 bg-white dark:bg-[#1e293b]/50 backdrop-blur-md rounded-3xl p-6 border border-slate-200 dark:border-slate-700/50 shadow-xl transition-colors duration-300">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Current Air Quality Index</h3>
                    <div className="flex items-end gap-4">
                        <span className={`text-6xl font-bold ${color}`}>{us_aqi > 0 ? us_aqi : "N/A"}</span>
                        <span className={`px-3 py-1 ${bg} text-slate-900 rounded-lg text-sm font-bold mb-2`}>{label}</span>
                    </div>
                </div>
                <button
                    onClick={onLocate}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-emerald-600 dark:text-emerald-400 text-sm font-medium transition-colors border border-slate-200 dark:border-slate-700/50 active:scale-95"
                >
                    <Navigation className="w-4 h-4" />
                    <span>Locate me</span>
                </button>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-slate-500 dark:text-slate-400 text-sm">PM2.5</span>
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    </div>
                    <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">{pm2_5 && pm2_5 > 0 ? pm2_5 : "N/A"}</div>
                    <div className="text-xs text-slate-500">µg/m³</div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-slate-500 dark:text-slate-400 text-sm">PM10</span>
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    </div>
                    <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">{pm10 && pm10 > 0 ? pm10 : "N/A"}</div>
                    <div className="text-xs text-slate-500">µg/m³</div>
                </div>
            </div>

            <div className="relative h-3 bg-slate-800 rounded-full overflow-hidden flex">
                <div className="h-full bg-[#00ddd0] w-1/6"></div> {/* Good */}
                <div className="h-full bg-[#fdd64b] w-1/6"></div> {/* Moderate */}
                <div className="h-full bg-[#ff9b57] w-1/6"></div> {/* Poor */}
                <div className="h-full bg-[#fe6a69] w-1/6"></div> {/* Unhealthy */}
                <div className="h-full bg-[#a155b9] w-1/6"></div> {/* Severe */}
                <div className="h-full bg-[#b91c1c] w-1/6"></div> {/* Hazardous */}

                {/* Indicator Line */}
                <div
                    className="absolute top-0 bottom-0 w-1 bg-slate-900 dark:bg-white transform -translate-x-1/2 shadow-[0_0_10px_rgba(0,0,0,0.5)] dark:shadow-[0_0_10px_white] transition-all duration-500"
                    style={{ left: `${getIndicatorPosition(us_aqi)}%` }}
                ></div>
            </div>
            <div className="flex justify-between text-xs text-slate-500 mt-2 font-medium">
                <span className="w-1/6 text-left">0</span>
                <span className="w-1/6 text-left">50</span>
                <span className="w-1/6 text-left">100</span>
                <span className="w-1/6 text-left">150</span>
                <span className="w-1/6 text-left">200</span>
                <span className="w-1/6 text-left">300</span>
                <span className="text-right">500+</span>
            </div>
        </div>
    );
}
