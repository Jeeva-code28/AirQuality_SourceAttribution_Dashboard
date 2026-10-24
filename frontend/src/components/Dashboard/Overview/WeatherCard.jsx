import React from 'react';
import { CloudRain, Droplets, Wind, Eye, Compass, Info } from 'lucide-react';

export default function WeatherCard({ data, loading }) {
    if (loading || !data || !data.current) {
        return (
            <div className="col-span-12 lg:col-span-4 bg-white dark:bg-[#1e293b]/50 backdrop-blur-md rounded-3xl p-6 border border-slate-200 dark:border-slate-700/50 flex flex-col justify-between shadow-xl animate-pulse min-h-[16rem]">
                <div className="h-5 w-40 bg-slate-200 dark:bg-slate-700 rounded mb-4"></div>
                <div className="grid grid-cols-2 gap-3 flex-1">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-slate-100 dark:bg-slate-800 rounded-2xl h-20"></div>
                    ))}
                </div>
            </div>
        );
    }

    const { temperature_2m, relative_humidity_2m, wind_speed_10m, visibility, wind_direction_10m } = data.current;
    const time = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    // Atmospheric meteorological context
    let atmosphericSummary = "";
    if (wind_speed_10m < 5) {
        atmosphericSummary = "Stagnant, light winds (<5 km/h) reduce atmospheric ventilation, favoring localized particulate accumulation.";
    } else if (wind_speed_10m < 15) {
        atmosphericSummary = `Moderate breeze (${wind_speed_10m} km/h) facilitates active mixing and dispersion of ground-level pollutants.`;
    } else {
        atmosphericSummary = `Strong ambient winds (${wind_speed_10m} km/h) accelerate particulate dispersion and regional advection.`;
    }

    return (
        <section
            className="col-span-12 lg:col-span-4 bg-white dark:bg-[#1e293b]/60 backdrop-blur-md rounded-3xl p-6 border border-slate-200 dark:border-slate-700/50 flex flex-col justify-between shadow-xl transition-colors duration-300"
            aria-labelledby="weather-conditions-title"
        >
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 id="weather-conditions-title" className="text-slate-900 dark:text-slate-100 text-sm font-bold tracking-wider uppercase">
                        Weather & Atmospheric Context
                    </h3>
                    <span className="text-[11px] text-slate-400 font-mono">
                        {time}
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                    {/* Temperature */}
                    <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 flex-shrink-0">
                            <CloudRain className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-slate-500 dark:text-slate-400 text-[10px] font-medium uppercase">Temp</div>
                            <div className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 truncate">
                                {Math.round(temperature_2m)}°C
                            </div>
                        </div>
                    </div>

                    {/* Humidity */}
                    <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                        <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 flex-shrink-0">
                            <Droplets className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-slate-500 dark:text-slate-400 text-[10px] font-medium uppercase">Humidity</div>
                            <div className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 truncate">
                                {Math.round(relative_humidity_2m)}%
                            </div>
                        </div>
                    </div>

                    {/* Wind Speed */}
                    <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 flex-shrink-0">
                            <Wind className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-slate-500 dark:text-slate-400 text-[10px] font-medium uppercase">Wind</div>
                            <div className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 truncate">
                                {wind_speed_10m} <span className="text-[10px] font-normal text-slate-400">km/h</span>
                            </div>
                        </div>
                    </div>

                    {/* Visibility */}
                    <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                        <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 flex-shrink-0">
                            <Eye className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-slate-500 dark:text-slate-400 text-[10px] font-medium uppercase">Visibility</div>
                            <div className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 truncate">
                                {visibility ? (visibility / 1000).toFixed(1) : 0} <span className="text-[10px] font-normal text-slate-400">km</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Environmental explanation note */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900/70 border border-slate-100 dark:border-slate-800/80 rounded-2xl flex items-start gap-2.5 mt-auto">
                <Info className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                    {atmosphericSummary}
                </p>
            </div>
        </section>
    );
}
