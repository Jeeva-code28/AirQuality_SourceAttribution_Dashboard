import React from 'react';
import { CloudRain, Droplets, Wind, Eye } from 'lucide-react';

export default function WeatherCard({ data, loading }) {
    if (loading || !data) {
        return (
            <div className="col-span-12 lg:col-span-4 bg-[#1e293b]/50 backdrop-blur-md rounded-3xl p-6 border border-slate-700/50 flex flex-col justify-between shadow-xl animate-pulse h-64">
                <span className="text-slate-400 m-auto">Loading Weather...</span>
            </div>
        );
    }

    const { temperature_2m, relative_humidity_2m, wind_speed_10m, visibility } = data.current;
    const time = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' });

    return (
        <div className="col-span-12 lg:col-span-4 bg-white dark:bg-[#1e293b]/50 backdrop-blur-md rounded-3xl p-6 border border-slate-200 dark:border-slate-700/50 flex flex-col justify-between shadow-xl transition-colors duration-300">
            <h3 className="text-slate-900 dark:text-slate-100 text-lg font-bold mb-4">Weather Conditions</h3>

            <div className="grid grid-cols-2 gap-4">
                {/* Temperature */}
                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="w-8 h-8 rounded-lg bg-[#ff9b57]/10 flex items-center justify-center text-[#ff9b57]">
                        <CloudRain className="w-4 h-4" />
                    </div>
                    <div>
                        <div className="text-slate-500 dark:text-slate-400 text-[10px]">Temperature</div>
                        <div className="text-lg font-bold text-slate-800 dark:text-slate-200">{temperature_2m}°C</div>
                    </div>
                </div>

                {/* Humidity */}
                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="w-8 h-8 rounded-lg bg-[#3b82f6]/10 flex items-center justify-center text-[#3b82f6]">
                        <Droplets className="w-4 h-4" />
                    </div>
                    <div>
                        <div className="text-slate-500 dark:text-slate-400 text-[10px]">Humidity</div>
                        <div className="text-lg font-bold text-slate-800 dark:text-slate-200">{relative_humidity_2m}%</div>
                    </div>
                </div>

                {/* Wind Speed */}
                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="w-8 h-8 rounded-lg bg-[#10b981]/10 flex items-center justify-center text-[#10b981]">
                        <Wind className="w-4 h-4" />
                    </div>
                    <div>
                        <div className="text-slate-500 dark:text-slate-400 text-[10px]">Wind Speed</div>
                        <div className="text-lg font-bold text-slate-800 dark:text-slate-200">{wind_speed_10m} km/h</div>
                    </div>
                </div>

                {/* Visibility */}
                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <div className="w-8 h-8 rounded-lg bg-[#8b5cf6]/10 flex items-center justify-center text-[#8b5cf6]">
                        <Eye className="w-4 h-4" />
                    </div>
                    <div>
                        <div className="text-slate-500 dark:text-slate-400 text-[10px]">Visibility</div>
                        <div className="text-lg font-bold text-slate-800 dark:text-slate-200">
                            {visibility ? (visibility / 1000).toFixed(1) : 0} km
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-4 text-xs text-slate-500 text-right">
                Last updated: {time}
            </div>
        </div>
    );
}
